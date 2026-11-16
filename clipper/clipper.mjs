#!/usr/bin/env node
// CLIPPER. Turns a long video (a show episode, a stream VOD) into 9:16 clips ready to post:
// an on-screen title, burned-in subtitles with the spoken word highlighted, an on-screen call to
// action, no watermark, and a caption file per clip for TikTok, Instagram and YouTube.
// A preset (presets/*.json) holds each campaign's rules: CTAs, hashtags, cast handles, story links.
// It never posts anything: you upload, add the story and submit the links yourself.
//
//   node clipper.mjs auto  video.mp4 [--preset streamla] [--top 8] [--chat chat.json]
//                                                     everything: transcript, moments, draft plan, clips
//   node clipper.mjs transcribe video.mp4             word timestamps -> video.mp4.words.json
//   node clipper.mjs find video.mp4 [--top 8]         the strongest moments -> video.mp4.moments.json + plan.json draft
//   node clipper.mjs cut  video.mp4 plan.json         the clips and their captions -> out/
//
// plan.json: [{ "start": "12:31", "end": "13:04", "title": "…", "cast": ["India Love"], "caption": "optional hook" }]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf(`--${n}`); return i < 0 ? d : args[i + 1]; };
const P = JSON.parse(readFileSync(join(HERE, "presets", `${opt("preset", "streamla")}.json`), "utf8"));
const run = (cmd, a, o = {}) => { const r = spawnSync(cmd, a, { encoding: "utf8", maxBuffer: 1 << 28, ...o }); if (r.error) throw new Error(`${cmd} not found: install it first (see README.md)`); if (r.status) throw new Error(`${cmd} failed: ${(r.stderr || "").slice(-600)}`); return r; };
const secs = (t) => (typeof t === "number" ? t : String(t).split(":").reduce((a, b) => a * 60 + Number(b), 0));
const hms = (s) => { s = Math.floor(s); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = String(s % 60).padStart(2, "0"); return h ? `${h}:${String(m).padStart(2, "0")}:${x}` : `${m}:${x}`; };
const python = () => { for (const p of [".venv/bin/python", ".venv/Scripts/python.exe"]) if (existsSync(join(HERE, p))) return join(HERE, p); throw new Error("no .venv yet: run the setup script first (see README.md)"); };
const wordsOf = (video) => { const f = `${video}.words.json`; return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null; };

// ---- transcribe (faster-whisper on the CPU; the model downloads once)
const transcribe = (video) => {
  if (wordsOf(video) && !args.includes("--again")) { console.log(`transcript already there: ${video}.words.json`); return; }
  const r = spawnSync(python(), [join(HERE, "transcribe.py"), video, "--model", opt("model", P.model), "--lang", P.lang], { stdio: "inherit" });
  if (r.status) throw new Error("the transcription failed");
};

// ---- find: every 5 s scored by loudness, speech speed, shouting/questions, and chat (when given)
const HOT = /^(what|nah|bro|stop|why|crazy|lying|lie|fight|ex|love|kiss|shut|hell|damn|deadass|qué|que|no|tío|madre|hostia|joder|calla|mira|ostia|wtf|jaja\w*)/i;
const find = (video) => {
  const top = Number(opt("top", 8)), w = wordsOf(video) ?? [];
  const r = run("ffmpeg", ["-hide_banner", "-i", video, "-vn", "-af", "aresample=8000,asetnsamples=8000,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level", "-f", "null", "-"]);
  const db = [...r.stderr.matchAll(/RMS_level=(-?[\d.]+|-inf)/g)].map((m) => (m[1] === "-inf" ? -90 : Number(m[1])));
  const n = Math.ceil(db.length / 5), loud = [], talk = new Array(n).fill(0), hot = new Array(n).fill(0), chat = new Array(n).fill(0);
  for (let i = 0; i < n; i++) loud.push(Math.max(...db.slice(i * 5, i * 5 + 5)));
  for (const x of w) { const i = Math.floor(x.s / 5); if (i < n) { talk[i]++; if (/[!?¡¿]/.test(x.w)) hot[i]++; if (HOT.test(x.w)) hot[i] += 0.5; } }
  const chatFile = opt("chat"); if (chatFile) { const c = JSON.parse(readFileSync(chatFile, "utf8")); for (const m of c.comments ?? c) { const t = Number(m.content_offset_seconds ?? m.offset ?? m.time) - 8; const i = Math.floor(t / 5); if (i >= 0 && i < n) chat[i]++; } } // chat reacts ~8 s late
  const z = (a) => { const m = a.reduce((s, v) => s + v, 0) / a.length, sd = Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length) || 1; return a.map((v) => (v - m) / sd); };
  const L = z(loud), T = z(talk), Hh = z(hot), C = chatFile ? z(chat) : chat.map(() => 0);
  const score = L.map((_, i) => 1.2 * L[i] + 0.8 * T[i] + 1.0 * Hh[i] + 1.6 * C[i]);
  const ends = w.filter((x) => /[.?!]$/.test(x.w)).map((x) => x.e);
  const snap = (t, dir) => ends.filter((e) => (dir < 0 ? e <= t : e >= t)).sort((a, b) => (dir < 0 ? b - a : a - b))[0] ?? t;
  const picks = [];
  for (const i of [...score.keys()].sort((a, b) => score[b] - score[a])) {
    if (picks.length >= top) break; const t = i * 5; if (picks.some((p) => Math.abs(p.peak - t) < 90)) continue;
    const start = Math.max(0, snap(t - 18, -1)), end = Math.max(start + 20, Math.min(start + 59, snap(t + 14, 1)));
    picks.push({ peak: t, start: +start.toFixed(1), end: +end.toFixed(1), score: +score[i].toFixed(2), said: w.filter((x) => x.s >= start && x.e <= end).map((x) => x.w).join(" ") });
  }
  picks.sort((a, b) => a.start - b.start);
  picks.forEach((p, k) => console.log(`\n#${k + 1}  ${hms(p.start)} - ${hms(p.end)}  (${(p.end - p.start).toFixed(0)} s, score ${p.score})\n    "${p.said.slice(0, 300)}${p.said.length > 300 ? "…" : ""}"`));
  writeFileSync(`${video}.moments.json`, JSON.stringify(picks, null, 2));
  // a draft plan: the strongest line said in each moment stands in for a title until you write one
  const plan = picks.map((p) => { const lines = p.said.split(/(?<=[.?!])\s+/).filter((l) => l.length > 12 && l.length < 90); const best = lines.sort((a, b) => (/[!?]/.test(b) ? 1 : 0) - (/[!?]/.test(a) ? 1 : 0))[0] ?? p.said.slice(0, 60);
    const words = best.replace(/["“”]/g, "").split(/\s+/); let t = ""; for (const x of words) { if ((t + " " + x).length > 58) break; t = (t + " " + x).trim(); }
    const cutAt = t.lastIndexOf(","); if (t.length >= 40 && cutAt > 25) t = t.slice(0, cutAt);
    return { start: hms(p.start), end: hms(p.end), title: t.replace(/[,;:]+$/, "").replace(/^\w/, (c) => c.toUpperCase()), cast: [], draft: true }; });
  const planFile = opt("plan", join(dirname(video), "plan.json"));
  if (!existsSync(planFile) || args.includes("--again")) { writeFileSync(planFile, JSON.stringify(plan, null, 2)); console.log(`\ndraft plan -> ${planFile}  (write a real title and the cast in each before posting)`); }
  return planFile;
};

// ---- cut
const assTime = (s) => { const cs = Math.round(Math.max(0, s) * 100); return `${Math.floor(cs / 360000)}:${String(Math.floor(cs / 6000) % 60).padStart(2, "0")}:${String(Math.floor(cs / 100) % 60).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`; };
const esc = (t) => t.replace(/[{}\\]/g, "");
// words platforms push down when they show up as on-screen text; the audio is left as it is
const CENSOR = [[/\bnigg(a|as|er|ers)\b/gi, (m) => m[0] + "***" + m.slice(-1)], [/\bf+u+c+k(\w*)/gi, (m) => m[0] + "**" + m.slice(3)], [/\bbitch(\w*)/gi, (m) => "b***" + m.slice(4)], [/\bshit(\w*)/gi, (m) => "sh*t" + m.slice(4)], [/\bmotherf\w*/gi, () => "m***********"]];
const noEmoji = (t) => t.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "").replace(/\s+/g, " ").trim();
const clean = (t) => (P.censor ? CENSOR.reduce((x, [re, f]) => x.replace(re, f), t) : t);
const wrap = (t, max) => { const out = []; let line = ""; for (const word of t.split(/\s+/)) { if ((line + " " + word).trim().length > max && line) { out.push(line); line = word; } else line = (line + " " + word).trim(); } if (line) out.push(line); return out; };
const ass = (clip, w, dur, cta) => {
  const st = (name, size, outline, align, v) => `Style: ${name},Poppins,${size},&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,${outline},2,${align},150,150,${v},1`;
  const head = `[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 2\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n` +
    [st("Title", 68, 6, 8, 170), st("Sub", 66, 6, 2, 700), st("Cta", 44, 4, 2, 470)].join("\n") + `\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  const ev = [`Dialogue: 0,${assTime(0)},${assTime(dur)},Title,,0,0,0,,{\\fad(120,0)}${wrap(esc(noEmoji(clip.title)), 30).join("\\N")}`];
  if (cta) ev.push(`Dialogue: 0,${assTime(0)},${assTime(dur)},Cta,,0,0,0,,${esc(cta)}`);
  const t0 = secs(clip.start), mine = w.filter((x) => x.s >= t0 - 0.05 && x.e <= secs(clip.end) + 0.05).map((x) => ({ ...x, s: x.s - t0, e: x.e - t0 }));
  for (let i = 0; i < mine.length; ) {
    let j = i + 1; while (j < mine.length && j - i < 4 && mine[j].s - mine[j - 1].e < 0.6 && !/[.?!,]$/.test(mine[j - 1].w)) j++;
    const g = mine.slice(i, j), gEnd = Math.min(g[g.length - 1].e + 0.25, mine[j]?.s ?? dur);
    g.forEach((x, k) => { const end = k < g.length - 1 ? g[k + 1].s : gEnd; ev.push(`Dialogue: 1,${assTime(x.s)},${assTime(end)},Sub,,0,0,0,,${g.map((y, m) => (m === k ? `{\\c&H00D7FF&}${esc(clean(y.w))}{\\c&HFFFFFF&}` : esc(clean(y.w)))).join(" ").toUpperCase()}`); });
    i = j;
  }
  return head + ev.join("\n") + "\n";
};
const captionText = (clip, k) => {
  const tags = (clip.cast ?? []).map((c) => P.cast[c] ?? c).join(" "), cta = P.ctas.length ? P.ctas[k % P.ctas.length] : "", hook = clip.caption ?? clip.title, mention = [P.show, tags].filter(Boolean).join(" ");
  return [`ON-SCREEN TITLE: ${clip.title}`, "", "--- TikTok ---", `${hook} ${cta} ${mention}`.replace(/\s+/g, " ").trim(), P.credit ?? "", P.hashtags, "",
    "--- Instagram Reels ---", hook, `${cta} ${mention}`.trim(), P.credit ?? "", P.hashtags, "",
    "--- YouTube Shorts ---", `Title: ${clip.title.slice(0, 95)}`, `Description: ${cta}. ${mention} ${P.credit ?? ""} ${P.hashtags}`.replace(/\s+/g, " ").trim(), "",
    ...(P.story.length ? ["--- Stories (one per clip) ---", ...P.story, ""] : []), P.reply ?? ""].filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
};
const cut = (video, planFile) => {
  const plan = JSON.parse(readFileSync(planFile, "utf8")), w = wordsOf(video) ?? [], out = resolve(opt("out", join(dirname(video), "out")));
  mkdirSync(out, { recursive: true });
  const titles = new Set();
  plan.forEach((clip, k) => {
    if (titles.has(clip.title)) throw new Error(`title used twice: "${clip.title}". Every post needs its own title.`); titles.add(clip.title);
    const missing = (clip.cast ?? []).filter((c) => !P.cast[c]);
    if (P.requireCast && (!clip.cast?.length || missing.length)) console.warn(`  ! clip ${k + 1}: tag the cast member(s) in plan.json before posting${missing.length ? ` (not in the preset: ${missing.join(", ")})` : ""}`);
    if (clip.draft) console.warn(`  ! clip ${k + 1}: the title is a draft (a quote from the clip); write your own before posting`);
    const start = secs(clip.start), dur = secs(clip.end) - start, name = `clip_${String(k + 1).padStart(2, "0")}`, cta = P.ctas.length ? P.ctas[k % P.ctas.length] : "";
    if (!w.length) console.warn(`  ! ${name}: no transcript, so no subtitles`);
    writeFileSync(join(out, `${name}.ass`), ass(clip, w, dur, cta));
    // ffmpeg runs inside out/, so the subtitle and font paths have no drive letters to escape on Windows
    const fonts = relative(out, HERE).replace(/\\/g, "/") || ".";
    const vf = `[0:v]split[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:2,eq=brightness=-0.12[bg];` +
      `[b]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:520,subtitles=${name}.ass:fontsdir=${fonts},format=yuv420p[v]`;
    run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-ss", String(start), "-i", resolve(video), "-t", String(dur), "-filter_complex", vf, "-map", "[v]", "-map", "0:a?", "-r", "30", "-c:v", "libx264", "-preset", "medium", "-crf", "19",
      "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-c:a", "aac", "-b:a", "192k", "-af", "loudnorm=I=-14:TP=-1.5", "-movflags", "+faststart", `${name}.mp4`], { cwd: out });
    writeFileSync(join(out, `${name}.txt`), captionText(clip, k));
    console.log(`${name}.mp4  ${hms(start)} + ${dur.toFixed(0)} s  "${clip.title}"`);
  });
  console.log(`\nclips and captions in ${out}`);
};

const [cmd, video, plan] = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
try {
  if (!cmd || !video) console.log("usage: node clipper.mjs auto|transcribe|find|cut video.mp4 [plan.json] [--preset streamla|generico] [--top 8] [--chat chat.json]\nsee README.md");
  else if (!existsSync(video)) throw new Error(`no such video: ${video}`);
  else if (cmd === "transcribe") transcribe(video);
  else if (cmd === "find") find(video);
  else if (cmd === "cut") cut(video, plan ?? join(dirname(video), "plan.json"));
  else if (cmd === "auto") { console.log(`preset: ${P.name}`); transcribe(video); const pf = find(video); cut(video, pf); }
  else throw new Error(`unknown command: ${cmd}`);
} catch (e) { console.error(`clipper: ${e.message}`); process.exit(1); }
