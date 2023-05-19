"use strict";

const fs = require("fs");
const assert = require("assert");

const { TokenStream, Expr } = require("./flottplot.js").flottplot.expression;


describe("Expressions", function () {

    it("simple representation test", function () {
        const ast = Expr.parse("foo + bar - (+baz + -foo)");
        assert.strictEqual(ast.toString(), "-(+(foo, bar), +(+(baz), -(foo)))");
    });

});


describe("TokenStream", function () {

    it("tokenizes basic example", function () {
        const stream = new TokenStream("foo baz-bar (foobar)");
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

