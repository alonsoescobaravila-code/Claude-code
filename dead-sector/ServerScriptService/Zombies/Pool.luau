--!strict
--[[
	Zombies/Pool.luau — la reserva de zombis.

	Las MaxLive partes se crean una sola vez al arrancar el servidor y no se
	destruyen nunca. Aparecer un zombi es moverlo desde el aparcadero y ponerle
	los datos de su tipo; matarlo es devolverlo. Instance.new en mitad de una
	horda es un pico de servidor justo cuando menos margen hay, y Destroy además
	obliga al cliente a recoger basura en el peor momento.

	Los activos se guardan en un array denso más un mapa de id a posición dentro
	de ese array. Así el bucle recorre memoria contigua y dar de baja a uno cuesta
	lo mismo con cuarenta que con cuatro: se intercambia con el último y se corta.
	Recorrer un diccionario con huecos, en cambio, se va degradando a medida que
	entran y salen zombis.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Types = require(ReplicatedStorage.Types)
local Config = require(ReplicatedStorage.Config.ZombieAI)
local Zombie = require(script.Parent.Zombie)

local Pool = {}
Pool.__index = Pool

type self = {
	Folder: Folder,
	All: { Zombie.Zombie },
	Free: { Types.ZombieId },
	ActiveIds: { Types.ZombieId },
	ActiveAt: { [Types.ZombieId]: number },
}

export type Pool = typeof(setmetatable({} :: self, Pool))

-- Las cuatro banderas del prompt, y la razón de cada una:
-- CanCollide  el zombi no empuja ni es empujado; lo mueve el bucle, no la física.
-- CanQuery    ningún raycast le pega. Los impactos se resuelven contra el buffer
--             de posiciones pasadas, no contra la parte que está en el mundo.
-- CanTouch    sin eventos de contacto, que se disparan por par de partes y con
--             cuarenta zombis juntos son miles por segundo.
-- CastShadow  la sombra de cuarenta cuerpos en movimiento es coste de GPU en el
--             teléfono del jugador, no del servidor, y es el que menos sobra.
local function createPart(index: number, parent: Folder): BasePart
	local part = Instance.new("Part")
	part.Name = `Zombie{index}`
	part.Anchored = true
	part.CanCollide = false
	part.CanQuery = false
	part.CanTouch = false
	part.CastShadow = false
	part.Transparency = 1
	part.Material = Enum.Material.SmoothPlastic
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	part.CFrame = CFrame.new(Config.ParkingPosition + Vector3.new(index * Config.ParkingSpacing, 0, 0))
	part.Parent = parent
	return part
end

function Pool.new(parent: Instance): Pool
	local folder = Instance.new("Folder")
	folder.Name = "Zombies"
	folder.Parent = parent

	local all: { Zombie.Zombie } = table.create(Config.MaxLive)
	local free: { Types.ZombieId } = table.create(Config.MaxLive)

	-- Un tipo cualquiera para nacer: al activarse se sobrescribe con el real.
	local seed: Types.ZombieType? = nil
	for _, stats in Config.Types do
		seed = stats
		break
	end
	assert(seed ~= nil, "Config/ZombieAI no declara ningún tipo de zombi")

	for index = 1, Config.MaxLive do
		all[index] = Zombie.new(index, createPart(index, folder), seed)
		free[index] = Config.MaxLive - index + 1
	end

	return setmetatable({
		Folder = folder,
		All = all,
		Free = free,
		ActiveIds = table.create(Config.MaxLive),
		ActiveAt = {},
	} :: self, Pool)
end

-- nil cuando la reserva está agotada. Es el tope duro de la regla 6, y está acá
-- a propósito: si el tope se comprobara en quien llama, bastaría con que un
-- sitio se olvidara para saltárselo.
function Pool.Acquire(self: Pool, stats: Types.ZombieType, position: Vector3): Zombie.Zombie?
	local id = table.remove(self.Free)
	if id == nil then
		return nil
	end

	local zombie = self.All[id]
	zombie:Activate(stats, position)

	table.insert(self.ActiveIds, id)
	self.ActiveAt[id] = #self.ActiveIds

	return zombie
end

function Pool.Release(self: Pool, id: Types.ZombieId)
	local at = self.ActiveAt[id]
	if at == nil then
		return
	end

	self.All[id]:Deactivate()

	-- Intercambio con el último y corte: O(1), y el array sigue denso.
	local activeIds = self.ActiveIds
	local last = #activeIds
	local moved = activeIds[last]
	activeIds[at] = moved
	self.ActiveAt[moved] = at
	activeIds[last] = nil

	self.ActiveAt[id] = nil
	table.insert(self.Free, id)
end

function Pool.Get(self: Pool, id: Types.ZombieId): Zombie.Zombie?
	-- Anotado como opcional a propósito: un id fuera de rango da nil, y sin la
	-- anotación el verificador da por hecho que el array siempre tiene algo.
	local zombie: Zombie.Zombie? = self.All[id]
	if zombie == nil or not zombie.Active then
		return nil
	end
	return zombie
end

function Pool.ActiveCount(self: Pool): number
	return #self.ActiveIds
end

function Pool.ReleaseAll(self: Pool)
	-- Hacia atrás porque Release corta del final del array denso.
	for index = #self.ActiveIds, 1, -1 do
		self:Release(self.ActiveIds[index])
	end
end

return Pool
