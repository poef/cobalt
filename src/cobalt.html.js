cobalt.html = (function(html) {
	
	var rules = {
		block: ['h1','h2','h3','p','ol','ul','li','blockquote','br'],
		inline: ['em','strong','a'],
		obligatoryChild: {
			'ol': ['li'],
			'ul': ['li']
		},
		obligatoryParent: {
			'li': ['ol','ul']
		}
	};
	rules.alltags = rules.block.concat(rules.inline);
	rules.nesting: {
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
		'a': rules.inline.filter(function(tag) { return tag!='a'; }
	};
	rules.toplevel = rules.block.filter(function(tag) { return tag!='li';});
	

	html.cobaltToHtml = function(fragment) {
		var result = '';
		
		return result;
	};

    html.cobaltToDom = function(fragment, dom) {
        
    };
        
    html.cobaltDomToHtmlDom = function(relativeFragment, dom) {
        // cobalt fragment with relative offsets and links to html nodes to html dom
        // cobalt dom serves as a shadow dom for the html dom
    };
        
    html.htmlToCobalt = function(htmlString) {
      
        return fragment;
    };
        
})(cobalt.html || {});