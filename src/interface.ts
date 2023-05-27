import { Value } from "./values";
import { Fullscreen } from "./dom";

// Identifiers must be usable as Map keys
export type Identifier = string;
export type Action = string;

export type Call = [Identifier, Action];
export type Calls = Iterable<Call>;

// Pattern substitution
export type Pattern = string;
export type Evaluation = Map<string, Value>;
export type Substitution = Map<Pattern, string>;


// Formatting specification for values
export type FormatSpec = string;

export interface Expression {
    toString(): string;
    _eval(substitution: Evaluation): Value;
    readonly _variables: Set<string>;
}

export interface Collection {
    value: Value;
    index: number;
    indexMin: number;
    indexMax: number;
    // ...
    readonly isFinite: boolean;
    // ...
    next(): CollectionEvent;
    prev(): CollectionEvent;
    map<U>(fn: (element: Value, index: number, array: Array<Value>) => U): Array<U>;
}
// Special events emitted during manipulation of Collections
export enum CollectionEvent {
    None = "NONE",
    Wrap = "WRAP"
}

// ...
export type ElementState = unknown;
export type ManagerState = Record<Identifier, ElementState>;

export interface Manager {
    // ...
    add(element: FPElement): void;
    convert(node: Element): void;
    initialize(): void;
    // ...
    getElement(id: Identifier): FPElement;
    notify(source: Identifier): void;
    invoke(target: Identifier, action: Action): void;
    invokeAll(calls: Calls | undefined): void;
    bindKey(key: string, target: Identifier, action: Action): void;
    // ...
    state: ManagerState;
    overlay: any; // TODO
    fullscreen: Fullscreen; // TODO
    urlstate: boolean;
}

export interface FPElement {
    // Must be available during registration
    readonly id: Identifier;
    node: HTMLElement | null;
    actions: Set<Action>;
    patterns: Map<Pattern, [Expression, FormatSpec]>;
    dependencies: Set<Identifier>;
    // Set by the manager during registration
    readonly flottplot: Manager | null;
    // How the manager interacts with the element
    assignTo(manager: Manager): void;
    value: Value | undefined;
    state: ElementState | undefined;
    initialize(substitution?: Substitution): void;
    update(substitution?: Substitution): void;
    invoke(action: Action): void; // TODO: args
    notify(): void;
    fail(message: string): void;
    failWith(error: Error): void;
}

