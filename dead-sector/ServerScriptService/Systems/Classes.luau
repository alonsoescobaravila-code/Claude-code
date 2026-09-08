--!strict
--[[
	Systems/Classes.luau — los cuatro roles y su equilibrio.

	Tirador, Ingeniero, Médico y Explorador. Tres de las cuatro se venden como
	gamepass, así que el equilibrio no es una preferencia estética: si la clase
	pagada gana, el juego es pay to win.

	Nunca: una clase sin campo Tradeoff. Son sidegrades —distintas, no mejores— y
	cada una declara a qué renuncia.

	Es el principal motor de ingresos del juego. Por eso mismo tiene que ser el
	sistema más honesto.

	Estado: interfaz. Lo implementa el Prompt 8. Configuración en Config/Classes
	y Config/Monetisation.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Types = require(ReplicatedStorage.Types)

local Classes: Types.System = {
	Name = "Classes",
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

return Classes
