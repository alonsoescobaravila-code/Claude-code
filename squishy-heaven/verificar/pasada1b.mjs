/* Pasada 1b — validación de schemas contra lo que Shopify acepta.
 *
 * Existe porque theme-check dio 0 avisos y aun así Shopify rechazó un archivo
 * al guardarlo: «Invalid schema: 'max_blocks' is not a valid attribute». El
 * linter no cubre todo lo que valida el servidor al guardar.
 *
 * Dos fuentes de verdad, y las dos hacen falta:
 *   1. La lista documentada de atributos (shopify.dev). Detecta lo inventado.
 *   2. Lo que el propio tema Horizon usa de verdad. Detecta lo que la
 *      documentación permite pero este tema rechaza — que es exactamente lo
 *      que pasó con max_blocks.
 *
 * Uso:  node pasada1b.mjs [ruta-a-un-clon-de-Shopify/horizon]
 * Sin la ruta corre solo la parte documental.
 */
import fs from 'node:fs';
import path from 'node:path';

/* La raíz del paquete es la carpeta que contiene sections/ y blocks/. Se busca
   primero junto al script y después desde donde se ejecute, para que dé igual
   desde dónde se llame. */
function raizPaquete() {
  const candidatas = [];
  if (process.argv[3]) candidatas.push(path.resolve(process.argv[3]));
  // junto al script, y subiendo desde el script y desde donde se ejecute
  for (const base of [path.dirname(new URL(import.meta.url).pathname), process.cwd()]) {
    let d = base;
    for (let i = 0; i < 6; i++) {
      candidatas.push(d, path.join(d, 'squishy-heaven'));
      const arriba = path.dirname(d);
      if (arriba === d) break;
      d = arriba;
    }
  }
  for (const c of candidatas) {
    if (fs.existsSync(path.join(c, 'sections')) && fs.existsSync(path.join(c, 'blocks'))) return c;
  }
  console.error('No encuentro la carpeta del paquete (la que tiene sections/ y blocks/).');
  console.error('Pásala como segundo argumento:  node pasada1b.mjs <horizon> <paquete>');
  process.exit(1);
}
const ROOT = raizPaquete();
const HORIZON = process.argv[2] || null;

let fallos = 0, avisos = 0;
const falla = (m) => { console.log('  FALLO ' + m); fallos++; };
const avisa = (m) => { console.log('  AVISO ' + m); avisos++; };

/* --- 1 · listas documentadas en shopify.dev --- */
const SECCION = new Set(['name', 'tag', 'class', 'limit', 'settings', 'blocks',
  'max_blocks', 'presets', 'default', 'locales', 'enabled_on', 'disabled_on']);
const BLOQUE_ARCHIVO = new Set(['name', 'tag', 'class', 'settings', 'blocks', 'presets', 'locales']);
const BLOQUE_ENTRADA = new Set(['type', 'name', 'limit', 'settings']);
const PRESET = new Set(['name', 'settings', 'blocks', 'block_order', 'category']);
const AJUSTE = new Set(['type', 'id', 'label', 'default', 'info', 'placeholder',
  'options', 'min', 'max', 'step', 'unit', 'content', 'limit', 'accept', 'visible_if']);

function leerSchemas(dir) {
  const out = [];
  for (const f of fs.readdirSync(path.join(ROOT, dir))) {
    if (!f.endsWith('.liquid')) continue;
    const src = fs.readFileSync(path.join(ROOT, dir, f), 'utf8');
    const m = src.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
    if (!m) continue;
    try { out.push([`${dir}/${f}`, JSON.parse(m[1])]); }
    catch (e) { falla(`${dir}/${f}: el schema no es JSON válido — ${e.message}`); }
  }
  return out;
}

const secciones = leerSchemas('sections');
const bloques = leerSchemas('blocks');

function revisaAjustes(donde, lista) {
  for (const s of lista || []) {
    for (const k of Object.keys(s)) {
      if (!AJUSTE.has(k)) falla(`${donde}: el ajuste "${s.id || s.type}" usa "${k}", que no es un atributo de ajuste`);
    }
    if (s.type === 'range') {
      // Shopify rechaza un range con más de 101 pasos.
      const pasos = (s.max - s.min) / s.step;
      if (!Number.isInteger(pasos)) falla(`${donde}: el range "${s.id}" no da pasos enteros entre min y max`);
      else if (pasos > 101) falla(`${donde}: el range "${s.id}" tiene ${pasos} pasos, el máximo es 101`);
      if (s.default != null && (s.default < s.min || s.default > s.max)) {
        falla(`${donde}: el range "${s.id}" tiene un default fuera de min/max`);
      }
    }
    if ((s.type === 'select' || s.type === 'radio')) {
      const valores = (s.options || []).map((o) => o.value);
      if (!valores.length) falla(`${donde}: el ${s.type} "${s.id}" no tiene opciones`);
      if (s.default != null && !valores.includes(String(s.default))) {
        falla(`${donde}: el ${s.type} "${s.id}" tiene default "${s.default}" fuera de sus opciones`);
      }
    }
    if (['header', 'paragraph'].includes(s.type)) {
      if (s.id) falla(`${donde}: "${s.type}" no lleva id`);
      if (!s.content) falla(`${donde}: "${s.type}" sin content`);
    } else if (s.type && !['header', 'paragraph'].includes(s.type) && !s.id) {
      falla(`${donde}: hay un ajuste de tipo "${s.type}" sin id`);
    }
  }
}

for (const [f, d] of secciones) {
  for (const k of Object.keys(d)) if (!SECCION.has(k)) falla(`${f}: "${k}" no es un atributo de sección`);
  if (!d.name) falla(`${f}: sin "name"`);
  if (d.name && d.name.length > 25) falla(`${f}: "name" de ${d.name.length} caracteres, el máximo es 25`);
  revisaAjustes(f, d.settings);
  const tipos = new Set();
  for (const b of d.blocks || []) {
    for (const k of Object.keys(b)) if (!BLOQUE_ENTRADA.has(k)) falla(`${f}: el bloque "${b.type}" usa "${k}"`);
    if (!b.type) falla(`${f}: hay un bloque sin "type"`);
    if (b.type && !b.type.startsWith('@')) tipos.add(b.type);
    revisaAjustes(`${f} › bloque ${b.type}`, b.settings);
  }
  for (const p of d.presets || []) {
    for (const k of Object.keys(p)) if (!PRESET.has(k)) falla(`${f}: el preset "${p.name}" usa "${k}"`);
    for (const b of p.blocks || []) {
      if (b.type && tipos.size && !tipos.has(b.type)) falla(`${f}: el preset usa el bloque "${b.type}", que la sección no declara`);
    }
  }
}

/* El caso concreto que rompió al guardar en la tienda.
 * `max_blocks` está documentado y Horizon lo usa, así que ni theme-check ni el
 * contraste con Horizon lo detectan. La diferencia está en con qué se combina:
 * Horizon solo lo pone en secciones cuyos bloques son referencias a archivos de
 * blocks/ ({"type": "x"} a secas). En una sección que define sus bloques en
 * línea —con "name" y "settings" dentro del propio schema— el servidor lo
 * rechaza al guardar con «'max_blocks' is not a valid attribute». */
for (const [f, d] of secciones) {
  const enLinea = (d.blocks || []).some((b) => b.settings || b.name);
  if (d.max_blocks != null && enLinea) {
    falla(`${f}: max_blocks junto a bloques definidos en línea. Shopify lo rechaza al guardar. ` +
          `Quítalo y pon el número recomendado en el texto del editor.`);
  }
}

for (const [f, d] of bloques) {
  for (const k of Object.keys(d)) if (!BLOQUE_ARCHIVO.has(k)) falla(`${f}: "${k}" no es un atributo de un archivo de blocks/`);
  if (d.enabled_on || d.disabled_on) falla(`${f}: enabled_on y disabled_on no valen en blocks/`);
  if (d.max_blocks) falla(`${f}: max_blocks no vale en blocks/`);
  if (d.name && d.name.length > 25) falla(`${f}: "name" de ${d.name.length} caracteres, el máximo es 25`);
  revisaAjustes(f, d.settings);
}

/* --- 2 · contraste con lo que Horizon usa de verdad --- */
if (HORIZON && fs.existsSync(HORIZON)) {
  const atributosHorizon = new Set();
  const tiposHorizon = new Set();
  for (const dir of ['sections', 'blocks']) {
    const d = path.join(HORIZON, dir);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) {
      if (!f.endsWith('.liquid')) continue;
      const m = fs.readFileSync(path.join(d, f), 'utf8').match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
      if (!m) continue;
      let s; try { s = JSON.parse(m[1]); } catch { continue; }
      Object.keys(s).forEach((k) => atributosHorizon.add(k));
      const recoge = (l) => (l || []).forEach((x) => x.type && tiposHorizon.add(x.type));
      recoge(s.settings);
      (s.blocks || []).forEach((b) => recoge(b.settings));
    }
  }
  const mios = new Set();
  const tiposMios = new Set();
  for (const [, d] of [...secciones, ...bloques]) {
    Object.keys(d).forEach((k) => mios.add(k));
    const recoge = (l) => (l || []).forEach((x) => x.type && tiposMios.add(x.type));
    recoge(d.settings);
    (d.blocks || []).forEach((b) => recoge(b.settings));
  }
  for (const k of mios) {
    if (!atributosHorizon.has(k)) avisa(`uso el atributo de schema "${k}" y Horizon no lo usa en ningún archivo`);
  }
  for (const t of tiposMios) {
    if (!tiposHorizon.has(t)) avisa(`uso el tipo de ajuste "${t}" y Horizon no lo usa en ningún archivo`);
  }
  /* Ningún archivo del paquete puede pisar uno del tema: si un nombre
     coincidiera, instalarlo sobrescribiría un archivo de Horizon en silencio y
     el siguiente update del tema se llevaría por delante lo nuestro. */
  let colisiones = 0;
  for (const dir of ['sections', 'blocks', 'snippets', 'assets', 'templates']) {
    const mio = path.join(ROOT, dir);
    const suyo = path.join(HORIZON, dir);
    if (!fs.existsSync(mio) || !fs.existsSync(suyo)) continue;
    for (const f of fs.readdirSync(mio)) {
      if (fs.existsSync(path.join(suyo, f))) { falla(`${dir}/${f} pisaría un archivo del propio Horizon`); colisiones++; }
    }
  }
  console.log(`  (contrastado contra ${atributosHorizon.size} atributos y ${tiposHorizon.size} tipos de ajuste del Horizon real` +
              `${colisiones === 0 ? ', sin colisiones de nombre' : ''})`);
} else {
  avisa('sin clon de Horizon: solo se comprobó contra la documentación');
}

console.log(fallos === 0
  ? `Pasada 1b · schemas: sin fallos${avisos ? ` (${avisos} avisos)` : ''}`
  : `Pasada 1b: ${fallos} fallos`);
