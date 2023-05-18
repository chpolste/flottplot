import { Identifier, FPElement } from "../interface";
import { ElementMixin } from "../element";
import { newNode, getPageRect, Attributes } from "../dom";
import { ElementError } from "../errors";


type CursorSpec = {
    target: Identifier,
    cursor: string,
    attrs: Attributes,
    node?: HTMLDivElement
}


export class FPCursors extends ElementMixin implements FPElement {

    private readonly cursors: Array<CursorSpec>;

    constructor(id?: Identifier, cursors?: Iterable<CursorSpec>, attrs?: Attributes) {
        super(id);
        this.cursors = (cursors == null) ? [] : Array.from(cursors);
        for (const cc of this.cursors) {
            if (cc.cursor === "hidden") continue;
            cc.node = newNode("div", cc.attrs) as HTMLDivElement;
            cc.node!.classList.add("fp-cursor", "fp-"+cc.cursor);
            cc.node!.style.position = "absolute";
        }
        this.node = newNode("div", attrs, this.cursors.map(_ => _.node!)) as HTMLDivElement;
        this.node.id = this.id;
        this.node.classList.add("fp-cursors");
    }

    static from(node: HTMLElement): FPCursors {
        const cursors: Array<CursorSpec> = [];
        for (const child of node.childNodes) {
            // Skip anything that isn't a proper tag
            if (!(child instanceof HTMLElement)) {
                continue;
            }
            // Default cursor type is pointer
            const attrs = Attributes.from(child);
            const target = attrs.get("target", undefined, true);
            if (target == null) throw new ElementError(
                `no target specified for cursor ${child.outerHTML}`
            );
            cursors.push({
                "target": target,
                "cursor": attrs.get("cursor", "pointer", true),
                "attrs": attrs
            });
        }
        return new FPCursors(node.id, cursors, Attributes.from(node));
    }

    get value(): undefined {
        return undefined;
    }

    get state(): undefined {
        return undefined;
    }

    override initialize() {
        for (const cursor of this.cursors) {
            const origin = this.flottplot.getElement(cursor.target);
            if (origin.node == null) throw new ElementError(
                `cursor target ${cursor.target} has no node in the document`
            );
            // Show cursors when mouse enters an element of the group
            origin.node.addEventListener("mouseover", (event: MouseEvent) => this.cursors.forEach((cc) => {
                // No cursor on the element where the mouse currently is
                if (cc.target !== cursor.target && cc.node != null) {
                    cc.node.style.display = "block";
                }
            }));
            // Mouse movement in elements of the group -> reposition cursors
            origin.node.addEventListener("mousemove", (event: MouseEvent): void => {
                // Event target (where the mouse is) rectangle (page-relative)
                const etr = getPageRect(event.target);
                // Normalized position of cursor in origin element
                const x = (event.pageX - etr.x) / etr.w;
                const y = (event.pageY - etr.y) / etr.h;
                for (let cc of this.cursors) {
                    // Cursor target (where the cursor goes)
                    const target = this.flottplot.getElement(cc.target);
                    if (origin.id === target.id || cc.node == null) continue;
                    const style = cc.node.style;
                    const ctr = getPageRect(target.node);
                    if (cc.cursor === "hline") {
                        style.top = (ctr.y + y * ctr.h) + "px";
                        style.left = (ctr.x) + "px";
                        style.width = (ctr.w) + "px";
                    } else if (cc.cursor === "vline") {
                        style.top = (ctr.y) + "px";
                        style.left = (ctr.x + x * ctr.w) + "px";
                        style.height = (ctr.h) + "px";
                    } else if (cc.cursor === "pointer") {
                        style.top = (ctr.y + y * ctr.h) + "px";
                        style.left = (ctr.x + x * ctr.w) + "px";
                    }
                }
            });
            // Hide cursors when mouse leaves an element of the group
            origin.node.addEventListener("mouseout", (event) => this.cursors.forEach(cc => {
                if (cc.node != null) {
                    cc.node.style.display = "none";
                }
            }));
        }
    }

}

