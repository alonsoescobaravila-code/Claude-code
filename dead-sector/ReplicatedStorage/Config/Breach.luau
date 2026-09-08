--!strict
--[[
	Config/Breach.luau — el contador colectivo y el momento en que se abre un sector.

	El contador vive en el servidor y el cliente solo muestra un valor replicado.
	Rule 2: solo lo incrementa una baja que el propio servidor validó. El peso de
	cada baja está en Config/ZombieAI (BreachWeight), junto al tipo de zombi, para
	que añadir un tipo no obligue a tocar dos archivos.

	SOURCE: informe — el sector abierto queda abierto el resto de la sesión, el
	estado NO se guarda entre sesiones, y quien entra tarde ve un resumen de lo que
	el servidor lleva conseguido.
]]

local Freeze = require(script.Parent.Freeze)

export type BreachConfig = {
	-- Cada cuánto se replica el contador al cliente. No cada baja: sería ruido de red.
	ReplicateInterval: number,
	-- Duración del anuncio a pantalla completa al abrirse un sector.
	AnnouncementSeconds: number,
	SirenSeconds: number,
	ScreenShakeSeconds: number,
	ScreenShakeIntensity: number,
	-- Aviso cuando faltan pocas bajas: es lo que retiene los últimos cinco minutos.
	NearThresholdWarning: number,
	-- Mensaje de puesta al día para quien entra con sectores ya abiertos.
	CatchUpMessageSeconds: number,
	-- El estado de brecha es por sesión de servidor. Nunca se persiste.
	PersistsBetweenSessions: boolean,
}

local Breach: BreachConfig = {
	ReplicateInterval = 0.5, -- TUNE (Prompt 3)
	AnnouncementSeconds = 5, -- TUNE (Prompt 3)
	SirenSeconds = 4, -- TUNE (Prompt 3)
	ScreenShakeSeconds = 2, -- TUNE (Prompt 3)
	ScreenShakeIntensity = 0.6, -- TUNE (Prompt 3)
	NearThresholdWarning = 25, -- TUNE (Prompt 3)
	CatchUpMessageSeconds = 8, -- TUNE (Prompt 3)
	PersistsBetweenSessions = false, -- SOURCE: informe. No cambiar sin rehacer el gancho.
}

return Freeze(Breach)
