# PyTorch · CPU graph actor-critic for the frontier policy

PyTorch supplies tensor differentiation and the optimizer for the approved state-conditioned block scheduler.
The product uses a two-layer message-passing graph encoder, a masked actor and a pooled critic. The policy
scores only blocks that satisfy the current precedence and resource constraints, while explicit actions can
advance a period or stop a schedule. The independent schedule validator remains the feasibility check.

**Pin.** `torch==2.14.1` from the CPU wheel index, in the separate `requirements-frontier-training.txt` environment.
That file includes the pinned product engine and NumPy for offline schedule and feature handling. CI, the
normal pipeline environment, the browser and the deployment do not install PyTorch or train models.

**Scope.** PyTorch is used only for Frontier-policy training and deterministic CPU replay. It does not run in
the browser. The web app reads a committed, validated schedule and its provenance. A checkpoint is not a
published result until its hash, training receipt, validation history and independent schedule metrics agree.

The method's equations, objective, transition rules, seed/family splits, stopping caps, and limits are specified
in the [0.12.000 SDD amendment](../design/features/learned-frontier/SDD-amendment-0.12.000.md). See the three
implementation notes for [installation](08_pytorch-frontier/01_installation.md), [use](08_pytorch-frontier/02_usage.md),
and [application](08_pytorch-frontier/03_applying.md).
