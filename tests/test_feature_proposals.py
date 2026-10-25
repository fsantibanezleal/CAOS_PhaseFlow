from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FEATURES = ("deposit-statistics-guard", "learned-destination", "sliding-window-scale")


def test_adversarial_proposals_remain_unimplemented_until_evidence_exists():
    sdd = (ROOT / "docs/design/SDD.md").read_text(encoding="utf-8")
    assert "The three feature designs are proposals" in sdd
    for name in FEATURES:
        folder = ROOT / "docs/design/features" / name
        design = (folder / "design.md").read_text(encoding="utf-8").lower()
        requirements = (folder / "requirements.md").read_text(encoding="utf-8").lower()
        validation = (folder / "validation.md").read_text(encoding="utf-8").lower()
        assert "status: proposed" in design
        assert "status: proposed" in requirements
        assert "not an implementation" in validation
        assert not (folder / "validation-result.json").exists()
