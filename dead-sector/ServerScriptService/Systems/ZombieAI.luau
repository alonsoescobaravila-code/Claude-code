--!strict
--[[
	Systems/ZombieAI.luau — el único bucle que mueve a todos los zombis.

	Es el sistema que decide si el servidor aguanta. Todo lo demás se puede
	arreglar más tarde; esto no, porque cuando falla no falla para un jugador,
	falla para los veinte a la vez.

	Una sola conexión a Heartbeat en todo el juego, con dos cadencias dentro:

	- DECISIÓN, a 10 Hz (Config.StepInterval). A quién persigo, hace falta
	  recalcular la ruta, estoy lejos, toca atacar. Es la parte cara y no hace
	  falta hacerla sesenta veces por segundo: en una décima de segundo un zombi
	  no cambia de opinión.
	- MOVIMIENTO, en cada frame. Avanzar sobre la decisión vigente y aplicarlo
	  todo con una sola llamada masiva. Si el movimiento fuera también a 10 Hz, un
	  Corredor daría saltos de casi dos studs y se leería como un fallo de red.

	Tres bandas de coste según lo lejos que esté el jugador más cercano:

	| distancia            | qué hace                        | cuesta        |
	| -------------------- | ------------------------------- | ------------- |
	| < AggroRadius        | ruta calculada y seguida        | caro          |
	| hasta FarModeDistance| dirección recta, cada decisión  | casi nada     |
	| más allá             | dirección recta cada 3 s        | prácticamente nada |

	Fuera de la banda cercana no se pide ruta ninguna vez. Un zombi a 200 studs
	al que nadie ve no merece un cálculo de navegación, y son la mayoría.

	Este módulo no reparte XP, ni chatarra, ni toca el contador de brecha. Cuando
	un zombi muere emite OnZombieKilled y se acabó: quien reparta será Progresión,
	Economía y Brecha en los prompts 3 y 4. Rule 1.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local Types = require(ReplicatedStorage.Types)
local Signal = require(ReplicatedStorage.Signal)
local Config = require(ReplicatedStorage.Config.ZombieAI)
local ConfigCombat = require(ReplicatedStorage.Config.Combat)

local Zombies = script.Parent.Parent.Zombies
local Pool = require(Zombies.Pool)
local PathScheduler = require(Zombies.PathScheduler)

local HISTORY_INTERVAL = 1 / ConfigCombat.RewindSampleRate
-- El coste propio se informa en microsegundos: en milisegundos, un paso barato
-- se lee como 0,0 y no se distingue de uno que no corrió.
local MICROS_PER_SECOND = 1000000

export type Target = {
	Player: Player,
	Humanoid: Humanoid,
	Position: Vector3,
}

-- Lo que el benchmark necesita saber para responder la pregunta del Prompt 1.
export type Stats = {
	Active: number,
	-- Lo que costó el último paso de decisión, en microsegundos. Es nuestro coste,
	-- separado del frame entero: si el frame va mal y esto va bien, el problema
	-- está en otro sistema.
	ThinkMicros: number,
	MoveMicros: number,
	PathQueue: number,
	PathFailures: number,
}

export type ZombieAIModule = Types.System & {
	OnZombieKilled: Signal.Signal<Types.KillInfo>,
	Spawn: (typeId: Types.ZombieTypeId, position: Vector3) -> Types.ZombieId?,
	Damage: (id: Types.ZombieId, amount: number, killer: Player?) -> boolean,
	Despawn: (id: Types.ZombieId) -> (),
	DespawnAll: () -> (),
	PositionAt: (id: Types.ZombieId, when: number) -> Vector3?,
	GetStats: () -> Stats,
	-- Desconecta el bucle. No lo usa el juego —el bucle vive lo que vive el
	-- servidor— pero sí las pruebas y el cierre ordenado.
	Stop: () -> (),
}

local pool: Pool.Pool? = nil
local scheduler: PathScheduler.PathScheduler? = nil
local connection: RBXScriptConnection? = nil

local thinkAccumulator = 0
local historyAccumulator = 0

-- Reservados una vez y reutilizados en cada frame. Crear estos arrays por frame
-- sería basura constante para el recolector, y el recolector pasa cuando quiere,
-- no cuando conviene.
local moveParts: { BasePart } = table.create(Config.MaxLive)
local moveCFrames: { CFrame } = table.create(Config.MaxLive)
local targets: { Target } = table.create(Players.MaxPlayers)

local lastThinkMicros = 0
local lastMoveMicros = 0

local ZombieAI = {} :: ZombieAIModule

ZombieAI.Name = "ZombieAI"
ZombieAI.Phase = "MVP"
ZombieAI.OnZombieKilled = Signal.new()

--------------------------------------------------------------------------------
-- Utilidades
--------------------------------------------------------------------------------

local function horizontalUnit(from: Vector3, to: Vector3): Vector3?
	local delta = Vector3.new(to.X - from.X, 0, to.Z - from.Z)
	local length = delta.Magnitude
	if length <= Config.Epsilon then
		return nil
	end
	return delta / length
end

-- Se rehace una vez por decisión, no una vez por zombi. Con cuarenta zombis y
-- veinte jugadores, buscar el personaje dentro del bucle serían ochocientos
-- FindFirstChild por paso.
local function refreshTargets()
	table.clear(targets)

	for _, player in Players:GetPlayers() do
		local character = player.Character
		if character == nil then
			continue
		end

		local root = character:FindFirstChild("HumanoidRootPart")
		local humanoid = character:FindFirstChildOfClass("Humanoid")
		if root == nil or not root:IsA("BasePart") or humanoid == nil then
			continue
		end
		if humanoid.Health <= 0 then
			continue
		end

		table.insert(targets, {
			Player = player,
			Humanoid = humanoid,
			Position = root.Position,
		})
	end
end

local function nearestTarget(position: Vector3): (Target?, number)
	local best: Target? = nil
	local bestDistance = math.huge

	for _, target in targets do
		local distance = (target.Position - position).Magnitude
		if distance < bestDistance then
			bestDistance = distance
			best = target
		end
	end

	return best, bestDistance
end

--------------------------------------------------------------------------------
-- Decisión
--------------------------------------------------------------------------------

local function think(activePool: Pool.Pool, paths: PathScheduler.PathScheduler, step: number)
	refreshTargets()

	for _, id in activePool.ActiveIds do
		local zombie = activePool.All[id]
		local target, distance = nearestTarget(zombie.Position)

		if target == nil then
			-- Nadie a quien seguir. Quedarse quieto cuesta cero.
			zombie.Target = nil
			zombie.Far = true
			zombie.FarDirection = Vector3.zero
			continue
		end

		zombie.Target = target.Player
		zombie.TargetPosition = target.Position
		zombie.AttackCooldown = math.max(0, zombie.AttackCooldown - step)

		if distance > Config.FarModeDistance then
			-- Banda lejana: dirección aproximada cada varios segundos.
			zombie.Far = true
			zombie.FarTimer -= step
			if zombie.FarTimer <= 0 then
				zombie.FarTimer = Config.FarModeUpdateInterval
				zombie.FarDirection = horizontalUnit(zombie.Position, target.Position) or zombie.FarDirection
			end
			if #zombie.Waypoints > 0 then
				table.clear(zombie.Waypoints)
			end
			continue
		end

		if distance > Config.AggroRadius then
			-- Banda media: dirección recta, refrescada en cada decisión. Sigue sin
			-- pedir ruta: a esta distancia nadie ve si rodea bien un obstáculo.
			zombie.Far = true
			zombie.FarTimer = 0
			zombie.FarDirection = horizontalUnit(zombie.Position, target.Position) or zombie.FarDirection
			if #zombie.Waypoints > 0 then
				table.clear(zombie.Waypoints)
			end
			continue
		end

		-- Banda cercana: aquí sí se navega.
		zombie.Far = false
		zombie.PathAge += step

		local moved = (target.Position - zombie.PathTargetOrigin).Magnitude
		local exhausted = zombie.WaypointIndex > #zombie.Waypoints
		if exhausted or zombie.PathAge > Config.PathMaxAge or moved > Config.RepathDistanceThreshold then
			paths:Request(zombie, target.Position)
		end

		if distance <= zombie.Stats.AttackRange and zombie.AttackCooldown <= 0 then
			zombie.AttackCooldown = zombie.Stats.AttackCooldown
			target.Humanoid:TakeDamage(zombie.Stats.Damage)
		end
	end

	paths:Pump(Config.PathRequestsPerStep)
end

--------------------------------------------------------------------------------
-- Movimiento
--------------------------------------------------------------------------------

local function move(activePool: Pool.Pool, delta: number)
	table.clear(moveParts)
	table.clear(moveCFrames)

	for _, id in activePool.ActiveIds do
		local zombie = activePool.All[id]
		local position = zombie.Position
		local direction: Vector3? = nil

		if zombie.Far then
			-- Solo horizontal: sin ruta no sabemos a qué altura está el suelo, y
			-- seguir la altura del jugador haría que el zombi subiera por el aire.
			local far = zombie.FarDirection
			if far.Magnitude > Config.Epsilon then
				direction = far
			end
		else
			local waypoints = zombie.Waypoints
			local index = zombie.WaypointIndex

			if index <= #waypoints then
				local goal = waypoints[index]
				if (goal - position).Magnitude <= Config.WaypointReachedDistance then
					zombie.WaypointIndex = index + 1
					index += 1
				end

				if index <= #waypoints then
					-- Con ruta sí se usa la altura: los puntos de la ruta van sobre
					-- el suelo, así que seguirlos hace que suba escaleras y rampas.
					local upcoming = waypoints[index]
					local raw = upcoming - position
					local length = raw.Magnitude
					if length > Config.Epsilon then
						direction = raw / length
					end
				end
			end

			if direction == nil then
				direction = horizontalUnit(position, zombie.TargetPosition)
			end
		end

		if direction ~= nil then
			zombie.Position = position + direction * zombie.Stats.WalkSpeed * delta
			zombie.Facing = direction
		end

		local facing = zombie.Facing
		local flat = Vector3.new(facing.X, 0, facing.Z)
		local final = zombie.Position

		table.insert(moveParts, zombie.Part)
		if flat.Magnitude > Config.Epsilon then
			table.insert(moveCFrames, CFrame.lookAt(final, final + flat))
		else
			table.insert(moveCFrames, CFrame.new(final))
		end
	end

	-- Una sola llamada para todos. Mover parte a parte despierta la física de cada
	-- una; esto reposiciona en bloque sin recalcularla.
	if #moveParts > 0 then
		Workspace:BulkMoveTo(moveParts, moveCFrames)
	end
end

--------------------------------------------------------------------------------
-- API
--------------------------------------------------------------------------------

-- nil cuando se alcanzó el tope de la regla 6, o cuando el tipo no existe.
function ZombieAI.Spawn(typeId: Types.ZombieTypeId, position: Vector3): Types.ZombieId?
	local activePool = pool
	if activePool == nil then
		return nil
	end

	local stats = Config.Types[typeId]
	if stats == nil then
		warn(`[DEAD SECTOR] tipo de zombi desconocido: {typeId}`)
		return nil
	end

	local zombie = activePool:Acquire(stats, position + Vector3.new(0, Config.GroundOffset, 0))
	if zombie == nil then
		return nil
	end

	return zombie.Id
end

-- Devuelve true si esta baja lo mató. El daño ya viene calculado y validado por
-- el sistema de combate: acá no se decide cuánto, solo se resta y se avisa.
function ZombieAI.Damage(id: Types.ZombieId, amount: number, killer: Player?): boolean
	local activePool = pool
	if activePool == nil then
		return false
	end

	local zombie = activePool:Get(id)
	if zombie == nil then
		return false
	end

	if not zombie:TakeDamage(amount) then
		return false
	end

	local info: Types.KillInfo = {
		ZombieId = id,
		TypeId = zombie.TypeId,
		Position = zombie.Position,
		Killer = killer,
	}

	activePool:Release(id)
	ZombieAI.OnZombieKilled:Fire(info)

	return true
end

-- Retirar sin que cuente como baja: no emite nada, así que no da XP ni suma a la
-- brecha. Es lo que usa el benchmark para limpiar.
function ZombieAI.Despawn(id: Types.ZombieId)
	local activePool = pool
	if activePool ~= nil then
		activePool:Release(id)
	end
end

function ZombieAI.DespawnAll()
	local activePool = pool
	if activePool ~= nil then
		activePool:ReleaseAll()
	end
	local paths = scheduler
	if paths ~= nil then
		paths:Clear()
	end
end

-- Dónde estaba un zombi en un instante pasado. Lo usará el Prompt 2 para
-- rebobinar al momento del disparo. nil si el instante queda fuera del buffer.
function ZombieAI.PositionAt(id: Types.ZombieId, when: number): Vector3?
	local activePool = pool
	if activePool == nil then
		return nil
	end
	local zombie = activePool:Get(id)
	if zombie == nil then
		return nil
	end
	return zombie:PositionAt(when)
end

function ZombieAI.GetStats(): Stats
	local activePool = pool
	local paths = scheduler

	return {
		Active = if activePool ~= nil then activePool:ActiveCount() else 0,
		ThinkMicros = lastThinkMicros,
		MoveMicros = lastMoveMicros,
		PathQueue = if paths ~= nil then paths:Pending() else 0,
		PathFailures = if paths ~= nil then paths.Failures else 0,
	}
end

--------------------------------------------------------------------------------
-- Ciclo de vida
--------------------------------------------------------------------------------

function ZombieAI.Init(_self: Types.System)
	pool = Pool.new(Workspace)
	scheduler = PathScheduler.new(Config.MaxLive)
end

function ZombieAI.Start(_self: Types.System)
	local activePool = pool
	local paths = scheduler
	assert(activePool ~= nil and paths ~= nil, "ZombieAI.Start antes de Init")

	connection = RunService.Heartbeat:Connect(function(delta: number)
		thinkAccumulator += delta
		historyAccumulator += delta

		if thinkAccumulator >= Config.StepInterval then
			local started = os.clock()
			think(activePool, paths, thinkAccumulator)
			lastThinkMicros = (os.clock() - started) * MICROS_PER_SECOND
			thinkAccumulator = 0
		end

		local started = os.clock()
		move(activePool, delta)
		lastMoveMicros = (os.clock() - started) * MICROS_PER_SECOND

		if historyAccumulator >= HISTORY_INTERVAL then
			local now = Workspace:GetServerTimeNow()
			for _, id in activePool.ActiveIds do
				activePool.All[id]:RecordPosition(now)
			end
			historyAccumulator = 0
		end
	end)
end

function ZombieAI.Stop()
	if connection ~= nil then
		connection:Disconnect()
		connection = nil
	end
end

return ZombieAI
