import { Identifier, FPElement, ElementState } from "../interface";
import { ElementMixin } from "../element";
import { ValueError } from "../errors";
import { newNode, Attributes } from "../dom";
import { Value, DateValue } from "../values";
 

type FPCalendarState = string;

export class FPCalendar extends ElementMixin implements FPElement {

    override node: HTMLInputElement;
    private resetValue: string;

    constructor(id?: Identifier, init?: Value, attrs?: Attributes) {
        super(id);
        // If no initial value is given, use today's date else truncate a given
        // date. Keep initial value for reset action.
        if (init == null) {
            this.resetValue = (new Date()).toISOString().slice(0, 10);
        } else if (init instanceof DateValue) {
            this.resetValue = init.toString("%Y-%m-%d");
        } else throw new ValueError(
            "cannot initialize calendar with " + init.constructor.name
        );
        // HTML offers an input type with a nice date selector
        if (attrs == null) {
            attrs = new Attributes();
        }
        attrs.set("type", "calendar");
        this.node = newNode("input", attrs) as HTMLInputElement;
        this.node.id = this.id;
        this.node.type = "date";
        this.node.value = this.resetValue;
        this.node.addEventListener("change", () => this.notify());
        this.actions.add("reset");
        this.actions.add("prevYear");
        this.actions.add("prevMonth");
        this.actions.add("prev");
        this.actions.add("next");
        this.actions.add("nextMonth");
        this.actions.add("nextYear");
    }

    static from(node: HTMLElement) {
        const attrs = Attributes.from(node);
        return new FPCalendar(
            attrs.id,
            attrs.getAsValue("init", undefined, true),
            attrs
        );
    }

    get value(): DateValue {
        const value = Value.from(this.node.value);
        if (value instanceof DateValue) {
            return value;
        } else {
            this.fail(`unexpected issue parsing ${this.node.value} as a DateValue`); // TODO ParseError?
        }
    }

    get state(): FPCalendarState {
        return this.node.value;
    }

    set state(state: ElementState) {
        if (typeof state === "string") {
            this.node.value = state;
        } else {
            this.warn(`cannot recover from state ${state}`); // TODO StateError
        }
    }

    private get date() {
        return new Date(this.node.valueAsNumber);
    }

    // Actions

    reset(): void {
        this.node.value = this.resetValue;
    }

    prev(): void {
        this.node.valueAsNumber = this.date.setUTCDate(this.date.getUTCDate() - 1);
    }

    next(): void {
        this.node.valueAsNumber = this.date.setUTCDate(this.date.getUTCDate() + 1);
    }

    prevMonth(): void {
        this.node.valueAsNumber = this.date.setUTCMonth(this.date.getUTCMonth() - 1);
    }

    nextMonth(): void {
        this.node.valueAsNumber = this.date.setUTCMonth(this.date.getUTCMonth() + 1);
    }

    prevYear(): void {
        this.node.valueAsNumber = this.date.setUTCFullYear(this.date.getUTCFullYear() - 1);
    }

    nextYear(): void {
        this.node.valueAsNumber = this.date.setUTCFullYear(this.date.getUTCFullYear() + 1);
    }

}
