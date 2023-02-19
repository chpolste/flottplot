const dom = flottplot.dom;
const FPElement = flottplot.FPElement;


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

