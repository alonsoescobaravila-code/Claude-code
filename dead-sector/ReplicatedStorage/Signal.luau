--!strict
--[[
	Signal.luau — aviso de un sistema a otro sin que se conozcan.

	ZombieAI tiene que avisar de una baja a Brecha, a Progresión y a Economía. Si
	los llamara directo, los cuatro quedarían atados y no se podría tocar uno sin
	tocar los otros. Con esto, ZombieAI emite y quien quiera escucha.

	Es un BindableEvent hecho a mano a propósito: el de Roblox serializa los
	argumentos al cruzar, pierde los tipos y asigna memoria en cada disparo. Este
	pasa la tabla tal cual, con su tipo, y no asigna nada.

	Un handler que reviente no puede llevarse por delante a los demás ni al bucle
	de zombis, así que cada uno va dentro de su propio pcall.
]]

local Signal = {}

export type Signal<T> = {
	handlers: { (T) -> () },
	-- Devuelve la función que desconecta. Guardarla es responsabilidad de quien
	-- conecta; un sistema que nunca se apaga puede ignorarla sin problema.
	Connect: (self: Signal<T>, handler: (T) -> ()) -> () -> (),
	Fire: (self: Signal<T>, value: T) -> (),
}

function Signal.new<T>(): Signal<T>
	local handlers: { (T) -> () } = {}

	return {
		handlers = handlers,

		Connect = function(_self: Signal<T>, handler: (T) -> ()): () -> ()
			table.insert(handlers, handler)

			return function()
				local index = table.find(handlers, handler)
				if index ~= nil then
					table.remove(handlers, index)
				end
			end
		end,

		Fire = function(_self: Signal<T>, value: T)
			for _, handler in handlers do
				-- xpcall y no pcall: el handler está declarado sin valor de
				-- retorno, así que pcall solo entrega el booleano y el mensaje se
				-- perdería. Un aviso que no dice qué falló no sirve de nada.
				xpcall(handler, function(err)
					warn(`[DEAD SECTOR] un handler de señal falló: {err}`)
				end, value)
			end
		end,
	}
end

return Signal
