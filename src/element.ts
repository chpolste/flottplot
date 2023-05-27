import { Identifier, Action, Expression, Manager, Pattern, FormatSpec, Substitution } from "./interface";
import { ElementError } from "./errors";
import { Expr } from "./expression";
import { Value } from "./values";
import { newNode } from "./dom";


function generateID(): string {
    const pool = "qwertzuiopasdfghjklyxcvbnmQWERTZUIOPASDFGHJKLYXCVBNM";
    const chars: Array<string> = [];
    for (let i = 0; i < 30; ++i) {
        chars.push(pool.charAt(Math.floor(Math.random() * pool.length)));
    }
    return "_" + chars.join("");
}


export class ElementMixin {

    readonly id: Identifier;
    node: HTMLElement | null;
    patterns: Map<Pattern, [Expression, FormatSpec]>;
    dependencies: Set<string>;
    actions: Set<Action>;
    private _manager: Manager | null;

    _errorBox: null | HTMLElement; // TODO

    constructor(id?: Identifier) {
        // Generate an ID if none was given
        if (id == null || id == "") {
            this.id = generateID();
        // Validate a given ID
        } else if (/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) {
            this.id = id;
        } else throw new ElementError(
            "invalid id '" + id + "' for " + this.constructor.name
            + " (names must begin with A-z and only contain A-z, 0-9 and _)"
        );
        this.node = null;
        // Element is initially not connected to a flottplot supervisor. This
        // attribute is set by the supervising flottplot instance when the
        // element is added to it.
        this._manager = null;
        // Pattern lookup and dependencies required for value updates. These
        // should be set once before the element is connected to its supervisor
        // (best during initialization) with the setDependenciesFrom method.
        this.patterns = new Map();
        this.dependencies = new Set();
        // Actions of the element exposed to the user
        this.actions = new Set();
        // Tooltip-like error box for inline error message reporting
        this._errorBox = null;
    }

    get flottplot(): Manager {
        if (this._manager != null) {
            return this._manager;
        }
        throw new ElementError("cannot access flotplott manager, element has not been initialized");
    }

    assignTo(manager: Manager): void {
        this._manager = manager;
    }

    warn(message: string | Error): ElementError {
        if (message instanceof Error) {
            message = `${message.constructor.name}: ${message.message}`;
        }
        const error = new ElementError(`in ${this.constructor.name} '${this.id}': ${message}`);
        if (this.node != null) {
            if (this._errorBox == null) {
                this._errorBox = newNode("div", {
                    "class": "fp-error",
                    "style": "position:absolute;top:-3px;left:100%;min-width:250px;max-width:500px;border:3px solid #F00;background-color:#FCC;padding:3px;"
                });
                let wrapperDisplay = window.getComputedStyle(this.node).display;
                let wrapper = newNode("div", {
                    "style": "position:relative;padding:0;margin:0;display:"+wrapperDisplay+";border:3px solid #F00;"
                });
                this.node.replaceWith(wrapper);
                wrapper.appendChild(this._errorBox);
                wrapper.appendChild(this.node);
            }
            // Add the current error
            this._errorBox.appendChild(newNode("div", {}, [
                newNode("b", {}, [error.constructor.name, ": "]), error.message
            ]));
            // Show only the 5 most recent errors
            while (this._errorBox.children.length > 5) {
                // Condition ensures there is at least one child, skip null check
                this._errorBox.firstChild!.remove();
            }
        }
        return error;
    }

    fail(message: string | Error): never {
        throw this.warn(message);
    }

    // Invoke an action of the element, update the element and notify all
    // dependent element
    invoke(action: Action, ...args: Array<unknown>): void {
        if (!this.actions.has(action)) {
            this.fail("action '" + action + "' does not exist");
        } else {
            const method = (this as any)[action];
            if (typeof method === "function") {
                method.call(this, ...args);
                this.notify();
            } else {
                this.fail(`action '${action}' not implemented`);
            }
        }
    }

    // Notify the supervisor that this element has changed its value
    notify(): void {
        if (this.flottplot != null) {
            this.flottplot.notify(this.id);
        }
    }

    // Some elements might want to do some special stuff on initialization
    // (e.g. interact with the flottplot supervisor), they can override this
    // method to do that. Otherwise just perform a regular update.
    initialize(substitution: Substitution): void {
        this.update(substitution);
    }

    // Deal with changes in the dependencies of this element. This should be
    // overriden by all subclasses. The supervisor will call this function
    // with one argument containing an evaluated substitution as taylored to
    // the requirements laid out by the patterns attribute. There is no need to
    // notify the supervisor again within the update.
    update(substitution: Substitution): void {}

    // Extract substitution patterns from the given template string and insert
    // them into the patterns and dependencies attributes of this element so
    // the supervisor can provide appropriate substitutions in updates
    setDependenciesFrom(...templates: Array<Pattern>): void {
        this.patterns = new Map();
        this.dependencies = new Set();
        for (const template of templates) {
            const reg = /{.+?}/g;
            while (true) {
                const match = reg.exec(template);
                if (match == null) {
                    break
                }
                const pattern = match[0];
                const [patExpr, ...formatParts] = pattern.slice(1, -1).split(":");
                const format = (formatParts.length > 0) ? formatParts.join(":") : undefined;
                const expression = Expr.parse(patExpr);
                // format will have undefined assigned if not given
                this.patterns.set(pattern, [expression, format]);
                for (let name of expression._variables) {
                    this.dependencies.add(name);
                }
            }
        }
    }

    // Apply the substitution to the template string
    substitute(template: Pattern, substitution: Substitution): string {
        const out: Array<Value | string> = [];
        let i = 0;
        while (i < template.length) {
            let match = false;
            for (const [pattern, value] of substitution) {
                if (template.slice(i, i + pattern.length) === pattern) {
                    out.push(value);
                    i += pattern.length;
                    match = true;
                    break
                }
            }
            if (!match) {
                out.push(template.charAt(i));
                i += 1;
            }
        }
        return out.join("");
    }

}

