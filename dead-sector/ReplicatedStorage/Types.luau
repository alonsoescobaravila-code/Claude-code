--!strict
--[[
	Types.luau — tipos compartidos entre servidor y cliente.

	Aquí no hay lógica ni números. Solo la forma de los datos, para que el
	verificador de tipos avise cuando un sistema espera algo distinto de lo que
	otro entrega. Todo lo que cruza la red está descrito acá.
]]

--------------------------------------------------------------------------------
-- Sistemas
--------------------------------------------------------------------------------

-- Fase de construcción declarada en el informe. Sirve para saber qué se puede
-- tocar sin arrastrar el resto del juego detrás.
export type Phase = "MVP" | "Fase2" | "Fase3"

-- Todo sistema del servidor cumple esta forma. Bootstrap llama Init a todos y
-- solo después Start a todos: en Init te preparas, en Start ya puedes contar
-- con que los demás existen.
export type System = {
	Name: string,
	Phase: Phase,
	Init: (System) -> (),
	Start: (System) -> (),
}

--------------------------------------------------------------------------------
-- Zombis
--------------------------------------------------------------------------------

export type ZombieTypeId = string

export type ZombieType = {
	Id: ZombieTypeId,
	DisplayName: string,
	Health: number,
	WalkSpeed: number,
	Damage: number,
	AttackCooldown: number,
	AttackRange: number,
	-- Cuánto suma esta baja al contador de brecha del servidor.
	BreachWeight: number,
	-- Multiplicador de XP y de chatarra sobre el valor base.
	XpMultiplier: number,
	ScrapMultiplier: number,
	-- Punto débil por la espalda: el Blindado solo recibe daño completo detrás.
	RearOnlyFullDamage: boolean,
	-- Multiplicador aplicado cuando el impacto NO viene del punto débil.
	FrontDamageMultiplier: number,
}

-- Los cinco tipos de fase 2 existen como identidad, sin estadísticas, para que
-- nadie confunda un número inventado con uno diseñado.
export type PlannedZombieType = {
	Id: ZombieTypeId,
	DisplayName: string,
	IntroducedInSector: number,
	Behaviour: string,
}

--------------------------------------------------------------------------------
-- Sectores y brecha
--------------------------------------------------------------------------------

export type SectorId = number

export type Sector = {
	Id: SectorId,
	DisplayName: string,
	-- Bajas acumuladas del servidor necesarias para abrirlo. Sector 1 = 0.
	BreachThreshold: number,
	IntroducesZombie: ZombieTypeId,
	Material: string,
	-- Sube el nivel de amenaza global que lee el Director al abrirse.
	ThreatLevel: number,
}

-- Lo que el servidor replica al cliente sobre la brecha. Nada más que esto.
export type BreachState = {
	Kills: number,
	HighestOpenSector: SectorId,
	NextThreshold: number?,
}

--------------------------------------------------------------------------------
-- Armas
--------------------------------------------------------------------------------

export type WeaponFamily = "Pistol" | "Rifle" | "Shotgun" | "Melee"

export type WeaponId = string

export type Weapon = {
	Id: WeaponId,
	DisplayName: string,
	Family: WeaponFamily,
	Tier: number,
	Damage: number,
	FireRate: number,
	MagazineSize: number,
	ReloadTime: number,
	Range: number,
	-- Dispersión en grados. El melee la ignora.
	Spread: number,
	-- Perdigones por disparo. Uno en todo lo que no sea escopeta.
	Pellets: number,
	-- Material de sector exigido para subir al tier siguiente.
	UpgradeMaterial: string?,
}

--------------------------------------------------------------------------------
-- Jugador
--------------------------------------------------------------------------------

export type WeaponSave = {
	Level: number,
	Xp: number,
	Tier: number,
}

-- La forma exacta de lo que se guarda en el DataStore. Cambiarla obliga a subir
-- SchemaVersion en Config/Data y a escribir la migración.
export type PlayerProfile = {
	SchemaVersion: number,
	Level: number,
	Xp: number,
	PerkPoints: number,
	Perks: { [string]: number },
	Scrap: number,
	Materials: { [string]: number },
	Weapons: { [WeaponId]: WeaponSave },
	SafehouseUpgrades: { [string]: number },
	Classes: { [string]: boolean },
	Contracts: { [string]: number },
	Armoury: { [WeaponId]: number },
	SelfRevivesUsedToday: number,
	LastDailyResetUnix: number,
}

--------------------------------------------------------------------------------
-- Red
--------------------------------------------------------------------------------

-- Lo que el cliente pide al disparar. Intención, nunca resultado: no lleva daño,
-- ni a quién le dio, ni si mató. Eso lo decide el servidor.
export type FireRequest = {
	WeaponId: WeaponId,
	Origin: Vector3,
	Direction: Vector3,
	-- Reloj del cliente al disparar. El servidor lo usa para rebobinar y lo
	-- valida contra su propio reloj antes de creérselo.
	ClientTime: number,
}

return {}
