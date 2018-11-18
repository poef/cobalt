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
                var list = this.list.slice();
                list.push(
                    cobalt.annotation(range,tag)
                );

                return new cobaltAnnotationList(list);
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
                    if ( ann.has(tag) ) {
                        var r = ann.range.exclude(range);
                        if ( r && r.start != null ) {
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
        query: function( selector, max ) {
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
        },
        forEach: function( f ) {
            this.list.forEach(f);
        },
/*        copy: function( range ) {
            return this.filter(function(a) {
                if (a.range.overlaps(range)) {
                    return a;
                }
            });
        },
*/
        has: function( range, tag ) {
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
                ann = ann.delete(range);
                if ( ann ) {
                    result.push(ann);
                }
            });
            return new cobaltAnnotationList(result);
        },
        copy: function(annotations, range) {
            result = [];
            annotations.forEach(function(ann) {
                if ( ann.range.overlaps(range) ) {
                    result.push( cobalt.annotation( ann.range.intersect(range), ann.tag ) );
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
            range = cobalt.range(range);
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
            range = cobalt.range(range);
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
        insert: function( range, fragment ) {
            range = cobalt.range(range);
            fragment = new cobaltFragment(fragment);
            result = this.delete(range);
            return new cobaltFragment(
                cobaltText.insert( result.text, fragment.text, range.start ),
                cobaltAnnotations
                .insert( result.annotations, range.start, fragment.text.length )
                .apply( cobaltAnnotations.insert( fragment.annotations, 0, range.start ) )
            );
        },
        /**
         * Returns a new range, with the given range/tag or annotation or annotationlist applied
         */
        apply: function( range, tag ) {
            range = cobalt.range(range);
            return new cobaltFragment(
                this.text,
                this.annotations.apply( range, tag )
            );
        },
        /**
         * Returns a new range, with the given range/tag or annotation or annotationlist removed
         */
        remove: function( range, tag ) {
            range = cobalt.range(range);
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
        },
        /**
         * Search through the annotations using a query language approximately like css selectors.
         * Returns a range object encompassing all matched ranges.
         */
        query: function( selector ) {
            return this.annotations.query(selector, this.text.length);
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