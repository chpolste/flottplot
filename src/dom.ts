import { Identifier, Call } from "./interface";
import { FlottplotError, ParseError } from "./errors";
import { Value } from "./values";


interface AttrDict {
    [key: string]: string | number | undefined;
}

type ChildLike = Element | Text | string;

type PageRect = {
    x: number,
    y: number,
    w: number,
    h: number
};


export function getPageRect(node: unknown): PageRect {
    if (node instanceof HTMLElement) {
        const rect = node.getBoundingClientRect();
        return {
            x: window.pageXOffset + rect.left,
            y: window.pageYOffset + rect.top,
            w: rect.width,
            h: rect.height
        };
    }
    throw new FlottplotError(
        `cannot compute page rect of ${node}`
    );
}

export function newNode(tag: string, attrs?: AttrDict | Attributes, children?: Iterable<ChildLike>): HTMLElement {
    const node = document.createElement(tag);
    setAttrs(node, attrs);
    if (children != null) {
        for (let child of children) {
            if (typeof child == "string") {
                child = document.createTextNode(child);
            }
            node.appendChild(child);
        }
    }
    return node;
}

export function newButton(attrs: AttrDict | Attributes | undefined, label: Iterable<ChildLike>, f: () => void): HTMLButtonElement {
    if (typeof label === "string") {
        label = [label];
    }
    const node = newNode("button", attrs, label) as HTMLButtonElement;
    node.addEventListener("click", f);
    return node;
}

export function setAttrs(node: HTMLElement, attrs?: AttrDict | Attributes): void {
    if (node == null || attrs == null) {
        return;
    } else if (attrs instanceof Attributes) {
        attrs.assignTo(node);
    } else {
        for (const key in attrs) {
            const value = attrs[key];
            if (value != null) {
                node.setAttribute(key, value.toString());
            }
        }
    }
}


export class Attributes {

    _attrs: Map<string, string>;

    constructor() {
        this._attrs = new Map();
    }

    set(attr: string, value: string) {
        this._attrs.set(attr, value);
        return this;
    }

    get(attr: string, fallback: string, pop?: boolean): string;
    get(attr: string, fallback?: string, pop?: boolean): string | undefined;
    get(attr: string, fallback?: string, pop?: boolean) {
        const value = this._attrs.get(attr);
        if (value != null) {
            if (pop != null && pop) {
                this._attrs.delete(attr);
            }
            return value;
        } else {
            return fallback;
        }
    }

    getAsBool(attr: string, fallback?: string, pop?: boolean): boolean {
        const value = this.get(attr, fallback, pop);
        return (value != null) && (value.trim() === "true");
    }

    getAsValue(attr: string, fallback?: string, pop?: boolean): Value | undefined {
        return Value.from(this.get(attr, fallback, pop));
    }

    getAsTarget(attr: string, fallback?: string, pop?: boolean): Array<Identifier> {
        const value = this.get(attr, fallback, pop);
        const targets = [];
        if (value != null) {
            for (const target of value.split(";")) {
                targets.push(target.trim() as Identifier);
            }
        }
        return targets;
    }

    getAsAction(attr: string, fallback?: string, pop?: boolean): Array<Call> {
        const value = this.get(attr, fallback, pop);
        const actions = [];
        if (value != null) {
            for (const call of value.split(";")) {
                const parts = call.split(".");
                if (parts.length > 2) throw new ParseError(
                    `invalid action '${call}'`
                );
                actions.push([parts[0], parts[1]] as Call);
            }
        }
        return actions;
    }

    // Conveniently collect actions in a Map TODO
    popActions(names: Iterable<string>): Map<string, Array<Call>> {
        const out = new Map();
        for (const name of names) {
            out.set(name, this.getAsAction(name + "-action", undefined, true));
        }
        return out;
    }

    // Assign attributes to a node
    assignTo(node: Element) {
        for (const [attr, value] of this._attrs) {
            node.setAttribute(attr, value);
        }
    }

    // Convenience access to ID attribute
    get id(): Identifier | undefined {
        return this.get("id");
    }

    static from(node: Element): Attributes {
        const out = new Attributes();
        for (const attr of node.attributes) {
            out.set(attr.name, attr.value);
        }
        return out;
    }

}

export class Fullscreen {

    exitCalls: Array<null | (() => void)>; // TODO sort the null stuff out
    
    constructor() {
        this.exitCalls = [];
        document.addEventListener("fullscreenchange", () => {
            if (document.fullscreenElement == null && this.exitCalls.length > 0) {
                const call = this.exitCalls.pop();
                if (call != null) {
                    call();
                }
            }
        });
    }

    show(node: Element, onenter: null | (() => void), onexit: null | (() => void), onfail: null | (() => void)) {
        node.requestFullscreen().then(() => {
            this.exitCalls.push(onexit);
            if (onenter != null) {
                onenter();
            }
        }).catch(() => {
            if (onfail != null) {
                onfail();
            }
        });
    }

}

