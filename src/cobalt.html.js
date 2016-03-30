/*
TODO:
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
        },
        specialRules: {
            'a': function(node) {
                //FIXME: should add a way to render overlapping anchors in an alternative way
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

    /**
     * Return the first word of a tag.
     */
    function stripTag(tag) {
        return tag.split(' ')[0];
    }

    /**
     * Returns an array of entries. Each entry is either a start, end or insert entry
     * for a single range of an annotation. The entries are sorted by character offset
     * position. Each entry also calculates its character offset to the previous entry.
     */
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
                        range: range,
                        tagName: stripTag(annotation.tag)
                    });
                    list.push({
                        type: 'end',
                        annotation: annotation,
                        position: range.end,
                        range: range,
                        tagName: stripTag(annotation.tag)
                    });
                } else {
                    /*
                        annotations which have the same start and end position
                        are marked explicitly as 'insert' types. This prevents them
                        from being marked 'empty' and cleaned later.
                    */
                    list.push({
                        type: 'insert',
                        annotation: annotation,
                        position: range.start,
                        range: range,
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

    /**
     * Turns a list of annotations in a list of tag stacks, stackedList.
     * Each tag stack corresponds with a unique character position.
     * The stackList is sorted by character position.
     */
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
        /* the current pointer in the dom */
        var current     = rootElement;
        /* the current character offset position */
        var position    = 0;

        /* get a list with start/end/insert entry stack for each position where there is at least one entry */
        var stackedList = getStackedList(fragment.annotations);

        /**
         * This method tries to express any entry that was suppressed
         * It also removes entries that are not relevant any more (their end position has been passed)
         */
        function tryOpenSuppressed(pointer) {
            var skipped = [];
            while (suppressed.length) {
                var open = suppressed.pop();
                if ( open.range.end > position ) {
                    if ( canHaveChildTag(pointer.tagName, open.tagName) ) {
                        pointer = pointer.appendChild(open);
                    } else {
                        skipped.push(open);
                    }
                }
            }
            while ( skipped.length ) {
                suppressed.push(skipped.pop());
            }
            return pointer;
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
         * This function applies a single entry to the dom tree.
         * If the entry is of type 'start' or 'insert', it will try to append a child
         * If the entry is of type 'end', it will set the pointer to the
         * nearest parent node that has the same tagName (FIXME: might need to match annotation instead)
         * If a start or insert element cannot be appended, it will push the entry to the suppressed stack
         * Any nodes passed when 'walking' up the tree, will also be pushed on the suppressed stack
         * After each succesful start/end entry, all entries in the suppressed stack will be tried again.
         */
        function insertEntry(entry)
        {
            var pointer = current;
            switch ( entry.type ) {
                case 'start':
                    while ( pointer && !childAllowed(pointer, entry.tagName) ) {
                        if ( pointer != rootElement ) {
                            suppressed.push(pointer.entry);
                            if (!pointer.hasContents() ) {
                                pointer.parentNode.removeChild(pointer);
                            }
                        }
                        pointer = pointer.parentNode;
                    }
                    if ( pointer ) {
                        pointer = pointer.appendChild( entry );
                        pointer = tryOpenSuppressed(pointer);
                        current = pointer;
                    } else {
                        suppressed.push(entry);
                    }
                break;
                case 'end':
                    var hasContents = false;
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
                        pointer = tryOpenSuppressed(pointer);
                        current = pointer;
                    } else {
                        suppressed.push(entry);
                    }
                break;
                case 'insert':
                    while ( pointer && !childAllowed(pointer, entry.tagName) ) {
                        pointer = pointer.parentNode;
                    }
                    if ( pointer ) {
                        pointer.appendChild(entry, true);
                        pointer = null;
                    }
                break;
            }
        };

        /*
        Try to apply each entry to the dom tree. When the position moves,
        add a text node with the correct content. Also filter the suppressed
        stack to remove passed entries.
        */
        stackedList.reduce(function(currentNode, stack) {
            if ( stack[0].offset ) {
                var text = fragment.text.substr(position, stack[0].offset);
                current.childNodes.push(text);
                position += stack[0].offset;
                suppressed = suppressed.filter(function(entry) {
                    return entry.range.end > position;
                });
            }
            stack.forEach(insertEntry);
            //skipped.forEach(insertEntry);
            return current;
        }, rootElement);

        // add the remainder of the text, if available.
        if ( position < fragment.text.length ) {
            var text = fragment.text.substr(position);
            rootElement.childNodes.push(text);
        }

        return rootElement;
    };

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
        } else if ( element.tagName ) { //
            html += '<'+element.entry.annotation.tag+'>';
            if ( canHaveChildren(element.tagName) ) {
                for (var i=0,l=element.childNodes.length; i<l; i++ ) {
                    html += renderElement(element.childNodes[i]);
                }
                html += '</'+element.tagName+'>';
            }
        } else if ( typeof element.childNodes != undefined ) { // rootElement
            for (var i=0,l=element.childNodes.length; i<l; i++ ) {
                html += renderElement(element.childNodes[i]);
            }
        }
        return html;
    }

    /**
     * Renders a cobalt fragment to a HTML string
     */
    self.render = function(fragment) {
        var root = getDomTree(fragment);
        return renderElement(root);
    }

    return self;
})(cobalt.html || {});