import { Identifier, FPElement } from "../interface";
import { ElementMixin } from "../element";
import { newNode, Attributes } from "../dom";

 
export class FPOverlay extends ElementMixin implements FPElement {

    override node: HTMLDivElement;
    private inner: HTMLDivElement;

    constructor(id?: Identifier, attrs?: Attributes) {
        super(id);
        this.inner = newNode("div", { "class": "fp-overlay-inner" }) as HTMLDivElement;
        // Outer container for proper centering of inner content
        this.node = newNode("div", attrs, [this.inner]) as HTMLDivElement;
        this.node.id = this.id;
        this.node.classList.add("fp-overlay");
        // Overlay is hidden by default
        this.node.style.display = "none";
        // Close overlay by clicking anywhere
        this.node.addEventListener("click", event => this.hide());
        // Actions
        this.actions.add("show");
        this.actions.add("hide");
        this.actions.add("toggle");
    }

    static from(node: HTMLElement): FPOverlay {
        return new FPOverlay(node.id, Attributes.from(node));
    }

    get value(): undefined {
        return undefined;
    }

    get state(): undefined {
        return undefined;
    }

    override initialize(): void {
        this.flottplot.overlay = this;
    }

    put(content: HTMLElement): void {
        this.inner.replaceChildren(content);
        this.show();
    }

    show(): void {
        // Only show if there is content
        if (this.inner.childNodes.length !== 0) {
            this.node.style.display = "flex";
        }
    }

    hide(): void {
        this.node.style.display = "none";
    }

    toggle(): void {
        if (this.node.style.display === "none") {
            this.show();
        } else {
            this.hide();
        }
    }

}
