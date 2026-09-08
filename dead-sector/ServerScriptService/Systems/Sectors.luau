--!strict
--[[
	Systems/Sectors.luau — qué sectores están abiertos en este servidor.

	Ocho sectores definidos como datos. El 1 siempre abierto. Cuando la brecha
	llega al umbral, el sector se abre para todos los que estén dentro y sigue
	abierto el resto de la sesión.

	Nunca: cerrar un sector ya abierto durante la sesión, ni abrir uno por petición
	del cliente.

	Al abrirse sube el nivel de amenaza global que lee el Director.

	Estado: interfaz. Lo implementa el Prompt 3. Configuración en Config/Sectors.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Types = require(ReplicatedStorage.Types)

local Sectors: Types.System = {
	Name = "Sectors",
	Phase = "MVP",

	-- Preparar estado propio. Todavía no se puede contar con los demás sistemas.
	Init = function(_self: Types.System)
		-- Prompt 3
	end,

	-- Arrancar. Aquí ya existen todos los sistemas y todos pasaron por Init.
	Start = function(_self: Types.System)
		-- Prompt 3
	end,
}

return Sectors
