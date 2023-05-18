import { Identifier, Action, FPElement } from "../interface";
import { ElementMixin } from "../element";
import { newNode, newButton, Attributes } from "../dom";

 
export class FPAnimation extends ElementMixin implements FPElement {

    readonly targets: Array<Identifier>;
    private speed: number;
    private timeout: null | ReturnType<typeof setTimeout>;
    private toggleButton: HTMLButtonElement;

    constructor(id?: Identifier, targets?: Iterable<Identifier>, attrs?: Attributes) {
        super(id);
        this.targets = (targets == null) ? [] : Array.from(targets);
        this.dependencies = new Set(targets);
        // Internal state
        this.speed = 4;
        this.timeout = null;
        // Combined play/pause button
        this.toggleButton = newButton({}, "▶️", () => this.invoke("toggle"));
        this.node = newNode("span", attrs, [
            newButton({}, "⏪", () => this.invoke("slower")),
            newButton({}, "⏹️", () => this.invoke("reset")),
            this.toggleButton,
            newButton({}, "⏩", () => this.invoke("faster")),
        ]);
        this.node.id = this.id;
        this.actions.add("reset"); // Stop the animation and reset all targets
        this.actions.add("start"); // Start the animation if not running
        this.actions.add("stop"); // Stop the animation if not stopped
        this.actions.add("toggle"); // Start the animation if stopped or stop if running
        this.actions.add("slower"); // Reduce the speed of the animation
        this.actions.add("faster"); // Increase the speed of the animation
    }

    static from(node: Element): FPAnimation {
        const attrs = Attributes.from(node);
        return new FPAnimation(
            attrs.id,
            attrs.getAsTarget("target", undefined, true),
            attrs
        );
    }

    get value(): undefined {
        return undefined;
    }

    get state(): any { // TODO
        return {
            playing: (this.timeout != null),
            speed: this.speed
        };
    }

    set state(state: any) { // TODO
        this.speed = state.speed;
        if (state.playing) {
            this.start();
        } else {
            this.stop();
        }
    }

    invokeAll(action: Action): void {
        for (let target of this.targets) {
            this.flottplot.invoke(target, action);
        }
    }

    trigger() {
        this.invokeAll((this.speed >= 0) ? "next" : "prev");
        this.timeout = setTimeout(() => this.trigger(), 2000 / Math.abs(this.speed));
    }

    // Actions. Animations currently don't produce a value so there is no need
    // to notify the supervisor about changes. State changes (playing/speed)
    // that need to be included in the URL hash should be taken care of by the
    // update that follows changes in the animated element.

    reset() {
        this.stop();
        this.invokeAll("reset");
    }

    start() {
        if (this.timeout == null) {
            this.toggle();
        }
    }

    stop() {
        if (this.timeout != null)  {
            this.toggle();
        }
    }

    toggle() {
        if (this.timeout == null) {
            this.toggleButton.textContent = "⏸️";
            this.trigger();
        } else {
            this.toggleButton.textContent = "▶️";
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }

    slower() {
        this.speed -= (this.speed === 1) ? 2 : 1; // Skip over speed zero
    }

    faster() {
        this.speed += (this.speed === -1) ? 2 : 1; // Skip over speed zero
    }

}
