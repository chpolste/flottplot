import sys
import itertools
import json

assert sys.version_info.major == 3

values = ["a", "ab", "3", 3, -3, 105, -105]
fills  = ["", "x", " "]
aligns = ["", "<", ">", "^"]
zerops = ["0", ""]
widths = ["4", "5", "6", "7", "10"]
kinds  = ["", "s", "d"]

testcases = []
for (value, *spec) in itertools.product(values, fills, aligns, zerops, widths, kinds):
    # Changed in version 3.10: Preceding the width field by '0' no longer
    # affects the default alignment for strings. Flottplot implements the 3.10
    # behaviour, so omit affected test cases for Python versions prior to 3.10.
    if sys.version_info.minor <= 9 and isinstance(value, str) and spec[2] == "0":
        continue
    # ...
    spec = "".join(spec)
    try:
        result = ("{:" + spec + "}").format(value)
        testcases.append([value, spec, result])
    except ValueError:
        testcases.append([value, spec, None])

print(json.dumps(testcases))

