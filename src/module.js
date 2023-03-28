"use strict";

var flottplot = function () {
     
    //include core.js
    //include dom.js
    //include elements.js

    class Flottplot {

        constructor() {
            this._elements = new Map();
            this._graph = new UpdateGraph();
            // Special fields used by extension elements
            this.overlay = null; // fullscreen overlay with FPOverlay (extras)
            this.bindings = new Map(); // keybindings loopkup table: key -> callable
            this.urlstate = false; // save/recover state of all elements with URL hash
        }

        getElement(target) {
            let element = this._elements.get(target);
            if (element == null) throw new ElementError(
                "element with id '" + target + "' does not exist"
            );
            return element;
        }

        // ...

        convert(original) {
            let tag = Flottplot.tags.get(original.nodeName);
            if (tag == null) throw new ElementError(
                "unable to convert '" + original.nodeName + "': no corresponding flottplot element found"
            );
            // Intercept errors in element creation and replace these elements
            // with a red error message
            let element;
            try {
                element = tag.Class.from(original);
            } catch (error) {
                if (!(error instanceof FlottplotError)) {
                    throw error;
                }
                original.replaceWith(dom.newNode("div", {
                    "style": "border:3px solid #F00;background-color:#FCC;padding:3px;",
                }, [
                    dom.newNode("b", {}, [error.constructor.name, ": "]),
                    error.message
                ]));
                console.error(error);
                return;
            }
            // Remove the original element or replace with it's flottplotted
            // counterpart in the DOM tree if one is specified
            if (element.node == null) {
                original.remove();
            } else {
                original.replaceWith(element.node);
            }
            // Make sure id doesn't already exist in the collection
            if (this._elements.has(element.id)) {
                element.fail("duplicate id");
                this._elements.get(element.id).fail("duplicate id"); // TODO
            }
            // Add element to collection
            this._elements.set(element.id, element);
            // Insert element into dependency graph
            this._graph.getNode(element.id);
            for (let dep of element.dependencies) {
                this._graph.addEdge(element.id, dep);
            }
            // Give the element a supervisor
            element.flottplot = this;
            // Enable method chaining
            return this;
        }

        scan(root) {
            let tag = Flottplot.tags.get(root.nodeName);
            if (tag == null || tag.isRecursive) {
                let children = Array.from(root.childNodes);
                for (let child of children) {
                    this.scan(child);
                }
            }
            if (tag != null) {
                this.convert(root);
            }
            // Enable method chaining
            return this;
        }

        // Element updating and update communication

        initialize() {
            for (let id of this._graph.orderedNodes) {
                let element = this._elements.get(id);
                if (element == null) {
                    console.warn("flottplot element with id '" + id + "' does not exist");
                    // TODO let error appear further down the line, so it can
                    // be attached to an element that exists in the page?
                    continue;
                }
                try {
                    element.initialize(this._substitutionFor(element));
                } catch (error) {
                    element.failWith(error);
                    console.error(error);
                }
            }
            if (this.urlstate) {
                let hash = window.location.hash.substring(1);
                if (hash.length !== 0) {
                    this._state = JSON.parse(window.atob(hash));
                }
            }
            // This should be the last call, so end the method chain
        }

        // Notify that an element (identified by id) has changed, propagate the
        // update to all elements that depend on the notification source
        notify(source) {
            // Get update order of elements from dependency graph (this
            // includes the source element, which is updated too)
            for (let target of this._graph.updateOrderedNodesOf(source)) {
                // Send update with appropriate substitution
                let element = this._elements.get(target);
                element.update(this._substitutionFor(element));
            }
            if (this.urlstate) {
                window.location.hash = window.btoa(JSON.stringify(this._state));
            }
        }

        // Generate an appropriate substitution for the element
        _substitutionFor(element) {
            // Obtain values from all dependencies
            let values = new Map();
            for (let dep of element.dependencies) {
                let dep_element = this._elements.get(dep);
                if (dep_element == null) {
                    element.fail("could not find an element with id '" + dep + "'");
                    return;
                }
                values.set(dep, dep_element.value);
            }
            // Evaluate expressions in all patterns with values and format
            let out = new Map();
            for (let [pattern, [expression, format]] of element.patterns) {
                out.set(pattern, expression._eval(values).toString(format));
            }
            return out;
        }

        // Action invocation and keybindings

        invoke(target, action) {
            let element = this._elements.get(target);
            if (element == null) throw new ElementError(
                "element '" + target + "' does not exist"
            );
            element.invoke(action);
        }

        invokeAll(calls) {
            if (calls == null) return;
            for (let [target, action] of calls) {
                this.invoke(target, action);
            }
        }

        bindKey(key, target, action) {
            // Start intercepting keys once the first key is bound
            if (this.bindings.size === 0) {
                document.addEventListener("keydown", event => this._interceptKey(event));
            }
            this.bindings.set(key, () => this.invoke(target, action));
        }

        _interceptKey(event) {
            if (event.target !== document.body || event.ctrlKey || event.altKey) {
                return;
            }
            let callable = this.bindings.get(event.key);
            if (callable != null) {
                callable();
            }
        }

        // Load from #-part of URL if set at startup

        get _state() {
            let out = {};
            for (let [id, element] of this._elements) {
                if (id.startsWith("_")) continue;
                let state = element.state;
                if (state === undefined) continue;
                out[id] = state;
            }
            return out;
        }

        set _state(state) {
            for (let id of this._graph.orderedNodes) {
                if (!state.hasOwnProperty(id)) continue;
                let element = this._elements.get(id);
                element.state = state[id];
                element.update(this._substitutionFor(element));
                element.notify();
                // TODO pause changing of hash during update and notify?
            }
        }

        static registerTag(tag, element, recursive) {
            Flottplot.tags.set(tag.toUpperCase(), {
                "Class": element,
                "isRecursive": recursive
            });
        }

    }

    // Create element registry and initialize with core elements
    Flottplot.tags = new Map()
    Flottplot.registerTag("fp-animation", FPAnimation, false);
    Flottplot.registerTag("fp-bind", FPBind, false);
    Flottplot.registerTag("fp-button", FPButton, false);
    Flottplot.registerTag("fp-cursors", FPCursors, false);
    Flottplot.registerTag("fp-overlay", FPOverlay, false);
    Flottplot.registerTag("fp-plot", FPPlot, false);
    Flottplot.registerTag("fp-range", FPRange, false);
    Flottplot.registerTag("fp-select", FPSelect, false);
    Flottplot.registerTag("fp-stack", FPStack, true);
    Flottplot.registerTag("fp-state", FPState, false);
    Flottplot.registerTag("fp-text", FPText, true);
    Flottplot.registerTag("fp-video", FPVideo, false);

    return {
        __version__: "2.1.0",
        Flottplot: Flottplot,
        FPElement: FPElement,
        Value: Value,
        OptionsItems: OptionsItems,
        RangeItems: RangeItems,
        FlottplotError: FlottplotError,
        ElementError: ElementError,
        dom: dom,
    };

}();

