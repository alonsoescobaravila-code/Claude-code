--!strict
--[[
	Remotes.luau — el contrato de red. Todo lo que cruza entre cliente y servidor
	está declarado acá y en ningún otro sitio.

	Dos decisiones de fondo:

	1. No hay RemoteFunctions de cliente a servidor. Un RemoteFunction cede el hilo
	   del servidor al cliente: si el cliente no responde, el servidor se queda
	   esperando. El Prompt 9 lo busca explícitamente como vector de ataque. Todo
	   va por RemoteEvent, y la respuesta vuelve por otro RemoteEvent.

	2. Los nombres son un tipo unión, no strings sueltos. Un remote mal escrito es
	   un error de tipos al escribirlo, no un nil a las tres semanas.

	Los nombres de cliente a servidor están redactados como intención —Request,
	Fire, Select— porque eso es literalmente lo único que el cliente puede enviar.
	Rule 1: intención, nunca resultados.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local FOLDER_NAME = "Remotes"

-- Cliente -> servidor. Cada uno de estos necesita, sin excepción: identidad,
-- límite de frecuencia, validación de tipos de argumento y comprobación de si la
-- acción es legal en el estado actual. Rule 3.
export type ClientToServer =
	"FireWeapon"
	| "MeleeSwing"
	| "RequestReload"
	| "EquipWeapon"
	| "RequestWeaponTierUp"
	| "SpendPerkPoint"
	| "RequestSafehouseUpgrade"
	| "SelectClass"
	| "RerollContract"
	| "ReviveTeammate"
	| "SelfRevive"

-- Servidor -> cliente. Resultados ya calculados y validados.
export type ServerToClient =
	"BreachUpdated"
	| "SectorOpened"
	| "ProfileUpdated"
	| "HitConfirmed"
	| "DamageNumber"
	| "Announcement"

export type RemoteName = ClientToServer | ServerToClient

local NAMES: { RemoteName } = {
	"FireWeapon",
	"MeleeSwing",
	"RequestReload",
	"EquipWeapon",
	"RequestWeaponTierUp",
	"SpendPerkPoint",
	"RequestSafehouseUpgrade",
	"SelectClass",
	"RerollContract",
	"ReviveTeammate",
	"SelfRevive",
	"BreachUpdated",
	"SectorOpened",
	"ProfileUpdated",
	"HitConfirmed",
	"DamageNumber",
	"Announcement",
}

local Remotes = {}

Remotes.Names = table.freeze(NAMES)

-- Solo el servidor crea. El cliente espera. Si el cliente pudiera crear remotes,
-- podría fabricar uno con el nombre de otro y quedarse en medio.
function Remotes.CreateAll(): Folder
	assert(RunService:IsServer(), "Remotes.CreateAll solo corre en el servidor")

	local folder = ReplicatedStorage:FindFirstChild(FOLDER_NAME) :: Folder?
	if folder == nil then
		local created = Instance.new("Folder")
		created.Name = FOLDER_NAME
		created.Parent = ReplicatedStorage
		folder = created
	end

	local resolved = folder :: Folder
	for _, name in NAMES do
		if resolved:FindFirstChild(name) == nil then
			local event = Instance.new("RemoteEvent")
			event.Name = name
			event.Parent = resolved
		end
	end

	return resolved
end

function Remotes.Get(name: RemoteName): RemoteEvent
	local folder = if RunService:IsServer()
		then ReplicatedStorage:FindFirstChild(FOLDER_NAME)
		else ReplicatedStorage:WaitForChild(FOLDER_NAME)

	assert(folder ~= nil, "Remotes no existe todavía: el servidor no llamó a CreateAll")

	local remote = if RunService:IsServer()
		then folder:FindFirstChild(name)
		else folder:WaitForChild(name)

	assert(remote ~= nil and remote:IsA("RemoteEvent"), `Remote inexistente: {name}`)
	return remote :: RemoteEvent
end

return Remotes
