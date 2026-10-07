# ONNX · 03 · Using the models elsewhere

```python
import json, numpy as np, onnxruntime as ort

meta = json.load(open("models/expected-time.json"))
sess = ort.InferenceSession("models/expected-time.onnx", providers=["CPUExecutionProvider"])
features = np.array([[...]], dtype=np.float32)        # the 12 features, in meta["features"] order, RAW
fraction = sess.run(None, {"x": features})[0][:, 0]  # E_b / (T + 1)
expected_time = fraction * (periods + 1)
```

The feature definitions are in `data-pipeline/pipeline/model/features.py` (block value, grade,
depth fraction, cone size and value, radial distance, in-pit flag, discount rate, two capacity fractions,
periods). Read the model's `metrics` before using it on your data: it was trained on four seeded
archetypes at two grid sizes, and on a real deposit its share of the exact plan can only be measured, not
assumed ([methodologies/08](../../methodologies/08_when-the-surrogate-fails.md)).
