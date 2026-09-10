param([switch]$Elevated)
$ErrorActionPreference = 'Stop'
$clientRoot = $PSScriptRoot
. (Join-Path $clientRoot 'client-port-guard.ps1')

$owner = Get-ClientPortOwner -Port 8080
$action = Get-ClientPortAction -OwningProcessId $owner.ProcessId -ServiceName $owner.ServiceName

if ($action -eq 'Blocked') {
    throw "Port 8080 blokuje proces '$($owner.ProcessName)' PID $($owner.ProcessId). Zatvor ho a spusti klienta znova."
}

if ($action -eq 'TemporarilyStopService' -and !(Test-ClientAdministrator)) {
    if ($Elevated) { throw 'Klient nedostal administrátorské práva potrebné na dočasné uvoľnenie portu 8080.' }
    $quotedScript = '"' + $PSCommandPath.Replace('"', '\"') + '"'
    $child = Start-Process powershell.exe -Verb RunAs -Wait -PassThru -ArgumentList @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $quotedScript, '-Elevated'
    )
    exit $child.ExitCode
}

$stoppedService = $false
try {
    if ($action -eq 'TemporarilyStopService') {
        Stop-Service -Name $owner.ServiceName -Force -ErrorAction Stop
        $stoppedService = $true
        $service = Get-Service -Name $owner.ServiceName
        $service.WaitForStatus('Stopped', [TimeSpan]::FromSeconds(15))
    }

    $electron = Join-Path $clientRoot 'runtime/electron.exe'
    $entry = Join-Path $clientRoot 'public-client.js'
    $client = Start-Process -FilePath $electron -ArgumentList ('"' + $entry + '"') -WorkingDirectory $clientRoot -Wait -PassThru
    exit $client.ExitCode
}
finally {
    if ($stoppedService) {
        Start-Service -Name $owner.ServiceName -ErrorAction Continue
    }
}
