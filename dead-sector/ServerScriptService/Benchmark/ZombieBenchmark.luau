--!strict
--[[
	Benchmark/ZombieBenchmark.luau — cuántos zombis aguanta el servidor.

	Es un ModuleScript, no un Script: no arranca solo. Se llama a mano desde la
	barra de comandos de Studio EN MODO SERVIDOR, con el juego corriendo:

	    require(game.ServerScriptService.Benchmark.ZombieBenchmark).Sweep()

	CAMINA MIENTRAS MIDE. Si el personaje se queda quieto, el objetivo nunca se
	aleja del punto donde se calculó la ruta, así que no se recalcula ninguna y la
	medición sale barata y falsa. La parte cara del sistema es precisamente el
	recálculo, y si no se provoca no se está midiendo nada.

	Sobre «por debajo de 16 ms»: el servidor de Roblox ya corre a 60 Hz cuando
	puede, así que el delta de Heartbeat vale ~16,67 ms incluso con el servidor
	vacío. Leer ese número y decir «16 ms, vamos bien» no significa nada. Lo que
	importa es si SE MANTIENE: cuando el servidor deja de llegar, el delta sube por
	encima de esos 16,67 y ahí es donde se rompe. Por eso el criterio es el
	percentil 95 del delta contra un margen sobre el paso ideal, y no la media.

	Y se informa aparte de lo que cuesta este sistema en concreto —decisión y
	movimiento, en microsegundos— porque si el frame va mal pero nuestro coste va
	bien, el problema está en otro sitio y cambiar el bucle de zombis no lo va a
	arreglar.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Config = require(ReplicatedStorage.Config.ZombieAI)
local ZombieAI = require(script.Parent.Parent.Systems.ZombieAI)

-- Paso ideal del servidor: 60 Hz.
local IDEAL_STEP_MS = 1000 / 60
-- Margen sobre el paso ideal antes de dar por perdidos los 60 Hz. Por debajo de
-- esto el servidor sigue llegando; por encima, empezó a saltarse pasos.
local TOLERANCE_MS = 1.5
local PERCENTILE = 0.95
local DEFAULT_SECONDS = 10
local SPAWN_RADIUS = 60
local SWEEP_STEP = 10
local MICROS_PER_MS = 1000

export type Result = {
	Zombies: number,
	Samples: number,
	MeanDeltaMs: number,
	P95DeltaMs: number,
	MaxDeltaMs: number,
	MeanThinkMicros: number,
	MaxThinkMicros: number,
	MeanMoveMicros: number,
	PathFailures: number,
	Holds60Hz: boolean,
}

local Benchmark = {}

local function anchorPosition(): Vector3?
	for _, player in Players:GetPlayers() do
		local character = player.Character
		if character == nil then
			continue
		end
		local root = character:FindFirstChild("HumanoidRootPart")
		if root ~= nil and root:IsA("BasePart") then
			return root.Position
		end
	end
	return nil
end

local function typeIds(): { string }
	local ids = {}
	for id in Config.Types do
		table.insert(ids, id)
	end
	table.sort(ids)
	return ids
end

local function percentile(sorted: { number }, fraction: number): number
	if #sorted == 0 then
		return 0
	end
	local index = math.clamp(math.ceil(#sorted * fraction), 1, #sorted)
	return sorted[index]
end

-- Reparte los zombis en un anillo alrededor del jugador. En anillo y no en un
-- punto porque amontonados en el mismo sitio comparten ruta y el resultado sale
-- mejor de lo que sería en juego.
local function spawnRing(count: number, centre: Vector3): number
	local ids = typeIds()
	local spawned = 0

	for index = 1, count do
		local angle = (index / count) * math.pi * 2
		local offset = Vector3.new(math.cos(angle) * SPAWN_RADIUS, 0, math.sin(angle) * SPAWN_RADIUS)
		local typeId = ids[(index - 1) % #ids + 1]

		if ZombieAI.Spawn(typeId, centre + offset) ~= nil then
			spawned += 1
		end
	end

	return spawned
end

function Benchmark.Run(count: number, seconds: number?): Result?
	local centre = anchorPosition()
	if centre == nil then
		warn("[BENCHMARK] no hay ningún personaje en el servidor. Entra al juego y vuelve a lanzarlo")
		return nil
	end

	local window = seconds or DEFAULT_SECONDS

	ZombieAI.DespawnAll()
	local spawned = spawnRing(count, centre)
	if spawned < count then
		warn(`[BENCHMARK] se pidieron {count} y salieron {spawned}: el tope de Config.MaxLive es {Config.MaxLive}`)
	end

	local deltas: { number } = {}
	local thinks: { number } = {}
	local moves: { number } = {}

	local connection = RunService.Heartbeat:Connect(function(delta: number)
		local stats = ZombieAI.GetStats()
		table.insert(deltas, delta * MICROS_PER_MS)
		table.insert(thinks, stats.ThinkMicros)
		table.insert(moves, stats.MoveMicros)
	end)

	task.wait(window)
	connection:Disconnect()

	local finalStats = ZombieAI.GetStats()
	ZombieAI.DespawnAll()

	local sortedDeltas = table.clone(deltas)
	table.sort(sortedDeltas)

	local sum, thinkSum, moveSum, thinkMax, maxDelta = 0, 0, 0, 0, 0
	for index, value in deltas do
		sum += value
		maxDelta = math.max(maxDelta, value)
		thinkSum += thinks[index]
		thinkMax = math.max(thinkMax, thinks[index])
		moveSum += moves[index]
	end

	local samples = math.max(#deltas, 1)
	local p95 = percentile(sortedDeltas, PERCENTILE)

	return {
		Zombies = spawned,
		Samples = #deltas,
		MeanDeltaMs = sum / samples,
		P95DeltaMs = p95,
		MaxDeltaMs = maxDelta,
		MeanThinkMicros = thinkSum / samples,
		MaxThinkMicros = thinkMax,
		MeanMoveMicros = moveSum / samples,
		PathFailures = finalStats.PathFailures,
		Holds60Hz = p95 <= IDEAL_STEP_MS + TOLERANCE_MS,
	}
end

local function report(result: Result)
	print(string.format(
		"%4d zombis · delta media %6.2f ms · p95 %6.2f ms · máx %6.2f ms · decisión %7.1f µs (máx %7.1f) · movimiento %6.1f µs · rutas fallidas %d · %s",
		result.Zombies,
		result.MeanDeltaMs,
		result.P95DeltaMs,
		result.MaxDeltaMs,
		result.MeanThinkMicros,
		result.MaxThinkMicros,
		result.MeanMoveMicros,
		result.PathFailures,
		if result.Holds60Hz then "60 Hz" else "NO LLEGA"
	))
end

-- Sube de SWEEP_STEP en SWEEP_STEP hasta el tope de Config.MaxLive y dice cuál
-- fue el último número que aguantó.
--
-- No pasa del tope a propósito: la reserva se crea con MaxLive partes al arrancar
-- y el tope es la regla 6, que no se salta ni para medir. Si aguanta hasta arriba,
-- el límite real está más allá: sube Config.MaxLive, reinicia el servidor y vuelve
-- a lanzarlo. La respuesta al Prompt 1 es el último número que aguantó.
function Benchmark.Sweep(seconds: number?): number
	local highest = 0

	print(`[BENCHMARK] barrido hasta {Config.MaxLive} · CAMINA durante toda la medición`)

	local count = SWEEP_STEP
	while count <= Config.MaxLive do
		local result = Benchmark.Run(count, seconds)
		if result == nil then
			return highest
		end

		report(result)
		if not result.Holds60Hz then
			print(`[BENCHMARK] se rompe en {count}. El máximo que aguanta es {highest}`)
			return highest
		end

		highest = result.Zombies
		count += SWEEP_STEP
	end

	print(`[BENCHMARK] aguantó hasta el tope ({Config.MaxLive}). Sube Config.MaxLive y repite: el límite está más arriba`)
	return highest
end

return Benchmark
