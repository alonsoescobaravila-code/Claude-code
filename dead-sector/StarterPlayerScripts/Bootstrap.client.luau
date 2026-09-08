--!strict
--[[
	Bootstrap.client.luau — el único punto de entrada del cliente.

	Mismo patrón que el servidor: un solo LocalScript que arranca los
	controladores en orden, en dos fases.

	Lo que vive de este lado: entrada, interfaz, sonido, efectos y predicción. Nada
	más. Si un controlador calcula daño, XP, chatarra o toca el contador de brecha,
	está mal puesto y hay que moverlo al servidor.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes = require(ReplicatedStorage.Remotes)

local player = Players.LocalPlayer
local scripts = player:WaitForChild("PlayerScripts")
local Controllers = scripts:WaitForChild("Controllers")

type Controller = {
	Init: () -> (),
	Start: () -> (),
}

-- Orden de dependencia, no alfabético. Effects antes que Prediction porque
-- Prediction le pide el fogonazo en cuanto alguien aprieta, y Prediction antes
-- que Input porque Input no hace otra cosa que llamarlo.
local ORDER: { string } = {
	"Effects",
	"Prediction",
	"Input",
	"Hud",
}

local loaded: { Controller } = {}

for _, name in ORDER do
	local module = Controllers:FindFirstChild(name)
	assert(module ~= nil and module:IsA("ModuleScript"), `Falta el controlador {name}`)
	table.insert(loaded, require(module) :: Controller)
end

-- Esperar a que el servidor haya creado los remotes antes de arrancar nada que
-- vaya a suscribirse a ellos.
Remotes.Get("BreachUpdated")

for _, controller in loaded do
	controller.Init()
end

for _, controller in loaded do
	controller.Start()
end
