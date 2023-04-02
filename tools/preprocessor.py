import os
import re
import sys


regex_include = re.compile(r"^\s*\/\/include\s*(.*)\s*$")

def print_include(source):
    assert os.path.isfile(source), f"not a file: {source}"
    root = os.path.dirname(source)
    with open(source, "r") as src:
        for line_src in src:
            match = regex_include.match(line_src)
            if match is not None:
                include = os.path.join(root, match.group(1))
                print_include(include)
            else:
                print(line_src, end="")


if __name__ == "__main__":
    assert len(sys.argv) == 2
    _, source = sys.argv
    print_include(source)

