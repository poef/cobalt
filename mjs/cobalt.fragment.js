/**
 * Cobalt Fragment type
 * A Fragment is a combination of plain text and a list of annotations.
 * The list of annotations will always be sorted by start and then end position.
 * A fragment is immutable, all operations on it return a new fragment.
 */

import CobaltAnnotationList from './cobalt.annotationlist.js';
import cobalt from './cobalt.js';

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

    /**
     * Parses a mime encoded cobalt document, and returns a new CobaltFragment
     * TODO: allow mimeDoc as single parameter of cobaltDocument(), not fragment.
     * cobaltDocument can allow more than one cobaltFragment or other types of
     * subdocuments.
     */
    parse(mimeDoc) {
        var mime = cobalt.mime.decode(mimeDoc);
        var text = '', annotations = '';
        mime.parts.forEach(p => {
            if (p.headers && p.headers['content-type']) {
                if (p.headers['content-type']=='text/plain') {
                    text = p.message;
                } else if (p.headers['content-type']=='text/cobalt') {
                    annotations = p.message;
                }
            }
        });
        return new CobaltFragment(text, annotations);
    }
};

export default function(text, annotations) {
    if ( text instanceof CobaltFragment ) {
        // because CobaltFragment is immutable, we can just return it.
        return text;
    } else {
        return new CobaltFragment(text, annotations);
    }
};
