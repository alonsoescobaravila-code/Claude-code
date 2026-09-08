--!strict
--[[
	Config/ZombieAI.luau — el bucle, el tope y los tipos de zombi.

	MaxLive es el número más importante del proyecto. TUNE: 40 es el objetivo que
	fija el plan (60 FPS en un teléfono de gama baja con 40 zombis en pantalla),
	no una medición. El Prompt 1 tiene que entregar el N real que mantiene el
	frame time del servidor bajo 16 ms y este valor se reemplaza por ese.

	Las estadísticas de los tres tipos son valores de partida, no diseño validado:
	el informe define comportamiento y contra de cada tipo, no sus números.

	StepInterval es el paso de DECISIÓN —a quién persigo, hace falta recalcular la
	ruta, estoy lejos— y va a 10 Hz. El movimiento se aplica en cada frame sobre la
	decisión vigente: si se moviera también a 10 Hz, los zombis darían saltos de
	casi dos studs y se vería como un fallo de red. Es un solo bucle con dos
	cadencias dentro, no dos bucles.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Types = require(ReplicatedStorage.Types)
local Freeze = require(script.Parent.Freeze)

export type ZombieAIConfig = {
	-- Tope duro de zombis vivos por servidor. Nunca se supera. Rule 6.
	MaxLive: number,
	-- Paso fijo de decisión del único bucle. 10 Hz.
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
	-- Distancia a un punto de la ruta para darlo por alcanzado.
	WaypointReachedDistance: number,
	-- Parámetros del agente que se le pasan a PathfindingService.
	AgentRadius: number,
	AgentHeight: number,
	AgentCanJump: boolean,
	-- Altura del centro del zombi sobre el suelo. El zombi es una parte anclada:
	-- no cae, así que su altura la ponemos nosotros.
	GroundOffset: number,
	-- Dónde esperan los zombis de la reserva mientras no se usan. Se crean todos
	-- al arrancar y nunca se destruyen: crear o destruir instancias en mitad de
	-- una horda es exactamente cuando el servidor no puede permitírselo.
	ParkingPosition: Vector3,
	-- Separación entre zombis aparcados, para que no queden todos en el mismo sitio.
	ParkingSpacing: number,
	-- Por debajo de esto, una distancia se trata como cero. Evita dividir por la
	-- longitud de un vector nulo al normalizar.
	Epsilon: number,
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
	WaypointReachedDistance = 3, -- TUNE (Prompt 1)
	AgentRadius = 2, -- TUNE (Prompt 1)
	AgentHeight = 5, -- TUNE (Prompt 1)
	AgentCanJump = false, -- Saltar multiplica el coste del cálculo de rutas.
	GroundOffset = 3, -- TUNE (Prompt 1)
	ParkingPosition = Vector3.new(0, -500, 0),
	ParkingSpacing = 8,
	Epsilon = 0.001,

	-- Los tres tipos del MVP. Un cuarto tipo es una entrada más en esta tabla:
	-- si añadirlo exige código nuevo, el sistema está mal construido. Rule 7.
	Types = {
		Walker = {
			Id = "Walker",
			DisplayName = "Caminante",
			Size = Vector3.new(2, 5, 2),
			Color = Color3.fromRGB(96, 116, 86),
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
			-- Más bajo y más estrecho: se lee como rápido antes de que se mueva.
			Size = Vector3.new(1.8, 4.6, 1.8),
			Color = Color3.fromRGB(150, 74, 60),
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
			-- Ancho y macizo. El bulto es el aviso de que hay que rodearlo.
			Size = Vector3.new(3, 5.4, 3),
			Color = Color3.fromRGB(70, 78, 92),
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
