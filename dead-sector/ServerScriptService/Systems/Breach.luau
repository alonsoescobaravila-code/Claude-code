--!strict
--[[
	Systems/Breach.luau — el contador colectivo de bajas del servidor.

	Es el gancho del juego. Un contador compartido, siempre visible, que sube con
	cada baja validada según el peso del tipo de zombi. El cliente solo muestra un
	valor replicado.

	Nunca: incrementarlo desde nada que no sea una baja que el propio servidor
	validó. Rule 2, y es la que más caro sale romper: manipularlo arruina la
	partida de todo el servidor, no solo la del tramposo.

	Quien entra tarde ve los sectores ya abiertos y un resumen de lo conseguido.
	Es lo que convierte un servidor avanzado en un logro colectivo.

	Estado: interfaz. Lo implementa el Prompt 3. Configuración en Config/Breach.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Types = require(ReplicatedStorage.Types)

local Breach: Types.System = {
	Name = "Breach",
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

return Breach
