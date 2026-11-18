// UNA SEMANA SIENDO CRISTIANO, in the house style of the Jeff Buckley documentary: dark low-poly 3D
// rooms under a warm key light, flat 2D stick characters drawn over them, big word-by-word captions,
// a coloured label pill per scene and punch words that pop. Same narration and score as the diorama cut.
// 30 fps, 120 bpm: a beat is 15 frames, every scene cut is on a bar (60 frames).
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import * as THREE from "three";
import { draw3d, memo, rand } from "../three-core/stage";
import { clamp01, ease, lerp, seg, spring } from "../three-core/time";
import { defaultFont, layoutText, textPlane } from "../three-core/type3d";
import { vignette } from "../three-core/look";
import { screenPx } from "../three-core/camera";
import WORDS from "./cristiano2d.words.json";

const W = 1080, H = 1920, FPS = 30, END = 840, TAU = Math.PI * 2;
export const CUT = { d1: 0, d2: 120, d4: 240, d5: 360, d6: 480, d7: 600, end: END };
export const CUE = { swap: 60, sit: 66, lift: 165, kick: 325, fans: 410, plunge: 555, jump: 745, siuu: 764 };
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const key = (f: number, ks: [number, number][], e = ease.inOutCubic) => { if (f <= ks[0][0]) return ks[0][1]; for (let i = 1; i < ks.length; i++) if (f <= ks[i][0]) return lerp(ks[i - 1][1], ks[i][1], e(seg(f, ks[i - 1][0], ks[i][0]))); return ks[ks.length - 1][1]; };

// ------------------------------------------------------------------ low-poly 3D sets
const mat = (c: string, rough = 0.85, emissive?: string, ei = 1) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0, flatShading: true, ...(emissive ? { emissive, emissiveIntensity: ei } : {}) });
const box = (g: THREE.Object3D, w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, ry = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y + h / 2, z); o.rotation.y = ry; g.add(o); return o; };
const cyl = (g: THREE.Object3D, r: number, h: number, m: THREE.Material, x: number, y: number, z: number, seg = 10) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m); o.position.set(x, y + h / 2, z); g.add(o); return o; };
const dataTex = (w: number, h: number, fn: (x: number, y: number) => [number, number, number], rx = 1, ry = 1) => {
  const d = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b] = fn(x, y), i = (y * w + x) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; }
  const t = new THREE.DataTexture(d, w, h, THREE.RGBAFormat); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
};
const room = (scene: THREE.Scene, floor: string | THREE.Texture, wall: string, opts: { side?: boolean; warm?: string; key?: number } = {}) => {
  const g = new THREE.Group(); scene.add(g);
  const fm = typeof floor === "string" ? mat(floor) : new THREE.MeshStandardMaterial({ map: floor, roughness: 0.9, flatShading: true });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), fm); fl.rotation.x = -Math.PI / 2; g.add(fl);
  box(g, 14, 6, 0.2, mat(wall), 0, 0, -3.2);
  if (opts.side !== false) box(g, 0.2, 6, 10, mat(wall), -3.4, 0, 1.5);
  // warm key from above, a dim fill, darkness at the edges (the vignette does the rest)
  const spot = new THREE.SpotLight(opts.warm ?? "#ffd9a8", opts.key ?? 60, 16, 0.75, 0.6, 1.6); spot.position.set(0.6, 5.5, 3.5); spot.target.position.set(0, 0.6, -1); scene.add(spot, spot.target);
  scene.add(new THREE.HemisphereLight("#8a7a9a", "#1a1410", 0.55));
  return g;
};
const cam = (z = 7.2, y = 1.7, ty = 0.95) => { const c = new THREE.PerspectiveCamera(42, W / H, 0.1, 60); c.position.set(0, y, z); c.lookAt(0, ty, 0); c.userData.base = { z, y, ty }; return c; };
const push = (c: THREE.PerspectiveCamera, t: number, amt = 0.6, f = 0) => { const b = c.userData.base; c.position.set(0.05 * Math.sin(f * 0.031), b.y + 0.03 * Math.sin(f * 0.023), b.z - amt * ease.inOutSine(clamp01(t))); c.lookAt(0, b.ty, 0); c.updateMatrixWorld(); };

const buildBedroom = (env: Env) => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#120d0a");
  const g = room(scene, dataTex(32, 32, (x, y) => ((Math.floor(y / 4) + (x > 16 ? 1 : 0)) % 2 ? [92, 62, 40] : [104, 72, 46]), 6, 6), "#c9b28e");
  box(g, 1.4, 1.2, 0.08, mat("#f6e6c2", 0.4, "#ffe2a8", 0.9), -1.7, 1.7, -3.08); // a lit window
  box(g, 0.7, 0.95, 0.04, mat("#c8302c", 0.7), 1.55, 1.8, -3.08); const p7 = textPlane(env, "7", { size: 0.62, color: "#ffffff" }).clone(); p7.position.set(1.55, 2.27, -3.03); g.add(p7);
  box(g, 3.0, 0.45, 1.6, mat("#5a3a26"), 0.25, 0, -1.6); box(g, 2.9, 0.25, 1.5, mat("#efe9df", 0.9), 0.25, 0.45, -1.6); box(g, 0.14, 1.1, 1.6, mat("#5a3a26"), -1.3, 0, -1.6);
  box(g, 0.55, 0.18, 1.0, mat("#ffffff", 0.9), -0.9, 0.7, -1.6); box(g, 1.75, 0.2, 1.56, mat("#3d5fa8", 0.9), 0.7, 0.66, -1.6);
  box(g, 0.6, 0.6, 0.55, mat("#5a3a26"), 2.15, 0, -2.3); cyl(g, 0.05, 0.4, mat("#333"), 2.15, 0.6, -2.3); cyl(g, 0.2, 0.25, mat("#ffe7b0", 0.6, "#ffcf7a", 1.2), 2.15, 1.0, -2.3, 8);
  const lamp = new THREE.PointLight("#ffbf6b", 6, 4, 2); lamp.position.set(2.15, 1.2, -2.1); scene.add(lamp);
  return { scene, cam: cam(6.8, 1.9, 0.85) };
};
const buildGym = (env: Env) => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#0d0f14");
  const g = room(scene, dataTex(16, 16, (x, y) => ((x * 7 + y * 13) % 11 === 0 ? [70, 74, 86] : [42, 45, 54]), 10, 10), "#4c5262", { warm: "#ffe6c4" });
  box(g, 4.5, 1.6, 0.05, new THREE.MeshStandardMaterial({ color: "#9fb4c8", roughness: 0.1, metalness: 0.5 }), 0, 0.9, -3.08);
  const gym = textPlane(env, "GYM", { size: 0.5, color: "#ffd23f" }).clone(); gym.position.set(0, 2.9, -3.05); g.add(gym);
  for (const x of [-2.2, 2.2]) box(g, 0.12, 2.4, 0.12, mat("#1d1f26", 0.5), x, 0, -2.4); box(g, 4.5, 0.1, 0.12, mat("#1d1f26", 0.5), 0, 2.3, -2.4);
  for (let i = 0; i < 5; i++) cyl(g, 0.11, 0.08, mat(["#c8302c", "#2f6fd6", "#f2c14e", "#2fa35a", "#c8302c"][i]), -2.7 + i * 0.3, 0, 0.6, 12);
  box(g, 1.2, 0.4, 0.45, mat("#c8302c", 0.6), 2.3, 0, 0.3);
  return { scene, cam: cam(6.8, 1.8, 0.9) };
};
const buildPitch = (env: Env) => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#060a14");
  const grass = dataTex(16, 16, (x) => (Math.floor(x / 8) % 2 ? [38, 104, 52] : [46, 122, 60]), 8, 8);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ map: grass, roughness: 0.9, flatShading: true })); fl.rotation.x = -Math.PI / 2; scene.add(fl);
  const white = mat("#f2f2f2", 0.5); box(scene, 6, 0.01, 0.06, white, 0, 0.005, 0.6);
  const GX = 1.4, GZ = -2.2, gw = 2.8, gh = 1.5;
  for (const s of [-1, 1]) cyl(scene, 0.05, gh, white, GX + (s * gw) / 2, 0, GZ); const bar = cyl(scene, 0.05, gw, white, GX, gh - gw / 2, GZ); bar.rotation.z = Math.PI / 2; bar.position.y = gh;
  const nt = (() => { const n = 64, d = new Uint8Array(n * n * 4); for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const on = x % 8 < 1 || y % 8 < 1, i = (y * n + x) * 4; d[i] = d[i + 1] = d[i + 2] = 240; d[i + 3] = on ? 220 : 0; } const t = new THREE.DataTexture(d, n, n, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 3); t.needsUpdate = true; return t; })();
  const net = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh, 16, 10), new THREE.MeshStandardMaterial({ map: nt, transparent: true, side: THREE.DoubleSide, depthWrite: false })); net.position.set(GX, gh / 2, GZ - 0.8); scene.add(net);
  for (const x of [-3.5, 4.2]) { cyl(scene, 0.07, 6, mat("#333a44"), x, 0, -6); box(scene, 1.0, 0.5, 0.2, mat("#fffbe8", 0.3, "#fff4c8", 2.5), x, 6, -6); }
  const sun = new THREE.SpotLight("#f4f6ff", 90, 25, 0.7, 0.5, 1.4); sun.position.set(-2, 8, 4); sun.target.position.set(0.5, 0, -1); scene.add(sun, sun.target); scene.add(new THREE.HemisphereLight("#6a7aa8", "#0a1208", 0.5));
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 1), mat("#f5f5f5", 0.5)); scene.add(ball);
  const base = (net.geometry.attributes.position.array as Float32Array).slice();
  return { scene, cam: cam(6.8, 1.6, 0.8), ball, net, base, GX, GZ, gh };
};
const buildStreet = (env: Env) => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#0c0a12");
  const g = room(scene, dataTex(16, 16, (x, y) => (x % 8 === 0 || y % 8 === 0 ? [70, 70, 78] : [104, 104, 112]), 10, 10), "#d9c29c", { side: false });
  box(g, 3.0, 1.6, 0.06, mat("#ffd79a", 0.4, "#ffc46b", 0.9), 0.6, 0.5, -3.08);
  for (let i = 0; i < 5; i++) { const lf = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.3, 3, 6), mat("#b9772f", 0.7)); lf.rotation.z = Math.PI / 2; lf.position.set(-0.4 + i * 0.5, 0.75, -3.0); g.add(lf); }
  const aw = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 1.0), new THREE.MeshStandardMaterial({ map: dataTex(16, 2, (x) => (Math.floor(x / 2) % 2 ? [240, 236, 228] : [196, 44, 50]), 3, 1), roughness: 0.7, flatShading: true }));
  aw.position.set(0.6, 2.5, -2.65); aw.rotation.x = 0.35; g.add(aw);
  const sign = textPlane(env, "PANADERÍA", { size: 0.42, color: "#5a2a0e" }).clone(); sign.position.set(0.6, 3.15, -3.05); g.add(sign);
  box(g, 1.0, 2.2, 0.06, mat("#5a3a26"), -2.0, 0, -3.08);
  cyl(g, 0.05, 3.4, mat("#22252c"), 2.8, 0, 0.4); box(g, 0.35, 0.3, 0.35, mat("#fff4c8", 0.3, "#ffe7a0", 2), 2.8, 3.4, 0.4);
  return { scene, cam: cam(7.0, 1.8, 0.9) };
};
const buildKitchen = (env: Env) => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#0b1014");
  const g = room(scene, dataTex(16, 16, (x, y) => ((Math.floor(x / 8) + Math.floor(y / 8)) % 2 ? [220, 220, 216] : [56, 62, 74]), 8, 8), "#9ec9bb", { warm: "#e8f2ff" });
  box(g, 2.4, 1.0, 0.8, mat("#f2f2f2", 0.6), -1.7, 0, -2.6); box(g, 2.5, 0.08, 0.9, mat("#4d5563", 0.5), -1.7, 1.0, -2.6);
  box(g, 1.0, 2.6, 0.8, mat("#e2e6ec", 0.4), 1.9, 0, -2.6);
  cyl(g, 0.26, 0.04, mat("#ffffff", 0.4), -2.1, 1.08, -2.5, 16); const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.18, 3, 8), mat("#c8803d", 0.6)); leg.rotation.z = 1.2; leg.position.set(-2.12, 1.18, -2.5); g.add(leg);
  for (const [x, z] of [[-1.98, -2.45], [-2.05, -2.6]]) { cyl(g, 0.03, 0.1, mat("#7cb35a"), x, 1.1, z, 6); const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), mat("#2f8f3a")); b.position.set(x, 1.24, z); g.add(b); }
  // the ice bath
  box(g, 1.8, 0.7, 1.1, mat("#f5f7fa", 0.3), 1.1, 0, -0.7); const water = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.9), mat("#7fc8ef", 0.15, "#3a8fc0", 0.25)); water.position.set(1.1, 0.64, -0.7); g.add(water);
  const r = rand(3), cubes: THREE.Mesh[] = []; for (let i = 0; i < 9; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), mat("#e6f6ff", 0.1)); c.position.set(0.5 + (i % 5) * 0.3, 0.68, -0.95 + Math.floor(i / 5) * 0.45); c.rotation.set(r(), r(), r()); g.add(c); cubes.push(c); }
  const drops = Array.from({ length: 16 }, () => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), mat("#bfe6ff", 0.1)); scene.add(m); return { m, a: r() * TAU, v: 1 + r() * 1.6, up: 2 + r() * 2 }; });
  return { scene, cam: cam(7.0, 1.9, 0.85), cubes, drops };
};
const buildLiving = (env: Env) => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#100b10");
  const g = room(scene, dataTex(32, 32, (x, y) => ((Math.floor(y / 4) + (x > 16 ? 1 : 0)) % 2 ? [82, 56, 40] : [96, 66, 46]), 6, 6), "#b98b7a");
  box(g, 3.0, 0.5, 1.0, mat("#3b5f9e"), 0.7, 0.05, -2.4); box(g, 3.0, 0.9, 0.3, mat("#2d4a7e"), 0.7, 0.05, -2.95); for (const s of [-1, 1]) box(g, 0.3, 0.8, 1.0, mat("#2d4a7e"), 0.7 + s * 1.5, 0.05, -2.4);
  box(g, 1.6, 0.9, 0.08, mat("#0c0d12", 0.3, "#2c6cff", 0.8), -2.0, 1.2, -3.06); // the TV, glowing
  const tvLight = new THREE.PointLight("#5a8cff", 5, 5, 2); tvLight.position.set(-2.0, 1.6, -2.6); scene.add(tvLight);
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.6, 12), mat("#c9a03c", 0.95)); rug.rotation.x = -Math.PI / 2; rug.position.set(0.3, 0.01, -0.6); rug.scale.set(1.4, 1, 1); g.add(rug);
  box(g, 0.75, 0.55, 0.03, mat("#c8302c", 0.7), 1.9, 2.0, -3.07); const p7 = textPlane(env, "7", { size: 0.42, color: "#ffffff" }).clone(); p7.position.set(1.9, 2.29, -3.03); g.add(p7);
  return { scene, cam: cam(7.0, 1.9, 0.85) };
};

// ------------------------------------------------------------------ 2D stick characters (drawn over the 3D, like the documentary)
type Face = "smile" | "grin" | "o" | "shout" | "flat" | "sleep" | "shut" | "sad" | "chatter";
type Pose = { pivotHip?: boolean; la?: [number, number]; ra?: [number, number]; ll?: number; rl?: number; tilt?: number; face?: Face; look?: number; glasses?: boolean; cold?: number; prop?: "barbell" | "phone" | "pad" | "none"; shiver?: number };
type Who = { kind: "you" | "cr" | "fan"; torso?: string; hair?: string; skin?: string };
const INK = "#1a1716";
const limb = (ctx: Ctx, x: number, y: number, a1: number, a2: number, l1: number, l2: number) => {
  const r1 = (a1 * Math.PI) / 180, r2 = ((a1 + a2) * Math.PI) / 180, ex = x + Math.sin(r1) * l1, ey = y + Math.cos(r1) * l1, hx = ex + Math.sin(r2) * l2, hy = ey + Math.cos(r2) * l2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke(); return [hx, hy] as const;
};
/** a stick person standing on (x, y) with height h, in screen pixels */
const stick = (ctx: Ctx, env: Env, x: number, y: number, h: number, who: Who, P: Pose, f: number) => {
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.globalAlpha = 0.35; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(x, y + h * 0.01, h * 0.16, h * 0.035, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  const r = h * 0.12, hipY = -h * 0.45, neckY = -h + 2 * r, lw = Math.max(3, h * 0.028), cold = P.cold ?? 0;
  ctx.translate(x + (P.shiver ?? 0) * Math.sin(f * 2.7) * h * 0.012, y);
  if (P.pivotHip) { ctx.translate(0, hipY); ctx.rotate(((P.tilt ?? 0) * Math.PI) / 180); ctx.translate(0, -hipY); } else ctx.rotate(((P.tilt ?? 0) * Math.PI) / 180);
  const skin = cold > 0 ? mixHex(who.skin ?? "#f3e6d0", "#a9d4f2", cold) : who.skin ?? "#f3e6d0";
  // legs and shoes
  ctx.strokeStyle = INK; ctx.lineWidth = lw;
  const legL = limb(ctx, -h * 0.04, hipY, P.ll ?? -6, 0, h * 0.44, 0), legR = limb(ctx, h * 0.04, hipY, P.rl ?? 6, 0, h * 0.44, 0);
  ctx.fillStyle = who.kind === "cr" ? "#f2f2f2" : INK; for (const [sx, sy] of [legL, legR]) { ctx.beginPath(); ctx.ellipse(sx + h * 0.015, sy, h * 0.035, h * 0.018, 0, 0, TAU); ctx.fill(); }
  // torso: a hoodie, a red number 7 shirt, or a fan's colour
  const tw = h * 0.17, top = neckY - h * 0.01, torsoC = who.kind === "cr" ? "#d4202c" : who.torso ?? "#141414";
  ctx.fillStyle = torsoC; roundRect(ctx, -tw / 2, top, tw, hipY - top + h * 0.02, h * 0.04); ctx.fill();
  if (who.kind === "cr") { ctx.fillStyle = "#ffffff"; glyphs(ctx, "7", h * 0.12, 0, (top + hipY) / 2 + h * 0.02, false); ctx.strokeStyle = "#1f7a46"; ctx.lineWidth = lw * 0.8; ctx.beginPath(); ctx.arc(0, top, h * 0.035, 0, Math.PI); ctx.stroke(); }
  if (who.kind === "you") { ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(-tw * 0.18, top + h * 0.06, h * 0.008, 0, TAU); ctx.fill(); }
  // arms (hands are small skin dots)
  ctx.strokeStyle = INK; ctx.lineWidth = lw;
  const sh = top + h * 0.03, la = P.la ?? [-18, 8], ra = P.ra ?? [18, -8];
  const hl = limb(ctx, -tw / 2 + lw / 2, sh, la[0], la[1], h * 0.17, h * 0.16), hr = limb(ctx, tw / 2 - lw / 2, sh, ra[0], ra[1], h * 0.17, h * 0.16);
  ctx.fillStyle = skin; for (const [hx, hy] of [hl, hr]) { ctx.beginPath(); ctx.arc(hx, hy, h * 0.022, 0, TAU); ctx.fill(); ctx.lineWidth = lw * 0.5; ctx.stroke(); }
  if (P.prop === "phone") { ctx.fillStyle = "#1b1c22"; roundRect(ctx, hr[0] - h * 0.025, hr[1] - h * 0.08, h * 0.05, h * 0.085, h * 0.008); ctx.fill(); ctx.fillStyle = "#8fd3ff"; ctx.fillRect(hr[0] - h * 0.018, hr[1] - h * 0.072, h * 0.036, h * 0.065); }
  if (P.prop === "pad") { ctx.fillStyle = "#22252c"; roundRect(ctx, (hl[0] + hr[0]) / 2 - h * 0.06, (hl[1] + hr[1]) / 2 - h * 0.02, h * 0.12, h * 0.04, h * 0.015); ctx.fill(); }
  if (P.prop === "barbell") { const mx = (hl[0] + hr[0]) / 2, my = (hl[1] + hr[1]) / 2; ctx.strokeStyle = "#9aa3b0"; ctx.lineWidth = lw * 0.8; ctx.beginPath(); ctx.moveTo(mx - h * 0.42, my); ctx.lineTo(mx + h * 0.42, my); ctx.stroke();
    ["#c8302c", "#2f6fd6", "#f2c14e"].forEach((c, i) => { ctx.fillStyle = c; for (const s of [-1, 1]) roundRect(ctx, mx + s * (h * 0.3 + i * h * 0.035) - h * 0.016, my - h * (0.1 - i * 0.015), h * 0.032, h * (0.2 - i * 0.03), h * 0.01), ctx.fill(); }); }
  // head
  const hy = neckY - r; ctx.fillStyle = skin; ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.7; ctx.beginPath(); ctx.arc(0, hy, r, 0, TAU); ctx.fill(); ctx.stroke();
  if (who.kind === "you") { ctx.fillStyle = "#2f5fae"; ctx.beginPath(); ctx.arc(0, hy - r * 0.18, r * 1.02, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.ellipse(r * 0.8, hy - r * 0.2, r * 0.6, r * 0.16, 0, 0, TAU); ctx.fill(); }
  if (who.kind === "cr") { ctx.fillStyle = "#15110e"; ctx.beginPath(); ctx.arc(0, hy - r * 0.15, r * 1.02, Math.PI * 1.02, Math.PI * 1.98); ctx.fill(); ctx.beginPath(); ctx.ellipse(r * 0.05, hy - r * 1.02, r * 0.75, r * 0.32, -0.15, 0, TAU); ctx.fill(); }
  if (who.kind === "fan" && who.hair) { ctx.fillStyle = who.hair; ctx.beginPath(); ctx.arc(0, hy - r * 0.12, r * 1.02, Math.PI, 0); ctx.fill(); }
  // face
  const lk = (P.look ?? 0) * r * 0.15, ex = r * 0.36, ey = hy + r * 0.02, face = P.face ?? "smile";
  ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.6;
  if (face === "sleep" || face === "shut") for (const s of [-1, 1]) { ctx.beginPath(); if (face === "sleep") ctx.arc(s * ex + lk, ey - r * 0.04, r * 0.13, 0.2, Math.PI - 0.2); else { ctx.moveTo(s * ex - r * 0.12, ey - r * 0.1); ctx.lineTo(s * ex + s * 0.02, ey); ctx.lineTo(s * ex - r * 0.12 * 1, ey + r * 0.1); } ctx.stroke(); }
  else for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * ex + lk, ey, r * (face === "o" || face === "shout" ? 0.12 : 0.09), 0, TAU); ctx.fill(); }
  if (face === "sad") for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * ex - r * 0.15, ey - r * 0.3 - s * r * 0.06); ctx.lineTo(s * ex + r * 0.15, ey - r * 0.3 + s * r * 0.06); ctx.stroke(); }
  const my = hy + r * 0.45; ctx.beginPath();
  if (face === "smile" || face === "sleep") { ctx.arc(lk, my - r * 0.12, r * 0.24, 0.25, Math.PI - 0.25); ctx.stroke(); }
  else if (face === "grin") { ctx.fillStyle = "#5a1622"; ctx.arc(lk, my - r * 0.1, r * 0.3, 0, Math.PI); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#fff"; ctx.fillRect(lk - r * 0.24, my - r * 0.1, r * 0.48, r * 0.09); }
  else if (face === "o") { ctx.fillStyle = "#5a1622"; ctx.ellipse(lk, my, r * 0.12, r * 0.15, 0, 0, TAU); ctx.fill(); }
  else if (face === "shout") { ctx.fillStyle = "#5a1622"; ctx.ellipse(lk, my, r * 0.22, r * 0.26, 0, 0, TAU); ctx.fill(); }
  else if (face === "sad") { ctx.arc(lk, my + r * 0.12, r * 0.2, Math.PI + 0.35, -0.35); ctx.stroke(); }
  else if (face === "chatter") { ctx.fillStyle = "#fff"; roundRect(ctx, lk - r * 0.25, my - r * 0.1, r * 0.5, r * 0.2, r * 0.05); ctx.fill(); ctx.stroke(); for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(lk + k * r * 0.12, my - r * 0.1); ctx.lineTo(lk + k * r * 0.12, my + r * 0.1); ctx.stroke(); } }
  else { ctx.moveTo(lk - r * 0.18, my); ctx.lineTo(lk + r * 0.18, my); ctx.stroke(); }
  if (P.glasses) { ctx.fillStyle = "#0c0c10"; for (const s of [-1, 1]) { roundRect(ctx, s * ex - r * 0.24, ey - r * 0.16, r * 0.48, r * 0.3, r * 0.1); ctx.fill(); } ctx.fillRect(-ex + r * 0.2, ey - r * 0.1, ex * 2 - r * 0.4, r * 0.06); }
  if (cold > 0.3) { ctx.fillStyle = "rgba(220,240,255,0.9)"; for (let i = 0; i < 5; i++) { const a = -Math.PI * 0.85 + i * 0.4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r, hy + Math.sin(a) * r); ctx.lineTo(Math.cos(a) * r * 1.5, hy + Math.sin(a) * r * 1.5); ctx.lineTo(Math.cos(a + 0.12) * r, hy + Math.sin(a + 0.12) * r); ctx.fill(); } }
  ctx.restore();
};
const roundRect = (ctx: Ctx, x: number, y: number, w: number, h: number, r: number) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
const mixHex = (a: string, b: string, t: number) => { const p = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)); const A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`; };

// ------------------------------------------------------------------ type: the documentary's captions, pills and punch words
/** text as a path: stroke for the outline, then fill */
const glyphs = (ctx: Ctx, text: string, em: number, x: number, y: number, outline: number | false, fill?: string, stroke = "#000") => {
  const font = defaultFont(), lay = layoutText(font, text), k = em / font.unitsPerEm;
  ctx.beginPath();
  for (const p of lay.glyphs) for (const c of font.glyph(p.gid).contours) for (const s of c) {
    const X = (v: number) => x + (p.x + v) * k, Y = (v: number) => y + em * 0.36 - (p.y + v) * k;
    if (s[0] === "M") ctx.moveTo(X(s[1]), Y(s[2])); else if (s[0] === "L") ctx.lineTo(X(s[1]), Y(s[2])); else ctx.quadraticCurveTo(X(s[1]), Y(s[2]), X(s[3]), Y(s[4]));
  }
  if (outline) { ctx.strokeStyle = stroke; ctx.lineWidth = outline; ctx.lineJoin = "round"; ctx.stroke(); }
  if (fill) ctx.fillStyle = fill; ctx.fill("nonzero");
  return (lay.width / font.unitsPerEm) * em;
};
const textW = (text: string, em: number) => { const font = defaultFont(); return (layoutText(font, text).width / font.unitsPerEm) * em; };
const CAP_Y = 1250;
const captions = (ctx: Ctx, env: Env, f: number) => {
  const t = f / FPS, w = (WORDS as { w: string; s: number; e: number }[]).find((x, i, a) => t >= x.s - 0.03 && t < (a[i + 1] ? Math.min(a[i + 1].s, x.e + 0.5) : x.e + 0.6));
  if (!w) return;
  const pop = ease.outBack(clamp01((t - w.s + 0.03) / 0.12)), word = w.w.replace(/…/g, "");
  let em = 96; const tw = textW(word, em); if (tw > 820) em *= 820 / tw;
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.translate(W / 2, CAP_Y); ctx.scale(0.85 + 0.15 * pop, 0.85 + 0.15 * pop);
  glyphs(ctx, word, em, 0, 6, 20, "rgba(0,0,0,0.35)", "rgba(0,0,0,0.35)"); glyphs(ctx, word, em, 0, 0, 16, "#ffffff", "#0b0b0b");
  ctx.restore();
};
const PILL = { yellow: ["#f2c11d", "#1a1406"], green: ["#2fbf63", "#ffffff"], red: ["#e2333b", "#ffffff"], blue: ["#2f7fe0", "#ffffff"], white: ["#ffffff", "#141414"] } as const;
const pill = (ctx: Ctx, env: Env, text: string, color: keyof typeof PILL, x: number, y: number, em: number, t: number) => {
  if (t <= 0) return; const [bg, fg] = PILL[color], w = textW(text, em) + em * 0.9, h = em * 1.45, s = ease.outBack(clamp01(t));
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = "rgba(0,0,0,0.35)"; roundRect(ctx, -w / 2 + 3, -h / 2 + 5, w, h, h * 0.28); ctx.fill();
  ctx.fillStyle = bg; roundRect(ctx, -w / 2, -h / 2, w, h, h * 0.28); ctx.fill(); glyphs(ctx, text, em, 0, 0, false, fg); ctx.restore();
};
const punch = (ctx: Ctx, env: Env, text: string, x: number, y: number, em: number, t: number, color = "#e8333b", rot = -0.06) => {
  if (t <= 0) return; const s = ease.outBack(clamp01(t * 1.6)) * (1 + 0.03 * Math.sin(t * 9));
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  glyphs(ctx, text, em, 0, 0, em * 0.34, undefined, "#0b0b0b"); glyphs(ctx, text, em, 0, 0, em * 0.16, color, "#ffffff"); ctx.restore();
};
const numBox = (ctx: Ctx, env: Env, text: string, x: number, y: number, em: number, t: number) => {
  if (t <= 0) return; const w = textW(text, em) + em * 0.8, h = em * 1.35, s = ease.outBack(clamp01(t));
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = "rgba(14,14,16,0.92)"; roundRect(ctx, -w / 2, -h / 2, w, h, em * 0.25); ctx.fill(); glyphs(ctx, text, em, 0, 0, false, "#f2c11d"); ctx.restore();
};
const flash = (ctx: Ctx, env: Env, a: number, color = "#ffffff") => { if (a <= 0) return; ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore(); };
const label = (ctx: Ctx, env: Env, f: number, start: number, text: string, color: keyof typeof PILL) => pill(ctx, env, text, color, W / 2, 185, 40, seg(f, start + 3, start + 11));

// where a point on the floor lands on screen, and how many pixels tall a 1.75-unit person is there
const place = (camera: THREE.PerspectiveCamera, env: Env, x: number, z: number, y = 0, tall = 1.75): [number, number, number] => {
  const [sx, sy] = screenPx(camera, v3(x, y, z), env), [, ty] = screenPx(camera, v3(x, y + tall, z), env); return [sx, sy, sy - ty];
};

// ------------------------------------------------------------------ the six days
type S = { scene: THREE.Scene; cam: THREE.PerspectiveCamera };
const frame3d = (ctx: Ctx, env: Env, s: S) => draw3d(ctx, env, s.scene, s.cam, { clear: "#0b0b0d", ss: 2, exposure: 1.05 });
const YOU: Who = { kind: "you", skin: "#f3e6d0" }, CR: Who = { kind: "cr", skin: "#d8a678" };

const day1 = (ctx: Ctx, f: number, env: Env) => {
  const s = memo(env, "c2d:bed", buildBedroom); push(s.cam, f / 120, 0.7, f); frame3d(ctx, env, s);
  const swapped = f >= CUE.swap, sit = key(f, [[CUE.sit - 2, 0], [CUE.sit + 8, 1]], ease.outBack);
  const [bx, by, bh0] = place(s.cam, env, 0.0, -1.45, 0.72), bh = bh0 * 0.9, shock = f >= 80;
  const lie = -90 * (1 - sit), legs = 90 * sit;
  stick(ctx, env, bx, by + bh * 0.45, bh, swapped ? CR : YOU, swapped
    ? { pivotHip: true, tilt: lie, face: f < CUE.sit ? "sleep" : shock ? "shout" : "o", la: shock ? [150, 20] : [-25, 10], ra: shock ? [-150, -20] : [25, -10], ll: legs, rl: legs }
    : { pivotHip: true, tilt: -90, face: "sleep", ll: 0, rl: 0, la: [-5, 0], ra: [5, 0] }, f);
  // the blanket over the legs, drawn in 2D so it covers the figure
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = "#3d5fa8"; roundRect(ctx, bx + bh * 0.1, by - bh * 0.1, bh * 0.52, bh * 0.2, bh * 0.06); ctx.fill(); ctx.restore();
  if (f < CUE.swap - 6) for (let i = 0; i < 3; i++) { const t = ((f / 40 + i / 3) % 1); ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalAlpha = Math.sin(t * Math.PI); glyphs(ctx, "z", 46 + i * 12, bx - bh * 0.75 + t * 40 + i * 30, by - bh * 0.3 - t * 140, 8, "#ffffff"); ctx.restore(); }
  flash(ctx, env, 1 - Math.abs(f - CUE.swap) / 7);
  label(ctx, env, f, 0, "DÍA 1", "yellow"); punch(ctx, env, "¿¡QUÉ!?", W / 2 + 170, 470, 115, (f - 80) / 15);
};
const day2 = (ctx: Ctx, f: number, env: Env) => {
  const s = memo(env, "c2d:gym", buildGym); push(s.cam, (f - 120) / 120, 0.7, f); frame3d(ctx, env, s);
  const [x, y, h] = place(s.cam, env, 0, 0.4); const squat = key(f, [[130, 0], [150, 1], [CUE.lift - 4, 1.1], [CUE.lift, 0]]), lift = key(f, [[CUE.lift - 4, 0], [CUE.lift + 3, 1]], ease.outExpo);
  const shake = f > CUE.lift ? 3 * spring(f, CUE.lift, FPS, 3, 0.2) : 0;
  stick(ctx, env, x, y + squat * h * 0.12, h * (1 - 0.1 * squat), CR, { prop: f >= 140 ? "barbell" : "none", face: f < 150 ? "sad" : f < CUE.lift ? "chatter" : f < 200 ? "o" : "grin", look: f < 150 ? 0 : 0,
    la: f < 140 ? [-18, 8] : lift > 0.5 ? [-168, -5] : [-12 - 10 * squat, 0], ra: f < 140 ? [18, -8] : lift > 0.5 ? [168, 5] : [12 + 10 * squat, 0], ll: -6 - 22 * squat, rl: 6 + 22 * squat, tilt: shake }, f);
  label(ctx, env, f, 120, "DÍA 2", "green"); numBox(ctx, env, "200 KG", W / 2, 1480, 72, (f - CUE.lift - 2) / 8);
};
const day4 = (ctx: Ctx, f: number, env: Env) => {
  const s = memo(env, "c2d:pitch", buildPitch); push(s.cam, (f - 240) / 120, 0.6, f);
  const T0 = CUE.kick, T1 = CUE.kick + 18, rest = v3(-0.7, 0.17, 0.4), corner = v3(s.GX + 1.05, s.gh - 0.25, s.GZ - 0.6);
  let p = rest.clone(); if (f >= T0 && f < T1) { const t = seg(f, T0, T1); p = rest.clone().lerp(corner, t); p.y += 0.7 * Math.sin(Math.PI * t); } else if (f >= T1) { const t = (f - T1) / FPS; p = v3(corner.x - 0.2 * Math.min(t, 0.6), Math.max(0.17, corner.y - 4.9 * t * t * 0.7), corner.z + 0.1); }
  s.ball.position.copy(p); s.ball.rotation.set(f * 0.3, f * 0.2, 0);
  const pos = s.net.geometry.attributes.position as THREE.BufferAttribute, bulge = f >= T1 ? 0.35 * spring(f, T1, FPS, 2.6, 0.35) : 0;
  for (let i = 0; i < pos.count; i++) { const x = s.base[i * 3], y = s.base[i * 3 + 1], d = Math.hypot(x - 1.05, y - 0.5); pos.setXYZ(i, x, y, -bulge * Math.exp(-d * d * 5)); } pos.needsUpdate = true;
  frame3d(ctx, env, s);
  const [x, y, h] = place(s.cam, env, -0.85, 0.5), back = key(f, [[300, 0], [318, 1]]), kick = key(f, [[T0 - 4, 0], [T0 + 1, 1]], ease.outExpo), after = f > T1 + 4;
  stick(ctx, env, x, y, h, CR, { face: f < 300 ? "sad" : f < T0 ? "flat" : after ? "shout" : "o", look: 1, rl: lerp(lerp(6, -40, back), 85, kick) * (after ? 0.2 : 1), ll: -6, tilt: 6 * kick - 4 * back,
    la: after ? [150, 25] : f < 300 ? [-40, -60] : [-35, 10], ra: after ? [-150, -25] : f < 300 ? [40, 60] : [30, -10] }, f);
  label(ctx, env, f, 240, "DÍA 4", "blue"); punch(ctx, env, "¡GOLAZO!", W / 2, 760, 130, (f - T1) / 12, "#f2c11d");
};
const FANS: Who[] = ["#2f6fd6", "#2fa35a", "#f2c14e", "#9b59d0", "#ff8a3d", "#e85d9a", "#22a6b3"].map((c, i) => ({ kind: "fan", torso: c, hair: ["#2a1b12", "#e8c26a", "#111", "#7a3b12"][i % 4], skin: ["#f3e6d0", "#e0a274", "#b9784e", "#8a5536"][i % 4] }));
const day5 = (ctx: Ctx, f: number, env: Env) => {
  const s = memo(env, "c2d:street", buildStreet); push(s.cam, (f - 360) / 120, 0.6, f); frame3d(ctx, env, s);
  const walk = key(f, [[360, 0], [400, 1]], ease.linear), run = key(f, [[450, 0], [478, 1]], ease.inCubic), panic = f >= CUE.fans + 8;
  const cx = lerp(-2.6, 0.2, walk) - 3.4 * run, [x, y, h] = place(s.cam, env, cx, 0.2), step = (f < 400 || run > 0) ? Math.sin(f * 0.7) * 22 : 0;
  // the fans pour in from both sides, phones up; a flash fires from a phone every few frames
  const r = rand(11);
  const fans = FANS.map((who, i) => { const side = i % 2 ? 1 : -1, t0 = CUE.fans + Math.floor(r() * 18), t = ease.outCubic(seg(f, t0, t0 + 20)), tx = 0.2 + side * (0.75 + Math.floor(i / 2) * 0.45) - 3.0 * run, z = [-0.6, 0.6, -0.2, 0.9, -0.9, 0.3, 1.1][i];
    return { who, t, x: lerp(side * 4.5, tx, t) , z, i, on: f >= t0 }; }).filter((F) => F.on).sort((a, b) => a.z - b.z);
  const behind = fans.filter((F) => F.z < 0.2), front = fans.filter((F) => F.z >= 0.2);
  const drawFan = (F: (typeof fans)[number]) => { const [fx, fy, fh] = place(s.cam, env, F.x, F.z); stick(ctx, env, fx, fy, fh * 0.92, F.who, { prop: "phone", face: "shout", ra: [-160 + 10 * Math.sin(f * 0.3 + F.i), 0], la: [-30, 20], ll: -6 + (F.t < 1 ? Math.sin(f * 0.8 + F.i) * 20 : 0), rl: 6 - (F.t < 1 ? Math.sin(f * 0.8 + F.i) * 20 : 0) }, f);
    if ((f + F.i * 5) % 9 < 2 && F.t >= 1) { ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalAlpha = 0.85; ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(fx + fh * 0.1, fy - fh * 1.05, fh * 0.12, 0, TAU); ctx.fill(); ctx.restore(); } };
  behind.forEach(drawFan);
  stick(ctx, env, x, y, h, CR, { glasses: f < CUE.fans + 20, face: panic ? "shout" : f >= 395 ? "grin" : "smile", ll: -6 + step, rl: 6 - step, la: panic ? [-160, -10] : [-18 - step * 0.6, 8], ra: panic ? [160, 10] : [18 + step * 0.6, -8], tilt: run > 0 ? -8 : 0 }, f);
  front.forEach(drawFan);
  label(ctx, env, f, 360, "DÍA 5", "red"); pill(ctx, env, "¡ES ÉL!", "red", W / 2 + 190, 700, 58, (f - CUE.fans) / 8);
};
const day6 = (ctx: Ctx, f: number, env: Env) => {
  const s = memo(env, "c2d:kitchen", buildKitchen); push(s.cam, (f - 480) / 120, 0.6, f);
  const inTub = f >= CUE.plunge; s.drops.forEach((d) => { const t = (f - CUE.plunge) / FPS; d.m.visible = t > 0 && t < 0.7; d.m.position.set(1.1 + Math.cos(d.a) * d.v * t * 0.6, 0.65 + d.up * t - 4.9 * t * t, -0.7 + Math.sin(d.a) * d.v * t * 0.4); });
  s.cubes.forEach((c, i) => (c.position.y = 0.68 + (inTub ? 0.15 * Math.max(0, Math.sin(Math.PI * clamp01((f - CUE.plunge) / 12))) + 0.02 * Math.sin(f * 0.4 + i) : 0)));
  frame3d(ctx, env, s);
  const go = key(f, [[515, 0], [538, 1]], ease.inOutSine), jt = seg(f, 540, CUE.plunge), hop = f >= 540 && !inTub ? Math.sin(Math.PI * jt) * 0.9 : 0;
  const cx = lerp(-1.0, 0.4, go) + (f >= 540 ? lerp(0, 0.7, jt) : 0), [x, y, h] = place(s.cam, env, cx, inTub ? -0.7 : -0.3, inTub ? 0.15 : hop);
  const cold = inTub ? clamp01((f - CUE.plunge) / 12) : 0, step = f >= 515 && f < 538 ? Math.sin(f * 0.7) * 22 : 0;
  if (inTub) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W * env.scale, (y - h * 0.5) * env.scale); ctx.clip(); }
  stick(ctx, env, x, y, h, CR, { cold, shiver: inTub ? 1 : 0, face: inTub ? "chatter" : f < 512 ? "sad" : f >= 540 ? "shut" : "flat", look: f < 512 ? -1 : 0, ll: -6 + step, rl: 6 - step,
    la: inTub ? [-40, 120] : f >= 540 ? [-160, 0] : f < 512 ? [-40, 70] : [-18, 8], ra: inTub ? [40, -120] : f >= 540 ? [160, 0] : f < 512 ? [40, -70] : [18, -8] }, f);
  if (inTub) ctx.restore();
  label(ctx, env, f, 480, "DÍA 6", "blue"); punch(ctx, env, "BRRR", W / 2 - 160, 560, 120, (f - CUE.plunge - 8) / 12, "#9fdcff", 0.05);
};
const day7 = (ctx: Ctx, f: number, env: Env) => {
  const s = memo(env, "c2d:living", buildLiving); push(s.cam, (f - 600) / 240, 0.8, f); frame3d(ctx, env, s);
  // you (Cristiano inside) on the sofa; the jump and the SIUUU landing
  const up = key(f, [[728, 0], [740, 1]]), jt = seg(f, CUE.jump, CUE.siuu), air = f >= CUE.jump && f < CUE.siuu, landed = f >= CUE.siuu;
  const sx = lerp(0.9, 0.45, up), sz = lerp(-2.25, 0.2, up), [x, y, h] = place(s.cam, env, sx, sz, f < 728 ? 0.55 : air ? Math.sin(Math.PI * jt) * 1.1 : 0);
  const munch = f < 728 && f % 60 > 40, squash = landed ? 0.06 * Math.max(0, spring(f, CUE.siuu, FPS, 3, 0.35)) : 0;
  stick(ctx, env, x, y, h * (1 - squash), YOU, { glasses: true, prop: f < 728 ? "pad" : "none", face: landed || air ? "shout" : munch ? "flat" : "grin",
    ll: f < 728 ? -70 : landed ? -32 : air ? -20 : -6, rl: f < 728 ? -70 : landed ? 32 : air ? 25 : 6, tilt: air ? 360 * ease.inOutCubic(jt) * 0 + 10 * Math.sin(jt * TAU) : 0,
    la: landed ? [-55, -10] : air ? [-150, 10] : f < 728 ? [-10, 70] : [-18, 8], ra: landed ? [55, 10] : air ? [150, -10] : f < 728 ? [10, -70] : [18, -8] }, f);
  // Cristiano's body (you inside): begging, then jaw on the floor
  const [cx, cy, ch] = place(s.cam, env, -1.05, 0.5), shocked = f >= CUE.siuu - 4, bob = f < 700 ? Math.abs(Math.sin(f * 0.2)) * 8 : 0;
  stick(ctx, env, cx, cy + bob, ch, CR, { face: shocked ? "shout" : "sad", look: 1, la: shocked ? [150, 25] : f < 700 ? [-30, 110] : [-18, 8], ra: shocked ? [-150, -25] : f < 700 ? [30, -110] : [70, 10], tilt: f < 700 ? 4 : 0 }, f);
  label(ctx, env, f, 600, "DÍA 7", "yellow");
  pill(ctx, env, "¿TÚ CAMBIARÍAS?", "white", W / 2, 385, 56, (f - 734) / 8);
  if (f >= CUE.siuu) { punch(ctx, env, "¡SIUUU!", W / 2, 520, 150, (f - CUE.siuu) / 10, "#f2c11d", -0.08); pill(ctx, env, "¡COMENTA!", "yellow", W / 2, 1640, 40, (f - CUE.siuu - 20) / 8); }
};

const shot = (fn: (ctx: Ctx, f: number, env: Env) => void, start: number) => (ctx: Ctx, local: number, env: Env) => { const f = start + local; fn(ctx, f, env); vignette(ctx, env, 0.45, "#050304"); captions(ctx, env, f); };
export const cristiano2d: Film = {
  meta: { title: "Una semana siendo Cristiano", W, H, fps: FPS, bpm: 120, durationFrames: END, kind: "story", poster: CUE.siuu + 12,
    checks: { none: { "3d": "2D figures drawn over the 3D sets; nothing in the 3D scene is held" } } },
  assets: { images: {} },
  shots: [
    { id: "d1", start: CUT.d1, end: CUT.d2, draw: shot(day1, CUT.d1) }, { id: "d2", start: CUT.d2, end: CUT.d4, draw: shot(day2, CUT.d2) },
    { id: "d4", start: CUT.d4, end: CUT.d5, draw: shot(day4, CUT.d4) }, { id: "d5", start: CUT.d5, end: CUT.d6, draw: shot(day5, CUT.d5) },
    { id: "d6", start: CUT.d6, end: CUT.d7, draw: shot(day6, CUT.d6) }, { id: "d7", start: CUT.d7, end: CUT.end, draw: shot(day7, CUT.d7) },
  ],
};
