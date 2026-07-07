/* =====================================================================
   site.js — Site-weite Interaktions-Schicht (Haus- & Gartenservice Havelland)
   ---------------------------------------------------------------------
   Portiert + generalisiert aus previews/assets/js/preview-kit.js.
   Eingebunden per <script src="/assets/js/site.js" defer>.

   JEDE Funktion ist null-safe (querySelector-Guards) und idempotent:
   dieselbe Datei läuft auf JEDER Seite — auch wenn nur EIN Teil der
   Komponenten vorhanden ist (kein Crash bei fehlendem #car-track/.ba/…).

   Komponenten:
     initBA .............. Vorher/Nachher-Slider (Maus, Touch, Tastatur)
     Mobile-Nav .......... Burger (#burger) + additiv .navmenu/#nvt schließen
     Scroll .............. Fortschrittsbalken (#progress) + Scrollspy
     Heckenarten-Kompass . Tab-Panels (.pills .pill)
     Schnittkalender ..... Monats-Hints (.cal-m), new Date() im Browser
     Karussell ........... horizontales Scroll-Snap (#car-track)
     Lightbox ............ V/N-Vergleich im Overlay (#lightbox)
     FAQ ................. Accordion (nur eins offen) + Sofort-Filter
     Gebietskarte ........ Karte (.map-dot) + Ortsliste (.ortbtn) synchron
     [D3] Erreichbarkeits-Chip .. [data-erreichbar], Mo–Fr 8–18 · Sa 8–14 · So zu
     [D8] Gold-Dedup ..... .btn-acc sichtbar → .scta bekommt .scta-muted
     Reveal .............. IntersectionObserver, GUARD .rv:not(.in) —
                           doppelt NICHT mit dem Inline-Reveal des Generators.

   BILD-LABELS: Owner-Entscheidung 2026-07-07 — keine "Beispielfoto"-/
   Provenienz-Labels. Die Lightbox emittiert KEIN ba-proof und keinen
   "Beispielfoto:"-Alt-Text (nur die funktionalen Vorher/Nachher-Tags des
   Sliders bleiben — sie sind Mechanik, kein Provenienz-Label).
   ===================================================================== */
(function () {
  "use strict";
  if (window.__siteInit) return;              // idempotent: nur einmal binden
  window.__siteInit = true;

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var on = function (el, ev, fn, o) { if (el) el.addEventListener(ev, fn, o); };

  /* ===== Vorher/Nachher-Slider (Maus, Touch, Tastatur) ===== */
  function initBA(ba) {
    if (!ba || ba.__baInit) return; ba.__baInit = true;
    var range = ba.querySelector('input[type=range]');
    if (!range) return;
    function set() { ba.style.setProperty('--pos', range.value + '%'); }
    on(range, 'input', function () {
      set();
      var stage = ba.closest('.hero-stage'); if (stage) stage.classList.add('dragged');
    });
    set();
  }
  window.initBA = initBA;                      // Lightbox nutzt es für dynamische Slider
  $$('.ba').forEach(initBA);

  /* ===== Mobile Navigation ===== */
  var burger = $('#burger');
  if (burger) {
    on(burger, 'click', function () {
      var open = document.body.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    });
    $$('.mnav a').forEach(function (a) {
      on(a, 'click', function () {
        document.body.classList.remove('menu-open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }
  /* Additiv: CSS-Checkbox-Nav des Generators (#nvt + .navmenu) beim
     Link-Klick schließen, damit das Menü nicht offen stehen bleibt. */
  var navToggle = $('#nvt');
  if (navToggle) {
    $$('.navmenu a').forEach(function (a) {
      on(a, 'click', function () { navToggle.checked = false; });
    });
  }

  /* ===== Scroll-Fortschritt + Scrollspy ===== */
  var progress = $('#progress'), ticking = false;
  function paintProgress() {
    var h = document.documentElement, max = h.scrollHeight - h.clientHeight;
    if (progress) progress.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    ticking = false;
  }
  if (progress) {
    on(window, 'scroll', function () { if (!ticking) { requestAnimationFrame(paintProgress); ticking = true; } }, { passive: true });
    paintProgress();
  }
  var spyLinks = {};
  $$('.nav-links a[href^="#"]').forEach(function (a) { spyLinks[a.getAttribute('href').slice(1)] = a; });
  if (Object.keys(spyLinks).length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          Object.keys(spyLinks).forEach(function (k) { spyLinks[k].classList.remove('act'); });
          var l = spyLinks[e.target.id]; if (l) l.classList.add('act');
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    Object.keys(spyLinks).forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* ===== Heckenarten-Kompass (Tabs) ===== */
  var ktabs = $$('.pills .pill');
  ktabs.forEach(function (tab) {
    on(tab, 'click', function () {
      ktabs.forEach(function (t) {
        t.setAttribute('aria-selected', 'false');
        var p = document.getElementById(t.getAttribute('aria-controls')); if (p) p.hidden = true;
      });
      tab.setAttribute('aria-selected', 'true');
      var panel = document.getElementById(tab.getAttribute('aria-controls')); if (panel) panel.hidden = false;
    });
  });

  /* ===== Schnittkalender (Monats-Hints) ===== */
  var calBtns = $$('.cal-m'), calHint = $('#cal-hint');
  if (calBtns.length) {
    var calHints = [
      'Januar: Starker Rückschnitt erlaubt — an frostfreien Tagen arbeiten wir auch jetzt.',
      'Februar: Letzter Monat für den starken Rückschnitt — das ideale Fenster vor dem Austrieb.',
      'März: Formschnitt ideal vor dem Austrieb. Ab dem 1. März gilt die Schonzeit — kein radikaler Rückschnitt (§ 39 BNatSchG).',
      'April: Formschnitt möglich — vorher prüfen wir die Hecke auf besetzte Nester.',
      'Mai: Volle Wachstumsphase — Formschnitt möglich, Nestkontrolle ist Pflicht.',
      'Juni: Der klassische Sommer-Formschnitt nach dem Johannistrieb — ideales Fenster für fast alle Arten.',
      'Juli: Formschnitt möglich — aber nicht bei praller Hitze, das stresst die Hecke.',
      'August: Zweiter Formschnitt für schnellwachsende Arten wie Liguster oder Kirschlorbeer.',
      'September: Letzte Formschnitte — so geht die Hecke sauber in den Winter.',
      'Oktober: Die Schonzeit endet — ab dem 1. Oktober ist der starke Rückschnitt wieder erlaubt.',
      'November: Gute Zeit für kräftige Rückschnitte, solange es frostfrei ist.',
      'Dezember: Rückschnitt an frostfreien Tagen möglich — wir planen wetterabhängig.'
    ];
    var calSelect = function (i) {
      calBtns.forEach(function (b) { b.classList.toggle('sel', +b.dataset.m === i); });
      if (calHint) calHint.textContent = calHints[i];
    };
    calBtns.forEach(function (b) { on(b, 'click', function () { calSelect(+b.dataset.m); }); });
    var nowM = new Date().getMonth();
    if (calBtns[nowM]) calBtns[nowM].classList.add('now');
    calSelect(nowM);
  }

  /* ===== Karussell ===== */
  var track = $('#car-track'), carCount = $('#car-count');
  if (track) {
    var slides = $$(':scope > figure', track);
    var slideStep = function () { return slides.length > 1 ? slides[1].offsetLeft - slides[0].offsetLeft : track.clientWidth; };
    var updateCount = function () {
      if (!carCount || !slides.length) return;
      var i = Math.min(slides.length, Math.round(track.scrollLeft / slideStep()) + 1);
      carCount.textContent = i + ' / ' + slides.length;
    };
    on($('#car-prev'), 'click', function () { track.scrollBy({ left: -slideStep(), behavior: 'smooth' }); });
    on($('#car-next'), 'click', function () { track.scrollBy({ left: slideStep(), behavior: 'smooth' }); });
    var carTick = false;
    on(track, 'scroll', function () { if (!carTick) { requestAnimationFrame(function () { updateCount(); carTick = false; }); carTick = true; } }, { passive: true });
    updateCount();
  }

  /* ===== Lightbox (Alle Projekte) =====
     Owner-Regel: KEIN ba-proof, KEIN "Beispielfoto:"-Alt-Text.
     Nur die funktionalen Vorher/Nachher-Tags des Sliders bleiben. */
  var lb = $('#lightbox'), lbStage = $('#lb-stage'), lbCap = $('#lb-cap'), lbLast = null;
  if (lb && lbStage) {
    var lbOpen = function (slug, cap, sub) {
      lbStage.innerHTML =
        '<div class="ba" style="--pos:50%">' +
        '<img src="/assets/img/vn/' + slug + '_nachher.jpg" alt="' + cap + ' nach dem Schnitt" width="864" height="1036">' +
        '<img class="ba-top" src="/assets/img/vn/' + slug + '_vorher.jpg" alt="' + cap + ' vor dem Schnitt" width="864" height="1036">' +
        '<div class="ba-line"></div><div class="ba-knob" aria-hidden="true"></div>' +
        '<span class="ba-tag tag-v">Vorher</span><span class="ba-tag tag-n">Nachher</span>' +
        '<input type="range" min="0" max="100" value="50" step="1" aria-label="Vorher-Nachher-Vergleich ' + cap + '">' +
        '</div>';
      if (lbCap) lbCap.innerHTML = '<b>' + cap + '</b>' + (sub || '');
      initBA(lbStage.querySelector('.ba'));
      lb.hidden = false;
      document.body.classList.add('lb-open');
      var c = lb.querySelector('.lb-close'); if (c) c.focus();
    };
    var lbClose = function () {
      lb.hidden = true;
      document.body.classList.remove('lb-open');
      lbStage.innerHTML = '';
      if (lbLast) lbLast.focus();
    };
    $$('.thumb[data-slug]').forEach(function (t) {
      on(t, 'click', function () { lbLast = t; lbOpen(t.dataset.slug, t.dataset.cap, t.dataset.sub || ''); });
    });
    $$('[data-close]', lb).forEach(function (c) { on(c, 'click', lbClose); });
    on(window, 'keydown', function (e) { if (e.key === 'Escape' && !lb.hidden) lbClose(); });
  }

  /* ===== FAQ: Accordion (nur eins offen) + Sofort-Filter ===== */
  var faqItems = $$('.faq details');
  if (faqItems.length) {
    faqItems.forEach(function (d) {
      on(d, 'toggle', function () {
        if (d.open) $$('.faq details[open]').forEach(function (o) { if (o !== d) o.open = false; });
      });
    });
    var faqInput = $('#faq-input'), faqCount = $('#faq-count'), faqEmpty = $('#faq-empty');
    if (faqInput) {
      var faqFilter = function () {
        var q = faqInput.value.trim().toLowerCase(), n = 0;
        faqItems.forEach(function (d) {
          var hit = !q || d.textContent.toLowerCase().indexOf(q) > -1;
          d.classList.toggle('hide', !hit);
          if (hit) n++;
        });
        if (faqCount) faqCount.textContent = q ? (n + ' von ' + faqItems.length + ' Fragen passen zu „' + faqInput.value.trim() + '“') : '';
        if (faqEmpty) faqEmpty.classList.toggle('show', n === 0);
      };
      on(faqInput, 'input', faqFilter);
    }
  }

  /* ===== Servicegebiet: Karte + Liste synchron ===== */
  var mapInfo = $('#map-info');
  var mapDots = $$('.map-dot');
  var ortBtns = $$('.ortbtn');
  if (mapDots.length || ortBtns.length) {
    var ortTexte = {
      'Falkensee': 'Falkensee ist unser Standort — Darmstädter Str. 15. Kürzeste Wege, schnellste Termine.',
      'Seeburg': 'Seeburg liegt in unserem Kerngebiet — kostenlose Besichtigung, Anfahrt im Festpreis enthalten.',
      'Dallgow-Döberitz': 'Dallgow-Döberitz liegt in unserem Kerngebiet — kostenlose Besichtigung, Anfahrt im Festpreis enthalten.',
      'Rohrbeck': 'Rohrbeck liegt in unserem Kerngebiet — kostenlose Besichtigung, Anfahrt im Festpreis enthalten.',
      'Brieselang': 'Brieselang liegt in unserem Kerngebiet — kostenlose Besichtigung, Anfahrt im Festpreis enthalten.',
      'Schönwalde-Glien': 'Schönwalde-Glien liegt in unserem Kerngebiet — kostenlose Besichtigung, Anfahrt im Festpreis enthalten.',
      'Wustermark': 'Wustermark liegt in unserem Kerngebiet — kostenlose Besichtigung, Anfahrt im Festpreis enthalten.',
      'Elstal': 'Elstal liegt in unserem Kerngebiet — kostenlose Besichtigung, Anfahrt im Festpreis enthalten.',
      'Berlin-Staaken': 'Berlin-Staaken grenzt direkt an Falkensee — auch hier: kostenlose Besichtigung, Anfahrt im Festpreis enthalten.'
    };
    var ortSelect = function (name) {
      mapDots.forEach(function (d) { d.classList.toggle('on', d.dataset.ort === name); });
      ortBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.ort === name ? 'true' : 'false'); });
      if (mapInfo) mapInfo.textContent = ortTexte[name] || '';
    };
    ortBtns.forEach(function (b) { on(b, 'click', function () { ortSelect(b.dataset.ort); }); });
    mapDots.forEach(function (d) { on(d, 'click', function () { ortSelect(d.dataset.ort); }); });
  }

  /* ===== [D3] Öffnungszeiten-Erreichbarkeits-Chip =====
     Mo–Fr 8–18 · Sa 8–14 · So geschlossen. new Date() im Browser ok. */
  (function () {
    var chips = $$('[data-erreichbar]');
    if (!chips.length) return;
    var d = new Date(), day = d.getDay(), h = d.getHours() + d.getMinutes() / 60;
    var open = false;
    if (day >= 1 && day <= 5) open = (h >= 8 && h < 18);        // Mo–Fr
    else if (day === 6)      open = (h >= 8 && h < 14);         // Sa
    // So: geschlossen
    var txt = open
      ? 'Jetzt erreichbar'
      : 'Gerade geschlossen — schreiben Sie uns jetzt per WhatsApp';
    chips.forEach(function (c) {
      c.classList.remove('is-open', 'is-closed');
      c.classList.add(open ? 'is-open' : 'is-closed');
      var label = c.querySelector('[data-erreichbar-text]') || c;
      if (label !== c) label.textContent = txt;
      else {
        // ohne dedizierten Text-Slot: Dot erhalten, Rest ersetzen
        var dot = c.querySelector('.ec-dot');
        c.textContent = '';
        if (dot) c.appendChild(dot); else { var s = document.createElement('span'); s.className = 'ec-dot'; c.appendChild(s); }
        c.appendChild(document.createTextNode(' ' + txt));
      }
    });
  })();

  /* ===== [D8] Gold-Dedup: nur EIN Gold pro Viewport =====
     Ist ein .btn-acc sichtbar, wird die Gold-WhatsApp-Fläche der Sticky-Bar
     stumm geschaltet (.scta-muted → grün/outline). */
  (function () {
    var scta = $('.scta'); var accs = $$('.btn-acc');
    if (!scta || !accs.length || !('IntersectionObserver' in window)) return;
    var visible = new Set();
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target);
      });
      scta.classList.toggle('scta-muted', visible.size > 0);
    }, { threshold: .5 });
    accs.forEach(function (a) { io.observe(a); });
  })();

  /* ===== Reveal on scroll =====
     GUARD .rv:not(.in): der Generator emittiert bereits einen Inline-Reveal-
     Observer über .rv:not(.in). Hier NICHT doppeln — nur noch offene .rv
     beobachten (idempotent, Fallback für JS-nach-Inline-Fälle). */
  var rvs = $$('.rv:not(.in)');
  if (rvs.length) {
    if ('IntersectionObserver' in window) {
      var io2 = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io2.unobserve(e.target); } });
      }, { threshold: .12 });
      rvs.forEach(function (el) { io2.observe(el); });
    } else {
      rvs.forEach(function (el) { el.classList.add('in'); });   // Fallback: sichtbar
    }
  }
})();
