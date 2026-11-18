import { writeFileSync, mkdirSync } from "node:fs";

const SR = 48000, BEAT = 0.5, DUR = 42, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N);
let seed = 12345;
const rnd = () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const NOTE = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
const m = (name) => { const [, n, o] = name.match(/^([A-G]#?)(-?\d)$/); return NOTE[n] + 12 * (Number(o) + 1); };
/** add a mono voice into the mix at time t (seconds), pan -1..1 */
const add = (t, len, pan, fn) => {
  const i0 = Math.round(t * SR), n = Math.round(len * SR), gl = Math.cos(((pan + 1) * Math.PI) / 4), gr = Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < n; i++) { const k = i0 + i; if (k < 0 || k >= N) continue; const s = fn(i / SR, i); L[k] += s * gl; R[k] += s * gr; }
};
const TAU = Math.PI * 2;
// --- instruments
const marimba = (beat, note, vel = 0.5, pan = 0) => { const f = hz(m(note)); add(beat * BEAT, 0.9, pan, (t) => vel * (Math.sin(TAU * f * t) * Math.exp(-t * 7) + 0.35 * Math.sin(TAU * f * 4 * t) * Math.exp(-t * 26) + 0.12 * Math.sin(TAU * f * 10 * t) * Math.exp(-t * 60)) * Math.min(1, t * 900)); };
const bell = (beat, note, vel = 0.3, pan = 0, decay = 3) => { const f = hz(m(note)); add(beat * BEAT, 2.2, pan, (t) => vel * Math.sin(TAU * f * t + 2.2 * Math.exp(-t * 5) * Math.sin(TAU * f * 3.01 * t)) * Math.exp(-t * decay) * Math.min(1, t * 1500)); };
const bass = (beat, note, len = 1, vel = 0.5) => { const f = hz(m(note)); add(beat * BEAT, len * BEAT + 0.08, 0, (t) => { const e = Math.min(1, t * 200) * Math.min(1, Math.max(0, (len * BEAT + 0.08 - t) * 25)); return vel * e * (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * 2 * f * t) * Math.exp(-t * 5)); }); };
const pad = (beat, notes, len, vel = 0.1) => notes.forEach((n, j) => { const f = hz(m(n)); add(beat * BEAT, len * BEAT + 0.4, (j - 1) * 0.4, (t) => { const T = len * BEAT + 0.4, e = Math.min(1, t * 6) * Math.min(1, (T - t) * 3); return vel * e * (Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 1.004 * t) + 0.2 * Math.sin(TAU * 2 * f * t)); }); });
const kick = (beat, vel = 0.7) => add(beat * BEAT, 0.3, 0, (t) => vel * Math.sin(TAU * (48 * t + (110 / 28) * (1 - Math.exp(-t * 28)))) * Math.exp(-t * 13));
const noise = (beat, len, vel, pan, shape, hp = 0.5) => { let prev = 0, lp = 0; add(beat * BEAT, len, pan, (t) => { const w = rnd() * 2 - 1; lp += hp * (w - lp); const s = hp < 1 ? w - lp * (hp < 0.5 ? 0 : 1) : w; const o = hp < 0.5 ? lp : s; prev = o; return vel * o * shape(t); }); };
const shaker = (beat, vel = 0.1) => noise(beat, 0.06, vel, 0.3, (t) => Math.exp(-t * 70), 0.9);
const sweep = (beat, len, f0, f1, vel, pan = 0, shape = (t, T) => Math.sin((Math.PI * t) / T)) => { let ph = 0; add(beat * BEAT, len, pan, (t) => { const f = f0 * (f1 / f0) ** (t / len); ph += (TAU * f) / SR; return vel * Math.sin(ph) * shape(t, len); }); };


// --- LAS 4 PELÍCULAS DE LOS BEATLES. An original, 60s-flavoured beat-group tune (no Beatles melody):
// strummed plucked guitar, a walking bass, drums with tambourine. I–vi–IV–V in E, 120 bpm, 84 beats.
// Cuts on beats 9, 21, 28, 45, 55, 65, 71, 77; cast reveals 28.6, 33.2, 37.2, 41.4; clapper 67; date 71.
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const nm = (midi) => NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
// Karplus-Strong pluck, seeded: a steel-string guitar
const pluck = (beat, note, vel = 0.2, pan = 0, len = 1.2) => { const f = hz(m(note)), n = Math.max(2, Math.round(SR / f)), buf = new Float32Array(n); for (let i = 0; i < n; i++) buf[i] = rnd() * 2 - 1; let k = 0;
  add(beat * BEAT, len, pan, (t, i) => { const a = buf[k], b = buf[(k + 1) % n]; buf[k] = 0.5 * (a + b) * 0.996; k = (k + 1) % n; return vel * a * Math.min(1, (len - t) * 8); }); };
const strum = (beat, notes, vel = 0.12, down = true) => notes.forEach((n, i) => pluck(beat + (down ? i : notes.length - 1 - i) * 0.025, n, vel, (i - 2) * 0.15, 0.9));
const snare = (beat, vel = 0.2) => { noise(beat, 0.14, vel, 0.1, (t) => Math.exp(-t * 28), 0.8); add(beat * BEAT, 0.1, 0, (t) => vel * 0.6 * Math.sin(TAU * 190 * t) * Math.exp(-t * 40)); };
const tamb = (beat, vel = 0.05) => noise(beat, 0.08, vel, 0.4, (t) => Math.exp(-t * 45), 0.98);
const CH = { E: ["E3", "B3", "E4", "G#4", "B4"], Cm: ["C#3", "G#3", "C#4", "E4", "G#4"], A: ["A2", "E3", "A3", "C#4", "E4"], B: ["B2", "F#3", "B3", "D#4", "F#4"] };
const ROOT = { E: 40, Cm: 37, A: 33, B: 35 }, PROG = ["E", "Cm", "A", "B"];
for (let bar = 0; bar < 21; bar++) {
  const b0 = bar * 4, ch = PROG[bar % 4], quiet = b0 >= 76; // a lighter last bar under the question
  for (let q = 0; q < 4; q++) { const b = b0 + q; kick(b, q % 2 ? 0.35 : 0.5); if (q % 2) snare(b, 0.16); tamb(b + 0.5, 0.05); tamb(b, 0.03);
    strum(b, CH[ch], q === 0 ? 0.13 : 0.09, true); strum(b + 0.5, CH[ch].slice(2), 0.07, false);
    bass(b, nm(ROOT[ch] + [0, 4, 7, 9][q]), 0.85, 0.38); }
  if (quiet) break;
}
// an original lead line over the first and the last eight bars
const LEAD = ["B4", "G#4", "B4", "C#5", "B4", null, "G#4", "E4", "F#4", "G#4", "A4", null, "G#4", "F#4", "E4", null];
const lead = (from) => LEAD.forEach((n, i) => n && pluck(from + i * 0.5, n, 0.2, -0.3, 0.7));
lead(1); lead(9); lead(57);
// the hits on every cut, the cast reveals, the clapper, the date
for (const b of [9, 21, 28, 45, 55, 65, 71, 77]) { add(b * BEAT, 0.6, 0, (t) => 0.35 * Math.sin(TAU * (50 * t + 3 * (1 - Math.exp(-t * 20)))) * Math.exp(-t * 6)); bell(b, "E6", 0.06, 0, 4); }
[28.6, 33.2, 37.2, 41.4].forEach((b, i) => { sweep(b - 0.3, 0.3, 300, 2400, 0.06, 0, (t, T) => (t / T) ** 2); bell(b, ["E6", "G#6", "B6", "E7"][i], 0.14, (i - 1.5) * 0.4, 3); });
noise(67.07, 0.08, 0.5, 0, (t) => Math.exp(-t * 60), 0.9); // the clapper
for (let i = 0; i < 5; i++) bell(71.2 + i * 0.12, ["E5", "G#5", "B5", "E6", "G#6"][i], 0.1, 0, 3); // the calendar lands
["E3", "B3", "E4", "G#4", "B4", "E5"].forEach((n, i) => pluck(80 + i * 0.04, n, 0.16, 0, 3)); // the last chord rings
// --- soft limiter, fades, write 16-bit stereo
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = 0.85 / Math.max(peak, 1e-9), buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const fade = Math.min(1, i / (SR * 0.01), (N - i) / (SR * 0.25));
  buf.writeInt16LE(Math.round(Math.tanh(L[i] * g * 1.2) / Math.tanh(1.2) * fade * 32000), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.tanh(R[i] * g * 1.2) / Math.tanh(1.2) * fade * 32000), 46 + i * 4);
}
mkdirSync("out", { recursive: true }); writeFileSync("out/beatles-music.wav", buf);
console.log(`out/beatles-music.wav  ${DUR}s  ${SR} Hz stereo  raw peak ${peak.toFixed(2)}`);
