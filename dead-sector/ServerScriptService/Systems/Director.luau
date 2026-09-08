--!strict
--[[
	Systems/Director.luau — decide qué aparece, dónde y cuándo.

	Observa vida media, munición, jugadores vivos y dispersión, y alterna presión
	con calma. La calma no es tiempo muerto: es lo que hace que la horda siguiente
	se sienta.

	Nunca: una rampa lineal, ni aparecer delante de la cara de alguien (se lee como
	fallo, no como dificultad), ni pasarse del tope de ZombieAI. Si el servidor
	sufre, baja la cantidad antes que la calidad.

	Lleva un overlay de depuración que explica por qué eligió lo que eligió. Sin
	él se tunea a ciegas.

	Estado: interfaz. Lo implementa el Prompt 6. Configuración en Config/Director.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Types = require(ReplicatedStorage.Types)

local Director: Types.System = {
	Name = "Director",
	Phase = "Fase2",

	-- Preparar estado propio. Todavía no se puede contar con los demás sistemas.
	Init = function(_self: Types.System)
		-- Prompt 6
	end,

	-- Arrancar. Aquí ya existen todos los sistemas y todos pasaron por Init.
	Start = function(_self: Types.System)
		-- Prompt 6
	end,
}

return Director
