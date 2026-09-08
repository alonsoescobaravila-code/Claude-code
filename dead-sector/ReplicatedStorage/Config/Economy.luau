--!strict
--[[
	Config/Economy.luau — chatarra, materiales y los sumideros que la sostienen.

	SOURCE: informe — fuentes: bajas, contratos, recompensa por brecha abierta,
	carroñeros offline y primera baja del día con cada arma. Sumideros: tiers de
	arma, mejoras de refugio, munición especial, sueldo de carroñeros y
	reparaciones tras morir. Sin sumideros la economía se infla y en dos semanas
	el juego pierde sentido.

	Rule 1: toda la chatarra se otorga en el servidor, desde bajas validadas.
]]

local Freeze = require(script.Parent.Freeze)

export type EconomyConfig = {
	-- Chatarra base por baja, antes del multiplicador del tipo de zombi.
	BaseScrapPerKill: number,
	-- Multiplicador de chatarra por sector.
	ScrapPerSectorMultiplier: number,
	-- Recompensa a todos los presentes cuando se abre un sector.
	BreachOpenReward: number,
	-- Bono por la primera baja del día con cada arma. Empuja a rotar el arsenal.
	FirstKillOfDayBonus: number,
	-- Coste de reparación al morir. Es el sumidero que hace que morir importe sin
	-- cobrar dinero real por revivir.
	DeathRepairCost: number,
	-- Tope de chatarra acumulable. Evita que un exploit no detectado se vuelva
	-- permanente e imposible de revertir.
	MaxScrap: number,
	-- Materiales por sector. La clave es el id del material, el valor el sector
	-- donde cae. SOURCE: informe.
	MaterialSector: { [string]: number },
	-- Probabilidad de que una baja suelte el material de su sector.
	MaterialDropChance: number,
}

local Economy: EconomyConfig = {
	BaseScrapPerKill = 3, -- TUNE (Prompt 4)
	ScrapPerSectorMultiplier = 1.2, -- TUNE (Prompt 4)
	BreachOpenReward = 250, -- TUNE (Prompt 3)
	FirstKillOfDayBonus = 50, -- TUNE (Prompt 4)
	DeathRepairCost = 25, -- TUNE (Prompt 4)
	MaxScrap = 10000000, -- TUNE (Prompt 9)
	MaterialDropChance = 0.15, -- TUNE (Prompt 4)

	MaterialSector = {
		Scrap = 1,
		Steel = 2,
		Plating = 3,
		Reagent = 4,
		Fibre = 5,
		Cores = 6,
		Alloy = 7,
		Sample = 8,
	},
}

return Freeze(Economy)
