from setuptools import setup, find_packages

setup(
    name="flottplot",
    description="Quickly arrange and navigate collections of images in the browser.",
    version="2.0.0",
    author="Christopher Polster",
    url="https://github.com/chpolste/flottplot",
    packages=find_packages(),
    package_data={
        "flottplot": ["flottplot-min.js"]
    }
)

