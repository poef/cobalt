/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	
	cobalt = (function(self) {

		var cobaltError = function(message, code) {
			this.message = message;
			this.code = code;
			this.name = 'cobalt.Error';
		}

		self.error = function(message, code) {
			throw new cobaltError(message, code);
		}
		
		self.implements = function(o, type) {
			// since most cobalt types are defined in a super-private scope
			// instanceof doesn't work to type check. This is a workaround.
			return (typeof o != 'undefined' && typeof o.type!='undefined' && o.type === type );
		}

		return self;
	})(this.cobalt || {});

	cobalt.range      = __webpack_require__(1);
	cobalt.annotation = __webpack_require__(2);
	cobalt.mime       = __webpack_require__(3);
	cobalt.fragment   = __webpack_require__(4);
	cobalt.html       = __webpack_require__(5);


/***/ },
/* 1 */
/***/ function(module, exports) {

	/**
	 * Cobalt Range type
	 * A Range is a collection of [start, end] SingleRange pairs.
	 * Any SingleRange will never overlap or be consecutive with any other SingleRange
	 * start will always be >= 0
	 * Ranges and SingleRanges are immutable. All changes will return a new object.
	 * SingleRanges have a start and end, where start <= end, and a size (end - start)
	 * Ranges have a start, end and size, and a count - the number of SingleRanges >= 0
	 */
	module.exports = function(s,e) {

		/**
		 * Internal range type that has only a start and end position.
		 */
		function SingleRange(s,e) {
			this.type = 'cobaltSingleRange';
			this.start = s >= 0 ? s : 0;
			this.end = e >= this.start ? e : this.start;
			Object.freeze(this);
		}

		SingleRange.prototype = {
			constructor: SingleRange,
			/**
			 * Returns the size of the range in characters.
			 */
			get size () {
				return this.end - this.start;
			},
			/**
			 * Returns -1, 0, or 1 if given range is smaller, equal or larger than this range.
			 */
			compare: function(s) {
				if ( s.start < this.start ) {
					return 1;
				} else if ( s.start > this.start ) {
					return -1;
				} else if ( s.end < this.end ) {
					return 1;
				} else if ( s.end > this.end ) {
					return -1;
				}
				return 0;
			},
			/**
			 * Collapse a range to size 0. If toEnd is true, the position will be the end of the range.
			 */
			collapse: function(toEnd) {
				if ( toEnd ) {
					return new SingleRange(this.end, this.end);
				} else {
					return new SingleRange(this.start, this.start);
				}
			},
			/**
			 * Returns true if the given range is equal to this range.
			 */
			equals: function(s) {
				return this.compare(s)==0;
			},
			/**
			 * Returns true if the given range is smaller than this range. Smaller being
			 * start position is smaller, or the same and end is smaller.
			 */
			smallerThan: function(s) {
				return this.compare(s)==-1;
			},
			/**
			 * Returns true if the given range is larger than this range. Larger being
			 * start position is larger, or the same and end is larger.
			 */
			largerThan: function(s) {
				return this.compare(s)==1;
			},
			/**
			 * Returns true if this range is entirely to the left of the given range,
			 * and not connected.
			 */
			leftOf: function(s) {
				return this.collapse(true).compare(s.collapse())!=1;
			},
			/**
			 * Returns true if this range is entirely to the right of the given range,
			 * and not connected.
			 */
			rightOf: function(s) {
				return this.collapse().compare(s.collapse(true))!=-1;
			},
			/**
			 * Returns true if there is a non-empty overlap.
			 */
			overlaps: function(s) {
				return ( s.start < this.end && s.end > this.start );
			},
			/**
			 * Returns true if the given range is fully contained within the current range.
			 */
			contains: function(s) {
				return this.overlaps(s) && ( s.start >= this.start && s.end <= this.end );
			},
			/**
			 * Returns a new range with the exact overlap between this range and the given range.
			 */
			overlap: function(range) {
				var start = 0;
				var end = 0;
				if ( this.overlaps( range ) ) {
					if ( range.start < this.start ) {
						start = this.start;
					} else {
						start = range.start;
					}
					if ( range.end < this.end ) {
						end = range.end;
					} else {
						end = this.end;
					}
				}
				return new SingleRange(start, end);
			},
			/**
			 * return an array of subranges of this subrange that do not overlap with the given range
			 */
			exclude: function( range ) {
				var result = [];
				if ( this.overlaps( range ) ) {
					if ( this.start < range.start ) {
						result.push( new SingleRange( this.start, range.start ) );
					}
					if ( range.end < this.end ) {
						result.push( new SingleRange( range.end, this.end ) );
					}
				} else {
					result.push( this );
				}
				return result;
			},
			toString: function() {
				return this.start + '-' + this.end;
			}
		};

		function Range(s,e) {
			// type property is needed because instanceof can't check across
			// scope boundaries. Range is defined locally.
			this.type = 'cobaltRange';
			if ( Array.isArray(s) ) {
				// TODO: refactor this
				this.ranges = [];
				var r = null;
				for ( var i=0, l=s.length; i<l; i++ ) {
					if ( cobalt.implements(s[i], 'cobaltSingleRange') ) {
						r = s[i];
					} else if ( Array.isArray(s[i]) && s[i].length < 3 && s[i].length > 0 ) {
						r = new SingleRange( s[i][0], s[i][1] );
					} else if ( Array.isArray(s) && s.length < 3 && s.length > 0 ) {
						r = new SingleRange( s[0], s[1] );
					} else {
						cobalt.error('Not a valid Range', 'cobalt.range.invalid-range');
					}
					for ( var ii=0, ll=this.ranges.length; ii<ll; ii++ ) {
						if ( this.ranges[ii].overlaps(r) ) {
							if ( this.ranges[ii].contains(r) ) {
								r = null;
								break;
							}
							if ( this.ranges[ii].smallerThan(r) ) {
								this.ranges[ii] = new SingleRange( this.ranges[ii].start, r.end );
							} else {
								this.ranges[ii] = new SingleRange( r.start, this.ranges[ii].end );
							}
							r = null;
							break;
						}
					}
					if (r) {
						this.ranges.push(r);
					}
				}
				this.ranges.sort(function(a, b) {
					return a.compare(b);
				});
			} else if ( Number.isInteger(s) && Number.isInteger(e) ) {
				this.ranges = [ new SingleRange(s,e) ];
			} else {
				this.ranges = [];
			}
			Object.freeze(this.ranges); // TODO: check if this is needed
			Object.freeze(this);
		}

		Range.prototype = {
			constructor: Range,
			/**
			 * Return the start position of the first subrange or null
			 */
			get start () {
				return this.ranges.length ? this.ranges[0].start : null;
			},
			/**
			 * Return the end position of the last subrange or null
			 */
			get end () {
				return this.ranges.length ? this.ranges[ this.ranges.length - 1 ].end : null;
			},
			/**
			 * Return the size in characters between the start and end position or null
			 */
			get size () {
				return this.ranges.length ? this.end - this.start : null;
			},
			/**
			 * Return the number of subranges.
			 */
			get count () {
				return this.ranges.length;
			},
			/**
			 * Return a Range of the requested subrange or null.
			 */
			get: function(i) {
				return (i>=0 && i<this.count) ? new Range(this.ranges[i].start, this.ranges[i].end) : null;
			},
			/**
			 * Delete (cut) parts of this range.
			 */
			delete: function(r) {
				r = cobalt.range(r);
				var s = this;
				for (var i=r.count-1; i>=0; i--) {
					s = cutLength(s, r.get(i).start, r.get(i).size);
				}
				return s;
			},
			/**
			 * Run a callback on each subrange.
			 */
			forEach: function(f) {
				for (var i=0,l=this.count; i<l; i++) {
					f(this.get(i));
				}
			},
			/**
			 * Insert character space in this range.
			 */
			insert: function(r) {
				r = cobalt.range(r);
				var s = this;
				for (var i=r.count-1; i>=0; i--) {
					s = insertLength(s, r.get(i).start, r.get(i).size);
				}
				return s;
			},
			/**
			 * Create a new Range with either the start or end position, with no size.
			 */
			collapse: function(toEnd) {
				if (toEnd) {
					return new Range(this.end, this.end);
				} else {
					return new Range(this.start, this.start);
				}
			},
			toString: function() {
				return this.ranges.join(',');
			},
			/**
			 * Returns a new range as a union of this range and the given range.
			 */
			join: function(r) {
				r = cobalt.range(r);
				return new Range( this.ranges.concat(r.ranges) );
			},
			/*
			 * Returns a new range as the relative complement of r.
			 * All parts that overlap with r are removed ( not cut ).
			 */
			exclude: function(r) {
				r = cobalt.range(r);
				var workstack = this.ranges.slice();
				workstack.reverse();
				var donestack = [];
				var ri = 0;
				var subrange = null;
				while( subrange = workstack.pop() ) {
					if ( ri >= r.ranges.length ) {
						// no more ranges to exclude, so push the remainder
						donestack.push(subrange);
						continue;
					}

					// increment ri untill subrange is leftOf or overlaps ri
					while ( ri<r.ranges.length && subrange.rightOf(r.ranges[ri]) ) {
						ri++;
					}

					if ( ri>=r.ranges.length || subrange.leftOf(r.ranges[ri]) ) {
						// no overlap, so push it
						donestack.push(subrange);
					} else if ( subrange.overlaps(r.ranges[ri]) ) {
						var temp = subrange.exclude(r.ranges[ri]);
						for ( var i=temp.length-1; i>=0; i-- ) {
							workstack.push( temp[i] );
						}
						ri++; // this range is excluded so on to the next
					}
				}
				return new Range(donestack);
			},
			/**
			 * Return a new range consisting of the intersection or overlap of this and r.
			 */
			intersect: function(r) {
				r = cobalt.range(r);
				return this.exclude(r.invert(this.end));
			},
			/**
			 * Return a new range where all positions have moved by the given number of characters
			 * A negative number moves the range down, a positive number up.
			 */
			move: function(by) {
				var s = [];
				this.forEach(function(re) {
					s.push( new SingleRange(re.start + by, re.end + by ));
				});
				return new Range(s);
			},
			/**
			 * Return a new range that is the exact reverse of the this range,
			 * within a maximum size given by 'end'.
			 */
			invert: function(end) {
				return new Range(0,end).exclude(this);
			},
			/**
			 * Returns -1, 0, or 1 if given range is smaller, equal or larger than this range.
			 */
			compare: function(s) {
				if ( s.start < this.start ) {
					return 1;
				} else if ( s.start > this.start ) {
					return -1;
				} else if ( s.end < this.end ) {
					return 1;
				} else if ( s.end > this.end ) {
					return -1;
				}
				return 0;
			},

		};


		function cutLength(range, pos, length) {
			if ( length < 1 ) {
				return this;
			}
			var s = [];
			range.forEach(function(r) {
				if ( r.end <= pos ) { // range before cut
					s.push( new SingleRange( r.start, r.end ) );
				} else if ( r.start > ( pos + length ) ) { // range after cut
					s.push( new SingleRange( r.start - length, r.end - length) );
				} else if ( r.end > ( pos + length ) ) { // range extends after cut
					var start = r.start > pos ? pos : r.start;
					if ( s.length && s[s.length-1].end >= start ) {
						s[s.length-1] = new SingleRange( s[s.length-1].start, r.end - length );
					} else {
						s.push( new SingleRange( start, r.end - length ) );
					}

				} else if ( r.start < pos ) { // range extends before cut
					s.push( new SingleRange( r.start, pos ) );
				} // else: range will be cut away
			});
			return new Range(s);
		};

		function insertLength(range, pos, length) {
			if ( length < 1 ) {
				return this;
			}
			var s = [];
			range.forEach(function(r) {
				if ( r.end <= pos ) {
					s.push( new SingleRange( r.start, r.end ) );
				} else if ( r.start > pos ) {
					s.push( new SingleRange( r.start + length, r.end + length) );
				} else {
					s.push( new SingleRange( r.start, r.end + length) );
				}
			});
			return new Range(s);
		}

		if ( cobalt.implements(s, 'cobaltRange' ) ) {
			// because Range is immutable, we can just return s
			return s;
		} else {
			return new Range(s,e);
		}
	}

/***/ },
/* 2 */
/***/ function(module, exports) {

	module.exports = function(range, tag) {

		/**
		 * Fast trim algorithm (trim19) from
		 * https://yesudeep.wordpress.com/2009/07/31/even-faster-string-prototype-trim-implementation-in-javascript/
		 */
		function trim(str) {
			var str = str.replace(/^\s\s*/, ''),
				ws = /\s/,
				i = str.length;
			while (ws.test(str.charAt(--i)));
			return str.slice(0, i + 1);
		}

		function Annotation(range, tag) {
			this.type  = 'cobaltAnnotation';
			this.range = cobalt.range(range);
			this.tag   = trim(tag);
			Object.freeze(this);
		}

		Annotation.prototype = {
			constructor: Annotation,
			/**
			 * Returns a new annotation with this range deleted. Offsets can move.
			 * Returns null if the annotation range is fully deleted.
			 */
			delete: function( range ) {
				var r = this.range.delete(range);
				return (r.count) ? new Annotation( r, this.tag ) : null;
			},
			/**
			 * Returns a new annotation with this range inserted.
			 * Offsets can move.
			 */
			insert: function( range ) {
				return new Annotation( this.range.insert(range), this.tag);
			},
			/**
			 * Returns a new annotation with this range excluded. Offsets won't move otherwise.
			 * Returns null if the annotation range is fully excluded.
			 */
			exclude: function( range ) {
				var r = this.range.exclude(range);
				return (r.count) ? new Annotation( r, this.tag ) : null;
			},
			/**
			 * Returns a new annotation with this range joined. Offsets won't move otherwise.
			 */
			join: function( range ) {
				return new Annotation( this.range.join( range ), this.tag );
			},
			/**
			 * Returns a new annotation with the overlapping part of the given range,
			 * r null if there is no overlap.
			 */
			copy: function( range ) {
				var r = this.range.intersect( range );
				return (r.count) ? new Annotation( r, this.tag ) : null;
			},
			/**
			 * Returns -1, 0, or 1, depending if the range in the given annotation is smaller,
			 * equal or larger than the annotation range.
			 */
			compare: function( annotation ) {
				return this.range.compare( annotation.range );
			},
			/**
			 * Returns true if the first word in this tag is the same as the first word
			 * in the given tag.
			 */
			has: function( tag ) {
				//FIXME: should be able to specify attributes and attribute values as well
				return this.stripTag() === tag.split(' ')[0];
			},
			toString: function() {
				return this.range + ':' + this.tag;
			},
			/**
			 * Returns the first word in this tag.
			 */
			stripTag: function() {
				return this.tag.split(' ')[0];
			}
		}

		if ( cobalt.implements(range, 'cobaltAnnotation') ) {
			// because Annotation is immutable, we can just return it.
			return range;
		} else {
			return new Annotation(range, tag);
		}
	};

/***/ },
/* 3 */
/***/ function(module, exports) {

	module.exports = (function(self) {
		// minimal mime encoding/decoding, stolen from https://github.com/andris9/mimelib/blob/master/lib/mimelib.js

		self.getHeaders = function( message ) {
			var parseHeader = function( line ) {
			    if (!line) {
			        return {};
			    }

			    var result = {}, parts = line.split(";"),
			        pos;

			    for (var i = 0, len = parts.length; i < len; i++) {
			        pos = parts[i].indexOf("=");
			        if (pos < 0) {
			        	pos = parts[i].indexOf(':');
			        }
			        if ( pos < 0 ) {
			            result[!i ? "defaultValue" : "i-" + i] = parts[i].trim();
			        } else {
			            result[parts[i].substr(0, pos).trim().toLowerCase()] = parts[i].substr(pos + 1).trim();
			        }
			    }
			    return result;
			};
			var line = null;
			var headers = {};
			var temp = {};
			while ( line = message.match(/^.*$/m)[0] ) {
				message = message.substring( line.length );
				temp = parseHeader( line );
				for ( var i in temp ) {
					headers[i] = temp[i];
				}
				var returns = message.match(/^\r?\n|\r/);
				if ( returns[0] ) {
					message = message.substring( returns[0].length );
				}
			}
			return {
				headers: headers,
				message: message.substring(1)
			}
		}

		self.encode = function( parts, message, headers ) {
			var boundary = 'cobaltBoundary'+Date.now();
			var result = 'MIME-Version: 1.0\n';
			if ( headers ) {
				result += headers.join("\n");
			}
			result += 'Content-Type: multipart/related; boundary='+boundary+'\n\n';
			if ( message ) {
				result += message;
			}
			for ( var i=0, l=parts.length; i<l; i++ ) {
				result += '\n--'+boundary+'\n' + parts[i];
			}
			return result;
		}

		self.decode = function( message ) {
			var parsed = self.getHeaders( message );
			parsed.parts = [];
			if ( parsed.headers.boundary ) {
				var parts = parsed.message.split( '\n--'+parsed.headers.boundary+"\n" );
				var message = parts.shift();
				if ( message ) {
					parsed.message = message;
				}
				while ( part = parts.shift() ) {
					parsed.parts.push( self.decode(part) );		
				}
			}
			return parsed;
		}

		return self;

	});

/***/ },
/* 4 */
/***/ function(module, exports) {

	/**
	 * Cobalt Fragment type
	 * A Fragment is a combination of plain text and a list of annotations.
	 * The list of annotations will always be sorted by start and then end position.
	 * A fragment is immutable, all operations on it return a new fragment.
	 */
	module.exports = function(text, annotations) {

		/**
		 * The annotations list of a fragment, with the public api.
		 */
		function cobaltAnnotationList( annotations ) {
			this.type = 'cobaltAnnotationList';
			this.list = [];
			if ( cobalt.implements(annotations,'cobaltAnnotationList') ) {
				// FIXME: create private factory method for cobaltAnnotationList
				// that just returns the input object in this case.
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
			this.list.sort( function(a, b) {
				if ( a.range.start < b.range.start ) {
					return -1;
				} else if ( a.range.start > b.range.start ) {
					return 1;
				}
				return 0;
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
							return rs.split('-').map(function(re) {
								return parseInt(re);
							});
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
			get count () {
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
					this.list.forEach(function(ann) {
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
			},

			/**
			 * Returns a new list with all annotations cleared on the given range.
			 * Clear doesn't move the annotations, it just removes parts or all of them.
			 */
			clear: function(range) {
				var result = [];
				this.list.forEach(function(ann) {
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
				this.list.forEach(function(ann) {
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
				this.list.forEach(function(ann) {
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
			},
			/**
			 *
			 */
			reduce: function( previousValue, f ) {
				return this.list.reduce( previousValue, f);
			},
			/**
			 * Search through all annotations and return a new annotation list with
			 * only those annotations that match the selector.
			 */
			query: function( selector ) {
				//FIXME: design a selector syntax that makes sense for cobalt (no nesting)
				//then implement
			},
			forEach: function( f ) {
				this.list.forEach(f);
			}

		};

		/**
		 * Non public text api.
		 */
		var cobaltText = {
			delete: function(text, range) {
				range.ranges.reverse().forEach(function(re) {
					text = text.slice(0, re.start) + text.slice(re.end);
				});
				return text;
			},
			copy: function(text, range) {
				var result = '';
				range.ranges.forEach(function(re) {
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
		var cobaltAnnotations = {
			delete: function(annotations, range) {
				result = [];
				annotations.forEach(function(ann) {
					result.push( ann.delete(range) );
				});
				return new cobaltAnnotationList(result);
			},
			copy: function(annotations, range) {
				result = [];
				annotations.forEach(function(ann) {
					if ( ann.range.overlaps(range) ) {
						result.push( cobalt.annotation( ann.range.overlap(range), ann.tag ) );
					}
				});
				return new cobaltAnnotationList(result);
			},
			insert: function(annotations, position, size ) {
				result = [];
				var insertedRange = cobalt.range(position, position+size);
				annotations.forEach(function(ann) {
					result.push( cobalt.annotation( ann.range.insert( insertedRange ), ann.tag ));
				});
				return new cobaltAnnotationList(result);
			}
		};

		/**
		 * Cobalt Fragment type and public api.
		 */
		function cobaltFragment( text, annotations ) {
			this.type = 'cobaltFragment';
			if ( typeof annotations == 'undefined' ) {
				var result = parseFragment(text);
				if ( result.text || result.annotations) {
					text = result.text;
					annotations = result.annotations;
				}
			}
			this.text = '' + text;
			this.annotations = new cobaltAnnotationList( annotations );
			Object.freeze(this);
		}

		function parseFragment(fragment) {
			var info = cobalt.mime.decode( fragment );
			var text = '', annotations = '';
			info.parts.forEach( function(part) {
				switch( part.headers['content-type'] ) {
					case 'text/plain' :
						text = part.message;
					break;
					case 'text/hope' :
						annotations = part.message;
					break;
				}
			});
			return { text: text, annotations: annotations };
		}

		cobaltFragment.prototype = {
			constructor: cobaltFragment,
			/**
			 * Returns a new fragment where the given range is deleted (cut).
			 */
			delete: function( range ) {
				return new cobaltFragment(
					cobaltText.delete( this.text, range ),
					cobaltAnnotations.delete( this.annotations, range )
				);
			},
			/**
			 * Returns a new fragment with only the parts that overlap the given range.
			 * The new fragment adds all text slices matching the range together as one
			 * single text. All annotations are moved/cut to match this new text.
			 */
			copy: function( range ) {
				return new cobaltFragment(
					cobaltText.copy( this.text, range ),
					cobaltAnnotations.copy(
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
					cobaltText.insert( this.text, fragment.text, position ),
					cobaltAnnotations
					.insert( this.annotations, position, fragment.text.length )
					.apply( annotations.insert( fragment.annotations, 0, position ) )
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
			/**
			 * Search through the text using a regular expression or string. Returns a range object
			 * encompassing all matches.
			 */
			search: function( searchRe ) {
				function escapeRegExp(str) {
					return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
				}
				if ( typeof(searchRe) === 'string' ) {
					searchRe = new RegExp(escapeRegExp(searchRe), 'g');
				}
				var result = [];
				var match;
				while (match = searchRe.exec(this.text)) {
					result.push([match.index, match.lastIndex]);
				}
				return cobalt.range(result);
			},
			/**
			 * Search through the annotations using a query language approximately like css selectors.
			 * Returns a range object encompassing all matched ranges.
			 */
			query: function( selector ) {
				//FIXME: design a selector syntax that makes sense for cobalt (no nesting)
				//then implement
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

		if ( cobalt.implements( text, 'cobaltFragment' ) ) {
			// because cobaltFragment is immutable, we can just return it.
			return text;
		} else {
			return new cobaltFragment(text, annotations);
		}
	};

/***/ },
/* 5 */
/***/ function(module, exports) {

	/*
	1 forEach annotation from list
	2a is it an insert annotation (open and close) -> put it in the insert list, else
	2b is it an open annotation -> put it in the open list, else
	2c -> put it in the close list

	3 forEach close annotation
	4 does it match the current parent -> push it on the close stack, set current parent to its parent
	5 repeat untill close annotations stays the same, rest is ignored

	6 forEach open annotation
	7 is it allowed as child from current parent -> push it on the open stack, set parent to current tag
	8 else repeat for parent (up to starting parent from 6)
	9 repeat untill open annotations stay the same, rest is ignored

	10 forEach insert annotation
	11 check if it is allowed as child of current parent -> insert it in the open stack (open and close)
	12 else repeat for parent (up to starting parent from 6)
	13 if not allowed, do the same for the close stack, up to parent from step 3
	*/

	module.exports = (function(self) {

	    /**
	     * These rules define the behaviour of the rendering as well as the editor.
	     */
	    var rules = {
	        block: ['h1','h2','h3','p','ol','ul','li','blockquote','br','hr'],
	        inline: ['em','strong','a','img'],
	        obligatoryChild: {
	            'ol': ['li'],
	            'ul': ['li']
	        },
	        obligatoryParent: {
	            'li': ['ol','ul']
	        },
	        nextTag: {
	            'h1' : 'p',
	            'h2' : 'p',
	            'h3' : 'p',
	            'p'  : 'p',
	            'li' : 'li'
	        },
	        cannotHaveChildren: {
	            'br' : true,
	            'img': true,
	            'hr' : true
	        }
	    };
	    rules.alltags = rules.block.concat(rules.inline);
	    rules.nesting = {
	        'h1': rules.inline,
	        'h2': rules.inline,
	        'h3': rules.inline,
	        'p': rules.inline.concat(['br']),
	        'ol': ['li'],
	        'ul': ['li'],
	        'blockquote': rules.alltags,
	        'br': [],
	        'em': rules.inline,
	        'strong': rules.inline,
	        'a': rules.inline.filter(function(tag) { return tag!='a'; }),
	        '_': rules.alltags
	    };
	    rules.toplevel = rules.block.filter(function(tag) { return tag!='li';});

	    function canHaveChildren(tag)
	    {
	        return (typeof rules.cannotHaveChildren[tag] == 'undefined' );
	    }

	    function canHaveChild(parent, child)
	    {
	        if ( typeof rules.nesting[parent] == 'undefined' ) {
	            return true;
	        } else {
	            return rules.nesting[parent].indexOf(child)>-1;
	        }
	    }

	    function stripTag(tag) {
	        return tag.split(' ')[0];
	    }

	    function getRelativeList(annotations)
	    {
	        if ( !annotations || !annotations.count ) { return []; }
	        var list = [];
	        annotations.forEach(function(annotation) {
	            annotation.range.forEach(function(range) {
	                if ( range.start != range.end ) {
	                    list.push({
	                        type: 'start',
	                        annotation: annotation,
	                        position: range.start,
	                        start: range.start,
	                        end: range.end,
	                        tag: annotation.tag,
	                        tagName: stripTag(annotation.tag)
	                    });
	                    list.push({
	                        type: 'end',
	                        annotation: annotation,
	                        position: range.end,
	                        start: range.start,
	                        end: range.end,
	                        tag: annotation.tag,
	                        tagName: stripTag(annotation.tag)
	                    });
	                } else {
	                    list.push({
	                        type: 'insert',
	                        annotation: annotation,
	                        position: range.start,
	                        start: range.start,
	                        end: range.end,
	                        tag: annotation.tag,
	                        tagName: stripTag(annotation.tag)
	                    });
	                }
	            });
	        });
	        list.sort(function(a,b) {
	            if (a.position < b.position) {
	                return -1;
	            }
	            if (a.position > b.position) {
	                return 1;
	            }
	            if ( a.type == 'start' && b.type == 'end' ) {
	                return 1;
	            }
	            if ( a.type == 'end' && b.type == 'start' ) {
	                return -1;
	            }
	            if ( a.type == 'start' && a.end > b.end ) {
	                return -1;
	            }
	            if ( a.type == 'start' && a.end < b.end ) {
	                return 1;
	            }
	            if ( a.type == 'end' && a.start < b.start ) {
	                return 1;
	            }
	            if ( a.type == 'end' && a.start > b.start ) {
	                return -1;
	            }
	            return 0;
	        });
	        list.reduce(function(position, entry) {
	            entry.offset = entry.position - position;
	            delete entry.position;
	            return position + entry.offset;
	        }, 0);
	        return list;
	    }

	    function getStackedList(annotations)
	    {
	        var relativeList = getRelativeList(annotations);

	        var stackedList = [];
	        stackedList.push([]);
	        relativeList.forEach(function(entry) {
	            if ( entry.offset != 0 ) {
	                stackedList.push([]);
	            }
	            stackedList[ stackedList.length-1 ].push(entry);
	        });
	        return stackedList;
	    }

	    function getDomTree(fragment)
	    {

	        function removeEmptyNodes(node) {
	            return node;
	        }

	        function reopenClosed(pointer, closed) {
	            var skipped = [];
	            while (closed.length) {
	                var reopen = closed.pop();
	                if ( canHaveChild(pointer.tagName, reopen.tagName) ) {
	                    pointer = pointer.appendChild(reopen.tag);
	                } else {
	                    skipped.push(reopen);
	                }
	            }
	            while ( skipped.length ) {
	                closed.push(skipped.pop());
	            }
	            return pointer;
	        }

	        function Element(tag, parentNode) {
	            this.tag         = tag;
	            this.tagName     = tag ? stripTag(tag) : '';
	            this.parentNode  = parentNode;
	            this.childNodes  = [];
	            this.appendChild = function( tag ) {
	                var child = new Element(tag, this );
	                this.childNodes.push( child );
	                return child;
	            }
	        }

	        var root     = new Element();
	        var current  = root;
	        var position = 0;
	        var stackedList = getStackedList(fragment.annotations);

	        stackedList.reduce(function(currentNode, stack) {
	            var skipped = [];
	            if ( stack[0].offset ) {
	                var text = fragment.text.substr(position, stack[0].offset);
	                current.childNodes.push(text);
	                position += stack[0].offset;
	            }
	            stack.forEach(function(entry) {
	                var pointer = current;
	                var closed  = [];
	                switch ( entry.type ) {
	                    case 'start':
	                        while ( pointer && !canHaveChild(pointer.tagName, entry.tagName ) ) {
	                            closed.push(pointer);
	                            pointer = pointer.parentNode;
	                        }
	                        if ( pointer ) {
	                            pointer = pointer.appendChild( entry.tag );
	                            pointer = reopenClosed(pointer, closed);
	                        }
	                    break;
	                    case 'end':
	                        while ( pointer && pointer.tagName!= entry.tagName ) {
	                            closed.push(pointer);
	                            pointer = pointer.parentNode;
	                        }
	                        if ( pointer ) {
	                            pointer = pointer.parentNode;
	                            pointer = reopenClosed(pointer, closed);
	                        }
	                    break;
	                    case 'insert':
	                        while ( pointer && !canHaveChild(pointer.tagName, entry.tagName) ) {
	                            pointer = pointer.parentNode;
	                        }
	                        if ( pointer ) {
	                            pointer.appendChild(entry.tag);
	                            pointer = null;
	                        }
	                    break;
	                }
	                if (pointer) {
	                    current = pointer;
	                } else {
	                    skipped.push(entry);
	                }
	            });
	            return current;
	        }, root);
	        if ( position < fragment.text.length ) {
	            var text = fragment.text.substr(position);
	            root.childNodes.push(text);
	        }
	        removeEmptyNodes(root);
	        return root;
	    };

	    function escapeHTML(text) {
	        return text
	            .replace(/&/g, "&amp;")
	            .replace(/</g, "&lt;")
	            .replace(/>/g, "&gt;")
	            .replace(/"/g, "&quot;")
	            .replace(/'/g, "&#039;");
	    }

	    function renderElement(element) {
	        var html = '';
	        if ( typeof element == 'string' ) {
	            html += escapeHTML(element);
	        } else if ( element.tag ) {
	            html += '<'+element.tag+'>';
	            if ( canHaveChildren(element.tagName) ) {
	                for (var i=0,l=element.childNodes.length; i<l; i++ ) {
	                    html += renderElement(element.childNodes[i]);
	                }
	                html += '</'+element.tagName+'>';
	            }
	        } else if ( typeof element.childNodes != undefined ) {
	            for (var i=0,l=element.childNodes.length; i<l; i++ ) {
	                html += renderElement(element.childNodes[i]);
	            }
	        }
	        return html;
	    }

	    self.render = function(fragment) {
	        var root = getDomTree(fragment);
	        return renderElement(root);
	    }

	    return self;
	})(cobalt.html || {});

/***/ }
/******/ ]);