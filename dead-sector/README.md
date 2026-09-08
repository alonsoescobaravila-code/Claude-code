# DEAD SECTOR

Supervivencia zombi cooperativa para Roblox. Dos progresiones corriendo en
paralelo: la tuya, que es permanente, y la del servidor entero, que se reinicia
cada sesión.

Matas, subes de nivel y subes de nivel el arma. Cada baja también suma al
contador de brecha del servidor, y cuando el servidor entero llega al umbral, el
sector siguiente se abre para todos los que estén dentro. La progresión personal
es la razón de volver mañana; la brecha es la razón de quedarse cinco minutos
más hoy.

## Estado

**Prompt 0 completo** — esqueleto, tipos y configuración.

**Prompt 1 escrito, sin medir** — la IA de zombis: un solo bucle a paso fijo,
tres bandas de coste según la distancia, reserva de instancias, reparto de
peticiones de ruta y movimiento en bloque. Falta lo único que no se puede hacer
fuera de Studio: correr el benchmark y sacar el número real de zombis que el
servidor aguanta. Hasta entonces `MaxLive = 40` es el objetivo del plan, no una
medición. Está todo en [docs/prompt-1-ia-de-zombis.md](docs/prompt-1-ia-de-zombis.md).

**Prompt 2 escrito, sin probar con gente** — el combate: hitscan, predicción en
el cliente, rebobinado en el servidor y una cadena de trece comprobaciones antes
de aplicar un solo punto de daño. El análisis de qué intentaría un tramposo y qué
lo para —con sus huecos declarados— está en
[docs/prompt-2-combate.md](docs/prompt-2-combate.md).

Lo siguiente, en este orden: blockout del Sector 1 a mano en Studio, medir sobre
él, ajustar los márgenes del combate jugando, y entonces el Prompt 3 (sectores y
brecha colectiva).

## Estructura

Las carpetas de arriba se llaman como los servicios de Studio porque Script Sync
empareja por nombre. `default.project.json` mapea el mismo árbol para Rojo si
hiciera falta.

```
ReplicatedStorage/          -> ReplicatedStorage
  Types.luau                   tipos compartidos: la forma de todo lo que cruza
  Remotes.luau                 el contrato de red. Sin RemoteFunctions
  Signal.luau                  aviso de un sistema a otro sin que se conozcan
  Config/                      todos los números tuneables, congelados al cargar
ServerScriptService/        -> ServerScriptService
  Bootstrap.server.luau        el único Script del servidor. Init a todos, luego Start
  Systems/                     14 sistemas, todos con autoridad de servidor
  Zombies/                     la entidad, la reserva y el reparto de rutas
  Combat/                      munición por jugador y techo de peticiones
  Benchmark/                   se llama a mano desde Studio. No arranca solo
StarterPlayerScripts/       -> StarterPlayerScripts
  Bootstrap.client.luau        el único LocalScript
  Controllers/                 entrada, interfaz, efectos y predicción. Nada más
docs/                          por qué de cada prompt, y qué quedó pendiente
verificar/                     las dos pasadas. No se sube a Studio
```

## Las reglas

Están en `CLAUDE.md` y se cargan en cada sesión de Claude Code. Las tres que
explican casi todas las decisiones de este repositorio:

1. **El servidor calcula, el cliente pide.** Daño, XP, chatarra, niveles de arma
   y contador de brecha se calculan en el servidor, desde bajas que el propio
   servidor validó. El cliente manda intención —«disparé hacia acá en este
   instante»— y nunca resultados.
2. **Un solo bucle para todos los zombis, con un tope duro.** Nunca un script por
   zombi. El tope de `Config/ZombieAI.MaxLive` no se negocia: es lo que separa un
   servidor que va de uno que se ahoga.
3. **Ningún número de juego fuera de `Config/`.** Un número suelto en un sistema
   es un número que nadie va a encontrar cuando haya que tunear el balance.

## Los números

Cada uno lleva de dónde viene:

- `SOURCE: informe` — viene del documento de diseño. Cambiarlo es una decisión de
  diseño, no un ajuste.
- `TUNE (Prompt N)` — punto de partida para que el esqueleto compile. No está
  medido. El prompt que se indica es el que tiene que reemplazarlo por un valor
  real. Hoy hay 108.

`MaxLive = 40` es el más importante de los que faltan. El benchmark ya está
escrito y explica por qué el criterio no puede ser «la media bajó de 16 ms»: el
servidor de Roblox ya corre a 60 Hz cuando puede, así que ese número sale solo
incluso vacío. Lo que se mide es si se mantiene.

Los `AssetId = 0` de `Config/Monetisation` son ids de Roblox sin crear todavía.
El arranque del servidor avisa por consola de cada uno, porque un id inventado
compila igual y falla en producción.

## Verificar

```bash
python3 verificar/coherencia.py
```

Y el verificador de tipos, que necesita descargarse una vez: ver
`verificar/README.md`. Las dos pasadas están en verde.

Los errores del verificador de tipos salen por la salida de error, no por la
estándar. Si la rediriges a /dev/null, una ejecución con fallos parece limpia.

## Antes de tocar nada

Lee `CLAUDE.md`. Si vas a cambiar daño, moneda, el contador de brecha o el
DataStore, dilo en voz alta y enumera qué podría intentar mandar un cliente
malicioso. Es la parte del proyecto donde un error no se ve hasta que ya pasó.
