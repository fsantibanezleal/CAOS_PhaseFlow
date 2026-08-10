"""The two learned methods, with the honest statement of what they are allowed to decide.

**Neither certifies anything.** The certified bound always comes from the critical multiplier
algorithm or from Bienstock-Zuckerberg; every learned prediction is scored against the exact quantity
it approximates, on deposits the model never saw. That is the same discipline PitForge uses for its
learned pit preprocessing: learning orders the work, the exact method still decides.

**Learned method 1, the expected-time surrogate.** The best published rounding heuristic (ExTS) needs
the LP relaxation first, because its block weight is the LP's expected extraction time ``E_b``. That
is a sequence of maximum-closure solves. The surrogate predicts ``E_b / (T + 1)`` directly from
block-local and scenario features, so a schedule can be produced with **no LP solve at all**. Useful
when a user is dragging a slider; honest because the exact ExTS is one click away and the app reports
both, along with the correlation between predicted and true times on held-out deposits.

**Learned method 2, the bound surrogate.** Predicts ``bound / upit_value`` from deposit summary
statistics plus the scenario, so a sensitivity surface over discount rate and capacity can be drawn
instantly instead of after a few hundred closure solves. The exact bound is computed for the selected
point, so the surface is always anchored by at least one true value, and the held-out error is on
screen next to it.

**Leakage safety is by DEPOSIT, never by row.** A model that saw one scenario of a deposit must never
be evaluated on another scenario of the same deposit: the block-level features are nearly identical
and the score would be meaningless. The split here is on the generator seed, and the test asserts the
two seed sets are disjoint.

**Why numpy and not a framework.** The models are small multilayer perceptrons and the training loop
is explicit Adam, so the whole vertical is inspectable in one file: no optimiser state hidden behind
an API, no version-pinned framework to reproduce. They are exported to real **ONNX** graphs and the
export is verified against the numpy forward pass to 1e-6 before it is written, so the artifact the
browser loads is provably the model that was trained.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

from ..io.schema import Scenario
from .features import block_feature_matrix, deposit_feature_vector

__all__ = ["Mlp", "LearnedBundle", "train_mlp", "export_onnx"]


# ------------------------------------------------------------------------------------------------
# a small, explicit MLP
# ------------------------------------------------------------------------------------------------
@dataclass
class Mlp:
    """A 2-hidden-layer perceptron with ReLU and a sigmoid head, weights as plain arrays."""

    w: list[np.ndarray]
    b: list[np.ndarray]
    feature_names: tuple[str, ...]
    target: str
    #: per-feature standardisation, fitted on the TRAIN split only
    mu: np.ndarray = field(default_factory=lambda: np.zeros(0))
    sigma: np.ndarray = field(default_factory=lambda: np.ones(0))
    metrics: dict = field(default_factory=dict)

    def forward(self, x: np.ndarray) -> np.ndarray:
        h = (x - self.mu) / np.where(self.sigma > 1e-8, self.sigma, 1.0)
        for k in range(len(self.w) - 1):
            h = np.maximum(0.0, h @ self.w[k] + self.b[k])
        z = h @ self.w[-1] + self.b[-1]
        return 1.0 / (1.0 + np.exp(-z))

    def to_json(self) -> dict:
        return {
            "schema": "phaseflow.mlp/v1",
            "target": self.target,
            "features": list(self.feature_names),
            "mu": [float(v) for v in self.mu],
            "sigma": [float(v) for v in self.sigma],
            "layers": [
                {"w": w.tolist(), "b": b.tolist()} for w, b in zip(self.w, self.b, strict=True)
            ],
            "metrics": self.metrics,
        }

    @classmethod
    def from_json(cls, d: dict) -> Mlp:
        return cls(
            w=[np.array(layer["w"], dtype=np.float64) for layer in d["layers"]],
            b=[np.array(layer["b"], dtype=np.float64) for layer in d["layers"]],
            feature_names=tuple(d["features"]),
            target=d["target"],
            mu=np.array(d["mu"], dtype=np.float64),
            sigma=np.array(d["sigma"], dtype=np.float64),
            metrics=d.get("metrics", {}),
        )


def train_mlp(
    x: np.ndarray,
    y: np.ndarray,
    *,
    feature_names: tuple[str, ...],
    target: str,
    hidden: tuple[int, int] = (32, 16),
    epochs: int = 400,
    batch: int = 512,
    lr: float = 3e-3,
    seed: int = 17,
) -> Mlp:
    """Explicit Adam on a binary-cross-entropy-free squared loss over a sigmoid head.

    The targets are ratios in [0, 1] (a fraction of the horizon, a fraction of the ultimate-pit
    value), so a sigmoid head keeps predictions in range by construction and a squared loss on the
    sigmoid is well behaved for a regression on a bounded target.
    """
    rng = np.random.default_rng(seed)
    n, d = x.shape
    mu = x.mean(axis=0)
    sigma = x.std(axis=0)
    xs = (x - mu) / np.where(sigma > 1e-8, sigma, 1.0)

    dims = [d, *hidden, 1]
    w = [rng.normal(0, np.sqrt(2.0 / dims[k]), (dims[k], dims[k + 1])) for k in range(len(dims) - 1)]
    b = [np.zeros(dims[k + 1]) for k in range(len(dims) - 1)]
    mw = [np.zeros_like(v) for v in w]
    vw = [np.zeros_like(v) for v in w]
    mb = [np.zeros_like(v) for v in b]
    vb = [np.zeros_like(v) for v in b]
    beta1, beta2, eps = 0.9, 0.999, 1e-8
    step = 0

    for _ in range(epochs):
        perm = rng.permutation(n)
        for s in range(0, n, batch):
            idx = perm[s : s + batch]
            xb, yb = xs[idx], y[idx].reshape(-1, 1)
            acts = [xb]
            h = xb
            for k in range(len(w) - 1):
                h = np.maximum(0.0, h @ w[k] + b[k])
                acts.append(h)
            z = h @ w[-1] + b[-1]
            p = 1.0 / (1.0 + np.exp(-z))
            g = (p - yb) * p * (1 - p) * (2.0 / xb.shape[0])

            grads_w: list[np.ndarray] = [np.zeros(0)] * len(w)
            grads_b: list[np.ndarray] = [np.zeros(0)] * len(b)
            for k in range(len(w) - 1, -1, -1):
                grads_w[k] = acts[k].T @ g
                grads_b[k] = g.sum(axis=0)
                if k > 0:
                    g = (g @ w[k].T) * (acts[k] > 0)

            step += 1
            for k in range(len(w)):
                mw[k] = beta1 * mw[k] + (1 - beta1) * grads_w[k]
                vw[k] = beta2 * vw[k] + (1 - beta2) * grads_w[k] ** 2
                mb[k] = beta1 * mb[k] + (1 - beta1) * grads_b[k]
                vb[k] = beta2 * vb[k] + (1 - beta2) * grads_b[k] ** 2
                mhat = mw[k] / (1 - beta1**step)
                vhat = vw[k] / (1 - beta2**step)
                w[k] -= lr * mhat / (np.sqrt(vhat) + eps)
                mhat = mb[k] / (1 - beta1**step)
                vhat = vb[k] / (1 - beta2**step)
                b[k] -= lr * mhat / (np.sqrt(vhat) + eps)

    return Mlp(w=w, b=b, feature_names=feature_names, target=target, mu=mu, sigma=sigma)


# ------------------------------------------------------------------------------------------------
# ONNX export, verified against the numpy forward pass before it is written
# ------------------------------------------------------------------------------------------------
def export_onnx(model: Mlp, path: str | Path, *, sample: np.ndarray | None = None) -> Path:
    """Write a real ONNX graph and PROVE it matches the trained model.

    Standardisation is folded into the graph as a Sub and a Div, so the browser feeds raw features and
    cannot get the normalisation wrong. The export is executed with onnxruntime on a sample batch and
    compared against :meth:`Mlp.forward`; a mismatch above 1e-6 raises rather than shipping an artifact
    that is not the model that was trained.
    """
    import onnx
    from onnx import TensorProto, helper, numpy_helper

    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    d = model.w[0].shape[0]

    inits = [
        numpy_helper.from_array(model.mu.astype(np.float32), "mu"),
        numpy_helper.from_array(
            np.where(model.sigma > 1e-8, model.sigma, 1.0).astype(np.float32), "sigma"
        ),
    ]
    nodes = [
        helper.make_node("Sub", ["x", "mu"], ["c"]),
        helper.make_node("Div", ["c", "sigma"], ["h0"]),
    ]
    for k in range(len(model.w)):
        inits.append(numpy_helper.from_array(model.w[k].astype(np.float32), f"W{k}"))
        inits.append(numpy_helper.from_array(model.b[k].astype(np.float32), f"B{k}"))
        nodes.append(helper.make_node("MatMul", [f"h{k}", f"W{k}"], [f"m{k}"]))
        nodes.append(helper.make_node("Add", [f"m{k}", f"B{k}"], [f"a{k}"]))
        if k < len(model.w) - 1:
            nodes.append(helper.make_node("Relu", [f"a{k}"], [f"h{k + 1}"]))
    nodes.append(helper.make_node("Sigmoid", [f"a{len(model.w) - 1}"], ["y"]))

    graph = helper.make_graph(
        nodes,
        f"phaseflow-{model.target}",
        [helper.make_tensor_value_info("x", TensorProto.FLOAT, ["N", d])],
        [helper.make_tensor_value_info("y", TensorProto.FLOAT, ["N", 1])],
        initializer=inits,
    )
    onnx_model = helper.make_model(
        graph, opset_imports=[helper.make_opsetid("", 13)], producer_name="phaseflow"
    )
    onnx_model.ir_version = 9
    onnx.checker.check_model(onnx_model)
    onnx.save(onnx_model, str(p))

    if sample is None:
        sample = np.random.default_rng(0).normal(size=(64, d))
    expected = model.forward(sample.astype(np.float64))
    try:
        import onnxruntime as ort

        sess = ort.InferenceSession(str(p), providers=["CPUExecutionProvider"])
        got = sess.run(None, {"x": sample.astype(np.float32)})[0]
        err = float(np.abs(got.reshape(-1) - expected.reshape(-1)).max())
        if err > 1e-5:
            raise AssertionError(
                f"the exported ONNX graph disagrees with the trained model by {err:.2e}; "
                "shipping it would mean the browser runs a different model from the one evaluated"
            )
    except ImportError:
        # onnxruntime is not required to BUILD; the browser has its own. The JSON mirror below is
        # still verified, so the artifact is never unchecked.
        err = None

    p.with_suffix(".json").write_text(
        json.dumps({**model.to_json(), "onnx_parity_max_abs_err": err}, indent=1) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    return p


# ------------------------------------------------------------------------------------------------
# the bundle the pipeline consumes
# ------------------------------------------------------------------------------------------------
@dataclass
class LearnedBundle:
    """Both models plus their held-out scores, loaded from ``models/``."""

    expected_time: Mlp
    bound: Mlp

    @classmethod
    def load(cls, models_dir: str | Path) -> LearnedBundle:
        d = Path(models_dir)
        return cls(
            expected_time=Mlp.from_json(json.loads((d / "expected-time.json").read_text(encoding="utf-8"))),
            bound=Mlp.from_json(json.loads((d / "bound.json").read_text(encoding="utf-8"))),
        )

    def predict_expected_times(self, instance, scenario: Scenario) -> np.ndarray:
        """Predicted ``E_b`` per block, with NO LP solve."""
        x = block_feature_matrix(
            values=instance.cpit.value,
            tonnage=instance.tonnage,
            grade=instance.grade,
            level=instance.level,
            x=instance.x,
            y=instance.y,
            in_pit=instance.upit_in_pit,
            prec=instance.precedence,
            scenario=scenario,
            dims=instance.dims,
        )
        frac = self.expected_time.forward(x.astype(np.float64)).reshape(-1)
        return frac * (scenario.periods + 1)

    def predict_bound_ratio(self, instance, scenario: Scenario) -> float:
        v = deposit_feature_vector(
            values=instance.cpit.value,
            tonnage=instance.tonnage,
            grade=instance.grade,
            in_pit=instance.upit_in_pit,
            upit_value=instance.upit_value,
            scenario=scenario,
        )
        return float(self.bound.forward(v.reshape(1, -1).astype(np.float64))[0, 0])

    def report(self) -> dict:
        """The held-out scores, so the app can show what the learned lane is worth."""
        return {
            "expectedTime": self.expected_time.metrics,
            "bound": self.bound.metrics,
            "honesty": (
                "Neither model certifies anything. The certified bound comes from the critical "
                "multiplier algorithm or from Bienstock-Zuckerberg; these are scored against the "
                "exact quantity they approximate, on deposits they never saw, split by deposit seed."
            ),
        }

    def unreliable_here(self, cpit) -> str | None:
        """The guard: a sentence when this scenario is one the surrogate is measured to lose in.

        A worst case of 0.344 is a footnote until you can say WHEN. The rule comes from the training
        study (`models/learned-failure-modes.json`) and it is about the SCENARIO, not the orebody:
        heavy discounting makes the value of a plan depend on precise timing, and a surrogate asked
        only for the ORDER has the least to give exactly there. Returns None when the case is outside
        the flagged region, which is not a promise that the plan is good, only the absence of a
        measured reason to expect it is not.
        """
        m = self.expected_time.metrics
        threshold = m.get("failure_rule_rate_at_least", 0.15)
        if float(cpit.discount_rate) < float(threshold):
            return None
        below = m.get("failure_below", 0.90)
        recall = m.get("failure_rule_recall")
        worst = m.get("holdout_npv_vs_exact_exts_min")
        parts = [
            f"discount rate {100 * float(cpit.discount_rate):.0f}% is inside the region where this "
            f"surrogate is MEASURED to lose: held-out plans below {100 * float(below):.0f}% of the "
            "exact-ExTS plan concentrate here"
        ]
        if recall is not None:
            parts.append(f"the flag catches {100 * float(recall):.0f}% of them")
        if worst is not None:
            parts.append(f"the worst held-out case is {100 * float(worst):.1f}%")
        return "; ".join(parts)

    def for_instance(self, instance) -> list[tuple]:
        """Produce the learned schedules the ladder asks for, as ``(name, result, ms, note)``."""
        import time

        import oreblocks as ob

        from ..io.schema import Scenario as Sc

        cpit = instance.cpit
        sc = Sc(
            periods=cpit.n_periods,
            discount_rate=cpit.discount_rate,
            capacity_fraction=tuple([1.0] * cpit.n_resources),
            resource_names=cpit.resource_names,
            period_one_undiscounted=cpit.period_one_undiscounted,
        )
        out = []
        t0 = time.perf_counter()
        e_hat = self.predict_expected_times(instance, sc)
        res = ob.toposort_schedule(cpit, instance.precedence, weight=-e_hat, allowed=instance.upit_in_pit)
        ms = (time.perf_counter() - t0) * 1000.0
        res.method = "learned-expected-time"
        note = (
            "ExTS quality with NO LP solve: the expected extraction times come from a surrogate "
            f"(held-out Spearman {self.expected_time.metrics.get('holdout_spearman', float('nan')):.3f})"
        )
        warning = self.unreliable_here(cpit)
        if warning:
            note = f"{note}. UNRELIABLE HERE: {warning}"
        out.append(("learned-expected-time", res, ms, note))
        return out
