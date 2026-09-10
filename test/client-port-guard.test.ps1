$ErrorActionPreference = 'Stop'
. (Join-Path (Split-Path $PSScriptRoot -Parent) 'scripts/client-port-guard.ps1')

function Assert-Equal($actual, $expected, $name) {
    if ($actual -ne $expected) { throw "$name expected '$expected', got '$actual'" }
}

Assert-Equal (Get-ClientPortAction -OwningProcessId 0 -ServiceName '') 'Free' 'free port'
Assert-Equal (Get-ClientPortAction -OwningProcessId 321 -ServiceName 'PEMHTTPD-x64') 'TemporarilyStopService' 'known conflict'
Assert-Equal (Get-ClientPortAction -OwningProcessId 321 -ServiceName 'pemhttpd-X64') 'TemporarilyStopService' 'case insensitive known conflict'
Assert-Equal (Get-ClientPortAction -OwningProcessId 321 -ServiceName 'OtherService') 'Blocked' 'unknown service'
Assert-Equal (Get-ClientPortAction -OwningProcessId 321 -ServiceName '') 'Blocked' 'unknown process'

Write-Host 'Client port guard policy OK.'
