import os
from pathlib import Path

def _relative_navigable_path(origin, target):
    # https://stackoverflow.com/questions/38083555
    return Path(os.path.relpath(target, origin))


def read_asset(asset):
    pkg_root = Path(__file__).parent
    return Path(pkg_root, "assets", asset).read_text()

def write_asset(asset, outdir=".", overwrite=False):
    outpath = Path(outdir, asset)
    if outpath.is_file() and not overwrite:
        pass # don't overwrite existing files unless allowed
    else:
        content = read_asset(asset)
        outpath.parent.mkdir(parents=True, exist_ok=True)
        outpath.write_text(content)
    return outpath


PAGE_TEMPLATE = """
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>A Flottplot Page</title>
{head_content}
</head>
<body>

{body_content}
</body>
</html>
"""

def create_page(out, js=None, css=None, tags=None):
    out = Path(out)
    # Generate <head> content with appropriate relative paths
    headers = []
    if js is not None:
        url = _relative_navigable_path(out.parent, js)
        headers.append(f'  <script type="text/javascript" src="{url}"></script>')
    if css is not None:
        url = _relative_navigable_path(out.parent, css)
        headers.append(f'  <link rel="stylesheet" type="text/css" href="{url}">')
    # Generate elements to include from given tag names
    elements = []
    if tags is not None:
        for tag in tags:
            elements.append(f'  <{tag}></{tag}>')
    return PAGE_TEMPLATE.format(
        head_content="\n".join(headers),
        body_content="\n".join(elements)
    ).strip()

