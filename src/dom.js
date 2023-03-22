let dom = {

    newNode: function (tag, attrs, children) {
        let node = document.createElement(tag);
        dom.setAttrs(node, attrs);
        if (children != null) {
            for (let child of children) {
                node.appendChild(isString(child) ? document.createTextNode(child) : child);
            }
        }
        return node;
    },

    newButton: function (attrs, label, f) {
        if (typeof label === "string") {
            label = [label];
        }
        let node = dom.newNode("button", attrs, label);
        node.addEventListener("click", f);
        return node;
    },

    setAttrs: function (node, attrs) {
        if (node == null || attrs == null) {
            return;
        } else if (attrs instanceof dom.Attributes) {
            attrs.assignTo(node);
        } else {
            for (let name in attrs) {
                node.setAttribute(name, attrs[name]);
            }
        }
    },

    // ...
    Attributes: class {

        constructor() {
            this._attrs = new Map();
        }

        set(attr, value) {
            this._attrs.set(attr, value);
            return this;
        }

        // Non-destructive attribute access
        get(attr, fallback, asType) {
            let value = this._attrs.has(attr) ? this._attrs.get(attr) : fallback;
            switch (asType) {
                case "VALUE":
                    return Value.from(value);
                case "ACTION":
                    return (value == null) ? [] : value.split(";").map(call => call.split("."));
                case "TARGET":
                    return (value == null) ? [] : value.split(";"); // TODO trim?
            }
            return value;
        }

        // Destructive attribute access. The idea is to pop all attributes
        // special to Flottplot during element creation, then assign all
        // remaining attributes to the node of the element.
        pop(attr, fallback, asType) {
            const value = this.get(attr, fallback, asType);
            this._attrs.delete(attr);
            return value;
        }

        // Conveniently collect actions in a Map
        popActions(names) {
            const out = new Map();
            for (let name of names) {
                let calls = this.pop(name + "-action", null, "ACTION");
                if (calls != null) {
                    out.set(name, calls);
                }
            }
        }

        // Assign attributes to a node
        assignTo(node) {
            for (let [attr, value] of this._attrs) {
                node.setAttribute(attr, value);
            }
        }

        // Convenience access to ID attribute
        get id() {
            return this.get("id");
        }

        static from(node) {
            const out = new dom.Attributes();
            for (let attr of node.attributes) {
                out.set(attr.name, attr.value);
            }
            return out;
        }

    },

}

