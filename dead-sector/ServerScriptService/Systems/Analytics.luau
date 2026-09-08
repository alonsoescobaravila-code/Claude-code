--!strict
--[[
	Systems/Analytics.luau — qué se mide para poder tunear con datos.

	En qué sector se atasca el servidor, en qué nivel se va la gente, y cuánto tarda
	el Sector 2 en abrirse con gente dentro. Esa última métrica es la que valida el
	gancho entero.

	Nunca: registrar chat ni texto escrito por jugadores.

	Sin esto, tunear la curva de nivel y los umbrales de brecha es adivinar.

	Estado: interfaz. Lo implementa el junto al Prompt 5. Configuración en
	Config/Analytics.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Types = require(ReplicatedStorage.Types)

local Analytics: Types.System = {
	Name = "Analytics",
	Phase = "Fase2",

	-- Preparar estado propio. Todavía no se puede contar con los demás sistemas.
	Init = function(_self: Types.System)
		-- junto al Prompt 5
	end,

	-- Arrancar. Aquí ya existen todos los sistemas y todos pasaron por Init.
	Start = function(_self: Types.System)
		-- junto al Prompt 5
	end,
}

return Analytics
