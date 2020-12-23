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
- allow block elements inside anchor elements, if anchor elements direct parent allows
  block elements as children.
*/

    /**
     * These rules define the behaviour of HTML rendering.
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
        /* the current pointer in the dom */
        var current     = rootElement;
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
        };

        relativeList.reduce(insertEntry, rootElement);

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

    export default cobaltHTML;
