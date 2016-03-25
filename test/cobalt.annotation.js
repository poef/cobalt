require('../src/cobalt.js');
var tap = require('tap');

tap.test('Create', function(t) {
    var ann1 = cobalt.annotation([0,10],'div class="test"');
    t.equal( ''+ann1, '0-10:div class="test"', 'cobalt.annotation should allow any range value');
    var ann2 = cobalt.annotation(ann1);
    t.equal( ''+ann2, '0-10:div class="test"', 'cobalt.annotation should allow existing annotation');
    var ann3 = cobalt.annotation([[0,10],[20,30]],'div class="test"');
    t.equal( ''+ann3, '0-10,20-30:div class="test"', 'cobalt.annotation should allow any range value');
    var ann4 = cobalt.annotation([0,10],'   div with space   ');
    t.equal( ''+ann4, '0-10:div with space', 'tags should be trimmed');
    t.end();
});

tap.test('Delete', function(t) {
    var ann1 = cobalt.annotation([0,10],'div class="test"');
    var ann2 = ann1.delete( [5,10] );
    t.equal(''+ann2, '0-5:div class="test"', 'Delete should cut range');
    var ann1 = cobalt.annotation([[0,10],[20,30]],'div class="test"');
    var ann2 = ann1.delete( [5,10] );
    t.equal(''+ann2, '0-5,15-25:div class="test"', 'Delete should move subsequent ranges');
    t.end();
});

tap.test('Insert', function(t) {
    var ann1 = cobalt.annotation([0,10],'div class="test"');
    var ann2 = ann1.insert( [5,10] );
    t.equal(''+ann2, '0-15:div class="test"', 'Insert should extend ranges');
    var ann3 = cobalt.annotation([[0,10],[20,30]],'div class="test"');
    var ann4 = ann3.insert( [5,10] );
    t.equal(''+ann4, '0-15,25-35:div class="test"', 'Insert should move subsequent ranges');
    t.end();
});

tap.test('Join', function(t) {
    var ann1 = cobalt.annotation([0,10],'div class="test"');
    var ann2 = ann1.join([5,15]);
    t.equal(''+ann2, '0-15:div class="test"', 'Join should extend overlapping ranges');
    var ann3 = cobalt.annotation([[0,10],[20,30]],'div class="test"');
    var ann4 = ann3.join( [5,15] );
    t.equal(''+ann4, '0-15,20-30:div class="test"', 'Join should not move non-overlapping ranges');
    t.end();
});

tap.test('Copy', function(t) {
    var ann1 = cobalt.annotation([0,10],'div class="test"');
    var ann2 = ann1.copy( [5,10] );
    t.equal(''+ann2, '5-10:div class="test"', 'Copied annotation should contain only overlapping range');
    t.end();
});
