--!strict
--[[
	Systems/Perks.luau — tres ramas y la renuncia entre ellas.

	Combate, Supervivencia y Carroñeo. Son decisiones con costo: elegir una rama
	tiene que significar renunciar a otra.

	Nunca: dejar que se llenen las tres. Si se puede, no son perks, son otra barra
	de progreso.

	El respec se compra porque el jugador quiere probar otra build, no porque se
	equivocó.

	Estado: interfaz. Lo implementa el Prompt 4. Configuración en Config/Perks.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Types = require(ReplicatedStorage.Types)

local Perks: Types.System = {
	Name = "Perks",
	Phase = "Fase2",

	-- Preparar estado propio. Todavía no se puede contar con los demás sistemas.
	Init = function(_self: Types.System)
		-- Prompt 4
	end,

	-- Arrancar. Aquí ya existen todos los sistemas y todos pasaron por Init.
	Start = function(_self: Types.System)
		-- Prompt 4
	end,
}

return Perks
