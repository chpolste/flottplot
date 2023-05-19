"use strict";

const fs = require("fs");
const assert = require("assert");

const { Attributes } = require("./flottplot.js").flottplot.dom;


describe("dom.Attributes", function () {

    //include dom.js

    it("popActions with no matches returns Map", function() {
        const attrs = new Attributes();
        attrs.set("foo", "bar");
        attrs.set("baz-action", "bla");
        const actions = attrs.popActions(["foo"]);
        assert.equal(actions.size, 1);
        assert.deepEqual(actions.get("foo"), []);
    });

    it("popActions with match returns Map of actions", function() {
        const attrs = new Attributes();
        attrs.set("foo", "bar");
        attrs.set("baz-action", "bla.next");
        attrs.set("bar-action", "foo.prev");
        const actions = attrs.popActions(["baz", "goo", "bar"]);
        assert.equal(actions.size, 3);
        assert.deepEqual(actions.get("baz"), [["bla", "next"]]);
        assert.deepEqual(actions.get("bar"), [["foo", "prev"]]);
        assert.deepEqual(actions.get("goo"), []);

    });

});

