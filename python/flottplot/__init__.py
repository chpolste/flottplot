import os
import uuid

# https://ipython.readthedocs.io/en/stable/config/custommagics.html
#from IPython import get_ipython
#from IPython.display import display, Javascript, HTML
from IPython.core.magic import register_cell_magic

FP_PATH = os.path.join(os.path.dirname(__file__), "flottplot-min.js")

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


def load_ipython_extension(ipython):
    @register_cell_magic
    def flottplot(self, cell):
        rid = uuid.uuid4()
        return HTMLReprWrapper(CELL.format(rid=rid, cell=cell))
    with open(FP_PATH) as f:
        fpjs = f.read()
    # TODO try to catch jupyterlab and display warning that magic does not work there
    display(HTML(INIT.format(fpjs=fpjs))) # TODO

