// accept-lp.mjs — Ads-Session: Abnahme-Checks für /lp/** (Ergänzung zu accept.mjs; accept.mjs bleibt unberührt).
// Run: node scripts/accept-lp.mjs   (setzt voraus: FULL=1 node scripts/generate.mjs lief)
// Exit 0 = ACCEPT-LP GRÜN, 1 = ROT.
import fs from 'fs';

const read = rel => { try { return fs.readFileSync(`website/${rel}`, 'utf8'); } catch { return null; } };
const has = (html, s) => !!html && html.indexOf(s) > -1;
function classCount(html, token) {
  if (!html) return 0;
  let n = 0, m; const re = /class="([^"]*)"/g;
  while ((m = re.exec(html)) !== null) if (m[1].split(/\s+/).includes(token)) n++;
  return n;
}
const rvOhneIn = h => { const re = /class="([^"]*)"/g; let m, n = 0; while ((m = re.exec(h)) !== null) { const t = m[1].split(/\s+/); if (t.includes('rv') && !t.includes('in')) n++; } return n; };
const lpAltKlassen = h => (h.match(/\b(lp-card|lp-steps|lp-quote|lp-ba-grid|lp-trust)\b/g) || []).length;
// Fokus-Check (Ein-Schritt, v7): Das Formular-Skript setzt den Fokus nur nach einer Nutzeraktion — Enter springt ins nächste Feld (t.focus())
// und nach einem fehlgeschlagenen Absenden geht der Fokus auf das erste fehlende Feld (e.focus(); beim Objekt ohne Scroll-Sprung). Genau diese drei .focus(-Aufrufe;
// jeder weitere (z. B. Auto-Fokus beim Laden, der auf dem Handy die Tastatur öffnet) wird rot (Selbsttest unten).
const focusOk = js => js.length > 500 && (js.match(/\.focus\(/g) || []).length === 3
  && /if\(nx\)\{e\.preventDefault\(\);var t=f\.elements\[nx\];if\(t\)t\.focus\(\)\}/.test(js) && /e\.focus\(\)\}return false\}/.test(js)
  && /block:'center'\}\);e\.focus\(\{preventScroll:true\}\)\}else\{/.test(js);
const escH = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const textOf = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
// Preisangabe irgendwo im Text (Nachlass-Hero): Ziffer + € / Euro / EUR (auch „499,- €“, „499 Euro“) oder € + Ziffer
const PREIS_RE = /\d[\d.,-]*\s?(?:€|Euro\b|EUR\b)|€\s?\d/i;

const fails = []; const lines = [];
const P = label => lines.push(`\n${label}`);
function check(pageId, name, ok) { lines.push(`  ${ok ? '✓' : '✗'} ${name}`); if (!ok) fails.push(`${pageId}:${name}`); }
function page(rel, label, fn) {
  P(`${label}  [${rel}]`);
  const html = read(rel);
  if (html == null) { check(rel, 'Seite vorhanden', false); return; }
  fn(html);
}

// Quelle lesen, nicht das Ergebnis: form_pos und weitere Seiten-Felder stehen in lp.json.
const lpJson = JSON.parse(fs.readFileSync('data/copy/lp.json', 'utf8'));
const entryOf = rel => (lpJson.lps || []).find(x => x.slug === rel.split('/')[1]) || {};
const posOf = rel => entryOf(rel).form_pos || 'hero';

// Optionen: reviews/ba wie bisher · mitAktion = Ziel-URL des Angebots-Assets (bis 30.11.) · ohneAktion = Nachlass (A7)
// · keinAbPreis = [S2] JE_LP: Nachlass ohne „ab …€“ im Hero (Bereich bis Ende der lp-hero-Section) und ohne Preis-Anker (data-via="preis");
//   der Abschnitt #preise darf die sachliche Preis-Orientierung tragen (Owner Maurice 20.10.). Haus/Keller/Wohnung/Entrümpelung zeigen ihren Ab-Preis selbst
// · ortSwap = ort_swap Pflicht (data-ort im Hero)
// · gewerbe = Gewerbe-LP: „Betrieb aus Falkensee“ und die 2–3-Werktage-Zeile in der FAQ sind dort nicht Pflicht (Anzeigen nutzen den Wortlaut nicht)
// · reviewsMin = Mindestzahl Bewertungskarten (Standard 2; Nachlass 1: nur Index 0, Index 6 nennt den Preis, Audit O7)
const LPS = [
  ['lp/haushaltsaufloesung-havelland/index.html', 'LP haushaltsaufloesung', { reviews: true, ba: 2, mitAktion: true, einstieg: true }],
  ['lp/messie-wohnung-raeumung/index.html', 'LP messie', { reviews: true, ortSwap: true }],
  ['lp/gewerbe-entruempelung/index.html', 'LP gewerbe', { reviews: true, gewerbe: true }],
  ['lp/nachlass-aufloesung/index.html', 'LP nachlass', { reviews: true, ohneAktion: true, keinAbPreis: true, ortSwap: true, nachlassFaq: true }],
  ['lp/wohnungsaufloesung/index.html', 'LP wohnung', { reviews: true }],
  ['lp/haus-entruempeln/index.html', 'LP haus', { reviews: true, ortSwap: true }],
  ['lp/keller-dachboden-garage/index.html', 'LP keller', { reviews: true }],
  ['lp/entruempelung-havelland/index.html', 'LP entruempelung', { reviews: true, ortSwap: true }],
  ['lp/danke/index.html', 'LP danke', { danke: true }],
];
// Bewertungszahl der Trust-Zeile kommt aus data/proof.json (nie hart codiert, Prinzip 6): die Seite muss genau diese Zahl zeigen.
const proofGR = JSON.parse(fs.readFileSync('data/proof.json', 'utf8')).google_reviews || {};
const lpSlugs = (lpJson.lps || []).map(x => x.slug).sort();
const pageSlugs = LPS.filter(x => !x[2].danke).map(x => x[0].split('/')[1]).sort();
// Slug-Menge: jede LP aus lp.json wird geprüft, und jede geprüfte Seite steht in lp.json (neue/entfernte LPs fallen sofort auf)
P('Slug-Menge lp.json == Prüfliste LPS  [data/copy/lp.json]');
check('lp.json', `Slug-Menge gleich (lp.json: ${lpSlugs.join(', ')})`, JSON.stringify(lpSlugs) === JSON.stringify(pageSlugs));
check('lp.json', 'keine doppelten Slugs in lp.json', new Set(lpSlugs).size === lpSlugs.length);
// Aktion nur bis aktion.bis (Generator rendert danach nichts mehr): nach Ablauf erwartet die Abnahme KEINE Karte (keine Zeitbombe am 01.12.)
const aktAktiv = !!(lpJson.aktion && lpJson.aktion.bis) && Date.now() <= new Date(lpJson.aktion.bis + 'T23:59:59+01:00').getTime();
const PFLICHT_HIDDEN = ['quelle', 'lp', 'gclid', 'wbraid', 'gbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'landing_url', 'ads_consent', 'access_key', 'subject', 'from_name', 'redirect', 'botcheck'];
const EREIGNISSE = ['form_start', 'form_step', 'form_error', 'form_quickstart', 'generate_lead', 'start_via'];

for (const [rel, label, o] of LPS) page(rel, label, h => {
  const id = label.replace(/\s+/g, '-').toLowerCase();
  // --- Grund-Checks (aus accept.mjs übernommen)
  check(id, 'phero>=1', classCount(h, 'phero') >= 1);
  check(id, 'tl>=1', classCount(h, 'tl') >= 1);
  if (o.reviews) check(id, `review-card>=${o.reviewsMin || 2}`, classCount(h, 'review-card') >= (o.reviewsMin || 2));
  // --- Bewertungen (v7): Karten = Auswahl aus lp.json (bewertungen_lp bzw. Standard), erste hervorgehoben, Kopf-Zahl aus data/proof.json
  if (o.reviews) {
    const sel = entryOf(rel).bewertungen_lp || lpJson.bewertungen_lp_standard || [];
    const rS = h.indexOf('id="bewertungen"'), revH = rS > -1 ? h.slice(rS, h.indexOf('</section>', rS)) : '';
    check(id, `Bewertungskarten = Auswahl (${sel.join(', ')})`, (revH.match(/class="review-card lp-rc/g) || []).length === sel.length);
    const first = (lpJson.bewertungen || {})[sel[0]] || {};
    const featS = revH.indexOf('class="review-card lp-rc feat"');
    check(id, `erste Karte hervorgehoben, wörtlich ${first.a}`, featS > -1 && revH.slice(featS).includes(escH(first.t || '-').slice(0, 40)));
    check(id, `Bewertungskopf: ${proofGR.count} Bewertungen bei Google (data/proof.json)`, has(revH, `<b>${proofGR.count} Bewertungen bei Google</b>`));
    check(id, 'Bewertungs-H2 mit genau einem kursiven Wort', (revH.match(/<em>/g) || []).length === 1);
  }
  // --- Vertrauensleiste + Kopf (v7, auch Danke): Zahl/Note aus data/proof.json, „Zur Website“ als einziger Ausgang im Kopf, kein Menü
  const tb = (h.match(/<div class="lp-topbar">([\s\S]*?)<\/div><\/div>/) || [])[1] || '';
  const tbSoll = `★★★★★ ${Number(proofGR.rating).toFixed(1).replace('.', ',')} bei Google · ${proofGR.count} Bewertungen · Betrieb aus Falkensee`;
  check(id, `Vertrauensleiste = „${tbSoll}“ (Zahl aus data/proof.json)`, textOf(tb) === tbSoll);
  check(id, 'Vertrauensleiste steht vor dem Kopf', has(h, 'class="lp-topbar"') && h.indexOf('class="lp-topbar"') < h.indexOf('<header class="lp-head"'));
  const kopf = (h.match(/<header class="lp-head">[\s\S]*?<\/header>/) || [''])[0];
  check(id, 'Kopf: Link „Zur Website“ auf / (lp-web)', /<a class="lp-web" href="\/"><span class="lw">Zur <\/span>Website /.test(kopf));
  check(id, 'Kopf: Telefon-Pill mit sichtbarer Nummer', /<a class="callpill" href="tel:[^"]+">[\s\S]*?<span class="num">/.test(kopf));
  check(id, 'Kopf: kein Menü', !/class="hamb"|navmenu|<nav[\s>]/.test(kopf));
  if (o.ba) check(id, `ba>=${o.ba}`, classCount(h, 'ba') >= o.ba);
  check(id, 'kein rv ohne in', rvOhneIn(h) === 0);
  // --- Struktur (AV-C 7): keine doppelten id, genau eine h1
  const ids = [...h.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  check(id, `keine doppelten id${dup.length ? ' (' + [...new Set(dup)].join(', ') + ')' : ''}`, dup.length === 0);
  check(id, 'genau eine <h1>', (h.match(/<h1[\s>]/g) || []).length === 1);
  check(id, 'kein hartcodiertes #fff im CSS (Token --lp-surface)', !/background:#fff/i.test(h));
  check(id, 'keine lp-card/lp-steps/lp-quote/lp-ba-grid/lp-trust', lpAltKlassen(h) === 0);
  if (!o.danke) {
    check(id, 'gstrip>=1', classCount(h, 'gstrip') >= 1);
    check(id, 'trust-row>=1', classCount(h, 'trust-row') >= 1);
    // --- Abschnitt „Was wir tun“ nur, wenn lp.json was_wir_tun hat
    const wwtd = entryOf(rel).was_wir_tun;
    check(id, wwtd ? '#was-wir-tun vorhanden (was_wir_tun in lp.json)' : 'kein #was-wir-tun (kein was_wir_tun in lp.json)', wwtd ? has(h, 'id="was-wir-tun"') : !has(h, 'id="was-wir-tun"'));
    // --- Trust-Zeile Handy (v7): genau eine, nur trust_zeile aus lp.json mit Häkchen; die Google-Zahl steht in der Vertrauensleiste (oben geprüft)
    const t1 = [...h.matchAll(/<p class="lp-trust1">([\s\S]*?)<\/p>/g)];
    check(id, 'genau eine Trust-Zeile (.lp-trust1)', t1.length === 1);
    const t1Text = t1.length ? t1[0][1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
    check(id, `Trust-Zeile = trust_zeile aus lp.json („${entryOf(rel).trust_zeile || ''}“)`, !!entryOf(rel).trust_zeile && t1Text === entryOf(rel).trust_zeile);
    check(id, 'Trust-Zeile mit Häkchen-Symbol', t1.length === 1 && t1[0][1].startsWith('<svg '));
    if (o.keinAbPreis) check(id, 'Trust-Zeile ohne Preis-/Festpreis-Werbung (Nachlass)', !/Festpreis|Preis|€/i.test(t1Text));
    else check(id, 'Trust-Zeile nennt „Festpreis nach Besichtigung“', /Festpreis nach Besichtigung/.test(t1Text));
    // --- Preis-Kacheln (v7, Owner 20.10. „oben“): im Hero VOR dem Formular, Anzahl = preis.anker.items, Preis wörtlich zusammenhängend im Text,
    //     verlinkte Kacheln (Einträge mit obj) mit data-via="preis" + aria-label
    const heroS = h.indexOf('<section class="phero lp-hero'), heroE = h.indexOf('</section>', heroS);
    const heroH = heroS > -1 && heroE > heroS ? h.slice(heroS, heroE) : '';
    const ankerItems = (((entryOf(rel).preis || {}).anker || {}).items || []).map(x => typeof x === 'string' ? { t: x } : x);
    const tiles = [...heroH.matchAll(/<(a|div) class="lp-tile"([^>]*)>/g)];
    check(id, `Hero-Kacheln = preis.anker.items (${ankerItems.length})`, tiles.length === ankerItems.length);
    const tileLinks = tiles.filter(m => m[1] === 'a');
    check(id, `verlinkte Kacheln = Einträge mit obj (${ankerItems.filter(x => x.obj).length})`, tileLinks.length === ankerItems.filter(x => x.obj).length);
    if (tileLinks.length) check(id, 'Kachel-Links mit data-via="preis" und aria-label', tileLinks.every(m => /data-via="preis"/.test(m[2]) && /aria-label="/.test(m[2])));
    if (tiles.length) {
      check(id, 'Kacheln stehen vor dem Formular', heroH.indexOf('class="lp-tiles') < heroH.indexOf('id="anfrage"'));
      check(id, 'Zeile „Einstiegspreis(e) inkl. MwSt.“ direkt über den Kacheln', /<p class="lp-preise-l">Einstiegspreise? inkl\. MwSt\.<\/p><div class="lp-tiles/.test(heroH));
      for (const x of ankerItems) check(id, `Preis wörtlich im Hero-Text: „${x.t}“`, textOf(heroH).includes(x.t));
    }
    if (o.einstieg) {
      check(id, 'Haushalt-Hero: „Entrümpelung ab 99 €“ als Kachel', has(heroH, 'Entrümpelung</span> <span class="pp"><small>ab</small> 99 €'));
      check(id, 'Haushalt-Hero: Hinweis „für kleine, gut zugängliche Objekte“ unter den Kacheln', has(heroH, '<p class="lp-preise-n">für kleine, gut zugängliche Objekte'));
    }
    // --- Zitat (v7): wörtlicher Auszug aus lp.json bewertungen (LP-Wert vor Standard), im Hero nach dem Formular
    const zq = entryOf(rel).zitat_hero === false ? null : (entryOf(rel).zitat_hero || lpJson.zitat_hero);
    if (zq) {
      check(id, `Zitat „${zq.t}“ im Hero nach dem Formular`, has(heroH, `<figure class="lp-zitat"><blockquote>„${escH(zq.t)}“</blockquote>`) && heroH.indexOf('class="lp-zitat"') > heroH.indexOf('id="anfrage"'));
      check(id, 'Zitat ist wörtlicher Teil der verknüpften Bewertung', String((((lpJson.bewertungen || {})[zq.quelle]) || {}).t || '').includes(zq.t));
    }
    // --- Vertrauenspunkte (v7): trust-row lp-checks mit 4 Einträgen im Hero
    check(id, 'Vertrauenspunkte: 4 Einträge mit Häkchen (trust-row lp-checks)', has(heroH, '<div class="trust-row lp-checks">') && (heroH.match(/<div class="t"><svg /g) || []).length === 4);
    // --- Besichtigungsfrist (Owner 20.10.): Wortlaut der Anzeigen-Überschrift „Termin meist in 2–3 Werktagen“ steht wörtlich im Ablauf jeder Anfrage-LP;
    //     FAQ nennt „2–3 Werktagen“ (Gewerbe: FAQ unverändert). Nachlass bleibt ruhig: keine Dringlichkeitswörter im Ablauf.
    const ablaufS = h.indexOf('class="tl'), ablaufE = h.indexOf('id="preise"');
    const ablaufH = ablaufS > -1 && ablaufE > ablaufS ? h.slice(ablaufS, ablaufE) : '';
    check(id, 'Ablauf nennt wörtlich „Termin meist in 2–3 Werktagen“ (Besichtigung, Anzeigen-Überschrift)', has(ablaufH, 'Termin meist in 2–3 Werktagen'));
    if (!o.gewerbe) check(id, 'FAQ nennt „meist in 2–3 Werktagen“ (Besichtigung)', has(h.slice(h.indexOf('id="fragen"')), 'meist in 2–3 Werktagen'));
    if (o.keinAbPreis) check(id, 'Nachlass: Ablauf ohne Dringlichkeitswörter (schnell, sofort, dringend, zeitnah, kurzfristig, jetzt)', ablaufH.length > 200 && !/schnell|sofort|dringend|zeitnah|kurzfristig|jetzt/i.test(ablaufH));
    // --- „Betrieb aus Falkensee“ (Wortlaut der B-Anzeigen) sichtbar im Trust-Block (nicht Gewerbe)
    if (!o.gewerbe) check(id, 'Trust-Block nennt wörtlich „Betrieb aus Falkensee“', /<div class="trust-row lp-checks">[\s\S]*?<b>Betrieb aus Falkensee<\/b>/.test(h) || has(t1Text, 'Betrieb aus Falkensee'));
    // --- Aktionskarte (v7): gleiche Karte im Hero (nach dem Formular) und in #preise, Texte aus lp.json, Bedingung ausgeschrieben, kein Sternchen
    if (!o.ohneAktion && aktAktiv) {
      const AK = lpJson.aktion || {};
      const karteRe = /<div class="lp-aktion" data-bis="[^"]+">[\s\S]*?<\/p><\/div>/;
      const pS = h.indexOf('id="preise"'), preiseH = pS > -1 ? h.slice(pS, h.indexOf('</section>', pS)) : '';
      for (const [wo, k] of [['Hero', (heroH.match(karteRe) || [''])[0]], ['#preise', (preiseH.match(karteRe) || [''])[0]]]) {
        check(id, `Aktionskarte ${wo}: Abzeichen, Titel und Bedingung aus lp.json`, !!k && has(k, `>${escH(AK.badge)}<`) && has(k, escH(AK.karte_titel)) && has(k, escH(AK.karte_bedingung)));
        check(id, `Aktionskarte ${wo}: kein Sternchen`, !!k && !k.includes('*'));
      }
      check(id, 'Aktionskarte im Hero nach dem Formular', heroH.indexOf('class="lp-aktion"') > heroH.indexOf('id="anfrage"'));
    }
    if (o.nachlassFaq) check(id, 'FAQ nennt „Nachlassentrümpelung“', has(h.slice(h.indexOf('id="fragen"')), 'Nachlassentrümpelung'));
    const pos = posOf(rel);
    // --- Formular-Position gegen die Quelle (Variante A/B), Anker ist die Hero-Section, nicht das CSS im <head>
    const heroStart = h.indexOf('<section class="phero lp-hero');
    const heroEnd = h.indexOf('</section>', heroStart);
    const iA = h.indexOf('id="anfrage"');
    const inHero = heroStart > -1 && iA > heroStart && iA < heroEnd;
    check(id, `Formular-Position = form_pos (${pos})`, pos === 'hero' ? inHero : (iA > -1 && !inHero));
    check(id, 'genau ein id="anfrage"', (h.match(/id="anfrage"/g) || []).length === 1);
    // --- Formular-Skript: kein Auto-Fokus, Ereignisse vorhanden
    const formJs = h.match(/<script>\(function\(\)\{var f=document\.getElementById\('anfrage'\)[\s\S]*?<\/script>/)?.[0] || '';
    check(id, 'Formular-Skript gefunden', formJs.length > 500);
    // Fokus nur nach Nutzeraktion (Enter-Weiter, erstes Fehlerfeld nach Absenden); jedes weitere .focus( bleibt rot
    check(id, 'Fokus nur nach Nutzeraktion (genau Enter-Weiter + erstes Fehlerfeld, Objekt ohne Scroll)', focusOk(formJs));
    check(id, 'Pflichtfelder: Leerzeichen zählen nicht, Telefon braucht mindestens 6 Ziffern', has(formJs, "/^(text|tel|email)$/.test(e.type)&&!e.value.trim())ok=false;") && has(formJs, "e.value.replace(/\\D/g,'').length<6"));
    check(id, 'Zurück aus der Danke-Seite leert das Formular (kein Doppel-Lead)', has(formJs, 'if(f.__sent){f.__sent=false;f.reset();') && has(formJs, 'if(j&&j.success){f.__sent=true;'));
    check(id, '§ 25 TDDDG: hg_attrib ohne Einwilligung nicht lesen, sondern löschen; bei Ablehnen/Cookie-Einstellungen löschen', has(h, 'var ok0=allowed();if(!ok0){try{localStorage.removeItem(S)}catch(e){}}var cur=(ok0&&load())||{};') && has(h, "#consent [data-c=deny],#consent-reset')){try{localStorage.removeItem(S)}"));
    // Selbsttest: ein zusätzliches .focus( (z. B. Auto-Fokus beim Laden) muss den Fokus-Check rot färben (sonst prüft er nichts)
    check(id, 'Selbsttest Fokus-Check: zusätzliches ort.focus() → ✗', formJs.length > 500 && !focusOk(formJs + ";f.elements['ort'].focus()"));
    check(id, 'Selbsttest Fokus-Check: Enter-Weiter entfernt → ✗', formJs.length > 500 && !focusOk(formJs.replace('if(t)t.focus()', 'if(t)t.click()')));
    // --- Ein Schritt (Owner 20.10.): keine Schritt-Logik, genau ein Absende-Knopf, Einwilligung mit beiden Zwecken, Hero-Bild fest
    check(id, 'Ein Schritt: kein data-next/data-back/.step1/.step2', !/data-next|data-back|class="step[12]"/.test(h));
    check(id, 'Ein Schritt: genau ein Absende-Knopf im Formular', ((((h.match(/<form id="anfrage"[\s\S]*?<\/form>/) || [''])[0]).match(/type="submit"/g)) || []).length === 1);
    check(id, 'Einwilligung nennt „Kontaktaufnahme und für das Angebot“', has(h, 'zur Kontaktaufnahme und für das Angebot zu'));
    check(id, 'Hero-Bild läuft auf dem Desktop nicht mit (kein position:sticky an .shot)', !/\.shot\{position:sticky/.test(h));
    for (const e of EREIGNISSE) check(id, `Formular-Skript enthält ${e}`, has(formJs, e));
    // --- Pflichtfelder, Ziele
    for (const n of PFLICHT_HIDDEN) check(id, `hidden ${n}`, has(h, `name="${n}"`));
    check(id, 'Web3Forms-Ziel', has(h, 'action="https://api.web3forms.com/submit"'));
    check(id, 'Redirect /lp/danke/', has(h, '/lp/danke/'));
    check(id, 'GTM vorhanden', has(h, 'GTM-TR7JVXZL'));
    check(id, 'Telefon-Logik je Kontaktweg', has(h, 'data-req-by="kontaktweg"'));
    check(id, '>= 3 Objekt-Chips', (h.match(/name="objekt"/g) || []).length >= 3);
    const nObj = (entryOf(rel).objekte || []).length;
    check(id, `Objekt-Leiste mit ${nObj} Spalten (seg3 nur bei 3 Objekten)`, nObj === 3 ? has(h, '<div class="seg seg3"><label><input type="radio" name="objekt"') : has(h, '<div class="seg"><label><input type="radio" name="objekt"'));
    // --- Zweitwege (M3): Hero-Variante Buttons, Variante A Textlinks
    if (pos === 'hero') check(id, 'Zweitwege Anruf + WhatsApp (lp-alt)', /<p class="lp-alt">[\s\S]*?href="tel:[\s\S]*?href="https:\/\/wa\.me\//.test(h));
    // --- Wording (S-urteil 12, lp.json _meta)
    check(id, 'kein „Festpreis anfragen“ (nur „Festpreis für Räumung und Abtransport“)', !has(h, 'Festpreis anfragen'));
    check(id, 'Hinweis „Besichtigung und Angebot kostenlos“', has(h, 'Besichtigung und Angebot kostenlos'));
    check(id, 'Telefon-Hinweis „Keine Werbeanrufe“', has(h, 'Keine Werbeanrufe'));
    check(id, 'Kurz-Chips ohne aria-hidden', !has(h, 'class="qs" aria-hidden'));
    check(id, 'scroll-margin-top:82px', has(h, '#anfrage{scroll-margin-top:82px}'));
    // --- Aktion (A7) und Ansprechpartner (B5, Standard aus)
    check(id, 'kein Ansprechpartner-Block (B5, Standard aus)', !has(h, 'class="lp-person"'));
    if (o.ohneAktion) check(id, 'keine Aktion (A7)', !has(h, 'class="lp-aktion"'));
    if (o.mitAktion) check(id, aktAktiv ? 'Aktion vorhanden (Ziel-URL des Angebots-Assets, bis 30.11.)' : 'Aktion abgelaufen: keine Aktionskarte mehr', aktAktiv ? has(h, 'class="lp-aktion"') : !has(h, 'class="lp-aktion"'));
    // --- Preise [S2]
    if (o.keinAbPreis) {
      const hero = heroStart > -1 && heroEnd > heroStart ? h.slice(heroStart, heroEnd) : '';
      check(id, '[S2] Hero gefunden (Bereich für den Preis-Check)', hero.length > 200);
      check(id, '[S2] keine Preisangabe im Hero (€, Euro, EUR in jeder Schreibweise; Preise nur im Abschnitt #preise)', hero.length > 200 && !PREIS_RE.test(hero));
      for (const t of ['ab 499 €', 'ab 499 Euro', 'ab 499,- €', 'ab 499 EUR', 'ab ca. 499€', '€ 499']) check(id, `[S2] Selbsttest: „${t}“ im Hero → ✗`, hero.length > 200 && PREIS_RE.test(`${hero} ${t}`));
      check(id, '[S2] kein Preis-Anker (data-via="preis") und keine Hero-Preiszeile', !has(h, 'data-via="preis"') && !has(h, 'class="lp-hero-preis"'));
    }
    if (o.ortSwap) check(id, 'ort_swap gesetzt (data-ort im Hero)', has(h, 'data-ort="'));
    // --- Nachlass-Lead auf dem Handy (Attribut an der Hero-Section prüfen, nicht das CSS-Selektor-Vorkommen im <head>)
    check(id, 'data-lead-mobil gleich lead_mobil in lp.json', (entryOf(rel).lead_mobil === true) === /<section class="phero lp-hero[^"]*"[^>]*data-lead-mobil/.test(h));
  } else {
    // Danke-Seite: der Lead mit der Rückruf-Nummer darf nie ausgeblendet werden (P2 H1)
    check(id, 'Rückruf-Nummer im Lead vorhanden', has(h, 'Der Rückruf kommt von'));
    const versteckt = [...h.matchAll(/([^{}]*)\.lead\{display:none\}/g)].filter(m => !/lp-hero-form/.test(m[1]));
    check(id, 'keine unbeschränkte Regel .lead{display:none}', versteckt.length === 0);
  }
});

console.log(lines.join('\n'));
if (fails.length) { console.log(`\nACCEPT-LP ROT: ${fails.length} fehlend — ${fails.join(', ')}`); process.exit(1); }
console.log('\nACCEPT-LP GRÜN');
process.exit(0);
