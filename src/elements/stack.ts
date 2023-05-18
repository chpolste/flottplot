import { FPElement, Identifier } from "../interface";
import { ElementError } from "../errors";
import { ElementMixin } from "../element";
import { FPPlot } from "./plot";
import { newNode, Attributes } from "../dom";


export class FPStack extends ElementMixin implements FPElement {

    override node: HTMLDivElement;
    // ...
    plots: Array<HTMLImageElement>;
    overlay: HTMLDivElement;

    constructor(id?: Identifier, plots?: Iterable<HTMLImageElement>, attrs?: Attributes) {
        super(id);
        this.plots = (plots == null) ? [] : Array.from(plots);
        this.node = newNode("div", attrs, this.plots) as HTMLDivElement;
        this.node.id = this.id;
        this.node.classList.add("fp-stack");
        // The overlay stack is constructed during initialization because it
        // needs the flottplot instance for element lookup
        this.overlay = newNode("div", { "class": "fp-stack" }) as HTMLDivElement;
        // Instead of only showing an overlay for the top layer, intercept the
        // click event in the capture phase so it is never triggered on the top
        // layer and put a copy of the stack in the overlay.
        this.node.addEventListener("click", (event) => {
            if (this.flottplot.overlay != null) {
                this.flottplot.overlay.put(this.overlay);
                event.stopPropagation();
            }
        }, true);
    }

    static from(node: Element): FPStack {
        // FPStack is registered with recursive descent conversion. When this
        // converter is called, all children have already been converted.
        const plots: Array<HTMLImageElement> = [];
        for (const child of node.childNodes) {
            if (!(child instanceof HTMLElement)) continue;
            // TODO: what about canvas, svg, ...? The problem is mainly the
            // overlay, where copies of all layers are made
            if (!(child instanceof HTMLImageElement)) throw new ElementError(
                "invalid element '" + child.nodeName + "' in stack"
            );
            plots.push(child);
        }
        return new FPStack(node.id, plots, Attributes.from(node));
    }

    override initialize(): void {
        for (const plot of this.plots) {
            // Static images can remain static images, for FPPlots take the
            // overlays already maintained by each element
            let overlay = newNode("img", { "src": plot.src });
            try {
                overlay = (this.flottplot.getElement(plot.id) as FPPlot).overlay;
            } catch {}
            this.overlay.appendChild(overlay);
        }
    }

    get value(): undefined {
        return undefined;
    }

    get state(): undefined {
        return undefined;
    }

}
