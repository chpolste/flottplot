# UI Element Reference

The UI is specified with calls to a set of given JavaScript functions.
Only very little knowledge of JavaScript is necessary to set up a UI.

If you are familiar with Python, just write Python with these additional rules:

- Use `null` instead of `None`.
- Do not use named arguments.
- Indentation has no meaning.

More comprehensively:

- Strings can be enclosed in single or double quotes.
- Lists are enclosed in square brackets, its elements are separated by commas.
  E.g. `[ 1, 2, "three", null ]`.
- Dictionaries (=objects) are enclosed in curly braces, the associations are separated by commas, the association operator is a colon.
  E.g. `{ "foo": "bar", "bar": "baz" }`.
- Named arguments in calls are not allowed and the order of arguments must be followed exactly.
  Use a `null` value to skip an argument if you want to set a subsequent one.
- If an argument is set to `null` or not specified, a default value is used.
- All whitespace (including linebreaks) is contracted.
  I.e., a single space is treated exactly the same as e.g. 2 linebrakes, 5 spaces and a tab are.
  Indentation has no attached semantics.
- Trailing commas in lists, etc. are ignored.

Optional arguments in functions calles are denoted in this reference by enclosing them with angular brackets.


## bind

    bind(key, element, action)

Bind key to trigger the action on an element.
A list of available key names is available [here](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values).
If not otherwise bound, pressing `?` brings up a summary of all registered keybindings in the flottplot instance.

Known issue: actions will not trigger if the focus is on an element of the UI (e.g. if a dropdown menu is selected).


## calendar

    calendar(name, [init], [hourstep])

A UTC-based calendar with hourly resolution.
Provides an input field that shows the currently selected date and a set of buttons to go a year/day/month/hour forward or backward in time.
The user can enter a specific date into the input field in the format `yyyy-mm-dd hhZ`.
If a date in this format is specified as the `init` argument, the calendar starts at this date, otherwise at midnight (UTC) of the current day.
With `hourstep`, the hourly resolution can be coarsened.
E.g.: if data is only available at 0, 6, 12 and 18 UTC, set `hourstep` to `6`.

Substitution references to a calendar element take up to two (optional) arguments.
With the first argument, the formating of the value can be specified.
The following substitutions are available:

- `yyyy`: 4-digit year (e.g. 2020)
- `mm`: 2-digit month (01-12)
- `dd`: 2-digit day (01-31)
- `hh`: 2-digit hour (00-23)

The second argument can be used to apply an offset to the date of the calendar.
This offset is specified in the form of a `+` or `-` sign which specifies the direction of the offset, a number that specifies the amount of offset and a unit which can be one of `y` (years), `m` (months), `d` (days) or `h` (hours).

E.g., consider a calendar element named `name` whose current value is `2015-06-24 07Z`. A substitution pattern `{name:dd.mm.yyyy:+2d}` would result in the value `26.06.2015`.

The following keybinding actions are available: `prevYear`, `nextYear`, `prevMonth`, `nextMonth`, `prevDay`, `nextDay`, `prevHour`, `nextHour`.


## checkboxes

    checkboxes(name, options, [notChecked])

Display a checkbox for each option in options (given as a dictionary `{ "display name": "substitution value", ... }` or a list `["box1", "box2", ...]`).
A list of substitution values can be given as the `notChecked` argument, these checkboxes will not be activated when the flottplot instance is started.

A plot with the substitution pattern containing `{name:arg}` will only be shown if the checkbox corresponding to `arg` is checked (`arg` must refer to the substitution value).


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
Corresponds to an HTML `<div>`.


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


## forecast

    forecast(name, initname, [step])

Navigate forecast lead times (in hours).
`initname` must refer to an element that yields a date (e.g. a [calendar](#calendar)).
This date is used as the initial time of the forecast.
It is then possible to navigate the forecast in steps of `step` hours with the provided buttons.
By default a step of 1 is used.
The element can be toggled between two modes:

- Fixed lead mode (default): when the initial time changes, the valid time is adjusted so that the lead time is unchanged.
- Fixed valid mode: when the initial time changes, the lead time is adjusted so that the valid time is unchanged.

In substitutions, both lead time and valid time are accessible: `{name:lead:format}` yields the lead time with optional formatting specified as for [rangeCounter](#rangeCounter) values, `{name:valid:format}` yields the valid time with optional formatting specified as for [calendar](#calendar) values.

The following keybinding actions are available: `prev`, `next`, `zero`, `toggle`.


## heading

    heading(text)

Insert a heading with the given text.
Corresponds to an HTML `<h1>`.


## hspace

    hspace([width])

A horizontal (blank) space.
If `width` is given, it must be specified as a string with an appropriate unit (px, em, pt, ...).


## paragraph

    paragraph(text)

A paragraph of text.
Corresponds to an HTML `<p>`.


## plot

    plot(pattern)

Pattern: use `{name}` to specify a substitution.
The name refers to the element whose value is substituted.
Optional arguments can be specified after the name separated by a colon, e.g. `{name:arg}` or `{name:arg1:arg2}` to customize the value used in the substitution.
Which arguments are valid depends on the specific UI element referenced (see their documentation).

E.g.: Consider a path specified as `../foo/{Date:yyyy-mm}/{Date:yyyy-mm-dd}-{Var}.png`. If `Date` refers to a calendar element set to `01-01-2020 06Z` and `Var` is a Dropdown with current value `temperature`, the path resolves to `../foo/2020-01/2020-01-01-temperature.png` after substitution.

Clicking on a plot reveals an overlay that shows the plot at its native resolution or scaled to the maximum possible size that fits on the screen if the native size is larger than the available screen space.


## rangeCounter

    rangeCounter(name, [start], [end], [step], [init])

Integer counter with customizable range.
Provides an input field for values and forward/backward buttons.
If `start` is not given or `null`, there is no lower bound.
If `end` is not given or `null`, there is no upper bound.
If `step` is not given, it is `1`.
If `init` is not given, the counter starts with `start` or `0` if `start` is `null`.

In substitutions, the value can be requested with a sign and/or zero-padding.
E.g. `{name:+0>3}` yields a number that is prefixed by a plus or minus sign and is padded to a width of 3.

The following keybinding actions are available: `prev`, `next`.


## selector

    selector(name, options, [init])

A dropdown menu with a fixed selection of options.
Options can be given as a dictionary `{ "display name": "substitution value", ... }` or a list `["option1", "option2", ...]`.
The option selected initially can be specified with `init` (the substitution value must be given, not the display value).

The following keybinding actions are available: `prev`, `next`.


## separator

    separator()

A horizontal line.
Corresponds to an HTML `<hr>`.


## text

    text(text, [cls])

Inline text.
Corresponds to an HTML `<span>`.
Can be given a class name for styling with CSS with the optional `cls` argument.


## vspace

    vspace([height])

A vertical (blank) space.
Can be used to enforce line breaks without creating a new CSS rule.
If `height` is given, it must be specified as a string with an appropriate unit (px, em, pt, ...).

