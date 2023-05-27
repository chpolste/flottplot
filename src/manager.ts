import { Identifier, Action, Calls, Substitution, FPElement, Manager, ManagerState } from "./interface";
import { ElementError, FlottplotError } from "./errors";
import { UpdateGraph } from "./graph";
import * as dom from "./dom";


// Callback for key press
export type KeyBindingCallable = () => void;

type FPElementConverter = (node: HTMLElement) => FPElement;
// Element conversion
type TagRegistration = {
    converter: FPElementConverter;
    isRecursive: boolean;
};


function containsState(obj: unknown): obj is ManagerState {
    return (typeof obj === "object" && !Array.isArray(obj) && obj !== null);
}


export class Flottplot implements Manager {

    _elements: Map<Identifier, FPElement>;
    _graph: UpdateGraph;

    overlay: Element | null; // TODO
    fullscreen: dom.Fullscreen;
    bindings: Map<string, KeyBindingCallable>;
    urlstate: boolean;

    constructor() {
        this._elements = new Map();
        this._graph = new UpdateGraph();
        // Fullscreen management
        this.fullscreen = new dom.Fullscreen();
        // Special fields used by extension elements
        this.overlay = null; // fullscreen overlay with FPOverlay (extras)
        this.bindings = new Map(); // keybindings loopkup table: key -> callable
        this.urlstate = false; // save/recover state of all elements with URL hash
    }

    getElement(target: Identifier): FPElement {
        const element = this._elements.get(target);
        if (element == null) throw new ElementError(
            "element with id '" + target + "' does not exist"
        );
        return element;
    }

    // TODO there isn't a tested procedure in place to add elements after
    // initialization. This may work fine or only partially or not at all.
    add(element: FPElement): void {
        const duplicate = this._elements.get(element.id);
        // Make sure id doesn't already exist in the collection
        if (duplicate != null) {
            element.warn("duplicate id");
            duplicate.warn("duplicate id");
        }
        // Add element to collection
        this._elements.set(element.id, element);
        // Insert element into dependency graph
        this._graph.getNode(element.id, true);
        for (const dep of element.dependencies) {
            this._graph.addEdge(element.id, dep);
        }
        // Give the element a supervisor
        element.assignTo(this);
    }

    convert(node: HTMLElement): void {
        const tag = Flottplot.tags.get(node.nodeName);
        // Recursive descent into node's children if the element is not
        // known to Flottplot (any regular element: <p>, <div>, ...) or if
        // the element is known and requires recursive descent. The
        // conversion of children is carried out before the conversion of
        // parents to make sure that parent elements can work with
        // converted children at construction time.
        if (tag == null || tag.isRecursive) {
            // Conversion changes the DOM, cannot use a live list of nodes
            const children = Array.from(node.childNodes);
            for (const child of children) {
                this.convert(child as HTMLElement);
            }
        }
        // Recursive descent is all there is to do for non-FP elements
        if (tag == null) {
            return;
        }
        // Instantiate a Flottplot element from the node
        let element;
        try {
            element = tag.converter(node);
        } catch (error) {
            // No special treatment for "regular" errors
            if (!(error instanceof FlottplotError)) {
                throw error;
            }
            // Place an error message in the document
            // TODO find a better way of styling these messages
            node.replaceWith(dom.newNode("div", {
                "style": "border:3px solid #F00;background-color:#FCC;padding:3px;",
            }, [
                dom.newNode("b", {}, [error.constructor.name, ": "]),
                error.message
            ]));
            // Additionally log the error on the console
            console.error(error);
            return;
        }
        // Remove the original element or replace with its flottplotted
        // counterpart in the DOM tree if one is specified
        if (element.node == null) {
            node.remove();
        } else {
            node.replaceWith(element.node);
        }
        // And finally add the element to the supervisor (replacing the
        // node first allows for better placement of errors)
        this.add(element);
    }

    // Element updating and update communication

    initialize(): void {
        for (const id of this._graph.orderedNodes) {
            const element = this._elements.get(id);
            if (element == null) {
                console.warn("flottplot element with id '" + id + "' does not exist");
                // TODO let error appear further down the line, so it can
                // be attached to an element that exists in the page?
                continue;
            }
            try {
                element.initialize(this._substitutionFor(element));
            } catch (error) {
                element.warn(error);
                console.error(error);
            }
        }
        if (this.urlstate) {
            const hash = window.location.hash.substring(1);
            if (hash.length !== 0) {
                this.state = JSON.parse(window.atob(hash));
            }
        }
    }

    // Notify that an element (identified by id) has changed, propagate the
    // update to all elements that depend on the notification source
    notify(source: Identifier): void {
        // Get update order of elements from dependency graph (this
        // includes the source element, which is updated too)
        for (const target of this._graph.updateOrderedNodesOf(source)) {
            // Send update with appropriate substitution. Skip null check since
            // id comes from graph.
            const element: FPElement = this._elements.get(target)!;
            element.update(this._substitutionFor(element));
        }
        if (this.urlstate) {
            window.location.hash = window.btoa(JSON.stringify(this.state));
        }
    }

    // Generate an appropriate substitution for the element
    _substitutionFor(element: FPElement): Substitution | undefined {
        // Obtain values from all dependencies
        const values = new Map();
        for (const dep of element.dependencies) {
            const dep_element = this._elements.get(dep);
            if (dep_element == null) {
                element.fail("could not find an element with id '" + dep + "'");
                return;
            }
            values.set(dep, dep_element.value);
        }
        // Evaluate expressions in all patterns with values and format
        const out: Substitution = new Map();
        for (const [pattern, [expression, format]] of element.patterns) {
            out.set(pattern, expression._eval(values).toString(format));
        }
        return out;
    }

    // Action invocation and keybindings

    invoke(target: Identifier, action: Action): void {
        const element = this._elements.get(target);
        if (element == null) throw new ElementError(
            "element '" + target + "' does not exist"
        );
        element.invoke(action);
    }

    invokeAll(calls: Calls | undefined): void {
        if (calls == null) return;
        for (const [target, action] of calls) {
            this.invoke(target, action);
        }
    }

    bindKey(key: string, target: Identifier, action: string): void {
        // Start intercepting keys once the first key is bound
        if (this.bindings.size === 0) {
            document.addEventListener("keydown", event => this._interceptKey(event));
        }
        this.bindings.set(key, () => this.invoke(target, action));
    }

    _interceptKey(event: KeyboardEvent): void {
        if (event.target !== document.body || event.ctrlKey || event.altKey) {
            return;
        }
        const callable = this.bindings.get(event.key);
        if (callable != null) {
            callable();
        }
    }

    // Load from #-part of URL if set at startup

    get state(): ManagerState {
        const out: ManagerState = {};
        for (const [id, element] of this._elements) {
            if (id.startsWith("_")) continue;
            const state = element.state;
            if (state === undefined) continue;
            out[id] = state;
        }
        return out;
    }

    set state(state: unknown) {
        if (!containsState(state)) throw new FlottplotError(
            "TODO 2389" // TODO
        );
        for (const id in state) {
            const element = this._elements.get(id);
            if (element != null) {
                element.state = state[id];
                element.update(this._substitutionFor(element));
                element.notify();
                // TODO pause changing of hash during update and notify?
            }
        }
    }

    static tags: Map<string, TagRegistration> = new Map();

    static registerTag(tag: string, converter: FPElementConverter, recursive: boolean): void {
        Flottplot.tags.set(tag.toUpperCase(), {
            "converter": converter,
            "isRecursive": recursive
        });
    }

}

