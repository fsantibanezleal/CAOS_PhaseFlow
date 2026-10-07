# scipy and HiGHS · 01 · Installation

```bash
pip install -r requirements.txt     # oreblocks[milp]==0.6.1 brings scipy (HiGHS inside)
```

HiGHS is bundled in the scipy wheel: no separate install, no licence. Without scipy the engine still
computes the critical multiplier bound, Algorithm 4 and the TopoSort and shift rungs (numpy only), and the
pipeline records the solver-dependent rungs as NOT RUN with the reason.
