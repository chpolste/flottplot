# flottplot

What does flottplot do?

- Arrange plots (any images, really) in the browser
- Synchronized navigation of plots

What does flottplot __not__ do?

- Create new plots
- Auto-detect files or filenames


## Quickstart

- Clone this repository:
  `git clone https://github.com/chpolste/flottplot.git`
- Set up the interface and filename patterns in `index.html`
- Optional: style the interface with `index.css`


## Element Reference

Coming soon...

- `flottplot(...elements)`

### Plots

- `plot(pattern)`

### Structure

- `heading(text)`
- `separator()`
- `hspace([width])`
- `vspace([height])`
- `container(classname, ...elements)`
- `columns(...elements)`
- `column(...elements)`
- `expandable(title, ...elements)`
- `collapsable(title, ...elements)`

### Menus

- `selector(name, options)`

### Ranges

- `rangeCounter(name, [start], [end], [step], [init])`

### Conditionals

- `checkboxes(name, options)`

### Calendars

- `calendar(name, [init], [hourstep])`

