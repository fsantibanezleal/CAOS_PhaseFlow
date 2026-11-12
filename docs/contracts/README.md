# PhaseFlow contracts

The authoritative list of exchanged and committed data shapes is the [contract catalog](catalog.md). It records each
owner, schema, committed files, consumer, failure behavior, semantic version, and history. The JSON Schemas live in
[`schemas/`](schemas/); their normalized SHA-256 digests and catalog versions are locked in
[`versions.lock.json`](versions.lock.json).

From the repository root, validate the catalogued documents and lock with:

```powershell
python scripts/check_contracts.py docs/contracts/catalog.md --repo-root .
python scripts/check_contract_versions.py
python scripts/check_readiness.py
```

`data/derived/readiness.json` is generated evidence, not a hand-edited release badge. Recompute it after changing the
catalog or the committed data with `python scripts/update_readiness.py`, then run the checks above. MineLib block data
remain external; only license-permitted aggregate traces and manifests are committed.

The `frontier-release` receipt keeps separate SHA-256 identities for the frozen training/validation split and the
independent synthetic test sample. A replacement test sample never changes the recorded training split or reopens a
consumed test ledger. The incompatible receipt change is documented in [frontier release contract v2](frontier-release-v2.md).
