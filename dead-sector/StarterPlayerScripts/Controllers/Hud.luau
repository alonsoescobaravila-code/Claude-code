--!strict
--[[
	Controllers/Hud.luau — el contador de brecha, la vida, la munición y el minimapa.

	El contador de brecha es el elemento más importante de la pantalla: siempre
	visible y legible de un vistazo. Es la frase que retiene —«faltan 340 bajas
	para el Sector 4»— y no puede quedar tapada por nada.

	Nunca: crear ni destruir GuiObjects durante la partida. Se reservan y se
	reutilizan, sobre todo los números de daño y las marcas de impacto. Crear
	objetos justo cuando hay cuarenta zombis en pantalla es exactamente cuando el
	teléfono no puede.

	Estado: interfaz. Lo implementa el Prompt 7.
]]

local Hud = {}

function Hud.Init()
	-- Prompt 7
end

function Hud.Start()
	-- Prompt 7
end

return Hud
