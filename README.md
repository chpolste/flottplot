# Flottplot

Arrange and navigate collections of images in the browser


## About

Flottplot helps you to quickly build a user interface to navigate a collection of images named with a common pattern.
The project was conceived as tool to view plots of meteorological and climate data with the ability to put multiple images containing different variables next to each other and click through them synchronously.

Check out the [online documentation](https://chpolste.github.io/flottplot/) to get started.

Flottplot is in the public domain, so you can include it anywhere you want.


## Building

Pre-build files can be downloaded from the documentation page.
To build Flottplot locally, you need:

- Modules: `node.js` with `uglify-js`, `less`; `python3`.
- Tests: `node.js` with `mocha`; `python3`.
- Documentation: `python3` with `flottplot`, `numpy`, `matplotlib`.
- Python package: `python3` with `setuptools`.


## Releasing a new version

Creating a new release on GitHub:

1. `make clean`
2. `make test`
3. Update version numbers in `src/module.js`, `python/flottplot/setup.py` and `python/flottplot/__init__.py`.
4. Commit the version number changes and add a tag for the new version.
5. Push to GitHub and create a new release based on the tag.

Updating the Python package:

1. `make` (creates the asset files for the Python package)
2. `cd python`
3. `python -m build .`
4. `twine check dist/*`
5. `twine upload dist/*`

Updating the documentation on GitHub pages:

1. Install the new version of the Python package.
2. `make documentation`
3. `git branch -D gh-pages`
4. `git switch --orphan gh-pages`
5. `git add -f docs`
6. `git commit --author "docs <docs.build.html>" -m "Update documentation"`
7. `git push -f origin gh-pages`
8. `git switch main`

