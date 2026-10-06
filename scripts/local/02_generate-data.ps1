# 02 - bake the artifacts.
#
# SANDBOX BY DEFAULT. Writing into data\derived\ overwrites the committed evidence the site ships, so
# it takes an explicit -Release. A release bake is refused for a single case: a tree mixing two engine
# versions passes every per-case check there is, and looks complete from the index.
#
#   .\scripts\local\02_generate-data.ps1                    # all cases -> build\local
#   .\scripts\local\02_generate-data.ps1 twin-porphyry-l    # one case  -> build\local
#   .\scripts\local\02_generate-data.ps1 -Release           # all cases -> data\derived  (a RELEASE bake)
#
# The whole set takes the better part of a day: the sliding windows run for hours on the largest cases
# (632 minutes on kd-declared in the 0.08 release) and the HiGHS PCPSP LP up to 159 minutes, so the cases
# are baked side by side, -Jobs at a time (default 4; the 0.08 release ran 8 on a 32-core, 48 GB
# workstation). docs/guides/01 has the measured table.
[CmdletBinding()]
param(
    [string] $Case = 'all',
    [switch] $Release,
    [int] $Jobs = 4
)

$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..\..')
$venv = Join-Path (Get-Location) '.venv\Scripts\python.exe'
if (-not (Test-Path $venv)) { throw 'no .venv; run .\scripts\local\01_init.ps1 first' }

function Invoke-Native {
    param([Parameter(Mandatory)][scriptblock] $Command, [string] $What = 'command')
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & $Command } finally { $ErrorActionPreference = $prev }
    if ($LASTEXITCODE -ne 0) { throw "$What failed with exit code $LASTEXITCODE" }
}

if ($Release) {
    if ($Case -ne 'all') {
        throw 'a release bake must be the WHOLE case set: a partial tree passes every per-case check there is'
    }
    Write-Output '[02] RELEASE bake -> data\derived (the committed artifacts)'
    Invoke-Native { & $venv -u data-pipeline/run.py all --learned --jobs $Jobs } 'bake'
    Invoke-Native { & $venv scripts/check_artifacts.py } 'check_artifacts'
} else {
    Write-Output '[02] sandbox bake -> build\local (pass -Release to write the committed artifacts)'
    if ($Case -eq 'all') {
        Invoke-Native { & $venv -u data-pipeline/run.py all --learned --output build/local --jobs $Jobs } 'bake'
    } else {
        Invoke-Native { & $venv -u data-pipeline/run.py $Case --learned --output build/local } 'bake'
    }
}

Write-Output ''
Write-Output 'Next:  .\scripts\local\03_dev.ps1'
