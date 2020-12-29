import cobalt from './cobalt.js';
import cobaltKeyboard from './cobalt.editor.keyboard.js';
import cobaltEditorSelection from './cobalt.editor.selection.js';
import cobaltEditorTag from './cobalt.editor.tag.js';
/**
 * This class implements a basic cobalt editor in a web browser
 * It uses a contendEditable field in the browser for cursor
 * control and selections. All transformations are done using
 * cobalt primitives.
 */
class cobaltEditor {

    /**
     * The root DOMElement in the browser that contains the HTML 
     * rendering of the cobaltDocument
     */
    container = null;

    /**
     * The cobaltDocument to edit and render
     */
    fragment = null;

    /**
     * Contains the get/set conversion from/to the window.selection
     * in the browser and the cobaltRange.
     */
    selection = null;

    /**
     * Contains a set tags/annotations to apply on the next 
     * character inserted. This is emptied after any key up.
     * TODO: also empty it on mouse/touch events.
     */
    mode = {};

    /**
     * The list of keydown keys that are allowed to pass through
     * to the contentEditable field
     */
    allowmap = {
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
    };

    /**
     * The default keys handled onKeyDown by the editor
     */
    keymap = {
        'Control+s': function() {
            this.save();
        },
        'Control+a': function(sel) {
            sel.range = cobalt.range(0, this.fragment.text.length);
            this.render(sel);
        },
        'Control+c': function(sel) {
            this.clipboard = this.fragment.copy(sel.range);
        },
        'Control+x': function(sel) {
            this.clipboard = this.fragment.copy(sel.range);
            this.fragment = this.fragment.delete(sel.range);
            sel.range = sel.range.collapse();
            this.render(sel);
        },
        'Control+v': function(sel) {
            if (this.clipboard) {
                this.fragment = this.fragment.insert(sel.range, this.clipboard);
                sel.range = sel.range.collapse().move(this.clipboard.text.length - sel.range.length);
                this.render(sel);
            }
        },
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
            sel.cursor = sel.range.end;
            this.fragment = this.fragment.clear(cobalt.range(sel.range.start-1,sel.range.start));
            this.render(sel);
        },
        'Shift+Enter': function(sel) {
            this.fragment = this.fragment.insert(sel.range, "\n");
            sel.range = sel.range.collapse().move(1);
            sel.cursor = sel.range.end;
            this.render(sel);            
        }
    };


    /**
     * @param DOMElement|string container the root editor element or a css selector that identifies it.
     * @param DOMElement|string debug optional element to show debug output or a css selector that identifies it.
     */
    constructor(container, debug)
    {
        /**
         * Handles normal printable characters, inserts these in
         * the cobaltDocument in place of the current selection.
         * Prevents all normal contentEditable interactions.
         */
        function handleKeyPressEvent(evt)
        {
            if ( !evt.ctrlKey && !evt.altKey && !evt.commandKey && !evt.metaKey) {
                var sel  = this.selection.get(this);
                var char = cobaltKeyboard.getCharacter(evt);
                if (char) {
                    sel =this.append(sel, char);
                    this.render(sel);
                }
            }
            var key = cobaltKeyboard.getKey(evt);
            evt.preventDefault();
            evt.stopPropagation();
            return false;
        }

        /**
         * Handles command keys. A command key is any keypress
         * with at least one of the Control, Alt, Command or Meta
         * keys pressed as well.
         * If the combination is in the keymap, the assigned function
         * is executed. If not, it prompts for an annotation to assign
         * to this key combination. This is added to the keymap as
         * a toggle command on that annotation, and executed.
         * TODO: allow more configuration / programming of the keymap
         * TODO: store the configuration / programming in the document
         */
        function handleKeyDownEvent(evt)
        {
            var key = cobaltKeyboard.getKey(evt);
            var sel = this.selection.get(this);
            // check if any annotation in the cursor range has a keymap[key] entry
            // find closest annotation that does
            var annotations = [...this.fragment.annotations.contains(sel.cursor).list].sort((a,b) => {
                var ar = a.range.contains(sel.cursor);
                var br = b.range.contains(sel.cursor);
                if (ar.start>br.start) {
                    return -1;
                } else {
                    return 1;
                }
            });

            for(var i=0,l=annotations.length;i<l;i++) {
                var tag = annotations[i].tagName;
                if (!this.annotations[tag]) { //TODO: store a list of tags with the correct class somewhere
                    this.annotations[tag] = new cobaltEditorTag(this, tag);
                }
                if (this.annotations[tag].keymap[key]) {
                    this.annotations[tag].keymap[key].call(this.annotations[tag], sel);
                    evt.preventDefault();
                    evt.stopPropagation();
                    return false;
                }
            }

            if ( this.keymap[key] ) {
                this.keymap[key].call(this, sel);
                evt.preventDefault();
                evt.stopPropagation();
                return false;
            } else if ( key.match(/(Control|Alt|Command|Meta)\+.+/)) { //FIXME: prevent firing for something like 'Control+Shift'
                var ann = prompt('Annotation');
                if (ann) {
                    var tag = ann.trim().split(/\s/).shift();
                    this.annotations[tag] = new cobaltEditorTag(this, tag);
                    this.keymap[key] = (function(ann) {
                        return function(sel) {
                            this.annotations[ann].update(sel);
                            this.render(sel);
                        }
                    })(ann);
                    this.keymap[key].call(this, sel);
                }
                evt.preventDefault();
                evt.stopPropagation();
                return false;
            }
        }

        function updateSelection(evt) {
            var sel = this.selection.get(this);
            this.render(sel);
        }

        let editor = this;
        this.container = ( typeof container == 'string' ? document.querySelector(container) : container );
        this.container.contentEditable = true;
        this.container.spellcheck = false;
        this.load();
        this.selection = cobaltEditorSelection;
        this.container.addEventListener('keypress', function(evt) {
            handleKeyPressEvent.call(editor, evt);
        });
        this.container.addEventListener('keydown', function(evt) {
            handleKeyDownEvent.call(editor, evt);
        });
        this.container.addEventListener('keyup', function(evt) {
            updateSelection.call(editor, evt);
        });
        this.container.addEventListener('mouseup', function(evt) {
            updateSelection.call(editor, evt);
        });
        this.container.addEventListener('touchend', function(evt) {
            updateSelection.call(editor, evt);
        });
        this.mode = [];
        if (debug) {
            this.debug = (typeof debug=='string' ? document.querySelector(debug) : debug);
        }
        this.annotations = {};
    }

    /**
     * Focus the editor in the web browser and show the cursor.
     */
    focus() {
        this.container.focus();
    }

    /**
     * Render the cobaltDocument as HTML in the editor container and
     * restore the selection and cursor.
     */
    render(sel) {
        var fragment = this.fragment;
        if (sel && sel.range && sel.range.size) {
            fragment = fragment.apply(sel.range, 'span class="cobalt-selection"');
        }
        if (sel && typeof sel.cursor!='undefined') {
            fragment = fragment.apply(sel.cursor, 'span class="cobalt-cursor"');
        }
        var html = cobalt.html.render(fragment);
        this.container.innerHTML = html+"\n";// extra \n is to give the browser room for a cursor
        if (sel) {
            var editor = this;
            editor.selection.set(editor, sel.range, sel.cursor);
            if (editor.debug) {
                editor.debug.innerText = '['+sel.range.start+','+sel.range.end+"]\n"+fragment;
            }
        }
    }

    /**
     * Toggles the given annotation (tag) on the given range.
     * If the given range already has an annotation which
     * matches tag, than the annotation is removed on this range.
     * otherwise it is applied.
     * If the range has no length, the tag is not applied, but
     * added to the editor.mode object, to be applied on the next
     * character added instead. Again, if the range already has
     * a matching annotation, the editor.mode will be removed instead
     * of applied.
     * @param cobaltRange range
     * @param cobaltAnnotation tag
     */
    toggle(range, tag) {
        var editor = this;
        if (range.size===0) {
            if (this.fragment.annotations.has(range, tag)) {
                this.mode[tag] = false;
            } else {
                this.mode[tag] = !this.mode[tag];
            }
            return;
        }

        var adjoinedRange = function(r,s) {
            var x = r.join(s);
            return (x.count <= r.count ? x : false);
        };

        var overlaps = function(r) {
            return editor.fragment.annotations.filter(function(a) {
                if (a.tag==tag && adjoinedRange(a.range,r)) {
                    return true;
                }
            });
        };

        var overlap = overlaps(range);
        if (overlap.count) {
            if (overlap.list[0].range.intersect(range).size) {
                // echte overlap
                for (var i=0;i<overlap.list.length;i++) {
                    this.fragment = this.fragment.remove(overlap.list[i].range, tag);
                    this.fragment = this.fragment.apply(overlap.list[i].range.exclude(range), tag);
                }
            } else {
                // alleen adjoined
                var combinedRange = range;
                for (var i=0;i<overlap.list.length;i++) {
                    this.fragment = this.fragment.remove(overlap.list[i].range, tag);
                    combinedRange = combinedRange.join(overlap.list[i].range);
                }
                this.fragment = this.fragment.apply(combinedRange, tag)
            }
        } else {
            this.fragment = this.fragment.apply(range, tag);    
        }
    }

    /**
     * Appends or inserts a string in the cobaltDocument, replacing the
     * range in the given selection. Collapses the selections and sets
     * the cursor to the end of inserted string.
     * @param cobaltEditorSelection sel
     * @param string string
     */
    append(sel, string) {
        this.fragment = this.fragment.insert(sel.range, string);
		if (Object.keys(this.mode).length) {
			var self = this;
			var range = sel.range;
			if (range.size==0) {
				range = cobalt.range(range.start-1,range.end);
			}
            console.log('applying modes',this.mode);
			Object.keys(this.mode).forEach(function(mode) {
				if (self.mode[mode]==false) {
					// find annotation matching mode
					var ann = self.fragment.annotations.get(range).filter(function(ann) {
						return ann.tagName==mode;
					});
					ann = ann.item(ann.count-1);
					// cut out the inserted string
					if (ann) {
						self.fragment = self.fragment.remove(ann.range, ann.tag);
						self.fragment = self.fragment.apply(ann.range.exclude([sel.range.start,sel.range.start+string.length]),ann.tag);
					}
				} else {
					self.fragment = self.fragment.apply([sel.range.start, sel.range.start + string.length], mode);
				}
			});
			this.mode = [];
		}
        sel.range = sel.range.collapse().move(string.length);
        sel.cursor = sel.range.end;
        return sel;
    }

    save() {
        localStorage.setItem('cobaltDocument', this.fragment);
    }

    load() {
        var mimeDoc = localStorage.getItem('cobaltDocument');
        this.fragment = cobalt.fragment(mimeDoc); 
    }

}

export default function(el, debug) {
    var editor = new cobaltEditor(el, debug);
    editor.render();
    return editor;
};
