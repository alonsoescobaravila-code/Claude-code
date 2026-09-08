# Verificación

Dos pasadas. Ninguna necesita Roblox Studio, así que se pueden correr desde
cualquier máquina y antes de abrir Studio.

| | Qué mira | Cómo |
| --- | --- | --- |
| 1 | Tipos de Luau con la API de Roblox resuelta | `luau-lsp analyze` |
| 2 | Coherencia entre archivos, y las reglas del CLAUDE.md | `coherencia.py` |

## 1 · Tipos

`luau-lsp` con las definiciones de la API de Roblox y un sourcemap. Sin el
sourcemap, `require(ReplicatedStorage.Types)` no resuelve y el verificador da
por bueno cualquier cosa que cruce entre módulos: pasaría sin quejarse un
sector cuyo umbral fuera un texto.

```bash
# una vez
curl -L -o luau-lsp.zip https://github.com/JohnnyMorganz/luau-lsp/releases/latest/download/luau-lsp-linux-x86_64.zip
unzip luau-lsp.zip && chmod +x luau-lsp
curl -L -o globalTypes.d.luau https://raw.githubusercontent.com/JohnnyMorganz/luau-lsp/main/scripts/globalTypes.d.luau

# cada vez
python3 verificar/sourcemap.py
./luau-lsp analyze --sourcemap=sourcemap.json --defs=globalTypes.d.luau \
  --base-luaurc=.luaurc --platform=roblox $(find . -name '*.luau' | sort) 2>&1
```

**El `2>&1` no es adorno: los errores salen por la salida de error, no por la
estándar.** Redirigirla a /dev/null da una ejecución silenciosa que parece
limpia y no lo está. Pasó una vez acá y se coló hasta que se comprobó con un
error puesto a mano. Si no vas a mirar el texto, mira el código de salida: 0 es
limpio, 1 es que hay errores.

El sourcemap se genera desde el árbol de archivos porque el proyecto usa Script
Sync y no Rojo. Las reglas de nombre son las mismas: `X.luau` es ModuleScript,
`X.server.luau` es Script, `X.client.luau` es LocalScript, una carpeta es Folder.

## 2 · Coherencia

Lo que el verificador de tipos no puede ver, porque no es un problema de tipos:

- **Arranque.** Todo módulo de `Systems/` está en la lista `ORDER` del
  Bootstrap, y todo lo que está en `ORDER` existe en disco. Un módulo fuera de
  `ORDER` no arranca nunca y el fallo es silencioso. Además, `Data` va antes que
  todo lo que lee el perfil, y `Combat` después de armas, zombis y economía.
- **Configuración.** Cada módulo de `Config/` está en el índice y sale por
  `Freeze(...)`. Uno que se devuelva sin congelar se puede modificar en caliente,
  que es como un número de balance acaba cambiando solo entre partidas.
- **Datos cruzados.** Que el zombi que introduce cada sector exista, que el
  material que promete caiga en la economía, que los umbrales suban, que el
  Sector 1 esté abierto, que el material que pide cada tier de arma exista, que
  el arma inicial esté en el catálogo, y que el gamepass que referencia una clase
  esté en el catálogo de monetización.
- **Reglas del CLAUDE.md.** Regla 8: ningún número de juego fuera de `Config/`.
  Reglas 1 y 2: el cliente no calcula daño, XP ni contador. Regla 4: ninguna vía
  de jugador contra jugador en ningún archivo. Y ningún `RemoteFunction`, porque
  ceden el hilo del servidor al cliente.

  La regla 8 acepta `0`, `1` y `2` —el neutro, la unidad y partir por la mitad—
  y cualquier constante con nombre en mayúsculas al principio del archivo. Todo
  lo demás tiene que estar en `Config/`. La diferencia entre un número explicado
  y uno mágico es si tiene nombre.
- **Contrato de red.** Que los nombres del tipo unión y los de `NAMES` sean los
  mismos. Un nombre en el tipo y no en `NAMES` compila y falla al pedirlo.
- **El bucle único.** Que solo `Systems/ZombieAI` se conecte a un evento por
  frame, y que se conecte una sola vez. Regla 7: el día que otro sistema abra su
  propia conexión por entidad, el servidor se cae y el culpable no será evidente.
- **Las cuatro banderas del zombi.** Que la parte ponga `CanCollide`, `CanQuery`,
  `CanTouch` y `CastShadow` en false, y que el movimiento use la API masiva.
- **La costura de la baja.** Que `ZombieAI` emita `OnZombieKilled` y que no
  reparta XP, chatarra ni brecha por su cuenta.

```bash
python3 verificar/coherencia.py
```

Termina en 1 si algo falla. Los avisos —cuántos números siguen marcados `TUNE` y
cuántos ids de Roblox siguen en 0— no rompen la ejecución: son el recordatorio
de lo que todavía no está medido.

## Comprobado que muerden

Las dos pasadas se probaron rompiendo el proyecto a propósito y confirmando que
lo detectan: un umbral de sector escrito como texto y una velocidad multiplicada
por una cadena (pasada 1); un material que no existe, un número suelto dentro de
un sistema, un remote declarado pero no creado, una segunda conexión por frame y
un `CanQuery` puesto en true (pasada 2). Una comprobación que nunca ha fallado no
es una comprobación.
