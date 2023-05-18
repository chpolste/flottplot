import { Identifier, Action, FPElement } from "../interface";
import { ElementError } from "../errors";
import { ElementMixin } from "../element";
import { Attributes } from "../dom";


export class FPBind extends ElementMixin implements FPElement {

    private key: string;
    private calls: Array<[Identifier, Action]>;

    constructor(key: string, calls: Iterable<[Identifier, Action]>) {
        super();
        this.key = key;
        this.calls = Array.from(calls);
    }

    static from(node: Element): FPBind {
        const attrs = Attributes.from(node);
        const key = attrs.get("key", undefined, true);
        if (key == null) throw new ElementError(
            "no key specified for keybinding"
        );
        return new FPBind(key, attrs.getAsAction("action"));
    }

    get value(): undefined {
        return undefined;
    }

    get state(): undefined {
        return undefined;
    }

    override initialize() {
        for (const [target, action] of this.calls) {
            this.flottplot.bindKey(this.key, target, action);
        }
    }

}

