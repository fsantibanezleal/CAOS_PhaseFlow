# Guides

- [01, bake the artifacts](guides/01_bake-the-artifacts.md)
- [02, bring your own block model](guides/02_bring-your-own-data.md)
- [05, the in-app Architecture modal (ADR-0058)](guides/05_architecture-modal.md)

Running it locally is [`scripts/local/README.md`](../scripts/local/README.md): numbered scripts, each
printing the next command.

There is no API guide and no GPU guide. PhaseFlow has no backend, and the bake is a pure-Python
max-flow that a GPU would not help: the work is a sequence of dependent closures, not a batch of
arithmetic.
