# Prompt 1 · IA de zombis

Qué se construyó, por qué así, y qué falta para poder decir que está terminado.

## Lo que falta, primero

El Prompt 1 pide una cosa que no se puede entregar desde fuera de Studio:

> Tell me the highest N that keeps frame time under 16ms on a standard server,
> and show me the measurement.

**Ese número no está medido.** El código del benchmark está escrito y probado de
tipos, pero hay que correrlo en Studio, en modo servidor, con un personaje
dentro. Hasta que salga, `Config.ZombieAI.MaxLive = 40` sigue siendo el objetivo
del plan, no una medición, y así está marcado en el archivo.

Cómo sacarlo está más abajo, en «Cómo medir».

## La arquitectura

### Un bucle, dos cadencias

Una sola conexión a `Heartbeat` en todo el juego. Dentro, dos ritmos:

| | cada | qué hace |
| --- | --- | --- |
| Decisión | 100 ms | a quién persigo, hace falta ruta nueva, estoy lejos, toca atacar |
| Movimiento | cada frame | avanzar sobre la decisión vigente y aplicarlo en bloque |

Separarlas importa por los dos lados. La decisión es la parte cara y no hace
falta sesenta veces por segundo: en una décima de segundo un zombi no cambia de
opinión. El movimiento sí, porque a 10 Hz un Corredor daría saltos de casi dos
studs y se leería como un fallo de red, no como un zombi.

### Tres bandas de coste

Un zombi a doscientos studs al que nadie ve no merece un cálculo de navegación,
y en un sector abierto son la mayoría.

| distancia al jugador más cercano | qué hace | cuesta |
| --- | --- | --- |
| menos de `AggroRadius` (120) | ruta calculada y seguida punto a punto | caro |
| hasta `FarModeDistance` (150) | dirección recta, refrescada en cada decisión | casi nada |
| más allá | dirección recta refrescada cada 3 s | prácticamente nada |

Fuera de la banda cercana no se pide ninguna ruta.

### El reparto de rutas

`ComputeAsync` cede el hilo y cuesta caro. Si al abrirse un sector cuarenta
zombis piden ruta en el mismo paso, el servidor se come cuarenta cálculos de
golpe. Van a una cola y se atienden cuatro por paso; los que esperan siguen
andando con la ruta anterior.

La cola es un array con cabeza móvil, no un `table.remove(1)`: sacar del
principio desplaza todo lo demás, y eso crece justo cuando la cola está llena.
Los objetos `Path` se crean uno por zombi al arrancar y se reutilizan.

Cada zombi lleva un contador de generación. Una respuesta de ruta que llega
tarde y trae una generación vieja se descarta: ese zombi ya murió y volvió a
salir siendo otro, y aplicarle la ruta anterior lo mandaría a donde iba en su
vida pasada.

### Sin Humanoid, sin física, sin instancias nuevas

Cada zombi es **una parte anclada** y una tabla de estado. Sin `Humanoid`: son
cientos de propiedades replicadas y una máquina de estados corriendo en el
servidor por cada uno, y con cuarenta a la vez eso es el servidor entero.

Las `MaxLive` partes se crean una sola vez al arrancar y no se destruyen nunca.
Aparecer un zombi es moverlo desde el aparcadero y ponerle los datos de su tipo;
matarlo es devolverlo. `Instance.new` en mitad de una horda es un pico justo
cuando menos margen hay.

Los activos van en un array denso más un mapa de id a posición dentro de él: el
bucle recorre memoria contigua y dar de baja a uno cuesta lo mismo con cuarenta
que con cuatro.

Movimiento con `Workspace:BulkMoveTo`, una sola llamada por frame para todos.
Mover parte a parte despierta la física de cada una.

### Las cuatro banderas, y por qué

| bandera | por qué |
| --- | --- |
| `CanCollide = false` | el zombi no empuja ni es empujado; lo mueve el bucle, no la física |
| `CanQuery = false` | ningún raycast le pega — ver abajo |
| `CanTouch = false` | los eventos de contacto se disparan por par de partes; con cuarenta juntos son miles por segundo |
| `CastShadow = false` | cuarenta sombras en movimiento son coste de GPU en el teléfono del jugador, que es el que menos sobra |

**`CanQuery = false` y los disparos no se contradicen.** El servidor no dispara
raycasts contra los zombis: guarda un buffer circular con un segundo de
posiciones pasadas de cada uno y, cuando llega una petición de disparo, rebobina
al instante indicado y resuelve el impacto con aritmética contra esa posición.
Los raycasts se reservan para la línea de visión contra el mapa. El buffer ya
está grabándose —30 muestras por segundo, reservadas de una vez y sin crecer— y
`ZombieAI.PositionAt(id, instante)` es la puerta que usará el Prompt 2.

### Un tipo nuevo no es código nuevo

Los tres tipos son entradas de datos en `Config/ZombieAI.Types`, con tamaño,
color, vida, velocidad, daño, alcance, enfriamiento y su peso para el contador
de brecha. Un cuarto tipo es una entrada más.

El Blindado ya trae declarado su punto débil (`RearOnlyFullDamage`,
`FrontDamageMultiplier`), pero quien lo aplica es el sistema de combate: el daño
se calcula ahí, no acá. Regla 1.

### Lo que este sistema no hace

No reparte XP, ni chatarra, ni toca el contador de brecha. Cuando un zombi muere
emite `OnZombieKilled` con el tipo, la posición y quién dio el golpe final, y se
acabó. Quien reparta será Progresión, Economía y Brecha en los prompts 3 y 4.

Esa señal es **la única entrada legítima al contador de brecha**, y la pasada de
coherencia comprueba que exista y que este módulo no reparta nada por su cuenta.

## Cómo medir

En Studio, con el juego corriendo y la barra de comandos **en modo servidor**:

```lua
require(game.ServerScriptService.Benchmark.ZombieBenchmark).Sweep()
```

**Camina durante toda la medición.** Si el personaje se queda quieto, el
objetivo nunca se aleja del punto donde se calculó la ruta, así que no se
recalcula ninguna y la medición sale barata y falsa. La parte cara del sistema es
precisamente el recálculo.

### Por qué el criterio no es «la media bajó de 16 ms»

El servidor de Roblox ya corre a 60 Hz cuando puede, así que el delta de
`Heartbeat` vale ~16,67 ms **incluso con el servidor vacío**. Leer ese número y
decir «16 ms, vamos bien» no significa nada.

Lo que importa es si se mantiene. Cuando el servidor deja de llegar, el delta
sube por encima de esos 16,67. Por eso el criterio es el **percentil 95** del
delta contra un margen de 1,5 ms sobre el paso ideal, y no la media: la media
esconde exactamente los picos que arruinan una horda.

Aparte se informa de lo que cuesta este sistema —decisión y movimiento, en
microsegundos—, porque si el frame va mal pero nuestro coste va bien, el problema
está en otro sitio y cambiar el bucle de zombis no lo va a arreglar.

### El barrido no se salta el tope

Sube de diez en diez hasta `Config.MaxLive` y para. No pasa de ahí a propósito:
la reserva se crea con `MaxLive` partes al arrancar y el tope es la regla 6, que
no se salta ni para medir.

Si aguanta hasta arriba, el límite real está más allá: sube `Config.MaxLive`,
reinicia el servidor y vuelve a lanzarlo. **La respuesta al Prompt 1 es el último
número que aguantó**, y con él se fija `MaxLive` de verdad.

### Qué anotar

Del barrido salen, por cada N: delta media, p95, máximo, coste de decisión medio
y máximo, coste de movimiento y rutas fallidas.

Las rutas fallidas son la señal de que el problema no es el código: si suben,
hay zonas del mapa a las que no se llega y lo que falla es el blockout.

## Sobre medir antes del blockout

Este benchmark se puede correr sobre una baseplate plana y va a dar un número.
Ese número es un techo optimista: sin obstáculos, el cálculo de rutas es lo más
barato que va a ser nunca.

Lo honesto es medir dos veces. Una ahora, sobre plano, para saber cuánto cuesta
el bucle en sí. Y otra sobre el Sector 1 ya construido, que es la que fija
`MaxLive`. Si las dos se parecen, el coste está en el bucle; si la segunda es
mucho peor, está en la navegación y lo que hay que revisar es la geometría del
sector, no el código.
