--!strict
--[[
	Systems/Combat.luau — el disparo, validado por el servidor.

	El combate es el sistema más atacado de cualquier juego de Roblox, así que la
	regla de oro está escrita en el código y no solo en el CLAUDE.md: el cliente
	manda INTENCIÓN —disparé desde acá, hacia acá, en este instante— y el servidor
	decide todo lo demás. Daño, munición, enfriamiento, si acertó y si mató.

	El reparto de las tres responsabilidades:

	- El cliente PREDICE. Al apretar, pinta el fogonazo, suena y sacude la cámara
	  al instante. Sin eso, con 100 ms de ping el juego se siente roto.
	- El servidor REBOBINA. Guarda un segundo de posiciones pasadas de cada zombi
	  y, al llegar la petición, mira dónde estaba en el instante del disparo. Sin
	  esto, a quien tiene ping le tocaría apuntar por delante del zombi.
	- El servidor VALIDA. Frecuencia, tipos, personaje vivo, arma correcta,
	  munición, enfriamiento, marca de tiempo, origen y línea de visión. Si algo
	  falla, el impacto se cae en silencio.

	«En silencio» es a propósito. Decirle al cliente qué comprobación falló es
	enseñarle cuál tiene que evitar. El jugador honesto ve un tiro que no dio, que
	es lo mismo que ve cuando falla de verdad.

	Y se pierde algún impacto legítimo, sí. Es infinitamente preferible: un tiro
	perdido cada tanto se olvida, un jugador con daño infinito arruina el servidor
	entero, que en este juego incluye el contador de brecha de los otros
	diecinueve.

	Las ventanas de impacto están pensadas sobre la tasa de replicación de red
	—20 a 30 Hz bajo carga— y no sobre los 60 Hz del heartbeat. Con menos margen,
	el juego castiga la conexión en vez del pulso.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Types = require(ReplicatedStorage.Types)
local Remotes = require(ReplicatedStorage.Remotes)
local Config = require(ReplicatedStorage.Config.Combat)
local ConfigWeapons = require(ReplicatedStorage.Config.Weapons)
local ConfigZombies = require(ReplicatedStorage.Config.ZombieAI)

local CombatFolder = script.Parent.Parent.Combat
local Loadout = require(CombatFolder.Loadout)
local RateLimiter = require(CombatFolder.RateLimiter)
local ZombieAI = require(script.Parent.ZombieAI)

-- Mitad de un tamaño, para pasar de diámetro a radio.
local HALF = 0.5
-- Vuelta completa en radianes, para repartir los perdigones alrededor del eje.
local TAU = math.pi * 2

export type CombatModule = Types.System & {
	Stop: () -> (),
}

local loadout = Loadout.new()
local fireLimit = RateLimiter.new(Config.MaxFireRequestsPerSecond, Config.FireRequestBurst)
local meleeLimit = RateLimiter.new(Config.MaxFireRequestsPerSecond, Config.FireRequestBurst)
local actionLimit = RateLimiter.new(Config.MaxFireRequestsPerSecond, Config.FireRequestBurst)

local random = Random.new()
local connections: { RBXScriptConnection } = {}

-- Se resuelven una vez en Start. Remotes.Get busca por nombre, y esto se usa en
-- cada impacto de cada perdigón de cada disparo.
local hitConfirmed: RemoteEvent? = nil

-- Reutilizados: crear parámetros de raycast y su lista de filtro en cada disparo
-- sería basura constante en la ruta más caliente del juego.
local losParams = RaycastParams.new()
losParams.FilterType = Enum.RaycastFilterType.Exclude
local losFilter: { Instance } = table.create(1)

local Combat = {} :: CombatModule

Combat.Name = "Combat"
Combat.Phase = "MVP"

--------------------------------------------------------------------------------
-- Validación
--------------------------------------------------------------------------------

-- Un vector que llega por la red puede ser cualquier cosa: nil, una tabla, un
-- número, o un Vector3 con NaN dentro. NaN es el peor porque pasa cualquier
-- comparación de rango sin que salte nada y envenena todo lo que toca después.
local function isFiniteVector(value: unknown): boolean
	if typeof(value) ~= "Vector3" then
		return false
	end
	local vector = value :: Vector3
	local magnitude = vector.Magnitude
	return magnitude == magnitude and magnitude < math.huge
end

local function reject(player: Player, limiter: RateLimiter.RateLimiter, reason: Types.RejectionReason)
	local streak = limiter:NoteRejection(player)
	if streak == Config.SuspiciousRejectionStreak then
		-- No se expulsa a nadie: una conexión mala también acumula rechazos, y
		-- echar a un jugador honesto es peor que aguantar a un tramposo un rato.
		-- Esto es una señal para mirar, no un castigo.
		warn(`[DEAD SECTOR] {player.Name}: {streak} rechazos seguidos, último por {reason}`)
	end
end

local function characterOf(player: Player): (Model?, Humanoid?, BasePart?)
	local character = player.Character
	if character == nil then
		return nil, nil, nil
	end
	local humanoid = character:FindFirstChildOfClass("Humanoid")
	local head = character:FindFirstChild("Head")
	if humanoid == nil or head == nil or not head:IsA("BasePart") then
		return nil, nil, nil
	end
	return character, humanoid, head
end

--------------------------------------------------------------------------------
-- Resolución del impacto
--------------------------------------------------------------------------------

-- Reparte un perdigón dentro del cono. Se construye una base perpendicular a la
-- dirección en vez de usar CFrame.lookAt porque lookAt se rompe cuando se apunta
-- recto hacia arriba o hacia abajo, y disparar al cielo no puede petar nada.
local function spread(direction: Vector3, degrees: number): Vector3
	if degrees <= 0 then
		return direction
	end

	local perpendicular = direction:Cross(Vector3.yAxis)
	if perpendicular.Magnitude <= ConfigZombies.Epsilon then
		perpendicular = direction:Cross(Vector3.xAxis)
	end
	perpendicular = perpendicular.Unit

	local other = direction:Cross(perpendicular).Unit
	-- Raíz del aleatorio para que los perdigones se repartan parejos por el disco
	-- y no se apelotonen en el centro.
	local angle = math.rad(degrees) * math.sqrt(random:NextNumber())
	local roll = random:NextNumber() * TAU
	local offset = (perpendicular * math.cos(roll) + other * math.sin(roll)) * math.tan(angle)

	return (direction + offset).Unit
end

-- Devuelve el zombi más cercano alcanzado por el rayo, dónde le dio, y si el
-- impacto entró por su punto débil.
--
-- No se lanza ningún raycast contra los zombis: sus partes tienen CanQuery en
-- false, así que el motor ni las ve. El impacto se resuelve con aritmética
-- contra la posición REBOBINADA, que es la única correcta, porque la parte que
-- está ahora en el mundo ya se movió desde que el jugador apretó.
local function resolveHit(origin: Vector3, direction: Vector3, maxDistance: number, when: number): (Types.ZombieId?, Vector3, boolean)
	local bestId: Types.ZombieId? = nil
	local bestDistance = math.huge
	local bestPosition = origin
	local bestWeakpoint = false

	for _, id in ZombieAI.ActiveIds() do
		local stats = ZombieAI.StatsOf(id)
		if stats == nil then
			continue
		end

		local position, facing = ZombieAI.PositionAt(id, when)
		if position == nil or facing == nil then
			continue
		end

		local toZombie = position - origin
		-- Proyección sobre el rayo: a qué distancia del tirador está el punto del
		-- rayo más cercano al zombi.
		local along = toZombie:Dot(direction)
		-- El alcance se mide contra la posición rebobinada, que ya es la correcta.
		-- Darle margen extra por el rebobinado sería estirar el alcance del arma.
		if along < 0 or along > maxDistance then
			continue
		end
		if along >= bestDistance then
			continue
		end

		local radius = math.max(stats.Size.X, stats.Size.Z) * HALF + Config.HitboxTolerance
		local closest = origin + direction * along
		if (position - closest).Magnitude > radius then
			continue
		end

		bestId = id
		bestDistance = along
		bestPosition = position
		-- Si la bala viaja hacia donde el zombi mira, le entró por la espalda. Se
		-- juzga con la orientación que tenía EN EL INSTANTE del disparo: girarse
		-- después no debería salvarle de un tiro que ya iba a su espalda.
		bestWeakpoint = facing:Dot(direction) > 0
	end

	return bestId, bestPosition, bestWeakpoint
end

-- Línea de visión contra el mapa. Los zombis no estorban acá tampoco: uno no
-- puede taparle el disparo a otro, y es lo correcto, porque el jugador apuntó a
-- lo que veía y no a lo que el servidor cree que había en medio.
local function hasLineOfSight(character: Model, origin: Vector3, target: Vector3): boolean
	losFilter[1] = character
	losParams.FilterDescendantsInstances = losFilter

	local delta = target - origin
	local result = Workspace:Raycast(origin, delta, losParams)
	return result == nil or (result.Position - origin).Magnitude >= delta.Magnitude
end

local function applyHit(player: Player, weapon: Types.Weapon, id: Types.ZombieId, position: Vector3, weakpoint: boolean)
	local stats = ZombieAI.StatsOf(id)
	if stats == nil then
		return
	end

	local damage = weapon.Damage
	-- El Blindado solo recibe daño completo por la espalda. Es su contra, y es lo
	-- que convierte una pelea en un problema de posición.
	if stats.RearOnlyFullDamage and not weakpoint then
		damage *= stats.FrontDamageMultiplier
	end

	local killed = ZombieAI.Damage(id, damage, player)

	local confirmation: Types.HitConfirmation = {
		ZombieId = id,
		Position = position,
		Damage = damage,
		Killed = killed,
		Weakpoint = weakpoint and stats.RearOnlyFullDamage,
	}

	local remote = hitConfirmed
	if remote ~= nil then
		remote:FireClient(player, confirmation)
	end
end

--------------------------------------------------------------------------------
-- Handlers
--------------------------------------------------------------------------------

-- El orden importa: primero lo barato y lo más abusable, al final lo caro. Un
-- atacante que manda mil peticiones por segundo se cae en la primera línea y no
-- llega nunca a hacer que el servidor recorra cuarenta zombis.
local function onFire(player: Player, payload: unknown)
	local allowed = fireLimit:Consume(player)
	if not allowed then
		reject(player, fireLimit, "RateLimit")
		return
	end

	if typeof(payload) ~= "table" then
		reject(player, fireLimit, "BadPayload")
		return
	end

	local request = payload :: Types.FireRequest
	if
		typeof(request.WeaponId) ~= "string"
		or typeof(request.ClientTime) ~= "number"
		or not isFiniteVector(request.Origin)
		or not isFiniteVector(request.Direction)
	then
		reject(player, fireLimit, "BadPayload")
		return
	end

	local character, humanoid, head = characterOf(player)
	if character == nil or humanoid == nil or head == nil then
		reject(player, fireLimit, "NoCharacter")
		return
	end
	if humanoid.Health <= 0 then
		reject(player, fireLimit, "Dead")
		return
	end

	local now = Workspace:GetServerTimeNow()
	loadout:Settle(player, now)

	local state = loadout:Get(player)
	local weapon = loadout:WeaponOf(player)
	if state == nil or weapon == nil or state.WeaponId ~= request.WeaponId then
		reject(player, fireLimit, "WrongWeapon")
		return
	end
	if state.ReloadingUntil ~= 0 then
		reject(player, fireLimit, "Reloading")
		return
	end
	if state.Ammo <= 0 then
		reject(player, fireLimit, "NoAmmo")
		return
	end
	-- Enfriamiento del arma, aparte del límite de frecuencia: el límite protege al
	-- servidor de una avalancha, esto protege al juego de un arma disparando más
	-- rápido de lo que su ficha dice.
	if now < state.NextFireAt then
		reject(player, fireLimit, "Cooldown")
		return
	end

	local age = now - request.ClientTime
	if age > Config.MaxRewindSeconds then
		reject(player, fireLimit, "StaleTimestamp")
		return
	end
	if age < -Config.MaxClockSkewSeconds then
		reject(player, fireLimit, "FutureTimestamp")
		return
	end

	-- El origen lo declara el cliente porque el cañón no está donde el torso, pero
	-- se contrasta con la cabeza que el servidor le ve. Sin esto se podría disparar
	-- desde al lado de un zombi al otro lado del mapa.
	if (request.Origin - head.Position).Magnitude > Config.MaxOriginDeviation then
		reject(player, fireLimit, "OriginTooFar")
		return
	end

	local length = request.Direction.Magnitude
	if math.abs(length - 1) > Config.MaxDirectionError then
		reject(player, fireLimit, "BadDirection")
		return
	end

	-- A partir de acá la petición es legítima: se gasta la bala pase lo que pase.
	state.Ammo -= 1
	state.NextFireAt = now + 1 / weapon.FireRate

	local aim = request.Direction.Unit
	local maxDistance = weapon.Range * Config.RangeTolerance
	local rewindTo = math.max(request.ClientTime, now - Config.MaxRewindSeconds)

	for _ = 1, weapon.Pellets do
		local direction = if weapon.Pellets > 1 then spread(aim, weapon.Spread) else aim
		local id, position, weakpoint = resolveHit(request.Origin, direction, maxDistance, rewindTo)

		if id ~= nil and hasLineOfSight(character, request.Origin, position) then
			applyHit(player, weapon, id, position, weakpoint)
		end
	end
end

-- El melee no manda origen: se usa la posición que el servidor le ve al
-- personaje. Un valor menos que el cliente controla, y a esta distancia el
-- cañón y el torso están en el mismo sitio de todos modos.
local function onMelee(player: Player, payload: unknown)
	local allowed = meleeLimit:Consume(player)
	if not allowed then
		reject(player, meleeLimit, "RateLimit")
		return
	end

	if typeof(payload) ~= "table" then
		reject(player, meleeLimit, "BadPayload")
		return
	end

	local request = payload :: { Direction: Vector3 }
	if not isFiniteVector(request.Direction) then
		reject(player, meleeLimit, "BadPayload")
		return
	end

	local _character, humanoid, head = characterOf(player)
	if humanoid == nil or head == nil then
		reject(player, meleeLimit, "NoCharacter")
		return
	end
	if humanoid.Health <= 0 then
		reject(player, meleeLimit, "Dead")
		return
	end

	local now = Workspace:GetServerTimeNow()
	local state = loadout:Get(player)
	local weapon = loadout:WeaponOf(player)
	if state == nil or weapon == nil or weapon.Family ~= "Melee" then
		reject(player, meleeLimit, "WrongWeapon")
		return
	end
	if now < state.NextFireAt then
		reject(player, meleeLimit, "Cooldown")
		return
	end

	state.NextFireAt = now + 1 / weapon.FireRate

	-- Consulta espacial sobre nuestra propia lista de vivos, no sobre el motor de
	-- física: las partes de los zombis tienen CanQuery en false, así que a
	-- GetPartBoundsInBox no le saldría ninguna. Recorrer cuarenta entradas es
	-- además más barato que una consulta de física.
	local origin = head.Position
	local facing = request.Direction.Unit
	local cosLimit = math.cos(math.rad(Config.MeleeArcDegrees * HALF))

	for _, id in ZombieAI.ActiveIds() do
		local position = ZombieAI.PositionAt(id, now)
		if position == nil then
			continue
		end

		local delta = position - origin
		local distance = delta.Magnitude
		if distance > Config.MeleeRange or distance <= ConfigZombies.Epsilon then
			continue
		end
		if (delta / distance):Dot(facing) < cosLimit then
			continue
		end

		applyHit(player, weapon, id, position, false)
	end
end

local function onReload(player: Player)
	local allowed = actionLimit:Consume(player)
	if not allowed then
		reject(player, actionLimit, "RateLimit")
		return
	end

	local now = Workspace:GetServerTimeNow()
	loadout:Settle(player, now)
	loadout:BeginReload(player, now)
end

local function onEquip(player: Player, payload: unknown)
	local allowed = actionLimit:Consume(player)
	if not allowed then
		reject(player, actionLimit, "RateLimit")
		return
	end

	if typeof(payload) ~= "string" then
		reject(player, actionLimit, "BadPayload")
		return
	end

	-- Que el arma exista en el catálogo no basta: cuando el Prompt 4 traiga el
	-- inventario, acá hay que comprobar además que el jugador la tenga. Sin esa
	-- comprobación, cualquiera se equipa el arma de tier 6 el primer día.
	local weaponId = payload :: Types.WeaponId
	if ConfigWeapons.Catalogue[weaponId] == nil then
		reject(player, actionLimit, "WrongWeapon")
		return
	end

	loadout:Give(player, weaponId)
end

--------------------------------------------------------------------------------
-- Ciclo de vida
--------------------------------------------------------------------------------

local function onPlayerAdded(player: Player)
	loadout:GiveStarting(player)
end

local function onPlayerRemoving(player: Player)
	loadout:Forget(player)
	fireLimit:Forget(player)
	meleeLimit:Forget(player)
	actionLimit:Forget(player)
end

function Combat.Init(_self: Types.System) end

function Combat.Start(_self: Types.System)
	hitConfirmed = Remotes.Get("HitConfirmed")

	for _, player in Players:GetPlayers() do
		onPlayerAdded(player)
	end

	table.insert(connections, Players.PlayerAdded:Connect(onPlayerAdded))
	table.insert(connections, Players.PlayerRemoving:Connect(onPlayerRemoving))
	table.insert(connections, Remotes.Get("FireWeapon").OnServerEvent:Connect(onFire))
	table.insert(connections, Remotes.Get("MeleeSwing").OnServerEvent:Connect(onMelee))
	table.insert(connections, Remotes.Get("RequestReload").OnServerEvent:Connect(onReload))
	table.insert(connections, Remotes.Get("EquipWeapon").OnServerEvent:Connect(onEquip))
end

function Combat.Stop()
	for _, connection in connections do
		connection:Disconnect()
	end
	table.clear(connections)
end

return Combat
