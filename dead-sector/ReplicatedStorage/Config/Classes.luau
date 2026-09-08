--!strict
--[[
	Config/Classes.luau — cuatro roles que se complementan.

	SOURCE: informe — Tirador, Ingeniero, Médico y Explorador. Son sidegrades:
	distintos, nunca mejores. Por eso cada clase declara qué entrega Y a qué
	renuncia. Una clase sin campo Tradeoff no está diseñada, está vendida.

	El Tirador es gratuito. Las otras tres son gamepass de 499 R$ y son el motor
	principal de ingresos, lo que hace que el equilibrio importe todavía más:
	si la clase pagada gana, el juego es pay to win.
]]

local Freeze = require(script.Parent.Freeze)

export type ClassDefinition = {
	Id: string,
	DisplayName: string,
	Gives: string,
	-- A qué renuncia. Rule del informe: sidegrade, nunca upgrade.
	Tradeoff: string,
	-- 0 si es gratuita. Si no, el gamepass que la desbloquea (Config/Monetisation).
	GamepassKey: string?,
}

export type ClassesConfig = {
	Default: string,
	List: { ClassDefinition },
}

local Classes: ClassesConfig = {
	Default = "Marksman",

	List = {
		{
			Id = "Marksman",
			DisplayName = "Tirador",
			Gives = "Más daño a distancia y menos dispersión.",
			Tradeoff = "Menos vida y sin utilidad de apoyo.",
			GamepassKey = nil,
		},
		{
			Id = "Engineer",
			DisplayName = "Ingeniero",
			Gives = "Torretas y barricadas desplegables.",
			Tradeoff = "Arma personal más débil; depende de posicionarse.",
			GamepassKey = "EngineerClass",
		},
		{
			Id = "Medic",
			DisplayName = "Médico",
			Gives = "Cura y levanta compañeros más rápido.",
			Tradeoff = "Daño claramente menor; no sostiene un sector solo.",
			GamepassKey = "MedicClass",
		},
		{
			Id = "Scout",
			DisplayName = "Explorador",
			Gives = "Ve botín y enemigos a distancia; se mueve más rápido.",
			Tradeoff = "Menos vida y menos munición de reserva.",
			GamepassKey = "ScoutClass",
		},
	},
}

return Freeze(Classes)
