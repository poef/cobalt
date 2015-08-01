Cobalt API
==========

cobalt.range
------------
A cobalt range is a collection of [start, end] pairs of character offsets.
Non of these pairs will overlap or be end-to-start or start-to-end consecutive with any other pair in the same range.
A start offset will always be equal or larger than 0. The end offset will
always be at equal or larger than the start offset.
A range has a combined start and end offset, as well as a count of the number of start/end pairs it contains.
An empty range has both start and end set to null and count set to 0.

###Usage
	// create a simple range
	var range1 = cobalt.range(10,20);
	// or like this
	var range2 = cobalt.range([10,20]);
	// create a range of ranges
	var range3 = cobalt.range([[10,20],[30,40]]);
	// create a range from another range
	var range4 = cobalt.range(range3);


###Properties
- `start`: The smalles start offset in all pairs, or null.
- `end`: The largest end offset in all pairs, or null.
- `size`: The difference between end and start, or null.
- `count`: The number of pairs in the range, 0 or more.

###Methods
- `collapse(toEnd)`: Returns a new range with a single start/end pair, where the start and end are equal. If toEnd is set, start will be made equal to end - collapse to the end, if not, end will be made equal to start - collapse to the start.

- `foreach(f)`: Run function f on each sub range (consecutive part of this range). The argument passed to f is always a cobalt range.

- `get(i)`: Returns a range of the start/end pair at position `i` in this range. First pair is 0.

- `insert(range)`: Returns a new range, with all the space in the given range inserted into this range. This moves the start/end offsets.

- `delete(range)`: Returns a new range with the given range deleted from it. This moves the start/end offsets, it cuts out the range.

- `move(length)`: Returns a new range with all the start/end offsets moved by `length`. A negative length moves the offsets towards 0. If any end offset moves below 0, that pair is removed. Otherwise any start offsets below 0 are set to 0.

- `join(range)`: Returns a new range with the given range joined. This is similar to set inclusion. Overlapping ranges will be merged. The positions
do not move otherwise.

- `exclude(range)`: Returns a new range with the parts in the given range removed from this range. Only overlapping parts are removed. The positions do not move otherwise.

- `intersect(range)`: Return a new range consisting of the intersection or overlap of this range and the given range.

- `invert(end)`: Returns a new range with all the ranges that are not in this range, in the domain range [0, end].

cobalt.annotation
-----------------
An annotation is a combination of a range and a tag. A tag is anything inside the '<' and '>' characters in xml or html, without the angle brackets.

###Usage
	// create a simple annotation
	var annotation1 = cobalt.annotation([10,20], 'div class="annotation"');
	// or written out
	var annotation2 = cobalt.annotation( cobalt.range( 10, 20 ), 'div class="annotation"');
	// or create an annotation from another annotation
	var annotation3 = cobalt.annotation(annotation1);
	
###Properties
- `range`: A cobalt range object.
- `tag`: A tag or markup string.

###Methods
- `delete(range)`: Returns a new annotation with this range deleted. Offsets can move. Returns null if the annotation range is fully deleted.

- `insert(range)`: Returns a new annotation with this range inserted. Offsets can move.

- `exclude(range)`: Returns a new annotation with this range excluded. Offsets won't move otherwise. Returns null if the annotation range is fully excluded.

-`copy(range)`: Returns a new annotation with the overlapping part of the given range, or null if there is no overlap.

- `join(range)`: Returns a new annotation with this range joined. Offsets won't move otherwise.

- `compare(annotation)`: Returns -1, 0, or 1, depending if the range in the given annotation is smaller, equal or larger than the annotation range.

- `has(tag)`: Returns true if the first word in this tag is the same as the first word in the given tag.

- `stripTag()`: Returns the first word in this tag.

cobalt.fragment
---------------
A fragment is a combination of plain text and a list of annotations. The list of annotations will always be sorted by the start and after that the end offsets of their ranges. A fragment is immutable, all operations on it return a new fragment.

###Usage
	// create a fragment of two text parts
	var fragment = cobalt.fragment("Some bold text","5-9:strong\n10-14:em");
	// create a fragment of text and a list of annotations
	var fragment2 = cobalt.fragment("Some bold text",[
		cobalt.annotation([5,9],"strong"),
		cobalt.annotation([10,14],"em")
	]);

###Properties
- `text`: A plain jane string.
- `annotations`: A list of annotation objects.

###Methods 
- `delete(range)`: Returns a new fragment where the given range is deleted (cut).
- `copy(range)`: Returns a new fragment with only the parts that overlap the given range. The new fragment adds all text slices matching the range together as one single text. All annotations are moved/cut to match this new text.
- `insert(range)`: Returns a combined new fragment with the inserted fragment text and annotations inserted at the given position.
- `apply(range, tag)`: Returns a new fragment, with the given range/tag or annotation or annotationlist applied.
- `remove(range, tag)`: Returns a new fragment, with the given range/tag or annotation or annotationlist removed.
- `query(selector)`:
- `search(re)`:

cobalt.fragment.annotations
---------------------------
A list of annotations in a fragment.

###Properties
- `list`: An immutable array of annotations.
- `count`: The number of annotations in the list

###Methods
- `apply(range, tag)`: Returns a new list with a new annotation added.
- `remove(range, tag)`:
- `clear(range)`:
- `delete(range)`:
- `insert(range)`:
- `filter(callback)`:
- `map(callback)`:
- `query(selector)`:
