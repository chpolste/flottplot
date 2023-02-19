/* Internal elements */

class FPItems extends FPElement {
    // Base class for control elements wrapping a Items instance. Most
    // subclasses should only need to implement constructor() and update().

    constructor(id, items, format) {
        super(id);
        this.items = items;
        this.format = format;
        // Actions
        this.actions.add("prev"); // Go to the previous value
        this.actions.add("next"); // Go to the next value
        this.actions.add("reset"); // Reset to the initial value
        // Need to keep initial index for reset action
        this._reset_index = this.items.index;
    }

    get value() {
        return this.items.value;
    }

    assertFinite() {
        if (!this.items.isFinite) {
            this.fail("list of items is not finite");
        }
    }

    // (De-)Serialization

    get state() {
        return this.items.index;
    }

    set state(state) {
        this.items.index = state;
    }

    // Actions

    prev() {
        this.items.prev();
    }

    next() {
        this.items.next();
    }

    reset() {
        this.items.index = this._reset_index;
    }

    static ofType(etype, eid, items, format) {
        // TODO tolower/toupper
        switch(etype) {
            case "counter":
                return new FPCounter(eid, items, format);
            case "slider":
                return new FPSlider(eid, items, format);
            case "dropdown":
                return new FPDropdown(eid, items, format);
            case "radio":
                return new FPRadio(eid, items, format);
        }
        throw new ElementError("unknown items type '" + etype + "'");
    }

}

class FPCounter extends FPItems {

    constructor(id, range, format) {
        super(id, range, format);
        this.box = dom.newNode("input");
        this.box.disabled = true;
        this.node = dom.newNode("span", {
            "class": "fp-range fp-range-counter"
        }, [
            dom.newButton({}, "<", () => this.invoke("prev")),
            this.box,
            dom.newButton({}, ">", () => this.invoke("next")),
        ]);
    }

    update() {
        this.box.value = this.items.value.toString(this.format);
    }

}

class FPDropdown extends FPItems {

    constructor(id, options, format) {
        super(id, options, format);
        this.assertFinite();
        this.node = dom.newNode(
            "select",
            { "class": "fp-select fp-dropdown" },
            this.items.map((value, i) => {
                let label = value.toString(format);
                let index = this.items.indexMin + i;
                // Address elements with the index, so identical values can
                // appear multiple times without issues.
                return dom.newNode("option", { "value": index }, [label]);
            })
        );
        this.node.addEventListener("change", () => {
            this.items.index = parseInt(this.node.value);
            this.notify()
        });
    }

    update() {
        this.node.value = this.items.index;
    }

}

class FPRadio extends FPItems {

    constructor(id, options, format) {
        super(id, options, format);
        this.assertFinite();
        // Need to store all radios for update
        this.radios = this.items.map((_, i) => {
            let index = this.items.indexMin + i;
            let radio = dom.newNode("input", {
                "type": "radio",
                "name": id,
            });
            radio.checked = (this.items.index === i);
            radio.addEventListener("change", () => {
                this.items.index = index;
                this.notify();
            });
            return radio;
        });
        this.node = dom.newNode("span", {
            "class": "fp-select fp-radio"
        }, this.items.map((value, i) => {
            let radio = this.radios[i];
            let label = value.toString(format);
            return dom.newNode("label", {}, [radio, label]);
        }));
    }

    update() {
        this.radios[this.items.index - this.items.indexMin].checked = true;
    }

}

class FPSlider extends FPItems {

    constructor(id, range, format) {
        super(id, range, format);
        this.assertFinite();
        this.node = dom.newNode("input", {
            "type": "range",
            "min": range.indexMin,
            "max": range.indexMax,
            "step": 1,
            "class": "fp-range fp-range-slider",
        });
        this.node.addEventListener("input", () => {
            this.items.index = parseInt(this.node.value);
            this.notify();
        });
    }

    update() {
        this.node.value = this.items.index;
    }

}


/* User-accessible elements */ 

class FPAnimation extends FPElement {

    constructor(id, targets) {
        super(id);
        this.targets = targets;
        this.dependencies = new Set(targets);
        // ...
        this.speed = 4;
        this.timeout = null;
        // ...
        this.toggleButton = dom.newButton({}, "▶️", () => this.invoke("toggle"));
        // ...
        this.node = dom.newNode("span", { "id": this.id }, [
            dom.newButton({}, "⏪", () => this.invoke("slower")),
            dom.newButton({}, "⏹️", () => this.invoke("reset")),
            this.toggleButton,
            dom.newButton({}, "⏩", () => this.invoke("faster")),
        ]);
        this.actions.add("reset"); // Stop the animation and reset all targets
        this.actions.add("start"); // Start the animation if not running
        this.actions.add("stop"); // Stop the animation if not stopped
        this.actions.add("toggle"); // Start the animation if stopped or stop if running
        this.actions.add("slower"); // Reduce the speed of the animation
        this.actions.add("faster"); // Increase the speed of the animation
    }

    invokeAll(action) {
        for (let target of this.targets) {
            this.flottplot.invoke(target, action);
        }
    }

    trigger() {
        this.invokeAll((this.speed >= 0) ? "next" : "prev");
        this.timeout = setTimeout(() => this.trigger(), 2000 / Math.abs(this.speed));
    }

    // Actions

    reset() {
        this.stop();
        this.invokeAll("reset");
    }

    start() {
        if (this.timeout == null) {
            this.toggle();
        }
    }

    stop() {
        if (this.timeout != null)  {
            this.toggle();
        }
    }

    toggle() {
        if (this.timeout == null) {
            this.toggleButton.textContent = "⏸️";
            this.trigger();
        } else {
            this.toggleButton.textContent = "▶️";
            this.timeout = clearTimeout(this.timeout);
        }
    }

    slower() {
        this.speed -= 1 + (this.speed === 1); // Skip over speed zero
    }

    faster() {
        this.speed += 1 + (this.speed === -1); // Skip over speed zero
    }

    // Constructor from HTML element

    static from(node) {
        return new FPAnimation(dom.getAttr(node, "id"), dom.parseTargets(dom.getAttr(node, "target")));
    }

}


class FPBind extends FPElement {

    constructor(key, calls) {
        super();
        this.key = key;
        this.calls = calls;
    }

    initialize() {
        for (let [target, action] of this.calls) {
            this.flottplot.bindKey(this.key, target, action);
        }
    }

    static from(element) {
        let key = dom.getAttr(element, "key");
        let calls = dom.parseCalls(dom.getAttr(element, "action"));
        return new FPBind(key, calls);
    }
}


class FPButton extends FPElement {

    constructor(id, label, calls) {
        super(id);
        this.node = dom.newButton({ "id": this.id }, label, () => this.invoke("trigger"));
        this.calls = calls;
        // Need to set dependencies so cyclic calls are detected
        this.dependencies = new Set(calls.map(_ => _[0]));
        // TODO allow direct keybinding with attribute
        this.actions.add("trigger"); // Execute the bound action(s)
    }

    // Actions

    trigger() {
        for (let [target, action] of this.calls) {
            this.flottplot.invoke(target, action);
        }
    }

    // Constructor from HTML element

    static from(element) {
        let eid = dom.getAttr(element, "id");
        let label = Array.from(element.childNodes);
        let calls = dom.parseCalls(dom.getAttr(element, "action"));
        return new FPButton(eid, label, calls);
    }

}


class FPPlot extends FPElement {

    constructor(id, src) {
        super(id);
        this.node = dom.newNode("img", { "id": this.id, "src": src, "alt": src });
        // A second img-node for the overlay
        this.overlay = dom.newNode("img");
        this.node.addEventListener("click", () => {
            if (this.flottplot.overlay != null) this.flottplot.overlay.put(this.overlay);
        });
        // ...
        if (src == null) this.fail("must provide source (src) of plot");
        this.src = src;
        this.setDependenciesFrom(src);
        // More attributes not yet processed:
        // TODO alt
        // TODO height
        // TODO width
        // TODO title
        // TODO class
        // TODO style
        // TODO click to go fullscreen
        // TODO register onerror to detect missing images (then do what?)
    }

    get value() {
        return Value.from(this.node.src);
    }

    update(substitution) {
        let src = this.substitute(this.src, substitution);
        this.node.src = src;
        this.node.alt = src; // TODO only overwrite if not specified otherwise by user
        // ...
        this.overlay.src = src;
    }

    static from(element) {
        let eid = dom.getAttr(element, "id");
        let src = dom.getAttr(element, "src");
        return new FPPlot(eid, src); // TODO
    }

}


class FPRange {

    static from(element) {
        let eid = dom.getAttr(element, "id");
        let format = dom.getAttr(element, "format");
        let init = Value.from(dom.getAttr(element, "init"), null, true);
        let step = Value.from(dom.getAttr(element, "step"), null, true);
        let min = Value.from(dom.getAttr(element, "min"), null, true);
        let max = Value.from(dom.getAttr(element, "max"), null, true);
        let wrap = dom.parseBoolMaybe(dom.getAttr(element, "wrap"));
        let range = new RangeItems(init, step, min, max, wrap);
        if (element.nodeName === "FP-RANGE") {
            let etype = dom.getAttr(element, "type", "counter");
            return FPItems.ofType(etype, eid, range, format);
        } else throw new ElementError(
            "cannot convert tag '" + element.nodeName + "' to a range"
        );
    }

}


class FPSelect {

    static from(element) {
        let init = Value.from(dom.getAttr(element, "init"), null, true);
        let wrap = dom.parseBoolMaybe(dom.getAttr(element, "wrap"));
        let format = dom.getAttr(element, "format");
        let values = [];
        for (let node of element.childNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) continue;
            let value = Value.from(node.textContent);
            // Attach additional values specified by the user
            for (let attr of node.attributes) {
                value[attr.name] = Value.from(attr.value);
            }
            values.push(value);
        }
        let options = new OptionsItems(values, init, wrap);
        let etype = dom.getAttr(element, "type", "dropdown");
        return FPItems.ofType(etype, element.id, options, format);
    }

}


class FPState extends FPElement {

    initialize() {
        this.flottplot.urlstate = true;
    }

    static from(element) {
        return new FPState(element.id);
    }

}


class FPText extends FPElement {

    constructor(id, text) {
        super(id);
        this.node = dom.newNode("span", { "id": id });
        this.text = text;
        this.setDependenciesFrom(text);
    }

    update(subst) {
        let text = this.substitute(this.text, subst);
        this.node.textContent = text;
    }

    static from(element) {
        return new FPText(element.id, element.textContent);
    }

}

