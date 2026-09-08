--!strict
--[[
	Config/Index.luau — la configuración entera en un solo require.

	Existe para dos cosas: que un sistema que necesita tres configuraciones no
	escriba tres requires, y que el arranque pueda recorrer todo para validarlo.
	Un sistema que solo necesita una configuración debe requerirla directa: acopla
	menos y se lee mejor en el diff.
]]

local Config = {
	Analytics = require(script.Parent.Analytics),
	Breach = require(script.Parent.Breach),
	Classes = require(script.Parent.Classes),
	Combat = require(script.Parent.Combat),
	Contracts = require(script.Parent.Contracts),
	Data = require(script.Parent.Data),
	Director = require(script.Parent.Director),
	Economy = require(script.Parent.Economy),
	Monetisation = require(script.Parent.Monetisation),
	Perks = require(script.Parent.Perks),
	Progression = require(script.Parent.Progression),
	Safehouse = require(script.Parent.Safehouse),
	Sectors = require(script.Parent.Sectors),
	Weapons = require(script.Parent.Weapons),
	ZombieAI = require(script.Parent.ZombieAI),
}

return table.freeze(Config)
