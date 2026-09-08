--!strict
--[[
	Config/Sectors.luau — los ocho sectores y el umbral de bajas de cada uno.

	SOURCE: informe. Los umbrales y los materiales vienen del documento de diseño.
	La regla que los gobierna: el Sector 2 tiene que abrirse dentro de la primera
	sesión de un servidor con gente. Si no pasa, el gancho colectivo no engancha y
	lo que hay que bajar es este umbral, no subir la recompensa.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Types = require(ReplicatedStorage.Types)
local Freeze = require(script.Parent.Freeze)

export type SectorsConfig = {
	List: { Types.Sector },
	-- Sector abierto siempre, sin importar el contador.
	AlwaysOpen: Types.SectorId,
}

local Sectors: SectorsConfig = {
	AlwaysOpen = 1,

	List = {
		{
			Id = 1,
			DisplayName = "Barrio Cero",
			BreachThreshold = 0,
			IntroducesZombie = "Walker",
			Material = "Scrap",
			ThreatLevel = 1,
		},
		{
			Id = 2,
			DisplayName = "Estación",
			BreachThreshold = 150,
			IntroducesZombie = "Runner",
			Material = "Steel",
			ThreatLevel = 2,
		},
		{
			Id = 3,
			DisplayName = "El Mercado",
			BreachThreshold = 400,
			IntroducesZombie = "Armored",
			Material = "Plating",
			ThreatLevel = 3,
		},
		{
			Id = 4,
			DisplayName = "Hospital",
			BreachThreshold = 800,
			IntroducesZombie = "Spitter",
			Material = "Reagent",
			ThreatLevel = 4,
		},
		{
			Id = 5,
			DisplayName = "Túneles",
			BreachThreshold = 1400,
			IntroducesZombie = "Stalker",
			Material = "Fibre",
			ThreatLevel = 5,
		},
		{
			Id = 6,
			DisplayName = "Zona Industrial",
			BreachThreshold = 2200,
			IntroducesZombie = "Burster",
			Material = "Cores",
			ThreatLevel = 6,
		},
		{
			Id = 7,
			DisplayName = "Torre Norte",
			BreachThreshold = 3200,
			IntroducesZombie = "Screamer",
			Material = "Alloy",
			ThreatLevel = 7,
		},
		{
			Id = 8,
			DisplayName = "El Foco",
			BreachThreshold = 4500,
			IntroducesZombie = "Hive",
			Material = "Sample",
			ThreatLevel = 8,
		},
	},
}

return Freeze(Sectors)
