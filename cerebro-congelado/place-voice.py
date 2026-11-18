"""Lays sentence takes onto a fixed timeline, so a new narration keeps the cuts, cues and music of the old one.
Each take starts at its anchor (seconds) or just after the previous take; one that would run into the next
anchor is sped up a little (at most MAX_TEMPO), and only if that is not enough does the rest move later.
    python3 place-voice.py parts_dir anchors.json out.wav [end_seconds]"""
import json, subprocess, sys, os, numpy as np, wave

GAP, MAX_TEMPO, SR = 0.2, 1.12, 24000
parts_dir, anchors, out = sys.argv[1], json.load(open(sys.argv[2])), sys.argv[3]
end_limit = float(sys.argv[4]) if len(sys.argv) > 4 else None

def load(path, tempo=1.0):
    filt = f"atempo={tempo:.4f}" if tempo > 1.001 else "anull"
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-af", filt, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    a = np.frombuffer(raw, np.float32)
    # trim the silence and the low hiss around the take: speech is where 20 ms windows are louder than -38 dB
    hop = int(SR * 0.02); n = len(a) // hop
    db = 20 * np.log10(np.sqrt((a[: n * hop].reshape(n, hop) ** 2).mean(1)) + 1e-9)
    on = np.flatnonzero(db > -38)
    if not len(on): return a
    s, e = on[0] * hop, (on[-1] + 1) * hop
    a = a[max(0, s - int(SR * 0.03)): e + int(SR * 0.1)].copy()
    fade = int(SR * 0.04); a[-fade:] *= np.linspace(1, 0, fade)  # no click where the tail is cut
    return a

files = sorted(f for f in os.listdir(parts_dir) if f.endswith(".wav"))
assert len(files) == len(anchors), f"{len(files)} takes, {len(anchors)} anchors"
placed, t = [], 0.0
for i, f in enumerate(files):
    start = max(anchors[i], t + (GAP if i else 0))
    room = (anchors[i + 1] - GAP if i + 1 < len(anchors) else (end_limit or 1e9)) - start
    a = load(os.path.join(parts_dir, f)); tempo = 1.0
    if len(a) / SR > room:
        tempo = min(MAX_TEMPO, len(a) / SR / room); a = load(os.path.join(parts_dir, f), tempo)
    placed.append((start, a)); t = start + len(a) / SR
    print(f"{f}  {start:6.2f} → {t:6.2f}  anchor {anchors[i]:6.2f}  tempo {tempo:.3f}" + ("  LATE" if start > anchors[i] + 0.05 else ""))
buf = np.zeros(int(SR * (t + 0.3)), np.float32)
for start, a in placed: buf[int(start * SR): int(start * SR) + len(a)] += a
with wave.open(out, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(buf, -1, 1) * 32767).astype("<i2").tobytes())
print(out, round(len(buf) / SR, 2), "s")
