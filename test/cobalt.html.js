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

tap.test('render-insert', function(t) {
    var f = cobalt.fragment('This is a test', "0-0:img id=\"i0\"\n0-14:p\n0-0:img id=\"i1\"\n0-0:img id=\"i2\"");
    var h = cobalt.html.render(f);
    t.equal(h, '<img id="i0"><p><img id="i1"><img id="i2">This is a test</p>', 'Renders insertions in correct order');
    t.end();
});

tap.test('render-insert', function(t) {
    var f = cobalt.fragment('This is a test', "0-14:p\n0-9:strong\n5-14:em");
    var h = cobalt.html.render(f);
    t.equal(h, '<p><strong>This <em>is a</em></strong><em> test</em></p>', 'Correctly nest overlapping tags');
    t.end();
});

tap.test('render-insert', function(t) {
    var f = cobalt.fragment('This is a test', "0-14:p\n5-9:h1");
    var h = cobalt.html.render(f);
    t.equal(h, '<p>This </p><h1>is a</h1><p> test</p>', 'Close tags that are less specific and incompatible');
    t.end();
});

tap.test('render-insert', function(t) {
    var f = cobalt.fragment('This is a test', "0-14:p\n0-14:h1");
    var h = cobalt.html.render(f);
    t.equal(h, '<h1>This is a test</h1>', 'Discard tags that are less specific and incompatible');
    t.end();
});

tap.test('render-insert', function(t) {
    var f = cobalt.fragment('This is a test', "0-14:p\n0-0:img\n0-14:h1");
    var h = cobalt.html.render(f);
    t.equal(h, '<p><img></p><h1>This is a test</h1>', 'Keep tags around inserted stuff');
    t.end();
});


tap.test('render-insert', function(t) {
    var f = cobalt.fragment('This is a test', "0-9:p\n5-14:h1");
    var h = cobalt.html.render(f);
    t.equal(h, '<p>This </p><h1>is a test</h1>', 'Dont reopen passed closed tags');
    t.end();
});
