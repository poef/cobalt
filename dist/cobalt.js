(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = global || self, global.cobalt = factory());
}(this, (function () { 'use strict';

    /**
     * Internal range type that has only a start and end position.
     */
    class CobaltSingleRange {
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
    }

    /**
     * Cobalt Range type
     * A Range is a collection of [start, end] CobaltSingleRange pairs.
     * Any CobaltSingleRange will never overlap or be consecutive with any other CobaltSingleRange
     * start will always be >= 0
     * Ranges and CobaltSingleRanges are immutable. All changes will return a new object.
     * CobaltSingleRanges have a start and end, where start <= end, and a size (end - start)
     * Ranges have a start, end and size, and a count - the number of CobaltSingleRanges >= 0
     */

    class CobaltRange {
        constructor(s,e) {
            let r = null;
            if ( Array.isArray(s) ) {
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
    }
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
    }
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

    function cobaltRange(s,e) {
        if ( s instanceof CobaltRange ) {
            // because Range is immutable, we can just return s
            return s;
        } else {
            return new CobaltRange(s,e);
        }
    }

    class CobaltAnnotation {
        constructor(range, tag) {
            this.range = cobalt.range(range);
            this.tag   = tag.trim();
            var elements = this.tag.split(/\s/);
            this.tagName = elements.shift().toLowerCase();
            Object.freeze(this);
        }

        /**
         * Returns a new annotation with this range deleted. Offsets can move.
         * Returns null if the annotation range is fully deleted.
         */
        delete( range ) {
            var r = this.range.delete(range);
            return (r.count) ? new CobaltAnnotation( r, this.tag ) : null;
        }

        /**
         * Returns a new annotation with this range inserted.
         * Offsets can move.
         */
        insert( range ) {
            return new CobaltAnnotation( this.range.insert(range), this.tag);
        }

        /**
         * Returns a new annotation with this range excluded. Offsets won't move otherwise.
         * Returns null if the annotation range is fully excluded.
         */
        exclude( range ) {
            var r = this.range.exclude(range);
            return (r.count) ? new CobaltAnnotation( r, this.tag ) : null;
        }

        /**
         * Returns a new annotation with this range joined. Offsets won't move otherwise.
         */
        join( range ) {
            return new CobaltAnnotation( this.range.join( range ), this.tag );
        }

        /**
         * Returns a new annotation with the overlapping part of the given range,
         * r null if there is no overlap.
         */
        copy( range ) {
            var r = this.range.intersect( range );
            return (r.count) ? new CobaltAnnotation( r, this.tag ) : null;
        }

        /**
         * Returns -1, 0, or 1, depending if the range in the given annotation is smaller,
         * equal or larger than the annotation range.
         */
        compare( annotation ) {
            return this.range.compare( annotation.range );
        }

        /**
         * Returns true if the first word in this tag is the same as the first word
         * in the given tag.
         */
        has( tag ) {
            //TODO: should be able to specify attributes and attribute values as well
            return this.tagName === tag.split(/\s/)[0];
        }

        toString() {
            return this.range + ':' + this.tag;
        }
    }

    function cobaltAnnotation(range, tag) {
        if ( range instanceof CobaltAnnotation ) {
            // because CobaltAnnotation is immutable, we can just return it.
            return range;
        } else {
            return new CobaltAnnotation(range, tag);
        }
    }

    // minimal mime encoding/decoding, stolen from https://github.com/andris9/mimelib/blob/master/lib/mimelib.js

    let mime = {};

    mime.getHeaders = function( message ) {
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
    		if ( returns && typeof returns[0] != 'undefined') {
    			message = message.substring( returns[0].length );
    		}
    	}
    	return {
    		headers: headers,
    		message: message.substring(1)
    	}
    };

    mime.encode = function( parts, message, headers ) {
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
    };

    mime.decode = function( message ) {
    	var parsed = mime.getHeaders( message );
    	parsed.parts = [];
    	if ( parsed.headers.boundary ) {
    		var parts = parsed.message.split( '\n--'+parsed.headers.boundary+"\n" );
    		var message = parts.shift();
    		if ( message ) {
    			parsed.message = message;
    		}
    		while ( part = parts.shift() ) {
    			parsed.parts.push( mime.decode(part) );
    		}
    	}
    	return parsed;
    };

    function parseAnnotations(annotations) {
        var reMarkupLine = /^(?:(([0-9]+\-[0-9]+)(,[0-9]+\-[0-9]+)*)):(.*)$/m;
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

    /**
     * The annotations list of a fragment, with the public api.
     */
    class CobaltAnnotationList {
        constructor( annotations ) {
            this.list = [];
            if ( annotations instanceof CobaltAnnotationList ) {
                // FIXME: create private factory method for CobaltAnnotationList
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

        /**
         * Returns the number of annotations in the list.
         */
        get count() {
            return this.list.length;
        }

        item(index) {
            return this.list[index];
        }

        /**
         * Returns a string with all annotations joined by newlines.
         */
        toString() {
            return this.list.join('\n');
        }

        /**
         * Returns a new list with a new annotation added.
         */
        apply(range, tag) {
            if ( range instanceof CobaltAnnotationList ) {
                return new CobaltAnnotationList(
                    this.list.concat(range.list)
                );
            } else {
                if ( typeof range.tag != 'undefined' ) {
                    tag   = range.tag;
                    range = range.range;
                }
                var list = this.list.slice();
                list.push(
                    cobalt.annotation(range,tag)
                );

                return new CobaltAnnotationList(list);
            }
        }

        /**
         * Returns a new list, with the annotations with the given
         * tag cleared on the given range.
         */
        remove(range, tag) {
            if ( range instanceof CobaltAnnotationList ) ; else {
                if ( typeof range.tag != 'undefined' ) {
                    tag   = range.tag;
                    range = range.range;
                }
                var result = [];
                this.list.forEach(function(ann) {
                    if ( ann.has(tag) ) {
                        var r = ann.range.exclude(range);
                        if ( r && r.start != null ) {
                            result.push( cobalt.annotation( r, ann.tag ) );
                        }
                    } else {
                        result.push(ann);
                    }
                });
                return new CobaltAnnotationList(result);
            }
        }

        /**
         * Returns a new list with all annotations cleared on the given range.
         * Clear doesn't move the annotations, it just removes parts or all of them.
         */
        clear(range) {
            var result = [];
            this.list.forEach(function(ann) {
                var r = ann.range.exclude(range);
                if ( r.start != null ) {
                    result.push( cobalt.annotation( r, ann.tag ) );
                }
            });
            return new CobaltAnnotationList(result);
        }

        /**
         * Returns a new list where all annotations have the given range deleted.
         * This means that all positions in the given range are cut from all annotations.
         * Annotations to the right of the given range will move left.
         * Annotations that are contained by the given range are removed.
         */
        delete(range) {
            var result = [];
            this.list.forEach(function(ann) {
                var r = ann.range.delete(range);
                if ( r.start != null ) {
                    result.push( cobalt.annotation( r, ann.tag ) );
                }
            });
            return new CobaltAnnotationList(result);
        }

        /**
         * Returns a new list with the positions in the given range inserted
         * into all annotations. Annotations to the right of the range will move right.
         */
        insert(range) {
            var result = [];
            this.list.forEach(function(ann) {
                result.push(cobalt.annotation( ann.insert(range), ann.tag ) );
            });
            return new CobaltAnnotationList(result);
        }

        /**
         * Returns a new list with only the annotations that matched the filter.
         */
        filter( f ) {
            return new CobaltAnnotationList( this.list.filter(f) );
        }

        /**
         * Returns a new list with the annotations changed by the map function.
         */
        map( f ) {
            return new CobaltAnnotationList( this.list.map(f) );
        }

        /**
         *
         */
        reduce( previousValue, f ) {
            return this.list.reduce( previousValue, f);
        }

        get(range) {
            range = cobalt.range.apply(cobalt.range, arguments);
            return this.filter(function(annotation) {
                return annotation.range.overlaps(range);
            });
        }

        /**
         * Search through all annotations and return a new annotation list with
         * only those annotations that match the selector.
         */
        query( selector, max ) {
            function getTags(selector) {
                return selector.split(' ').map(function(tag) {
                    return tag.trim();
                });
            }

            var tags  = getTags(selector);
            var range = cobalt.range([0, max]);
            var self  = this;
            tags.forEach(function(tag) {
                if (tag[0]=='-') {
                    tag = tag.substr(1);
                    var invert = true;
                }
                var tagRange = cobalt.range();
                self.list.filter(function(annotation) {
                    return annotation.tagName == tag;
                }).forEach(function(annotation) {
                    tagRange = tagRange.join(annotation.range);
                });
                if (invert) {
                    tagRange = tagRange.invert(max);
                }
                range = range.intersect(tagRange);
            });
            return range;
        }

        forEach( f ) {
            this.list.forEach(f);
        }

        has( range, tag ) {
            range = cobalt.range(range);
            return this.filter(function(a) {
                if (
                    ( (range.size && a.range.overlaps(range))
                       || (!range.size && range.start && a.range.overlaps(cobalt.range(range.start-1, range.start)) )
                    )
                    && a.tag==tag
                ) {
                    return true;
                }
            }).count>0;
        }
    }

    /**
     * Cobalt Fragment type
     * A Fragment is a combination of plain text and a list of annotations.
     * The list of annotations will always be sorted by start and then end position.
     * A fragment is immutable, all operations on it return a new fragment.
     */

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
            var result = [];
            annotations.forEach(function(ann) {
                ann = ann.delete(range);
                if ( ann ) {
                    result.push(ann);
                }
            });
            return new CobaltAnnotationList(result);
        },
        copy: function(annotations, range) {
            var result = [];
            annotations.forEach(function(ann) {
                if ( ann.range.overlaps(range) ) {
                    var copyAnn = cobalt.annotation( ann.range.intersect(range), ann.tag );
                    result.push( copyAnn );
                }
            });
            return new CobaltAnnotationList(result);
        },
        insert: function(annotations, position, size ) {
            var result = [];
            var insertedRange = cobalt.range(position, position+size);
            annotations.forEach(function(ann) {
                var foo = ann.range.insert( insertedRange );
                result.push( cobalt.annotation( foo, ann.tag ) );
            });
            return new CobaltAnnotationList(result);
        }
    };

    function parseFragment(fragment) {
        var text = '', annotations = '';
        if (fragment) {
            var info = cobalt.mime.decode( fragment );
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
        }
        return { text: text, annotations: annotations };
    }


    /**
     * Cobalt Fragment type and public api.
     */
    class CobaltFragment {
        constructor( text, annotations ) {
            if ( text instanceof CobaltFragment ) {
                return text;
            }
            if ( typeof annotations == 'undefined') {
                var result = parseFragment(text);
                if ( result.text || result.annotations) {
                    text = result.text;
                    annotations = result.annotations;
                }
            }
            this.text = '' + text;
            this.annotations = new CobaltAnnotationList( annotations );
            Object.freeze(this);
        }

        get length() {
            return this.text.length;
        }

        /**
         * Returns a new fragment where the given range is deleted (cut).
         */
        delete( range ) {
            range = cobalt.range(range);
            return new CobaltFragment(
                cobaltText.delete( this.text, range ),
                cobaltAnnotations.delete( this.annotations, range )
            );
        }

        /**
         * Returns a new fragment with only the parts that overlap the given range.
         * The new fragment adds all text slices matching the range together as one
         * single text. All annotations are moved/cut to match this new text.
         */
        copy( range ) {
            range = cobalt.range(range);
            var annCopy = cobaltAnnotations.copy(
                    this.annotations,
                    range
                );
            // now move everything to the left;
            var inverseRange = range.invert(this.text.length);
            annCopy = annCopy.delete(range.invert(this.text.length));
            return new CobaltFragment(
                cobaltText.copy( this.text, range ),
                annCopy
            );
        }

        /**
         * Returns a combined new fragment with the inserted fragment text and annotations
         * inserted at the given position.
         */
        insert( range, fragment ) {
            range = cobalt.range(range);
            fragment = new CobaltFragment(fragment);
            var result = this.delete(range);
            if (!fragment || !fragment.text.length) {
                return result;
            }
            return new CobaltFragment(
                cobaltText.insert( result.text, fragment.text, range.start ),
                cobaltAnnotations
                .insert( result.annotations, range.start, fragment.text.length )
                .apply( cobaltAnnotations.insert( fragment.annotations, 0, range.start ) )
            );
        }

        /**
         * Returns a new range, with the given range/tag or annotation or annotationlist applied
         */
        apply( range, tag ) {
            range = cobalt.range(range);
            return new CobaltFragment(
                this.text,
                this.annotations.apply( range, tag )
            );
        }

        /**
         * Returns a new range, with the given range/tag or annotation or annotationlist removed
         */
        remove( range, tag ) {
            range = cobalt.range(range);
            return new CobaltFragment(
                this.text,
                this.annotations.remove( range, tag )
            );
        }

        /**
         * Search through the text using a regular expression or string. Returns a range object
         * encompassing all matches.
         */
        search( searchRe ) {
            function escapeRegExp(str) {
                return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
            }
            if ( typeof(searchRe) === 'string' ) {
                searchRe = new RegExp(escapeRegExp(searchRe), 'g');
            }
            var result = [];
            if (this.text.length) {
                var match, lastIndex;
                while (match = searchRe.exec(this.text)) {
                    result.push([match.index, searchRe.lastIndex]);
                    if (lastIndex==searchRe.lastIndex) {
                        searchRe.lastIndex++;
                    }
                    lastIndex = searchRe.lastIndex;
                }
            }
            return cobalt.range(result);
        }

        /**
         * Search through the annotations using a query language approximately like css selectors.
         * Returns a range object encompassing all matched ranges.
         */
        query( selector ) {
            return this.annotations.query(selector, this.text.length);
        }

        /*
         * Returns a mime encoded string with the text and annotations.
         */
        toString() {
            return cobalt.mime.encode( [
                'Content-type: text/plain\n\n' + this.text,
                'Content-type: text/cobalt\n\n' + this.annotations
            ]);
        }
    }
    function cobaltFragment(text, annotations) {
        if ( text instanceof CobaltFragment ) {
            // because CobaltFragment is immutable, we can just return it.
            return text;
        } else {
            return new CobaltFragment(text, annotations);
        }
    }

    /*
    TODO:
    - add obligatory parents/children
      overwrite these with the correct tags/entries when available
    - create a hook system that allows alternative parsing and rendering of elements
      e.g. when parsing html turn <button><i class="fa fa-close"></i></button> into
      a cobalt-html-1 element, that renders the same html again. This allows you to keep
      nested html elements without text content.
    - allow the same hook system to render alternative elements when html won't allow the
      original.
      e.g. two overlapping anchors, render the overlapping part as
      <cobalt-anchor href="x">text</cobalt-anchor>. Which combined with some javascript
      allows you to render and follow overlapping links.
    */

        /**
         * These rules define the behaviour of the rendering as well as the editor.
         */
        var rules = {
            block: ['h1','h2','h3','p','ol','ul','li','blockquote','hr','div'],
            inline: ['em','strong','a','img','br','span'],
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
            },
            cannotHaveText: {
                'ul': true,
                'ol': true
            },
            specialRules: {
                'a': function(node) {
                    do {
                        if (node.tagName && node.tagName=='a') {
                            return false;
                        }
                        node = node.parentNode;
                    } while(node);
                    return true;
                }
            }
        };
        rules.alltags = rules.block.concat(rules.inline);
        rules.nesting = {
            'h1':         rules.inline,
            'h2':         rules.inline,
            'h3':         rules.inline,
            'p':          rules.inline,
            'ol':         ['li'],
            'ul':         ['li'],
            'li':         rules.alltags.filter(function(tag) { return tag!='li'; }),
            'blockquote': rules.alltags,
            'div':        rules.alltags,
            'em':         rules.inline,
            'strong':     rules.inline,
            'span':       rules.inline,
            'a':          rules.inline.filter(function(tag) { return tag!='a'; })
        };

        /**
         * Returns true if the tag can have children
         */
        function canHaveChildren(tag)
        {
            return (typeof rules.cannotHaveChildren[tag] == 'undefined' );
        }

        /**
         * Returns true if parentTag can have childTag as a direct child.
         */
        function canHaveChildTag(parentTagName, childTagName)
        {
            if ( typeof rules.nesting[parentTagName] == 'undefined' ) {
                return true;
            } else {
                return rules.nesting[parentTagName].indexOf(childTagName)>-1;
            }
        }

        function specialRulesAllow(node, tagName) {
            return (typeof rules.specialRules[tagName] == 'undefined' )
                || rules.specialRules[tagName](node);
        }

        function childAllowed(node, tagName) {
            return canHaveChildTag(node.tagName, tagName) && specialRulesAllow(node, tagName);
        }

        function textAllowed(node) {
            if (typeof rules.cannotHaveText[node.tagName] == 'undefined' ) {
                return true;
            } else {
                return !rules.cannotHaveText[node.tagName];
            }
        }

        /**
         * Return the first word of a tag.
         */
        function stripTag(tag) {
            return tag.split(/\s/)[0];
        }

        /**
         * Returns an array of entries. Each entry is either a start, end, text or insert entry
         * for a single range of an annotation. The entries are sorted by character offset
         * position, then by type. Start entries come after end entries. Text entries come after all.
         * Each entry also calculates its character offset to the previous entry.
         */
        function getRelativeList(fragment)
        {
            var list = [];
            var position = 0;
            fragment.annotations.forEach(function(annotation) {
                annotation.range.forEach(function(range, index) {
                    if ( range.start != range.end ) {
                        var startEntry = {
                            type: 'start',
                            index: index,
                            annotation: annotation,
                            position: range.start,
                            range: range,
                            tagName: stripTag(annotation.tag)
                        };
                        var endEntry = {
                            type: 'end',
                            annotation: annotation,
                            index: index,
                            position: range.end,
                            range: range,
                            tagName: stripTag(annotation.tag),
                            startEntry: startEntry
                        };
                        startEntry.endEntry = endEntry;
                        list.push(startEntry);
                        list.push(endEntry);
                    } else {
                        /*
                            annotations which have the same start and end position
                            are marked explicitly as 'insert' types. This prevents them
                            from being marked 'empty' and cleaned later.
                        */
                        list.push({
                            type: 'insert',
                            annotation: annotation,
                            index: index,
                            position: range.start,
                            range: range,
                            tagName: stripTag(annotation.tag)
                        });
                    }
                });
            });
            list.sort(function(a,b) {
                // first sort by position
                if (a.position < b.position) {
                    return -1;
                }
                if (a.position > b.position) {
                    return 1;
                }
                // position identical
                // text entries are always pushed back
                if (a.type == 'text') {
                    return 1;
                }
                // start entries pushed after end entries
                if (a.type == 'start' && b.type == 'end' ) {
                    return 1;
                }
                if (a.type == 'end' && b.type == 'start' ) {
                    return -1;
                }
                // entries that end later are pushed back
    //            if (a.range.end<b.range.end) {
    //                return 1;
    //            } else if (a.range.end>b.range.end) {
    //                return -1;
    //            }
                return 0;
            });
            var position = 0;
            var contentList = [];
            list.forEach(function(el) {
                if ( el.position>position ) {
                    contentList.push({
                        type: 'text',
                        position: position,
                        content: fragment.text.substr( position, el.position-position )
                    });
                }
                contentList.push(el);
                position = el.position;
            });
            if ( position < fragment.text.length ) {
                contentList.push({
                    type: 'text',
                    position: position,
                    content: fragment.text.substr( position )
                });
            }
            // position was only needed for sorting, no longer needed
            // if the contentList gets changed, this property will become incorrect
            // FIXME: same thing is true for the range attribute, but it is
            // used at the moment to build the dom tree in correct order
            contentList.forEach(function(entry) {
                delete entry.position;
            });
            return contentList;
        }

        /**
         * This returns a tree of nested elements, given a fragment
         * The tree follows HTML rules so it cannot generate illegal HTML
         * It may therefor skip annotations, which can't be expressed in valid HTML
         */
        function getDomTree(fragment)
        {

            /* A list of annotation entries (single ranges) which are currently not expressable */
            var suppressed  = [];
            /* the document fragment root element */
            var rootElement = new Element();
            /* the current character offset position */
            var position    = 0;

            /* get a list with start/end/insert entry stack for each position where there is at least one entry */
            var relativeList = getRelativeList(fragment);

            /**
             * This method tries to express any entry that was suppressed
             * It also removes entries that are not relevant any more (their end position has been passed)
             */
            function tryToOpen(suppressed, pointer) {

                function comparePositionThenIndex(a,b) {
                    if (a.position < b.position) {
                        return -1;
                    }
                    if (a.position > b.position) {
                        return 1;
                    }
                    if (a.index < b.index) {
                        return -1;
                    }
                    return 1;
                }

                var skipped = [];
                suppressed.sort(comparePositionThenIndex);
                while (suppressed.length) {
                    var entry = suppressed.pop();
                    if ( entry.range.end > position ) {
                        if ( childAllowed(pointer, entry.tagName) ) {
                            pointer = pointer.appendChild(entry);
                        } else {
                            skipped.push(entry);
                        }
                    }
                }
                if (skipped.length) {
                    while ( skipped.length ) {
                        suppressed.push(skipped.pop());
                    }
                    suppressed.sort(comparePositionThenIndex);
                }
                return pointer;
            }

            /**
             * appends valid children from the suppressed stack
             * so that entry always appears in it
             * prerequisite: node must allow entry directly
             */
            function appendValidEntries(node, suppressed, entry) {
                var closed = [];
                while ( suppressed.length && (!canHaveChildTag(node.tagName, suppressed[0].tagName) || !canHaveChildTag(suppressed[0].tagName, entry.tagName)) ) {
                    closed.push(suppressed.shift());
                }
                while ( suppressed.length && canHaveChildTag(suppressed[0].tagName, entry.tagName) ) {
                    node = node.appendChild(suppressed.shift());
                }
                node = node.appendChild(entry);
                while (closed.length) {
                    suppressed.unshift(closed.pop());
                }
                return node;
            }

            /**
             * returns true if the entry.annotation is present in any entry already
             * in the suppressed list.
             */
            function isSuppressed(suppressed, entry) {
                for ( var i=0,l=suppressed.length; i<l; i++ ) {
                    if ( suppressed[i].annotation == entry.annotation ) {
                        return true;
                    }
                }
                return false;
            }

            /**
             * This implements a very basic domElement. It references the entry
             * that causes its existence. One entry may cause more than one Element
             * to exist, to fullfill the nesting structure.
             * This Element is only used to render correct HTML, so there is no need
             * to implement a more comprehensive or consistent dom api.
             */
            function Element(entry, parentNode)
            {
                this.tag         = (typeof entry != 'undefined') ? entry.annotation.tag : '';
                this.entry       = entry;
                this.tagName     = this.tag ? stripTag(this.tag) : '';
                this.parentNode  = parentNode;
                this.childNodes  = [];
                Object.defineProperty(this, 'previousSibling', {
                    get() {
                        var pos = this.parentNode.childNodes.indexOf(this);
                        if (pos) {
                            return this.parentNode.childNodes[pos-1];
                        } else {
                            return null;
                        }
                    }
                });
                Object.defineProperty(this, 'nextSibling', {
                    get() {
                        var pos = this.parentNode.childNodes.indexOf(this);
                        if (pos<(this.parentNode.childNodes.length-1)) {
                            return this.parentNode.childNodes[pos+1];
                        } else {
                            return null;
                        }
                    }
                });
                Object.defineProperty(this, 'lastChild', {
                    get() {
                        return this.childNodes.length ? this.childNodes[this.childNodes.length-1] : null;
                    }
                });
                Object.defineProperty(this, 'firstChild', {
                    get() {
                        return this.childNodes.length ? this.childNodes[0] : null;
                    }
                });
                /**
                 * Appends a new Element, created from the given entry, to this element
                 */
                this.appendChild = function( entry )
                {
                    var child = new Element(entry, this );
                    this.childNodes.push( child );
                    return child;
                };
                /**
                 * Removes a child element
                 */
                this.removeChild = function( element )
                {
                    var position = this.childNodes.indexOf(element);
                    if (position>=0) {
                        this.childNodes.splice(position, 1);
                    }
                    return element;
                };
                /**
                 * Returns true if this element has non-empty text nodes (strings)
                 * or elements with entry type 'insert'.
                 */
                this.hasContents = function()
                {
                    for ( var i=0,l=this.childNodes.length;i<l;i++ ) {
                        if ( typeof this.childNodes[i]=='string' ) {
                            if ( this.childNodes[i].length ) {
                                return true;
                            }
                        } else if ( this.childNodes[i].hasContents() ) {
                            return true;
                        }
                    }
                    return this.entry.type=='insert';
                };
            }

            /**
             * This function tries to find the last leaf node before the current pointer
             * where the entry can be legally appended
             * If no valid node is found, it returns null (rootElement.parentNode)
             */
            function findValidLocation(pointer, entry) {
                while ( pointer && !childAllowed(pointer, entry.tagName) ) {
                    if ( pointer != rootElement ) {
                        suppressed.push(pointer.entry);
                        if (!pointer.hasContents() ) { 
                            var prev = pointer.previousSibling;
                            pointer.parentNode.removeChild(pointer);
                            // FIXME: merge split elements from single range, if possible
                            // get deepest last leaf node of previous sibling
                            if (prev && prev.tag) {
                                while (prev.lastChild && prev.lastChild.tag) {
                                    prev = prev.lastChild;
                                }
                            }
                            // then walk up to see if child is allowed there
                            while (prev && prev.tag && !childAllowed(prev, entry.tagName) ) {
                                prev = prev.parentNode;
                            }
                            if (prev && prev.tag) {
                                pointer = prev;
                                // remove suppressed that are now parentNodes again
                                while (prev) {
                                    suppressed = suppressed.filter(function(sup) {
                                        return sup != prev.entry;
                                    });
                                    prev = prev.parentNode;
                                }
                                break; // pointer is now correct, so don't set it to parentNode
                            }
                        }
                    }
                    pointer = pointer.parentNode;
                }
                return pointer;
            }

            /**
             * This function applies a single entry to the dom tree.
             * If the entry is of type 'start' or 'insert', it will try to append a child
             * If the entry is of type 'end', it will set the pointer to the
             * nearest parent node that has the same tagName (FIXME: might need to match annotation instead)
             * If a start or insert element cannot be appended, it will push the entry to the suppressed stack
             * Any nodes passed when 'walking' up the tree, will also be pushed on the suppressed stack
             * After each succesful start/end entry, all entries in the suppressed stack will be tried again.
             */
            function insertEntry(current, entry)
            {
                var pointer = current;
                switch ( entry.type ) {
                    case 'text':
                        if (entry.content.trim()) { // has non whitespace content
                            while (pointer && !textAllowed(pointer)) {
                                suppressed.push(pointer.entry);
                                if (!pointer.hasContents()) {
                                    pointer.parentNode.removeChild(pointer);
                                }
                                pointer = pointer.parentNode;
                            }
                            if (pointer) {
                                pointer.childNodes.push(entry.content);
                                pointer = tryToOpen(suppressed, pointer);
                                current = pointer;
                            }
                        } else { // always allow whitespace
                            pointer.childNodes.push(entry.content);
                        }
                    break;
                    case 'start':
                        pointer = findValidLocation(pointer, entry);
                        if ( pointer ) {
                            // this forces entry to be appended, as well as as much of
                            // the suppressed list as parent of entry as possible
                            pointer = appendValidEntries(pointer, suppressed, entry);
                            // then whatever remains suppressed is appended if possible
                            pointer = tryToOpen(suppressed, pointer);
                            current = pointer;
                        } else {
                            // this entry cannot be rendered to html here,
                            // so push it on the suppressed list to try later
                            // FIXME: is this correct? root element should allow any tag
                            // so a start is always successfull and can only later be removed
                            suppressed.push(entry);
                        }
                    break;
                    case 'end':
                        if ( isSuppressed(suppressed, entry) ) {
                            suppressed = suppressed.filter(function(suppressedEntry) {
                                return suppressedEntry.annotation!=entry.annotation;
                            });
                            break;
                        }
                        while ( pointer && pointer.entry && pointer.entry.annotation != entry.annotation ) {
                            if ( pointer != rootElement ) {
                                suppressed.push(pointer.entry);
                                if (!pointer.hasContents() ) {
                                    pointer.parentNode.removeChild(pointer);
                                }
                            }
                            pointer = pointer.parentNode;
                        }
                        if ( pointer && pointer!=rootElement ) {
                            if ( !pointer.hasContents() && pointer.parentNode ) {
                                // clean up empty elements
                                // won't clean up insert type entries, since they'll never have an 'end' entry
                                pointer.parentNode.removeChild(pointer);
                            }
                            pointer = pointer.parentNode;
                            pointer = tryToOpen(suppressed,pointer);
                            current = pointer;
                        }
                    break;
                    case 'insert':
                        while ( pointer && !childAllowed(pointer, entry.tagName) ) {
                            pointer = pointer.parentNode;
                        }
                        if ( pointer ) {
                            pointer.appendChild(entry, true);
                        }
                    break;
                }
                return current;
            }
            relativeList.reduce(insertEntry, rootElement);

            return rootElement;
        }
        /**
         * This function escapes the special characters <, >, &, " and '
         */
        function escapeHTML(text) {
            return text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        /**
         * This function renders the dom tree to a valid HTML string
         */
        function renderElement(element) {
            var html = '';
            if ( typeof element == 'string' ) {
                html += escapeHTML(element);
            } else if ( Array.isArray(element) ) {
                for (var i=0,l=element.length; i<l; i++ ) {
                    html += renderElement(element[i]);
                }
            } else if ( element.tagName ) {
                html += '<'+element.entry.annotation.tag+'>';
                if ( canHaveChildren(element.tagName) ) {
                    html+=renderElement(element.childNodes);
                    html += '</'+element.tagName+'>';
                }
            } else if ( typeof element.childNodes != undefined ) { // rootElement
                html += renderElement(element.childNodes);
            }
            return html;
        }

        /**
         * Renders a cobalt fragment to a HTML string
         */
    	var cobaltHTML = {
        	render: function(fragment) {
            	var root = getDomTree(fragment);
            	return renderElement(root);
        	},
    		parse: function(html) {
    	        // do stuff
        	},
    		rules: rules
    	};

    var cobalt$1 = {
        range:      cobaltRange,
        annotation: cobaltAnnotation,
        mime:       mime,
        fragment:   cobaltFragment,
        html:       cobaltHTML,
    };

    return cobalt$1;

})));
