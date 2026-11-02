# PhaseFlow SDD amendment 0.12.000: state-conditioned frontier policy

**Design status:** Felipe approved the state-conditioned feasible-frontier direction on 2026-11-01. This amendment fixes the problem, algorithm, data boundaries and verification contract. It is a design record, not evidence of an implemented or successful method.

**Implementation boundary:** the 0.11.000/OreBlocks 0.6.6 baseline bake is running against the current source. Do not edit the pipeline, solver, model bundle, inputs or version while that bake runs. It supplies the frozen baseline. The policy changes the schedule set and therefore targets the next complete product version, 0.12.000; it requires a fresh, all-case bake after implementation. No 0.11.000 result is to be relabeled as containing this method.

## 1. Research basis and transfer limits

Learning a schedule-generation policy over the precedence-eligible set has precedent in resource-constrained project scheduling. Teichteil-Königsbuch et al. use a graph neural network to rank tasks and pass those rankings through a schedule-generation scheme; their size-generalization limits matter directly here ([ICAPS 2023, DOI 10.1609/icaps.v33i1.27244](https://doi.org/10.1609/icaps.v33i1.27244)). Infantes et al. likewise describe graph-policy decisions over an eligible task set for uncertain-duration RCPSP, with expected makespan as the objective ([arXiv:2511.13214](https://arxiv.org/abs/2511.13214)). Mining RL work studies different operating decisions and objectives; it supports domain context, not a transferable policy or a PhaseFlow result ([Kumar and Dimitrakopoulos 2021, DOI 10.1016/j.asoc.2021.107644](https://doi.org/10.1016/j.asoc.2021.107644); [de Carvalho and Dimitrakopoulos 2023, DOI 10.1007/s10489-023-04774-3](https://doi.org/10.1007/s10489-023-04774-3)).

PhaseFlow's objective is discounted block value under pit precedence and period capacities. RCPSP makespan policies do not establish performance for that objective, nor do small graph results establish transfer to a 14,400-block case. The method will be described as a PhaseFlow experiment, with no general mining or superiority claim.

## 2. Mathematical problem and state transition

Let \(G=(V,A)\) be the acyclic block-precedence graph, \(T\) the periods, \(r_{ik}\) block \(i\)'s use of resource \(k\), \(C_{tk}\) the capacity of resource \(k\) in period \(t\), and \(v_i\) its fixed-destination CPIT value. Let \(d_t\) be the product's exact discount factor for period \(t\). A schedule \(p_i\in\{-1,1,\ldots,T\}\), where \(-1\) means unmined, is feasible iff:

\[
 p_j\ge 1\;\Longrightarrow\;p_i\ge 1\ \text{and}\ p_i\le p_j\quad\forall(i,j)\in A,
 \qquad
 \sum_{i:p_i=t}r_{ik}\le C_{tk}\quad\forall t,k.
\]

Its objective is the engine's existing evaluator, \(\operatorname{NPV}(p)=\sum_{i:p_i\ge1}d_{p_i}v_i\). No separate reward equation, surrogate bound or policy score replaces this evaluator.

The policy constructs one period at a time. Its state contains the current period, assigned-period vector, residual resources, scheduled value, and the precedence frontier. At period \(t\), a block is eligible only if it is unassigned and every immediate predecessor has already been assigned to a period no later than \(t\). The admissible action set further masks blocks that exceed any residual resource. The chosen action assigns one admissible block to period \(t\). The policy repeats until it emits `stop-period`, no admissible action remains, or \(t=T\); deterministic period advancement then continues unless the policy emits `stop-schedule`.

`stop-period` allows a policy to reserve capacity for a later frontier; `stop-schedule` allows a feasible partial schedule. Those actions make coverage observable and trainable instead of quietly filling unused capacity with an invalid block. Each step updates residual resources and the eligible frontier. The finished schedule is independently checked; action masking is not accepted as the sole feasibility proof.

## 3. Policy architecture and deterministic inference

The policy is an autoregressive graph-conditioned scorer, distinct from BS-1's static expected-time predictions followed by a fixed TopoSort. A two-layer, 64-unit message-passing encoder computes each block embedding once from the fixed precedence graph and frozen static features, using mean aggregation over incoming and outgoing neighbors. A shared 64-unit actor scores each currently admissible block from its embedding, current period, residual-resource fractions, scheduled-value fraction and frontier size. A pooled graph/state encoder feeds a 64-unit critic; a categorical stop action is scored from the same global state. Inference masks inadmissible blocks before selection and scores only the current frontier.

Static node features are limited to source-backed input fields available in the instance contract: normalized block value, resource use, grade only when the source declares it, graph depth/degree and fixed destination where the CPIT case provides one. Dynamic state features are recomputed from the partial schedule. Stable case IDs, split IDs, test labels, seed text and post-outcome metrics are forbidden model inputs. Normalization is fit on training cases only, saved with the checkpoint, and rejected if a feature is non-finite, constant without an explicit semantic meaning, or missing from the declared contract.

Training samples masked actions with PPO: Adam at `3e-4`, clip ratio `0.2`, GAE `lambda=0.95`, entropy coefficient `0.01`, value coefficient `0.5`, gradient norm clipped at `0.5`, 4,096 decisions per rollout, 256 decisions per minibatch and 10 epochs per rollout. The training return has `gamma=1`; reward for an assignment is \(d_t v_i / \max(\sum_j|v_j|,10^{-12})\), a positive per-instance scaling of the product objective that prevents large-valued cases dominating gradients without changing their schedule ordering. Inference uses `argmax` over masked logits and deterministic tie-breaking by stable source block index, followed by `stop-period`/`stop-schedule` only when their logits win. Model seed, dependency versions, feature order, normalization, action-mask version and checkpoint hash are recorded. The Python runner uses the declared CPU device; the browser does not execute this policy in real time. The app replays the complete, validated baked result. Each case has a 900-second inference limit; timeout yields an explicit unavailable row, never a partial row mislabeled as complete.

## 4. Training protocol, storage and splits

Training episodes use a versioned generator of redistributable synthetic precedence graphs and economic/resource scenarios. Training, validation and test partitions are disjoint by both generator seed and graph-family parameters. The 13 product benchmark cases are held out of fitting, checkpoint selection and feature decisions; they are evaluated only after the policy and all training choices are frozen. Exact optimization on tiny semantic fixtures verifies the objective and constraints; it is not assumed to be a feasible large-graph teacher and its outputs are not relabeled as policy targets.

Train the masked PPO actor-critic with five fixed seeds (`1103, 2207, 3301, 4409, 5519`); aggregate logits before the common action mask. Each member receives at most 1,000,000 environment transitions and 2 CPU-hours, with a 24-hour wall-clock cap for all five members. Save a validation checkpoint every 50,000 transitions. Stop a member after five consecutive validation checkpoints with no improvement in mean normalized NPV while every evaluated schedule passes the independent feasibility validator, or at its fixed cap, whichever occurs first. Report tonnage and positive-value coverage separately; coverage is never combined into the objective or used to suppress a negative result. The training graph generator emits four declared mining-like families at 32 to 4,096 blocks. It uses 1,000 train seeds, 200 disjoint validation seeds and 500 disjoint synthetic test seeds; the held-out test split covers size strata from 32 through 8,192 blocks, including sizes above training. The 13 product cases remain separate from all those seeds and are evaluated once after freeze. The result at the cap is retained even when it is a failure. Freeze the generator revision, seed ledger, checkpoint-selection rule and all software pins before opening validation or test results.

The learned weights/checkpoints and generated training graphs live under the device's model/training roots, selected by environment variable or command argument. They are not committed to the product repository. Repository contracts carry the training configuration, split manifest, SHA-256 digests, dependency pins, summary metrics and output traces. CI and CD validate these receipts and baked outputs; neither trains nor downloads training-only data. The current static web lane replays schedules in committed traces and does not load a training checkpoint.

## 5. Frozen evaluation and acceptance

Report every independent test seed and all 13 product cases, including failed, abstained and partial schedules. Paired comparisons use the exact same case/scenario and compare the frontier policy with BS-1, M-1, the strongest applicable published schedule, and exact expected-time ordering where its certificate completes. Report discounted NPV, certified-bound gap when comparable, feasibility, scheduled tonnage and value coverage, inference time, peak memory, terminal/advance decisions, and per-case failures. Use seed-clustered intervals for synthetic evaluations; blocks within one graph are not independent replicates.

Implementation correctness passes only with zero hard-constraint violations, independent objective recomputation, deterministic replay, split disjointness and complete failure reporting. A partial plan is feasible but cannot be presented as a full-coverage plan. The method is retained as an evaluated research result even if it loses to its baselines; no numeric superiority claim is made unless a predeclared paired test supports it. Do not tune after test access. A missing checkpoint, mismatched checksum, unsupported input feature, failed validator or non-finite policy output produces an explicit unavailable/failed result and never falls back under the frontier method's name.

The training environment uses PyTorch `2.14.1` CPU wheels in a training-only environment, separate from the pipeline and deployment environments ([official installation/version instructions](https://pytorch.org/get-started/previous-versions/)). CI and CD never install this training environment. The earlier bound-destination teacher pilot and the Wheatley 272-task, 10-million-step guide show why a declared cap is necessary; they do not establish that this cap is sufficient. If this budget cannot train a reproducible policy, retain the negative result and revise the design only before a new, separately frozen experiment.

## 6. Complete product vertical and named requirements

| ID | Requirement | Verification gate |
|---|---|---|
| M5 | The frontier policy selects only currently precedence-eligible, resource-feasible blocks and emits a schedule that passes the independent CPIT validator. | `tests/test_frontier_policy.py`; `tests/test_frontier_cases.py`; planted invalid-precedence, duplicate-block, resource-overrun and period-boundary adversarial tests; `scripts/check_artifacts.py` |
| M6 | The policy conditions decisions on the partial schedule and remaining resources; it is not BS-1's static expected-time ranker under another name. | state-mutation tests that change residual capacity/period/frontier and prove action-score or action-set changes; ablation notebook |
| M7 | Training and inference use a versioned feature/normalization/action contract; train/validation/test are seed- and graph-family-disjoint; forbidden identifiers never enter features. | `scripts/train_frontier_policy.py --check`; split-ledger tests; `tests/adversarial/test_frontier_features.py` |
| M8 | Frozen inference is deterministic, reports partial coverage honestly, and has matching Python evaluation and independent export/parity evidence for any exported model. | deterministic replay test; objective/constraint parity tests; model/checkpoint receipt validator |
| M9 | The 0.12.000 bake evaluates all declared cases from one source/pin/model snapshot and preserves every failure and per-case metric. | `scripts/evaluate_frontier_product_cases.py`; external all-case bake receipt; `scripts/check_frontier_release.py`; `scripts/check_artifacts.py`; `scripts/check_readiness.py`; manifest and index checks |
| M10 | EN/ES notebooks teach observation construction, masks, training, frozen evaluation, failures and interpretation using runnable product code and final baked data. | notebook content gate; fresh-kernel execution and byte-stable `--check`; notebook review |
| M11 | The web app shows the method only as an offline baked replay, with EN/ES explanations, provenance, coverage and caveats; it never implies live model support. | trace contract tests; EN/ES, light/dark route screenshots; selector-to-replay browser gate |
| M12 | Training graphs and learned weights stay in device roots; product metadata and committed result traces contain only permitted small receipts/derived outputs. | `scripts/check_base_integrity.py`; data-root tests; redistribution/license checks |

## 7. Release boundary

This is a new scheduling method and changes scientific output. It must not be added to the active 0.11.000 bake. After the baseline bake and its gates complete, implement this design vertically, increment the product to 0.12.000, train once under the frozen receipt, evaluate against the frozen 0.11 baseline, refresh the full bilingual notebook set and result-derived docs, then rebake all cases with the single 0.12.000 source/model snapshot. Promotion remains governed by the product's branch/PR/main/tag/Pages flow. The existing shell pin and template pin remain exact; no shell or template fork is introduced.

## 8. Review record

- 2026-11-01: Felipe approved the state-conditioned frontier-policy direction.
- Adversarial design review: action masks are followed by an independent validator; the policy has explicit period and schedule stop actions; partial coverage is measured; split leakage is prohibited; training weights stay external; test access is one-shot; the result is tied to a distinct 0.12.000 full bake. The resource cap is frozen here before any policy code or training run.
