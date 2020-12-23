import cobalt from './cobalt.js';

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
export default class CobaltAnnotationList {
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
        if ( range instanceof CobaltAnnotationList ) {
            // FIXME: fill in
        } else {
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
};
