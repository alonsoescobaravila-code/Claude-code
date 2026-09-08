--!strict
--[[
	Config/Analytics.luau — qué se mide.

	Sin esto, tunear la curva de nivel y los umbrales de brecha es adivinar. Lo que
	hay que poder responder con datos: en qué sector se atasca el servidor, en qué
	nivel se va la gente, y cuánto tarda el Sector 2 en abrirse en un servidor con
	gente (la métrica que valida el gancho entero).

	Nada de esto identifica a nadie más allá del UserId que Roblox ya expone. No se
	registra chat ni texto escrito por jugadores.
]]

local Freeze = require(script.Parent.Freeze)

export type AnalyticsConfig = {
	Enabled: boolean,
	-- Cada cuánto se envían los eventos acumulados.
	FlushIntervalSeconds: number,
	MaxEventsPerFlush: number,
	-- Eventos que el juego emite. Añadir uno es una entrada más acá.
	Events: { string },
	-- Se registra en consola además de enviarse. Útil en Studio, ruidoso en vivo.
	LogToOutput: boolean,
}

local Analytics: AnalyticsConfig = {
	Enabled = true,
	FlushIntervalSeconds = 60, -- TUNE
	MaxEventsPerFlush = 100, -- TUNE
	LogToOutput = false,

	Events = {
		"SessionStart",
		"SessionEnd",
		"LevelUp",
		"WeaponTierUp",
		"SectorOpened",
		"TimeToSectorTwo",
		"PlayerDeath",
		"PurchaseCompleted",
		"FireRequestRejected",
		"DataLoadFailure",
	},
}

return Freeze(Analytics)
