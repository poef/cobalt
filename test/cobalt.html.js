require('../src/cobalt.js');
var tap = require('tap');

tap.test('create', function(t) {
    var f = cobalt.fragment('This is a test', "0-14:p\n0-4:strong");
    var h = cobalt.html.render(f);
    t.equal('<p><strong>This</strong> is a test</p>', h, 'Renders simple html correctly');
    t.end();
});