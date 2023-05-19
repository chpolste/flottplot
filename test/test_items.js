"use strict";

const fs = require("fs");
const assert = require("assert");

const { OptionsItems, RangeItems } = require("./flottplot.js").flottplot.items;
const { NumberValue, TextValue } = require("./flottplot.js").flottplot.values;


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
            "both"              // wrap
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
            "both"              // wrap
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

