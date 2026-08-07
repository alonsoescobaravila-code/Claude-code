# Verificación

Las cinco pasadas que este paquete tiene que pasar antes de subirse a la tienda.
No hacen falta para instalar nada — **esta carpeta no se sube al tema.** Están
aquí para que cualquier cambio futuro se pueda comprobar igual que el original.

| | Qué mira | Cómo |
| --- | --- | --- |
| 1 | Lint de tema y contrato de schemas | `tc.mjs` + `xcheck.mjs` |
| 1b | Schemas contra la documentación y contra el Horizon real | `pasada1b.mjs` |
| 1c | Lint del paquete instalado dentro del Horizon real | `tc-mix.mjs` |
| 2 | Semántica de Liquid sobre el AST real | `pasada2.mjs` |
| 3 | Coherencia entre CSS, JavaScript y Liquid | `pasada3.mjs` |
| 4 | Comportamiento real en Chromium | `pasada4.py` |
| 5 | Contenido, documentación y paquete | `pasada5.py` |

> **1b y 1c existen por un fallo que se escapó.** Shopify rechazó un archivo al
> guardarlo —«Invalid schema: 'max_blocks' is not a valid attribute»— con
> theme-check dando 0 avisos. El linter no cubre todo lo que valida el servidor
> al guardar, así que hace falta comparar también contra la documentación y
> contra lo que el tema real usa de verdad.

## Qué comprueba cada una

**1 · Lint y contrato.** `@shopify/theme-check-node` sobre las cinco carpetas
del tema, y un cruce de las dos plantillas contra los schemas: que cada ajuste
usado exista, que los tipos de bloque existan, que `block_order` y `order` no
mencionen nada inexistente, y que ningún nombre de schema pase de 25 caracteres.

**1b · Schemas.** Valida cada `{% schema %}` contra dos fuentes a la vez. La
lista de atributos documentada en shopify.dev —de sección, de archivo de bloque,
de entrada de bloque, de preset y de ajuste— detecta lo inventado. Y el contraste
con un clon del Horizon real detecta lo que la documentación permite pero este
tema rechaza. Comprueba además los rangos (pasos enteros, máximo 101, default
dentro de min/max), los select (default dentro de sus opciones), los `header` y
`paragraph` (sin `id`, con `content`), que los presets solo usen bloques que la
sección declara, y que **ningún archivo del paquete pise un archivo de Horizon**.

Lleva codificado el caso concreto que rompió: `max_blocks` está documentado y
Horizon lo usa, así que ni el linter ni el contraste genérico lo detectan. La
diferencia está en con qué se combina — Horizon solo lo pone en secciones cuyos
bloques son referencias a archivos de `blocks/`; en una sección que define sus
bloques en línea, el servidor lo rechaza al guardar.

**1c · Dentro del tema real.** Corre theme-check sobre una copia de Horizon con
los 26 archivos del paquete instalados, y filtra las ofensas para quedarse solo
con las de esos archivos. Es la comprobación estática más parecida a la tienda
que se puede hacer sin la tienda: el linter resuelve las convenciones del tema
completo en vez de las de un esqueleto.

**2 · Liquid.** Parsea cada archivo con `@shopify/liquid-html-parser` y busca
tres cosas que el lint no ve:

- Ningún filtro colgando de `image_tag`, `stylesheet_tag` ni `script_tag` — se
  aplicaría a la etiqueta entera y la imprimiría como texto en la página. Este
  fallo ya estuvo en el código y así se encontró.
- Texto libre del merchant sin `escape` dentro de un atributo HTML. Solo cuenta
  `text`, `textarea`, `richtext` y `html`: un `select` únicamente devuelve
  valores del propio schema.
- Que un bloque que necesite el producto lo pida con `closest.product`, y que
  todos emitan `block.shopify_attributes`.

**3 · CSS, JS y Liquid.** Que ninguna clase del preview tenga estilo que al
tema le falte, que ninguna variable CSS se use sin definir y sin respaldo, que
cada `data-sh-*` que el JavaScript lee lo escriba algún Liquid y al revés, que
el JS inline del preview sea copia literal del asset, que cada sección enlace lo
que usa y solo lo que usa, y que los `min-height` coincidan entre tema y
preview. Aquí salió que el preview pintaba los chips a 36 px y el tema a 40.

**4 · Navegador.** Renderiza el preview en Chromium: las tres páginas a
1180/900/414/360 px sin desborde ni errores de consola; ningún objetivo táctil
por debajo de 44 px; el squishy se deforma hacia el punto que se toca, responde
al teclado y vuelve con transición; el contador cuenta con el plural correcto y
el silencio persiste; los brillos aparecen, se limpian solos y no saltan al
hacer clic en un campo de texto; las estrellas llenas y vacías se distinguen; y
con «reducir movimiento» activo no hay deformación ni capa de brillos pero todo
sigue funcionando.

**5 · Contenido y paquete.** Que los nombres de sección citados en `INSTALAR.md`
sean los de los schemas, que los enlaces entre documentos resuelvan, que todos
los archivos del tema estén documentados en las dos guías, que los conteos y los
tamaños citados sean los reales, que la calificación del hero y el promedio de
reseñas vengan apagados, que ningún texto por defecto lleve un claim sin
respaldo, y que el ZIP coincida exactamente con la carpeta.

## Cómo ejecutarlas

Necesitan Node y las dependencias de Shopify:

```bash
cd verificar
npm i @shopify/theme-check-node @shopify/liquid-html-parser
pip install playwright
git clone --depth 1 https://github.com/Shopify/horizon.git
```

El `npm i` va **dentro de esta carpeta**: Node busca `node_modules` junto al
archivo `.mjs` que ejecuta, no desde donde lo llamas.

- `tc.mjs` espera un tema de prueba en `./theme` con las cinco carpetas del
  paquete copiadas dentro.
- `pasada1b.mjs` recibe la ruta al clon de Horizon como argumento. Sin ella
  corre solo la parte documental y lo avisa.
- `tc-mix.mjs` recibe la ruta a una copia de Horizon con el paquete ya
  instalado encima.
- `pasada4.py` necesita la ruta a un Chromium en la constante `CHROME`.
- Las demás leen directamente de `squishy-heaven/`.
