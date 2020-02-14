"use strict";

/* DOM convenience functions */

function nodeify(item) {
    return typeof item === "string" ? document.createTextNode(item) : item;
}

function setAttributes(node, attrs) {
    for (let name in attrs) node.setAttribute(name, attrs[name]);
}

function appendChildren(parent, children) {
    for (let child of children) {
        if (child != null) parent.appendChild(nodeify(child));
    }
}

function create(tag, attrs, children) {
    let node = document.createElement(tag);
    if (attrs != null) setAttributes(node, attrs);
    if (children != null) appendChildren(node, children);
    return node;
}

function button(text, click) {
    let node = create("button", {}, [text]);
    node.addEventListener("click", click);
    return node;
}


/* General helper functions */

const CHARS = "qwertzuiopasdfghjklyxcvbnmQWERTZUIOPASDFGHJKLYXCVBNM";
// Generate a sequence of randomly chosen characters of specified length
function generateName(nChars) {
    let chars = [];
    for (let i = 0; i < nChars; ++i) {
        chars.push(CHARS.charAt(Math.floor(Math.random() * CHARS.length)));
    }
    return chars.join("");
}

// Split a dependency name into the element name and the (optional) arg given
// to getValue. The arg returned as null if not specified.
function splitName(name) {
    let i = name.indexOf(":");
    return (i > 0)
         ? [name.slice(0, i), name.slice(i + 1)]
         : [name, null];
}

// Replace all occurences of needle in haystack with target
function replaceAll(haystack, needle, target) {
    return haystack.split(needle).join(target);
}

// Walk the (UI-)element tree and collect all leaves
function flatten(elements) {
    let out = [];
    for (let element of elements) {
        if (element.elements != null) {
            out.push(...flatten(element.elements));
        } else {
            out.push(element);
        }
    }
    return out;
}

// Walk the subscriber tree and call func on every node
function walkSubscribers(element, func) {
    if (element.subscribers == null) return;
    for (let subscriber of element.subscribers) {
        walkSubscribers(subscriber, func);
        func(subscriber);
    }
}

// TODO
function expandItems(items) {
    let nodes = [];
    let elements = [];
    for (let item of items) {
        nodes.push(item.node);
        if (item.elements == null) {
            elements.push(item);
        } else {
            elements.push(...item.elements);
        }
    }
    return [nodes, elements];
}



/* Main element: FlottPlot */

function flottplot(...elements) {
    return new FlottPlot(...elements);
}

function FlottPlot(...elements) {
    // Add elements to the DOM
    appendChildren(document.body, elements.map(_ => _.node));
    // Mapping of element names to elements
    this.elements = new Map();
    // Only consider leaf elements, others are for styling/organization
    for (let element of flatten(elements)) {
        // Every element has to have a name for later reference. If none was
        // given to the element assign one.
        if (element.name == null) element.name = generateName(30);
        this.elements.set(element.name, element);
        // The subscribers of an element are determined later by inverting the
        // dependency tree (given through the deps fields).
        element.deps = new Set(element.deps);
        element.subscribers = new Set();
        // Attach a notification method to all objects that will call the
        // subscribers' update method when invoked
        element.notify = this.makeNotifier(element);
    }
    // Build the subscriber tree based on the dependencies
    for (let [tgtName, tgtElement] of this.elements) {
        for (let srcName of tgtElement.deps) {
            let srcElement = this.elements.get(splitName(srcName)[0]);
            srcElement.subscribers.add(tgtElement);
        }
    }
    // Prune the subscriber tree by removing all but the longest connections
    // between elements when walking the tree. This avoids multiple updates.
    for (let element of this.elements.values()) {
        if (element.subscribers == null) continue;
        for (let target of element.subscribers) {
            walkSubscribers(target, _ => element.subscribers.delete(_));
            // TODO cycle detection
        }
    }
    // Force an update from the roots of the subscriber tree to initialize all
    // elements (in an appropriate order)
    for (let element of this.elements.values()) {
        if (element.deps.size === 0) element.notify();
    }
};

FlottPlot.prototype.makeNotifier = function (element) {
    return () => {
        for (let subscriber of element.subscribers) {
            // Build a map containing all information that the subscriber
            // depends on. This map is sent together with the update, so the
            // subscriber does not have to pull this information itself.
            let update = new Map();
            for (let dep of subscriber.deps) {
                let [name, arg] = splitName(dep);
                update.set(dep, this.elements.get(name).getValue(arg));
            }
            subscriber.update(update);
        }
    };
};



/* A plot */

function plot(pattern) {
    let node = create("img");
    // Determine dependencies by scanning for the "{...}" substitution patterns
    // in the given filenames
    let deps = [];
    let matches = pattern.matchAll(/{.+?}/g);
    for (let match of matches) {
        deps.push(match[0].slice(1, -1));
    }
    // Static images must be initialized here
    if (deps.length === 0) {
        node.setAttribute("src", pattern);
        node.setAttribute("alt", pattern);
    }
    return {
        node: node,
        deps: deps,
        update: (update) => {
            let src = pattern;
            for (let [dep, subst] of update) {
                // Hide the plot if any substitution value was null (this
                // allows checkboxes to toggle the visibility of plots)
                if (subst == null) {
                    node.style.display = "none";
                    return;
                }
                // Replace the substitution pattern with the proper value
                src = replaceAll(src, "{" + dep + "}", subst);
            }
            node.style.display = "";
            node.setAttribute("src", src);
            node.setAttribute("alt", src);
        }
    };
}



/* Styling and organization of elements */

// A horizontal line (<hr>)
function separator() {
    return { elements: [], node: create("hr") };
}

// A top-level heading (<h1>)
function heading(text) {
    return { elements: [], node: create("h1", {}, [text]) }
}

// A generic element container that can be styled as a CSS class (<div>)
function container(cls, ...items) {
    let [nodes, elements] = expandItems(items);
    return {
        elements: elements,
        node: create("div", { "class": cls }, nodes)
    };
}
// Predefined containers
let columns = (...cols) => container("columns", ...cols);
let column  = (...cols) => container("column",  ...cols);

// Vertical spacing
function vspace(height) {
    let node = create("div", { "class": "vspace" });
    if (height != null) node.style.height = height;
    return { elements: [], node: node };
}

// Horizontal spacing
function hspace(width) {
    let node = create("div", { "class": "hspace" });
    if (width != null) node.style.width = width;
    return { elements: [], node: node };
}

// An expandable container with a caption
function expandableCollapsable(title, display, items) {
    let bar = create("div", { "class": "title" }, ["⇅ ", title]);
    let [nodes, elements] = expandItems(items);
    let content = create("div", { "class": "content" }, nodes);
    content.style.display = display;
    bar.addEventListener("click", () => {
        content.style.display = content.style.display === "none" ? "" : "none";
    });
    return {
        elements: elements,
        node: create("div", { "class": "expandable" }, [bar, content])
    };
}
// Expanded and collapsed default state containers
let expandable  = (title, ...items) => expandableCollapsable(title, "none", items);
let collapsable = (title, ...items) => expandableCollapsable(title, "",     items);



/* Dropdown menus */

function Selector(name, options) {
    // ...
    if (Array.isArray(options)) {
        let opts = {};
        for (let option of options) {
            opts[option.toString()] = option;
        }
        options = opts;
    }
    // ...
    this.name = name;
    // ...
    let optnodes = [];
    if (Array.isArray(options)) {
        for (let val of options) {
            let key = val.toString();
            optnodes.push(create("option", { key: val }, [key]));
        }
    } else {
        for (let key in options) {
            optnodes.push(create("option", { value: options[key] }, [key]));
        }
    }
    this.select = create("select", {}, optnodes);
    this.select.addEventListener("change", () => this.notify());
    // ...
    this.node = create("label", {}, [name, this.select]);
}

Selector.prototype.update = function (update) {
    this.notify();
};

Selector.prototype.getValue = function () {
    return this.select.value;
};

// new-less creation of Selector
function selector(name, options) {
    return new Selector(name, options);
}



/* Number Ranges TODO */

function Range(name, start, end, step, init) {
    this.name = name;
    // ...
    this.start = start;
    this.end = end;
    // ...
    this.step = (step == null) ? 1 : step;
    // ...
    this.init = (init == null) ? start : init;
    this.value = this.init;
    // ...
    this.node = create("div", { "class": "range" });
}

Range.prototype.getValue = function (format) {
    if (format == null) return this.value.toString();
    let match;
    // Pad 0s at the start
    match = format.match(/^0>([0-9]+)$/);
    if (match != null) {
        // TODO this does not work for negative numbers
        return this.value.toString().padStart(parseInt(match[1]), "0");
    }
    throw new Error(); // TODO
}

Range.prototype.setValue = function (value) {
    if (typeof value === "string") {
        // TODO verify
        value = parseInt(value);
    }
    if (this.start != null && value < this.start) throw new Error(); // TODO
    if (this.end != null && this.end < value) throw new Error(); // TODO
    if ((value - this.init) % this.step !== 0) throw new Error(); // TODO
    // ...
    this.value = value;
    this.notify();
}

Range.prototype.next = function () {
    try { this.setValue(this.value + this.step);
    } catch {}
};

Range.prototype.prev = function () {
    try {
        this.setValue(this.value - this.step);
    } catch {}
};


function rangeCounter(name, start, end, step, init) {
    let range = new Range(name, start, end, step, init);
    // ...
    let prev = button("-", () => range.prev());
    let next = button("+", () => range.next());
    let text = create("input", {
        "type": "text",
        "size": "6",
        "value": range.getValue()
    });
    // ...
    text.addEventListener("change", () => {
        try {
            range.setValue(text.value);
        } catch {
            text.style.color = "red";
        }
    });
    // ...
    range.setValue = function (value) {
        Range.prototype.setValue.call(range, value);
        text.value = this.getValue();
        text.style.color = "";
    };
    // ...
    range.node.className = "rangeCounter";
    appendChildren(range.node, [ prev, text, next ]);
    return range;

}


/* Checkboxes: conditional displaying of plots */

function checkboxes(name, options) {
    return new Checkboxes(name, options);
}

function Checkboxes(name, options) {
    this.boxes = new Map();
    let nodes = [];
    for (let option of options) {
        let box = create("input", { "type": "checkbox" });
        box.checked = true;
        box.addEventListener("change", () => this.notify());
        nodes.push(create("label", {}, [ box, option ]));
        this.boxes.set(option, box);
    }
    this.name = name;
    this.node = create("div", { "class": "checkboxes" }, nodes);
}

Checkboxes.prototype.getValue = function (which) {
    if (which == null) {
        // TODO
    } else {
        let box = this.boxes.get(which);
        return box.checked ? which : null;
    }
}



/* Calendar with hourly resolution */

function calendar(name, init, hourstep) {
    return new Calendar(name, init, hourstep);
}

function Calendar(name, init, hourstep) {
    this.name = name
    // By default step through all hours
    this.hourstep = (hourstep == null) ? 1 : hourstep;
    // If no initial date is given, use most recent start of day
    if (init == null) {
        init = (new Date()).toISOString().slice(0, 10) + " 00Z";
    }
    this.date = this.parse(init); // TODO error handling
    // Buttons for navigating year, month, day and hours
    let yyPrev = button("-Y", () => this.prevYear());
    let yyNext = button("+Y", () => this.nextYear());
    let mmPrev = button("-M", () => this.prevMonth());
    let mmNext = button("+M", () => this.nextMonth());
    let ddPrev = button("-D", () => this.prevDay());
    let ddNext = button("+D", () => this.nextDay());
    let hhPrev = button("-H", () => this.prevHour());
    let hhNext = button("+H", () => this.nextHour());
    // Textbox which shows the current day and can be edited
    this.text = create("input", { "type": "text", "value": init });
    this.text.addEventListener("change", () => {
        try {
            this.setValue(this.parse(this.text.value));
        } catch {
            // If the value entered by the user does not match the required
            // format, color the text red and don't update further
            this.text.style.color = "red";
        }
    });
    this.node = create("div", { "class": "calendar" }, [
        yyPrev, mmPrev, ddPrev, (hourstep === 24 ? null : hhPrev),
        this.text,
        (hourstep === 24 ? null : hhNext), ddNext, mmNext, yyNext
    ]);
}

Calendar.prototype.parse = function (ymd) {
    let match = ymd.match(/^([0-9][0-9][0-9][0-9])-([01]?[0-9])-([0-3]?[0-9]) ([012]?[0-9])Z$/);
    if (match == null) throw new Error(match);
    let y = parseInt(match[1].trimStart("0"));
    let m = parseInt(match[2].trimStart("0")) - 1; // Months range from 0 to 11
    let d = parseInt(match[3].trimStart("0"));
    let h = parseInt(match[4].trimStart("0"));
    return new Date(Date.UTC(y, m, d, h))
};

Calendar.prototype.getValue = function (fmt) {
    if (fmt == null) {
        fmt = "yyyy-mm-dd hhZ";
    }
    fmt = replaceAll(fmt, "yyyy", this.date.getUTCFullYear().toString());
    fmt = replaceAll(fmt, "mm", (this.date.getUTCMonth() + 1).toString().padStart(2, "0"));
    fmt = replaceAll(fmt, "dd", this.date.getUTCDate().toString().padStart(2, "0"));
    fmt = replaceAll(fmt, "hh", this.date.getUTCHours().toString().padStart(2, "0"));
    return fmt;
};

Calendar.prototype.setValue = function (value) {
    // Update the internal value
    this.date = value;
    // Update the displayed value in the textbox
    this.text.value = this.getValue();
    this.text.style.color = "";
    // Update the subscribers
    this.notify();
};

Calendar.prototype.prevYear = function () {
    this.date.setUTCFullYear(this.date.getUTCFullYear() - 1);
    this.setValue(this.date);
};

Calendar.prototype.nextYear = function () {
    this.date.setUTCFullYear(this.date.getUTCFullYear() + 1);
    this.setValue(this.date);
};

Calendar.prototype.prevMonth = function () {
    this.date.setUTCMonth(this.date.getUTCMonth() - 1);
    this.setValue(this.date);
};

Calendar.prototype.nextMonth = function () {
    this.date.setUTCMonth(this.date.getUTCMonth() + 1);
    this.setValue(this.date);
};

Calendar.prototype.prevDay = function () {
    this.date.setUTCDate(this.date.getUTCDate() - 1);
    this.setValue(this.date);
};

Calendar.prototype.nextDay = function () {
    this.date.setUTCDate(this.date.getUTCDate() + 1);
    this.setValue(this.date);
};

Calendar.prototype.prevHour = function () {
    this.date.setUTCHours(this.date.getUTCHours() - this.hourstep);
    this.setValue(this.date);
};

Calendar.prototype.nextHour = function () {
    this.date.setUTCHours(this.date.getUTCHours() + this.hourstep);
    this.setValue(this.date);
};
