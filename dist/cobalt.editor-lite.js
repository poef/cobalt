(function (factory) {
  typeof define === 'function' && define.amd ? define(factory) :
  factory();
}((function () { 'use strict';

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
  */

      /**
       * These rules define the behaviour of the rendering as well as the editor.
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

})));
