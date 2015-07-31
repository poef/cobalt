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
- `invert(end)`: Returns a new range with all the ranges that are not in this range, in the domain range [0, end].

cobalt.annotation
-----------------

cobalt.fragment
---------------