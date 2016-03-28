/*
TODO:
- merge skipped and closed arrays as 'suppressed' stack.
  skipped contains entries, closed contains nodes
  use entries for closed as well
- add obligatory parents/children
  overwrite these with the correct tags/entries when available
*/

module.exports = (function(self) {

    /**
     * These rules define the behaviour of the rendering as well as the editor.
     */
    var rules = {
        block: ['h1','h2','h3','p','ol','ul','li','blockquote','br','hr'],
        inline: ['em','strong','a','img'],
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
        }
    };
    rules.alltags = rules.block.concat(rules.inline);
    rules.nesting = {
        'h1':         rules.inline,
        'h2':         rules.inline,
        'h3':         rules.inline,
        'p':          rules.inline.concat(['br']),
        'ol':         ['li'],
        'ul':         ['li'],
        'blockquote': rules.alltags,
        'br':         [],
        'em':         rules.inline,
        'strong':     rules.inline,
        'a':          rules.inline.filter(function(tag) { return tag!='a'; })
    };
    rules.toplevel = rules.block.filter(function(tag) { return tag!='li';});

    function canHaveChildren(tag)
    {
        return (typeof rules.cannotHaveChildren[tag] == 'undefined' );
    }

    function canHaveChildTag(parent, child)
    {
        if ( typeof rules.nesting[parent] == 'undefined' ) {
            return true;
        } else {
            return rules.nesting[parent].indexOf(child)>-1;
        }
    }

    function stripTag(tag) {
        return tag.split(' ')[0];
    }

    function getRelativeList(annotations)
    {
        if ( !annotations || !annotations.count ) { return []; }
        var list = [];
        annotations.forEach(function(annotation) {
            annotation.range.forEach(function(range) {
                if ( range.start != range.end ) {
                    list.push({
                        type: 'start',
                        annotation: annotation,
                        position: range.start,
                        start: range.start,
                        end: range.end,
                        tag: annotation.tag,
                        tagName: stripTag(annotation.tag)
                    });
                    list.push({
                        type: 'end',
                        annotation: annotation,
                        position: range.end,
                        start: range.start,
                        end: range.end,
                        tag: annotation.tag,
                        tagName: stripTag(annotation.tag)
                    });
                } else {
                    list.push({
                        type: 'insert',
                        annotation: annotation,
                        position: range.start,
                        start: range.start,
                        end: range.end,
                        tag: annotation.tag,
                        tagName: stripTag(annotation.tag)
                    });
                }
            });
        });
        list.sort(function(a,b) {
            if (a.position < b.position) {
                return -1;
            }
            if (a.position > b.position) {
                return 1;
            }
            return 0;
        });
        list.reduce(function(position, entry) {
            entry.offset = entry.position - position;
            delete entry.position;
            return position + entry.offset;
        }, 0);
        return list;
    }

    function getStackedList(annotations)
    {
        var relativeList = getRelativeList(annotations);

        var stackedList = [];
        stackedList.push([]);
        relativeList.forEach(function(entry) {
            if ( entry.offset != 0 ) {
                stackedList.push([]);
            }
            stackedList[ stackedList.length-1 ].push(entry);
        });
        return stackedList;
    }

    function getDomTree(fragment)
    {

        function reopenClosed(pointer, closed) {
            var skipped = [];
            while (closed.length) {
                var reopen = closed.pop();
                if ( canHaveChildTag(pointer.tagName, reopen.tagName) ) {
                    pointer = pointer.appendChild(reopen.entry);
                } else {
                    skipped.push(reopen);
                }
            }
            while ( skipped.length ) {
                closed.push(skipped.pop());
            }
            return pointer;
        }

        function Element(entry, parentNode, insertion)
        {
            this.tag         = (typeof entry != 'undefined') ? entry.tag : '';
            this.entry       = entry;
            this.insertion   = insertion ? true : false;
            this.tagName     = this.tag ? stripTag(this.tag) : '';
            this.parentNode  = parentNode;
            this.childNodes  = [];
            this.appendChild = function( entry, insertion )
            {
                var child = new Element(entry, this, insertion );
                this.childNodes.push( child );
                return child;
            };
            this.removeChild = function( element )
            {
                var position = this.childNodes.indexOf(element);
                if (position>=0) {
                    this.childNodes.splice(position, 1);
                }
                return element;
            };
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
                return this.insertion;
            };
        }

        var skipped     = [];
        var rootElement = new Element();
        var current     = rootElement;
        var position    = 0;
        var stackedList = getStackedList(fragment.annotations);
        var closed      = [];

        function insertEntry(entry) {
            var pointer = current;
            switch ( entry.type ) {
                case 'start':
                    while ( pointer && !canHaveChildTag(pointer.tagName, entry.tagName ) ) {
                        closed.push(pointer);
                        if (!pointer.hasContents() ) {
                            pointer.parentNode.removeChild(pointer);
                        }
                        pointer = pointer.parentNode;
                    }
                    if ( pointer ) {
                        pointer = pointer.appendChild( entry );
                        pointer = reopenClosed(pointer, closed);
                        current = pointer;
                    } else {
                        skipped.push(entry);
                    }
                break;
                case 'end':
                    var hasContents = false;
                    while ( pointer && pointer.tagName!= entry.tagName ) {
                        closed.push(pointer);
                        if (!pointer.hasContents() ) {
                            pointer.parentNode.removeChild(pointer);
                        }
                        pointer = pointer.parentNode;
                    }
                    if ( pointer ) {
                        if ( !pointer.hasContents() && pointer.parentNode ) {
                            // clean up empty elements
                            // won't clean up insert type entries, since they'll never have an 'end' entry
                            pointer.parentNode.removeChild(pointer);
                        }
                        pointer = pointer.parentNode;
                        pointer = reopenClosed(pointer, closed);
                        current = pointer;
                    } else {
                        skipped.push(entry);
                    }
                break;
                case 'insert':
                    while ( pointer && !canHaveChildTag(pointer.tagName, entry.tagName) ) {
                        pointer = pointer.parentNode;
                    }
                    if ( pointer ) {
                        pointer.appendChild(entry, true);
                        pointer = null;
                    }
                break;
            }
        };

        stackedList.reduce(function(currentNode, stack) {
            if ( stack[0].offset ) {
                var text = fragment.text.substr(position, stack[0].offset);
                current.childNodes.push(text);
                position += stack[0].offset;
                closed = closed.filter(function(el) {
                    return (typeof el.entry != 'undefined' ) ? el.entry.end > position : false;
                });
            }
            skipped = [];
            stack.forEach(insertEntry);
            skipped.forEach(insertEntry);
            return current;
        }, rootElement);

        if ( position < fragment.text.length ) {
            var text = fragment.text.substr(position);
            rootElement.childNodes.push(text);
        }
        return rootElement;
    };

    function escapeHTML(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function renderElement(element) {
        var html = '';
        if ( typeof element == 'string' ) {
            html += escapeHTML(element);
        } else if ( element.tag ) {
            html += '<'+element.tag+'>';
            if ( canHaveChildren(element.tagName) ) {
                for (var i=0,l=element.childNodes.length; i<l; i++ ) {
                    html += renderElement(element.childNodes[i]);
                }
                html += '</'+element.tagName+'>';
            }
        } else if ( typeof element.childNodes != undefined ) {
            for (var i=0,l=element.childNodes.length; i<l; i++ ) {
                html += renderElement(element.childNodes[i]);
            }
        }
        return html;
    }

    self.render = function(fragment) {
        var root = getDomTree(fragment);
        return renderElement(root);
    }

    return self;
})(cobalt.html || {});