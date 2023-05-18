import { Expression, Evaluation } from "./interface";
import { ParseError, ValueError } from "./errors";
import { Value, AttributeValue, NumberValue, DateDeltaValue } from "./values";


// Tokens that can be parsed directly for expressions
type Token = DateDeltaValue | NumberValue | string;

export class TokenStream {

    readonly text: string;
    _token: Token | null;
    _pattern: RegExp;

    constructor(text: string) {
        this.text = text;
        // Whitespace removal around all tokens. Set global (remember last
        // position) and sticky (no skipping) flags.
        // Recognized as tokens:
        // - [1-9][0-9]*[smhd]      -> DateDeltaValue
        // - [1-9][0-9]*            -> NumberValue
        // - [().*%+\-§\/]          -> operator
        // - [A-Za-z_][A-Za-z0-9_]* -> placeholder or attribute name
        this._pattern = /\s*(([1-9][0-9]*[smhd])|([1-9][0-9]*)|[().*%+\-§\/]|[A-Za-z_][A-Za-z0-9_]*)\s*/gy;
        // Initialize current token
        this._token = null;
        this.advance();
    }

    get token(): Token | null {
        return this._token;
    }

    advance(): void {
        // End of stream, no more tokens
        if (this._pattern.lastIndex === this.text.length) {
            this._token = null;
        // Extract next token or throw error if no match
        } else {
            const lastIndex = this._pattern.lastIndex;
            const match = this._pattern.exec(this.text);
            // No match
            if (match == null) {
                throw new ParseError("invalid syntax: '" + this.text.slice(lastIndex) + "'");
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


// Value placeholder (free variable)
class Placeholder implements Expression {

    readonly name: string;

    constructor(name: string) {
        this.name = name;
    }

    get _variables() {
        return new Set([this.name]);
    }

    _eval(substitution: Evaluation): Value {
        let value = substitution.get(this.name);
        if (value == null) throw new ValueError(
            "12345" // TODO
        );
        if (!(value instanceof Value)) throw new ValueError(
            "23456" // TODO
        );
        return value;
    }

    toString(): string {
        return this.name;
    }

}


// Operator definition in Expr
type ExprOperator = {
    symbol: string,
    precedence: number,
    associativity: number,
    method: string
};

// Parse (parenthesized) expressions with binary infix and unary prefix
// operators. Implementation based on
// - http://www.engr.mun.ca/~theo/Misc/exp_parsing.htm
// - https://eli.thegreenplace.net/2012/08/02/parsing-expressions-by-precedence-climbing/
class PrecedenceClimbingParser {

    _uOp: Map<string, ExprOperator>;
    _bOp: Map<string, ExprOperator>;

    constructor(operators: Iterable<ExprOperator>) {
        this._uOp = new Map(); // Unary operators (associativity 0)
        this._bOp = new Map(); // Binary operators (left associative < 0, right > 0)
        for (const op of operators) {
            if (op.associativity === 0) {
                this._uOp.set(op.symbol, op);
            } else {
                this._bOp.set(op.symbol, op);
            }
        }
    }

    parse(stream: TokenStream): Expression {
        const ast = this._expr(stream, 0);
        if (stream.token != null) throw new ParseError(
            "invalid syntax: expected end but got '" + stream.token + "'"
        );
        return ast;
    }

    _expr(stream: TokenStream, minPrecedence: number): Expression {
        let left = this._atom(stream);
        while (true) {
            const token = stream.token;
            if (typeof token !== "string") {
                break;
            }
            const op = this._bOp.get(token);
            // Return if stream ends or the next operator is not binary or
            // violates precedence condition
            if (op == null || op.precedence < minPrecedence) {
                break;
            }
            stream.advance();
            const right = this._expr(stream, op.precedence + (op.associativity < 0 ? 1 : 0));
            left = new Expr(op, [left, right]);
        }
        return left;
    }

    _atom(stream: TokenStream): Expression {
        // Consume a token
        const token = stream.token;
        if (token == null) throw new ParseError(
            "unexpected end"
        );
        stream.advance();
        // If the token is already a well-formed Expression, return
        if (typeof token !== "string") {
            return token;
        }
        // Try matching with a unary operator
        const op = this._uOp.get(token);
        if (op != null) {
            // Start with new expression as only argument
            return new Expr(op, [this._expr(stream, op.precedence)]);
        }
        // Parenthesized expression: start new expression from precedence 0,
        // must end with closing parenthesis
        if (token === "(") {
            const inner = this._expr(stream, 0);
            if (stream.token !== ")") throw new ParseError(
                "expected closing parenthesis, got '" + stream.token + "'"
            );
            stream.advance(); // clear closing parenthesis
            return inner;
        }
        // Leaf: remaining strings are converted to variables (placeholders
        // for value substitution or attribute names)
        return new Placeholder(token);
    }

}

const _exprParser = new PrecedenceClimbingParser([
    // Attribute access (this is a special operator that requires additional
    // post-processing for its second argument in the Expr constructor)
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


export class Expr implements Expression {

    readonly op: ExprOperator;
    readonly args: Array<Expression>;

    constructor(op: ExprOperator, args: Array<Expression>) {
        this.op = op;
        this.args = args;
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
        if (this.op.method === "attr") {
            if (!(this.args[1] instanceof Placeholder)) throw new Error(
                "invalid attribute access in expression '" + this.toString() + "'"
            );
            this.args[1] = new AttributeValue(this.args[1].name);
        }
    }

    // All-in-one text-to-Expr constructor
    static parse(text: string): Expression {
        return _exprParser.parse(new TokenStream(text));
    }

    // Variables of the expression that are open for substitution
    get _variables(): Set<string> {
        const deps: Set<string> = new Set();
        for (const arg of this.args) {
            if (arg instanceof Placeholder) {
                deps.add(arg.name);
            } else {
                for (let dep of arg._variables) {
                    deps.add(dep);
                }
            }
        }
        return deps;
    }

    // Evaluate the expression for a given set of substitutions
    _eval(substitution?: Evaluation): Value {
        const subs: Evaluation = (substitution != null) ? substitution : new Map();
        const args: Array<Value> = this.args.map(arg => arg._eval(subs));
        // Find the operator method on the first argument
        const fwdMethod = (args[0] as any)["_" + this.op.method];
        if (typeof fwdMethod === "function") {
            const value = fwdMethod.call(args[0], args[1]);
            // The operator may return undefined/null to signify that it does
            // not have an implementation defined for this type of other
            if (value != null) {
                return value;
            }
        }
        // Try the reverse operator of the second argument for binary operators
        if (args.length > 1) {
            const bwdMethod = (args[1] as any)["_r" + this.op.method];
            if (typeof bwdMethod === "function") {
                const value = bwdMethod.call(args[1], args[0]);
                if (value != null) {
                    return value;
                }
            }
        }
        // Both forward and backward operators either don't exist or return
        // undefined. The operation is not possible.
        throw new ValueError(
            "operator '" + this.op.method + "' not defined for " + args.map(_ => _.constructor.name).join(" and ")
        );
    }

    toString(): string {
        return this.op.symbol + "(" + this.args.map(_ => _.toString()).join(", ") + ")";
    }

}

