--!strict
--[[
	Systems/ZombieAI.luau — un solo bucle a paso fijo para todos los zombis.

	Un bucle, una estructura OOP, todos los zombis dentro. Ruta recalculada solo
	cuando el objetivo se movió más del umbral, peticiones repartidas entre frames,
	movimiento por lotes, colisión y sombras apagadas, y modo barato para los que
	están lejos de todo jugador.

	Nunca: un script por zombi, ni una conexión por frame por entidad, ni superar
	el tope de zombis vivos de Config. El tope no se negocia.

	Es el sistema que decide si el servidor aguanta. Todo lo demás se puede
	arreglar después; esto no.

	Estado: interfaz. Lo implementa el Prompt 1. Configuración en Config/ZombieAI.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Types = require(ReplicatedStorage.Types)

local ZombieAI: Types.System = {
	Name = "ZombieAI",
	Phase = "MVP",

	-- Preparar estado propio. Todavía no se puede contar con los demás sistemas.
	Init = function(_self: Types.System)
		-- Prompt 1
	end,

	-- Arrancar. Aquí ya existen todos los sistemas y todos pasaron por Init.
	Start = function(_self: Types.System)
		-- Prompt 1
	end,
}

return ZombieAI
