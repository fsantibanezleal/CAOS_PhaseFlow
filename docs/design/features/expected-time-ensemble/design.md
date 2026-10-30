# Expected-time ensemble: design

Status: implementation is present. The OreBlocks 0.6.5 full-case rebake, result review,
fresh-kernel notebook execution, and final artifact/parity checks remain release gates in `requirements.md`
and `validation.md`.

The expected-time feature matrix is shared by the offline Python pipeline and the
browser TypeScript lane. `tonnage_norm` is excluded because the synthetic training
deposits supplied no spread for it; a weight with no training gradient is unsafe
when a real deposit varies. The trainer refuses constant or non-finite inputs,
and both loaders verify feature names in order and require finite, positive scales.

The expected-time predictor is a five-member ensemble trained on the same
train-only normalization and rows with five frozen seeds. Each member predicts
the bounded expected-time fraction with a ReLU MLP and sigmoid output; inference
averages member predictions. The ONNX export mirrors that mean and is compared
with Python before publication. Browser inference uses the same JSON weights and
is checked against the same parity fixture.

Data splits remain disjoint by deposit seed. The holdout twin score is reported
without using the holdout to select epochs or features. Real MineLib scores are
reported only when the caller supplies the licensed cache; an absent cache is
recorded as unscored, never as a passing real-deposit validation.
