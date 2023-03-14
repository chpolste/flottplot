import uuid

from .assets import read_asset


# TODO print cell magic ready from javascript? Maybe use display(Javascript())
# to verify if thing was properly loaded?
INIT = """
    <script>
        if (typeof IPython !== "undefined") {{
            IPython.CodeCell.options_default.highlight_modes["magic_html"] = {{
                "reg": [ "^%%flottplot" ]
            }};
        }}
        {fpjs}
    </script>
    <p><code>%%flottplot</code> cell magic ready.</p>
"""

CELL = """
    <div id="{rid}">{cell}</div>
    <script>
        (new flottplot.Flottplot()).scan(document.getElementById("{rid}")).initialize();
    </script>
"""


class HTMLReprWrapper:

    def __init__(self, content):
        self.content = content

    def _repr_html_(self):
        return self.content


# https://ipython.readthedocs.io/en/stable/config/custommagics.html
def load_ipython_extension(ipython):
    from IPython.display import display, HTML
    from IPython.core.magic import register_cell_magic
    @register_cell_magic
    def flottplot(self, cell):
        rid = uuid.uuid4()
        return HTMLReprWrapper(CELL.format(rid=rid, cell=cell))
    # TODO try to catch jupyterlab and display warning that magic does not work there
    display(HTML(INIT.format(fpjs=read_asset("flottplot-min.js")))) # TODO

