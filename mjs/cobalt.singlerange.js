/**
 * Internal range type that has only a start and end position.
 */
export default class CobaltSingleRange {
    constructor(s,e) {
        this.start = Math.max(0, s);
        this.end   = Math.max(this.start, e);
        Object.freeze(this);
    }

    /**
     * Returns the size of the range in characters.
     */
    get size() {
        return this.end - this.start;
    }

    /**
     * Returns -1, 0, or 1 if given range is smaller, equal or larger than this range.
     */
    compare(s) {
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
    }

    /**
     * Collapse a range to size 0. If toEnd is true, the position will be the end of the range.
     */
    collapse(toEnd) {
        if ( toEnd ) {
            return new CobaltSingleRange(this.end, this.end);
        } else {
            return new CobaltSingleRange(this.start, this.start);
        }
    }

    /**
     * Returns true if the given range is equal to this range.
     */
    equals(s) {
        return this.compare(s)==0;
    }

    /**
     * Returns true if the given range is smaller than this range. Smaller being
     * start position is smaller, or the same and end is smaller.
     */
    smallerThan(s) {
        return this.compare(s)==-1;
    }

    /**
     * Returns true if the given range is larger than this range. Larger being
     * start position is larger, or the same and end is larger.
     */
    largerThan(s) {
        return this.compare(s)==1;
    }

    /**
     * Returns true if this range is entirely to the left of the given range,
     * and not connected.
     */
    leftOf(s) {
        return this.collapse(true).compare(s.collapse())==-1;
    }

    /**
     * Returns true if this range is entirely to the right of the given range,
     * and not connected.
     */
    rightOf(s) {
        return this.collapse().compare(s.collapse(true))==1;
    }

    /**
     * Returns true if there is a non-empty overlap.
     */
    overlaps(s) {
        return ( s.start < this.end && s.end > this.start );
    }

    /**
     * Returns true if the given range is fully contained within the current range.
     */
    contains(s) {
        return this.overlaps(s) && ( s.start >= this.start && s.end <= this.end );
    }

    /**
     * Returns a new range with the exact overlap between this range and the given range.
     */
    overlap(range) {
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
        return new CobaltSingleRange(start, end);
    }

    /**
     * return an array of subranges of this subrange that do not overlap with the given range
     */
    exclude( range ) {
        var result = [];
        if ( this.overlaps( range ) ) {
            if ( this.start < range.start ) {
                result.push( new CobaltSingleRange( this.start, range.start ) );
            }
            if ( range.end < this.end ) {
                result.push( new CobaltSingleRange( range.end, this.end ) );
            }
        } else {
            result.push( this );
        }
        return result;
    }

    toString() {
        return this.start + '-' + this.end;
    }
};
