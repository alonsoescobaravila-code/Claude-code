// MIX for "Cerebro congelado": music (+ narration when voice.mp3 / voice.wav is in this folder),
// mixed to about -14 LUFS and joined to the picture as H.264 + AAC, tagged bt709.
//
// Narration: the file is cut at its pauses into one line per shot, each line starts with its shot,
// a line that does not fit is sped up by at most 1.2x, and the music ducks under the voice.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";

const FPS = 60, SHOTS = [0, 240, 480, 840, 1200, 1560].map((f) => f / FPS), LEAD = 0.3, TAIL = 0.15, MAX_TEMPO = 1.2;
const LINES = ["Das un gran mordisco de helado…", "¡Y de pronto se te congela el cerebro!", "El frío toca tu paladar, y los vasos sanguíneos se encogen.", "Después se abren de golpe, y un nervio le avisa a tu cerebro: ¡dolor!", "El truco: pega la lengua al paladar para calentarlo, y listo."];
const CAPTIONS = ["Un gran mordisco de helado…", "¡Y se te congela el cerebro!", "El frío toca tu paladar y los vasos se encogen", "Luego se abren de golpe y el nervio da la alarma", "Truco: pega la lengua al paladar"];
const ff = (args) => { const r = spawnSync("ffmpeg", ["-hide_banner", "-y", ...args], { encoding: "utf8" }); if (r.status) throw new Error(r.stderr.slice(-2000)); return r.stderr; };
const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }));
const voice = ["voice.mp3", "voice.wav"].find((f) => existsSync(f));
const picture = "out/picture.mp4", music = "out/music.wav", out = "out/cerebro-congelado.mp4";

let filter, inputs = ["-i", music], report = [];
if (voice) {
  // 1. find the pauses: the 4 longest silences inside the take are the line breaks
  const log = ff(["-i", voice, "-af", "silencedetect=noise=-38dB:d=0.18", "-f", "null", "-"]);
  const total = dur(voice), sil = [];
  const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((x) => +x[1]), ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((x) => +x[1]);
  starts.forEach((s, i) => { const e = ends[i] ?? total; if (s > 0.2 && e < total - 0.2) sil.push([s, e]); });
  if (sil.length < LINES.length - 1) throw new Error(`mix: found ${sil.length} pauses in ${voice}, need ${LINES.length - 1}`);
  // a comma can pause longer than a line break, so each break is the pause nearest to where the
  // text says it should fall (by share of letters), not simply one of the longest
  const chars = LINES.map((l) => l.length), sum = chars.reduce((a, b) => a + b, 0), cuts = [];
  let acc = 0;
  for (let i = 0; i < LINES.length - 1; i++) {
    acc += chars[i]; const want = (acc / sum) * total;
    const pick = sil.filter((s) => !cuts.includes(s) && (!cuts.length || s[0] > cuts[cuts.length - 1][1])).sort((a, b) => Math.abs((a[0] + a[1]) / 2 - want) - Math.abs((b[0] + b[1]) / 2 - want))[0];
    if (!pick) throw new Error(`mix: no pause left for the break after line ${i + 1}`);
    cuts.push(pick);
  }
  const first = starts[0] < 0.05 ? ends[0] : 0, lastSil = starts.length > ends.length || ends[ends.length - 1] > total - 0.05 ? starts[starts.length - 1] : total;
  const segs = LINES.map((_, i) => [i ? cuts[i - 1][1] - 0.04 : Math.max(0, first - 0.04), i < cuts.length ? cuts[i][0] + 0.08 : Math.min(total, lastSil + 0.1)]);
  // 2. each line starts with its shot; too long for the shot = sped up, never past 1.2x
  inputs.push("-i", voice);
  const parts = segs.map(([a, b], i) => {
    const len = b - a, room = SHOTS[i + 1] - SHOTS[i] - LEAD - TAIL, tempo = Math.min(MAX_TEMPO, Math.max(1, len / room)), at = SHOTS[i] + LEAD;
    report.push({ line: i + 1, from: +a.toFixed(2), to: +b.toFixed(2), len: +len.toFixed(2), room: +room.toFixed(2), tempo: +tempo.toFixed(3), starts: at, ends: +(at + len / tempo).toFixed(2), fits: len / tempo <= room + TAIL });
    return `[1:a]atrim=${a}:${b},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st=${Math.max(0, len - 0.05)}:d=0.05${tempo > 1.001 ? `,atempo=${tempo.toFixed(4)}` : ""},adelay=${Math.round(at * 1000)}:all=1[v${i}]`;
  });
  filter = `${parts.join(";")};${segs.map((_, i) => `[v${i}]`).join("")}amix=inputs=${segs.length}:normalize=0,apad=whole_dur=26,highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=3,asplit[vo][key];` +
    `[0:a]volume=-5dB[m];[m][key]sidechaincompress=threshold=0.02:ratio=8:attack=15:release=350[duck];[duck][vo]amix=inputs=2:normalize=0[mix]`;
  // subtitles follow the narration
  const ts = (s) => { const ms = Math.round(s * 1000), p = (n, w = 2) => String(n).padStart(w, "0"); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };
  writeFileSync("out/cerebro-congelado.srt", report.map((r, i) => `${i + 1}\n${ts(r.starts)} --> ${ts(Math.min(r.ends + 0.3, SHOTS[i + 1] - 0.05))}\n${LINES[i]}\n`).join("\n"));
  console.table(report);
} else {
  filter = "[0:a]anull[mix]";
  const ts = (s) => { const ms = Math.round(s * 1000), p = (n, w = 2) => String(n).padStart(w, "0"); return `00:00:${p(Math.floor(ms / 1000))},${p(ms % 1000, 3)}`; };
  writeFileSync("out/cerebro-congelado.srt", CAPTIONS.map((c, i) => `${i + 1}\n${ts(SHOTS[i] + 0.1)} --> ${ts(SHOTS[i + 1] - 0.1)}\n${c}\n`).join("\n"));
  console.log("no voice.mp3 / voice.wav in this folder: music only");
}
// 3. loudness: measure, then normalise to -14 LUFS with a -1.5 dBTP ceiling (two-pass loudnorm)
ff([...inputs, "-filter_complex", filter, "-map", "[mix]", "-t", "26", "-ar", "48000", "out/premix.wav"]);
const m1 = ff(["-i", "out/premix.wav", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"]);
const j = JSON.parse(m1.slice(m1.lastIndexOf("{")));
ff(["-i", "out/premix.wav", "-af", `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`, "-ar", "48000", "out/mix.wav"]);
// 4. picture + sound: H.264 high, yuv420p, bt709 in the stream and the container, AAC
ff(["-i", picture, "-i", "out/mix.wav", "-map", "0:v", "-map", "1:a", "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-profile:v", "high", "-r", "60",
  "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", "-t", "26", out]);
const m2 = ff(["-i", out, "-af", "ebur128=peak=true", "-f", "null", "-"]);
console.log(out, m2.match(/I:\s+-?[\d.]+ LUFS/g)?.pop(), m2.match(/Peak:\s+-?[\d.]+ dBFS/g)?.pop());
