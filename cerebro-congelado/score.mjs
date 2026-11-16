// SCORE for "Cerebro congelado". Synthesises out/music.wav from arithmetic alone: no samples,
// no clock, a seeded noise source. An original tune.
//
// Grid: 120 bpm, a beat is 0.5 s (30 frames at 60 fps), a bar is 2 s. The film is 13 bars = 52 beats.
// Cuts (bar lines):   beat 0 bite | 8 freeze | 16 palate | 28 nerve | 40 trick | 52 end
// Accents (beats):    4 the bite | 11 the freeze | 19 ice on the palate | 23 vessels squeeze |
//                     31 vessels burst open | 33 the alarm | 48 thumbs up
import { writeFileSync, mkdirSync } from "node:fs";

const SR = 48000, BEAT = 0.5, DUR = 26, N = SR * DUR;
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

// --- the tune
const run = (start, notes, vel = 0.42, step = 0.5) => notes.forEach((n, i) => { if (n) marimba(start + i * step, n, vel * (i % 2 ? 0.8 : 1), i % 2 ? 0.25 : -0.25); });
// shot 1 (beats 0-7): a sunny tune in C; the bite lands on beat 4
run(0, ["E5", "G5", "C6", "G5", "E5", "G5", "C6", "E6"]);
bass(0, "C2", 1.5); bass(2, "G2", 1.5); pad(0, ["C4", "E4", "G4"], 4, 0.05);
["C4", "E4", "G4", "C5"].forEach((n) => marimba(4, n, 0.4)); bass(4, "C2", 1, 0.7); kick(4, 0.9); // the bite
run(4.5, ["D6", "B5", "G5", "B5", "A5", "G5", "E5"]); bass(6, "G2", 1.5); pad(4, ["B3", "D4", "G4"], 4, 0.05);
for (const b of [0, 2, 6]) kick(b, 0.55); for (let b = 0.5; b < 8; b += 0.5) shaker(b, b % 1 ? 0.07 : 0.04);
// shot 2 (beats 8-15): the tune starts again and is cut off; the freeze lands on beat 11
run(8, ["E5", "G5", "C6", "G5", "E5"]); bass(8, "A1", 1.5); kick(8, 0.55); kick(10, 0.4); pad(8, ["A3", "C4", "E4"], 2.5, 0.05);
sweep(10.2, 0.4, 300, 2400, 0.12, 0, (t, T) => (t / T) ** 2); // the breath in
["B2", "D3", "F3", "G#3"].forEach((n) => bass(11, n, 2.5, 0.22)); kick(11, 1); // the freeze: a diminished stab...
["B6", "F7", "D7"].forEach((n, i) => bell(11 + i * 0.04, n, 0.24, (i - 1) * 0.6, 2)); // ...and ice on top
for (let i = 0; i < 18; i++) bell(11.6 + i * 0.22, i % 2 ? "C7" : "B6", 0.1 * Math.exp(-i * 0.09), i % 2 ? 0.6 : -0.6, 9); // shivering
// shot 3 (beats 16-27): curious and minor; ice touches the palate on 19, the vessels squeeze on 23
const arp = (b, ns, v = 0.3) => run(b, [...ns, ...ns], v);
arp(16, ["A4", "C5", "E5", "C5"]); bass(16, "A2", 3, 0.42); pad(16, ["A3", "C4", "E4"], 4, 0.06);
bell(19, "E6", 0.3, 0.2, 2.5); bell(19.03, "B6", 0.18, -0.4, 3); kick(19, 0.5);
arp(20, ["F4", "A4", "C5", "A4"]); bass(20, "F2", 3, 0.42); pad(20, ["F3", "A3", "C4"], 4, 0.06);
sweep(22.2, 0.42, 660, 180, 0.2, 0, (t, T) => Math.min(1, t * 20) * (1 - 0.3 * (t / T))); kick(23, 0.8); bass(23, "D2", 1, 0.6); // squeezed
run(24, ["D4", null, "F4", null, "A4", null, "F4", null], 0.24); bass(24, "D2", 4, 0.3); pad(24, ["D3", "F3", "A3"], 4, 0.05);
for (let b = 16; b < 28; b += 1) shaker(b + 0.5, 0.03);
// shot 4 (beats 28-39): pressure builds on E; the vessels burst open on 31; the alarm rings from 33
for (let i = 0; i < 6; i++) bass(28 + i * 0.5, "E2", 0.4, 0.22 + i * 0.07);
pad(28, ["E3", "G#3", "B3"], 3, 0.07); sweep(29.6, 0.7, 200, 1800, 0.16, 0, (t, T) => (t / T) ** 2);
["E3", "G#3", "B3", "E4", "G#4", "B4"].forEach((n) => marimba(31, n, 0.36)); bass(31, "E1", 3, 0.8); kick(31, 1.1); noise(31, 0.7, 0.2, 0, (t) => Math.exp(-t * 6), 0.95);
for (let b = 33; b < 40; b += 0.5) { bell(b, (b * 2) % 2 ? "E6" : "B5", 0.2, (b * 2) % 2 ? 0.5 : -0.5, 6); }
for (let b = 32; b < 40; b++) { kick(b, 0.75); bass(b, b < 36 ? "E2" : "F2", 0.8, 0.45); }
pad(32, ["E3", "G#3", "B3", "D4"], 4, 0.07); pad(36, ["F3", "A3", "C4", "D#4"], 4, 0.07);
// shot 5 (beats 40-51): calm returns; the ice melts through 45-47; thumbs up on 48
run(40, ["F4", "A4", "C5", "A4"], 0.3, 1); bass(40, "F2", 3.5, 0.4); pad(40, ["F3", "A3", "C4"], 4, 0.07);
run(44, ["G4", "B4", "D5", "G5", "B5", "D6", "G6", null], 0.3); bass(44, "G2", 3.5, 0.45); pad(44, ["G3", "B3", "D4"], 3.5, 0.07);
["C3", "G3", "C4", "E4", "G4", "C5"].forEach((n) => marimba(48, n, 0.4)); bass(48, "C2", 2, 0.7); kick(48, 0.9); bell(48, "C7", 0.18, 0.3, 3);
run(48.5, ["E5", "G5", "C6", "E6", "D6", "G5"], 0.4); ["C4", "E4", "G4", "C5", "E5", "C6"].forEach((n, i) => marimba(51 + i * 0.03, n, 0.42)); bass(51, "C2", 2, 0.6); kick(50, 0.55);
pad(48, ["C4", "E4", "G4"], 4, 0.06); for (let b = 48.5; b < 51; b += 0.5) shaker(b, 0.06);

// --- sound effects, cued by film frame (frame / 30 = beat)
const F = (frame) => frame / 30;
noise(F(120), 0.11, 0.5, 0, (t) => Math.exp(-t * 45), 0.25); noise(F(121), 0.05, 0.25, 0.2, (t) => Math.exp(-t * 90), 0.95); // chomp
for (const fr of [150, 170, 190, 210, 230]) noise(F(fr), 0.05, 0.1, 0, (t) => Math.exp(-t * 80), 0.3); // chewing
for (let i = 0; i < 9; i++) noise(F(314 + i * 3) , 0.03, 0.22, (i % 3) - 1, (t) => Math.exp(-t * 160), 0.97); // ice cracking out
noise(F(570), 0.12, 0.25, 0.1, (t) => Math.exp(-t * 30), 0.2); // the squish onto the palate
for (let i = 0; i < 5; i++) bell(F(584 + i * 9), ["E7", "G7", "B7", "G7", "E7"][i], 0.06, i * 0.3 - 0.6, 12); // frost crystals
for (let k = 0; k < 8; k++) sweep(F(950 + k * 30), 0.3, 500, 1500, 0.07, -0.3, (t, T) => Math.sin((Math.PI * t) / T)); // nerve pulses
for (let i = 0; i < 3; i++) sweep(F(1392 + i * 12), 0.09, 1400, 500, 0.12, [-0.5, 0, 0.5][i], (t, T) => Math.exp(-t * 20)); // melt drops
bell(F(1440), "G6", 0.2, 0, 4); bell(F(1446), "C7", 0.2, 0.2, 3.5); // thumbs up: ding

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
mkdirSync("out", { recursive: true }); writeFileSync("out/music.wav", buf);
console.log(`out/music.wav  ${DUR}s  ${SR} Hz stereo  raw peak ${peak.toFixed(2)}`);
