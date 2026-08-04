# Metafields y contenido de producto

Las secciones y bloques leen todo desde un solo namespace: **`squishy`**. Así el
título real del producto (el que indexa Google) nunca se toca, pero la tienda
muestra el nombre corto y la voz de marca.

## 1. Definiciones de metafield

Admin → Configuración → Metafields y metaobjetos → Productos → Agregar definición.

| Nombre | Namespace y clave | Tipo | Para qué |
| --- | --- | --- | --- |
| Nombre corto | `squishy.nombre` | Una línea de texto | Reemplaza el título largo en tarjetas y ficha |
| Subtítulo sensorial | `squishy.subtitulo` | Una línea de texto | Una línea bajo el nombre |
| Badge | `squishy.badge` | Una línea de texto | «Nuevo», «Slow rising», «Pack» |
| Tono del badge | `squishy.badge_tono` | Una línea de texto | `pink`, `grape`, `mint`, `sky`, `peach`, `yellow` |
| Beneficios | `squishy.beneficios` | Lista de una línea de texto | Máximo 3 bullets |
| Medidas | `squishy.medidas` | Texto enriquecido | Acordeón de medidas y variantes |
| Material y cuidados | `squishy.material` | Texto enriquecido | Acordeón de cuidados |
| Seguridad y edad | `squishy.seguridad` | Texto enriquecido | Acordeón de seguridad |
| Envío y garantía | `squishy.envio` | Texto enriquecido | Acordeón de envío |
| Foto de tarjeta | `squishy.foto_card` | Referencia de archivo (imagen) | Evita que una foto de cotas quede como principal |

Todos son opcionales. Si falta uno, el código cae a un valor por defecto y la
página sigue funcionando — no hay estados rotos.

## 2. Reescritura de nombres

El audit marcó los títulos SEO como la debilidad número uno. La convención es
`Nombre cute + tipo/beneficio + variante`.

El único título original confirmado por captura es el de la fresa:

| Título actual (visible en la tienda) | `squishy.nombre` | `squishy.subtitulo` |
| --- | --- | --- |
| Giant Strawberry Squishy Toy Extra Large Size Strawberry Fidget Toys Slow Rising Shapeable Venting Ball for Adults Friends Gifts | **Squishy Fresa Jumbo** | Slow rising, suave al tacto |

Los demás salen de las categorías que el audit observó en la tienda (fresa,
sandía, mantequilla, queso, pato, stress balls). Ajusta la columna izquierda al
título real de cada producto antes de cargarlos:

| Producto | `squishy.nombre` | `squishy.subtitulo` | Badge |
| --- | --- | --- | --- |
| Sandía mini | **Mini Sandía Satisfying** | Cabe en tu bolsillo | Oferta suave · `peach` |
| Pato anti-estrés | **Patito Anti-Estrés** | Compañero de escritorio | Favorito · `yellow` |
| Queso squishy | **Cubito Queso Squishy** | Textura mochi densa | — |
| Barra de mantequilla | **Butter Stick Squishy** | Vuelve lento a su forma | Slow rising · `grape` |
| Stress ball cacahuate | **Peanut Squeeze Ball** | Firme, para apretar fuerte | — |
| Stress ball jabón | **Soap Ball Suave** | Sensación fresca y ligera | — |
| Pack sorpresa | **Pack Sorpresa Pastel** | Tres texturas, una caja tierna | Pack · `grape` |

## 3. Qué borrar del contenido actual

El audit y el design system coinciden en esta lista. Son búsquedas concretas
sobre las descripciones actuales:

- Frases de proveedor: `dropshipping`, `wholesale`, `Aliexpress`, `factory`.
- Cualquier oración completa en inglés. Se permiten solo los préstamos de
  categoría: *squishy, satisfying, slow rising, ASMR, mochi, jumbo, mini, pack*.
- Claims sin documento que los respalde: `no tóxico`, `certificado`, `vegano`,
  `eco-friendly`, `100% garantizado`.
- Promesas médicas: cualquier cosa sobre curar ansiedad o estrés clínico.
- Urgencia agresiva: `¡Solo hoy!`, `¡Últimas unidades!`.
- Placeholders visibles. En la captura de home móvil hay uno bajo el producto
  destacado (`#grtitle_respbile_estrella`).
- Vendor `My Store 4` — cámbialo a `Squishy Heaven` en todos los productos.

## 4. Bloques de la ficha de producto

Orden fijo que define el design system, de arriba hacia abajo en la columna de
información:

1. Nombre cute → bloque **SH · Nombre y subtítulo**
2. Subtítulo sensorial → mismo bloque
3. Tres beneficios → bloque **SH · Beneficios**
4. Precio y selector de variantes → bloques nativos de Horizon
5. Botón de compra → bloque nativo de Horizon
6. Confianza → bloque **SH · Confianza (producto)**, justo debajo del botón
7. Medidas, material, seguridad, envío → bloque **SH · Ficha de producto**

## 5. Nota sobre la calificación del hero

La home actual muestra «4.9 · 128 reseñas». El ajuste `show_rating` viene
**apagado** a propósito: el mismo audit que pide arreglar los claims sin
respaldo aplica aquí. Enciéndelo cuando tengas reseñas reales conectadas a una
app de reviews.
