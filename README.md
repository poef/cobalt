# cobalt
A radically simpler way to markup documents.

Cobalt is a follow up on [Hope](https://poef.github.io/hope/). It is a very simple implementation of 
Ted Nelson's ['Edit Decision List'](https://en.wikipedia.org/wiki/Edit_decision_list) concept for markup.

Cobalt is a research implementation, to explore this concept better. But Hope has found its way into
production code. It is the engine of change in [SimplyEdit](https://simplyedit.io/). This is because
the browser API for contentEditable (the WYSIWYG editor built into almost all browsers) is pretty useless.
If you want to implement your own replacement for the [execCommand](https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand) 
API, you'll need to apply the change to the DOM yourself. This is not trivial. With a good 1 to 1 translation 
from html to Hope and back, applying changes to the DOM do become trivial.

## Why?

There are many subtle issues with the way markup in general and HTML in particular works. But the most important 
issue is about editing. HTML was designed to be written in a text editor, not in a What-You-See-Is-What-You-Get 
(WYSIWYG) editor.

So to be able to see which part of a text has which markup applied to it, the natural solution is to wrap 
that part in a start and end tag. To see which start tag is ended by the end tag, the end tag re-states the tag 
name. So you get markup like this: `<em>italic text</em>`.

To add an extra layer of markup, you add another start and end tag. But these tags may not overlap. You cannot 
do this: `<em>italic and <strong>bold</em> text</strong>`. Instead you do this: 
`<em>italic and <strong>bold</strong></em><strong> text</strong>`. 

In effect you are building a tree structure. When this tree structure gets a bit more complex, it becomes 
difficult to follow in a text editor, unless you indent the markup. Each level of markup is indented, so the 
tree becomes visible. But this adds extra whitespace and linefeeds, that are only there to allow you to indent 
the markup.

## Results so far

I've been working on Hope and later Cobalt for quite some time, so what have I learned so far?

