import { Identifier, Substitution, FPElement } from "../interface";
import { ElementMixin } from "../element";
import { newNode } from "../dom";

 
export class FPText extends ElementMixin implements FPElement {

    override node: HTMLSpanElement;
    private readonly text: string;

    constructor(id: Identifier | undefined, text: string) {
        super(id);
        this.node = newNode("span", { "id": id });
        this.text = text;
        this.setDependenciesFrom(text);
    }

    override update(subst: Substitution): void {
        this.node.textContent = this.substitute(this.text, subst);
    }

    get value(): undefined {
        return undefined;
    }

    get state(): undefined {
        return undefined;
    }

    static from(node: HTMLElement): FPText {
        const text = node.textContent;
        return new FPText(node.id, (text == null) ? "" : text);
    }

}


