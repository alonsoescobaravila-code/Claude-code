# Instalar — dónde va cada archivo

Guía única de instalación. Si algo no sale como aquí, ve a
[`docs/si-algo-falla.md`](docs/si-algo-falla.md).

---

## Paso 0 · Duplica el tema. No te saltes esto.

Admin → **Tienda online** → **Temas** → en Horizon, el botón `⋯` → **Duplicar**.

Trabaja siempre sobre la copia. Mientras no la publiques, la tienda que ven tus
clientes sigue intacta pase lo que pase.

---

## Paso 1 · Qué archivo va en qué carpeta

Abre la copia → `⋯` → **Editar código**. A la izquierda verás las carpetas del
tema. Cada archivo va **en la carpeta que lleva su mismo nombre**: los de
`assets/` a `assets/`, los de `sections/` a `sections/`, y así.

> Un archivo en la carpeta equivocada es la causa número uno de los errores del
> editor de Shopify. Un snippet puesto en `sections/` da el aviso «falta la
> etiqueta schema».

### `assets/` — 4 archivos

| Archivo | Qué es |
| --- | --- |
| `sh-squishy.css` | Todos los colores, tipografías, botones y tarjetas. Sin este archivo la tienda se ve como texto plano |
| `sh-interactivo.js` | El squishy que se aprieta y los brillos al hacer clic. Solo lo cargan las dos secciones que lo usan |
| `sh-fredoka.woff2` | Tipografía de los titulares |
| `sh-quicksand.woff2` | Tipografía del texto |

**Los nombres no se cambian.** El CSS pide las fuentes por su nombre exacto; si
renombras un `.woff2`, los titulares salen con otra tipografía.

### `snippets/` — 3 archivos

| Archivo | Qué es |
| --- | --- |
| `sh-icon.liquid` | Los iconos, dibujados en el propio HTML |
| `sh-product-card.liquid` | La tarjeta de producto con el nombre corto |
| `sh-section-attrs.liquid` | Traduce los controles de diseño del editor a la sección |

Estos tres **no llevan `{% schema %}` y no deben llevarla** — Shopify solo la
acepta en `sections/` y `blocks/`. Ninguno se agrega desde el editor de temas:
son piezas que las secciones usan por dentro.

### `sections/` — 12 archivos

Se agregan desde el editor de temas. En el buscador de secciones aparecen todas
como **`SH · …`**.

| Archivo | Aparece como | Para qué |
| --- | --- | --- |
| `sh-hero.liquid` | SH · Hero | La primera pantalla, con la promesa y el botón |
| `sh-collection-tiles.liquid` | SH · Categorías | Navegación por categoría |
| `sh-featured-products.liquid` | SH · Productos | Grilla de productos con botón de compra |
| `sh-squish-toy.liquid` | SH · Squishy interactivo | El de mantequilla, se aprieta de verdad |
| `sh-tamano.liquid` | SH · Tamaño real | «¿Qué tan grande es?» |
| `sh-textura.liquid` | SH · Elige por textura | Entrada al catálogo por sensación |
| `sh-story.liquid` | SH · Historia | Por qué confiar |
| `sh-trust-row.liquid` | SH · Confianza | Envío, pago, ayuda, fotos reales |
| `sh-faq.liquid` | SH · Preguntas frecuentes | Acordeones |
| `sh-newsletter.liquid` | SH · Newsletter | Captura de correo |
| `sh-policies.liquid` | SH · Envíos y cambios | Las cuatro políticas |
| `sh-brillos.liquid` | SH · Brillos al clic | No dibuja nada: enciende las estrellitas |

### `blocks/` — 4 archivos

**No son secciones.** Se agregan *dentro* de la sección de producto de Horizon.
Ver el paso 4.

| Archivo | Aparece como |
| --- | --- |
| `sh-subtitulo.liquid` | SH · Nombre y subtítulo |
| `sh-beneficios.liquid` | SH · Beneficios |
| `sh-confianza.liquid` | SH · Confianza (producto) |
| `sh-ficha.liquid` | SH · Ficha de producto |

### `templates/` — 2 archivos

| Archivo | Qué es |
| --- | --- |
| `index.squishy-heaven.json` | La home ya armada, en orden |
| `page.envios-y-cambios.json` | La página de envíos ya armada |

### Lo que **no** se sube al tema

Estas carpetas y archivos son para ti, no para Shopify. Si los subes, no rompen
nada, pero ensucian el tema:

```
README.md                 explicación general del paquete
INSTALAR.md               este archivo
docs/                     metafields, contenido y solución de problemas
preview/                  la previsualización visual, se abre con doble clic
```

### Atajo si usas Shopify CLI

```bash
shopify theme push --only assets,snippets,sections,blocks,templates
```

Sube exactamente las cinco carpetas correctas y se salta `docs/` y `preview/`
por sí solo.

---

## Paso 2 · Los metafields

Admin → **Configuración** → **Metafields y metaobjetos** → **Productos**.

Crea las definiciones de [`docs/metafields-y-contenido.md`](docs/metafields-y-contenido.md).
Todas van bajo el namespace `squishy`.

Sin esto **todo funciona igual**, pero las tarjetas siguen mostrando el título
largo recortado en vez del nombre corto de marca. Es el paso que más cambia
cómo se ve la tienda, y el que más se olvida.

---

## Paso 3 · La home

Editor de temas → arriba, en el selector de plantilla, elige **`squishy-heaven`**.

Viene armada en este orden: hero → categorías → favoritos → squishy interactivo
→ tamaño real → texturas → historia → confianza → preguntas → newsletter.

Si prefieres armarla a mano, agrega las secciones `SH · …` en el orden que
quieras: ninguna depende de otra.

---

## Paso 4 · La ficha de producto

Editor de temas → menú de plantilla → **Producto**.

En la sección **`product-information`** de Horizon, dentro de la columna de
información, la columna debe quedar así de arriba abajo. Los cuatro bloques
`SH · …` se intercalan con los que ya trae el tema:

| Orden | Bloque |
| --- | --- |
| 1 | `SH · Nombre y subtítulo` |
| 2 | `SH · Beneficios` |
| 3 | *precio y selector de variantes — de Horizon, ya está* |
| 4 | *botón de compra — de Horizon, ya está* |
| 5 | `SH · Confianza (producto)` — justo debajo del botón |
| 6 | `SH · Ficha de producto` |

Si activas «Mostrar nombre corto como título» en el primer bloque, **oculta el
título nativo del tema** o el nombre saldrá dos veces.

---

## Paso 5 · La página de envíos

1. Admin → **Contenido** → **Páginas** → **Agregar página**.
2. Ponle título (por ejemplo «Envíos y cambios»).
3. Abajo a la derecha, en **Plantilla de tema**, elige `page.envios-y-cambios`.
4. **Reemplaza cada plazo por el real de tu operación** antes de publicarla. Los
   que trae son de ejemplo.

---

## Paso 6 · Los brillos en toda la tienda

La sección `SH · Brillos al clic` enciende el efecto **solo en la página donde
esté**. Para que funcione en toda la tienda, agrégala **una sola vez al grupo
del pie de página** en el editor de temas.

La plantilla de la home ya la trae. Si la dejas solo ahí, solo brilla la home.

---

## Paso 7 · Antes de publicar

- [ ] Recorre la copia del tema en el teléfono, no solo en el ordenador.
- [ ] Aprieta el squishy con el dedo y comprueba que suena.
- [ ] Los plazos de envío son los reales, no los de ejemplo.
- [ ] El vendor de los productos dice `Squishy Heaven`, no `My Store 4`.
- [ ] La calificación del hero sigue apagada si todavía no hay reseñas reales.
- [ ] Ninguna página tiene dos H1 (revisa «Etiqueta del titular» en el hero).

Cuando esté, **Temas** → en la copia, **Publicar**.

---

## Cómo deshacerlo

Todos los archivos empiezan por `sh-` y ninguno del tema fue modificado. Para
quitarlo todo, borra los archivos `sh-*` y las dos plantillas. Y si trabajaste
sobre la copia como dice el paso 0, basta con volver a publicar el tema
original.
