# 01 - one-stop setup from a fresh clone. Idempotent: safe to run again at any time.
#
# ONE virtualenv. The archetype's two-venv split exists for products whose offline lane pulls heavy
# wheels the runtime lane must not have; PhaseFlow's offline lane needs numpy, oreblocks, scipy, onnx
# and onnxruntime, and a second environment would only be a second thing to keep in sync.
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..\..')

# Windows PowerShell 5.1 turns every stderr line from a native program into an ErrorRecord, so under
# $ErrorActionPreference = 'Stop' one harmless pip warning aborts this script halfway. Judge a native
# call by its EXIT CODE.
function Invoke-Native {
    param([Parameter(Mandatory)][scriptblock] $Command, [string] $What = 'command')
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & $Command } finally { $ErrorActionPreference = $prev }
    if ($LASTEXITCODE -ne 0) { throw "$What failed with exit code $LASTEXITCODE" }
}

if (-not (Test-Path '.venv')) {
    Invoke-Native { python -m venv .venv } 'python -m venv'
}
$venv = Join-Path (Get-Location) '.venv\Scripts\python.exe'

Write-Output '[01] python deps (offline lane + dev)'
Invoke-Native { & $venv -m pip install --upgrade pip -q } 'pip upgrade'
Invoke-Native { & $venv -m pip install -q -r requirements-precompute.txt -r requirements-dev.txt } 'pip install'

Write-Output '[01] frontend packages'
Push-Location frontend
try {
    if (Test-Path 'package-lock.json') { Invoke-Native { npm ci } 'npm ci' }
    else { Invoke-Native { npm install } 'npm install' }
} finally { Pop-Location }

# PhaseFlow is a static replay site with no backend and no secrets: .env exists so the archetype's
# dormant app/ lane has one, and it is copied from the committed example rather than a vault.
if ((-not (Test-Path '.env')) -and (Test-Path '.env.example')) {
    Copy-Item '.env.example' '.env'
    Write-Output '[01] .env created from .env.example (no secrets: this product has none)'
}

if (-not (Test-Path 'data\derived\manifests\index.json')) {
    Write-Output '[01] no artifacts on disk yet -> running 02_generate-data.ps1 into the sandbox'
    & (Join-Path $PSScriptRoot '02_generate-data.ps1')
}

Write-Output ''
Write-Output 'Next:  .\scripts\local\03_dev.ps1'
