--!strict
--[[
	Zombies/Zombie.luau — un zombi.

	Una parte anclada y una tabla de estado. Nada más. Sin Humanoid, sin física,
	sin scripts propios: un Humanoid por zombi son cientos de propiedades
	replicadas y una máquina de estados corriendo en el servidor por cada uno, y
	con cuarenta a la vez eso es el servidor entero.

	La vida, el objetivo, la ruta y el ataque viven acá como campos. Quien los
	hace avanzar es el único bucle de Systems/ZombieAI. Este módulo no se conecta
	a nada: no tiene bucle propio, no escucha eventos, no sabe qué hora es.

	Todos los campos se crean en new() y desde ahí solo se reasignan, nunca se
	añaden. Una tabla que cambia de forma en caliente obliga a Luau a rehacerla
	por dentro, y eso pasaría justo en mitad de una horda.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Types = require(ReplicatedStorage.Types)
local ConfigCombat = require(ReplicatedStorage.Config.Combat)
local ConfigZombies = require(ReplicatedStorage.Config.ZombieAI)

local HISTORY_SIZE = math.max(
	ConfigCombat.RewindSampleRate,
	math.ceil(ConfigCombat.RewindBufferSeconds * ConfigCombat.RewindSampleRate)
)

local Zombie = {}
Zombie.__index = Zombie

type self = {
	Id: Types.ZombieId,
	Part: BasePart,

	-- Vivo y en juego. Un zombi inactivo sigue existiendo, aparcado.
	Active: boolean,
	-- Sube cada vez que se activa. Una respuesta de ruta que llega tarde y trae
	-- una generación vieja se descarta: ese zombi ya murió y volvió a salir siendo
	-- otro, y aplicarle la ruta anterior lo haría caminar hacia un sitio de hace
	-- dos vidas.
	Generation: number,

	TypeId: Types.ZombieTypeId,
	Stats: Types.ZombieType,
	Health: number,

	Position: Vector3,
	Facing: Vector3,

	Target: Player?,
	TargetPosition: Vector3,

	-- Ruta actual. Vacía significa ir en línea recta al objetivo.
	Waypoints: { Vector3 },
	WaypointIndex: number,
	-- Segundos desde que se calculó la ruta.
	PathAge: number,
	-- Dónde estaba el objetivo cuando se calculó. Se recalcula solo si se alejó
	-- más del umbral, no en cada paso.
	PathTargetOrigin: Vector3,
	PathPending: boolean,

	-- Modo barato: lejos de todo jugador, sin rutas.
	Far: boolean,
	FarDirection: Vector3,
	FarTimer: number,

	AttackCooldown: number,

	-- Buffer circular de posiciones pasadas, para que el Prompt 2 pueda rebobinar
	-- al instante del disparo. Se reserva entero acá y no crece nunca.
	History: { Vector3 },
	-- La orientación también se guarda: el punto débil del Blindado depende de
	-- por dónde entró el disparo, y hay que juzgarlo con la orientación que tenía
	-- en ese instante, no con la de ahora. Girándose después no debería salvarse
	-- de un tiro que ya iba a su espalda.
	HistoryFacing: { Vector3 },
	HistoryTimes: { number },
	HistoryCursor: number,
	HistoryCount: number,
}

export type Zombie = typeof(setmetatable({} :: self, Zombie))

local ZERO = Vector3.zero
local FORWARD = Vector3.new(0, 0, -1)

function Zombie.new(id: Types.ZombieId, part: BasePart, stats: Types.ZombieType): Zombie
	local history = table.create(HISTORY_SIZE, ZERO)
	local facing = table.create(HISTORY_SIZE, FORWARD)
	local times = table.create(HISTORY_SIZE, 0)

	return setmetatable({
		Id = id,
		Part = part,
		Active = false,
		Generation = 0,
		TypeId = stats.Id,
		Stats = stats,
		Health = stats.Health,
		Position = part.Position,
		Facing = FORWARD,
		Target = nil,
		TargetPosition = ZERO,
		Waypoints = {},
		WaypointIndex = 1,
		PathAge = 0,
		PathTargetOrigin = ZERO,
		PathPending = false,
		Far = false,
		FarDirection = FORWARD,
		FarTimer = 0,
		AttackCooldown = 0,
		History = history,
		HistoryFacing = facing,
		HistoryTimes = times,
		HistoryCursor = 0,
		HistoryCount = 0,
	} :: self, Zombie)
end

-- Poner en juego. Reutiliza la parte que ya existe: no se crea ni se destruye
-- nada durante la partida.
function Zombie.Activate(self: Zombie, stats: Types.ZombieType, position: Vector3)
	self.Active = true
	self.Generation += 1
	self.TypeId = stats.Id
	self.Stats = stats
	self.Health = stats.Health
	self.Position = position
	self.Facing = FORWARD
	self.Target = nil
	self.TargetPosition = position
	table.clear(self.Waypoints)
	self.WaypointIndex = 1
	self.PathAge = 0
	self.PathTargetOrigin = position
	self.PathPending = false
	self.Far = false
	self.FarDirection = FORWARD
	self.FarTimer = 0
	self.AttackCooldown = 0
	self.HistoryCursor = 0
	self.HistoryCount = 0

	local part = self.Part
	part.Size = stats.Size
	part.Color = stats.Color
	part.Transparency = 0
	part.CFrame = CFrame.new(position)
end

function Zombie.Deactivate(self: Zombie)
	self.Active = false
	self.Target = nil
	table.clear(self.Waypoints)
	self.PathPending = false
	self.Part.Transparency = 1
end

-- Guarda dónde estaba en este instante. Lo lee el Prompt 2 para rebobinar.
function Zombie.RecordPosition(self: Zombie, now: number)
	local cursor = self.HistoryCursor % HISTORY_SIZE + 1
	self.HistoryCursor = cursor
	self.History[cursor] = self.Position
	self.HistoryFacing[cursor] = self.Facing
	self.HistoryTimes[cursor] = now

	if self.HistoryCount < HISTORY_SIZE then
		self.HistoryCount += 1
	end
end

-- Dónde estaba y hacia dónde miraba en un instante pasado. Devuelve la muestra
-- más cercana, no una interpolada: con 30 muestras por segundo la diferencia
-- queda muy por debajo de la tolerancia de impacto, y no interpolar ahorra
-- trabajo en la ruta caliente.
--
-- Recorre hacia atrás desde la más reciente y se planta en cuanto la diferencia
-- deja de reducirse. Las muestras están ordenadas en el tiempo, así que pasado
-- el instante buscado ya solo se aleja: seguir mirando las treinta es trabajo
-- tirado, y esto se llama una vez por zombi y por disparo.
--
-- nil si el instante pedido queda fuera del buffer, que es lo que tiene que
-- pasar cuando alguien manda una marca de tiempo inventada.
function Zombie.PositionAt(self: Zombie, when: number): (Vector3?, Vector3?)
	if self.HistoryCount == 0 then
		return nil, nil
	end

	local bestIndex = 0
	local bestDelta = math.huge

	for offset = 0, self.HistoryCount - 1 do
		local index = (self.HistoryCursor - offset - 1) % HISTORY_SIZE + 1
		local delta = math.abs(self.HistoryTimes[index] - when)
		if delta >= bestDelta then
			break
		end
		bestDelta = delta
		bestIndex = index
	end

	if bestIndex == 0 or bestDelta > ConfigCombat.RewindBufferSeconds then
		return nil, nil
	end

	return self.History[bestIndex], self.HistoryFacing[bestIndex]
end

-- Devuelve true si esta baja mata. Quien decide cuánto daño es el sistema de
-- combate: acá solo se resta. Rule 1.
function Zombie.TakeDamage(self: Zombie, amount: number): boolean
	if not self.Active or self.Health <= 0 then
		return false
	end

	self.Health -= amount
	return self.Health <= 0
end

Zombie.HistorySize = HISTORY_SIZE
Zombie.Epsilon = ConfigZombies.Epsilon

return Zombie
