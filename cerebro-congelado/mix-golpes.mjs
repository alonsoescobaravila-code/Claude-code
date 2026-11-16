// MIX for "Golpe doble": music + (when voice-golpes.mp3 is here) the narration and one shouted
// "¡Bomboclaat!" that is replayed on every punch, lower and bigger each time. About -14 LUFS,
// H.264 + AAC, bt709.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";

const FPS = 60, DUR = 28, HITS = [210, 330, 450, 570, 720, 870, 1020, 1290].map((f) => f / FPS);
const LINES = ["¿Qué pasaría si cada golpe que das fuera el doble de fuerte que el anterior?", "Veinticuatro golpes después…", "Ups… creo que me pasé.", "¡Bomboclaat!"];
const STARTS = [0.15, 18.15, 25.6]; // narration lines: the intro, the time skip, the shrug
const ff = (args) => { const r = spawnSync("ffmpeg", ["-hide_banner", "-y", ...args], { encoding: "utf8" }); if (r.status) throw new Error(r.stderr.slice(-2500)); return r.stderr; };
const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }));
const voice = ["voice-golpes.mp3", "voice-golpes.wav"].find((f) => existsSync(f));
const shout = ["bomboclaat.mp3", "bomboclaat.wav"].find((f) => existsSync(f)); // your own sound, if you drop one here
const picture = "out/golpes-picture.mp4", music = "out/golpes-music.wav", out = "out/golpe-doble.mp4";
const ts = (s) => { const ms = Math.round(s * 1000), p = (n, w = 2) => String(n).padStart(w, "0"); return `00:00:${p(Math.floor(ms / 1000))},${p(ms % 1000, 3)}`; };

let inputs = ["-i", music], filter = "[0:a]anull[mix]", srt = [];
if (voice) {
  const log = ff(["-i", voice, "-af", "silencedetect=noise=-38dB:d=0.18", "-f", "null", "-"]), total = dur(voice), sil = [];
  const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((x) => +x[1]), ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((x) => +x[1]);
  starts.forEach((s, i) => { const e = ends[i] ?? total; if (s > 0.2 && e < total - 0.2) sil.push([s, e]); });
  // line breaks are the longest pauses: the text has no commas that could out-pause a paragraph break here except "Ups…"
  const cuts = [...sil].sort((a, b) => b[1] - b[0] - (a[1] - a[0])).slice(0, LINES.length - 1).sort((a, b) => a[0] - b[0]);
  if (cuts.length < LINES.length - 1) throw new Error(`mix: ${cuts.length} pauses found, need ${LINES.length - 1}`);
  const segs = LINES.map((_, i) => [i ? cuts[i - 1][1] - 0.04 : 0, i < cuts.length ? cuts[i][0] + 0.08 : total]);
  console.table(segs.map(([a, b], i) => ({ line: LINES[i].slice(0, 30), from: +a.toFixed(2), to: +b.toFixed(2), len: +(b - a).toFixed(2) })));
  inputs.push("-i", voice); if (shout) inputs.push("-i", shout);
  const parts = [], names = [];
  STARTS.forEach((at, i) => { const [a, b] = segs[i]; parts.push(`[1:a]atrim=${a}:${b},asetpts=PTS-STARTPTS,afade=t=out:st=${Math.max(0, b - a - 0.05)}:d=0.05,adelay=${Math.round(at * 1000)}:all=1[n${i}]`); names.push(`[n${i}]`); srt.push([at, at + (b - a), LINES[i]]); });
  // the shout: higher and small for a tap, lower, louder and echoing as the power doubles
  const [sa, sb] = segs[3], src = shout ? "[2:a]aresample=48000" : `[1:a]atrim=${sa}:${sb},asetpts=PTS-STARTPTS,aresample=48000`;
  HITS.forEach((at, k) => {
    const last = k === 7, rate = last ? 0.62 : 1.32 - k * 0.07, gain = last ? 4 : -9 + k * 1.6, echo = k >= 5 ? `,aecho=0.8:0.7:${last ? "180|360|540" : "110"}:${last ? "0.5|0.35|0.22" : "0.3"}` : "";
    parts.push(`${src},asetrate=${Math.round(48000 * rate)},aresample=48000,volume=${gain}dB${echo},adelay=${Math.round(at * 1000)}:all=1[b${k}]`); names.push(`[b${k}]`);
    srt.push([at, at + 0.7, "¡Bomboclaat!"]);
  });
  filter = `${parts.join(";")};${names.slice(0, 3).join("")}amix=inputs=3:normalize=0,highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=3,apad=whole_dur=${DUR},asplit[vo][key];` +
    `${names.slice(3).join("")}amix=inputs=8:normalize=0,alimiter=limit=0.9[bom];[0:a]volume=-3dB[m];[m][key]sidechaincompress=threshold=0.02:ratio=8:attack=15:release=350[duck];[duck][vo][bom]amix=inputs=3:normalize=0[mix]`;
} else console.log("no voice-golpes.mp3 here: music and effects only");
srt.sort((a, b) => a[0] - b[0]);
writeFileSync("out/golpe-doble.srt", srt.map(([a, b, t], i) => `${i + 1}\n${ts(a)} --> ${ts(Math.min(b, (srt[i + 1]?.[0] ?? DUR) - 0.02))}\n${t}\n`).join("\n"));
ff([...inputs, "-filter_complex", filter, "-map", "[mix]", "-t", String(DUR), "-ar", "48000", "out/golpes-premix.wav"]);
const m1 = ff(["-i", "out/golpes-premix.wav", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"]), j = JSON.parse(m1.slice(m1.lastIndexOf("{")));
ff(["-i", "out/golpes-premix.wav", "-af", `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`, "-ar", "48000", "out/golpes-mix.wav"]);
ff(["-i", picture, "-i", "out/golpes-mix.wav", "-map", "0:v", "-map", "1:a", "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-profile:v", "high", "-r", "60",
  "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", "-t", String(DUR), out]);
const m2 = ff(["-i", out, "-af", "ebur128=peak=true", "-f", "null", "-"]);
console.log(out, m2.match(/I:\s+-?[\d.]+ LUFS/g)?.pop(), m2.match(/Peak:\s+-?[\d.]+ dBFS/g)?.pop());
