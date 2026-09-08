--!strict
--[[
	Controllers/Input.luau — controles táctiles primero, teclado y mando después.

	Diseñado para una pantalla de seis pulgadas en horizontal, y de ahí hacia
	arriba. Objetivo táctil mínimo de 44x44. El botón de disparo y el stick de
	movimiento nunca se superponen con otro control.

	Nunca: interacciones que dependan de hover, ni posiciones en píxeles fijos. Se
	usa UIListLayout, UIPadding, UIAspectRatioConstraint y UDim2 en escala.

	Estado: interfaz. Lo implementa el Prompt 7.
]]

local Input = {}

function Input.Init()
	-- Prompt 7
end

function Input.Start()
	-- Prompt 7
end

return Input
