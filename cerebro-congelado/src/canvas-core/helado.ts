// CEREBRO CONGELADO. Why your head hurts when you eat ice cream too fast, in five shots.
// A 3D explainer on a blue studio backdrop: one fixed camera, two sets (the character, and a
// cutaway of its head). Every value on screen is set from the frame number on every draw.
//
// Grid: 120 bpm at 60 fps, a beat is 30 frames and a bar is 120. Every cut is on a bar line and
// every big moment lands on a beat (see CUE below).
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import * as THREE from "three";
import { draw3d, memo } from "../three-core/stage";
import { solveTwoBone } from "../three-core/rig";
import { clamp01, ease, lerp, seg, spring, type Ease } from "../three-core/time";
import { defaultFont, fillText2d, layoutText, textPlane } from "../three-core/type3d";
import { vignette } from "../three-core/look";

const W = 1080, H = 1920, FPS = 60, BPM = 120, BAR = 120;
export const CUT = { bite: 0, freeze: 2 * BAR, palate: 4 * BAR, nerve: 7 * BAR, trick: 10 * BAR, end: 13 * BAR };
/** the frame each shot's big moment lands on (all on beats): music accents and the contact sheet read these */
export const CUE = { bite: 120, freeze: 330, press: 570, squeeze: 690, burst: 930, alarm: 990, melt: 1380, thumb: 1440 };
export const CAPTIONS: { from: number; to: number; text: string }[] = [
  { from: CUT.bite, to: CUT.freeze, text: "Un gran mordisco\nde helado…" },
  { from: CUT.freeze, to: CUT.palate, text: "¡Y se te congela\nel cerebro!" },
  { from: CUT.palate, to: CUT.nerve, text: "El frío toca tu paladar\ny los vasos se encogen" },
  { from: CUT.nerve, to: CUT.trick, text: "Luego se abren de golpe\ny el nervio da la alarma" },
  { from: CUT.trick, to: CUT.end, text: "Truco: pega la lengua\nal paladar" },
];

// ------------------------------------------------------------------ small helpers
type V3 = THREE.Vector3;
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const UP = v3(0, 1, 0);
const TAU = Math.PI * 2;
/** piecewise keys [frame, value]: eased between neighbours, held outside. Pure in f. */
const key = (f: number, ks: [number, number][], e: Ease = ease.inOutCubic) => {
  if (f <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) if (f <= ks[i][0]) return lerp(ks[i - 1][1], ks[i][1], e(seg(f, ks[i - 1][0], ks[i][0])));
  return ks[ks.length - 1][1];
};
const key3 = (f: number, ks: [number, number, number, number][], e: Ease = ease.inOutCubic) =>
  v3(key(f, ks.map((k) => [k[0], k[1]]), e), key(f, ks.map((k) => [k[0], k[2]]), e), key(f, ks.map((k) => [k[0], k[3]]), e));
const gloss = (color: THREE.ColorRepresentation, roughness = 0.4) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, p?: [number, number, number], s?: [number, number, number]) => {
  const o = new THREE.Mesh(g, m); if (p) o.position.set(...p); if (s) o.scale.set(...s); return o;
};
const basisQ = (x: V3, y: V3, z: V3) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
const lights = (scene: THREE.Scene) => {
  // bright, even, white: a big sky fill and two soft directionals, no drama
  scene.add(new THREE.HemisphereLight("#ffffff", "#c9d6f0", 1.45));
  const k = new THREE.DirectionalLight("#ffffff", 1.7); k.position.set(-3, 5, 8); scene.add(k);
  const fl = new THREE.DirectionalLight("#ffffff", 0.75); fl.position.set(5, 1, 6); scene.add(fl);
};
const camera = () => { const c = new THREE.PerspectiveCamera(30, W / H, 0.1, 100); c.position.set(0, 0.2, 15); c.lookAt(0, 0.2, 0); return c; };

const SKIN = new THREE.Color("#ffc38f"), ICE_SKIN = new THREE.Color("#a8d3f5");
const INK = "#1d1a2b";

// ------------------------------------------------------------------ the character (shots 1, 2, 5)
const HEAD_C = v3(0, 0.65, 0), HEAD_R = v3(0.85, 0.8, 0.8);
/** a point on the head's surface in front, from face x/y (head group space) */
const onHead = (x: number, y: number, lift = 0) => {
  const nx = x / HEAD_R.x, ny = (y - HEAD_C.y) / HEAD_R.y, nz = Math.sqrt(Math.max(0.01, 1 - nx * nx - ny * ny));
  return v3(x, y, nz * HEAD_R.z + lift);
};
const ARM_L = 0.58;

const buildHand = (skin: THREE.Material) => {
  // hand frame: +y along the fingers, +z out of the palm, +x toward the thumb
  const g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(0.16, 24, 16), skin, [0, 0.02, 0], [1, 0.95, 0.72]));
  const fingers: { a: THREE.Group; b: THREE.Group }[] = [];
  for (let i = 0; i < 4; i++) {
    const a = new THREE.Group(); a.position.set(-0.112 + i * 0.075, 0.11, 0.01);
    a.add(mesh(new THREE.CapsuleGeometry(0.042, 0.06, 4, 10), skin, [0, 0.04, 0]));
    const b = new THREE.Group(); b.position.set(0, 0.09, 0);
    b.add(mesh(new THREE.CapsuleGeometry(0.04, 0.05, 4, 10), skin, [0, 0.035, 0]));
    a.add(b); g.add(a); fingers.push({ a, b });
  }
  const thumb = new THREE.Group(); thumb.position.set(0.13, 0.0, 0.03);
  thumb.add(mesh(new THREE.CapsuleGeometry(0.042, 0.1, 4, 10), skin, [0.08, 0, 0], undefined)); (thumb.children[0] as THREE.Mesh).rotation.z = Math.PI / 2;
  g.add(thumb);
  return { g, fingers, thumb };
};
type Hand = ReturnType<typeof buildHand>;
/** curl 0 open, 1 fist; thumb 0 tucked along the fingers, 1 sticking out along +x */
const poseHand = (h: Hand, curl: number, thumb: number, wrap = 0) => {
  h.fingers.forEach((fg, i) => { const c = curl * (1 + (i - 1.5) * 0.04); fg.a.rotation.x = c * 1.25; fg.b.rotation.x = c * 1.35; });
  h.thumb.rotation.set(0, -wrap * 1.1, lerp(1.25, 0, thumb));
};

const waffle = () => {
  // the cone's waffle, as data: a diamond grid pressed into biscuit
  const n = 64, d = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const line = (x + y) % 16 < 2 || (x - y + n) % 16 < 2, i = (y * n + x) * 4;
    d[i] = line ? 176 : 232; d[i + 1] = line ? 116 : 172; d[i + 2] = line ? 52 : 96; d[i + 3] = 255;
  }
  const t = new THREE.DataTexture(d, n, n, THREE.RGBAFormat); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  return t;
};
const BITE_C = v3(-0.17, 0.2, 0.12), BITE_R = 0.2;
const scoopGeo = (bitten: boolean) => {
  const g = new THREE.SphereGeometry(0.27, 48, 32), p = g.attributes.position as THREE.BufferAttribute, a = v3();
  if (bitten) {
    for (let i = 0; i < p.count; i++) {
      a.fromBufferAttribute(p, i); const d = a.clone().sub(BITE_C), L = d.length();
      if (L < BITE_R) { // pushed back onto the bite's sphere: a scooped-out hollow
        const dir = BITE_C.clone().negate().normalize(), t = d.clone().addScaledVector(dir, 0.001).normalize();
        const inward = t.dot(dir) > 0 ? t : t.sub(dir.clone().multiplyScalar(2 * t.dot(dir))).normalize();
        a.copy(BITE_C).addScaledVector(inward, BITE_R); p.setXYZ(i, a.x, a.y, a.z);
      }
    }
    g.computeVertexNormals();
  }
  return g;
};

const buildChar = () => {
  const scene = new THREE.Scene(); lights(scene);
  const skin = gloss(SKIN.clone(), 0.45), hoodie = gloss("#ff8a3d", 0.42), navy = gloss("#27407a", 0.45), white = gloss("#ffffff", 0.35);
  const ink = gloss(INK, 0.25), pink = gloss("#ff7fa8", 0.32), ice = new THREE.MeshStandardMaterial({ color: "#d6eeff", roughness: 0.18, metalness: 0, flatShading: true });
  const char = new THREE.Group(); scene.add(char);
  const body = new THREE.Group(); char.add(body);
  body.add(mesh(new THREE.CapsuleGeometry(0.58, 0.5, 12, 40), hoodie, [0, 0, 0], [1, 1, 0.86]));
  // hoodie details: a pocket and two drawstrings, so the body is not one blank capsule
  body.add(mesh(new THREE.CapsuleGeometry(0.1, 0.42, 6, 16), gloss("#f0742a", 0.45), [0, -0.38, 0.46], [1, 1, 0.5])); (body.children[1] as THREE.Mesh).rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) body.add(mesh(new THREE.CapsuleGeometry(0.022, 0.2, 4, 8), white, [s * 0.1, 0.36, 0.5]));
  const legs = [-1, 1].map((s) => {
    const g = new THREE.Group(); g.position.set(s * 0.25, -0.62, 0);
    g.add(mesh(new THREE.CapsuleGeometry(0.15, 0.3, 6, 16), navy, [0, -0.3, 0]));
    g.add(mesh(new THREE.SphereGeometry(0.2, 24, 16), white, [0, -0.62, 0.08], [1.05, 0.72, 1.5]));
    body.add(g); return g;
  });
  const arms = [-1, 1].map((s) => {
    const upper = mesh(new THREE.CylinderGeometry(0.125, 0.125, 1, 20), hoodie), lower = mesh(new THREE.CylinderGeometry(0.125, 0.115, 1, 20), hoodie);
    const sh = mesh(new THREE.SphereGeometry(0.14, 20, 14), hoodie), elbow = mesh(new THREE.SphereGeometry(0.125, 20, 14), hoodie), cuff = mesh(new THREE.SphereGeometry(0.13, 20, 14), white);
    const hand = buildHand(skin);
    body.add(upper, lower, sh, elbow, cuff, hand.g);
    return { s, upper, lower, sh, elbow, cuff, hand };
  });
  // head
  const head = new THREE.Group(); head.position.set(0, 0.72, 0); body.add(head);
  head.add(mesh(new THREE.SphereGeometry(1, 64, 48), skin, [HEAD_C.x, HEAD_C.y, HEAD_C.z], [HEAD_R.x, HEAD_R.y, HEAD_R.z]));
  for (const s of [-1, 1]) head.add(mesh(new THREE.SphereGeometry(0.15, 20, 14), skin, [s * 0.84, 0.6, 0], [0.6, 1, 0.8]));
  const hairM = gloss("#4a2c1a", 0.5);
  const hair = mesh(new THREE.SphereGeometry(1, 48, 24, 0, TAU, 0, Math.PI * 0.4), hairM, [HEAD_C.x, HEAD_C.y, HEAD_C.z], [HEAD_R.x * 1.04, HEAD_R.y * 1.05, HEAD_R.z * 1.04]);
  hair.rotation.x = -0.42; head.add(hair);
  for (const [x, y, r] of [[-0.12, 1.44, 0.2], [0.14, 1.47, 0.17], [0.34, 1.36, 0.14]] as const) head.add(mesh(new THREE.SphereGeometry(r, 20, 14), hairM, [x, y, 0.38], [1, 0.8, 1]));
  const eyes = [-1, 1].map((s) => {
    const g = new THREE.Group(); g.position.copy(onHead(s * 0.31, 0.72, -0.02));
    const open = new THREE.Group();
    open.add(mesh(new THREE.SphereGeometry(0.1, 24, 16), ink, [0, 0, 0], [1, 1.25, 0.45]));
    open.add(mesh(new THREE.SphereGeometry(0.032, 12, 8), white, [-0.03, 0.05, 0.04]));
    // squeezed shut in pain: > and <, two short strokes meeting at the nose side
    const shut = new THREE.Group();
    for (const d of [-1, 1]) { const m = mesh(new THREE.CapsuleGeometry(0.026, 0.15, 4, 10), ink, [0, d * 0.045, 0.02]); m.rotation.z = Math.PI / 2 + d * s * 0.5; shut.add(m); }
    // happy closed: an arch
    const happy = mesh(new THREE.TorusGeometry(0.085, 0.026, 10, 24, Math.PI), ink, [0, -0.03, 0.02]);
    g.add(open, shut, happy); head.add(g);
    const brow = mesh(new THREE.CapsuleGeometry(0.028, 0.16, 4, 10), hairM); brow.position.copy(onHead(s * 0.31, 0.96, 0.0)); head.add(brow);
    return { s, g, open, shut, happy, brow, home: g.position.clone(), browHome: brow.position.clone() };
  });
  for (const s of [-1, 1]) { const c = mesh(new THREE.SphereGeometry(0.11, 20, 14), gloss("#ff9d8a", 0.6)); c.position.copy(onHead(s * 0.5, 0.47, -0.05)); c.scale.set(1, 0.7, 0.35); head.add(c); }
  const mouthAt = onHead(0, 0.4, 0);
  const smile = mesh(new THREE.TorusGeometry(0.15, 0.028, 10, 28, Math.PI), ink); smile.position.copy(mouthAt).add(v3(0, 0.07, 0.0)); smile.rotation.z = Math.PI;
  const open = new THREE.Group(); open.position.copy(mouthAt);
  open.add(mesh(new THREE.SphereGeometry(1, 28, 20), gloss("#7a1f2b", 0.5), [0, 0, 0], [0.2, 0.24, 0.06]));
  const tongue = mesh(new THREE.SphereGeometry(1, 20, 14), gloss("#ff6f8f", 0.4), [0, -0.12, 0.04], [0.12, 0.09, 0.05]); open.add(tongue);
  const grim = new THREE.Group(); grim.position.copy(mouthAt);
  grim.add(mesh(new THREE.CapsuleGeometry(0.1, 0.24, 8, 20), ink, [0, 0, 0], [1, 1, 0.3])); (grim.children[0] as THREE.Mesh).rotation.z = Math.PI / 2;
  grim.add(mesh(new THREE.CapsuleGeometry(0.068, 0.25, 8, 20), white, [0, 0, 0.022], [1, 1, 0.3])); (grim.children[1] as THREE.Mesh).rotation.z = Math.PI / 2;
  for (const x of [-0.12, -0.04, 0.04, 0.12]) grim.add(mesh(new THREE.BoxGeometry(0.014, 0.13, 0.02), ink, [x, 0, 0.044]));
  grim.add(mesh(new THREE.BoxGeometry(0.36, 0.014, 0.02), ink, [0, 0, 0.044]));
  const firm = mesh(new THREE.CapsuleGeometry(0.028, 0.16, 4, 12), ink); firm.position.copy(mouthAt); firm.rotation.z = Math.PI / 2;
  head.add(smile, open, grim, firm);
  // the freeze: icicles bursting out of the head, and a frost cap
  const spikes: { m: THREE.Mesh; i: number }[] = [];
  const spikeDefs: [number, number, number][] = [[-78, 0.62, 0.1], [-52, 0.8, -0.1], [-27, 0.66, 0.15], [0, 0.95, 0], [26, 0.7, -0.12], [51, 0.84, 0.12], [77, 0.6, -0.05]];
  spikeDefs.forEach(([deg, len, z], i) => {
    const a = (deg * Math.PI) / 180, dir = v3(Math.sin(a), Math.cos(a), z).normalize();
    const geo = new THREE.ConeGeometry(0.17, len, 6); geo.translate(0, len / 2, 0);
    const m = mesh(geo, ice); m.position.copy(HEAD_C).add(v3(dir.x * HEAD_R.x, dir.y * HEAD_R.y, dir.z * HEAD_R.z).multiplyScalar(0.9));
    m.quaternion.setFromUnitVectors(UP, dir); head.add(m); spikes.push({ m, i });
  });
  const frost = mesh(new THREE.SphereGeometry(1, 48, 20, 0, TAU, 0, Math.PI * 0.3), gloss("#eef8ff", 0.25), [HEAD_C.x, HEAD_C.y, HEAD_C.z]); head.add(frost);
  // melt drops (shot 5)
  const drops = [-0.5, 0.05, 0.55].map((x) => { const m = mesh(new THREE.SphereGeometry(0.07, 16, 12), gloss("#bfe4ff", 0.15), [x, 0, 0.5], [0.8, 1.3, 0.8]); char.add(m); return { m, x }; });
  // the cone, held in the right hand: its axis runs along the hand's x through the closed fingers
  const cone = new THREE.Group();
  const coneM = new THREE.MeshStandardMaterial({ map: waffle(), roughness: 0.6 });
  const cg = new THREE.ConeGeometry(0.19, 0.66, 32, 1, true); const cm = mesh(cg, coneM, [0, -0.02, 0]); cm.rotation.x = Math.PI; cone.add(cm);
  cone.add(mesh(new THREE.TorusGeometry(0.19, 0.03, 10, 32), gloss("#d99a4e", 0.55), [0, 0.31, 0])); (cone.children[1] as THREE.Mesh).rotation.x = Math.PI / 2;
  const skirt = mesh(new THREE.TorusGeometry(0.19, 0.075, 12, 32), pink, [0, 0.36, 0], [1, 1, 1.1]); skirt.rotation.x = Math.PI / 2; cone.add(skirt);
  const scoopFull = mesh(scoopGeo(false), pink, [0, 0.5, 0]), scoopBit = mesh(scoopGeo(true), pink, [0, 0.5, 0]);
  cone.add(scoopFull, scoopBit);
  cone.rotation.z = -Math.PI / 2; cone.position.set(0, 0.07, 0.15);
  arms[1].hand.g.add(cone);
  return { scene, cam: camera(), char, body, legs, arms, head, eyes, smile, open, tongue, grim, firm, spikes, frost, drops, skin, scoopFull, scoopBit };
};
type Char = ReturnType<typeof buildChar>;

const Q_CONE = basisQ(v3(0, 1, 0), v3(-1, 0, 0), v3(0, 0, 1));     // x up (the cone), fingers inward, palm to camera
const Q_SIDE = basisQ(v3(0, 0, 1), v3(0, -1, 0), v3(1, 0, 0));     // relaxed: fingers down, palm to the body
const Q_HEAD = basisQ(v3(0, 0, -1), v3(0, 1, 0), v3(1, 0, 0));     // clutching the head: fingers up, palm on the temple
const Q_THUMB = basisQ(v3(0, 1, 0), v3(0, 0, 1), v3(1, 0, 0));     // thumbs up: thumb (x) up, knuckles to camera

const putBone = (m: THREE.Mesh, a: V3, b: V3) => { const d = b.clone().sub(a), L = d.length(); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); m.scale.set(1, L, 1); };
const setArm = (A: Char["arms"][number], target: V3, q: THREE.Quaternion) => {
  const root = v3(A.s * 0.56, 0.36, 0), mid0 = root.clone().add(v3(0, -ARM_L, 0)), end0 = mid0.clone().add(v3(0, -ARM_L, 0));
  const s = solveTwoBone(root, mid0, end0, target, root.clone().add(v3(A.s * 1.2, -0.7, -0.5)));
  putBone(A.upper, root, s.mid); putBone(A.lower, s.mid, s.end);
  A.sh.position.copy(root); A.elbow.position.copy(s.mid); A.cuff.position.copy(s.end).addScaledVector(s.end.clone().sub(s.mid).normalize(), -0.04);
  A.hand.g.position.copy(s.end); A.hand.g.quaternion.copy(q);
};

/** Pose the whole character for global frame f. Nothing is read back from the scene. */
const poseChar = (c: Char, f: number) => {
  const frozen = f >= 312 && f < 1400;
  const iceT = key(f, [[312, 0], [334, 1], [1340, 1], [1400, 0]], ease.inOutSine);
  const shiver = key(f, [[296, 0], [312, 0], [334, 1], [420, 0.55], [1290, 0.55], [1340, 0.2], [1390, 0]]) * Math.sin(f * 2.4);
  const bob = 0.05 * Math.sin((f / BAR) * TAU);
  // body: lean into the bite; crouch then shoot up for the freeze; a breath before the trick; a bounce for the thumb
  const lean = key(f, [[76, 0], [100, -0.13], [120, 0.2], [150, 0.03], [176, 0], [1470, 0], [1500, 0.1]]);
  const sy = key(f, [[290, 1], [312, 0.84], [328, 1.13], [352, 1], [1262, 1], [1290, 1.07], [1310, 1], [1404, 1], [1422, 0.9], [1438, 1.07], [1462, 1]]) + (frozen ? 0 : 0.012 * Math.sin((f / BAR) * TAU + 1));
  const rise = key(f, [[300, 0], [312, -0.08], [330, 0.22], [356, 0.13], [1340, 0.13], [1400, 0]]);
  c.char.position.set(shiver * 0.016, -0.82 + bob * (frozen ? 0.3 : 1) + rise, 0);
  c.body.rotation.set(lean, 0, shiver * 0.012);
  c.body.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
  // legs dangle; stiff and splayed when frozen
  const splay = key(f, [[312, 0], [330, 1], [1340, 1], [1400, 0]]);
  c.legs.forEach((g, i) => { const s = i ? 1 : -1; g.rotation.set(lerp(0.16 * Math.sin((f / BAR) * TAU + i * 2.2), -0.25, splay), 0, s * lerp(0.04, 0.5, splay)); });
  // head: back for the wind-up, down onto the scoop, thrown back at the freeze
  const nod = key(f, [[76, 0], [100, -0.18], [120, 0.3], [150, 0.02], [176, 0], [296, 0], [312, 0.14], [330, -0.2], [360, -0.12], [1290, -0.12], [1340, 0], [1470, 0], [1500, 0.18]]);
  const chew = f > 126 && f < 262 ? Math.sin(((f - 126) / 20) * TAU) : 0;
  c.head.rotation.set(nod + chew * 0.02, key(f, [[0, 0.12], [70, 0.12], [100, 0.04], [176, 0], [1470, 0], [1500, 0.08]]), shiver * 0.02 + key(f, [[1404, 0], [1440, -0.1], [1470, -0.06]]));
  (c.skin as THREE.MeshStandardMaterial).color.copy(SKIN).lerp(ICE_SKIN, iceT * 0.85);
  // eyes and brows
  const eyeState = f < 126 ? "open" : f < 264 ? "happy" : f < 312 ? "wide" : f < 1300 ? "shut" : f < 1460 ? "open" : "happy";
  const wide = eyeState === "wide" ? 1 + 0.4 * ease.outBack(seg(f, 264, 276)) : 1;
  const blink = (f > 40 && f < 46) || (f > 1420 && f < 1426) ? 0.15 : 1;
  c.eyes.forEach((e) => {
    e.open.visible = eyeState === "open" || eyeState === "wide"; e.shut.visible = eyeState === "shut"; e.happy.visible = eyeState === "happy";
    e.open.scale.set(wide, wide * blink, 1);
    e.g.position.copy(e.home).add(v3(f < 126 ? 0.03 : 0, 0, 0));
    const browUp = key(f, [[76, 0], [100, 0.06], [126, 0], [264, 0], [276, 0.12], [312, 0.12], [330, -0.05], [1300, -0.05], [1320, 0.02], [1440, 0.05]]);
    const browTilt = key(f, [[312, 0], [330, 0.45], [1300, 0.45], [1320, -0.25], [1400, -0.25], [1440, 0]]);
    e.brow.position.copy(e.browHome).add(v3(0, browUp, 0)); e.brow.rotation.z = Math.PI / 2 + e.s * browTilt * -1;
  });
  // mouth
  const mouth = f < 80 ? "smile" : f < 120 ? "open" : f < 262 ? "chew" : f < 312 ? "o" : f < 1296 ? "grim" : f < 1404 ? "firm" : f < 1502 ? "smile" : f < 1538 ? "lick" : "smile";
  c.smile.visible = mouth === "smile"; c.grim.visible = mouth === "grim"; c.firm.visible = mouth === "firm" || mouth === "chew";
  c.open.visible = mouth === "open" || mouth === "o" || mouth === "lick";
  const gape = mouth === "open" ? key(f, [[80, 0.2], [100, 1.25], [112, 1.25], [120, 0.25]]) : mouth === "o" ? 0.45 : 0.5;
  c.open.scale.set(mouth === "o" ? 0.5 : mouth === "lick" ? 0.7 : 1, gape, 1);
  c.tongue.position.set(0, mouth === "lick" ? -0.3 : -0.12, mouth === "lick" ? 0.06 : 0.04);
  c.tongue.scale.set(0.12, mouth === "lick" ? 0.2 / gape * 0.5 : 0.09, 0.05);
  c.firm.scale.set(1, mouth === "chew" ? 0.75 + 0.25 * chew : 1.1, 1);
  c.grim.scale.setScalar(mouth === "grim" ? 0.6 + 0.4 * ease.outBack(seg(f, 312, 330)) : 1);
  // the freeze: icicles pop one after another, and melt away in shot 5
  c.spikes.forEach(({ m, i }) => {
    const up = ease.outBack(seg(f, 314 + i * 2, 330 + i * 2)), down = 1 - ease.inBack(seg(f, 1340 + i * 5, 1376 + i * 5));
    const s = Math.max(0, up * down); m.visible = s > 0.001; m.scale.set(s, s * (1 + 0.04 * Math.sin(f * 0.9 + i)), s);
  });
  const fs = iceT; c.frost.visible = fs > 0.01; c.frost.scale.set(HEAD_R.x * (1 + 0.035 * fs), HEAD_R.y * (1 + 0.04 * fs), HEAD_R.z * (1 + 0.035 * fs));
  c.drops.forEach(({ m, x }, i) => { const t = seg(f, 1350 + i * 12, 1392 + i * 12); m.visible = t > 0 && t < 1; m.position.set(x, 2.0 - 3.4 * t * t, 0.5); });
  // arms. Right hand holds the cone the whole film; left hand is the actor.
  const R = key3(f, [[0, 0.5, -0.02, 0.74], [76, 0.5, -0.02, 0.74], [100, 0.62, -0.14, 0.7], [120, 0.14, 0.52, 0.9], [128, 0.14, 0.52, 0.9], [160, 0.62, 0.04, 0.72],
    [292, 0.62, 0.04, 0.72], [312, 0.42, -0.12, 0.72], [330, 1.2, 0.5, 0.35], [1290, 1.2, 0.5, 0.35], [1336, 0.62, 0.04, 0.72], [1470, 0.62, 0.04, 0.72], [1502, 0.22, 0.46, 0.9]]);
  R.x += 0.05 * spring(f, 330, FPS, 3, 0.2); R.y += 0.02 * Math.sin((f / BAR) * TAU + 0.6) + shiver * 0.01;
  const coneTilt = new THREE.Quaternion().setFromAxisAngle(v3(0, 0, 1), key(f, [[100, 0], [120, 0.3], [160, 0], [312, 0], [330, -0.35], [1290, -0.35], [1336, 0], [1470, 0], [1502, 0.3]]));
  setArm(c.arms[1], R, coneTilt.multiply(Q_CONE)); poseHand(c.arms[1].hand, 0.95, 0.75, 1);
  const L = key3(f, [[0, -0.74, -0.3, 0.15], [76, -0.74, -0.3, 0.15], [100, -0.82, -0.22, -0.1], [120, -0.9, -0.05, 0.2], [170, -0.74, -0.3, 0.15],
    [292, -0.74, -0.3, 0.15], [312, -0.62, -0.46, 0.3], [330, -0.84, 1.16, 0.36], [1262, -0.84, 1.16, 0.36], [1296, -0.74, -0.3, 0.15], [1404, -0.74, -0.3, 0.15], [1422, -0.66, -0.46, 0.3], [1440, -1.02, 0.42, 0.45]]);
  L.x += shiver * 0.012; L.y += 0.02 * Math.sin((f / BAR) * TAU + 2) + 0.05 * spring(f, 1440, FPS, 3, 0.22);
  const toHead = key(f, [[312, 0], [330, 1], [1262, 1], [1296, 0]]), toThumb = key(f, [[1410, 0], [1440, 1]]);
  setArm(c.arms[0], L, Q_SIDE.clone().slerp(Q_HEAD, toHead).slerp(Q_THUMB, toThumb));
  poseHand(c.arms[0].hand, lerp(lerp(0.45, 0.4, toHead), 1, toThumb), toThumb);
  const bitten = f >= CUE.bite; c.scoopFull.visible = !bitten; c.scoopBit.visible = bitten;
};

// ------------------------------------------------------------------ the cutaway (shots 3, 4)
/** a tube whose radius is a function of position along it and of the frame: rebuilt from the frame, never from itself */
const makeTube = (pts: [number, number][], z: number, mat: THREE.Material, N = 90, M = 12) => {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => v3(x, y, z)));
  const cs: V3[] = [], ns: V3[] = [];
  for (let i = 0; i <= N; i++) { const t = curve.getTangentAt(i / N); cs.push(curve.getPointAt(i / N)); ns.push(v3(-t.y, t.x, 0).normalize()); }
  const pos = new Float32Array((N + 1) * M * 3), nor = new Float32Array((N + 1) * M * 3), idx: number[] = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a = i * M + j, b = i * M + ((j + 1) % M), c = a + M, d = b + M; idx.push(a, c, b, b, c, d); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); geo.setIndex(idx);
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false;
  const caps = [mesh(new THREE.SphereGeometry(1, 16, 12), mat), mesh(new THREE.SphereGeometry(1, 16, 12), mat)];
  const set = (radius: (u: number) => number) => {
    for (let i = 0; i <= N; i++) { const r = radius(i / N); for (let j = 0; j < M; j++) {
      const a = (j / M) * TAU, cx = Math.cos(a), sz = Math.sin(a), k = (i * M + j) * 3, n = ns[i];
      nor[k] = n.x * cx; nor[k + 1] = n.y * cx; nor[k + 2] = sz;
      pos[k] = cs[i].x + n.x * cx * r; pos[k + 1] = cs[i].y + n.y * cx * r; pos[k + 2] = cs[i].z + sz * r;
    } }
    geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true;
    caps[0].position.copy(cs[0]); caps[0].scale.setScalar(radius(0)); caps[1].position.copy(cs[N]); caps[1].scale.setScalar(radius(1));
  };
  return { m, caps, set, at: (u: number) => curve.getPointAt(clamp01(u)) };
};

const buildCut = (env: Env) => {
  const scene = new THREE.Scene(); lights(scene);
  const root = new THREE.Group(); root.position.set(ROOT_X, -0.4, 0); root.scale.setScalar(0.88); scene.add(root);
  // the head in profile, facing right, sliced flat toward the camera
  const C = v3(-0.2, 0.5, 0), RR = 1.5, pts: THREE.Vector2[] = [];
  for (let a = 205; a >= 22; a -= 8) pts.push(new THREE.Vector2(C.x + RR * Math.cos((a * Math.PI) / 180), C.y + RR * Math.sin((a * Math.PI) / 180)));
  for (const [x, y] of [[1.36, 0.6], [1.4, 0.25], [1.46, 0.05], [1.75, -0.3], [1.42, -0.42], [1.5, -0.6], [1.3, -0.73], [1.46, -0.88], [1.3, -1.1], [1.25, -1.38], [0.7, -1.64], [0.36, -1.8], [0.32, -2.6], [-0.92, -2.6], [-0.96, -1.3], [-1.4, -0.62]]) pts.push(new THREE.Vector2(x, y));
  const shape = new THREE.Shape(); shape.moveTo(pts[0].x, pts[0].y); shape.splineThru([...pts.slice(1), pts[0]]);
  const flesh = gloss("#f29c8f", 0.55), skin = gloss(SKIN.clone(), 0.45);
  const slabG = new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 5, curveSegments: 24 });
  slabG.translate(0, 0, -0.57);
  root.add(new THREE.Mesh(slabG, [flesh, skin]));
  // hair: a crescent over the top and back
  const hs = new THREE.Shape(), hp: [number, number][] = [];
  for (let a = 38; a <= 212; a += 6) hp.push([C.x + (RR + 0.12) * Math.cos((a * Math.PI) / 180), C.y + (RR + 0.12) * Math.sin((a * Math.PI) / 180)]);
  for (let a = 205; a >= 45; a -= 6) hp.push([C.x + 0.12 + (RR - 0.16) * Math.cos((a * Math.PI) / 180), C.y - 0.14 + (RR - 0.1) * Math.sin((a * Math.PI) / 180)]);
  hs.moveTo(hp[0][0], hp[0][1]); hp.slice(1).forEach(([x, y]) => hs.lineTo(x, y)); hs.closePath();
  const hairG = new THREE.ExtrudeGeometry(hs, { depth: 0.56, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 4 }); hairG.translate(0, 0, -0.56);
  root.add(new THREE.Mesh(hairG, gloss("#4a2c1a", 0.5)));
  // the eye, in profile
  const eye = mesh(new THREE.SphereGeometry(0.1, 20, 14), gloss(INK, 0.25), [1.24, 0.2, 0.02], [0.8, 1.2, 0.4]); root.add(eye);
  const brow = mesh(new THREE.CapsuleGeometry(0.03, 0.2, 4, 10), gloss("#4a2c1a", 0.5), [1.24, 0.42, 0.03]); brow.rotation.z = Math.PI / 2; root.add(brow);
  // skull cavity, mouth cavity
  root.add(mesh(new THREE.CircleGeometry(1, 64), gloss("#d97f7c", 0.7), [-0.28, 0.62, 0.012], [1.16, 1.0, 1]));
  root.add(mesh(new THREE.CircleGeometry(1, 48), gloss("#8c2f3f", 0.6), [0.72, -0.76, 0.012], [0.6, 0.3, 1]));
  const palM = gloss("#f08a9a", 0.4);
  const palate = makeTube([[0.16, -0.66], [0.42, -0.5], [0.76, -0.45], [1.08, -0.5], [1.3, -0.62]], 0.06, palM, 40, 12); root.add(palate.m, ...palate.caps);
  const tongue = mesh(new THREE.SphereGeometry(1, 28, 20), gloss("#e8566f", 0.4), [0.7, -0.95, 0.08], [0.5, 0.15, 0.16]); root.add(tongue);
  const chunk = mesh(new THREE.SphereGeometry(0.16, 28, 20), gloss("#ff7fa8", 0.32), [0.78, -0.74, 0.14]); root.add(chunk);
  const crystals = [0.42, 0.6, 0.78, 0.96, 1.12].map((x, i) => { const m = mesh(new THREE.OctahedronGeometry(0.07), new THREE.MeshStandardMaterial({ color: "#f2fbff", roughness: 0.15, flatShading: true }), [x, -0.42 + (i % 2) * 0.03 - Math.abs(x - 0.76) * 0.18, 0.16]); root.add(m); return m; });
  const rings = [0, 1, 2, 3, 4].map(() => { const m = mesh(new THREE.TorusGeometry(1, 0.035, 8, 64), new THREE.MeshBasicMaterial({ color: "#d9f1ff", transparent: true, depthWrite: false }), [0.78, -0.45, 0.2]); root.add(m); return m; });
  // two blood vessels climbing from the palate up the front of the head, past the brain
  const vesM = gloss("#e23b3b", 0.3);
  const ves = [makeTube([[0.86, -0.36], [1.04, 0.0], [1.06, 0.6], [0.88, 1.2], [0.42, 1.62], [-0.2, 1.76]], 0.12, vesM), makeTube([[0.62, -0.36], [0.84, -0.02], [0.86, 0.5], [0.72, 0.95]], 0.12, vesM, 60)];
  ves.forEach((t) => root.add(t.m, ...t.caps));
  // the nerve: from the palate back and up into the brain
  const nerveM = gloss("#ffd23f", 0.35);
  const nerve = makeTube([[0.4, -0.42], [0.08, -0.3], [-0.36, -0.36], [-0.72, -0.24], [-0.82, 0.1]], 0.1, nerveM, 60, 10); root.add(nerve.m, ...nerve.caps);
  const pulses = [0, 1, 2, 3].map(() => { const m = mesh(new THREE.SphereGeometry(0.085, 16, 12), new THREE.MeshStandardMaterial({ color: "#fff3a8", emissive: "#ffe14a", emissiveIntensity: 0.9, roughness: 0.3 })); root.add(m); return m; });
  // the brain: a lumpy bean with a face
  const brainM = gloss("#f7a8c0", 0.38), groove = gloss("#e0789c", 0.5);
  const brain = new THREE.Group(); brain.position.set(BRAIN_X, 0.62, 0.05); root.add(brain);
  brain.add(mesh(new THREE.SphereGeometry(1, 48, 32), brainM, [0, 0, 0], [0.92, 0.72, 0.3]));
  for (let i = 0; i < 9; i++) { const a = ((-25 + i * 29) * Math.PI) / 180; brain.add(mesh(new THREE.SphereGeometry(0.3, 24, 16), brainM, [Math.cos(a) * 0.72, Math.sin(a) * 0.52, 0], [1, 1, 0.75])); }
  for (const [x, y, r, rot] of [[-0.42, 0.34, 0.22, 0.6], [0.1, 0.5, 0.2, 0.2], [-0.62, -0.12, 0.18, 1.9], [0.56, 0.36, 0.16, -0.5]] as const) { const m = mesh(new THREE.TorusGeometry(r, 0.028, 8, 20, Math.PI * 0.9), groove, [x, y, 0.27]); m.rotation.z = rot; brain.add(m); }
  const inkM = gloss(INK, 0.25), whiteM = gloss("#ffffff", 0.3);
  const bEyes = [0.1, 0.52].map((x) => { const g = new THREE.Group(); g.position.set(x, -0.02, 0.3); g.add(mesh(new THREE.SphereGeometry(0.075, 20, 14), inkM, [0, 0, 0], [1, 1.2, 0.5])); g.add(mesh(new THREE.SphereGeometry(0.025, 10, 8), whiteM, [-0.02, 0.035, 0.035])); brain.add(g); return g; });
  const bSmile = mesh(new THREE.TorusGeometry(0.09, 0.024, 8, 20, Math.PI), inkM, [0.31, -0.2, 0.3]); bSmile.rotation.z = Math.PI;
  const bFrown = mesh(new THREE.TorusGeometry(0.08, 0.024, 8, 20, Math.PI), inkM, [0.31, -0.3, 0.3]);
  const bOpen = mesh(new THREE.SphereGeometry(1, 20, 14), gloss("#7a1f2b", 0.5), [0.31, -0.27, 0.29], [0.1, 0.13, 0.05]);
  brain.add(bSmile, bFrown, bOpen);
  // the pain: a jagged burst outside the forehead, and a hot patch on the skin
  const star = new THREE.Shape();
  for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU, r = i % 2 ? 0.26 : 0.52 + (i % 4 === 0 ? 0.08 : 0); if (i) star.lineTo(Math.cos(a) * r, Math.sin(a) * r); else star.moveTo(r, 0); }
  const burst = mesh(new THREE.ExtrudeGeometry(star, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 }), gloss("#ff3b30", 0.35), [1.52, 1.02, -0.2]); root.add(burst);
  const burstIn = mesh(new THREE.CircleGeometry(0.2, 9), gloss("#ffd23f", 0.4), [1.52, 1.02, -0.07]); root.add(burstIn);
  const hot = mesh(new THREE.CircleGeometry(0.34, 40), new THREE.MeshBasicMaterial({ color: "#ff5a4a", transparent: true, depthWrite: false }), [1.18, 0.82, 0.02]); root.add(hot);
  const labels = {
    paladar: textPlane(env, "paladar", { size: 0.24, color: "#7a2740" }),
    vasos: textPlane(env, "vasos", { size: 0.24, color: "#ffffff" }),
    nervio: textPlane(env, "nervio", { size: 0.24, color: "#7a5a00" }),
  };
  labels.paladar.position.set(0.72, -1.36, 0.05); labels.vasos.position.set(1.42, 1.9, 0); labels.nervio.position.set(-0.52, -0.72, 0.05);
  root.add(labels.paladar, labels.vasos, labels.nervio);
  return { scene, cam: camera(), root, eye, brow, palate, palM, tongue, chunk, crystals, rings, ves, vesM, nerve, nerveM, pulses, brain, brainM, bEyes, bSmile, bFrown, bOpen, burst, burstIn, hot, labels };
};
type Cut = ReturnType<typeof buildCut>;
const ROOT_X = 0.0, BRAIN_X = -0.36, BRAIN_S = 0.86;
const pop = (f: number, at: number, len = 16) => ease.outBack(seg(f, at, at + len));
const C_PAL = new THREE.Color("#f08a9a"), C_ICE = new THREE.Color("#bfe6ff"), C_VES = new THREE.Color("#e23b3b"), C_TIGHT = new THREE.Color("#8a4a9a"), C_HOT = new THREE.Color("#ff2a1f"), C_BRAIN = new THREE.Color("#f7a8c0"), C_BRAIN_COLD = new THREE.Color("#c9c0ee"), C_BRAIN_HOT = new THREE.Color("#ff8f9f");

const poseCut = (c: Cut, f: number) => {
  // the bite of ice cream: the tongue dips, then presses it onto the palate (lands on CUE.press)
  const cy = key(f, [[480, -0.74], [536, -0.74], [554, -0.82], [570, -0.6], [584, -0.62]]), sq = 1 - 0.3 * seg(f, 562, 570) + 0.08 * spring(f, 570, FPS, 4, 0.3);
  const melt = key(f, [[700, 1], [1200, 0.72]]);
  c.chunk.position.set(0.78, cy, 0.14); c.chunk.scale.set((1 + (1 - sq) * 0.6) * melt, sq * melt, melt);
  c.tongue.position.set(0.7, cy - 0.2 - 0.02 * melt, 0.08);
  const cold = key(f, [[570, 0], [620, 1]], ease.outCubic);
  c.palM.color.copy(C_PAL).lerp(C_ICE, cold); c.palate.set(() => 0.055);
  c.crystals.forEach((m, i) => { const s = pop(f, 584 + i * 9, 14); m.visible = s > 0; m.scale.setScalar(s * (1 + 0.12 * Math.sin(f * 0.2 + i))); m.rotation.set(0.5, f * 0.02 + i, 0.3); });
  // cold spreading: rings from the contact point, one per beat while the cold is arriving
  c.rings.forEach((m, i) => { const t = seg(f, 570 + i * 30, 570 + i * 30 + 54); m.visible = t > 0 && t < 1; m.scale.set(0.12 + t * 0.95, 0.12 + t * 0.95, 1); (m.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - t) ** 1.5; });
  // the vessels: a small swell (wind-up), squeezed thin on CUE.squeeze; then thinner still, and burst wide on CUE.burst
  const throb = f > 930 ? 0.13 * Math.sin(((f - 930) / 30) * TAU) * Math.exp(-((f - 930) % 30) / 40) : 0;
  const Rf = key(f, [[640, 1], [658, 1.18], [690, 0.4], [888, 0.4], [908, 0.3], [930, 2.05], [950, 1.75]]) + throb + (f > 690 && f < 908 ? 0.02 * Math.sin(f * 1.7) : 0);
  const tight = clamp01((1 - Rf) / 0.6), hot = clamp01((Rf - 1) / 0.8);
  c.vesM.color.copy(C_VES).lerp(C_TIGHT, tight).lerp(C_HOT, hot);
  // a wave of width travels up the vessel as it opens, so the change reads as a rush, not a resize
  const wave = (u: number) => (f >= 908 && f < 960 ? 0.35 * Math.exp(-(((u - seg(f, 912, 952)) / 0.12) ** 2)) : 0);
  c.ves[0].set((u) => 0.075 * (Rf + wave(u)) * (1 - 0.25 * u)); c.ves[1].set((u) => 0.06 * (Rf + wave(u)) * (1 - 0.3 * u));
  // the nerve wakes up: pulses run to the brain, one per beat, the first arriving on CUE.alarm
  const nerveOn = seg(f, 936, 952);
  c.nerveM.color.set("#e6c04a").lerp(new THREE.Color("#ffd400"), nerveOn); c.nerve.set((u) => 0.034 + 0.012 * nerveOn + 0.02 * nerveOn * Math.exp(-(((u - (((f - 950) / 40) % 0.75)) / 0.08) ** 2)));
  c.pulses.forEach((m, i) => { const k = Math.floor((f - 950 - i * 30) / 120), start = 950 + i * 30 + Math.max(0, k) * 120, t = seg(f, start, start + 40); m.visible = f >= 950 + i * 30 && t < 1; m.position.copy(c.nerve.at(t)).add(v3(0, 0, 0.06)); m.scale.setScalar(0.8 + 0.5 * Math.sin(t * Math.PI)); });
  // the brain's face tells the story with the sound off
  const cower = key(f, [[660, 0], [692, 1], [930, 1], [960, 0]]), alarm = f >= CUE.alarm ? 1 : 0;
  const jump = alarm ? spring(f, CUE.alarm, FPS, 3.2, 0.2) : 0, beat = alarm ? Math.exp(-((f - 990) % 30) / 9) : 0;
  const bs = 1 - 0.08 * cower + 0.05 * beat;
  c.brain.scale.set(BRAIN_S * bs * (1 + 0.1 * jump), BRAIN_S * bs * (1 - 0.14 * jump - 0.05 * cower), 1);
  c.brain.position.set(BRAIN_X + (cower ? 0.012 * Math.sin(f * 2.3) * cower : 0) + (alarm ? 0.015 * Math.sin(f * 2.9) : 0), 0.62 - 0.03 * cower + 0.09 * (alarm ? Math.abs(jump) : 0), 0.05);
  c.brainM.color.copy(C_BRAIN).lerp(C_BRAIN_COLD, cower * 0.7).lerp(C_BRAIN_HOT, alarm * (0.5 + 0.4 * beat));
  const look = key(f, [[540, 0], [575, 1], [640, 1], [662, 0.4], [930, 0.6], [990, 0]]);
  c.bEyes.forEach((g, i) => { const wide = alarm ? 1.45 : 1 + 0.25 * pop(f, 576, 12) * (1 - seg(f, 640, 660)); g.position.set([0.1, 0.52][i] + 0.035 * look, -0.02 - 0.05 * look, 0.3); g.scale.set(wide, wide * (cower > 0.5 && !alarm ? 0.55 : 1), 1); });
  c.bSmile.visible = f < 576; c.bFrown.visible = f >= 576 && !alarm; c.bOpen.visible = !!alarm;
  c.bOpen.scale.set(0.1, 0.13 * (1 + 0.25 * beat), 0.05);
  // the pain shows up in the forehead: far from the palate, which is the whole surprise
  const bp = alarm ? ease.outBack(seg(f, 990, 1006)) * (1 + 0.14 * beat) : 0;
  c.burst.visible = c.burstIn.visible = bp > 0; c.burst.scale.set(bp, bp, 1); c.burst.rotation.z = 0.12 * Math.sin(f * 0.11) + (alarm ? 0.3 * spring(f, 990, FPS, 3, 0.25) : 0);
  c.burstIn.scale.set(bp, bp, 1); c.burstIn.rotation.z = -c.burst.rotation.z;
  (c.hot.material as THREE.MeshBasicMaterial).opacity = alarm ? 0.35 + 0.3 * beat : 0; c.hot.visible = !!alarm;
  c.eye.scale.set(0.8, alarm ? 0.3 : 1.2 - 0.25 * cower, 0.4); c.brow.rotation.z = Math.PI / 2 + (alarm ? -0.5 : -0.15 * cower); c.brow.position.y = 0.42 - (alarm ? 0.1 : 0.03 * cower);
  c.root.position.set(ROOT_X + (alarm ? 0.012 * Math.sin(f * 2.6) * (0.4 + beat) : 0), -0.4, 0);
  // labels arrive with the thing they name
  const lab = (m: THREE.Mesh, at: number, until = 99999) => { const s = pop(f, at) * (1 - seg(f, until, until + 10)); m.visible = s > 0.01; m.scale.setScalar(Math.max(0.001, s)); };
  lab(c.labels.paladar, 500); lab(c.labels.vasos, 640); lab(c.labels.nervio, 944);
};

// ------------------------------------------------------------------ the frame: backdrop, set, caption, vignette
const backdrop = (ctx: Ctx, env: Env) => {
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#3d8df0"); g.addColorStop(0.55, "#3381e8"); g.addColorStop(1, "#1f5fc4");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
};
const SAFE_L = 147, SAFE_R = 934, CAP_Y = 318, CAP_EM = 58;
const caption = (ctx: Ctx, env: Env, f: number) => {
  const cap = CAPTIONS.find((c) => f >= c.from && f < c.to); if (!cap) return;
  const font = defaultFont(), lines = cap.text.split("\n");
  for (const ch of cap.text) if (ch !== "\n" && ch !== " " && font.glyphIndex(ch.codePointAt(0)!) === 0) throw new Error(`caption: the font has no glyph for '${ch}'`);
  let em = CAP_EM; const widest = Math.max(...lines.map((l) => layoutText(font, l).width / font.unitsPerEm));
  if (widest * em > SAFE_R - SAFE_L - 30) em = (SAFE_R - SAFE_L - 30) / widest;
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalCompositeOperation = "source-over";
  lines.forEach((line, i) => {
    const at = cap.from + 6 + i * 8, t = ease.outCubic(seg(f, at, at + 14)), out = 1 - seg(f, cap.to - 8, cap.to - 1);
    if (t <= 0) return;
    const lay = layoutText(font, line), x = (SAFE_L + SAFE_R) / 2, y = CAP_Y + i * em * 1.28 + (1 - t) * 26;
    ctx.globalAlpha = t * out * 0.55; ctx.fillStyle = "#0d2f7a"; fillText2d(ctx as unknown as CanvasRenderingContext2D, font, lay, em, x, y + em * 0.42 + 5);
    ctx.globalAlpha = t * out; ctx.fillStyle = "#ffffff"; fillText2d(ctx as unknown as CanvasRenderingContext2D, font, lay, em, x, y + em * 0.42);
  });
  ctx.restore();
};
const finish = (ctx: Ctx, env: Env, f: number) => { caption(ctx, env, f); vignette(ctx, env, 0.2, "#0a2a6e"); };
const LOOK = { clear: null, toneMapping: THREE.ACESFilmicToneMapping, exposure: 1.12 } as const;

const charShot = (start: number) => (ctx: Ctx, local: number, env: Env) => {
  const f = start + local, c = memo(env, "helado:char", buildChar);
  poseChar(c, f); backdrop(ctx, env); draw3d(ctx, env, c.scene, c.cam, LOOK); finish(ctx, env, f);
};
const cutShot = (start: number) => (ctx: Ctx, local: number, env: Env) => {
  const f = start + local, c = memo(env, "helado:cut", buildCut);
  poseCut(c, f); backdrop(ctx, env); draw3d(ctx, env, c.scene, c.cam, LOOK); finish(ctx, env, f);
};

export const helado: Film = {
  meta: { title: "Cerebro congelado", W, H, fps: FPS, bpm: BPM, durationFrames: CUT.end, kind: "explainer", captions: CAPTIONS.map((c) => ({ ...c, text: c.text.replace("\n", " ") })), poster: 345,
    sync: Object.entries(CUE).map(([label, frame]) => ({ frame, label })),
    checks: { none: { "3d": "one floating character holding one cone in a closed fist (checked by eye on 2x crops), and a flat cutaway diagram: no walking, no hand-offs, no set to pass through" } } },
  assets: { images: {} },
  shots: [
    { id: "bite", start: CUT.bite, end: CUT.freeze, draw: charShot(CUT.bite) },
    { id: "freeze", start: CUT.freeze, end: CUT.palate, draw: charShot(CUT.freeze) },
    { id: "palate", start: CUT.palate, end: CUT.nerve, draw: cutShot(CUT.palate) },
    { id: "nerve", start: CUT.nerve, end: CUT.trick, draw: cutShot(CUT.nerve) },
    { id: "trick", start: CUT.trick, end: CUT.end, draw: charShot(CUT.trick) },
  ],
};
