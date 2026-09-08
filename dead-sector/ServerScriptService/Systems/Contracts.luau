--!strict
--[[
	Systems/Contracts.luau — tres objetivos diarios y uno semanal.

	Empujan variedad: matar con un tipo de arma, sobrevivir en un sector concreto,
	revivir compañeros. Un rerol gratuito al día.

	Nunca: un reinicio que dependa del reloj del jugador. Va por hora UTC fija, o
	alguien cobra dos veces cambiando la hora del teléfono.

	Añadir un objetivo es una entrada más en Config/Contracts.ObjectiveKinds.

	Estado: interfaz. Lo implementa el Prompt 8. Configuración en Config/Contracts.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Types = require(ReplicatedStorage.Types)

local Contracts: Types.System = {
	Name = "Contracts",
	Phase = "Fase3",

	-- Preparar estado propio. Todavía no se puede contar con los demás sistemas.
	Init = function(_self: Types.System)
		-- Prompt 8
	end,

	-- Arrancar. Aquí ya existen todos los sistemas y todos pasaron por Init.
	Start = function(_self: Types.System)
		-- Prompt 8
	end,
}

return Contracts
