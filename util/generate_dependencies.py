import argparse
from pathlib import Path
import os
import re

EXT = ".ts"
IMPORT = re.compile(r"^import .* from \"(.+)\";?$");


def get_deps(path):
    out = set()
    with open(path, "r") as f:
        for line in f:
            match = IMPORT.match(line);
            if match is not None:
                out.add(Path(match.group(1) + EXT))
    return out

def get_deps_recursive(path, checked=None):
    path = Path(path).resolve()
    if checked is None:
        checked = set()
    checked.add(path)
    for dep in get_deps(path):
        dep = (path.parent / dep).resolve()
        if dep not in checked:
            get_deps_recursive(dep, checked)
    return checked


parser = argparse.ArgumentParser()
parser.add_argument("entry")

if __name__ == "__main__":
    args = parser.parse_args()

    entry = Path(args.entry).resolve()

    deps = get_deps_recursive(entry)
    deps.remove(entry)
    deps = [os.path.relpath(dep) for dep in sorted(deps)]
    deps = " ".join(deps)

    print(f"{os.path.relpath(entry)}: {deps}")
    print(f"\ttouch $@")

