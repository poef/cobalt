/**
 * Cobalt DOM
 */
module.exports = function(text, annotations)
{

    function Entry(document)
    {
        this.document   = document;
        this.next       = null;
        this.prev       = null;
    }

    Entry.prototype = {
        constructor: Entry,
        get index () {
            // return index of entry in the list
        },
        get position () {
            // return the position in the text for this entry
        },
        set position () {
            // move the entry to the last index in the list where it matches with the given position
        },
        delete: function() {
            var prev = this.prev;
            var next = this.next;
            if (prev) {
                prev.next = next;
            }
            if (next) {
                next.prev = prev;
            }
            if ( this.document.head == this ) {
                this.document.head = next;
            }
            if ( this.document.tail == this ) {
                this.document.tail = prev;
            }
        }
    };

    function InsertEntry(document, annotation)
    {
        Entry.call(this, document);
        this.annotation = annotation;
        this.annotation.addEntry(this);
    }

    InsertEntry.prototype = {
        __proto__: Entry.prototype,
        constructor: InsertEntry
    };

    function TextEntry(document, text)
    {
        Entry.call(this, document);
        this.text     = text;
    }

    TextEntry.prototype = {
        __proto__: Entry.prototype,
        constructor: TextEntry
    }

    function StartEntry(document,annotation)
    {
        Entry.call(this, document);
        this.annotation = annotation;
        this.end        = null
    }

    StartEntry.prototype = {
        __proto__: Entry.prototype,
        constructor: StartEntry,
        delete: function() {
            this.prototype.delete();
            if (this.end) {
                this.end.delete();
            }
        }
    }

    function EndEntry(document,annotation)
    {
        Entry.call(this, document);
        this.annotation = annotation;
        this.start      = null;
    }

    EndEntry.prototype = {
        __proto__: Entry.prototype,
        constructor: EndEntry,
        delete: function() {
            this.prototype.delete();
            if (this.start) {
                this.start.delete();
            }
        }
    }

    function domClassList()
    {
        this.classes = {};
        this.add(arguments);
    }

    domClassList.prototype = {
        constructor: classList,
        add: function()
        {
            for ( var i=0, l=arguments.length; i<l; i++ ) {
                var className = getClassName(arguments[i]);
                if ( className ) {
                    this.classes[className] = true;
                }
            }
        },
        remove: function()
        {
            for ( var i=0,l=arguments.length; i<l; i++ ) {
                var className = getClassName(arguments[i]);
                if ( className ) {
                    delete this.classes[className];
                }
            }
        },
        item: function(index)
        {
            return Object.keys(this.classes)[index];
        },
        toggle: function(className, force)
        {
            className = getClassName(className);
            if (className) {
                if ( force===false || (force!=true && typeof this.classes[className] != undefined) ) {
                    delete this.classes[className];
                } else {
                    this.classes[className] = true;
                }
            }
        },
        contains: function(className)
        {
            className = getClassName(className)
            return (className && typeof this.classes[className]!=undefined);
        }
    }

    function domAnnotation(annotation)
    {
        function trim(str)
        {
            var str = str.replace(/^\s\s*/, ''),
                ws = /\s/,
                i = str.length;
            while (ws.test(str.charAt(--i)));
            return str.slice(0, i + 1);
        }

        function stripQuotes(str)
        {
            str = trim(str);
            str = str.replace(/["']/g, '');
            return str;
        }

        var elements    = annotation.split(/\s/);
        this.tagName    = elements.shift().toLowerCase();
        this.attributes = {
            get id () {
                return this.id;
            },
            get className () {
                return this.classList.join(' ');
            }
        };
        elements.forEach(function(el) {
            var nameValuePair = el.split('=',1);
            switch(nameValuePair[0]) {
                case 'class':
                    if ( typeof nameValuePair[1] != undefined ) {
                        this.classList = new domClassList(stripQuotes(nameValuePair[1]));
                    }
                break;
                case 'id':
                    if ( typeof nameValuePair[1] != undefined ) {
                        this.id = stripQuotes(nameValuePair[1]);
                    }
                break;
                default:
                    // check if name starts with 'data-'
                    this.attributes[nameValuePair[0]] = stripQuotes(nameValuePair[1]);
                break;
            }
        });
    }


    /**
     * A domCursor is a pointer to a spot in the domList. It consists
     * of an entry and optional offset if that entry is a TextEntry.
     * The domCursor may also point to the document itself.
     */
    function domCursor(entry, offset)
    {
        this.entry  = entry;
        if ( typeof entry == 'TextEntry' ) {
            this.offset = Math.min(entry.text.length,offset);
        } else {
            this.offset = 0;
        }
    }

    domCursor.prototype = {
        constructor: domCursor,
        get position () {
            var current  = this.document.head;
            var position = 0;
            while (current && current!=this.entry) {
                if (typeof current == 'TextEntry') {
                    position += current.text.length;
                }
                current = current.next;
            }
            if ( current && typeof current == 'TextEntry' ) {
                position += Math.min(current.text.length, this.offset);
            }
            return position;
        }
    }

    /**
     * A domRange consists of a startCursor and endCursor, in the same document
     *
     */
    function domRange(startCursor, endCursor)
    {
        if ( startCursor.document!=endCursor.document ) {
            throw new domException('start and end cursor not in the same document');
        }
        this.start    = startCursor;
        this.end      = endCursor;
    }


    function domList(text, annotations)
    {
        this.head     = null;
        this.tail     = null;
        this.document = this;
    }

/*
        insertBefore: function(entry)
        {
            var prev       = this.prev;
            this.prev      = entry;
            entry.next     = this;
            entry.prev     = prev;
            if (prev) {
                prev.next  = entry;
            }
            entry.document = this.document;
            if ( this.document.head == this ) {
                this.document.head = entry;
            }
        },
        appendEntry: function(entry)
        {
            var next       = this.next;
            this.next      = entry;
            entry.next     = next;
            entry.prev     = this;
            if ( next ) {
                next.prev  = entry;
            }
            entry.document = this.document;
            if ( this.document.tail == this ) {
                this.document.tail = entry;
            }
        },
*/

    domList.prototype = {
        constructor: domList,
        apply: function(domRange, tag)
        {
            // add annotation for the tag

        },
        remove: function(domRange, tag)
        {

        }
        insert: function(position, fragment)
        {

        },
        copy: function(domRange)
        {

        },
        delete: function(domRange)
        {

        },
        search: function(range, searchRe)
        {

        },
        query: function(domRange, selector)
        {

        }
    }

}(cobalt.dom||{});