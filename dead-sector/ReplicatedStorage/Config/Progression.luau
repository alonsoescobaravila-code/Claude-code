--!strict
--[[
	Config/Progression.luau — nivel de superviviente y puntos de perk.

	La curva definitiva la entrega el Prompt 4 junto con la tabla de los primeros
	25 niveles. Lo que está fijado por el informe es la restricción, no la fórmula:
	los primeros 10 niveles caen dentro de la primera sesión y después la curva
	frena. Los coeficientes de abajo son un punto de partida para que el resto del
	esqueleto compile, no un balance revisado.

	Rule 1: la XP se otorga en el servidor, desde bajas validadas. Nunca desde un
	mensaje del cliente.
]]

local Freeze = require(script.Parent.Freeze)

export type ProgressionConfig = {
	MaxLevel: number,
	-- XP base por baja, antes del multiplicador del tipo de zombi y del sector.
	BaseXpPerKill: number,
	-- Multiplicador de XP por sector: matar en el Sector 5 vale más que en el 1.
	XpPerSectorMultiplier: number,
	-- Curva: XpParaSubir(n) = BaseCost * n^Exponent, redondeado.
	CurveBaseCost: number,
	CurveExponent: number,
	PerkPointsPerLevel: number,
	-- Restricciones de diseño que el Prompt 4 tiene que cumplir al fijar la curva.
	TargetLevelInFirstSession: number,
	AssumedFirstSessionMinutes: number,
}

local Progression: ProgressionConfig = {
	MaxLevel = 100, -- TUNE (Prompt 4)
	BaseXpPerKill = 10, -- TUNE (Prompt 4)
	XpPerSectorMultiplier = 1.25, -- TUNE (Prompt 4)
	CurveBaseCost = 60, -- TUNE (Prompt 4): provisional, la fórmula real la da el Prompt 4
	CurveExponent = 1.7, -- TUNE (Prompt 4)
	PerkPointsPerLevel = 1, -- SOURCE: informe
	TargetLevelInFirstSession = 10, -- SOURCE: informe
	AssumedFirstSessionMinutes = 25, -- TUNE (Prompt 4): confirmar con datos reales
}

return Freeze(Progression)
