"use strict";

const fs = require("fs");
const assert = require("assert");

const { UpdateGraph, CycleError } = require("./flottplot.js").flottplot.graph;


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
        graph.getNode("f", true);
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
        graph.getNode("b", true);
        assert.throws(function () {
            graph.orderOf("b");
        }, CycleError);
    });

});



