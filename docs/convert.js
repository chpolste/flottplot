"use strict";

function elemDemo(node) {
    // Create paragraph to put demo elements in and insert after code block
    const demo = document.createElement("p");
    demo.innerHTML = node.textContent;
    node.after(demo);
    // Convert elements in a new Flottplot instance (isolate demos from each
    // other, so identifiers can be reused)
    const fp = new flottplot.Flottplot();
    fp.convert(demo);
    fp.initialize();
}

function exprDemo(node) {
    const [pnode, ...codes] = node.querySelectorAll("code");
    // Extract the variable definitions
    const values = new Map();
    while (codes.length > 0) {
        const value = flottplot.Value.from(codes.pop().textContent);
        const name = codes.pop().textContent.replace(" = ", "");
        values.set(name, value);
    }
    // There is no good access to substitution other than via an elements at
    // the moment, so create a mock element
    const content = pnode.textContent;
    const mock = new flottplot.ElementMixin();
    mock.setDependenciesFrom(content);
    // Set up the substitution (as the manager would normally do)
    const subst = new Map();
    for (const [pattern, [expression, format]] of mock.patterns) {
        subst.set(pattern, expression._eval(values).toString(format));
    }
    // Add the result to the example
    const out = document.createElement("code");
    out.className = "cdemo";
    out.innerHTML = mock.substitute(content, subst);
    pnode.after(document.createTextNode(" → "), out);
}

document.addEventListener("DOMContentLoaded", () => {
    const nodes = document.querySelectorAll(".demo > .convert");
    for (const node of nodes) {
        if (node instanceof HTMLPreElement) {
            elemDemo(node);
        } else if (node instanceof HTMLUListElement) {
            for (const li of node.querySelectorAll("li")) {
                exprDemo(li);
            }
        }
    }
});
