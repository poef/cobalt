/*
1 forEach annotation from list
2a is it an insert annotation (open and close) -> put it in the insert list, else
2b is it an open annotation -> put it in the open list, else
2c -> put it in the close list

3 forEach close annotation
4 does it match the current parent -> push it on the close stack, set current parent to its parent
5 repeat untill close annotations stays the same, rest is ignored

6 forEach open annotation
7 is it allowed as child from current parent -> push it on the open stack, set parent to current tag
8 else repeat for parent (up to starting parent from 6)
9 repeat untill open annotations stay the same, rest is ignored

10 forEach insert annotation
11 check if it is allowed as child of current parent -> insert it in the open stack (open and close)
12 else repeat for parent (up to starting parent from 6)
13 if not allowed, do the same for the close stack, up to parent from step 3
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
        'h1': rules.inline,
        'h2': rules.inline,
        'h3': rules.inline,
        'p': rules.inline.concat(['br']),
        'ol': ['li'],
        'ul': ['li'],
        'blockquote': rules.alltags,
        'br': [],
        'em': rules.inline,
        'strong': rules.inline,
        'a': rules.inline.filter(function(tag) { return tag!='a'; }),
        '_': rules.alltags
    };
    rules.toplevel = rules.block.filter(function(tag) { return tag!='li';});

    function canHaveChildren(tag)
    {
        return (typeof rules.cannotHaveChildren[tag] == 'undefined' );
    }

    function canHaveChild(parent, child)
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
            if ( a.type == 'start' && b.type == 'end' ) {
                return 1;
            }
            if ( a.type == 'end' && b.type == 'start' ) {
                return -1;
            }
            if ( a.type == 'start' && a.end > b.end ) {
                return -1;
            }
            if ( a.type == 'start' && a.end < b.end ) {
                return 1;
            }
            if ( a.type == 'end' && a.start < b.start ) {
                return 1;
            }
            if ( a.type == 'end' && a.start > b.start ) {
                return -1;
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

        function removeEmptyNodes(node) {
            return node;
        }

        function reopenClosed(pointer, closed) {
            var skipped = [];
            while (closed.length) {
                var reopen = closed.pop();
                if ( canHaveChild(pointer.tagName, reopen.tagName) ) {
                    pointer = pointer.appendChild(reopen.tag);
                } else {
                    skipped.push(reopen);
                }
            }
            while ( skipped.length ) {
                closed.push(skipped.pop());
            }
            return pointer;
        }

        function Element(tag, parentNode) {
            this.tag         = tag;
            this.tagName     = tag ? stripTag(tag) : '';
            this.parentNode  = parentNode;
            this.childNodes  = [];
            this.appendChild = function( tag ) {
                var child = new Element(tag, this );
                this.childNodes.push( child );
                return child;
            }
        }

        var root     = new Element();
        var current  = root;
        var position = 0;
        var stackedList = getStackedList(fragment.annotations);

        stackedList.reduce(function(currentNode, stack) {
            var skipped = [];
            if ( stack[0].offset ) {
                var text = fragment.text.substr(position, stack[0].offset);
                current.childNodes.push(text);
                position += stack[0].offset;
            }
            stack.forEach(function(entry) {
                var pointer = current;
                var closed  = [];
                switch ( entry.type ) {
                    case 'start':
                        while ( pointer && !canHaveChild(pointer.tagName, entry.tagName ) ) {
                            closed.push(pointer);
                            pointer = pointer.parentNode;
                        }
                        if ( pointer ) {
                            pointer = pointer.appendChild( entry.tag );
                            pointer = reopenClosed(pointer, closed);
                        }
                    break;
                    case 'end':
                        while ( pointer && pointer.tagName!= entry.tagName ) {
                            closed.push(pointer);
                            pointer = pointer.parentNode;
                        }
                        if ( pointer ) {
                            pointer = pointer.parentNode;
                            pointer = reopenClosed(pointer, closed);
                        }
                    break;
                    case 'insert':
                        while ( pointer && !canHaveChild(pointer.tagName, entry.tagName) ) {
                            pointer = pointer.parentNode;
                        }
                        if ( pointer ) {
                            pointer.appendChild(entry.tag);
                            pointer = null;
                        }
                    break;
                }
                if (pointer) {
                    current = pointer;
                } else {
                    skipped.push(entry);
                }
            });
            return current;
        }, root);
        if ( position < fragment.text.length ) {
            var text = fragment.text.substr(position);
            root.childNodes.push(text);
        }
        removeEmptyNodes(root);
        return root;
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