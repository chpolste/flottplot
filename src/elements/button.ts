import { Identifier, Action, FPElement } from "../interface";
import { ElementMixin } from "../element";
import { newButton, Attributes } from "../dom";
 

export class FPButton extends ElementMixin implements FPElement {

    private calls: Array<[Identifier, Action]>;

    constructor(id?: Identifier, label?: string, calls?: Iterable<[Identifier, Action]>, attrs?: Attributes) {
        super(id);
        this.node = newButton(
            attrs,
            (label == null) ? "" : label,
            () => this.invoke("trigger")
        );
        this.calls = (calls == null) ? [] : Array.from(calls);
        // Need to set dependencies so cyclic calls are detected
        for (const call of this.calls) {
            this.dependencies.add(call[0]);
        }
        // TODO allow direct keybinding with attribute
        this.actions.add("trigger"); // Execute the bound action(s)
    }

    static from(node: HTMLElement): FPButton {
        const attrs = Attributes.from(node);
        return new FPButton(
            attrs.id,
            node.innerText, // TODO be more flexible like <button>
            attrs.getAsAction("action", undefined, true),
            attrs
        );
    }

    get value(): undefined {
        return undefined;
    }

    get state(): undefined {
        return undefined;
    }

    trigger(): void {
        this.flottplot.invokeAll(this.calls);
    }

}

