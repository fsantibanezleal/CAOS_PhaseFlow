# 03 - run the site locally on http://localhost:5173
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..\..\frontend')

function Invoke-Native {
    param([Parameter(Mandatory)][scriptblock] $Command, [string] $What = 'command')
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & $Command } finally { $ErrorActionPreference = $prev }
    if ($LASTEXITCODE -ne 0) { throw "$What failed with exit code $LASTEXITCODE" }
}

if (-not (Test-Path 'node_modules')) { Invoke-Native { npm install } 'npm install' }
Invoke-Native { node copy-data.mjs } 'copy-data'   # overlay data\derived into public\data
Invoke-Native { npm run dev } 'vite dev'
