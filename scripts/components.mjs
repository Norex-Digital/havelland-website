// components.mjs — reine HTML-String-Emitter fuer die Havelland-Voll-Print-Komponenten.
// ZERO deps, ESM, jede Funktion null-safe. Klassen-Hooks 1:1 aus
//   previews/assets/css/preview-kit.css + previews/assets/js/preview-kit.js
// (im Worktree als assets/css/site.css + assets/js/site.js verdrahtet).
// Owner-Regel: KEINE Bild-Labels — kein .ba-proof / .pbadge / "Beispielfoto" / "Echte Auftragsfotos".
// KEINE Preise. GbR-Gruender-Duo (kein Ich/Inhaber). Echte Umlaute.
//
// Daten-Quelle je Funktion:
//   baSlider ......... preview-kit.css .ba (lock-v2 Z.150-171)              — Sub-Fragment
//   garantienStrip ... generate.mjs gstrip-Konstante / lock-v2 Z.474-482
//   schnittkalender .. lock-v2 Z.559-584 (12 Monate + Bars + § 39-Zeile)
//   heckenKompass .... lock-v2 Z.594-782 (8 Arten, Texte 1:1)
//   jahreszeiten ..... lock-v2 Z.540-557 (4 Karten, hero-home-*)
//   echtProjekt ...... lock-v2 Z.786-808 (echtes Paar, quer, OHNE Badge)
//   karussell ........ lock-v2 Z.817-935 (car-track + car-nav)
//   archivGrid ....... lock-v2 Z.939-978 (pgrid + thumb-cta + Lightbox)
//   whatsappFlow ..... lock-v2 Z.980-1014 (3 Schritte + Noah-Bild)
//   auftragsTimeline . lock-v2 Z.1016-1060 (4 Stationen)
//   uspBand .......... lock-v2 Z.1062-1074 (4 USP)
//   faqFilter ........ lock-v2 Z.1076-1126 (faq-search + native details)
//   gebietskarte ..... lock-v2 Z.1128-1168 (SVG-Karte 9 Orte + ortlist)
//   trustBadges ...... preview-kit.css .trustbadges (D17)
//   fristband ........ preview-kit.css .fristband (D7, § 39 BNatSchG)
//   aeoKapsel ........ AEO-"kurze Antwort"-Kapsel (Ratgeber)
//   beweisMechanik ... Reinigungs-Beweisblock ohne Slider (3 Schritte)

const VN  = '/assets/img/vn';       // Original-JPG-Splits (NICHT im AVIF-Manifest -> direkt als <img>)
const ARB = '/assets/img/arbeit';   // echtes Paar + Noah-Arbeitsbilder
const IMG = '/assets/img';          // hero-home-* Jahreszeitenbilder
const WA_NUM = '4915156198195';
const TEL = '+4915156198195';
const TEL_DISP = '01515 6198195';

const esc = t => (t == null ? '' : String(t))
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const waHref = q => `https://wa.me/${WA_NUM}?text=${encodeURIComponent(q == null ? '' : String(q))}`;
const arr = v => Array.isArray(v) ? v : (v == null ? [] : [v]);

// ---------------------------------------------------------------------------
// baSlider — .ba-Fragment (Range-Input, ba-line, ba-knob, ba-tag v/n) OHNE Label-Span.
// quer=true -> .ba.ba-quer + 2048x1536, sonst 864x1036. hint -> Regler-Hinweis. lcp -> fetchpriority.
// slug baut VN-Pfade; alternativ vorher/nachher als fertige src.
// ---------------------------------------------------------------------------
export function baSlider({ slug = '', vorher = '', nachher = '', alt = '', cap = '', sub = '',
  quer = false, hint = false, lcp = false, w, h } = {}) {
  const nSrc = nachher || (slug ? `${VN}/${slug}_nachher.jpg` : '');
  const vSrc = vorher || (slug ? `${VN}/${slug}_vorher.jpg` : '');
  if (!nSrc || !vSrc) return '';
  const W = w || (quer ? 2048 : 864);
  const H = h || (quer ? 1536 : 1036);
  const base = esc(alt || cap || 'Heckenschnitt');
  const pr = lcp ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"';
  const ba =
    `<div class="ba${quer ? ' ba-quer' : ''}" style="--pos:50%">` +
    `<img src="${esc(nSrc)}" alt="${base} — nach dem Schnitt" width="${W}" height="${H}" ${pr}>` +
    `<img class="ba-top" src="${esc(vSrc)}" alt="${base} — vor dem Schnitt" width="${W}" height="${H}" ${pr}>` +
    `<div class="ba-line"></div><div class="ba-knob" aria-hidden="true"></div>` +
    `<span class="ba-tag tag-v">Vorher</span><span class="ba-tag tag-n">Nachher</span>` +
    `<input type="range" min="0" max="100" value="50" step="1" aria-label="Vorher-Nachher-Vergleich ${base}">` +
    (hint ? `<span class="hint">&#9666; Regler ziehen &#9656;</span>` : '') +
    `</div>`;
  if (!cap) return ba;
  return ba + `<p class="ba-cap"><b>${esc(cap)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</p>`;
}

// ---------------------------------------------------------------------------
// garantienStrip — feste 3-Zusagen-Leiste (identisch zur generate.mjs gstrip-Konstante). Ohne Bild/Label.
// ---------------------------------------------------------------------------
export function garantienStrip() {
  return `<section class="gstrip" aria-label="Unsere drei Zusagen"><div class="wrap"><div class="gstrip-grid">` +
    `<div class="gs rv"><span class="gn">01</span><div><h3>Festpreis ist Endpreis</h3><p>Nach der kostenlosen Besichtigung steht Ihr Preis — inklusive Abfuhr, ohne Nachforderung.</p></div></div>` +
    `<div class="gs rv d1"><span class="gn">02</span><div><h3>Foto-Nachweis</h3><p>Vorher-/Nachher-Fotos nach jedem Auftrag, direkt aufs Handy — auch wenn Sie nicht da waren.</p></div></div>` +
    `<div class="gs rv d2"><span class="gn">03</span><div><h3>Ein Ansprechpartner</h3><p>Vom ersten Anruf bis zur Abnahme feste Gesichter — kein Callcenter, keine Warteschleife.</p></div></div>` +
    `</div></div></section>`;
}

// ---------------------------------------------------------------------------
// schnittkalender — .cal Karte: 12 Monats-Buttons (data-m) + Legende + cal-hint + § 39-Zeile.
// Bars/Daten 1:1 aus lock-v2 Z.569-583. cal-hint fuellt site.js (calHints[]), .now via new Date() im Browser.
// Rueckgabe: nur die .cal-Karte (in eine Sektion einbetten).
// ---------------------------------------------------------------------------
const CAL_MONTHS = [
  ['Jan', 'f-ok', 'r-ok'], ['Feb', 'f-ideal', 'r-ok'], ['Mär', 'f-ideal', 'r-no'],
  ['Apr', 'f-ok', 'r-no'], ['Mai', 'f-ok', 'r-no'], ['Jun', 'f-ideal', 'r-no'],
  ['Jul', 'f-ok', 'r-no'], ['Aug', 'f-ok', 'r-no'], ['Sep', 'f-ok', 'r-no'],
  ['Okt', 'f-ok', 'r-ok'], ['Nov', 'f-ok', 'r-ok'], ['Dez', 'f-ok', 'r-ok']
];
export function schnittkalender({ heading = 'Wann schneidet man was? Der Schnittkalender.' } = {}) {
  const months = CAL_MONTHS.map(([ab, f, r], i) =>
    `<button class="cal-m" data-m="${i}"><span class="ab">${ab}</span>` +
    `<span class="bars" aria-hidden="true"><i class="${f}"></i><i class="${r}"></i></span></button>`).join('');
  return `<div class="cal rv" id="kalender">` +
    `<div class="cal-head"><h3>${esc(heading)}</h3>` +
    `<div class="cal-legend" aria-hidden="true">` +
    `<span><i class="li-ideal"></i> ideales Fenster</span>` +
    `<span><i class="li-ok"></i> möglich</span>` +
    `<span><i class="li-no"></i> gesetzlich gesperrt</span></div></div>` +
    `<div class="cal-months" role="group" aria-label="Monate — antippen für Details">${months}</div>` +
    `<p class="cal-hint" id="cal-hint" aria-live="polite"></p>` +
    `<p class="cal-law">Obere Leiste: Pflege- und Formschnitt. Untere Leiste: starker Rückschnitt — vom 1. März bis 30. September zum Schutz brütender Vögel gesetzlich untersagt (§ 39 BNatSchG). Wir planen jeden Schnitt passend zu diesen Fristen.</p>` +
    `</div>`;
}

// ---------------------------------------------------------------------------
// heckenKompass — .pills (8 Arten-Tabs) + .kpanel je Art (Slider + kinfo). Texte 1:1 aus lock-v2.
// Rueckgabe: Sektion mit Ueberschrift + Pills + Panels.
// ---------------------------------------------------------------------------
const HECKEN = [
  { id: 'thuja', tab: 'Thuja', slug: '14-10-thuja', cap: 'Thuja', sub: 'Regler ziehen zum Vergleichen',
    h3: 'Thuja (Lebensbaum)', lat: 'Thuja occidentalis',
    schnitt: 'Formschnitt ideal Ende Juni, zweiter leichter Schnitt bis September möglich.',
    bes: 'Treibt aus altem Holz nicht neu aus — deshalb nie zu tief schneiden, sondern regelmäßig in Form halten. Genau dafür sind wir da.' },
  { id: 'kirschlorbeer', tab: 'Kirschlorbeer', slug: '21-kirschlorbeer-anthrazit-kubisch', cap: 'Kirschlorbeer', sub: 'kubisch geschnitten',
    h3: 'Kirschlorbeer', lat: 'Prunus laurocerasus',
    schnitt: 'Hauptschnitt Ende Juni, bei starkem Wuchs zweiter Schnitt Ende August.',
    bes: 'Große Blätter: Nach dem Maschinenschnitt schneiden wir angeschnittene Blätter mit der Handschere nach — sonst werden die Ränder braun.' },
  { id: 'liguster', tab: 'Liguster', slug: '10-03-liguster-23m', cap: 'Liguster', sub: '23 laufende Meter',
    h3: 'Liguster', lat: 'Ligustrum vulgare',
    schnitt: 'Sehr schnittverträglich — verträgt zwei bis drei Schnitte pro Jahr, klassisch Juni und August.',
    bes: 'Wächst schnell und dicht. Wer den Sommerschnitt auslässt, verliert die Kante — im 14-tägigen Pflege-Abo passiert das nicht.' },
  { id: 'eibe', tab: 'Eibe', slug: '11-04-eibe-24m', cap: 'Eibe', sub: '24 laufende Meter',
    h3: 'Eibe', lat: 'Taxus baccata',
    schnitt: 'Formschnitt Ende Juni, zweiter Schnitt bis Ende August möglich.',
    bes: 'Die einzige Nadelhecke, die aus altem Holz zuverlässig neu austreibt — selbst stark eingewachsene Eiben lassen sich wieder in Form bringen (radikal nur Oktober bis Februar).' },
  { id: 'hainbuche', tab: 'Hainbuche', slug: '16-hainbuche-villa-walmdach', cap: 'Hainbuche', sub: 'vor Villa mit Walmdach',
    h3: 'Hainbuche', lat: 'Carpinus betulus',
    schnitt: 'Hauptschnitt um den Johannistag (Ende Juni) — dann hält die Form bis zum Winter.',
    bes: 'Robust und formstabil, verzeiht auch kräftige Korrekturen. Ein Teil des trockenen Laubs bleibt im Winter hängen und gibt weiter Sichtschutz.' },
  { id: 'rotbuche', tab: 'Rotbuche', slug: '20-rotbuche-grau-einfahrt', cap: 'Rotbuche', sub: 'an der Einfahrt',
    h3: 'Rotbuche', lat: 'Fagus sylvatica',
    schnitt: 'Wie die Hainbuche: Hauptschnitt Ende Juni, Korrekturen im Winterhalbjahr.',
    bes: 'Hält ihr braunes Laub fast den ganzen Winter — dichter Sichtschutz auch in der kalten Jahreszeit.' },
  { id: 'glanzmispel', tab: 'Glanzmispel', slug: '05-05-glanzmispel', cap: 'Glanzmispel', sub: 'Regler ziehen zum Vergleichen',
    h3: 'Glanzmispel', lat: 'Photinia fraseri',
    schnitt: 'Nach dem roten Austrieb im späten Frühjahr — nicht mehr spät im Herbst schneiden.',
    bes: 'Frostempfindlicher als heimische Arten. Der richtige Zeitpunkt entscheidet, ob der leuchtend rote Neuaustrieb im nächsten Jahr wiederkommt.' },
  { id: 'feldahorn', tab: 'Feldahorn', slug: '07-03-feldahorn', cap: 'Feldahorn', sub: 'Regler ziehen zum Vergleichen',
    h3: 'Feldahorn', lat: 'Acer campestre',
    schnitt: 'Ein bis zwei Schnitte pro Jahr, klassisch Juni und September.',
    bes: 'Heimisch, robust, gut für Vögel und Insekten — und trotzdem sauber in Form zu halten.' }
];
export function heckenKompass({ heading = 'Welche Hecke steht bei <em>Ihnen?</em>',
  intro = 'Jede Heckenart will anders geschnitten werden. Wählen Sie Ihre Art — wir zeigen einen Vergleich und sagen Ihnen, wann der richtige Zeitpunkt ist.',
  galerieHref = '#galerie' } = {}) {
  const pills = HECKEN.map((a, i) =>
    `<button class="pill" role="tab" id="ktab-${a.id}" aria-selected="${i === 0 ? 'true' : 'false'}" aria-controls="kp-${a.id}">${esc(a.tab)}</button>`).join('');
  const panels = HECKEN.map((a, i) =>
    `<div class="kpanel" id="kp-${a.id}" role="tabpanel" aria-labelledby="ktab-${a.id}"${i === 0 ? '' : ' hidden'}>` +
    `<div class="kstage">${baSlider({ slug: a.slug, alt: a.h3 + '-Hecke', cap: a.cap, sub: a.sub })}</div>` +
    `<div class="kinfo"><h3>${esc(a.h3)}</h3><p class="lat">${esc(a.lat)}</p>` +
    `<div class="krow"><span class="kl">Schnittfenster</span><span class="kv">${esc(a.schnitt)}</span></div>` +
    `<div class="krow"><span class="kl">Besonderheit</span><span class="kv">${esc(a.bes)}</span></div>` +
    `<p class="kmehr"><a href="${esc(galerieHref)}">Alle Ergebnisse ansehen →</a></p></div></div>`).join('');
  return `<section class="sec" id="heckenarten"><div class="wrap">` +
    `<div class="head"><h2 class="rv">${heading}</h2></div><p class="intro rv">${esc(intro)}</p>` +
    `<div class="pills" role="tablist" aria-label="Heckenart wählen">${pills}</div>${panels}` +
    `<p class="knote rv">Für alle Arten gilt: Der schonende Formschnitt ist das ganze Jahr erlaubt. Starker Rückschnitt und Auf-den-Stock-Setzen nur vom 1. Oktober bis 28. Februar (§ 39 BNatSchG).</p>` +
    `</div></section>`;
}

// ---------------------------------------------------------------------------
// jahreszeiten — .jz-grid, 4 Karten (hero-home-*). OHNE pbadge-Label.
// ---------------------------------------------------------------------------
const JZ = [
  ['fruehjahr', 'Frühjahr', 'Garten im Frühjahr im Havelland', 'März – Mai', 'Beete vorbereiten, erster Formschnitt', ''],
  ['', 'Sommer', 'Garten im Sommer im Havelland', 'Juni – August', 'Rasen, Hecke, Bewässerung im Blick', 'd1'],
  ['herbst', 'Herbst', 'Garten im Herbst im Havelland', 'September – November', 'Laub, letzter Schnitt vor dem Winter', 'd2'],
  ['winter', 'Winter', 'Garten im Winter im Havelland', 'Dezember – Februar', 'Rückschnitt-Zeit, Winterdienst', 'd3']
];
export function jahreszeiten({ heading = 'Ein Garten durch <em>vier Jahreszeiten.</em>',
  intro = 'Gartenpflege hört nicht im Sommer auf. Wer uns im Abo bucht, bekommt zu jeder Jahreszeit das, was gerade ansteht — ohne selbst an Termine denken zu müssen.' } = {}) {
  const cards = JZ.map(([key, name, alt, spanne, tun, d]) => {
    const src = `${IMG}/hero-home${key ? '-' + key : ''}-1024.jpg`;
    return `<figure class="jz rv${d ? ' ' + d : ''}"><div class="photo">` +
      `<img src="${src}" alt="${esc(alt)}" loading="lazy" decoding="async" width="1024" height="768">` +
      `<span class="jn">${esc(name)}</span></div>` +
      `<figcaption class="ba-cap"><b>${esc(spanne)}</b><span>${esc(tun)}</span></figcaption></figure>`;
  }).join('');
  return `<div class="head"><h2 class="rv">${heading}</h2></div>` +
    `<p class="intro rv">${esc(intro)}</p><div class="jz-grid">${cards}</div>`;
}

// ---------------------------------------------------------------------------
// echtProjekt — .echt-card mit dem ECHTEN Paar (quer). OHNE Gold-Badge, Text neutral.
// ---------------------------------------------------------------------------
export function echtProjekt() {
  return `<div class="echt-card rv"><div class="ebody">` +
    `<h3>Ein dokumentiertes Kundenprojekt.</h3>` +
    `<p>Thuja-Rückschnitt bei einem Kunden — mit dem Handy direkt vom Einsatz fotografiert. Kein Studio, kein Nachbearbeiten: Die Plane mit dem Schnittgut liegt noch im Bild. Genau so sieht der Foto-Nachweis aus, den Sie nach jedem Auftrag aufs Handy bekommen.</p>` +
    `<div class="echt-next"><b>Platz reserviert.</b> Hier dokumentieren wir laufend weitere Aufträge — der nächste könnte Ihrer sein.</div></div>` +
    `<div>${baSlider({ vorher: `${ARB}/echt-heckenschnitt-vorher.jpg`, nachher: `${ARB}/echt-heckenschnitt-nachher.jpg`, alt: 'Thuja-Rückschnitt vom Einsatz', cap: 'Thuja-Rückschnitt', sub: 'vom Einsatz fotografiert', quer: true })}</div>` +
    `</div>`;
}

// ---------------------------------------------------------------------------
// VN-Metadaten (Slug -> cap/sub/tcap/alt) — Quelle lock-v2 pgrid Z.940-959.
// ---------------------------------------------------------------------------
const VN_META = {
  '02-02-kirschlorbeer': { cap: 'Kirschlorbeer', sub: 'wieder auf Kante', tcap: 'Kirschlorbeer', alt: 'Kirschlorbeer-Hecke' },
  '04-04-hainbuche': { cap: 'Hainbuche', sub: 'gerade Flanken', tcap: 'Hainbuche', alt: 'Hainbuchen-Hecke' },
  '05-05-glanzmispel': { cap: 'Glanzmispel', sub: 'nach dem Austrieb geschnitten', tcap: 'Glanzmispel', alt: 'Glanzmispel-Hecke' },
  '06-02-thuja-grenze': { cap: 'Thuja', sub: 'Grundstücksgrenze', tcap: 'Thuja · Grenze', alt: 'Thuja-Hecke an der Grundstücksgrenze' },
  '07-03-feldahorn': { cap: 'Feldahorn', sub: 'heimische Hecke in Form', tcap: 'Feldahorn', alt: 'Feldahorn-Hecke' },
  '08-04-kirschlorbeer': { cap: 'Kirschlorbeer', sub: 'Rückschnitt auf Form', tcap: 'Kirschlorbeer', alt: 'Kirschlorbeer-Hecke' },
  '10-03-liguster-23m': { cap: 'Liguster', sub: '23 laufende Meter', tcap: 'Liguster · 23 m', alt: 'Liguster-Hecke, 23 laufende Meter' },
  '11-04-eibe-24m': { cap: 'Eibe', sub: '24 laufende Meter', tcap: 'Eibe · 24 m', alt: 'Eiben-Hecke, 24 laufende Meter' },
  '14-10-thuja': { cap: 'Thuja', sub: 'in Form gehalten', tcap: 'Thuja', alt: 'Thuja-Hecke' },
  '14-liguster-weiss-anthrazit': { cap: 'Liguster', sub: 'am Neubau', tcap: 'Liguster', alt: 'Liguster-Hecke am Neubau' },
  '15-12-rotbuche': { cap: 'Rotbuche', sub: 'saubere Deckelung', tcap: 'Rotbuche', alt: 'Rotbuchen-Hecke' },
  '15-kirschlorbeer-grau-balkon': { cap: 'Kirschlorbeer', sub: 'unterm Balkon', tcap: 'Kirschlorbeer', alt: 'Kirschlorbeer-Hecke unter dem Balkon' },
  '16-hainbuche-villa-walmdach': { cap: 'Hainbuche', sub: 'vor Villa mit Walmdach', tcap: 'Hainbuche · Villa', alt: 'Hainbuchen-Hecke vor einer Villa mit Walmdach' },
  '20-rotbuche-grau-einfahrt': { cap: 'Rotbuche', sub: 'an der Einfahrt', tcap: 'Rotbuche · Einfahrt', alt: 'Rotbuchen-Hecke an der Einfahrt' },
  '21-kirschlorbeer-anthrazit-kubisch': { cap: 'Kirschlorbeer', sub: 'kubisch geschnitten', tcap: 'Kirschlorbeer · kubisch', alt: 'Kirschlorbeer-Hecke kubisch geschnitten' },
  '23-eibe-weiss-anthrazit': { cap: 'Eibe', sub: 'klare Linie', tcap: 'Eibe', alt: 'Eiben-Hecke, klare Linie' },
  '24-eibe-klinker-einfahrt': { cap: 'Eibe', sub: 'an der Klinker-Einfahrt', tcap: 'Eibe · Einfahrt', alt: 'Eiben-Hecke an der Klinker-Einfahrt' },
  '25-eibe-gelb-beige-gate': { cap: 'Eibe', sub: 'am Gartentor', tcap: 'Eibe · am Tor', alt: 'Eiben-Hecke am Gartentor' },
  '26-eibe-grau-kubisch': { cap: 'Eibe', sub: 'kubische Form', tcap: 'Eibe · kubisch', alt: 'Eiben-Hecke kubisch geschnitten' },
  '27-eibe-creme-walmdach': { cap: 'Eibe', sub: 'am Walmdach-Haus', tcap: 'Eibe · Walmdach', alt: 'Eiben-Hecke vor Walmdach-Haus' }
};
const VN_ALL = Object.keys(VN_META);
const CAR_DEFAULT = ['02-02-kirschlorbeer', '04-04-hainbuche', '08-04-kirschlorbeer', '14-liguster-weiss-anthrazit',
  '15-12-rotbuche', '15-kirschlorbeer-grau-balkon', '23-eibe-weiss-anthrazit', '24-eibe-klinker-einfahrt',
  '26-eibe-grau-kubisch', '27-eibe-creme-walmdach'];

// ---------------------------------------------------------------------------
// karussell — .car > .car-track (#car-track) mit N Figuren + car-nav (#car-prev/#car-next/#car-count).
// ---------------------------------------------------------------------------
export function karussell(slugs) {
  const list = (arr(slugs).length ? arr(slugs) : CAR_DEFAULT).filter(s => VN_META[s]);
  if (!list.length) return '';
  const figs = list.map(s => {
    const m = VN_META[s];
    return `<figure>${baSlider({ slug: s, alt: m.alt })}` +
      `<figcaption class="ba-cap"><b>${esc(m.cap)}</b><span>${esc(m.sub)}</span></figcaption></figure>`;
  }).join('');
  return `<div class="car rv"><div class="car-track" id="car-track" tabindex="0" aria-label="Karussell mit Vorher-Nachher-Vergleichen — horizontal scrollen">${figs}</div>` +
    `<div class="car-nav">` +
    `<button class="car-btn" id="car-prev" aria-label="Vorheriger Vergleich"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></button>` +
    `<button class="car-btn" id="car-next" aria-label="Nächster Vergleich"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>` +
    `<span class="car-count" id="car-count" aria-live="polite">1 / ${list.length}</span></div></div>`;
}

// ---------------------------------------------------------------------------
// archivGrid — .pgrid mit .thumb-Buttons (data-slug/cap/sub) + thumb-cta + Lightbox (#lightbox).
// ---------------------------------------------------------------------------
export function archivGrid(slugs, { ctaHref = '#kontakt' } = {}) {
  const list = (arr(slugs).length ? arr(slugs) : VN_ALL).filter(s => VN_META[s]);
  const thumbs = list.map(s => {
    const m = VN_META[s];
    return `<button class="thumb" data-slug="${esc(s)}" data-cap="${esc(m.cap)}" data-sub="${esc(m.sub)}">` +
      `<img src="${VN}/${s}_nachher.jpg" alt="${esc(m.alt)} — Vorher-Nachher-Vergleich öffnen" loading="lazy" decoding="async" width="864" height="1036">` +
      `<span class="tvn">Vorher ↔ Nachher</span><span class="tcap">${esc(m.tcap)}</span></button>`;
  }).join('');
  const cta = `<div class="thumb-cta"><b>Ihr Projekt?</b><p>Dieser Platz ist für das nächste Kundenprojekt reserviert — dokumentiert mit Vorher/Nachher-Fotos.</p><a href="${esc(ctaHref)}">Kostenlose Besichtigung →</a></div>`;
  const lightbox = `<div class="lb" id="lightbox" role="dialog" aria-modal="true" aria-label="Vorher-Nachher-Ansicht" hidden>` +
    `<button class="lb-back" data-close tabindex="-1" aria-label="Schließen"></button>` +
    `<div class="lb-box"><button class="lb-close" data-close aria-label="Ansicht schließen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button>` +
    `<div class="lb-stage" id="lb-stage"></div><p class="lb-cap" id="lb-cap"></p></div></div>`;
  return `<div class="pgrid rv">${thumbs}${cta}</div>${lightbox}`;
}

// ---------------------------------------------------------------------------
// whatsappFlow — .wa-grid, 3 Schritte + wa.me-CTA (Kontext vorausgefuellt) + Noah-Arbeitsbild (kein Label).
// ---------------------------------------------------------------------------
export function whatsappFlow({ gewerk = 'meiner Hecke', ort = '',
  heading = 'Ein Handy-Foto <em>reicht.</em>' } = {}) {
  const ortTeil = ort ? ` in ${ort}` : '';
  const text = `Hallo, hier ein Foto von ${gewerk}${ortTeil} — was würde das kosten?`;
  return `<div class="wa-grid"><div>` +
    `<span class="kick rv"><span class="dot"></span> Der schnellste Weg</span>` +
    `<div class="head" style="margin-top:14px"><h2 class="rv">${heading}</h2></div>` +
    `<p class="intro rv" style="margin-bottom:30px">Sie müssen nichts ausmessen und kein Formular ausfüllen. Drei Schritte, dann kümmern wir uns.</p>` +
    `<ol class="wa-steps rv d1">` +
    `<li class="wa-step"><span class="wn">1</span><div><h3>Fotografieren</h3><p>Einmal längs, einmal von vorn — so sehen wir Höhe, Länge und Zugang.</p></div></li>` +
    `<li class="wa-step"><span class="wn">2</span><div><h3>Per WhatsApp senden</h3><p>An ${TEL_DISP}, gern mit zwei Sätzen dazu: Was soll passieren, wo stehen Sie?</p></div></li>` +
    `<li class="wa-step"><span class="wn">3</span><div><h3>Antwort in Stunden</h3><p>Erste Einschätzung und Termin für die kostenlose Besichtigung — danach steht Ihr Festpreis.</p></div></li>` +
    `</ol>` +
    `<div class="wa-cta rv d2"><a class="btn btn-acc" href="${waHref(text)}">Foto per WhatsApp senden</a>` +
    `<a class="tel-quiet" href="tel:${TEL}">lieber anrufen: ${TEL_DISP}</a></div></div>` +
    `<div class="wa-stage rv d2"><div class="pframe" style="box-shadow:var(--sh-photo)">` +
    `<img src="${ARB}/hecke-hinten-schere-noah.jpg" alt="Heckenschnitt mit der Heckenschere an einer Hecke" loading="lazy" decoding="async" width="2400" height="2979"></div>` +
    `<p class="ba-cap"><b>Handarbeit, wo es drauf ankommt</b><span>Kanten &amp; Ecken</span></p></div></div>`;
}

// ---------------------------------------------------------------------------
// auftragsTimeline — .tl, 4 Stationen (Anfrage / Besichtigung+Festpreis / Ausfuehrung / Foto-Nachweis).
// Ohne .timg-Bilder (optionale Deko, vermeidet 404).
// ---------------------------------------------------------------------------
const TL = [
  ['Tag 1 · Antwort meist in Stunden', 'Anfrage', 'Per Telefon oder WhatsApp kurz schildern, was ansteht — gern mit Fotos. Sie bekommen eine erste Rückmeldung, keine Warteschleife.'],
  ['Kurzfristig · kostenlos', 'Besichtigung &amp; Festpreis', 'Wir kommen vorbei, schauen uns alles an und nennen Ihnen einen Festpreis — inklusive Abfuhr. Der Preis steht, bevor wir anfangen.'],
  ['Zum vereinbarten Termin', 'Saubere Ausführung', 'Pünktlich, gründlich, fristgerecht nach § 39 BNatSchG geplant. Wir räumen hinter uns auf — besenrein ist Teil des Preises.'],
  ['Direkt nach der Arbeit', 'Foto-Nachweis aufs Handy', 'Vorher-/Nachher-Fotos Ihres Auftrags, direkt aufs Handy. Sie sehen das Ergebnis auch dann, wenn Sie nicht zu Hause waren.']
];
export function auftragsTimeline() {
  const items = TL.map(([when, h, p], i) =>
    `<div class="tli"><span class="tn">${i + 1}</span><div class="tbody">` +
    `<span class="twhen">${when}</span><h3>${h}</h3><p>${p}</p></div></div>`).join('');
  return `<div class="tl rv">${items}</div>`;
}

// ---------------------------------------------------------------------------
// uspBand — .vals, 4 USP (preview-kit .v h3 .vn).
// ---------------------------------------------------------------------------
const USP = [
  ['01', 'Aus einer Hand', 'Garten, Reinigung, Winterdienst, Entrümpelung — ein Ansprechpartner für alles.'],
  ['02', 'Nachweis statt Versprechen', 'Foto-Dokumentation nach jedem Auftrag, direkt aufs Handy.'],
  ['03', 'Festpreis', 'Kostenlose Besichtigung, klarer Preis — kein Nachkommen.'],
  ['04', 'Schnell erreichbar', 'WhatsApp-Antwort in Stunden, nicht in Tagen.']
];
export function uspBand() {
  const vals = USP.map(([n, h, p], i) =>
    `<div class="v rv d${i + 1}"><h3><span class="vn">${n}</span>${esc(h)}</h3><p>${esc(p)}</p></div>`).join('');
  return `<div class="vals">${vals}</div>`;
}

// ---------------------------------------------------------------------------
// faqFilter — .faq mit faq-search (#faq-input) + faq-count + native <details> + faq-empty. KEIN FAQPage-Schema.
// ---------------------------------------------------------------------------
const FAQ_DEFAULT = [
  { q: 'Wann darf man eine Hecke schneiden?', a: 'Den schonenden Formschnitt dürfen Sie das ganze Jahr über durchführen. Einen starken Rückschnitt oder das Auf-den-Stock-Setzen erlaubt das Bundesnaturschutzgesetz nur zwischen dem 1. Oktober und dem 28. Februar. Vom 1. März bis 30. September sind solche radikalen Eingriffe zum Schutz brütender Vögel untersagt. Wir planen jeden Schnitt passend zu diesen Fristen.' },
  { q: 'Was kostet ein Heckenschnitt im Havelland?', a: 'Einen Pauschalpreis nennen wir nicht ins Blaue, weil Länge, Höhe, Heckenart und Zugang den Aufwand bestimmen. Sie erhalten nach einer kostenlosen Besichtigung vor Ort einen Festpreis, der inklusive Abfuhr des Grünschnitts Ihr Endpreis bleibt.' },
  { q: 'Fahren Sie den Grünschnitt nach dem Schnitt ab?', a: 'Ja, die Abfuhr und Entsorgung des gesamten Grünschnitts gehört bei uns zum Festpreis. Wir laden Äste und Laub auf, kehren die Fläche besenrein und entsorgen das Material ordnungsgemäß.' },
  { q: 'Was kostet eine Besichtigung?', a: 'Die Vor-Ort-Besichtigung ist für Sie kostenlos. Wir schauen uns an, was ansteht, und nennen Ihnen danach einen Festpreis. Der vereinbarte Betrag ist der Endbetrag, ohne Aufschlag am Ende.' },
  { q: 'Bekomme ich alle Leistungen aus einer Hand?', a: 'Ja. Garten, Reinigung, Winterdienst, Entrümpelung und Hausmeisterdienste übernehmen wir mit einem festen Ansprechpartner — Sie müssen nicht für jede Aufgabe einen eigenen Betrieb suchen und koordinieren.' },
  { q: 'Gibt es die Gartenpflege auch regelmäßig im Abo?', a: 'Ja. Auf Wunsch kommen wir im festen 14-tägigen Rhythmus: Rasen, Hecke, Beete, Laub — was die Jahreszeit eben verlangt. Der Rhythmus lässt sich jederzeit anpassen.' },
  { q: 'Was passiert, wenn nach der Reinigung Schlieren bleiben?', a: 'Dann kommen wir am selben Tag noch einmal vorbei und ziehen die betroffenen Scheiben nach — ohne Zusatzkosten. Schlierenfreies Glas ist der Kern unserer Arbeit, deshalb prüfen wir jede Scheibe im Gegenlicht, bevor wir gehen.' },
  { q: 'Wie schnell bekomme ich einen Termin für den Heckenschnitt?', a: 'Eine erste Rückmeldung erhalten Sie nach Ihrer WhatsApp-Anfrage meist innerhalb weniger Stunden. Den Termin für die kostenlose Besichtigung stimmen wir kurzfristig ab. Im Februar ist die Nachfrage am höchsten — fragen Sie früh an.' }
];
export function faqFilter(faqs, { heading = 'Häufige <em>Fragen.</em>' } = {}) {
  const list = arr(faqs).length ? arr(faqs) : FAQ_DEFAULT;
  const items = list.map(f => `<details><summary>${esc(f.q)}<span class="pm" aria-hidden="true"></span></summary><p>${esc(f.a)}</p></details>`).join('');
  return `<div class="head"><h2 class="rv">${heading}</h2></div>` +
    `<p class="intro rv">Kurz und ehrlich beantwortet. Ihre Frage fehlt? <a href="${waHref('Hallo, ich habe eine Frage.')}">Schreiben Sie uns per WhatsApp.</a></p>` +
    `<div class="faq rv"><div class="faq-search">` +
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>` +
    `<input type="search" id="faq-input" placeholder="Frage eintippen, z. B. „Kosten“ oder „Termin“" aria-label="Fragen durchsuchen" autocomplete="off"></div>` +
    `<p class="faq-count" id="faq-count" aria-live="polite"></p>${items}` +
    `<p class="faq-empty" id="faq-empty">Dazu haben wir noch keine Antwort notiert — <a href="${waHref('Hallo, ich habe eine Frage.')}">fragen Sie uns direkt per WhatsApp</a>, wir antworten meist in Stunden.</p>` +
    `</div>`;
}

// ---------------------------------------------------------------------------
// gebietskarte — .gebiet-wrap mit SVG-Karte (9 Orte, Koordinaten fix aus lock-v2) + ortlist.
// map-info-Text + Ortstexte fuellt site.js. orte optional -> ueberschreibt ortlist-Labels.
// ---------------------------------------------------------------------------
// GEBIET_REGIONEN — alle bedienten Haupt-Orte, nach Region gruppiert. px/py = Pin-Position in %
// auf dem selbst gehosteten OSM-Kartenbild (servicegebiet-karte, z11, center 52.55/13.08, 1200x1200).
// Reproduzierbar via scripts/build-servicegebiet-map.py (0 Laufzeit-Requests, DSGVO-sauber).
const GEBIET_REGIONEN = [
  { key: 'west', label: 'Falkensee & West-Havelland', orts: [
    { slug: 'falkensee', name: 'Falkensee', px: 51.6, py: 47.9, anchor: true },
    { slug: 'brieselang', name: 'Brieselang', px: 40.7, py: 42.2 },
    { slug: 'schoenwalde-glien', name: 'Schönwalde-Glien', px: 57.3, py: 37.0 },
    { slug: 'nauen', name: 'Nauen', px: 24.9, py: 38.2 },
    { slug: 'wustermark', name: 'Wustermark', px: 34.6, py: 50.4 },
    { slug: 'ketzin', name: 'Ketzin/Havel', px: 21.4, py: 64.5 },
    { slug: 'dallgow-doeberitz', name: 'Dallgow-Döberitz', px: 46.7, py: 52.3 } ] },
  { key: 'nord', label: 'Oberhavel & Norden', orts: [
    { slug: 'kremmen', name: 'Kremmen', px: 43.3, py: 8.3 },
    { slug: 'oberkraemer', name: 'Oberkrämer', px: 56.4, py: 20.0 },
    { slug: 'leegebruch', name: 'Leegebruch', px: 60.5, py: 13.3 },
    { slug: 'oranienburg', name: 'Oranienburg', px: 69.4, py: 9.0 },
    { slug: 'lehnitz', name: 'Lehnitz', px: 70.3, py: 12.6 },
    { slug: 'velten', name: 'Velten', px: 61.9, py: 22.2 },
    { slug: 'hennigsdorf', name: 'Hennigsdorf', px: 65.2, py: 32.7 },
    { slug: 'hohen-neuendorf', name: 'Hohen Neuendorf', px: 74.7, py: 25.4 },
    { slug: 'birkenwerder', name: 'Birkenwerder', px: 74.7, py: 22.7 },
    { slug: 'glienicke-nordbahn', name: 'Glienicke/Nordbahn', px: 79.1, py: 32.7 } ] },
  { key: 'berlinrand', label: 'Berliner Westrand', orts: [
    { slug: 'berlin-spandau', name: 'Berlin-Spandau', px: 64.6, py: 52.6 },
    { slug: 'gross-glienicke', name: 'Groß Glienicke', px: 53.4, py: 67.0 },
    { slug: 'berlin-gatow', name: 'Berlin-Gatow', px: 62.6, py: 63.6 },
    { slug: 'berlin-kladow', name: 'Berlin-Kladow', px: 57.9, py: 69.2 } ] },
  { key: 'seen', label: 'Havelseen', orts: [
    { slug: 'werder-havel', name: 'Werder (Havel)', px: 32.3, py: 84.2 },
    { slug: 'schwielowsee', name: 'Schwielowsee', px: 34.2, py: 93.1 } ] },
];
// Labels dieser (rechten) Pins nach links öffnen, damit sie nicht über den Kartenrand laufen.
const PINLEFT = new Set(['leegebruch', 'oranienburg', 'lehnitz', 'velten', 'hennigsdorf', 'hohen-neuendorf', 'birkenwerder', 'glienicke-nordbahn', 'berlin-spandau', 'berlin-gatow']);
function gebietMap(activeSlug) {
  const pins = GEBIET_REGIONEN.flatMap(reg => reg.orts).map(o =>
    `<button class="svc-pin${o.anchor ? ' svc-pin--anchor' : ''}${PINLEFT.has(o.slug) ? ' svc-pin--left' : ''}${o.slug === activeSlug ? ' is-active' : ''}" data-ort="${esc(o.name)}" data-slug="${o.slug}" style="left:${o.px}%;top:${o.py}%" aria-label="${esc(o.name)} — in unserem Servicegebiet"><span class="svc-pin-dot"></span><span class="svc-pin-lbl">${esc(o.name)}</span></button>`).join('');
  const img = `<picture><source type="image/webp" srcset="/assets/img/servicegebiet-karte-640.webp 640w, /assets/img/servicegebiet-karte-900.webp 900w, /assets/img/servicegebiet-karte-1200.webp 1200w" sizes="(max-width:900px) 92vw, 560px"><img src="/assets/img/servicegebiet-karte-900.jpg" width="1200" height="1200" alt="Karte des Servicegebiets im Havelland und Berliner Umland mit den bedienten Orten" loading="lazy" decoding="async"></picture>`;
  return `<figure class="svc-map" id="svc-map">${img}<div class="svc-map-pins">${pins}</div><figcaption class="svc-map-attr">Kartendaten © OpenStreetMap-Mitwirkende</figcaption></figure>`;
}
export function gebietskarte({ activeSlug = null, heading = 'Wir fahren dorthin, wo wir <em>pünktlich</em> sein können.' } = {}) {
  const groups = GEBIET_REGIONEN.map(reg => {
    const btns = reg.orts.map(o =>
      `<button class="ortbtn" data-ort="${esc(o.name)}" data-slug="${o.slug}" aria-pressed="${o.slug === activeSlug ? 'true' : 'false'}"><span class="on2">•</span>${esc(o.name)}</button>`).join('');
    return `<div class="ortgroup"><h3 class="ortgroup-h">${esc(reg.label)}</h3>${btns}</div>`;
  }).join('');
  const activeName = (() => { for (const r of GEBIET_REGIONEN) for (const o of r.orts) if (o.slug === activeSlug) return o.name; return null; })();
  const info = activeName && activeSlug !== 'falkensee'
    ? `${esc(activeName)} liegt in unserem Servicegebiet — kostenlose Besichtigung, Anfahrt im Festpreis enthalten.`
    : 'Falkensee ist unser Standort — von hier fahren wir ins ganze Havelland und ans Berliner Umland.';
  return `<section class="sec sec-alt" id="gebiet"><div class="wrap">` +
    `<div class="head"><h2 class="rv">${heading}</h2></div>` +
    `<p class="intro rv">Von Falkensee ins West-Havelland, nach Oberhavel, an den Berliner Westrand und an die Havelseen — kurze Wege, verlässliche Termine. Fahren Sie über einen Ort oder tippen Sie ihn an:</p>` +
    `<div class="gebiet-wrap rv"><div class="map-card">${gebietMap(activeSlug)}` +
    `<p class="map-info" id="map-info">${info}</p></div>` +
    `<div><div class="ortlist ortlist-grouped" id="ortlist">${groups}</div>` +
    `<p class="gebiet-note">Ihr Ort ist nicht dabei? <a href="tel:${TEL}">Rufen Sie kurz an</a> — wir sagen Ihnen ehrlich, ob wir kommen. Auch in vielen Ortsteilen und Nachbargemeinden sind wir im Einsatz. Alle Orte im Überblick: <a href="/standorte/">Standorte</a>.</p></div>` +
    `</div></div></section>`;
}

// ---------------------------------------------------------------------------
// trustBadges — .trustbadges (Gewerbe · Falkensee · versichert). "versichert" traegt data-verify + VERIFIZIEREN-Kommentar.
// ---------------------------------------------------------------------------
const CHECK_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>`;
export function trustBadges() {
  return `<div class="trustbadges">` +
    `<span class="tb">${CHECK_SVG}angemeldetes Gewerbe</span>` +
    `<span class="tb">${CHECK_SVG}aus Falkensee</span>` +
    `<!-- VERIFIZIEREN: Versicherungsstatus vor Freischaltung bestaetigen -->` +
    `<span class="tb" data-verify>${CHECK_SVG}versichert bei Schäden</span>` +
    `</div>`;
}

// ---------------------------------------------------------------------------
// fristband — .fristband (§ 39-Saison-Urgency, monatsabhaengig). monat 1-12 als PARAMETER (kein new Date()).
// ---------------------------------------------------------------------------
const CAL_ICO = `<span class="fb-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></span>`;
export function fristband(monat) {
  let m = parseInt(monat, 10);
  if (!(m >= 1 && m <= 12)) m = (new Date()).getMonth() + 1; // Fallback nur wenn kein/ungueltiger Parameter
  let strong, text;
  if (m === 2) {
    strong = 'Letzte Wochen für den Radikalschnitt.';
    text = 'Starker Rückschnitt ist nur noch bis 28. Februar erlaubt — danach beginnt die gesetzliche Schonzeit. Jetzt Termin sichern.';
  } else if (m >= 10 || m === 1) {
    strong = 'Jetzt ist starker Rückschnitt erlaubt.';
    text = 'Das gesetzliche Fenster läuft bis 28. Februar — die beste Zeit für kräftige Rückschnitte und das Auf-den-Stock-Setzen.';
  } else {
    strong = 'Schonzeit — Formschnitt jederzeit.';
    text = 'Vom 1. März bis 30. September ist starker Rückschnitt untersagt. Den schonenden Formschnitt planen wir ganzjährig fristgerecht.';
  }
  return `<div class="fristband">${CAL_ICO}<b>${strong}</b> <span>${text}</span>` +
    `<span class="fb-law">§ 39 BNatSchG</span></div>`;
}

// ---------------------------------------------------------------------------
// aeoKapsel — abgesetzter "Die kurze Antwort"-Block (Ratgeber/AEO).
// ---------------------------------------------------------------------------
export function aeoKapsel(text) {
  if (!text) return '';
  return `<div class="aeo" style="margin:0 0 28px;padding:16px 20px;border-left:3px solid var(--accent);background:var(--paper);border-radius:0 var(--r-el) var(--r-el) 0">` +
    `<b style="display:block;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--green-d);margin-bottom:6px">Die kurze Antwort</b>` +
    `<p style="color:var(--ink);margin:0">${esc(text)}</p></div>`;
}

// ---------------------------------------------------------------------------
// beweisMechanik — 3-Schritt-Beweisblock OHNE Slider (Reinigungs-Gewerke). gewerk waehlt die Copy.
// ---------------------------------------------------------------------------
const BEWEIS = {
  fensterreinigung: ['Jede Scheibe im Gegenlicht geprüft', 'Wir kontrollieren jede Fläche schräg gegen das Licht — nur so werden Schlieren sichtbar, bevor wir gehen.',
    'Innen und außen, Rahmen inklusive', 'Glas, Rahmen und Fensterbank werden mitgereinigt — nicht nur die sichtbare Vorderseite.',
    'Foto-Nachweis aufs Handy', 'Vorher-/Nachher-Fotos direkt nach dem Termin — Sie sehen das Ergebnis, auch wenn Sie nicht da waren.'],
  steinreinigung: ['Testfläche vor dem Start', 'Auf einer kleinen Fläche zeigen wir das Ergebnis, bevor die ganze Terrasse gereinigt wird.',
    'Grünbelag mit der Wurzel', 'Wir spülen Moos und Algen gründlich aus den Fugen — nicht nur oberflächlich abgetragen.',
    'Foto-Nachweis aufs Handy', 'Vorher-/Nachher-Fotos direkt nach dem Termin — der Unterschied ist dokumentiert.'],
  dachrinnenreinigung: ['Sicht- und Funktionsprüfung', 'Vor der Reinigung schauen wir uns Verlauf und Fallrohre an — damit nichts übersehen wird.',
    'Rinne und Fallrohr frei', 'Laub und Schlamm werden entnommen, das Fallrohr auf Durchlauf geprüft.',
    'Foto-Nachweis aufs Handy', 'Vorher-/Nachher-Fotos aus der Rinne — Sie sehen das Ergebnis vom Dach, ohne selbst hochzusteigen.']
};
export function beweisMechanik(gewerk) {
  const key = String(gewerk || '').toLowerCase();
  const d = BEWEIS[key] || BEWEIS.fensterreinigung;
  const steps = [[d[0], d[1]], [d[2], d[3]], [d[4], d[5]]];
  const items = steps.map(([h, p], i) =>
    `<li class="wa-step"><span class="wn">${i + 1}</span><div><h3>${esc(h)}</h3><p>${esc(p)}</p></div></li>`).join('');
  return `<div class="beweis"><ol class="wa-steps rv">${items}</ol></div>`;
}

export default {
  baSlider, garantienStrip, schnittkalender, heckenKompass, jahreszeiten, echtProjekt,
  karussell, archivGrid, whatsappFlow, auftragsTimeline, uspBand, faqFilter, gebietskarte,
  trustBadges, fristband, aeoKapsel, beweisMechanik
};
