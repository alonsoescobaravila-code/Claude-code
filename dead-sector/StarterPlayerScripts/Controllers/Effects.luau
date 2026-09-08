--!strict
--[[
	Controllers/Effects.luau — lo que se ve y se siente al disparar.

	El 90% de la sensación de un arma sale de acá y no cuesta un solo modelo
	nuevo: fogonazo, retroceso de cámara y la marca cuando aciertas. Un arma sin
	esto se siente rota aunque los números estén bien.

	Regla 9: nada se crea ni se destruye durante la partida. Los números de daño
	son un anillo de etiquetas creadas al arrancar que se reciclan; cuando se
	acaban, la más vieja se reutiliza. Es la diferencia entre una horda fluida y
	una que da tirones justo cuando hay más cosas en pantalla, que es exactamente
	cuando más se nota.

	Un solo enganche por frame para todo: retroceso, números y marca. Y va con
	BindToRenderStep por detrás de la cámara, no con RenderStepped: RenderStepped
	corre ANTES de que el guion de cámara escriba su CFrame, así que un retroceso
	aplicado ahí lo pisa la cámara en el mismo frame y no se ve nada.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local Types = require(ReplicatedStorage.Types)
local Config = require(ReplicatedStorage.Config.Combat)

-- Etiquetas de daño vivas a la vez. El tope es de legibilidad antes que de
-- rendimiento: con más números en pantalla no se lee ninguno.
local NUMBER_POOL_SIZE = 12
local NUMBER_LIFETIME = 0.8
local NUMBER_RISE = 4
local NUMBER_OFFSET = 3
local FLOATER_WIDTH = 80
local FLOATER_HEIGHT = 30
local MARKER_LIFETIME = 0.12
local MARKER_SIZE = 14
local MARKER_THICKNESS = 2
local MARKER_TILT = 45
local CENTRE = 0.5
local FLASH_BRIGHTNESS = 4
local FLASH_RANGE = 14
local FLASH_LIFETIME = 0.04
local RENDER_TAG = "DeadSectorCombatEffects"

local player = Players.LocalPlayer

local Effects = {}

type Floater = {
	Anchor: BasePart,
	Gui: BillboardGui,
	Label: TextLabel,
	Origin: Vector3,
	Age: number,
	Active: boolean,
}

local floaters: { Floater } = table.create(NUMBER_POOL_SIZE)
local nextFloater = 1

local marker: Frame? = nil
local markerAge = math.huge
local flash: PointLight? = nil
local flashAge = math.huge
local recoil = 0
local bound = false

--------------------------------------------------------------------------------
-- Construcción, una sola vez
--------------------------------------------------------------------------------

local function buildMarker(parent: ScreenGui): Frame
	local holder = Instance.new("Frame")
	holder.Name = "HitMarker"
	holder.AnchorPoint = Vector2.new(CENTRE, CENTRE)
	holder.Position = UDim2.fromScale(CENTRE, CENTRE)
	holder.Size = UDim2.fromOffset(MARKER_SIZE, MARKER_SIZE)
	holder.BackgroundTransparency = 1
	holder.Visible = false
	holder.Parent = parent

	-- Dos barras cruzadas. Una equis dibujada con dos Frames no necesita imagen
	-- ni una petición más al cargar.
	for _, rotation in { MARKER_TILT, -MARKER_TILT } do
		local bar = Instance.new("Frame")
		bar.Size = UDim2.fromOffset(MARKER_SIZE, MARKER_THICKNESS)
		bar.AnchorPoint = Vector2.new(CENTRE, CENTRE)
		bar.Position = UDim2.fromScale(CENTRE, CENTRE)
		bar.Rotation = rotation
		bar.BorderSizePixel = 0
		bar.BackgroundColor3 = Color3.new(1, 1, 1)
		bar.Parent = holder
	end

	return holder
end

-- Cada número lleva su propia parte ancla: un BillboardGui sin adornee ni parte
-- padre no se dibuja en ninguna parte. La parte es invisible, no colisiona y no
-- responde a consultas, así que no estorba a nada.
local function buildFloater(parent: Instance): Floater
	local anchor = Instance.new("Part")
	anchor.Name = "FloaterAnchor"
	anchor.Size = Vector3.one
	anchor.Transparency = 1
	anchor.Anchored = true
	anchor.CanCollide = false
	anchor.CanQuery = false
	anchor.CanTouch = false
	anchor.CastShadow = false
	anchor.Parent = parent

	local gui = Instance.new("BillboardGui")
	gui.Name = "DamageNumber"
	gui.Size = UDim2.fromOffset(FLOATER_WIDTH, FLOATER_HEIGHT)
	gui.AlwaysOnTop = true
	gui.Enabled = false
	gui.Adornee = anchor
	gui.Parent = anchor

	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Font = Enum.Font.GothamBold
	label.TextScaled = true
	label.TextStrokeTransparency = 0
	label.TextColor3 = Color3.new(1, 1, 1)
	label.Parent = gui

	return { Anchor = anchor, Gui = gui, Label = label, Origin = Vector3.zero, Age = 0, Active = false }
end

--------------------------------------------------------------------------------
-- API
--------------------------------------------------------------------------------

function Effects.Fire(_origin: Vector3, _direction: Vector3, _weapon: Types.Weapon)
	recoil += Config.CameraRecoilDegrees
	flashAge = 0

	local light = flash
	if light ~= nil then
		light.Enabled = true
	end
end

function Effects.ConfirmHit(confirmation: Types.HitConfirmation)
	markerAge = 0
	local holder = marker
	if holder ~= nil then
		holder.Visible = true
	end

	local floater = floaters[nextFloater]
	if floater == nil then
		return
	end
	nextFloater = nextFloater % NUMBER_POOL_SIZE + 1

	floater.Origin = confirmation.Position + Vector3.new(0, NUMBER_OFFSET, 0)
	floater.Age = 0
	floater.Active = true
	floater.Anchor.CFrame = CFrame.new(floater.Origin)
	floater.Label.Text = tostring(math.floor(confirmation.Damage))
	-- El punto débil se marca en color: es la única forma de enseñar que al
	-- Blindado hay que rodearlo, sin un tutorial que nadie lee.
	floater.Label.TextColor3 = if confirmation.Weakpoint then Config.BloodColor else Color3.new(1, 1, 1)
	floater.Label.TextTransparency = 0
	floater.Label.TextStrokeTransparency = 0
	floater.Gui.Enabled = true
end

--------------------------------------------------------------------------------
-- Ciclo de vida
--------------------------------------------------------------------------------

local function onRender(delta: number)
	local camera = Workspace.CurrentCamera

	if recoil > 0 then
		recoil = math.max(0, recoil - (Config.CameraRecoilDegrees / Config.CameraRecoilRecoverySeconds) * delta)
		if camera ~= nil then
			camera.CFrame *= CFrame.Angles(math.rad(recoil), 0, 0)
		end
	end

	flashAge += delta
	local light = flash
	if light ~= nil and light.Enabled and flashAge > FLASH_LIFETIME then
		light.Enabled = false
	end

	markerAge += delta
	local holder = marker
	if holder ~= nil and holder.Visible and markerAge > MARKER_LIFETIME then
		holder.Visible = false
	end

	for _, floater in floaters do
		if not floater.Active then
			continue
		end

		floater.Age += delta
		if floater.Age >= NUMBER_LIFETIME then
			floater.Active = false
			floater.Gui.Enabled = false
			continue
		end

		local progress = floater.Age / NUMBER_LIFETIME
		floater.Anchor.CFrame = CFrame.new(floater.Origin + Vector3.new(0, NUMBER_RISE * progress, 0))
		floater.Label.TextTransparency = progress
		floater.Label.TextStrokeTransparency = progress
	end
end

function Effects.Init()
	local playerGui = player:WaitForChild("PlayerGui")

	local screen = Instance.new("ScreenGui")
	screen.Name = "CombatEffects"
	screen.ResetOnSpawn = false
	screen.IgnoreGuiInset = true
	screen.Parent = playerGui

	marker = buildMarker(screen)

	local world = Instance.new("Folder")
	world.Name = "CombatFloaters"
	world.Parent = Workspace

	for index = 1, NUMBER_POOL_SIZE do
		floaters[index] = buildFloater(world)
	end

	local light = Instance.new("PointLight")
	light.Name = "MuzzleFlash"
	light.Brightness = FLASH_BRIGHTNESS
	light.Range = FLASH_RANGE
	light.Enabled = false
	flash = light
end

function Effects.Start()
	local camera = Workspace.CurrentCamera
	local light = flash
	if light ~= nil and camera ~= nil then
		light.Parent = camera
	end

	-- Por detrás de la cámara a propósito. Ver la nota de arriba.
	RunService:BindToRenderStep(RENDER_TAG, Enum.RenderPriority.Camera.Value + 1, onRender)
	bound = true
end

function Effects.Stop()
	if bound then
		RunService:UnbindFromRenderStep(RENDER_TAG)
		bound = false
	end
end

return Effects
