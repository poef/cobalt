/**
 * Cobalt Range type
 * A Range is a collection of [start, end] CobaltSingleRange pairs.
 * Any CobaltSingleRange will never overlap or be consecutive with any other CobaltSingleRange
 * start will always be >= 0
 * Ranges and CobaltSingleRanges are immutable. All changes will return a new object.
 * CobaltSingleRanges have a start and end, where start <= end, and a size (end - start)
 * Ranges have a start, end and size, and a count - the number of CobaltSingleRanges >= 0
 */
import CobaltSingleRange from './cobalt.singlerange.js';
import cobalt from './cobalt.js';

class CobaltRange {
    constructor(s,e) {
        let r = null;
        if (s.constructor && s.constructor.name == 'CobaltRange') {
            return s;
        } else if (s.constructor && s.constructor.name == 'CobaltSingleRange') {
            this.ranges = [ s ];
        } else if ( Array.isArray(s) ) {
            // first argument is a range
            for ( var i=0, l=s.length; i<l; i++ ) {
                if ( s[i] instanceof  CobaltSingleRange ) {
                    r = s[i];
                } else if ( Array.isArray(s[i]) && s[i].length < 3 && s[i].length > 0 ) {
                    r = new CobaltSingleRange( s[i][0], s[i][1] );
                } else if ( Array.isArray(s) && s.length < 3 && s.length > 0 ) {
                    // first argument is an array with start and end only
                    r = new CobaltSingleRange( s[0], s[1] );
                    delete s[1];
                    s[0] = r;
                    break;
                } else {
                    cobalt.error('Not a valid Range', 'cobalt.range.invalid-range');
                }
                s[i] = r;
            }
            s.sort(function(a,b) {
                return a.compare(b);
            });
            this.ranges = s.reduce(function(acc,r) {
                if (!acc.length) {
                    acc.push(r);
                } else {
                    if (acc[acc.length-1].end>=r.start) {
                        acc[acc.length-1] = new CobaltSingleRange(acc[acc.length-1].start, r.end);
                    } else {
                        acc.push(r);
                    }
                }
                return acc;
            },[]);
        } else if ( Number.isInteger(s) && Number.isInteger(e) ) {
            this.ranges = [ new CobaltSingleRange(s,e) ];
        } else if ( Number.isInteger(s) ) {
            this.ranges = [ new CobaltSingleRange(s,s) ];
        } else if (typeof s != 'undefined' ) {
            throw new Error('illegal value');
        } else {
            this.ranges = [];
        }
        Object.freeze(this.ranges); // TODO: check if this is needed
        Object.freeze(this);
    }

    /**
     * Return the start position of the first subrange or null
     */
    get start() {
        return this.ranges.length ? this.ranges[0].start : null;
    }

    /**
     * Return the end position of the last subrange or null
     */
    get end() {
        return this.ranges.length ? this.ranges[ this.ranges.length - 1 ].end : null;
    }

    /**
     * Return the size in characters between the start and end position or null
     */
    get size() {
        return this.ranges.length ? this.end - this.start : null;
    }

    /**
     * Return the number of subranges.
     */
    get count() {
        return this.ranges.length;
    }

    /**
     * Return a Range of the requested subrange or null.
     */
    get(i) {
        return (i>=0 && i<this.count) ? new CobaltRange(this.ranges[i].start, this.ranges[i].end) : null;
    }

    /**
     * Delete (cut) parts of this range.
     */
    delete(r) {
        r = cobalt.range(r);
        var s = this;
        for (var i=r.count-1; i>=0; i--) {
            s = cutLength(s, r.get(i).start, r.get(i).size);
        }
        return s;
    }

    /**
     * Run a callback on each subrange.
     */
    forEach(f) {
        for (var i=0,l=this.count; i<l; i++) {
            f(this.get(i));
        }
    }

    /**
     * Insert character space in this range.
     */
    insert(r) {
        r = cobalt.range(r);
        var s = this;
        for (var i=r.count-1; i>=0; i--) {
            s = insertLength(s, r.get(i).start, r.get(i).size);
        }
        return s;
    }

    /**
     * Create a new Range with either the start or end position, with no size.
     */
    collapse(toEnd) {
        if (toEnd) {
            return new CobaltRange(this.end, this.end);
        } else {
            return new CobaltRange(this.start, this.start);
        }
    }

    toString() {
        return this.ranges.join(',');
    }

    /**
     * Returns a new range as a union of this range and the given range.
     */
    join(r) {
        r = cobalt.range(r);
        return new CobaltRange( this.ranges.concat(r.ranges) );
    }

    /*
     * Returns a new range as the relative complement of r.
     * All parts that overlap with r are removed ( not cut ).
     */
    exclude(r) {
        r = cobalt.range(r); // make sure r has only nonconsecutive, nonoverlapping singlerange subranges, ordered
        var ri = 0;
        var si = 0;
        var result = this.ranges.slice().filter(function(CobaltSingleRange) {
            return CobaltSingleRange.start!=CobaltSingleRange.end;
        });
        while (ri<r.ranges.length && si<result.length) {
            if (r.ranges[ri].leftOf(result[si]) || r.ranges[ri].end==result[si].start) {
                ri++;
            } else if (r.ranges[ri].rightOf(result[si]) || r.ranges[ri].start==result[si].end) {
                si++;
            } else {
                var t1 = result[si].exclude(r.ranges[ri]);
                if (t1.length) {
                    result = result.slice(0,si).concat(t1).concat(result.slice(si+1));
                    //if (t1.size>1) {
                        si++;
                    //}
                } else {
                    result.splice(si,1);
                }
            }
        }
        return new CobaltRange(result);
    }

    excludeDisjointed(r) {
        r = cobalt.range(r);
        var ri = 0;
        var si = 0;
        var result = this.ranges.slice();
        while (ri<r.ranges.length && si<result.length) {
            if (r.ranges[ri].leftOf(result[si])) {
                ri++;
            } else if (r.ranges[ri].rightOf(result[si])) {
                si++;
            } else {
                var t1 = result[si].exclude(r.ranges[ri]);
                if (t1.length) {
                    result = result.slice(0,si).concat(t1).concat(result.slice(si+1));
                    //if (t1.size>1) {
                        si++;
                    //}
                } else {
                    result.splice(si,1);
                }
            }
        }
        return result.map(function(r) { return new CobaltRange(r.start, r.end); });
    }

    /**
     * Return a new range consisting of the intersection or overlap of this and r.
     */
    intersect(r) {
        r = cobalt.range(r);
        return this.exclude(r.invert(Math.max(this.end,r.end)));
    }

    /**
     * Return a new range where all positions have moved by the given number of characters
     * A negative number moves the range down, a positive number up.
     */
    move(by) {
        var s = [];
        this.forEach(function(re) {
            s.push( new CobaltSingleRange(re.start + by, re.end + by ));
        });
        return new CobaltRange(s);
    }

    /**
     * Return a new range that is the exact reverse of the this range,
     * within a maximum size given by 'end'.
     */
    invert(end) {
        return new CobaltRange(0,end).exclude(this);
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

    overlaps(r) {
        return this.intersect(r).size > 0;
    }

    explode() {
        return this.ranges.map(r => new CobaltRange(r));
    }
};

function cutLength(range, pos, length) {
    if ( length < 1 ) {
        return range;
    }
    var s = [];
    range.forEach(function(r) {
        if ( r.end <= pos ) { // range before cut
            s.push( new CobaltSingleRange( r.start, r.end ) );
        } else if ( r.start > ( pos + length ) ) { // range after cut
            s.push( new CobaltSingleRange( r.start - length, r.end - length) );
        } else if ( r.end > ( pos + length ) ) { // range extends after cut
            var start = r.start > pos ? pos : r.start;
            if ( s.length && s[s.length-1].end >= start ) {
                s[s.length-1] = new CobaltSingleRange( s[s.length-1].start, r.end - length );
            } else {
                s.push( new CobaltSingleRange( start, r.end - length ) );
            }

        } else if ( r.start < pos ) { // range extends before cut
            s.push( new CobaltSingleRange( r.start, pos ) );
        } // else: range will be cut away
    });
    return new CobaltRange(s);
};

function insertLength(range, pos, length) {
    if ( length < 1 ) {
        return range;
    }
    var s = [];
    range.forEach(function(r) {
        if ( r.end < pos ) {
            s.push( new CobaltSingleRange( r.start, r.end ) );
        } else if ( r.start >= pos ) {
            s.push( new CobaltSingleRange( r.start + length, r.end + length) );
        } else {
            s.push( new CobaltSingleRange( r.start, r.end + length) );
        }
    });
    return new CobaltRange(s);
}

export default function(s,e) {
    if ( s instanceof CobaltRange ) {
        // because Range is immutable, we can just return s
        return s;
    } else {
        return new CobaltRange(s,e);
    }
}
