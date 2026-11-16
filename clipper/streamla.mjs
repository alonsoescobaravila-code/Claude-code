#!/usr/bin/env node
// STREAM LA CLIPPER. Turns an episode of Streamhouse LA (CWETV) into 9:16 clips that follow the
// campaign rules: an on-screen title, burned-in subtitles, an on-screen CWETV call to action, no
// watermark, and a caption file per clip with a rotating CTA, the right cast tag and the four
// campaign hashtags. It never posts anything: you upload and submit the links yourself.
//
//   node streamla.mjs transcribe episode.mp4            word timestamps -> episode.mp4.words.json
//   node streamla.mjs find episode.mp4 [--top 8]         the loudest, busiest moments, with what is said
//   node streamla.mjs cut episode.mp4 plan.json          clips + captions into out/
//
// plan.json: [{ "start": "12:31", "end": "13:04", "title": "India Love CRASHED OUT After...",
//               "cast": ["India Love", "Vegas Ky"], "format": "episode" | "meme" }, ...]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CAST = { "Morgan Westbrooks": "@morgandwestbrooks", "India Love": "@indialove", Casanova: "@one_cnova", "DJ SkyHigh Baby": "@djskyhighbaby", Michaela: "@sheismichaela", Phee: "@romanaceanddancepole",
  "Island Boi": "@islandboij242", "Castro \"CJ\" Dean": "@cjkilla", CJ: "@cjkilla", Lyricc: "@assistanttothestarz", "Vegas Ky": "@vegas_ky", Jojo: "@flyestmanonearth", "D Mac": "@mrmacster9", Chica: "@chicachicaduhhh_",
  "K Shiday": "@kshiday", Noel: "@bignoel_official", "Diamond The Body": "@DiamondTheBodyy", "Tru Carr": "@trucarr_", EKE: "@eke.thename", Speedy: "@speedy1808", Conrad: "@boutabag_rad" };
const CTAS = ["Watch Streamhouse LA on CWETV", "Download CWETV to watch the full episode", "Watch the full episode on CWETV", "New episode out now on chickenwrapent.com"];
const HASHTAGS = "#streamhouselacwe #streamhousela #cwetv #chickenwrapentertainment";
const SHOW = { tiktok: "@streamhousela", instagram: "@streamhousela" };

const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf(`--${n}`); return i < 0 ? d : args[i + 1]; };
const run = (cmd, a) => { const r = spawnSync(cmd, a, { encoding: "utf8", maxBuffer: 1 << 28 }); if (r.status) throw new Error(`${cmd} failed: ${(r.stderr || "").slice(-600)}`); return r; };
const secs = (t) => (typeof t === "number" ? t : String(t).split(":").reduce((a, b) => a * 60 + Number(b), 0));
const hms = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const words = (video) => { const f = `${video}.words.json`; if (!existsSync(f)) throw new Error(`no transcript yet: run  node streamla.mjs transcribe ${video}`); return JSON.parse(readFileSync(f, "utf8")); };

// ---- find: score every 5 s by loudness, speech speed and shouting/questions, then grow each peak to a clip
const find = (video) => {
  const top = Number(opt("top", 8)), w = words(video);
  const r = run("ffmpeg", ["-hide_banner", "-i", video, "-vn", "-af", "aresample=8000,asetnsamples=8000,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level", "-f", "null", "-"]);
  const db = [...r.stderr.matchAll(/RMS_level=(-?[\d.]+|-inf)/g)].map((m) => (m[1] === "-inf" ? -90 : Number(m[1])));
  const n = Math.ceil(db.length / 5), score = new Array(n).fill(0), loud = new Array(n).fill(-90), talk = new Array(n).fill(0), hot = new Array(n).fill(0);
  for (let i = 0; i < n; i++) loud[i] = Math.max(...db.slice(i * 5, i * 5 + 5));
  for (const x of w) { const i = Math.floor(x.s / 5); if (i < n) { talk[i]++; if (/[!?]/.test(x.w)) hot[i]++; if (/^(what|nah|bro|stop|why|crazy|lying|lie|fight|ex|love|kiss|shut|hell|damn|deadass|bitch|f\w*k)/i.test(x.w)) hot[i] += 0.5; } }
  const z = (a) => { const m = a.reduce((s, v) => s + v, 0) / a.length, sd = Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length) || 1; return a.map((v) => (v - m) / sd); };
  const L = z(loud), T = z(talk), Hh = z(hot); for (let i = 0; i < n; i++) score[i] = 1.2 * L[i] + 0.8 * T[i] + 1.0 * Hh[i];
  const picks = [];
  for (const i of [...score.keys()].sort((a, b) => score[b] - score[a])) {
    if (picks.length >= top) break; const t = i * 5; if (picks.some((p) => Math.abs(p.peak - t) < 60)) continue;
    // start ~15 s before the peak, end ~15 s after, snapped to the gaps between sentences
    const near = (target, dir) => { const ends = w.filter((x) => /[.?!]$/.test(x.w)).map((x) => x.e); const c = ends.filter((e) => (dir < 0 ? e <= target : e >= target)).sort((a, b) => (dir < 0 ? b - a : a - b))[0]; return c ?? target; };
    const start = Math.max(0, near(t - 15, -1)), end = Math.max(start + 20, Math.min(start + 59, near(t + 15, 1)));
    picks.push({ peak: t, start: +start.toFixed(1), end: +end.toFixed(1), score: +score[i].toFixed(2), said: w.filter((x) => x.s >= start && x.e <= end).map((x) => x.w).join(" ") });
  }
  picks.sort((a, b) => a.start - b.start);
  picks.forEach((p, k) => console.log(`\n#${k + 1}  ${hms(p.start)} - ${hms(p.end)}  (${(p.end - p.start).toFixed(0)} s, score ${p.score})\n    "${p.said.slice(0, 400)}${p.said.length > 400 ? "…" : ""}"`));
  writeFileSync(`${video}.moments.json`, JSON.stringify(picks, null, 2));
  console.log(`\nsaved ${video}.moments.json. Write plan.json with the ones you want, a title and the cast in each.`);
};

// ---- cut: one 1080x1920 clip per plan entry
const assTime = (s) => { s = Math.max(0, s); const cs = Math.round(s * 100); return `${Math.floor(cs / 360000)}:${String(Math.floor(cs / 6000) % 60).padStart(2, "0")}:${String(Math.floor(cs / 100) % 60).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`; };
const esc = (t) => t.replace(/[{}\\]/g, "");
const wrap = (t, max) => { const out = []; let line = ""; for (const word of t.split(/\s+/)) { if ((line + " " + word).trim().length > max && line) { out.push(line); line = word; } else line = (line + " " + word).trim(); } if (line) out.push(line); return out; };
const ass = (clip, w, dur, cta) => {
  const head = `[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 2\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n` +
    `Style: Title,Poppins,68,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,6,2,8,150,150,170,1\n` +
    `Style: Sub,Poppins,66,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,6,2,2,150,150,700,1\n` +
    `Style: Cta,Poppins,44,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,4,1,2,150,150,470,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  const ev = [];
  // the title: up for the whole clip, popping in during the first 0.25 s
  ev.push(`Dialogue: 0,${assTime(0)},${assTime(dur)},Title,,0,0,0,,{\\fad(120,0)\\t(0,250,\\fscx100\\fscy100)}${wrap(esc(clip.title), 30).join("\\N")}`);
  ev.push(`Dialogue: 0,${assTime(0)},${assTime(dur)},Cta,,0,0,0,,${esc(cta)}`);
  // subtitles: three or four words at a time, the word being said in yellow
  const t0 = secs(clip.start), mine = w.filter((x) => x.s >= t0 - 0.05 && x.e <= secs(clip.end) + 0.05).map((x) => ({ ...x, s: x.s - t0, e: x.e - t0 }));
  for (let i = 0; i < mine.length; ) {
    let j = i + 1; while (j < mine.length && j - i < 4 && mine[j].s - mine[j - 1].e < 0.6 && !/[.?!,]$/.test(mine[j - 1].w)) j++;
    const g = mine.slice(i, j), gEnd = Math.min(g[g.length - 1].e + 0.25, mine[j]?.s ?? dur);
    g.forEach((x, k) => { const end = k < g.length - 1 ? g[k + 1].s : gEnd; ev.push(`Dialogue: 1,${assTime(x.s)},${assTime(end)},Sub,,0,0,0,,${g.map((y, m) => (m === k ? `{\\c&H00D7FF&}${esc(y.w)}{\\c&HFFFFFF&}` : esc(y.w))).join(" ").toUpperCase()}`); });
    i = j;
  }
  return head + ev.join("\n") + "\n";
};
const caption = (clip, k) => {
  const tags = (clip.cast ?? []).map((c) => CAST[c] ?? c).join(" "), cta = CTAS[k % CTAS.length], hook = clip.caption ?? clip.title;
  return [`TITLE (on screen): ${clip.title}`, "",
    `--- TikTok ---`, `${hook} 👀 ${cta} ${SHOW.tiktok} ${tags}`, HASHTAGS, "",
    `--- Instagram Reels ---`, `${hook}\n${cta} 📺 ${SHOW.instagram} ${tags}`, HASHTAGS, "",
    `--- YouTube Shorts ---`, `Title: ${clip.title.slice(0, 95)}`, `Description: ${cta}. ${tags} ${HASHTAGS}`, "",
    `--- Stories (one per clip, on both) ---`, `Instagram story link: https://www.cwenetwork.com/buy?campaign=motionclipping`, `TikTok story: add the campaign QR code from your onboarding`, "",
    `Reply to "where can I watch?" comments with: https://www.cwenetwork.com`].join("\n");
};
const cut = (video, planFile) => {
  const plan = JSON.parse(readFileSync(planFile, "utf8")), w = existsSync(`${video}.words.json`) ? words(video) : [], out = opt("out", "out");
  mkdirSync(out, { recursive: true });
  const titles = new Set();
  plan.forEach((clip, k) => {
    if (titles.has(clip.title)) throw new Error(`title used twice: "${clip.title}" (the campaign wants a different title on every post)`); titles.add(clip.title);
    const missing = (clip.cast ?? []).filter((c) => !CAST[c]); if (!clip.cast?.length || missing.length) throw new Error(`clip ${k + 1}: tag at least one cast member from the strategy doc${missing.length ? ` (unknown: ${missing.join(", ")})` : ""}`);
    const start = secs(clip.start), dur = secs(clip.end) - start, name = `clip_${String(k + 1).padStart(2, "0")}`, cta = CTAS[k % CTAS.length];
    if (!w.length) console.warn(`${name}: no transcript, so no subtitles. Run transcribe first.`);
    writeFileSync(join(out, `${name}.ass`), ass(clip, w, dur, cta));
    // the episode fills the middle (zoomed 1.3x, cropped at the sides), over a blurred copy of itself
    const vf = `[0:v]split[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:2,eq=brightness=-0.12[bg];` +
      `[b]scale=-2:840,crop='min(iw,1080)':840[fg];[bg][fg]overlay=(W-w)/2:470,subtitles=${join(out, name + ".ass")}:fontsdir=${HERE},format=yuv420p[v]`;
    run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-ss", String(start), "-i", video, "-t", String(dur), "-filter_complex", vf, "-map", "[v]", "-map", "0:a?", "-r", "30", "-c:v", "libx264", "-preset", "medium", "-crf", "19",
      "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-c:a", "aac", "-b:a", "192k", "-af", "loudnorm=I=-14:TP=-1.5", "-movflags", "+faststart", join(out, `${name}.mp4`)]);
    writeFileSync(join(out, `${name}.txt`), caption(clip, k));
    console.log(`${name}.mp4  ${hms(start)} + ${dur.toFixed(0)} s  "${clip.title}"`);
  });
};

const [cmd, video, plan] = args;
try {
  if (cmd === "transcribe") { const r = spawnSync(join(HERE, ".venv/bin/python"), [join(HERE, "transcribe.py"), video, ...args.slice(2)], { stdio: "inherit" }); process.exit(r.status ?? 1); }
  else if (cmd === "find") find(video); else if (cmd === "cut") cut(video, plan);
  else console.log("usage: node streamla.mjs transcribe|find|cut episode.mp4 [plan.json]");
} catch (e) { console.error(`streamla: ${e.message}`); process.exit(1); }
