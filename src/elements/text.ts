import { Identifier, FPElement } from "../interface";
import { ElementMixin } from "../element";
import { Attributes } from "../dom";

 
class FPText extends FPElement {

    constructor(id, text) {
        super(id);
        this.node = dom.newNode("span", { "id": id });
        this.text = text;
        this.setDependenciesFrom(text);
    }

    update(subst) {
        let text = this.substitute(this.text, subst);
        this.node.textContent = text;
    }

    static from(node) {
        return new FPText(node.id, node.textContent);
    }

}


