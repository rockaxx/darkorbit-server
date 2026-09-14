$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$vswhere = "${env:ProgramFiles(x86)}/Microsoft Visual Studio/Installer/vswhere.exe"
$vs = & $vswhere -latest -products '*' -requires Microsoft.Component.MSBuild -property installationPath
$compiler = Join-Path $vs 'MSBuild/Current/Bin/Roslyn/csc.exe'
$output = Join-Path $root '.local/emulator/ArenaPetRangeTest.exe'
$framework = "$env:WINDIR/Microsoft.NET/Framework64/v4.0.30319"
$refs = @('System.dll','System.Core.dll','System.Data.dll','System.Xml.dll','System.Xml.Linq.dll','System.Net.Http.dll','Microsoft.CSharp.dll') | ForEach-Object { Join-Path $framework $_ }
$refs += (Get-ChildItem "$root/DarkOrbit 10.0/bin/Debug" -Filter *.dll).FullName
$sources = Get-ChildItem "$root/DarkOrbit 10.0" -Recurse -Filter *.cs | Where-Object { $_.FullName -notmatch '[\\/]obj[\\/]' }
$lines = @('/nologo','/target:exe','/langversion:latest','/main:ArenaPetRangeTest',('/out:"' + $output + '"'))
$lines += $refs | ForEach-Object { '/reference:"' + $_ + '"' }
$lines += $sources | ForEach-Object { '"' + $_.FullName + '"' }
$lines += '"' + (Join-Path $PSScriptRoot 'ArenaPetRangeTest.cs') + '"'
$rsp = Join-Path $root '.local/arena-pet-test.rsp'
$lines | Set-Content $rsp
& $compiler "@$rsp"
if ($LASTEXITCODE -ne 0) { throw 'Arena PET test compilation failed.' }
& $output
if ($LASTEXITCODE -ne 0) { throw 'Arena PET range regression failed.' }
