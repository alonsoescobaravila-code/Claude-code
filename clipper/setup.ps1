# Windows setup for the clipper. Run once from this folder in PowerShell:
#   powershell -ExecutionPolicy Bypass -File setup.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { winget install -e --id OpenJS.NodeJS.LTS }
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { winget install -e --id Gyan.FFmpeg }
if (-not (Get-Command py -ErrorAction SilentlyContinue)) { winget install -e --id Python.Python.3.12 }
Write-Host "Si acaba de instalar algo, cierra esta ventana, abre otra y vuelve a ejecutar este script."
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -q --upgrade pip
.\.venv\Scripts\pip.exe install -q faster-whisper
Write-Host "Listo. Prueba:  node clipper.mjs auto episodio.mp4"
