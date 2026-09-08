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

-- Identificador de una instancia viva. Es el índice en la reserva, así que es
-- estable durante toda la vida del servidor y sirve como clave barata.
export type ZombieId = number

export type ZombieType = {
	Id: ZombieTypeId,
	DisplayName: string,
	-- Los tipos se distinguen por tamaño, color, velocidad y comportamiento, no
	-- por animaciones propias. SOURCE: informe.
	Size: Vector3,
	Color: Color3,
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

-- Lo que el servidor emite cuando un zombi muere. Es la única entrada legítima
-- al contador de brecha, a la XP y a la chatarra. Rule 2.
export type KillInfo = {
	ZombieId: ZombieId,
	TypeId: ZombieTypeId,
	Position: Vector3,
	-- Quién dio el golpe final. nil si murió sin autor (por ejemplo, un despeje
	-- del servidor al terminar un benchmark): esas bajas no cuentan para nada.
	Killer: Player?,
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
	-- Cargadores de reserva. La munición se recarga sola en el refugio; lo que
	-- se compra con chatarra es la munición especial, que es cosa del Prompt 4.
	ReserveMagazines: number,
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

-- Lo que el servidor confirma al cliente después de validar. El cliente ya pintó
-- su predicción al apretar; esto le dice si acertó de verdad.
export type HitConfirmation = {
	ZombieId: ZombieId,
	Position: Vector3,
	Damage: number,
	Killed: boolean,
	-- Impacto por la espalda a un Blindado. El cliente lo marca distinto: es la
	-- única forma de enseñar la mecánica sin un tutorial.
	Weakpoint: boolean,
}

-- Por qué se rechazó un disparo. No se le manda al cliente —decirle qué
-- comprobación falló es enseñarle a saltársela— pero sí se registra.
export type RejectionReason =
	"RateLimit"
	| "BadPayload"
	| "NoCharacter"
	| "Dead"
	| "WrongWeapon"
	| "NoAmmo"
	| "Reloading"
	| "Cooldown"
	| "StaleTimestamp"
	| "FutureTimestamp"
	| "OriginTooFar"
	| "BadDirection"

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
