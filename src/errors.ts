export class FlottplotError extends Error {}

export class ParseError extends FlottplotError {}
export class FormatError extends FlottplotError {}

export class ValueError extends FlottplotError {}
export class ItemsError extends FlottplotError {}

export class ElementError extends FlottplotError {}

export class UpdateGraphError extends FlottplotError {}
export class CycleError extends UpdateGraphError {}

