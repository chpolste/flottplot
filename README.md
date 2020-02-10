# flottplot

Quickly build a UI to navigate a set of plots named with a common pattern.

What does flottplot do?

- Arrange plots (any images, really) in the browser
- Synchronized navigation of plots

What does flottplot __not__ do?

- Create new plots
- Auto-detect files or filenames

:warning: flottplot is under active development. It is in a usable state but not very polished yet.


## Quickstart

Clone the repository:

    $ git clone https://github.com/chpolste/flottplot.git

Set up the interface and filename patterns in `index.html` and optionally style the interface with `index.css`.


## Available UI Elements

[`calendar`](README.UI.md#calendar),
[`checkboxes`](README.UI.md#checkboxes),
[`container`](README.UI.md#container),
[`collapsable`](README.UI.md#collapsable),
[`column`](README.UI.md#column),
[`columns`](README.UI.md#columns),
[`expandable`](README.UI.md#expandable),
[`flottplot`](README.UI.md#flottplot),
[`heading`](README.UI.md#heading),
[`hspace`](README.UI.md#hspace),
[`plot`](README.UI.md#plot),
[`rangeCounter`](README.UI.md#rangecounter),
[`selector`](README.UI.md#selector),
[`separator`](README.UI.md#separator),
[`vspace`](README.UI.md#vspace).

More information is available in the [README.UI](README.UI.md) file.


## Example

```javascript
flottplot(
    heading("An Example UI"),
    selector("Var", { "Temperature": "temp", "Pressure": "pres" }),
    hspace(),
    calendar("Date", "2020-01-01 00Z", 6),
    columns(
        column(
            plot("../experiment-A/{Date:yyyy}/{Var}/{Date:yyyy-mm-ddThh}-{Var}.png")
        ),
        column(
            plot("../experiment-B/{Date:yyyy}/{Var}/{Date:yyyy-mm-ddThh}-{Var}.png")
        )
    )
);
```

The above defines a dropdown menu and a calendar above two columns with a plot each for the following assumed file/folder structure:

    .
    +- flottplot
       +- index.html
       +- index.css
       +- flottplot.js
    +- experiment-A
       +- 2019
          +- temp
             +- 2019-01-01T00-temp.png
             +- 2019-01-01T06-temp.png
             +- 2019-01-01T12-temp.png
             +- 2019-01-01T18-temp.png
             +- 2019-01-02T00-temp.png
          +- pres
             +- 2019-01-01T00-pres.png
             +- 2019-01-01T06-pres.png
             +- 2019-01-01T12-pres.png
             +- 2019-01-01T18-pres.png
             +- 2019-01-02T00-pres.png
       +- 2020
          +- ...
    +- experiment-B
       +- 2019
          +- ...
       +- 2020
          +- ...

Each column shows a plot from a different experiment.
The date and variable selection updates both plots synchronously.


## Updating

To integrate upstream changes into an existing flottplot setup, commit all local changes to the `index.html` and `index.css` files and merge the upstream changes into the local version.


## License

A license will be added once a first release is declared.

