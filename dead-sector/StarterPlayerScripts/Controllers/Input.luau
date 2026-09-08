--!strict
--[[
	Controllers/Input.luau — disparar y recargar.

	PROVISIONAL. Los controles de verdad son del Prompt 7: móvil primero, objetivo
	táctil de 44x44, botón de disparo y stick sin solaparse, nada que dependa de
	hover. Esto es lo mínimo para poder probar el combate en Studio hoy, y hay que
	reemplazarlo entero, no ampliarlo.

	ContextActionService y no UserInputService a propósito: el primero da botón
	táctil solo y respeta que otro sistema se quede la entrada cuando toque, que
	es lo que hará falta al abrir menús.
]]

local ContextActionService = game:GetService("ContextActionService")

local Prediction = require(script.Parent.Prediction)

local FIRE_ACTION = "DeadSectorFire"
local RELOAD_ACTION = "DeadSectorReload"

local Input = {}

local holding = false

local function onFire(_action: string, state: Enum.UserInputState): Enum.ContextActionResult
	if state == Enum.UserInputState.Begin then
		if holding then
			return Enum.ContextActionResult.Sink
		end
		holding = true

		-- Mantener pulsado dispara en automático. El ritmo lo pone la cadencia del
		-- arma dentro de Prediction, así que este bucle puede ir por frame sin
		-- disparar de más: cuando el arma no está lista, Fire devuelve false y no
		-- pasa nada.
		task.spawn(function()
			while holding do
				Prediction.Fire()
				task.wait()
			end
		end)
	elseif state == Enum.UserInputState.End or state == Enum.UserInputState.Cancel then
		holding = false
	end

	return Enum.ContextActionResult.Sink
end

local function onReload(_action: string, state: Enum.UserInputState): Enum.ContextActionResult
	if state == Enum.UserInputState.Begin then
		Prediction.Reload()
	end
	return Enum.ContextActionResult.Sink
end

function Input.Init() end

function Input.Start()
	ContextActionService:BindAction(FIRE_ACTION, onFire, true, Enum.UserInputType.MouseButton1, Enum.UserInputType.Touch, Enum.KeyCode.ButtonR2)
	ContextActionService:BindAction(RELOAD_ACTION, onReload, true, Enum.KeyCode.R, Enum.KeyCode.ButtonX)
end

function Input.Stop()
	holding = false
	ContextActionService:UnbindAction(FIRE_ACTION)
	ContextActionService:UnbindAction(RELOAD_ACTION)
end

return Input
