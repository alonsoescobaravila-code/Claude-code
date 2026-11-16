// UNA SEMANA EN EL CUERPO DE CRISTIANO. What if you swapped bodies with Cristiano Ronaldo for a week?
// Six 3D dioramas floating on the blue studio backdrop of the earlier films, one per day, built from
// code: a bedroom, a gym, a pitch, a street with a bakery, a kitchen with an ice bath, a living room.
// "You" are the orange-hoodie character from the earlier films; Cristiano is the same rig in a red
// number 7 shirt, with a black quiff, tan skin and a stud earring. A stylised parody, not a likeness.
//
// Grid: 120 bpm at 60 fps, a beat is 30 frames, a bar 120. Every cut is on a bar, every big moment on a beat.
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import * as THREE from "three";
import { draw3d, memo, rand } from "../three-core/stage";
import { clamp01, ease, lerp, seg, spring } from "../three-core/time";
import { defaultFont, fillText2d, layoutText, textPlane } from "../three-core/type3d";
import { softShadows, vignette } from "../three-core/look";
import { screenPx } from "../three-core/camera";
import { backdrop, basisQ, buildChar, gloss, key, key3, mesh, onHead, poseHand, setArm, TAU, v3, type Char } from "./helado";

const W = 1080, H = 1920, FPS = 60, BAR = 120;
export const CUT = { d1: 0, d2: 2 * BAR, d4: 4 * BAR, d5: 6 * BAR, d6: 8 * BAR, d7: 10 * BAR, end: 14 * BAR };
export const CUE = { swap: 96, sitUp: 120, lift: 330, kick: 570, fans: 810, poof: 1020, plunge: 1110, siuu: 1530 };
const Y0 = -1.7, S = 0.8; // floor top, character scale
const FOOT = 1.385; // char origin above the soles, unscaled

type V3 = THREE.Vector3;
const Q = (x: V3, y: V3, z: V3) => basisQ(x, y, z);
// hand frames: +y along the fingers, +z out of the palm, +x toward the thumb
const Q_DOWN_L = Q(v3(0, 0, 1), v3(0, -1, 0), v3(1, 0, 0)), Q_DOWN_R = Q(v3(0, 0, -1), v3(0, -1, 0), v3(-1, 0, 0));
const Q_UP_L = Q(v3(0, 0, -1), v3(-0.6, 0.8, 0), v3(0.8, 0.6, 0)), Q_UP_R = Q(v3(0, 0, 1), v3(0.6, 0.8, 0), v3(-0.8, 0.6, 0));
const Q_CHEEK_L = Q(v3(0, 0, -1), v3(0, 1, 0), v3(1, 0, 0)), Q_CHEEK_R = Q(v3(0, 0, 1), v3(0, 1, 0), v3(-1, 0, 0));
const Q_FACE = Q(v3(-1, 0, 0), v3(0, 1, 0), v3(0, 0, -1)); // palms toward the face
const Q_FWD = Q(v3(1, 0, 0), v3(0, 0, 1), v3(0, -1, 0)); // fist forward, palm down
const Q_SHOW = Q(v3(1, 0, 0), v3(0, 1, 0), v3(0, 0, 1)); // open palm to the camera, fingers up
const Q_PRAY_L = Q(v3(0, 0, 1), v3(0, 1, 0), v3(-1, 0, 0)).multiply(new THREE.Quaternion().setFromAxisAngle(v3(0, 1, 0), Math.PI)), Q_PRAY_R = Q(v3(0, 0, -1), v3(0, 1, 0), v3(1, 0, 0)).multiply(new THREE.Quaternion().setFromAxisAngle(v3(0, 1, 0), Math.PI));
const REST_L = v3(-0.74, -0.3, 0.15), REST_R = v3(0.74, -0.3, 0.15);

// ------------------------------------------------------------------ textures, as data
const dataTex = (w: number, h: number, fn: (x: number, y: number) => [number, number, number], rx = 1, ry = 1) => {
  const d = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b] = fn(x, y), i = (y * w + x) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; }
  const t = new THREE.DataTexture(d, w, h, THREE.RGBAFormat); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true; return t;
};
const hash = (a: number, b: number) => { let h = (a * 374761393 + b * 668265263) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const mixc = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t)) as [number, number, number];
const planks = (c1: number[], c2: number[]) => dataTex(128, 128, (x, y) => { const row = Math.floor(y / 16), off = (row % 2) * 40, col = Math.floor((x + off) / 80), seam = y % 16 === 0 || (x + off) % 80 === 0;
  const base = mixc(c1, c2, hash(row, col)), grain = 0.06 * Math.sin((x + row * 13) * 0.35 + Math.sin(y * 0.9) * 2); return seam ? mixc(base, [60, 35, 20], 0.5) : mixc(base, [255, 240, 220], grain + 0.03); }, 1 / 1.6, 1 / 1.6);
const tiles = (c1: number[], c2: number[], grout: number[]) => dataTex(64, 64, (x, y) => (x % 32 < 2 || y % 32 < 2 ? grout as [number, number, number] : ((Math.floor(x / 32) + Math.floor(y / 32)) % 2 ? c1 : c2) as [number, number, number]), 1 / 0.9, 1 / 0.9);
const grass = () => dataTex(64, 64, (x, y) => mixc(Math.floor(x / 32) % 2 ? [74, 168, 78] : [92, 186, 90], [40, 120, 50], 0.12 * hash(x, y)), 1 / 1.4, 1 / 1.4);
const rubber = () => dataTex(64, 64, (x, y) => mixc([58, 62, 74], [96, 102, 118], hash(x * 7, y * 3) < 0.08 ? 0.8 : 0.08 * hash(x, y)), 1 / 1.2, 1 / 1.2);
const awning = () => dataTex(64, 8, (x) => (Math.floor(x / 8) % 2 ? [248, 246, 240] : [214, 44, 52]), 3, 1);
const netTex = () => { const n = 64, d = new Uint8Array(n * n * 4); for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const on = x % 8 < 1 || y % 8 < 1, i = (y * n + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = on ? 235 : 0; }
  const t = new THREE.DataTexture(d, n, n, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 2.5); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t; };

// ------------------------------------------------------------------ set pieces
const box = (w: number, h: number, d: number, m: THREE.Material, p: [number, number, number]) => mesh(new THREE.BoxGeometry(w, h, d), m, p);
const rounded = (w: number, h: number, d: number, r: number, m: THREE.Material | THREE.Material[], p: [number, number, number]) => {
  const s = new THREE.Shape(), x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const b = Math.min(0.05, h / 4), g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 6 });
  g.rotateX(-Math.PI / 2); g.translate(0, b, 0); return mesh(g, m as THREE.Material, p); // origin at the bottom centre
};
/** the diorama: a floor slab and a back wall, both catching shadows */
const diorama = (floorTop: THREE.Material, wallC: string, opts: { wall?: boolean; w?: number; d?: number; trim?: string } = {}) => {
  const g = new THREE.Group(), w = opts.w ?? 4.6, d = opts.d ?? 3.8;
  g.add(rounded(w, 0.42, d, 0.18, [floorTop, gloss(opts.trim ?? "#e9e2d6", 0.6)], [0, Y0 - 0.42, 0]));
  if (opts.wall !== false) {
    g.add(box(w, 3.5, 0.2, gloss(wallC, 0.85), [0, Y0 + 1.75, -d / 2 + 0.1]));
    g.add(box(w, 0.16, 0.06, gloss("#ffffff", 0.5), [0, Y0 + 0.08, -d / 2 + 0.23])); // skirting board
  }
  return g;
};
const lightsFor = (scene: THREE.Scene) => {
  scene.add(new THREE.HemisphereLight("#ffffff", "#c9d6f0", 1.3));
  const k = new THREE.DirectionalLight("#fff4e6", 2.1); k.position.set(-4, 8, 7); k.target.position.set(0, -0.5, 0); scene.add(k, k.target); softShadows(k, { size: 4.6, mapSize: 2048 });
  const fl = new THREE.DirectionalLight("#ffffff", 0.55); fl.position.set(5, 2, 6); scene.add(fl);
};
const castAll = (o: THREE.Object3D, receive: boolean) => o.traverse((m) => { const x = m as THREE.Mesh; if (!x.isMesh) return; const mt = x.material as THREE.Material; x.castShadow = !mt.transparent; x.receiveShadow = receive; });
const cam = () => { const c = new THREE.PerspectiveCamera(30, W / H, 0.1, 100); c.position.set(0, 3.5, 17.0); c.lookAt(0, 0.5, 0); return c; };

// ------------------------------------------------------------------ the two people
type Person = Char & { grin: THREE.Group; frown: THREE.Mesh; glasses: THREE.Group; base: THREE.Color; isCR: boolean };
const extend = (c: Char, isCR: boolean): Person => {
  const mouthAt = onHead(0, 0.4, 0);
  const grin = new THREE.Group(); grin.position.copy(mouthAt).add(v3(0, 0.05, 0.015));
  grin.add(mesh(new THREE.SphereGeometry(1, 28, 14, 0, TAU, Math.PI / 2, Math.PI / 2), gloss("#6a1622", 0.5), [0, 0, 0], [0.23, 0.17, 0.06]));
  grin.add(mesh(new THREE.BoxGeometry(0.38, 0.065, 0.03), gloss("#ffffff", 0.25), [0, -0.035, 0.035]));
  const frown = mesh(new THREE.TorusGeometry(0.13, 0.028, 10, 28, Math.PI), gloss("#1d1a2b", 0.25)); frown.position.copy(mouthAt).add(v3(0, -0.06, 0));
  const glasses = new THREE.Group(), lens = gloss("#111318", 0.08);
  for (const s of [-1, 1]) { const l = mesh(new THREE.SphereGeometry(0.17, 24, 16), lens); l.position.copy(onHead(s * 0.31, 0.74, 0.07)); l.scale.set(1.2, 0.82, 0.3); glasses.add(l); }
  const bridge = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.26, 8), gloss("#222", 0.3)); bridge.position.copy(onHead(0, 0.8, 0.1)); bridge.rotation.z = Math.PI / 2; glasses.add(bridge);
  c.head.add(grin, frown, glasses);
  const base = new THREE.Color(isCR ? "#d99a6c" : "#ffc38f");
  (c.skin as THREE.MeshStandardMaterial).color.copy(base);
  return Object.assign(c, { grin, frown, glasses, base, isCR });
};
const makeYou = () => extend(buildChar(false), false);
const makeCR = (env: Env) => {
  const c = buildChar(false), red = gloss("#d4202c", 0.42), green = gloss("#17663d", 0.45);
  const skin = c.skin, body = c.body;
  (body.children[0] as THREE.Mesh).material = red; [1, 2, 3].forEach((i) => (body.children[i].visible = false));
  body.children[0].scale.set(1.04, 1.04, 0.84);
  c.arms.forEach((a) => { a.upper.material = red; a.sh.material = red; a.elbow.material = skin; a.lower.material = skin; a.cuff.material = skin; });
  c.legs.forEach((g) => { (g.children[0] as THREE.Mesh).material = skin; g.add(mesh(new THREE.CylinderGeometry(0.21, 0.2, 0.34, 20), green, [0, -0.13, 0])); g.add(mesh(new THREE.CylinderGeometry(0.158, 0.155, 0.2, 18), red, [0, -0.5, 0])); });
  const seven = textPlane(env, "7", { size: 0.62, color: "#ffffff" }).clone(); seven.position.set(0, -0.02, 0.495); body.add(seven);
  const collar = mesh(new THREE.TorusGeometry(0.24, 0.045, 10, 32), green, [0, 0.55, 0.02]); collar.rotation.x = Math.PI / 2 - 0.25; body.add(collar);
  // hair: black, short at the sides, a swept-up quiff in front
  const hairCap = c.head.children[3] as THREE.Mesh; (hairCap.material as THREE.MeshStandardMaterial).color.set("#17110d"); hairCap.scale.multiplyScalar(0.985);
  [4, 5, 6].forEach((i) => (c.head.children[i].visible = false));
  const hairM = hairCap.material as THREE.Material;
  for (const [x, y, z, r, sx, sy, sz, rx] of [[0, 1.5, 0.34, 0.25, 1.35, 0.62, 1.05, -0.55], [-0.24, 1.46, 0.25, 0.19, 1.1, 0.6, 1, -0.4], [0.24, 1.47, 0.26, 0.19, 1.1, 0.62, 1, -0.4], [0, 1.53, 0.06, 0.26, 1.5, 0.55, 1.25, -0.2]] as const) {
    const m = mesh(new THREE.SphereGeometry(r, 24, 16), hairM, [x, y, z], [sx, sy, sz]); m.rotation.x = rx; c.head.add(m);
  }
  c.eyes.forEach((e) => e.brow.scale.set(1.35, 1.25, 1));
  for (const s of [-1, 1]) { const st = mesh(new THREE.OctahedronGeometry(0.045), new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.05, metalness: 0.6, emissive: "#9fd8ff", emissiveIntensity: 0.35 })); st.position.set(s * 0.86, 0.47, 0.1); c.head.add(st); }
  return extend(c, true);
};

type Eyes = "open" | "wide" | "happy" | "shut" | "sleep";
type Mouth = "smile" | "grin" | "open" | "o" | "grim" | "firm" | "frown";
type Arm = { t: V3; q: THREE.Quaternion; curl?: number; thumb?: number };
type Pose = { p: V3; ry?: number; rz?: number; s?: number; lean?: number; twist?: number; sy?: number; legs?: [number, number, number, number]; head?: [number, number, number];
  L?: Arm; R?: Arm; eyes?: Eyes; mouth?: Mouth; gape?: number; brow?: number; tilt?: number; look?: [number, number]; cold?: number; glasses?: boolean };
/** pose a person from scratch: nothing is read back from the scene */
const pose = (c: Person, f: number, P: Pose) => {
  c.char.position.copy(P.p); c.char.rotation.set(0, P.ry ?? 0, P.rz ?? 0); c.char.scale.setScalar(P.s ?? S);
  const sy = P.sy ?? 1 + 0.012 * Math.sin((f / BAR) * TAU + (c.isCR ? 0 : 1.7));
  c.body.rotation.set(P.lean ?? 0, P.twist ?? 0, 0); c.body.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
  const lg = P.legs ?? [0, -0.05, 0, 0.05]; c.legs[0].rotation.set(lg[0], 0, lg[1]); c.legs[1].rotation.set(lg[2], 0, lg[3]);
  const hd = P.head ?? [0, 0, 0]; c.head.rotation.set(hd[0], hd[1], hd[2]);
  const cold = P.cold ?? 0; (c.skin as THREE.MeshStandardMaterial).color.copy(c.base).lerp(new THREE.Color("#a8d3f5"), cold * 0.8);
  c.spikes.forEach(({ m, i }) => { const s = cold * ease.outBack(clamp01(cold * 1.4 - i * 0.05)); m.visible = s > 0.01; m.scale.setScalar(Math.max(0.001, s)); });
  c.frost.visible = cold > 0.05; c.frost.scale.set(0.85 * (1 + 0.035 * cold), 0.8 * (1 + 0.04 * cold), 0.8 * (1 + 0.035 * cold)); c.drops.forEach(({ m }) => (m.visible = false));
  c.glasses.visible = !!P.glasses;
  const eyes = P.eyes ?? "open", look = P.look ?? [0, 0];
  c.eyes.forEach((e) => {
    e.open.visible = eyes === "open" || eyes === "wide"; e.shut.visible = eyes === "shut"; e.happy.visible = eyes === "happy" || eyes === "sleep";
    const w = eyes === "wide" ? 1.38 : 1, blink = eyes === "open" && (f + (c.isCR ? 0 : 60)) % 150 < 5 ? 0.15 : 1;
    e.open.scale.set(w, w * blink, 1); e.happy.rotation.z = eyes === "sleep" ? Math.PI : 0;
    e.g.position.copy(e.home).add(v3(look[0] * 0.05, look[1] * 0.05, 0));
    e.brow.position.copy(e.browHome).add(v3(0, P.brow ?? 0, 0)); e.brow.rotation.z = Math.PI / 2 - e.s * (P.tilt ?? 0);
  });
  const m = P.mouth ?? "smile";
  c.smile.visible = m === "smile"; c.grin.visible = m === "grin"; c.grim.visible = m === "grim"; c.firm.visible = m === "firm"; c.frown.visible = m === "frown";
  c.open.visible = m === "open" || m === "o";
  const gape = P.gape ?? 1; c.open.scale.set(m === "o" ? 0.55 : 1, m === "o" ? 0.5 * gape : gape, 1); c.tongue.position.set(0, -0.12, 0.04); c.tongue.scale.set(0.12, 0.09, 0.05);
  c.grim.scale.setScalar(1); c.firm.scale.set(1, 1.1, 1);
  const L = P.L ?? { t: REST_L, q: Q_DOWN_L, curl: 0.4 }, R = P.R ?? { t: REST_R, q: Q_DOWN_R, curl: 0.4 };
  setArm(c.arms[0], L.t, L.q); poseHand(c.arms[0].hand, L.curl ?? 0.4, L.thumb ?? 0.2);
  setArm(c.arms[1], R.t, R.q); poseHand(c.arms[1].hand, R.curl ?? 0.4, R.thumb ?? 0.2);
};
const stand = (x: number, z: number, lift = 0) => v3(x, Y0 + FOOT * S + lift, z);
const breathe = (f: number) => 0.02 * Math.sin((f / BAR) * TAU);
const walk = (f: number, amp = 0.55): [number, number, number, number] => { const s = Math.sin(f * 0.21) * amp; return [s, -0.04, -s, 0.04]; };
const swing = (f: number, amp = 0.2) => Math.sin(f * 0.21) * amp;

// ------------------------------------------------------------------ day 1: the bedroom
const buildBedroom = (env: Env) => {
  const scene = new THREE.Scene(); lightsFor(scene);
  const set = diorama(new THREE.MeshStandardMaterial({ map: planks([196, 140, 92], [170, 118, 76]), roughness: 0.7 }), "#9fb7e8");
  const wood = gloss("#8a5a3a", 0.55), white = gloss("#f7f4ee", 0.6);
  // the window: a sunrise outside
  set.add(box(1.25, 1.15, 0.08, gloss("#ffffff", 0.45), [-1.15, Y0 + 2.35, -1.68]));
  set.add(box(1.07, 0.97, 0.06, new THREE.MeshBasicMaterial({ color: "#ffd9a0" }), [-1.15, Y0 + 2.35, -1.64]));
  set.add(mesh(new THREE.CircleGeometry(0.2, 32), new THREE.MeshBasicMaterial({ color: "#fff3c4" }), [-1.35, Y0 + 2.2, -1.6]));
  set.add(box(0.05, 0.97, 0.08, gloss("#ffffff", 0.45), [-1.15, Y0 + 2.35, -1.6])); set.add(box(1.07, 0.05, 0.08, gloss("#ffffff", 0.45), [-1.15, Y0 + 2.35, -1.6]));
  // a poster of number 7 on your wall
  set.add(box(0.78, 1.05, 0.03, gloss("#d4202c", 0.6), [1.35, Y0 + 2.45, -1.68]));
  const p7 = textPlane(env, "7", { size: 0.8, color: "#ffffff" }).clone(); p7.position.set(1.35, Y0 + 2.45, -1.65); set.add(p7);
  // the bed, along x
  set.add(rounded(3.0, 0.42, 1.5, 0.08, wood, [0.15, Y0, -0.62]));
  set.add(rounded(0.16, 1.2, 1.5, 0.06, wood, [-1.42, Y0, -0.62]));
  set.add(rounded(2.82, 0.28, 1.36, 0.12, white, [0.18, Y0 + 0.42, -0.62]));
  set.add(rounded(0.6, 0.22, 0.95, 0.1, gloss("#ffffff", 0.5), [-1.0, Y0 + 0.7, -0.62]));
  const blanket = rounded(1.25, 0.7, 1.48, 0.28, gloss("#5d7fd6", 0.6), [1.08, Y0 + 0.62, -0.6]); set.add(blanket);
  for (let i = 0; i < 4; i++) set.add(box(0.06, 0.02, 1.5, gloss("#f2c14e", 0.5), [0.6 + i * 0.32, Y0 + 1.33, -0.6]));
  // nightstand, lamp, alarm clock
  set.add(rounded(0.7, 0.62, 0.6, 0.06, wood, [1.95, Y0, -1.25]));
  set.add(mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.4, 12), gloss("#444", 0.4), [2.05, Y0 + 0.82, -1.3]));
  set.add(mesh(new THREE.ConeGeometry(0.22, 0.26, 24, 1, true), gloss("#ffe7a8", 0.5), [2.05, Y0 + 1.1, -1.3]));
  const clock = new THREE.Group(); clock.position.set(1.78, Y0 + 0.62, -1.08); set.add(clock);
  clock.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 24), gloss("#e23b3b", 0.35), [0, 0.17, 0])); (clock.children[0] as THREE.Mesh).rotation.x = Math.PI / 2;
  clock.add(mesh(new THREE.CircleGeometry(0.115, 24), gloss("#ffffff", 0.4), [0, 0.17, 0.052]));
  for (const s of [-1, 1]) clock.add(mesh(new THREE.SphereGeometry(0.06, 12, 8, 0, TAU, 0, Math.PI / 2), gloss("#e2b13b", 0.3), [s * 0.1, 0.3, 0]));
  set.add(mesh(new THREE.CircleGeometry(1.0, 40), gloss("#f2c14e", 0.9), [-0.2, Y0 + 0.005, 0.95], [1.3, 1, 1])); (set.children[set.children.length - 1] as THREE.Mesh).rotation.x = -Math.PI / 2;
  castAll(set, true); scene.add(set);
  const pivot = new THREE.Group(); pivot.position.set(0.48, Y0 + 0.98, -0.55); scene.add(pivot);
  const you = makeYou(), cr = makeCR(env); pivot.add(you.char, cr.char); castAll(you.char, false); castAll(cr.char, false);
  const zzz = [0, 1, 2].map((i) => { const z = textPlane(env, "z", { size: 0.32 + i * 0.08, color: "#ffffff" }).clone(); scene.add(z); return z; });
  return { scene, cam: cam(), pivot, you, cr, clock, zzz };
};
const day1 = (s: ReturnType<typeof buildBedroom>, f: number) => {
  const swapped = f >= CUE.swap, c = swapped ? s.cr : s.you; s.you.char.visible = !swapped; s.cr.char.visible = swapped;
  // lying in bed, then sitting bolt upright: the pivot is the hip
  const sit = key(f, [[0, 0], [104, 0], [112, -0.06], [126, 1.06], [134, 1]], ease.inOutCubic) + 0.03 * spring(f, 134, FPS, 3, 0.3);
  const rot = (Math.PI / 2) * (1 - sit), shake = f > 126 && f < 150 ? 0.01 * Math.sin(f * 2) : 0;
  s.pivot.rotation.set(0, 0, rot + shake);
  const legsZ = Math.PI / 2 - rot;
  const asleep = f < 112, look = f >= 150 && f < 200;
  const L: Arm = f < 112 ? { t: v3(-0.35, 0.05, 0.62), q: Q_FWD, curl: 0.5 } : f < 140 ? { t: v3(-0.66, -0.25, 0.2), q: Q_DOWN_L, curl: 0.3 } : look ? { t: key3(f, [[140, -0.66, -0.25, 0.2], [158, -0.28, 0.95, 0.72]]), q: Q_FACE, curl: 0.15, thumb: 0.8 } : { t: key3(f, [[200, -0.28, 0.95, 0.72], [212, -0.6, 1.22, 0.48]], ease.outBack), q: Q_CHEEK_L, curl: 0.1, thumb: 0.8 };
  const R: Arm = f < 112 ? { t: v3(0.3, 0.05, 0.62), q: Q_FWD, curl: 0.5 } : f < 140 ? { t: v3(0.66, -0.25, 0.2), q: Q_DOWN_R, curl: 0.3 } : look ? { t: key3(f, [[140, 0.66, -0.25, 0.2], [160, 0.28, 0.95, 0.72]]), q: Q_FACE, curl: 0.15, thumb: 0.8 } : { t: key3(f, [[200, 0.28, 0.95, 0.72], [212, 0.6, 1.22, 0.48]], ease.outBack), q: Q_CHEEK_R, curl: 0.1, thumb: 0.8 };
  pose(c, f, { p: v3(0, 0.62 * S, 0), s: S, sy: asleep ? 1 + 0.03 * Math.sin(f * 0.08) : undefined, legs: [0, legsZ, 0, legsZ],
    head: asleep ? [0, 0, -0.15] : look ? [0.25, 0, 0] : [-0.05, 0, 0.04 * Math.sin(f * 0.4) * (f < 214 ? 1 : 0)],
    eyes: asleep ? "sleep" : f < 140 ? "wide" : "wide", mouth: asleep ? "firm" : f < 140 ? "o" : look ? "o" : "open", gape: look ? 1 : 1.4, brow: asleep ? 0 : 0.12, look: look ? [0, -0.9] : [0, 0], L, R });
  // the alarm clock rings
  const ring = f > 40 && f < 96 ? 1 : 0; s.clock.rotation.set(0, 0, ring * 0.18 * Math.sin(f * 2.2)); s.clock.position.y = Y0 + 0.62 + ring * 0.02 * Math.abs(Math.sin(f * 1.1));
  s.zzz.forEach((z, i) => { const t = ((f / 60 + i / 3) % 1); z.visible = f < CUE.swap - 10; z.position.set(-0.75 + t * 0.5 + i * 0.12, Y0 + 1.5 + t * 1.1, -0.2); (z.material as THREE.MeshBasicMaterial).opacity = Math.sin(t * Math.PI); });
};

// ------------------------------------------------------------------ day 2: the gym
const buildGym = (env: Env) => {
  const scene = new THREE.Scene(); lightsFor(scene);
  const set = diorama(new THREE.MeshStandardMaterial({ map: rubber(), roughness: 0.9 }), "#5f6f8e", { trim: "#3a4256" });
  const steel = new THREE.MeshStandardMaterial({ color: "#c9d0db", roughness: 0.25, metalness: 0.7 }), black = gloss("#25272e", 0.5);
  set.add(box(3.6, 1.3, 0.04, new THREE.MeshStandardMaterial({ color: "#bcd8f2", roughness: 0.05, metalness: 0.3 }), [0, Y0 + 2.0, -1.66])); // a wall mirror
  const gymTxt = textPlane(env, "GYM", { size: 0.42, color: "#ffd23f" }).clone(); gymTxt.position.set(0, Y0 + 3.05, -1.66); set.add(gymTxt);
  for (const x of [-1.6, 1.6]) set.add(box(0.12, 2.3, 0.12, black, [x, Y0 + 1.15, -1.25])); // the rack
  set.add(box(3.3, 0.1, 0.12, black, [0, Y0 + 2.3, -1.25]));
  for (let i = 0; i < 4; i++) { const db = new THREE.Group(); db.position.set(-1.7 + i * 0.22, Y0 + 0.2, 1.25); db.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), steel)); for (const y of [-0.17, 0.17]) db.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 16), black, [0, y, 0])); db.rotation.x = Math.PI / 2; set.add(db); }
  set.add(rounded(1.0, 0.36, 0.42, 0.08, gloss("#d4202c", 0.6), [1.75, Y0, 1.1]));
  castAll(set, true); scene.add(set);
  const bar = new THREE.Group(); bar.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.5, 12), steel)); (bar.children[0] as THREE.Mesh).rotation.z = Math.PI / 2;
  const plateC = ["#d4202c", "#2f6fd6", "#f2c14e", "#2fa35a", "#d4202c"];
  for (const s of [-1, 1]) plateC.forEach((col, i) => { const p = mesh(new THREE.CylinderGeometry(0.42 - i * 0.04, 0.42 - i * 0.04, 0.09, 32), gloss(col, 0.45), [s * (0.82 + i * 0.1), 0, 0]); p.rotation.z = Math.PI / 2; bar.add(p); });
  castAll(bar, false); scene.add(bar);
  const cr = makeCR(env); scene.add(cr.char); castAll(cr.char, false);
  return { scene, cam: cam(), bar, cr };
};
const day2 = (s: ReturnType<typeof buildGym>, f: number) => {
  const squat = key(f, [[260, 0], [292, 1], [318, 1.12], [330, 0], [345, -0.05], [360, 0]], ease.inOutCubic);
  const lift = key(f, [[318, 0], [330, 1]], ease.outExpo), pump = f > 400 ? Math.max(0, Math.sin(((f - 400) / 40) * Math.PI)) * (f < 480 ? 1 : 0) : 0;
  const grip = f >= 292 ? 1 : 0, wob = f > 330 ? 0.08 * spring(f, 330, FPS, 2.2, 0.15) : 0;
  const lowY = -1.02, lowZ = 0.62, up = 1.82 - 0.22 * pump;
  const hand = (sx: number) => v3(sx * 0.62, lerp(lowY + (1 - grip) * 0.6, up, lift), lerp(lowZ, 0.12, lift));
  const L: Arm = f < 270 ? { t: v3(-0.74, -0.3, 0.15), q: Q_DOWN_L, curl: 0.3 } : { t: hand(-1).lerp(f < 292 ? v3(-0.74, -0.3, 0.15) : hand(-1), f < 292 ? 1 - seg(f, 270, 292) : 1), q: lift > 0.5 ? Q_UP_L : Q_FWD, curl: 1, thumb: 0.1 };
  const R: Arm = f < 270 ? { t: v3(0.74, -0.3, 0.15), q: Q_DOWN_R, curl: 0.3 } : { t: hand(1).lerp(f < 292 ? v3(0.74, -0.3, 0.15) : hand(1), f < 292 ? 1 - seg(f, 270, 292) : 1), q: lift > 0.5 ? Q_UP_R : Q_FWD, curl: 1, thumb: 0.1 };
  const amazed = f >= 336 && f < 400;
  pose(s.cr, f, { p: stand(0, 0.2, -0.42 * squat * S), lean: 0.38 * squat - 0.06 * lift, legs: [-0.15 * squat, -0.08 - 0.42 * squat, -0.15 * squat, 0.08 + 0.42 * squat], head: [-0.25 * squat - 0.18 * lift * (amazed ? 1 : 0.4), 0, wob],
    eyes: f < 300 ? "open" : f < 336 ? "shut" : amazed ? "wide" : "happy", mouth: f < 300 ? "frown" : f < 336 ? "grim" : amazed ? "o" : "grin", brow: f < 300 ? 0.04 : amazed ? 0.14 : 0.06, tilt: f < 300 ? 0.35 : 0, look: f < 300 ? [0, -1] : amazed ? [0, 1] : [0, 0], L, R });
  // the bar rests on the floor until the hands close on it, then rides between them
  s.cr.char.updateMatrixWorld(true);
  const a = s.cr.arms[0].hand.g.getWorldPosition(v3()), b = s.cr.arms[1].hand.g.getWorldPosition(v3());
  const floor = v3(0, Y0 + 0.42, 0.2 + lowZ * S * 0.9), held = a.add(b).multiplyScalar(0.5);
  s.bar.position.copy(f < 292 ? floor : held); s.bar.rotation.set(0, 0, f > 330 ? 0.05 * Math.sin((f - 330) * 0.3) * Math.exp(-(f - 330) / 40) : 0);
};

// ------------------------------------------------------------------ day 4: the pitch
const GOAL = v3(1.35, Y0, -0.9);
const buildPitch = (env: Env) => {
  const scene = new THREE.Scene(); lightsFor(scene);
  const set = diorama(new THREE.MeshStandardMaterial({ map: grass(), roughness: 0.85 }), "#000", { wall: false, trim: "#c9e6c0" });
  const line = gloss("#ffffff", 0.6);
  set.add(box(4.4, 0.012, 0.06, line, [0, Y0 + 0.006, 0.55])); set.add(box(0.06, 0.012, 1.4, line, [-0.6, Y0 + 0.006, -0.15]));
  set.add(mesh(new THREE.TorusGeometry(0.55, 0.03, 6, 48, Math.PI), line, [-0.6, Y0 + 0.008, 0.55])); (set.children[set.children.length - 1] as THREE.Mesh).rotation.x = -Math.PI / 2;
  // the goal: posts, bar and a net that bulges
  const post = gloss("#ffffff", 0.3), gw = 2.3, gh = 1.25;
  for (const s of [-1, 1]) set.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, gh, 12), post, [GOAL.x + s * gw / 2, Y0 + gh / 2, GOAL.z]));
  const cross = mesh(new THREE.CylinderGeometry(0.05, 0.05, gw + 0.1, 12), post, [GOAL.x, Y0 + gh, GOAL.z]); cross.rotation.z = Math.PI / 2; set.add(cross);
  const nm = new THREE.MeshStandardMaterial({ map: netTex(), transparent: true, side: THREE.DoubleSide, roughness: 0.8, depthWrite: false });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh, 16, 10), nm); back.position.set(GOAL.x, Y0 + gh / 2, GOAL.z - 0.7); set.add(back);
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(gw, 0.7), nm); roof.rotation.x = -Math.PI / 2; roof.position.set(GOAL.x, Y0 + gh, GOAL.z - 0.35); set.add(roof);
  for (const s of [-1, 1]) { const side = new THREE.Mesh(new THREE.PlaneGeometry(0.7, gh), nm); side.rotation.y = Math.PI / 2; side.position.set(GOAL.x + s * gw / 2, Y0 + gh / 2, GOAL.z - 0.35); set.add(side); }
  castAll(set, true); back.castShadow = false;
  scene.add(set);
  // the ball: a white ball with dark pentagon patches, as data
  const ballTex = dataTex(64, 32, (x, y) => { const u = x / 64, v = y / 32, d = Math.min(...[[0.1, 0.5], [0.35, 0.2], [0.35, 0.8], [0.6, 0.5], [0.85, 0.2], [0.85, 0.8], [0.6, 0.05], [0.1, 0.95]].map(([a, b]) => Math.hypot((u - a) * 2, v - b))); return d < 0.12 ? [30, 30, 36] : [250, 250, 250]; });
  const ball = mesh(new THREE.SphereGeometry(0.17, 32, 20), new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.35 })); castAll(ball, false); scene.add(ball);
  const cr = makeCR(env); scene.add(cr.char); castAll(cr.char, false);
  const basePos = (back.geometry.attributes.position.array as Float32Array).slice();
  return { scene, cam: cam(), cr, ball, back, basePos };
};
const day4 = (s: ReturnType<typeof buildPitch>, f: number) => {
  const T0 = 568, T1 = 598, HIT = 600; // the ball leaves the boot, reaches the net
  const back = key(f, [[528, 0], [552, 1], [562, 1.05]], ease.inOutCubic), kick = key(f, [[556, 0], [570, 1]], ease.outExpo), settle = key(f, [[590, 0], [620, 1]]);
  const legR = lerp(lerp(0, 0.95, back), -1.55, kick) * (1 - settle), turn = key(f, [[600, 0], [618, 1]]);
  const shrug = f < 528 ? ease.outBack(seg(f, 492, 506)) * (1 - seg(f, 516, 528)) : 0, amazed = f >= 620;
  const L: Arm = amazed ? { t: key3(f, [[620, -0.74, -0.3, 0.15], [634, -0.62, 1.25, 0.25]], ease.outBack), q: Q_CHEEK_L, curl: 0.2, thumb: 0.8 } : shrug > 0 ? { t: v3(-0.95, 0.0, 0.45).lerp(REST_L, 1 - shrug), q: Q_SHOW, curl: 0.05, thumb: 0.8 } : { t: v3(-0.9, 0.05 + 0.2 * kick, -0.1 + 0.4 * back), q: Q_DOWN_L, curl: 0.3 };
  const R: Arm = amazed ? { t: key3(f, [[620, 0.74, -0.3, 0.15], [634, 0.62, 1.25, 0.25]], ease.outBack), q: Q_CHEEK_R, curl: 0.2, thumb: 0.8 } : shrug > 0 ? { t: v3(0.95, 0.0, 0.45).lerp(REST_R, 1 - shrug), q: Q_SHOW, curl: 0.05, thumb: 0.8 } : { t: v3(0.9, 0.05 + 0.15 * back, 0.3 - 0.5 * kick), q: Q_DOWN_R, curl: 0.3 };
  pose(s.cr, f, { p: stand(-1.15, 0.35, 0.06 * kick * (1 - settle)), ry: lerp(0.95, 0.15, turn) - (amazed ? 0.15 : 0), lean: -0.18 * back + 0.25 * kick * (1 - settle), legs: [0.25 * back * (1 - settle), -0.06, legR, 0.06],
    head: f < 528 ? [0.35, 0, 0.12 * shrug] : amazed ? [-0.08, -0.35 * (1 - turn), 0] : [0.3 * (1 - kick), 0, 0], eyes: f < 556 ? "open" : f < 600 ? "shut" : "wide", mouth: f < 528 ? "frown" : f < 600 ? "firm" : "open", gape: 1.3,
    brow: f < 528 ? 0.05 : 0.14, tilt: f < 528 ? 0.4 : 0, look: f < 556 ? [0.6, -1] : [0.4, 0.2], L, R });
  // the ball: rests, flies into the top corner, drops in the net
  const rest = v3(-0.55, Y0 + 0.17, 0.62), corner = v3(GOAL.x + 0.85, Y0 + 1.02, GOAL.z - 0.6);
  let p = rest.clone();
  if (f >= T0 && f < HIT) { const t = seg(f, T0, T1); p = rest.clone().lerp(corner, t); p.y += 0.9 * Math.sin(Math.PI * t) * 0.6; }
  else if (f >= HIT) { const t = (f - HIT) / FPS, y = Math.max(Y0 + 0.17, corner.y - 4.9 * t * t * 0.6), b = y <= Y0 + 0.17 ? 0.08 * Math.abs(Math.sin(t * 9)) * Math.exp(-t * 3) : 0; p = v3(corner.x - 0.2 * Math.min(t, 0.6), y + b, corner.z + 0.1); }
  s.ball.position.copy(p); s.ball.rotation.set(f >= T0 ? (f - T0) * 0.4 : 0, 0, f >= T0 ? (f - T0) * 0.25 : 0);
  // the net bulges where the ball hits it
  const pos = s.back.geometry.attributes.position as THREE.BufferAttribute, bulge = f >= HIT ? 0.32 * spring(f, HIT, FPS, 2.6, 0.35) : 0;
  for (let i = 0; i < pos.count; i++) { const x = s.basePos[i * 3], y = s.basePos[i * 3 + 1], d = Math.hypot(x - 0.85, y - 0.4); pos.setXYZ(i, x, y, -bulge * Math.exp(-d * d * 6)); }
  pos.needsUpdate = true;
};

// ------------------------------------------------------------------ day 5: the street
const buildStreet = (env: Env) => {
  const scene = new THREE.Scene(); lightsFor(scene);
  const set = diorama(new THREE.MeshStandardMaterial({ map: tiles([196, 196, 204], [182, 184, 194], [150, 152, 162]), roughness: 0.8 }), "#f3dfb8", { trim: "#a7a9b4" });
  set.add(box(2.4, 2.0, 0.08, gloss("#9cc6ec", 0.1), [0.5, Y0 + 1.35, -1.66])); // shop window
  for (let i = 0; i < 5; i++) { const lf = mesh(new THREE.CapsuleGeometry(0.11, 0.3, 6, 12), gloss("#c88a43", 0.55), [-0.35 + i * 0.42, Y0 + 0.75, -1.58]); lf.rotation.z = Math.PI / 2; set.add(lf); }
  set.add(box(2.4, 0.06, 0.4, gloss("#ffffff", 0.5), [0.5, Y0 + 0.62, -1.48]));
  const aw = mesh(new THREE.BoxGeometry(2.8, 0.06, 0.8), new THREE.MeshStandardMaterial({ map: awning(), roughness: 0.6 }), [0.5, Y0 + 2.55, -1.3]); aw.rotation.x = 0.35; set.add(aw);
  const sign = textPlane(env, "PANADERÍA", { size: 0.34, color: "#7a3b12" }).clone(); sign.position.set(0.5, Y0 + 3.05, -1.66); set.add(sign);
  set.add(box(0.8, 1.9, 0.06, gloss("#7a4a2a", 0.5), [-1.55, Y0 + 0.95, -1.66])); // door
  set.add(mesh(new THREE.CylinderGeometry(0.04, 0.05, 3.0, 12), gloss("#2b2f3a", 0.4), [2.05, Y0 + 1.5, 0.9])); set.add(mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: "#fff3c4" }), [2.05, Y0 + 3.05, 0.9]));
  castAll(set, true); scene.add(set);
  const cr = makeCR(env); scene.add(cr.char); castAll(cr.char, false);
  // the fans: simple people with phones
  const rr = rand(9), cols = ["#2f6fd6", "#2fa35a", "#f2c14e", "#9b59d0", "#ff8a3d", "#e85d9a", "#22a6b3", "#6c7a89"], skins = ["#ffc38f", "#e0a274", "#b9784e", "#8a5536", "#f5d0a9"];
  const fans = cols.map((col, i) => {
    const g = new THREE.Group(), sk = gloss(skins[i % skins.length], 0.45);
    g.add(mesh(new THREE.CapsuleGeometry(0.3, 0.42, 8, 20), gloss(col, 0.45), [0, 0.62, 0]));
    g.add(mesh(new THREE.SphereGeometry(0.34, 24, 16), sk, [0, 1.32, 0]));
    { const hr = mesh(new THREE.SphereGeometry(0.35, 24, 12, 0, TAU, 0, Math.PI * 0.45), gloss(["#2a1b12", "#e8c26a", "#111", "#7a3b12"][i % 4], 0.5), [0, 1.36, -0.02]); hr.rotation.x = -0.35; g.add(hr); }
    for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.045, 10, 8), gloss("#1d1a2b", 0.25), [s * 0.12, 1.36, 0.31]));
    const mouth = mesh(new THREE.SphereGeometry(1, 16, 10), gloss("#6a1622", 0.5), [0, 1.2, 0.3], [0.08, 0.07, 0.03]); g.add(mouth);
    for (const s of [-1, 1]) g.add(mesh(new THREE.CapsuleGeometry(0.11, 0.3, 6, 12), gloss("#2b2f3a", 0.5), [s * 0.14, 0.2, 0]));
    const arm = new THREE.Group(); arm.position.set(0.3, 0.85, 0); g.add(arm);
    arm.add(mesh(new THREE.CapsuleGeometry(0.075, 0.42, 6, 10), gloss(col, 0.45), [0, 0.25, 0]));
    const phone = new THREE.Group(); phone.position.set(0, 0.58, 0.05); arm.add(phone);
    phone.add(mesh(new THREE.BoxGeometry(0.17, 0.3, 0.03), gloss("#1b1c22", 0.3))); { const scr = mesh(new THREE.PlaneGeometry(0.14, 0.26), new THREE.MeshBasicMaterial({ color: "#8fd3ff" }), [0, 0, -0.017]); scr.rotation.y = Math.PI; phone.add(scr); }
    castAll(g, false); scene.add(g);
    const side = i % 2 ? 1 : -1, slot = Math.floor(i / 2);
    return { g, arm, phone, side, x: side * (0.45 + slot * 0.42 + rr() * 0.1), z: [-0.75, 0.75, -0.25, 0.95, -1.05, 0.35, 1.1, -0.5][i], delay: Math.floor(rr() * 30), s: 0.62 + rr() * 0.12 };
  });
  return { scene, cam: cam(), cr, fans };
};
const day5 = (s: ReturnType<typeof buildStreet>, f: number) => {
  const arrive = key(f, [[720, 0], [786, 1]], ease.linear), walking = f < 786, panic = f >= 860, run = key(f, [[896, 0], [952, 1]], ease.inCubic);
  const x = lerp(-2.7, 0.15, arrive) + lerp(0, -3.6, run), spot = f >= CUE.fans;
  const sw = walking || run > 0 ? swing(f, 0.25) : 0;
  const L: Arm = panic ? { t: v3(-0.62, 1.2, 0.5), q: Q_SHOW, curl: 0.05, thumb: 0.8 } : f >= 790 && f < 810 ? { t: v3(-0.35, 0.35, 0.8), q: Q_FWD, curl: 0.6 } : { t: v3(-0.74, -0.3, 0.15 + sw), q: Q_DOWN_L, curl: 0.4 };
  const R: Arm = panic ? { t: v3(0.62, 1.2, 0.5), q: Q_SHOW, curl: 0.05, thumb: 0.8 } : { t: v3(0.74, -0.3, 0.15 - sw), q: Q_DOWN_R, curl: 0.4 };
  pose(s.cr, f, { p: stand(x, 0.0, walking || run > 0 ? 0.04 * Math.abs(Math.sin(f * 0.21)) : 0), ry: walking ? 0.9 : run > 0 ? -1.2 : f < 820 ? -0.35 : 0, legs: walking || run > 0 ? walk(f, run > 0 ? 0.8 : 0.5) : undefined,
    head: spot && !panic ? [0, 0.5, 0] : f >= 790 && f < 810 ? [0.15, -0.5, 0] : [0, 0, 0], glasses: f < 880, eyes: panic ? "wide" : "open", mouth: panic ? "open" : f >= 790 && f < 815 ? "grin" : spot ? "o" : "smile", gape: 1.3, brow: panic ? 0.14 : 0.04, L, R });
  // the fans run in from both sides and hold their phones up
  s.fans.forEach((fn, i) => {
    const t0 = CUE.fans + 4 + fn.delay * (i === 0 ? 0 : 1), t = ease.outCubic(seg(f, t0, t0 + 34)), follow = run > 0 ? lerp(0, -3.4, run) : 0;
    const tx = 0.15 + fn.x + follow * (0.6 + 0.1 * i), fx = lerp(fn.side * 3.2, tx, t);
    fn.g.visible = f >= t0; fn.g.position.set(fx, Y0 + 0.11 * fn.s + (t < 1 || run > 0 ? 0.05 * Math.abs(Math.sin(f * 0.3 + i)) : 0), fn.z); fn.g.scale.setScalar(fn.s);
    fn.g.rotation.set(0, (t < 1 ? -fn.side * 1.2 : 0) + (run > 0 ? -1.0 : 0) - 0.25 * Math.sign(fx - x) * (t >= 1 ? 1 : 0), 0);
    const up = seg(f, t0 + 24, t0 + 36); fn.arm.rotation.set(-lerp(0.2, 1.3, up), 0, lerp(-0.2, 0.3, up));
  });
};

// ------------------------------------------------------------------ day 6: the kitchen and the ice bath
const TUB = v3(1.15, Y0, 0.3);
const buildKitchen = (env: Env) => {
  const scene = new THREE.Scene(); lightsFor(scene);
  const set = diorama(new THREE.MeshStandardMaterial({ map: tiles([238, 238, 236], [70, 76, 92], [200, 200, 200]), roughness: 0.6 }), "#a8d8c8", { trim: "#d8dee8" });
  const cab = gloss("#ffffff", 0.5), top = gloss("#5b6273", 0.35);
  set.add(rounded(2.1, 1.1, 0.8, 0.04, cab, [-1.15, Y0, -1.35])); set.add(rounded(2.2, 0.08, 0.9, 0.03, top, [-1.15, Y0 + 1.1, -1.33]));
  set.add(rounded(0.9, 2.6, 0.8, 0.06, gloss("#e6eaf0", 0.35), [1.75, Y0, -1.35])); // the fridge
  set.add(box(0.05, 0.6, 0.05, gloss("#9aa2b0", 0.3), [1.42, Y0 + 1.7, -0.93]));
  // dinner: chicken and broccoli on a plate, and a pizza in an open box
  set.add(mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.04, 32), gloss("#ffffff", 0.3), [-1.55, Y0 + 1.2, -1.25]));
  { const leg = mesh(new THREE.CapsuleGeometry(0.06, 0.14, 6, 12), gloss("#c8803d", 0.5), [-1.6, Y0 + 1.28, -1.25]); leg.rotation.z = 1.2; set.add(leg); }
  const pizzaBox = new THREE.Group(); pizzaBox.position.set(-0.6, Y0 + 1.18, -1.2); set.add(pizzaBox);
  pizzaBox.add(box(0.62, 0.05, 0.62, gloss("#c9a074", 0.7), [0, 0, 0]));
  const lid = box(0.62, 0.62, 0.03, gloss("#c9a074", 0.7), [0, 0.31, -0.31]); lid.rotation.x = -0.25; pizzaBox.add(lid);
  const pizza = new THREE.Group(); pizza.position.set(0, 0.04, 0); pizzaBox.add(pizza);
  pizza.add(mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.03, 32), gloss("#f2c14e", 0.45)));
  const rr = rand(4); for (let i = 0; i < 9; i++) { const a = rr() * TAU, r = 0.05 + rr() * 0.17; pizza.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 12), gloss("#c0392b", 0.4), [Math.cos(a) * r, 0.02, Math.sin(a) * r])); }
  const broc = new THREE.Group(); broc.position.set(0, 0.05, 0); pizzaBox.add(broc);
  broc.add(mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.16, 10), gloss("#8fc56a", 0.5), [0, 0.08, 0]));
  for (const [x, y, z] of [[0, 0.22, 0], [0.08, 0.19, 0.03], [-0.08, 0.19, 0.02], [0.02, 0.2, -0.07]] as const) broc.add(mesh(new THREE.SphereGeometry(0.075, 12, 10), gloss("#2f8f3a", 0.6), [x, y, z]));
  // the ice bath
  set.add(rounded(1.45, 0.62, 1.05, 0.25, gloss("#ffffff", 0.25), [TUB.x, Y0, TUB.z]));
  set.add(rounded(1.25, 0.03, 0.85, 0.2, new THREE.MeshStandardMaterial({ color: "#8fd0f2", roughness: 0.08, metalness: 0.1 }), [TUB.x, Y0 + 0.55, TUB.z]));
  const cubes: THREE.Mesh[] = []; for (let i = 0; i < 8; i++) { const m = mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), new THREE.MeshStandardMaterial({ color: "#e6f6ff", roughness: 0.1, flatShading: true }), [TUB.x - 0.45 + (i % 4) * 0.3, Y0 + 0.6, TUB.z - 0.25 + Math.floor(i / 4) * 0.5]); m.rotation.set(rr(), rr(), rr()); set.add(m); cubes.push(m); }
  castAll(set, true); scene.add(set);
  const drops = Array.from({ length: 14 }, () => { const m = mesh(new THREE.SphereGeometry(0.05, 10, 8), gloss("#bfe6ff", 0.1)); scene.add(m); return { m, a: rr() * TAU, v: 1.2 + rr() * 1.6, up: 2 + rr() * 2 }; });
  const cr = makeCR(env); scene.add(cr.char); castAll(cr.char, false);
  return { scene, cam: cam(), cr, pizza, broc, cubes, drops };
};
const day6 = (s: ReturnType<typeof buildKitchen>, f: number) => {
  const reach = key(f, [[976, 0], [992, -0.12], [1012, 1]], ease.inOutCubic) * (1 - seg(f, 1022, 1036)), poofed = f >= CUE.poof;
  s.pizza.visible = !poofed; s.broc.visible = poofed; s.broc.scale.setScalar(poofed ? ease.outBack(seg(f, CUE.poof, CUE.poof + 12)) : 0.001);
  // the walk to the tub, the crouch, the jump in (a parabola), the shivering
  const go = key(f, [[1046, 0], [1084, 1]], ease.inOutSine), crouch = key(f, [[1086, 0], [1100, 1]], ease.inOutCubic) * (1 - seg(f, 1100, 1104)), jt = seg(f, 1100, CUE.plunge + 4);
  const inTub = f >= CUE.plunge, x = lerp(-0.75, 0.25, go) + (f >= 1100 ? lerp(0, TUB.x - 0.25, ease.inOutSine(jt)) : 0);
  const sink = inTub ? -0.95 * S : 0, hop = f >= 1100 && !inTub ? 1.0 * Math.sin(Math.PI * jt) : 0, cold = inTub ? clamp01((f - CUE.plunge) / 24) : 0;
  const shiver = inTub ? Math.sin(f * 2.6) : 0, wk = f >= 1046 && f < 1084;
  const L: Arm = inTub ? { t: v3(-0.4, 0.2 + 0.03 * shiver, 0.55), q: Q_FWD, curl: 1 } : f >= 1100 ? { t: v3(-0.7, 1.2, 0.3), q: Q_UP_L, curl: 0.2 } : { t: v3(-0.74, -0.3, 0.15 + (wk ? swing(f) : 0)), q: Q_DOWN_L, curl: 0.4 };
  const R: Arm = inTub ? { t: v3(0.4, 0.2 - 0.03 * shiver, 0.55), q: Q_FWD, curl: 1 } : f >= 1100 ? { t: v3(0.7, 1.2, 0.3), q: Q_UP_R, curl: 0.2 } : reach > 0.01 ? { t: v3(0.74, -0.3, 0.15).lerp(v3(0.55, 0.45, -0.95), reach), q: Q_FWD, curl: 0.3 } : { t: v3(0.74, -0.3, 0.15 - (wk ? swing(f) : 0)), q: Q_DOWN_R, curl: 0.4 };
  const sad = poofed && f < 1046;
  pose(s.cr, f, { p: stand(x, inTub ? TUB.z : -0.05, sink + hop - 0.25 * crouch * S + (inTub ? 0.01 * shiver : 0)), ry: f < 1036 ? -0.55 * reach - 0.2 : wk ? 1.2 : f < 1100 ? 0.6 : 0, lean: 0.25 * crouch + 0.15 * reach,
    legs: wk ? walk(f) : f >= 1100 && !inTub ? [-0.6, -0.2, -0.6, 0.2] : inTub ? [-1.3, -0.15, -1.3, 0.15] : [0, -0.05 - 0.2 * crouch, 0, 0.05 + 0.2 * crouch],
    head: f < 1022 ? [0.15, -0.45 * reach, 0] : sad ? [0.25, 0, 0.05] : [0, 0, inTub ? 0.03 * shiver : 0], cold,
    eyes: inTub ? (f < CUE.plunge + 30 ? "wide" : "shut") : sad ? "open" : f < 1020 ? "happy" : f >= 1100 ? "shut" : "open", mouth: inTub ? (f < CUE.plunge + 30 ? "open" : "grim") : sad ? "frown" : f < 1020 ? "grin" : "firm", gape: 1.4,
    brow: sad ? 0.02 : 0.1, tilt: sad ? 0.45 : inTub ? 0.4 : 0, look: f < 1022 ? [-0.8, -0.6] : [0, 0], L, R });
  // the splash
  s.drops.forEach((d) => { const t = (f - CUE.plunge) / FPS; d.m.visible = t > 0 && t < 0.7; if (!d.m.visible) return; d.m.position.set(TUB.x + Math.cos(d.a) * d.v * t * 0.6, Y0 + 0.6 + d.up * t - 4.9 * t * t, TUB.z + Math.sin(d.a) * d.v * t * 0.4); });
  s.cubes.forEach((m, i) => { m.position.y = Y0 + 0.6 + (inTub ? 0.04 * Math.sin(f * 0.15 + i) * Math.exp(-(f - CUE.plunge) / 60) + (f < CUE.plunge + 20 ? 0.2 * Math.sin(Math.PI * clamp01((f - CUE.plunge) / 20)) : 0) : 0); });
};

// ------------------------------------------------------------------ day 7: the living room, and the swap back
const buildLiving = (env: Env) => {
  const scene = new THREE.Scene(); lightsFor(scene);
  const set = diorama(new THREE.MeshStandardMaterial({ map: planks([160, 112, 78], [138, 94, 62]), roughness: 0.7 }), "#f0b9a0");
  const fab = gloss("#3f6fb5", 0.8), dark = gloss("#2c4f8a", 0.8);
  set.add(rounded(2.6, 0.5, 1.0, 0.12, fab, [0.55, Y0 + 0.08, -1.05])); set.add(rounded(2.6, 0.95, 0.32, 0.12, dark, [0.55, Y0 + 0.08, -1.48]));
  for (const s of [-1, 1]) set.add(rounded(0.3, 0.8, 1.0, 0.12, dark, [0.55 + s * 1.3, Y0 + 0.08, -1.05]));
  for (const x of [-0.05, 1.15]) set.add(rounded(1.15, 0.18, 0.86, 0.1, gloss("#5287d1", 0.8), [x, Y0 + 0.58, -0.98]));
  set.add(mesh(new THREE.CircleGeometry(1.0, 40), gloss("#f2c14e", 0.9), [0.2, Y0 + 0.005, 0.5], [1.5, 1, 1])); (set.children[set.children.length - 1] as THREE.Mesh).rotation.x = -Math.PI / 2;
  set.add(mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.9, 10), gloss("#333", 0.4), [-1.95, Y0 + 0.95, -1.4])); set.add(mesh(new THREE.ConeGeometry(0.26, 0.3, 24, 1, true), gloss("#fff1cc", 0.5), [-1.95, Y0 + 1.95, -1.4]));
  set.add(box(0.9, 0.6, 0.06, gloss("#d4202c", 0.6), [-1.1, Y0 + 2.6, -1.68])); const p7 = textPlane(env, "7", { size: 0.48, color: "#ffffff" }).clone(); p7.position.set(-1.1, Y0 + 2.6, -1.64); set.add(p7);
  const bowl = new THREE.Group(); bowl.position.set(1.62, Y0 + 0.78, -0.85); set.add(bowl);
  bowl.add(mesh(new THREE.SphereGeometry(0.17, 20, 10, 0, TAU, Math.PI / 2, Math.PI / 2), gloss("#ffffff", 0.3)));
  for (let i = 0; i < 6; i++) { const ch = mesh(new THREE.BoxGeometry(0.07, 0.01, 0.06), gloss("#f2c14e", 0.4), [-0.08 + (i % 3) * 0.08, 0.02, -0.04 + Math.floor(i / 3) * 0.07]); ch.rotation.set(i, i * 2, 0); bowl.add(ch); }
  castAll(set, true); scene.add(set);
  const you = makeYou(), cr = makeCR(env); scene.add(you.char, cr.char); castAll(you.char, false); castAll(cr.char, false);
  const pad = new THREE.Group(); pad.add(mesh(new THREE.BoxGeometry(0.34, 0.08, 0.2), gloss("#22252c", 0.35))); for (const s of [-1, 1]) pad.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 10), gloss(s < 0 ? "#2fa35a" : "#d4202c", 0.3), [s * 0.1, 0.05, 0])); scene.add(pad); castAll(pad, false);
  return { scene, cam: cam(), you, cr, pad };
};
const SOFA = v3(0.75, Y0 + 0.66, -0.9);
const day7 = (s: ReturnType<typeof buildLiving>, f: number) => {
  // "you" (Cristiano inside): lounging, then the jump, the spin, the landing
  const getUp = key(f, [[1428, 0], [1446, 1]], ease.inOutCubic), crouch = key(f, [[1448, 0], [1460, 1]]) * (1 - seg(f, 1460, 1466));
  const jt = seg(f, 1464, CUE.siuu), air = f >= 1464 && f < CUE.siuu, landed = f >= CUE.siuu, land = landed ? spring(f, CUE.siuu, FPS, 2.6, 0.3) : 0;
  const sitP = v3(SOFA.x, SOFA.y + 0.62 * S, SOFA.z + 0.05), standP = stand(0.35, 0.55), jumpP = standP.clone().add(v3(0, 1.05 * Math.sin(Math.PI * jt), 0));
  const p = f < 1428 ? sitP : f < 1464 ? sitP.clone().lerp(standP, getUp).add(v3(0, -0.22 * crouch * S, 0)) : air ? jumpP : standP.clone().add(v3(0, -0.12 * S * Math.max(0, land), 0));
  const spin = air ? -TAU * ease.inOutCubic(jt) : 0, munch = f < 1428 && (f % 90) > 60;
  const sofaL: Arm = { t: v3(-0.3, 0.05, 0.75), q: Q_FWD, curl: 0.9 }, sofaR: Arm = munch ? { t: v3(0.18, 1.08, 0.62), q: Q_FACE, curl: 0.8 } : { t: v3(0.3, 0.05, 0.75), q: Q_FWD, curl: 0.9 };
  const shrug = f >= 1330 && f < 1400 ? ease.outBack(seg(f, 1330, 1344)) * (1 - seg(f, 1388, 1400)) : 0;
  const siuL: Arm = { t: v3(-1.12, -0.62, 0.25), q: Q_SHOW, curl: 0.05, thumb: 0.8 }, siuR: Arm = { t: v3(1.12, -0.62, 0.25), q: Q_SHOW, curl: 0.05, thumb: 0.8 };
  const upL: Arm = { t: v3(-0.7, 1.25, 0.25), q: Q_UP_L, curl: 0.1 }, upR: Arm = { t: v3(0.7, 1.25, 0.25), q: Q_UP_R, curl: 0.1 };
  pose(s.you, f, { p, ry: spin, lean: f < 1428 ? -0.18 : landed ? -0.22 : air ? 0.05 : 0.2 * crouch, legs: f < 1428 ? [-1.45, -0.12, -1.45, 0.12] : landed ? [0.1, -0.55, 0.1, 0.55] : air ? [-0.3, -0.15, 0.25, 0.15] : [0, -0.08, 0, 0.08],
    head: f < 1428 ? [0.08, -0.1, shrug * 0.12] : landed ? [-0.18, 0, 0] : [0, 0, 0], glasses: true,
    eyes: landed ? "shut" : f < 1428 ? "open" : "happy", mouth: landed || air ? "open" : munch ? "firm" : "grin", gape: landed ? 1.55 : 1.2, brow: landed ? 0.1 : 0.03,
    L: landed || air ? (air && jt < 0.5 ? upL : siuL) : f < 1428 ? (shrug > 0 ? { t: v3(-0.9, 0.15, 0.5).lerp(sofaL.t, 1 - shrug), q: Q_SHOW, curl: 0.05, thumb: 0.8 } : sofaL) : { t: REST_L, q: Q_DOWN_L, curl: 0.4 },
    R: landed || air ? (air && jt < 0.5 ? upR : siuR) : f < 1428 ? (shrug > 0 ? { t: v3(0.9, 0.15, 0.5).lerp(sofaR.t, 1 - shrug), q: Q_SHOW, curl: 0.05, thumb: 0.8 } : sofaR) : { t: REST_R, q: Q_DOWN_R, curl: 0.4 } });
  // the controller sits in the hands on the sofa, then on the cushion
  if (f < 1428) { s.you.char.updateMatrixWorld(true); const a = s.you.arms[0].hand.g.getWorldPosition(v3()), b = s.you.arms[1].hand.g.getWorldPosition(v3()); s.pad.position.copy(munch ? a.add(v3(0.12, 0, 0)) : a.add(b).multiplyScalar(0.5)); s.pad.rotation.set(0.5, 0, 0); }
  else { s.pad.position.set(SOFA.x + 0.35, SOFA.y + 0.12, SOFA.z + 0.1); s.pad.rotation.set(0, 0.3, 0); }
  // Cristiano's body (you inside): begging, pointing at himself, then jaw on the floor
  const shocked = f >= CUE.siuu - 6, beg = f < 1330, point = f >= 1330 && f < 1420;
  const bob = beg ? 0.06 * Math.abs(Math.sin(f * 0.12)) : 0;
  pose(s.cr, f, { p: stand(-1.25, 0.25, shocked ? 0.04 * spring(f, CUE.siuu, FPS, 3, 0.3) : 0), ry: 0.45, lean: beg ? 0.1 + bob : shocked ? -0.12 : 0,
    head: shocked ? [-0.1, 0, 0] : beg ? [0.05, 0.1, 0.05] : [0, 0.2, 0], eyes: shocked ? "wide" : "open", mouth: shocked ? "open" : beg ? "frown" : "o", gape: 1.5, brow: shocked ? 0.16 : 0.06, tilt: shocked ? 0 : 0.45,
    L: shocked ? { t: v3(-0.62, 1.25, 0.3), q: Q_CHEEK_L, curl: 0.2, thumb: 0.8 } : beg ? { t: v3(-0.08, 0.45 + bob, 0.68), q: Q_PRAY_L, curl: 0.05, thumb: 0.6 } : point ? { t: v3(-0.4, 0.5, 0.55), q: Q_FWD, curl: 0.7, thumb: 1 } : { t: REST_L, q: Q_DOWN_L },
    R: shocked ? { t: v3(0.62, 1.25, 0.3), q: Q_CHEEK_R, curl: 0.2, thumb: 0.8 } : beg ? { t: v3(0.08, 0.45 + bob, 0.68), q: Q_PRAY_R, curl: 0.05, thumb: 0.6 } : point ? { t: v3(0.95, 0.3, 0.9), q: Q_FWD, curl: 0.8, thumb: 0.1 } : { t: REST_R, q: Q_DOWN_R } });
};

// ------------------------------------------------------------------ 2D: captions, the swap sparkle, flashes, the poof, SIUUU
type Line = { text: string; em: number; color?: string };
const CAPS: { from: number; to: number; lines: Line[] }[] = [
  { from: 0, to: CUT.d2, lines: [{ text: "DÍA 1", em: 52, color: "#ffd23f" }, { text: "Despiertas en el cuerpo", em: 60 }, { text: "de Cristiano Ronaldo", em: 60 }] },
  { from: CUT.d2, to: CUT.d4, lines: [{ text: "DÍA 2", em: 52, color: "#ffd23f" }, { text: "Fuerza de sobra", em: 64 }] },
  { from: CUT.d4, to: CUT.d5, lines: [{ text: "DÍA 4", em: 52, color: "#ffd23f" }, { text: "Tú no sabes patear…", em: 60 }, { text: "pero su cuerpo sí", em: 60 }] },
  { from: CUT.d5, to: CUT.d6, lines: [{ text: "DÍA 5", em: 52, color: "#ffd23f" }, { text: "Ya no puedes ni", em: 60 }, { text: "comprar pan", em: 60 }] },
  { from: CUT.d6, to: CUT.d7, lines: [{ text: "DÍA 6", em: 52, color: "#ffd23f" }, { text: "Pollo, siesta y", em: 60 }, { text: "baño de hielo", em: 60 }] },
  { from: CUT.d7, to: 1428, lines: [{ text: "DÍA 7", em: 52, color: "#ffd23f" }, { text: "Quieres tu vida de vuelta…", em: 60 }, { text: "pero él está feliz", em: 60 }] },
  { from: 1428, to: CUE.siuu - 4, lines: [{ text: "¿Tú cambiarías?", em: 76 }] },
  { from: CUE.siuu - 4, to: CUT.end, lines: [{ text: "¡SIUUU!", em: 170, color: "#ffd23f" }] },
];
const SAFE_L = 147, SAFE_R = 934;
const captions = (ctx: Ctx, env: Env, f: number) => {
  const cap = CAPS.find((c) => f >= c.from && f < c.to); if (!cap) return;
  const font = defaultFont(); let y = 210;
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  cap.lines.forEach((line, i) => {
    const lay = layoutText(font, line.text), em = Math.min(line.em, (SAFE_R - SAFE_L - 30) / (lay.width / font.unitsPerEm)), big = line.em > 120;
    const at = cap.from + 6 + i * 7, t = big ? ease.outBack(seg(f, cap.from + 4, cap.from + 14)) : ease.outCubic(seg(f, at, at + 14)), out = cap.to === CUT.end ? 1 : 1 - seg(f, cap.to - 8, cap.to - 1);
    y += em * (i ? 0.66 : 0.45);
    if (t > 0) {
      ctx.save(); ctx.translate((SAFE_L + SAFE_R) / 2, y + (big ? 140 : (1 - t) * 20)); if (big) { const sc = t * (1 + 0.04 * Math.sin(f * 0.5)); ctx.scale(sc, sc); ctx.rotate(-0.05); }
      ctx.globalAlpha = Math.min(1, t) * out * 0.55; ctx.fillStyle = "#0d2f7a"; fillText2d(ctx as unknown as CanvasRenderingContext2D, font, lay, em, 0, em * 0.36 + (big ? 9 : 5));
      ctx.globalAlpha = Math.min(1, t) * out; ctx.fillStyle = line.color ?? "#ffffff"; fillText2d(ctx as unknown as CanvasRenderingContext2D, font, lay, em, 0, em * 0.36);
      ctx.restore();
    }
    y += em * 0.62;
  });
  ctx.restore();
};
const star = (ctx: Ctx, x: number, y: number, r: number, col: string, rot = 0) => { ctx.fillStyle = col; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = rot + (i / 8) * TAU, rad = i % 2 ? r * 0.38 : r; i ? ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad) : ctx.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } ctx.closePath(); ctx.fill(); };
const fx2d = (ctx: Ctx, env: Env, f: number, camera: THREE.PerspectiveCamera, scene: string, s: unknown) => {
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  if (scene === "d1" && f > 62 && f < 120) { // the swap: a swirl of sparkles over the bed, a white flash
    const [cx, cy] = screenPx(camera, v3(-0.4, Y0 + 1.2, -0.5), env), k = seg(f, 62, 96), out = 1 - seg(f, 96, 120);
    for (let i = 0; i < 16; i++) { const a = i * 0.785 + f * 0.25, r = (40 + i * 14) * (0.4 + 0.6 * k) * out; ctx.globalAlpha = out * 0.9; star(ctx, cx + Math.cos(a) * r * 1.4, cy + Math.sin(a) * r * 0.7, 10 + (i % 3) * 6, i % 2 ? "#ffd23f" : "#ffffff", f * 0.1 + i); }
    ctx.globalAlpha = 0.85 * Math.max(0, 1 - Math.abs(f - CUE.swap) / 8); ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
  }
  if (scene === "d5") { // camera flashes from the phones
    const st = s as ReturnType<typeof buildStreet>;
    st.fans.forEach((fn, i) => { if (!fn.g.visible) return; const ph = (f + i * 17) % 37; if (f < CUE.fans + 40 || ph > 5) return; const w = fn.phone.getWorldPosition(v3()), [x, y] = screenPx(camera, w, env); ctx.globalAlpha = 1 - ph / 6; star(ctx, x, y, 34, "#ffffff", i); star(ctx, x, y, 16, "#fff6b0", i + 0.4); });
    if (f >= CUE.fans && f < CUE.fans + 60) { // "¡ES ÉL!" in a speech bubble
      const t = ease.outBack(seg(f, CUE.fans, CUE.fans + 10)), [x, y] = screenPx(camera, v3(1.6, Y0 + 2.3, 0.5), env), font = defaultFont(), lay = layoutText(font, "¡ES ÉL!");
      ctx.globalAlpha = 1; ctx.translate(x, y); ctx.scale(t, t); ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.ellipse(0, 0, 150, 70, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(-20, 60); ctx.lineTo(-60, 120); ctx.lineTo(20, 64); ctx.fill();
      ctx.fillStyle = "#d4202c"; fillText2d(ctx as unknown as CanvasRenderingContext2D, font, lay, 54, 0, 54 * 0.36);
    }
  }
  if (scene === "d6" && f >= CUE.poof - 4 && f < CUE.poof + 20) { // the pizza goes poof
    const [x, y] = screenPx(camera, v3(-0.6, Y0 + 1.3, -1.2), env), t = seg(f, CUE.poof - 4, CUE.poof + 20);
    for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU, r = 30 + 60 * t; ctx.globalAlpha = 1 - t; ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7, 26 * (1 - t * 0.5), 0, TAU); ctx.fill(); }
  }
  if (scene === "d7" && f >= CUE.siuu && f < CUE.siuu + 24) { // the landing shockwave
    const [x, y] = screenPx(camera, v3(0.35, Y0, 0.55), env), t = seg(f, CUE.siuu, CUE.siuu + 24);
    ctx.globalAlpha = 1 - t; ctx.strokeStyle = "#ffd23f"; ctx.lineWidth = 14 * (1 - t) + 2; ctx.beginPath(); ctx.ellipse(x, y, 80 + 420 * t, 22 + 110 * t, 0, 0, TAU); ctx.stroke();
  }
  ctx.restore();
};

const LOOK = { clear: null, toneMapping: THREE.ACESFilmicToneMapping, exposure: 1.08, shadows: true } as const;
const shot = <T extends { scene: THREE.Scene; cam: THREE.PerspectiveCamera }>(id: string, start: number, build: (env: Env) => T, anim: (s: T, f: number) => void) => (ctx: Ctx, local: number, env: Env) => {
  const f = start + local, s = memo(env, `cr7:${id}`, build);
  anim(s, f); backdrop(ctx, env); draw3d(ctx, env, s.scene, s.cam, LOOK);
  s.cam.updateMatrixWorld(); fx2d(ctx, env, f, s.cam, id, s); captions(ctx, env, f); vignette(ctx, env, 0.2, "#0a2a6e");
};

export const cristiano: Film = {
  meta: { title: "Una semana siendo Cristiano", W, H, fps: FPS, bpm: 120, durationFrames: CUT.end, kind: "story", poster: 345,
    sync: Object.entries(CUE).map(([label, frame]) => ({ frame, label })),
    checks: { none: { "3d": "props are held by eye (bar, controller) and checked on stills; no physics grips" } } },
  assets: { images: {} },
  shots: [
    { id: "d1", start: CUT.d1, end: CUT.d2, draw: shot("d1", CUT.d1, buildBedroom, day1) },
    { id: "d2", start: CUT.d2, end: CUT.d4, draw: shot("d2", CUT.d2, buildGym, day2) },
    { id: "d4", start: CUT.d4, end: CUT.d5, draw: shot("d4", CUT.d4, buildPitch, day4) },
    { id: "d5", start: CUT.d5, end: CUT.d6, draw: shot("d5", CUT.d5, buildStreet, day5) },
    { id: "d6", start: CUT.d6, end: CUT.d7, draw: shot("d6", CUT.d6, buildKitchen, day6) },
    { id: "d7", start: CUT.d7, end: CUT.end, draw: shot("d7", CUT.d7, buildLiving, day7) },
  ],
};
