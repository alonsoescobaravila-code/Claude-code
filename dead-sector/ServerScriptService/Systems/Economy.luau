--!strict
--[[
	Systems/Economy.luau — chatarra, materiales y sus sumideros.

	Moneda blanda que cae de cada baja, más materiales por sector. Se gasta en
	tiers de arma, mejoras de refugio, munición especial, sueldo de carroñeros y
	reparaciones tras morir.

	Nunca: una fuente sin sumidero. Sin sumideros la economía se infla y el juego
	pierde sentido en dos semanas.

	Todo se otorga en el servidor, desde bajas validadas.

	Estado: interfaz. Lo implementa el Prompt 4. Configuración en Config/Economy.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Types = require(ReplicatedStorage.Types)

local Economy: Types.System = {
	Name = "Economy",
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

return Economy
