import { writeFileSync, mkdirSync } from "node:fs";

const SR = 48000, BEAT = 0.5, DUR = 50, N = SR * DUR;
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


// --- YESTERDAY, O LOS HUEVOS REVUELTOS. An original, gentle score (not the song's melody): a
// fingerpicked guitar and a soft string pad in D, felt at 60 bpm on the 120 grid (a chord every 4 beats).
// Cuts on beats 10, 20, 31, 43, 61, 73, 89; "¿la copié?" 29, "no" 40, "huevos revueltos" 54, solo Paul 84.
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const nm = (midi) => NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
const pluck = (beat, note, vel = 0.2, pan = 0, len = 1.6) => { const f = hz(m(note)), n = Math.max(2, Math.round(SR / f)), buf = new Float32Array(n); for (let i = 0; i < n; i++) buf[i] = rnd() * 2 - 1; let k = 0;
  add(beat * BEAT, len, pan, () => { const a = buf[k], b = buf[(k + 1) % n]; buf[k] = 0.5 * (a + b) * 0.997; k = (k + 1) % n; return vel * a; }); };
const strings = (beat, notes, len, vel = 0.05) => notes.forEach((n, j) => { const f = hz(m(n)); add(beat * BEAT, len * BEAT + 0.6, (j - 1.5) * 0.35, (t) => { const T = len * BEAT + 0.6, e = Math.min(1, t * 1.2) * Math.min(1, (T - t) * 1.5), vib = 1 + 0.004 * Math.sin(TAU * 5 * t);
  return vel * e * (Math.sin(TAU * f * vib * t) + 0.45 * Math.sin(TAU * 2 * f * vib * t) + 0.25 * Math.sin(TAU * 3 * f * t) + 0.12 * Math.sin(TAU * 4 * f * t)); }); });
const CH = [["D3", "A3", "D4", "F#4"], ["B2", "F#3", "B3", "D4"], ["G2", "D3", "G3", "B3"], ["A2", "E3", "A3", "C#4"], ["F#2", "C#3", "F#3", "A3"], ["G2", "D3", "G3", "B3"], ["E2", "B2", "E3", "G3"], ["A2", "E3", "A3", "C#4"]];
const PICK = [0, 2, 1, 3, 2, 1, 3, 2]; // a thumb-and-fingers pattern, eighth notes
for (let bar = 0; bar < 25; bar++) {
  const b0 = bar * 4, ch = CH[bar % 8];
  for (let i = 0; i < 8; i++) pluck(b0 + i * 0.5, ch[PICK[i]], i === 0 ? 0.2 : 0.11, (PICK[i] - 1.5) * 0.25, 1.4);
  if (bar >= 2) strings(b0, ch.map((n) => nm(m(n) + 12)), 4, bar >= 21 ? 0.045 : 0.03);
}
// small accents
for (const b of [10, 20, 31, 43, 61, 73, 89]) bell(b, "A5", 0.05, 0.3, 4);
bell(29, "F#5", 0.08, 0, 3); bell(29.5, "E5", 0.06, 0, 3); // "¿la copié?"
add(40 * BEAT, 0.25, 0, (t) => 0.3 * Math.sin(TAU * 110 * t) * Math.exp(-t * 14)); // "no"
for (let i = 0; i < 3; i++) pluck(54 + i * 0.12, ["D5", "F#5", "A5"][i], 0.18, 0, 1.2); // "huevos revueltos"
strings(84, ["D4", "F#4", "A4", "D5"], 5, 0.05); // solo Paul: the quartet swells
["D3", "A3", "D4", "F#4", "A4", "D5"].forEach((n, i) => pluck(96 + i * 0.06, n, 0.15, 0, 4));
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
mkdirSync("out", { recursive: true }); writeFileSync("out/yesterday-music.wav", buf);
console.log(`out/yesterday-music.wav  ${DUR}s  ${SR} Hz stereo  raw peak ${peak.toFixed(2)}`);
