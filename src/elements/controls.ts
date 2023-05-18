import { Identifier, FPElement } from "../interface";
import { ElementMixin } from "../element";
import { ElementError } from "../errors";
import { newNode, newButton, Attributes } from "../dom";
 

export class FPControls extends ElementMixin implements FPElement {

    private target: Identifier;

    constructor(id?: Identifier, target?: Identifier, attrs?: Attributes) {
        super(id);
        this.node = newNode("span", attrs) as HTMLSpanElement;
        this.node.id = this.id;
        this.node.classList.add("fp-controls");
        if (target == null) throw new ElementError(
            `no target specified`
        );
        this.target = target;
    }

    static from(node: HTMLElement): FPControls {
        const attrs = Attributes.from(node);
        const targets = attrs.getAsTarget("target", undefined, true);
        if (targets.length > 1) {
            throw new ElementError("only one target allowed");
        }
        return new FPControls(attrs.id, targets[0], attrs);
    }

    get value(): undefined {
        return undefined;
    }

    get state(): undefined {
        return undefined;
    }

    override initialize(): void {
        const element = this.flottplot.getElement(this.target);
        for (const action of element.actions) {
            // Convert camelCase names to camel case
            const label = action.replace(/([A-Z])/g, " $1").toLowerCase();
            this.node!.appendChild(newButton({}, label, () => {
                this.flottplot.invoke(element.id, action);
            }));
        }
    }

}

