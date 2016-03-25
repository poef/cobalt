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