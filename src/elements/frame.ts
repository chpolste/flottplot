import { Identifier, Action, FPElement } from "../interface";
import { ElementMixin } from "../element";
import { newNode, Attributes } from "../dom";


export class FPFrame extends ElementMixin implements FPElement {

    override node: HTMLDivElement;
    private calls: Map<string, Array<[Identifier, Action]>>;

    constructor(id?: Identifier, attrs?: Attributes, children?: Iterable<Element | Text | string>, calls?: Map<string, Array<[Identifier, Action]>>) {
        super(id);
        this.node = newNode("div", attrs, children) as HTMLDivElement;
        this.node.id = this.id;
        this.node.classList.add("fp-frame");
        this.calls = (calls != null) ? calls : new Map();
        this.actions.add("fullscreen");
    }

    static from(node: HTMLElement): FPFrame {
        const attrs = Attributes.from(node);
        const calls = attrs.popActions(["enter", "exit"]);
        return new FPFrame(attrs.id, attrs, Array.from(node.children), calls);
    }

    get value(): undefined {
        return undefined;
    }

    get state(): undefined {
        return undefined;
    }

    fullscreen(): void {
        const onEnter = this.calls.get("enter");
        const onExit = this.calls.get("exit");
        this.flottplot.fullscreen.show(
            this.node,
            () => this.flottplot.invokeAll(onEnter == null ? new Map() : onEnter),
            () => this.flottplot.invokeAll(onExit == null ? new Map() : onExit),
            () => this.fail("browser refused fullscreen request, see console for more information")
        );
    }

}

