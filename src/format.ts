import { FormatError } from "./errors";


function makePad(n: number, fill: string): string {
    let pad = "";
    while (n > 0) {
        pad = pad + fill.substring(0, n);
        n -= fill.length;
    }
    return pad;
}

function padEnd(s: string, n: number, fill: string): string {
    return s + makePad(n - s.length, fill);
}

function padStart(s: string, n: number, fill: string): string {
    return makePad(n - s.length, fill) + s;
}

// Implement part of Python's format mini-langugage:
// https://docs.python.org/3/library/string.html#format-specification-mini-language
export function pyformat(value: string | number | Date, spec: string): string {
    // Regex:
    // (?:(.)?([<>=^]))?    [[fill]align]
    // ([+\- ])?            [sign]
    // not implemented      [#]
    // (0)?                 [0]             (sign-aware zero-padding)
    // ([1-9][0-9]*)?       [width]
    // not implemented      [grouping option]
    // not implemented      [.precision]
    // ([sd])?              [type]
    const match = spec.match(/^(?:(.)?([<>=^]))?([+\- ])?(0)?([1-9][0-9]*)?([sd])?$/);
    if (match == null) throw new FormatError(
        `invalid format specification: ${spec}`
    );
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
    if (typeof value === "string" && (kind == null || kind === "s") && align !== "=" && sign == null) {
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
    } else if (typeof value === "number" && kind !== "s") {
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
    } else throw new FormatError(
        `cannot format ${value} as ${spec}`
    );
    // Apply alignment and re-attach sign to numbers
    if (value.length < width) {
        if (zerop) {
            return sign + padStart(value, width - sign.length, "0");
        } else if (align === ">") {
            return padStart(sign + value, width, fill);
        } else if (align === "<") {
            return padEnd(sign + value, width, fill);
        } else if (align === "^") {
            value = sign + value;
            const lwidth = value.length + Math.floor((width - value.length) / 2);
            return padEnd(padStart(value, lwidth, fill), width, fill);
        } else if (align === "=") {
            const lwidth = value.length + Math.floor((width - value.length) / 2);
            return padEnd(padStart(sign + value, lwidth, fill), width, fill);
        }
    }
    return sign + value;
}


// From: https://strftime.org/
const _pystrftime_lookup: { [symbol: string]: (x: Date) => string } = {
    // Day of the month as a zero-padded decimal number
    "d": (x: Date) => pyformat(x.getUTCDate(), "0>2"),
    // Month as a zero-padded decimal number
    "m": (x: Date) => pyformat(x.getUTCMonth() + 1, "0>2"),
    // Year without century as a zero-padded decimal number
    "y": (x: Date) => pyformat(x.getUTCFullYear() % 100, "0>2"),
    // Year with century as a decimal number
    "Y": (x: Date) => "" + x.getUTCFullYear(),
    // Hour (24-hour clock) as a zero-padded decimal number
    "H": (x: Date) => pyformat(x.getUTCHours(), "0>2"),
    // Minute as a zero-padded decimal number
    "M": (x: Date) => pyformat(x.getUTCMinutes(), "0>2"),
    // Second as a zero-padded decimal number
    "S": (x: Date) => pyformat(x.getUTCSeconds(), "0>2"),
    // A literal '%' character
    "%": (x: Date) => "%",
}

export function pystrftime(value: Date, spec: string): string {
    const out = [];
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
