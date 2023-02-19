"use strict";

let fs = require("fs");
let assert = require("assert");

//include core.js


describe("Value constructors", function () {

    it("DateValue year-first constructors", function () {
        new DateValue("2018-01");
        new DateValue("2018-01-24");
        new DateValue("2018-01-24 03");
        new DateValue("2018-01-24 03:56");
        new DateValue("2018-01-24 03:56:13");
        new DateValue("2018/01");
        new DateValue("2018/01/24");
        new DateValue("2018/01/24 03");
        new DateValue("2018/01/24 03:56");
        new DateValue("2018/01/24 03:56:13");
        new DateValue("2018-1-4 3:6:3");
    });

    it("DateValue year-last constructors", function () {
        new DateValue("01-2018");
        new DateValue("24-01-2018");
        new DateValue("24-01-2018 03");
        new DateValue("24-01-2018 03:56");
        new DateValue("24-01-2018 03:56:13");
        new DateValue("01/2018");
        new DateValue("24/01/2018");
        new DateValue("24/01/2018 03");
        new DateValue("24/01/2018 03:56");
        new DateValue("24/01/2018 03:56:13");
        new DateValue("01.2018");
        new DateValue("24.01.2018");
        new DateValue("24.01.2018 03");
        new DateValue("24.01.2018 03:56");
        new DateValue("24.01.2018 03:56:13");
    });

    it("DateDeltaValue constructor", function () {
        new DateDeltaValue(0);
        new DateDeltaValue(63);
        new DateDeltaValue(-6);
        new DateDeltaValue("4m");
        new DateDeltaValue("-3s");
        new DateDeltaValue("0d");
        new DateDeltaValue("-0m");
        new DateDeltaValue("+5m");
        // Make sure the constructor takes seconds (not milliseconds)
        let twomins = new DateDeltaValue(120);
        assert.strictEqual(twomins.MINUTES.toString(), "2");
        assert.strictEqual(twomins.TOTAL_SECONDS.toString(), "120");
    });

    it("Value.from recognizes numbers", function () {
        assert(Value.from("3") instanceof NumberValue);
        assert(Value.from("-43") instanceof NumberValue);
        assert(Value.from(" 203") instanceof NumberValue);
        assert(Value.from("3   ") instanceof NumberValue);
        assert(Value.from(" 89 ") instanceof NumberValue);
    });

    it("Value.from recognizes date deltas", function () {
        assert(Value.from("3d") instanceof DateDeltaValue);
        assert(Value.from("3d  ") instanceof DateDeltaValue);
        assert(Value.from("  3d") instanceof DateDeltaValue);
        // TODO
    });

    it("Value.from recognizes dates", function () {
        assert(Value.from("2018-01-24") instanceof DateValue);
        // TODO
    });

    it("Value.from recognizes text", function () {
        assert(Value.from("2018-01-2A") instanceof TextValue);
        assert(Value.from("3 days") instanceof TextValue);
        // TODO
    });

});

describe("Value formatting", function () {

    it("Generated TextValue and NumberValue format specifications", function () {
        let format_testcases = JSON.parse(fs.readFileSync("tests/value-testcases.json", "utf8"));
        for (let testcase of format_testcases) {
            let [value, spec, result] = testcase;
            if (isNumber(value)) {
                value = new NumberValue(value);
            } else {
                value = new TextValue(value);
            }
            if (result == null) {
                assert.throws(() => value.toString(spec), undefined, spec);
            } else {
                assert.strictEqual(value.toString(spec), result, "format '" + value + "' with '" + spec + "'");
            }
        }
    });

    it("DateValue pystrftime format specifications", function () {
        let value = new DateValue("2018-01-24 03:56:00");
        // Individual replacements
        assert.strictEqual(value.toString("%Y"), "2018");
        assert.strictEqual(value.toString("%y"), "18");
        assert.strictEqual(value.toString("%m"), "01");
        assert.strictEqual(value.toString("%d"), "24");
        assert.strictEqual(value.toString("%H"), "03");
        assert.strictEqual(value.toString("%M"), "56");
        assert.strictEqual(value.toString("%S"), "00");
        assert.strictEqual(value.toString("%%"), "%");
        // Combined with additional characters
        assert.strictEqual(value.toString("%Y-%m-%dT%HZ"), "2018-01-24T03Z");
    });

    it("DateDeltaValue default format", function() {
        let pos  = new DateDeltaValue("+5m");
        assert.strictEqual(pos.toString(), "+0d 00:05:00");
        let neg  = new DateDeltaValue("-251h");
        assert.strictEqual(neg.toString(), "-10d 11:00:00");
        let zero = new DateDeltaValue("0d");
        assert.strictEqual(zero.toString(), "+0d 00:00:00");
    });

});


describe("Value operators", function () {

    function stringBasedTester(cases, substitutions) {
        return () => {
            substitutions = new Map(substitutions);
            for (let [expr, expected] of cases) {
                if (expected.prototype instanceof Error) {
                    assert.throws(() => Expression.parse(expr)._eval(substitutions), expected);
                } else {
                    assert.strictEqual(Expression.parse(expr)._eval(substitutions).toString(), expected);
                }
            }
        }
    }

    it("TextValue concatenation (add)", stringBasedTester([
        ["foo + bar", "abcdef"],
        ["foo + foo", "abcabc"],
        ["bar + bar", "defdef"],
        ["bar + foo", "defabc"],
    ], [
        ["foo", new TextValue("abc")],
        ["bar", new TextValue("def")],
    ]));

    it("TextValue substrings (slice)", stringBasedTester([
        [" 3 § foo     ", "defghijk"],
        ["-3 § foo     ", "ijk"],
        ["     foo §  3", "abc"],
        ["     foo § -3", "abcdefgh"],
    ], [
        ["foo", new TextValue("abcdefghijk")]
    ]));

    it("NumberValue unary operators (pos, neg)", stringBasedTester([
        ["-(-2)",  "2"],
        ["+(-5)", "-5"],
    ]));

    it("NumberValue arithmetic (add, sub, mul, div)", stringBasedTester([
        ["2 + 3", "5"],
        ["5 - 3", "2"],
        ["2 * 3", "6"],
        ["8 / 2", "4"],
    ]));

    it("NumberValue modulo (mod)", stringBasedTester([
        ["8 % 2", "0"],
        ["8 % 3", "2"],
        ["8 % -3", "2"],
        ["-8 % 2", "0"],
        ["-8 % 3", "-2"],
        ["-8 % -3", "-2"],
    ]));

    it("DateValue difference (sub)", stringBasedTester([
        ["foo - bar", "+1d 21:39:10"],
        ["bar - foo", "-1d 21:39:10"],
    ], [
        ["foo", new DateValue("2020-01-18 00:03:20")],
        ["bar", new DateValue("2020-01-16 02:24:10")],
    ]));

    it("DateDeltaValue addition and subtraction (add, sub)", stringBasedTester([
        ["2d - 3h + 30m - 4s", "+1d 21:29:56"],
    ]));

    it("DateDeltaValue/DateValue addition and subtraction (add, sub)", stringBasedTester([
        ["foo - 1d", "2020-01-17 00:03:20"],
        ["foo + 4h", "2020-01-18 04:03:20"],
        ["2m + foo", "2020-01-18 00:05:20"],
        ["2m + foo + 4h", "2020-01-18 04:05:20"],
    ], [
        ["foo", new DateValue("2020-01-18 00:03:20")],
    ]));

    it("DateDeltaValue division (div)", stringBasedTester([
        ["-3h / 20m", "-9"],
    ]));

    it("DateDeltaValue/NumberValue operations (mul, div)", stringBasedTester([
        ["(13m + 2s) * 5", "+0d 01:05:10"],
        ["5 * (13m + 2s)", "+0d 01:05:10"],
        ["(13m + 2s) / 2", "+0d 00:06:31"],
        ["2 / (13m + 2s)", ValueError],
    ]));

});


describe("Expressions", function () {

    it("...", function () {
        let ast = Expression.parse("foo + bar - (+baz + -foo)");
        assert.strictEqual(ast.toString(), "-(+(foo, bar), +(+(baz), -(foo)))");
    });

    it(",,,", function () {
        let subst = new Map([
            ["bar", new NumberValue(1)],
            ["baz", new TextValue("minutes")]
        ]);
        //console.log(Expression.parse("(120s * 3).minutes")._eval(subst));
    });

    it("correctly reports its dependencies", function () {
        //console.log(Expression.parse("foo + 3*(bar*bar-foo).(baz) - (-foo + ((3+4) § hi))")._variables);
    });

});


describe("TokenStream", function () {

    it("tokenizes basic example", function () {
        let stream = new TokenStream("foo baz-bar (foobar)");
        assert.strictEqual(stream.token, "foo");
        assert.strictEqual(stream.token, "foo");
        stream.advance();
        assert.strictEqual(stream.token, "baz");
        stream.advance();
        assert.strictEqual(stream.token, "-");
        stream.advance();
        assert.strictEqual(stream.token, "bar");
        stream.advance();
        assert.strictEqual(stream.token, "(");
        stream.advance();
        assert.strictEqual(stream.token, "foobar");
        stream.advance();
        assert.strictEqual(stream.token, ")");
        stream.advance();
        assert.strictEqual(stream.token, null);
        stream.advance();
        assert.strictEqual(stream.token, null);
    });

});


describe("UpdateGraph", function () {

    it("order of test graph 1", function () {
        let graph = new UpdateGraph();
        graph.addEdge("f", "d");
        graph.addEdge("c", "b");
        graph.addEdge("f", "e");
        graph.addEdge("g", "e");
        graph.addEdge("d", "b");
        graph.addEdge("b", "a");
        graph.addEdge("e", "c");
        assert(graph.orderOf("a") < graph.orderOf("b"));
        assert(graph.orderOf("b") < graph.orderOf("c"));
        assert(graph.orderOf("b") < graph.orderOf("d"));
        assert(graph.orderOf("c") < graph.orderOf("e"));
        assert(graph.orderOf("d") < graph.orderOf("f"));
        assert(graph.orderOf("e") < graph.orderOf("f"));
        assert(graph.orderOf("e") < graph.orderOf("g"));
        assert.deepEqual(graph.updateOrderedNodesOf("d"), ["d", "f"]);
        // ...
        if (graph.orderOf("c") < graph.orderOf("d")) {
            graph.addEdge("c", "d");
            assert(graph.orderOf("d") < graph.orderOf("c"));
        } else {
            graph.addEdge("d", "c");
            assert(graph.orderOf("c") < graph.orderOf("d"));
        }
    });

    it("order of test graph 2", function () {
        let graph = new UpdateGraph();
        graph.addEdge("c", "a");
        graph.addEdge("e", "d");
        graph.addEdge("h", "d");
        graph.addEdge("d", "b");
        graph.addEdge("e", "c");
        graph.addEdge("h", "e");
        graph.addEdge("h", "f");
        graph.addEdge("f", "c");
        graph.addEdge("g", "f");
        assert(graph.orderOf("a") < graph.orderOf("c"));
        assert(graph.orderOf("b") < graph.orderOf("d"));
        assert(graph.orderOf("c") < graph.orderOf("e"));
        assert(graph.orderOf("c") < graph.orderOf("f"));
        assert(graph.orderOf("d") < graph.orderOf("e"));
        assert(graph.orderOf("d") < graph.orderOf("h"));
        assert(graph.orderOf("e") < graph.orderOf("h"));
        assert(graph.orderOf("f") < graph.orderOf("g"));
        assert(graph.orderOf("f") < graph.orderOf("h"));
        assert.deepEqual(graph.updateOrderedNodesOf("b"), ["b", "d", "e", "h"]);
    });

    it("order of test graph 3", function () {
        let graph = new UpdateGraph();
        graph.addEdge("b", "a");
        graph.addEdge("c", "b");
        graph.addEdge("e", "d");
        graph.addEdge("c", "a");
        graph.getNode("f");
        assert(graph.orderOf("d") < graph.orderOf("e"));
        assert(graph.orderOf("a") < graph.orderOf("b"));
        assert(graph.orderOf("a") < graph.orderOf("c"));
        assert(graph.orderOf("b") < graph.orderOf("c"));
        assert.deepEqual(graph.updateOrderedNodesOf("a"), ["a", "b", "c"]);
        assert.deepEqual(graph.updateOrderedNodesOf("b"), ["b", "c"]);
        assert.deepEqual(graph.updateOrderedNodesOf("d"), ["d", "e"]);
        assert.deepEqual(graph.updateOrderedNodesOf("f"), ["f"]);
    });

    it("cycle in test graph 4", function () {
        let graph = new UpdateGraph();
        graph.addEdge("a", "b");
        graph.addEdge("b", "c");
        graph.addEdge("c", "d");
        graph.addEdge("c", "f");
        graph.addEdge("d", "e");
        graph.addEdge("e", "b");
        assert.throws(function () {
            graph.orderOf("a");
        }, CycleError);
    });

    it("cycle in test graph 5", function () {
        let graph = new UpdateGraph();
        graph.addEdge("a", "a");
        graph.getNode("b");
        assert.throws(function () {
            graph.orderOf("b");
        }, CycleError);
    });

});



describe("OptionsItems", function () {

    it("initialize with array", function () {
        let options = new OptionsItems([
            new NumberValue(4),
            new NumberValue(5),
            new TextValue("six")
        ]);
        assert.equal(options.value, 4);
        options.prev();
        assert.equal(options.value, 4);
        options.next();
        assert.equal(options.value, 5);
        options.next();
        assert.equal(options.value, "six");
        options.next();
        assert.equal(options.value, "six");
        options.value = new NumberValue(4);
        assert.equal(options.value, 4);
        options.value = new TextValue("six");
        assert.equal(options.value, "six");
    });

});



describe("RangeItems", function () {

    it("0...3 step 1 init 0", function () {
        let range = new RangeItems(
            new NumberValue(0), // init
            new NumberValue(1), // step
            new NumberValue(0), // min
            new NumberValue(3), // max
            false               // wrap
        );
        assert.equal(range.value, 0);
        range.prev();
        assert.equal(range.value, 0);
        range.next();
        assert.equal(range.value, 1);
        range.next();
        assert.equal(range.value, 2);
        range.next();
        assert.equal(range.value, 3);
        range.next();
        assert.equal(range.value, 3);
        range.prev();
        assert.equal(range.value, 2);
    });

    it("0...3 step 1 init 0 wrap", function () {
        let range = new RangeItems(
            new NumberValue(0), // init
            new NumberValue(1), // step
            new NumberValue(0), // min
            new NumberValue(3), // max
            true                // wrap
        );
        assert.equal(range.value, 0);
        range.prev();
        assert.equal(range.value, 3);
        range.prev();
        assert.equal(range.value, 2);
        range.next();
        assert.equal(range.value, 3);
        range.next();
        assert.equal(range.value, 0);
        range.next();
        assert.equal(range.value, 1);
        range.next();
        assert.equal(range.value, 2);
    });

    it("1...5 step 3 init 2 wrap", function () {
        let range = new RangeItems(
            new NumberValue(2), // init
            new NumberValue(3), // step
            new NumberValue(1), // min
            new NumberValue(5), // max
            true                // wrap
        );
        // ...
        assert.equal(range.value, 2);
        range.prev();
        assert.equal(range.value, 5);
        range.prev();
        assert.equal(range.value, 2);
        range.next();
        assert.equal(range.value, 5);
        range.next();
        assert.equal(range.value, 2);
        // ...
        range.value = new NumberValue(100);
        assert.equal(range.value, 5);
        range.value = new NumberValue(-100);
        assert.equal(range.value, 2);
    });

});

