function Get-ClientPortAction {
    param([int]$OwningProcessId, [string]$ServiceName)
    if ($OwningProcessId -le 0) { return 'Free' }
    if ($ServiceName -ieq 'PEMHTTPD-x64') { return 'TemporarilyStopService' }
    return 'Blocked'
}

function Get-ClientPortOwner {
    param([int]$Port = 8080)
    $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if (!$listener) { return [pscustomobject]@{ ProcessId = 0; ProcessName = ''; ServiceName = '' } }
    $process = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
    $service = Get-CimInstance Win32_Service -Filter "ProcessId = $($listener.OwningProcess)" -ErrorAction SilentlyContinue |
        Select-Object -First 1
    return [pscustomobject]@{
        ProcessId = [int]$listener.OwningProcess
        ProcessName = if ($process) { $process.ProcessName } else { '' }
        ServiceName = if ($service) { $service.Name } else { '' }
    }
}

function Test-ClientAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}
