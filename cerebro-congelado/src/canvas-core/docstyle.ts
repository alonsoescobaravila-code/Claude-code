// DOC STYLE. The look of the documentary shorts: dark low-poly 3D rooms under a warm key light, flat 2D
// stick characters drawn over them, word-by-word captions, a coloured label pill, punch words that pop.
// Shared by the films in this style (beatles.ts; cristiano2d.ts keeps its own copy, already rendered).
import type { Ctx, Env } from "./core";
import * as THREE from "three";
import { draw3d } from "../three-core/stage";
import { clamp01, ease, lerp, seg } from "../three-core/time";
import { defaultFont, layoutText } from "../three-core/type3d";
import { screenPx } from "../three-core/camera";

export const W = 1080, H = 1920, TAU = Math.PI * 2;
export const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const key = (f: number, ks: [number, number][], e = ease.inOutCubic) => { if (f <= ks[0][0]) return ks[0][1]; for (let i = 1; i < ks.length; i++) if (f <= ks[i][0]) return lerp(ks[i - 1][1], ks[i][1], e(seg(f, ks[i - 1][0], ks[i][0]))); return ks[ks.length - 1][1]; };

// ------------------------------------------------------------------ low-poly 3D sets
export const mat = (c: string, rough = 0.85, emissive?: string, ei = 1) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0, flatShading: true, ...(emissive ? { emissive, emissiveIntensity: ei } : {}) });
export const box = (g: THREE.Object3D, w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, ry = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y + h / 2, z); o.rotation.y = ry; g.add(o); return o; };
export const cyl = (g: THREE.Object3D, r: number, h: number, m: THREE.Material, x: number, y: number, z: number, seg = 10) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m); o.position.set(x, y + h / 2, z); g.add(o); return o; };
export const dataTex = (w: number, h: number, fn: (x: number, y: number) => [number, number, number], rx = 1, ry = 1) => {
  const d = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b] = fn(x, y), i = (y * w + x) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; }
  const t = new THREE.DataTexture(d, w, h, THREE.RGBAFormat); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
};
export const room = (scene: THREE.Scene, floor: string | THREE.Texture, wall: string, opts: { side?: boolean; warm?: string; key?: number } = {}) => {
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
export const cam = (z = 7.2, y = 1.7, ty = 0.95) => { const c = new THREE.PerspectiveCamera(42, W / H, 0.1, 60); c.position.set(0, y, z); c.lookAt(0, ty, 0); c.userData.base = { z, y, ty }; return c; };
export const push = (c: THREE.PerspectiveCamera, t: number, amt = 0.6, f = 0) => { const b = c.userData.base; c.position.set(0.05 * Math.sin(f * 0.031), b.y + 0.03 * Math.sin(f * 0.023), b.z - amt * ease.inOutSine(clamp01(t))); c.lookAt(0, b.ty, 0); c.updateMatrixWorld(); };

// ------------------------------------------------------------------ 2D stick characters (drawn over the 3D, like the documentary)
export type Face = "smile" | "grin" | "o" | "shout" | "flat" | "sleep" | "shut" | "sad" | "chatter";
export type Pose = { inst?: "bass" | "guitar" | "sticks" | "none"; pivotHip?: boolean; la?: [number, number]; ra?: [number, number]; ll?: number; rl?: number; tilt?: number; face?: Face; look?: number; glasses?: boolean; cold?: number; prop?: "barbell" | "phone" | "pad" | "none"; shiver?: number };
export type Who = { kind: "you" | "cr" | "fan" | "beatle"; torso?: string; hair?: string; skin?: string; round?: boolean; nose?: number };
export const INK = "#1a1716";
export const limb = (ctx: Ctx, x: number, y: number, a1: number, a2: number, l1: number, l2: number) => {
  const r1 = (a1 * Math.PI) / 180, r2 = ((a1 + a2) * Math.PI) / 180, ex = x + Math.sin(r1) * l1, ey = y + Math.cos(r1) * l1, hx = ex + Math.sin(r2) * l2, hy = ey + Math.cos(r2) * l2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke(); return [hx, hy] as const;
};
/** a stick person standing on (x, y) with height h, in screen pixels */
export const stick = (ctx: Ctx, env: Env, x: number, y: number, h: number, who: Who, P: Pose, f: number) => {
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
  if (who.kind === "beatle") { ctx.fillStyle = "#f4f1ea"; ctx.beginPath(); ctx.moveTo(-tw * 0.22, top); ctx.lineTo(tw * 0.22, top); ctx.lineTo(0, top + h * 0.12); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#111"; ctx.fillRect(-h * 0.008, top + h * 0.02, h * 0.016, h * 0.14); }
  // arms (hands are small skin dots)
  ctx.strokeStyle = INK; ctx.lineWidth = lw;
  const sh = top + h * 0.03, la = P.la ?? [-18, 8], ra = P.ra ?? [18, -8];
  const hl = limb(ctx, -tw / 2 + lw / 2, sh, la[0], la[1], h * 0.17, h * 0.16), hr = limb(ctx, tw / 2 - lw / 2, sh, ra[0], ra[1], h * 0.17, h * 0.16);
  ctx.fillStyle = skin; for (const [hx, hy] of [hl, hr]) { ctx.beginPath(); ctx.arc(hx, hy, h * 0.022, 0, TAU); ctx.fill(); ctx.lineWidth = lw * 0.5; ctx.stroke(); }
  if (P.inst === "guitar" || P.inst === "bass") { // body across the hips, neck up to the left hand
    const bx = P.inst === "bass" ? -tw * 0.1 : tw * 0.1, by = hipY - h * 0.04, dir = P.inst === "bass" ? 1 : -1;
    ctx.fillStyle = "#3a2516"; ctx.lineWidth = lw * 0.5; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + dir * h * 0.32, by - h * 0.17); ctx.lineWidth = h * 0.022; ctx.stroke();
    ctx.fillStyle = P.inst === "bass" ? "#b5651d" : "#c41e1e"; ctx.beginPath(); if (P.inst === "bass") { ctx.ellipse(bx, by - h * 0.02, h * 0.06, h * 0.085, -0.5 * dir, 0, TAU); } else { ctx.ellipse(bx, by, h * 0.085, h * 0.075, -0.5 * dir, 0, TAU); } ctx.fill(); ctx.lineWidth = lw * 0.5; ctx.stroke();
    ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(bx, by, h * 0.018, 0, TAU); ctx.fill(); }
  if (P.inst === "sticks") { ctx.strokeStyle = "#e9d2a0"; ctx.lineWidth = h * 0.012; for (const [hx, hy] of [hl, hr]) { ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + (hx < 0 ? -1 : 1) * h * 0.05, hy - h * 0.16); ctx.stroke(); } }
  if (P.prop === "phone") { ctx.fillStyle = "#1b1c22"; roundRect(ctx, hr[0] - h * 0.025, hr[1] - h * 0.08, h * 0.05, h * 0.085, h * 0.008); ctx.fill(); ctx.fillStyle = "#8fd3ff"; ctx.fillRect(hr[0] - h * 0.018, hr[1] - h * 0.072, h * 0.036, h * 0.065); }
  if (P.prop === "pad") { ctx.fillStyle = "#22252c"; roundRect(ctx, (hl[0] + hr[0]) / 2 - h * 0.06, (hl[1] + hr[1]) / 2 - h * 0.02, h * 0.12, h * 0.04, h * 0.015); ctx.fill(); }
  if (P.prop === "barbell") { const mx = (hl[0] + hr[0]) / 2, my = (hl[1] + hr[1]) / 2; ctx.strokeStyle = "#9aa3b0"; ctx.lineWidth = lw * 0.8; ctx.beginPath(); ctx.moveTo(mx - h * 0.42, my); ctx.lineTo(mx + h * 0.42, my); ctx.stroke();
    ["#c8302c", "#2f6fd6", "#f2c14e"].forEach((c, i) => { ctx.fillStyle = c; for (const s of [-1, 1]) roundRect(ctx, mx + s * (h * 0.3 + i * h * 0.035) - h * 0.016, my - h * (0.1 - i * 0.015), h * 0.032, h * (0.2 - i * 0.03), h * 0.01), ctx.fill(); }); }
  // head
  const hy = neckY - r; ctx.fillStyle = skin; ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.7; ctx.beginPath(); ctx.arc(0, hy, r, 0, TAU); ctx.fill(); ctx.stroke();
  if (who.kind === "you") { ctx.fillStyle = "#2f5fae"; ctx.beginPath(); ctx.arc(0, hy - r * 0.18, r * 1.02, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.ellipse(r * 0.8, hy - r * 0.2, r * 0.6, r * 0.16, 0, 0, TAU); ctx.fill(); }
  if (who.kind === "cr") { ctx.fillStyle = "#15110e"; ctx.beginPath(); ctx.arc(0, hy - r * 0.15, r * 1.02, Math.PI * 1.02, Math.PI * 1.98); ctx.fill(); ctx.beginPath(); ctx.ellipse(r * 0.05, hy - r * 1.02, r * 0.75, r * 0.32, -0.15, 0, TAU); ctx.fill(); }
  if (who.kind === "beatle") { ctx.fillStyle = who.hair ?? "#2a1a10"; ctx.beginPath(); ctx.arc(0, hy - r * 0.05, r * 1.08, Math.PI * 0.92, Math.PI * 2.08); ctx.lineTo(r * 1.0, hy + r * 0.05); ctx.quadraticCurveTo(r * 0.3, hy - r * 0.3, -r * 1.0, hy + r * 0.05); ctx.closePath(); ctx.fill(); }
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
  if (who.round) { ctx.strokeStyle = "#2a2a2a"; ctx.lineWidth = lw * 0.45; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * ex + lk, ey, r * 0.2, 0, TAU); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(-ex + r * 0.2 + lk, ey); ctx.lineTo(ex - r * 0.2 + lk, ey); ctx.stroke(); }
  if (who.nose) { ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.5; ctx.beginPath(); ctx.moveTo(lk + r * 0.02, ey + r * 0.05); ctx.quadraticCurveTo(lk + r * 0.22 * who.nose, ey + r * 0.32, lk - r * 0.02, ey + r * 0.34); ctx.stroke(); }
  if (P.glasses) { ctx.fillStyle = "#0c0c10"; for (const s of [-1, 1]) { roundRect(ctx, s * ex - r * 0.24, ey - r * 0.16, r * 0.48, r * 0.3, r * 0.1); ctx.fill(); } ctx.fillRect(-ex + r * 0.2, ey - r * 0.1, ex * 2 - r * 0.4, r * 0.06); }
  if (cold > 0.3) { ctx.fillStyle = "rgba(220,240,255,0.9)"; for (let i = 0; i < 5; i++) { const a = -Math.PI * 0.85 + i * 0.4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r, hy + Math.sin(a) * r); ctx.lineTo(Math.cos(a) * r * 1.5, hy + Math.sin(a) * r * 1.5); ctx.lineTo(Math.cos(a + 0.12) * r, hy + Math.sin(a + 0.12) * r); ctx.fill(); } }
  ctx.restore();
};
export const roundRect = (ctx: Ctx, x: number, y: number, w: number, h: number, r: number) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
export const mixHex = (a: string, b: string, t: number) => { const p = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)); const A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`; };

// ------------------------------------------------------------------ type: the documentary's captions, pills and punch words
/** text as a path: stroke for the outline, then fill */
export const glyphs = (ctx: Ctx, text: string, em: number, x: number, y: number, outline: number | false, fill?: string, stroke = "#000") => {
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
export const textW = (text: string, em: number) => { const font = defaultFont(); return (layoutText(font, text).width / font.unitsPerEm) * em; };
export const CAP_Y = 1250;
export const captions = (ctx: Ctx, env: Env, f: number, WORDS: { w: string; s: number; e: number }[], FPS = 30) => {
  const t = f / FPS, w = WORDS.find((x, i, a) => t >= x.s - 0.03 && t < (a[i + 1] ? Math.min(a[i + 1].s, x.e + 0.5) : x.e + 0.6));
  if (!w) return;
  const pop = ease.outBack(clamp01((t - w.s + 0.03) / 0.12)), word = w.w.replace(/…/g, "");
  let em = 96; const tw = textW(word, em); if (tw > 820) em *= 820 / tw;
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.translate(W / 2, CAP_Y); ctx.scale(0.85 + 0.15 * pop, 0.85 + 0.15 * pop);
  glyphs(ctx, word, em, 0, 6, 20, "rgba(0,0,0,0.35)", "rgba(0,0,0,0.35)"); glyphs(ctx, word, em, 0, 0, 16, "#ffffff", "#0b0b0b");
  ctx.restore();
};
export const PILL = { yellow: ["#f2c11d", "#1a1406"], green: ["#2fbf63", "#ffffff"], red: ["#e2333b", "#ffffff"], blue: ["#2f7fe0", "#ffffff"], white: ["#ffffff", "#141414"] } as const;
export const pill = (ctx: Ctx, env: Env, text: string, color: keyof typeof PILL, x: number, y: number, em: number, t: number) => {
  if (t <= 0) return; const [bg, fg] = PILL[color], w = textW(text, em) + em * 0.9, h = em * 1.45, s = ease.outBack(clamp01(t));
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = "rgba(0,0,0,0.35)"; roundRect(ctx, -w / 2 + 3, -h / 2 + 5, w, h, h * 0.28); ctx.fill();
  ctx.fillStyle = bg; roundRect(ctx, -w / 2, -h / 2, w, h, h * 0.28); ctx.fill(); glyphs(ctx, text, em, 0, 0, false, fg); ctx.restore();
};
export const punch = (ctx: Ctx, env: Env, text: string, x: number, y: number, em: number, t: number, color = "#e8333b", rot = -0.06) => {
  if (t <= 0) return; const s = ease.outBack(clamp01(t * 1.6)) * (1 + 0.03 * Math.sin(t * 9));
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  glyphs(ctx, text, em, 0, 0, em * 0.34, undefined, "#0b0b0b"); glyphs(ctx, text, em, 0, 0, em * 0.16, color, "#ffffff"); ctx.restore();
};
export const numBox = (ctx: Ctx, env: Env, text: string, x: number, y: number, em: number, t: number) => {
  if (t <= 0) return; const w = textW(text, em) + em * 0.8, h = em * 1.35, s = ease.outBack(clamp01(t));
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = "rgba(14,14,16,0.92)"; roundRect(ctx, -w / 2, -h / 2, w, h, em * 0.25); ctx.fill(); glyphs(ctx, text, em, 0, 0, false, "#f2c11d"); ctx.restore();
};
export const flash = (ctx: Ctx, env: Env, a: number, color = "#ffffff") => { if (a <= 0) return; ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore(); };
export const label = (ctx: Ctx, env: Env, f: number, start: number, text: string, color: keyof typeof PILL) => pill(ctx, env, text, color, W / 2, 300, 40, seg(f, start + 3, start + 11));

// where a point on the floor lands on screen, and how many pixels tall a 1.75-unit person is there
export const place = (camera: THREE.PerspectiveCamera, env: Env, x: number, z: number, y = 0, tall = 1.75): [number, number, number] => {
  const [sx, sy] = screenPx(camera, v3(x, y, z), env), [, ty] = screenPx(camera, v3(x, y + tall, z), env); return [sx, sy, sy - ty];
};

