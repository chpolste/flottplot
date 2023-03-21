let dom = {

    "newNode": function (tag, attrs, children) {
        let node = document.createElement(tag);
        dom.setAttrs(node, attrs);
        if (children != null) {
            for (let child of children) {
                node.appendChild(isString(child) ? document.createTextNode(child) : child);
            }
        }
        return node;
    },

    "newButton": function (attrs, label, f) {
        if (typeof label === "string") {
            label = [label];
        }
        let node = dom.newNode("button", attrs, label);
        node.addEventListener("click", f);
        return node;
    },

    "getAttr": function (node, name, fallback) {
        let value = node.getAttribute(name);
        if (value == null && fallback != null) {
            return fallback;
        }
        return value;
    },

    "parseBoolMaybe": function (x) {
        return x == null ? null : x.toLowerCase() === "true";
    },

    "parseTargets": function (targets) {
        return (targets == null) ? [] : targets.split(";"); // TODO trim?
    },

    "parseCalls": function (calls) {
        return (calls == null) ? [] : calls.split(";").map(call => call.split("."));
    },

    "getCalls": function (node, names) {
        return new Map(names.map(name => [
            name,
            dom.parseCalls(dom.getAttr(node, name+"-action"))
        ]));
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

        // TODO: value conversion, targets, calls, maybe
        // Non-destructive attribute access
        get(attr) {
            return this._attrs.get(attr);
        }

        // Destructive attribute access
        pop(attr) {
            let value = this.get(attr);
            this._attrs.delete(attr);
            return value;
        }

        assignTo(node) {
            for (let [attr, value] of this._attrs) {
                node.setAttribute(attr, value);
            }
            this._attrs.clear();
        }

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

