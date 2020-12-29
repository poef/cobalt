import cobalt from './cobalt.js';

class cobaltEditorTag {

	constructor(editor, tag) {
		this.editor = editor;
		this.tag    = tag;
	}

	render() {

	}	

	/**
	 * list of keys to handle onKeyDown
	 */
	keymap = {
        'Backspace': function(sel) {
            if ( !sel.range.size ) {
                sel.range = cobalt.range(sel.range.start - 1, sel.range.end);
            }
            this.editor.fragment = this.editor.fragment.delete(sel.range);
            sel.range = sel.range.collapse();
            this.editor.render(sel);
        },
        'Delete': function(sel) {
            if ( !sel.range.size ) {
                sel.range = cobalt.range(sel.range.start, sel.range.end+1);
            }
            this.editor.fragment = this.editor.fragment.delete(sel.range);
            sel.range = sel.range.collapse();
            this.editor.render(sel);
        },
		'Enter': function(sel) {
			this.editor.fragment = this.editor.fragment.insert(sel.range, "\n");
            sel.range = sel.range.collapse().move(1);
            sel.cursor = sel.range.end;
            this.editor.fragment = this.editor.fragment.clear(cobalt.range(sel.range.start-1,sel.range.start));
            this.editor.render(sel);
   		},
   		'Shift+Enter': function(sel) {
			this.editor.fragment = this.editor.fragment.insert(sel.range, "\n");
            sel.range = sel.range.collapse().move(1);
            sel.cursor = sel.range.end;
            this.editor.render(sel);   			
   		}
	}

	update(sel) {
		this.editor.toggle(sel.range, this.tag, sel.cursor);
	}
}

export default cobaltEditorTag;