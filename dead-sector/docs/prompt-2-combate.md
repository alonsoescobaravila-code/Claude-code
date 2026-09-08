# Prompt 2 · Combate

## El reparto

| quién | qué hace |
| --- | --- |
| Cliente | **predice**: fogonazo, sonido y retroceso al instante de apretar |
| Servidor | **rebobina** al instante del disparo y resuelve el impacto ahí |
| Servidor | **valida** frecuencia, tipos, personaje, arma, munición, enfriamiento, reloj, origen y línea de visión |

El cliente manda **intención** —disparé desde acá, hacia acá, en este instante—
y nada más. No manda daño, ni a quién le dio, ni si mató.

Los rechazos son **silenciosos**. Decirle al cliente qué comprobación falló es
enseñarle cuál tiene que evitar. El jugador honesto ve un tiro que no dio, que es
lo mismo que ve cuando falla de verdad.

Y sí, se pierde algún impacto legítimo. Es infinitamente preferible: un tiro
perdido se olvida, un jugador con daño infinito arruina el servidor entero, que
en este juego incluye el contador de brecha de los otros diecinueve.

---

## Lo que intentaría un tramposo, y qué lo para

Esto es el entregable que pide el Prompt 2. Cada ataque está escrito como la
llamada que un ejecutor mandaría de verdad.

### 1 · Daño infinito por el payload

```lua
FireWeapon:FireServer({
    WeaponId = "pistol_t1", Origin = camera.CFrame.Position,
    Direction = aim, ClientTime = workspace:GetServerTimeNow(),
    Damage = 999999,          -- <-- el intento
})
```

**Lo para:** el servidor nunca lee ese campo. El daño sale de
`Config/Weapons.Catalogue[weaponId].Damage`. El campo sobra y se ignora.

`Types.FireRequest` ni siquiera declara dónde meterlo, y la pasada de coherencia
falla si alguien se lo añade o si el daño deja de leerse de Config. Es la
diferencia entre una regla escrita y una comprobada.

### 2 · Declarar la baja directamente

```lua
HitConfirmed:FireServer({ ZombieId = 7, Killed = true })
```

**Lo para:** `HitConfirmed` es de servidor a cliente. Nada está conectado a su
`OnServerEvent`, así que la llamada no hace absolutamente nada.

No existe ningún remote que acepte una baja, ni un daño, ni un incremento del
contador. La única forma de que la brecha suba es que `ZombieAI.Damage` deje la
vida en cero, y a esa función solo se llega desde la cadena de validación.

### 3 · Cadencia infinita

```lua
while true do FireWeapon:FireServer(request) end
```

**Lo para, tres veces:**

1. El cubo de fichas: 20 peticiones por segundo con ráfaga de 5. El resto se cae
   en la primera línea del handler, antes de tocar nada caro.
2. `NextFireAt`, el enfriamiento del arma en el servidor. Aunque el cubo dejara
   pasar, el arma no dispara más rápido de lo que dice su ficha.
3. La munición baja de verdad. En doce disparos se queda seco.

La primera protege al servidor de la avalancha; la segunda protege al juego del
arma imposible. Son cosas distintas y por eso están las dos.

### 4 · Munición infinita

```lua
-- editando la copia local del cliente
Prediction.ammo = 9999
```

**Lo para:** el número del cliente son píxeles. El servidor lleva el suyo en
`Loadout`, y cuando llega a cero rechaza con `NoAmmo`. El tramposo ve un
cargador lleno y un arma que no dispara.

### 5 · Recarga instantánea

```lua
for i = 1, 100 do RequestReload:FireServer() end
```

**Lo para:** `BeginReload` no hace nada si ya está recargando, y la recarga solo
se completa cuando el reloj **del servidor** pasa de `ReloadingUntil`. Repetir la
petición no adelanta nada.

### 6 · Disparar desde al lado del zombi

```lua
FireWeapon:FireServer({
    Origin = posicionDelZombiLejano,   -- <-- el intento
    Direction = aim, WeaponId = "pistol_t1", ClientTime = now,
})
```

**Lo para:** `MaxOriginDeviation`. El origen que declara el cliente se contrasta
con la posición de la cabeza que el servidor le ve. Más de 8 studs de diferencia
y se rechaza con `OriginTooFar`.

El origen se acepta del cliente —y no se calcula entero en el servidor— porque el
cañón no está donde el torso y el jugador apuntó desde su cámara. El margen es
justo el necesario para eso.

### 7 · Alcance infinito

```lua
Direction = Vector3.new(0, 0, -10000)   -- <-- el intento
```

**Lo para:** `MaxDirectionError`. La longitud del vector tiene que valer 1 con un
margen de 0,01. Y aunque pasara, el alcance se acota con
`weapon.Range * RangeTolerance`: un zombi más lejos que eso no entra en el bucle.

### 8 · Disparar a través de una pared

**Lo para:** un raycast de línea de visión contra el mapa, desde el origen hasta
el punto de impacto.

Los zombis **no** se tapan entre ellos, y es a propósito: sus partes tienen
`CanQuery` en false, así que el raycast las atraviesa. El jugador disparó a lo
que veía, no a lo que el servidor cree que había en medio.

### 9 · Rebobinar demasiado atrás

```lua
ClientTime = workspace:GetServerTimeNow() - 30   -- <-- el intento
```

Rebobinar treinta segundos pondría a los zombis donde estaban antes de que nadie
los matara.

**Lo para:** `MaxRewindSeconds`, medio segundo. Más viejo se rechaza con
`StaleTimestamp` sin ni siquiera mirar el historial. Y aunque el margen se
ampliara, el buffer solo guarda un segundo: `PositionAt` devuelve nil y no hay
impacto.

### 10 · Disparar en el futuro

```lua
ClientTime = workspace:GetServerTimeNow() + 10   -- <-- el intento
```

**Lo para:** `MaxClockSkewSeconds`, una décima. Un disparo adelantado miente por
definición, porque el instante todavía no llegó.

### 11 · NaN

```lua
Origin = Vector3.new(0 / 0, 0 / 0, 0 / 0)   -- <-- el intento
```

El peor de todos, porque NaN **pasa cualquier comparación de rango**: no es mayor
ni menor que nada, así que todos los `if distancia > limite` lo dejan seguir, y
después envenena cada cuenta que toca.

**Lo para:** `isFiniteVector`, que comprueba que el valor sea un Vector3 de
verdad y que su magnitud sea igual a sí misma —la prueba de NaN— y finita.

### 12 · Payload que no es una tabla

```lua
FireWeapon:FireServer(42)
FireWeapon:FireServer(nil)
```

**Lo para:** `typeof(payload) ~= "table"` en la segunda línea del handler, antes
de tocar ningún campo. Sin eso, indexar un número lanza un error dentro del
handler y ese error sí es un problema del servidor.

### 13 · Perdigones dirigidos

Una escopeta con seis perdigones podría mandar seis direcciones, todas al mismo
zombi, y multiplicar el daño por seis.

**Lo para:** el cliente manda **una** dirección. La dispersión de los perdigones
la genera el servidor con su propio `Random`. El cliente no tiene forma de
decidir dónde va cada uno.

### 14 · Melee a distancia

**Lo para:** el melee no acepta origen. Usa la posición de la cabeza que el
servidor le ve, y comprueba alcance y arco contra su propia lista de zombis
vivos. Además exige que el arma equipada sea de familia `Melee`.

### 15 · Bloquear el servidor con un RemoteFunction

**Lo para:** no hay ninguno. Un RemoteFunction de cliente a servidor cede el hilo
del servidor al cliente, y un cliente que no responde deja al servidor esperando.
Está prohibido en `Remotes.luau` y la pasada de coherencia lo comprueba.

---

## Lo que NO está cubierto

Escrito aquí porque una lista de defensas sin sus huecos es propaganda.

**El arma equipada no comprueba propiedad.** `EquipWeapon` acepta cualquier arma
del catálogo. Hoy el catálogo tiene una sola, así que no hay nada que robar, pero
en cuanto el Prompt 4 traiga las 18 armas y los tiers, **ahí hay que añadir la
comprobación de inventario**. Está marcado en el código, en el handler.

**No hay defensa contra aimbot.** Un disparo perfectamente apuntado es
indistinguible de un buen jugador desde el servidor. No se puede resolver con
validación y no se intenta fingir que sí.

**Los 8 studs de margen en el origen son 8 studs de ventaja** para quien los use
a propósito: se puede disparar desde una esquina un poco más adelantada de lo
que se está. Es el precio de que el cañón no esté en el torso. Se puede bajar en
Config si en pruebas resulta explotable.

**La racha de rechazos solo avisa, no expulsa.** Una conexión mala también
acumula rechazos, y echar a un jugador honesto es peor que aguantar a un tramposo
un rato. Cuando el Prompt 6 traiga analítica, la racha debería registrarse ahí en
vez de solo en la consola.

**El melee no se puede probar todavía.** No hay ningún arma de familia `Melee` en
el catálogo hasta el Prompt 4, así que el handler valida y rechaza correctamente,
pero no hay forma de que llegue al final.

**Nada de esto está probado en un servidor real.** Los tipos verifican y la
coherencia pasa, pero la ventana de rebobinado, el margen de la hitbox y la
tolerancia del origen son números para ajustar viendo el registro de rechazos con
gente jugando. Están todos marcados `TUNE (Prompt 2)`.

---

## Cómo se siente, y cómo se ajusta

Los tres números que deciden si el combate se siente justo:

| número | qué pasa si es muy bajo | si es muy alto |
| --- | --- | --- |
| `HitboxTolerance` (2,5) | los tiros buenos no cuentan con ping | se acierta sin apuntar |
| `MaxRewindSeconds` (0,5) | castiga a quien tiene mala conexión | se puede disparar al pasado |
| `MaxOriginDeviation` (8) | rechaza disparos legítimos al asomarse | se dispara desde la esquina de al lado |

Las ventanas están pensadas sobre la tasa de replicación de red —20 a 30 Hz bajo
carga— y no sobre los 60 Hz del heartbeat. Con menos margen, el juego castiga la
conexión en vez del pulso, y eso se siente como que el juego está roto aunque los
números estén bien.

Para ajustarlos: juega con gente, mira los avisos de racha en la consola del
servidor, y sube el margen que más aparezca. Si no aparece ninguno y la gente se
queja de tiros que no cuentan, el problema es la hitbox.
