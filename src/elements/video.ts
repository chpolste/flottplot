import { FPElement, Identifier } from "../interface";
import { ElementError } from "../errors";
import { ElementMixin } from "../element";
import { newNode, Attributes } from "../dom";


export class FPVideo extends ElementMixin implements FPElement {

    override node: HTMLVideoElement;

    constructor(id?: Identifier, sources?: Array<string>, attrs?: Attributes) {
        super(id);
        if (sources == null) {
            sources = [];
            // TODO: error?
        }
        this.node = newNode("video", attrs, sources.map(
            (src: string) => newNode("source", { "src": src })
        )) as HTMLVideoElement; // TODO: try and create a type safe newNode
        this.node.id = this.id;
        this.actions.add("reset");
        this.actions.add("play");
        this.actions.add("pause");
        this.actions.add("toggle");
    }

    static from(node: Element): FPVideo {
        const attrs = Attributes.from(node);
        const source = attrs.get("src", undefined, true);
        if (source == null) throw new ElementError(
            "TODO" // TODO
        );
        return new FPVideo(attrs.id, [source], attrs);
    }

    get value(): undefined {
        return undefined;
    }

    get state(): undefined {
        return undefined;
    }

    reset(): void {
        this.pause();
        this.node.currentTime = 0;
    }

    play(): void {
        this.node.play();
    }

    pause(): void {
        this.node.pause();
    }

    toggle(): void {
        if (this.node.paused) {
            this.play();
        } else {
            this.pause();
        }
    }

}

