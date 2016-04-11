cobalt.editor = (function(self) {

    function cobaltSelection(start, end, editor) {
        // fixme: selection is now limited to single continous range
        this.start  = start;
        this.end    = end;
        this.editor = editor;
    }

    cobaltSelection.prototype = {
        constructor: cobaltSelection,
        getRange: function() {
            if ( this.start < this.end ) {
                return cobalt.range(this.start, this.end);
            } else {
                return cobalt.range(this.end, this.start);
            }
        },
        getCursor: function() {
            return this.end;
        },
        collapse: function(toStart) {
            if (toStart) {
                this.end = this.start;
            } else {
                this.start = this.end;
            }
            return this;
        },
        collapseToSmallest: function() {
            if ( this.end < this.start ) {
                this.start = this.end;
            } else {
                this.end = this.start;
            }
            return this;
        },
        move: function(distance) {
            this.start = Math.min(this.editor.fragment.text.length,
                Math.max(0, this.start + distance));
            this.end   = Math.min(this.editor.fragment.text.length,
                Math.max(0, this.end + distance));
            return this;
        },
        isEmpty: function() {
            return (this.start==this.end);
        },
        grow: function(size) {
            this.end = Math.min( this.editor.fragment.text.length,
                Math.max(0, this.end + size));
            return this;
        },
        clone: function() {
            return new cobaltSelection(this.start, this.end, this.editor);
        }
    }

    function addSelection(fragment, selection) {
        return fragment
            .apply(selection.clone().collapse().getRange(), 'img class="cobalt-cursor"')
            .apply(selection.getRange(), 'span class="cobalt-selection"');
    }

    function cobaltEditor(el, debug)
    {
        this.container = ( typeof el == 'string' ? document.querySelector(el) : el );
        this.selection = new cobaltSelection(0,0,this);
        this.fragment  = cobalt.fragment('','');
        var editor = this;
        this.container.addEventListener('keypress', function(evt) {
            handleKeyPressEvent.call(editor, evt);
        });
        this.container.addEventListener('keydown', function(evt) {
            handleKeyDownEvent.call(editor, evt);
        });
        if (debug) {
            this.debug = (typeof debug=='string' ? document.querySelector(debug) : debug);
        }
    }

    cobaltEditor.prototype = {
        constructor: cobaltEditor,
        focus: function() {
            this.container.focus();
        },
        render: function() {
            var renderFragment = addSelection(this.fragment, this.selection);
            var html = cobalt.html.render(renderFragment);
            this.container.innerHTML = html;
            if (this.debug) {
                this.debug.innerText = '['+this.selection.start+','+this.selection.end+"]\n"+renderFragment;
            }
        },
        deleteSelection: function() {
            var r = this.selection.getRange();
            if (r.size) {
                this.fragment = this.fragment.delete(r);
            }
            this.selection.collapseToSmallest();
        },
        keymap: {
            'ArrowLeft': function() {
                this.selection.collapse().move(-1);
                this.render();
            },
            'ArrowRight': function() {
                this.selection.collapse().move(1);
                this.render();
            },
            'Shift+ArrowLeft': function() {
                this.selection.grow(-1);
                this.render();
            },
            'Shift+ArrowRight': function() {
                this.selection.grow(1);
                this.render();
            },
            'Backspace': function() {
                if ( this.selection.isEmpty() ) {
                    this.selection.grow(-1);
                }
                this.fragment = this.fragment.delete(this.selection.getRange());
                this.selection.collapseToSmallest();
                this.render();
            },
            'Delete': function() {
                if ( this.selection.isEmpty() ) {
                    this.selection.grow(1);
                }
                this.fragment = this.fragment.delete(this.selection.getRange());
                this.selection.collapseToSmallest(true);
                this.render();
            },
            'Enter': function(range) {
                var r = this.selection.getRange();
                this.fragment = this.fragment.insert(r, "\n");
                this.fragment = this.fragment.apply(cobalt.range(r.start, r.start+1), 'br');
                this.selection.collapseToSmallest().move(1);
                this.render();
            }

        }
    }

    function handleKeyPressEvent(evt)
    {
        if ( !evt.ctrlKey && !evt.altKey ) {
            var range = this.selection.getRange();
            var char  = cobalt.keyboard.getCharacter(evt);
            if (char) {
                if (range.length) {
                    this.fragment = this.fragment.delete(range);
                }
                this.fragment = this.fragment.insert(range.start, char);
                this.selection.collapse().move(1);
                this.render();
            }
        }
        evt.preventDefault();
        evt.stopPropagation();
        return false;
    }

    function handleKeyDownEvent(evt)
    {
        var key = cobalt.keyboard.getKey(evt);
        if ( this.keymap[key] ) {
            var range = this.selection.getRange();
            this.keymap[key].call(this, range);
            evt.preventDefault();
            evt.stopPropagation();
            return false;
        }
    }


    self.create = function(el, debug)
    {
        var editor = new cobaltEditor(el, debug);
        editor.render();
        return editor;
    };

    return self;
})({});

cobalt.keyboard = require('./cobalt.keyboard');
