# Flottplot Python Package

```bash
pip install flottplot
```

Due to current development activities the PyPI version is not always up-to-date.


## Features

### Command line tool

```python
python3 -m flottplot ...
```

Subcommands:

- `init`: create new Flottplot pages.
- `replace`: update Flottplot files.

See the build-in help (`-h`) for more information.


### Jupyter notebook integration

Load the extension in the notebook:

```python
%load_ext flottplot
```

Now you can create Flottplot cells with `%%flottplot` and add Flottplot elements into the cell body.
Note that each Flottplot cell is independent of another and elements cannot be shared between them.

Images must be reachable from the root directory of the notebook server.
Because JupyterLab does not serve images directly via URL, the extension does not work properly with the lab interface.


## Building

To build the package locally, first run `make` in the root directory of the repository.
This will build all required JavaScript distribution files and put copies of all required assets into the Python module subfolder.
Then install with `pip install .` from here.

