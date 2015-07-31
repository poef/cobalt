cobalt.annotation = function(range, tag) {

	function Annotation(range, tag) {
		if ( range instanceof Annotation ){
			this.range = range.range;
			this.tag   = range.tag;
		} else {
			this.range = cobalt.range(range);
			this.tag   = tag;
		}
		Object.freeze(this);
	}

	Annotation.prototype = {
		constructor: Annotation,
		delete: function( range ) {
			var r = this.range.delete(range);
			return (r.count) ? new Annotation( r, this.tag ) : null;
		},
		exclude: function( range ) {
			var r = this.range.exclude(range);
			return (r.count) ? new Annotation( r, this.tag ) : null;
		},
		join: function( range ) {
			return new Annotation( this.range.join( range ), this.tag );
		},
		copy: function( range ) {
			var r = this.range.copy( range );
			return (r.count) ? new Annotation( r, this.tag ) : null;
		},
		compare: function( annotation ) {
			return this.range.compare( annotation.range );
		},
		has: function( tag ) {
			//FIXME: should be able to specify attributes and attribute values as well
			return this.stripTag() == tag.stripTag();
		},
		toString: function() {
			return this.range + ':' + this.tag;
		},
		stripTag: function() {
			return this.tag.split(' ')[0];
		}
	}

	return new Annotation(range, tag);
};