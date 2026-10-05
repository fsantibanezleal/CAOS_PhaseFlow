# 04 · Licences and redistribution

## The rule

| source | licence as known | what may be committed | what the browser gets |
|---|---|---|---|
| synthetic twins (`oreblocks.make_twin`) | generated here, free to redistribute | everything: per-block schedules and the block arrays | the full block model; the case re-solves live |
| MineLib instances | academic download; redistribution not granted | aggregate results only | numbers and charts; no per-block data, no 3D replay |
| the AMPL notebook (external integer optimum) | a public notebook and log | the value, attributed, with the access date | the value, attributed |
| published papers | cited | values transcribed with their table and DOI | the same |

## Why the MineLib rule is conservative, in writing

MineLib (Espinoza, Goycoolea, Moreno and Newman,
[doi:10.1007/s10479-012-1258-3](https://doi.org/10.1007/s10479-012-1258-3)) grants an academic download.
Its licence text could not be read: the canonical site's TLS certificate is expired, the site answers
programmatic clients with a WAF challenge (HTTP 468), and the old host times out. A search summary states
CC BY-SA 3.0 Unported; that is a paraphrase of snippets, not the licence, and it is recorded as
**unverified**. Until the text is in hand the product applies the conservative rule: academic download, no
redistribution. Being stricter than the licence costs a feature on three cases; being looser than it is a
different kind of mistake.

## Where the rule is enforced, in code rather than in a comment

- `scripts/fetch_minelib.py` downloads into the machine's data folder or the git-ignored `data/raw/`, and
  never into a committed path.
- `data-pipeline/pipeline/core/trace.py` writes `periodOfBlock` and `blocks` only for synthetic instances.
- `pipeline.py::_validate` and `scripts/check_artifacts.py` fail on the NEGATIVE clause: a case whose
  manifest says it is not redistributable must not carry per-block data.
- `pipeline/core/gate.py` makes a non-redistributable case `replay` whatever its size, and says why in the
  manifest.

## The product's own licence

PhaseFlow and its engine `oreblocks` are MIT-licensed. Third-party data keeps its own terms; a model
trained on it would carry them (no model here is trained on MineLib data: the learned lane trains on
seeded twins only).
