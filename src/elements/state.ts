import { Identifier, FPElement, ManagerState } from "../interface";
import { ElementMixin } from "../element";
import { Attributes } from "../dom";

 
export class FPState extends ElementMixin implements FPElement {

    private readonly useURL: boolean;
    private savedState: null | ManagerState;

    constructor(id: Identifier | undefined, useURL: boolean) {
        super(id);
        this.useURL = useURL;
        this.savedState = null;
        this.actions.add("save");
        this.actions.add("restore");
    }

    override initialize() {
        if (this.useURL === true) {
            this.flottplot.urlstate = true;
        }
    }

    get value(): undefined {
        return undefined;
    }

    get state(): undefined {
        return undefined;
    }

    save(): void {
        this.savedState = this.flottplot.state;
    }

    restore(): void {
        if (this.savedState != null) {
            this.flottplot.state = this.savedState;
        }
    }

    static from(node: HTMLElement): FPState {
        const attrs = Attributes.from(node);
        return new FPState(
            attrs.id,
            attrs.getAsBool("url", "false", true)
        );
    }

}

