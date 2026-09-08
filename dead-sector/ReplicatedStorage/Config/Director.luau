--!strict
--[[
	Config/Director.luau — el ritmo de la dificultad.

	SOURCE: informe — el Director observa vida media, munición, jugadores vivos y
	cuán dispersos están, y alterna presión y calma en vez de subir linealmente.
	La calma es lo que hace que la horda siguiente se sienta. Un aumento lineal no
	se siente como dificultad, se siente como ruido.

	Dos reglas duras: aparecer fuera del campo de visión siempre que se pueda, y
	si el servidor sufre, bajar la cantidad antes que la calidad. El tope de
	Config/ZombieAI.MaxLive manda siempre por encima de lo que decida el Director.
]]

local Freeze = require(script.Parent.Freeze)

export type DirectorConfig = {
	-- Cada cuánto reevalúa la situación.
	EvaluateInterval: number,
	-- Duración de cada estado del ciclo, en segundos.
	BuildUpSeconds: number,
	PeakSeconds: number,
	ReliefSeconds: number,
	-- Umbrales de la lectura de la situación.
	LowHealthThreshold: number,
	LowAmmoThreshold: number,
	-- Distancia por encima de la cual se considera que el grupo está disperso.
	SpreadDistanceThreshold: number,
	-- Aparición: distancia mínima y máxima a un jugador, y ángulo fuera de vista.
	MinSpawnDistance: number,
	MaxSpawnDistance: number,
	-- Un punto de aparición cuenta como fuera de vista si el ángulo con la cámara
	-- del jugador supera esto.
	OutOfSightAngle: number,
	-- Frame time del servidor por encima del cual se recorta la aparición.
	ServerStressFrameTimeMs: number,
	-- Cuánto se recorta la cantidad cuando el servidor sufre.
	StressSpawnMultiplier: number,
	-- Overlay de depuración, solo en Studio. Prompt 6.
	DebugOverlayEnabled: boolean,
}

local Director: DirectorConfig = {
	EvaluateInterval = 3, -- TUNE (Prompt 6)
	BuildUpSeconds = 30, -- TUNE (Prompt 6)
	PeakSeconds = 25, -- TUNE (Prompt 6)
	ReliefSeconds = 20, -- TUNE (Prompt 6)
	LowHealthThreshold = 0.4, -- TUNE (Prompt 6)
	LowAmmoThreshold = 0.25, -- TUNE (Prompt 6)
	SpreadDistanceThreshold = 80, -- TUNE (Prompt 6)
	MinSpawnDistance = 40, -- TUNE (Prompt 6)
	MaxSpawnDistance = 140, -- TUNE (Prompt 6)
	OutOfSightAngle = 70, -- TUNE (Prompt 6)
	ServerStressFrameTimeMs = 14, -- TUNE (Prompt 6): por debajo de los 16 ms del tope
	StressSpawnMultiplier = 0.5, -- TUNE (Prompt 6)
	DebugOverlayEnabled = false, -- Se enciende a mano en Studio para tunear.
}

return Freeze(Director)
