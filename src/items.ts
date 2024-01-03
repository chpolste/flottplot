import { Collection, CollectionEvent } from "./interface";
import { ValueError, ItemsError } from "./errors";
import { Value, NumberValue } from "./values";


type MapFn<U> = (element: Value, index: number, array: Array<Value>) => U;


abstract class Items {

    wrapMin: boolean;
    wrapMax: boolean;

    // Derived classes must implement/initialize:
    abstract _selected: number;
    abstract indexMax: number;
    abstract indexMin: number;

    constructor() {
        this.wrapMin = false;
        this.wrapMax = false;
    }

    get wrap(): string {
        if (this.wrapMax && this.wrapMin) return "both";
        if (this.wrapMax) return "max";
        if (this.wrapMin) return "min";
        return "none";
    }

    set wrap(wrap: string) {
        // backwards compatibility: "true" is alias for "both"
        this.wrapMax = (wrap === "true" || wrap === "both" || wrap === "max");
        this.wrapMin = (wrap === "true" || wrap === "both" || wrap === "min");
    }

    get size(): number {
        return this.indexMax - this.indexMin + 1;
    }

    get isFinite(): boolean {
        return isFinite(this.size);
    }

    // Relative navigation

    prev(): CollectionEvent {
        if (this._selected > this.indexMin) {
            this._selected -= 1;
        } else if (this.wrapMin) {
            this._selected = this.indexMax;
            return CollectionEvent.Wrap;
        }
        return CollectionEvent.None;
    }

    next(): CollectionEvent {
        if (this._selected < this.indexMax) {
            this._selected += 1;
        } else if (this.wrapMax) {
            this._selected = this.indexMin;
            return CollectionEvent.Wrap;
        }
        return CollectionEvent.None;
    }

}


export class OptionsItems extends Items implements Collection {

    _options: Array<Value>;
    _selected: number;

    indexMin: number;
    indexMax: number;

    constructor(options: Iterable<Value>, init: Value | undefined, wrap: string) {
        super();
        // Make a copy to protect against input mutation
        this._options = Array.from(options);
        this.wrap = wrap;
        // indexMin and indexMax as set up as inclusive
        this.indexMin = 0;
        this.indexMax = this._options.length - 1;
        // Must not be empty
        if (this.size === 0) throw new ItemsError(
            "no options specified"
        );
        this._selected = 0;
        // Set initial value (initializes this._selected)
        this.value = (init != null) ? init : this._options[0];
    }

    get index(): number {
        return this._selected;
    }

    set index(index: number) {
        if (index < this.indexMin || this.indexMax < index) throw new ItemsError(
            "invalid index " + index + " (out of range)"
        );
        this._selected = index;
    }

    get value(): Value {
        return this._options[this._selected];
    }

    set value(value: unknown) {
        value = Value.from(value);
        if (value == null) throw new ValueError(
            "TODO" // TODO
        );
        // Use _eq relation of Value-types
        const index = this._options.findIndex(_ => (_ as any)._eq(value)); // TODO any
        if (index < 0) throw new ItemsError(
            "value " + value.toString() + " not found in options"
        );
        this._selected = this.indexMin + index;
    }

    map<U>(fn: MapFn<U>): Array<U> {
        return Array.from(this._options).map(fn);
    }

}


export class RangeItems extends Items implements Collection {

    _offset: Value;
    _factor: Value;
    _selected: number;

    readonly valueType: any;
    readonly valueTypeName: string;

    indexMin: number;
    indexMax: number;

    constructor(init: Value | undefined, step: Value | undefined, min: Value | undefined, max: Value | undefined, wrap: string) {
        super();
        this.wrap = wrap; // TODO: should this be handled by the super constructor?
        // Make sure everything is a value or null
        init = Value.from(init);
        step = Value.from(step);
        min = Value.from(min);
        max = Value.from(max);
        // Choose one of init, min or max for offset
        if (init != null) {
            this._offset = init;
        } else if (min != null) {
            this._offset = min;
        } else if (max != null) {
            this._offset = max;
        } else throw new ItemsError(
            // TODO can build range from step only but where to start then depends on value type
            "range requires specification of at least one of init, min or max"
        );
        // The type of this._offset determines the type of all values this
        // range produces. Make this type accessible via the valueType property
        // for instanceof comparisons.
        this.valueType = this._offset.constructor;
        this.valueTypeName = this._offset._typeName;
        // Verify that min and max have the appropriate type. init does not
        // need to be checked (if it is not null, it is this._offset). step is
        // allowed to have a different type (e.g., the step between dates is
        // a datedelta).
        if (!(min == null || min instanceof this.valueType)) throw new ItemsError(
            "min is a " + min._typeName + " value but range expects " + this.valueTypeName
        );
        if (!(max == null || max instanceof this.valueType)) throw new ItemsError(
            "max is a " + max._typeName + " value but range expects " + this.valueTypeName
        );
        // TODO
        if (step == null) throw new ItemsError(
            "no step specified"
        );
        this._factor = step;
        // Determine the boundary indices of an inclusive range. Range can be
        // open at one or both ends. Use Infinity boundaries to indicate this.
        this.indexMin = min == null ? Number.NEGATIVE_INFINITY
                                    : Math.ceil((min as any)._sub(this._offset)._div(step)._value); // TODO any
        this.indexMax = max == null ? Number.POSITIVE_INFINITY
                                    : Math.floor((max as any)._sub(this._offset)._div(step)._value); // TODO any
        if (this.wrap !== "none" && !this.isFinite) throw new ItemsError(
            "open-ended range cannot wrap"
        );
        // TODO make sure min < max
        // TODO make sure range is not empty
        // Initialize _selected. Using value setter clips init into range.
        this._selected = 0;
        this.value = this._offset;
    }

    _genValue(index: number): Value {
        // TODO: attach index?
        // Because this is not going through proper Expression evaluation, the
        // order in which the following operations are carried out is
        // important, as _add and _mul may otherwise not be defined on the
        // intermediate values.
        return (this._offset as any)._add((this._factor as any)._mul(new NumberValue(index))); // TODO any
    }

    _genIndex(value: unknown): number {
        const v = Value.from(value);
        if (v instanceof this.valueType) {
            // Clip value into range
            return Math.round((v as any)._sub(this._offset)._div(this._factor)._value); // TODO any
         } else throw new ItemsError(
            `range expects ${this.valueTypeName} value but received ${v!._typeName}`
         );
    }

    get index(): number {
        return this._selected;
    }

    set index(index: number) {
        if (index < this.indexMin || this.indexMax < index) throw new ItemsError(
            "cannot set to index " + index
        );
        this._selected = index;
    }

    get value(): Value {
        return this._genValue(this.index);
    }

    set value(value: Value) {
        this.index = Math.max(this.indexMin, Math.min(this._genIndex(value), this.indexMax));
    }

    map<U>(fn: MapFn<U>): Array<U> {
        if (!this.isFinite) throw new ItemsError(
            "cannot list an infinite range"
        );
        let out = [];
        for (let index = this.indexMin; index <= this.indexMax; index++) {
            out.push(this._genValue(index));
        }
        return out.map(fn);
    }

}

