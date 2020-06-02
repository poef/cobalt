    class CobaltAnnotation {
		constructor(range, tag) {
            this.range = cobalt.range(range);
            this.tag   = tag.trim();
            var elements = this.tag.split(/\s/);
            this.tagName = elements.shift().toLowerCase();
            Object.freeze(this);
        }

        /**
         * Returns a new annotation with this range deleted. Offsets can move.
         * Returns null if the annotation range is fully deleted.
         */
        delete( range ) {
            var r = this.range.delete(range);
            return (r.count) ? new CobaltAnnotation( r, this.tag ) : null;
        }

        /**
         * Returns a new annotation with this range inserted.
         * Offsets can move.
         */
        insert( range ) {
            return new CobaltAnnotation( this.range.insert(range), this.tag);
        }

        /**
         * Returns a new annotation with this range excluded. Offsets won't move otherwise.
         * Returns null if the annotation range is fully excluded.
         */
        exclude( range ) {
            var r = this.range.exclude(range);
            return (r.count) ? new CobaltAnnotation( r, this.tag ) : null;
        }

        /**
         * Returns a new annotation with this range joined. Offsets won't move otherwise.
         */
        join( range ) {
            return new CobaltAnnotation( this.range.join( range ), this.tag );
        }

        /**
         * Returns a new annotation with the overlapping part of the given range,
         * r null if there is no overlap.
         */
        copy( range ) {
            var r = this.range.intersect( range );
            return (r.count) ? new CobaltAnnotation( r, this.tag ) : null;
        }

        /**
         * Returns -1, 0, or 1, depending if the range in the given annotation is smaller,
         * equal or larger than the annotation range.
         */
        compare( annotation ) {
            return this.range.compare( annotation.range );
        }

        /**
         * Returns true if the first word in this tag is the same as the first word
         * in the given tag.
         */
        has( tag ) {
            //TODO: should be able to specify attributes and attribute values as well
            return this.tagName === tag.split(/\s/)[0];
        }

        toString() {
            return this.range + ':' + this.tag;
        }
    }

	export default function(range, tag) {
        if ( range instanceof CobaltAnnotation ) {
            // because CobaltAnnotation is immutable, we can just return it.
            return range;
        } else {
            return new CobaltAnnotation(range, tag);
        }
    }
