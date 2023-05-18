import argparse
import os

import numpy as np
import matplotlib.pyplot as plt


parser = argparse.ArgumentParser()
parser.add_argument("--step", type=int, default=12)
parser.add_argument("--stop", type=int, default=120)
parser.add_argument("scheme", choices=["fwd", "bwd", "lag"])
parser.add_argument("outdir", type=str)

args = parser.parse_args()

# Coordinates
n = 100
x = np.linspace(0, 1, n)
dx = x[1] - x[0]

# Initial condition
y = np.zeros(n)
y[0:n//5] = 1. - np.abs(np.linspace(-1, 1, n//5))

# Background wind
u = 0.9 * (x[-1] - x[0]) / args.stop

# Timestep for explicit scheme
substeps = 10
dt = args.step / substeps

# Stencil matrix for implicit scheme
a = u * args.step / dx
solvemat = (1 + a) * np.eye(n)
solvemat[1:,:-1] -= a * np.eye(n-1)

for step in range(0, args.stop+1, args.step):
    fig, ax = plt.subplots(1, 1, figsize=(5, 2))
    ax.plot(x, y, color="#59862d", linewidth=2)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.set_title(args.scheme, loc="left")
    ax.set_title(f"+{step:03}", loc="right")
    path = os.path.join(args.outdir, f"adv_{args.scheme}_{step:03}.png")
    fig.tight_layout()
    fig.savefig(path, dpi=100)
    plt.close(fig)

    # Semi-Lagrangian scheme: find origins of backward trajectories and
    # interpolate, one step
    if args.scheme == "lag":
        xlag = np.clip((x - u * args.step), x[0], x[-1])
        y = np.interp(xlag, x, y)
    # Explicit scheme: Euler, upwind, substeps
    elif args.scheme == "fwd":
        for t in range(0, substeps, 1):
            y[1:] = y[1:] - dt * u * (y[1:] - y[:-1]) / dx
    # Implicit scheme: Euler, upwind, one step
    elif args.scheme == "bwd":
        y = np.linalg.solve(solvemat, y)
    else:
        raise NotImplementedError(f"scheme {args.scheme}")

