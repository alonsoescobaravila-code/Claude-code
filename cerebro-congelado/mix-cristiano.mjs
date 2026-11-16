// MIX for "Una semana siendo Cristiano": the score, plus (when voice-cristiano.mp3 is here) Mark's
// narration cut at its pauses, each line starting with its day; the shouted "¡Siuuu!" lands on the
// jump's landing. Never faster than 1.2x. About -14 LUFS, H.264 + AAC, bt709.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";

const DUR = 28;
const LINES = ["Día uno. Despiertas… ¡en el cuerpo de Cristiano Ronaldo!", "Día dos. Fuerza de sobra.", "Día cuatro. Tú no sabes patear… pero su cuerpo sí.", "Día cinco. Ya no puedes ni salir a comprar pan.",
  "Día seis. Pollo, siesta y baño de hielo.", "Día siete. Quieres tu vida de vuelta… pero él está feliz en tu sofá.", "¿Tú cambiarías?", "¡Siuuuu!"];
const START = [0.25, 4.2, 8.2, 12.2, 16.2, 20.2, 23.85, 25.45], ROOM = [3.8, 3.8, 3.8, 3.8, 3.8, 3.55, 1.55, 2.4];
const ff = (args) => { const r = spawnSync("ffmpeg", ["-hide_banner", "-y", ...args], { encoding: "utf8" }); if (r.status) throw new Error(r.stderr.slice(-2500)); return r.stderr; };
const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }));
const voice = ["voice-cristiano.mp3", "voice-cristiano.wav"].find((f) => existsSync(f));
const ts = (s) => { const ms = Math.round(s * 1000), p = (n, w = 2) => String(n).padStart(w, "0"); return `00:00:${p(Math.floor(ms / 1000))},${p(ms % 1000, 3)}`; };
let inputs = ["-i", "out/cristiano-music.wav"], filter = "[0:a]anull[mix]", srt = [];
if (voice) {
  // the take's speech chunks, read off silencedetect (-38 dB, 0.2 s); each line is its chunks joined
  // with the long pauses inside it cut down to GAP, so no line needs more than 1.2x
  const GROUPS = [[[0, 0.84], [1.24, 2.2], [2.4, 4.74]], [[5.27, 6.17], [6.42, 7.85]], [[8.25, 9.1], [9.38, 10.73], [11.04, 12.24]], [[12.64, 13.61], [13.86, 16.3]],
    [[16.72, 17.7], [17.98, 20.57]], [[20.95, 21.85], [22.19, 23.71], [24.01, 26.12]], [[26.58, 27.5]], [[27.72, 28.98]]];
  const GAP = 0.16;
  START[5] = 20.1; ROOM[5] = 4.3; START[6] = 24.5; ROOM[6] = 0.92;
  inputs.push("-i", voice);
  const parts = GROUPS.map((g, i) => {
    const chunks = g.map(([a, b], k) => `[1:a]atrim=${a}:${b},asetpts=PTS-STARTPTS,afade=t=in:d=0.015,afade=t=out:st=${Math.max(0, b - a - 0.03)}:d=0.03${k < g.length - 1 ? `,apad=pad_dur=${GAP}` : ""}[c${i}_${k}]`);
    const L = g.reduce((t, [a, b]) => t + b - a, 0) + GAP * (g.length - 1), tempo = Math.min(1.2, Math.max(1, L / ROOM[i]));
    srt.push([START[i], START[i] + L / tempo, LINES[i]]);
    console.log(`line ${i + 1}  ${L.toFixed(2)}s  room ${ROOM[i]}s  tempo ${tempo.toFixed(2)}  ${L / tempo <= ROOM[i] + 0.1 ? "fits" : "OVERRUNS by " + (L / tempo - ROOM[i]).toFixed(2) + "s"}`);
    return `${chunks.join(";")};${g.map((_, k) => `[c${i}_${k}]`).join("")}concat=n=${g.length}:v=0:a=1${tempo > 1.001 ? `,atempo=${tempo.toFixed(4)}` : ""}${i === 7 ? ",volume=3dB,aecho=0.8:0.6:120|240:0.3|0.18" : ""},adelay=${Math.round(START[i] * 1000)}:all=1[v${i}]`;
  });
  const segs = GROUPS;
  filter = `${parts.join(";")};${segs.map((_, i) => `[v${i}]`).join("")}amix=inputs=${segs.length}:normalize=0,highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=3,apad=whole_dur=${DUR},asplit[vo][key];` +
    `[0:a]volume=-2dB[m];[m][key]sidechaincompress=threshold=0.02:ratio=8:attack=15:release=350[duck];[duck][vo]amix=inputs=2:normalize=0[mix]`;
} else console.log("no voice-cristiano.mp3 here: music only");
writeFileSync("out/cristiano.srt", srt.map(([a, b, t], i) => `${i + 1}\n${ts(a)} --> ${ts(Math.min(b + 0.25, (srt[i + 1]?.[0] ?? DUR) - 0.02))}\n${t}\n`).join("\n"));
ff([...inputs, "-filter_complex", filter, "-map", "[mix]", "-t", String(DUR), "-ar", "48000", "out/cristiano-premix.wav"]);
const m1 = ff(["-i", "out/cristiano-premix.wav", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"]), j = JSON.parse(m1.slice(m1.lastIndexOf("{")));
ff(["-i", "out/cristiano-premix.wav", "-af", `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`, "-ar", "48000", "out/cristiano-mix.wav"]);
ff(["-i", "out/cristiano-picture.mp4", "-i", "out/cristiano-mix.wav", "-map", "0:v", "-map", "1:a", "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-profile:v", "high", "-r", "60",
  "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", "-t", String(DUR), "out/semana-cristiano.mp4"]);
const m2 = ff(["-i", "out/semana-cristiano.mp4", "-af", "ebur128=peak=true", "-f", "null", "-"]);
console.log("out/semana-cristiano.mp4", m2.match(/I:\s+-?[\d.]+ LUFS/g)?.pop(), m2.match(/Peak:\s+-?[\d.]+ dBFS/g)?.pop());
