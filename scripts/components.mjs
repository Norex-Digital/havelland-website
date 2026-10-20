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
  quer = false, hint = false, lcp = false, w, h, vorTxt = 'vor dem Schnitt', nachTxt = 'nach dem Schnitt' } = {}) {
  const nSrc = nachher || (slug ? `${VN}/${slug}_nachher.jpg` : '');
  const vSrc = vorher || (slug ? `${VN}/${slug}_vorher.jpg` : '');
  if (!nSrc || !vSrc) return '';
  const W = w || (quer ? 2048 : 864);
  const H = h || (quer ? 1536 : 1036);
  const base = esc(alt || cap || 'Heckenschnitt');
  const pr = lcp ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"';
  const ba =
    `<div class="ba${quer ? ' ba-quer' : ''}" style="--pos:50%${(w && h) ? `;aspect-ratio:${W}/${H}` : ''}">` +
    `<img src="${esc(nSrc)}" alt="${base} — ${esc(nachTxt)}" width="${W}" height="${H}" ${pr}>` +
    `<img class="ba-top" src="${esc(vSrc)}" alt="${base} — ${esc(vorTxt)}" width="${W}" height="${H}" ${pr}>` +
    `<div class="ba-line"></div><div class="ba-knob" aria-hidden="true"></div>` +
    `<span class="ba-tag tag-v">Vorher</span><span class="ba-tag tag-n">Nachher</span>` +
    `<input type="range" min="0" max="100" value="50" step="1" aria-label="Vorher-Nachher-Vergleich ${base}">` +
    (hint ? `<span class="hint">&#9666; Regler ziehen &#9656;</span>` : '') +
    `</div>`;
  if (!cap) return ba;
  return ba + `<p class="ba-cap"><b>${esc(cap)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</p>`;
}

// ---------------------------------------------------------------------------
// gstripFrom — generischer 3-Zusagen-Renderer (LP-v2, 14.09.): .gstrip > .wrap > .gstrip-grid > .gs[.rv[.dN]] > span.gn(01..) + div(h3 + p).
// items: [{h, p}] — Werte werden ROH eingesetzt (Aufrufer escapt), damit garantienStrip() byte-identisch bleibt.
// rv=false: ohne Reveal-Klassen (Seiten ohne site.js). Ads-LPs nutzen rv=true + rvIn() in lp.mjs.
// ---------------------------------------------------------------------------
export function gstripFrom(items, { label = 'Unsere drei Zusagen', rv = true } = {}) {
  const rows = arr(items).map((it, i) =>
    `<div class="gs${rv ? ' rv' + (i ? ` d${i}` : '') : ''}"><span class="gn">${String(i + 1).padStart(2, '0')}</span><div><h3>${it.h}</h3><p>${it.p}</p></div></div>`).join('');
  return `<section class="gstrip" aria-label="${esc(label)}"><div class="wrap"><div class="gstrip-grid">${rows}</div></div></section>`;
}

// ---------------------------------------------------------------------------
// garantienStrip — feste 3-Zusagen-Leiste (identisch zur generate.mjs gstrip-Konstante). Ohne Bild/Label. Delegiert an gstripFrom().
// ---------------------------------------------------------------------------
const GSTRIP_3 = [
  { h: 'Festpreis ist Endpreis', p: 'Nach der kostenlosen Besichtigung steht Ihr Preis — inklusive Abfuhr, ohne Nachforderung.' },
  { h: 'Foto-Nachweis', p: 'Vorher-/Nachher-Fotos nach jedem Auftrag, direkt aufs Handy — auch wenn Sie nicht da waren.' },
  { h: 'Ein Ansprechpartner', p: 'Vom ersten Anruf bis zur Abnahme feste Gesichter — kein Callcenter, keine Warteschleife.' }
];
export function garantienStrip() {
  return gstripFrom(GSTRIP_3);
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
    `<p class="cal-law">Obere Leiste: Pflege- und Formschnitt. Untere Leiste: starker Rückschnitt — vom 1. März bis 30. September zum Schutz brütender Vögel gesetzlich untersagt (§ 39 BNatSchG). Wir planen jeden Schnitt passend zu diesen Fristen. Soll die Hecke komplett verschwinden, ist das nur vom 1. Oktober bis 28. Februar zulässig — mehr dazu auf unserer Seite zur <a href="/heckenentfernung/">Heckenentfernung</a>.</p>` +
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
    bes: 'Treibt aus altem Holz nicht neu aus — deshalb nie zu tief schneiden, sondern regelmäßig in Form halten. Genau dafür sind wir da.',
    mehr: { href: '/heckenentfernung/', text: 'Verkahlte Thuja komplett entfernen lassen →' } },
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
    `<p class="kmehr"><a href="${esc(galerieHref)}">Alle Ergebnisse ansehen →</a>${a.mehr ? ` · <a href="${esc(a.mehr.href)}">${esc(a.mehr.text)}</a>` : ''}</p></div></div>`).join('');
  return `<section class="sec" id="heckenarten"><div class="wrap">` +
    `<div class="head"><h2 class="rv">${heading}</h2></div><p class="intro rv">${esc(intro)}</p>` +
    `<div class="pills" role="tablist" aria-label="Heckenart wählen">${pills}</div>${panels}` +
    `<p class="knote rv">Für alle Arten gilt: Der schonende Formschnitt ist das ganze Jahr erlaubt. Starker Rückschnitt und Auf-den-Stock-Setzen nur vom 1. Oktober bis 28. Februar (§ 39 BNatSchG).</p>` +
    `</div></section>`;
}

// ---------------------------------------------------------------------------
// jahreszeiten — .jz-grid, 4 Karten (hero-home-*). OHNE pbadge-Label.
// ---------------------------------------------------------------------------
// Letztes Feld: Ziel-Seite der Karte. Ohne Link waren Laub und Winterdienst hier zwar genannt,
// aber nicht erreichbar — die Saisonthemen hatten keinen Klickpfad.
const JZ = [
  ['fruehjahr', 'Frühjahr', 'Garten im Frühjahr im Havelland', 'März – Mai', 'Beete vorbereiten, erster Formschnitt', '', '/gartenpflege/'],
  ['', 'Sommer', 'Garten im Sommer im Havelland', 'Juni – August', 'Rasen, Hecke, Bewässerung im Blick', 'd1', '/heckenschnitt/'],
  ['herbst', 'Herbst', 'Garten im Herbst im Havelland', 'September – November', 'Laub, letzter Schnitt vor dem Winter', 'd2', '/gartenpflege/#herbst-paket'],
  ['winter', 'Winter', 'Garten im Winter im Havelland', 'Dezember – Februar', 'Rückschnitt-Zeit, Winterdienst', 'd3', '/winterdienst/']
];
export function jahreszeiten({ heading = 'Ein Garten durch <em>vier Jahreszeiten.</em>',
  intro = 'Gartenpflege hört nicht im Sommer auf. Wer uns im Abo bucht, bekommt zu jeder Jahreszeit das, was gerade ansteht — ohne selbst an Termine denken zu müssen.' } = {}) {
  const cards = JZ.map(([key, name, alt, spanne, tun, d, href]) => {
    const src = `${IMG}/hero-home${key ? '-' + key : ''}-1024.jpg`;
    const bild = `<div class="photo">` +
      `<img src="${src}" alt="${esc(alt)}" loading="lazy" decoding="async" width="1024" height="768">` +
      `<span class="jn">${esc(name)}</span></div>`;
    // Link nur um das Bild: figcaption bleibt direktes Kind der figure (HTML-Vorgabe).
    return `<figure class="jz rv${d ? ' ' + d : ''}">` +
      (href ? `<a class="jz-a" href="${href}" aria-label="${esc(name)}: ${esc(tun)}">${bild}</a>` : bild) +
      `<figcaption class="ba-cap"><b>${esc(spanne)}</b><span>${href ? `<a href="${href}">${esc(tun)}</a>` : esc(tun)}</span></figcaption></figure>`;
  }).join('');
  return `<div class="head"><h2 class="rv">${heading}</h2></div>` +
    `<p class="intro rv">${esc(intro)}</p><div class="jz-grid">${cards}</div>`;
}

// ---------------------------------------------------------------------------
// echtProjekt — .echt-card mit dem ECHTEN Paar (quer). OHNE Gold-Badge, Text neutral.
// ---------------------------------------------------------------------------
export function echtProjekt({ nur = null } = {}) {
  const thuja =
    `<div class="echt-card rv"><div class="ebody">` +
    `<h3>Thuja-Rückschnitt, dokumentiert vom Einsatz.</h3>` +
    `<p>Mit dem Handy direkt vom Einsatz fotografiert. Kein Studio, kein Nachbearbeiten: Die Plane mit dem Schnittgut liegt noch im Bild. Genau so sieht der Foto-Nachweis aus, den Sie nach jedem Auftrag aufs Handy bekommen.</p></div>` +
    `<div>${baSlider({ vorher: `${ARB}/echt-heckenschnitt-vorher.jpg`, nachher: `${ARB}/echt-heckenschnitt-nachher.jpg`, alt: 'Thuja-Rückschnitt vom Einsatz', cap: 'Thuja-Rückschnitt', sub: 'vom Einsatz fotografiert', quer: true })}</div></div>`;
  if (nur === 'thuja') return `<div class="echt-grid">${thuja}</div>`;
  const schuppen =
    `<div class="echt-card rv d1"><div class="ebody">` +
    `<h3>Gartenschuppen leer, Falkensee — an einem Tag.</h3>` +
    `<p>Abstellkammer unter der Treppe und Gartenschuppen ausgeräumt, zwei Fahrten zum Wertstoffhof Falkensee, Gebühren nach Beleg. Vorher/Nachher ging am selben Abend an die Kundin — mit Einwilligung hier zu sehen.</p>` +
    `<div class="echt-next"><a href="/entruempelung/">Entrümpelung rund ums Haus →</a></div></div>` +
    `<div>${baSlider({ vorher: '/assets/img/fall-schuppen-falkensee-vorher-768.jpg', nachher: '/assets/img/fall-schuppen-falkensee-nachher-768.jpg', w: 768, h: 1024, alt: 'Gartenschuppen in Falkensee vor und nach der Entrümpelung', cap: 'Gartenschuppen', sub: 'Falkensee, 1 Tag', vorTxt: 'vor der Räumung', nachTxt: 'nach der Räumung' })}</div></div>`;
  return `<div class="echt-grid">${thuja}${schuppen}</div>`;
}

// ---------------------------------------------------------------------------
// clusterKacheln — 4 Cluster als .cluster > .cl (a.cl-main = Hub) + ul.cl-sub (Unterleistungen). Ersetzt seit 17.09.
// die 6 Einzelkarten (.list > a.it) auf der Startseite: vier Käufergruppen (Garten / GaLaBau / Entrümpelung / Objekte)
// bekommen je einen Einstieg, kein Käufer wird bevorzugt (Plan organisch-entruempelung §2 E2).
// items: [{ href, kick, h3, p, subs:[{href,label}] }]
// ---------------------------------------------------------------------------
export function clusterKacheln(items) {
  return `<div class="cluster">` + items.map((c, i) =>
    `<div class="cl rv d${i + 1}"><a class="cl-main" href="${esc(c.href)}"><span class="kick">${esc(c.kick)}</span><h3>${esc(c.h3)}</h3><p>${esc(c.p)}</p><span class="arr">Zur Leistung →</span></a>` +
    `<ul class="cl-sub">${c.subs.map(s => `<li><a href="${esc(s.href)}">${esc(s.label)}</a></li>`).join('')}</ul></div>`
  ).join('') + `</div>`;
}

// ---------------------------------------------------------------------------
// faelleBlock — Fallbeispiele (echte Aufträge, anonymisiert) für Pillar-Hubs. .faelle > .fall (h3/meta/p + optional Slider + optional Zitat).
// img = Manifest-Basis-Slug eines Vorher/Nachher-Paars ('fall-schuppen-falkensee' -> -vorher-768.jpg/-nachher-768.jpg) oder ''.
// zitat/zitat_von rendern nur, wenn gefüllt (17.09.: leer, bis eine echte Entrümpelungs-Bewertung vorliegt — kein Zitat erfinden).
// ---------------------------------------------------------------------------
export function faelleBlock(faelle, { heading = 'So sah das zuletzt aus.', alt = true } = {}) {
  if (!Array.isArray(faelle) || !faelle.length) return '';
  // alt (W3b Review #2): Zonen-Parität vom Aufrufer — paper (default) oder weiß, damit kein paper-auf-paper entsteht.
  return `<section class="sec${alt ? ' section-alt' : ''}" id="faelle"><div class="wrap"><div class="head"><h2 class="serif rv">${esc(heading)}</h2></div><p class="intro rv">Echte Aufträge aus dem Havelland, ohne Namen und Adresse. Wo wir Fotos oder Zahlen zeigen, liegt die Einwilligung der Kunden vor. Genau so bekommen Sie Ihren Foto-Nachweis.</p><div class="faelle">` +
    faelle.map((f, i) => `<div class="fall rv d${i + 1}"><div class="fbody"><h3>${esc(f.h3)}</h3><p class="fmeta">${esc(f.meta || '')}</p><p>${esc(f.body)}</p>${f.zitat ? `<blockquote class="fzitat"><p>${esc(f.zitat)}</p>${f.zitat_von ? `<cite>${esc(f.zitat_von)}</cite>` : ''}</blockquote>` : ''}</div>${f.img ? `<div>${baSlider({ vorher: `/assets/img/${f.img}-vorher-768.jpg`, nachher: `/assets/img/${f.img}-nachher-768.jpg`, w: 768, h: 1024, alt: f.h3 + ' — vorher und nachher', cap: f.h3.split(',')[0], sub: 'vorher / nachher', vorTxt: 'vor der Räumung', nachTxt: 'nach der Räumung' })}</div>` : ''}</div>`).join('') +
    `</div></div></section>`;
}

// ---------------------------------------------------------------------------
// tiefBlock — Tiefen-Inhalt für Tier-1-Ortsseiten (W2): eigene H2 + H3-Sektionen, Faktenkasten (.ortsblock), optionale
// Blocks mit Anker/Link. Fallbeispiele (faelleBlock) und bespoke FAQs setzt der Aufrufer ein. Nur wenn
// ortsseiten.json → services.<svc>.orte.<ort>.tief existiert. Eigene Sections → NearDup-Gate (erster Prose-Block) bleibt unberührt.
// ---------------------------------------------------------------------------
export function tiefBlock(t, { linkHtml = () => '', hrefOf = null, ctaAfterGrid = '' } = {}) {
  if (!t) return '';
  // W3b (17.09.): Kachel-Grid, sobald eine Section ein `kurz` hat — sonst bisheriges Prose-Layout.
  const kacheln = (t.sections || []).some(x => x.kurz);
  const secs = kacheln
    ? `<div class="cards leist rv">${(t.sections || []).map(x => { const href = (x.link_to && hrefOf) ? hrefOf(x.link_to) : ''; return `<div class="card"${x.id ? ` id="${esc(x.id)}"` : ''}><h3>${(href && x.seite) ? `<a href="${href}">${esc(x.h3)}</a>` : esc(x.h3)}</h3><p>${esc(x.kurz)}</p>${href ? `<a class="go" href="${href}">${esc(x.link_text || 'Zur Seite')} →</a>` : ''}${x.body ? `<details class="mehr"><summary>Mehr dazu</summary><div><p>${esc(x.body)}${href ? '' : linkHtml(x)}</p></div></details>` : ''}</div>`; }).join('')}</div>`
    : (t.sections || []).map(x => `<h3>${esc(x.h3)}</h3><p>${esc(x.body)}${linkHtml(x)}</p>`).join('');
  const ob = t.ortsblock ? `<section class="sec section-alt"><div class="wrap"><div class="ortsblock rv"><h2>${esc(t.ortsblock.h2)}</h2><dl>${(t.ortsblock.items || []).map(i => `<div><dt>${esc(i.k)}</dt><dd>${esc(i.v)}</dd></div>`).join('')}</dl>${t.ortsblock.quelle ? `<p class="oq">Quelle: ${esc(t.ortsblock.quelle)}</p>` : ''}</div></div></section>` : '';
  const blocks = (t.blocks || []).map((b, i) => `<section class="sec${i % 2 ? ' section-alt' : ''}"${b.id ? ` id="${esc(b.id)}"` : ''}><div class="wrap"><div class="prose wide rv"><h2>${esc(b.h2)}</h2>${b.lead ? `<p class="lead-p"><strong>${esc(b.lead)}</strong></p>` : ''}<p>${esc(b.body)}${(Array.isArray(b.bullets) && b.bullets.length) ? '' : linkHtml(b)}</p>${Array.isArray(b.bullets) && b.bullets.length ? `<ul class="bl">${b.bullets.map(x => `<li>${esc(x)}</li>`).join('')}</ul>${linkHtml(b).trim() ? `<p>${linkHtml(b).trim()}</p>` : ''}` : ''}${b.mehr ? `<details class="mehr"><summary>Mehr dazu</summary><div><p>${esc(b.mehr)}</p></div></details>` : ''}</div></div></section>`).join('');
  const head = kacheln
    ? `<section class="sec tief"><div class="wrap"><div class="head"><h2 class="serif rv">${esc(t.h2)}</h2></div>${secs}</div></section>`
    : `<section class="sec tief"><div class="wrap"><div class="prose wide rv"><h2>${esc(t.h2)}</h2>${secs}</div></div></section>`;
  // W4 (21.09.): optionaler CTA direkt nach dem Kachel-Grid (Owner: "zu viel Text, zu wenig CTA") — Aufrufer liefert das fertige Band, nur wenn t.cta_grid gesetzt ist.
  return `${head}${ctaAfterGrid}${ob}${blocks}`;
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
export function archivGrid(slugs, { ctaHref = '/kontakt/#anfrage', compact = false } = {}) {   // 20.10. (Copy H5): '#kontakt' hat auf keiner Seite ein Ziel
  const list = (arr(slugs).length ? arr(slugs) : VN_ALL).filter(s => VN_META[s]);
  const thumbs = list.map(s => {
    const m = VN_META[s];
    return `<button class="thumb" data-slug="${esc(s)}" data-cap="${esc(m.cap)}" data-sub="${esc(m.sub)}">` +
      `<img src="${VN}/${s}_nachher.jpg" alt="${esc(m.alt)} — Vorher-Nachher-Vergleich öffnen" loading="lazy" decoding="async" width="864" height="1036">` +
      `<span class="tvn">Vorher ↔ Nachher</span><span class="tcap">${esc(m.tcap)}</span></button>`;
  }).join('');
  // compact (Layout-Runde 20.10.): Hubs ohne Thumbnail-Raster — keine verwaiste gestrichelte Platzhalterkarte, sondern eine Button-Zeile unter dem Karussell.
  if (compact) return `<div class="car-cta rv"><a class="btn btn-acc" href="${esc(ctaHref)}">Kostenlose Besichtigung anfragen</a></div>`;
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
  heading = 'Ein Handy-Foto <em>reicht.</em>', partner = false, fotoNeutral = false, winter = false,
  // foto (Zaunbau 16.09.): optionales Service-eigenes Motiv statt Heckenschnitt-Default — { src, alt, cap, sub, w, h }
  foto = null , legacy = false } = {}) {
  const f = foto || { src: `${ARB}/hecke-hinten-schere-noah.jpg`, alt: fotoNeutral ? 'Sorgfältige Handarbeit im Grünen — Haus- &amp; Gartenservice Havelland' : 'Heckenschnitt mit der Heckenschere an einer Hecke', cap: 'Handarbeit, wo es drauf ankommt', sub: fotoNeutral ? 'Sorgfalt im Detail' : 'Kanten &amp; Ecken', w: 2400, h: 2979 };
  // winter (Umbau 04.09.): Winterdienst = Partnermodell ohne Foto-Zusage — Adresse und Flächen statt Handy-Foto, Saisonvertrag vom Betrieb.
  if (winter) heading = 'Adresse und Flächenbeschreibung <em>reichen.</em>';
  const ortTeil = ort ? ` in ${ort}` : '';
  const text = winter ? `Hallo, ich brauche Winterdienst für ${gewerk}${ortTeil} — was ist der nächste Schritt?` : `Hallo, hier ein Foto von ${gewerk}${ortTeil} — was würde das kosten?`;
  // Partner-/Tippgeber-Services (Dach): Schritt 3 nennt keinen eigenen Festpreis — das Angebot kommt vom ausführenden Fachbetrieb.
  const step3 = partner
    ? `<li class="wa-step"><span class="wn">3</span><div><h3>Antwort am selben Tag</h3><p>Erste Einschätzung und Termin für die kostenlose Besichtigung durch den Partner-Fachbetrieb — das verbindliche Angebot kommt vom ausführenden Betrieb.</p></div></li>`
    : `<li class="wa-step"><span class="wn">3</span><div><h3>Antwort am selben Tag</h3><p>Erste Einschätzung und Termin für die kostenlose Besichtigung — danach steht Ihr Festpreis.</p></div></li>`;
  return `<div class="wa-grid"><div>` +
    `<span class="kick rv"><span class="dot"></span> Der schnellste Weg</span>` +
    `<div class="head" style="margin-top:14px"><h2 class="rv">${heading}</h2></div>` +
    `<p class="intro rv" style="margin-bottom:30px">Sie müssen nichts ausmessen und kein Formular ausfüllen. Drei Schritte, dann kümmern wir uns.</p>` +
    `<ol class="wa-steps rv d1">` +
    (winter
      ? `<li class="wa-step"><span class="wn">1</span><div><h3>Adresse und Flächen nennen</h3><p>Gehweg, Zufahrt, Hauseingang oder Hof — ungefähre Meter genügen, ausmessen müssen Sie nichts.</p></div></li>`
      : `<li class="wa-step"><span class="wn">1</span><div><h3>Fotografieren</h3><p>Einmal längs, einmal von vorn — so sehen wir Höhe, Länge und Zugang.</p></div></li>`) +
    (winter
      ? `<li class="wa-step"><span class="wn">2</span><div><h3>Per WhatsApp senden</h3><p>An ${TEL_DISP}, gern mit einem Satz dazu: Welche Flächen müssen bis wann frei sein?</p></div></li>`
      : `<li class="wa-step"><span class="wn">2</span><div><h3>Per WhatsApp senden</h3><p>An ${TEL_DISP}, gern mit zwei Sätzen dazu: Was soll passieren, wo stehen Sie?</p></div></li>`) +
    step3 +
    `</ol>` +
    `<div class="wa-cta rv d2"><a class="btn btn-acc" href="${waHref(text)}">${winter ? 'Flächen per WhatsApp schicken' : 'Foto per WhatsApp senden'}</a>` +
    `<a class="tel-quiet" href="tel:${TEL}">lieber anrufen: ${TEL_DISP}</a></div></div>` +
    `<div class="wa-stage rv d2"><div class="pframe" style="box-shadow:var(--sh-photo)">` +
    // fotoNeutral (Audit 2026-08, P2-b): auf Services ohne Hecken-Bezug (baumstumpf-entfernen) Alt/Untertitel
    // neutral auf Sorgfalt/Handarbeit — das Foto zeigt Heckenschnitt, darf dort nicht als Service-Beweis wirken.
    `<img src="${f.src}" alt="${f.alt}" loading="lazy" decoding="async" width="${f.w}" height="${f.h}"></div>` +
    `<p class="ba-cap"><b>${f.cap}</b><span>${f.sub}</span></p></div></div>`;
}

// ---------------------------------------------------------------------------
// auftragsTimeline — .tl, 4 Stationen (Anfrage / Besichtigung+Festpreis / Ausfuehrung / Foto-Nachweis).
// Ohne .timg-Bilder (optionale Deko, vermeidet 404).
// ---------------------------------------------------------------------------
const TL = [
  ['Tag 1 · Antwort am selben Tag', 'Anfrage', 'Per Telefon oder WhatsApp kurz schildern, was ansteht — gern mit Fotos. Sie bekommen eine erste Rückmeldung, keine Warteschleife.'],
  ['Kurzfristig · kostenlos', 'Besichtigung &amp; Festpreis', 'Wir kommen vorbei, schauen uns alles an und nennen Ihnen den Preis, inklusive Abfuhr. Er steht, bevor wir anfangen.'],
  ['Zum vereinbarten Termin', 'Saubere Ausführung', 'Pünktlich und gründlich zum vereinbarten Termin. Wir räumen hinter uns auf, besenrein ist Teil des Preises.'],
  ['Direkt nach der Arbeit', 'Foto-Nachweis aufs Handy', 'Fotos von vorher und nachher gehen direkt aufs Handy.']
];
// P0-1 (Audit 2026-08): Der §39-Satz in Schritt 3 erscheint NUR auf Services mit echtem §39-Bezug —
// auf Stubben-/Reinigungs-/übrigen Services wäre er eine falsche bzw. irrelevante Rechtsaussage.
const TL_39 = new Set(['heckenschnitt', 'heckenentfernung', 'gartenrodung']);
const tlStep3 = slug => TL_39.has(slug)
  ? 'Pünktlich, gründlich, fristgerecht nach § 39 BNatSchG geplant. Wir räumen hinter uns auf — besenrein ist Teil des Preises.'
  : slug === 'baumstumpf-entfernen'
    ? 'Pünktlich, gründlich — Stubbenfräsen ist ganzjährig möglich. Wir räumen hinter uns auf — besenrein ist Teil des Preises.'
    : TL[2][2];
// Ablauf-Schritt 2 (20.10., Copy K1/H7): „inklusive Abfuhr“ nur dort, wo die Abfuhr wirklich im Festpreis steckt. Aushub/Altbelag/Gartenbau: Entsorgung nach Beleg. Baumfällung: Abtransport inklusive, Stadtgebühren nicht. Fenster/Stein: keine Abfuhr.
const TL2_BELEG = new Set(['zaunbau', 'erdarbeiten', 'pflasterarbeiten', 'einfahrt-pflastern', 'terrassenbau', 'gartengestaltung', 'rollrasen-verlegen', 'galabau']);
const TL2_OHNE_ABFUHR = new Set(['fensterreinigung', 'steinreinigung', 'unterhaltsreinigung', 'gebaeudereinigung', 'ferienwohnung-reinigung', 'objektbetreuung', 'hausmeisterservice']);   // Paket 3: Reinigungs- und Kontrollgang-Hubs ohne Abfuhr (Spec A §4.2)
const tlStep2 = slug => slug === 'gartenrodung'
  ? 'Wir kommen vorbei, schauen uns alles an und nennen Ihnen den Preis. Grünschnitt und Wurzelholz sind enthalten, Unrat und Sperriges rechnen wir nach Beleg ab. Er steht, bevor wir anfangen.'
  : TL2_BELEG.has(slug)
  ? 'Wir kommen vorbei, schauen uns alles an und nennen Ihnen den Preis. Entsorgungsgebühren rechnen wir nach Beleg ab, ohne Aufschlag. Er steht, bevor wir anfangen.'
  : slug === 'baumfaellung'
    ? 'Wir kommen vorbei, schauen uns den Baum an und nennen Ihnen den Preis inklusive Abtransport. Gebühren der Stadt für die Fällgenehmigung und Ersatzpflanzungen sind nicht enthalten. Er steht, bevor wir anfangen.'
    : TL2_OHNE_ABFUHR.has(slug)
      ? 'Wir kommen vorbei, schauen uns alles an und nennen Ihnen den Preis. Er steht, bevor wir anfangen.'
      : TL[1][2];
// Partner-/Tippgeber-Variante (Dach): keine Eigenleistung, kein eigener Festpreis, kein eigener Foto-Nachweis — Ausführung + Angebot beim Fachbetrieb.
const TL_PARTNER_DACH = [
  ['Tag 1 · Antwort am selben Tag', 'Anfrage', 'Per Telefon oder WhatsApp kurz schildern, was am Dach ansteht — gern mit Fotos. Sie bekommen eine erste Rückmeldung, keine Warteschleife.'],
  ['Kurzfristig · kostenlos', 'Besichtigung durch den Fachbetrieb', 'Der Partner-Fachbetrieb sieht sich Dach, Zugang und Umfang an. Die Besichtigung ist für Sie kostenlos und unverbindlich.'],
  ['Nach der Besichtigung', 'Angebot vom Fachbetrieb', 'Das verbindliche Angebot erstellt der ausführende Betrieb. Sagen Sie zu, stimmen wir Termin und Ablauf mit Ihnen ab.'],
  ['Zum vereinbarten Termin', 'Ausführung durch den Fachbetrieb', 'Die Arbeit am Dach übernimmt der Fachbetrieb mit passender Absicherung, wir begleiten den Einsatz.']
];
// Winterdienst-Variante (01.09.): gleiche Mechanik, Wording ohne „Dach" — Saisonvertrag statt Einmalauftrag.
const TL_PARTNER_WINTER = [
  ['Tag 1 · Antwort am selben Tag', 'Anfrage', 'Per Telefon oder WhatsApp kurz schildern, welche Flächen im Winter frei sein müssen — Gehweg, Zufahrt, Stellplätze. Sie bekommen eine erste Rückmeldung, keine Warteschleife.'],
  ['Kurzfristig · kostenlos', 'Besichtigung durch den Fachbetrieb', 'Der Partner-Fachbetrieb sieht sich Flächen, Zugänge und den Platz für Streugut an. Die Besichtigung ist für Sie kostenlos und unverbindlich.'],
  ['Nach der Besichtigung', 'Saisonvertrag vom Fachbetrieb', 'Das verbindliche Angebot als Saisonvertrag erstellt der ausführende Betrieb. Sagen Sie zu, steht der Winterdienst vor dem ersten Schnee.'],
  ['Bei Schnee und Glätte', 'Einsätze mit Nachweis', 'Räumen und Streuen übernimmt der Fachbetrieb mit eigener Technik und Absicherung, jeder Einsatz wird festgehalten.']
];
const TL_PARTNER = TL_PARTNER_DACH;
// timelineFrom — generischer Timeline-Renderer (LP-v2, 14.09.): .tl[.rv] > .tli > span.tn + .tbody > [.twhen wenn when] + h3 + p.
// items: [{when?, h?, p}] — Werte ROH (Aufrufer escapt); when/h optional (z. B. Danke-Seite: Satz-Schritte ohne Zeitchip/Titel).
export function timelineFrom(items, { rv = true } = {}) {
  const rows = arr(items).map((it, i) =>
    `<div class="tli"><span class="tn">${i + 1}</span><div class="tbody">` +
    `${it.when ? `<span class="twhen">${it.when}</span>` : ''}${it.h ? `<h3>${it.h}</h3>` : ''}<p>${it.p}</p></div></div>`).join('');
  return `<div class="tl${rv ? ' rv' : ''}">${rows}</div>`;
}
// Paket 3: Gewerbe-Hubs nennen nur die vom Owner bestätigte Reaktionszeit (20.10.: „antworten am selben Tag“), nicht „meist in Stunden“.
const TL_GEWERBE_HUBS = new Set(['objektbetreuung', 'hausmeisterservice', 'unterhaltsreinigung', 'gebaeudereinigung', 'ferienwohnung-reinigung']);
// Nachbesserung 20.10.: Gewerbe-Hubs ersetzen die B2C-Vorlage (Entrümpelung) je Schritt: nur bestätigte Zeitangaben (selber Tag / Besichtigung meist innerhalb weniger Tage), kein „besenrein“, kein „zu Hause“, kein Gedankenstrich.
const TL_GEWERBE_S1 = 'Per Telefon, WhatsApp oder Mail kurz schildern, was ansteht, gern mit Fotos oder Objektliste. Sie bekommen eine erste Rückmeldung, keine Warteschleife.';
const TL_GEWERBE = {
  objektbetreuung: {
    s3: 'Wir gehen Ihre Objekte nach festem Plan ab, kümmern uns um die Außenanlagen und beheben Kleinigkeiten gleich.',
    s4: 'Jeder Rundgang kommt mit Fotos aufs Handy. Sie müssen nicht vor Ort sein.'
  },
  hausmeisterservice: {
    s3: 'Wir kommen zu den festen Terminen: Kontrollgang, Grünpflege, Laub und kleine Reparaturen nach Plan.',
    s4: 'Nach jedem Einsatz bekommen Sie Fotos aufs Handy, auch wenn Sie nicht vor Ort sind.'
  },
  unterhaltsreinigung: {
    s3: 'Wir reinigen zu den vereinbarten Zeiten, auf Wunsch früh, abends oder nach Feierabend.',
    s4: 'Sie sehen den Zustand auf dem Handy und müssen niemanden kontrollieren.'
  },
  gebaeudereinigung: {
    s3: 'Wir reinigen Eingang, Treppenhaus und Gemeinschaftsflächen nach dem Reinigungsplan, auf Wunsch zu Randzeiten.',
    s4: 'Nach jedem Durchgang kommen Fotos aufs Handy. Bei Urlaub und Krankheit springt eine Vertretung ein.'
  },
  'ferienwohnung-reinigung': {
    s3: 'Wir reinigen zwischen Abreise und Anreise, wechseln die Wäsche und übergeben die Schlüssel wie vereinbart.',
    s4: 'Nach jedem Wechsel sehen Sie per Foto, dass die Wohnung für den nächsten Gast bereit ist.'
  }
};
const tlGewerbe = (row, i, slug) => {
  const g = TL_GEWERBE[slug];
  if (!g) return row;
  if (i === 0) return ['Am selben Tag · Antwort', row[1], TL_GEWERBE_S1];
  if (i === 1) return ['Meist innerhalb weniger Tage · kostenlos', row[1], row[2]];
  if (i === 2) return [row[0], row[1], g.s3];
  return ['Nach jedem Einsatz', row[1], g.s4];
};
// Startseite bleibt inhaltlich unverändert (Owner-Vorgabe Paket 1): legacy = Fassung vor Runde 1.
const TL_HOME = [
  ['Tag 1 · Antwort am selben Tag', 'Anfrage', 'Per Telefon oder WhatsApp kurz schildern, was ansteht — gern mit Fotos. Sie bekommen eine erste Rückmeldung, keine Warteschleife.'],
  ['Kurzfristig · kostenlos', 'Besichtigung &amp; Festpreis', 'Wir kommen vorbei, schauen uns alles an und nennen Ihnen einen Festpreis. Entsorgungsgebühren rechnen wir nach Beleg ab, ohne Aufschlag. Der Preis steht, bevor wir anfangen.'],
  TL[2],
  ['Direkt nach der Arbeit', 'Foto-Nachweis aufs Handy', 'Vorher-/Nachher-Fotos Ihres Auftrags, direkt aufs Handy. Sie sehen das Ergebnis auch dann, wenn Sie nicht zu Hause waren.']
];
export function auftragsTimeline(partner = false, slug = '', legacy = false) {
  if (legacy && !partner) return timelineFrom(TL_HOME.map(([when, h, p]) => ({ when, h, p })));
  const base = partner ? (slug === 'winterdienst' ? TL_PARTNER_WINTER : TL_PARTNER_DACH) : TL.map((row, i) => { const r = i === 2 ? [row[0], row[1], tlStep3(slug)] : i === 1 ? [row[0], row[1], tlStep2(slug)] : row; return TL_GEWERBE_HUBS.has(slug) ? tlGewerbe(r, i, slug) : r; });
  return timelineFrom(base.map(([when, h, p]) => ({ when, h, p })));
}

// ---------------------------------------------------------------------------
// uspBand — .vals, 4 USP (preview-kit .v h3 .vn).
// ---------------------------------------------------------------------------
const USP = [
  ['01', 'Aus einer Hand', 'Garten, Reinigung, Entrümpelung — ein Ansprechpartner. Winterdienst und Dachrinne laufen über Partner-Fachbetriebe.'],
  ['02', 'Nachweis statt Versprechen', 'Foto-Dokumentation nach jedem Auftrag, direkt aufs Handy.'],
  ['03', 'Festpreis', 'Kostenlose Besichtigung, klarer Preis — kein Nachkommen.'],
  ['04', 'Schnell erreichbar', 'WhatsApp-Antwort am selben Tag.']
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
  { q: 'Bekomme ich alle Leistungen aus einer Hand?', a: 'Ja. Garten, Reinigung, Entrümpelung und Hausmeisterdienste übernehmen wir selbst, Winterdienst und Dachrinne koordinieren wir über einen Partner-Fachbetrieb — Sie müssen nicht für jede Aufgabe einen eigenen Betrieb suchen.' },
  { q: 'Gibt es die Gartenpflege auch regelmäßig im Abo?', a: 'Ja. Auf Wunsch kommen wir im festen 14-tägigen Rhythmus: Rasen, Hecke, Beete, Laub — was die Jahreszeit eben verlangt. Der Rhythmus lässt sich jederzeit anpassen.' },
  { q: 'Was passiert, wenn nach der Reinigung Schlieren bleiben?', a: 'Dann kommen wir am selben Tag noch einmal vorbei und ziehen die betroffenen Scheiben nach — ohne Zusatzkosten. Schlierenfreies Glas ist der Kern unserer Arbeit, deshalb prüfen wir jede Scheibe im Gegenlicht, bevor wir gehen.' },
  { q: 'Wie schnell bekomme ich einen Termin für den Heckenschnitt?', a: 'Eine erste Rückmeldung erhalten Sie nach Ihrer WhatsApp-Anfrage am selben Tag. Den Termin für die kostenlose Besichtigung stimmen wir kurzfristig ab. Im Februar ist die Nachfrage am höchsten — fragen Sie früh an.' }
];
export function faqFilter(faqs, { heading = 'Häufige <em>Fragen.</em>', legacy = false } = {}) {
  const list = arr(faqs).length ? arr(faqs) : FAQ_DEFAULT;
  const items = list.map(f => `<details><summary>${esc(f.q)}<span class="pm" aria-hidden="true"></span></summary><p>${esc(f.a)}</p></details>`).join('');
  return `<div class="head"><h2 class="rv">${heading}</h2></div>` +
    `<p class="intro rv">Kurz und ehrlich beantwortet. Ihre Frage fehlt? <a href="${waHref('Hallo, ich habe eine Frage.')}">Schreiben Sie uns per WhatsApp.</a></p>` +
    `<div class="faq rv"><div class="faq-search">` +
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>` +
    `<input type="search" id="faq-input" placeholder="${legacy ? 'Frage eintippen, z. B. „Kosten“ oder „Termin“' : 'Frage eintippen, z. B. „Kosten“'}"${legacy ? ' data-ph-kurz="Frage eintippen, z. B. „Kosten“"' : ''} aria-label="Fragen durchsuchen" autocomplete="off"></div>` +
    `<p class="faq-count" id="faq-count" aria-live="polite"></p>${items}` +
    `<p class="faq-empty" id="faq-empty">Dazu haben wir noch keine Antwort notiert. <a href="${waHref('Hallo, ich habe eine Frage.')}">Fragen Sie uns per WhatsApp</a>, wir antworten am selben Tag.</p>` +
    `</div>`;
}

// ---------------------------------------------------------------------------
// gebietskarte — .gebiet-wrap mit SVG-Karte (9 Orte, Koordinaten fix aus lock-v2) + ortlist.
// map-info-Text + Ortstexte fuellt site.js. orte optional -> ueberschreibt ortlist-Labels.
// ---------------------------------------------------------------------------
// GEBIET_REGIONEN — alle bedienten Haupt-Orte, nach Region gruppiert. px/py = Pin-Position in %
// auf dem selbst gehosteten OSM-Kartenbild (servicegebiet-karte, z11, center 52.55/13.08, 1200x1200).
// Reproduzierbar via scripts/build-servicegebiet-map.py (0 Laufzeit-Requests, DSGVO-sauber).
export const GEBIET_REGIONEN = [
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
export function gebietskarte({ activeSlug = null, heading = 'Wir fahren dorthin, wo wir <em>pünktlich</em> sein können.', linkOrte = null } = {}) {
  // linkOrte (Owner 18.09.): Set von Ort-Slugs mit eigenem Orts-Hub -> Listeneintrag wird <a href="/standorte/<slug>/"> (interne Links, SEO); ohne Hub bleibt es ein Button.
  const groups = GEBIET_REGIONEN.map(reg => {
    const btns = reg.orts.map(o =>
      (linkOrte && linkOrte.has(o.slug))
        ? `<a class="ortbtn" href="/standorte/${o.slug}/" data-ort="${esc(o.name)}" data-slug="${o.slug}" aria-pressed="${o.slug === activeSlug ? 'true' : 'false'}"><span class="on2">•</span>${esc(o.name)}</a>`
        : `<button class="ortbtn" data-ort="${esc(o.name)}" data-slug="${o.slug}" aria-pressed="${o.slug === activeSlug ? 'true' : 'false'}"><span class="on2">•</span>${esc(o.name)}</button>`).join('');
    return `<div class="ortgroup"><h3 class="ortgroup-h">${esc(reg.label)}</h3>${btns}</div>`;
  }).join('');
  const activeName = (() => { for (const r of GEBIET_REGIONEN) for (const o of r.orts) if (o.slug === activeSlug) return o.name; return null; })();
  const info = activeName && activeSlug !== 'falkensee'
    ? `${esc(activeName)} liegt in unserem Servicegebiet — kostenlose Besichtigung, Anfahrt im Festpreis enthalten.`
    : 'Falkensee ist unser Standort — von hier fahren wir ins ganze Havelland und ans Berliner Umland.';
  return `<section class="sec sec-alt" id="gebiet"><div class="wrap">` +
    `<div class="head"><h2 class="rv">${heading}</h2></div>` +
    `<p class="intro rv">Von Falkensee ins West-Havelland, nach Oberhavel, an den Berliner Westrand und an die Havelseen — kurze Wege, verlässliche Termine. ${linkOrte ? 'Tippen Sie Ihren Ort an, dort stehen alle Leistungen für Ihren Ort:' : 'Fahren Sie über einen Ort oder tippen Sie ihn an:'}</p>` +
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
    // Betriebshaftpflicht: Owner 15.09.2026 bestaetigt; Police-PDF liegt noch nicht im Repo (gbr-firma → Versicherungen/Betriebshaftpflicht/) — dann data-verify entfernen.
    `<!-- Versicherung: Betriebshaftpflicht, bestaetigt 15.09.2026 -->` +
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
  dachrinnenreinigung: ['Sicht- und Funktionsprüfung', 'Der Fachbetrieb prüft Verlauf und Fallrohre vor der Reinigung — damit nichts übersehen wird.',
    'Rinne und Fallrohr frei', 'Laub und Schlamm werden entnommen, das Fallrohr auf Durchlauf geprüft.',
    'Foto-Nachweis aufs Handy', 'Der Fachbetrieb hält den Zustand fest — Sie sehen das Ergebnis vom Dach, ohne selbst hochzusteigen.']
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

// Saison-Teaser Startseite (Umbau 03./04.09.): Herbst (9–11) drei Punkte vor dem Winter, Winter (12–2) drei Winterpunkte, sonst leer.
// Nummernliste wie die Kernleistungen (.list > a.it), kein zweiter Primär-CTA (Hero-CTA bleibt der eine btn-acc). Partner-Framing: Dachrinne/Winterdienst = Partner-Fachbetrieb.
export function saisonTeaser(monat) {
  const m = Number(monat) || 0;
  const herbst = m >= 9 && m <= 11, winter = m === 12 || (m >= 1 && m <= 2);
  if (!herbst && !winter) return '';
  const items = herbst
    ? [['Laub und letzter Schnitt', 'Herbst-Paket: Laub räumen, Rasen, Hecke — ein Termin, Festpreis nach Besichtigung.', '/gartenpflege/#herbst-paket'],
       ['Dachrinne frei', 'Reinigung durch den Partner-Fachbetrieb, bevor das Laub die Rinne verstopft.', '/dachrinnenreinigung/'],
       ['Winterdienst-Saisonvertrag', 'Räumen und Streuen durch den Partner-Fachbetrieb — Vertrag vor dem ersten Schnee.', '/winterdienst/']]
    : [['Winterdienst', 'Saisonvertrag mit Einsatznachweis — Räumen und Streuen durch den Partner-Fachbetrieb.', '/winterdienst/'],
       ['Heckenentfernung bis 28. Februar', 'Radikaler Rückschnitt und Rodung nur bis Ende Februar erlaubt (§ 39 BNatSchG).', '/heckenentfernung/'],
       ['Entrümpelung', 'Keller, Dachboden, Garage — Festpreis nach Besichtigung, Foto-Nachweis danach.', '/entruempelung/']];
  const h2 = herbst ? 'Herbst im Havelland: <em>drei Dinge</em> vor dem Winter.' : 'Winter im Havelland: <em>drei Dinge</em>, die jetzt anstehen.';
  const intro = herbst ? 'Bevor der erste Frost kommt: Laub weg, Rinne frei, Winterdienst geregelt — wir organisieren alles über einen Ansprechpartner.' : 'Schnee, Glätte und die letzte Schnittfrist: Was jetzt zählt, in drei Punkten.';
  const list = items.map((it, i) => `<a class="it rv d${i + 1}" href="${it[2]}"><span class="no">0${i + 1}</span><div><h3>${esc(it[0])}</h3><p>${esc(it[1])}</p></div><span class="arr">→</span></a>`).join('');
  return `<section class="sec section-alt" id="saison"><div class="wrap"><div class="head"><h2 class="serif rv">${h2}</h2></div><p class="intro rv">${esc(intro)}</p><div class="list">${list}</div><p class="rv" style="margin-top:18px">Hausverwaltung oder Gewerbe? <a href="/fuer-hausverwaltungen/">Objektbetreuung mit Winterdienst und Laub →</a></p></div></section>`;
}


// ===========================================================================
// Paket 1 (20.10.2026) — Hub-Grundgerüst. Bilder kommen als fertiges HTML (pic() aus generate.mjs).
// Spec: gbr-firma websites/havelland/website/leistungen-galabau-2026-10/05-design-spec-paket1.md §3.3
// ===========================================================================

// Spec (04-design-entscheidungen): Titel + 1 Satz sichtbar, kein Aufklapper. Der ausführliche Text bleibt in hubs.json (sections[].kurz) für Ortsseiten/Ratgeber.
const kurzHtml = k => {
  if (!k) return '';
  const m = String(k).match(/^([\s\S]+?[.!?])\s+(?=[A-ZÄÖÜ])([\s\S]+)$/);
  if (!m) return `<span>${esc(k)}</span>`;
  return `<span>${esc(m[1])}</span>`;
};
// leistungsListe — Foto links, Leistungen als sichtbare Liste rechts (kein Aufklapper). Ohne Foto: nummerierte Liste.
export function leistungsListe({ h2 = '', fotoHtml = '', items = [], garantie = '', garantieLabel = 'Unsere Garantie' } = {}) {
  const li = arr(items).map((x, i) => fotoHtml
    ? `<li${x.id ? ` id="${esc(x.id)}"` : ''}><b>${esc(x.h3)}</b>${kurzHtml(x.kurz)}</li>`
    : `<li class="ls-num"${x.id ? ` id="${esc(x.id)}"` : ''}><span class="nr">${String(i + 1).padStart(2, '0')}</span><div><b>${esc(x.h3)}</b>${kurzHtml(x.kurz)}</div></li>`).join('');
  // Beginnt der Text selbst mit „…Garantie:“ (z. B. „Geradlinien-Garantie: …“), trägt er das Label — Präfix nicht doppelt rendern.
  const gm = String(garantie || '').match(/^([^:.]{2,40}[Gg]arantie):\s*([\s\S]+)$/);
  const g = garantie ? `<p class="garantie-line rv"><strong>${esc(gm ? gm[1] : garantieLabel)}:</strong> ${esc(gm ? gm[2] : garantie)}</p>` : '';
  return `<section class="sec" id="leistungen"><div class="wrap"><div class="head"><h2 class="serif rv">${esc(h2)}</h2></div><div class="ls-split${fotoHtml ? '' : ' ls-nofoto'} rv">${fotoHtml ? `<div class="ls-foto">${fotoHtml}</div>` : ''}<ul class="ls-list">${li}</ul></div>${g}</div></section>`;
}

// vorteileBlock — „Was Sie davon haben“ (4 nummerierte Vorteile); mit frist → dunkelgrüner Frist-Kasten links.
export function vorteileBlock({ items = [], frist = null, alt = false } = {}) {
  const v = arr(items).map((x, i) => `<div class="it"><span class="nr">0${i + 1}</span><div><h3>${esc(x.h3)}</h3><p>${esc(x.p)}</p></div></div>`).join('');
  if (frist) {
    return `<section class="sec${alt ? ' section-alt' : ''}" id="frist"><div class="wrap"><div class="fx rv"><div class="fx-band"><span class="kick">Gesetzliches Zeitfenster</span><h2>${frist.h2}</h2><p>${esc(frist.text)}</p><a class="btn btn-acc" href="/kontakt/#anfrage">${esc(frist.cta)}</a></div><div><h2 class="serif">Was Sie davon haben</h2><div class="vt-list">${v}</div></div></div></div></section>`;
  }
  return `<section class="sec${alt ? ' section-alt' : ''}" id="vorteile"><div class="wrap"><div class="head"><h2 class="serif rv">Was Sie davon haben</h2></div><div class="vt-list vt-grid rv">${v}</div></div></section>`;
}

// passtBlock — „Passt oft dazu“: Karten mit Bild (ganze Karte = Link).
export function passtBlock({ items = [], alt = true } = {}) {
  const it = arr(items);
  if (!it.length) return '';
  return `<section class="sec${alt ? ' section-alt' : ''}" id="passt"><div class="wrap"><div class="head"><h2 class="serif rv">Passt oft dazu</h2></div><div class="px rv">${it.map(x => `<a class="pxc" href="${esc(x.href)}">${x.imgHtml || ''}<div><h3>${esc(x.h3)}</h3><p>${esc(x.p)}</p><span class="go">${esc(x.link_text || 'Mehr erfahren')}&nbsp;→</span></div></a>`).join('')}</div></div></section>`;
}

// orteBlock — „Unterwegs im Havelland“: echtes Arbeitsfoto + Top-Orte als Buttons + „Alle Orte“.
export function orteBlock({ name = '', fotoHtml = '', orte = [], weitere = [], partner = false, alt = false, ankerPrefix = '' } = {}) {
  const o = arr(orte);
  if (!o.length) return '';
  const w = arr(weitere);   // Owner 20.10. „Verlinkung komplett“: alle übrigen indexierbaren Ortsseiten als schlichte Textlinks
  const satz = partner
    ? 'Wir sitzen in Falkensee und koordinieren den Einsatz im ganzen Havelland, von Nauen bis Spandau.'
    : 'Wir sitzen in Falkensee und kommen selbst zu Ihnen, von Nauen bis Spandau. Die Anfahrt steckt im Festpreis.';
  return `<section class="sec${alt ? ' section-alt' : ''}" id="orte"><div class="wrap"><div class="ox rv">${fotoHtml ? `<div class="ox-foto">${fotoHtml}</div>` : ''}<div><span class="kick">Unterwegs im Havelland</span><h2 class="serif">${esc(name)} in Ihrem Ort</h2><p class="ox-satz">${satz}</p><div class="ox-chips">${o.map(x => `<a href="${esc(x.href)}">${esc(ankerPrefix + x.name)}</a>`).join('')}</div>${w.length ? `<p class="ox-weitere"><span>Weitere Orte:</span> ${w.map(x => `<a href="${esc(x.href)}">${esc(ankerPrefix + x.name)}</a>`).join(' ')}</p>` : ''}<p class="ox-alle"><a href="/standorte/">Alle Orte →</a></p></div></div></div></section>`;
}

// soLaeufts — EIN Ablauf (Timeline) + WhatsApp/Telefon UNTER der Zeitleiste (außerhalb der Linie).
export function soLaeufts({ partner = false, slug = '', name = '', waText = '', alt = true, items = null, reihe = false, hint = '' } = {}) {   // reihe (Paket 3 Standorte): die Schritte stehen als 4-Spalten-Reihe mit Haarlinie oben statt als vertikale Zeitleiste   // items (Paket 3): eigene Schritte [{when?,h?,p}] (Werte ROH wie timelineFrom) statt der Leistungs-Timeline
  return `<section class="sec${alt ? ' section-alt' : ''}${reihe ? '' : ' tl-row'}" id="ablauf"><div class="wrap"><div class="head"><h2 class="serif rv">${name ? `So läuft ${esc(name)} ab` : 'So läuft’s'}</h2></div>${items ? (reihe ? timelineFrom(items).replace('<div class="tl rv">', '<div class="tl tl-reihe rv">') : timelineFrom(items)) : auftragsTimeline(partner, slug)}${hint ? `<p class="sl-hint rv">${hint}</p>` : ''}<div class="cta-row sl-cta rv">${slug === 'winterdienst' ? `<a class="btn btn-acc" href="${waHref(waText || 'Hallo, ich hätte gern eine kostenlose Besichtigung.')}">Flächen per WhatsApp schicken</a><a class="btn btn-line" href="tel:${TEL}">☎ ${TEL_DISP}</a>` : `<a class="btn btn-acc" href="tel:${TEL}">☎ ${TEL_DISP}</a><a class="btn btn-line" href="${waHref(waText || 'Hallo, ich hätte gern eine kostenlose Besichtigung.')}">Per WhatsApp anfragen</a>`}</div></div></section>`;
}

// galabauKarten — Hub mit Unterseiten: Fotokarten (ganze Karte = Link) + Kasten „Außerdem für Sie da“.
export function galabauKarten({ h2 = '', lead = '', kern = [], ausserdem = [] } = {}) {
  return `<section class="sec" id="leistungen"><div class="wrap"><div class="head"><h2 class="serif rv">${esc(h2)}</h2></div>${lead ? `<p class="sec-lead rv">${esc(lead)}</p>` : ''}<div class="gx-grid rv">${arr(kern).map(x => `<a href="${esc(x.href)}">${x.imgHtml || ''}<div><h3>${esc(x.h3)}</h3><p>${esc(x.p)}</p><span class="go">Mehr erfahren →</span></div></a>`).join('')}</div>${arr(ausserdem).length ? `<div class="gx-mehr rv"><h3>Außerdem für Sie da</h3><div class="gx-chips">${arr(ausserdem).map(x => `<a href="${esc(x.href)}">${esc(x.label)}</a>`).join('')}</div></div>` : ''}</div></section>`;
}

// ergebnisPaare — echte Vorher/Nachher-Paare (z. B. Steinreinigung) als Regler-Reihe.
export function ergebnisPaare({ paare = [], h2 = 'Ergebnisse zum Durchziehen' } = {}) {
  const p = arr(paare);
  if (!p.length) return '';
  return `<section class="sec section-alt" id="galerie"><div class="wrap"><div class="head"><h2 class="serif rv">${esc(h2)}</h2></div><div class="ep-grid rv">${p.map(x => `<figure class="ep">${baSlider({ vorher: x.vorher, nachher: x.nachher, w: x.w, h: x.h, alt: x.alt, cap: x.cap, sub: x.sub, vorTxt: x.vorTxt || 'vor der Reinigung', nachTxt: x.nachTxt || 'nach der Reinigung' })}</figure>`).join('')}</div></div></section>`;
}


// ===========================================================================
// Paket 3 (21.10.2026) — Teil A: Standorte. Bilder kommen als fertiges HTML (pic() aus generate.mjs).
// Spec: gbr-firma websites/havelland/website/paket3-standorte-gewerbe-2026-10/01-design-spec.md §4/§5
// Alle Funktionen geben HTML-Strings zurück; Texte werden hier escaped, Link-Ziele löst der Generator auf.
// ===========================================================================

// seitenHero — Kopf nach Hub-Muster (.phero): links Kicker/H1/Lead/CTA/Trust, rechts Bild (+ optionales Badge).
//   h1 = fertiges HTML (mit <em>), lead/kick = Text, cta/trust/bild/badge/leaf = fertiges HTML.
export function seitenHero({ kick = '', h1 = '', lead = '', cta = '', trust = '', bild = '', badge = '', leaf = '', shotCls = '', cls = '' } = {}) {
  return `<section class="phero sx-phero${cls ? ' ' + cls : ''}">${leaf}<div class="wrap grid"><div><span class="kick rv in" style="color:var(--green)">${esc(kick)}</span><h1 class="rv in d1">${h1}</h1><p class="lead rv in d2">${esc(lead)}</p><div class="cta-row rv in d3">${cta}</div>${trust}</div>` +
    `${bild ? `<div class="shot sx-shot${shotCls ? ' ' + shotCls : ''} rv in d2">${bild}${badge}</div>` : ''}</div></section>`;
}

// badgeSitz — weißes Badge am Foto (Klassen von der Startseite: .shot .badge).
export function badgeSitz({ titel = '', zeile = '' } = {}) {
  return `<div class="badge"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg></div><div class="t">${esc(titel)}<span>${esc(zeile)}</span></div></div>`;
}

// sxChips — kleine Pillen-Links [{href,label}] (Leistungs-Chips in Zeilen und Falkensee-Kasten).
const sxChips = chips => `<div class="sx-svc">${arr(chips).map(c => `<a href="${esc(c.href)}">${esc(c.label)}</a>`).join('')}</div>`;

// ortZeile — Zeile der Stufe 1: Ortsname (Serif-Link) · Leistungs-Chips · „Zum Ort →“. mehr = {n,href} für „+ n weitere“ (optional).
export function ortZeile({ slug = '', name = '', plz = '', chips = [], mehr = null } = {}) {
  return `<div class="sx-row rv"><div class="sx-nm"><a class="sx-name" href="/standorte/${esc(slug)}/">${esc(name)}</a>${plz ? `<span class="sx-plz">${esc(plz)}</span>` : ''}</div>${sxChips(chips)}` +
    `<span class="sx-end">${mehr ? `<a class="sx-more" href="${esc(mehr.href)}">+ ${esc(mehr.n)} weitere</a>` : ''}<a class="sx-go" href="/standorte/${esc(slug)}/" aria-label="Zum Ort ${esc(name)}">Zum Ort <span aria-hidden="true">→</span></a></span></div>`;
}

// falkenseeKasten — weißer Kasten für den Sitz: Name, Satz, bis zu 8 Chips, „Alles in Falkensee →“.
export function falkenseeKasten({ slug = 'falkensee', name = 'Falkensee', plz = '', satz = '', chips = [] } = {}) {
  return `<div class="sx-home rv"><div><a class="sx-name" href="/standorte/${esc(slug)}/">${esc(name)}</a>${plz ? `<span class="sx-plz">${esc(plz)}</span>` : ''}${satz ? `<p>${esc(satz)}</p>` : ''}</div>` +
    `<div>${sxChips(chips)}<p class="sx-home-go"><a class="sx-go" href="/standorte/${esc(slug)}/">Alles in ${esc(name)} <span aria-hidden="true">→</span></a></p></div></div>`;
}

// gruppenKopf — Zwischenzeile „Rund um Falkensee“ über einer Zeilen-Gruppe.
export const gruppenKopf = label => `<p class="sx-grp rv">${esc(label)}</p>`;

// stufe2Band — dunkelgrünes Band „Hier kommen wir auch hin“: Regionen mit Ortslinks als Textzeile, Leistungszeile, WhatsApp-Button.
//   regionen: [{label, orte:[{href,name,plz?}]}] · leistungen: [{href,label}] · mehr: {href,label} (z. B. „und mehr“, ohne Trenner angehängt) · h2 = HTML (mit <em>)
export function stufe2Band({ h2 = 'Hier kommen wir <em>auch</em> hin', sub = '', regionen = [], leistungen = [], mehr = null, waHref: wa = '', waLabel = 'Ort per WhatsApp anfragen' } = {}) {
  const reg = arr(regionen).map(r => `<div><h3>${esc(r.label)}</h3><p class="sx-places">${arr(r.orte).map(o => `<span class="sx-pl"><a href="${esc(o.href)}">${esc(o.name)}</a>${o.plz ? `<small>${esc(o.plz)}</small>` : ''}</span>`).join('')}</p></div>`).join('');
  const lst = arr(leistungen);
  return `<section class="sec zone-dark sx-far" id="auch"><div class="wrap"><h2 class="serif rv">${h2}</h2>${sub ? `<p class="sx-sub rv">${esc(sub)}</p>` : ''}<div class="sx-far-grid rv">${reg}</div>` +
    `${lst.length ? `<p class="sx-far-svc rv">${lst.map(l => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join('<span aria-hidden="true"> · </span>')}${mehr ? ` <a href="${esc(mehr.href)}">${esc(mehr.label)}</a>` : ''}</p>` : ''}` +
    `${wa ? `<div class="cta-row rv"><a class="btn btn-acc" href="${esc(wa)}">${esc(waLabel)}</a></div>` : ''}</div></section>`;
}

// kernKarten — „Was wir in <Ort> für Sie erledigen“: 4 Fotokarten (ganze Karte = Link) + Zeile „Außerdem in <Ort>:“.
//   items: [{name, kurz, href, img (fertiges HTML), p, ortsseite:boolean}] · weitere: [{href,label}] · note: Zusatzsatz unter der Zeile (z. B. Partner-Hinweis)
export function kernKarten({ ort = '', items = [], weitere = [], note = '', lead = '', alt = true } = {}) {
  const cards = arr(items).map(x => `<a href="${esc(x.href)}">${x.img || ''}<div><h3>${esc(x.name)}</h3><p>${esc(x.p)}</p><span class="go">${x.ortsseite ? `${esc(x.kurz || x.name)} in ${esc(ort)}` : 'Zur Leistung'} <span aria-hidden="true">→</span></span></div></a>`).join('');
  const w = arr(weitere);
  return `<section class="sec${alt ? ' section-alt' : ''}" id="leistungen"><div class="wrap"><h2 class="serif rv">Was wir in ${esc(ort)} für Sie <em>erledigen</em></h2>${lead ? `<p class="sx-sub rv">${esc(lead)}</p>` : ''}` +
    `<div class="sx-kern rv">${cards}</div>` +
    `${w.length ? `<p class="sx-mehr rv"><b>Außerdem in ${esc(ort)}:</b>${w.map(l => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join('')}</p>` : ''}${note ? `<p class="sx-note rv">${esc(note)}</p>` : ''}</div></section>`;
}

// anfaelltBlock — „Was in <Ort> anfällt“: 3 nummerierte Punkte {h3,p}. Fallback prose (nur wenn keine items): ein Textabsatz.
//   teile: Ortsteile (Namen) → Zeile „Auch in …“ (SEO-Drift: Ortsteile bleiben im sichtbaren Text)
export function anfaelltBlock({ ort = '', items = [], prose = '', teile = [], alt = false } = {}) {
  const it = arr(items);
  if (!it.length && !prose) return '';
  const body = it.length
    ? `<div class="sx-ort rv">${it.map((x, i) => `<div><span class="n">${String(i + 1).padStart(2, '0')}</span><h3>${esc(x.h3)}</h3><p>${esc(x.p)}</p></div>`).join('')}</div>`
    : `<div class="prose wide rv" style="margin:22px 0 0"><p>${esc(prose)}</p></div>`;
  const t = arr(teile);
  return `<section class="sec${alt ? ' section-alt' : ''}" id="anfaellt"><div class="wrap"><h2 class="serif rv">Was in ${esc(ort)} <em>anfällt</em></h2>${body}` +
    `${t.length ? `<p class="sx-teile rv">Auch in ${esc(t.join(', '))} und Umgebung.</p>` : ''}</div></section>`;
}

// naeheZeile — „In der Nähe“: Nachbar-Standortseiten als Textzeile + „Alle Orte →“. orte: [{href,name}]
export function naeheZeile({ orte = [], alt = false } = {}) {
  return `<section class="sec${alt ? ' section-alt' : ''}" id="naehe"><div class="wrap"><h2 class="serif rv">In der <em>Nähe</em></h2><p class="sx-nah rv">${arr(orte).map(o => `<a href="${esc(o.href)}">${esc(o.name)}</a>`).join('')}<a class="sx-alle" href="/standorte/">Alle Orte <span aria-hidden="true">→</span></a></p></div></section>`;
}

// faqKurz — kurze FAQ-Sektion ohne Suchfeld (3 bis 5 Fragen), natives <details>, KEIN FAQPage-Schema. h2 = HTML (mit <em>).
export function faqKurz({ h2 = 'Häufige <em>Fragen</em>', faqs = [], alt = true, id = 'faq' } = {}) {
  const items = arr(faqs).map(f => `<details><summary>${esc(f.q)}<span class="pm" aria-hidden="true"></span></summary><p>${esc(f.a)}</p></details>`).join('');
  if (!items) return '';
  return `<section class="sec${alt ? ' section-alt' : ''}" id="${esc(id)}"><div class="wrap"><h2 class="serif rv">${h2}</h2><div class="faq rv">${items}</div></div></section>`;
}


// ===========================================================================
// Paket 3 (21.10.2026) — Teil B: Gewerbe. /gewerbe/, Zielgruppenseiten, Startseiten-Band.
// Spec: gbr-firma websites/havelland/website/paket3-standorte-gewerbe-2026-10/01-design-spec.md Teil B (B3/B4).
// Bilder kommen als fertiges HTML (pic() aus generate.mjs). Überschriften (h2) = fertiges HTML mit genau einem <em>; alle übrigen Texte werden hier escaped.
// ===========================================================================

// zielgruppenKarten — vier Karten (ganze Karte = Link). dark=true: Startseiten-Band (.zone-dark.gw-band) mit Link „Alles für Gewerbe →“.
//   items: [{href, h3, p, label, imgHtml}]
export function zielgruppenKarten({ h2 = '', sub = '', items = [], dark = false, link = null, id = 'zielgruppen', alt = true } = {}) {
  const cards = arr(items).map(x => `<a href="${esc(x.href)}">${x.imgHtml || ''}<div><h3>${esc(x.h3)}</h3><p>${esc(x.p)}</p><span class="go">${esc(x.label || 'Mehr erfahren')}&nbsp;<span aria-hidden="true">→</span></span></div></a>`).join('');
  return `<section class="sec${dark ? ' zone-dark gw-band' : (alt ? ' section-alt' : '')}" id="${esc(id)}"><div class="wrap"><h2 class="serif rv">${h2}</h2>${sub ? `<p class="sx-sub rv">${esc(sub)}</p>` : ''}` +
    `<div class="gw-zg rv">${cards}</div>${link ? `<p class="gw-band-link rv"><a href="${esc(link.href)}">${esc(link.label)} <span aria-hidden="true">→</span></a></p>` : ''}</div></section>`;
}

// gwListe — nummerierte 2-Spalten-Liste, Titel verlinkt auf den Hub. Keine Ausführungs-Labels (Owner 20.10.), außer item.chip wird ausdrücklich übergeben (nur /fuer-hausverwaltungen/).
//   items: [{href, h3, p, chip?, partner?, linkLabel?}]
export function gwListe({ h2 = '', sub = '', items = [], alt = false, id = 'leistungen', note = '' } = {}) {
  const li = arr(items).map((x, i) => `<div class="gw-li rv"><span class="n">${String(i + 1).padStart(2, '0')}</span><div><h3>${x.href ? `<a href="${esc(x.href)}">${esc(x.h3)}</a>` : esc(x.h3)}</h3><p>${esc(x.p)}</p>${(x.href && x.linkLabel) ? `<p class="gw-go"><a href="${esc(x.href)}">${esc(x.linkLabel)} <span aria-hidden="true">→</span></a></p>` : ''}</div></div>`).join('');
  if (!li) return '';
  return `<section class="sec${alt ? ' section-alt' : ''}" id="${esc(id)}"><div class="wrap"><h2 class="serif rv">${h2}</h2>${sub ? `<p class="sx-sub rv">${esc(sub)}</p>` : ''}<div class="gw-list">${li}</div>${note ? `<p class="gw-note rv">${note}</p>` : ''}</div></section>`;
}

// zusagenBand4 — dunkelgrünes Band mit vier nummerierten Zusagen. items: [{h3, p}]
export function zusagenBand4({ h2 = '', sub = '', items = [], id = 'zusagen' } = {}) {
  const it = arr(items);
  if (!it.length) return '';
  return `<section class="sec zone-dark gw-zus" id="${esc(id)}"><div class="wrap"><h2 class="serif rv">${h2}</h2>${sub ? `<p class="sx-sub rv">${esc(sub)}</p>` : ''}` +
    `<div class="gw-why rv">${it.map((x, i) => `<div><span class="n">${String(i + 1).padStart(2, '0')}</span><h3>${esc(x.h3)}</h3><p>${esc(x.p)}</p></div>`).join('')}</div></div></section>`;
}

// zweiWege — Pflege/Bestatter: „Einrichtung beauftragt“ | „Angehörige verweisen“. Beide Seiten: Überschrift, Aufzählung, Button (href vom Aufrufer).
//   links/rechts: {h3, items:[], button, href, cls?}
export function zweiWege({ h2 = '', lead = '', beauftragen = {}, verweisen = {}, alt = true } = {}) {
  const box = (b, primary) => `<div class="gw-box"><h3>${esc(b.h3)}</h3><ul class="bl">${arr(b.items).map(t => `<li>${esc(t)}</li>`).join('')}</ul><a class="btn ${primary ? 'btn-acc' : 'btn-line'}" href="${esc(b.href)}">${esc(b.button)}</a>${b.hint ? `<p class="gw-hint">${esc(b.hint)}</p>` : ''}</div>`;
  return `<section class="sec${alt ? ' section-alt' : ''} zwei-wege" id="zwei-wege"><div class="wrap"><h2 class="serif rv">${h2}</h2>${lead ? `<p class="sx-sub rv">${esc(lead)}</p>` : ''}<div class="gw-two rv">${box(beauftragen, true)}${box(verweisen, false)}</div></div></section>`;
}

// anlaesseBlock — „Wann Firmen uns rufen“: 3 nummerierte Punkte {h3, p} (Raster wie „Was in <Ort> anfällt“).
export function anlaesseBlock({ h2 = '', items = [], alt = false, id = 'anlaesse' } = {}) {
  const it = arr(items);
  if (!it.length) return '';
  return `<section class="sec${alt ? ' section-alt' : ''}" id="${esc(id)}"><div class="wrap"><h2 class="serif rv">${h2}</h2><div class="sx-ort rv">${it.map((x, i) => `<div><span class="n">${String(i + 1).padStart(2, '0')}</span><h3>${esc(x.h3)}</h3><p>${esc(x.p)}</p></div>`).join('')}</div></div></section>`;
}

// fuerWen — „Für wen wir arbeiten“ (Hausverwaltungen): Einleitung links, Objektarten als Haarlinien-Liste rechts. items: [{name, body?}]
export function fuerWen({ h2 = '', body = '', items = [], alt = false, id = 'fuer-wen' } = {}) {
  const it = arr(items);
  return `<section class="sec${alt ? ' section-alt' : ''}" id="${esc(id)}"><div class="wrap"><div class="gw-fw rv"><div><h2 class="serif">${h2}</h2>${body ? `<p>${esc(body)}</p>` : ''}</div>` +
    `${it.length ? `<ul class="gw-ob">${it.map(x => `<li><b>${esc(x.name)}</b>${x.body ? `<span>${esc(x.body)}</span>` : ''}</li>`).join('')}</ul>` : ''}</div></div></section>`;
}

// ablaufSektion — Ablauf als Timeline mit eigener H2 + Buttons UNTER der Zeitleiste. items: [{when?, h?, p}] (ROH-Text, wird hier escaped); cta = fertiges HTML.
export function ablaufSektion({ h2 = '', items = [], cta = '', alt = true, id = 'ablauf' } = {}) {
  const rows = arr(items).map(x => ({ when: x.when ? esc(x.when) : '', h: x.h ? esc(x.h) : '', p: esc(x.p) }));
  if (!rows.length) return '';
  return `<section class="sec${alt ? ' section-alt' : ''}" id="${esc(id)}"><div class="wrap"><div class="head"><h2 class="serif rv">${h2}</h2></div>${timelineFrom(rows)}${cta ? `<div class="cta-row sl-cta rv">${cta}</div>` : ''}</div></section>`;
}
