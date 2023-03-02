# Flottplot Python Package

Basic Jupyter notebook integration, adds a cell magic command: `%%flottplot`. Does not work with the JupyterLab interface. Install the package from PyPI:

```bash
$ pip install flottplot
```


## Usage

Load the extension in the notebook:

```python
%load_ext flottplot
```

Make sure you get the confirmation in the cell output, otherwise the integration will not work properly. Create Flottplot cells with `%%flottplot` and add the Flottplot elements into the cell body. Note that each Flottplot cell is independent of another and elements cannot be shared between them. Images must be reachable from the root directory of the notebook server.


## Building

To build the package locally, first run `make` in the root directory of the repository. This will build the JavaScript distribution files and put all required copies into the Python module subfolder. Then install with `pip install .` from here.

