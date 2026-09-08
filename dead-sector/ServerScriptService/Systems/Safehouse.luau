--!strict
--[[
	Systems/Safehouse.luau — el refugio y los carroñeros que trabajan offline.

	Banco de trabajo, armería y almacén, mejorables con chatarra. Alberga a los
	carroñeros NPC que generan chatarra mientras el jugador está desconectado.

	Nunca: recolección offline sin tope diario. Sin él, una semana cerrado rompe la
	economía entera.

	Es la razón número uno de volver al día siguiente.

	Estado: interfaz. Lo implementa el Prompt 8. Configuración en Config/Safehouse.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Types = require(ReplicatedStorage.Types)

local Safehouse: Types.System = {
	Name = "Safehouse",
	Phase = "Fase2",

	-- Preparar estado propio. Todavía no se puede contar con los demás sistemas.
	Init = function(_self: Types.System)
		-- Prompt 8
	end,

	-- Arrancar. Aquí ya existen todos los sistemas y todos pasaron por Init.
	Start = function(_self: Types.System)
		-- Prompt 8
	end,
}

return Safehouse
