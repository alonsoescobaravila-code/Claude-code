--!strict
--[[
	Config/ZombieAI.luau — el bucle, el tope y los tipos de zombi.

	MaxLive es el número más importante del proyecto. TUNE: 40 es el objetivo que
	fija el plan (60 FPS en un teléfono de gama baja con 40 zombis en pantalla),
	no una medición. El Prompt 1 tiene que entregar el N real que mantiene el
	frame time del servidor bajo 16 ms y este valor se reemplaza por ese.

	Las estadísticas de los tres tipos son valores de partida, no diseño validado:
	el informe define comportamiento y contra de cada tipo, no sus números.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Types = require(ReplicatedStorage.Types)
local Freeze = require(script.Parent.Freeze)

export type ZombieAIConfig = {
	-- Tope duro de zombis vivos por servidor. Nunca se supera. Rule 6.
	MaxLive: number,
	-- Paso fijo del único bucle que mueve a todos. 10 Hz.
	StepInterval: number,
	-- Presupuesto de peticiones de ruta por paso, para no golpear la CPU de golpe.
	PathRequestsPerStep: number,
	-- Solo se recalcula la ruta si el objetivo se movió más que esto (studs).
	RepathDistanceThreshold: number,
	-- Aunque no se mueva, una ruta no vive más que esto (segundos).
	PathMaxAge: number,
	-- Más lejos que esto de todo jugador, el zombi pasa a modo barato.
	FarModeDistance: number,
	-- En modo barato solo se actualiza la dirección aproximada cada tantos segundos.
	FarModeUpdateInterval: number,
	-- Radio de detección del jugador más cercano.
	AggroRadius: number,
	Types: { [Types.ZombieTypeId]: Types.ZombieType },
	Planned: { Types.PlannedZombieType },
}

local ZombieAI: ZombieAIConfig = {
	MaxLive = 40, -- TUNE (Prompt 1): sustituir por el N medido bajo 16 ms.
	StepInterval = 0.1, -- TUNE (Prompt 1)
	PathRequestsPerStep = 4, -- TUNE (Prompt 1)
	RepathDistanceThreshold = 6, -- TUNE (Prompt 1)
	PathMaxAge = 3, -- TUNE (Prompt 1)
	FarModeDistance = 150, -- TUNE (Prompt 1)
	FarModeUpdateInterval = 3, -- TUNE (Prompt 1)
	AggroRadius = 120, -- TUNE (Prompt 1)

	-- Los tres tipos del MVP. Un cuarto tipo es una entrada más en esta tabla:
	-- si añadirlo exige código nuevo, el sistema está mal construido. Rule 7.
	Types = {
		Walker = {
			Id = "Walker",
			DisplayName = "Caminante",
			Health = 100, -- TUNE (Prompt 1)
			WalkSpeed = 8, -- TUNE (Prompt 1)
			Damage = 10, -- TUNE (Prompt 2)
			AttackCooldown = 1.2, -- TUNE (Prompt 2)
			AttackRange = 4, -- TUNE (Prompt 2)
			BreachWeight = 1, -- SOURCE: informe, cada baja suma al contador
			XpMultiplier = 1,
			ScrapMultiplier = 1,
			RearOnlyFullDamage = false,
			FrontDamageMultiplier = 1,
		},
		Runner = {
			Id = "Runner",
			DisplayName = "Corredor",
			Health = 60, -- TUNE (Prompt 1): rápido y de poca vida
			WalkSpeed = 18, -- TUNE (Prompt 1)
			Damage = 8, -- TUNE (Prompt 2)
			AttackCooldown = 0.9, -- TUNE (Prompt 2)
			AttackRange = 4, -- TUNE (Prompt 2)
			BreachWeight = 1,
			XpMultiplier = 1.4, -- TUNE (Prompt 4)
			ScrapMultiplier = 1.2, -- TUNE (Prompt 4)
			RearOnlyFullDamage = false,
			FrontDamageMultiplier = 1,
		},
		Armored = {
			Id = "Armored",
			DisplayName = "Blindado",
			Health = 320, -- TUNE (Prompt 1): lento y muy resistente
			WalkSpeed = 6, -- TUNE (Prompt 1)
			Damage = 18, -- TUNE (Prompt 2)
			AttackCooldown = 1.6, -- TUNE (Prompt 2)
			AttackRange = 5, -- TUNE (Prompt 2)
			BreachWeight = 2, -- TUNE (Prompt 3): pesa más porque cuesta más
			XpMultiplier = 2.2, -- TUNE (Prompt 4)
			ScrapMultiplier = 1.8, -- TUNE (Prompt 4)
			-- Su contra: solo recibe daño completo por la espalda. SOURCE: informe.
			RearOnlyFullDamage = true,
			FrontDamageMultiplier = 0.25, -- TUNE (Prompt 2)
		},
	},

	-- Fase 2. Identidad y comportamiento del informe, sin estadísticas: un número
	-- inventado acá se acabaría tratando como diseño. Los define el Prompt 6.
	Planned = {
		{ Id = "Spitter", DisplayName = "Escupidor", IntroducedInSector = 4, Behaviour = "Ataque a distancia" },
		{ Id = "Stalker", DisplayName = "Acechador", IntroducedInSector = 5, Behaviour = "Invisible hasta estar cerca" },
		{ Id = "Burster", DisplayName = "Reventador", IntroducedInSector = 6, Behaviour = "Daño en área al morir" },
		{ Id = "Screamer", DisplayName = "Chillón", IntroducedInSector = 7, Behaviour = "Llama a una horda" },
		{ Id = "Hive", DisplayName = "Colmena", IntroducedInSector = 8, Behaviour = "Genera zombis pequeños" },
	},
}

return Freeze(ZombieAI)
