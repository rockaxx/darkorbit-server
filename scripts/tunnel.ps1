param([switch]$NoStart)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$local = Join-Path $root '.local'
$logDir = Join-Path $local 'logs'
New-Item -ItemType Directory -Force $logDir | Out-Null
$cloudflared = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $cloudflared) {
  $cloudflared = Join-Path $local 'cloudflared.exe'
  if (-not (Test-Path $cloudflared)) {
    Write-Host 'Stahujem cloudflared z oficialneho Cloudflare vydania...'
    Invoke-WebRequest 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile $cloudflared -UseBasicParsing
  }
}
if (-not $NoStart) { & (Join-Path $PSScriptRoot 'start.ps1') -NoClient }
$gatewayPid = Join-Path $local 'gateway.pid'
 $gatewayListening = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue
if (-not $gatewayListening) {
  $p = Start-Process node -ArgumentList 'scripts/ws-proxy.js' -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDir 'gateway.out.log') -RedirectStandardError (Join-Path $logDir 'gateway.err.log')
  $p.Id | Set-Content $gatewayPid
} elseif ($gatewayListening.OwningProcess) {
  $gatewayListening.OwningProcess | Set-Content $gatewayPid
}
for ($i=0; $i -lt 20; $i++) { try { $tcp = [Net.Sockets.TcpClient]::new('127.0.0.1',8081); $tcp.Dispose(); break } catch { Start-Sleep -Milliseconds 250 } }
$tunnel = Start-Process $cloudflared -ArgumentList 'tunnel','--url','http://127.0.0.1:8081','--no-autoupdate' -WorkingDirectory $root -NoNewWindow -PassThru -RedirectStandardError (Join-Path $logDir 'tunnel.err.log')
$tunnel.Id | Set-Content (Join-Path $local 'tunnel.pid')
$url = $null
for ($i=0; $i -lt 30 -and -not $url; $i++) { Start-Sleep -Milliseconds 500; $url = Select-String -Path (Join-Path $logDir 'tunnel.err.log') -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -AllMatches | Select-Object -Last 1 | ForEach-Object { $_.Matches[0].Value } }
if ($url) {
  $url | Set-Content (Join-Path $local 'public-url.txt')
  & (Join-Path $PSScriptRoot 'build-client.ps1')
  Write-Host "Verejna hra: $url"
  Write-Host 'Posli tento odkaz hracom. Tunnel vypnes cez Stop-DarkOrbit-Tunnel.cmd.'
} else { Write-Host 'Tunnel bezi, URL pozri v .local/logs/tunnel.err.log' }
Wait-Process -Id $tunnel.Id
