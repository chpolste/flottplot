import { Flottplot } from "./flottplot";


const fp = new Flottplot();

document.addEventListener("DOMContentLoaded", function () {
    fp.convert(document as any); // TODO any cast
    fp.initialize();
});


export * from "./flottplot";

