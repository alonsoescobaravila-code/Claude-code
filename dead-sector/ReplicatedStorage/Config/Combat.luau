--!strict
--[[
	Config/Combat.luau — validación del servidor y sensación del disparo.

	El modelo está fijado por el informe: hitscan, el cliente predice, el servidor
	rebobina y decide. Los márgenes de acá son los que separan "rechaza trampas"
	de "rechaza jugadores con ping alto", y solo se ajustan viendo el registro de
	impactos rechazados, nunca de oído.

	SOURCE: informe — el buffer de posiciones cubre aproximadamente un segundo y
	las ventanas de impacto se diseñan sobre la tasa de replicación de red
	(20-30 Hz bajo carga), no sobre los 60 Hz del heartbeat.
]]

local Freeze = require(script.Parent.Freeze)

export type CombatConfig = {
	-- Historial de posiciones pasadas por entidad, en segundos.
	RewindBufferSeconds: number,
	-- Cada cuánto se toma una muestra de posición. 30 Hz: la tasa de red bajo carga.
	RewindSampleRate: number,
	-- Antigüedad máxima aceptada en la marca de tiempo del cliente. Más viejo se
	-- rechaza sin rebobinar: es un intento de disparar al pasado.
	MaxRewindSeconds: number,
	-- Tolerancia de reloj hacia el futuro. Cualquier disparo "adelantado" miente.
	MaxClockSkewSeconds: number,
	-- Margen sobre el alcance del arma antes de rechazar por distancia.
	RangeTolerance: number,
	-- Margen sobre la posición rebobinada del zombi, en studs.
	HitboxTolerance: number,
	-- Cuánto puede alejarse el origen que declara el cliente de la cabeza que el
	-- servidor le ve. Es lo que impide disparar desde el otro lado del mapa.
	MaxOriginDeviation: number,
	-- Cuánto puede desviarse de 1 la longitud del vector de dirección. Un vector
	-- gigante multiplicaría el alcance efectivo.
	MaxDirectionError: number,
	-- Techo de peticiones de disparo por jugador y segundo, aplicado en servidor.
	MaxFireRequestsPerSecond: number,
	-- Ráfaga tolerada antes de empezar a rechazar.
	FireRequestBurst: number,
	-- Peticiones rechazadas seguidas antes de registrar al jugador como sospechoso.
	SuspiciousRejectionStreak: number,
	-- Melee: el arco del golpe se resuelve con una consulta espacial en el servidor.
	MeleeArcDegrees: number,
	MeleeRange: number,
	-- Sensación: retroceso de cámara y sacudida del arma, resueltos en el cliente.
	CameraRecoilDegrees: number,
	CameraRecoilRecoverySeconds: number,
	-- Sangre irreal, geométrica. Rule 10: es requisito de la etiqueta Mild 9+.
	BloodColor: Color3,
	BloodParticleCount: number,
}

local Combat: CombatConfig = {
	RewindBufferSeconds = 1, -- SOURCE: informe
	RewindSampleRate = 30, -- SOURCE: informe (20-30 Hz)
	MaxRewindSeconds = 0.5, -- TUNE (Prompt 2)
	MaxClockSkewSeconds = 0.1, -- TUNE (Prompt 2)
	RangeTolerance = 1.15, -- TUNE (Prompt 2)
	HitboxTolerance = 2.5, -- TUNE (Prompt 2)
	MaxOriginDeviation = 8, -- TUNE (Prompt 2)
	MaxDirectionError = 0.01,
	MaxFireRequestsPerSecond = 20, -- TUNE (Prompt 2): sobre la cadencia del arma más rápida
	FireRequestBurst = 5, -- TUNE (Prompt 2)
	SuspiciousRejectionStreak = 25, -- TUNE (Prompt 9)
	MeleeArcDegrees = 90, -- TUNE (Prompt 2)
	MeleeRange = 8, -- TUNE (Prompt 2)
	CameraRecoilDegrees = 1.5, -- TUNE: se ajusta jugando, no en tabla
	CameraRecoilRecoverySeconds = 0.15, -- TUNE
	BloodColor = Color3.fromRGB(40, 90, 40), -- SOURCE: informe, verde, irreal
	BloodParticleCount = 6, -- TUNE (Prompt 10): partículas geométricas, pocas
}

return Freeze(Combat)
