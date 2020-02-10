# UI Element Reference

The UI is specified with calls to a set of given JavaScript functions.
Only very little knowledge of JavaScript is necessary to set up a UI.

If you are familiar with Python, just write Python with these additional rules:

- Use `null` instead of None.
- Do not use named arguments.
- Indentation has no meaning.

More comprehensively:

- Strings can be enclosed in single or double quotes.
- Lists are enclosed in square brackets, its elements are separated by commas.
  E.g. `[ 1, 2, "three", null ]`.
- Dictionaries (=objects) are enclosed in curly braces, the associations are separated by commas, the association operator is a colon.
  E.g. `{ "foo": "bar", "bar": "baz" }`.
- Named arguments in calls are not allowed and the order of arguments must be followed exactly.
- If an argument is set to `null` or not specified, a default value is used.
- All whitespace (including linebreaks) is contracted.
  I.e., a single space is treated exactly the same as e.g. 2 linebrakes, 5 spaces and a tab are.
  Indentation has no attached semantics.
- Trailing commas in lists, etc. are ignored.


## calendar

    calendar(name, [init], [hourstep])

A UTC-based calendar with hourly resolution.
Provides an input field that shows the currently selected date and a set of buttons to go a year/day/month/hour forward or backward in time.
The user can enter a specific date into the input field in the format `yyyy-mm-dd hhZ`.
If a date in this format is specified as the `init` argument, the calendar will start at this date, otherwise at midnight UTC of the current day.
With `hourstep`, the hourly resolution can be coarsened.
E.g.: if data is only available at 0, 6, 12 and 18 UTC, set `hourstep=6`.

The format of the date can be customized during substitution with the argument.
The following substitutions are available:

- `yyyy`: 4-digit year (e.g. 2020)
- `mm`: 2-digit month (01-12)
- `dd`: 2-digit day (01-31)
- `hh`: 2-digit hour (00-23)


## checkboxes

    checkboxes(name, options)

Display a checkbox for each option in options (given by a dictionary `{ "display name": "substitution-name", ... }`).
A plot with a substitution pattern containing `{name:arg}` will only be shown if the checkbox corresponding to `arg` is checked (`arg` must refer to the substitution name).


## collapsable

    collapsable(title, ...elements)

Same as expandable but the content is shown by default.


## column

    column(...elements)

A container for all elements of a column in multi-column layout.
Its immediate parent should be a call to `columns`.


## columns

    columns(...elements)

Uses CSS's flexbox to produce columns.
Its immediate inner elements should be calls to `column`.
It may be necessary to fix the width of columns in the CSS style to avoid resizing of columns when hiding/unhiding elements of the UI interactively.


## container

    container(classname, ...elements)

A generic container with the given class name for styling with CSS.
Corresponds to a html `<div>`.


## expandable

    expandable(title, ...elements)

A container with a title bar whose content can be expanded or hidden by clicking on the title bar.
The title bar contains the text set with the `title` argument.
All following arguments are put into the expandable container.
Initially, the content is hidden.
Use `collapsable` to obtain the same element with initially expanded content.


## flottplot

    flottplot(...elements)

This call is responsible for loading, initializing and connecting the contained elements and must always be the outermost element of a flottplot UI.


## heading

    heading(text)

Insert a heading with the given text.
Corresponds to a html `<h1>`.


## hspace

    hspace([width])

A horizontal (blank) space.
If `width` is given, it must be specified as a string with an appropriate unit (px, em, pt, ...).


## plot

    plot(pattern)

Pattern: use `{name:argument}` to specify a substitution.
The name refers to the element whose value is substituted.
An optional argument can be specified after the name separated by a colon.
It is used to control the substitution.
Which arguments are valid depends on the specific UI element referenced (see their documentation).

E.g.: Consider a path specified as `../foo/{Date:yyyy-mm}/{Date:yyyy-mm-dd}-{Var}.png`. If `Date` refers to a calendar element set to `01-01-2020 06Z` and `Var` is a Dropdown with current value `temperature`, the path resolves to `../foo/2020-01/2020-01-01-temperature.png` after substitution.


## rangeCounter

    rangeCounter(name, [start], [end], [step], [init])

Integer counter with customizable range.
Provides an input field for values and forward/backward buttons.
If `start` is not given or `null`, there is no lower bound.
If `end` is not given or `null`, there is no upper bound.
If `step` is not given, it is `1`.
If `init` is not given, the counter starts with `start` or `0` if `start` is `null`.


## selector

    selector(name, options)

A dropdown menu with a fixed selection of options.
Options can be given as a list or dictionary.


## separator

    separator()

A horizontal line.
Corresponds to a html `<hr>`.


## vspace

    vspace([height])

A vertical (blank) space.
Can be used to enforce line breaks without creating a new CSS rule.
If `height` is given, it must be specified as a string with an appropriate unit (px, em, pt, ...).

