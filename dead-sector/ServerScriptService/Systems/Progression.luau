--!strict
--[[
	Systems/Progression.luau — nivel de superviviente y puntos de perk.

	XP por baja, escalada por tipo de zombi y por sector. Cada nivel da un punto de
	perk. La curva tiene que meter los primeros 10 niveles en la primera sesión y
	frenar después.

	Nunca: otorgar XP desde un mensaje del cliente. Solo desde un evento de baja que
	el servidor validó.

	Es la progresión que se guarda. Su contraparte, la brecha, no se guarda nunca.

	Estado: interfaz. Lo implementa el Prompt 4. Configuración en Config/Progression.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Types = require(ReplicatedStorage.Types)

local Progression: Types.System = {
	Name = "Progression",
	Phase = "MVP",

	-- Preparar estado propio. Todavía no se puede contar con los demás sistemas.
	Init = function(_self: Types.System)
		-- Prompt 4
	end,

	-- Arrancar. Aquí ya existen todos los sistemas y todos pasaron por Init.
	Start = function(_self: Types.System)
		-- Prompt 4
	end,
}

return Progression
