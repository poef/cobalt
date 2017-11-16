cobalt.editor = (function(self) {


    function cobaltEditor(el, debug)
    {
		var editor = this;
        this.container = ( typeof el == 'string' ? document.querySelector(el) : el );
		this.container.contentEditable = true;
        this.fragment  = cobalt.fragment('','');
		this.selection = cobalt.editor.selection(this);
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
        render: function(sel) {
            var html = cobalt.html.render(this.fragment);
            this.container.innerHTML = html+"\n";// extra \n is to give the browser room for a cursor
            if (sel) {
				var editor = this;
	                editor.selection.set(sel.range.collapse(), sel.range.start);
                    if (editor.debug) {
                        editor.debug.innerText = '['+sel.range.start+','+sel.range.end+"]\n"+editor.fragment;
                    }
            }
        },
		allowmap: {
			'ArrowLeft':true,
			'ArrowRight':true,
			'ArrowUp':true,
			'ArrowDown':true,
			'PageUp':true,
			'PageDown':true,
			'Home':true,
			'End':true,
			'Shift+ArrowLeft':true,
			'Shift+ArrowRight':true,
			'Shift+ArrowUp':true,
			'Shift+ArrowDown':true,
			'Shift+PageUp':true,
			'Shift+PageDown':true,
			'Shift+Home':true,
			'Shift+End':true,
			'Ctrl+ArrowLeft':true,
			'Ctrl+ArrowRight':true,
			'Ctrl+ArrowUp':true,
			'Ctrl+ArrowDown':true,
			'Ctrl+PageUp':true,
			'Ctrl+PageDown':true,
			'Ctrl+Home':true,
			'Ctrl+End':true
        },
        keymap: {
            'Backspace': function(sel) {
                if ( !sel.range.size ) {
					sel.range = cobalt.range(sel.range.start - 1, sel.range.end);
                }
                this.fragment = this.fragment.delete(sel.range);
				sel.range = sel.range.collapse();
                this.render(sel);
            },
            'Delete': function(sel) {
                if ( !sel.range.size ) {
					sel.range = cobalt.range(sel.range.start, sel.range.end+1);
                }
                this.fragment = this.fragment.delete(sel.range);
				sel.range = sel.range.collapse();
                this.render(sel);
            },
            'Enter': function(sel) {
                this.fragment = this.fragment.insert(sel.range, "\n");
                sel.range = sel.range.collapse().move(1);
                this.render(sel);
            }
        }
    }

    function handleKeyPressEvent(evt)
    {
        if ( !evt.ctrlKey && !evt.altKey ) {
            var sel  = this.selection.get();
            var char = cobalt.keyboard.getCharacter(evt);
            if (char) {
				this.fragment = this.fragment.insert(sel.range, char);
                sel.range = sel.range.collapse().move(1);
                this.render(sel);
            }
        }
		var key = cobalt.keyboard.getKey(evt);
		if (!this.allowmap[key]) {
            evt.preventDefault();
            evt.stopPropagation();
            return false;
        }
    }

    function handleKeyDownEvent(evt)
    {
        var key = cobalt.keyboard.getKey(evt);
        if ( this.keymap[key] ) {
            var sel = this.selection.get();
            this.keymap[key].call(this, sel);
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
})(cobalt.editor||{});

cobalt.keyboard = require('./cobalt.keyboard');
cobalt.editor.selection = require('./cobalt.editor.selection');