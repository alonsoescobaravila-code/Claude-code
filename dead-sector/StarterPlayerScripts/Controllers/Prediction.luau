--!strict
--[[
	Controllers/Prediction.luau — la predicción local del disparo.

	Al apretar, esto pinta el disparo AL INSTANTE y después manda la petición. Sin
	la predicción, con 100 ms de ping el botón se siente pegajoso y el juego roto,
	y la gente no lo describe como «lag», lo describe como «está mal hecho».

	Lo que se ve acá es una PROMESA, no un resultado. Este módulo:

	- no calcula daño
	- no decide si acertó
	- no cuenta bajas
	- no toca el contador de brecha

	Lleva su propia cuenta de munición, pero solo para pintar el número: el
	servidor lleva la suya y es la que manda. Si dicen cosas distintas, el cliente
	está equivocado. Cambiar este número con un ejecutor cambia lo que ese jugador
	ve en su pantalla y nada más: el servidor rechaza el disparo por NoAmmo.

	Cuando la confirmación del servidor no llega, el jugador ve un tiro que no dio.
	Es exactamente lo mismo que ve cuando falla de verdad, y eso es a propósito.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Types = require(ReplicatedStorage.Types)
local Remotes = require(ReplicatedStorage.Remotes)
local ConfigWeapons = require(ReplicatedStorage.Config.Weapons)

local Effects = require(script.Parent.Effects)

local player = Players.LocalPlayer

local Prediction = {}

local equipped: Types.WeaponId = ConfigWeapons.StartingWeapon
local ammo = 0
local nextFireAt = 0
local reloadingUntil = 0

local fireRemote: RemoteEvent? = nil
local reloadRemote: RemoteEvent? = nil

local function weapon(): Types.Weapon?
	return ConfigWeapons.Catalogue[equipped]
end

function Prediction.GetAmmo(): (number, number)
	local current = weapon()
	return ammo, if current ~= nil then current.MagazineSize else 0
end

function Prediction.IsReloading(): boolean
	return Workspace:GetServerTimeNow() < reloadingUntil
end

-- El disparo, desde el punto de vista del cliente. Devuelve false cuando ni
-- siquiera se intenta, para que quien llama no reproduzca el sonido.
function Prediction.Fire(): boolean
	local current = weapon()
	local camera = Workspace.CurrentCamera
	local character = player.Character
	local remote = fireRemote

	if current == nil or camera == nil or character == nil or remote == nil then
		return false
	end

	local now = Workspace:GetServerTimeNow()
	if now < nextFireAt or now < reloadingUntil or ammo <= 0 then
		return false
	end

	nextFireAt = now + 1 / current.FireRate
	ammo -= 1

	local origin = camera.CFrame.Position
	local direction = camera.CFrame.LookVector

	-- Primero lo que se ve, después la red. Al revés se pierden los milisegundos
	-- que justifican que esto exista.
	Effects.Fire(origin, direction, current)

	local request: Types.FireRequest = {
		WeaponId = equipped,
		Origin = origin,
		Direction = direction,
		ClientTime = now,
	}
	remote:FireServer(request)

	return true
end

function Prediction.Reload(): boolean
	local current = weapon()
	local remote = reloadRemote
	if current == nil or remote == nil then
		return false
	end

	local now = Workspace:GetServerTimeNow()
	if now < reloadingUntil or ammo >= current.MagazineSize then
		return false
	end

	reloadingUntil = now + current.ReloadTime
	remote:FireServer()

	-- El cargador se rellena en la copia local al terminar. Si el servidor no
	-- estaba de acuerdo, el primer disparo se rechaza y el número se corrige.
	task.delay(current.ReloadTime, function()
		local latest = weapon()
		if latest ~= nil then
			ammo = latest.MagazineSize
		end
	end)

	return true
end

function Prediction.Init()
	fireRemote = Remotes.Get("FireWeapon")
	reloadRemote = Remotes.Get("RequestReload")

	local current = weapon()
	ammo = if current ~= nil then current.MagazineSize else 0
end

function Prediction.Start()
	Remotes.Get("HitConfirmed").OnClientEvent:Connect(function(payload: unknown)
		if typeof(payload) ~= "table" then
			return
		end
		-- Viene del servidor, así que es verdad. Lo único que se hace con ella es
		-- enseñarla: la marca de impacto y el número de daño.
		Effects.ConfirmHit(payload :: Types.HitConfirmation)
	end)
end

return Prediction
