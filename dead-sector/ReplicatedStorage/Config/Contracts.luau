--!strict
--[[
	Config/Contracts.luau — tres diarios y uno semanal.

	SOURCE: informe — objetivos que empujan variedad: matar con un tipo de arma,
	sobrevivir en un sector concreto, revivir compañeros. Un rerol gratuito al día.

	Los objetivos concretos y sus recompensas los define el Prompt 8. Aquí va la
	estructura y el reloj, que es lo que el sistema de datos necesita saber desde
	el principio para no tener que migrar el perfil después.
]]

local Freeze = require(script.Parent.Freeze)

export type ContractsConfig = {
	DailyCount: number,
	WeeklyCount: number,
	FreeRerollsPerDay: number,
	-- Hora UTC del reinicio diario. Fija: si depende de la zona del jugador,
	-- alguien va a cobrar dos veces cambiando el reloj del teléfono.
	DailyResetHourUtc: number,
	-- Día de la semana del reinicio semanal. 1 = lunes.
	WeeklyResetDay: number,
	-- Tipos de objetivo válidos. Añadir uno es una entrada más, no código nuevo.
	ObjectiveKinds: { string },
	-- Un contrato extra al día para el Survivor's Pass. SOURCE: informe.
	SubscriberExtraDaily: number,
}

local Contracts: ContractsConfig = {
	DailyCount = 3, -- SOURCE: informe
	WeeklyCount = 1, -- SOURCE: informe
	FreeRerollsPerDay = 1, -- SOURCE: informe
	DailyResetHourUtc = 0, -- TUNE (Prompt 8)
	WeeklyResetDay = 1, -- TUNE (Prompt 8)
	SubscriberExtraDaily = 1, -- SOURCE: informe

	ObjectiveKinds = {
		"KillsWithFamily",
		"KillsOfZombieType",
		"SurviveInSector",
		"ReviveTeammates",
		"ScrapCollected",
	},
}

return Freeze(Contracts)
