# Deposit-statistics guard v2: design

Status: proposal for review only. The v1 rule's held-out precision was 0.5820 against a 0.7407 floor. The validator correctly stopped before opening its reserved third split and before inspecting real-deposit support. V2 abandons that candidate-selection rule and defines fresh partitions; it does not reuse the failed score to choose features or thresholds.

## Question and inference boundary

The guard estimates whether the trained expected-time schedule may fall below 0.90 times exact ExTS NPV for a deposit represented by measured input statistics. It is a warning with abstention, not a schedule, proof, or substitute for a solver. Synthetic `archetype` and `seed` are unavailable at inference and prohibited as inputs. When the same case has an exact ExTS result, its measured ratio supersedes the prediction.

## Data partitions

Keep the existing 12 training seeds (`101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157`) as the only model-selection source. Keep the consumed v1 holdout (`211, 223, 227, 229, 233, 239`) and the v1 reserved third split sealed and unused by v2. Predeclare fresh partitions before generation:

- first evaluation: `281, 283, 293, 307, 311, 313`;
- confirmation: `317, 331, 337, 347, 349, 353`.

The candidate-generation script must verify these sets against every existing split receipt before opening any row. All four archetypes, nine crossed scenarios, two grid sizes, and all derived variants for a seed stay in that seed's partition. Record the exact generator version, input hashes, and split assignment in the preregistration receipt. Any collision or missing cell invalidates the run before fitting.

## Candidate-selection design

Keep the 18-field label-free v1 statistics schema as a starting point, versioned separately from the bound-surrogate feature vector. Before using any evaluation rows, check each feature's units, finite/missing-value behavior, and availability on every committed non-synthetic deposit. Do not add or remove a feature after observing either new evaluation result.

Use a shallow, serializable decision tree as the sole model family for this attempt so its warning path can be inspected and reproduced in Python and TypeScript. On the 12 training seed groups, produce out-of-fold probabilities with grouped nested cross-validation: outer folds hold out whole deposit seeds; inner folds select only among tree depths 1–4, minimum leaf counts 12/24/48/72, and probability thresholds. Freeze fold assignments deterministically before fitting. Candidate selection must maximize recall subject to the v1 recorded holdout precision, recall, worst-unflagged floors and a maximum 50% training warning share, using pooled out-of-fold predictions; ties prefer fewer leaves, then higher precision, then a higher warning threshold. If no candidate meets all constraints, stop before generating the new evaluation partitions.

After selecting the tree and threshold, refit the selected structure on all 12 training seed groups, serialize the tree, training support, feature schema, threshold, tie-break record, split IDs and hashes. Hash the complete canonical candidate and preregistration record. The validator accepts only these frozen bytes and cannot fit or tune.

## Evaluation and stop rules

The first fresh partition is an independent rejection gate. Require precision ≥0.7407, recall ≥0.5517, worst unflagged learned-to-exact ratio ≥0.7364 and flagged share ≤0.50. On any failure, record the result and stop without reading confirmation outcomes. If it passes, open the confirmation partition exactly once, without changing model, support, threshold, or metrics. Require precision ≥0.667, recall ≥0.818, and worst unflagged ratio ≥0.7852. On any failure, preserve the negative result and keep the app unavailable.

The second split is not a substitute for real-deposit support. Only after both synthetic gates pass, compute the frozen features for all committed real deposits. Report which deposits are supported and why each unsupported case abstains. At least one real deposit must be in support to consider a guarded live preview; no performance claim on real deposits follows from support overlap alone.

## Artifact and UI behavior

The research record contains model and split hashes, generator and feature versions, grouped fold plan, per-partition row counts, confusion matrices, calibrated threshold, flagged share, worst missed case and ratio, plus real-deposit support dispositions. The browser evaluates the frozen shallow tree only for an in-support deposit. The label reads “guard unavailable” outside support or when the receipt is not promotable, in EN and ES. It never says “safe.” An exact measured ratio is shown in preference to the prediction. No model, training data, or synthetic archetype label is loaded by the client.

## Kill criteria

Stop this attempt if the fresh seed sets collide, training folds leak variants across seeds, any required feature is unavailable on real inputs, no candidate satisfies grouped training-only constraints, either independent evaluation gate misses a floor, the serialized decision differs between Python and TypeScript, or all real deposits abstain. Do not respond by reopening the v1 holdout or reserved third split, changing floors, or selecting another model family against the fresh evaluation results. A new attempt would need a new preregistration and new disjoint data.
