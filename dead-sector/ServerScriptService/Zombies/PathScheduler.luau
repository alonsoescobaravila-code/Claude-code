--!strict
--[[
	Zombies/PathScheduler.luau — el reparto de las peticiones de ruta.

	ComputeAsync cede el hilo y cuesta caro. Si al abrirse un sector cuarenta
	zombis piden ruta en el mismo paso, el servidor se come cuarenta cálculos de
	golpe y el frame se dispara. Acá se hacen cola y se atienden unas pocas por
	paso: los zombis que quedan esperando siguen andando con la ruta anterior o en
	línea recta, que a un par de decenas de studs no se distingue.

	La cola es un array con cabeza móvil, no un table.remove(1): sacar del
	principio de un array desplaza todo lo demás, y eso es trabajo que crece justo
	cuando la cola está llena.

	Los objetos Path se crean uno por zombi al arrancar y se reutilizan. Cada
	CreatePath asigna memoria, y en una horda serían cuarenta por segundo.
]]

local PathfindingService = game:GetService("PathfindingService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Config.ZombieAI)
local Zombie = require(script.Parent.Zombie)

local AGENT_PARAMETERS = {
	AgentRadius = Config.AgentRadius,
	AgentHeight = Config.AgentHeight,
	AgentCanJump = Config.AgentCanJump,
}

local PathScheduler = {}
PathScheduler.__index = PathScheduler

type Request = {
	Zombie: Zombie.Zombie,
	Generation: number,
	Goal: Vector3,
}

type self = {
	Queue: { Request },
	Head: number,
	Paths: { Path },
	-- Cuántas peticiones se han descartado por fallo de cálculo. Lo lee el
	-- benchmark: si sube, el mapa tiene zonas a las que no se llega y el problema
	-- es el blockout, no el código.
	Failures: number,
}

export type PathScheduler = typeof(setmetatable({} :: self, PathScheduler))

function PathScheduler.new(count: number): PathScheduler
	local paths: { Path } = table.create(count)
	for index = 1, count do
		paths[index] = PathfindingService:CreatePath(AGENT_PARAMETERS)
	end

	return setmetatable({
		Queue = {},
		Head = 1,
		Paths = paths,
		Failures = 0,
	} :: self, PathScheduler)
end

function PathScheduler.Request(self: PathScheduler, zombie: Zombie.Zombie, goal: Vector3)
	if zombie.PathPending then
		return
	end

	zombie.PathPending = true
	table.insert(self.Queue, {
		Zombie = zombie,
		Generation = zombie.Generation,
		Goal = goal,
	})
end

local function apply(self: PathScheduler, request: Request)
	local zombie = request.Zombie
	local path = self.Paths[zombie.Id]

	local ok = pcall(function()
		path:ComputeAsync(zombie.Position, request.Goal)
	end)

	-- Mientras se calculaba, el zombi pudo morir y volver a salir siendo otro.
	-- Aplicarle esta ruta lo mandaría a donde iba en su vida anterior.
	if zombie.Generation ~= request.Generation or not zombie.Active then
		return
	end

	zombie.PathPending = false

	if not ok or path.Status ~= Enum.PathStatus.Success then
		self.Failures += 1
		-- Sin ruta, línea recta. Un zombi que se queda quieto contra una pared se
		-- lee como un fallo; uno que empuja contra ella, como un zombi.
		table.clear(zombie.Waypoints)
		zombie.WaypointIndex = 1
		zombie.PathAge = 0
		zombie.PathTargetOrigin = request.Goal
		return
	end

	local waypoints = zombie.Waypoints
	table.clear(waypoints)

	-- El primer punto es donde ya está: incluirlo haría que el primer paso fuera
	-- hacia sí mismo.
	local computed = path:GetWaypoints()
	for index = 2, #computed do
		table.insert(waypoints, computed[index].Position)
	end

	zombie.WaypointIndex = 1
	zombie.PathAge = 0
	zombie.PathTargetOrigin = request.Goal
end

-- Atiende como mucho `budget` peticiones. Cada una en su propia tarea porque
-- ComputeAsync cede el hilo, y el bucle no puede quedarse esperando a nadie.
function PathScheduler.Pump(self: PathScheduler, budget: number)
	local queue = self.Queue
	local attended = 0

	while attended < budget and self.Head <= #queue do
		local request = queue[self.Head]
		queue[self.Head] = nil
		self.Head += 1
		attended += 1

		task.spawn(apply, self, request)
	end

	-- Cola vacía: se reinicia para que el array no crezca sin fin.
	if self.Head > #queue then
		table.clear(queue)
		self.Head = 1
	end
end

function PathScheduler.Pending(self: PathScheduler): number
	return #self.Queue - self.Head + 1
end

function PathScheduler.Clear(self: PathScheduler)
	table.clear(self.Queue)
	self.Head = 1
end

return PathScheduler
