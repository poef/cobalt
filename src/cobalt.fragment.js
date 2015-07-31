/**
 * Cobalt Fragment type
 * A Fragment is a combination of plain text and a list of annotations.
 * The list of annotations will always be sorted by start and then end position.
 * A fragment is immutable, all operations on it return a new fragment.
 */
cobalt.fragment = function(text, annotations) {

	/**
	 * The annotations list of a fragment, with the public api.
	 */
	function cobaltAnnotationList( annotations ) {
		this.list = [];
		if ( annotations instanceof cobaltAnnotationList ) {
			this.list = annotations.list;
		} else if ( Array.isArray( annotations) ) {
			this.list = annotations;
		} else {
			this.list = parseAnnotations( annotations + '' );
		}
		// clear unset ranges.
		this.list = this.list.filter( function(ann) {
			return ann.range.start != null;
		});
		// sort by range
		this.list.sort( function( a, b ) {
			return a.range.compare( b.range );
		});
		Object.freeze(this);
		Object.freeze(this.list);
	}

	function parseAnnotations(annotations) {
		var reMarkupLine = /^(?:(([0-9]+\-[0-9]+)(,[0-9]+\-[0-9]+)*))?:(.*)$/m;
		var matches = [];
		var list = [];
		while ( annotations && ( matches = annotations.match(reMarkupLine) ) ) {
			list.push(
				cobalt.annotation(
					matches[1].split(',').map(function(rs) {
						return rs.split('-');
					}),
					matches[matches.length-1]
				)
			);
			annotations = annotations.substr( matches[0].length + 1 );
		}
		return list;
	}

	cobaltAnnotationList.prototype = {
		constructor: cobaltAnnotationList,
		/**
		 * Returns the number of annotations in the list.
		 */
		count: get function() {
			return this.list.length;
		},
		/**
		 * Returns a string with all annotations joined by newlines.
		 */
		toString: function() {
			return this.list.join('\n');
		},
		/**
		 * Returns a new list with a new annotation added.
		 */
		apply: function(range, tag) {
			if ( range instanceof cobaltAnnotationList ) {
				return new cobaltAnnotationList(
					this.list.concat(range.list)
				);
			} else {
				if ( typeof range.tag != 'undefined' ) {
					tag   = range.tag;
					range = range.range;
				}
				return new cobaltAnnotationList( 
					this.list.slice().push(
						cobalt.annotation(range,tag)
					)
				);
			}
		},
		/**
		 * Returns a new list, with the annotations with the given
		 * tag cleared on the given range.
		 */
		remove: function(range, tag) {
			if ( range instanceof cobaltAnnotationList ) {
				// FIXME: fill in
			} else {
				if ( typeof range.tag != 'undefined' ) {
					tag   = range.tag;
					range = range.range;
				}
				var result = [];
				this.list.foreach(function(ann) {
					if ( ann.overlaps(range) && ann.has(tag) ) {
						var r = ann.range.exclude(range); 
						if ( r.start != null ) {
							result.push( cobalt.annotation( r, ann.tag ) );
						}
					} else {
						result.push(ann);
					}
				});
				return new cobaltAnnotationList(result);
			}
		}
		/**
		 * Returns a new list with all annotations cleared on the given range.
		 * Clear doesn't move the annotations, it just removes parts or all of them.
		 */
		clear: function(range) {
			var result = [];
			this.list.foreach(function(ann) {
				var r = ann.range.exclude(range);
				if ( r.start != null ) {
					result.push( cobalt.annotation( r, ann.tag ) );
				}
			});
			return new cobaltAnnotationList(result);
		},
		/**
		 * Returns a new list where all annotations have the given range deleted.
		 * This means that all positions in the given range are cut from all annotations.
		 * Annotations to the right of the given range will move left.
		 * Annotations that are contained by the given range are removed.
		 */
		delete: function(range) {
			var result = [];
			this.list.foreach(function(ann) {
				var r = ann.range.delete(range);
				if ( r.start != null ) {
					result.push( cobalt.annotation( r, ann.tag ) );
				}				
			});
			return new cobaltAnnotationList(result);
		},
		/**
		 * Returns a new list with the positions in the given range inserted
		 * into all annotations. Annotations to the right of the range will move right.
		 */
		insert: function(range) {
			var result = [];
			this.list.foreach(function(ann) {
				result.push(cobalt.annotation( ann.insert(range), ann.tag ) );
			});
			return new cobaltAnnotationList(result);
		},
		/**
		 * Returns a new list with only the annotations that matched the filter.
		 */
		filter: function( f ) {
			return new cobaltAnnotationList( this.list.filter(f) );
		},
		/**
		 * Returns a new list with the annotations changed by the map function.
		 */
		map: function( f ) {
			return new cobaltAnnotationList( this.list.map(f) );
		}

	};

	/**
	 * Non public text api.
	 */
	var text = {
		delete: function(text, range) {
			range.ranges.reverse().foreach(function(re) {
				text = text.slice(0, re.start) + text.slice(re.end);
			});
			return text;
		},
		copy: function(text, range) {
			var result = '';
			range.ranges.foreach(function(re) {
				result += text.slice(re.start, re.end);
			});
			return result;
		},
		insert: function(text, insert, position) {
			return text.slice(0,position) + insert + text.slice(position);
		}
	};

	/**
	 * Non public annotations api.
	 */
	var annotations = {
		delete: function(annotations, range) {
			result = [];
			annotations.foreach(function(ann) {
				result.push( ann.delete(range) );
			}
			return new cobaltAnnotationList(result);
		},
		copy: function(annotations, range) {
			result = [];
			annotations.foreach(function(ann) {
				if ( ann.range.overlaps(range) ) {
					result.push( cobalt.annotation( ann.range.overlap(range), ann.tag ) );
				}
			});
			return new cobaltAnnotationList(result);
		},
		insert: function(annotations, position, size ) {
			result = [];
			var insertedRange = cobalt.range(position, position+size);
			annotations.foreach(function(ann) {
				result.push( cobalt.annotation( ann.range.insert( insertedRange ), ann.tag ));
			});
			return new cobaltAnnotationList(result);
		}
	};

	/**
	 * Cobalt Fragment type and public api.
	 */
	function cobaltFragment( text, annotations ) {
		if ( text instanceof cobaltFragment ) {
			this.text = text.text;
			this.annotations = text.annotations;
		} else {
			if ( typeof annotations == 'undefined' ) {
				var result = parseFragment(text);
				if ( result.text || result.annotations) {
					text = result.text;
					annotations = result.annotations;
				}
			}
			this.text = '' + text;
			this.annotations = new cobaltAnnotationList( annotations );
		}
		Object.freeze(this);
	}

	function parseFragment(fragment) {
		var info = cobalt.mime.decode( fragment );
		var text = '', annotations = '';
		info.parts.foreach( function(part) {
			switch( part.headers['content-type'] ) {
				case 'text/plain' :
					text = part.message;
				break;
				case 'text/hope' :
					annotations = part.message;
				break;
			}
		}
		return { text: text, annotations: annotations };
	}

	cobaltFragment.prototype = {
		constructor: cobaltFragment,
		/**
		 * Returns a new fragment where the given range is deleted (cut).
		 */
		delete: function( range ) {
			return new cobaltFragment(
				text.delete( this.text, range ),
				annotations.delete( this.annotations, range )
			);
		},
		/**
		 * Returns a new fragment with only the parts that overlap the given range.
		 * The new fragment adds all text slices matching the range together as one 
		 * single text. All annotations are moved/cut to match this new text.
		 */
		copy: function( range ) {
			return new cobaltFragment( 
				text.copy( this.text, range ), 
				annotations.copy( 
					this.annotations, 
					range.delete( 
						range.invert(this.text.length) 
					)
				)
			);
		},
		/**
		 * Returns a combined new fragment with the inserted fragment text and annotations
		 * inserted at the given position.
		 */
		insert: function( position, fragment ) {
			fragment = new cobaltFragment(fragment);
			return new cobaltFragment(
				text.insert( this.text, fragment.text, position ),
				annotations
				.insert( this.annotations, position, fragment.text.length )
				.apply( annotations.insert( fragment.annotations, 0, position ) );
			);
		},
		/**
		 * Returns a new range, with the given range/tag or annotation or annotationlist applied
		 */
		apply: function( range, tag ) { 
			return new cobaltFragment( 
				this.text, 
				this.annotations.apply( range, tag )
			);
		},
		/**
		 * Returns a new range, with the given range/tag or annotation or annotationlist removed
		 */
		remove: function( range, tag ) {
			return new cobaltFragment( 
				this.text, 
				this.annotations.remove( range, tag )
			);
		},
		/*
		 * Returns a mime encoded string with the text and annotations.
		 */
		toString: function() {
			return cobalt.mime.encode( [ 
				'Content-type: text/plain\n\n' + this.text, 
				'Content-type: text/cobalt\n\n' + this.annotations
			]);
		}
	};

	return new cobaltFragment(text, annotations);
};