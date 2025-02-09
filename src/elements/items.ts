import { Identifier, Calls, FormatSpec, FPElement, ElementState, Collection, CollectionEvent } from "../interface";
import { ElementError } from "../errors";
import { ElementMixin } from "../element";
import { newNode, newButton, Attributes } from "../dom";
import { RangeItems, OptionsItems } from "../items";
import { Value } from "../values";


export function rangeFrom(node: HTMLElement): FPItems {
    const attrs = Attributes.from(node);
    // Construct internal RangeItems object based on specification
    const rng = new RangeItems(
        attrs.getAsValue("init", undefined, true),
        attrs.getAsValue("step", undefined, true),
        attrs.getAsValue("min", undefined, true),
        attrs.getAsValue("max", undefined, true),
        attrs.get("wrap", "none", true)
    );
    return FPItems.ofType(
        attrs.get("type", "counter", true), // default element type is counter
        attrs.id,
        rng,
        attrs.get("format", undefined, true), // formatting for in-element value display
        attrs.popActions(["min-wrap", "max-wrap"]) // actions for special event
    );
}


export function selectFrom(node: HTMLElement): FPItems {
    const attrs = Attributes.from(node);
    // Construct internal OptionsItems from child nodes based on specification
    const values: Array<Value> = [];
    for (const child of node.childNodes) {
        if (child instanceof HTMLElement) {
            const label = child.textContent;
            const value = Value.from(label == null ? "" : label);
            // Attach additional values specified by the user
            for (const attr of child.attributes) {
                (value as any)[attr.name] = Value.from(attr.value);
            }
            values.push(value);
        }
    }
    const options = new OptionsItems(
        values,
        attrs.getAsValue("init", undefined, true),
        attrs.get("wrap", "none", true)
    );
    return FPItems.ofType(
        attrs.get("type", "dropdown", true), // default type is dropdown menu
        attrs.id,
        options,
        attrs.get("format", undefined, true),
        attrs.popActions(["min-wrap", "max-wrap"]) // actions for special events
    );
}



type FPItemsState = number;

class FPItems extends ElementMixin implements FPElement {
    // Base class for control elements wrapping a Items instance. Most
    // subclasses should only need to implement constructor() and update().

    protected items: Collection;
    protected format: FormatSpec | undefined;
    protected calls: Map<string, Calls>;
    private _resetIndex: number;

    constructor(id: Identifier | undefined, items: Collection, format?: FormatSpec, calls?: Map<string, Calls>) {
        super(id);
        this.items = items;
        this.format = format;
        // Actions
        this.actions.add("reset"); // Reset to the initial value
        this.actions.add("prev"); // Go to the previous value
        this.actions.add("next"); // Go to the next value
        // Need to keep initial index for reset action
        this._resetIndex = this.items.index;
        // Actions triggered for own events (prev-wrap, next-wrap)
        this.calls = (calls != null) ? calls : new Map();
    }

    static ofType(etype: string, eid: Identifier | undefined, items: Collection, format?: FormatSpec, calls?: Map<string, Calls>): FPItems {
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

    get value(): Value {
        return this.items.value;
    }

    assertFinite(): void {
        if (!this.items.isFinite) {
            this.fail("list of items is not finite");
        }
    }

    // (De-)Serialization

    get state(): FPItemsState {
        return this.items.index;
    }

    set state(state: ElementState) {
        if (typeof state === "number") {
            this.items.index = state;
        } else {
            this.warn(`cannot recover from state ${state}`); // TODO StateError
        };
    }

    // Actions

    reset(): void {
        this.items.index = this._resetIndex;
    }

    prev(): void {
        let e = this.items.prev();
        // Min-wrap event might have associated actions
        if (e === CollectionEvent.Wrap) {
            this.flottplot.invokeAll(this.calls.get("min-wrap"));
        }
    }

    next(): void {
        let e = this.items.next();
        // Max-wrap event might have associated actions
        if (e === CollectionEvent.Wrap) {
            this.flottplot.invokeAll(this.calls.get("max-wrap"));
        }
    }

}

class FPCounter extends FPItems implements FPElement{

    override node: HTMLSpanElement;
    private box: HTMLInputElement;

    constructor(id: Identifier | undefined, items: Collection, format?: FormatSpec, calls?: Map<string, Calls>) {
        super(id, items, format, calls);
        this.box = newNode("input", { "type": "text" }) as HTMLInputElement;
        this.box.addEventListener("change", () => {
            try {
                this.items.value = Value.from(this.box.value);
            } catch (err) {
                // TODO: for now, ignore the error. Try to temporarily show an
                // error on the page in the future.
                //this.failWith(err);
                console.error(err);
            }
            this.update();
        });
        this.node = newNode("span", {
            "class": "fp-range fp-range-counter"
        }, [
            newButton({}, "<", () => this.invoke("prev")),
            this.box,
            newButton({}, ">", () => this.invoke("next")),
        ]) as HTMLSpanElement;
    }

    override update() {
        this.box.value = this.items.value.toString(this.format);
    }

}

class FPDropdown extends FPItems implements FPElement {

    override node: HTMLSelectElement;

    constructor(id: Identifier | undefined, options: Collection, format?: FormatSpec, calls?: Map<string, Calls>) {
        super(id, options, format, calls);
        this.assertFinite();
        this.node = newNode(
            "select",
            { "class": "fp-select fp-dropdown" },
            this.items.map((value, i) => {
                const label = value.toString(format);
                const index = this.items.indexMin + i;
                // Address elements with the index, so identical values can
                // appear multiple times without issues.
                return newNode("option", { "value": index }, [label]);
            })
        ) as HTMLSelectElement;
        this.node.addEventListener("change", () => {
            this.items.index = parseInt(this.node.value);
            this.notify()
        });
    }

    override update(): void {
        this.node.value = this.items.index.toString();
    }

}

class FPRadio extends FPItems implements FPElement {

    override node: HTMLSpanElement;
    private radios: Array<HTMLInputElement>;

    constructor(id: Identifier | undefined, options: Collection, format?: FormatSpec, calls?: Map<string, Calls>) {
        super(id, options, format, calls);
        this.assertFinite();
        // Need to store all radios for update
        this.radios = this.items.map((_, i) => {
            const index = this.items.indexMin + i;
            const radio = newNode("input", {
                "type": "radio",
                "name": id,
            }) as HTMLInputElement;
            radio.checked = (this.items.index === i);
            radio.addEventListener("change", () => {
                this.items.index = index;
                this.notify();
            });
            return radio;
        });
        this.node = newNode("span", {
            "class": "fp-select fp-radio"
        }, this.items.map((value, i) => {
            let radio = this.radios[i];
            let label = value.toString(format);
            return newNode("label", {}, [radio, label]);
        })) as HTMLSpanElement;
    }

    override update(): void {
        this.radios[this.items.index - this.items.indexMin].checked = true;
    }

}

class FPSlider extends FPItems implements FPElement {

    override node: HTMLInputElement;

    constructor(id: Identifier | undefined, range: Collection, format?: FormatSpec, calls?: Map<string, Calls>) {
        super(id, range, format, calls);
        this.assertFinite();
        this.node = newNode("input", {
            "type": "range",
            "min": range.indexMin,
            "max": range.indexMax,
            "step": 1,
            "class": "fp-range fp-range-slider",
        }) as HTMLInputElement;
        this.node.addEventListener("input", () => {
            this.items.index = parseInt(this.node.value);
            this.notify();
        });
    }

    override update(): void {
        this.node.value = this.items.index.toString();
    }

}

