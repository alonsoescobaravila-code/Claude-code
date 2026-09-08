--!strict
--[[
	Combat/RateLimiter.luau — techo de peticiones por jugador y por segundo.

	Regla 3: todo handler de RemoteEvent valida identidad, frecuencia, tipos y
	legalidad. Esto es la parte de la frecuencia, y está aparte porque la van a
	necesitar todos los remotes, no solo el disparo. Un handler sin límite es una
	invitación: basta un bucle de mil llamadas por segundo para tumbar el servidor
	sin necesidad de que ninguna de ellas sea válida.

	Cubo de fichas: se rellena solo con el tiempo hasta un tope, y cada petición
	gasta una. El tope es lo que permite disparar una ráfaga corta a cadencia
	completa sin que el límite se note, y el ritmo de relleno es lo que impide
	mantenerla.

	Se rellena al consultar, no en un bucle. La regla 7 dice que solo la IA de
	zombis tiene bucle por frame, y además un bucle que recorriera a los veinte
	jugadores sesenta veces por segundo sería trabajo constante para algo que solo
	importa cuando alguien dispara.
]]

local RateLimiter = {}
RateLimiter.__index = RateLimiter

type Bucket = {
	Tokens: number,
	LastRefill: number,
	-- Rechazos seguidos. Se pone a cero en cuanto una petición pasa.
	Streak: number,
}

type self = {
	Rate: number,
	Burst: number,
	Buckets: { [Player]: Bucket },
}

export type RateLimiter = typeof(setmetatable({} :: self, RateLimiter))

function RateLimiter.new(rate: number, burst: number): RateLimiter
	return setmetatable({
		Rate = rate,
		Burst = burst,
		Buckets = {},
	} :: self, RateLimiter)
end

-- true si la petición pasa. Devuelve además la racha de rechazos seguidos, que
-- es lo que distingue a alguien con mala conexión de alguien con un script:
-- el primero falla de vez en cuando, el segundo falla cientos de veces seguidas.
function RateLimiter.Consume(self: RateLimiter, player: Player): (boolean, number)
	local now = os.clock()
	local bucket = self.Buckets[player]

	if bucket == nil then
		bucket = { Tokens = self.Burst, LastRefill = now, Streak = 0 }
		self.Buckets[player] = bucket
	end

	bucket.Tokens = math.min(self.Burst, bucket.Tokens + (now - bucket.LastRefill) * self.Rate)
	bucket.LastRefill = now

	if bucket.Tokens < 1 then
		bucket.Streak += 1
		return false, bucket.Streak
	end

	bucket.Tokens -= 1
	bucket.Streak = 0
	return true, 0
end

-- Un rechazo que no viene del límite —tipos mal, arma que no lleva, munición que
-- no tiene— también cuenta para la racha. Diez seguidos no son mala suerte.
function RateLimiter.NoteRejection(self: RateLimiter, player: Player): number
	local bucket = self.Buckets[player]
	if bucket == nil then
		return 0
	end
	bucket.Streak += 1
	return bucket.Streak
end

function RateLimiter.Forget(self: RateLimiter, player: Player)
	self.Buckets[player] = nil
end

return RateLimiter
