--!strict
--[[
	Bootstrap.server.luau — el único punto de entrada del servidor.

	Hay un solo Script en todo ServerScriptService. Todo lo demás son ModuleScripts
	que este arranca en orden. Así el orden de arranque está escrito en un sitio y
	se lee de arriba abajo, en vez de depender de en qué orden Roblox decidió
	ejecutar veinte scripts sueltos.

	Dos fases a propósito: Init en todos y solo después Start en todos. En Init un
	sistema prepara lo suyo sin asumir que los demás existen; en Start ya puede
	contar con todos. Sin esa separación, el sistema que arranca primero se rompe
	el día que otro cambia de orden.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local Types = require(ReplicatedStorage.Types)
local Remotes = require(ReplicatedStorage.Remotes)
local Config = require(ReplicatedStorage.Config.Index)

local Systems = ServerScriptService:WaitForChild("Systems")

-- Orden de arranque. No es alfabético: es de dependencia.
-- Analytics primero para que todo lo demás pueda registrar desde el arranque.
-- Data antes que cualquier sistema que lea el perfil del jugador.
-- Combat al final, porque necesita zombis, armas y economía ya en pie.
local ORDER: { string } = {
	"Analytics",
	"Data",
	"Economy",
	"Progression",
	"Weapons",
	"Perks",
	"Classes",
	"Safehouse",
	"Contracts",
	"Sectors",
	"Breach",
	"ZombieAI",
	"Combat",
	"Director",
}

local function load(): { Types.System }
	local loaded: { Types.System } = {}

	for _, name in ORDER do
		local module = Systems:FindFirstChild(name)
		assert(module ~= nil and module:IsA("ModuleScript"), `Falta el sistema {name} en Systems`)
		table.insert(loaded, require(module) :: Types.System)
	end

	-- Un módulo en la carpeta que no esté en ORDER no arrancaría nunca y el fallo
	-- sería silencioso: el sistema simplemente no hace nada y nadie sabe por qué.
	for _, child in Systems:GetChildren() do
		if child:IsA("ModuleScript") and table.find(ORDER, child.Name) == nil then
			warn(`[DEAD SECTOR] {child.Name} está en Systems pero no en ORDER: no va a arrancar`)
		end
	end

	return loaded
end

-- Los ids de gamepass y de producto se rellenan a mano en el Creator Dashboard.
-- Un id en 0 compila igual y falla en producción, así que se avisa al arrancar.
local function warnAboutPlaceholderIds()
	for _, pass in Config.Monetisation.Gamepasses do
		if pass.AssetId == 0 then
			warn(`[DEAD SECTOR] gamepass sin id real: {pass.Key}`)
		end
	end
	for _, product in Config.Monetisation.Products do
		if product.AssetId == 0 then
			warn(`[DEAD SECTOR] producto sin id real: {product.Key}`)
		end
	end
end

local systems = load()

Remotes.CreateAll()

for _, system in systems do
	system:Init()
end

for _, system in systems do
	system:Start()
end

warnAboutPlaceholderIds()

print(`[DEAD SECTOR] servidor arriba · {#systems} sistemas · tope de zombis {Config.ZombieAI.MaxLive}`)
