# Si algo falla

Ordenado por lo que ves, no por lo que lo causa. Busca tu síntoma.

---

## Al subir los archivos

### «Falta la etiqueta schema» / «Missing schema»

**Dos causas, siempre.**

1. **El archivo está en la carpeta equivocada.** Un snippet subido a `sections/`
   da ese error exacto, porque Shopify espera schema en toda sección. Los tres
   snippets (`sh-icon`, `sh-product-card`, `sh-section-attrs`) van en
   `snippets/` y **no deben llevar schema**: Shopify solo la acepta en
   `sections/` y `blocks/`.
2. **El pegado se cortó.** La `{% schema %}` es lo último de cada archivo de
   sección. Si copias y pegas a mano y se pierde el final, el archivo queda sin
   ella. Abre el archivo en el editor de Shopify, baja del todo y comprueba que
   termina en `{% endschema %}`. Si no, vuelve a subirlo entero o usa
   `shopify theme push`.

### «Unknown tag 'doc'» o similar al abrir un snippet

Tu tema es de una versión anterior a la que soporta `{% doc %}`. No rompe nada
—es documentación, no código— pero si el aviso te molesta, borra el bloque
`{% doc %} … {% enddoc %}` del principio del snippet. El resto funciona igual.

### La carpeta `blocks/` no existe en mi tema

Entonces no es Horizon, o es una versión anterior a los bloques de tema. Las
12 secciones funcionan igual, pero los 4 bloques de la ficha de producto no se
pueden usar. Actualiza a Horizon o pon ese contenido con las secciones.

---

## En el editor de temas

### Las secciones `SH · …` no aparecen al «Agregar sección»

- Escribe `SH` en el buscador del panel de secciones: aparecen todas juntas.
- Si no sale ninguna, los archivos no llegaron a `sections/`. Revisa la carpeta
  en **Editar código**.
- Recarga el editor de temas con `Ctrl/Cmd + Shift + R`. El editor cachea la
  lista de secciones y a veces no se entera de un archivo recién subido.

### Los bloques `SH · …` no aparecen en la ficha de producto

No son secciones: **no salen en «Agregar sección»**. Se agregan dentro de la
sección `product-information` de Horizon, en la columna de información, con el
botón de agregar bloque. Ver el paso 4 de `INSTALAR.md`.

### La plantilla `squishy-heaven` no aparece en el selector

`templates/index.squishy-heaven.json` no está en `templates/`. Comprueba también
que el nombre es exacto, con el punto en medio: `index.squishy-heaven.json`.

### La página de envíos sale vacía

Subir la plantilla no crea la página. Hay que crearla en Admin → **Contenido**
→ **Páginas** y, en «Plantilla de tema», elegir `page.envios-y-cambios`.

---

## Cómo se ve la tienda

### Todo sale como texto plano, sin colores ni formas

`sh-squishy.css` no llegó a `assets/`, o se subió con otro nombre. El nombre
debe ser exactamente `sh-squishy.css`.

### Los titulares salen con otra tipografía

Faltan los `.woff2` en `assets/`, o se renombraron. El CSS los pide por nombre
exacto: `sh-fredoka.woff2` y `sh-quicksand.woff2`. Si el nombre no coincide, el
navegador cae a la tipografía de respaldo sin avisar de nada.

### Sale código o etiquetas `<img …>` como texto visible en la página

Algo se editó en una línea de `image_tag`. En Liquid, un filtro después de
`image_tag` se aplica **a la etiqueta entera**, no al argumento. Si necesitas
tocar el `alt`, asígnalo antes:

```liquid
{%- assign sh_alt = imagen.alt | default: 'texto' -%}
{{ imagen | image_url: width: 600 | image_tag: alt: sh_alt }}
```

Nunca `image_tag: alt: algo | escape`.

### Los colores no cambian al tocar los esquemas de color de Horizon

Es a propósito. El design system de la marca fija campos pastel planos y prohíbe
base oscura y gradientes, así que las secciones no leen los esquemas del tema.
Usa el ajuste **«Fondo de la sección»**, al final de los ajustes de cada una.

### Los nombres de producto siguen siendo largos y en inglés

Faltan los metafields. Sin `squishy.nombre`, la tarjeta recorta el título real a
cinco palabras — que es mejor que nada, pero no es el nombre de marca. Ver
`docs/metafields-y-contenido.md`.

### El nombre del producto sale dos veces en la ficha

Activaste «Mostrar nombre corto como título» en el bloque `SH · Nombre y
subtítulo` pero no ocultaste el título nativo de Horizon. Apaga uno de los dos.

### Falta la cuarta señal de confianza en el hero

Las etiquetas se separan con **barra vertical `|`**, no con coma. Es así justo
porque una de ellas («Si llega dañado, te ayudamos») lleva coma dentro.

### Una tarjeta dice «Elegir opciones» en vez de «Agregar»

Es a propósito: ese producto tiene variantes. Agregar la primera al carrito le
metería al cliente un color o un tamaño que no eligió, así que la tarjeta lo
lleva a la ficha. Los productos de una sola variante sí se agregan directo.

### El precio tachado no aparece aunque el producto está en oferta

Falta el **precio de comparación** en las variantes del producto (Admin →
Productos → precio → «Comparar con el precio»). El descuento se calcula desde
ahí, no desde una etiqueta.

### El carrusel deslizable no se desliza

Solo aplica en móvil (pantallas de 749 px o menos). En el ordenador la
cuadrícula se ve completa a propósito. Prueba en el teléfono o estrecha mucho la
ventana.

---

## El squishy interactivo

### No se deforma al apretarlo

- **Lo más probable: `sh-interactivo.js` no llegó a `assets/`**, o se renombró.
  Sin él, la sección se ve igual pero queda quieta — está hecho así para que
  nunca salga rota.
- **Si tienes «Reducir movimiento» activado en tu sistema**, no se deforma a
  propósito. El contador y el botón siguen funcionando. Se apaga en Ajustes →
  Accesibilidad (iOS/macOS) o Configuración → Accesibilidad → Efectos visuales
  (Android/Windows).

### No suena

Por orden de probabilidad:

1. **Está silenciado.** El botón bajo el juguete guarda la elección en el
   navegador. Púlsalo para volver a activarlo.
2. **El teléfono está en silencio.** iOS respeta el interruptor físico también
   para el audio de las páginas web.
3. **El ajuste está apagado** en el editor: sección → «Sonido al apretar».
4. El navegador no soporta Web Audio. Muy raro; en ese caso todo lo demás sigue
   funcionando.

No hay ningún archivo de audio que pueda faltar: el sonido se genera en el
propio navegador.

### Suena la primera vez pero no las siguientes / suena raro

Aprieta más despacio. Cada apretón dispara sonido al bajar y al soltar; si
haces muchos clics muy seguidos, los sonidos se solapan. Es el mismo
comportamiento de un squishy real apretado a toda velocidad.

### El contador se reinició

Se guarda en el navegador de cada visitante, no en tu tienda. Se borra al
limpiar datos del navegador y no existe en modo incógnito. Es a propósito: no
sale de su equipo y no se envía a ninguna parte.

### El juguete se sale de su recuadro

No debería: el ancho deja margen para el ensanchamiento del apretón. Si subiste
una **imagen propia** muy grande, recórtala a un cuadrado o a 5:3.4 con fondo
transparente. El panel recorta lo que se salga, así que la página nunca se
descuadra, pero la imagen se verá cortada.

### En el móvil hace zoom al tocarlo dos veces

No debería — el botón lleva `touch-action: manipulation` justo para eso. Si te
pasa, es que el archivo CSS no se subió o es una versión anterior.

---

## Los brillos al hacer clic

### No sale ninguna estrellita

1. **Falta agregar la sección `SH · Brillos al clic`.** No dibuja nada visible,
   así que es fácil pensar que ya está puesta cuando no lo está. En el editor,
   con la sección seleccionada, verás un aviso que solo aparece en el editor.
2. **Solo la pusiste en la home.** Enciende el efecto únicamente en la página
   donde está. Para toda la tienda, agrégala al **grupo del pie de página**.
3. **Tienes «Reducir movimiento» activado.** No salen a propósito.

### No salen al tocar en el teléfono

Ajuste de la sección: «También al tocar en el teléfono». Compruébalo.

### No salen al escribir en el formulario de correo

A propósito. Escribir o seleccionar texto no dispara el efecto.

---

## Después de publicar

### Cambié algo y no se ve en la tienda

- Comprueba que editaste **el tema publicado** y no la copia (o al revés).
- Los archivos de `assets/` los sirve el CDN de Shopify. Fuerza recarga con
  `Ctrl/Cmd + Shift + R`. Si sigue igual, espera un par de minutos.

### La página tarda en cargar

Lo que más pesa en una tienda de este tipo son las fotos. Este paquete no añade
librerías ni peticiones a terceros —el CSS son 8,5 KB comprimidos y el JS 4,5
KB—, así que si notas lentitud:

- Sube las fotos a un ancho razonable. Shopify genera los tamaños solo, pero
  parte del original: un JPG de 6000 px de ancho no ayuda a nadie.
- Revisa qué apps tienes instaladas. Cada app añade su propio JavaScript al
  storefront, y ahí sí se acumulan los megabytes.

### Actualicé Horizon y quiero saber si se rompió algo

No debería: ningún archivo del tema fue modificado, todo el CSS lleva el prefijo
`.sh-` y las secciones son autónomas. Aun así, después de cada actualización
revisa la ficha de producto: es lo único que depende de una sección de Horizon
(`product-information`) y de que los bloques sigan donde los pusiste.

---

## Nada de esto lo arregla

Guarda a mano lo que trae el archivo (los textos están en los ajustes de cada
sección, no en el código) y vuelve a publicar el tema original. Como todo el
trabajo se hizo sobre una copia, la tienda vuelve al estado anterior en un clic.
