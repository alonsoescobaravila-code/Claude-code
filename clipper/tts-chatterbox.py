"""Narration with Chatterbox Multilingual (MIT), on the CPU. One sentence per line in the text file.
A line that starts with "en|" (or any other language code and "|") is read in that language.
Each line is saved on its own in <out>.parts/, so a bad take can be redone alone: delete its file and run again.
    .venv-cb/bin/python tts-chatterbox.py text.txt out.wav reference.wav [exaggeration=0.55] [cfg=0.4] [seed=7]"""
import sys, os, numpy as np, soundfile as sf, torch
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

src, out, ref = sys.argv[1], sys.argv[2], sys.argv[3]
exag = float(sys.argv[4]) if len(sys.argv) > 4 else 0.55
cfg = float(sys.argv[5]) if len(sys.argv) > 5 else 0.4
seed = int(sys.argv[6]) if len(sys.argv) > 6 else 7
torch.set_num_threads(os.cpu_count() or 4)
lines = [l.strip() for l in open(src, encoding="utf-8") if l.strip()]
parts_dir = out + ".parts"; os.makedirs(parts_dir, exist_ok=True)
model = None
for i, line in enumerate(lines):
    f = os.path.join(parts_dir, f"{i:02d}.wav")
    if os.path.exists(f): continue
    if model is None: model = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
    lang, text = line.split("|", 1) if "|" in line[:4] else ("es", line)
    torch.manual_seed(seed + i)
    wav = model.generate(text, language_id=lang, audio_prompt_path=ref, exaggeration=exag, cfg_weight=cfg, temperature=0.8)
    sf.write(f, wav.squeeze(0).numpy(), model.sr); print(f"{i:02d}", round(wav.shape[-1] / model.sr, 2), "s", text, flush=True)

SR, chunks = None, []
for i, line in enumerate(lines):
    a, SR = sf.read(os.path.join(parts_dir, f"{i:02d}.wav"))
    nz = np.flatnonzero(np.abs(a) > 0.01)  # trim the silence the model leaves around each take
    a = a[max(0, nz[0] - int(SR * 0.03)): nz[-1] + int(SR * 0.08)] if len(nz) else a
    chunks.append(a)
    nxt = lines[i + 1] if i + 1 < len(lines) else ""
    gap = 0.18 if line.endswith(":") or nxt.startswith("en|") else 0.45 if line.endswith(("…", "...", "?", "!")) else 0.32
    chunks.append(np.zeros(int(SR * gap)))
sf.write(out, np.concatenate(chunks), SR); print(out, round(sum(len(c) for c in chunks) / SR, 2), "s")
