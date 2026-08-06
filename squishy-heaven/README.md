# Squishy Heaven — secciones para Shopify (tema Horizon)

Código listo para subir al tema **Horizon** de la tienda Squishy Heaven, más una
previsualización HTML de cómo queda.

Todo sale de dos fuentes: el perfil de marca (`squishyheavenbrandprofile.zip` —
audit, plan de mejoras, tokens) y el sistema de marca de Claude Design
(`Squishy_Heaven_Design_System.zip` — tokens CSS, 21 componentes, reglas de voz).
Las capturas de la tienda real fijaron el punto de partida.

> **Para instalar, ve a [`INSTALAR.md`](INSTALAR.md)** — dónde va cada archivo,
> paso a paso.
> **Si algo no funciona, ve a [`docs/si-algo-falla.md`](docs/si-algo-falla.md)** —
> ordenado por lo que ves en pantalla.
>
> Este archivo es el porqué: qué resuelve cada pieza y cómo está construida.

## Qué arregla

| Prioridad del audit | Qué entrega este paquete |
| --- | --- |
| P1 · Confianza | `sh-trust-row`, `sh-policies`, bloque de confianza bajo el botón de compra, ayuda si llega dañado |
| P2 · Producto y fichas | Nombre corto por metafield sin tocar el SEO, subtítulo sensorial, 3 beneficios, acordeones de medidas/material/seguridad/envío, foto de tarjeta separada de las fotos de cotas |
| P3 · Voz y copy | Todos los textos por defecto en español, frases aprobadas del design system, cero claims sin respaldo |
| P4 · Dirección visual | Un solo CSS con los tokens del design system: botones pill, cards de 24px, badges, chips, FAQ, newsletter |
| P5 · Fotografía | Cada hueco de imagen dice qué foto hay que producir mientras no exista |
| P6 · Conversión | CTA consistente «Elegir mi squishy», badges junto al botón, categorías y packs de regalo. `sh-squish-toy` lo deja apretar antes de comprar, y `sh-tamano` contesta «¿qué tan grande es?» antes de que sea una devolución |

## Archivos

```
assets/sh-squishy.css              tokens + componentes (un solo archivo, cacheado)
assets/sh-interactivo.js           el squishy que se aprieta + los brillos al clic
assets/sh-fredoka.woff2            fuente de titulares, alojada en el tema
assets/sh-quicksand.woff2          fuente de texto, alojada en el tema
snippets/sh-icon.liquid            iconos Lucide inline, sin JS externo
snippets/sh-product-card.liquid    tarjeta de producto con nombre corto
snippets/sh-section-attrs.liquid   traduce los ajustes de diseño a variables CSS
sections/sh-hero.liquid            hero pastel con confianza
sections/sh-collection-tiles.liquid categorías
sections/sh-featured-products.liquid grilla de productos
sections/sh-squish-toy.liquid      el squishy de mantequilla interactivo
sections/sh-tamano.liquid          tamaño real, con la medida al lado
sections/sh-resenas.liquid         reseñas con foto real del cliente
sections/sh-textura.liquid         elige por textura + fotos
sections/sh-story.liquid           historia y credibilidad
sections/sh-trust-row.liquid       fila de confianza
sections/sh-faq.liquid             preguntas frecuentes
sections/sh-newsletter.liquid      newsletter
sections/sh-policies.liquid        envíos, cambios, ayuda y seguridad
sections/sh-brillos.liquid         enciende los brillos al hacer clic
blocks/sh-subtitulo.liquid         producto · nombre corto y subtítulo
blocks/sh-beneficios.liquid        producto · 3 beneficios
blocks/sh-confianza.liquid         producto · confianza bajo el botón
blocks/sh-ficha.liquid             producto · medidas, cuidados, seguridad, envío
templates/index.squishy-heaven.json home ya armada
templates/page.envios-y-cambios.json página de envíos ya armada
INSTALAR.md                        dónde va cada archivo, paso a paso
docs/metafields-y-contenido.md     metafields y reescritura de productos
docs/si-algo-falla.md              qué puede salir mal y cómo se arregla
verificar/                         las cinco pasadas que este paquete pasa
preview/squishy-heaven-preview.html previsualización visual
```

Las cinco primeras carpetas van al tema. `INSTALAR.md`, `README.md`, `docs/`,
`verificar/` y `preview/` son para ti — no se suben a Shopify.

### Sobre la etiqueta `{% schema %}`

Las **13 secciones y los 4 bloques** llevan su `{% schema %}` con `presets`, verificado
con `@shopify/theme-check-node`: 0 avisos.

Los **3 snippets no la llevan, y no deben llevarla**: Shopify solo acepta
`{% schema %}` en `sections/` y `blocks/`. Un snippet con schema es un error de
tema. Lo que sí llevan es `{% doc %}`, que es su equivalente: declara los
parámetros que reciben, y el editor de código de Shopify los muestra al
escribir `{% render %}`.

Si el editor te marca «falta la etiqueta schema»,
[`docs/si-algo-falla.md`](docs/si-algo-falla.md) tiene las dos causas y cómo
distinguirlas.

## Orden de la home

`templates/index.squishy-heaven.json` viene armada en este orden, que es el que
repiten las tiendas de peluche y squishy con tracción: primero navegar, después
comprar, y las objeciones resueltas antes de que se conviertan en una devolución.

1. **Hero** — una promesa y un botón.
2. **Categorías** — navegación inmediata, la columna vertebral de la conversión.
3. **Favoritos** — producto con precio y botón de compra en cada tarjeta, sin
   obligar a entrar a la ficha.
4. **Squishy interactivo** — el momento de «pruébalo». Llega justo cuando ya
   vieron producto pero todavía no se decidieron, y termina en un CTA.
5. **Tamaño real** — «llegó más pequeño de lo que pensé» es la devolución
   número uno de la categoría. Se contesta aquí, con la mano al lado y la
   medida en grande.
6. **Texturas** — segunda entrada al catálogo, por sensación en vez de por
   categoría heredada del proveedor.
7. **Historia** — por qué confiar, después de haber visto el producto.
8. **Reseñas con foto** — la prueba: clientes reales con el producto en su casa.
9. **Confianza** — envío, pago, ayuda y fotos reales.
10. **FAQ** — lo que queda.
11. **Newsletter** — la salida para quien no compra hoy.
12. **Brillos** — invisible, solo enciende el efecto.

Puedes reordenar todo desde el editor: ninguna sección depende de otra.

## Controles del editor

Todas las secciones traen el mismo grupo **Diseño** al final de sus ajustes, así
que armar una página es elegir contenido y mover barras — sin tocar código.

| Control | Dónde | Qué hace |
| --- | --- | --- |
| Espacio arriba / abajo (escritorio) | todas | 0 a 128 px |
| Espacio arriba / abajo (móvil) | todas | 0 a 96 px, independiente del escritorio |
| Alineación del encabezado | secciones con titular | centrada o izquierda |
| Etiqueta del titular | hero, envíos, FAQ | H1, H2 o H3, para no repetir H1 en una página |
| Columnas en escritorio | productos, categorías, texturas, tamaños, reseñas, envíos | 2 a 5 |
| En móvil | las mismas | 1 columna, 2 columnas o carrusel deslizable |
| Fondo de la sección | todas | los tintes pastel del design system |
| Sonido, brillos y contador | squishy interactivo | cada uno se enciende o apaga por separado |
| Cómo vuelve a su forma | squishy interactivo | slow rising (despacio) o rebote rápido |
| Cuántas estrellitas por clic | brillos | pocas, normal o muchas; y si aplica también al tocar en el teléfono |

El carrusel deslizable usa `scroll-snap` nativo: se desliza con el dedo, sin
JavaScript ni librerías.

Las columnas de tablet se calculan solas — nunca más de 3, y nunca más de las
que elegiste para escritorio, así una cuadrícula de 2 no se estira a 3 al pasar
por el ancho intermedio.

En teléfonos angostos se respeta tu elección de columnas: a 414 px, el ancho más
común, dos tarjetas entran bien. Lo que se aprieta es el interior de la tarjeta
—padding, tamaño del nombre, badge— no la cuadrícula.

### Dónde va cada texto e imagen

Todo el contenido es un ajuste del editor; el código no trae texto quemado.

| Sección | Imágenes | Texto |
| --- | --- | --- |
| Hero | 1 foto (con nota de la toma mientras no exista) | antetítulo, titular, párrafo, 2 botones, 4 etiquetas de confianza |
| Categorías | 1 foto por categoría, o icono | título y contador por categoría |
| Productos | vienen del producto y sus metafields | antetítulo, titular, párrafo, botón |
| Reseñas | 1 foto por reseña, la que manda el cliente | estrellas, texto, quién, compra verificada y producto por reseña |
| Squishy interactivo | 1 foto opcional; sin ella va el dibujo de mantequilla | antetítulo, titular, párrafo, hasta 4 puntos, botón, pista, textos del contador y del mensaje sorpresa |
| Tamaño real | 1 foto por bloque (producto en la mano) | medida, comparación, descripción por bloque y nota al pie |
| Texturas | 1 foto por bloque | antetítulo, titular, párrafo, chips, pies de foto |
| Historia | 1 foto | antetítulo, titular, párrafo, lista de puntos, botón |
| Confianza | iconos del set | etiqueta y detalle por señal |
| FAQ | — | pregunta y respuesta por bloque |
| Newsletter | — | antetítulo, titular, párrafo, texto de ejemplo, botón, nota legal |
| Envíos | iconos del set | título y texto por política |

## Interactividad

Tres cosas que hacen que la tienda se sienta hecha a mano, sin librerías ni
dependencias externas. Todo suma **4,9 KB de JavaScript comprimido**, en un
único archivo (`sh-interactivo.js`) que las dos secciones que lo usan cargan
con `defer` — nunca bloquea el pintado.

**El squishy que se aprieta.** Mantén pulsado con el ratón o el dedo: se
aplasta *hacia donde lo tocas* (arriba se achata a lo alto, de lado se achata a
lo ancho), entrecierra los ojos, suena, vibra en el teléfono y vuelve despacio
como un slow rising real. Lleva la cuenta de apretones en el navegador de cada
visitante y suelta un mensaje sorpresa a los 25.

- **El sonido no descarga nada.** Se sintetiza con Web Audio: una capa de ruido
  filtrado que barre en frecuencia (el aire saliendo) y un seno que dobla el
  tono (el material cediendo), con el tono ligeramente distinto cada vez. Un mp3
  de squish serían 30-60 KB y una petición más.
- **Solo suena cuando alguien aprieta**, así que ningún navegador lo bloquea y
  nadie escucha algo que no provocó. Siempre hay un botón para silenciarlo, y
  la elección se recuerda.
- Es un `<button>`, así que funciona con teclado y lo anuncian los lectores de
  pantalla. Sin JavaScript se ve igual, quieto, y el botón de la sección sigue
  llevando al catálogo.
- Mientras no exista una foto, el juguete es un dibujo de mantequilla hecho en
  CSS: pesa cero. Cuando tengas la foto recortada, la subes en «Imagen» y
  reemplaza al dibujo conservando toda la interacción.

**Brillos al hacer clic.** Estrellitas y destellos en los colores de la marca,
en cualquier parte de la página. Un solo escuchador para todo el documento, tope
de 80 partículas vivas, y no se disparan al escribir en un campo de texto.

**El squish como física de la interfaz.** Botones y tarjetas no se encogen al
pulsarlos: se achatan a lo ancho, igual que el producto. Es un detalle de dos
líneas de CSS que hace que toda la tienda se sienta del mismo material.

Las tres respetan `prefers-reduced-motion`: si el visitante pidió menos
movimiento en su sistema, no hay animación, ni brillos, ni vibración.

## Reseñas sin app

`sh-resenas` hace la mitad de lo que hace Loox: **muestra** reseñas con foto,
con estrellas, nombre, «compra verificada» y enlace al producto que compraron.
La otra mitad —pedir la reseña por correo, recibirla y guardarla sola— no la
hace, y ninguna sección de tema puede hacerla. Tú pegas cada reseña en el
editor. A cambio no pagas mensualidad, no hay JavaScript de terceros en el
storefront, y las fotos viven en tu propia tienda.

**El promedio no se escribe a mano.** Se calcula sumando las reseñas que hay
publicadas en la sección. Es la misma regla que mantiene apagada la calificación
del hero: un número que nadie puede comprobar en la página resta confianza en
vez de sumarla. Si publicas 8 reseñas, el promedio es el de esas 8, y el texto
lo dice: «sobre 8 reseñas publicadas».

Viene **apagado** en la plantilla de la home a propósito. Enciéndelo cuando
tengas suficientes: tres reseñas y un 5,0 se leen como inventadas.

La foto se amplía al hacer clic usando `<dialog>`, que trae el cierre con
Escape, el foco atrapado y el fondo inerte de fábrica. Sin JavaScript la foto se
ve igual dentro de la tarjeta, solo que no se amplía.

Cómo conseguir las fotos está en [`INSTALAR.md`](INSTALAR.md), paso 7.

## Rendimiento

Qué se hizo para que la página no se sienta lenta al entrar:

| | |
| --- | --- |
| `content-visibility: auto` en cada sección | El navegador no pinta lo que todavía no se ve. `contain-intrinsic-size: auto` hace que recuerde el alto real tras el primer pintado, así la barra de scroll no salta |
| Entrada al hacer scroll sin JavaScript | `animation-timeline: view()` dentro de un `@supports`; donde no está soportado, el contenido simplemente ya está visible |
| Solo se animan `transform` y `opacity` | Van en la GPU y no obligan a recalcular el layout. Ninguna animación mueve cajas |
| Imágenes | La del hero en `eager` con `fetchpriority="high"`; todas las demás `lazy` + `decoding="async"`, con `srcset` y `sizes` reales |
| Fuentes | Alojadas en el tema, variables (un archivo por familia) y con `font-display: swap` |
| Iconos | SVG inline, cero JavaScript |
| Peso añadido | CSS 8,9 KB y JS 4,9 KB comprimidos. Cero librerías, cero peticiones a terceros |

### Una sola etiqueta de CSS (opcional)

Cada sección enlaza `sh-squishy.css` por su cuenta, así que funcionan sueltas —
el navegador descarga el archivo una sola vez. Si prefieres pedirlo desde el
principio del HTML en vez de a mitad, agrega esto en `layout/theme.liquid` antes
de `</head>`:

```liquid
{{ 'sh-squishy.css' | asset_url | stylesheet_tag: preload: true }}
```

**Las fuentes no se precargan a propósito.** `asset_url` añade `?v=` para romper
la caché, pero dentro del CSS las fuentes se piden con ruta relativa, sin esa
parte. Precargar la URL con `?v=` serían dos direcciones distintas para el mismo
archivo y el navegador bajaría cada fuente dos veces — 58 KB de más para
«optimizar». Con `font-display: swap` el texto se ve desde el primer instante,
así que no hace falta.

## Compatibilidad con Horizon

- Las secciones son autónomas: CSS con prefijo `.sh-`, sin tocar archivos del
  tema, sin sobrescribir estilos de Horizon. Un update del tema no las rompe.
- Los bloques usan `closest.product`, que es como Horizon pasa el producto a un
  bloque de tema dentro de la sección de producto.
- El CSS por sección va en `{% stylesheet %}`, así Shopify lo agrupa en el
  bundle del tema en vez de abrir peticiones nuevas.
- Los colores no usan los esquemas de color de Horizon a propósito: el design
  system fija campos pastel planos y prohíbe base oscura y gradientes. El fondo
  de cada sección se elige con el ajuste «Fondo de la sección».

## Reglas que el código respeta

Del `readme.md` del design system, las diez que no se rompen:

1. Ninguna base oscura. 2. Sin gradientes. 3. El rosa es solo para CTA.
4. Un idioma: español. 5. Ningún claim sin prueba. 6. Sin urgencia agresiva.
7. Sin emojis de relleno. 8. Nada cuadrado. 9. Nunca copy de proveedor.
10. Nunca una foto de cotas como imagen principal.

## Dos sustituciones, declaradas

- **Iconos.** El design system carga Lucide por CDN JS. Aquí van inlineados como
  SVG (`snippets/sh-icon.liquid`) con la geometría exacta de Lucide 0.446.0, para
  no sumar ~100 KB de JavaScript ni depender de un CDN externo en el storefront.
- **Fuentes.** El design system las carga desde Google Fonts. Aquí van alojadas
  en el propio tema (`assets/sh-fredoka.woff2`, `assets/sh-quicksand.woff2`):
  quita un tercero del storefront y evita la petición encadenada que provoca un
  `@import`. Las dos son SIL Open Font License 1.1, así que alojarlas está
  permitido, y las dos son variables — un archivo cubre todos los pesos.

## Lo que este paquete no incluye

- **Fotografía.** La marca no tiene fotos propias todavía. Cada hueco de imagen
  dice qué hay que fotografiar; súbelas cuando existan.
- **Logo.** No hay archivo de logo. El nombre va como tipografía.
- **Emails.** El design system trae `ui_kits/email/` con welcome, carrito
  abandonado y post-compra. Faltan browse abandonment, reseñas/UGC y winback.
- **Reseñas.** El bloque de calificación existe pero viene apagado hasta que
  haya reseñas reales conectadas.
