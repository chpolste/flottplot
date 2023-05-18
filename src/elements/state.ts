import { Identifier, FPElement } from "../interface";
import { ElementMixin } from "../element";
import { Attributes } from "../dom";

 
class FPState extends FPElement {

    constructor(id, useURL) {
        super(id);
        this.useURL = useURL;
        this.savedState = null;
        this.actions.add("save");
        this.actions.add("restore");
    }

    initialize() {
        if (this.useURL === true) {
            this.flottplot.urlstate = true;
        }
    }

    save() {
        this.savedState = this.flottplot.state;
    }

    restore() {
        if (this.savedState != null) {
            this.flottplot.state = this.savedState;
        }
    }

    static from(node) {
        const attrs = dom.Attributes.from(node);
        return new FPState(
            attrs.id,
            attrs.pop("url", false, "BOOL")
        );
    }

}

