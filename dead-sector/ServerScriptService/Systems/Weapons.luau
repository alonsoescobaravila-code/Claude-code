--!strict
--[[
	Systems/Weapons.luau — niveles, tiers y el arsenal del jugador.

	Cada arma sube de nivel con el uso y mejora daño, cadencia y recarga dentro de
	su tier. Subir de tier cuesta chatarra más un material que solo cae en un
	sector concreto: por eso explorar alimenta el arsenal.

	Nunca: un arma que necesite código propio. Añadir una es una entrada más en
	Config/Weapons.Catalogue.

	El catálogo de 18 armas y su curva de poder los entrega el Prompt 4, explicados.

	Estado: interfaz. Lo implementa el Prompt 4. Configuración en Config/Weapons.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Types = require(ReplicatedStorage.Types)

local Weapons: Types.System = {
	Name = "Weapons",
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

return Weapons
