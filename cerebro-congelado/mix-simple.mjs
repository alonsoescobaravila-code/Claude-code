// A one-take mix: narration from the start, the score ducked under it, about -14 LUFS, H.264 + AAC, bt709.
//   node mix-simple.mjs picture.mp4 music.wav voice.wav out.mp4 [voiceDelaySeconds]
import { spawnSync } from "node:child_process";
const [pic, music, voice, out, delay = "0.1"] = process.argv.slice(2);
const ff = (a) => { const r = spawnSync("ffmpeg", ["-hide_banner", "-y", ...a], { encoding: "utf8" }); if (r.status) throw new Error(r.stderr.slice(-2000)); return r.stderr; };
const dur = String(Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", pic], { encoding: "utf8" }).stdout));
ff(["-i", music, "-i", voice, "-filter_complex", `[1:a]aresample=48000,highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=3,adelay=${Math.round(delay * 1000)}:all=1,apad,asplit[vo][key];[0:a]volume=-4dB[m];[m][key]sidechaincompress=threshold=0.02:ratio=8:attack=15:release=350[duck];[duck][vo]amix=inputs=2:normalize=0:duration=first[mix]`, "-map", "[mix]", "-t", dur, "-ar", "48000", "out/_premix.wav"]);
const m1 = ff(["-i", "out/_premix.wav", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"]), j = JSON.parse(m1.slice(m1.lastIndexOf("{")));
ff(["-i", "out/_premix.wav", "-af", `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`, "-ar", "48000", "out/_mix.wav"]);
ff(["-i", pic, "-i", "out/_mix.wav", "-map", "0:v", "-map", "1:a", "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-profile:v", "high",
  "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", "-t", dur, out]);
const m2 = ff(["-i", out, "-af", "ebur128=peak=true", "-f", "null", "-"]);
console.log(out, m2.match(/I:\s+-?[\d.]+ LUFS/g)?.pop(), m2.match(/Peak:\s+-?[\d.]+ dBFS/g)?.pop());
