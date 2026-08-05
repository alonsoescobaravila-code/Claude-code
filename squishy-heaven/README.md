# Squishy Heaven — secciones para Shopify (tema Horizon)

Código listo para subir al tema **Horizon** de la tienda Squishy Heaven, más una
previsualización HTML de cómo queda.

Todo sale de dos fuentes: el perfil de marca (`squishyheavenbrandprofile.zip` —
audit, plan de mejoras, tokens) y el sistema de marca de Claude Design
(`Squishy_Heaven_Design_System.zip` — tokens CSS, 21 componentes, reglas de voz).
Las capturas de la tienda real fijaron el punto de partida.

## Qué arregla

| Prioridad del audit | Qué entrega este paquete |
| --- | --- |
| P1 · Confianza | `sh-trust-row`, `sh-policies`, bloque de confianza bajo el botón de compra, ayuda si llega dañado |
| P2 · Producto y fichas | Nombre corto por metafield sin tocar el SEO, subtítulo sensorial, 3 beneficios, acordeones de medidas/material/seguridad/envío, foto de tarjeta separada de las fotos de cotas |
| P3 · Voz y copy | Todos los textos por defecto en español, frases aprobadas del design system, cero claims sin respaldo |
| P4 · Dirección visual | Un solo CSS con los tokens del design system: botones pill, cards de 24px, badges, chips, FAQ, newsletter |
| P5 · Fotografía | Cada hueco de imagen dice qué foto hay que producir mientras no exista |
| P6 · Conversión | CTA consistente «Elegir mi squishy», badges junto al botón, categorías y packs de regalo |

## Archivos

```
assets/sh-squishy.css              tokens + componentes (un solo archivo, cacheado)
snippets/sh-icon.liquid            iconos Lucide inline, sin JS externo
snippets/sh-product-card.liquid    tarjeta de producto con nombre corto
snippets/sh-section-attrs.liquid   traduce los ajustes de diseño a variables CSS
assets/sh-fredoka.woff2            fuente de titulares, alojada en el tema
assets/sh-quicksand.woff2          fuente de texto, alojada en el tema
sections/sh-hero.liquid            hero pastel con confianza
sections/sh-collection-tiles.liquid categorías
sections/sh-featured-products.liquid grilla de productos
sections/sh-textura.liquid         elige por textura + fotos
sections/sh-story.liquid           historia y credibilidad
sections/sh-trust-row.liquid       fila de confianza
sections/sh-faq.liquid             preguntas frecuentes
sections/sh-newsletter.liquid      newsletter
sections/sh-policies.liquid        envíos, cambios, ayuda y seguridad
blocks/sh-subtitulo.liquid         producto · nombre corto y subtítulo
blocks/sh-beneficios.liquid        producto · 3 beneficios
blocks/sh-confianza.liquid         producto · confianza bajo el botón
blocks/sh-ficha.liquid             producto · medidas, cuidados, seguridad, envío
templates/index.squishy-heaven.json home ya armada
templates/page.envios-y-cambios.json página de envíos ya armada
docs/metafields-y-contenido.md     metafields y reescritura de productos
preview/squishy-heaven-preview.html previsualización visual
```

## Instalación

1. **Duplica el tema Horizon** antes de tocar nada. Admin → Tienda online →
   Temas → ⋯ → Duplicar. Trabaja sobre la copia.
2. Abre **Editar código** en la copia y sube los archivos respetando las
   carpetas: `assets/`, `snippets/`, `sections/`, `blocks/`, `templates/`.
   Con Shopify CLI: `shopify theme push --only assets,snippets,sections,blocks,templates`.
3. Crea las definiciones de metafield de `docs/metafields-y-contenido.md`.
   Sin esto todo funciona igual, pero las tarjetas siguen mostrando el título
   largo recortado en vez del nombre corto.
4. **Home:** en el editor de temas elige la plantilla `squishy-heaven`, o arma
   la página a mano — las secciones aparecen como `SH · …` en el selector.
5. **Ficha de producto:** en la sección `product-information` de Horizon, dentro
   de la columna de información, agrega los bloques
   `SH · Nombre y subtítulo`, `SH · Beneficios`, `SH · Confianza (producto)` y
   `SH · Ficha de producto`, en ese orden. Si activas «Mostrar nombre corto como título»,
   oculta el título nativo del tema para no repetirlo.
6. **Página de envíos:** crea la página en Admin → Contenido → Páginas y, en
   «Plantilla de tema», elige `page.envios-y-cambios`. Viene armada con las
   cuatro políticas y tres preguntas frecuentes. **Reemplaza cada plazo por el
   real de tu operación** antes de publicarla.

## Controles del editor

Todas las secciones traen el mismo grupo **Diseño** al final de sus ajustes, así
que armar una página es elegir contenido y mover barras — sin tocar código.

| Control | Dónde | Qué hace |
| --- | --- | --- |
| Espacio arriba / abajo (escritorio) | todas | 0 a 128 px |
| Espacio arriba / abajo (móvil) | todas | 0 a 96 px, independiente del escritorio |
| Alineación del encabezado | secciones con titular | centrada o izquierda |
| Etiqueta del titular | hero, envíos, FAQ | H1, H2 o H3, para no repetir H1 en una página |
| Columnas en escritorio | productos, categorías, texturas, envíos | 2 a 5 |
| En móvil | las mismas | 1 columna, 2 columnas o carrusel deslizable |
| Fondo de la sección | todas | los tintes pastel del design system |

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
| Texturas | 1 foto por bloque | antetítulo, titular, párrafo, chips, pies de foto |
| Historia | 1 foto | antetítulo, titular, párrafo, lista de puntos, botón |
| Confianza | iconos del set | etiqueta y detalle por señal |
| FAQ | — | pregunta y respuesta por bloque |
| Newsletter | — | antetítulo, titular, párrafo, texto de ejemplo, botón, nota legal |
| Envíos | iconos del set | título y texto por política |

### Detalle de rendimiento (opcional)

Cada sección enlaza `sh-squishy.css` por su cuenta, así que funcionan sueltas.
Si prefieres una sola etiqueta, agrega esto en `layout/theme.liquid` antes de
`</head>`:

```liquid
{{ 'sh-squishy.css' | asset_url | stylesheet_tag: preload: true }}
```

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
