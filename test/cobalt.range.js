require('../src/cobalt.js');
var tap = require('tap');

tap.test('create', function(t) {
	var range1 = cobalt.range( 5, 20 );
	t.equal(range1.start, 5, 'range starts at 5');
	t.equal(range1.end, 20, 'range ends at 20');
	t.equal(range1.count, 1, 'range has one subrange');
	t.equal(''+range1, '5-20', 'range converts correct to string');
	t.end();
});

tap.test('Immutable',function(t) {
    var range1 = cobalt.range(5,20);
    var exception = 0;
    range1.start = 10;
    t.equal(range1.start, 5, 'range starts at 5');
    range1.ranges[0].start = 10;
    t.equal(range1.start, 5, 'range still starts at 5');
    try {
        range1.ranges.push('frop');
    } catch(e) {
        exception++;
    }
    t.equal(range1.ranges.length, 1, 'single range');
    t.equal(exception, 1, 'exception thrown');
    t.end();
});

tap.test('Delete', function(t) {
    var r = cobalt.range(5, 20);
    var s = r.delete( cobalt.range(10,15) );
    t.equal(s.start, 5, 'new range starts at 5');
    t.equal(s.end, 15, 'new range ends at 15');
    t.equal(r.end, 20, 'old range ends at 20');
    t.end();
});

tap.test('Insert', function(t) {
    var r = cobalt.range(5, 20);
    var s = r.insert( cobalt.range(10,15) );
    t.equal(s.start, 5);
    t.equal(s.end, 25);
    t.equal(r.end, 20);
    t.end();
});

tap.test('CreateDisjointed', function(t) {
    var r = cobalt.range([[5,10],[15,20]]);
    t.equal(''+r, '5-10,15-20');
    var r = cobalt.range([[15,20],[5,10]]);
    t.equal(''+r, '5-10,15-20');
    var r = cobalt.range([[10,20],[5,12]]);
    t.equal(''+r, '5-20');
    t.end();
});

tap.test('DeleteDisjointed', function(t) {
    var r = cobalt.range([[5,10],[15,20]]);
    s = r.delete( cobalt.range(10,14) );
    t.equal(''+s, '5-10,11-16');
    s = r.delete( cobalt.range(10,15) );
    t.equal(''+s, '5-15');
    s = r.delete( cobalt.range(9,16) );
    t.equal(''+s, '5-13');
    var r = cobalt.range([[0,10],[20,30]]);
    s = r.delete( [5,10] );
    t.equal(''+s, '0-5,15-25');
    t.end();
});

tap.test('EmptyRange', function(t) {
    var r = cobalt.range();
    t.equal(null, r.start);
    t.equal(null, r.end);
    t.equal(null, r.size);
    t.equal(0, r.count);
    t.end();
});

tap.test('Move', function(t) {
    var r = cobalt.range(5,10);
    s = r.move(-3);
    t.equal(''+s, '2-7');
    t.end();
});

tap.test('Exclude', function(t) {
    var r = cobalt.range(5,10);
    s = r.exclude( cobalt.range(7,9) );
    t.equal(''+s, '5-7,9-10');
    var r = cobalt.range([[5,10],[15,20]]);
    s = r.exclude( cobalt.range([[3,7],[17,22]]));
    t.equal(''+s, '7-10,15-17');
    t.end();
});

tap.test('Invert', function(t) {
    var r = cobalt.range([[5,10],[15,20]]);
    var s = r.invert(30);
    t.equal(''+s, '0-5,10-15,20-30');
    t.end();
});

tap.test('Intersect', function(t) {
    var r1 = cobalt.range([[5,10],[15,20]]);
    var r2 = cobalt.range([8,18]);
    var s = r1.intersect(r2);
    t.equal(''+s, '8-10,15-18');
    t.end();
});

tap.test('Join', function(t) {
    var r1 = cobalt.range([[5,10],[15,20]]);
    var s = r1.join([8,12]);
    t.equal(''+s, '5-12,15-20');
    t.end();
});
