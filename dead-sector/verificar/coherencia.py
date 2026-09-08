#!/usr/bin/env python3
"""Comprobaciones que el verificador de tipos no puede hacer.

Luau valida que un número sea un número. No valida que el material que el
Sector 5 promete exista en la economía, ni que el gamepass que una clase
referencia esté en el catálogo, ni que un sistema que está en la carpeta llegue
a arrancar. Eso es lo que se mira acá.

Se lee el texto de los .luau con expresiones regulares a propósito: ejecutar
Luau exigiría un runtime de Roblox que en un servidor de integración no existe.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG = os.path.join(ROOT, "ReplicatedStorage", "Config")
SYSTEMS = os.path.join(ROOT, "ServerScriptService", "Systems")
ZOMBIES = os.path.join(ROOT, "ServerScriptService", "Zombies")
CONTROLLERS = os.path.join(ROOT, "StarterPlayerScripts", "Controllers")

# Carpetas de código de juego, donde manda la regla 8. Benchmark/ queda fuera a
# propósito: es una herramienta de medición, no juego, y sus umbrales tienen que
# estar donde se leen para poder discutirlos.
CODIGO_DE_JUEGO = (SYSTEMS, ZOMBIES, CONTROLLERS)

# Un literal aceptable fuera de Config. 0 y 1 son el neutro y la unidad, y 2 es
# partir por la mitad o saltar el primer elemento: ninguno es un número de
# balance. Cualquier otro tiene que estar en Config o ser una constante con
# nombre en mayúsculas al principio del archivo, que es lo que separa un valor
# explicado de un número mágico.
LITERALES_LIBRES = {"0", "1", "2"}

fallos = []
avisos = []


def leer(path):
    with open(path, encoding="utf-8") as handle:
        return handle.read()


def sin_comentarios(texto):
    """Quita bloques --[[ ]] y comentarios de línea, conservando los saltos."""
    texto = re.sub(r"--\[\[.*?\]\]", lambda m: "\n" * m.group(0).count("\n"), texto, flags=re.S)
    return re.sub(r"--[^\n]*", "", texto)


def fallo(mensaje):
    fallos.append(mensaje)


def aviso(mensaje):
    avisos.append(mensaje)


# ---------------------------------------------------------------------------
# 1. Todo sistema de la carpeta arranca, y todo lo que arranca existe
# ---------------------------------------------------------------------------
bootstrap = leer(os.path.join(ROOT, "ServerScriptService", "Bootstrap.server.luau"))
orden = re.search(r"local ORDER: \{ string \} = \{(.*?)\}", bootstrap, re.S)
if not orden:
    fallo("Bootstrap.server.luau: no se encontró la lista ORDER")
    orden_nombres = []
else:
    orden_nombres = re.findall(r'"([A-Za-z]+)"', orden.group(1))

en_disco = sorted(f[:-5] for f in os.listdir(SYSTEMS) if f.endswith(".luau"))

for nombre in orden_nombres:
    if nombre not in en_disco:
        fallo(f"ORDER menciona el sistema {nombre} y no hay archivo Systems/{nombre}.luau")
for nombre in en_disco:
    if nombre not in orden_nombres:
        fallo(f"Systems/{nombre}.luau existe pero no está en ORDER: no arrancaría nunca")

# Data antes de todo lo que lee el perfil; Combat después de armas y zombis.
def antes(a, b):
    return a in orden_nombres and b in orden_nombres and orden_nombres.index(a) < orden_nombres.index(b)

for despues_de_data in ("Progression", "Weapons", "Economy", "Perks", "Classes", "Safehouse", "Contracts"):
    if not antes("Data", despues_de_data):
        fallo(f"ORDER: Data tiene que arrancar antes que {despues_de_data}")
for antes_de_combat in ("Weapons", "ZombieAI", "Economy"):
    if not antes(antes_de_combat, "Combat"):
        fallo(f"ORDER: {antes_de_combat} tiene que arrancar antes que Combat")

# ---------------------------------------------------------------------------
# 2. Toda configuración está en el índice y sale congelada
# ---------------------------------------------------------------------------
indice = leer(os.path.join(CONFIG, "Index.luau"))
en_indice = set(re.findall(r"require\(script\.Parent\.([A-Za-z]+)\)", indice))
modulos_config = sorted(
    f[:-5] for f in os.listdir(CONFIG) if f.endswith(".luau") and f not in ("Index.luau", "Freeze.luau")
)

for nombre in modulos_config:
    if nombre not in en_indice:
        fallo(f"Config/{nombre}.luau no está en Config/Index.luau")
    cuerpo = leer(os.path.join(CONFIG, f"{nombre}.luau"))
    if not re.search(r"return Freeze\(", cuerpo):
        fallo(f"Config/{nombre}.luau no devuelve Freeze(...): se podría modificar en caliente")

for nombre in en_indice:
    if nombre not in modulos_config:
        fallo(f"Config/Index.luau requiere {nombre}, que no existe")

# ---------------------------------------------------------------------------
# 3. Los datos cruzados entre configuraciones cuadran
# ---------------------------------------------------------------------------
sectores_txt = leer(os.path.join(CONFIG, "Sectors.luau"))
zombis_txt = leer(os.path.join(CONFIG, "ZombieAI.luau"))
economia_txt = leer(os.path.join(CONFIG, "Economy.luau"))
armas_txt = leer(os.path.join(CONFIG, "Weapons.luau"))
clases_txt = leer(os.path.join(CONFIG, "Classes.luau"))
monetizacion_txt = leer(os.path.join(CONFIG, "Monetisation.luau"))

sectores = re.findall(
    r"Id = (\d+),\s*\n\s*DisplayName = \"([^\"]+)\",\s*\n\s*BreachThreshold = (\d+),"
    r"\s*\n\s*IntroducesZombie = \"([^\"]+)\",\s*\n\s*Material = \"([^\"]+)\"",
    sectores_txt,
)
if len(sectores) != 8:
    fallo(f"Config/Sectors: se esperaban 8 sectores y se leyeron {len(sectores)}")

tipos_zombi = set(re.findall(r"^\t\t([A-Z][A-Za-z]*) = \{", zombis_txt, re.M))
planeados = set(re.findall(r'\{ Id = "([A-Za-z]+)"', zombis_txt))
todos_los_zombis = tipos_zombi | planeados

materiales_economia = set(re.findall(r"^\t\t([A-Z][A-Za-z]*) = \d+,", economia_txt, re.M))

umbral_previo = -1
for id_txt, nombre, umbral_txt, zombi, material in sectores:
    umbral = int(umbral_txt)
    if umbral <= umbral_previo:
        fallo(f"Sector {id_txt} ({nombre}): el umbral {umbral} no supera al del sector anterior")
    umbral_previo = umbral
    if zombi not in todos_los_zombis:
        fallo(f"Sector {id_txt} introduce el zombi '{zombi}', que no está en Config/ZombieAI")
    if material not in materiales_economia:
        fallo(f"Sector {id_txt} da el material '{material}', que no está en Economy.MaterialSector")

if sectores and int(sectores[0][2]) != 0:
    fallo("El Sector 1 tiene que estar siempre abierto: su umbral debe ser 0")

# El material que pide cada tier de arma tiene que caer en algún sector
for material in re.findall(r'Material = "([A-Za-z]+)"', armas_txt):
    if material not in materiales_economia:
        fallo(f"Config/Weapons pide el material '{material}', que no cae en ningún sector")

# El arma inicial existe en el catálogo
inicial = re.search(r'StartingWeapon = "([a-z0-9_]+)"', armas_txt)
if inicial and not re.search(rf"\n\t\t{re.escape(inicial.group(1))} = \{{", armas_txt):
    fallo(f"Config/Weapons.StartingWeapon apunta a '{inicial.group(1)}', que no está en el catálogo")

# Cada clase pagada referencia un gamepass real
gamepasses = set(re.findall(r'Key = "([A-Za-z]+)"', monetizacion_txt))
for clave in re.findall(r'GamepassKey = "([A-Za-z]+)"', clases_txt):
    if clave not in gamepasses:
        fallo(f"Config/Classes referencia el gamepass '{clave}', que no está en Config/Monetisation")

# Regla del informe: sidegrades. Una clase sin Tradeoff no está diseñada.
clases = re.findall(r'Id = "([A-Za-z]+)",\s*\n\s*DisplayName', clases_txt)
tradeoffs = re.findall(r"Tradeoff = \"", clases_txt)
if len(clases) != len(tradeoffs):
    fallo(f"Config/Classes: {len(clases)} clases y {len(tradeoffs)} campos Tradeoff. Cada clase declara a qué renuncia")

# ---------------------------------------------------------------------------
# 4. Reglas duras del CLAUDE.md que se pueden comprobar leyendo
# ---------------------------------------------------------------------------
# Rule 8: ningún número de juego fuera de Config
for carpeta in CODIGO_DE_JUEGO:
    if not os.path.isdir(carpeta):
        continue
    for archivo in sorted(os.listdir(carpeta)):
        if not archivo.endswith(".luau"):
            continue
        codigo = sin_comentarios(leer(os.path.join(carpeta, archivo)))
        lineas = codigo.split("\n")
        for indice, linea_txt in enumerate(lineas, start=1):
            # Una constante con nombre en mayúsculas está explicada por su nombre.
            if re.match(r"\s*local [A-Z][A-Z0-9_]* =", linea_txt):
                continue
            for m in re.finditer(r"(?<![\w.])\d+(\.\d+)?(?![\w.])", linea_txt):
                if m.group(0) in LITERALES_LIBRES:
                    continue
                fallo(
                    f"{os.path.basename(carpeta)}/{archivo}:{indice}: número {m.group(0)} "
                    f"fuera de Config y sin nombre (regla 8)"
                )

# Rule 1 y 2: el cliente no calcula. Nada de daño ni de contador en el cliente.
prohibido_cliente = ("TakeDamage", "Humanoid.Health =", "BreachKills", "AddScrap", "GrantXp")
for archivo in sorted(os.listdir(CONTROLLERS)) + ["../Bootstrap.client.luau"]:
    ruta = os.path.join(CONTROLLERS, archivo)
    if not os.path.exists(ruta) or not ruta.endswith(".luau"):
        continue
    codigo = sin_comentarios(leer(ruta))
    for prohibido in prohibido_cliente:
        if prohibido in codigo:
            fallo(f"cliente/{archivo}: usa '{prohibido}'. El cliente no calcula resultados (reglas 1 y 2)")

# Rule 2: la baja es el único camino al contador. ZombieAI emite y no reparte.
zombie_ai = leer(os.path.join(SYSTEMS, "ZombieAI.luau"))
if "OnZombieKilled" not in zombie_ai:
    fallo("Systems/ZombieAI: no emite OnZombieKilled. Es la única entrada legítima al contador de brecha")
for reparto in ("AddScrap", "GrantXp", "BreachKills +=", "Breach.Add"):
    if reparto in sin_comentarios(zombie_ai):
        fallo(f"Systems/ZombieAI: reparte recompensas ('{reparto}'). Solo debe emitir la baja (regla 1)")

# Rule 7: un solo bucle. Ninguna otra conexión por frame en el código de juego.
for carpeta in (SYSTEMS, ZOMBIES):
    if not os.path.isdir(carpeta):
        continue
    for archivo in sorted(os.listdir(carpeta)):
        if not archivo.endswith(".luau"):
            continue
        codigo = sin_comentarios(leer(os.path.join(carpeta, archivo)))
        conexiones = re.findall(r"RunService\.(Heartbeat|Stepped|RenderStepped):Connect", codigo)
        if conexiones and archivo != "ZombieAI.luau":
            fallo(f"{os.path.basename(carpeta)}/{archivo}: se conecta a un evento por frame. Solo ZombieAI tiene bucle (regla 7)")
        if archivo == "ZombieAI.luau" and len(conexiones) > 1:
            fallo(f"Systems/ZombieAI: {len(conexiones)} conexiones por frame. Tiene que ser una sola (regla 7)")

# Las cuatro banderas obligatorias en cada parte de zombi.
pool = leer(os.path.join(ZOMBIES, "Pool.luau")) if os.path.isdir(ZOMBIES) else ""
for bandera in ("CanCollide", "CanQuery", "CanTouch", "CastShadow"):
    if not re.search(rf"{bandera} = false", pool):
        fallo(f"Zombies/Pool: la parte del zombi no pone {bandera} en false (Prompt 1)")
if "BulkMoveTo" not in leer(os.path.join(SYSTEMS, "ZombieAI.luau")):
    fallo("Systems/ZombieAI: no usa la API de movimiento masivo (Prompt 1)")

# Rule 4: sin PvP en ninguna parte
for base, _, archivos in os.walk(ROOT):
    if "/.git" in base or "verificar" in base:
        continue
    for archivo in archivos:
        if not archivo.endswith(".luau"):
            continue
        codigo = sin_comentarios(leer(os.path.join(base, archivo)))
        if re.search(r"\bPvP\b|PlayerVsPlayer|FriendlyFire", codigo, re.I):
            fallo(f"{archivo}: aparece una vía de jugador contra jugador (regla 4)")

# ---------------------------------------------------------------------------
# 5. El contrato de red: nombres declarados y nombres creados coinciden
# ---------------------------------------------------------------------------
remotes_txt = leer(os.path.join(ROOT, "ReplicatedStorage", "Remotes.luau"))
declarados = set()
for bloque in re.findall(r"export type (?:ClientToServer|ServerToClient) =(.*?)\n\n", remotes_txt, re.S):
    declarados |= set(re.findall(r'"([A-Za-z]+)"', bloque))
lista = re.search(r"local NAMES: \{ RemoteName \} = \{(.*?)\n\}", remotes_txt, re.S)
creados = set(re.findall(r'"([A-Za-z]+)"', lista.group(1))) if lista else set()

for nombre in sorted(declarados - creados):
    fallo(f"Remotes: '{nombre}' está en el tipo pero no en NAMES: nunca se crearía")
for nombre in sorted(creados - declarados):
    fallo(f"Remotes: '{nombre}' está en NAMES pero no en el tipo: no se puede pedir sin error de tipos")

if "RemoteFunction" in sin_comentarios(remotes_txt):
    fallo("Remotes: hay un RemoteFunction. Ceden el hilo del servidor al cliente (Prompt 9)")

# ---------------------------------------------------------------------------
# 6. Números que todavía no son mediciones
# ---------------------------------------------------------------------------
pendientes = 0
for nombre in modulos_config:
    pendientes += len(re.findall(r"-- TUNE", leer(os.path.join(CONFIG, f"{nombre}.luau"))))
aviso(f"{pendientes} números marcados TUNE: son puntos de partida, no mediciones")

ids_cero = len(re.findall(r"AssetId = 0", monetizacion_txt))
if ids_cero:
    aviso(f"{ids_cero} ids de Roblox en 0: se rellenan al crear cada producto en el Creator Dashboard")

# ---------------------------------------------------------------------------
# Resultado
# ---------------------------------------------------------------------------
for mensaje in avisos:
    print(f"  aviso · {mensaje}")
for mensaje in fallos:
    print(f"  FALLO · {mensaje}")

if fallos:
    print(f"\n{len(fallos)} fallo(s) de coherencia")
    sys.exit(1)

print(f"\nCoherencia correcta · {len(orden_nombres)} sistemas · {len(modulos_config)} configuraciones · {len(sectores)} sectores")
sys.exit(0)
