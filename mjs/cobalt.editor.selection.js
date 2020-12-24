import cobalt from './cobalt.js';

function getSelection(editor) {
    var getOffset = function(offset, node) {
        var treeWalker = document.createTreeWalker(
            editor.container,
            NodeFilter.SHOW_TEXT,
            function(node) {
                return NodeFilter.FILTER_ACCEPT;
            },
            false
        );
        var getPrevNode = function(node) {
            treeWalker.currentNode = node;
            return treeWalker.previousNode();    
        };
        if (node.nodeType==Node.ELEMENT_NODE) {
            var cobaltOffset = 0;
            var newNode = node.childNodes.item(offset);
            if (newNode) {
                node = newNode;
            }
        } else {
            var cobaltOffset = offset;
        }
        var textContent = "";

        while (node = getPrevNode(node) ) {
            textContent = node.textContent;
            cobaltOffset += textContent.length;
        }
        return cobaltOffset;
    };
    var sel   = window.getSelection();
    if (sel && sel.focusNode) {
        var end   = getOffset(sel.focusOffset, sel.focusNode);
        var start = getOffset(sel.anchorOffset, sel.anchorNode);
        if (start<=end) {
            return {
                range: cobalt.range(start, end),
                cursor: end
            };
        } else {
            return {
                range: cobalt.range(end, start),
                cursor: end
            };
        }
    } else {
        return { range: cobalt.range(0,0), cursor: 0 };
    }
}

function setSelection(editor, range, cursor) {
    var treeWalker = document.createTreeWalker(
        editor.container,
        NodeFilter.SHOW_TEXT,
        function(node) {
            return NodeFilter.FILTER_ACCEPT;
        },
        false
    );
    var getOffsetAndNode = function(offset) {
        var getNextNode = function(node) {
            treeWalker.currentNode = node;
            return treeWalker.nextNode();    
        };
        var node = getNextNode(editor.container);
        var currOffset = 0;
        var lastNode = editor.container;
        while (node && currOffset<=offset) {
            if ((node.textContent.length + currOffset) < offset ) {
                currOffset += node.textContent.length;
                lastNode = node;
                node = getNextNode(node);
            } else {
                break;
            }
        }
        if (!node) {
            node = lastNode;
        }
        return {
            node: node,
            offset: offset - currOffset
        }
    };

    if (cursor == range.start) {
        var end   = getOffsetAndNode(range.start);
        var start = getOffsetAndNode(range.end);
    } else {
        var start = getOffsetAndNode(range.start);
        var end   = getOffsetAndNode(range.end);
    }
    var range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

export default {
    get: getSelection,
    set: setSelection
};