/* CREAM · demo. JS puro, celu primero. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var html = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var esTouch = window.matchMedia('(hover: none)').matches;

  /* ---------- INTRO: espera fuentes + foto del hero (máx ~2,6 s) y abre el toldo ---------- */
  function intro() {
    var t0 = performance.now();
    function abrir() {
      html.classList.add('abre', 'listo');
      setTimeout(function () { html.classList.remove('con-intro'); }, 700);
    }
    if (!html.classList.contains('con-intro')) { requestAnimationFrame(function () { html.classList.add('listo'); }); return; }
    var corta = window.innerWidth < 768;
    var minimo = corta ? 1250 : 1500, maximo = 2600;
    var heroImg = $('.hero__foto img');
    var esperas = [];
    if (document.fonts && document.fonts.ready) esperas.push(document.fonts.ready);
    if (heroImg) esperas.push(heroImg.decode ? heroImg.decode().catch(function () {}) : Promise.resolve());
    var listo = false;
    function fin() { if (listo) return; listo = true; var falta = Math.max(0, minimo - (performance.now() - t0)); setTimeout(abrir, falta); }
    Promise.all(esperas).then(fin, fin);
    setTimeout(fin, maximo);
  }

  /* ---------- bloqueo de scroll que funciona en iPhone (kit y menú) ---------- */
  var lockY = 0, bloqueado = false;
  function bloquear(on) {
    if (on === bloqueado) return;
    bloqueado = on;
    var b = document.body;
    if (on) {
      lockY = window.scrollY;
      b.style.position = 'fixed'; b.style.top = -lockY + 'px'; b.style.left = '0'; b.style.right = '0'; b.style.width = '100%';
    } else {
      b.style.position = ''; b.style.top = ''; b.style.left = ''; b.style.right = ''; b.style.width = '';
      var sb = html.style.scrollBehavior; html.style.scrollBehavior = 'auto';
      window.scrollTo(0, lockY);
      html.style.scrollBehavior = sb;
    }
  }
  function revisarBloqueo() {
    var hay = html.classList.contains('kit-lock') || html.classList.contains('menu-on') || html.classList.contains('hay-popup');
    bloquear(hay);
  }
  new MutationObserver(revisarBloqueo).observe(html, { attributes: true, attributeFilter: ['class'] });

  /* ---------- barra y menú ---------- */
  function barra() {
    var b = $('[data-barra]'); if (!b) return;
    var raf = 0;
    function mirar() { raf = 0; b.classList.toggle('sombra', window.scrollY > 10); html.classList.toggle('paso-hero', window.scrollY > window.innerHeight * .6); }
    window.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(mirar); }, { passive: true });
    mirar();

    var menu = $('#menu'), abrirB = $('[data-menu-abrir]');
    function abrir() {
      menu.hidden = false; html.classList.add('menu-on'); abrirB.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(function () { menu.classList.add('abierto'); $('[data-menu-cerrar]', menu).focus(); });
    }
    function cerrar(irA) {
      menu.classList.remove('abierto'); menu.hidden = true; html.classList.remove('menu-on'); abrirB.setAttribute('aria-expanded', 'false');
      if (irA) { var d = $(irA); if (d) setTimeout(function () { d.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }, 30); }
      else abrirB.focus();
    }
    abrirB.addEventListener('click', abrir);
    menu.addEventListener('click', function (e) {
      if (e.target.closest('[data-menu-cerrar]')) { cerrar(); return; }
      var a = e.target.closest('a[href^="#"]'); if (a) { e.preventDefault(); cerrar(a.getAttribute('href')); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) cerrar(); });
  }

  /* ---------- entradas al hacer scroll ---------- */
  function revelar() {
    var els = $$('.rv');
    if (!('IntersectionObserver' in window) || reduce) { els.forEach(function (e) { e.classList.add('visto'); }); return; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('visto'); io.unobserve(en.target); } });
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- abierto ahora (hora de Buenos Aires) ---------- */
  function estado() {
    var el = $('[data-estado]'); if (!el) return;
    var H = { 1: [510, 1170], 2: [510, 1170], 3: [510, 1170], 4: [510, 1170], 5: [510, 1170], 6: [600, 1140], 0: null };
    try {
      var p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
      var g = {}; p.forEach(function (x) { g[x.type] = x.value; });
      var dia = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g.weekday);
      var min = (parseInt(g.hour, 10) % 24) * 60 + parseInt(g.minute, 10);
      var f = H[dia], txt;
      if (f && min >= f[0] && min < f[1]) { el.classList.add('abierto'); txt = 'Abierto ahora · hasta las ' + (dia === 6 ? '19' : '19:30'); }
      else if (f && min < f[0]) txt = 'Abrimos hoy a las ' + (dia === 6 ? '10' : '8:30');
      else txt = dia === 6 || dia === 0 ? 'Abrimos el lunes a las 8:30' : 'Mañana abrimos ' + (dia === 5 ? 'a las 10' : 'a las 8:30');
      $('[data-estado-txt]', el).textContent = txt;
    } catch (_) { /* queda el horario fijo */ }
  }

  /* ---------- cinta de frases: corre sola y se puede frenar y arrastrar ---------- */
  function cinta() {
    var c = $('[data-cinta]'), pista = $('[data-cinta-pista]'); if (!c || !pista) return;
    pista.innerHTML += pista.innerHTML; // duplicado para el loop
    $$('span, i', pista).forEach(function (e, i) { if (i >= pista.children.length / 2) e.setAttribute('aria-hidden', 'true'); });
    var x = 0, vel = reduce ? 0 : 0.45, mitad = 0, arr = false, ultX = 0, visible = true, raf = 0;
    function medir() { mitad = pista.scrollWidth / 2; }
    function paso() {
      raf = 0;
      if (!arr) x -= vel;
      if (mitad) { if (x <= -mitad) x += mitad; if (x > 0) x -= mitad; }
      pista.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
      if (visible) raf = requestAnimationFrame(paso);
    }
    medir(); window.addEventListener('resize', medir);
    if (document.fonts) document.fonts.ready.then(medir);
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(paso); }).observe(c);
    c.addEventListener('pointerdown', function (e) { arr = true; ultX = e.clientX; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', function (e) { if (!arr) return; x += e.clientX - ultX; ultX = e.clientX; });
    function soltar() { arr = false; }
    c.addEventListener('pointerup', soltar); c.addEventListener('pointercancel', soltar);
  }

  /* ---------- filas deslizables: con el dedo es scroll nativo; con mouse, arrastrar ---------- */
  function filas() {
    $$('[data-arrastre]').forEach(function (f) {
      $$('img', f).forEach(function (i) { i.draggable = false; });
      var abajo = false, movio = false, x0 = 0, sl0 = 0, ultX = 0, ultT = 0, vel = 0, raf = 0, pid = null, bloquearClick = false;
      function maxScroll() { return f.scrollWidth - f.clientWidth; }
      function destinos() {
        var pad = parseFloat(getComputedStyle(f).scrollPaddingLeft) || 0;
        var fr = f.getBoundingClientRect().left, cur = f.scrollLeft;
        return $$('.fila__pista > *', f).map(function (it) {
          return Math.max(0, Math.min(maxScroll(), cur + it.getBoundingClientRect().left - fr - pad));
        });
      }
      function acomodar(dir) {
        var cur = f.scrollLeft, ds = destinos(), mejor = ds[0] || 0, bd = 1e9;
        ds.forEach(function (d) {
          var dist = Math.abs(d - cur);
          if (dir && (d - cur) * dir < -2) dist += 4000; // preferir el lado hacia el que venía
          if (dist < bd) { bd = dist; mejor = d; }
        });
        animarA(mejor);
      }
      // scroll animado propio (no depende de scroll-behavior) y snap reactivado al terminar
      function animarA(dest) {
        cancelAnimationFrame(raf);
        var desde = f.scrollLeft, t0 = performance.now(), dur = reduce ? 1 : Math.min(520, 180 + Math.abs(dest - desde) * .6);
        (function paso(t) {
          var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
          f.scrollLeft = desde + (dest - desde) * e;
          if (p < 1) raf = requestAnimationFrame(paso);
          else f.classList.remove('arrastrando');
        })(t0);
      }
      f.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('button, a, input')) return;
        cancelAnimationFrame(raf);
        abajo = true; movio = false; bloquearClick = false; pid = e.pointerId;
        x0 = ultX = e.clientX; sl0 = f.scrollLeft; ultT = performance.now(); vel = 0;
        e.preventDefault(); // sin arrastre de imagen ni selección de texto
      });
      f.addEventListener('pointermove', function (e) {
        if (!abajo) return;
        var dx = e.clientX - x0;
        if (!movio && Math.abs(dx) > 4) {
          movio = true; bloquearClick = true; f.classList.add('arrastrando');
          try { f.setPointerCapture(pid); } catch (_) { /* nada */ }
        }
        if (!movio) return;
        f.scrollLeft = sl0 - dx;
        var t = performance.now(), dt = t - ultT;
        if (dt > 0) vel = .75 * ((ultX - e.clientX) / dt) + .25 * vel; // px/ms
        ultX = e.clientX; ultT = t;
      });
      function soltar() {
        if (!abajo) return; abajo = false;
        try { f.releasePointerCapture(pid); } catch (_) { /* nada */ }
        if (!movio) return;
        if (performance.now() - ultT > 90) vel = 0; // se quedó quieto antes de soltar
        var v = vel * 16, dir = vel > 0 ? 1 : vel < 0 ? -1 : 0;
        (function inercia() {
          if (Math.abs(v) < .6 || f.scrollLeft <= 0 || f.scrollLeft >= maxScroll()) { acomodar(dir); return; }
          f.scrollLeft += v; v *= .9;
          raf = requestAnimationFrame(inercia);
        })();
      }
      f.addEventListener('pointerup', soltar);
      f.addEventListener('pointercancel', soltar);
      f.addEventListener('click', function (e) { if (bloquearClick) { e.preventDefault(); e.stopPropagation(); bloquearClick = false; } }, true);
      f.addEventListener('dragstart', function (e) { e.preventDefault(); });

      // flechas para mouse (en el celu se desliza con el dedo)
      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        var fl = document.createElement('div'); fl.className = 'fila__flechas';
        fl.innerHTML = '<button type="button" class="redondo" data-dir="-1" aria-label="Anterior"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><button type="button" class="redondo" data-dir="1" aria-label="Siguiente"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>';
        f.parentNode.insertBefore(fl, f.nextSibling);
        fl.addEventListener('click', function (e) {
          var b = e.target.closest('[data-dir]'); if (!b) return;
          var dir = +b.dataset.dir, cur = f.scrollLeft, ds = destinos();
          var sig = dir > 0 ? ds.filter(function (d) { return d > cur + 4; })[0] : ds.filter(function (d) { return d < cur - 4; }).pop();
          if (sig == null) sig = dir > 0 ? maxScroll() : 0;
          f.classList.add('arrastrando'); animarA(sig);
        });
      }
    });
  }

  /* ---------- carta: encabezado, anterior/siguiente y pestaña activa a la vista ---------- */
  var NOTAS = {
    promos: 'para compartir, se pueden pedir para retirar',
    calientes: 'se pueden pedir para retirar',
    frios: 'precios a confirmar con el local',
    cookies: 'stock semanal limitado, vuelan',
    laminados: 'algunas cosas solo en Devoto',
    chambuchitos: 'con filtrado de 8:30 a 12, refill sin cargo',
    casa: 'por encargo: avisanos qué día pasás',
  };
  var carta = { el: null, cats: [], prods: [] };
  function cartaArmar(det) {
    carta.el = det.el; carta.prods = det.productos || []; carta.cats = (det.categorias || []).filter(function (c) { return carta.prods.some(function (p) { return p.categoria === c.id; }); });
    var activa = $('.kit-tab.is-on', carta.el);
    cartaMostrar(activa ? activa.dataset.cat : (carta.cats[0] && carta.cats[0].id), false);
    precios();
  }
  function cartaMostrar(id, animar) {
    if (!carta.el || !id) return;
    var cat = carta.cats.filter(function (c) { return c.id === id; })[0]; if (!cat) return;
    var n = carta.prods.filter(function (p) { return p.categoria === id; }).length;
    $('[data-cab-titulo]').textContent = cat.nombre;
    $('[data-cab-sub]').textContent = n + (n === 1 ? ' opción' : ' opciones') + (NOTAS[id] ? ' · ' + NOTAS[id] : '');
    var cab = $('[data-cab]');
    if (animar !== false) { cab.classList.remove('cambia'); void cab.offsetWidth; cab.classList.add('cambia'); }
    var i = -1; carta.cats.forEach(function (c, k) { if (c.id === id) i = k; });
    var prev = carta.cats[i - 1], next = carta.cats[i + 1];
    var bp = $('[data-prev]'), bn = $('[data-next]');
    bp.hidden = !prev; bn.hidden = !next;
    if (prev) { $('[data-prev-txt]').textContent = prev.nombre; bp.dataset.cat = prev.id; }
    if (next) { $('[data-next-txt]').textContent = next.nombre; bn.dataset.cat = next.id; }
    var tab = $('.kit-tab[data-cat="' + id + '"]', carta.el);
    if (tab && window.innerWidth < 1100) {
      var tabs = tab.parentElement;
      var x = tab.offsetLeft - (tabs.clientWidth - tab.offsetWidth) / 2;
      tabs.scrollTo({ left: Math.max(0, x), behavior: animar === false || reduce ? 'auto' : 'smooth' });
    }
  }
  function cartaEventos() {
    document.addEventListener('kit:carta', function (e) { if (e.detail.el.closest('.carta')) cartaArmar(e.detail); });
    document.addEventListener('click', function (e) {
      var t = e.target.closest('.carta .kit-tab'); if (t) { cartaMostrar(t.dataset.cat, true); return; }
      var n = e.target.closest('[data-prev], [data-next]');
      if (n && n.dataset.cat && carta.el) {
        var tab = $('.kit-tab[data-cat="' + n.dataset.cat + '"]', carta.el);
        if (tab) tab.click();
        var top = $('.carta__marco').getBoundingClientRect().top;
        if (top < 0) window.scrollTo({ top: window.scrollY + top - 80, behavior: reduce ? 'auto' : 'smooth' });
      }
    });
  }
  // precios de las polaroids desde la carta (si el dueño cambia un precio en /admin, se actualiza)
  function precios() {
    var k = window.creamKit; if (!k) return;
    carta.prods.forEach(function (p) {
      $$('[data-precio="' + p.id + '"]').forEach(function (el) { el.textContent = k.money(p.precio) || 'Consultar'; });
      $$('.pola[data-prod="' + p.id + '"]').forEach(function (el) { el.hidden = p.disponible === false; });
    });
  }

  /* ---------- carrito = ticket de CREAM ---------- */
  var CAFES = { 'promo-flat-x2': 2, 'promo-latte-x2': 2, 'promo-latte-cookie': 1, 'promo-pedacito': 2, americano: 1, cappuccino: 1, lagrima: 1, latte: 1, 'flat-white': 1, 'flat-caramel': 1, 'flat-vainilla': 1, mokaccino: 1, filtrado: 1 };
  function lineasCarrito() { try { return JSON.parse(localStorage.getItem('kit:cream-coffee:carrito') || '[]'); } catch (_) { return []; } }
  function cafesDe(items) { return (items || []).reduce(function (s, l) { return s + (CAFES[l.id] || 0) * (l.cant || 1); }, 0); }
  var ultimasIds = [];
  function decorarTicket() {
    var lines = $('.kit-cart .kit-lines');
    if (!lines || lines.closest('.ticket')) return;
    var t = document.createElement('div'); t.className = 'ticket';
    t.innerHTML = '<div class="ticket__cab"><b>CREAM</b><span>Café de especialidad y otras cositas…</span></div>';
    lines.parentNode.insertBefore(t, lines); t.appendChild(lines);
    var n = cafesDe(lineasCarrito());
    if (n) {
      var s = document.createElement('div'); s.className = 'ticket__sellos';
      s.innerHTML = '<img src="img/logo-negro.svg" alt="" width="58" height="13"><span>Este pedido te suma <b>' + n + (n === 1 ? ' sello' : ' sellos') + '</b> en tu tarjetita.</span>';
      t.appendChild(s);
    }
    var ids = $$('.kit-line', lines).map(function (li) { var b = $('b', li); return b ? b.textContent : ''; });
    $$('.kit-line', lines).forEach(function (li, i) { if (ultimasIds.length && ultimasIds.indexOf(ids[i]) < 0) li.classList.add('recien'); });
    ultimasIds = ids;
  }
  function ticket() {
    var raf = 0;
    new MutationObserver(function () { if (!raf) raf = requestAnimationFrame(function () { raf = 0; decorarTicket(); }); }).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('kit:carrito', function (e) {
      var d = e.detail || {};
      if (d.delta > 0 && d.producto && CAFES[d.producto.id]) miniSello();
    });
  }
  // el sello golpea cerca del botón del ticket cada vez que sumás un café
  function miniSello() {
    if (reduce) return;
    var fab = $('.kit-fab'); if (!fab || fab.hidden) return;
    var r = fab.getBoundingClientRect();
    var s = document.createElement('img');
    s.src = 'img/logo-azul.svg'; s.alt = ''; s.className = 'mini-sello';
    s.style.cssText = 'position:fixed;z-index:9001;width:84px;left:' + (r.left + r.width / 2 - 42) + 'px;top:' + (r.top - 42) + 'px;pointer-events:none;background:#FEF4E3;padding:8px;border-radius:8px;border:2px solid #172131;';
    document.body.appendChild(s);
    s.animate([
      { transform: 'scale(2.2) rotate(10deg)', opacity: 0 },
      { transform: 'scale(.9) rotate(-8deg)', opacity: 1, offset: .45 },
      { transform: 'scale(1) rotate(-8deg)', opacity: 1, offset: .7 },
      { transform: 'translateY(-14px) rotate(-8deg)', opacity: 0 }
    ], { duration: 900, easing: 'cubic-bezier(.34,1.56,.64,1)' }).onfinish = function () { s.remove(); };
  }

  /* ---------- TARJETITA DE SELLOS ---------- */
  var KEY_S = 'cream:sellos';
  function leerSellos() { try { return Math.max(0, Math.min(10, parseInt(localStorage.getItem(KEY_S) || '0', 10) || 0)); } catch (_) { return memSellos; } }
  var memSellos = 0;
  function guardarSellos(n) { memSellos = n; try { localStorage.setItem(KEY_S, String(n)); } catch (_) { /* sin storage */ } }
  var ROT = [-14, 9, -6, 12, -10, 5, -12, 8, -4, 0];
  function tarjeta() {
    var g = $('[data-grilla]'); if (!g) return;
    var html10 = '';
    for (var i = 0; i < 10; i++) {
      if (i < 9) html10 += '<button type="button" class="casilla" role="listitem" data-i="' + i + '" style="--rot:' + ROT[i] + 'deg" aria-label="Casillero ' + (i + 1) + '"><img src="img/logo-azul.svg" alt="" width="60" height="14"></button>';
      else html10 += '<button type="button" class="casilla casilla--gratis" role="listitem" data-i="9" aria-label="Casillero 10: café gratis"><span>Gratis</span></button>';
    }
    g.innerHTML = html10;
    pintar(leerSellos(), false);
    g.addEventListener('click', function (e) {
      var c = e.target.closest('.casilla'); if (!c || c.classList.contains('sellada')) return;
      sumar(1);
    });
    $('[data-sellos-reset]').addEventListener('click', function () { guardarSellos(0); pintar(0, false); });
    document.addEventListener('kit:pedido', function (e) {
      var n = cafesDe(e.detail && e.detail.items); if (!n) return;
      var antes = leerSellos(); sumar(n);
      avisarEnConfirmacion(Math.min(10, antes + n) - antes);
    });
  }
  function sumar(n) {
    var antes = leerSellos(), ahora = Math.min(10, antes + n);
    guardarSellos(ahora);
    pintar(ahora, true, antes);
  }
  // el +N sellos va adentro de la confirmación del pedido (si no aparece, un aviso arriba)
  function avisarEnConfirmacion(k) {
    if (!k) return;
    var t0 = Date.now();
    (function buscar() {
      var done = $('.kit-done');
      if (done) {
        if ($('.done-sellos', done)) return;
        var p = document.createElement('p'); p.className = 'done-sellos';
        var n = leerSellos();
        p.innerHTML = '<img src="img/logo-amarillo.svg" alt="" width="54" height="12"><span>+' + k + (k === 1 ? ' sello' : ' sellos') + ' en tu tarjetita. ' + (n >= 10 ? '¡El próximo va de onda!' : 'Van ' + n + ' de 10.') + '</span>';
        var row = $('.kit-row', done); done.insertBefore(p, row || null);
        return;
      }
      if (Date.now() - t0 < 2500) setTimeout(buscar, 120); else toastSellos(k);
    })();
  }
  function pintar(n, animar, antes) {
    $$('.casilla').forEach(function (c, i) {
      var on = i < n;
      c.classList.toggle('sellada', on);
      c.setAttribute('aria-label', 'Casillero ' + (i + 1) + (on ? ': sellado' : i === 9 ? ': café gratis' : ': vacío'));
      if (on && animar && i >= (antes || 0)) {
        c.classList.remove('golpe');
        setTimeout(function () { void c.offsetWidth; c.classList.add('golpe'); }, (i - (antes || 0)) * 160);
      }
    });
    var txt = $('[data-sellos-txt]');
    txt.textContent = n >= 10 ? 'Tarjetita completa.' : 'Van ' + n + ' de 10. Te ' + (10 - n === 1 ? 'falta 1 cafecito.' : 'faltan ' + (10 - n) + ' cafecitos.');
    var premio = $('[data-premio]');
    premio.hidden = n < 10;
    if (n >= 10) $('[data-codigo]').textContent = 'CREAM-' + String(Math.floor(1000 + Math.random() * 9000));
  }
  function toastSellos(k) {
    var t = document.createElement('div');
    t.setAttribute('role', 'status');
    t.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 80px);z-index:9600;transform:translateX(-50%);background:#F5D000;color:#172131;border:2px solid #172131;border-radius:999px;padding:12px 18px;font:600 15px/1.2 Outfit,system-ui,sans-serif;box-shadow:0 4px 0 #172131;max-width:calc(100% - 40px);text-align:center';
    t.textContent = '+' + k + (k === 1 ? ' sello' : ' sellos') + ' en tu tarjetita';
    document.body.appendChild(t);
    t.animate([{ opacity: 0, transform: 'translate(-50%,-10px)' }, { opacity: 1, transform: 'translate(-50%,0)' }], { duration: 300, fill: 'both' });
    setTimeout(function () { t.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'both' }).onfinish = function () { t.remove(); }; }, 3200);
  }

  /* ---------- LA VEREDITA: mazo que se pasa con el dedo ---------- */
  function mazo() {
    var pila = $('[data-pila]'); if (!pila) return;
    var cartas = $$('.carta-f', pila), n = cartas.length, top = 0;
    var cnt = $('[data-mazo-n]');
    var ROTS = [-4, 3, -2, 5, -3, 2, -5, 4];
    function orden() {
      cartas.forEach(function (c, i) {
        var pos = (i - top + n) % n;
        c.style.zIndex = String(n - pos);
        c.style.transform = pos === 0 ? 'rotate(0deg)' : 'translate(' + (pos * 6) + 'px,' + (pos * 6) + 'px) rotate(' + ROTS[i % ROTS.length] + 'deg)';
        c.style.opacity = pos > 3 ? '0' : '1';
        c.setAttribute('aria-hidden', pos === 0 ? 'false' : 'true');
      });
      cnt.textContent = (top + 1) + ' / ' + n;
    }
    function ir(d) {
      if (d > 0) {
        var c = cartas[top];
        c.style.transform = 'translate(' + (window.innerWidth * .9) + 'px,-30px) rotate(18deg)';
        setTimeout(function () { top = (top + 1) % n; orden(); }, reduce ? 0 : 260);
      } else { top = (top - 1 + n) % n; orden(); }
    }
    orden();
    $('[data-mazo-next]').addEventListener('click', function () { ir(1); });
    $('[data-mazo-prev]').addEventListener('click', function () { ir(-1); });
    var x0 = 0, y0 = 0, dx = 0, activo = null, horizontal = null;
    pila.addEventListener('pointerdown', function (e) {
      activo = cartas[top]; x0 = e.clientX; y0 = e.clientY; dx = 0; horizontal = null;
      activo.classList.add('arrastra');
    });
    pila.addEventListener('pointermove', function (e) {
      if (!activo) return;
      var mx = e.clientX - x0, my = e.clientY - y0;
      if (horizontal === null && (Math.abs(mx) > 6 || Math.abs(my) > 6)) {
        horizontal = Math.abs(mx) > Math.abs(my);
        if (horizontal) try { pila.setPointerCapture(e.pointerId); } catch (_) { /* nada */ }
      }
      if (!horizontal) return;
      dx = mx;
      activo.style.transform = 'translate(' + dx + 'px,' + (Math.abs(dx) * -.06) + 'px) rotate(' + (dx / 18) + 'deg)';
    });
    function soltar() {
      if (!activo) return;
      var c = activo; activo = null; c.classList.remove('arrastra');
      if (horizontal && Math.abs(dx) > 80) {
        c.style.transform = 'translate(' + (dx > 0 ? 1 : -1) * window.innerWidth + 'px,-30px) rotate(' + (dx > 0 ? 22 : -22) + 'deg)';
        setTimeout(function () { top = (top + 1) % n; orden(); }, 240);
      } else orden();
    }
    pila.addEventListener('pointerup', soltar); pila.addEventListener('pointercancel', soltar);
    pila.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') ir(1); if (e.key === 'ArrowLeft') ir(-1); });
  }

  /* ---------- CAFÉ POSTA: la receta del día cuenta sola ---------- */
  function receta() {
    var r = $('[data-receta]'); if (!r) return;
    var nums = $$('[data-cuenta]', r);
    function correr() {
      nums.forEach(function (b) {
        var fin = parseInt(b.dataset.cuenta, 10), t0 = performance.now(), dur = 1300;
        if (reduce) { b.textContent = fin; return; }
        (function paso(t) { var p = Math.min(1, (t - t0) / dur); b.textContent = Math.round(fin * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(paso); })(t0);
      });
    }
    if (!('IntersectionObserver' in window)) { correr(); return; }
    var io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { correr(); io.disconnect(); } }, { threshold: .5 });
    io.observe(r);
  }

  /* ---------- arranque ---------- */
  intro();
  barra();
  revelar();
  estado();
  cinta();
  filas();
  cartaEventos();
  ticket();
  tarjeta();
  mazo();
  receta();
  // el kit pudo haber montado la carta antes que este script
  function conKit(k) {
    if (!k || !k.cartas) return;
    k.cartas.forEach(function (c) {
      if (!c.el.closest('.carta') || !$('.kit-carta__panel', c.el)) return;
      Promise.all([k.store.getCategorias(), k.store.getProductos()]).then(function (r) { cartaArmar({ el: c.el, categorias: r[0], productos: r[1] }); });
    });
  }
  if (window.creamKit) conKit(window.creamKit);
  document.addEventListener('cream:kit', function (e) { conKit(e.detail); });
  void esTouch;
})();
