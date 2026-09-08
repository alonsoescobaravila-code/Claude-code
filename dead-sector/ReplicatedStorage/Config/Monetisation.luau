--!strict
--[[
	Config/Monetisation.luau — pasadas de juego, productos y la línea que no se cruza.

	No estaba en la lista del Prompt 0. Está acá porque Config/Classes referencia
	gamepasses y porque la regla 8 dice que ningún número de juego vive fuera de
	Config: dejar los precios sueltos hasta el Prompt 8 garantizaba inventarlos.

	SOURCE: informe — todos los precios en Robux. Los ids están en 0 a propósito:
	se rellenan con los reales del Creator Dashboard después de crear cada pasada.
	Un id inventado compila igual y falla en producción, así que el arranque debe
	avisar cuando siga en 0.

	La línea que no se cruza: NO hay revive pagado. Revivir es gratis si un
	compañero te levanta, y hay tres autorevives diarios que se recargan solos. Un
	gamepass puede acelerar esa recarga; nunca puede vender revives. Cobrar en el
	momento de máxima frustración a un jugador de once años es exactamente lo que
	este juego no hace.
]]

local Freeze = require(script.Parent.Freeze)

export type Gamepass = {
	Key: string,
	DisplayName: string,
	PriceRobux: number,
	-- Id real del gamepass. 0 = todavía no creado en el Creator Dashboard.
	AssetId: number,
	-- Qué entrega. Ninguna entrada puede dar ventaja decisiva de combate.
	Grants: string,
}

export type DeveloperProduct = {
	Key: string,
	DisplayName: string,
	PriceRobux: number,
	AssetId: number,
	Grants: string,
}

export type MonetisationConfig = {
	Gamepasses: { Gamepass },
	Products: { DeveloperProduct },
	-- Autorevives gratuitos al día. SOURCE: informe.
	FreeSelfRevivesPerDay: number,
	-- Horas que tarda en recargarse un autorevive sin gamepass.
	SelfReviveRechargeHours: number,
	-- Multiplicador de recarga con el gamepass. Acelera; nunca vende revives.
	SelfReviveRechargeMultiplier: number,
	-- Levantar a un compañero es gratis y siempre lo será.
	TeammateReviveIsFree: boolean,
}

local Monetisation: MonetisationConfig = {
	FreeSelfRevivesPerDay = 3, -- SOURCE: informe
	SelfReviveRechargeHours = 8, -- TUNE (Prompt 8)
	SelfReviveRechargeMultiplier = 2, -- TUNE (Prompt 8)
	TeammateReviveIsFree = true, -- SOURCE: informe. No cambiar.

	Gamepasses = {
		{ Key = "ExtraLoadoutSlot", DisplayName = "Ranura de equipo extra", PriceRobux = 99, AssetId = 0, Grants = "Un arma más equipada a la vez." },
		{ Key = "ScrapMagnet", DisplayName = "Imán de chatarra", PriceRobux = 199, AssetId = 0, Grants = "Recoge la chatarra al acercarte. Conveniencia, cero ventaja de combate." },
		{ Key = "EngineerClass", DisplayName = "Clase Ingeniero", PriceRobux = 499, AssetId = 0, Grants = "Desbloquea la clase Ingeniero. Sidegrade." },
		{ Key = "MedicClass", DisplayName = "Clase Médico", PriceRobux = 499, AssetId = 0, Grants = "Desbloquea la clase Médico. Sidegrade." },
		{ Key = "ScoutClass", DisplayName = "Clase Explorador", PriceRobux = 499, AssetId = 0, Grants = "Desbloquea la clase Explorador. Sidegrade." },
		{ Key = "ExpandedSafehouse", DisplayName = "Refugio ampliado", PriceRobux = 699, AssetId = 0, Grants = "Más almacén y un carroñero extra." },
		{ Key = "VipRadio", DisplayName = "Radio VIP", PriceRobux = 1299, AssetId = 0, Grants = "Cosmético, etiqueta de chat, doble recolección offline y aviso anticipado de brecha." },
	},

	Products = {
		{ Key = "ScrapSmall", DisplayName = "Chatarra · pequeño", PriceRobux = 99, AssetId = 0, Grants = "Pack de chatarra." },
		{ Key = "ScrapMedium", DisplayName = "Chatarra · mediano", PriceRobux = 499, AssetId = 0, Grants = "Pack de chatarra." },
		{ Key = "ScrapLarge", DisplayName = "Chatarra · grande", PriceRobux = 2499, AssetId = 0, Grants = "Pack de chatarra." },
		{ Key = "RespecToken", DisplayName = "Ficha de respec", PriceRobux = 149, AssetId = 0, Grants = "Reasignar todos los puntos de perk." },
	},
}

return Freeze(Monetisation)
