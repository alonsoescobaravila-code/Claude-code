// GOLPE DOBLE. What if every punch you throw hit twice as hard as the one before?
// The same blue studio and the same character as "Cerebro congelado", against a rag-doll dummy.
// Eight punches: x1, x2, x4, x8, x16, x32, x64, and then punch 31 (x1,073,741,824), which is too much.
// The rag doll is closed-form: every pose is a function of the frames since the last hit, never of
// the frame before, so any frame can be drawn on its own.
//
// Grid: 120 bpm at 60 fps, a beat is 30 frames, a bar is 120. Every hit lands on a beat (HITS).
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import * as THREE from "three";
import { draw3d, memo, rand } from "../three-core/stage";
import { clamp01, ease, lerp, seg, spring } from "../three-core/time";
import { defaultFont, fillText2d, layoutText } from "../three-core/type3d";
import { vignette } from "../three-core/look";
import { backdrop, basisQ, buildChar, camera, gloss, key, key3, lights, mesh, poseHand, setArm, SKIN, TAU, v3, type Char } from "./helado";

const W = 1080, H = 1920, FPS = 60, BAR = 120, END = 14 * BAR, AFTER = 11 * BAR;
export const HITS = [210, 330, 450, 570, 720, 870, 1020, 1290];
const CHARGE = 1080, LAST = HITS[7];
const PX = H / (2 * 15 * Math.tan((15 * Math.PI) / 180)); // pixels per world unit at z 0
const toPx = (x: number, y: number): [number, number] => [W / 2 + x * PX, H / 2 - (y - 0.2) * PX];

// ------------------------------------------------------------------ the dummy
const CREAM = "#f6f0e4", RED = "#ef4b4b";
const dummyHead = () => {
  const g = new THREE.Group(), ink = gloss("#1d1a2b", 0.25);
  g.add(mesh(new THREE.SphereGeometry(0.4, 40, 28), gloss(CREAM, 0.42)));
  const dots = new THREE.Group(), xs = new THREE.Group();
  for (const s of [-1, 1]) {
    dots.add(mesh(new THREE.SphereGeometry(0.055, 16, 12), ink, [s * 0.14, 0.05, 0.37], [1, 1.2, 0.5]));
    for (const d of [-1, 1]) { const m = mesh(new THREE.CapsuleGeometry(0.02, 0.11, 4, 8), ink, [s * 0.14, 0.05, 0.38]); m.rotation.z = d * 0.785; xs.add(m); }
  }
  const line = mesh(new THREE.CapsuleGeometry(0.02, 0.1, 4, 8), ink, [0, -0.12, 0.375]); line.rotation.z = Math.PI / 2;
  const oh = mesh(new THREE.SphereGeometry(1, 16, 12), gloss("#5a1f2b", 0.5), [0, -0.13, 0.37], [0.07, 0.09, 0.04]);
  g.add(dots, xs, line, oh);
  g.add(mesh(new THREE.TorusGeometry(0.4, 0.03, 8, 40), gloss(RED, 0.4))); (g.children[g.children.length - 1] as THREE.Mesh).rotation.y = Math.PI / 2; // a seam, crash-test style
  return { g, dots, xs, line, oh };
};
const faceDummy = (h: ReturnType<typeof dummyHead>, mode: "calm" | "ko" | "scared") => {
  h.dots.visible = mode !== "ko"; h.xs.visible = mode === "ko"; h.line.visible = mode === "calm"; h.oh.visible = mode !== "calm";
  h.dots.scale.setScalar(mode === "scared" ? 1.5 : 1); h.oh.scale.set(0.07, mode === "scared" ? 0.12 : 0.09, 0.04);
};
const limb = (cream: THREE.Material, red: THREE.Material, foot: boolean) => {
  const a = new THREE.Group(), b = new THREE.Group();
  a.add(mesh(new THREE.SphereGeometry(0.11, 16, 12), red));
  a.add(mesh(new THREE.CapsuleGeometry(0.095, 0.22, 6, 14), cream, [0, -0.2, 0]));
  b.position.set(0, -0.4, 0); b.add(mesh(new THREE.SphereGeometry(0.1, 16, 12), red));
  b.add(mesh(new THREE.CapsuleGeometry(0.085, 0.2, 6, 14), cream, [0, -0.19, 0]));
  b.add(foot ? mesh(new THREE.SphereGeometry(0.15, 18, 12), red, [0, -0.4, 0.05], [0.9, 0.65, 1.4]) : mesh(new THREE.SphereGeometry(0.13, 18, 12), cream, [0, -0.4, 0]));
  a.add(b); return { a, b };
};
const buildDummy = () => {
  const cream = gloss(CREAM, 0.42), red = gloss(RED, 0.4);
  const sway = new THREE.Group(), spin = new THREE.Group(); spin.position.set(0, 1.0, 0); sway.add(spin);
  const torso = new THREE.Group();
  torso.add(mesh(new THREE.CapsuleGeometry(0.34, 0.4, 10, 32), cream, [0, 0, 0], [1, 1, 0.85]));
  [[0.2, RED], [0.135, CREAM], [0.07, RED]].forEach(([r, c], i) => torso.add(mesh(new THREE.CircleGeometry(r as number, 32), gloss(c as string, 0.45), [0, 0.08, 0.292 + i * 0.004])));
  const head = dummyHead(); head.g.position.set(0, 0.92, 0);
  const neck = mesh(new THREE.SphereGeometry(0.13, 16, 12), red, [0, 0.52, 0]); torso.add(neck);
  const limbs = [[-0.44, 0.3, false], [0.44, 0.3, false], [-0.18, -0.52, true], [0.18, -0.52, true]].map(([x, y, foot]) => { const l = limb(cream, red, foot as boolean); l.a.position.set(x as number, y as number, 0); return { ...l, home: v3(x as number, y as number, 0) }; });
  spin.add(torso, head.g, ...limbs.map((l) => l.a));
  const sweat = [0, 1, 2].map(() => { const m = mesh(new THREE.SphereGeometry(0.05, 12, 10), gloss("#bfe4ff", 0.15), [0, 0, 0], [0.8, 1.3, 0.8]); spin.add(m); return m; });
  return { sway, spin, torso, head, limbs, sweat };
};
type Dummy = ReturnType<typeof buildDummy>;

const HOME = v3(0.66, -1.72, 0.3), DS = 0.9, WRAP = 6.6;
const wrap = (x: number) => ((((x + WRAP / 2) % WRAP) + WRAP) % WRAP) - WRAP / 2;
const bounce = (v: number, lo: number, hi: number) => { const L = hi - lo, m = ((((v - lo) % (2 * L)) + 2 * L) % (2 * L)); return lo + (m < L ? m : 2 * L - m); };
const PART_V: [number, number, number][] = [[0.085, 0.13, 0.11], [0.11, -0.04, -0.06], [-0.1, 0.11, 0.17], [0.14, 0.08, -0.14], [-0.07, -0.13, 0.12], [0.13, -0.1, -0.16]]; // torso, head, 4 limbs: x, y per frame, spin
/** which hit we are living in the aftermath of (-1 before the first) and frames since it */
const since = (f: number) => { let k = -1; for (let i = 0; i < HITS.length; i++) if (f >= HITS[i]) k = i; return { k, t: k < 0 ? 0 : f - HITS[k] }; };

const poseDummy = (d: Dummy, f: number, shake: THREE.Vector3) => {
  const { k, t } = since(f);
  const pos = HOME.clone(), sp = new THREE.Vector3(0, 0, 0); // sp: sway z, spin z, splay
  let scale = DS, flail = 0, face: "calm" | "ko" | "scared" = "calm", parts = 0, pt = 0;
  const idle = 0.03 * Math.sin((f / BAR) * TAU);
  if (k === 0) { const s = spring(f, HITS[0], FPS, 3, 0.25); sp.x = -0.05 * s; pos.x += 0.02 * s; flail = 0.06 * Math.exp(-t / 25); }
  if (k === 1) { const s = spring(f, HITS[1], FPS, 1.7, 0.16); sp.x = -0.34 * s; pos.x += 0.08 * s; flail = 0.3 * Math.exp(-t / 35); face = t < 30 ? "ko" : "calm"; }
  if (k === 2) { const u = seg(t, 0, 52), e = ease.outCubic(u), s = spring(f, HITS[2] + 52, FPS, 1.5, 0.2); sp.y = -TAU * e; sp.z = (1 - u) ** 2; pos.y += 0.55 * Math.sin(Math.PI * u); pos.x += 0.35 * Math.sin(Math.PI * u); sp.x = u < 1 ? 0 : 0.2 * s; flail = 0.9 * Math.exp(-t / 45); face = t < 70 ? "ko" : "calm"; }
  if (k === 3 || k === 4) { // out of the frame on the right, back in on the left: once, then four times
    const T = k === 3 ? 108 : 126, n = k === 3 ? 1 : 4, u = seg(t, 0, T), e = ease.outCubic(u), s = spring(f, HITS[k] + T, FPS, 1.4, 0.18);
    pos.x = wrap(HOME.x + WRAP * n * e); pos.y += 0.35 * Math.sin(TAU * u * n * 0.5) * (1 - u); pos.z = HOME.z - 1.6 * Math.sin(Math.PI * clamp01(u * 1.15));
    sp.y = -TAU * (k === 3 ? 3 : 7) * e; sp.z = (1 - u) ** 1.5; sp.x = u < 1 ? 0 : (k === 3 ? 0.25 : 0.5) * s; flail = 1.2 * Math.exp(-t / 70); face = t < T + (k === 3 ? 20 : 70) ? "ko" : "calm";
  }
  if (k === 5) { parts = t < 96 ? 1 : 1 - ease.inOutCubic(seg(t, 96, 132)); pt = Math.min(t, 96); face = t < 150 ? "ko" : "calm"; flail = 0.5 * Math.exp(-Math.max(0, t - 120) / 30); const s = spring(f, HITS[5] + 132, FPS, 3, 0.25); scale = DS * (1 + (t >= 132 ? 0.12 * s : 0)); }
  if (k === 6) { // straight into the backdrop, which turns out to be a wall
    const e = ease.outCubic(seg(t, 0, 16)), back = ease.inOutCubic(seg(t, 66, 108)), a = e * (1 - back), s = spring(f, HITS[6] + 108, FPS, 1.6, 0.2);
    pos.lerp(v3(WALL.x, WALL.y - 0.6 - 0.002 * clamp01((t - 16) / 50) * 50 * (1 - back), -0.8), a); scale = lerp(DS, 0.13, a);
    sp.y = -TAU * 2 * e + (t > 66 ? TAU * 0 : 0); sp.z = a; sp.x = t >= 108 ? 0.25 * s : 0; flail = t > 66 ? 0.6 * Math.exp(-(t - 66) / 40) : 0; face = t < 130 ? "ko" : "calm";
    if (f >= CHARGE + 70) face = "scared";
  }
  if (k === 7) { pos.x += 0.55 * t; pos.y += 0.2 * t; sp.y = -0.7 * t; sp.z = 1; face = "ko"; }
  const scared = k === 6 ? seg(f, CHARGE + 70, CHARGE + 110) : 0;
  d.sway.position.copy(pos).add(shake).add(v3(scared * 0.014 * Math.sin(f * 2.3), 0, 0)); d.sway.scale.setScalar(scale);
  d.sway.rotation.set(0, -1.0, sp.x + idle * (k < 0 ? 1 : 0.5) - scared * 0.12);
  d.spin.rotation.set(0, 0, sp.y);
  faceDummy(d.head, face);
  // the rag doll: limbs trail outward in a spin and flop after a hit
  const order = [d.torso, d.head.g, ...d.limbs.map((l) => l.a)], rest = [v3(0, 0, 0), v3(0, 0.92, 0), ...d.limbs.map((l) => l.home)];
  order.forEach((o, i) => {
    const v = PART_V[i], lo = (-2.0 - HOME.x) / DS, hi = (2.0 - HOME.x) / DS, lo2 = (-3.0 - HOME.y) / DS - 1, hi2 = (3.3 - HOME.y) / DS - 1;
    const fly = v3(bounce(rest[i].x + v[0] * pt, lo, hi), bounce(rest[i].y + v[1] * pt, lo2, hi2), 0);
    o.position.copy(rest[i]).lerp(fly, parts);
    const rz = v[2] * pt * parts;
    if (i < 2) o.rotation.set(0, 0, rz + (i === 1 ? flail * 0.25 * Math.sin(t * 0.33) : 0));
    else {
      const j = i - 2, side = j % 2 ? 1 : -1, arm = j < 2, ph = j * 1.7;
      const up = arm ? scared * 2.5 : 0;
      o.rotation.set(flail * 0.8 * Math.cos(t * 0.27 + ph * 2), 0, rz + side * (0.12 + sp.z * (arm ? 1.5 : 0.9) + up) + flail * Math.sin(t * 0.31 + ph));
      d.limbs[j].b.rotation.set(0, 0, side * (sp.z * 0.4 - up * 0.25) + flail * 0.9 * Math.sin(t * 0.43 + ph * 2.3));
    }
  });
  d.sweat.forEach((m, i) => { const u = ((f * 0.022 + i / 3) % 1); m.visible = scared > 0.5 && k === 6; m.position.set([-0.42, 0.44, 0.1][i], 1.15 - u * 0.9, 0.2); });
};
const WALL = v3(1.15, 1.45, 0);

// ------------------------------------------------------------------ the hero
const Q_FIST = basisQ(v3(1, 0, 0), v3(0, 0, 1), v3(0, -1, 0)); // knuckles forward, palm down
const HERO = v3(-1.1, -0.86, 0), HS = 0.9;
const G0 = v3(-0.42, 0.2, 0.62), HIT = v3(-0.2, 0.3, 1.13);
const windmill = (f: number) => { const t = (f - CHARGE) / FPS, T = (LAST - 8 - CHARGE) / FPS, a = TAU * 7 * (t / T) ** 2; return v3(-0.64, 0.36 + 0.78 * Math.sin(a), -0.78 * Math.cos(a)); };
const poseHero = (c: Char, f: number, shake: THREE.Vector3) => {
  // which punch is being thrown: each owns [hit - 40, hit + 40]
  let i = HITS.findIndex((h) => f >= h - 40 && f < h + 40); const last = f >= CHARGE && f < LAST + 40; if (last) i = 7;
  const Hh = i < 0 ? 0 : HITS[i], big = i < 0 ? 0 : Math.min(1, 0.35 + i * 0.11);
  const wind = i < 0 ? 0 : last ? seg(f, CHARGE, CHARGE + 30) : ease.inOutCubic(seg(f, Hh - 36, Hh - 10));
  const strike = i < 0 ? 0 : ease.outExpo(seg(f, Hh - 8, Hh)), rec = i < 0 ? 0 : ease.inOutCubic(seg(f, Hh + 14, Hh + 40));
  const charge = last ? seg(f, CHARGE, LAST - 8) : 0;
  const back = last ? windmill(Math.min(f, LAST - 8)) : v3(-0.64, 0.3 + 0.1 * big, -0.3 - 0.45 * big);
  const near = G0.clone().lerp(back, wind).lerp(HIT, strike).lerp(G0, rec);
  const tremble = charge * (1 - strike) * Math.sin(f * 2.7);
  const bob = 0.04 * Math.sin((f / BAR) * TAU);
  c.char.position.copy(HERO).add(shake).add(v3(-0.16 * big * wind * (1 - strike) + 0.34 * strike * (1 - rec) + tremble * 0.012, bob, 0));
  c.char.scale.setScalar(HS); c.char.rotation.set(0, 1.2, 0);
  c.body.rotation.set(-0.1 * wind * (1 - strike) + 0.16 * strike * (1 - rec), -0.5 * big * wind * (1 - strike) + 0.4 * strike * (1 - rec), tremble * 0.01);
  const sy = 1 - 0.07 * wind * (1 - strike) + 0.09 * strike * (1 - rec) + 0.012 * Math.sin((f / BAR) * TAU + 1);
  c.body.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
  c.legs.forEach((g, j) => g.rotation.set((j ? -1 : 1) * (0.25 + 0.3 * strike * (1 - rec)) + 0.08 * Math.sin((f / BAR) * TAU + j * 2), 0, (j ? 1 : -1) * 0.06));
  const amazed = [3, 4, 5, 6].some((k) => f >= HITS[k] + 16 && f < HITS[k] + 100);
  c.head.rotation.set(-0.08 * wind * (1 - strike) + 0.1 * strike * (1 - rec) - (amazed ? 0.08 : 0), 0.5 * big * wind * (1 - strike) - 0.3, tremble * 0.015);
  (c.skin as THREE.MeshStandardMaterial).color.copy(SKIN).lerp(new THREE.Color("#ff8f7a"), charge * 0.6 * (1 - rec));
  c.eyes.forEach((e) => {
    e.open.visible = true; e.shut.visible = false; e.happy.visible = false; e.g.position.copy(e.home).add(v3(-0.03, 0, 0));
    const w = amazed ? 1.35 : 1; e.open.scale.set(w, w * ((f > 60 && f < 66) ? 0.15 : 1), 1);
    const angry = Math.max(wind * (1 - rec), 0.25) * (amazed ? 0 : 1);
    e.brow.position.copy(e.browHome).add(v3(0, amazed ? 0.1 : -0.03 * angry, 0)); e.brow.rotation.z = Math.PI / 2 - e.s * 0.45 * angry;
  });
  const yell = i >= 0 && f >= Hh - 8 && f < Hh + 16, effort = last && !yell && f < LAST;
  c.open.visible = yell || amazed; c.grim.visible = effort; c.firm.visible = !yell && !effort && !amazed && wind > 0.3 && rec < 0.5; c.smile.visible = !c.open.visible && !c.grim.visible && !c.firm.visible;
  c.open.scale.set(amazed && !yell ? 0.5 : 1, amazed && !yell ? 0.5 : 1.2, 1); c.tongue.position.set(0, -0.12, 0.04); c.tongue.scale.set(0.12, 0.09, 0.05); c.firm.scale.set(1, 1.1, 1); c.grim.scale.setScalar(1);
  c.spikes.forEach(({ m }) => (m.visible = false)); c.frost.visible = false; c.drops.forEach(({ m }) => (m.visible = false));
  setArm(c.arms[0], near, Q_FIST); poseHand(c.arms[0].hand, 1, 0.1);
  const far = v3(0.42, 0.22, 0.5).lerp(v3(0.5, 0.2, 0.75), wind * (1 - strike)).lerp(v3(0.55, 0.12, 0.0), strike * (1 - rec));
  setArm(c.arms[1], far, Q_FIST); poseHand(c.arms[1].hand, 1, 0.1);
};

const buildRing = () => {
  const scene = new THREE.Scene(); lights(scene);
  const hero = buildChar(false), dummy = buildDummy(); scene.add(hero.char, dummy.sway);
  // the fist heats up while it charges
  const glow = mesh(new THREE.SphereGeometry(0.24, 24, 16), new THREE.MeshBasicMaterial({ color: "#ffe14a", transparent: true, depthWrite: false })); hero.arms[0].hand.g.add(glow);
  const core = mesh(new THREE.SphereGeometry(0.18, 24, 16), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, depthWrite: false })); hero.arms[0].hand.g.add(core);
  return { scene, cam: camera(), hero, dummy, glow, core };
};

// ------------------------------------------------------------------ the aftermath
const earthMap = () => {
  const w = 256, h = 128, r = rand(77), gw = 16, gh = 8, lat: number[][] = [];
  for (let y = 0; y <= gh; y++) { lat.push([]); for (let x = 0; x < gw; x++) lat[y].push(r()); }
  const val = (u: number, v: number, oct: number) => { const x = u * gw * oct, y = v * gh * oct, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const g = (a: number, b: number) => lat[((b % (gh + 1)) + gh + 1) % (gh + 1)][((a % gw) + gw) % gw];
    return lerp(lerp(g(x0, y0), g(x0 + 1, y0), sx), lerp(g(x0, y0 + 1), g(x0 + 1, y0 + 1), sx), sy); };
  const d = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = x / w, v = y / h, n = 0.65 * val(u, v, 1) + 0.35 * val(u + 0.37, v + 0.11, 2), pole = Math.abs(v - 0.5) > 0.43, land = n > 0.54, i = (y * w + x) * 4;
    const c = pole ? [240, 248, 255] : land ? (n > 0.63 ? [74, 168, 92] : [104, 196, 110]) : [38, 132, 232];
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  const t = new THREE.DataTexture(d, w, h, THREE.RGBAFormat); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  return t;
};
const buildAfter = () => {
  const scene = new THREE.Scene(); lights(scene);
  const hero = buildChar(false); scene.add(hero.char);
  const earth = new THREE.Group(); earth.position.set(0.45, 0.45, -2.5); earth.scale.setScalar(0.78); earth.rotation.set(0.25, Math.PI / 2 + 0.75, 0.2); scene.add(earth);
  const R = 1.35, mat = new THREE.MeshStandardMaterial({ map: earthMap(), roughness: 0.5 });
  const halves = [0, 1].map((i) => {
    const g = new THREE.Group(), dir = i ? -1 : 1;
    g.add(new THREE.Mesh(new THREE.SphereGeometry(R, 64, 40, i * Math.PI, Math.PI), mat));
    ([[R, "#7a4a2a"], [R * 0.9, "#ff6a2a"], [R * 0.58, "#ffa62a"], [R * 0.28, "#fff1a8"]] as const).forEach(([r, c], j) => { const m = mesh(new THREE.CircleGeometry(r, 64), j ? new THREE.MeshBasicMaterial({ color: c }) : gloss(c, 0.6), [0, 0, -dir * j * 0.004]); m.rotation.y = i ? 0 : Math.PI; g.add(m); });
    earth.add(g); return g;
  });
  const rr = rand(5), debris = Array.from({ length: 16 }, (_, i) => { const m = mesh(new THREE.IcosahedronGeometry(0.06 + rr() * 0.09, 0), new THREE.MeshStandardMaterial({ color: i % 3 ? "#7a4a2a" : "#ff8a2a", roughness: 0.6, flatShading: true })); scene.add(m); return { m, dir: v3(rr() * 2 - 1, rr() * 2 - 1, rr() * 0.6 - 0.3).normalize(), sp: 0.0015 + rr() * 0.004, w: rr() * 0.06 - 0.03 }; });
  const head = dummyHead(); scene.add(head.g);
  return { scene, cam: camera(), hero, earth, halves, debris, head };
};
const Q_OPEN_UP_L = basisQ(v3(0, 0, -1), v3(-1, 0.3, 0).normalize(), v3(-0.3, -1, 0).normalize().negate().cross(v3(0, 0, -1)).normalize().lengthSq() ? v3(0.287, 0.958, 0) : v3(0, 1, 0));
const SHRUG = 1530;
const poseAfter = (s: ReturnType<typeof buildAfter>, f: number) => {
  const t = f - AFTER, u = ease.outCubic(seg(t, 0, 360)), c = s.hero;
  s.halves.forEach((g, i) => { const dir = i ? -1 : 1; g.position.set(0, dir * 0.08 * u, dir * (0.22 + 0.62 * u)); g.rotation.set(dir * 0.22 * u, 0, dir * 0.1 * u); });
  s.earth.rotation.y = Math.PI / 2 + 0.75 + 0.0006 * t;
  s.debris.forEach(({ m, dir, sp, w }, i) => { m.position.copy(s.earth.position).addScaledVector(dir, 0.5 + sp * t * 60 * (0.3 + 0.7 * (1 - u * 0.5)) / 60 * 9).add(v3(0, 0, 0.6)); m.rotation.set(w * t, w * t * 1.3, i); });
  s.head.g.position.set(2.7 - t * 0.0125, 0.5 * Math.sin(t * 0.008) - 2.6, 1.2); s.head.g.rotation.set(0.3, t * 0.02, t * 0.035); s.head.g.scale.setScalar(0.7); faceDummy(s.head, "ko");
  // the hero: stares at the planet, then at his fist, then at us, and shrugs
  const shrug = ease.outBack(seg(f, SHRUG - 6, SHRUG + 8)), dip = ease.inOutCubic(seg(f, SHRUG - 30, SHRUG - 6)) * (1 - seg(f, SHRUG - 6, SHRUG));
  const lookFist = ease.inOutCubic(seg(f, 1425, 1450)) * (1 - ease.inOutCubic(seg(f, 1488, 1506))), toCam = ease.inOutCubic(seg(f, 1490, 1512));
  c.char.position.set(-0.9, -2.0 + 0.04 * Math.sin((f / BAR) * TAU) - 0.05 * dip + 0.05 * shrug, 1.2); c.char.scale.setScalar(0.66); c.char.rotation.set(0, lerp(0.55, 0.1, toCam), 0);
  const sy = 1 - 0.05 * dip + 0.04 * shrug * spring(f, SHRUG + 8, FPS, 3, 0.3);
  c.body.rotation.set(0, 0, 0); c.body.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
  c.legs.forEach((g, j) => g.rotation.set(0.14 * Math.sin((f / BAR) * TAU + j * 2.2), 0, (j ? 1 : -1) * 0.05));
  c.head.rotation.set(lerp(lerp(-0.42, 0.3, lookFist), -0.02, toCam), lerp(lerp(0.1, -0.35, lookFist), 0, toCam), 0.12 * shrug);
  (c.skin as THREE.MeshStandardMaterial).color.copy(SKIN);
  c.eyes.forEach((e) => { e.open.visible = true; e.shut.visible = e.happy.visible = false; e.g.position.copy(e.home); const w = lerp(1.35, 1.1, toCam); e.open.scale.set(w, w * ((f > 1516 && f < 1522) ? 0.15 : 1), 1); e.brow.position.copy(e.browHome).add(v3(0, 0.1, 0)); e.brow.rotation.z = Math.PI / 2 + e.s * 0.25 * shrug; });
  c.open.visible = toCam < 0.5; c.grim.visible = f >= SHRUG - 6; c.firm.visible = toCam >= 0.5 && f < SHRUG - 6; c.smile.visible = false;
  c.open.scale.set(0.5, 0.55, 1); c.tongue.position.set(0, -0.12, 0.04); c.tongue.scale.set(0.12, 0.09, 0.05); c.firm.scale.set(1, 1.1, 1); c.grim.scale.setScalar(0.6 + 0.4 * shrug);
  c.spikes.forEach(({ m }) => (m.visible = false)); c.frost.visible = false; c.drops.forEach(({ m }) => (m.visible = false));
  const Q_DOWN = basisQ(v3(0, 0, 1), v3(0, -1, 0), v3(1, 0, 0)), Q_DOWN_R = basisQ(v3(0, 0, -1), v3(0, -1, 0), v3(-1, 0, 0));
  const Q_UP_L = basisQ(v3(0, 0, -1), v3(-0.6, 0.8, 0), v3(0.8, 0.6, 0)), Q_UP_R = basisQ(v3(0, 0, 1), v3(0.6, 0.8, 0), v3(-0.8, 0.6, 0));
  const L = v3(-0.74, -0.3, 0.15).lerp(v3(-0.3, 0.42, 0.8), lookFist).lerp(v3(-1.0, 0.5, 0.3), shrug), Rr = v3(0.74, -0.3, 0.15).lerp(v3(1.0, 0.5, 0.3), shrug);
  setArm(c.arms[0], L, Q_DOWN.clone().slerp(Q_FIST, lookFist).slerp(Q_UP_L, clamp01(shrug))); poseHand(c.arms[0].hand, lerp(lerp(0.4, 1, lookFist), 0.1, clamp01(shrug)), clamp01(shrug));
  setArm(c.arms[1], Rr, Q_DOWN_R.clone().slerp(Q_UP_R, clamp01(shrug))); poseHand(c.arms[1].hand, lerp(0.4, 0.1, clamp01(shrug)), clamp01(shrug));
};
void Q_OPEN_UP_L;

// ------------------------------------------------------------------ 2D: the crack, impacts, captions, the flash
const crack = (ctx: Ctx, env: Env, f: number) => {
  const at = HITS[6] + 16; if (f < at || f >= LAST) return;
  const [cx, cy] = toPx(WALL.x, WALL.y - 0.6 + 0.4), g = ease.outExpo(seg(f, at, at + 10)), r = rand(31);
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.lineJoin = "round"; ctx.lineCap = "round";
  const rays: [number, number][][] = [];
  for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU + r() * 0.4, len = (90 + r() * 120) * g, pts: [number, number][] = [[cx, cy]]; for (let j = 1; j <= 5; j++) { const d = (len * j) / 5, aa = a + (r() - 0.5) * 0.5; pts.push([cx + Math.cos(aa) * d, cy + Math.sin(aa) * d]); } rays.push(pts); }
  for (const [col, lw, off] of [["#0f3a8f", 7, 0], ["#a9d0ff", 2, 2.5]] as const) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.globalAlpha = off ? 0.7 : 0.9; ctx.beginPath(); for (const p of rays) { p.forEach(([x, y], j) => (j ? ctx.lineTo(x + off, y + off) : ctx.moveTo(x + off, y + off))); } ctx.stroke(); }
  ctx.strokeStyle = "#0f3a8f"; ctx.lineWidth = 4; ctx.globalAlpha = 0.8; ctx.beginPath(); rays.forEach((p, i) => { const q = p[2]; i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.stroke();
  ctx.restore();
};
const IMPACT = toPx(0.28, -0.42);
const impact = (ctx: Ctx, env: Env, f: number) => {
  const { k, t } = since(f); if (k < 0 || t > 11 || k === 7) return;
  const s = ease.outBack(seg(t, 0, 5)) * (1 - seg(t, 7, 11)), R = (70 + k * 38) * s, r = rand(100 + k), rot = r() * TAU, n = 12;
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.translate(IMPACT[0], IMPACT[1]); ctx.rotate(rot);
  for (const [col, m] of [["#ffe14a", 1], ["#ffffff", 0.62]] as const) { ctx.fillStyle = col; ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * TAU, rad = (i % 2 ? 0.45 : 1) * R * m; i ? ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad) : ctx.moveTo(rad, 0); } ctx.closePath(); ctx.fill(); }
  ctx.restore();
};
type Line = { text: string; em: number; color?: string };
const TIMES = defaultFont().glyphIndex(0xd7) ? "×" : "x";
const POWER = ["1", "2", "4", "8", "16", "32", "64", "1.073.741.824"];
const CAPS: { from: number; to: number; lines: Line[] }[] = [
  { from: 0, to: HITS[0] - 44, lines: [{ text: "¿Y si cada golpe", em: 58 }, { text: "pegara el doble?", em: 58 }] },
  ...HITS.slice(0, 7).map((h, i) => ({ from: h - 44, to: i < 6 ? HITS[i + 1] - 44 : CHARGE, lines: [{ text: `GOLPE ${i + 1}`, em: 54 }, { text: `${TIMES}${POWER[i]}`, em: 160, color: "#ffe14a" }] })),
  { from: CHARGE, to: CHARGE + 96, lines: [{ text: "24 golpes después…", em: 58 }] },
  { from: CHARGE + 96, to: LAST, lines: [{ text: "GOLPE 31", em: 54 }, { text: `${TIMES}${POWER[7]}`, em: 160, color: "#ffe14a" }] },
  { from: SHRUG, to: END, lines: [{ text: "Ups.", em: 130 }] },
];
const SAFE_L = 147, SAFE_R = 934;
const captions = (ctx: Ctx, env: Env, f: number) => {
  const cap = CAPS.find((c) => f >= c.from && f < c.to); if (!cap) return;
  const font = defaultFont(); let y = 300;
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  cap.lines.forEach((line, i) => {
    const lay = layoutText(font, line.text), wEm = lay.width / font.unitsPerEm, em = Math.min(line.em, (SAFE_R - SAFE_L - 30) / wEm);
    const big = line.em >= 100, at = cap.from + (big ? 44 - 4 : 4 + i * 6), isHitLabel = big && cap.lines.length === 2;
    const t = big ? ease.outBack(seg(f, isHitLabel ? at : cap.from + 4, (isHitLabel ? at : cap.from + 4) + 12)) : ease.outCubic(seg(f, at, at + 12));
    const pre = isHitLabel ? seg(f, cap.from + 6, cap.from + 16) : 0; // the number is there, dim, before the hit lights it up
    y += em * (i ? 0.62 : 0.4);
    const sc = big ? (isHitLabel ? lerp(0.8, 1, t) : t) : 1, alpha = big ? (isHitLabel ? Math.max(pre * 0.45, clamp01(t)) : clamp01(t)) : t;
    if (alpha > 0) {
      ctx.save(); ctx.translate((SAFE_L + SAFE_R) / 2, y + (big ? 0 : (1 - t) * 20)); ctx.scale(sc, sc);
      ctx.globalAlpha = alpha * 0.55; ctx.fillStyle = "#0d2f7a"; fillText2d(ctx as unknown as CanvasRenderingContext2D, font, lay, em, 0, em * 0.36 + (big ? 8 : 5));
      ctx.globalAlpha = alpha; ctx.fillStyle = line.color ?? "#ffffff"; fillText2d(ctx as unknown as CanvasRenderingContext2D, font, lay, em, 0, em * 0.36);
      ctx.restore();
    }
    y += em * 0.62;
  });
  ctx.restore();
};
const flash = (ctx: Ctx, env: Env, f: number) => {
  const a = f < AFTER ? seg(f, LAST, LAST + 5) : 1 - ease.inOutCubic(seg(f, AFTER, AFTER + 40)); if (a <= 0) return;
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalAlpha = a; ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
  if (f < AFTER) for (let i = 0; i < 3; i++) { const u = seg(f, LAST + 3 + i * 5, LAST + 30 + i * 2); if (u <= 0 || u >= 1) continue; ctx.globalAlpha = (1 - u) * 0.8; ctx.strokeStyle = i % 2 ? "#ffe14a" : "#9cc6ff"; ctx.lineWidth = 60 * (1 - u) + 6; ctx.beginPath(); ctx.arc(IMPACT[0], IMPACT[1], 80 + u * 1700, 0, TAU); ctx.stroke(); }
  ctx.restore();
};
const LOOK = { clear: null, toneMapping: THREE.ACESFilmicToneMapping, exposure: 1.12 } as const;
const ring = (start: number) => (ctx: Ctx, local: number, env: Env) => {
  const f = start + local, s = memo(env, "golpes:ring", buildRing), { k, t } = since(f);
  const amp = k < 0 || k === 7 ? 0 : 0.012 * 1.5 ** k * Math.exp(-t / 7), shake = v3(amp * Math.sin(t * 2.4), amp * Math.cos(t * 3.1), 0);
  poseHero(s.hero, f, shake); poseDummy(s.dummy, f, shake);
  const ch = f >= CHARGE && f < LAST ? seg(f, CHARGE + 20, LAST - 8) : 0, pulse = 1 + 0.15 * Math.sin(f * 0.9);
  s.glow.visible = s.core.visible = ch > 0; s.glow.scale.setScalar((0.6 + 1.6 * ch) * pulse); (s.glow.material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.35 * ch; s.core.scale.setScalar(0.4 + 1.1 * ch); (s.core.material as THREE.MeshBasicMaterial).opacity = 0.5 * ch;
  backdrop(ctx, env); crack(ctx, env, f); draw3d(ctx, env, s.scene, s.cam, LOOK); impact(ctx, env, f); captions(ctx, env, f); flash(ctx, env, f); vignette(ctx, env, 0.2, "#0a2a6e");
};
const after = (ctx: Ctx, local: number, env: Env) => {
  const f = AFTER + local, s = memo(env, "golpes:after", buildAfter);
  poseAfter(s, f); backdrop(ctx, env); draw3d(ctx, env, s.scene, s.cam, LOOK); captions(ctx, env, f); flash(ctx, env, f); vignette(ctx, env, 0.2, "#0a2a6e");
};

export const golpes: Film = {
  meta: { title: "Golpe doble", W, H, fps: FPS, bpm: 120, durationFrames: END, kind: "story", poster: 880,
    sync: HITS.map((frame, i) => ({ frame, label: `golpe x${POWER[i]}` })),
    checks: { none: { "3d": "a punch that is meant to connect and a rag doll that is meant to fly apart: contact is checked by eye on stills" } } },
  assets: { images: {} },
  shots: [
    { id: "x1", start: 0, end: 240, draw: ring(0) }, { id: "x2x4", start: 240, end: 480, draw: ring(240) }, { id: "x8x16", start: 480, end: 840, draw: ring(480) },
    { id: "x32x64", start: 840, end: 1080, draw: ring(840) }, { id: "x1e9", start: 1080, end: AFTER, draw: ring(1080) }, { id: "ups", start: AFTER, end: END, draw: after },
  ],
};
void key; void key3;
