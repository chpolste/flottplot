from pathlib import Path
from setuptools import setup, find_packages

assets = [
    "assets/flottplot-min.js",
    "assets/flottplot-scan-min.js",
    "assets/flottplot.css",
]

for asset in assets:
    assert Path("flottplot", asset).is_file(), "Run make from the root directory of the repository first to generate all assets"

setup(
    name="flottplot",
    description="Quickly arrange and navigate collections of images in the browser.",
    version="2.0.0",
    author="Christopher Polster",
    url="https://github.com/chpolste/flottplot",
    packages=find_packages(),
    package_data={
        "flottplot": assets
    }
)

