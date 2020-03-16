"use strict";


// Global error handler
window.onerror = function (msg) {
    document.body.innerHTML = msg;
    document.body.style.border = "5px solid red";
    document.body.style.padding = "10px";
    document.body.style.margin = "10px";
}


let $ = {

    nodeify: function (item) {
        return typeof item === "string" ? document.createTextNode(item) : item;
    },

    setAttributes: function (node, attrs) {
        for (let name in attrs) node.setAttribute(name, attrs[name]);
    },

    appendChildren: function (parent, children) {
        for (let child of children) {
            if (child != null) parent.appendChild($.nodeify(child));
        }
    },

    create: function (tag, attrs, children) {
        let node = document.createElement(tag);
        if (attrs != null) $.setAttributes(node, attrs);
        if (children != null) $.appendChildren(node, children);
        return node;
    },

    button: function (text, click) {
        let node = $.create("button", {}, [text]);
        node.addEventListener("click", click);
        return node;
    }

};



function _isValidName(name) {
    return /^[A-z][A-z\-_0-9]*$/.test(name);
}

function _setName(obj, name) {
    if (name == null) throw new Error(
        "Undefined name for " + obj.constructor.name + "."
    );
    if (!_isValidName(name)) throw new Error(
        "Invalid name '" + name + "' for " + obj.constructor.name
        + ". Names must begin with A-z and only contain A-z, 0-9, - and _."
    );
    obj.name = name;
}

const _CHARS = "qwertzuiopasdfghjklyxcvbnmQWERTZUIOPASDFGHJKLYXCVBNM";
// Generate a sequence of randomly chosen characters of specified length
function _generateName(nChars) {
    let chars = [];
    for (let i = 0; i < nChars; ++i) {
        chars.push(_CHARS.charAt(Math.floor(Math.random() * _CHARS.length)));
    }
    return chars.join("");
}

function _throwWithContext(context, errmsg) {
    if (context != null) {
        errmsg = "In " + context.constructor.name + " '" + context.name + "': " + errmsg;
    }
    throw new Error(errmsg);
}

// Apply the substitutions in the table to the source string
function _replaceAll(source, substitutions) {
    let out = [];
    let i = 0;
    while (i < source.length) {
        let match = false;
        for (let pattern in substitutions) {
            if (source.slice(i, i + pattern.length) === pattern) {
                out.push(substitutions[pattern]);
                i += pattern.length;
                match = true;
                break;
            }
        }
        if (!match) {
            out.push(source.charAt(i));
            i += 1;
        }
    }
    return out.join("");
}

// Flatten the nested item collections ( one level deep is sufficient as
// recursion is resolved elsewhere)
function _expandItems(items) {
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

function _optionsMap(options) {
    let opts = new Map();
    // Genrate key: key pairs from arrays
    if (Array.isArray(options)) {
        for (let option of options) {
            opts.set(option.toString(), option);
        }
    // Interpret objects as dictionaries
    } else {
        for (let key in options) {
            if (options.hasOwnProperty(key)) {
                opts.set(key, options[key]);
            }
        }
    }
    return opts;
}

function _fullViewOverlay(content) {
    let fullView = $.create("div", { "class": "fullview" }, [
        $.create("div", {}, [ content ])
    ]);
    // Close the full view by pressing the Esc-key or clicking anywhere
    let closeEsc = (e) => {
        if (e.key == "Escape") close();
    };
    let close = () => {
        document.removeEventListener("keydown", closeEsc);
        document.body.removeChild(fullView)
    };
    fullView.addEventListener("click", close);
    document.addEventListener("keydown", closeEsc);
    document.body.appendChild(fullView);
}



function flottplot(...elements) {
    return new FlottPlot(...elements);
}

class FlottPlot {

    constructor(...elements) {
        // Add elements to the DOM
        $.appendChildren(document.body, elements.map(_ => _.node));
        // Global keybindings
        this.bindings = new Map();
        document.addEventListener("keydown", (e) => {
            let callback = this.bindings.get(e.key);
            if (callback != null && e.target === document.body && !e.ctrlKey && !e.altKey) {
                // Fetch element from table for user-defined keybindings,
                // global keybindings may provide elements directly
                let element = (typeof callback.element === "string")
                            ? this.elements.get(callback.element)
                            : callback.element;
                element[callback.action]();
                e.preventDefault();
            }
        });
        // Show Keybindings when ? is pressed
        this.bindings.set("?", new Keybinding("?", this, "showKeybindings"));
        // Mapping of element names to elements
        this.elements = new Map();
        // Only consider leaf elements, others are for styling/organization
        for (let element of FlottPlot._collectElements(elements)) {
            // Attach callbacks for keybindings
            if (element instanceof Keybinding) {
                this.bindings.set(element.key, element);
                continue;
            }
            // Every element has to have a name for later reference. If none was
            // given to the element assign one.
            if (element.name == null) element.name = _generateName(30);
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
                let srcElement = this.elements.get(srcName.split(":")[0]);
                srcElement.subscribers.add(tgtElement);
            }
        }
        // Prune the subscriber tree by removing all but the longest connections
        // between elements when walking the tree. This avoids multiple updates.
        for (let element of this.elements.values()) {
            if (element.subscribers == null) continue;
            for (let target of element.subscribers) {
                FlottPlot._walkSubscribers(target, _ => element.subscribers.delete(_));
                // TODO cycle detection
            }
        }
        // Force an update from the roots of the subscriber tree to initialize all
        // elements (in an appropriate order)
        for (let element of this.elements.values()) {
            if (element.deps.size === 0) element.notify();
        }
    }

    makeNotifier(element) {
        return () => {
            for (let subscriber of element.subscribers) {
                // Build a map containing all information that the subscriber
                // depends on. This map is sent together with the update, so the
                // subscriber does not have to pull this information itself.
                let update = new Map();
                for (let dep of subscriber.deps) {
                    let [name, ...args] = dep.split(":");
                    update.set(dep, this.elements.get(name).getValue(...args));
                }
                subscriber.update(update);
            }
        };
    }

    showKeybindings() {
        let trs = [];
        for (let [key, binding] of this.bindings) {
            trs.push($.create("tr", {}, [
                $.create("th", {}, [ key ]),
                $.create("td", {}, [
                    (typeof binding.element === "string" ? binding.element + " → " : ""),
                    binding.action
                ])
            ]));
        }
        _fullViewOverlay($.create("table", { "class": "keys" }, trs));
    }

    // Walk the subscriber tree and call func on every node
    static _walkSubscribers(element, func) {
        if (element.subscribers == null) return;
        for (let subscriber of element.subscribers) {
            FlottPlot._walkSubscribers(subscriber, func);
            func(subscriber);
        }
    }

    // Walk the (UI-)element tree and collect all leaves
    static _collectElements(elements) {
        let out = [];
        for (let element of elements) {
            if (element.elements != null) {
                out.push(...FlottPlot._collectElements(element.elements));
            } else {
                out.push(element);
            }
        }
        return out;
    }

}



function bind(key, element, action) {
    return new Keybinding(key, element, action);
}

class Keybinding {

    constructor(key, element, action) {
        this.key = key;
        this.element = element;
        this.action = action;
    }

}



function plot(pattern) {
    return new Plot(pattern);
}

class Plot {

    constructor(pattern) {
        this.pattern = pattern;
        this.node = $.create("img", { "class": "plot" });
        // Show overlay with full image on click
        this._fullViewNode = $.create("img");
        this.node.addEventListener("click", () => _fullViewOverlay(this._fullViewNode));
        // Determine dependencies by scanning for the "{...}" substitution patterns
        // in the given filenames
        this.deps = [];
        for (let match of pattern.matchAll(/{.+?}/g)) {
            this.deps.push(match[0].slice(1, -1));
        }
        // Static images must be initialized here
        if (this.deps.length === 0) this.setSource(pattern);
    }


    update(update) {
        let substitutions = {};
        for (let [dep, subst] of update) {
            // Hide the plot if any substitution value was null (this
            // allows checkboxes to toggle the visibility of plots)
            if (subst == null) {
                this.node.style.display = "none";
                return;
            }
            substitutions["{" + dep + "}"] = subst;
        }
        this.node.style.display = "";
        this.setSource(_replaceAll(this.pattern, substitutions));
    }

    setSource(src) {
        this.node.src = src;
        this.node.alt = src;
        this._fullViewNode.src = src;
        this._fullViewNode.alt = src;
    }

}



function separator() {
    return { node: $.create("hr") };
}

function heading(text) {
    return { node: $.create("h1", {}, [text]) };
}

function paragraph(text) {
    return { node: $.create("p", {}, [text]) };
}

function text(text, cls) {
    let attrs = (cls == null) ? {} : { "class": cls };
    return { node: $.create("span", attrs, [text]) };
}

// A generic element container that can be styled as a CSS class (<div>)
function container(cls, ...items) {
    let [nodes, elements] = _expandItems(items);
    return {
        elements: elements,
        node: $.create("div", { "class": cls }, nodes)
    };
}
let columns = (...cols) => container("columns", ...cols);
let column  = (...cols) => container("column",  ...cols);

function vspace(height) {
    let node = $.create("div", { "class": "vspace" });
    if (height != null) node.style.height = height;
    return { node: node };
}

function hspace(width) {
    let node = $.create("div", { "class": "hspace" });
    if (width != null) node.style.width = width;
    return { node: node };
}

function expandableCollapsable(title, display, items) {
    let bar = $.create("div", { "class": "title" }, ["⇅ ", title]);
    let [nodes, elements] = _expandItems(items);
    let content = $.create("div", { "class": "content" }, nodes);
    content.style.display = display;
    bar.addEventListener("click", () => {
        content.style.display = content.style.display === "none" ? "" : "none";
    });
    return {
        elements: elements,
        node: $.create("div", { "class": "expandable" }, [bar, content])
    };
}
// Expanded and collapsed default state containers
let expandable  = (title, ...items) => expandableCollapsable(title, "none", items);
let collapsable = (title, ...items) => expandableCollapsable(title, "",     items);



function selector(name, options, init) {
    return new Selector(name, options, init);
}


class Selector {

    constructor(name, options, init) {
        _setName(this, name);
        this.values = [];
        let optnodes = [];
        for (let [key, value] of _optionsMap(options)) {
            this.values.push(value);
            let optnode = $.create("option", { "value": value }, [key]);
            optnode.selected = (key === init);
            optnodes.push(optnode);
        }
        this.node = $.create("select", {}, optnodes);
        this.node.addEventListener("change", () => this.notify());
    }

    getValue() {
        return this.node.value;
    }

    setValue(value) {
        if (this.values.indexOf(value) < 0) throw new Error(); // TODO
        this.node.value = value;
        this.notify();
    }

    next() {
        let idx = this.values.indexOf(this.node.value);
        this.setValue(this.values[(idx + 1) % this.values.length]);
    }

    prev() {
        let idx = this.values.indexOf(this.node.value);
        this.setValue(this.values[(idx - 1 + this.values.length) % this.values.length]);
    }

}



function rangeCounter(name, start, end, step, init) {
    return new RangeCounter(name, start, end, step, init);
}

class Range {

    constructor(name, start, end, step, init) {
        _setName(this, name);
        // Assert that given values are numeric
        this._throw = errmsg => _throwWithContext(this, errmsg);
        if (start != null && !Number.isInteger(start)) this._throw("invalid value for start: " + start);
        if (end   != null && !Number.isInteger(end  )) this._throw("invalid value for end: " + end);
        if (step  != null && !Number.isInteger(step )) this._throw("invalid value for step: " + step);
        if (init  != null && !Number.isInteger(init )) this._throw("invalid value for init: " + init);
        // Use + to enforce number type
        this.start = start;
        this.end   = end;
        this.step  = (step == null) ? 1 : step;
        this.init  = init;
        // If init is not given, use start or end.
        if (init == null && end   != null) this.init = end;
        if (init == null && start != null) this.init = start;
        if (!this._isValid(this.init)) this._throw(
            "unable to initialize range. Make sure at least one of start, end, init is given, "
            + "start <= init <= end valid and init is a reachable value in the range."
        );
        // Internal value (required to keep state even if user enters invalid
        // value in to text field)
        this.value = this.init;
        this.node = $.create("div", { "class": "range" });
    }

    _isValid(n) {
        return Number.isInteger(n)
            && (this.start == null || n >= this.start)
            && (this.end   == null || n <= this.end)
            && ((n - this.init) % this.step === 0);
    }

    getValue(format) {
        return Range.format(this.value, format, this);
    }

    setValue(value) {
        if (!this._isValid(value)) this._throw();
        this.value = value;
        this.notify();
    }

    next() {
        try { this.setValue(this.value + this.step);
        } catch {}
    }

    prev() {
        try {
            this.setValue(this.value - this.step);
        } catch {}
    }

    static format(value, format, errobj) {
        // Default formatting is just the JavaScript formatting
        if (format == null) return value.toString();
        // Zero-padded (left) format
        let match = format.match(/^(\+)?(0>[0-9]+)?$/);
        console.log(match);
        if (match == null) _throwWithContext(
            errobj, "requested number format '" + format + "' not possible"
        );
        let sign = (value < 0 || match[1] === "+") ? (value < 0 ? "-" : "+") : "";
        let width = (match[2] != null) ? +match[2].slice(2) : 0;
        return sign + Math.abs(value).toString().padStart(width, "0");
    }

}

class RangeCounter extends Range {

    constructor(name, start, end, step, init) {
        super(name, start, end, step, init);
        let prev = $.button("-", () => this.prev());
        let next = $.button("+", () => this.next());
        this.text = $.create("input", { "type": "text", "size": "6", "value": this.getValue() });
        this.text.addEventListener("change", () => this.handleChange());
        this.node.className = "rangeCounter";
        $.appendChildren(this.node, [ prev, this.text, next ]);
    }

    setValue(value) {
        super.setValue(+value); // force conversion to number with unary +
        this.text.value = this.getValue();
        this.text.style.color = "";
    }

    handleChange() {
        try {
            this.setValue(this.text.value);
        } catch {
            this.text.style.color = "red";
        }
    }

}


function checkboxes(name, options, notChecked) {
    return new Checkboxes(name, options, notChecked);
}

class Checkboxes {

    constructor(name, options, notChecked) {
        _setName(this, name);
        notChecked = new Set(notChecked);
        this.boxes = new Map();
        let nodes = [];
        for (let [key, value] of _optionsMap(options)) {
            let box = $.create("input", { "type": "checkbox" });
            box.checked = !notChecked.has(value);
            box.addEventListener("change", () => this.notify());
            nodes.push($.create("label", {}, [ box, key ]));
            this.boxes.set(value, box);
        }
        this.node = $.create("div", { "class": "checkboxes" }, nodes);
    }

    getValue(which) {
        if (which == null) throw new Error(
            "In checkboxes '" + this.name + "': retrieval of value without arg filter not implemented"
        );
        let box = this.boxes.get(which);
        return box.checked ? which : null;
    }

}



function calendar(name, init, hourstep) {
    return new Calendar(name, init, hourstep);
}

class Calendar {

    constructor(name, init, hourstep) {
        _setName(this, name);
        // By default step through all hours
        this.hourstep = (hourstep == null) ? 1 : hourstep;
        // If no initial date is given, use most recent start of day
        if (init == null) {
            init = (new Date()).toISOString().slice(0, 10) + " 00Z";
        }
        this.date = Calendar.parse(init, this);
        // Buttons for navigating year, month, day and hours
        let yyPrev = $.button("-Y", () => this.prevYear());
        let yyNext = $.button("+Y", () => this.nextYear());
        let mmPrev = $.button("-M", () => this.prevMonth());
        let mmNext = $.button("+M", () => this.nextMonth());
        let ddPrev = $.button("-D", () => this.prevDay());
        let ddNext = $.button("+D", () => this.nextDay());
        let hhPrev = $.button("-H", () => this.prevHour());
        let hhNext = $.button("+H", () => this.nextHour());
        // Textbox which shows the current day and can be edited
        this.text = $.create("input", { "type": "text", "value": init });
        this.text.addEventListener("change", () => {
            try {
                this.setValue(Calendar.parse(this.text.value, this));
            } catch {
                // If the value entered by the user does not match the required
                // format, color the text red and don't update further
                this.text.style.color = "red";
            }
        });
        this.node = $.create("div", { "class": "calendar" }, [
            yyPrev, mmPrev, ddPrev, (hourstep === 24 ? null : hhPrev),
            this.text,
            (hourstep === 24 ? null : hhNext), ddNext, mmNext, yyNext
        ]);
    }

    getValue(format, offset) {
        let date = new Date(this.date.getTime());
        return Calendar.format(date, format, offset, this);
    }

    setValue(value) {
        // Update the internal value
        this.date = value;
        // Update the displayed value in the textbox
        this.text.value = this.getValue(null, null);
        this.text.style.color = "";
        // Update the subscribers
        this.notify();
    }

    prevYear() {
        this.date.setUTCFullYear(this.date.getUTCFullYear() - 1);
        this.setValue(this.date);
    }

    nextYear() {
        this.date.setUTCFullYear(this.date.getUTCFullYear() + 1);
        this.setValue(this.date);
    }

    prevMonth() {
        this.date.setUTCMonth(this.date.getUTCMonth() - 1);
        this.setValue(this.date);
    }

    nextMonth() {
        this.date.setUTCMonth(this.date.getUTCMonth() + 1);
        this.setValue(this.date);
    }

    prevDay() {
        this.date.setUTCDate(this.date.getUTCDate() - 1);
        this.setValue(this.date);
    }

    nextDay() {
        this.date.setUTCDate(this.date.getUTCDate() + 1);
        this.setValue(this.date);
    }

    prevHour() {
        this.date.setUTCHours(this.date.getUTCHours() - this.hourstep);
        this.setValue(this.date);
    }

    nextHour() {
        this.date.setUTCHours(this.date.getUTCHours() + this.hourstep);
        this.setValue(this.date);
    }

    static parse(value, errobj) {
        let match = value.match(/^([0-9][0-9][0-9][0-9])-([01]?[0-9])-([0-3]?[0-9]) ([012]?[0-9])Z$/);
        if (match == null) _throwWithContext(
            errobj, "Unable to parse date value '" + value + "'"
        );
        let y = parseInt(match[1]);
        let m = parseInt(match[2]) - 1; // Months range from 0 to 11
        let d = parseInt(match[3]);
        let h = parseInt(match[4]);
        return new Date(Date.UTC(y, m, d, h))
    }

    static format(date, format, offset, errobj) {
        if (format == null || format === "") {
            format = "yyyy-mm-dd hhZ";
        }
        if (offset != null) {
            let offsetMatch = offset.match(/^([+-])([0-9]+)([ymdh])$/);
            if (offsetMatch == null) _throwWithContext(
                errobj, "Invalid offset specification '" + offset + "'"
            );
            let by = parseInt(offsetMatch[2]);
            let applyOffset = offsetMatch[1] === "+" ? (x => x + by) : (x => x - by);
            let unit = offsetMatch[3];
            if (unit === "y") {
                date.setUTCFullYear(applyOffset(date.getUTCFullYear()));
            } else if (unit === "m") {
                date.setUTCMonth(applyOffset(date.getUTCMonth()));
            } else if (unit === "d") {
                date.setUTCDate(applyOffset(date.getUTCDate()));
            } else if (unit === "h") {
                date.setUTCHours(applyOffset(date.getUTCHours()));
            }
        }
        return _replaceAll(format, {
            "yyyy": date.getUTCFullYear().toString(),
            "mm": (date.getUTCMonth() + 1).toString().padStart(2, "0"),
            "dd": date.getUTCDate().toString().padStart(2, "0"),
            "hh": date.getUTCHours().toString().padStart(2, "0")
        });
    }

}


function forecast(name, init, step) {
    return new Forecast(name, init, step);
}

class Forecast {

    constructor(name, init, step) {
        _setName(this, name);
        // ...
        if (init == null) throw new Error(
            // TODO
        );
        this.init = init;
        this.deps = [init];
        // ...
        this.step = (step == null) ? 1 : step;
        // ...
        this.leadMode = true; // Must start in lead mode for proper initialization
        this.lead = 0;
        this.valid = null;
        // ...
        this.leadNode = $.create("span", { "class": "lead mode" });
        this.validNode = $.create("span", { "class": "valid" });
        // ...
        let prev = $.button("-", () => this.prev());
        let zero = $.button("0", () => this.zero());
        let next = $.button("+", () => this.next());
        let toggle = $.button("toggle mode", () => this.toggle());
        this.node = $.create("div", { "class": "forecast" }, [
            prev, zero, next, this.leadNode, "|", this.validNode, toggle
        ]);
    }

    getValue(which, format) {
        console.log(which, format);
        if (which === "lead") {
            return Range.format(this.lead, format, this);
        } else if (which === "valid") {
            return Calendar.format(this.valid, format, null, this);
        } else throw new Error(
            "TODO"
        );
    }

    update(update) {
        let date = Calendar.parse(update.get(this.init), this);
        if (this.leadMode) {
            date.setUTCHours(date.getUTCHours() + this.lead);
            this.valid = date;
        } else {
            this.lead = Math.round((this.valid - date) / (60 * 60 * 1000));
        }
        this.updateDisplay();
    }

    updateDisplay() {
        this.leadNode.innerHTML = Range.format(this.lead, "+", this)
        this.validNode.innerHTML = Calendar.format(this.valid, null, null, this);
        this.notify();
    }

    zero() {
        this.valid.setUTCHours(this.valid.getUTCHours() - this.lead);
        this.lead = 0;
        this.updateDisplay();
    }

    prev() {
        this.lead -= this.step;
        this.valid.setUTCHours(this.valid.getUTCHours() - this.step);
        this.updateDisplay();
    }

    next() {
        this.lead += this.step;
        this.valid.setUTCHours(this.valid.getUTCHours() + this.step);
        this.updateDisplay();
    }

    toggle() {
        let hasMode = this.leadMode ? this.leadNode : this.validNode;
        let newMode = this.leadMode ? this.validNode : this.leadNode;
        hasMode.classList.remove("mode");
        newMode.classList.add("mode");
        this.leadMode = !this.leadMode;
    }

}

