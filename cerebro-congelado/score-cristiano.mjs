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


// --- UNA SEMANA SIENDO CRISTIANO. 56 beats, a bar every 4. Days cut on beats 8, 16, 24, 32, 40.
// A bright original tune in G that changes clothes every day: a music box for waking up, a stomp for
// the gym, a stadium chant for the pitch, a pizzicato chase for the fans, shivering bells in the tub,
// a lazy sofa groove, and one huge chord for the SIUUU (beat 51).
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const nm = (midi) => NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
const snare = (beat, vel = 0.22) => { noise(beat, 0.14, vel, 0.1, (t) => Math.exp(-t * 28), 0.8); add(beat * BEAT, 0.1, 0, (t) => vel * 0.6 * Math.sin(TAU * 190 * t) * Math.exp(-t * 40)); };
const clap = (beat, vel = 0.2) => { for (let i = 0; i < 3; i++) noise(beat + i * 0.02, 0.08, vel, 0, (t) => Math.exp(-t * 40), 0.9); };
const run = (start, notes, vel = 0.42, step = 0.5) => notes.forEach((n, i) => { if (n) marimba(start + i * step, n, vel * (i % 2 ? 0.8 : 1), i % 2 ? 0.25 : -0.25); });
const MOTIF = ["G5", "B5", "D6", "B5", "C6", "A5", "G5", null]; // the tune: up, a step down, home
// day 1 (0-8): a music box, then the swap (beat 3.2) and the sit-up (beat 4)
MOTIF.forEach((n, i) => n && i < 6 && bell(i * 0.5, n, 0.16, 0.2, 2.5));
for (let i = 0; i < 6; i++) noise(1.3 + i * 0.25, 0.05, 0.06, 0.5, (t) => Math.exp(-t * 60), 0.95); // the alarm clock
sweep(2.2, 0.55, 300, 3200, 0.12, 0, (t, T) => (t / T) ** 2); for (let i = 0; i < 8; i++) bell(2.4 + i * 0.1, nm(79 + i * 2), 0.07, (i % 2) - 0.5, 6);
["G3", "B3", "D4", "G4"].forEach((n) => marimba(4, n, 0.4)); bass(4, "G1", 1.5, 0.7); kick(4, 0.9); bell(4, "G6", 0.2, 0, 3);
run(4.5, ["D6", "B5", "G5", "A5", "B5", "A5", "G5"], 0.34); bass(6, "D2", 1.5, 0.5); kick(6, 0.6);
// day 2 (8-16): the gym stomp; the lift lands on beat 11
for (let b = 8; b < 16; b++) { kick(b, 0.7); if (b % 2) clap(b, 0.18); bass(b, b < 12 ? "G1" : "C2", 0.8, 0.5); }
sweep(10.2, 0.8, 120, 900, 0.1, 0, (t, T) => (t / T) ** 2);
["G2", "D3", "G3", "B3", "D4"].forEach((n) => marimba(11, n, 0.38)); noise(11, 0.4, 0.3, 0, (t) => Math.exp(-t * 9), 0.6); // the bar overhead
run(12, ["G5", "B5", "D6", "G6", "D6", "B5", "G5", null], 0.32);
// day 4 (16-24): a stadium chant, the kick on beat 19, the net at 20, the crowd
for (let b = 16; b < 24; b++) { kick(b, b === 19 ? 1 : 0.55); if (b % 2) clap(b, 0.16); bass(b, ["C2", "C2", "D2", "D2"][(b - 16) % 4], 0.8, 0.45); }
run(16, ["E5", "G5", "C6", null, "D6", "B5", "G5", null], 0.32);
add(19 * BEAT, 0.25, 0, (t) => 0.7 * Math.sin(TAU * (70 * t + 4 * (1 - Math.exp(-t * 30)))) * Math.exp(-t * 18)); // the boot on the ball
sweep(19.05, 0.5, 900, 2200, 0.08, 0.5); noise(20, 0.3, 0.25, 0.6, (t) => Math.exp(-t * 10), 0.7); // the swoosh, the net
noise(20.1, 3.2, 0.16, 0, (t) => Math.min(1, t * 4) * Math.exp(-t * 0.9), 0.35); // the crowd roars
["C4", "E4", "G4", "C5"].forEach((n) => marimba(20, n, 0.36)); bell(20, "C7", 0.16, 0.3, 3);
// day 5 (24-32): sneaking to the bakery, then the chase (fans on beat 27)
for (let i = 0; i < 6; i++) marimba(24 + i * 0.5, ["G4", null, "A4", null, "B4", null][i] || "G4", i % 2 ? 0.12 : 0.22, -0.3);
bass(24, "G2", 0.4, 0.4); bass(25, "A2", 0.4, 0.4); bass(26, "B2", 0.4, 0.4);
["G#3", "B3", "D4", "F4"].forEach((n) => marimba(27, n, 0.4)); kick(27, 1); bell(27, "G#6", 0.2, 0, 3);
for (let b = 27.5; b < 32; b += 0.25) { marimba(b, nm(67 + [0, 3, 5, 7, 8, 7, 5, 3][Math.round((b - 27.5) * 4) % 8]), 0.16, (b * 4) % 2 ? 0.4 : -0.4); if (b % 1 === 0) kick(b, 0.6); if ((b * 2) % 2 === 1) snare(b, 0.12); }
for (let i = 0; i < 14; i++) noise(28 + i * 0.29, 0.03, 0.18, (i % 3) - 1, (t) => Math.exp(-t * 160), 0.98); // phone shutters
// day 6 (32-40): the pizza poofs (34), the sad broccoli, the plunge (37), shivering bells
run(32, ["E5", "G5", "A5", null], 0.3); bass(32, "A2", 1.5, 0.4);
noise(34, 0.3, 0.2, -0.3, (t) => Math.exp(-t * 14), 0.6); bell(34, "A4", 0.2, 0, 4);
bone(34.6, "E4", 0.8); bone(35.5, "D#4", 1.3, 2);
sweep(36.3, 0.7, 300, 1400, 0.1, 0.4, (t, T) => Math.sin((Math.PI * t) / T));
noise(37, 0.6, 0.45, 0.4, (t) => Math.exp(-t * 6), 0.5); add(37 * BEAT, 0.4, 0, (t) => 0.6 * Math.sin(TAU * (55 * t)) * Math.exp(-t * 10)); // the splash
for (let i = 0; i < 20; i++) bell(37.4 + i * 0.13, i % 2 ? "C7" : "B6", 0.08 * Math.exp(-i * 0.04), i % 2 ? 0.6 : -0.6, 9);
// day 7 (40-56): a lazy sofa groove, the crouch, the jump, SIUUU on beat 51
for (let b = 40; b < 48; b++) { kick(b, 0.45); if (b % 2) snare(b, 0.12); bass(b, ["G2", "E2", "C2", "D2"][Math.floor((b - 40) / 2) % 4], 0.9, 0.35); }
run(40, ["B4", null, "D5", "B4", "A4", null, "G4", null, "B4", null, "D5", "E5", "D5", null, "B4", null], 0.22);
for (let b = 48; b < 51; b++) { bass(b, nm(43 + (b - 48) * 2), 0.9, 0.5); kick(b, 0.7); }
for (let t = 48, step = 0.5; t < 50.8; t += step, step = Math.max(0.08, step * 0.8)) snare(t, 0.1 + 0.03 * (t - 48));
sweep(48.6, 1.2, 150, 2600, 0.12, 0, (t, T) => (t / T) ** 1.7);
["G2", "D3", "G3", "B3", "D4", "G4", "B4"].forEach((n) => marimba(51, n, 0.4)); bass(51, "G1", 3, 0.85); kick(51, 1.2); noise(51, 2.6, 0.25, 0, (t) => Math.min(1, t * 6) * Math.exp(-t * 1.0), 0.35);
bell(51, "G6", 0.22, 0.3, 2); bell(51.03, "D7", 0.18, -0.3, 2);
run(52, ["G5", "B5", "D6", "G6", "D6", "B5", "G5", null], 0.32); ["G3", "B3", "D4", "G4", "B4"].forEach((n, i) => marimba(55 + i * 0.03, n, 0.36)); bass(55, "G1", 2, 0.5);
function bone(beat, note, len, drop = 0) { const f0 = hz(m(note)); let ph = 0; add(beat * BEAT, len * BEAT, -0.1, (t) => { const T = len * BEAT, f = f0 * 2 ** ((-drop * Math.max(0, t / T - 0.3)) / 12) * (1 + 0.012 * Math.sin(TAU * 5.5 * t)); ph += (TAU * f) / SR; const e = Math.min(1, t * 30) * Math.min(1, (T - t) * 14); return 0.2 * e * (Math.sin(ph) + 0.5 * Math.sin(2 * ph) + 0.33 * Math.sin(3 * ph) + 0.2 * Math.sin(4 * ph)); }); }

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
mkdirSync("out", { recursive: true }); writeFileSync("out/cristiano-music.wav", buf);
console.log(`out/cristiano-music.wav  ${DUR}s  ${SR} Hz stereo  raw peak ${peak.toFixed(2)}`);
