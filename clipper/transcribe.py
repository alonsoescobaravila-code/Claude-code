"""Word-level transcript of a video or audio file, for burned-in subtitles.

    .venv/bin/python transcribe.py episode.mp4 [--model small.en] [--from 0] [--to 0]

Writes <file>.words.json: [{"w": "word", "s": start_seconds, "e": end_seconds}, ...].
Runs on the CPU with faster-whisper (MIT); the model is downloaded once from Hugging Face.
"""
import json, subprocess, sys
import numpy as np
from faster_whisper import WhisperModel

args = sys.argv[1:]
path = args[0]
opt = lambda name, default: args[args.index(f"--{name}") + 1] if f"--{name}" in args else default
model = WhisperModel(opt("model", "small.en"), device="cpu", compute_type="int8")
clip = [float(opt("from", 0)), float(opt("to", 0))] if opt("to", 0) else None
# decode with ffmpeg (16 kHz mono float), so the bundled PyAV version never matters
pcm = subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-i", path, "-vn", "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True, check=True).stdout
audio = np.frombuffer(pcm, dtype=np.float32)
segments, info = model.transcribe(audio, word_timestamps=True, vad_filter=True, clip_timestamps=clip or "0", language=opt("lang", None))
words = []
for seg in segments:
    for w in seg.words or []:
        words.append({"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)})
    print(f"\r{seg.end:7.1f}s  {len(words)} words", end="", file=sys.stderr, flush=True)
out = opt("out", path + ".words.json")
json.dump(words, open(out, "w"), ensure_ascii=False)
print(f"\n{len(words)} words -> {out}", file=sys.stderr)
