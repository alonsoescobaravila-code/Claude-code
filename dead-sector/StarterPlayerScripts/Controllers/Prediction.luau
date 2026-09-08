--!strict
--[[
	Controllers/Prediction.luau — la predicción local del disparo.

	Al apretar, el cliente muestra el impacto al instante y manda la petición. Sin
	esto el juego se siente roto en cuanto hay 100 ms de ping.

	Nunca: aplicar daño, contar una baja ni tocar el contador de brecha. Lo que se
	ve acá es una promesa visual; el resultado real llega del servidor y puede no
	coincidir. Cuando no coincida, gana el servidor.

	Estado: interfaz. Lo implementa el Prompt 2.
]]

local Prediction = {}

function Prediction.Init()
	-- Prompt 2
end

function Prediction.Start()
	-- Prompt 2
end

return Prediction
