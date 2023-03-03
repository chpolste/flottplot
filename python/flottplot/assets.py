import os
from pathlib import Path


PKG_ROOT = Path(__file__).parent
AST_ROOT = Path(PKG_ROOT, "assets")


def _relative_navigable_path(origin, target):
    # https://stackoverflow.com/questions/38083555
    return Path(os.path.relpath(target, origin))


def all_assets():
    return { path.name: path for path in AST_ROOT.glob("*") }

def read_asset(asset):
    return Path(AST_ROOT, asset).read_text()

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

