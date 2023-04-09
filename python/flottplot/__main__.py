from pathlib import Path
import argparse

from . import __version__
from .assets import all_assets, write_asset, create_page


parser = argparse.ArgumentParser(prog="flottplot")
parser.add_argument("-v", "--version", action="store_true")
subparsers = parser.add_subparsers(title="subcommands")


def init(args):
    # Determine file extension that should be enforced
    ext = args.extension
    if ext and not ext.startswith("."):
        ext = "." + ext
    # Generate output file name from page name 
    filename = args.file
    if not filename.endswith(ext):
        filename = filename + ext
    filename = Path(filename)
    # Exit here if page file cannot be written due to overwrite condition so
    # that assets are not written either
    if filename.is_file() and not args.overwrite:
        print("exists!!!")
        return
    # Prepare page assets (js and css files)
    assetdir = filename.parent if args.asset_dir is None else Path(args.asset_dir)
    # Write flottplot[-scan]-min.js
    _js_file = "flottplot-scan-min.js" if args.scan else "flottplot-min.js"
    asset_js = write_asset(_js_file, assetdir, args.overwrite)
    # Write flottplot.css if requested
    asset_css = None
    if args.style:
        asset_css = write_asset("flottplot.css", assetdir, args.overwrite)
    # Write page with appropriate references to assets
    filename.write_text(create_page(filename, js=asset_js, css=asset_css))

parser_init = subparsers.add_parser("init", description="""
    Create a new Flottplot page.
""", help="""
    Create a new Flottplot page.
""")
parser_init.add_argument("-e", "--extension", metavar="EXT", default="html", help="""
    File extension added to the output page name if not specified by the user
    already. Set to ".html" by default. If you do not want the file name of the
    new page to be modified, set this argument to an empty string.
""")
parser_init.add_argument("-a", "--asset-dir", default=None, metavar="DIR", help="""
    Output directory for JavaScript and CSS assets, relative to the current
    directory. The directory will be created if it does not exist. By default,
    all assets are put into the same directory as the created Flottplot page
    file.
""")
parser_init.add_argument("-o", "--overwrite", action="store_true", help="""
    Allow overwriting of existing files.
""")
parser_init.add_argument("--no-style", action="store_false", dest="style", help="""
    Do not include the Flottplot styling (CSS file) in the output page.
""")
parser_init.add_argument("--no-scan", action="store_false", dest="scan", help="""
    Do not include the automatic element scan in the output page.
""")
parser_init.add_argument("file", metavar="FILE", help="""
    File name for the new Flottplot page. The file extension ".html" is added
    automatically unless otherwise specfied with -e.
""")
parser_init.set_defaults(cmd=init)


def replace(args):
    cwd = Path.cwd()
    assets = all_assets()
    for name in assets.keys():
        if Path(cwd, name).is_file():
            write_asset(name, cwd, overwrite=True)
            print(f"replaced {name} with v{__version__}")

parser_replace = subparsers.add_parser("replace", description="""
    Replace Flottplot files (JavaScript, CSS) in the current directory, e.g. to
    upgrade to a new version or repair corrupted files.
""", help="""
    Replace Flottplot files.
""")
parser_replace.set_defaults(cmd=replace)


#parser_server = subparsers.add_parser("server", help="""
#    Start a simple HTTP server in the current directory.
#""")
#
#def server(args):
#    print("SERVER", args)
#
#parser_server.set_defaults(cmd=server)


args = parser.parse_args()
if "cmd" in args:
    args.cmd(args)
else:
    if args.version:
        print(f"Flottplot {__version__}")
    else:
        parser.print_help()

