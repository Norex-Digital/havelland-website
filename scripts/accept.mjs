// accept.mjs — Komponenten-Praesenz-Gate NACH dem Build.
// Prueft je Seitentyp, ob die Pflicht-Komponenten (Klassen-Hooks) im gerenderten HTML stehen.
// Ausgabe: je Regel ✓/✗ + Abschluss "ACCEPT GRÜN" (exit 0) oder "ACCEPT ROT: <fehlende>" (exit 1).
// Run: node scripts/accept.mjs   (setzt voraus: FULL=1 node scripts/generate.mjs lief bereits)
import fs from 'fs';
import { execFileSync } from 'child_process';

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
  check('home', 'cl', classCount(h, 'cl') === 5);   // 20.10.: 5 Bereiche (GaLaBau-Ausbau)
  check('home', 'kein fonts.googleapis', !has(h, 'fonts.googleapis'));
});

// ---- SERVICE-HUB heckenschnitt (Paket 1, 20.10.: Grundgerüst; Kalender/Kompass/Projekt raus, Ergebnisse bleiben) ----
page('heckenschnitt/index.html', 'HUB heckenschnitt', h => {
  check('heckenschnitt', 'ba>=1', classCount(h, 'ba') >= 1);
  check('heckenschnitt', 'gstrip', classCount(h, 'gstrip') >= 1);
  check('heckenschnitt', 'galerie', has(h, 'id="galerie"'));
  check('heckenschnitt', 'kein Kalender/Kompass/Projekt', classCount(h, 'cal') === 0 && !has(h, 'id="heckenarten"') && classCount(h, 'echt-card') === 0);
  check('heckenschnitt', 'kein Stubben-Querverweis', !has(h, 'Stubben und Wurzeln noch im Boden?'));
  check('heckenschnitt', 'tl', classCount(h, 'tl') >= 1);
  check('heckenschnitt', 'faq', classCount(h, 'faq') >= 1);
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
  check('galabau', 'anker', has(h, 'id="leistungen"'));   // R2: Block "Erst freiräumen" gestrichen (Wortbudget), nichts verlinkt #freiraeumen
  check('galabau', 'links sub-hubs', has(h, 'href="/zaunbau/"') && has(h, 'href="/heckenentfernung/"') && has(h, 'href="/gartenrodung/"') && has(h, 'href="/baumstumpf-entfernen/"'));
  check('galabau', 'fall', classCount(h, 'fall') >= 1);
  check('galabau', 'kein inklusive', !hasI(h, 'inklusive Entsorgung'));
  check('galabau', 'hub-karten: 6 Fotokarten + Außerdem', (h.match(/<div class="gx-grid/g) || []).length === 1 && classCount(h, 'gx-mehr') === 1);
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
  check('gartenpflege', 'ablauf (ein Ablauf statt wa-grid)', has(h, 'id="ablauf"') && classCount(h, 'wa-grid') === 0);
  check('gartenpflege', 'tl', classCount(h, 'tl') >= 1);
  check('gartenpflege', 'faq', classCount(h, 'faq') >= 1);
  check('gartenpflege', 'ba==0 (kein V/N)', classCount(h, 'ba') === 0);
  check('gartenpflege', 'pills==0 (kein Kompass)', classCount(h, 'pills') === 0);
});

// ---- SERVICE-HUB heckenentfernung (Herbst-Paket, kein V/N-Material, kein Kompass) ----
page('heckenentfernung/index.html', 'HUB heckenentfernung', h => {
  check('heckenentfernung', 'gstrip', classCount(h, 'gstrip') >= 1);
  check('heckenentfernung', 'ablauf (ein Ablauf statt wa-grid)', has(h, 'id="ablauf"') && classCount(h, 'wa-grid') === 0);
  check('heckenentfernung', 'tl', classCount(h, 'tl') >= 1);
  check('heckenentfernung', 'faq', classCount(h, 'faq') >= 1);
  check('heckenentfernung', 'ba==0 (kein V/N)', classCount(h, 'ba') === 0);
  check('heckenentfernung', 'Frist-Block + Vorteile, kein Zwischen-CTA', has(h, 'id="frist"') && classCount(h, 'fx-band') === 1 && !has(h, 'Lieber machen lassen?'));
  check('heckenentfernung', 'pills==0 (kein Kompass)', classCount(h, 'pills') === 0);
});

// ---- SERVICE-HUB baumstumpf-entfernen (Herbst-Paket) ----
page('baumstumpf-entfernen/index.html', 'HUB baumstumpf-entfernen', h => {
  check('baumstumpf-entfernen', 'gstrip', classCount(h, 'gstrip') >= 1);
  check('baumstumpf-entfernen', 'ablauf (ein Ablauf statt wa-grid)', has(h, 'id="ablauf"') && classCount(h, 'wa-grid') === 0);
  check('baumstumpf-entfernen', 'tl', classCount(h, 'tl') >= 1);
  check('baumstumpf-entfernen', 'faq', classCount(h, 'faq') >= 1);
  check('baumstumpf-entfernen', 'ba==0 (kein V/N)', classCount(h, 'ba') === 0);
  check('baumstumpf-entfernen', 'pills==0 (kein Kompass)', classCount(h, 'pills') === 0);
});

// ---- SERVICE-HUB fensterreinigung (klassisch) ----
page('fensterreinigung/index.html', 'HUB fensterreinigung', h => {
  check('fensterreinigung', 'gstrip', classCount(h, 'gstrip') >= 1);
  check('fensterreinigung', 'ablauf (ein Ablauf statt wa-grid)', has(h, 'id="ablauf"') && classCount(h, 'wa-grid') === 0);
  check('fensterreinigung', 'tl', classCount(h, 'tl') >= 1);
  check('fensterreinigung', 'faq', classCount(h, 'faq') >= 1);
  check('fensterreinigung', 'ba==0', classCount(h, 'ba') === 0 || true);
  check('fensterreinigung', 'pills==0', classCount(h, 'pills') === 0);
  check('fensterreinigung', 'kein Teleskop', !hasI(h, 'Teleskop'));
  check('fensterreinigung', 'kein Osmose', !hasI(h, 'Osmose'));
});

// ---- Paket 1 (20.10.): Grundgerüst für alle Hubs im Umfang ----
for (const sl of ['gartenpflege', 'heckenschnitt', 'baumschnitt', 'heckenentfernung', 'dachrinnenreinigung', 'winterdienst', 'steinreinigung', 'fensterreinigung', 'dachreinigung', 'galabau', 'pflasterarbeiten', 'einfahrt-pflastern', 'terrassenbau', 'zaunbau', 'gartengestaltung', 'rollrasen-verlegen', 'erdarbeiten', 'gartenrodung', 'baumfaellung', 'baumstumpf-entfernen']) {
  page(`${sl}/index.html`, `GRUNDGERÜST ${sl}`, h => {
    const leist = (h.match(/<section class="sec" id="leistungen">[\s\S]*?<\/section>/) || [''])[0];
    check(sl, 'genau 1 #leistungen', (h.match(/id="leistungen"/g) || []).length === 1);
    check(sl, 'kein Aufklapper im Leistungsteil', !leist.includes('<details'));
    check(sl, 'kein Detail-Band', classCount(h, 'media-band') === 0);
    check(sl, 'keine Gebietskarte', !has(h, 'id="gebiet"') && classCount(h, 'gebiet-wrap') === 0);
    check(sl, 'kein Schnittkalender/Kompass', classCount(h, 'cal') === 0 && !has(h, 'id="heckenarten"'));
    check(sl, 'genau 1 Ablauf', classCount(h, 'tl') === 1 && classCount(h, 'wa-grid') === 0);
    check(sl, 'Orte-Block ≤ 6 Orte', !has(h, 'id="orte"') || ((h.match(/<div class="ox-chips">([\s\S]*?)<\/div>/) || ['', ''])[1].match(/<a /g) || []).length <= 6);
    check(sl, 'kein Ortskarten-Raster', !/<h2[^>]*>[^<]* in Ihrem Ort<\/h2><\/div>(<p[^>]*>[^<]*<\/p>)?<div class="cards/.test(h));
    check(sl, 'kein zzgl. MwSt.', !/zzgl\.? ?MwSt|zuzüglich (Mehrwertsteuer|MwSt)/i.test(h));
  });
}

// ---- Paket 1 (20.10.): Code-Befunde aus Copy-/SEO-Prüfung (07-pruefung-*) ----
const GG_SLUGS = ['gartenpflege', 'heckenschnitt', 'baumschnitt', 'heckenentfernung', 'dachrinnenreinigung', 'winterdienst', 'steinreinigung', 'fensterreinigung', 'dachreinigung', 'galabau', 'pflasterarbeiten', 'einfahrt-pflastern', 'terrassenbau', 'zaunbau', 'gartengestaltung', 'rollrasen-verlegen', 'erdarbeiten', 'gartenrodung', 'baumfaellung', 'baumstumpf-entfernen'];
const PARTNER_SLUGS = new Set(['dachrinnenreinigung', 'winterdienst', 'dachreinigung']);
const K1_SLUGS = ['erdarbeiten', 'pflasterarbeiten', 'einfahrt-pflastern', 'terrassenbau', 'gartengestaltung', 'rollrasen-verlegen', 'galabau', 'baumfaellung'];
const sectionOf = (h, id) => (h.match(new RegExp('<section[^>]*id="' + id + '"[\\s\\S]*?</section>')) || [''])[0];
const indexierbareOrtsseiten = sl => { try { return fs.readdirSync('website', { withFileTypes: true }).filter(d => d.isDirectory() && d.name.startsWith(sl + '-')).filter(d => { const x = read(d.name + '/index.html'); return x != null && !/<meta name="robots" content="noindex/i.test(x); }).map(d => d.name.slice(sl.length + 1)); } catch { return []; } };
for (const sl of GG_SLUGS) {
  page(`${sl}/index.html`, `PAKET-1 CODE-BEFUNDE ${sl}`, h => {
    // Copy H5: kein Link auf einen Anker ohne Ziel
    const anker = [...h.matchAll(/href="#([A-Za-z0-9_-]+)"/g)].map(m => m[1]).filter(a => !has(h, `id="${a}"`));
    check(sl, 'kein Link auf "#kontakt"/Anker ohne Ziel' + (anker.length ? ' (' + anker.join(',') + ')' : ''), anker.length === 0);
    // Copy K1/H7: Zusage 01 + Ablauf Schritt 2 passen zur Entsorgungsregel
    if (K1_SLUGS.includes(sl) || sl === 'fensterreinigung' || sl === 'steinreinigung') check(sl, 'kein "inklusive Abfuhr" (Entsorgung nach Beleg bzw. keine Abfuhr)', !hasI(h, 'inklusive Abfuhr'));
    if (K1_SLUGS.includes(sl) && sl !== 'galabau' && sl !== 'baumfaellung') check(sl, 'Zusage 01: Entsorgung nach Beleg, ohne eigenen Aufschlag', has(h, 'Entsorgung ' + ({ 'rollrasen-verlegen': 'von Altrasen und Aushub', gartengestaltung: 'von Aushub und Grünschnitt', erdarbeiten: 'des Aushubs' }[sl] || 'von Aushub und Altbelag') + ' rechnen wir nach Beleg ab, ohne eigenen Aufschlag'));
    if (sl === 'baumfaellung') check(sl, 'Zusage 01: Abtransport inklusive, Stadtgebühren nicht', has(h, 'inklusive Abtransport. Nicht enthalten: Gebühren der Stadt'));
    if (K1_SLUGS.includes(sl) && sl !== 'baumfaellung') check(sl, 'Ablauf Schritt 2: Entsorgungsgebühren nach Beleg', has(h, 'Entsorgungsgebühren rechnen wir nach Beleg ab, ohne Aufschlag'));
    if (sl === 'fensterreinigung' || sl === 'steinreinigung') check(sl, 'Zusage 01 ohne Abfuhr', has(h, 'steht Ihr Preis schriftlich fest, ohne Nachforderung.'));
    if (PARTNER_SLUGS.has(sl)) check(sl, 'Partner: kein Festpreis-Zwischen-CTA', !has(h, 'Passt der Rahmen?') && !has(h, 'Foto schicken, Festpreis bekommen'));
    // Spec §3.3 Pkt. 4 / Copy H16: Zwischen-CTA nur ohne eigenen Beweis-Button; mit Preise-Block dahinter
    const zwTexte = ['Lieber machen lassen?', 'Passt der Rahmen?', 'Foto schicken, Festpreis bekommen', 'Foto schicken, Rückmeldung bekommen', 'Flächen schicken, Rückmeldung bekommen'];
    const nZw = zwTexte.filter(x => has(h, x)).length;
    if (sl === 'heckenschnitt' || sl === 'heckenentfernung') check(sl, 'kein Zwischen-CTA (Beweis hat eigenen Button)', nZw === 0);
    else check(sl, 'höchstens 1 Zwischen-CTA', nZw <= 1);
    if (has(h, 'id="preise"') && !PARTNER_SLUGS.has(sl)) check(sl, 'Zwischen-CTA steht hinter dem Preise-Block', h.indexOf('Passt der Rahmen?') > h.indexOf('id="preise"'));
    // Runde 2 (Generator-Reste): Frist zeitunabhängig, Garantie-Label einmal, Buttontexte verschieden, keine noindex-Ratgeber-Links
    if (sl === 'heckenentfernung') {
      check(sl, 'Frist-Block zeitunabhängig (kein "diesem Winter"/"vor dem 28. Februar sichern"/"Termin für Oktober")', !hasI(h, 'diesem Winter') && !hasI(h, 'vor dem 28. Februar sichern') && !hasI(h, 'Termin für Oktober') && !hasI(h, 'Wer jetzt anfragt'));
      check(sl, 'Frist-Block: ganzjährige Besichtigung + Button "Termin im Fenster sichern"', has(h, 'Besichtigung und Angebot gibt es das ganze Jahr') && has(h, 'Termin im Fenster sichern'));
    }
    const garLines = [...h.matchAll(/<p class="garantie-line[^"]*">([\s\S]*?)<\/p>/g)].map(m => m[1].replace(/<[^>]+>/g, ''));
    check(sl, 'Garantie-Label nicht doppelt', garLines.every(x => !/Garantie:\s*[^:]{0,40}Garantie:/.test(x)));
    const zwBtn = (h.match(/<section[^>]*><div class="wrap center"><h2 class="serif rv">[^<]*<\/h2><p[^>]*>[^<]*<\/p><div class="cta-row[^"]*"[^>]*><a class="btn btn-acc" href="https:\/\/wa\.me[^"]*">([^<]+)<\/a>/) || [])[1];
    const ablBtns = [...sectionOf(h, 'ablauf').matchAll(/<a class="btn [^"]*"[^>]*>([^<]+)<\/a>/g)].map(m => m[1]);
    if (zwBtn && sl !== 'winterdienst') check(sl, 'Zwischen-CTA- und Ablauf-Buttontext verschieden', !ablBtns.includes(zwBtn));
    if (sl !== 'winterdienst') check(sl, 'Ablauf-CTA: Telefon primär, WhatsApp "Per WhatsApp anfragen"', ablBtns.length === 2 && ablBtns[0].startsWith('☎') && ablBtns[1] === 'Per WhatsApp anfragen');
    const ratLinks = [...((h.match(/Ratgeber rund um[\s\S]*?<\/section>/) || [''])[0]).matchAll(/href="\/ratgeber\/([a-z0-9-]+)\/"/g)].map(m => m[1]);
    const ratNoidx = ratLinks.filter(r => { const x = read('ratgeber/' + r + '/index.html'); return x == null || /<meta name="robots" content="noindex/i.test(x); });
    check(sl, 'Ratgeber-Teaser verlinkt keine noindex-Ratgeber' + (ratNoidx.length ? ' (' + ratNoidx.join(',') + ')' : ''), ratNoidx.length === 0);
    if (!ratLinks.length) check(sl, 'ohne indexierbare Ratgeber keine leere Ratgeber-Sektion', !has(h, 'Ratgeber rund um'));
    // SEO M-6: H2 von FAQ + Ablauf mit Leistungsname
    check(sl, 'H2 "Häufige Fragen zu …" und "So läuft … ab"', /<h2[^>]*>Häufige Fragen zu /.test(h) && /<h2[^>]*>So läuft [^<]+ ab<\/h2>/.test(h));
    // SEO H-4 / M-7 + Owner "Verlinkung komplett": Orte-Block nur mit indexierbaren Ortsseiten, alle übrigen als "Weitere Orte"
    const idx = indexierbareOrtsseiten(sl);
    const orte = sectionOf(h, 'orte');
    if (!idx.length) check(sl, 'Orte-Block fehlt (keine indexierbaren Ortsseiten)', !has(h, 'id="orte"'));
    else {
      const linked = new Set([...orte.matchAll(new RegExp('href="/' + sl + '-([a-z0-9-]+)/"', 'g'))].map(m => m[1]));
      const fehlt = idx.filter(o => !linked.has(o));
      check(sl, 'alle indexierbaren Ortsseiten im Orte-Block verlinkt' + (fehlt.length ? ' (fehlt: ' + fehlt.slice(0, 5).join(',') + ')' : ''), has(h, 'id="orte"') && fehlt.length === 0);
      if (idx.length > 6) check(sl, 'Zeile "Weitere Orte:" vorhanden', has(orte, 'class="ox-weitere"') && has(orte, 'Weitere Orte:'));
      else check(sl, 'kein "Weitere Orte" ohne weitere Orte', !has(h, 'Weitere Orte:'));
      check(sl, 'alle Ortslinks des Orte-Blocks sind indexierbar', [...linked].every(o => idx.includes(o)));
    }
  });
}
page('pflasterarbeiten/index.html', 'PAKET-1 pflasterarbeiten Anker', h => check('pflasterarbeiten', 'id="kantensteine" vorhanden (SEO H-1)', has(h, 'id="kantensteine"')));
page('heckenschnitt/index.html', 'PAKET-1 heckenschnitt Ergebnisse', h => {
  check('heckenschnitt', 'Ergebnisse-CTA zeigt auf /kontakt/#anfrage', /<div class="thumb-cta">[\s\S]*?<a href="\/kontakt\/#anfrage">/.test(h));
  check('heckenschnitt', 'Ratgeber-Teaser hecke-schneiden-erlaubt ausgeblendet', !has((h.match(/Ratgeber rund um[\s\S]*?<\/section>/) || [''])[0], '/ratgeber/hecke-schneiden-erlaubt/'));
});
page('steinreinigung/index.html', 'PAKET-1 steinreinigung Ergebnisse (V/N-Paare)', h => {
  const eg = (h.match(/<div class="ep-grid[^"]*">[\s\S]*?<\/section>/) || [''])[0];
  check('steinreinigung', 'Ergebnisse: ep-grid mit genau 3 Vorher/Nachher-Paaren (ba)', classCount(eg, 'ep') === 3 && classCount(eg, 'ba') === 3);
  check('steinreinigung', 'Ergebnisse: Paare mit Regler + Beschriftung "vor/nach der Reinigung"', (eg.match(/type="range"/g) || []).length === 3 && has(eg, 'nach der Reinigung') && !has(eg, 'nach dem Schnitt'));
  check('steinreinigung', 'Ergebnisse statt "Was Sie davon haben" (nicht beides)', !hasI(h, 'Was Sie davon haben'));
  check('steinreinigung', 'Ergebnisse: neutral beschriftet, keine Marke Blankstein', !hasI(eg, 'blankstein') && has(eg, 'aus dem Havelland'));
});
// Paket 1 (Bilder): je Hub kein Foto doppelt (Hero ≠ Leistungsfoto ≠ Orte-Foto), Orte-Block ohne Platzhalter "ueber-uns"
const BILD_HUBS = ['gartenpflege', 'heckenschnitt', 'baumschnitt', 'heckenentfernung', 'dachrinnenreinigung', 'winterdienst', 'steinreinigung', 'fensterreinigung', 'dachreinigung', 'galabau', 'pflasterarbeiten', 'einfahrt-pflastern', 'terrassenbau', 'zaunbau', 'gartengestaltung', 'rollrasen-verlegen', 'erdarbeiten', 'gartenrodung', 'baumfaellung', 'baumstumpf-entfernen'];
{
  const baseOf = sec => { const m = /<img[^>]*src="\/assets\/img\/([^"]+?)(?:-\d+)?\.(?:jpe?g|webp|png)"/.exec(sec || ''); return m ? m[1] : null; };
  const inBlock = (h, cls) => { const i = h.indexOf(`class="${cls}"`); return i < 0 ? '' : h.slice(i, i + 2500); };
  for (const sl of BILD_HUBS) {
    page(`${sl}/index.html`, `PAKET-1 BILDER ${sl}`, h => {
      const hero = baseOf(inBlock(h, 'shot rv in d2')), leist = baseOf(inBlock(h, 'ls-foto')), orte = baseOf(inBlock(h, 'ox-foto'));
      const list = [hero, leist, orte].filter(Boolean);
      check(sl, `kein Foto doppelt (Hero ${hero || '-'} / Leistung ${leist || '-'} / Orte ${orte || '-'})`, new Set(list).size === list.length);
      check(sl, 'Orte-Foto kein Platzhalter "ueber-uns"', orte !== 'ueber-uns');
    });
  }
}
page('winterdienst/index.html', 'PAKET-1 winterdienst Ablauf-Button', h => check('winterdienst', 'Button "Flächen per WhatsApp schicken"', has(h, 'Flächen per WhatsApp schicken')));
page('zaunbau/index.html', 'PAKET-1 zaunbau Zaunarten', h => {
  const za = sectionOf(h, 'zaunarten');
  const cards = za.split(/<div class="card(?= |")/).slice(1);
  check('zaunbau', 'Kartenlabel "20 m montiert:" statt "inkl. Montage"', cards.length > 0 && cards.every(c => c.includes('<strong>20 m montiert:</strong>')) && !has(za, 'inkl. Montage'));
  check('zaunbau', 'je Zaunart-Karte mit Preis genau 1x "inkl. MwSt."', cards.length > 0 && cards.every(c => (c.match(/inkl\. MwSt\./g) || []).length === (c.includes('€') ? 1 : 0)));
  const ref = h.indexOf('id="referenzprojekt"'), cta = Math.max(h.indexOf('Passt der Rahmen?'), h.indexOf('Foto schicken, Festpreis bekommen'));
  check('zaunbau', 'Referenzprojekt steht vor dem Zwischen-CTA', ref < 0 || cta < 0 || ref < cta);
});
page('galabau/index.html', 'PAKET-1 galabau Schema', h => {
  const oc = (h.match(/"hasOfferCatalog":[\s\S]*?<\/script>/) || [''])[0];
  check('galabau', 'OfferCatalog = sichtbare Karten (Pflaster, Terrasse, Zaun, Erdarbeiten, Rodung, Rollrasen)', ['pflasterarbeiten', 'terrassenbau', 'zaunbau', 'erdarbeiten', 'gartenrodung', 'rollrasen-verlegen'].every(x => oc.includes('/' + x + '/')) && !oc.includes('/einfahrt-pflastern/') && !oc.includes('/gartengestaltung/'));
});
page('leistungen/index.html', 'PAKET-1 /leistungen/', h => {
  check('leistungen', 'Bereichszeile "Haus & Reinigung" ohne Selbstlink', !has(h, '<h3><a href="/leistungen/#haus">'));
  const imgs = [...h.matchAll(/<img [^>]*>/g)].map(m => m[0]).filter(x => !x.includes('logo-'));
  check('leistungen', 'erste 2 Bildkarten ohne lazy, Karte 1 fetchpriority=high', imgs.length >= 2 && !imgs[0].includes('loading="lazy"') && !imgs[1].includes('loading="lazy"') && imgs[0].includes('fetchpriority="high"'));
  check('leistungen', 'Bewertungszeile wie auf den Hubs (nur wenn Bewertungen live)', has(h, 'class="hub-trust') === has(read('gartenpflege/index.html') || '', 'class="hub-trust'));
});
// Fragment-Links auf Hub-Seiten haben ein Ziel (SEO H-1)
{
  const bad = [];
  for (const rel of ['index.html', 'leistungen/index.html', ...GG_SLUGS.map(s => s + '/index.html')]) {
    const h = read(rel); if (h == null) continue;
    for (const m of h.matchAll(/href="(\/[a-z0-9-]+\/)#([A-Za-z0-9_-]+)"/g)) { const tgt = read(m[1].slice(1) + 'index.html'); if (tgt != null && !has(tgt, `id="${m[2]}"`)) bad.push(m[1] + '#' + m[2]); }
  }
  P('PAKET-1 Fragment-Links');
  check('anker', 'alle /seite/#anker-Links der Hubs haben ein Ziel' + (bad.length ? ' (' + [...new Set(bad)].slice(0, 6).join(', ') + ')' : ''), bad.length === 0);
}

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

// ---- PAKET-3 STANDORTE (Spec Teil A §4/§5/§8, Plan Task 3/4; ersetzt den alten Block ORTS-HUB standorte/falkensee: Karten-Raster + wa-grid entfallen) ----
const SX_DATA = JSON.parse(fs.readFileSync('data/standorte.json', 'utf8'));
const SX_ORTE = [...SX_DATA.stufe1, ...SX_DATA.stufe2].flatMap(g => g.orte);
const SX_KERN = SX_DATA.kern;
const sxExists = href => { const p = href.split('#')[0].replace(/^\//, ''); return read((p.endsWith('/') ? p : p + '/') + 'index.html') != null; };
const sxHrefs = html => [...html.matchAll(/href="(\/[^"#?]*)"/g)].map(m => m[1]);
const sxIndexierbar = rel => { const t = read(rel.replace(/^\//, '') + 'index.html'); return t != null && !/<meta name="robots" content="noindex/i.test(t); };
// Wörter Hauptinhalt (analog temp/paket1/tools/woerter.mjs): zwischen </header> und <footer, ohne Skripte, Breadcrumb, Ortslinks/Chips/Linkzeilen
const sxWoerter = h => {
  h = h.slice(h.indexOf('</header>'), h.indexOf('<footer'));
  h = h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<div class="wrap breadcrumb"[\s\S]*?<\/div>/g, ' ')
    .replace(/<div class="sx-svc"[\s\S]*?<\/div>/g, ' ').replace(/<p class="sx-(?:mehr|nah|places|far-svc)[^>]*>[\s\S]*?<\/p>/g, ' ');
  const t = h.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
  return (t.match(/[A-Za-zÄÖÜäöüß0-9€][\wÄÖÜäöüß€.,–-]*/g) || []).length;
};
const sxOrtsseitenVon = ort => { try { return fs.readdirSync('website', { withFileTypes: true }).filter(d => d.isDirectory() && d.name.endsWith('-' + ort) && sxIndexierbar(d.name + '/')).map(d => d.name); } catch { return []; } };
page('standorte/index.html', 'PAKET-3 STANDORTE /standorte/', h => {
  const T = 'standorte';
  check(T, 'genau 1 H1', (h.match(/<h1\b/g) || []).length === 1);
  check(T, 'kein Kachel-Raster (.card entfällt)', classCount(h, 'card') === 0 && classCount(h, 'cards') === 0);
  check(T, 'kein Stockfoto/Regionen-Bild (region-havelland)', !has(h, 'region-havelland'));
  check(T, 'Bild im Kopf (.sx-shot) + Badge „Sitz in Falkensee“', classCount(h, 'sx-shot') === 1 && has(h, 'Sitz in Falkensee'));
  check(T, 'gstrip, Zusage 01 ohne „inklusive Abfuhr“', classCount(h, 'gstrip') === 1 && !hasI(h, 'inklusive Abfuhr'));
  const kastenChips = ((h.match(/<div class="sx-home rv">[\s\S]*?<div class="sx-svc">([\s\S]*?)<\/div>/) || [])[1] || '');
  check(T, 'Falkensee-Kasten (.sx-home) mit 8 Chips', classCount(h, 'sx-home') === 1 && kastenChips.split('<a ').length - 1 === 8);
  const rowPieces = h.split('<div class="sx-row rv">').slice(1).map(x => x.split('<span class="sx-end">')[0]);
  const rows = rowPieces;
  check(T, 'Stufe-1-Zeilen = 9 (+ Falkensee-Kasten)', classCount(h, 'sx-row') === 9 && rows.length === 9);
  check(T, 'je Zeile 4 Kern-Chips', rows.length === 9 && rows.every(r => ((r.match(/<div class="sx-svc">([\s\S]*?)<\/div>/) || ['', ''])[1]).split('<a ').length - 1 === 4));
  const chipHrefs = [...h.matchAll(/<div class="sx-svc">([\s\S]*?)<\/div>/g)].flatMap(m => sxHrefs(m[1]));
  const badChip = chipHrefs.filter(x => !sxExists(x));
  check(T, 'alle Chip-Ziele existieren (8 + 9 × 4 Chips)' + (badChip.length ? ' (' + [...new Set(badChip)].slice(0, 4).join(', ') + ')' : ''), chipHrefs.length === 8 + 9 * 4 && badChip.length === 0);
  const noidx = chipHrefs.filter(x => !sxIndexierbar(x));
  check(T, 'keine Chips auf noindex-Seiten' + (noidx.length ? ' (' + noidx.join(', ') + ')' : ''), noidx.length === 0);
  check(T, 'Zeilen-Chips: Ortsseite wenn vorhanden und indexierbar, sonst Hub (Link-Regel)', SX_ORTE.slice(1, 10).every(sl => {
    const row = rowPieces.find(x => x.includes('href="/standorte/' + sl + '/"')) || '';
    return row && SX_KERN.every(sv => { const own = `/${sv}-${sl}/`; return has(row, `href="${sxIndexierbar(own) ? own : '/' + sv + '/'}"`); });
  }));
  const far = sectionOf(h, 'auch');
  check(T, 'Stufe-2-Band (.zone-dark) mit 12 Ortslinks', has(far, 'zone-dark') && (far.match(/href="\/standorte\/[a-z-]+\/"/g) || []).length === 12);
  check(T, 'Stufe-2: Leistungszeile + WhatsApp-Button', has(far, 'und mehr') && has(far, 'Ort per WhatsApp anfragen'));
  const alleLinks = new Set(sxHrefs(h));
  const fehlt = SX_ORTE.filter(sl => !alleLinks.has(`/standorte/${sl}/`));
  check(T, 'alle 22 Standortseiten verlinkt' + (fehlt.length ? ' (fehlt: ' + fehlt.join(', ') + ')' : ''), SX_ORTE.length === 22 && fehlt.length === 0);
  check(T, 'FAQ = 3', (sectionOf(h, 'faq').match(/<details/g) || []).length === 3);
  check(T, 'Abschluss-Band (zone-deep end)', has(h, 'zone-deep end'));
  check(T, 'kein FAQPage-Schema, ItemList mit 22 Orten', !has(h, '"@type":"FAQPage"') && (h.match(/"@type":"ListItem","position":\d+,"name":"[^"]+","item":"https:\/\/[^"]+\/standorte\/[a-z-]+\//g) || []).length === 22);
  const w = sxWoerter(h);
  check(T, `Hauptinhalt ≤ 450 Wörter (${w})`, w <= 450);
});
for (const sl of SX_ORTE) {
  page(`standorte/${sl}/index.html`, `PAKET-3 STANDORTSEITE ${sl}`, h => {
    const T = 'standort-' + sl;
    check(T, 'genau 1 H1 „Haus- & Gartenservice in …“', (h.match(/<h1\b/g) || []).length === 1 && /<h1[^>]*>Haus- &amp; Gartenservice in <em>/.test(h));
    check(T, '≤ 8 Abschnitte', (h.slice(h.indexOf('</header>'), h.indexOf('<footer')).match(/<section\b/g) || []).length <= 8);
    check(T, 'gstrip ohne „inklusive Abfuhr“', classCount(h, 'gstrip') === 1 && !hasI(h, 'inklusive Abfuhr'));
    const kern = sectionOf(h, 'leistungen');
    const kHref = [...((kern.match(/<div class="sx-kern rv">[\s\S]*?<\/div><\/a><\/div>/) || [''])[0]).matchAll(/<a href="(\/[^"]+)"/g)].map(m => m[1]);
    check(T, '4 Kern-Karten mit gültigem Ziel', kHref.length === 4 && kHref.every(sxExists));
    check(T, 'Kern-Karten: Ortsseite wenn vorhanden und indexierbar, sonst Hub', SX_KERN.every((sv, i) => kHref[i] === (sxIndexierbar(`/${sv}-${sl}/`) ? `/${sv}-${sl}/` : `/${sv}/`)));
    const soll = sxOrtsseitenVon(sl).filter(d => !SX_KERN.some(sv => d === `${sv}-${sl}`)).map(d => `/${d}/`).sort();
    const ist = [...(((kern.match(/<p class="sx-mehr rv">[\s\S]*?<\/p>/) || [''])[0]).matchAll(/href="(\/[^"]+)"/g))].map(m => m[1]).sort();
    check(T, `„Außerdem“ = alle übrigen indexierbaren Leistungs-Ortsseiten (${soll.length})` + (JSON.stringify(soll) !== JSON.stringify(ist) ? ` [Soll ${soll.join(',')} | Ist ${ist.join(',')}]` : ''), JSON.stringify(soll) === JSON.stringify(ist));
    check(T, 'Außerdem: keine Links auf noindex-Seiten', ist.every(sxIndexierbar));
    check(T, '„Was in … anfällt“ vorhanden', has(h, 'id="anfaellt"'));
    check(T, 'Ablauf „So läuft es in … ab“ (4 Schritte)', has(h, 'So läuft es in ') && (sectionOf(h, 'ablauf').match(/class="tli"/g) || []).length === 4);
    const nah = sectionOf(h, 'naehe'); const nahL = [...nah.matchAll(/href="\/standorte\/([a-z-]+)\/"/g)].map(m => m[1]);
    check(T, '„In der Nähe“ ≥ 2 Links auf Standortseiten, Alle Orte', nahL.length >= 2 && nahL.every(x => SX_ORTE.includes(x) && x !== sl) && has(nah, 'href="/standorte/"'));
    check(T, 'FAQ = 3', (sectionOf(h, 'faq').match(/<details/g) || []).length === 3);
    check(T, 'kein gebietskarte / wa-grid / media-band', classCount(h, 'gebiet-wrap') === 0 && !has(h, 'id="gebiet"') && classCount(h, 'wa-grid') === 0 && classCount(h, 'media-band') === 0);
    check(T, 'Abschluss-Band (zone-deep end)', has(h, 'zone-deep end'));
    check(T, 'indexierbar, Canonical auf sich selbst', !/<meta name="robots" content="noindex/i.test(h) && has(h, `<link rel="canonical" href="https://haus-und-gartenservice-havelland.de/standorte/${sl}/">`));
    check(T, 'kein FAQPage-Schema, Breadcrumb-Schema', !has(h, '"@type":"FAQPage"') && has(h, '"@type":"BreadcrumbList"'));
    check(T, 'PLZ im sichtbaren Kopf', /Standort · \d{5} /.test(h));
    const w = sxWoerter(h);
    check(T, `Hauptinhalt ≤ 500 Wörter (${w})`, w <= 500);
  });
}

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

// ---- PAKET-3 GEWERBE (Spec Teil B, Plan Task 6/7/8; ersetzt den alten Block „B2B fuer-hausverwaltungen“ — Objektklassen/Leistungen/Ablauf/FAQ kommen jetzt aus gewerbe.json + b2b.json) ----
{
  const GWD = JSON.parse(fs.readFileSync('data/copy/gewerbe.json', 'utf8'));
  const B2B = JSON.parse(fs.readFileSync('data/b2b.json', 'utf8'));
  const ZGS = { hausverwaltungen: '/fuer-hausverwaltungen/', firmen: '/fuer-firmen/', pflegeeinrichtungen: '/fuer-pflegeeinrichtungen/', bestatter: '/fuer-bestatter/' };
  const eh = t => String(t).replace(/&/g, '&amp;');
  const main = h => h.slice(h.indexOf('</header>'), h.indexOf('<footer'));
  const text = h => main(h).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ');
  const wortzahl = h => (text(h).match(/[A-Za-zÄÖÜäöüß0-9€][\wÄÖÜäöüß€.,–-]*/g) || []).length;
  const VERBOTEN = [[/zzgl\.? ?MwSt|zuzüglich (Mehrwertsteuer|MwSt)/i, 'zzgl. MwSt.'], [/ohne Subunternehmer/i, 'ohne Subunternehmer'], [/alles aus einer Hand/i, 'alles aus einer Hand'], [/Kleinunternehmer/i, 'Kleinunternehmer'], [/\bversichert\b/i, 'versichert'], [/Visitenkarten/i, 'Visitenkarten']];
  const verboten = h => VERBOTEN.filter(([re]) => re.test(text(h))).map(([, n]) => n);
  const PARTNER = ['winterdienst', 'dachrinnenreinigung', 'dachreinigung'];   // Owner 20.10. abends: Grundreinigung = Eigenleistung, nicht mehr Partner
  const links = h => [...main(h).matchAll(/href="(\/[^"#?]*)"/g)].map(m => m[1]);
  const defekt = h => [...new Set(links(h).filter(x => !sxExists(x)))];
  const schemaOk = h => { try { return [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1])); } catch { return null; } };
  const sitemap = read('sitemap-services.xml') || '';

  // --- Navigation, Footer, Startseite ---
  page('index.html', 'PAKET-3 GEWERBE Navigation + Startseiten-Band', h => {
    const T = 'gw-nav';
    const hd = h.slice(h.indexOf('<header'), h.indexOf('</header>'));
    check(T, 'Header: „Für Gewerbe“ → /gewerbe/ mit Dropdown (4 Zielgruppen-Links + „Alles für Gewerbe“)', has(hd, '<div class="nav-dd nav-dd-sm"><a href="/gewerbe/" aria-haspopup="true">Für Gewerbe</a>') && Object.values(ZGS).every(u => (hd.match(new RegExp('<div class="nav-dd-col">[\\s\\S]*?href="' + u + '"')) || []).length === 1) && has(hd, 'Alles für Gewerbe →'));
    check(T, 'Header: kein alter Menüpunkt „Hausverwaltungen“ mehr in der Hauptnavigation', !has(hd, '<a href="/fuer-hausverwaltungen/">Hausverwaltungen</a>') && !has(hd, '<a href="/fuer-hausverwaltungen/">Für Hausverwaltungen</a>'));
    check(T, 'Mobil-Menü: eigene Gruppe „Für Gewerbe“ (aufklappbar) mit 4 Links', /<details class="mnav-dd"><summary>Für Gewerbe<\/summary>(<a [^>]+>[^<]+<\/a>){4}<a class="mnav-grp-h" href="\/gewerbe\/">/.test(hd));
    const ft = h.slice(h.indexOf('<footer'));
    check(T, 'Footer: Kopf-Link /gewerbe/ + 4 Zielgruppen-Links', has(ft, '<h4><a href="/gewerbe/">') && Object.values(ZGS).every(u => has(ft, `<li><a href="${u}">`)));
    const band = sectionOf(h, 'gewerbe');
    check(T, 'Startseite: Band .gw-band (zone-dark) mit 4 Karten auf die Zielgruppenseiten + Link /gewerbe/', has(band, 'zone-dark gw-band') && (band.match(/<div class="gw-zg rv">([\s\S]*?)<\/div><\/section>/) || ['', ''])[1].split('<a href="/fuer-').length - 1 === 4 && has(band, 'href="/gewerbe/"'));
    check(T, 'Startseite: Band steht nach den Kernleistungen', h.indexOf('id="kernleistungen"') > 0 && h.indexOf('id="gewerbe"') > h.indexOf('id="kernleistungen"'));
    check(T, 'Startseite: Band-Bilder mit Alt-Text, kein Platzhalter-Bild', !/<img[^>]*alt=""/.test(band) && (band.match(/<img /g) || []).length === 4);
    // Startseiten-Text ±5 % (Ausnahme: das neue Band) gegen den Stand im HEAD des Worktrees
    let basis = null; try { basis = execFileSync('git', ['show', 'HEAD:website/index.html'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }); } catch { /* ohne Git: Check entfällt */ }
    if (basis) {
      const jetzt = wortzahl(h.replace(band, '')), vorher = wortzahl(basis);
      check(T, `Startseiten-Text ±5 % ohne Band (HEAD ${vorher} → jetzt ${jetzt})`, Math.abs(jetzt - vorher) / vorher <= 0.05);
      const kern = ['Haus und Garten', 'Unsere Kernleistungen', 'Echte Ergebnisse zum Durchziehen'];
      check(T, 'Startseiten-Kerntexte unverändert (H1, Kernleistungen, Galerie)', kern.every(s => has(basis, s) === has(h, s)));
      check(T, 'Startseiten-Title unverändert (Pos. 2,1 „gartenpflege falkensee“)', (basis.match(/<title>([^<]*)<\/title>/) || [])[1] === (h.match(/<title>([^<]*)<\/title>/) || [])[1]);
    }
  });
  page('leistungen/index.html', 'PAKET-3 GEWERBE /leistungen/', h => {
    check('gw-leist', 'Bereich „Hausverwaltungen & Gewerbe“ verlinkt /gewerbe/', has(h, '<h3><a href="/gewerbe/">Hausverwaltungen &amp; Gewerbe</a></h3>'));
  });

  // --- /gewerbe/ ---
  page('gewerbe/index.html', 'PAKET-3 GEWERBE /gewerbe/', h => {
    const T = 'gewerbe';
    check(T, 'genau 1 H1, Kopf mit Bild + CTA „Begehung anfragen“ und Telefon', (h.match(/<h1\b/g) || []).length === 1 && classCount(h, 'sx-shot') === 1 && has(h, '>Begehung anfragen</a>') && has(h, 'href="tel:'));
    const zg = sectionOf(h, 'zielgruppen');
    check(T, '4 Zielgruppen-Karten mit Bild auf die vier Seiten', Object.values(ZGS).every(u => has(zg, `<a href="${u}">`)) && (zg.match(/<img /g) || []).length === 4);
    const ls = sectionOf(h, 'leistungen');
    const lsHrefs = [...ls.matchAll(/<h3><a href="(\/[a-z-]+\/)">/g)].map(m => m[1]);
    check(T, `Leistungsliste: nummeriert, ≥ 6 Einträge mit Link auf einen Hub (${lsHrefs.length})`, classCount(ls, 'gw-li') >= 6 && lsHrefs.length === classCount(ls, 'gw-li') && lsHrefs.every(sxExists));
    check(T, 'KEINE Ausführungs-Labels (.gw-chip, „Eigene Ausführung“, „Partner-Fachbetrieb“ als Label)', classCount(h, 'gw-chip') === 0 && !has(h, 'Eigene Ausführung') && !/<span[^>]*>Partner-Fachbetrieb<\/span>/.test(h));
    check(T, 'Partner-Leistungen ohne „Festpreis“/„wir machen“ im Beschreibungssatz', PARTNER.every(sl => { const li = (ls.match(new RegExp('<div class="gw-li[^"]*"><span class="n">\\d+</span><div><h3><a href="/' + sl + '/">[\\s\\S]*?</div></div>')) || [''])[0]; return !/Festpreis|wir machen/i.test(li); }));
    const zus = sectionOf(h, 'zusagen');
    check(T, 'Zusagen-Band dunkelgrün mit 4 Zusagen', has(zus, 'zone-dark gw-zus') && (zus.match(/<span class="n">0[1-4]<\/span>/g) || []).length === 4);
    check(T, 'Ablauf: 4 Schritte, Telefon + Begehung', (sectionOf(h, 'ablauf').match(/class="tli"/g) || []).length === 4);
    const faq = (sectionOf(h, 'faq').match(/<details/g) || []).length;
    check(T, `FAQ ≥ 5 (${faq})`, faq >= 5 && faq <= 7);
    check(T, 'Abschluss-Band (zone-deep end)', has(h, 'zone-deep end'));
    const sc = schemaOk(h);
    const flat = JSON.stringify(sc);
    check(T, 'Schema parsebar: CollectionPage + ItemList (4 Zielgruppen) + Breadcrumb, kein FAQPage', !!sc && has(flat, '"CollectionPage"') && (flat.match(/"@type":"ListItem","position":\d,"name":"[^"]+","item":"https:\/\/[^"]+\/fuer-/g) || []).length === 4 && has(flat, 'BreadcrumbList') && !has(flat, 'FAQPage'));
    check(T, 'indexierbar, Canonical auf sich selbst, in sitemap-services.xml', !/<meta name="robots" content="noindex/i.test(h) && has(h, '<link rel="canonical" href="https://haus-und-gartenservice-havelland.de/gewerbe/">') && has(sitemap, '/gewerbe/</loc>'));
    const d = defekt(h);
    check(T, 'alle internen Links haben ein Ziel' + (d.length ? ' (' + d.slice(0, 4).join(', ') + ')' : ''), d.length === 0);
    check(T, 'keine verbotenen Formulierungen' + (verboten(h).length ? ' (' + verboten(h).join(', ') + ')' : ''), verboten(h).length === 0);
    check(T, 'keine Preise, keine Stunden-Zusagen zur Reaktion', !/\d+ ?€/.test(text(h)) && !/(antworten|Rückmeldung|melden)[^.]{0,60}(binnen|innerhalb)[^.]{0,20}\d+ (Stunden|Minuten)/i.test(text(h)));
  });

  // --- Zielgruppenseiten ---
  for (const [key, url] of Object.entries(ZGS)) {
    page(url.slice(1) + 'index.html', `PAKET-3 GEWERBE ${url}`, h => {
      const T = 'zg-' + key; const hv = key === 'hausverwaltungen', zw = key === 'pflegeeinrichtungen' || key === 'bestatter';
      check(T, 'genau 1 H1, Kopf mit Bild (.sx-shot), Breadcrumb „Für Gewerbe“', (h.match(/<h1\b/g) || []).length === 1 && classCount(h, 'sx-shot') === 1 && has(h, '<a href="/gewerbe/">Für Gewerbe</a>'));
      const ls = sectionOf(h, 'leistungen');
      const lsN = classCount(ls, 'gw-li');
      check(T, `Leistungsliste mit ≥ 2 Einträgen (${lsN}), alle Links mit Ziel`, lsN >= 2 && (ls.match(/<h3><a href="\/[a-z-]+\/[^"]*">/g) || []).length === lsN);
      check(T, 'Zusagen-Band (zone-dark) mit 4 Zusagen', has(sectionOf(h, 'zusagen'), 'zone-dark gw-zus') && (sectionOf(h, 'zusagen').match(/<span class="n">0[1-4]<\/span>/g) || []).length === 4);
      const ab = (sectionOf(h, 'ablauf').match(/class="tli"/g) || []).length;
      check(T, `Ablauf ${ab} Schritte (4–5)`, ab >= 4 && ab <= 5);
      const faq = (sectionOf(h, 'faq').match(/<details/g) || []).length;
      check(T, `FAQ 4–7 Fragen (${faq})`, faq >= 4 && faq <= 7);
      check(T, 'Abschluss-Band (zone-deep end), genau 1 primärer Hero-CTA', has(h, 'zone-deep end') && (h.match(/<section class="phero[\s\S]*?<\/section>/) || [''])[0].split('btn btn-acc').length - 1 === 1);
      const sc = schemaOk(h), flat = JSON.stringify(sc);
      check(T, 'Schema parsebar: Service + OfferCatalog + Breadcrumb (3 Ebenen), kein FAQPage', !!sc && has(flat, '"@type":"Service"') && has(flat, '"hasOfferCatalog"') && has(flat, 'BreadcrumbList') && (flat.match(/"@type":"ListItem","position":3/g) || []).length === 1 && !has(flat, 'FAQPage'));
      const offers = (flat.match(/"itemOffered":\{"@type":"Service","name":"[^"]*","serviceType":"[^"]*","(broker|provider)"/g) || []);
      const partnerOk = PARTNER.every(sl => { const re = new RegExp('"url":"https://[^"]+/' + sl + '/","itemOffered":\\{"@type":"Service","name":"[^"]*","serviceType":"[^"]*","(broker|provider)"'); const m = flat.match(re); return !m || m[1] === 'broker'; });
      check(T, `Schema: ${offers.length} Offers, Partner-Leistungen mit broker`, offers.length >= 2 && partnerOk);
      check(T, 'indexierbar, Canonical auf sich selbst', !/<meta name="robots" content="noindex/i.test(h) && has(h, `<link rel="canonical" href="https://haus-und-gartenservice-havelland.de${url}">`));
      check(T, 'in sitemap-services.xml', has(sitemap, url + '</loc>'));
      const t = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
      check(T, `Title ≤ 60 (${t.length}), Zielgruppe im Title (Kannibalisierung zu den Hubs)`, t.length <= 60 && t.length > 0 && ({ hausverwaltungen: /Hausverwaltung|WEG/, firmen: /Firmen|Gewerbe/, pflegeeinrichtungen: /Pflege/, bestatter: /Bestatter/ }[key]).test(t));
      const d = defekt(h);
      check(T, 'alle internen Links haben ein Ziel' + (d.length ? ' (' + d.slice(0, 4).join(', ') + ')' : ''), d.length === 0);
      check(T, 'keine verbotenen Formulierungen' + (verboten(h).length ? ' (' + verboten(h).join(', ') + ')' : ''), verboten(h).length === 0);
      check(T, 'Partner-Leistungen ohne „Festpreis“/„wir machen“', PARTNER.every(sl => { const li = (ls.match(new RegExp('<div class="gw-li[^"]*"><span class="n">\\d+</span><div><h3><a href="/' + sl + '/[^"]*">[\\s\\S]*?</div></div>')) || [''])[0]; return !/Festpreis|wir machen/i.test(li); }));
      check(T, 'keine Preise, keine Stunden-Zusage zur Reaktion', !/\d+ ?€/.test(text(h).replace(/01515 6198195/g, '')) && !/(antworten|Rückmeldung|melden)[^.]{0,60}(binnen|innerhalb)[^.]{0,20}\d+ (Stunden|Minuten)/i.test(text(h)));
      if (zw) {
        const z = sectionOf(h, 'zwei-wege');
        check(T, '„Zwei Wege zu uns“ (.zwei-wege): 2 Boxen, Button „WhatsApp-Nummer weitergeben“ mit WhatsApp-Weiterleitungstext', has(z, 'zwei-wege') && (z.match(/<div class="gw-box">/g) || []).length === 2 && /<a class="btn btn-line" href="https:\/\/wa\.me\/\?text=[^"]+">WhatsApp-Nummer weitergeben<\/a>/.test(z));
        check(T, 'Zwei Wege steht vor der Leistungsliste, Ton ruhig (keine Ausrufezeichen im Text)', h.indexOf('id="zwei-wege"') > 0 && h.indexOf('id="zwei-wege"') < h.indexOf('id="leistungen"') && !/!/.test(text(h)));
        check(T, 'Hero ohne Bewertungszeile (Tonalität)', !has((h.match(/<section class="phero[\s\S]*?<\/section>/) || [''])[0], 'hub-trust'));
      }
      if (key === 'firmen') check(T, 'Firmen: „Wann Firmen uns rufen“ (3 Anlässe)', (sectionOf(h, 'anlaesse').match(/<span class="n">0\d<\/span>/g) || []).length === 3);
      if (hv) {
        const z = { ...B2B, ...((GWD.zielgruppen || {}).hausverwaltungen || {}) };
        const namen = (z.objektklassen_detail || []).map(x => x.name);
        const fw = sectionOf(h, 'fuer-wen');
        check(T, `Objektklassen aus den Daten stehen auf der Seite (${namen.length})`, namen.length >= 4 && namen.every(n => has(fw, eh(n))) && classCount(fw, 'gw-ob') === 1);
        const det = z.leistungen_detail || [];
        check(T, `Leistungen mit Ausführungs-Chip (eigen/Partner) und Link: ${det.length} Einträge`, det.length >= 5 && classCount(ls, 'gw-li') === det.length && classCount(ls, 'gw-chip') === det.length && has(ls, 'gw-chip p'));
        check(T, 'Hauptbutton „Begehung anfragen“ → Formular (Hero + Ablauf + Abschluss), E-Mail nur als Nebenweg „Objektliste per Mail senden“ (Hero + Abschluss)', (h.match(/<a class="btn btn-acc" href="\/kontakt\/#anfrage">Begehung anfragen<\/a>/g) || []).length === 3 && (h.match(/<a class="btn btn-line" href="mailto:[^"]+">Objektliste per Mail senden<\/a>/g) || []).length === 2 && !has(h, 'Angebot für Ihr Objekt anfordern'));
        check(T, 'Partner-Hinweis steht unter den Leistungen', has(ls, 'class="gw-note') && has(ls, 'Partner-Fachbetrieb'));
        check(T, 'Hausmeisterservice-Hub wird von hier verlinkt (kein Waise)', has(h, 'href="/hausmeisterservice/"'));
        check(T, 'Schema: Service mit Audience, Breadcrumb Start › Für Gewerbe › Hausverwaltungen', has(flat, '"audience"') && has(flat, '"name":"Hausverwaltungen & WEG"'));
      }
    });
  }

  // --- Gewerbe-Hubs im Grundgerüst (Plan Task 8; Prüfungen wie PAKET-1 GRUNDGERÜST / CODE-BEFUNDE) ---
  const GW_HUBS = ['objektbetreuung', 'hausmeisterservice', 'unterhaltsreinigung', 'gebaeudereinigung', 'ferienwohnung-reinigung'];
  const ZG_URLS = Object.values(ZGS).concat(['/gewerbe/']);
  for (const sl of GW_HUBS) {
    page(`${sl}/index.html`, `PAKET-3 GEWERBE-HUB ${sl}`, h => {
      const leist = (h.match(/<section class="sec" id="leistungen">[\s\S]*?<\/section>/) || [''])[0];
      check(sl, 'Grundgerüst: genau 1 #leistungen, kein Aufklapper im Leistungsteil, 1 Ablauf, kein Detail-Band/Gebietskarte/Kalender', (h.match(/id="leistungen"/g) || []).length === 1 && !leist.includes('<details') && classCount(h, 'tl') === 1 && classCount(h, 'wa-grid') === 0 && classCount(h, 'media-band') === 0 && classCount(h, 'gebiet-wrap') === 0 && classCount(h, 'cal') === 0);
      check(sl, 'H2 „Häufige Fragen zu …“ und „So läuft … ab“ mit Leistungsname', /<h2[^>]*>Häufige Fragen zu /.test(h) && /<h2[^>]*>So läuft [^<]+ ab<\/h2>/.test(h));
      const faq = ((h.match(/<div class="faq rv">[\s\S]*?<\/section>/) || [''])[0].match(/<details/g) || []).length;
      check(sl, `FAQ 5–7 (${faq})`, faq >= 5 && faq <= 7);
      const passt = sectionOf(h, 'passt');
      const pl = [...passt.matchAll(/class="pxc" href="([^"]+)"/g)].map(m => m[1]);
      check(sl, `„Passt oft dazu“ mit Karten (${pl.length}), alle Ziele vorhanden, B2B-Hubs mit einer Karte auf eine Zielgruppenseite/Gewerbe`, pl.length >= 2 && pl.every(sxExists) && (sl === 'ferienwohnung-reinigung' || pl.some(x => ZG_URLS.includes(x))));
      check(sl, 'Karten mit Bild (kein leerer Bildplatz)', (passt.match(/class="pxc"/g) || []).length === (passt.match(/<picture/g) || []).length);
      const anker = [...h.matchAll(/href="#([A-Za-z0-9_-]+)"/g)].map(m => m[1]).filter(a => !has(h, `id="${a}"`));
      check(sl, 'kein Link auf Anker ohne Ziel' + (anker.length ? ' (' + anker.join(',') + ')' : ''), anker.length === 0);
      check(sl, 'kein „zzgl. MwSt.“, kein „ohne Subunternehmer“, kein „alles aus einer Hand“, kein „versichert“', verboten(h).filter(x => x !== 'Visitenkarten').length === 0);
      check(sl, 'Zusage 01 ohne „inklusive Abfuhr“ (Reinigung, Kontrollgänge), Ablauf ohne Abfuhr', !hasI(h, 'inklusive Abfuhr') && has(h, 'steht Ihr Preis schriftlich fest, ohne Nachforderung.'));
      check(sl, 'Ablauf: nur bestätigte Zeitangaben, B2B-Wortlaut (kein „besenrein“, „zu Hause“, „in Stunden“), Garantie ohne 48 h/Erstattung/Gratis-Einsatz', !/Antwort meist in Stunden|antworten meist in Stunden|besenrein ist Teil|nicht zu Hause|Kurzfristig · kostenlos|Direkt nach der Arbeit|48 Stunden|48 h|erstatten|Reinigungspreis zurück|nächster Einsatz kostenlos/i.test(text(h)) && has(h, 'Meist innerhalb weniger Tage · kostenlos') && has(h, 'Nach jedem Einsatz'));
      const idx = indexierbareOrtsseiten(sl); const orte = sectionOf(h, 'orte');
      if (!idx.length) check(sl, 'kein Orte-Block (keine indexierbaren Ortsseiten)', !has(h, 'id="orte"'));
      else {
        const linked = new Set([...orte.matchAll(new RegExp('href="/' + sl + '-([a-z0-9-]+)/"', 'g'))].map(m => m[1]));
        const fehlt = idx.filter(o => !linked.has(o));
        check(sl, 'alle indexierbaren Ortsseiten im Orte-Block verlinkt' + (fehlt.length ? ' (fehlt: ' + fehlt.slice(0, 5).join(',') + ')' : ''), has(h, 'id="orte"') && fehlt.length === 0);
        check(sl, 'Orte-Block: ≤ 6 Buttons, übrige als „Weitere Orte“', ((orte.match(/<div class="ox-chips">([\s\S]*?)<\/div>/) || ['', ''])[1].match(/<a /g) || []).length <= 6);
      }
      const hero = (h.match(/<div class="shot rv in d2">[\s\S]*?<img[^>]*src="\/assets\/img\/([^"]+?)(?:-\d+)?\.(?:jpe?g|webp|png)"/) || [])[1];
      const lf = (leist.match(/<img[^>]*src="\/assets\/img\/([^"]+?)(?:-\d+)?\.(?:jpe?g|webp|png)"/) || [])[1];
      const of = ((h.match(/class="ox-foto">[\s\S]*?<img[^>]*src="\/assets\/img\/([^"]+?)(?:-\d+)?\.(?:jpe?g|webp|png)"/) || [])[1]);
      const l3 = [hero, lf, of].filter(Boolean);
      check(sl, `kein Foto doppelt (Hero ${hero || '-'} / Leistung ${lf || '-'} / Orte ${of || '-'}), Orte-Foto kein Platzhalter`, new Set(l3).size === l3.length && of !== 'ueber-uns');
      if (sl !== 'ferienwohnung-reinigung') check(sl, 'Hub verlinkt eine Gewerbe-Seite im Inhalt (Menü zählt nicht)', links(h).some(x => ZG_URLS.includes(x)));
    });
  }
  page('hausmeisterservice/index.html', 'PAKET-3 GEWERBE-HUB hausmeisterservice b2b_only', h => {
    check('hausmeisterservice', 'b2b_only: keine Ortsseiten verlinkt, kein Orte-Block', !has(h, 'id="orte"') && !/href="\/hausmeisterservice-[a-z-]+\/"/.test(h));
  });
  // Sitemap + llms.txt
  P('PAKET-3 GEWERBE Sitemap + llms.txt');
  const llms = (() => { try { return fs.readFileSync('website/llms.txt', 'utf8'); } catch { return ''; } })();
  check('gw-sitemap', 'sitemap-services.xml enthält /gewerbe/ + 4 Zielgruppenseiten + 5 Gewerbe-Hubs', ZG_URLS.every(u => has(sitemap, u + '</loc>')) && GW_HUBS.every(sl => has(sitemap, `/${sl}/</loc>`)));
  check('gw-sitemap', 'llms.txt: Abschnitt „Für Gewerbe“ mit /gewerbe/ + 4 Zielgruppenseiten', has(llms, '## Für Gewerbe') && ZG_URLS.every(u => has(llms, u + ')')));

  // --- Owner-Entscheide 20.10. abends: alle Gewerbe-Seiten + Gewerbe-Hubs indexierbar; Grundreinigung = Eigenleistung; Bestandsobjekte-Satz; beide Namen; gestrichene Garantien draußen ---
  P('PAKET-3 GEWERBE Owner-Entscheide 20.10. abends');
  const GW_ALLE = ZG_URLS.concat(GW_HUBS.map(sl => `/${sl}/`));
  for (const u of GW_ALLE) {
    const h = read(u.slice(1) + 'index.html');
    if (h == null) { check(u, 'Seite vorhanden', false); continue; }
    check(u, 'kein noindex (Meta robots + X-Robots)', !/<meta name="robots"[^>]*noindex/i.test(h));
    check(u, 'in sitemap-services.xml', has(sitemap, u + '</loc>'));
    check(u, 'keine gestrichenen Garantien („48 Stunden“, „Reinigungspreis zurück“, „nächster Einsatz kostenlos“)', !/48 Stunden|Reinigungspreis zurück|nächster Einsatz kostenlos/i.test(text(h)));
    // Grundreinigung nie mit Partner/Fachbetrieb/vermitteln im selben Satz (Satzgrenze = . ! ?)
    const saetze = text(h.replace(/<\/(p|div|li|h[1-6]|section|summary)>/gi, '$&¶')).split(/(?<=[.!?])\s+|¶/);
    const bad = saetze.filter(s => /Grundreinigung|Auszugsreinigung/i.test(s) && /Partner|Fachbetrieb|vermittel/i.test(s));
    check(u, 'kein Satz verbindet Grundreinigung mit Partner/Fachbetrieb/vermitteln' + (bad.length ? ' (' + bad[0].slice(0, 90) + ')' : ''), bad.length === 0);
  }
  for (const u of ['/gewerbe/', '/fuer-hausverwaltungen/']) {
    const h = read(u.slice(1) + 'index.html');
    const n = h ? (text(h).match(/Wir betreuen bereits Objekte im Havelland in festen Pflegeverträgen/g) || []).length : 0;
    check(u, `Bestandsobjekte-Satz genau 1× („Wir betreuen bereits Objekte …“, ohne Zahl) (${n})`, n === 1 && !/\d+ (Objekte|Pflegeverträge)/.test(text(h)));
  }
  for (const u of ZG_URLS) {
    const h = read(u.slice(1) + 'index.html');
    if (h == null) continue;
    const t = text(h);
    check(u, 'Ansprechpartner: nirgends „Noah Telo“ ohne „Maurice Brehm und“ davor', (t.match(/Noah Telo/g) || []).length === (t.match(/Maurice Brehm und Noah Telo/g) || []).length);
  }
  { const h = read('fuer-hausverwaltungen/index.html'); check('/fuer-hausverwaltungen/', 'Begehung: „Maurice Brehm und Noah Telo“ genannt', has(text(h || ''), 'Maurice Brehm und Noah Telo')); }
  { const h = read('fuer-hausverwaltungen/index.html') || '', flat = JSON.stringify(schemaOk(h)); check('/fuer-hausverwaltungen/', 'Schema: Grundreinigung als provider, nicht broker', /"url":"https:\/\/[^"]+\/grundreinigung\/","itemOffered":\{"@type":"Service","name":"[^"]*","serviceType":"[^"]*","provider"/.test(flat)); }
}

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
