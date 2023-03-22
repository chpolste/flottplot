class FlottplotError extends Error {}
class ParseError extends FlottplotError {}
class ValueError extends FlottplotError {}
class ElementError extends FlottplotError {}
class FormatError extends FlottplotError {}
class ItemsError extends FlottplotError {}
class CycleError extends FlottplotError {}


/*** Value testing ***/

function isString(obj) {
    return (typeof obj == "string") || (obj instanceof String);
}

function isNumber(obj) {
    return Number.isFinite(obj);
}


/*** Value parsing ***/

function asDate(value) {
    value = value.trim();
    // year-first              (year                )     (month     )      (day        )
    let matchA = value.match(/^([0-9][0-9][0-9][0-9])[-\/]([01]?[0-9])([-\/]([0-3]?[0-9]))?/);
    // year-last                (day        )        (month     )      (year                )
    let matchB = value.match(/^(([0-3]?[0-9])[-\/.])?([01]?[0-9])[-\/.]([0-9][0-9][0-9][0-9])/);
    // No match for either means the value cannot be parsed
    if (matchA == null && matchB == null) throw new ParseError(
        "Invalid date specification in '" + value + "'"
    );
    let year  = parseInt(matchA != null ? matchA[1] : matchB[4]);
    let month = parseInt(matchA != null ? matchA[2] : matchB[3]) - 1;
    let day   = matchA != null ? (matchA[4] != null ? parseInt(matchA[4]) : 1)
                               : (matchB[2] != null ? parseInt(matchB[2]) : 1);
    // Remove the matched date from the input
    value = value.substr((matchA != null ? matchA : matchB)[0].length)
    // Continue with matching the time (order is fixed but all parts are
    // optional):                   (hours      )  (minutes    )   (seconds    )
    let matchC = value.match(/^([ T]([012]?[0-9])(:([0-5]?[0-9])(:([0-5]?[0-9]))?)?)?$/);
    if (matchC == null) throw new ParseError(
        "Invalid time specification in '" + value + "'"
    );
    let hours   = matchC[2] != null ? parseInt(matchC[2]) : 0;
    let minutes = matchC[4] != null ? parseInt(matchC[4]) : 0;
    let seconds = matchC[6] != null ? parseInt(matchC[6]) : 0;
    return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
}

/*** Formatting and value parsing ***/

// Implement part of Python's format mini-langugage:
// https://docs.python.org/3/library/string.html#format-specification-mini-language
function pyformat(value, spec) {
    // Regex:
    // (?:(.)?([<>=^]))?    [[fill]align]
    // ([+\- ])?            [sign]
    // not implemented      [#]
    // (0)?                 [0]             (sign-aware zero-padding)
    // ([1-9][0-9]*)?       [width]
    // not implemented      [grouping option]
    // not implemented      [.precision]
    // ([sd])?              [type]
    let match = spec.match(/^(?:(.)?([<>=^]))?([+\- ])?(0)?([1-9][0-9]*)?([sd])?$/);
    if (match == null) {
        return null;
    }
    // Extract parameters from match or use default values:
    // Default fill is space unless sign-aware zero-padding is set then it's
    // zero (indepent of the alignment override)
    let fill  = match[1] == null ? (match[4] == "0" ? "0" : " ") : match[1];
    let align = match[2];
    let sign  = match[3];
    // Sign-aware zero-padding is overridden by a given alignment
    let zerop = match[4] == "0" && align == null;
    let width = match[5] == null ? 0 : parseInt(match[5]);
    let kind  = match[6];
    // Convert the given value to a string, set a default alignment if
    // necessary and figure out how to show the sign (if there is any).
    // This procedure is different for string and numeric values.
    if (isString(value) && (kind == null || kind === "s") && align !== "=" && sign == null) {
        // Text ist left-aligned by default
        if (align == null) {
            align = "<";
        }
        // Sign-aware zero-padding just enables 0-fill for strings
        if (zerop) {
            zerop = false;
            fill = "0";
        }
        // Set sign empty so that no space is reserved for it below
        sign = "";
    } else if (isNumber(value) && kind !== "s") {
        // Numbers are right-aligned by default
        if (align == null) {
            align = ">";
        }
        // If the number is negative, always show the minus-sign
        if (value < 0) {
            sign = "-";
        // If the number is positive only show a space or plus-sign if sign is
        // " " or "+", respectively
        } else if (sign === "-" || sign == null) {
            sign = "";
        }
        // Remove sign from value
        value = Math.abs(value).toString();
        // TODO separate float/integers
    } else {
        return null;
    }
    // Apply alignment and re-attach sign to numbers
    if (value.length < width) {
        if (zerop) {
            return sign + value.padStart(width - sign.length, "0");
        } else if (align === ">") {
            return (sign + value).padStart(width, fill);
        } else if (align === "<") {
            return (sign + value).padEnd(width, fill);
        } else if (align === "^") {
            value = sign + value;
            let lwidth = value.length + Math.floor((width - value.length) / 2);
            return value.padStart(lwidth, fill).padEnd(width, fill);
        } else if (align === "=") {
            let lwidth = value.length + Math.floor((width - value.length) / 2);
            return (sign + value.padStart(lwidth, fill)).padEnd(width, fill);
        }
    }
    return sign + value;
}

// From: https://strftime.org/
let _pystrftime_lookup = {
    // Day of the month as a zero-padded decimal number
    "d": x => pyformat(x.getUTCDate(), "0>2"),
    // Month as a zero-padded decimal number
    "m": x => pyformat(x.getUTCMonth() + 1, "0>2"),
    // Year without century as a zero-padded decimal number
    "y": x => pyformat(x.getUTCFullYear() % 100, "0>2"),
    // Year with century as a decimal number
    "Y": x => x.getUTCFullYear(),
    // Hour (24-hour clock) as a zero-padded decimal number
    "H": x => pyformat(x.getUTCHours(), "0>2"),
    // Minute as a zero-padded decimal number
    "M": x => pyformat(x.getUTCMinutes(), "0>2"),
    // Second as a zero-padded decimal number
    "S": x => pyformat(x.getUTCSeconds(), "0>2"),
    // A literal '%' character
    "%": x => "%",
}

function pystrftime(value, spec) {
    let out = [];
    let pct = false;
    for (let i = 0; i < spec.length; ++i) {
        let c = spec.charAt(i);
        if (pct && _pystrftime_lookup.hasOwnProperty(c)) {
            out[out.length - 1] = _pystrftime_lookup[c](value).toString();
            pct = false;
        } else {
            out.push(c);
            pct = (c === "%");
        }
    }
    return out.join("");
}


/*** Value containers and operations ***/

class Value {

    // Every value gets a user-accessible TEXT attribute, which should be set
    // to the raw text input used to generate the value. If the value wasn't
    // generated from text input, fall back to this.
    get TEXT() {
        return new TextValue((this._TEXT != null) ? this._TEXT : this);
    }

    get _variables() {
        return new Set();
    }

    _eval(substitutions) {
        return this;
    }

    static from(value) {
        // Act as identity function for null values
        if (value == null) {
            return null;
        }
        // TextValue is fallback, but if specifically requested must be handled first
        if (false) {
            return new TextValue(value);
        }
        // ...
        for (let Cls of [NumberValue, DateDeltaValue, DateValue, TextValue]) {
            try {
                return new Cls(value);
            } catch (error) {
                if (!(error instanceof ParseError)) {
                    throw error;
                }
            }
        }
        // Returning the input as a TextValue should always work, but if for
        // some reason not, exit with error
        throw new ParseError(); // TODO
    }

}


class TextValue extends Value {

    constructor(value) {
        super();
        if (value == null) throw new ParseError(
            "..." // TODO
        );
        this._value = value.toString();
    }

    toString(spec) {
        // No format specification given, return text as-is
        if (spec == null) {
            return this._value;
        }
        // If the specification is a valid pyformat, apply it
        let aspy = pyformat(this._value, spec);
        if (aspy != null) {
            return aspy;
        }
        // No other specifications are implemented
        throw new FormatError(
            "invalid specification '" + spec + "' for text value '" + this._value + "'"
        );
    }

    _add(other) {
        if (other instanceof TextValue) {
            return new TextValue(this._value + other._value);
        }
    }

    _slice(other) {
        if (other instanceof NumberValue) {
            return new TextValue(this._value.slice(0, other._value));
        }
    }

    _rslice(other) {
        if (other instanceof NumberValue) {
            return new TextValue(this._value.slice(other._value));
        }
    }

    _eq(other) {
        if (other instanceof TextValue) {
            return this._value == other._value;
        }
    }

}


class NumberValue extends Value {

    constructor(value) {
        super();
        // Accept numbers directly
        if (isNumber(value)) {
            this._value = Math.trunc(value); // allow integers only for now
        // Validate text before conversion
        // TODO for now: https://stackoverflow.com/questions/175739/
        } else if (isString(value) && !isNaN(value) && !isNaN(parseInt(value))) {
            this._value = parseInt(value);
            this._TEXT = value;
        // Fail if not valid
        } else {
            throw new ParseError();
        }
    }

    toString(spec) {
        if (spec == null) {
            return this._value.toString();
        }
        let aspy = pyformat(this._value, spec);
        if (aspy != null) {
            return aspy;
        }
        // No other specifications are implemented
        throw new FormatError(
            "invalid specification '" + spec + "' for number value " + this._value
        );
    }

    _pos() {
        return new NumberValue(+this._value);
    }

    _neg() {
        return new NumberValue(-this._value);
    }

    _mul(other) {
        if (other instanceof NumberValue) {
            return new NumberValue(this._value * other._value);
        }
    }

    _div(other) {
        if (other instanceof NumberValue) {
            return new NumberValue(this._value / other._value);
        }
    }

    _mod(other) {
        if (other instanceof NumberValue) {
            return new NumberValue(this._value % other._value);
        }
    }

    _add(other) {
        if (other instanceof NumberValue) {
            return new NumberValue(this._value + other._value);
        }
    }

    _sub(other) {
        if (other instanceof NumberValue) {
            return new NumberValue(this._value - other._value);
        }
    }

    _gt(other) {
        if (other instanceof NumberValue) {
            return this._value > other._value;
        }
    }

    _lt(other) {
        if (other instanceof NumberValue) {
            return this._value < other._value;
        }
    }

    _ge(other) {
        if (other instanceof NumberValue) {
            return this._value >= other._value;
        }
    }

    _le(other) {
        if (other instanceof NumberValue) {
            return this._value <= other._value;
        }
    }

    _eq(other) {
        if (other instanceof NumberValue) {
            return this._value == other._value;
        }
    }

}


class DateValue extends Value {

    constructor(value) {
        super();
        if (isString(value)) {
            this._value = asDate(value); //  TODO inline asDate?
            this._TEXT = value;
        } else {
            // TODO make sure this is a javascript date otherwise fail
            this._value = new Date(value);
        }
        // Public attributes
        this.YEAR   = new NumberValue(this._value.getUTCFullYear());
        this.MONTH  = new NumberValue(this._value.getUTCMonth() + 1);
        this.DAY    = new NumberValue(this._value.getDate());
        this.HOUR   = new NumberValue(this._value.getUTCHours());
        this.MINUTE = new NumberValue(this._value.getUTCMinutes());
        this.SECOND = new NumberValue(this._value.getUTCSeconds());
    }

    toString(spec) {
        let aspy = pystrftime(this._value, (spec != null) ? spec : "%Y-%m-%d %H:%M:%S");
        if (aspy != null)  {
            return aspy;
        }
        throw new FormatError(
            "invalid specification '" + spec + "' for date value " + this._value
        );
    }

    _add(other) {
        if (other instanceof DateDeltaValue) {
            return new DateValue(this._value.getTime() + 1000 * other._value);
        }
    }

    _radd(other) {
        return this._add(other);
    }

    _sub(other) {
        if (other instanceof DateDeltaValue) {
            return new DateValue(this._value.getTime() - 1000 * other._value);
        } else if (other instanceof DateValue) {
            let milliseconds = this._value.getTime() - other._value.getTime();
            return new DateDeltaValue(milliseconds / 1000);
        }
    }

    _eq(other) {
        if (other instanceof DateValue) {
            return this._value === other._value;
        }
    }

    // TODO comparison ops

}


class DateDeltaValue extends Value {

    constructor(value) {
        super();
        if (isString(value)) {
            // TODO allow input format same as default output format?
            let match = value.match(/^\s*((?:[+\-]?)(?:(?:[1-9][0-9]*)|0))([smhd])\s*$/);
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
        } else if (isNumber(value)) {
            this._value = Math.trunc(value);
        // Fail if not a number
        } else throw new ParseError(
            "TODO" // TODO
        );
        // Decompose into human-friendly time intervals
        let sign    = Math.sign(this._value);
        let days    = Math.trunc( Math.abs(this._value)          / 86400);
        let hours   = Math.trunc((Math.abs(this._value) % 86400) / 3600 );
        let minutes = Math.trunc((Math.abs(this._value) % 3600 ) / 60   );
        let seconds = Math.trunc((Math.abs(this._value) % 60   )        );
        // Public attributes: note that these deviate from Python's timedelta
        this.SIGN    = new NumberValue(sign);
        this.DAYS    = new NumberValue(days);
        this.HOURS   = new NumberValue(hours);
        this.MINUTES = new NumberValue(minutes);
        this.SECONDS = new NumberValue(seconds);
        this.TOTAL_SECONDS = new NumberValue(this._value);
    }

    toString(spec) {
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

    _pos() {
        return new DateDeltaValue(+this._value);
    }

    _neg() {
        return new DateDeltaValue(-this._value);
    }

    _mul(other) {
        if (other instanceof NumberValue) {
            return new DateDeltaValue(this._value * other._value);
        }
    }

    _rmul(other) {
        return this._mul(other);
    }

    _div(other) {
        if (other instanceof NumberValue) {
            return new DateDeltaValue(this._value / other._value);
        } else if (other instanceof DateDeltaValue) {
            return new NumberValue(this._value / other._value);
        }
    }

    _add(other) {
        if (other instanceof DateDeltaValue) {
            return new DateDeltaValue(this._value + other._value);
        }
    }

    _sub(other) {
        if (other instanceof DateDeltaValue) {
            return new DateDeltaValue(this._value - other._value);
        }
    }

    _eq(other) {
        if (other instanceof DateDeltaValue) {
            return this._value === other._value;
        }
    }

    // TODO comparison ops

}


// Attribute names are special objects
class AttributeValue extends Value {

    constructor(name) {
        super();
        this._name = name.toString();
        if (this._name.startsWith("_")) throw new ValueError(
            "access to underscore-attribute '" + this._name + "' denied"
        );
    }

    toString(spec) {
        if (spec != null) throw new FormatError("sdjfjasdf"); // TODO
        return this._name;
    }

    // Attribute access through the "attr" operator is implemented here once
    // through the reverse of the operator. This makes it work for all *Value
    // classes, without the need to implement the operator in those classes.
    _rattr(other) {
        let out = other[this._name];
        if (out instanceof Value) {
            return out;
        } else throw new ValueError(
            "attribute '" + this._name + "' does not exist on '" + other.toString() + "'"
        );
    }

}


// Value placeholder (free variable)
class Placeholder {

    constructor(name) {
        this._name = name.toString();
    }

    get _variables() {
        return new Set([this._name]);
    }

    _eval(substitutions) {
        let value = substitutions.get(this._name);
        if (value == null) throw new ValueError(
            "12345" // TODO
        );
        if (!(value instanceof Value)) throw new ValueError(
            "23456" // TODO
        );
        return value;
    }

    toString() {
        return this._name;
    }

}



/*** Expressions ***/

class TokenStream {

    constructor(text) {
        this._text = text;
        // Whitespace removal around all tokens. Set global (remember last
        // position) and sticky (no skipping) flags.
        // Recognized as tokens:
        // - [1-9][0-9]*[smhd]      -> DateDeltaValue
        // - [1-9][0-9]*            -> NumberValue
        // - [().*%+\-§\/]          -> operator
        // - [A-Za-z_][A-Za-z0-9_]* -> placeholder or attribute name
        this._pattern = /\s*(([1-9][0-9]*[smhd])|([1-9][0-9]*)|[().*%+\-§\/]|[A-Za-z_][A-Za-z0-9_]*)\s*/gy;
        // Initialize current token
        this.advance();
    }

    get token() {
        return this._token;
    }

    advance() {
        // End of stream, no more tokens
        if (this._pattern.lastIndex === this._text.length) {
            this._token = null;
        // Extract next token or throw error if no match
        } else {
            let lastIndex = this._pattern.lastIndex;
            let match = this._pattern.exec(this._text);
            // No match
            if (match == null) {
                throw new ParseError("invalid syntax: '" + this._text.slice(lastIndex) + "'");
            // Group 2 match: DateDeltaValue
            } else if (match[2] != null) {
                this._token = new DateDeltaValue(match[1]);
            // Group 3 match: NumberValue
            } else if (match[3] != null) {
                this._token = new NumberValue(match[1]);
            // Other matches: operator symbols, placeholder names
            } else {
                this._token = match[1];
            }
        }
    }

}


// Parse (parenthesized) expressions with binary infix and unary prefix
// operators. Implementation based on
// - http://www.engr.mun.ca/~theo/Misc/exp_parsing.htm
// - https://eli.thegreenplace.net/2012/08/02/parsing-expressions-by-precedence-climbing/
class PrecedenceClimbingParser {

    constructor(operators) {
        this._uOp = new Map(); // Unary operators (associativity 0)
        this._bOp = new Map(); // Binary operators (left associative < 0, right > 0)
        for (let op of operators) {
            (op.associativity === 0 ? this._uOp : this._bOp).set(op.symbol, op);
        }
    }

    parse(stream) {
        let ast = this._expr(stream, 0);
        if (stream.token != null) throw new ParseError(
            "invalid syntax: expected end but got '" + stream.token + "'"
        );
        return ast;
    }

    _expr(stream, minPrecedence) {
        let left = this._atom(stream);
        while (true) {
            let op = this._bOp.get(stream.token);
            // Return if stream ends or the next operator is not binary or
            // violates precedence condition
            if (stream.token == null || op == null || op.precedence < minPrecedence) {
                break;
            }
            stream.advance();
            let right = this._expr(stream, op.precedence + (op.associativity < 0 ? 1 : 0));
            left = new Expression(op, [left, right])
        }
        return left;
    }

    _atom(stream) {
        let token = stream.token;
        if (token == null) throw new ParseError(
            "unexpected end"
        );
        stream.advance();
        let op = this._uOp.get(token);
        // Unary operator: start with new expression as only argument
        if (op != null) {
            return new Expression(op, [this._expr(stream, op.precedence)]);
        // Parenthesized expression: start new expression from precedence 0,
        // must end with closing parenthesis
        } else if (token === "(") {
            let inner = this._expr(stream, 0);
            if (stream.token !== ")") throw new ParseError(
                "expected closing parenthesis, got '" + stream.token + "'"
            );
            stream.advance(); // clear closing parenthesis
            return inner;
        // Leaf
        } else {
            return token;
        }
    }

}


let _exprParser = new PrecedenceClimbingParser([
    // Attribute access (this is a special operator that requires additional
    // post-processing for its second argument in the Expression constructor)
    { symbol: ".", precedence: 90, associativity: -1, method: "attr" },
    // Unary positive and negative
    { symbol: "+", precedence: 70, associativity:  0, method: "pos" },
    { symbol: "-", precedence: 70, associativity:  0, method: "neg" },
    // Substring/slice
    { symbol: "§", precedence: 50, associativity: -1, method: "slice" },
    // Multiplication, integer division, remainder
    { symbol: "*", precedence: 40, associativity: -1, method: "mul" },
    { symbol: "/", precedence: 40, associativity: -1, method: "div" },
    { symbol: "%", precedence: 40, associativity: -1, method: "mod" },
    // Addition, subtraction
    { symbol: "+", precedence: 30, associativity: -1, method: "add" },
    { symbol: "-", precedence: 30, associativity: -1, method: "sub" },
]);


class Expression {

    constructor(op, args) {
        this._op = op;
        this._args = args;
        // Additional checks to ensure that parsed expression is valid
        if (op.associativity === 0 && args.length !== 1) throw new ParseError(
            "unary operator '" + op.method + "' (" + op.symbol + ") got " + args.length + " arguments"
        );
        if (op.associativity !== 0 && args.length !== 2) throw new ParseError(
            "binary operator '" + op.method + "' (" + op.symbol + ") got " + args.length + " arguments"
        );
        // Attribute access is special in that its second argument is
        // interpreted as the name of the accessed attribute. Convert it to
        // a special AttributeValue object here.
        if (this._op.method === "attr") {
            if (!isString(this._args[1])) throw new Error(
                "invalid attribute access in expression '" + this.toString() + "'"
            );
            this._args[1] = new AttributeValue(this._args[1]);
        }
        // Remaining strings in the expression are converted to variables
        // (placeholders for value substitution)
        this._args = this._args.map(arg => {
            return isString(arg) ? new Placeholder(arg) : arg;
        });
    }

    // All-in-one text-to-Expression constructor
    static parse(text) {
        let expr = _exprParser.parse(new TokenStream(text));
        // If the expression is just a string, convert the string to a variable
        return isString(expr) ? new Placeholder(expr) : expr;
    }

    // Variables of the expression that are open for substitution
    get _variables() {
        let deps = new Set();
        for (let arg of this._args) {
            if (isString(arg)) {
                deps.add(arg);
            } else {
                for (let dep of arg._variables) {
                    deps.add(dep);
                }
            }
        }
        return new Set(deps);
    }

    // Evaluate the expression for a given set of substitutions
    _eval(substitutions) {
        if (substitutions == null) {
            substitutions = new Map();
        }
        let args = this._args.map(arg => arg._eval(substitutions));
        // Find the operator method on the first argument
        let fop = args[0]["_" + this._op.method];
        if (fop != null) {
            let value = fop.call(args[0], args[1]);
            // The operator may return undefined/null to signify that it does
            // not have an implementation defined for this type of other
            if (value != null) {
                return value;
            }
        }
        // Try the reverse operator of the second argument for binary operators
        if (args.length > 1) {
            let rop = args[1]["_r" + this._op.method];
            if (rop != null) {
                let value = rop.call(args[1], args[0]);
                if (value != null) {
                    return value;
                }
            }
        }
        // Both forward and backward operators either don't exist or return
        // undefined. The operation is not possible.
        throw new ValueError(
            "operator '" + this._op.method + "' not defined for " + args.map(_ => _.constructor.name).join(" and ")
        );
    }

    toString() {
        return this._op.symbol + "(" + this._args.map(_ => _.toString()).join(", ") + ")";
    }

}




/*** Dependency Graph ***/

class UpdateGraph {

    constructor() {
        this._nodes = new Set();
        this._edges = new Map();
        this._sorted = null;
    }

    getNode(obj) {
        let node = obj.toString();
        if (!this._nodes.has(node)) {
            this._nodes.add(node);
            this._edges.set(node, new Set());
        }
        return node;
    }

    assertNode(obj) {
        let node = obj.toString();
        if (!this._nodes.has(node)) throw new Error(
            "'" + node + "' is not a node of the graph"
        );
        return node;
    }

    addEdge(obj, objDep) {
        let node    = this.getNode(obj);
        let nodeDep = this.getNode(objDep);
        this._edges.get(nodeDep).add(node);
        this._sorted = null;
    }

    orderOf(obj) {
        let node = this.assertNode(obj);
        let order = this._order;
        return order.get(node);
    }

    updateOrderedNodesOf(obj) {
        let node = this.assertNode(obj);
        let order = this._order;
        return this._dfs(node).sort(function (x, y) {
            return order.get(x) - order.get(y);
        });
    }

    get orderedNodes() {
        let order = this._order;
        return Array.from(this._nodes).sort(function (x, y) {
            return order.get(x) - order.get(y);
        });
    }

    get _order() {
        if (this._sorted == null) {
            let edges = this._edges;
            // Determine topological order with dfs-based algorithm:
            // https://en.wikipedia.org/wiki/Topological_sorting#Depth-first_search
            let permanent = new Set();
            let temporary = new Set();
            function visit (n) {
                if (permanent.has(n)) return;
                if (temporary.has(n)) {
                    let cycle = Array.from(temporary);
                    cycle.slice(cycle.indexOf(n));
                    cycle.push(n);
                    throw new CycleError(cycle);
                }
                temporary.add(n);
                edges.get(n).forEach(visit);
                temporary.delete(n);
                permanent.add(n);
            }
            this._nodes.forEach(visit);
            // Assign order: permanent yields items in insertion order, which
            // needs to be reversed for topological order
            this._sorted = new Map();
            let i = permanent.size;
            for (let node of permanent) {
                this._sorted.set(node, i--);
            }
        }
        return this._sorted;
    }

    _dfs(init) {
        let out = [];
        let visited = new Set();
        let stack = [init];
        while (stack.length > 0) {
            let current = stack.pop();
            if (visited.has(current)) continue;
            out.push(current);
            visited.add(current);
            let targets = this._edges.get(current);
            if (targets != null) {
                for (let target of targets) {
                    stack.push(target);
                }
            }
        }
        return out;
    }

}


class FPElement {

    constructor(id) {
        // Generate an ID if none was given
        if (id == null || id == "") {
            this._generateID();
        // Validate a given ID
        } else if (/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) {
            this.id = id;
        } else throw new ElementError(
            "invalid id '" + id + "' for " + this.constructor.name
            + " (names must begin with A-z and only contain A-z, 0-9 and _)"
        );
        // Element is initially not connected to a flottplot supervisor. This
        // attribute is set by the supervising flottplot instance when the
        // element is added to it.
        this.flottplot = null;
        // Pattern lookup and dependencies required for value updates. These
        // should be set once before the element is connected to its supervisor
        // (best during initialization) with the setDependenciesFrom method.
        this.patterns = new Map();
        this.dependencies = new Set();
        // Actions of the element exposed to the user
        this.actions = new Set();
        // Tooltip-like error box for inline error message reporting
        this._errorBox = null;
    }

    _generateID() {
        let pool = "qwertzuiopasdfghjklyxcvbnmQWERTZUIOPASDFGHJKLYXCVBNM";
        let chars = [];
        for (let i = 0; i < 30; ++i) {
            chars.push(pool.charAt(Math.floor(Math.random() * pool.length)));
        }
        // TODO
        this.id = "_" + chars.join("");
    }

    // Throw an error, provides additional context generated for this element
    fail(message) {
        this.failWith(new ElementError(
            "in " + this.constructor.name + " '" + this.id + "': " + message
        ));
    }

    failWith(error) {
        if (this.node != null) {
            if (this._errorBox == null) {
                this._errorBox = dom.newNode("div", {
                    "class": "fp-error",
                    "style": "position:absolute;top:-3px;left:100%;min-width:250px;max-width:500px;border:3px solid #F00;background-color:#FCC;padding:3px;"
                });
                let wrapperDisplay = window.getComputedStyle(this.node).display;
                let wrapper = dom.newNode("div", {
                    "style": "position:relative;padding:0;margin:0;display:"+wrapperDisplay+";border:3px solid #F00;"
                });
                this.node.replaceWith(wrapper);
                wrapper.appendChild(this._errorBox);
                wrapper.appendChild(this.node);
            }
            // Add the current error
            this._errorBox.appendChild(dom.newNode("div", {}, [
                dom.newNode("b", {}, [error.constructor.name, ": "]), error.message
            ]));
            // Show only the 5 most recent errors
            while (this._errorBox.children.length > 5) {
                this._errorBox.firstChild.remove();
            }
        } else {
            throw error;
        }
    }

    // Invoke an action of the element, update the element and notify all
    // dependent element
    invoke(action, ...args) {
        if (!this.actions.has(action)) {
            this.fail("action '" + action + "' does not exist");
        } else {
            this[action](...args);
            this.notify();
        }
    }

    // Notify the supervisor that this element has changed its value
    notify() {
        if (this.flottplot != null) {
            this.flottplot.notify(this.id);
        }
    }

    // Some elements might want to do some special stuff on initialization
    // (e.g. interact with the flottplot supervisor), they can override this
    // method to do that. Otherwise just perform a regular update.
    initialize(substitution) {
        this.update(substitution);
    }

    // Deal with changes in the dependencies of this element. This should be
    // overriden by all subclasses. The supervisor will call this function
    // with one argument containing an evaluated substitution as taylored to
    // the requirements laid out by the patterns attribute. There is no need to
    // notify the supervisor again within the update.
    update(substitution) {}

    // TODO: provide default implementation for get value?

    // Extract substitution patterns from the given template string and insert
    // them into the patterns and dependencies attributes of this element so
    // the supervisor can provide appropriate substitutions in updates
    setDependenciesFrom(...templates) {
        this.patterns  = new Map();
        this.dependencies = new Set();
        for (let template of templates) {
            for (let match of template.matchAll(/{.+?}/g)) {
                // ...
                let pattern = match[0];
                // ...
                let [expression, format] = pattern.slice(1, -1).split(":");
                expression = Expression.parse(expression);
                // format will have undefined assigned if not given
                this.patterns.set(pattern, [expression, format]);
                // ...
                for (let name of expression._variables) {
                    this.dependencies.add(name);
                }
            }
        }
    }

    // Apply the substitution to the template string
    substitute(template, substitution) {
        let out = [];
        let i = 0;
        while (i < template.length) {
            let match = false;
            for (let [pattern, value] of substitution) {
                if (template.slice(i, i + pattern.length) === pattern) {
                    out.push(value);
                    i += pattern.length;
                    match = true;
                    break
                }
            }
            if (!match) {
                out.push(template.charAt(i));
                i += 1;
            }
        }
        return out.join("");
    }

}



class Items {

    constructor() {
        this.wrapMin = false;
        this.wrapMax = false;
    }

    // Derived classes must implement/initialize:
    //  _selected :: integer
    //  index :: integer
    //  indexMax :: integer
    //  indexMin :: integer
    //  map(...args)
    //  value :: Value

    get wrap() {
        return this.wrapMax || this.wrapMin;
    }

    set wrap(wrap) {
        // backwards compatibility: "true" is alias for "both"
        this.wrapMax = (wrap === "true" || wrap === "both" || wrap === "max");
        this.wrapMin = (wrap === "true" || wrap === "both" || wrap === "min");
    }

    get size() {
        return this.indexMax - this.indexMin + 1;
    }

    get isFinite() {
        return isFinite(this.size);
    }

    // Relative navigation

    prev() {
        if (this._selected > this.indexMin) {
            this._selected -= 1;
        } else if (this.wrapMin) {
            this._selected = this.indexMax;
            return Items.WRAP;
        }
    }

    next() {
        if (this._selected < this.indexMax) {
            this._selected += 1;
        } else if (this.wrapMax) {
            this._selected = this.indexMin;
            return Items.WRAP;
        }
    }

}
// Special events emitted during manipulation of Items
Items.WRAP = "WRAP";


class OptionsItems extends Items {

    constructor(options, init, wrap) {
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
        // Set initial value (initializes this._selected)
        this.value = (init != null) ? init : this._options[0];
    }

    get index() {
        return this._selected;
    }

    set index(index) {
        if (index < this.indexMin || this.indexMax < index) throw new ItemsError(
            "invalid index " + index + " (out of range)"
        );
        this._selected = index;
    }

    get value() {
        return this._options[this._selected];
    }

    set value(value) {
        // Use _eq relation of Value-types
        let index = this._options.findIndex(_ => _._eq(value));
        if (index < 0) throw new ItemsError(
            "value " + value.toString() + " not found in options"
        );
        this._selected = this.indexMin + index;
    }

    map(...args) {
        return Array.from(this._options).map(...args);
    }

}


class RangeItems extends Items {

    constructor(init, step, min, max, wrap) {
        super();
        this.wrap = wrap;
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
        // ...
        if (step == null) throw new ItemsError(
            "no step specified" // TODO
        );
        this._factor = step;
        // Determine the boundary indices of an inclusive range. Range can be
        // open at one or both ends. Use Infinity boundaries to indicate this.
        this.indexMin = min == null ? Number.NEGATIVE_INFINITY
                                    : Math.ceil(min._sub(this._offset)._div(step)._value);
        this.indexMax = max == null ? Number.POSITIVE_INFINITY
                                    : Math.floor(max._sub(this._offset)._div(step)._value);
        if (this.wrap && !this.isFinite) throw new ItemsError(
            "open-ended range cannot wrap"
        );
        // TODO make sure min < max
        // TODO make sure range is not empty
        // Initialize _selected. Using value setter clips init into range.
        this.value = this._offset;
    }

    _genValue(index) {
        // TODO: attach index?
        // Because this is not going through proper Expression evaluation, the
        // order in which the following operations are carried out is
        // important, as _add and _mul may otherwise not be defined on the
        // intermediate values.
        return this._offset._add(this._factor._mul(new NumberValue(index)));
    }

    _genIndex(value) {
        return Math.round(value._sub(this._offset)._div(this._factor)._value);
    }

    get index() {
        return this._selected;
    }

    set index(index) {
        if (index < this.indexMin || this.indexMax < index) throw new ItemsError(
            "cannot set to index " + index
        );
        this._selected = index;
    }

    get value() {
        return this._genValue(this.index);
    }

    set value(value) {
        this.index = Math.max(this.indexMin, Math.min(this._genIndex(value), this.indexMax));
    }

    map(...args) {
        if (!this.isFinite) throw new ItemsError(
            "cannot list an infinite range"
        );
        let out = [];
        for (let index = this.indexMin; index <= this.indexMax; index++) {
            out.push(this._genValue(index));
        }
        return out.map(...args);
    }

}

