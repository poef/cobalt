require('../src/cobalt.js');
var tap = require('tap');

tap.test('create', function(t) {
    var f = cobalt.fragment('This is a test', '0-14:div class="test"');
    t.equal(''+f.text, 'This is a test', 'cobalt.fragment text should be unchanged');
    t.equal(''+f.annotations, '0-14:div class="test"', 'cobalt.fragment annotations should be unchanged');
	t.end();
});

tap.test('delete',function(t) {
	var f = cobalt.fragment('abcd','');
	f = f.delete([1,3]);
	t.equal(''+f.text, 'ad');
	t.end();
});

tap.test('insert', function(t) {
	var f = cobalt.fragment('abcd','');
	f = f.insert([1,3],"x");
	t.equal(''+f.text, 'axd');
	t.end();
});