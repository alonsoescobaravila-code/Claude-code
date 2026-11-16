#!/usr/bin/env node
// CHAT CLIP FINDER. Lets Twitch chat point at the best moments of a past broadcast, then cuts them
// into vertical 30-second clips. Written from the description in "The Chat Clip Finder" guide,
// because the original script and TwitchDownloaderCLI could not be downloaded in this environment.
//
//   node chat-clips.mjs chat --vod https://www.twitch.tv/videos/123   -> chat.json  (replaces TwitchDownloaderCLI chatdownload)
//   node chat-clips.mjs chat.json                                     -> the graph, the top moments, clips/moments.json
//   node chat-clips.mjs chat.json --vod LINK | --video file.mp4       -> clips/clip_01.mp4 ... (1080x1920)
//   options: --top 5  --before 20  --after 10  --gap 90  --bucket 10  --out clips
//
// Only clip streamers who allow it, and credit them.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const args = process.argv.slice(2), opt = (name, def) => { const i = args.indexOf(`--${name}`); return i < 0 ? def : args[i + 1]; };
const num = (name, def) => Number(opt(name, def));
const CLIENT = "kimne78kx3ncx6brgo4mv6wki5h1ko"; // the public client id of the Twitch web player
const vodId = (link) => { const m = String(link).match(/videos\/(\d+)/) ?? String(link).match(/^(\d+)$/); if (!m) throw new Error(`not a Twitch VOD link: ${link} (it should look like https://www.twitch.tv/videos/1234567890)`); return m[1]; };
const gql = async (body) => { const r = await fetch("https://gql.twitch.tv/gql", { method: "POST", headers: { "Client-Id": CLIENT, "Content-Type": "application/json" }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(`Twitch answered ${r.status}`); return r.json(); };
const hms = (s) => `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(Math.floor(s) % 60).padStart(2, "0")}`;

// ---- step 6: grab the chat (every message with its time, in seconds from the start)
const downloadChat = async (link, out) => {
  const id = vodId(link), comments = []; let cursor = null, pages = 0;
  for (;;) {
    const variables = cursor ? { videoID: id, cursor } : { videoID: id, contentOffsetSeconds: 0 };
    const j = await gql([{ operationName: "VideoCommentsByOffsetOrCursor", variables, extensions: { persistedQuery: { version: 1, sha256Hash: "b70a3591ff0f4e0313d126c6a1502d79a1c02baebb288227c582044aa76adf6a" } } }]);
    const c = j?.[0]?.data?.video?.comments; if (!c) throw new Error(`Twitch returned no chat for this VOD (expired, subscriber-only, or chat replay is off). Twitch said: ${JSON.stringify(j).slice(0, 400)}`);
    for (const e of c.edges) comments.push({ content_offset_seconds: e.node.contentOffsetSeconds, commenter: { display_name: e.node.commenter?.displayName ?? "" }, message: { body: (e.node.message?.fragments ?? []).map((f) => f.text).join("") } });
    if (!c.pageInfo?.hasNextPage || !c.edges.length) break;
    cursor = c.edges[c.edges.length - 1].cursor;
    if (++pages % 50 === 0) process.stdout.write(`\r${comments.length} messages, at ${hms(comments[comments.length - 1].content_offset_seconds)}   `);
  }
  writeFileSync(out, JSON.stringify({ video: { id }, comments }));
  console.log(`\n${comments.length} chat messages saved to ${out}`);
};

// ---- step 7: find the moments (chat louder than the 5 minutes around it)
export const findMoments = (times, { bucket = 10, top = 5, gap = 90, window = 300 } = {}) => {
  const end = Math.max(...times), n = Math.floor(end / bucket) + 1, counts = new Array(n).fill(0);
  for (const t of times) counts[Math.floor(t / bucket)]++;
  const half = Math.round(window / 2 / bucket), sorted = [...counts].sort((a, b) => a - b), floor = Math.max(1, sorted[Math.floor(n / 2)] * 0.5);
  const scored = counts.map((c, i) => {
    // normal = the median of the buckets around this one, so one spike does not raise its own baseline
    const around = counts.slice(Math.max(0, i - half), Math.min(n, i + half + 1)).sort((a, b) => a - b), base = Math.max(floor, around[Math.floor(around.length / 2)]);
    return { time: i * bucket, msgs: c, ratio: c / base };
  });
  const picked = [];
  for (const m of [...scored].sort((a, b) => b.ratio - a.ratio || b.msgs - a.msgs)) {
    if (m.msgs < 5 || m.ratio < 2) continue;
    if (picked.some((p) => Math.abs(p.time - m.time) < gap)) continue;
    picked.push(m); if (picked.length >= top) break;
  }
  return { counts, end, moments: picked };
};
const graph = (counts, width = 60) => {
  const per = Math.ceil(counts.length / width), cols = []; for (let i = 0; i < counts.length; i += per) cols.push(Math.max(...counts.slice(i, i + per)));
  const max = Math.max(...cols, 1), bars = " ▁▂▃▄▅▆▇█"; return cols.map((c) => bars[Math.round((c / max) * 8)]).join("");
};

// ---- step 8: cut the clips, vertical 1080x1920
const playlist = async (link) => {
  const id = vodId(link);
  const j = await gql({ operationName: "PlaybackAccessToken", variables: { isLive: false, login: "", isVod: true, vodID: id, playerType: "embed" }, extensions: { persistedQuery: { version: 1, sha256Hash: "0828119ded1c13477966434e15800ff57ddacf13ba1911c129dc2200705b0712" } } });
  const t = j?.data?.videoPlaybackAccessToken; if (!t) throw new Error("Twitch gave no playback token for this VOD (expired or subscriber-only)");
  return `https://usher.ttvnw.net/vod/${id}.m3u8?sig=${t.signature}&token=${encodeURIComponent(t.value)}&allow_source=true&allow_audio_only=true`;
};
const cut = (src, from, len, out) => {
  // a sharp centre crop over a blurred, zoomed copy of the whole frame, so nothing important is lost off the sides
  const vf = "split[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:2[bg];[b]scale=-2:1100,crop='min(iw,1080)':1100[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p";
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-ss", String(Math.max(0, from)), "-i", src, "-t", String(len), "-filter_complex", vf, "-r", "60", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out], { encoding: "utf8" });
  if (r.status) throw new Error(`ffmpeg failed on ${out}: ${r.stderr.slice(-400)}`);
};

const main = async () => {
  if (!args.length) { console.log("usage: node chat-clips.mjs chat --vod LINK   |   node chat-clips.mjs chat.json [--vod LINK | --video file.mp4] [--top 5 --before 20 --after 10 --gap 90 --bucket 10 --out clips]"); return; }
  if (args[0] === "chat") return downloadChat(opt("vod"), opt("o", "chat.json"));
  const raw = JSON.parse(readFileSync(args[0], "utf8")), list = Array.isArray(raw) ? raw : raw.comments ?? [];
  const times = list.map((c) => Number(c.content_offset_seconds ?? c.offset ?? c.time)).filter(Number.isFinite);
  if (!times.length) throw new Error("No chat messages found: check that chat.json finished downloading");
  const before = num("before", 20), after = num("after", 10), out = opt("out", "clips");
  const { counts, end, moments } = findMoments(times, { bucket: num("bucket", 10), top: num("top", 5), gap: num("gap", 90) });
  console.log(`${times.length} chat messages, ${hms(end)} of stream\n\n${graph(counts)}\n`);
  moments.forEach((m, i) => console.log(`#${i + 1}  ${hms(m.time)}  ${m.msgs} msgs in ${num("bucket", 10)}s  (${m.ratio.toFixed(1)}x normal)`));
  mkdirSync(out, { recursive: true });
  const rows = moments.map((m, i) => ({ rank: i + 1, spike: hms(m.time), spike_seconds: m.time, clip_start: Math.max(0, m.time - before), clip_length: before + after, msgs: m.msgs, times_normal: +m.ratio.toFixed(2) }));
  writeFileSync(join(out, "moments.json"), JSON.stringify(rows, null, 2));
  const src = opt("video") ?? (opt("vod") ? await playlist(opt("vod")) : null);
  if (!src) { console.log(`\nsaved ${join(out, "moments.json")}. Add --vod LINK or --video file.mp4 to cut the clips.`); return; }
  rows.forEach((r) => { const f = join(out, `clip_${String(r.rank).padStart(2, "0")}.mp4`); cut(src, r.clip_start, r.clip_length, f); console.log(`cut ${f}  (${hms(r.clip_start)} + ${r.clip_length}s)`); });
};
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(`chat-clips: ${e.message}`); process.exit(1); });
