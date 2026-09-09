$root = Split-Path $PSScriptRoot -Parent
$local = Join-Path $root '.local'
foreach ($name in @('tunnel.pid','gateway.pid')) {
  $file = Join-Path $local $name
  if (Test-Path $file) { $id = [int](Get-Content $file); Stop-Process -Id $id -Force -ErrorAction SilentlyContinue; Remove-Item $file -Force -ErrorAction SilentlyContinue }
}
Write-Host 'Verejny tunnel a gateway boli zastavene.'
