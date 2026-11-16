import { writeFileSync, mkdirSync } from "node:fs";

const SR = 48000, BEAT = 0.5, DUR = 28, N = SR * DUR;
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


// --- GOLPE DOBLE. 56 beats. Hits on beats 7, 11, 15, 19, 24, 29, 34 and 43; the shrug on 51.
// A minor funk riff that climbs a semitone after every punch, stops dead before each hit, and
// ends in a boom, a sad trombone and a ta-da.
const HIT = [7, 11, 15, 19, 24, 29, 34, 43];
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const nm = (midi) => NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
const snare = (beat, vel = 0.25) => { noise(beat, 0.14, vel, 0.1, (t) => Math.exp(-t * 28), 0.8); add(beat * BEAT, 0.1, 0, (t) => vel * 0.6 * Math.sin(TAU * 190 * t) * Math.exp(-t * 40)); };
const groove = (from, to, root) => { // root = midi of the bass note; plays whole and half beats in [from, to)
  for (let b = from; b < to - 0.01; b += 0.5) {
    const i = Math.round((b - from) * 2), pat = [0, 12, 7, 10, 0, 12, 3, 5][i % 8];
    bass(b, nm(root + pat), 0.42, 0.42); shaker(b, i % 2 ? 0.07 : 0.04);
    if (i % 2 === 0) kick(b, 0.6); if (i % 4 === 2) snare(b, 0.2);
    if (i % 4 === 1 || i % 8 === 6) [0, 3, 7].forEach((n, j) => marimba(b, nm(root + 24 + n), 0.22, (j - 1) * 0.5));
  }
  [12, 15, 19, 22, 19, 15].forEach((n, j) => { const b = from + 0.25 + j * 0.5; if (b < to - 0.6) marimba(b, nm(root + 24 + n), 0.16, 0.3); });
};
const impactHit = (beat, k) => {
  const v = 0.55 + 0.09 * k;
  sweep(beat - 0.35, 0.17, 300, 1600 + 150 * k, 0.1 + 0.015 * k, 0, (t, T) => (t / T) ** 2); // the fist through the air
  add(beat * BEAT, 0.5 + 0.12 * k, 0, (t) => v * Math.sin(TAU * ((60 - 3 * k) * t + ((160 - 8 * k) / 22) * (1 - Math.exp(-t * 22)))) * Math.exp(-t * (11 - k)));
  noise(beat, 0.1 + 0.05 * k, 0.3 + 0.05 * k, 0, (t) => Math.exp(-t * (40 - 4 * k)), 0.6);
  [0, 3, 6, 9].forEach((n) => marimba(beat, nm(52 + k + n), 0.3)); // a diminished stab, a semitone higher each time
};
let root = 28; // E1
const sect = [[0, 7], [7, 11], [11, 15], [15, 19], [19, 24], [24, 29], [29, 34], [34, 36]];
sect.forEach(([a, b], i) => { groove(a + (i ? 0.5 : 0), b - 0.5, root + 12 + i); });
HIT.slice(0, 7).forEach((b, k) => impactHit(b, k));
// rag-doll noises: fly-bys, the bits bouncing around, the wall
sweep(19.2, 1.2, 900, 300, 0.07, 0.8, (t, T) => Math.sin((Math.PI * t) / T)); sweep(20.6, 0.9, 300, 700, 0.06, -0.8, (t, T) => Math.sin((Math.PI * t) / T));
for (let i = 0; i < 4; i++) sweep(24.15 + i * 0.75 + i * i * 0.08, 0.45, 1400 - i * 200, 500, 0.08, i % 2 ? -0.8 : 0.8, (t, T) => Math.sin((Math.PI * t) / T));
for (let i = 0; i < 14; i++) { const b = 29.3 + i * 0.21 + rnd() * 0.1; marimba(b, nm(72 + Math.floor(rnd() * 12)), 0.13, rnd() * 1.6 - 0.8); noise(b, 0.03, 0.12, rnd() * 1.6 - 0.8, (t) => Math.exp(-t * 150), 0.9); }
for (let i = 0; i < 6; i++) marimba(32.3 + i * 0.18, nm(60 + i * 2), 0.2, 0); bell(33.4, "E6", 0.14, 0, 5); // back together: pop pop pop, ding
for (let i = 0; i < 10; i++) noise(34.55 + i * 0.045 + rnd() * 0.02, 0.04, 0.3 - i * 0.02, 0.6, (t) => Math.exp(-t * 120), 0.95); // the wall cracks
// the charge (36-43): the bass climbs every beat, a snare roll speeds up, a riser screams
for (let b = 36; b < 43; b++) { bass(b, nm(47 + (b - 36) * 2), 0.9, 0.5); kick(b, 0.7); [0, 3, 6].forEach((n) => marimba(b, nm(71 + (b - 36) * 2 + n), 0.2)); }
for (let t = 36, step = 0.5; t < 42.7; t += step, step = Math.max(0.06, step * 0.9)) snare(t, 0.1 + 0.02 * (t - 36));
sweep(36, 3.4, 120, 2600, 0.14, 0, (t, T) => (t / T) ** 1.6); sweep(38, 2.4, 240, 5200, 0.07, 0, (t, T) => (t / T) ** 2);
// punch 31: everything at once, then nothing
add(43 * BEAT, 3.6, 0, (t) => 1.1 * Math.sin(TAU * (34 * t + 9 * (1 - Math.exp(-t * 14)))) * Math.exp(-t * 1.3));
noise(43, 2.8, 0.55, 0, (t) => Math.exp(-t * 1.8), 0.25); noise(43, 0.5, 0.5, 0, (t) => Math.exp(-t * 9), 0.95);
["E1", "A#1", "E2", "G2", "A#2", "C#3"].forEach((n) => bass(43, n, 3, 0.3));
// the aftermath: a sad trombone (45-49), then a sheepish ta-da on the shrug (51)
const bone = (beat, note, len, drop = 0) => { const f0 = hz(m(note)); let ph = 0; add(beat * BEAT, len * BEAT, -0.1, (t) => { const T = len * BEAT, f = f0 * 2 ** ((-drop * Math.max(0, t / T - 0.3)) / 12) * (1 + 0.012 * Math.sin(TAU * 5.5 * t)); ph += (TAU * f) / SR; const e = Math.min(1, t * 30) * Math.min(1, (T - t) * 14); return 0.22 * e * (Math.sin(ph) + 0.5 * Math.sin(2 * ph) + 0.33 * Math.sin(3 * ph) + 0.2 * Math.sin(4 * ph) + 0.1 * Math.sin(5 * ph)); }); };
bone(45, "D4", 0.9); bone(46, "C#4", 0.9); bone(47, "C4", 0.9); bone(48, "B3", 2.4, 3);
["C4", "E4", "G4", "C5"].forEach((n, i) => marimba(51 + i * 0.04, n, 0.4, (i - 1.5) * 0.4)); bell(51, "G6", 0.2, 0.2, 4); bell(51.25, "C7", 0.2, -0.2, 3.5); bass(51, "C2", 1.5, 0.5); kick(51, 0.7);
run(52, ["E5", "G5", "C6", null, "G5", "C6"], 0.3); ["C4", "E4", "G4", "C5", "E5"].forEach((n, i) => marimba(55 + i * 0.03, n, 0.36)); bass(55, "C2", 2, 0.5);
function run(start, notes, vel = 0.42, step = 0.5) { notes.forEach((n, i) => { if (n) marimba(start + i * step, n, vel * (i % 2 ? 0.8 : 1), i % 2 ? 0.25 : -0.25); }); }

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
mkdirSync("out", { recursive: true }); writeFileSync("out/golpes-music.wav", buf);
console.log(`out/golpes-music.wav  ${DUR}s  ${SR} Hz stereo  raw peak ${peak.toFixed(2)}`);
