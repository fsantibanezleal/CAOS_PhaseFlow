# PyTorch frontier training · 01 · Installation

Use a dedicated virtual environment outside the repository and install the explicit CPU requirements:

```powershell
./scripts/setup-frontier-training.ps1 -VenvPath E:/_venvs/CAOS_PhaseFlow-frontier
```

```bash
./scripts/setup-frontier-training.sh /path/to/external/venvs/phaseflow-frontier
```

Both scripts reject a virtual-environment path inside the checkout. The requirements file pins the CPU build
of PyTorch 2.14.1 and includes the product's exact engine and NumPy pins. The supported device is CPU. A
CUDA-enabled build changes the declared compute protocol and is rejected by the trainer.

The installed environment must remain separate from `.venv-pipeline`, `.venv-notebooks`, CI and deployment.
The model root is separately configured outside the repository; see the training guide before starting a run.
