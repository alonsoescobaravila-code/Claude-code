/* ============================================================
   Squishy Heaven — interacciones
   Dos cosas, un solo archivo (una sola petición):
     1. El squishy que se aprieta de verdad, con sonido y rebote.
     2. Los brillos que salen al hacer clic en cualquier parte.

   Reglas que respeta:
   - Nada se mueve si el visitante pidió menos movimiento.
   - El audio nace del primer gesto real, nunca antes: así ningún
     navegador lo bloquea y nadie escucha algo que no provocó.
   - Solo anima transform y opacity, que van en la GPU y no
     obligan al navegador a recalcular el layout.
   ============================================================ */
(function () {
  'use strict';

  /* Cada sección enlaza este archivo para funcionar suelta. El navegador
     descarga uno solo, pero sí ejecuta cada etiqueta: este candado evita
     que se dupliquen las capas y los escuchadores. */
  if (window.__shFx) return;
  window.__shFx = true;

  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  function quieto() { return reduceMQ.matches; }

  function guardar(clave, valor) {
    try { localStorage.setItem(clave, valor); } catch (e) { /* modo privado */ }
  }
  function leer(clave) {
    try { return localStorage.getItem(clave); } catch (e) { return null; }
  }

  /* ============================================================
     Sonido — sintetizado, sin archivos de audio

     Un mp3 de squish son 30-60 KB y una petición más. Aquí el sonido
     se arma con dos capas: ruido filtrado que barre en frecuencia (el
     aire saliendo del material) y un seno que dobla el tono (el cuerpo
     que cede). Cada apretón cambia de tono un poco para que la décima
     vez no suene idéntica a la primera.
     ============================================================ */
  var actx = null;
  var ruido = null;
  var master = null;

  function audio() {
    if (actx) return actx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    actx = new AC();
    master = actx.createGain();
    master.gain.value = 0.9;
    master.connect(actx.destination);

    // Un buffer de ruido blanco reutilizado por todos los apretones.
    var largo = Math.floor(actx.sampleRate * 0.3);
    ruido = actx.createBuffer(1, largo, actx.sampleRate);
    var datos = ruido.getChannelData(0);
    for (var i = 0; i < largo; i++) datos[i] = Math.random() * 2 - 1;
    return actx;
  }

  function sonarSquish(soltando) {
    var ctx = audio();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    var t = ctx.currentTime;
    var tono = 0.85 + Math.random() * 0.3;

    // Capa 1 · aire. Al apretar el barrido baja; al soltar sube.
    var fuente = ctx.createBufferSource();
    fuente.buffer = ruido;
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    var ga = ctx.createGain();
    bp.frequency.setValueAtTime((soltando ? 700 : 1500) * tono, t);
    bp.frequency.exponentialRampToValueAtTime((soltando ? 1900 : 430) * tono, t + 0.16);
    ga.gain.setValueAtTime(0.0001, t);
    ga.gain.exponentialRampToValueAtTime(soltando ? 0.05 : 0.09, t + 0.012);
    ga.gain.exponentialRampToValueAtTime(0.0001, t + 0.19);
    fuente.connect(bp);
    bp.connect(ga);
    ga.connect(master);
    fuente.start(t);
    fuente.stop(t + 0.21);

    // Capa 2 · cuerpo.
    var osc = ctx.createOscillator();
    osc.type = 'sine';
    var go = ctx.createGain();
    osc.frequency.setValueAtTime((soltando ? 95 : 195) * tono, t);
    osc.frequency.exponentialRampToValueAtTime((soltando ? 215 : 92) * tono, t + 0.14);
    go.gain.setValueAtTime(0.0001, t);
    go.gain.exponentialRampToValueAtTime(0.06, t + 0.015);
    go.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(go);
    go.connect(master);
    osc.start(t);
    osc.stop(t + 0.24);
  }

  /* ============================================================
     Brillos
     ============================================================ */
  var capa = null;
  var ultimoBrillo = 0;
  var TOPE = 80; // partículas vivas a la vez

  var paleta = ['#ff9ec4', '#b98cff', '#7fe0c2', '#8ecbff', '#ffe08a', '#ffc9a3'];

  function capaFx() {
    if (capa && capa.isConnected) return capa;
    capa = document.createElement('div');
    capa.className = 'sh-fx';
    capa.setAttribute('aria-hidden', 'true');
    document.body.appendChild(capa);
    return capa;
  }

  /* x e y son coordenadas de viewport: la capa es fixed, así que no hace
     falta leer scroll ni medir nada durante el clic. */
  function brillar(x, y, cantidad) {
    if (quieto()) return;
    var ahora = Date.now();
    if (ahora - ultimoBrillo < 55) return;
    ultimoBrillo = ahora;

    var lienzo = capaFx();
    if (lienzo.childElementCount > TOPE) return;

    for (var i = 0; i < cantidad; i++) {
      var p = document.createElement('span');
      p.className = 'sh-fx__p' + (Math.random() < 0.45 ? ' sh-fx__p--destello' : '');
      var ang = Math.random() * Math.PI * 2;
      var dist = 24 + Math.random() * 48;
      var st = p.style;
      st.setProperty('--x', x + 'px');
      st.setProperty('--y', y + 'px');
      st.setProperty('--dx', (Math.cos(ang) * dist).toFixed(1) + 'px');
      st.setProperty('--dy', (Math.sin(ang) * dist - 16).toFixed(1) + 'px');
      st.setProperty('--r', ((Math.random() * 240 - 120) | 0) + 'deg');
      st.setProperty('--sz', (7 + Math.random() * 9).toFixed(1) + 'px');
      st.setProperty('--d', ((440 + Math.random() * 320) | 0) + 'ms');
      st.background = paleta[(Math.random() * paleta.length) | 0];
      p.addEventListener('animationend', quitar);
      lienzo.appendChild(p);
    }
  }
  function quitar() { if (this.parentNode) this.parentNode.removeChild(this); }

  /* Un solo escuchador en el documento para toda la página. */
  var brillosListos = false;
  function activarBrillos(config) {
    if (brillosListos) return;
    brillosListos = true;

    document.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch' && !config.movil) return;
      // Escribir o seleccionar texto no debería lanzar confeti.
      var t = e.target;
      if (t && t.closest && t.closest('input, textarea, select, [contenteditable="true"]')) return;
      brillar(e.clientX, e.clientY, config.cantidad);
    }, { passive: true });
  }

  /* ============================================================
     El squishy
     ============================================================ */
  function montarSquish(raiz) {
    if (raiz.dataset.shListo === '1') return;
    raiz.dataset.shListo = '1';

    var boton = raiz.querySelector('[data-sh-squish-boton]');
    var cuerpo = raiz.querySelector('[data-sh-squish-cuerpo]');
    var dedo = raiz.querySelector('[data-sh-squish-dedo]');
    var marcador = raiz.querySelector('[data-sh-squish-cuenta]');
    var pista = raiz.querySelector('[data-sh-squish-pista]');
    var mute = raiz.querySelector('[data-sh-squish-mute]');
    if (!boton || !cuerpo) return;

    var conSonido = raiz.dataset.shSonido === '1';
    var conBrillos = raiz.dataset.shBrillos === '1';
    var lento = raiz.dataset.shRebote === 'slow';
    var plantilla = raiz.dataset.shCuentaTexto || '';
    var plantillaUna = raiz.dataset.shCuentaUna || '';
    var premio = raiz.dataset.shPremio || '';
    var metaPremio = parseInt(raiz.dataset.shPremioEn, 10) || 0;

    var silenciado = leer('sh-sonido') === 'off';
    var apretado = false;
    var cuenta = parseInt(leer('sh-squish-cuenta'), 10) || 0;

    pintarCuenta();
    pintarMute();

    function pintarCuenta() {
      if (!marcador) return;
      if (cuenta < 1) { marcador.hidden = true; return; }
      marcador.hidden = false;
      // «1 veces» delata que el texto lo escribió una máquina.
      var texto = (cuenta === 1 && plantillaUna) ? plantillaUna : plantilla;
      // Si el merchant no puso el hueco, se respeta su texto tal cual en vez
      // de pegarle un número al final.
      marcador.textContent = texto.replace('[veces]', cuenta);
    }

    function pintarMute() {
      if (!mute) return;
      mute.setAttribute('aria-pressed', silenciado ? 'true' : 'false');
      mute.dataset.off = silenciado ? '1' : '0';
    }

    if (mute) {
      mute.addEventListener('click', function (e) {
        e.stopPropagation();
        silenciado = !silenciado;
        guardar('sh-sonido', silenciado ? 'off' : 'on');
        pintarMute();
        if (!silenciado) sonarSquish(false);
      });
    }

    /* La deformación sigue al dedo: si aprietas arriba se aplasta a lo
       alto, si aprietas de lado se aplasta a lo ancho. Es la diferencia
       entre "una animación" y "se siente como el objeto real". */
    function apretar(x, y) {
      if (apretado) return;
      apretado = true;

      var sx = 1, sy = 1, gx = 0, gy = 0, giro = 0;

      if (!quieto()) {
        var r = boton.getBoundingClientRect(); // una sola lectura por gesto
        var cx = r.left + r.width / 2;
        var cy = r.top + r.height / 2;
        var dx = r.width ? (x - cx) / (r.width / 2) : 0;
        var dy = r.height ? (y - cy) / (r.height / 2) : 0;
        dx = Math.max(-1, Math.min(1, dx));
        dy = Math.max(-1, Math.min(1, dy));

        var ax = Math.abs(dx), ay = Math.abs(dy);
        var vertical = ay / (ax + ay + 0.0001); // 1 = presión de arriba
        var fuerza = 0.26;

        sy = 1 - fuerza * vertical + fuerza * (1 - vertical) * 0.9;
        sx = 1 + fuerza * vertical * 0.9 - fuerza * (1 - vertical);
        gx = dx * 6;
        gy = dy * 6;
        giro = dx * -2.5;

        if (dedo) {
          dedo.style.setProperty('--px', ((x - r.left) / (r.width || 1) * 100).toFixed(1) + '%');
          dedo.style.setProperty('--py', ((y - r.top) / (r.height || 1) * 100).toFixed(1) + '%');
        }
      }

      cuerpo.style.setProperty('--sx', sx.toFixed(3));
      cuerpo.style.setProperty('--sy', sy.toFixed(3));
      cuerpo.style.setProperty('--gx', gx.toFixed(1) + 'px');
      cuerpo.style.setProperty('--gy', gy.toFixed(1) + 'px');
      cuerpo.style.setProperty('--giro', giro.toFixed(2) + 'deg');
      raiz.dataset.shEstado = 'apretado';

      if (conSonido && !silenciado) sonarSquish(false);
      if (navigator.vibrate && !quieto()) { try { navigator.vibrate(11); } catch (e) {} }
      if (conBrillos) brillar(x, y, 7);

      if (pista) pista.hidden = true;
      cuenta++;
      guardar('sh-squish-cuenta', cuenta);
      pintarCuenta();

      if (premio && metaPremio && cuenta === metaPremio && marcador) {
        marcador.textContent = premio;
      }
    }

    function soltar() {
      if (!apretado) return;
      apretado = false;
      cuerpo.style.setProperty('--sx', '1');
      cuerpo.style.setProperty('--sy', '1');
      cuerpo.style.setProperty('--gx', '0px');
      cuerpo.style.setProperty('--gy', '0px');
      cuerpo.style.setProperty('--giro', '0deg');
      raiz.dataset.shEstado = lento ? 'subiendo' : 'libre';
      if (conSonido && !silenciado && !lento) sonarSquish(true);
      if (lento) {
        setTimeout(function () {
          if (!apretado) {
            raiz.dataset.shEstado = 'libre';
            if (conSonido && !silenciado) sonarSquish(true);
          }
        }, 700);
      }
    }

    boton.addEventListener('pointerdown', function (e) {
      // Capturar el puntero mantiene el apretón aunque el dedo se salga del
      // botón, y garantiza que el pointerup llegue aquí y no a otro elemento.
      if (boton.setPointerCapture && e.pointerId != null) {
        try { boton.setPointerCapture(e.pointerId); } catch (err) { /* puntero ya inactivo */ }
      }
      apretar(e.clientX, e.clientY);
    });
    boton.addEventListener('pointerup', soltar);
    boton.addEventListener('pointercancel', soltar);
    boton.addEventListener('pointerleave', soltar);

    /* Teclado: el centro del elemento hace de punto de presión. */
    boton.addEventListener('keydown', function (e) {
      if (e.key !== ' ' && e.key !== 'Enter' && e.key !== 'Spacebar') return;
      if (e.repeat) return;
      e.preventDefault();
      var r = boton.getBoundingClientRect();
      apretar(r.left + r.width / 2, r.top + r.height * 0.3);
    });
    boton.addEventListener('keyup', function (e) {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Spacebar') soltar();
    });
    boton.addEventListener('blur', soltar);
  }

  /* ============================================================
     Foto de reseña en grande

     <dialog> hace el trabajo pesado: cierra con Escape, atrapa el foco
     dentro y deja el resto de la página inerte. Nada de eso hay que
     programarlo, y ninguna librería lo hace mejor.
     ============================================================ */
  var visor = null;
  var visorListo = false;

  function abrirFoto(src, alt) {
    if (!visor) {
      visor = document.createElement('dialog');
      visor.className = 'sh-lightbox';
      var img = document.createElement('img');
      var cerrar = document.createElement('button');
      cerrar.type = 'button';
      cerrar.className = 'sh-lightbox__x';
      cerrar.setAttribute('aria-label', 'Cerrar');
      cerrar.textContent = '×';
      cerrar.addEventListener('click', function () { visor.close(); });
      visor.appendChild(img);
      visor.appendChild(cerrar);
      // Clic fuera de la imagen: el backdrop es el propio dialog.
      visor.addEventListener('click', function (e) { if (e.target === visor) visor.close(); });
      document.body.appendChild(visor);
    }
    var foto = visor.querySelector('img');
    foto.src = src;
    foto.alt = alt || '';
    if (visor.showModal) visor.showModal();
  }

  function activarVisor() {
    if (visorListo) return;
    visorListo = true;
    document.addEventListener('click', function (e) {
      var boton = e.target.closest && e.target.closest('[data-sh-foto]');
      if (!boton) return;
      abrirFoto(boton.dataset.shFoto, boton.dataset.shAlt);
    });
  }

  /* ============================================================
     Marquesina — solo el botón de pausa

     El movimiento y la parada al pasar el ratón o al enfocar son CSS puro.
     Esto solo añade el botón, porque un texto que se mueve tiene que poder
     pararse también con un clic, no solo dejando el cursor encima.
     ============================================================ */
  function montarMarquesina(raiz) {
    if (raiz.dataset.shListo === '1') return;
    raiz.dataset.shListo = '1';

    var btn = raiz.querySelector('[data-sh-marq-btn]');
    if (!btn) return;

    btn.addEventListener('click', function () {
      var parada = raiz.dataset.parada === '1';
      raiz.dataset.parada = parada ? '0' : '1';
      btn.setAttribute('aria-pressed', parada ? 'false' : 'true');
    });
  }

  /* ============================================================
     Arranque
     ============================================================ */
  function iniciar(ambito) {
    var alcance = ambito || document;

    var juguetes = alcance.querySelectorAll('[data-sh-squish]');
    for (var i = 0; i < juguetes.length; i++) montarSquish(juguetes[i]);

    var cintas = alcance.querySelectorAll('[data-sh-pausa="true"]');
    for (var j = 0; j < cintas.length; j++) montarMarquesina(cintas[j]);

    var fx = document.querySelector('[data-sh-sparkles]');
    if (fx) {
      activarBrillos({
        cantidad: parseInt(fx.dataset.shCantidad, 10) || 6,
        movil: fx.dataset.shMovil !== '0'
      });
    }

    if (document.querySelector('[data-sh-foto]')) activarVisor();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { iniciar(); });
  } else {
    iniciar();
  }

  // El editor de temas monta y desmonta secciones sin recargar la página.
  document.addEventListener('shopify:section:load', function (e) { iniciar(e.target); });
})();
