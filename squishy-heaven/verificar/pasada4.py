# Pasada 4 — comportamiento real en Chromium.
from playwright.sync_api import sync_playwright
import pathlib

URL = pathlib.Path('/home/user/Claude-code/squishy-heaven/preview/squishy-heaven-preview.html').as_uri()
CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
fallos = []
def check(cond, msg):
    if not cond:
        fallos.append(msg)
        print('  FALLO ' + msg)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])

    # --- a) las tres páginas, los cuatro anchos: sin desborde ni errores ---
    pg = b.new_page(viewport={'width': 1500, 'height': 1000})
    errs = []
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' else None)
    pg.goto(URL); pg.wait_for_timeout(900)

    for pagina in ['home', 'producto', 'envios']:
        pg.click(f'[data-page="{pagina}"]'); pg.wait_for_timeout(350)
        for w in [1180, 900, 414, 360]:
            pg.evaluate(f"document.querySelector('.stage__frame').style.maxWidth='{w}px'")
            pg.wait_for_timeout(280)
            desborde = pg.evaluate("""() => {
              const vp = document.getElementById('viewport'); const v = vp.getBoundingClientRect();
              const mal = [];
              vp.querySelectorAll('*').forEach(el => {
                const r = el.getBoundingClientRect();
                if (r.width > 0 && (r.right > v.right + 1.5 || r.left < v.left - 1.5)
                    && !el.closest('[data-mobile="scroll"]')) mal.push(el.className.toString().split(' ')[0]);
              });
              return [...new Set(mal)];
            }""")
            check(desborde == [], f'{pagina} a {w}px: desborde horizontal en {desborde}')
    pg.evaluate("document.querySelector('.stage__frame').style.maxWidth='1180px'")
    pg.click('[data-page="home"]'); pg.wait_for_timeout(400)

    # --- b) objetivos táctiles: nada interactivo por debajo de 44px ---
    pg.evaluate("document.querySelector('.stage__frame').style.maxWidth='414px'")
    pg.wait_for_timeout(400)
    pequenos = pg.evaluate("""() => {
      const mal = [];
      document.querySelectorAll('#viewport a.sh-btn, #viewport button, #viewport .sh-chip, #viewport summary').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.height > 0 && r.height < 44) mal.push((el.className||'').toString().split(' ')[0] + ':' + Math.round(r.height));
      });
      return [...new Set(mal)];
    }""")
    check(pequenos == [], f'objetivos táctiles por debajo de 44px: {pequenos}')
    pg.evaluate("document.querySelector('.stage__frame').style.maxWidth='1180px'")
    pg.wait_for_timeout(300)

    # --- c) el squishy responde al puntero y al teclado ---
    boton = pg.locator('[data-sh-squish-boton]').first
    boton.scroll_into_view_if_needed(); pg.wait_for_timeout(300)
    caja = boton.bounding_box()
    check(caja['height'] > 100, f"el botón del squishy mide {caja['height']}px de alto")

    pg.mouse.move(caja['x'] + caja['width'] / 2, caja['y'] + caja['height'] * 0.12)
    pg.mouse.down(); pg.wait_for_timeout(140)
    arriba = pg.evaluate("(e=>[e.style.getPropertyValue('--sx'),e.style.getPropertyValue('--sy')])(document.querySelector('[data-sh-squish-cuerpo]'))")
    check(float(arriba[0]) > 1 and float(arriba[1]) < 1, f'presión arriba no achata a lo alto: {arriba}')
    pg.mouse.up(); pg.wait_for_timeout(1100)

    pg.mouse.move(caja['x'] + caja['width'] * 0.05, caja['y'] + caja['height'] / 2)
    pg.mouse.down(); pg.wait_for_timeout(140)
    lado = pg.evaluate("(e=>[e.style.getPropertyValue('--sx'),e.style.getPropertyValue('--sy')])(document.querySelector('[data-sh-squish-cuerpo]'))")
    check(float(lado[0]) < 1 and float(lado[1]) > 1, f'presión de lado no achata a lo ancho: {lado}')
    pg.mouse.up(); pg.wait_for_timeout(1100)

    check(pg.evaluate("getComputedStyle(document.querySelector('.sh-squish__toy')).transitionDuration") == '0.42s',
          'el squishy vuelve sin transición')

    boton.focus(); pg.keyboard.down(' '); pg.wait_for_timeout(140)
    check(pg.get_attribute('[data-sh-squish]', 'data-sh-estado') == 'apretado', 'no responde a la barra espaciadora')
    pg.keyboard.up(' '); pg.wait_for_timeout(300)

    # --- d) el contador cuenta y el mute persiste ---
    texto = pg.inner_text('[data-sh-squish-cuenta]')
    check('vez' in texto or 'veces' in texto, f'contador raro: {texto!r}')
    check(' 1 veces' not in texto, f'contador con plural mal: {texto!r}')
    pg.click('[data-sh-squish-mute]'); pg.wait_for_timeout(200)
    check(pg.get_attribute('[data-sh-squish-mute]', 'data-off') == '1', 'el botón de silencio no cambia de estado')
    check(pg.evaluate("localStorage.getItem('sh-sonido')") == 'off', 'el silencio no se guarda')
    pg.click('[data-sh-squish-mute]'); pg.wait_for_timeout(200)

    # --- e) brillos ---
    pg.mouse.click(700, 700); pg.wait_for_timeout(60)
    check(pg.evaluate("document.querySelectorAll('.sh-fx__p').length") > 0, 'el clic no genera brillos')
    pg.wait_for_timeout(1400)
    check(pg.evaluate("document.querySelectorAll('.sh-fx__p').length") == 0, 'las partículas no se limpian solas')

    # las partículas no deben salir al escribir en un campo
    campo = pg.locator('#viewport input[type="email"]').first
    if campo.count():
        campo.scroll_into_view_if_needed(); pg.wait_for_timeout(250)
        campo.click(); pg.wait_for_timeout(80)
        check(pg.evaluate("document.querySelectorAll('.sh-fx__p').length") == 0,
              'salen brillos al hacer clic en un campo de texto')

    # --- f) reseñas: estrellas del color correcto ---
    pg.locator('.sh-rev').first.scroll_into_view_if_needed(); pg.wait_for_timeout(300)
    llena = pg.evaluate("getComputedStyle(document.querySelector('.sh-rev .sh-rating__stars svg')).fill")
    vacia = pg.evaluate("getComputedStyle(document.querySelector('.sh-rating__vacia svg')).fill")
    check(llena == 'rgb(245, 201, 92)', f'estrella llena en {llena}')
    check(vacia == 'rgb(201, 191, 208)', f'estrella vacía en {vacia}')
    check(llena != vacia, 'la estrella vacía no se distingue de la llena')

    check(errs == [], f'errores de consola: {errs}')
    pg.close()

    # --- g) movimiento reducido: nada se mueve, todo sigue funcionando ---
    ctx = b.new_context(viewport={'width': 1400, 'height': 1000}, reduced_motion='reduce')
    pg2 = ctx.new_page()
    errs2 = []
    pg2.on('pageerror', lambda e: errs2.append(str(e)))
    pg2.goto(URL); pg2.wait_for_timeout(700)
    bo = pg2.locator('[data-sh-squish-boton]').first
    bo.scroll_into_view_if_needed(); pg2.wait_for_timeout(250)
    c2 = bo.bounding_box()
    pg2.mouse.move(c2['x'] + c2['width'] / 2, c2['y'] + c2['height'] * 0.15)
    pg2.mouse.down(); pg2.wait_for_timeout(200)
    check(pg2.evaluate("document.querySelector('[data-sh-squish-cuerpo]').style.getPropertyValue('--sx')") == '1.000',
          'con movimiento reducido el squishy se sigue deformando')
    check(pg2.evaluate("!document.querySelector('.sh-fx')"), 'con movimiento reducido se crea la capa de brillos')
    check(pg2.get_attribute('[data-sh-squish]', 'data-sh-estado') == 'apretado',
          'con movimiento reducido deja de responder')
    pg2.mouse.up(); pg2.wait_for_timeout(200)
    check(errs2 == [], f'errores con movimiento reducido: {errs2}')
    b.close()

print('Pasada 4 · comportamiento en navegador: sin fallos' if not fallos else f'Pasada 4: {len(fallos)} fallos')
