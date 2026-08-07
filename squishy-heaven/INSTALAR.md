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

### `snippets/` — 4 archivos

| Archivo | Qué es |
| --- | --- |
| `sh-icon.liquid` | Los iconos, dibujados en el propio HTML |
| `sh-product-card.liquid` | La tarjeta de producto con el nombre corto |
| `sh-section-attrs.liquid` | Traduce los controles de diseño del editor a la sección |
| `sh-destino.liquid` | Convierte un destino del editor en una URL real, y en nada si ese destino no existe |

Estos cuatro **no llevan `{% schema %}` y no deben llevarla** — Shopify solo la
acepta en `sections/` y `blocks/`. Ninguno se agrega desde el editor de temas:
son piezas que las secciones usan por dentro.

### `sections/` — 16 archivos

Se agregan desde el editor de temas. En el buscador de secciones aparecen todas
como **`SH · …`**.

| Archivo | Aparece como | Para qué |
| --- | --- | --- |
| `sh-hero.liquid` | SH · Hero | La primera pantalla, con la promesa y el botón |
| `sh-collection-tiles.liquid` | SH · Categorías | Navegación por categoría |
| `sh-featured-products.liquid` | SH · Productos | Grilla de productos con botón de compra |
| `sh-squish-toy.liquid` | SH · Squishy interactivo | El de mantequilla, se aprieta de verdad |
| `sh-tamano.liquid` | SH · Tamaño real | «¿Qué tan grande es?» |
| `sh-resenas.liquid` | SH · Reseñas con foto | Reseñas con la foto real del cliente |
| `sh-textura.liquid` | SH · Elige por textura | Entrada al catálogo por sensación |
| `sh-story.liquid` | SH · Historia | Por qué confiar |
| `sh-trust-row.liquid` | SH · Confianza | Envío, pago, ayuda, fotos reales |
| `sh-faq.liquid` | SH · Preguntas frecuentes | Acordeones |
| `sh-newsletter.liquid` | SH · Newsletter | Captura de correo |
| `sh-policies.liquid` | SH · Envíos y cambios | Las cuatro políticas |
| `sh-brillos.liquid` | SH · Brillos al clic | No dibuja nada: enciende las estrellitas |
| `sh-contacto.liquid` | SH · Contacto | Formulario real, accesos rápidos y respuestas |
| `sh-marquesina.liquid` | SH · Marquesina | Cinta de texto en movimiento, con pausa |
| `sh-pie.liquid` | SH · Pie de página | Footer que nunca deja un enlace muerto |

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
verificar/                los scripts que comprueban el paquete
preview/                  la previsualización visual, se abre con doble clic
```

### Atajo si usas Shopify CLI

```bash
shopify theme push --only assets,snippets,sections,blocks,templates
```

Sube exactamente las cinco carpetas correctas y se salta `docs/`, `verificar/`
y `preview/` por sí solo.

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
→ tamaño real → texturas → historia → reseñas → confianza → preguntas → newsletter.

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

## Paso 7 · Conseguir las reseñas con foto

`SH · Reseñas con foto` **muestra** las reseñas; no las recoge. Eso es lo que
cobra una app como Loox. El circuito a mano cuesta cinco minutos por reseña y no
cuesta dinero:

1. **Pide.** Entre 7 y 10 días después de marcar el pedido como entregado,
   escribe al cliente. Un correo corto y concreto funciona mejor que una
   plantilla:

   > Hola [nombre], ¿te llegó bien tu squishy? Si te animas a mandarnos una foto
   > y contarnos qué tal, la publicamos en la tienda con tu nombre. Con
   > responder a este correo basta.

2. **Guarda el permiso.** No publiques una foto sin que te la hayan mandado a
   ti. Deja el correo archivado: es tu respaldo si alguien pregunta.
3. **Sube la foto** a Shopify (Contenido → Archivos) y agrega un bloque
   «Reseña» en la sección.
4. **Copia el texto tal cual.** Sin corregirle el estilo. Una reseña demasiado
   bien escrita se lee como publicidad.
5. **Pon solo el nombre y la inicial del apellido.** «Camila R.» basta y protege
   sus datos.
6. **«Compra verificada» solo si la verificaste.** Busca el pedido en tu panel.
   Es una afirmación sobre tu tienda, no un adorno.

El promedio y el total se calculan solos con lo que publiques. No hay ningún
campo donde escribirlos, a propósito.

> Cuándo sí vale pagar una app: cuando tengas volumen suficiente para que pedir
> reseñas a mano se te coma la semana. Hasta entonces esto hace el mismo trabajo
> de cara al cliente.

---

## Paso 8 · Antes de publicar

- [ ] Recorre la copia del tema en el teléfono, no solo en el ordenador.
- [ ] Aprieta el squishy con el dedo y comprueba que suena.
- [ ] Los plazos de envío son los reales, no los de ejemplo.
- [ ] El vendor de los productos dice `Squishy Heaven`, no `My Store 4`.
- [ ] La calificación del hero sigue apagada si todavía no hay reseñas reales.
- [ ] Todas las reseñas publicadas son reales y tienes el permiso de cada
      persona. El promedio sigue apagado si aún son pocas.
- [ ] Ninguna página tiene dos H1 (revisa «Etiqueta del titular» en el hero).

Cuando esté, **Temas** → en la copia, **Publicar**.

---

## Cómo deshacerlo

Todos los archivos empiezan por `sh-` y ninguno del tema fue modificado. Para
quitarlo todo, borra los archivos `sh-*` y las dos plantillas. Y si trabajaste
sobre la copia como dice el paso 0, basta con volver a publicar el tema
original.
