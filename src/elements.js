/* Internal elements */

class FPItems extends FPElement {
    // Base class for control elements wrapping a Items instance. Most
    // subclasses should only need to implement constructor() and update().

    constructor(id, items, format, calls) {
        super(id);
        this.items = items;
        this.format = format;
        // Actions
        this.actions.add("prev"); // Go to the previous value
        this.actions.add("next"); // Go to the next value
        this.actions.add("reset"); // Reset to the initial value
        // Need to keep initial index for reset action
        this._reset_index = this.items.index;
        // Actions triggered for own events (prev-wrap, next-wrap)
        this.calls = (calls != null) ? calls : new Map();
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
        let e = this.items.prev();
        if (e === Items.WRAP) {
            this.flottplot.invokeAll(this.calls.get("prev-wrap"));
        }
    }

    next() {
        let e = this.items.next();
        if (e === Items.WRAP) {
            this.flottplot.invokeAll(this.calls.get("next-wrap"));
        }
    }

    reset() {
        this.items.index = this._reset_index;
    }

    static ofType(etype, eid, items, format, calls) {
        // TODO tolower/toupper
        switch(etype) {
            case "counter":
                return new FPCounter(eid, items, format, calls);
            case "slider":
                return new FPSlider(eid, items, format, calls);
            case "dropdown":
                return new FPDropdown(eid, items, format, calls);
            case "radio":
                return new FPRadio(eid, items, format, calls);
        }
        throw new ElementError("unknown items type '" + etype + "'");
    }

}

class FPCounter extends FPItems {

    constructor(id, range, format, calls) {
        super(id, range, format, calls);
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

    constructor(id, options, format, calls) {
        super(id, options, format, calls);
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

    constructor(id, options, format, calls) {
        super(id, options, format, calls);
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

    constructor(id, range, format, calls) {
        super(id, range, format, calls);
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
        this.flottplot.invokeAll(this.calls);
    }

    // Constructor from HTML element

    static from(element) {
        let eid = dom.getAttr(element, "id");
        let label = Array.from(element.childNodes);
        let calls = dom.parseCalls(dom.getAttr(element, "action"));
        return new FPButton(eid, label, calls);
    }

}


function getPageRect(node) {
    let rect = node.getBoundingClientRect();
    return {
        x: window.pageXOffset + rect.left,
        y: window.pageYOffset + rect.top,
        w: rect.width,
        h: rect.height
    };
}

class FPCursors extends FPElement {

    constructor(id, cursors) {
        super(id);
        this.cursors = cursors;
        for (let cc of this.cursors) {
            if (cc["cursor"] === "hidden") continue;
            cc.node = dom.newNode("div");
            if (cc["class"] != null) cc.node.setAttribute("class", cc["class"]);
            if (cc["style"] != null) cc.node.setAttribute("style", cc["style"]);
            cc.node.style.position = "absolute";
        }
        this.node = dom.newNode("div", {
            "id": this.id,
            "class": "fp-cursorgroup"
        }, this.cursors.map(_ => _.node).filter(_ => _ != null));
    }

    initialize() {
        for (let cursor of this.cursors) {
            let origin = this.flottplot.getElement(cursor.target);
            // Show cursors when mouse enters an element of the group
            origin.node.addEventListener("mouseover", (event) => this.cursors.forEach((cc) => { 
                // No cursor on the element where the mouse currently is
                if (cc.target !== cursor.target && cc.node != null) {
                    cc.node.style.display = "block";
                }
            }));
            // Mouse movement in elements of the group -> reposition cursors
            origin.node.addEventListener("mousemove", (event) => {
                // Event target (where the mouse is) rectangle (page-relative)
                let etr = getPageRect(event.target);
                // Normalized position of cursor in origin element
                let x = (event.pageX - etr.x) / etr.w;
                let y = (event.pageY - etr.y) / etr.h;
                for (let cc of this.cursors) {
                    // Cursor target (where the cursor goes)
                    let target = this.flottplot.getElement(cc.target);
                    if (origin.id === target.id || cc.node == null) continue;
                    let style = cc.node.style;
                    let ctr = getPageRect(target.node);
                    if (cc.cursor === "hline") {
                        style.top = (ctr.y + y * ctr.h) + "px";
                        style.left = (ctr.x) + "px";
                        style.width = (ctr.w) + "px";
                    } else if (cc.cursor === "vline") {
                        style.top = (ctr.y) + "px";
                        style.left = (ctr.x + x * ctr.w) + "px";
                        style.height = (ctr.h) + "px";
                    } else if (cc.cursor === "pointer") {
                        style.top = (ctr.y + y * ctr.h) + "px";
                        style.left = (ctr.x + x * ctr.w) + "px";
                    }
                }
            });
            // Hide cursors when mouse leaves an element of the group
            origin.node.addEventListener("mouseout", (event) => this.cursors.forEach(cc => {
                if (cc.node != null) {
                    cc.node.style.display = "none";
                }
            }));
        }
    }

    static from(element) {
        let cursors = [];
        for (let node of element.childNodes) {
            // Skip anything that isn't a proper tag
            if (node.nodeType !== Node.ELEMENT_NODE) continue;
            // Default cursor type is pointer
            let cur = dom.getAttr(node, "cursor", "pointer"); // TODO check if valid
            cursors.push({
                "target": dom.getAttr(node, "target"),
                "cursor": cur,
                "style": dom.getAttr(node, "style"),
                "class": dom.getAttr(node, "class", "fp-cursor fp-"+cur),
            });
        }
        return new FPCursors(element.id, cursors);
    }

}


class FPOverlay extends FPElement {

    constructor(id) {
        super(id);
        this.inner = dom.newNode("div", { "class": "fp-overlay-inner" });
        // Outer container for proper centering of inner content
        this.node = dom.newNode("div", { "class": "fp-overlay" }, [this.inner]);
        // Overlay is hidden by default
        this.node.style.display = "none";
        // Close overlay by clicking anywhere
        this.node.addEventListener("click", event => this.hide());
        // Actions
        this.actions.add("show");
        this.actions.add("hide");
        this.actions.add("toggle");
    }

    initialize() {
        this.flottplot.overlay = this;
    }

    put(content) {
        this.inner.replaceChildren(content);
        this.show();
    }

    show() {
        // Only show if there is content
        if (this.inner.childNodes.length !== 0) {
            this.node.style.display = "flex";
        }
    }

    hide() {
        this.node.style.display = "none";
    }

    toggle() {
        if (this.node.style.display === "none") {
            this.show();
        } else {
            this.hide();
        }
    }

    static from(element) {
        return new FPOverlay(element.id);
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
        let wrap = dom.getAttr(element, "wrap");
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
        let wrap = dom.getAttr(element, "wrap");
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


class FPStack extends FPElement {

    constructor(id, plots) {
        super(id);
        this.plots = plots;
        this.node = dom.newNode("div", {
            "class": "fp-stack"
        }, this.plots)
        // The overlay stack is constructed during initialization because it
        // needs the flottplot instance for element lookup
        this.overlay = dom.newNode("div", { "class": "fp-stack" });
        // Instead of only showing an overlay for the top layer, intercept the
        // click event in the capture phase so it is never triggered on the top
        // layer and put a copy of the stack in the overlay.
        this.node.addEventListener("click", (event) => {
            if (this.flottplot.overlay != null) {
                this.flottplot.overlay.put(this.overlay);
                event.stopPropagation();
            }
        }, true);
    }

    initialize() {
        for (let plot of this.plots) {
            // Static images can remain static images, for FPPlots take the
            // overlays already maintained by each element
            let overlay = dom.newNode("img", { "src": plot.src });
            try {
                overlay = this.flottplot.getElement(plot.id).overlay;
            } catch {}
            this.overlay.appendChild(overlay);
        }
    }

    static from(element) {
        // FPStack is registered with recursive descent conversion. When this
        // converter is called, all children have already been converted.
        let plots = [];
        for (let node of element.childNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) continue;
            // TODO: what about canvas, svg, ...? The problem is mainly the
            // overlay, where copies of all layers are made
            if (node.nodeName !== "IMG") throw new flottplot.ElementError(
                "invalid element '" + node.nodeName + "' in stack"
            );
            plots.push(node);
        }
        return new FPStack(element.id, plots);
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

