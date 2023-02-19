let dom = {

    "newNode": function (tag, attrs, children) {
        let node = document.createElement(tag);
        if (attrs != null) {
            for (let name in attrs) {
                node.setAttribute(name, attrs[name]);
            }
        }
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

}

