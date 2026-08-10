# Guides

- [01, bake the artifacts](guides/01_bake-the-artifacts.md)
- [02, bring your own block model](guides/02_bring-your-own-data.md)

Running it locally is [`scripts/local/README.md`](../scripts/local/README.md): numbered scripts, each
printing the next command.

The numbering has a hole at 03 and 04 and keeps it: renumbering a guide breaks every link that ever pointed at it, and the gap is explained here rather than hidden by shuffling.

There is no guide for the in-app architecture modal either: the template shipped one, it described a copy-and-paste flow this product did not follow, and the modal's real content is five hand-authored SVGs inline in `frontend/src/architecture.ts`.

There is no API guide and no GPU guide. PhaseFlow has no backend, and the bake is a pure-Python
max-flow that a GPU would not help: the work is a sequence of dependent closures, not a batch of
arithmetic.
