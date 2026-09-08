// Cruza cada plantilla JSON contra el schema de la sección que usa.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/home/user/Claude-code/squishy-heaven';

function schemaOf(file) {
  const src = fs.readFileSync(file, 'utf8');
  const m = src.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
  if (!m) return null;
  try { return JSON.parse(m[1]); }
  catch (e) { console.log('JSON INVÁLIDO en schema de', path.basename(file), '→', e.message); return null; }
}

const schemas = {};
for (const dir of ['sections', 'blocks']) {
  for (const f of fs.readdirSync(path.join(ROOT, dir))) {
    if (!f.endsWith('.liquid')) continue;
    const s = schemaOf(path.join(ROOT, dir, f));
    if (!s) { console.log('SIN SCHEMA:', dir + '/' + f); continue; }
    schemas[f.replace('.liquid', '')] = s;
  }
}

function ids(list) { return new Set((list || []).filter(x => x.id).map(x => x.id)); }

let fallos = 0;
for (const f of fs.readdirSync(path.join(ROOT, 'templates'))) {
  const tpl = JSON.parse(fs.readFileSync(path.join(ROOT, 'templates', f), 'utf8'));
  for (const [nombre, sec] of Object.entries(tpl.sections)) {
    const sch = schemas[sec.type];
    if (!sch) { console.log(`FALLO ${f} · sección "${nombre}" usa "${sec.type}" que no existe`); fallos++; continue; }
    const permitidos = ids(sch.settings);
    for (const k of Object.keys(sec.settings || {})) {
      if (!permitidos.has(k)) { console.log(`FALLO ${f} · ${nombre}: ajuste "${k}" no está en el schema de ${sec.type}`); fallos++; }
    }
    const tiposBloque = {};
    for (const b of sch.blocks || []) tiposBloque[b.type] = ids(b.settings);
    for (const [bid, b] of Object.entries(sec.blocks || {})) {
      if (!(b.type in tiposBloque)) { console.log(`FALLO ${f} · ${nombre}/${bid}: tipo de bloque "${b.type}" no existe en ${sec.type}`); fallos++; continue; }
      for (const k of Object.keys(b.settings || {})) {
        if (!tiposBloque[b.type].has(k)) { console.log(`FALLO ${f} · ${nombre}/${bid}: ajuste "${k}" no está en el bloque "${b.type}"`); fallos++; }
      }
    }
    // orden coherente
    for (const bid of sec.block_order || []) {
      if (!(sec.blocks || {})[bid]) { console.log(`FALLO ${f} · ${nombre}: block_order menciona "${bid}" inexistente`); fallos++; }
    }
  }
  for (const n of tpl.order || []) {
    if (!tpl.sections[n]) { console.log(`FALLO ${f} · order menciona "${n}" inexistente`); fallos++; }
  }
}

// presets: sus ajustes también deben existir
for (const [nombre, sch] of Object.entries(schemas)) {
  const permitidos = ids(sch.settings);
  const tiposBloque = {};
  for (const b of sch.blocks || []) tiposBloque[b.type] = ids(b.settings);
  for (const p of sch.presets || []) {
    for (const k of Object.keys(p.settings || {})) {
      if (!permitidos.has(k)) { console.log(`FALLO preset de ${nombre}: ajuste "${k}" no existe`); fallos++; }
    }
    for (const b of p.blocks || []) {
      if (!(b.type in tiposBloque)) { console.log(`FALLO preset de ${nombre}: bloque "${b.type}" no existe`); fallos++; continue; }
      for (const k of Object.keys(b.settings || {})) {
        if (!tiposBloque[b.type].has(k)) { console.log(`FALLO preset de ${nombre}: ajuste "${k}" del bloque "${b.type}" no existe`); fallos++; }
      }
    }
  }
  if (!sch.name) { console.log(`FALLO ${nombre}: schema sin "name"`); fallos++; }
  if (sch.name && sch.name.length > 25) { console.log(`FALLO ${nombre}: "name" de ${sch.name.length} caracteres, el máximo es 25`); fallos++; }
}

console.log(fallos === 0 ? 'Cruce plantillas ↔ schemas: sin fallos' : `Cruce: ${fallos} fallos`);
