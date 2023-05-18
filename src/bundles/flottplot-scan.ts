import * as flottplot from "./flottplot";

const fp = new flottplot.Flottplot();

document.addEventListener("DOMContentLoaded", function () {
    fp.convert(document as any); // TODO any cast
    fp.initialize();
});

