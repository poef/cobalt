/**
 * Cobalt Range type
 * A Range is a collection of [start, end] SingleRange pairs.
 * Any SingleRange will never overlap or be consecutive with any other SingleRange
 * start will always be >= 0
 * Ranges and SingleRanges are immutable. All changes will return a new object.
 * SingleRanges have a start and end, where start <= end, and a size (end - start)
 * Ranges have a start, end and size, and a count - the number of SingleRanges >= 0
 */
cobalt.range = function(s,e) {

	/**
	 * Internal range type that has only a start and end position.
	 */
	function SingleRange(s,e) {
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
		if ( s instanceof Range ) {
			this.ranges = s.ranges.slice(0);
		} else if ( Array.isArray(s) ) {
			// TODO: refactor this
			this.ranges = [];
			var r = null;
			for ( var i=0, l=s.length; i<l; i++ ) {
				if ( s[i] instanceof SingleRange ) {
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
			var s = this;
			for (var i=r.count-1; i>=0; i--) {
				s = cutLength(s, r.get(i).start, r.get(i).size);
			}
			return s;
		},
		/**
		 * Run a callback on each subrange.
		 */
		foreach: function(f) {
			for (var i=0,l=this.count; i<l; i++) {
				f(this.get(i));
			}
		},
		/**
		 * Insert character space in this range.
		 */
		insert: function(r) {
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
		 * Returns a new range where all parts of the given range have joined/merged with
		 * this range.
		 */
		join: function(r) {
			// TODO: implement this.
		},
		/*
		 * Returns a new range where all parts that overlap with the given range are
		 * removed ( not cut ).
		 */
		exclude: function(r) {
			var workstack = this.ranges.slice(0);
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
		 * Return a new range where all positions have moved by the given number of characters
		 * A negative number moves the range down, a positive number up.
		 */
		move: function(by) {
			var s = [];
			this.foreach(function(re) {
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
		}
	};


	function cutLength(range, pos, length) {
		if ( length < 1 ) {
			return this;
		}
		var s = [];
		range.foreach(function(r) {
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
		range.foreach(function(r) {
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

	return new Range(s,e);

}