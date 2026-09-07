$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$outDir = Join-Path $root '.local/emulator'
New-Item -ItemType Directory -Force $outDir | Out-Null
$vswhere = "${env:ProgramFiles(x86)}/Microsoft Visual Studio/Installer/vswhere.exe"
$vs = & $vswhere -latest -products '*' -requires Microsoft.Component.MSBuild -property installationPath
if (!$vs) { throw 'Visual Studio Build Tools with C# compiler is required.' }
$compiler = Join-Path $vs 'MSBuild/Current/Bin/Roslyn/csc.exe'
$framework = "$env:WINDIR/Microsoft.NET/Framework64/v4.0.30319"
$refs = @('System.dll','System.Core.dll','System.Data.dll','System.Xml.dll','System.Xml.Linq.dll','System.Net.Http.dll','Microsoft.CSharp.dll') | ForEach-Object { Join-Path $framework $_ }
$refs += (Get-ChildItem "$root/DarkOrbit 10.0/bin/Debug" -Filter *.dll).FullName
$sources = Get-ChildItem "$root/DarkOrbit 10.0" -Recurse -Filter *.cs | Where-Object { $_.FullName -notmatch '[\\/]obj[\\/]' }
$lines = @('/nologo','/target:exe','/langversion:latest',('/out:"' + $outDir + '/DarkOrbit.exe"'))
$lines += $refs | ForEach-Object { '/reference:"' + $_ + '"' }
$lines += $sources | ForEach-Object { '"' + $_.FullName + '"' }
$rsp = Join-Path $root '.local/build.rsp'
$lines | Set-Content $rsp
& $compiler "@$rsp"
if ($LASTEXITCODE -ne 0) { throw 'Emulator compilation failed.' }
Copy-Item "$root/DarkOrbit 10.0/bin/Debug/*.dll" $outDir -Force
Copy-Item "$root/DarkOrbit 10.0/App.config" "$outDir/DarkOrbit.exe.config" -Force
