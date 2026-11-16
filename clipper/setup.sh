#!/usr/bin/env bash
# Mac / Linux setup for the clipper. Run once from this folder:  bash setup.sh
set -e
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Falta Node.js: instálalo desde https://nodejs.org (versión LTS)"; exit 1; }
command -v ffmpeg >/dev/null || { if command -v brew >/dev/null; then brew install ffmpeg; else echo "Falta ffmpeg: instala Homebrew (https://brew.sh) y luego: brew install ffmpeg"; exit 1; fi; }
command -v python3 >/dev/null || { echo "Falta Python 3: instálalo desde https://www.python.org"; exit 1; }
python3 -m venv .venv
.venv/bin/pip install -q --upgrade pip
.venv/bin/pip install -q faster-whisper
echo "Listo. Prueba:  node clipper.mjs auto episodio.mp4"
