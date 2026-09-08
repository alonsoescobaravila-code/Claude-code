--!strict
--[[
	Combat/Loadout.luau — qué arma lleva cada jugador y en qué estado está.

	Munición, enfriamiento y recarga viven acá, EN EL SERVIDOR. El cliente tiene
	su copia para pintar el número en pantalla, pero la suya no decide nada: si
	dicen cosas distintas, la del servidor es la verdadera y la del cliente se
	corrige sola en la siguiente confirmación.

	Esto es lo que convierte "tengo balas infinitas" en un cambio que solo afecta
	al número que ese jugador ve en su propia pantalla.

	Los niveles y tiers de arma son del Prompt 4. Acá se lee el arma tal como está
	en Config; cuando exista la progresión, este módulo pedirá las estadísticas ya
	escaladas en vez de las de base.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Types = require(ReplicatedStorage.Types)
local ConfigWeapons = require(ReplicatedStorage.Config.Weapons)

local Loadout = {}
Loadout.__index = Loadout

export type State = {
	WeaponId: Types.WeaponId,
	Ammo: number,
	Reserve: number,
	-- Reloj del servidor en que se podrá volver a disparar.
	NextFireAt: number,
	-- Reloj del servidor en que termina la recarga. 0 = no está recargando.
	ReloadingUntil: number,
}

type self = {
	States: { [Player]: State },
}

export type Loadout = typeof(setmetatable({} :: self, Loadout))

local function build(weaponId: Types.WeaponId): State?
	local weapon = ConfigWeapons.Catalogue[weaponId]
	if weapon == nil then
		return nil
	end

	return {
		WeaponId = weaponId,
		Ammo = weapon.MagazineSize,
		Reserve = weapon.MagazineSize * weapon.ReserveMagazines,
		NextFireAt = 0,
		ReloadingUntil = 0,
	}
end

function Loadout.new(): Loadout
	return setmetatable({ States = {} } :: self, Loadout)
end

function Loadout.Give(self: Loadout, player: Player, weaponId: Types.WeaponId): boolean
	local state = build(weaponId)
	if state == nil then
		return false
	end
	self.States[player] = state
	return true
end

function Loadout.GiveStarting(self: Loadout, player: Player)
	local ok = self:Give(player, ConfigWeapons.StartingWeapon)
	if not ok then
		warn(`[DEAD SECTOR] el arma inicial {ConfigWeapons.StartingWeapon} no está en el catálogo`)
	end
end

function Loadout.Get(self: Loadout, player: Player): State?
	return self.States[player]
end

function Loadout.WeaponOf(self: Loadout, player: Player): Types.Weapon?
	local state = self.States[player]
	if state == nil then
		return nil
	end
	return ConfigWeapons.Catalogue[state.WeaponId]
end

-- Termina la recarga si ya pasó su tiempo. Se comprueba al consultar y no en un
-- bucle: a nadie le importa que la recarga haya terminado hasta que intenta
-- disparar otra vez.
function Loadout.Settle(self: Loadout, player: Player, now: number)
	local state = self.States[player]
	if state == nil or state.ReloadingUntil == 0 or now < state.ReloadingUntil then
		return
	end

	local weapon = ConfigWeapons.Catalogue[state.WeaponId]
	state.ReloadingUntil = 0
	if weapon == nil then
		return
	end

	local wanted = math.min(weapon.MagazineSize - state.Ammo, state.Reserve)
	state.Ammo += wanted
	state.Reserve -= wanted
end

function Loadout.BeginReload(self: Loadout, player: Player, now: number): boolean
	local state = self.States[player]
	if state == nil or state.ReloadingUntil ~= 0 then
		return false
	end

	local weapon = ConfigWeapons.Catalogue[state.WeaponId]
	if weapon == nil or state.Ammo >= weapon.MagazineSize or state.Reserve <= 0 then
		return false
	end

	state.ReloadingUntil = now + weapon.ReloadTime
	return true
end

function Loadout.Forget(self: Loadout, player: Player)
	self.States[player] = nil
end

return Loadout
