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

**Prompt 0 completo: esqueleto y configuración.** No hay lógica de juego todavía
—eso es deliberado— pero el proyecto arranca, los sistemas se cargan en orden y
la configuración está entera y validada.

Lo siguiente es el Prompt 1, la IA de zombis, que es el sistema que decide si el
servidor aguanta. Antes de eso hace falta el blockout del Sector 1 hecho a mano
en Studio, porque sin espacio no hay dónde medir.

## Estructura

Las carpetas de arriba se llaman como los servicios de Studio porque Script Sync
empareja por nombre. `default.project.json` mapea el mismo árbol para Rojo si
hiciera falta.

```
ReplicatedStorage/          -> ReplicatedStorage
  Types.luau                   tipos compartidos: la forma de todo lo que cruza
  Remotes.luau                 el contrato de red. Sin RemoteFunctions
  Config/                      todos los números tuneables, congelados al cargar
ServerScriptService/        -> ServerScriptService
  Bootstrap.server.luau        el único Script del servidor. Init a todos, luego Start
  Systems/                     14 sistemas, todos con autoridad de servidor
StarterPlayerScripts/       -> StarterPlayerScripts
  Bootstrap.client.luau        el único LocalScript
  Controllers/                 entrada, interfaz, efectos y predicción. Nada más
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

`MaxLive = 40` es el más importante de los que faltan: el Prompt 1 tiene que
entregar el número real que mantiene el frame time del servidor bajo 16 ms, con
la medición delante.

Los `AssetId = 0` de `Config/Monetisation` son ids de Roblox sin crear todavía.
El arranque del servidor avisa por consola de cada uno, porque un id inventado
compila igual y falla en producción.

## Verificar

```bash
python3 verificar/coherencia.py
```

Y el verificador de tipos, que necesita descargarse una vez: ver
`verificar/README.md`. Las dos pasadas están en verde.

## Antes de tocar nada

Lee `CLAUDE.md`. Si vas a cambiar daño, moneda, el contador de brecha o el
DataStore, dilo en voz alta y enumera qué podría intentar mandar un cliente
malicioso. Es la parte del proyecto donde un error no se ve hasta que ya pasó.
