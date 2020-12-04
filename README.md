# flottplot

Quickly build a UI to navigate a set of plots named with a common pattern.

What does flottplot do?

- Arrange plots (any images, really) in the browser
- Synchronized navigation of plots

What does flottplot __not__ do?

- Create new plots
- Auto-detect files or filenames

Be aware that flottplot is under active development.
It is in a usable state but not particularly polished or feature-rich yet.
The type of plots targeted in development are mainly ones of meteorological reanalysis and forecast data which is reflected in the selection of available UI elements.


## Quickstart

Clone the repository:

    $ git clone https://github.com/chpolste/flottplot.git

Set up the interface and filename patterns in `index.html` and optionally style the interface with `index.css`.
The UI can be accessed by opening `index.html` with a web browser.


## Available UI Elements

[`bind`](README.UI.md#bind),
[`button`](README.UI.md#button),
[`calendar`](README.UI.md#calendar),
[`checkboxes`](README.UI.md#checkboxes),
[`container`](README.UI.md#container),
[`collapsable`](README.UI.md#collapsable),
[`column`](README.UI.md#column),
[`columns`](README.UI.md#columns),
[`expandable`](README.UI.md#expandable),
[`flottplot`](README.UI.md#flottplot),
[`forecast`](README.UI.md#forecast),
[`heading`](README.UI.md#heading),
[`hspace`](README.UI.md#hspace),
[`paragraph`](README.UI.md#paragraph),
[`plot`](README.UI.md#plot),
[`rangeCounter`](README.UI.md#rangecounter),
[`selector`](README.UI.md#selector),
[`separator`](README.UI.md#separator),
[`text`](README.UI.md#text),
[`vspace`](README.UI.md#vspace).

More information is available in the [README.UI](README.UI.md) file.


## Example

```javascript
flottplot(
    heading("An Example UI"),
    selector("Var", { "Temperature": "temp", "Pressure": "pres" }),
    hspace(),
    calendar("Date", "2020-01-01 00Z", 12),
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
             +- 2019-01-01T12-temp.png
             +- 2019-01-02T00-temp.png
             +- ...
          +- pres
             +- 2019-01-01T00-pres.png
             +- 2019-01-01T12-pres.png
             +- 2019-01-02T00-pres.png
             +- ...
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

If you have previously cloned this repository, use these commands to update:

    $ git add -u
    $ git stash
    $ git pull
    $ git stash pop

Alternatively commit all local changes to the `index.html` and `index.css` files and merge any changes into the local version by pulling.
If you have modified the `index.css`, it is possible for [merge conflicts](https://www.atlassian.com/git/tutorials/using-branches/merge-conflicts) to occur which have to be resolved.


## Accessing flottplot via SSH

If your plots are saved on a remote machine that you only have SSH access to, you can start a simple web server there and use port forwarding to view the images in your local browser.

Most machines should have Python 3 installed, which brings with it the [`http.simple`](https://docs.python.org/3/library/http.server.html) server.
By default `http.simple` serves content on port 8000.
When connecting with SSH, specify that port 8000 on the local machine should be forwarded to port 8000 on the remote machine:

    $ ssh -L localhost:8000:localhost:8000 user@remote

If you are using a config file for your SSH connections, you can permanently specify the `-L` option with

    LocalForward localhost:8000:localhost:8000

there.
When the connection is established, start the webserver with

    $ python3 -m http.server

It will tell you which port it is serving on.
This port must match the one just specified in the SSH command.
As long as the SSH connection is open, you can now type

    http://localhost:8000

into your (local) browser's address bar to access the webserver started on the remote machine.
The server will show you the content of the directory that it was started in and if there is a file named `index.html` it will serve this file immediately (you can also access other files by navigating with the URL in the browser).
The server only has access to files inside that directory and its subdirectories, so if you want to access something that is saved in directory `~/aaa`, you should start the server in either `~` or `~/aaa`, but not `~/bbb`.
This not just applies to your flottplot page but also all the plots that you include in your flottplot.
Make sure you are using relative paths to reference files and use softlinks to access remote locations you don't have a relative path to.

The server can be stopped with `Ctrl-C` when you are done.


## License

A license will be added once a first release is declared.

