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
  check('home', 'cal', classCount(h, 'cal') >= 1);
  check('home', 'pills', classCount(h, 'pills') >= 1);
  check('home', 'kpanel', classCount(h, 'kpanel') >= 1);
  check('home', 'echt-card', classCount(h, 'echt-card') >= 1);
  check('home', 'car-track', classCount(h, 'car-track') >= 1);
  check('home', 'pgrid', classCount(h, 'pgrid') >= 1);
  check('home', 'wa-grid', classCount(h, 'wa-grid') >= 1);
  check('home', 'tl', classCount(h, 'tl') >= 1);
  check('home', 'vals', classCount(h, 'vals') >= 1);
  check('home', 'faq-search', classCount(h, 'faq-search') >= 1);
  check('home', 'gebiet-wrap', classCount(h, 'gebiet-wrap') >= 1);
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

// ---- SERVICE-HUB gartenpflege (kein Hecken-Material) ----
page('gartenpflege/index.html', 'HUB gartenpflege', h => {
  check('gartenpflege', 'gstrip', classCount(h, 'gstrip') >= 1);
  check('gartenpflege', 'wa-grid', classCount(h, 'wa-grid') >= 1);
  check('gartenpflege', 'tl', classCount(h, 'tl') >= 1);
  check('gartenpflege', 'faq', classCount(h, 'faq') >= 1);
  check('gartenpflege', 'ba==0 (kein V/N)', classCount(h, 'ba') === 0);
  check('gartenpflege', 'pills==0 (kein Kompass)', classCount(h, 'pills') === 0);
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

// ---- B2B fuer-hausverwaltungen ----
page('fuer-hausverwaltungen/index.html', 'B2B fuer-hausverwaltungen', h => {
  check('b2b', 'Angebot', hasI(h, 'Angebot'));
  check('b2b', 'E-Mail', has(h, 'E-Mail') || has(h, 'mailto:'));
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
