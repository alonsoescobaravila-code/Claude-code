--!strict
--[[
	Systems/Data.luau — el perfil del jugador, cargado y guardado.

	DataStore con bloqueo de sesión, escrituras en pcall con espera creciente, y
	guardado por lotes cada 60 segundos más PlayerRemoving y BindToClose. Versión
	de esquema con migración, para que cambiar la forma del perfil no borre a nadie.

	Nunca: entregar un perfil vacío cuando la carga falla. Se expulsa al jugador con
	un mensaje claro. Expulsar molesta un minuto; sobrescribir se pierde para
	siempre.

	Guarda progresión personal. NO guarda el estado de brecha: eso es por sesión
	de servidor.

	Estado: interfaz. Lo implementa el Prompt 5. Configuración en Config/Data.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Types = require(ReplicatedStorage.Types)

local Data: Types.System = {
	Name = "Data",
	Phase = "MVP",

	-- Preparar estado propio. Todavía no se puede contar con los demás sistemas.
	Init = function(_self: Types.System)
		-- Prompt 5
	end,

	-- Arrancar. Aquí ya existen todos los sistemas y todos pasaron por Init.
	Start = function(_self: Types.System)
		-- Prompt 5
	end,
}

return Data
