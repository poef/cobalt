/*
1 forEach annotation from list
2a is it an insert annotation (open and close) -> put it in the insert list, else
2b is it an open annotation -> put it in the open list, else
2c -> put it in the close list

3 forEach close annotation
4 does it match the current parent -> push it on the close stack, set current parent to its parent
5 repeat untill close annotations stays the same, rest is ignored

6 forEach open annotation
7 is it allowed as child from current parent -> push it on the open stack, set parent to current tag
8 else repeat for parent (up to starting parent from 6)
9 repeat untill open annotations stay the same, rest is ignored

10 forEach insert annotation
11 check if it is allowed as child of current parent -> insert it in the open stack (open and close)
12 else repeat for parent (up to starting parent from 6)
13 if not allowed, do the same for the close stack, up to parent from step 3
*/

module.exports = (function(self) {

    function getRelativeList(annotations)
    {
        if ( !annotations || !annotations.count ) { return []; }
        var list = [];
        annotations.forEach(function(annotation) {
            annotation.range.forEach(function(range) {
                if ( range.start != range.end ) {
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
                } else {
                    list.push({
                        type: 'insert',
                        annotation: annotation,
                        position: range.start
                    });
                }
            });
        });
        list.sort(function(a,b) {
            return a.position < b.position ? -1 : 1;
        });
        list.reduce(function(position, entry) {
            entry.offset = entry.position - position;
            delete entry.position;
            return position + entry.offset;
        }, 0);
        return list;
    }

    function getStackedList(relativeList)
    {

    }

    self.render = function(fragment)
    {
        var relativeList = getRelativeList(fragment.annotations);
/*        var stackedList  = getStackedList(relativeList);
        var renderList = [];
        stackedList.reduce(function(stack, renderList) {

        }, renderList);
*/
        var offset = 0;
        var foo = relativeList.reduce(function(html, l) {
            if (l.offset) {
                html += fragment.text.substr(offset, l.offset);
                offset += l.offset;
            }
            switch (l.type) {
                case 'insert': html += '<'+l.annotation.tag+'></'+l.annotation.tag+'>';
                break;
                case 'start': html += '<'+l.annotation.tag+'>';
                break;
                case 'end': html += '</'+l.annotation.tag+'>';
                break;
            }
            return html;
        }, '');
        if ( offset < fragment.text.length ) {
            foo += fragment.text.substr(offset);
        }
        return foo;
    };

    return self;
})(cobalt.html || {});