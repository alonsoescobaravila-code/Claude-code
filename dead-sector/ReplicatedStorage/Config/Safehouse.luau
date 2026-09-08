--!strict
--[[
	Config/Safehouse.luau — el refugio y los carroñeros offline.

	SOURCE: informe — banco de trabajo, armería y almacén, más carroñeros NPC que
	generan chatarra mientras el jugador está desconectado, con tope diario. Es la
	progresión offline y la razón número uno de volver al día siguiente.

	El tope diario no es negociable: sin él, dejar el juego cerrado una semana
	rompe la economía entera.
]]

local Freeze = require(script.Parent.Freeze)

export type SafehouseUpgrade = {
	Id: string,
	DisplayName: string,
	MaxLevel: number,
	BaseCost: number,
	-- Coste del nivel n = BaseCost * CostGrowth^(n-1).
	CostGrowth: number,
}

export type SafehouseConfig = {
	Upgrades: { SafehouseUpgrade },
	-- Carroñeros base, sin el gamepass de refugio ampliado.
	BaseScavengers: number,
	-- Chatarra por carroñero y hora offline.
	ScrapPerScavengerPerHour: number,
	-- Tope diario de chatarra offline, sumando todos los carroñeros.
	DailyOfflineCap: number,
	-- Horas de acumulación máximas. Más allá, deja de sumar.
	MaxOfflineHours: number,
	-- Sueldo diario de los carroñeros. Sumidero. SOURCE: informe.
	ScavengerUpkeepPerDay: number,
}

local Safehouse: SafehouseConfig = {
	BaseScavengers = 2, -- TUNE (Prompt 8)
	ScrapPerScavengerPerHour = 40, -- TUNE (Prompt 8)
	DailyOfflineCap = 1500, -- TUNE (Prompt 8)
	MaxOfflineHours = 8, -- TUNE (Prompt 8)
	ScavengerUpkeepPerDay = 100, -- TUNE (Prompt 8)

	Upgrades = {
		{ Id = "Workbench", DisplayName = "Banco de trabajo", MaxLevel = 5, BaseCost = 800, CostGrowth = 2 },
		{ Id = "Armoury", DisplayName = "Armería", MaxLevel = 5, BaseCost = 1200, CostGrowth = 2 },
		{ Id = "Storage", DisplayName = "Almacén", MaxLevel = 5, BaseCost = 600, CostGrowth = 1.8 },
	},
}

return Freeze(Safehouse)
