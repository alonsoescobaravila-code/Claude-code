// Pasada 2 — semántica de Liquid sobre el AST real de Shopify.
import { toLiquidHtmlAST } from '@shopify/liquid-html-parser';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/home/user/Claude-code/squishy-heaven';
const archivos = [];
for (const dir of ['sections', 'blocks', 'snippets']) {
  for (const f of fs.readdirSync(path.join(ROOT, dir))) {
    if (f.endsWith('.liquid')) archivos.push(path.join(dir, f));
  }
}

let fallos = 0;
const aviso = (m) => { console.log('  FALLO ' + m); fallos++; };

function recorrer(nodo, visita, padre = null) {
  if (!nodo || typeof nodo !== 'object') return;
  if (Array.isArray(nodo)) { for (const n of nodo) recorrer(n, visita, padre); return; }
  if (nodo.type) visita(nodo, padre);
  for (const k of Object.keys(nodo)) {
    if (k === 'parentNode' || k === 'source') continue;
    recorrer(nodo[k], visita, nodo);
  }
}

for (const rel of archivos) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  let ast;
  try { ast = toLiquidHtmlAST(src); }
  catch (e) { aviso(`${rel}: no parsea — ${e.message}`); continue; }

  recorrer(ast, (n) => {
    // a) Ningún filtro puede colgar de image_tag: se aplicaría a la etiqueta
    //    <img> entera y la imprimiría como texto en la página.
    if (n.type === 'LiquidVariable' && Array.isArray(n.filters)) {
      const i = n.filters.findIndex((f) => f.name === 'image_tag');
      if (i > -1 && i < n.filters.length - 1) {
        aviso(`${rel}: filtro "${n.filters[i + 1].name}" encadenado después de image_tag`);
      }
      // b) Lo mismo con stylesheet_tag y script_tag.
      for (const t of ['stylesheet_tag', 'script_tag']) {
        const j = n.filters.findIndex((f) => f.name === t);
        if (j > -1 && j < n.filters.length - 1) {
          aviso(`${rel}: filtro encadenado después de ${t}`);
        }
      }
    }
  });

  /* c) Texto libre dentro de un atributo HTML tiene que ir escapado.
        Solo cuenta el texto que el merchant teclea (text, textarea, richtext,
        html). Un `select` únicamente puede devolver uno de los valores que el
        propio schema declara, y un `url` sale de un selector, no del teclado:
        ninguno de los dos puede romper el atributo. */
  const tiposLibres = new Set(['text', 'textarea', 'richtext', 'html', 'liquid']);
  const libres = new Set();
  const ms = src.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
  if (ms) {
    let sch;
    try { sch = JSON.parse(ms[1]); } catch { sch = null; }
    if (sch) {
      const recoge = (lista) => (lista || []).forEach((x) => { if (x.id && tiposLibres.has(x.type)) libres.add(x.id); });
      recoge(sch.settings);
      (sch.blocks || []).forEach((b) => recoge(b.settings));
    }
  }

  const sinEscapar = [];
  const re = /=\s*"([^"]*\{\{[^}]*\}\}[^"]*)"/g;
  let m;
  while ((m = re.exec(src))) {
    for (const salida of (m[1].match(/\{\{[^}]*\}\}/g) || [])) {
      const id = (salida.match(/settings\.([a-z0-9_]+)/) || [])[1];
      if (!id || !libres.has(id)) continue;
      if (/\|\s*escape\b/.test(salida)) continue;
      sinEscapar.push(salida.trim());
    }
  }
  for (const s of new Set(sinEscapar)) aviso(`${rel}: texto libre sin escapar en un atributo → ${s}`);
}

/* d) Un bloque que necesite el producto tiene que pedirlo con closest.product,
      que es como Horizon se lo pasa. Un bloque que no lo necesite —el de
      confianza muestra las mismas señales en todos los productos— no tiene por
      qué tocarlo. */
for (const f of fs.readdirSync(path.join(ROOT, 'blocks'))) {
  const src = fs.readFileSync(path.join(ROOT, 'blocks', f), 'utf8');
  const cuerpo = src.replace(/\{%\s*schema\s*%\}[\s\S]*?\{%\s*endschema\s*%\}/, '');
  const usaProducto = /\bproduct\.|\bp\.metafields|\bp\.title/.test(cuerpo);
  if (usaProducto && !cuerpo.includes('closest.product')) {
    aviso(`blocks/${f}: usa el producto sin pedirlo con closest.product`);
  }
  if (src.includes('"enabled_on"')) aviso(`blocks/${f}: enabled_on no es válido en un schema de bloque`);
  if (!src.includes('block.shopify_attributes')) aviso(`blocks/${f}: falta block.shopify_attributes`);
}

// e) Cada bloque de una sección debe emitir shopify_attributes o el editor no
//    puede seleccionarlo.
for (const f of fs.readdirSync(path.join(ROOT, 'sections'))) {
  const src = fs.readFileSync(path.join(ROOT, 'sections', f), 'utf8');
  const tieneBloques = /"blocks"\s*:\s*\[/.test(src);
  if (tieneBloques && !src.includes('block.shopify_attributes')) {
    aviso(`sections/${f}: define bloques pero no emite block.shopify_attributes`);
  }
}

console.log(fallos === 0 ? 'Pasada 2 · semántica de Liquid: sin fallos' : `Pasada 2: ${fallos} fallos`);
