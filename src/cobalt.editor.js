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
        this.mode = {
            strong: false,
            em: false,
            u: false
        };
        if (debug) {
            this.debug = (typeof debug=='string' ? document.querySelector(debug) : debug);
        }
    }

    cobaltEditor.prototype = {
        constructor: cobaltEditor,
        focus: function() {
            this.container.focus();
        },
        enterRange: function() {
            var fragment = this.fragment;
            var enters = [];
            var range = fragment.search(/^.*$/gm);
            for (var i=0,l=range.ranges.length;i<l;i++) {
                enters.push(range.ranges[i]);
            }
            enters = cobalt.range(enters).invert(fragment.text.length);
            return enters;
        },
        render: function(sel) {
            var fragment = this.fragment;
            var preAnnotations = '';
            var range = fragment.search(/^.*$/gm);
            for ( var i=0,l=range.ranges.length;i<l;i++) {
                preAnnotations += range.ranges[i]+':p\n';
            }

            var range = fragment.search(/^[0-9]+\. .*$/gm);
            if (range && range.count) {
                preAnnotations += range.start+'-'+range.end+':ol\n';
                for ( var i=0,l=range.ranges.length;i<l;i++) {
                    preAnnotations += range.ranges[i]+':li\n';
                }
            }
//            var range = fragment.search(/^[0-9]+\. /gm);
//            preAnnotations += range+':span class="hidden"\n';

            fragment = cobalt.fragment(fragment.text, preAnnotations+fragment.annotations);
            var html = cobalt.html.render(fragment);
            this.container.innerHTML = html+'\n';// extra \n is to give the browser room for a cursor
            if (sel) {
                var editor = this;
                //editor.selection.set(sel.range.collapse(), sel.range.start);
                editor.selection.set(sel.range, sel.cursor);
                if (editor.debug) {
                    editor.debug.innerText = '['+sel.range.start+','+sel.range.end+"]\n"+fragment;
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
                sel.cursor = sel.range.end;
                this.render(sel);
            },
            'Control+b': function(sel) {
                this.toggle(sel.range, 'strong', sel.cursor);
                this.render(sel);
            },
            'Control+i': function(sel) {
                this.toggle(sel.range, 'em', sel.cursor);
                this.render(sel);
            },
            'Control+1': function(sel) {
                this.fragment = this.fragment.apply(sel.range.exclude(this.enterRange()), 'h1');
                this.render(sel);
            },
            'Control+2': function(sel) {
                this.fragment = this.fragment.apply(sel.range, 'h2');
                this.render(sel);
            }
        },
        toggle: function(range, tag, cursor) {
            var editor = this;
            if (range.size===0) {
                this.mode[tag] = !this.mode[tag];
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
        },
        append: function(sel, string) {
            this.fragment = this.fragment.insert(sel.range, string);
            sel.range = sel.range.collapse().move(1);
            sel.cursor = sel.range.end;
            return sel;
        }
    }


    function handleKeyPressEvent(evt)
    {
        if ( !evt.ctrlKey && !evt.altKey ) {
            var sel  = this.selection.get();
            var char = cobalt.keyboard.getCharacter(evt);
            if (char) {
                sel =this.append(sel, char);
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
        console.log(key);
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