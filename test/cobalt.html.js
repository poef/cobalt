require('../src/cobalt.js');
var tap = require('tap');

tap.test('render-simple', function(t) {
    var f = cobalt.fragment('This is a test', "0-14:p\n0-4:strong");
    var h = cobalt.html.render(f);
    t.equal(h, '<p><strong>This</strong> is a test</p>', 'Renders simple html correctly');
    t.end();
});

tap.test('render-disjointed', function(t) {
    var f = cobalt.fragment('This is a test', "0-14:p\n0-4,8-9:strong");
    var h = cobalt.html.render(f);
    t.equal(h, '<p><strong>This</strong> is <strong>a</strong> test</p>', 'Renders simple disjointed annotations as html correctly');
    t.end();
});

tap.test('render-order-nesting', function(t) {
    var f = cobalt.fragment('This is a test', "0-14:p\n0-4,10-14:strong");
    var h = cobalt.html.render(f);
    t.equal(h, '<p><strong>This</strong> is a <strong>test</strong></p>', 'Renders simple html correctly nested');
    t.end();
});

tap.test('render-insert-order', function(t) {
    var f = cobalt.fragment('This is a test', "0-0:img id=\"i0\"\n0-14:p\n0-0:img id=\"i1\"\n0-0:img id=\"i2\"");
    var h = cobalt.html.render(f);
    t.equal(h, '<img id="i0"><p><img id="i1"><img id="i2">This is a test</p>', 'Renders insertions in correct order');
    t.end();
});

tap.test('render-overlapping', function(t) {
    var f = cobalt.fragment('This is a test', "0-14:p\n0-9:strong\n5-14:em");
    var h = cobalt.html.render(f);
    t.equal(h, '<p><strong>This <em>is a</em></strong><em> test</em></p>', 'Correctly nest overlapping tags');
    t.end();
});

tap.test('close-incompatible', function(t) {
    var f = cobalt.fragment('This is a test', "0-14:p\n5-9:h1");
    var h = cobalt.html.render(f);
    t.equal(h, '<p>This </p><h1>is a</h1><p> test</p>', 'Close tags that are less specific and incompatible');
    t.end();
});

tap.test('skip-incompatible', function(t) {
    var f = cobalt.fragment('This is a test', "0-14:p\n0-14:h1");
    var h = cobalt.html.render(f);
    t.equal(h, '<h1>This is a test</h1>', 'Discard tags that are less specific and incompatible');
    t.end();
});

tap.test('render-insert-parents', function(t) {
    var f = cobalt.fragment('This is a test', "0-14:p\n0-0:img\n0-14:h1");
    var h = cobalt.html.render(f);
    t.equal(h, '<p><img></p><h1>This is a test</h1>', 'Keep tags around inserted stuff');
    t.end();
});

tap.test('keep-closed', function(t) {
    var f = cobalt.fragment('This is a test', "0-9:p\n5-14:h1");
    var h = cobalt.html.render(f);
    t.equal(h, '<p>This </p><h1>is a test</h1>', 'Dont reopen passed closed tags');
    t.end();
});

tap.test('render-directly-nested-anchors', function(t) {
    var f = cobalt.fragment('This is a test', "0-14:a\n5-10:a");
    var h = cobalt.html.render(f);
    t.equal(h, '<a>This </a><a>is a </a><a>test</a>', 'Dont directly nest anchor tags');
    t.end();
});

tap.test('render-directly-nested-anchors-with-classes', function(t) {
    var f = cobalt.fragment('This is a test', '0-14:a class="foo"\n5-10:a class="bar"');
    var h = cobalt.html.render(f);
    t.equal(h, '<a class="foo">This </a><a class="bar">is a </a><a class="foo">test</a>', 'Dont directly nest anchor tags 2');
    t.end();
});

tap.test('render-nested-anchors', function(t) {
    var f = cobalt.fragment('This is a test', "0-14:a\n0-14:strong\n5-10:a");
    var h = cobalt.html.render(f);
    t.equal(h, '<a><strong>This </strong></a><strong><a>is a </a><a>test</a></strong>', 'Dont nest anchor tags at all');
    t.end();
});

tap.test('render-nested-anchors', function(t) {
    var f = cobalt.fragment('This is a test', "0-14:strong\n0-14:a\n5-10:a\n");
    var h = cobalt.html.render(f);
    t.equal(h, '<strong><a>This </a><a>is a </a><a>test</a></strong>', 'Order influences open/close tags');
    t.end();
});

tap.test('render-regression-1', function(t) {
	var f = cobalt.fragment('Test',"0-4:p\n1-3:h1\n2-3:strong\n");
	var h = cobalt.html.render(f);
	t.equal(h, '<p>T</p><h1>e<strong>s</strong></h1><p>t</p>');
	t.end();
});

tap.test('render-regression-2', function(t) {
	var f = cobalt.fragment('Foo\nBar\nBaz','0-3:p\n4-7:p\n8-11:p\n4-7:ol\n4-7:li\n');
	var h = cobalt.html.render(f);
	t.equal(h, '<p>Foo</p>\n<ol><li><p>Bar</p></li></ol>\n<p>Baz</p>');
	t.end();
});

tap.test('render-regression-3', function(t) {
	var f = cobalt.fragment('Foo\nBar\nBaz','0-11:ol\n0-3:li\n8-11:li\n');
	var h = cobalt.html.render(f);
	t.equal(h, '<ol><li>Foo</li></ol>\nBar\n<ol><li>Baz</li></ol>');
	t.end();
});