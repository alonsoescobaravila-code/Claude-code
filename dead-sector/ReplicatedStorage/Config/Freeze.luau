--!strict
--[[
	Freeze.luau — congela una tabla de configuración y todo lo que cuelga de ella.

	table.freeze es superficial: congela la tabla de arriba y deja las de dentro
	escribibles. Como la regla del proyecto es que ningún sistema modifique la
	configuración en caliente, aquí se recorre entero. Un intento de escribir en
	un valor de Config falla en el momento y en la línea, en vez de convertirse
	en un número que cambia solo entre partidas.
]]

local function deepFreeze<T>(value: T): T
	if type(value) == "table" then
		local tbl = value :: any
		if not table.isfrozen(tbl) then
			for _, inner in pairs(tbl) do
				deepFreeze(inner)
			end
			table.freeze(tbl)
		end
	end
	return value
end

return deepFreeze
