--!strict
--[[
	Config/Data.luau — persistencia.

	SOURCE: informe y Prompt 5 — bloqueo de sesión, escrituras en pcall con espera
	creciente, guardado por lotes cada 60 segundos más PlayerRemoving y
	BindToClose, versión de esquema con migración, y ante un fallo de carga NO se
	entrega un perfil vacío: se expulsa al jugador con un mensaje claro.

	Esa última regla es la más importante de todo el archivo. Un perfil vacío que
	se guarda encima del bueno borra meses de progreso y no hay forma de
	recuperarlo. Expulsar molesta un minuto; sobrescribir se pierde para siempre.
]]

local Freeze = require(script.Parent.Freeze)

export type DataConfig = {
	StoreName: string,
	KeyPrefix: string,
	-- Subir esto obliga a escribir la migración correspondiente. Nunca cambiar la
	-- forma del perfil sin subirlo.
	SchemaVersion: number,
	-- Guardado por lotes. No se escribe en cada cambio.
	FlushIntervalSeconds: number,
	-- Reintentos con espera creciente: 1s, 2s, 4s, 8s...
	MaxRetries: number,
	RetryBaseSeconds: number,
	-- Bloqueo de sesión: impide que el mismo jugador esté cargado en dos servidores.
	SessionLockTimeoutSeconds: number,
	-- Cada cuánto se refresca el bloqueo mientras el jugador está dentro.
	SessionLockRefreshSeconds: number,
	-- Mensaje de expulsión si la carga falla. Ver comentario de arriba.
	LoadFailureKickMessage: string,
	-- Margen antes del cierre del servidor para terminar de escribir.
	BindToCloseBudgetSeconds: number,
}

local Data: DataConfig = {
	StoreName = "DeadSector_PlayerData",
	KeyPrefix = "player_",
	SchemaVersion = 1,
	FlushIntervalSeconds = 60, -- SOURCE: Prompt 5
	MaxRetries = 5, -- TUNE (Prompt 5)
	RetryBaseSeconds = 1, -- TUNE (Prompt 5)
	SessionLockTimeoutSeconds = 300, -- TUNE (Prompt 5)
	SessionLockRefreshSeconds = 60, -- TUNE (Prompt 5)
	BindToCloseBudgetSeconds = 25, -- TUNE (Prompt 5): por debajo del corte de Roblox
	LoadFailureKickMessage = "No pudimos cargar tu progreso. Vuelve a entrar en un minuto: "
		.. "preferimos sacarte antes que arriesgarnos a borrar lo que llevas.",
}

return Freeze(Data)
