// LAS 4 PELÍCULAS DE LOS BEATLES. Where Sam Mendes' four Beatles films stand (November 2026), in the
// documentary style: dark low-poly 3D sets, flat 2D stick Beatles, word-by-word captions, label pills.
// Facts (sources in the delivery note): one film per Beatle, each from his point of view; Harris
// Dickinson (John), Paul Mescal (Paul), Joseph Quinn (George), Barry Keoghan (Ringo); the first time
// Apple Corps granted life and music rights for scripted films; first-look photos hidden in postcards
// at LIPA in Liverpool (January 2026); day 180 of the shoot (October 2026); all four in cinemas April 2028.
// 30 fps, 120 bpm: a beat is 15 frames; every cut is on a beat.
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import * as THREE from "three";
import { draw3d, memo, rand } from "../three-core/stage";
import { clamp01, ease, lerp, seg, spring } from "../three-core/time";
import { textPlane } from "../three-core/type3d";
import { vignette } from "../three-core/look";
import { W, H, TAU, mat, box, cyl, dataTex, room, cam, push, stick, captions, pill, punch, numBox, flash, place, key, type Who, type Pose } from "./docstyle";
import WORDS from "./beatles.words.json";

const FPS = 30, END = 1260;
export const CUT = { hook: 0, mendes: 135, eyes: 315, cast: 420, rights: 675, cards: 825, shoot: 975, date: 1065, ask: 1155, end: END };
const CAST_AT = [429, 498, 558, 621]; // Harris Dickinson, Paul Mescal, Joseph Quinn, Barry Keoghan, from the narration
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

const JOHN: Who = { kind: "beatle", torso: "#2b2b30", hair: "#5a3a22", skin: "#f3e6d0", round: true };
const PAUL: Who = { kind: "beatle", torso: "#2b2b30", hair: "#2a1a10", skin: "#f3e6d0" };
const GEORGE: Who = { kind: "beatle", torso: "#2b2b30", hair: "#1e140c", skin: "#efe0c8" };
const RINGO: Who = { kind: "beatle", torso: "#2b2b30", hair: "#1e140c", skin: "#f0e1cb", nose: 1.4 };
const FOUR: [Who, Pose["inst"], string][] = [[JOHN, "guitar", "JOHN"], [PAUL, "bass", "PAUL"], [GEORGE, "guitar", "GEORGE"], [RINGO, "sticks", "RINGO"]];

// ------------------------------------------------------------------ sets
const buildCinema = (env: Env) => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#0a0607");
  const g = room(scene, "#2a1414", "#1e1214", { side: false, warm: "#ffd2a0", key: 40 });
  box(g, 5.2, 2.6, 0.06, mat("#1a1a20", 0.3, "#d8d2c4", 0.55), 0, 1.6, -3.05); // the screen, glowing
  const title = textPlane(env, "THE BEATLES", { size: 0.62, color: "#141414" }).clone(); title.position.set(0, 3.2, -3.0); g.add(title);
  const sub = textPlane(env, "4 PELÍCULAS · 2028", { size: 0.26, color: "#8a1b1b" }).clone(); sub.position.set(0, 2.55, -3.0); g.add(sub);
  for (let r = 0; r < 4; r++) for (let c = -4; c <= 4; c++) { const x = c * 0.62, z = 0.8 + r * 0.9, red = mat(r % 2 ? "#8e1b1f" : "#9c2125", 0.8); box(g, 0.52, 0.42, 0.5, red, x, 0, z); box(g, 0.52, 0.55, 0.12, red, x, 0.42, z + 0.22); }
  const glow = new THREE.PointLight("#e8e0d0", 8, 7, 2); glow.position.set(0, 2.4, -2.2); scene.add(glow);
  return { scene, cam: cam(10.2, 2.1, 1.7) };
};
const chair = (g: THREE.Object3D, env: Env, names: string[]) => {
  const wood = mat("#b07a3c", 0.7), canvas = mat("#1c1c1c", 0.9);
  for (const s of [-1, 1]) { const a = box(g, 0.07, 1.1, 0.07, wood, s * 0.45, 0, 0.32); a.rotation.z = s * 0.35; const b = box(g, 0.07, 1.1, 0.07, wood, s * 0.45, 0, -0.32); b.rotation.z = -s * 0.35; box(g, 0.07, 1.6, 0.07, wood, s * 0.48, 0.0, -0.36); }
  box(g, 1.0, 0.06, 0.7, canvas, 0, 0.95, 0); box(g, 1.05, 0.42, 0.04, canvas, 0, 1.25, -0.36);
  return names.map((n) => { const p = textPlane(env, n, { size: n.length > 12 ? 0.085 : 0.11, color: "#ece7dc" }).clone(); p.position.set(0, 1.46, -0.33); g.add(p); return p; });
};
const buildMendes = (env: Env) => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#0b0b0d");
  const g = room(scene, "#2c2c30", "#1c1c20", { side: false, key: 70 });
  const c = new THREE.Group(); c.position.set(0, 0, -0.6); c.rotation.y = 0.35; g.add(c); chair(c, env, ["SAM MENDES"]);
  // a film camera on a tripod, a clapperboard on the floor
  const cg = new THREE.Group(); cg.position.set(-1.9, 0, -1.4); cg.rotation.y = 0.8; g.add(cg);
  for (let i = 0; i < 3; i++) { const l = box(cg, 0.05, 1.3, 0.05, mat("#222"), Math.cos(i * 2.1) * 0.25, 0, Math.sin(i * 2.1) * 0.25); l.rotation.z = Math.cos(i * 2.1) * 0.2; }
  box(cg, 0.6, 0.4, 0.35, mat("#1d1d22", 0.5), 0, 1.3, 0); cyl(cg, 0.1, 0.25, mat("#111", 0.3), 0, 1.4, 0.25).rotation.x = Math.PI / 2;
  const signs = textPlane(env, "BEATLES · ESCENA 1", { size: 0.14, color: "#ffffff" }).clone(); signs.position.set(1.7, 0.3, 0.2); signs.rotation.x = -Math.PI / 2; g.add(signs);
  box(g, 0.9, 0.06, 0.6, mat("#141414", 0.6), 1.7, 0, 0.2);
  return { scene, cam: cam(7.6, 1.9, 1.0) };
};
const buildCrossing = (env: Env) => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#9bb4c9");
  const road = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), mat("#3a3c42")); road.rotation.x = -Math.PI / 2; scene.add(road);
  for (let i = -6; i <= 6; i++) box(scene, 0.42, 0.01, 2.4, mat("#f2f2f2", 0.6), i * 0.8, 0, 0);
  for (const z of [-3.2, 3.6]) box(scene, 30, 0.15, 2.0, mat("#8a8580"), 0, 0, z);
  for (let i = 0; i < 7; i++) { const x = -6 + i * 2.1, t = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.2, 6), mat("#3f6b3a")); t.position.set(x, 2.4, -5.2); scene.add(t); cyl(scene, 0.12, 1.4, mat("#5a4030"), x, 0, -5.2); }
  box(scene, 30, 3.0, 0.3, mat("#c9b9a2"), 0, 0, -6.5);
  scene.add(new THREE.HemisphereLight("#ffffff", "#5a5a50", 1.4)); const sun = new THREE.DirectionalLight("#fff1d8", 1.6); sun.position.set(4, 8, 6); scene.add(sun);
  return { scene, cam: cam(10.5, 1.6, 0.9) };
};
const buildCast = (env: Env) => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#0b0b0d");
  const g = room(scene, "#2c2c30", "#1a1a1e", { side: false, key: 70 });
  const c = new THREE.Group(); c.position.set(0.55, 0, -0.5); c.rotation.y = -0.3; g.add(c);
  const plates = chair(c, env, ["HARRIS DICKINSON", "PAUL MESCAL", "JOSEPH QUINN", "BARRY KEOGHAN"]);
  return { scene, cam: cam(7.2, 1.9, 1.0), c, plates };
};
const buildRecord = (env: Env) => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#0c0908");
  const g = room(scene, "#3a2618", "#24180f", { side: false, key: 60 });
  box(g, 2.6, 0.25, 2.0, mat("#5a3a24", 0.6), 0, 0.8, -0.5); // the turntable base on a cabinet
  box(g, 2.8, 0.8, 2.2, mat("#3a2414", 0.8), 0, 0, -0.5);
  const disc = new THREE.Group(); disc.position.set(-0.2, 1.08, -0.5); g.add(disc);
  disc.add(new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.03, 48), mat("#0d0d0f", 0.25)));
  const lbl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.035, 32), mat("#e8573a", 0.6)); disc.add(lbl);
  const t = textPlane(env, "FAB 4", { size: 0.12, color: "#1a1a1a" }).clone(); t.rotation.x = -Math.PI / 2; t.position.y = 0.022; disc.add(t);
  const arm = box(g, 0.05, 0.05, 0.9, mat("#c9ced6", 0.3), 0.85, 1.1, -0.6); arm.rotation.y = 0.5;
  return { scene, cam: cam(5.4, 2.6, 0.95), disc };
};
const buildCards = (env: Env) => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#0d0a08");
  const g = room(scene, "#3a2a1e", "#2a1e16", { side: false, key: 65 });
  box(g, 3.4, 0.9, 2.2, mat("#6b4a2c", 0.7), 0, 0, -0.4);
  const r = rand(5), cards: THREE.Group[] = [];
  const cols = ["#f2e6c8", "#e8d9b0", "#f6eedc", "#efe2c2"];
  for (let i = 0; i < 6; i++) { const c = new THREE.Group(); c.position.set(-1.1 + (i % 3) * 1.1 + (r() - 0.5) * 0.3, 0.92, -0.9 + Math.floor(i / 3) * 0.9 + (r() - 0.5) * 0.2); c.rotation.y = (r() - 0.5) * 0.8; g.add(c);
    c.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 0.6), mat(cols[i % 4], 0.8)));
    const lp = textPlane(env, i === 1 ? "LIVERPOOL" : "1963", { size: 0.12, color: "#7a2a1a" }).clone(); lp.rotation.x = -Math.PI / 2; lp.position.set(0, 0.013, 0.15); c.add(lp);
    const ph = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.022, 0.28), mat("#2a2a2a", 0.6)); ph.position.set(-0.18, 0, -0.08); c.add(ph); cards.push(c); }
  return { scene, cam: cam(5.6, 3.2, 0.6), cards };
};
const buildShoot = (env: Env) => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#0b0b0d");
  const g = room(scene, "#2c2c30", "#18181c", { side: false, key: 75 });
  const board = new THREE.Group(); board.position.set(0, 1.2, -0.5); g.add(board);
  board.add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, 0.08), mat("#151515", 0.6)));
  const stripes = dataTex(16, 2, (x) => (Math.floor(x / 2) % 2 ? [240, 240, 240] : [20, 20, 20]), 1, 1);
  const top = new THREE.Group(); top.position.set(-0.9, 0.72, 0); board.add(top);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 0.08), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.6 })); bar.position.set(0.9, 0, 0); top.add(bar);
  const t1 = textPlane(env, "THE BEATLES", { size: 0.2, color: "#ffffff" }).clone(); t1.position.set(0, 0.32, 0.05); board.add(t1);
  const t2 = textPlane(env, "DÍA 180", { size: 0.32, color: "#f2c11d" }).clone(); t2.position.set(0, -0.15, 0.05); board.add(t2);
  return { scene, cam: cam(5.0, 1.6, 1.15), top };
};
const buildDate = (env: Env) => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#0a0607");
  const g = room(scene, "#2a1414", "#1a1012", { side: false, key: 70 });
  const cal = new THREE.Group(); cal.position.set(0, 1.0, -1.0); g.add(cal);
  cal.add(new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.2, 0.1), mat("#f4efe4", 0.8)));
  const head = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.6, 0.12), mat("#c8302c", 0.7)); head.position.y = 0.8; cal.add(head);
  const m = textPlane(env, "ABRIL", { size: 0.34, color: "#ffffff" }).clone(); m.position.set(0, 0.8, 0.07); cal.add(m);
  const y = textPlane(env, "2028", { size: 0.62, color: "#141414" }).clone(); y.position.set(0, -0.25, 0.06); cal.add(y);
  for (let c = -4; c <= 4; c++) { const red = mat("#9c2125", 0.8); box(g, 0.52, 0.42, 0.5, red, c * 0.62, 0, 1.4); box(g, 0.52, 0.55, 0.12, red, c * 0.62, 0.42, 1.62); }
  return { scene, cam: cam(6.4, 1.9, 1.05), cal };
};

// ------------------------------------------------------------------ shots
type S = { scene: THREE.Scene; cam: THREE.PerspectiveCamera };
const frame3d = (ctx: Ctx, env: Env, s: S) => draw3d(ctx, env, s.scene, s.cam, { clear: "#0b0b0d", ss: 2, exposure: 1.05 });
const label = (ctx: Ctx, env: Env, f: number, start: number, text: string, color: "yellow" | "green" | "red" | "blue" | "white") => pill(ctx, env, text, color, W / 2, 300, 40, seg(f, start + 3, start + 11));
const walkPose = (f: number, i: number, amp = 22): Pose => { const s = Math.sin(f * 0.45 + i * 1.3) * amp; return { ll: -6 + s, rl: 6 - s, la: [-18 - s * 0.5, 8], ra: [18 + s * 0.5, -8] }; };

const hook = (ctx: Ctx, f: number, env: Env) => {
  const s = memo(env, "b:cinema", buildCinema); push(s.cam, f / 135, 0.9, f); frame3d(ctx, env, s);
  // the four step in one by one, each on a beat
  FOUR.forEach(([who, inst], i) => { const t = seg(f, 20 + i * 15, 30 + i * 15); if (t <= 0) return; const [x, y, h] = place(s.cam, env, -1.08 + i * 0.72, 0.6);
    stick(ctx, env, x, y + (1 - ease.outBack(t)) * 60, h * 0.9, who, { inst, face: "smile", la: [-30, 60], ra: [30, -60] }, f); });
  label(ctx, env, f, 0, "SAM MENDES · SONY", "yellow"); punch(ctx, env, "¿4 PELÍCULAS?", W / 2, 1470, 104, (f - 75) / 12);
};
const mendes = (ctx: Ctx, f: number, env: Env) => {
  const s = memo(env, "b:mendes", buildMendes); push(s.cam, (f - 135) / 180, 0.8, f); frame3d(ctx, env, s);
  label(ctx, env, f, 135, "EL DIRECTOR DE 1917", "green");
  if (f >= 255) FOUR.forEach(([who, inst], i) => { const t = seg(f, 255 + i * 8, 266 + i * 8); const [x, y, h] = place(s.cam, env, -0.78 + i * 0.52, 2.3); stick(ctx, env, x, y + (1 - ease.outBack(t)) * 50, h * 0.5, who, { inst, face: "smile" }, f); });
  numBox(ctx, env, "1 POR BEATLE", W / 2, 1470, 64, (f - 270) / 8);
};
const eyes = (ctx: Ctx, f: number, env: Env) => {
  const s = memo(env, "b:cross", buildCrossing); push(s.cam, (f - 315) / 105, 0.5, f); frame3d(ctx, env, s);
  // across the zebra crossing in single file, left to right
  FOUR.forEach(([who], i) => { const x = lerp(-2.6, 0.9, (f - 315) / 105) + 0.85 * (3 - i) - 1.2; const [sx, sy, h] = place(s.cam, env, x, 0.1); stick(ctx, env, sx, sy, h, who, { ...walkPose(f, i), face: "flat", look: 1 }, f); });
  label(ctx, env, f, 315, "SU PUNTO DE VISTA", "blue");
};
const cast = (ctx: Ctx, f: number, env: Env) => {
  const s = memo(env, "b:cast", buildCast); push(s.cam, (f - 420) / 255, 0.6, f);
  const k = CAST_AT.reduce((a, t, i) => (f >= t - 6 ? i : a), 0), drop = ease.outBack(seg(f, CAST_AT[k] - 6, CAST_AT[k] + 6));
  s.plates.forEach((p, i) => (p.visible = i === k)); s.c.position.y = (1 - drop) * 0.6; s.c.rotation.y = -0.3 + (1 - drop) * 0.4;
  frame3d(ctx, env, s);
  const [who, inst, name] = FOUR[k], [x, y, h] = place(s.cam, env, -0.72, 0.9), pop = ease.outBack(seg(f, CAST_AT[k] - 2, CAST_AT[k] + 8));
  stick(ctx, env, x, y + (1 - pop) * 80, h, who, { inst, face: "grin", la: [-35, 50], ra: [35, -50] }, f);
  label(ctx, env, f, 420, "EL REPARTO", "red"); pill(ctx, env, name, "yellow", x, y - h * 1.18, 46, pop);
  flash(ctx, env, k > 0 ? 0.5 - Math.abs(f - CAST_AT[k] + 4) / 8 : 0);
};
const rights = (ctx: Ctx, f: number, env: Env) => {
  const s = memo(env, "b:record", buildRecord); push(s.cam, (f - 675) / 150, 0.5, f); s.disc.rotation.y = -f * 0.12; frame3d(ctx, env, s);
  label(ctx, env, f, 675, "POR PRIMERA VEZ", "green"); pill(ctx, env, "SU VIDA + SU MÚSICA", "white", W / 2, 1470, 46, (f - 735) / 8);
};
const cards = (ctx: Ctx, f: number, env: Env) => {
  const s = memo(env, "b:cards", buildCards); push(s.cam, (f - 825) / 150, 0.5, f);
  const up = ease.outBack(seg(f, 870, 890)); s.cards[1].position.y = 0.92 + up * 0.45; s.cards[1].rotation.x = up * 1.1; s.cards[1].rotation.y = (1 - up) * s.cards[1].rotation.y;
  frame3d(ctx, env, s); label(ctx, env, f, 825, "LIVERPOOL · ENERO 2026", "yellow"); punch(ctx, env, "PRIMERAS FOTOS", W / 2, 1460, 92, (f - 895) / 12, "#f2c11d");
};
const shoot = (ctx: Ctx, f: number, env: Env) => {
  const s = memo(env, "b:shoot", buildShoot); push(s.cam, (f - 975) / 90, 0.4, f);
  const clap = f < 1010 ? -0.5 * ease.inOutCubic(seg(f, 975, 1000)) : -0.5 * (1 - ease.inCubic(seg(f, 1000, 1006))); s.top.rotation.z = clap;
  frame3d(ctx, env, s); flash(ctx, env, 0.4 - Math.abs(f - 1006) / 10);
  label(ctx, env, f, 975, "EL RODAJE", "red"); numBox(ctx, env, "+180 DÍAS", W / 2, 1470, 64, (f - 1010) / 8);
};
const date = (ctx: Ctx, f: number, env: Env) => {
  const s = memo(env, "b:date", buildDate); push(s.cam, (f - 1065) / 90, 0.6, f); s.cal.position.y = 1.0 + (1 - ease.outBack(seg(f, 1068, 1082))) * 2.5; frame3d(ctx, env, s);
  label(ctx, env, f, 1065, "EN CINES", "yellow"); punch(ctx, env, "LAS 4 A LA VEZ", W / 2, 1460, 92, (f - 1095) / 12, "#f2c11d");
};
const ask = (ctx: Ctx, f: number, env: Env) => {
  const s = memo(env, "b:cinema", buildCinema); push(s.cam, (f - 1155) / 105, 0.6, f); frame3d(ctx, env, s);
  FOUR.forEach(([who, inst, name], i) => { const [x, y, h] = place(s.cam, env, -1.08 + i * 0.72, 0.6), b = Math.abs(Math.sin(f * 0.25 + i)) * 10;
    stick(ctx, env, x, y - b, h * 0.9, who, { inst, face: i % 2 ? "grin" : "smile", la: [-30, 60], ra: [30, -60] }, f); pill(ctx, env, name, "yellow", x, y + 40, 28, seg(f, 1160 + i * 4, 1168 + i * 4)); });
  pill(ctx, env, "¿CUÁL VAS A VER PRIMERO?", "white", W / 2, 1440, 50, (f - 1158) / 8); pill(ctx, env, "¡COMENTA!", "yellow", W / 2, 1580, 44, (f - 1185) / 8);
};

const shot = (fn: (ctx: Ctx, f: number, env: Env) => void, start: number) => (ctx: Ctx, local: number, env: Env) => { const f = start + local; fn(ctx, f, env); vignette(ctx, env, 0.45, "#050304"); captions(ctx, env, f, WORDS as { w: string; s: number; e: number }[], FPS); };
export const beatles: Film = {
  meta: { title: "Las 4 películas de los Beatles", W, H, fps: FPS, bpm: 120, durationFrames: END, kind: "explainer", poster: 500,
    checks: { none: { "3d": "2D figures drawn over the 3D sets; nothing in the 3D scene is held" } } },
  assets: { images: {} },
  shots: [
    { id: "hook", start: CUT.hook, end: CUT.mendes, draw: shot(hook, CUT.hook) }, { id: "mendes", start: CUT.mendes, end: CUT.eyes, draw: shot(mendes, CUT.mendes) },
    { id: "eyes", start: CUT.eyes, end: CUT.cast, draw: shot(eyes, CUT.eyes) }, { id: "cast", start: CUT.cast, end: CUT.rights, draw: shot(cast, CUT.cast) },
    { id: "rights", start: CUT.rights, end: CUT.cards, draw: shot(rights, CUT.rights) }, { id: "cards", start: CUT.cards, end: CUT.shoot, draw: shot(cards, CUT.cards) },
    { id: "shoot", start: CUT.shoot, end: CUT.date, draw: shot(shoot, CUT.shoot) }, { id: "date", start: CUT.date, end: CUT.ask, draw: shot(date, CUT.date) },
    { id: "ask", start: CUT.ask, end: CUT.end, draw: shot(ask, CUT.ask) },
  ],
};
void spring; void clamp01; void H; void TAU; void v3; void key;
