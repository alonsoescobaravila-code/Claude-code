--!strict
--[[
	Config/Weapons.luau — tiers, familias y catálogo.

	SOURCE: informe — seis tiers, cuatro familias, cada arma sube de nivel con el
	uso, y subir de tier cuesta chatarra más un material que solo cae en un sector
	concreto. Esa es la parte que hace que explorar alimente el arsenal.

	El catálogo de 18 armas lo genera el Prompt 4 con una curva de poder explicada.
	Aquí va solo la pistola inicial, para que el Prompt 2 tenga algo con lo que
	disparar mientras se construye el combate. Cualquier otra arma que aparezca
	acá antes del Prompt 4 es un número inventado.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Types = require(ReplicatedStorage.Types)
local Freeze = require(script.Parent.Freeze)

export type TierRule = {
	Tier: number,
	ScrapCost: number,
	-- Material exclusivo del sector que hay que traer para subir a este tier.
	Material: string?,
	-- Multiplicador de estadísticas al entrar al tier.
	StatMultiplier: number,
}

export type WeaponsConfig = {
	MaxTier: number,
	MaxLevelPerTier: number,
	Families: { Types.WeaponFamily },
	-- Coste y material de cada salto de tier. El tier 1 no se compra.
	TierRules: { TierRule },
	-- Cuánta XP de arma da una baja, antes de multiplicadores.
	BaseWeaponXpPerKill: number,
	-- Mejora por nivel de arma dentro de su tier.
	DamagePerLevel: number,
	FireRatePerLevel: number,
	ReloadSpeedPerLevel: number,
	StartingWeapon: Types.WeaponId,
	Catalogue: { [Types.WeaponId]: Types.Weapon },
}

local Weapons: WeaponsConfig = {
	MaxTier = 6, -- SOURCE: informe
	MaxLevelPerTier = 10, -- TUNE (Prompt 4)
	Families = { "Pistol", "Rifle", "Shotgun", "Melee" }, -- SOURCE: informe
	BaseWeaponXpPerKill = 5, -- TUNE (Prompt 4)
	DamagePerLevel = 0.02, -- TUNE (Prompt 4)
	FireRatePerLevel = 0.01, -- TUNE (Prompt 4)
	ReloadSpeedPerLevel = 0.015, -- TUNE (Prompt 4)
	StartingWeapon = "pistol_t1",

	TierRules = {
		{ Tier = 1, ScrapCost = 0, Material = nil, StatMultiplier = 1 },
		{ Tier = 2, ScrapCost = 500, Material = "Steel", StatMultiplier = 1.35 }, -- TUNE (Prompt 4)
		{ Tier = 3, ScrapCost = 1500, Material = "Plating", StatMultiplier = 1.8 }, -- TUNE (Prompt 4)
		{ Tier = 4, ScrapCost = 4000, Material = "Reagent", StatMultiplier = 2.4 }, -- TUNE (Prompt 4)
		{ Tier = 5, ScrapCost = 9000, Material = "Fibre", StatMultiplier = 3.2 }, -- TUNE (Prompt 4)
		{ Tier = 6, ScrapCost = 20000, Material = "Cores", StatMultiplier = 4.2 }, -- TUNE (Prompt 4)
	},

	Catalogue = {
		pistol_t1 = {
			Id = "pistol_t1",
			DisplayName = "Pistola de servicio",
			Family = "Pistol",
			Tier = 1,
			Damage = 25, -- TUNE (Prompt 4)
			FireRate = 4, -- TUNE (Prompt 4)
			MagazineSize = 12, -- TUNE (Prompt 4)
			ReloadTime = 1.4, -- TUNE (Prompt 4)
			Range = 200, -- TUNE (Prompt 2)
			Spread = 1.5, -- TUNE (Prompt 4)
			Pellets = 1,
			UpgradeMaterial = "Steel",
		},
	},
}

return Freeze(Weapons)
