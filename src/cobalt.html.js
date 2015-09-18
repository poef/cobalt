/**
 * Cobalt simplified HTML rules and rendering
 */
cobalt.html = (function(html) {
	
	/**
	 * These rules define the behaviour of the rendering as well as the editor.
	 */
	var rules = {
		block: ['h1','h2','h3','p','ol','ul','li','blockquote','br'],
		inline: ['em','strong','a'],
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
			'br'
		},
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
	
	var constraints = {
		hasValidParent: function(entry, stack, position) {
			var parent = stack[position] ? stack[position] : {tag:''};
			return rules.nesting[parent.tag].includes(entry.tag);
		},
		hasValidChild: function(entry, stack, position) {
			var child = stack[position+1] ? stack[position+1] : {tag:''};
			var tag = entry.tag;
			if ( rules.obligatoryChild(tag) ) {
				tag = rules.obligatoryChild(entry.tag);
			}
			return rules.cannotHaveChildren(tag) // e.g. BR, is autoclosing, so other tags aren't contained by it
				|| rules.nesting[tag].includes(child.tag);
		},
		scorePosition: function(entry, stack, position) {
			// return a number - 0 is optimal, anything larger is less optimal
			// best position means that all parents have starting range offset <= this
			// all children have starting range offset >= this
			// add offsets that violate this to the score with the score the distance between this start and theirs.
		}
	}

	function getRelativeList(annotations) {
		if ( !annotations || !annotations.length ) { return []; }
		var list = [];
		annotations.foreach(function(annotation) {
			annotation.range.foreach(function(range)
				list.push({
					type: 'start',
					annotation: annotation,
					position: range.start
				});
				list.push({
					type: 'end',
					annotation: annotation,
					position: range.end
				});
			});
		});
		list.sort(function(a,b) {
			return a.offset < b.offset ? -1 : 1;
		});
		list.reduce(function(position, entry) {
			entry.offset = entry.position - position;
			delete entry.position;
			return position + entry.offset;
		}, 0);
		return list;
	}

	function arrangeTags(tags) {
		// get best scoring set of tags that also validate the rules
		// tags that start later have a bonus over tags that start earlier
		// so more specific tags override more generic tags
		// each tag has the same score for now, 1
		// so more valid tags is better
		// stack order indicates html order, parent in stack is a parent in html
		// so nesting rules must be valid through the stack

		// 0: find nearest blocklevel element, add it to the stack
		// 1: in order, add as much block level tags as you can, start at the top of the stack, search untill 
		//    a place in the stack is valid for this tag, so a valid parent and a valid child
		//    any tag that has no place is kept in a temporary list
		//    tags that have a start offset before the current tag, prefer to be in the stack above the current tag
		//    tags that start later, prefer to be lower in the stack
		//    this makes html nesting behave as expected most of the time, unless this breaks other rules
		//    so search for the optimal place in the stack first, then go up the stack, round robin over position 0,
		//    untill you reach your start position or you find a place for the tag
		// 2: do the same for inline elements
		// 3: foreach skipped element create a stack with that element as the first element, add as many elements
		//    as possible, inline elements need a valid block element as parent, so make sure you find one or skip
		//    the element entirely if no valid parent exists.
		// 3: tallest stack wins
		// note: ol en ul add an li for each subrange automatically, so you don't need to specify li in 
		// the cobalt fragment by hand, just cut the range in parts, seperated by at least 1 char, e.g. \n
		// e.g: "0-10,12-20:ol" should be enough

		// approach:
		// create a list of functions that check constraints, returning true if the constraint is met, false if not
		// when considering a position in the stack for a tag/element, check each constraint.
		// update: allow numeric scores, 0 is optimal, negative numbers means invalid
		// can this be used for a mathematically sound constraint based approach?
	}

	function getStackList(relativeList) {
		// 1: create a list of stacks of tags - this version ignores empty elements/tags
		var stacklist = [{offset: 0, tags: []}];
		relativeList.forEach(function(entry) {
			if ( entry.offset ) {
				stacklist.push({ offset: entry.offset, tags: stacklist[ stacklist.length-1 ].tags });
			}
			stackentry = stacklist[ stacklist.length-1 ];
			if ( entry.type == 'start' ) {
				stackentry.tags.push(entry.annotation);
			} else if ( entry.type == 'end' ) {
				stackentry.tags = stackentry.tags.filter(function(annotation) {
					if ( annotation == entry.annotation ) {
						return false;
					}
					return true;
				});
			}
		});
		// 2: rearrange / filter tags to match the rules
		// FIMXE: entry.tags has no information if an annotation is used more than once
		// this means we cannot assure an html id is only used once, so all id's must be renamed to
		// something else, e.g. data-cobalt-id=id, but this can also be done when merging
		stacklist.forEach(function(entry) {
			entry.tags = arrangeTags(entry.tags);
		});
		return stacklist;
	}

	function mergeContentAndTags(content, stacklist) {

	}

	html.cobaltToHtml = function(fragment) {
		/*
			TODO: find a way to break up a single cobaltToHtml call into many seperate
			calls that can be concatenated. This allows the cobalt objects to pre-render upon creation
			which means that only changes have to be rendered again.
			possible way to do this is to use the stacklist as the base, each entry in there contains the
			full stack of tags for a part of the content
			externalise this list, make the entries immutable, and use this in the editor as the model
			then use something like react.js to only render changes in the browser dom
		*/
		//1: create a relative offsets list of annotation start and end points
		var relativeList = getRelativeList(fragment.annotations);
		//2: for each point in the relative offsets list, create a valid stack of html tags
		var stackList = getStackList(relativeList);
		//3: merge content and html tags
		return mergeContentAndTags(fragment.content, stackList);
	};
       
    html.htmlToCobalt = function(htmlString) {
      	
        return fragment;
    };
    
    html.escapeContent = function( content ) {
		return content
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	};

})(cobalt.html || {});