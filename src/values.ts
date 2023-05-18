import { Expression, Evaluation, FormatSpec } from "./interface";
import { ValueError, FormatError, ParseError } from "./errors";
import { pyformat, pystrftime } from "./format";


export abstract class Value {

    _TEXT?: string;

    abstract toString(spec?: FormatSpec): string;

    // Every value gets a user-accessible TEXT attribute, which should be set
    // to the raw text input used to generate the value. If the value wasn't
    // generated from text input, fall back to this.
    get TEXT(): TextValue {
        return new TextValue((this._TEXT != null) ? this._TEXT : this);
    }

    get _variables(): Set<string> {
        return new Set();
    }

    _eval(substitution: Evaluation): this {
        return this;
    }

    static from(value: string): Value;
    static from(value: number): NumberValue;
    static from(value: Date): DateValue;
    static from(value: Value): Value;
    static from(value: unknown): Value | undefined;
    static from(value: unknown): Value | undefined {
        // Act as identity function for null values
        if (value == null) {
            return undefined;
        // No need to convert already-Value values
        } else if (value instanceof Value) {
            return value;
        // Try parsing into all available types
        } else {
            for (const Cls of [NumberValue, DateDeltaValue, DateValue, TextValue]) {
                try {
                    return new Cls(value);
                } catch (error) {
                    if (!(error instanceof ParseError)) {
                        throw error;
                    }
                }
            }
        }
        // Returning the input as a TextValue should always work, but if for
        // some reason not, exit with error
        throw new ParseError(); // TODO
    }

}


export class TextValue extends Value implements Expression {

    _value: string;

    constructor(value: unknown) {
        super();
        if (value == null) throw new ParseError(
            "..." // TODO
        );
        this._value = value.toString();
    }

    toString(spec?: string): string {
        // No format specification given, return text as-is
        if (spec == null) {
            return this._value;
        }
        // If the specification is a valid pyformat, apply it
        const aspy = pyformat(this._value, spec);
        if (aspy != null) {
            return aspy;
        }
        // No other specifications are implemented
        throw new FormatError(
            "invalid specification '" + spec + "' for text value '" + this._value + "'"
        );
    }

    _add(other: Value): Value | void {
        if (other instanceof TextValue) {
            return new TextValue(this._value + other._value);
        }
    }

    _slice(other: Value): Value | void {
        if (other instanceof NumberValue) {
            return new TextValue(this._value.slice(0, other._value));
        }
    }

    _rslice(other: Value): Value | void {
        if (other instanceof NumberValue) {
            return new TextValue(this._value.slice(other._value));
        }
    }

    _eq(other: Value): boolean | void {
        if (other instanceof TextValue) {
            return this._value == other._value;
        }
    }

}


export class NumberValue extends Value implements Expression {

    _value: number;

    constructor(value: unknown) {
        super();
        // Accept numbers directly
        if (typeof value === "number") {
            this._value = Math.trunc(value); // allow integers only for now
        // Validate text before conversion
        // TODO for now: https://stackoverflow.com/questions/175739/
        } else if (typeof value === "string" && !isNaN(value as any) && !isNaN(parseInt(value))) { // TODO any cast in isNaN
            this._value = parseInt(value);
            this._TEXT = value;
        // Fail if not valid
        } else {
            throw new ParseError();
        }
    }

    toString(spec?: string): string {
        if (spec == null) {
            return this._value.toString();
        }
        const aspy = pyformat(this._value, spec);
        if (aspy != null) {
            return aspy;
        }
        // No other specifications are implemented
        throw new FormatError(
            "invalid specification '" + spec + "' for number value " + this._value
        );
    }

    _pos(): NumberValue {
        return new NumberValue(+this._value);
    }

    _neg(): NumberValue {
        return new NumberValue(-this._value);
    }

    _mul(other: Value): Value | void {
        if (other instanceof NumberValue) {
            return new NumberValue(this._value * other._value);
        }
    }

    _div(other: Value): Value | void {
        if (other instanceof NumberValue) {
            return new NumberValue(this._value / other._value);
        }
    }

    _mod(other: Value): Value | void {
        if (other instanceof NumberValue) {
            return new NumberValue(this._value % other._value);
        }
    }

    _add(other: Value): Value | void {
        if (other instanceof NumberValue) {
            return new NumberValue(this._value + other._value);
        }
    }

    _sub(other: Value): Value | void {
        if (other instanceof NumberValue) {
            return new NumberValue(this._value - other._value);
        }
    }

    _gt(other: Value): boolean | void {
        if (other instanceof NumberValue) {
            return this._value > other._value;
        }
    }

    _lt(other: Value): boolean | void {
        if (other instanceof NumberValue) {
            return this._value < other._value;
        }
    }

    _ge(other: Value): boolean | void {
        if (other instanceof NumberValue) {
            return this._value >= other._value;
        }
    }

    _le(other: Value): boolean | void {
        if (other instanceof NumberValue) {
            return this._value <= other._value;
        }
    }

    _eq(other: Value): boolean | void {
        if (other instanceof NumberValue) {
            return this._value == other._value;
        }
    }

}



function asDate(value: string): Date {
    value = value.trim();
    let year: number;
    let month: number;
    let day: number;
    // year-first                (year                )     (month     )      (day        )
    const matchA = value.match(/^([0-9][0-9][0-9][0-9])[-\/]([01]?[0-9])([-\/]([0-3]?[0-9]))?/);
    // year-last                  (day        )        (month     )      (year                )
    const matchB = value.match(/^(([0-3]?[0-9])[-\/.])?([01]?[0-9])[-\/.]([0-9][0-9][0-9][0-9])/);
    // No match for either means the value cannot be parsed
    if (matchA != null) {
        year  = parseInt(matchA[1]);
        month = parseInt(matchA[2]) - 1;
        day   = (matchA[4] != null) ? parseInt(matchA[4]) : 1;
        // Remove the matched date from the input
        value = value.substr(matchA[0].length);
    } else if (matchB != null) {
        year = parseInt(matchB[4]);
        month = parseInt(matchB[3]) - 1;
        day = (matchB[2] != null) ? parseInt(matchB[2]) : 1
        // Remove the matched date from the input
        value = value.substr(matchB[0].length);
    } else throw new ParseError(
        "Invalid date specification in '" + value + "'"
    );
    // Continue with matching the time (order is fixed but all parts are
    // optional):                     (hours      )  (minutes    )  (seconds    )
    const matchC = value.match(/^([ T]([012]?[0-9])(:([0-5]?[0-9])(:([0-5]?[0-9]))?)?)?$/);
    if (matchC == null) throw new ParseError(
        "Invalid time specification in '" + value + "'"
    );
    const hours: number   = (matchC[2] != null) ? parseInt(matchC[2]) : 0;
    const minutes: number = (matchC[4] != null) ? parseInt(matchC[4]) : 0;
    const seconds: number = (matchC[6] != null) ? parseInt(matchC[6]) : 0;
    return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
}

export class DateValue extends Value implements Expression {

    _value: Date;

    YEAR: NumberValue;
    MONTH: NumberValue;
    DAY: NumberValue;
    HOUR: NumberValue;
    MINUTE: NumberValue;
    SECOND: NumberValue;

    constructor(value: unknown) {
        super();
        if (typeof value === "string") {
            this._value = asDate(value); //  TODO inline asDate?
            this._TEXT = value;
        } else if (value instanceof Date || typeof value === "number") {
            this._value = new Date(value);
        } else throw new ParseError(
            `failed to convert '${value}' to a DateValue`
        );
        // Public attributes
        this.YEAR   = new NumberValue(this._value.getUTCFullYear());
        this.MONTH  = new NumberValue(this._value.getUTCMonth() + 1);
        this.DAY    = new NumberValue(this._value.getDate());
        this.HOUR   = new NumberValue(this._value.getUTCHours());
        this.MINUTE = new NumberValue(this._value.getUTCMinutes());
        this.SECOND = new NumberValue(this._value.getUTCSeconds());
    }

    toString(spec?: string): string {
        const aspy = pystrftime(this._value, (spec != null) ? spec : "%Y-%m-%d %H:%M:%S");
        if (aspy != null)  {
            return aspy;
        }
        throw new FormatError(
            "invalid specification '" + spec + "' for date value " + this._value
        );
    }

    _add(other: Value): Value | void {
        if (other instanceof DateDeltaValue) {
            return new DateValue(this._value.getTime() + 1000 * other._value);
        }
    }

    _radd(other: Value): Value | void {
        return this._add(other);
    }

    _sub(other: Value): Value | void {
        if (other instanceof DateDeltaValue) {
            return new DateValue(this._value.getTime() - 1000 * other._value);
        } else if (other instanceof DateValue) {
            const milliseconds = this._value.getTime() - other._value.getTime();
            return new DateDeltaValue(milliseconds / 1000);
        }
    }

    _eq(other: Value): boolean | void {
        if (other instanceof DateValue) {
            return this._value === other._value;
        }
    }

    // TODO comparison ops

}


export class DateDeltaValue extends Value implements Expression {

    _value: number;

    SIGN: NumberValue;
    DAYS: NumberValue;
    HOURS: NumberValue;
    MINUTES: NumberValue;
    SECONDS: NumberValue;
    TOTAL_SECONDS: NumberValue;

    constructor(value: unknown) {
        super();
        if (typeof value === "string") {
            // TODO allow input format same as default output format?
            const match = value.match(/^\s*((?:[+\-]?)(?:(?:[1-9][0-9]*)|0))([smhd])\s*$/);
            if (match == null) throw new ParseError(
                "TODO" // TODO
            );
            if (match[2] === "d") {
                this._value = parseInt(match[1]) * 86400;
            } else if (match[2] === "h") {
                this._value = parseInt(match[1]) * 3600;
            } else if (match[2] === "m") {
                this._value = parseInt(match[1]) * 60;
            } else if (match[2] === "s") {
                this._value = parseInt(match[1]);
            } else throw new ParseError(
                "TODO" // TODO
            );
            this._TEXT = value;
        // Time difference in seconds
        } else if (typeof value === "number") {
            this._value = Math.trunc(value);
        // Fail if not a number
        } else throw new ParseError(
            "TODO" // TODO
        );
        // Decompose into human-friendly time intervals
        const sign    = Math.sign(this._value);
        const days    = Math.trunc( Math.abs(this._value)          / 86400);
        const hours   = Math.trunc((Math.abs(this._value) % 86400) / 3600 );
        const minutes = Math.trunc((Math.abs(this._value) % 3600 ) / 60   );
        const seconds = Math.trunc((Math.abs(this._value) % 60   )        );
        // Public attributes: note that these deviate from Python's timedelta
        this.SIGN    = new NumberValue(sign);
        this.DAYS    = new NumberValue(days);
        this.HOURS   = new NumberValue(hours);
        this.MINUTES = new NumberValue(minutes);
        this.SECONDS = new NumberValue(seconds);
        this.TOTAL_SECONDS = new NumberValue(this._value);
    }

    toString(spec?: string): string {
        // User should use number formatting options of attributes instead
        if (spec != null) throw new FormatError(
            "invalid specification '" + spec + "' for date delta value '" + this.toString() + "'"
        );
        // Return in format '±DDd HH:MM:SS'
        return (
            (this.SIGN._value < 0 ? "-" : "+")
            + this.DAYS.toString() + "d "
            + this.HOURS.toString("0>2") + ":"
            + this.MINUTES.toString("0>2") + ":"
            + this.SECONDS.toString("0>2")
        );
    }

    _pos(): DateDeltaValue {
        return new DateDeltaValue(+this._value);
    }

    _neg(): DateDeltaValue {
        return new DateDeltaValue(-this._value);
    }

    _mul(other: Value): Value | void {
        if (other instanceof NumberValue) {
            return new DateDeltaValue(this._value * other._value);
        }
    }

    _rmul(other: Value): Value | void {
        return this._mul(other);
    }

    _div(other: Value): Value | void {
        if (other instanceof NumberValue) {
            return new DateDeltaValue(this._value / other._value);
        } else if (other instanceof DateDeltaValue) {
            return new NumberValue(this._value / other._value);
        }
    }

    _add(other: Value): Value | void {
        if (other instanceof DateDeltaValue) {
            return new DateDeltaValue(this._value + other._value);
        }
    }

    _sub(other: Value): Value | void {
        if (other instanceof DateDeltaValue) {
            return new DateDeltaValue(this._value - other._value);
        }
    }

    _eq(other: Value): boolean | void {
        if (other instanceof DateDeltaValue) {
            return this._value === other._value;
        }
    }

    // TODO comparison ops

}


// Attribute names are special objects
export class AttributeValue extends Value implements Expression {

    _name: string;

    constructor(name: string) {
        super();
        this._name = name;
        if (this._name.startsWith("_")) throw new ValueError(
            "access to underscore-attribute '" + this._name + "' denied"
        );
    }

    toString(spec?: string): string {
        if (spec != null) throw new FormatError("sdjfjasdf"); // TODO
        return this._name;
    }

    // Attribute access through the "attr" operator is implemented here once
    // through the reverse of the operator. This makes it work for all *Value
    // classes, without the need to implement the operator in those classes.
    _rattr(other: Value): Value {
        const out = (other as any)[this._name];
        if (out instanceof Value) {
            return out;
        } else throw new ValueError(
            "attribute '" + this._name + "' does not exist on '" + other.toString() + "'"
        );
    }

}

