import argparse

import numpy as np
import matplotlib.pyplot as plt


parser = argparse.ArgumentParser()
parser.add_argument("function", choices=["sin", "cos"])
parser.add_argument("wavenumber", type=int)
parser.add_argument("outfile", type=str)

args = parser.parse_args()

x = np.linspace(0, 2*np.pi, 100)
y = getattr(np, args.function)(args.wavenumber * x)

fig, ax = plt.subplots(1, 1, figsize=(6, 3))
ax.axhline(0, color="#CCC", linewidth=1)
ax.plot(x, y, color="#59862d", linewidth=2)
ax.set_title(f"{args.function}({args.wavenumber}x)")
ax.set_xlim(0, 2*np.pi)
ax.set_ylim(-1.2, 1.2)
ax.set_xticks([x*np.pi for x in (0, 0.5, 1, 1.5, 2)])
ax.set_xticklabels(["0", "π/2", "π", "3π/2", "2π"])
fig.tight_layout()
fig.savefig(args.outfile)


