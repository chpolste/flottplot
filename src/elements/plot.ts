import { FPElement, Identifier, Substitution } from "../interface";
import { ElementError } from "../errors";
import { ElementMixin } from "../element";
import { TextValue } from "../values";
import { newNode, Attributes } from "../dom";


export class FPPlot extends ElementMixin implements FPElement {

    override node: HTMLImageElement;
    // ...
    overlay: HTMLImageElement;
    src: string;

    constructor(id: Identifier | undefined, src: string, attrs?: Attributes) {
        super(id);
        this.node = newNode("img", attrs) as HTMLImageElement;
        this.node.id = this.id;
        this.node.src = src;
        // A second img-node for the overlay
        this.overlay = newNode("img") as HTMLImageElement;
        this.node.addEventListener("click", () => {
            if (this.flottplot.overlay != null) this.flottplot.overlay.put(this.overlay);
        });
        this.src = src;
        this.setDependenciesFrom(src);
        // TODO register onerror to detect missing images (then do what?)
        this.actions.add("fullscreen");
    }

    static from(node: Element): FPPlot {
        const attrs = Attributes.from(node);
        const src = attrs.get("src", undefined, true);
        if (src == null) throw new ElementError(
            "must provide source (src) of plot" // TODO
        );
        return new FPPlot(attrs.id, src, attrs);
    }

    get value(): TextValue {
        return new TextValue(this.node.src);
    }

    get state(): undefined {
        return undefined;
    }

    fullscreen(): void {
        this.flottplot.fullscreen.show(this.node, null, null, () => {
            this.fail("browser refused fullscreen request, see console for more information");
        });
    }

    override update(substitution: Substitution): void {
        let src = this.substitute(this.src, substitution);
        this.node.src = src;
        this.overlay.src = src;
    }

}

