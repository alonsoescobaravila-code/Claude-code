// Pasada 3 — integridad entre CSS, JS y Liquid.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/home/user/Claude-code/squishy-heaven';
let fallos = 0;
const aviso = (m) => { console.log('  FALLO ' + m); fallos++; };

const css = fs.readFileSync(path.join(ROOT, 'assets/sh-squishy.css'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'assets/sh-interactivo.js'), 'utf8');
const preview = fs.readFileSync(path.join(ROOT, 'preview/squishy-heaven-preview.html'), 'utf8');

const liquid = [];
for (const dir of ['sections', 'blocks', 'snippets']) {
  for (const f of fs.readdirSync(path.join(ROOT, dir))) {
    if (f.endsWith('.liquid')) liquid.push([path.join(dir, f), fs.readFileSync(path.join(ROOT, dir, f), 'utf8')]);
  }
}

/* ---------- a) clases sh- usadas en Liquid que el CSS no define ---------- */
// El CSS de cada sección va en su {% stylesheet %}, así que hay que sumarlo.
let cssTotal = css;
for (const [, src] of liquid) {
  for (const m of src.matchAll(/\{%\s*stylesheet\s*%\}([\s\S]*?)\{%\s*endstylesheet\s*%\}/g)) cssTotal += m[1];
}
const definidas = new Set([...cssTotal.matchAll(/\.(sh-[a-z0-9_-]+)/g)].map((m) => m[1]));
// Las que crea el JavaScript en tiempo de ejecución también cuentan como usadas.
const desdeJS = new Set([...js.matchAll(/'(sh-[a-z0-9_ -]+)'/g)].flatMap((m) => m[1].split(' ')).filter(Boolean));

const usadas = new Map();
for (const [rel, src] of liquid) {
  const cuerpo = src.replace(/\{%\s*schema\s*%\}[\s\S]*?\{%\s*endschema\s*%\}/, '');
  for (const m of cuerpo.matchAll(/class="([^"]*)"/g)) {
    for (const c of m[1].split(/\s+/)) {
      if (!c.startsWith('sh-') && c !== 'sh') continue;
      if (c.includes('{')) continue; // clase construida con Liquid
      if (!usadas.has(c)) usadas.set(c, rel);
    }
  }
}
/* Una clase sin estilo es inerte, no un fallo. Lo que sí es un fallo es que el
   preview la pinte y la tienda no: ahí la tienda se vería distinta de lo que se
   aprobó. */
const cssPreview = preview.slice(0, preview.indexOf('</style>'));
const enPreview = new Set([...cssPreview.matchAll(/\.(sh-[a-z0-9_-]+)/g)].map((m) => m[1]));
const inertes = [];
for (const [c, rel] of usadas) {
  if (c === 'sh') continue;
  const enTienda = definidas.has(c) || desdeJS.has(c);
  if (!enTienda && enPreview.has(c)) aviso(`"${c}" (${rel}) tiene estilo en el preview y no en el CSS del tema`);
  else if (!enTienda) inertes.push(c);
}
if (inertes.length) console.log(`  nota · clases sin estilo en ningún sitio (inertes, sirven de gancho): ${inertes.join(', ')}`);

/* ---------- b) variables CSS usadas sin definir ---------- */
// Las que escriben el editor o el JS quedan fuera: siempre llevan valor de
// respaldo en el propio var().
for (const [nombre, texto] of [['sh-squishy.css', cssTotal], ['preview', preview.slice(0, preview.indexOf('</style>'))]]) {
  const def = new Set([...texto.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
  const sinRespaldo = new Set();
  for (const m of texto.matchAll(/var\((--[a-z0-9-]+)\s*(,?)/g)) {
    if (!m[2] && !def.has(m[1])) sinRespaldo.add(m[1]);
  }
  for (const v of sinRespaldo) aviso(`${nombre}: usa ${v} sin definirla y sin valor de respaldo`);
}

/* ---------- c) contrato entre el JavaScript y el Liquid ---------- */
const htmlTotal = liquid.map(([, s]) => s).join('\n');

for (const m of js.matchAll(/\[data-sh-[a-z-]+\]/g)) {
  const attr = m[0].slice(1, -1);
  if (!htmlTotal.includes(attr)) aviso(`el JS busca ${m[0]} y ningún Liquid lo escribe`);
}
// dataset.shCuentaTexto → data-sh-cuenta-texto
for (const m of js.matchAll(/dataset\.(sh[A-Z][A-Za-z]*)/g)) {
  const attr = 'data-' + m[1].replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
  if (attr === 'data-sh-listo') continue; // marca interna que pone el propio JS
  if (!htmlTotal.includes(attr)) aviso(`el JS lee ${m[1]} (${attr}) y ningún Liquid lo escribe`);
}
// Y al revés: nada que el Liquid escriba debe quedarse sin leer.
for (const m of htmlTotal.matchAll(/\bdata-sh-[a-z-]+/g)) {
  const camel = m[0].replace('data-', '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  if (m[0] === 'data-sh-estado') continue; // lo escribe el JS y lo lee el CSS
  if (!js.includes(m[0]) && !js.includes('dataset.' + camel)) {
    aviso(`el Liquid escribe ${m[0]} y el JS nunca lo lee`);
  }
}

/* ---------- c bis) paridad de objetivos táctiles entre tienda y preview ----------
   El preview es lo que se aprueba; si declara un min-height distinto al del
   tema, se aprueba una cosa y se publica otra. */
function minHeights(texto) {
  const mapa = new Map();
  for (const m of texto.matchAll(/(\.[a-z0-9_.\-]*sh-[a-z0-9_-]+[^{]*)\{([^}]*)\}/g)) {
    const mh = m[2].match(/min-height\s*:\s*([0-9]+)px/);
    if (mh) mapa.set(m[1].trim().split(/[\s,:]/)[0], mh[1]);
  }
  return mapa;
}
const mhTienda = minHeights(cssTotal);
const mhPreview = minHeights(cssPreview);
for (const [sel, v] of mhTienda) {
  if (mhPreview.has(sel) && mhPreview.get(sel) !== v) {
    aviso(`${sel}: min-height ${v}px en el tema y ${mhPreview.get(sel)}px en el preview`);
  }
}

/* ---------- d) el preview lleva la misma copia del JS ---------- */
const marcaJS = js.slice(js.indexOf('(function ()'), js.indexOf('(function ()') + 400);
if (!preview.includes(marcaJS)) aviso('el JS inline del preview no coincide con assets/sh-interactivo.js');

/* ---------- e) cada sección enlaza lo que necesita ---------- */
for (const [rel, src] of liquid) {
  if (!rel.startsWith('sections/')) continue;
  if (!src.includes("'sh-squishy.css' | asset_url")) aviso(`${rel}: no enlaza sh-squishy.css`);
  const usaJS = /data-sh-(squish|sparkles|foto)/.test(src);
  const enlazaJS = src.includes("'sh-interactivo.js' | asset_url");
  if (usaJS && !enlazaJS) aviso(`${rel}: usa el JavaScript y no lo enlaza`);
  if (!usaJS && enlazaJS) aviso(`${rel}: enlaza el JavaScript sin necesitarlo`);
}

console.log(fallos === 0 ? 'Pasada 3 · CSS, JS y Liquid: sin fallos' : `Pasada 3: ${fallos} fallos`);
