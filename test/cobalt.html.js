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
