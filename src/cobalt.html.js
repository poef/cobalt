cobalt editor
- npm / bower / grunt installeren
- requirejs oid toevoegen
- fast render door immutable data -> volledige render 1 keer doen, bij creatie


simplified html
h1/h2/h3/p/ol/ul/blockquote
em/strong/a

cobalt.html = (function(self) {
	
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
	

	self.renderFragment = function(fragment) {
		var result = '';
		
		return result;
	};

})(cobalt.html || {});