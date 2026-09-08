--!strict
--[[
	Config/Perks.luau — las tres ramas.

	SOURCE: informe — Combate, Supervivencia y Carroñeo, diseñadas como decisiones
	con costo: elegir una rama tiene que significar renunciar a otra. Si las tres
	se pueden llenar, no son perks, son una barra de progreso más.

	Los perks concretos los define el Prompt 4 junto con la curva de nivel, porque
	el número de puntos disponibles y lo que cuesta cada rama son el mismo problema.
]]

local Freeze = require(script.Parent.Freeze)

export type PerkBranch = {
	Id: string,
	DisplayName: string,
	Description: string,
}

export type PerksConfig = {
	Branches: { PerkBranch },
	-- Tope de puntos gastables en una sola rama. Es lo que fuerza la renuncia.
	MaxPointsPerBranch: number,
	-- Puntos gastados en una rama para desbloquear su siguiente escalón.
	TierUnlockCost: { number },
	-- El respec se compra como dev product. Nunca se regala en bucle: dejaría de
	-- ser una decisión.
	FreeRespecsPerAccount: number,
}

local Perks: PerksConfig = {
	MaxPointsPerBranch = 20, -- TUNE (Prompt 4)
	TierUnlockCost = { 0, 5, 12, 20 }, -- TUNE (Prompt 4)
	FreeRespecsPerAccount = 1, -- TUNE (Prompt 8)

	Branches = {
		{ Id = "Combat", DisplayName = "Combate", Description = "Daño, cadencia y manejo del arma." },
		{ Id = "Survival", DisplayName = "Supervivencia", Description = "Vida, resistencia y autorevives." },
		{ Id = "Scavenging", DisplayName = "Carroñeo", Description = "Chatarra, materiales y botín." },
	},
}

return Freeze(Perks)
