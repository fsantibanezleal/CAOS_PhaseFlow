param(
  [Parameter(Mandatory = $true)]
  [string]$VenvPath
)
$ErrorActionPreference = "Stop"
$repo = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$target = [System.IO.Path]::GetFullPath($VenvPath)
$repoPrefix = $repo + [System.IO.Path]::DirectorySeparatorChar
if ($target.Equals($repo, [StringComparison]::OrdinalIgnoreCase) -or
    $target.StartsWith($repoPrefix, [StringComparison]::OrdinalIgnoreCase)) {
  throw "The frontier training environment must be outside the repository: $target"
}
$python = if ($env:PYTHON) { $env:PYTHON } else { "python" }
$venvPython = Join-Path $target "Scripts\python.exe"
if (Test-Path -LiteralPath $target) {
  if (-not (Test-Path -LiteralPath $venvPython)) {
    throw "The requested path exists but is not a Windows virtual environment: $target"
  }
} else {
  & $python -m venv $target
  if ($LASTEXITCODE -ne 0) { throw "Could not create the training environment at $target" }
}
& $venvPython -m pip install --disable-pip-version-check -r (Join-Path $repo "requirements-frontier-training.txt")
if ($LASTEXITCODE -ne 0) { throw "Could not install requirements-frontier-training.txt into $target" }
& $venvPython -c "import torch; assert torch.__version__.startswith('2.14.1'); assert not torch.cuda.is_available(); print('frontier training environment:', torch.__version__, 'CPU')"
if ($LASTEXITCODE -ne 0) { throw "The training environment does not match the pinned CPU runtime" }
