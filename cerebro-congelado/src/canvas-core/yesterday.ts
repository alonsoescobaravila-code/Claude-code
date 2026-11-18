// YESTERDAY, O LOS HUEVOS REVUELTOS. How Paul McCartney's "Yesterday" was written, in the documentary
// style: dark low-poly 3D sets, flat 2D stick figures, word-by-word captions, label pills.
// Facts (sources in the delivery note): the melody came to him in a dream at Jane Asher's family home
// in London; he played it to people for weeks thinking he had copied it; its working title and dummy
// lyric were "Scrambled Eggs"; he finished the lyrics on a road trip in Portugal in 1965; it was
// recorded at Abbey Road in June 1965 with only Paul and a string quartet. Disputed dates are left out.
// 30 fps, 120 bpm grid: a beat is 15 frames; every cut is on a beat.
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import * as THREE from "three";
import { draw3d, memo, rand } from "../three-core/stage";
import { ease, lerp, seg } from "../three-core/time";
import { textPlane } from "../three-core/type3d";
import { vignette } from "../three-core/look";
import { W, TAU, mat, box, cyl, room, cam, push, stick, captions, pill, punch, numBox, place, type Who } from "./docstyle";
import WORDS from "./yesterday.words.json";

const FPS = 30, END = 1500;
export const CUT = { hook: 0, dream: 150, piano: 300, ask: 465, eggs: 675, portugal: 915, studio: 1095, end: 1335, fin: END };
const PAUL: Who = { kind: "beatle", torso: "#2b2b30", hair: "#2a1a10", skin: "#f3e6d0" };
const FRIENDS: Who[] = [{ kind: "beatle", torso: "#3a2a20", hair: "#5a3a22", skin: "#f3e6d0", round: true }, { kind: "fan", torso: "#5a6a8a", hair: "#2a1b12", skin: "#efe0c8" }, { kind: "fan", torso: "#8a4a3a", hair: "#e8c26a", skin: "#f3e6d0" }];
const PLAYER: Who = { kind: "fan", torso: "#1d1d22", hair: "#3a2a1e", skin: "#efe0c8" };

// ------------------------------------------------------------------ 3D sets
const eggs = (g: THREE.Object3D, x: number, y: number, z: number, s = 1) => {
  const pan = new THREE.Group(); pan.position.set(x, y, z); pan.scale.setScalar(s); g.add(pan);
  pan.add(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.52, 0.14, 24), mat("#2a2a2e", 0.4)));
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.12), mat("#1a1a1a", 0.5)); handle.position.set(1.05, 0.04, 0); pan.add(handle);
  const r = rand(8); for (let i = 0; i < 14; i++) { const e = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11 + r() * 0.07, 0), mat(i % 4 ? "#f6d24a" : "#fff3c4", 0.7)); e.position.set((r() - 0.5) * 0.75, 0.1 + r() * 0.05, (r() - 0.5) * 0.75); e.scale.y = 0.6; pan.add(e); }
  return pan;
};
const buildHook = (env: Env) => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#0f0b08");
  const g = room(scene, "#3a2a1c", "#2c2018", { side: false, key: 70 });
  box(g, 3.6, 0.95, 1.6, mat("#6b4a2c", 0.7), 0, 0, -0.6); box(g, 1.3, 0.12, 1.0, mat("#33343a", 0.4), 0, 0.95, -0.6);
  const pan = eggs(g, 0, 1.12, -0.6);
  return { scene, cam: cam(4.6, 2.7, 0.9), pan };
};
const buildAttic = (env: Env) => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#0c0a10");
  const g = room(scene, "#4a3424", "#6e5a6e", { warm: "#c8c4ff", key: 35 });
  box(g, 1.0, 0.8, 0.06, mat("#1a2240", 0.3, "#3a4a8a", 0.8), -1.6, 1.8, -3.08); // a night window
  box(g, 2.8, 0.45, 1.5, mat("#4a3020"), 0.2, 0, -1.6); box(g, 2.7, 0.22, 1.42, mat("#ece6dc", 0.9), 0.2, 0.45, -1.6); box(g, 0.5, 0.16, 0.9, mat("#ffffff", 0.9), -0.9, 0.67, -1.6);
  box(g, 1.5, 0.18, 1.48, mat("#7a3a4a", 0.9), 0.75, 0.62, -1.6);
  return { scene, cam: cam(6.6, 2.0, 0.8) };
};
const buildPiano = (env: Env) => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#0c0908");
  const g = room(scene, "#4a3424", "#5a4a3a", { key: 65 });
  const p = new THREE.Group(); p.position.set(-0.9, 0, -1.4); p.rotation.y = Math.PI / 2; g.add(p);
  box(p, 2.2, 1.6, 0.7, mat("#1b1210", 0.35), 0, 0, 0); box(p, 2.0, 0.08, 0.35, mat("#f4f0e6", 0.5), 0, 0.95, 0.45);
  for (let i = 0; i < 14; i++) if (i % 7 !== 2 && i % 7 !== 6) box(p, 0.06, 0.06, 0.2, mat("#111", 0.4), -0.93 + i * 0.143 + 0.07, 1.0, 0.38);
  box(p, 0.9, 0.5, 0.45, mat("#3a2418", 0.7), 0, 0, 1.05); // the bench
  const can = new THREE.PointLight("#ffcf8a", 5, 4, 2); can.position.set(1.4, 2.0, -1.6); scene.add(can); cyl(g, 0.05, 0.25, mat("#e8d7a8", 0.5, "#ffcf7a", 1), 1.4, 1.6, -2.0);
  return { scene, cam: cam(6.2, 1.9, 0.85) };
};
const buildParlour = (env: Env) => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#0e0b0a");
  const g = room(scene, "#3e2c20", "#4a5a52", { key: 60 });
  box(g, 2.6, 0.5, 0.9, mat("#7a2e2e"), 0.4, 0.05, -2.5); box(g, 2.6, 0.9, 0.25, mat("#6a2626"), 0.4, 0.05, -2.95);
  box(g, 0.9, 1.2, 0.04, mat("#c9a03c", 0.6), -1.9, 1.6, -3.07);
  return { scene, cam: cam(7.0, 1.9, 0.9) };
};
const buildEggsSong = (env: Env) => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#0f0b08");
  const g = room(scene, "#3a2a1c", "#2c2018", { side: false, key: 70 });
  box(g, 3.6, 0.95, 1.6, mat("#6b4a2c", 0.7), 0.6, 0, -1.4);
  const pad = new THREE.Group(); pad.position.set(0.2, 0.97, -1.2); pad.rotation.x = -0.5; g.add(pad);
  pad.add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 0.03), mat("#f6efd9", 0.9)));
  const l1 = textPlane(env, "SCRAMBLED EGGS", { size: 0.15, color: "#2a3a8a" }).clone(); l1.position.set(0, 0.25, 0.02); pad.add(l1);
  const l2 = textPlane(env, "oh my baby…", { size: 0.11, color: "#2a3a8a" }).clone(); l2.position.set(0, 0.0, 0.02); pad.add(l2);
  eggs(g, 1.5, 0.97, -1.3, 0.7);
  return { scene, cam: cam(6.4, 2.1, 0.9) };
};
const buildRoad = (env: Env) => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#8fc4e8");
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), mat("#d9c08a")); sand.rotation.x = -Math.PI / 2; scene.add(sand);
  box(scene, 40, 0.02, 2.2, mat("#4a4a50", 0.8), 0, 0, 0); for (let i = -10; i < 10; i++) box(scene, 0.9, 0.03, 0.08, mat("#f2f2f2"), i * 2, 0, 0);
  for (let i = 0; i < 8; i++) { const x = -9 + i * 2.6; cyl(scene, 0.1, 2.2, mat("#7a5a3a"), x, 0, -3.2); for (let k = 0; k < 5; k++) { const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.2, 4), mat("#3f8a3a")); leaf.position.set(x, 2.25, -3.2); leaf.rotation.set(0, (k / 5) * TAU, 1.2); scene.add(leaf); } }
  box(scene, 40, 1.4, 0.4, mat("#f2ebe0"), 0, 0, -6);
  scene.add(new THREE.HemisphereLight("#ffffff", "#8a7a5a", 1.4)); const sun = new THREE.DirectionalLight("#fff1d0", 1.8); sun.position.set(-5, 8, 5); scene.add(sun);
  const car = new THREE.Group(); scene.add(car);
  box(car, 2.0, 0.5, 1.0, mat("#d8d2c4", 0.4), 0, 0.25, 0); box(car, 1.1, 0.45, 0.95, mat("#cfc8b8", 0.4), -0.1, 0.75, 0); box(car, 1.0, 0.36, 0.97, mat("#9cc4e0", 0.1), -0.1, 0.78, 0);
  for (const [x, z] of [[-0.65, 0.5], [0.65, 0.5], [-0.65, -0.5], [0.65, -0.5]]) { const w = cyl(car, 0.22, 0.12, mat("#111"), x, 0.22, z, 14); w.rotation.x = Math.PI / 2; }
  return { scene, cam: cam(9.0, 2.2, 0.8), car };
};
const buildStudio = (env: Env) => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#0b0b0d");
  const g = room(scene, "#3a3630", "#5c5a52", { key: 70 });
  for (let i = 0; i < 6; i++) box(g, 0.9, 1.4, 0.08, mat("#4a4840", 0.95), -2.4 + i * 1.0, 0.8, -3.06); // baffles
  const sign = textPlane(env, "ABBEY ROAD · STUDIO 2", { size: 0.2, color: "#e8e0cc" }).clone(); sign.position.set(0, 2.85, -3.0); g.add(sign);
  for (const x of [-0.25, 0.25]) { cyl(g, 0.02, 1.6, mat("#222"), x, 0, -0.3); cyl(g, 0.06, 0.16, mat("#9aa3b0", 0.3), x, 1.6, -0.3); }
  return { scene, cam: cam(7.4, 1.9, 0.9) };
};
const buildRecord = (env: Env) => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#0c0908");
  const g = room(scene, "#3a2618", "#24180f", { side: false, key: 60 });
  box(g, 2.8, 0.8, 2.2, mat("#3a2414", 0.8), 0, 0, -0.5); box(g, 2.6, 0.25, 2.0, mat("#5a3a24", 0.6), 0, 0.8, -0.5);
  const disc = new THREE.Group(); disc.position.set(-0.2, 1.08, -0.5); g.add(disc);
  disc.add(new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.03, 48), mat("#0d0d0f", 0.25)));
  disc.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.035, 32), mat("#f2c11d", 0.6)));
  const t = textPlane(env, "YESTERDAY", { size: 0.085, color: "#1a1a1a" }).clone(); t.rotation.x = -Math.PI / 2; t.position.y = 0.022; disc.add(t);
  return { scene, cam: cam(5.4, 2.6, 0.95), disc };
};

// ------------------------------------------------------------------ 2D extras: notes, strings
const note = (ctx: Ctx, env: Env, x: number, y: number, s: number, a: number) => {
  if (a <= 0) return; ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalAlpha = a; ctx.fillStyle = "#f2c11d"; ctx.strokeStyle = "#f2c11d"; ctx.lineWidth = s * 0.12;
  ctx.beginPath(); ctx.ellipse(x, y, s * 0.32, s * 0.24, -0.4, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + s * 0.28, y); ctx.lineTo(x + s * 0.28, y - s); ctx.quadraticCurveTo(x + s * 0.6, y - s * 0.75, x + s * 0.55, y - s * 0.45); ctx.stroke(); ctx.restore();
};
const notes = (ctx: Ctx, env: Env, f: number, x: number, y: number, spread = 120, seed = 0) => { for (let i = 0; i < 4; i++) { const t = ((f / 50 + i / 4 + seed) % 1); note(ctx, env, x + Math.sin(t * 5 + i) * spread * 0.4 + (i - 1.5) * spread * 0.3, y - t * 260, 46, Math.sin(t * Math.PI)); } };
const fiddle = (ctx: Ctx, env: Env, x: number, y: number, h: number, kind: "violin" | "cello", f: number, i: number) => {
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); const saw = Math.sin(f * 0.18 + i) * h * 0.08;
  if (kind === "cello") { ctx.fillStyle = "#8a4a1e"; ctx.beginPath(); ctx.ellipse(x, y - h * 0.32, h * 0.1, h * 0.17, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = "#2a1a10"; ctx.lineWidth = h * 0.012; ctx.beginPath(); ctx.moveTo(x, y - h * 0.48); ctx.lineTo(x, y - h * 0.78); ctx.moveTo(x, y - h * 0.15); ctx.lineTo(x, y - h * 0.04); ctx.stroke();
    ctx.strokeStyle = "#d8c8a0"; ctx.lineWidth = h * 0.008; ctx.beginPath(); ctx.moveTo(x - h * 0.2 + saw, y - h * 0.36); ctx.lineTo(x + h * 0.2 + saw, y - h * 0.3); ctx.stroke(); }
  else { const cx = x - h * 0.07, cy = y - h * 0.8; ctx.fillStyle = "#9a5a26"; ctx.beginPath(); ctx.ellipse(cx, cy, h * 0.07, h * 0.04, -0.5, 0, TAU); ctx.fill(); ctx.strokeStyle = "#d8c8a0"; ctx.lineWidth = h * 0.008; ctx.beginPath(); ctx.moveTo(cx - h * 0.12 + saw, cy - h * 0.1); ctx.lineTo(cx + h * 0.14 + saw, cy + h * 0.06); ctx.stroke(); }
  ctx.restore();
};

// ------------------------------------------------------------------ shots
type S = { scene: THREE.Scene; cam: THREE.PerspectiveCamera };
const frame3d = (ctx: Ctx, env: Env, s: S) => draw3d(ctx, env, s.scene, s.cam, { clear: "#0b0b0d", ss: 2, exposure: 1.05 });
const label = (ctx: Ctx, env: Env, f: number, start: number, text: string, color: "yellow" | "green" | "red" | "blue" | "white") => pill(ctx, env, text, color, W / 2, 185, 40, seg(f, start + 3, start + 11));

const hook = (ctx: Ctx, f: number, env: Env) => {
  const s = memo(env, "y:hook", buildHook); push(s.cam, f / 150, 1.2, f); s.pan.rotation.y = Math.sin(f * 0.05) * 0.05; s.pan.position.y = 1.12 + Math.abs(Math.sin(f * 0.21)) * 0.02; frame3d(ctx, env, s);
  label(ctx, env, f, 0, "LA CANCIÓN MÁS VERSIONADA", "yellow"); punch(ctx, env, "¿HUEVOS REVUELTOS?", W / 2, 1470, 92, (f - 114) / 12, "#f2c11d");
};
const dream = (ctx: Ctx, f: number, env: Env) => {
  const s = memo(env, "y:attic", buildAttic); push(s.cam, (f - 150) / 150, 0.7, f); frame3d(ctx, env, s);
  const [bx, by, bh0] = place(s.cam, env, 0.0, -1.45, 0.72), bh = bh0 * 0.9;
  stick(ctx, env, bx, by + bh * 0.45, bh, PAUL, { pivotHip: true, tilt: -90, face: "sleep", ll: 0, rl: 0, la: [-5, 0], ra: [5, 0] }, f);
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = "#7a3a4a"; ctx.beginPath(); ctx.roundRect(bx + bh * 0.1, by - bh * 0.1, bh * 0.52, bh * 0.2, bh * 0.06); ctx.fill(); ctx.restore();
  notes(ctx, env, f, bx - bh * 0.62, by - bh * 0.3, 140);
  label(ctx, env, f, 150, "LONDRES · EN UN SUEÑO", "blue");
};
const piano = (ctx: Ctx, f: number, env: Env) => {
  const s = memo(env, "y:piano", buildPiano); push(s.cam, (f - 300) / 165, 0.6, f); frame3d(ctx, env, s);
  const [x, , h] = place(s.cam, env, 0.15, -1.4), [, seatY] = place(s.cam, env, 0.15, -1.4, 0.5), play = f < 400, worry = f >= 400, hands = Math.sin(f * 0.6) * 10;
  stick(ctx, env, x, seatY + h * 0.45, h, PAUL, { face: worry ? "o" : "smile", look: worry ? 0 : -1, ll: -70, rl: -60, la: worry ? [150, 25] : [-100 + hands, -10], ra: worry ? [-150, -25] : [-95 - hands, 30] }, f);
  if (play) notes(ctx, env, f, x, seatY - h * 0.85, 220, 0.3);
  label(ctx, env, f, 300, "AL DESPERTAR", "green"); punch(ctx, env, "¿LA COPIÉ?", W / 2, 1470, 110, (f - 432) / 12);
};
const ask = (ctx: Ctx, f: number, env: Env) => {
  const s = memo(env, "y:parlour", buildParlour); push(s.cam, (f - 465) / 180, 0.6, f); frame3d(ctx, env, s);
  const [px, py, ph] = place(s.cam, env, -0.85, 0.6), strum = Math.sin(f * 0.8) * 12;
  stick(ctx, env, px, py, ph, PAUL, { inst: "guitar", face: "o", look: 1, la: [-40, 70], ra: [40 + strum, -60] }, f);
  FRIENDS.forEach((who, i) => { const [x, y, h] = place(s.cam, env, 0.05 + i * 0.55, 0.2 - i * 0.35), no = f >= 628 ? Math.sin(f * 0.9 + i) * 8 : 0;
    stick(ctx, env, x + no, y, h * 0.95, who, { face: f >= 628 ? "flat" : "smile", look: -1, tilt: no * 0.3 }, f); });
  label(ctx, env, f, 465, "¿YA EXISTÍA?", "red"); punch(ctx, env, "NO", W / 2 + 180, 560, 150, (f - 626) / 10);
};
const eggsSong = (ctx: Ctx, f: number, env: Env) => {
  const s = memo(env, "y:eggs", buildEggsSong); push(s.cam, (f - 675) / 240, 0.8, f); frame3d(ctx, env, s);
  const [x, y, h] = place(s.cam, env, -0.85, 0.7), strum = Math.sin(f * 0.7) * 14;
  stick(ctx, env, x, y, h, PAUL, { inst: "guitar", face: f < 830 ? "shout" : "grin", la: [-40, 70], ra: [40 + strum, -60] }, f);
  notes(ctx, env, f, x + h * 0.25, y - h * 1.15, 120, 0.6);
  label(ctx, env, f, 675, "LA LETRA DE MENTIRA", "yellow");
  numBox(ctx, env, "SCRAMBLED EGGS", W / 2, 1470, 64, (f - 735) / 8);
  if (f >= 840) punch(ctx, env, "= HUEVOS REVUELTOS", W / 2, 1600, 70, (f - 840) / 10, "#f2c11d", -0.03);
};
const portugal = (ctx: Ctx, f: number, env: Env) => {
  const s = memo(env, "y:road", buildRoad); const t = (f - 915) / 180; s.car.position.set(lerp(-5.5, 3.5, t), 0, 0.2); s.car.rotation.z = Math.sin(f * 0.9) * 0.008;
  push(s.cam, t, 0.5, f); frame3d(ctx, env, s);
  const [x, y, h] = place(s.cam, env, s.car.position.x - 0.1, 0.2, 0.85);
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = "#f3e6d0"; ctx.strokeStyle = "#1a1716"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - h * 0.12, h * 0.1, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#2a1a10"; ctx.beginPath(); ctx.arc(x, y - h * 0.14, h * 0.105, Math.PI, 0); ctx.fill(); ctx.restore();
  label(ctx, env, f, 915, "PORTUGAL · 1965", "green"); punch(ctx, env, "YESTERDAY", W / 2, 640, 120, (f - 990) / 12, "#f2c11d");
};
const studio = (ctx: Ctx, f: number, env: Env) => {
  const s = memo(env, "y:studio", buildStudio); push(s.cam, (f - 1095) / 240, 0.7, f); frame3d(ctx, env, s);
  const [x, y, h] = place(s.cam, env, 0, 0.3), strum = Math.sin(f * 0.5) * 10;
  // the quartet in an arc behind and beside him
  const seats: [number, number, "violin" | "cello"][] = [[-1.1, -0.8, "violin"], [-0.55, -1.4, "violin"], [0.55, -1.4, "violin"], [1.1, -0.8, "cello"]];
  seats.forEach(([sx, sz, kind], i) => { const [px, py, ph] = place(s.cam, env, sx, sz); const t = ease.outBack(seg(f, 1150 + i * 8, 1162 + i * 8)); if (t <= 0) return;
    stick(ctx, env, px, py + (1 - t) * 40, ph * (kind === "cello" ? 0.9 : 1), PLAYER, kind === "cello" ? { face: "sleep", ll: -60, rl: 40, la: [-30, 80], ra: [50, -40] } : { face: "sleep", la: [-150, 20], ra: [-60, -60] }, f); fiddle(ctx, env, px, py, ph, kind, f, i); });
  stick(ctx, env, x, y, h, PAUL, { inst: "guitar", face: "smile", la: [-40, 70], ra: [40 + strum, -60] }, f);
  label(ctx, env, f, 1095, "ABBEY ROAD · JUNIO 1965", "red"); punch(ctx, env, "SOLO PAUL", W / 2, 1470, 110, (f - 1263) / 12, "#f2c11d");
};
const end = (ctx: Ctx, f: number, env: Env) => {
  const s = memo(env, "y:record", buildRecord); push(s.cam, (f - 1335) / 165, 0.5, f); s.disc.rotation.y = -f * 0.11; frame3d(ctx, env, s);
  label(ctx, env, f, 1335, "MILES DE VERSIONES", "yellow");
  pill(ctx, env, "¿SABÍAS QUE SE LLAMABA", "white", W / 2, 1440, 46, (f - 1380) / 8); pill(ctx, env, "«HUEVOS REVUELTOS»?", "white", W / 2, 1520, 46, (f - 1386) / 8);
  pill(ctx, env, "¡COMENTA!", "yellow", W / 2, 1640, 44, (f - 1420) / 8);
};

const shot = (fn: (ctx: Ctx, f: number, env: Env) => void, start: number) => (ctx: Ctx, local: number, env: Env) => { const f = start + local; fn(ctx, f, env); vignette(ctx, env, 0.45, "#050304"); captions(ctx, env, f, WORDS as { w: string; s: number; e: number }[], FPS); };
export const yesterday: Film = {
  meta: { title: "Yesterday", W, H: 1920, fps: FPS, bpm: 120, durationFrames: END, kind: "explainer", poster: 830,
    checks: { none: { "3d": "2D figures drawn over the 3D sets; nothing in the 3D scene is held" } } },
  assets: { images: {} },
  shots: [
    { id: "hook", start: CUT.hook, end: CUT.dream, draw: shot(hook, CUT.hook) }, { id: "dream", start: CUT.dream, end: CUT.piano, draw: shot(dream, CUT.dream) },
    { id: "piano", start: CUT.piano, end: CUT.ask, draw: shot(piano, CUT.piano) }, { id: "ask", start: CUT.ask, end: CUT.eggs, draw: shot(ask, CUT.ask) },
    { id: "eggs", start: CUT.eggs, end: CUT.portugal, draw: shot(eggsSong, CUT.eggs) }, { id: "portugal", start: CUT.portugal, end: CUT.studio, draw: shot(portugal, CUT.portugal) },
    { id: "studio", start: CUT.studio, end: CUT.end, draw: shot(studio, CUT.studio) }, { id: "end", start: CUT.end, end: CUT.fin, draw: shot(end, CUT.end) },
  ],
};
