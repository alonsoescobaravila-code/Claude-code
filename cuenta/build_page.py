"""Builds kit-daily-drama.html: the whole Stream LA clipping kit on one page."""
import base64, html, json

b64 = lambda p: base64.b64encode(open(p, "rb").read()).decode()
TAGS = "#streamhouselacwe #streamhousela #cwetv #chickenwrapentertainment"
CAST = {"Michaela": "@sheismichaela", "Jojo": "@flyestmanonearth", "DJ SkyHigh Baby": "@djskyhighbaby", "Casanova": "@one_cnova", "Tru Carr": "@trucarr_", "CJ": "@cjkilla", "D Mac": "@mrmacster9"}
CTA_TT = ["Watch Streamhouse LA on CWETV", "Download CWETV to watch the full episode", "Watch the full episode on CWETV", "Episode 2 officially out now on https://chickenwrapent.com"]
CTA_IG = ["Watch Streamhouse LA on CWETV", "Download CWETV to watch the full episode", "Watch the full episode on CWETV", "Episode 2 officially out now on chickenwrapent.com"]
CLIPS = [
    ("4:40", 34, "This Argument Had The Whole House Yelling GET OUT 😳", ["Michaela"], "Nobody was sitting down after this one 😳", True),
    ("6:34", 36, "Michaela & Jojo's Room Turned Into CHAOS After THIS!", ["Michaela", "Jojo"], "They had to close the door on this one 🚪", False),
    ("8:56", 38, "Michaela Was NOT Trying To Hear Who Broke It Up…", ["Michaela", "Jojo"], "Was she right to be this mad? 👀", False),
    ("15:29", 37, "The House Says Michaela Gets SPECIAL RULES 👀", ["Michaela", "Jojo"], "Princess treatment or mean girl? You decide 👑", True),
    ("18:36", 52, "DJ SkyHigh Turned The Party UP And The House Felt It 🔥", ["DJ SkyHigh Baby", "Casanova", "Tru Carr"], "This party went crazy 🔥", False),
    ("22:44", 35, "“I Swear To God I Didn't Say That”… Somebody's Not Telling The Truth", ["DJ SkyHigh Baby", "Michaela"], "Who do you believe? 👇", True),
    ("35:00", 40, "Castro Said Imagine What He Could Do With A Couple More Days 😤", ["CJ"], "Confidence on a hundred 😤", True),
    ("38:34", 48, "D Mac Says Everybody Out Here Is Trying To Be Him", ["D Mac"], "He really does it all? 🤔", False),
]
clips = []
for i, (start, dur, title, cast, hook, unsure) in enumerate(CLIPS):
    tags = " ".join(CAST[c] for c in cast)
    tt, ig = CTA_TT[i % 4], CTA_IG[i % 4]
    ytdesc = (tt if tt.endswith("com") else tt + ".") + f" @streamhousela {tags} {TAGS}"
    clips.append({"n": i + 1, "start": start, "dur": dur, "title": title, "cast": [[c, CAST[c]] for c in cast], "unsure": unsure,
                  "tiktok": f"{hook} {tt} @streamhousela {tags} {TAGS}",
                  "instagram": f"{hook}\n{ig} 📺 @streamhousela {tags}\n{TAGS}",
                  "yt_title": title, "yt_desc": ytdesc})

ALLCAST = [("Morgan Westbrooks", "@morgandwestbrooks"), ("India Love", "@indialove"), ("Casanova", "@one_cnova"), ("DJ SkyHigh Baby", "@djskyhighbaby"), ("Michaela", "@sheismichaela"),
    ("Phee", "@romanaceanddancepole"), ("Island Boi", "@islandboij242"), ("Castro “CJ” Dean", "@cjkilla"), ("Lyricc", "@assistanttothestarz"), ("Vegas Ky", "@vegas_ky"), ("Jojo", "@flyestmanonearth"),
    ("D Mac", "@mrmacster9"), ("Chica", "@chicachicaduhhh_"), ("K Shiday", "@kshiday"), ("Noel", "@bignoel_official"), ("Diamond The Body", "@DiamondTheBodyy"), ("Tru Carr", "@trucarr_"),
    ("EKE", "@eke.thename"), ("Speedy", "@speedy1808"), ("Conrad", "@boutabag_rad")]

e = html.escape
def copy(label, text, id_):
    return f'<div class="copy"><div class="copy-head"><span class="label">{e(label)}</span><button type="button" class="btn" data-copy="{id_}">Copiar</button></div><pre id="{id_}">{e(text)}</pre></div>'

clip_html = []
for c in clips:
    chips = "".join(f'<span class="chip">{e(n)} <b>{e(h)}</b></span>' for n, h in c["cast"])
    warn = '<p class="warn">Revisa estas etiquetas antes de publicar: las saqué de los nombres que se dicen en la escena.</p>' if c["unsure"] else ""
    k = c["n"]
    clip_html.append(f'''<article class="clip" id="clip-{k}">
  <header class="clip-head"><span class="num">{k:02d}</span><div class="clip-meta"><h3>{e(c["title"])}</h3><p class="sub">EP2 · desde el minuto {c["start"]} · {c["dur"]} s · archivo <code>clip_{k:02d}.mp4</code></p><div class="chips">{chips}</div>{warn}</div></header>
  <div class="platforms">
    {copy("TikTok", c["tiktok"], f"c{k}-tt")}
    {copy("Instagram", c["instagram"], f"c{k}-ig")}
    {copy("YouTube · título", c["yt_title"], f"c{k}-ytt")}
    {copy("YouTube · descripción", c["yt_desc"], f"c{k}-ytd")}
  </div>
  <div class="done" role="group" aria-label="Clip {k} hecho">{"".join(f'<label><input type="checkbox" id="d{k}-{x}" data-save> {lbl}</label>' for x, lbl in [("tt","TikTok"),("ig","Instagram"),("yt","YouTube"),("st","Historias"),("wh","Enviado a Whop")])}</div>
</article>''')

cast_rows = "".join(f'<tr><td>{e(n)}</td><td><code>{e(h)}</code></td></tr>' for n, h in ALLCAST)

page = open("kit-template.html", encoding="utf-8").read()
page = (page.replace("{{PERFIL}}", b64("perfil-web.jpg")).replace("{{BANNER}}", b64("banner-web.jpg")).replace("{{QR}}", b64("qr-historia-tiktok.png"))
        .replace("{{CLIPS}}", "\n".join(clip_html)).replace("{{CAST}}", cast_rows)
        .replace("{{BIO_TT}}", copy("Bio · TikTok e Instagram", "Daily drama, wild moments & real reactions from Streamhouse LA 🎬🔥\n@streamhousela", "bio-ig"))
        .replace("{{BIO_YT}}", copy("Descripción del canal · YouTube", "Daily drama, wild moments & real reactions from Streamhouse LA 🎬🔥 Watch full episodes on CWETV.", "bio-yt"))
        .replace("{{STORY_IG}}", copy("Enlace de la historia · Instagram", "https://www.cwenetwork.com/buy?campaign=motionclipping", "story-ig"))
        .replace("{{REPLY}}", copy("Respuesta a «¿dónde lo veo?»", "https://www.cwenetwork.com", "reply"))
        .replace("{{TAGS}}", copy("Hashtags obligatorios · 4 de máximo 5", TAGS, "tags")))
open("kit-daily-drama.html", "w", encoding="utf-8").write(page)
print("ok", len(page) // 1024, "KB")
