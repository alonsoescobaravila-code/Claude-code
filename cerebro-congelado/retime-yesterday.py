"""Re-times the Yesterday captions and word cues to a new narration.
Aligns the script's words to whisper's words, writes yesterday.words.json (with the mix delay added),
then moves each punch cue to the word it belongs to.
    python3 retime-yesterday.py heard-words.json script.txt [delay=0.2]"""
import json, re, sys, unicodedata, difflib

heard, script_path = json.load(open(sys.argv[1])), sys.argv[2]
delay = float(sys.argv[3]) if len(sys.argv) > 3 else 0.2
FPS, TS, WJ = 30, "src/canvas-core/yesterday.ts", "src/canvas-core/yesterday.words.json"
script = open(script_path, encoding="utf-8").read().replace("mil novecientos sesenta y cinco", "1965").replace("...", "…").split()
norm = lambda w: re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFD", w.lower()).encode("ascii", "ignore").decode())
a, b = [norm(w) for w in script], [norm(x["w"]) for x in heard]
sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
t = [None] * len(script)
for blk in sm.get_matching_blocks():
    for k in range(blk.size): t[blk.a + k] = (heard[blk.b + k]["s"], heard[blk.b + k]["e"])
known = [i for i, x in enumerate(t) if x]
for i in range(len(t)):  # words whisper missed: spread them evenly between the known neighbours
    if t[i]: continue
    p = max([k for k in known if k < i], default=None); n = min([k for k in known if k > i], default=None)
    s0 = t[p][1] if p is not None else 0.0; s1 = t[n][0] if n is not None else heard[-1]["e"]
    lo = p if p is not None else -1; hi = n if n is not None else len(t)
    s = s0 + (s1 - s0) * (i - lo) / (hi - lo); t[i] = (s, s + max(0.15, (s1 - s0) / (hi - lo)))
words = [{"w": w, "s": round(x[0] + delay, 3), "e": round(x[1] + delay, 3)} for w, x in zip(script, t)]
json.dump(words, open(WJ, "w"), ensure_ascii=False)
print(len(script), "words,", sum(blk.size for blk in sm.get_matching_blocks()), "matched by ear")

def at(word, nth=1):  # frame where the nth occurrence of a script word starts
    hits = [x for x in words if norm(x["w"]) == word]
    return round(hits[nth - 1]["s"] * FPS)

src = open(TS, encoding="utf-8").read()
def sub(pattern, frame):  # pattern holds one (\d+) group: the cue frame to replace
    global src
    m = re.search(pattern.replace("#", r"(\d+)"), src); assert m, f"pattern not found: {pattern}"
    src = src[:m.start(1)] + str(frame) + src[m.end(1):]
# each punch lands a few frames before its word, as in the first cut
copie, no, eggs, huevos, solo = at("que") - 4, at("nadie") - 5, at("scrambled") - 3, at("revueltos", 2) - 2, at("beatle") - 8
sub(r'"¿LA COPIÉ\?", W / 2, 1470, 110, \(f - #\)', copie)
sub(r'f >= # \? Math\.sin', no + 2); sub(r'face: f >= # \?', no + 2)
sub(r'"NO", W / 2 \+ 180, 560, 150, \(f - #\)', no)
sub(r'"SCRAMBLED EGGS", W / 2, 1470, 64, \(f - #\)', eggs)
sub(r'if \(f >= #\) punch\(ctx, env, "= HUEVOS', huevos); sub(r'"= HUEVOS REVUELTOS", W / 2, 1600, 70, \(f - #\)', huevos)
sub(r'"SOLO PAUL", W / 2, 1470, 110, \(f - #\)', solo)
open(TS, "w", encoding="utf-8").write(src)
print(f"cues: ¿LA COPIÉ? {copie}  NO {no}  SCRAMBLED {eggs}  HUEVOS {huevos}  SOLO PAUL {solo}")
