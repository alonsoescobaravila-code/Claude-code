--!strict
--[[
	Systems/Combat.luau — resuelve el disparo y decide el daño.

	El cliente predice —animación, destello, sonido y retroceso salen al instante—
	y manda una petición. Este módulo rebobina el buffer de posiciones al momento
	del disparo, comprueba distancia, línea de visión, estado del arma, munición y
	enfriamiento, y solo entonces aplica daño.

	Nunca: aceptar un valor de daño, un objetivo o una confirmación de muerte que
	venga del cliente. La petición dice desde dónde y hacia dónde, y nada más.

	Rechazar un impacto legítimo de vez en cuando es aceptable. Confiar en el
	cliente no.

	Estado: interfaz. Lo implementa el Prompt 2. Configuración en Config/Combat
	y Config/Weapons.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Types = require(ReplicatedStorage.Types)

local Combat: Types.System = {
	Name = "Combat",
	Phase = "MVP",

	-- Preparar estado propio. Todavía no se puede contar con los demás sistemas.
	Init = function(_self: Types.System)
		-- Prompt 2
	end,

	-- Arrancar. Aquí ya existen todos los sistemas y todos pasaron por Init.
	Start = function(_self: Types.System)
		-- Prompt 2
	end,
}

return Combat
