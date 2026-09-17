// accept.mjs — Komponenten-Praesenz-Gate NACH dem Build.
// Prueft je Seitentyp, ob die Pflicht-Komponenten (Klassen-Hooks) im gerenderten HTML stehen.
// Ausgabe: je Regel ✓/✗ + Abschluss "ACCEPT GRÜN" (exit 0) oder "ACCEPT ROT: <fehlende>" (exit 1).
// Run: node scripts/accept.mjs   (setzt voraus: FULL=1 node scripts/generate.mjs lief bereits)
import fs from 'fs';

const read = rel => { try { return fs.readFileSync(`website/${rel}`, 'utf8'); } catch { return null; } };

// Zaehlt Elemente, deren class-Attribut das Token exakt enthaelt (Wort-genau, kein Praefix-Treffer).
function classCount(html, token) {
  if (!html) return 0;
  let n = 0, m; const re = /class="([^"]*)"/g;
  while ((m = re.exec(html)) !== null) if (m[1].split(/\s+/).includes(token)) n++;
  return n;
}
const has = (html, s) => !!html && html.indexOf(s) > -1;
const hasI = (html, s) => !!html && html.toLowerCase().indexOf(s.toLowerCase()) > -1;

const fails = [];        // gesammelte Fehl-IDs fuer die Schluss-Zeile
let lines = [];

function P(label) { lines.push(`\n${label}`); }
// check(id, ok): loggt ✓/✗, sammelt Fehler
function check(page, name, ok) {
  lines.push(`  ${ok ? '✓' : '✗'} ${name}`);
  if (!ok) fails.push(`${page}:${name}`);
}

// Seiten-Regel: fileMissing zaehlt als kompletter Fehlschlag
function page(rel, label, fn) {
  P(`${label}  [${rel}]`);
  const html = read(rel);
  if (html == null) { check(rel, 'Seite vorhanden', false); return; }
  fn(html);
}

// ---- HOME ----
page('index.html', 'HOME', h => {
  check('home', 'ba>=3', classCount(h, 'ba') >= 3);
  check('home', 'gstrip', classCount(h, 'gstrip') >= 1);
  check('home', 'jz-grid', classCount(h, 'jz-grid') >= 1);
  check('home', 'echt-card>=2', classCount(h, 'echt-card') >= 2);   // 17.09.: Thuja + Gutzke-Gartenschuppen
  check('home', 'hero-strip', classCount(h, 'hero-strip') >= 1);
  check('home', 'kein heckenarten', !has(h, 'id="heckenarten"'));
  check('home', 'car-track', classCount(h, 'car-track') >= 1);
  check('home', 'pgrid', classCount(h, 'pgrid') >= 1);
  check('home', 'wa-grid', classCount(h, 'wa-grid') >= 1);
  check('home', 'tl', classCount(h, 'tl') >= 1);
  check('home', 'vals', classCount(h, 'vals') >= 1);
  check('home', 'faq-search', classCount(h, 'faq-search') >= 1);
  check('home', 'gebiet-wrap', classCount(h, 'gebiet-wrap') >= 1);
  check('home', 'cluster', classCount(h, 'cluster') >= 1);      // 17.09.: 4 Cluster-Kacheln statt 6 Einzelkarten
  check('home', 'cl', classCount(h, 'cl') === 4);
  check('home', 'kein fonts.googleapis', !has(h, 'fonts.googleapis'));
});

// ---- SERVICE-HUB heckenschnitt ----
page('heckenschnitt/index.html', 'HUB heckenschnitt', h => {
  check('heckenschnitt', 'ba>=1', classCount(h, 'ba') >= 1);
  check('heckenschnitt', 'gstrip', classCount(h, 'gstrip') >= 1);
  check('heckenschnitt', 'cal', classCount(h, 'cal') >= 1);
  check('heckenschnitt', 'pills', classCount(h, 'pills') >= 1);
  check('heckenschnitt', 'wa-grid', classCount(h, 'wa-grid') >= 1);
  check('heckenschnitt', 'tl', classCount(h, 'tl') >= 1);
  check('heckenschnitt', 'faq', classCount(h, 'faq') >= 1);
  check('heckenschnitt', 'echt-card', classCount(h, 'echt-card') >= 1);
});

// ---- SERVICE-HUB entruempelung (Pillar, 17.09.) ----
page('entruempelung/index.html', 'HUB entruempelung', h => {
  check('entruempelung', 'fall>=2', classCount(h, 'fall') >= 2);
  check('entruempelung', 'anker nebengebaeude/gartenhaus/gewerbe', has(h, 'id="nebengebaeude"') && has(h, 'id="gartenhaus"') && has(h, 'id="gewerbe"'));
  check('entruempelung', 'gstrip Beleg', has(h, 'Entsorgungsgebühren weisen wir nach Beleg aus'));
  check('entruempelung', 'kein inklusive Entsorgung', !hasI(h, 'inklusive Entsorgung') && !hasI(h, 'Entsorgung inklusive'));
  check('entruempelung', 'faq', classCount(h, 'faq') >= 1);
  check('entruempelung', 'layout ueberblick: kacheln', classCount(h, 'leist') >= 1 && (h.match(/<details class="mehr">/g) || []).length >= 5);
  check('entruempelung', 'cta >= 3 (zwischen + endband + sticky)', (h.match(/class="cta-row/g) || []).length >= 4);
  check('entruempelung', 'kein nicht-anbieten-Abschnitt', !hasI(h, 'was wir nicht anbieten'));
  check('entruempelung', 'KI-Szene nicht als Noah-Foto', !hasI(h, 'Noah Telo beim Heckenschnitt') && !hasI(h, 'Das Foto zeigt ihn'));
});

// ---- SERVICE-HUB galabau (Cluster-Pillar GaLaBau & Rodung, W2+W3 Task 4, 17.09.) ----
page('galabau/index.html', 'HUB galabau', h => {
  check('galabau', 'anker', has(h, 'id="genehmigung"') && has(h, 'id="freiraeumen"'));
  check('galabau', 'links sub-hubs', has(h, 'href="/zaunbau/"') && has(h, 'href="/heckenentfernung/"') && has(h, 'href="/gartenrodung/"') && has(h, 'href="/baumstumpf-entfernen/"'));
  check('galabau', 'fall', classCount(h, 'fall') >= 1);
  check('galabau', 'kein inklusive', !hasI(h, 'inklusive Entsorgung'));
  check('galabau', 'layout ueberblick: kacheln', classCount(h, 'leist') >= 1 && (h.match(/<details class="mehr">/g) || []).length >= 5);
  check('galabau', 'keine nicht-anbieten/grenzen/reihenfolge/saison-Abschnitte', !hasI(h, 'bewusst nicht anbieten') && !has(h, 'id="grenzen"') && !has(h, 'id="reihenfolge"') && !has(h, 'id="saison"'));
  check('galabau', 'cta >= 3', (h.match(/class="cta-row/g) || []).length >= 4);
});

// ---- SERVICE-HUB haushaltsaufloesung (W3b, 17.09.) ----
page('haushaltsaufloesung/index.html', 'HUB haushaltsaufloesung', h => {
  check('haushaltsaufloesung', 'layout ueberblick: kacheln', classCount(h, 'leist') >= 1 && (h.match(/<details class="mehr">/g) || []).length >= 4);
  check('haushaltsaufloesung', 'anker erbfall/pflegefall/vollmacht', has(h, 'id="erbfall"') && has(h, 'id="pflegefall"') && has(h, 'id="vollmacht"'));
  check('haushaltsaufloesung', 'cta >= 3', (h.match(/class="cta-row/g) || []).length >= 4);
  check('haushaltsaufloesung', 'kein inklusive Entsorgung', !hasI(h, 'inklusive Entsorgung') && !hasI(h, 'Entsorgung inklusive'));
});

// ---- TIER1-ORTSSEITEN (W2): Tiefen-Block. Scharf nur wenn tiefBlock vorhanden ODER TIER1=1 gesetzt ist —
// Task 2 liefert die tief-Copy in ortsseiten.json und schaltet die Checks mit `TIER1=1 node scripts/accept.mjs` scharf.
for (const rel of ['entruempelung-falkensee/index.html', 'entruempelung-brieselang/index.html', 'haushaltsaufloesung-falkensee/index.html']) {
  page(rel, `TIER1 ${rel.split('/')[0]}`, h => {
    if (process.env.TIER1 || classCount(h, 'tief')) {
      check(rel, 'tief', classCount(h, 'tief') >= 1);
      check(rel, 'ortsblock', classCount(h, 'ortsblock') >= 1);
      check(rel, 'kein inklusive Entsorgung', !hasI(h, 'inklusive Entsorgung') && !hasI(h, 'Entsorgung inklusive'));
      check(rel, 'kein Kundenname', !hasI(h, 'gutzke'));
      check(rel, 'tief kacheln', classCount(h, 'leist') >= 1);
      check(rel, 'cta nach tief', hasI(h, 'Foto schicken, Festpreis bekommen'));
    }
  });
}

// ---- RATGEBER lokal (W2) ----
page('ratgeber/wertstoffhof-falkensee/index.html', 'RATGEBER wertstoffhof', h => { check('rat-wsh', 'table', has(h, '<table')); check('rat-wsh', 'cta hub', has(h, 'href="/entruempelung/"')); check('rat-wsh', 'aeo', classCount(h, 'aeo') >= 1 || has(h, 'class="aeo')); });
page('ratgeber/sperrmuell-havelland-anmelden/index.html', 'RATGEBER sperrmuell', h => { check('rat-sm', 'ausschluss', hasI(h, 'Haushaltsauflösung')); check('rat-sm', 'cta hub', has(h, 'href="/entruempelung/"')); });
page('ratgeber/keller-garage-dachboden-entruempeln/index.html','RATGEBER keller', h => { check('rat-kgd','table', has(h,'<table')); check('rat-kgd','beispiel', has(h,'1.190')); check('rat-kgd','cta hub', has(h,'href="/entruempelung/"')); });
page('ratgeber/gartenhaus-abreissen-entsorgen/index.html','RATGEBER gartenhaus', h => { check('rat-gh','table', has(h,'<table')); check('rat-gh','keine rechtsberatung', hasI(h,'keine Rechtsberatung')); check('rat-gh','link galabau', has(h,'href="/galabau/"')); });

// ---- SERVICE-HUB gartenpflege (kein Hecken-Material) ----
page('gartenpflege/index.html', 'HUB gartenpflege', h => {
  check('gartenpflege', 'gstrip', classCount(h, 'gstrip') >= 1);
  check('gartenpflege', 'wa-grid', classCount(h, 'wa-grid') >= 1);
  check('gartenpflege', 'tl', classCount(h, 'tl') >= 1);
  check('gartenpflege', 'faq', classCount(h, 'faq') >= 1);
  check('gartenpflege', 'ba==0 (kein V/N)', classCount(h, 'ba') === 0);
  check('gartenpflege', 'pills==0 (kein Kompass)', classCount(h, 'pills') === 0);
});

// ---- SERVICE-HUB heckenentfernung (Herbst-Paket, kein V/N-Material, kein Kompass) ----
page('heckenentfernung/index.html', 'HUB heckenentfernung', h => {
  check('heckenentfernung', 'gstrip', classCount(h, 'gstrip') >= 1);
  check('heckenentfernung', 'wa-grid', classCount(h, 'wa-grid') >= 1);
  check('heckenentfernung', 'tl', classCount(h, 'tl') >= 1);
  check('heckenentfernung', 'faq', classCount(h, 'faq') >= 1);
  check('heckenentfernung', 'ba==0 (kein V/N)', classCount(h, 'ba') === 0);
  check('heckenentfernung', 'pills==0 (kein Kompass)', classCount(h, 'pills') === 0);
});

// ---- SERVICE-HUB baumstumpf-entfernen (Herbst-Paket) ----
page('baumstumpf-entfernen/index.html', 'HUB baumstumpf-entfernen', h => {
  check('baumstumpf-entfernen', 'gstrip', classCount(h, 'gstrip') >= 1);
  check('baumstumpf-entfernen', 'wa-grid', classCount(h, 'wa-grid') >= 1);
  check('baumstumpf-entfernen', 'tl', classCount(h, 'tl') >= 1);
  check('baumstumpf-entfernen', 'faq', classCount(h, 'faq') >= 1);
  check('baumstumpf-entfernen', 'ba==0 (kein V/N)', classCount(h, 'ba') === 0);
  check('baumstumpf-entfernen', 'pills==0 (kein Kompass)', classCount(h, 'pills') === 0);
});

// ---- SERVICE-HUB fensterreinigung (klassisch) ----
page('fensterreinigung/index.html', 'HUB fensterreinigung', h => {
  check('fensterreinigung', 'gstrip', classCount(h, 'gstrip') >= 1);
  check('fensterreinigung', 'wa-grid', classCount(h, 'wa-grid') >= 1);
  check('fensterreinigung', 'tl', classCount(h, 'tl') >= 1);
  check('fensterreinigung', 'faq', classCount(h, 'faq') >= 1);
  check('fensterreinigung', 'ba==0', classCount(h, 'ba') === 0);
  check('fensterreinigung', 'pills==0', classCount(h, 'pills') === 0);
  check('fensterreinigung', 'kein Teleskop', !hasI(h, 'Teleskop'));
  check('fensterreinigung', 'kein Osmose', !hasI(h, 'Osmose'));
});

// ---- ORTSSEITE heckenschnitt-falkensee ----
page('heckenschnitt-falkensee/index.html', 'ORTSSEITE heckenschnitt-falkensee', h => {
  check('hs-falkensee', 'ba>=1', classCount(h, 'ba') >= 1);
  check('hs-falkensee', 'gstrip', classCount(h, 'gstrip') >= 1);
  check('hs-falkensee', 'wa-grid', classCount(h, 'wa-grid') >= 1);
  check('hs-falkensee', 'faq', classCount(h, 'faq') >= 1);
});

// ---- ORTSSEITE gartenpflege-falkensee ----
page('gartenpflege-falkensee/index.html', 'ORTSSEITE gartenpflege-falkensee', h => {
  check('gp-falkensee', 'gstrip', classCount(h, 'gstrip') >= 1);
  check('gp-falkensee', 'wa-grid', classCount(h, 'wa-grid') >= 1);
  check('gp-falkensee', 'faq', classCount(h, 'faq') >= 1);
  check('gp-falkensee', 'ba==0', classCount(h, 'ba') === 0);
});

// ---- ORTS-HUB standorte/falkensee ----
page('standorte/falkensee/index.html', 'ORTS-HUB standorte/falkensee', h => {
  check('standorte-falkensee', 'cards', classCount(h, 'card') >= 1);
  check('standorte-falkensee', 'trustbadges ODER gstrip', classCount(h, 'trustbadges') >= 1 || classCount(h, 'gstrip') >= 1);
  check('standorte-falkensee', 'wa-grid', classCount(h, 'wa-grid') >= 1);
});

// ---- RATGEBER-ARTIKEL wann-hecke-schneiden ----
page('ratgeber/wann-hecke-schneiden/index.html', 'RATGEBER wann-hecke-schneiden', h => {
  check('ratgeber-artikel', 'cal', classCount(h, 'cal') >= 1);
  check('ratgeber-artikel', 'faq (native details)', classCount(h, 'faq') >= 1 && has(h, '<details'));
});

// ---- RATGEBER-INDEX ----
page('ratgeber/index.html', 'RATGEBER-INDEX', h => {
  check('ratgeber-index', 'cards', classCount(h, 'card') >= 1);
});

// ---- BEWERTUNGEN ----
page('bewertungen/index.html', 'BEWERTUNGEN', h => {
  check('bewertungen', 'bewerten (Deeplink-CTA)', hasI(h, 'bewerten'));
  check('bewertungen', 'auftrag ODER Zähler-Hinweis', hasI(h, 'auftrag') || hasI(h, 'nach jedem') || hasI(h, 'zähler'));
  // Rating-Anzeige erlaubt (echt, via GBP-API/SERP verifiziert), ABER kein self-serving aggregateRating/ratingValue-Schema-Markup (Google-Policy)
  check('bewertungen', 'kein aggregateRating-Schema (self-serving)', !has(h, 'aggregateRating') && !has(h, 'ratingValue'));
});

// ---- UEBER-UNS (Gruender-Duo) ----
page('ueber-uns/index.html', 'UEBER-UNS', h => {
  check('ueber-uns', 'Noah Telo', has(h, 'Noah Telo'));
  check('ueber-uns', 'Maurice Brehm', has(h, 'Maurice Brehm'));
  check('ueber-uns', 'trustbadges', classCount(h, 'trustbadges') >= 1);
  check('ueber-uns', 'kein "und sein Partner"', !hasI(h, 'und sein Partner'));
  check('ueber-uns', 'kein "Inhaber"', !hasI(h, 'Inhaber'));
});

// ---- KONTAKT ----
page('kontakt/index.html', 'KONTAKT', h => {
  check('kontakt', 'form id="anfrage"', has(h, 'id="anfrage"'));
  check('kontakt', 'E-Mail-Feld/mailto', has(h, 'type="email"') || has(h, 'name="email"') || has(h, 'mailto:'));
  check('kontakt', 'DSGVO-Checkbox', has(h, 'type="checkbox"'));
});

// ---- B2B fuer-hausverwaltungen (17.09. Umbau Objektpflege: Referenz-Satz, 6 Leistungskarten, CTA-Text, kein Preis) ----
page('fuer-hausverwaltungen/index.html', 'B2B fuer-hausverwaltungen', h => {
  check('b2b', 'Angebot', hasI(h, 'Angebot'));
  check('b2b', 'E-Mail', has(h, 'E-Mail') || has(h, 'mailto:'));
  check('b2b', 'referenz', has(h, 'Wir betreuen bereits Objekte im Havelland in festen Pflegeverträgen.'));
  check('b2b', 'karten', classCount(h, 'card') >= 6);
  check('b2b', 'cta angebot', hasI(h, 'Angebot für Ihr Objekt'));
  check('b2b', 'kein preis', !/\d+ ?€/.test(h.replace(/<script[\s\S]*?<\/script>/g, '')));
});

// ---- ADS-LANDINGPAGES /lp/ (v2 14.09.: Site-Komponenten statt .lp-*-Nachbauten; LPs laden kein site.js -> jedes rv braucht in) ----
const rvOhneIn = h => { const re = /class="([^"]*)"/g; let m, n = 0; while ((m = re.exec(h)) !== null) { const t = m[1].split(/\s+/); if (t.includes('rv') && !t.includes('in')) n++; } return n; };
const lpAltKlassen = h => (h.match(/\b(lp-card|lp-steps|lp-quote|lp-ba-grid|lp-trust)\b/g) || []).length;
const LPS = [
  ['lp/haushaltsaufloesung-havelland/index.html', 'LP haushaltsaufloesung', { reviews: true, ba: 2 }],
  ['lp/messie-wohnung-raeumung/index.html', 'LP messie', { reviews: true }],
  ['lp/gewerbe-entruempelung/index.html', 'LP gewerbe', { reviews: true }],
  ['lp/danke/index.html', 'LP danke', { danke: true }],
];
for (const [rel, label, o] of LPS) page(rel, label, h => {
  const id = label.replace(/\s+/g, '-').toLowerCase();
  check(id, 'phero>=1', classCount(h, 'phero') >= 1);
  check(id, 'tl>=1', classCount(h, 'tl') >= 1);
  if (!o.danke) {
    check(id, 'gstrip>=1', classCount(h, 'gstrip') >= 1);
    check(id, 'trust-row>=1', classCount(h, 'trust-row') >= 1);
    check(id, 'form id="anfrage"', has(h, 'id="anfrage"'));
  }
  if (o.reviews) check(id, 'review-card>=2', classCount(h, 'review-card') >= 2);
  if (o.ba) check(id, `ba>=${o.ba}`, classCount(h, 'ba') >= o.ba);
  check(id, 'kein rv ohne in', rvOhneIn(h) === 0);
  check(id, 'keine lp-card/lp-steps/lp-quote/lp-ba-grid/lp-trust', lpAltKlassen(h) === 0);
});

// ---- GLOBAL Stichprobe (5 Seiten) ----
P('GLOBAL Stichprobe (5 Seiten)');
const sample = ['index.html', 'heckenschnitt/index.html', 'gartenpflege/index.html', 'standorte/falkensee/index.html', 'ratgeber/index.html'];
for (const rel of sample) {
  const h = read(rel);
  if (h == null) { check('global', `${rel} vorhanden`, false); continue; }
  check('global', `${rel}: keine Bild-Labels`, !has(h, 'Beispielfoto') && !has(h, 'ba-proof') && !has(h, 'pbadge'));
  check('global', `${rel}: site.js verlinkt`, has(h, 'assets/js/site.js'));
  check('global', `${rel}: scta vorhanden`, classCount(h, 'scta') >= 1);
}

// ---- Ausgabe ----
console.log(lines.join('\n'));
if (fails.length) {
  console.log(`\nACCEPT ROT: ${fails.length} fehlend — ${fails.join(', ')}`);
  process.exit(1);
} else {
  console.log('\nACCEPT GRÜN');
  process.exit(0);
}
