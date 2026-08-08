# 00 - SYSTEM prerequisites. CHECKS by default; installs only with -Install.
#
# Checking is the default because a 00 script that reported an installed Python 3.13 as missing once
# reinstalled it through winget. Versions are the ones CI pins (.github/workflows/ci.yml), so passing
# here means passing there.
[CmdletBinding()]
param(
    # install what is missing, through winget
    [switch] $Install
)

$ErrorActionPreference = 'Stop'
$pyMin = [version]'3.12'
$nodeMin = [version]'20.0'
$missing = @()

function Get-ToolVersion {
    param([string] $Exe, [string[]] $VersionArgs)
    $cmd = Get-Command $Exe -ErrorAction SilentlyContinue
    if (-not $cmd) { return $null }
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { $raw = & $cmd.Source @VersionArgs } finally { $ErrorActionPreference = $prev }
    return ($raw | Out-String)
}

$py = Get-ToolVersion -Exe 'python' -VersionArgs @('--version')
if ($py -match '(\d+)\.(\d+)') {
    $v = [version]"$($Matches[1]).$($Matches[2])"
    if ($v -ge $pyMin) { Write-Output "ok    python $v" }
    else { Write-Output "FAIL  python $v, CI pins $pyMin"; $missing += 'Python.Python.3.12' }
} else {
    Write-Output "FAIL  python not found; CI pins $pyMin"; $missing += 'Python.Python.3.12'
}

$node = Get-ToolVersion -Exe 'node' -VersionArgs @('--version')
if ($node -match 'v(\d+)\.(\d+)') {
    $v = [version]"$($Matches[1]).$($Matches[2])"
    if ($v -ge $nodeMin) { Write-Output "ok    node $v" }
    else { Write-Output "FAIL  node $v, CI pins $nodeMin"; $missing += 'OpenJS.NodeJS.LTS' }
} else {
    Write-Output "FAIL  node not found; CI pins $nodeMin"; $missing += 'OpenJS.NodeJS.LTS'
}

$git = Get-ToolVersion -Exe 'git' -VersionArgs @('--version')
if ($git -match '(\d+\.\d+\.\d+)') { Write-Output "ok    git $($Matches[1])" }
else { Write-Output 'FAIL  git not found'; $missing += 'Git.Git' }

if ($missing.Count -gt 0) {
    if (-not $Install) {
        Write-Output ''
        Write-Output 'Missing prerequisites. Re-run with -Install to install them through winget:'
        Write-Output '  .\scripts\local\00_install-prereqs.ps1 -Install'
        exit 1
    }
    foreach ($id in $missing) {
        Write-Output "[00] winget install $id"
        $prev = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        try { winget install --id $id --silent --accept-package-agreements --accept-source-agreements }
        finally { $ErrorActionPreference = $prev }
    }
    Write-Output 'Open a NEW shell so PATH is picked up, then run this script again.'
    exit 1
}

Write-Output ''
Write-Output 'Next:  .\scripts\local\01_init.ps1'
