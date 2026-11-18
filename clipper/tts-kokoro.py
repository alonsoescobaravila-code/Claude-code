"""Spanish narration with Kokoro-82M (Apache 2.0), on the CPU. One line per sentence in the text file;
a pause between sentences, a longer one after a line that ends in an ellipsis.
    .venv-tts/bin/python tts-kokoro.py text.txt out.wav [voice=em_alex] [speed=1.0]"""
import sys, os, numpy as np, soundfile as sf, espeakng_loader
from phonemizer.backend.espeak.wrapper import EspeakWrapper
EspeakWrapper.set_library(espeakng_loader.get_library_path())
os.environ.setdefault("ESPEAK_DATA_PATH", espeakng_loader.get_data_path())
from kokoro import KPipeline
src, out = sys.argv[1], sys.argv[2]
voice = sys.argv[3] if len(sys.argv) > 3 else "em_alex"; speed = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
p, SR, parts = KPipeline(lang_code="e"), 24000, []
for line in [l.strip() for l in open(src, encoding="utf-8") if l.strip()]:
    for _, _, a in p(line, voice=voice, speed=speed): parts.append(np.asarray(a))
    parts.append(np.zeros(int(SR * (0.45 if line.endswith(("…", "...", "?", "!")) else 0.32))))
sf.write(out, np.concatenate(parts), SR); print(out, round(sum(len(x) for x in parts) / SR, 2), "s")
