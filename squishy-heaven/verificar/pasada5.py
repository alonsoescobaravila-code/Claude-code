# Pasada 5 — contenido, documentación y paquete.
import re, json, os, glob, subprocess

ROOT = '/home/user/Claude-code/squishy-heaven'
os.chdir(ROOT)
fallos = []
def falla(m):
    fallos.append(m); print('  FALLO ' + m)

# --- a) nombres de schema citados en la guía vs los reales ---
reales = {}
for f in glob.glob('sections/*.liquid') + glob.glob('blocks/*.liquid'):
    s = open(f, encoding='utf-8').read()
    m = re.search(r'\{%\s*schema\s*%\}(.*?)\{%\s*endschema\s*%\}', s, re.S)
    sch = json.loads(m.group(1))
    reales[os.path.basename(f)] = sch['name']
    if len(sch['name']) > 25:
        falla(f"{f}: nombre de {len(sch['name'])} caracteres, el máximo de Shopify es 25")

inst = open('INSTALAR.md', encoding='utf-8').read()
readme = open('README.md', encoding='utf-8').read()
for fila in re.finditer(r'\|\s*`(sh-[a-z-]+\.liquid)`\s*\|\s*(SH · [^|]+?)\s*\|', inst):
    a, c = fila.group(1), fila.group(2)
    if a not in reales: falla(f'INSTALAR cita {a}, que no existe')
    elif reales[a] != c: falla(f'INSTALAR dice "{c}" para {a}; el schema dice "{reales[a]}"')

# --- b) enlaces entre documentos ---
for doc in ['README.md', 'INSTALAR.md'] + glob.glob('docs/*.md'):
    base = os.path.dirname(doc)
    for l in re.finditer(r'\]\(([^)#][^)]*)\)', open(doc, encoding='utf-8').read()):
        d = os.path.normpath(os.path.join(base, l.group(1)))
        if not os.path.exists(d): falla(f'{doc}: enlace roto → {l.group(1)}')

# --- c) todo archivo del tema documentado en ambas guías ---
for carpeta in ['assets', 'snippets', 'sections', 'blocks', 'templates']:
    for f in sorted(os.listdir(carpeta)):
        if f not in readme: falla(f'{carpeta}/{f} no aparece en README.md')
        if f not in inst:   falla(f'{carpeta}/{f} no aparece en INSTALAR.md')

# --- d) conteos citados en la documentación ---
n = {c: len(os.listdir(c)) for c in ['assets', 'snippets', 'sections', 'blocks', 'templates']}
for carpeta, etiqueta in [('assets', 'assets'), ('snippets', 'snippets'), ('sections', 'sections'), ('blocks', 'blocks'), ('templates', 'templates')]:
    m = re.search(rf'### `{etiqueta}/` — (\d+) archivos', inst)
    if m and int(m.group(1)) != n[carpeta]:
        falla(f'INSTALAR dice {m.group(1)} archivos en {carpeta}/ y hay {n[carpeta]}')
m = re.search(r'Las \*\*(\d+) secciones y los (\d+) bloques\*\*', readme)
if m and (int(m.group(1)) != n['sections'] or int(m.group(2)) != n['blocks']):
    falla(f"README dice {m.group(1)} secciones y {m.group(2)} bloques; hay {n['sections']} y {n['blocks']}")

# --- e) pasos de INSTALAR consecutivos ---
pasos = [int(x) for x in re.findall(r'^## Paso (\d+) ·', inst, re.M)]
if pasos != list(range(0, len(pasos))): falla(f'pasos de INSTALAR desordenados: {pasos}')

# --- f) el orden documentado coincide con el de la plantilla ---
tpl = json.load(open('templates/index.squishy-heaven.json', encoding='utf-8'))
if len(tpl['order']) != len(set(tpl['order'])): falla('la home repite una sección en "order"')
doc_orden = re.findall(r'^\d+\. \*\*([^*]+)\*\*', readme, re.M)
if len(doc_orden) != len(tpl['order']):
    falla(f"README describe {len(doc_orden)} secciones de la home y la plantilla trae {len(tpl['order'])}")

# --- g) tamaños citados vs reales ---
for archivo, patron in [('assets/sh-squishy.css', r'CSS (\d+),(\d+) KB'), ('assets/sh-interactivo.js', r'JS (\d+),(\d+) KB')]:
    real = int(subprocess.run(f'gzip -9 -c {archivo} | wc -c', shell=True, capture_output=True, text=True).stdout)
    m = re.search(patron, readme)
    if m:
        citado = float(f'{m.group(1)}.{m.group(2)}') * 1000
        if abs(citado - real) > 400:
            falla(f'README dice {m.group(1)},{m.group(2)} KB para {archivo} y son {real/1000:.1f} KB')

# --- h) ningún número inventado en los valores por defecto ---
for f in glob.glob('sections/*.liquid') + glob.glob('blocks/*.liquid'):
    s = open(f, encoding='utf-8').read()
    m = re.search(r'\{%\s*schema\s*%\}(.*?)\{%\s*endschema\s*%\}', s, re.S)
    # Solo cuenta lo que acaba en la tienda: los "default". Un "content" o un
    # "info" que dice «no escribas certificado» es justo lo contrario.
    sch = json.loads(m.group(1))
    salida = []
    def recoge(lista):
        for x in (lista or []):
            if isinstance(x.get('default'), str): salida.append(x['default'])
    recoge(sch.get('settings'))
    for bloque in sch.get('blocks', []): recoge(bloque.get('settings'))
    for preset in sch.get('presets', []):
        salida += [str(v) for v in (preset.get('settings') or {}).values()]
        for bl in preset.get('blocks', []): salida += [str(v) for v in (bl.get('settings') or {}).values()]
    txt = ' '.join(salida)
    for claim in ['no tóxico', 'certificado', '100% garantizado', 'eco-friendly', 'vegano',
                  '¡Solo hoy', 'Últimas unidades', 'dropshipping', 'Aliexpress']:
        if claim.lower() in txt.lower(): falla(f'{f}: claim sin respaldo en un texto por defecto → "{claim}"')

# la calificación del hero y el promedio de reseñas vienen apagados
idx = json.dumps(tpl, ensure_ascii=False)
if '"show_rating": true' in idx: falla('la plantilla enciende la calificación del hero')
if '"show_average": true' in idx: falla('la plantilla enciende el promedio de reseñas')

# --- i) el paquete no lleva basura ---
zipl = subprocess.run('unzip -Z1 ../squishy-heaven-shopify-horizon.zip', shell=True, capture_output=True, text=True).stdout.split()
basura = [x for x in zipl if re.search(r'\.DS_Store|__MACOSX|\.map$|node_modules|\.log$|\.bak$', x)]
if basura: falla(f'el ZIP lleva archivos que sobran: {basura}')
enZip = {x.split('squishy-heaven/', 1)[1] for x in zipl if '/' in x and not x.endswith('/')}
enDisco = set()
for r, _, fs_ in os.walk('.'):
    for f in fs_:
        enDisco.add(os.path.relpath(os.path.join(r, f), '.'))
if enZip != enDisco:
    falla(f'el ZIP no coincide con la carpeta · solo en ZIP: {enZip - enDisco} · solo en disco: {enDisco - enZip}')

# --- j) textos: sin dobles espacios ni comillas rectas en la documentación ---
for doc in ['README.md', 'INSTALAR.md'] + glob.glob('docs/*.md'):
    dentro = False  # los bloques de código alinean en columnas a propósito
    for i, linea in enumerate(open(doc, encoding='utf-8'), 1):
        if linea.lstrip().startswith('```'): dentro = not dentro; continue
        if dentro or linea.startswith('|') or linea.startswith('  '): continue
        if re.search(r'\S {2,}\S', linea):
            falla(f'{doc}:{i}: doble espacio en medio de una frase')

print('Pasada 5 · contenido y paquete: sin fallos' if not fallos else f'Pasada 5: {len(fallos)} fallos')
