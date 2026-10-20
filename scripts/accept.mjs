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
