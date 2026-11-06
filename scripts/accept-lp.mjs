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
// --- Modus hecke (06.11.2026, Hecken-LPs, Owner-Regeln: keine Preise, keine Meterpreise, kein Räum-/Entrümpelungs-Wort, kein Personenbild, nur echtes Paar im Slider) ---
// Meterpreis: je/pro (laufender) Meter, lfm, laufende Meter, Meterpreis, Quadratmeterpreis, „12 €/m“. „3 Meter hoch“ (Kundenzitat) ist kein Meterpreis.
const METER_RE = /\b(?:je|pro)\s+(?:laufende[nr]?\s+)?(?:Meter\b|m\b|lfm\b|qm\b|Quadratmeter\b)|\blfm\b|laufende[rn]?\s+Meter|Meterpreis|Quadratmeter-?preis|[€]\s?\/\s?(?:lfm|m|qm)\b/i;
const RAEUM_RE = /räum|entrümpel|Festpreis für Räumung/i;
const PERSON_RE = /-noah\b|hecke-hinten|zaun-hinten|ansprechpartner|team-|person/i;
const LABEL_RE = /Beispielbild|Beispielfoto|Symbolbild|echtes Foto|echtes Bild|Beispielhafte Darstellung/i;
const stripCode = h => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ');
const sichtText = h => textOf(stripCode(h));
const metaOf = h => ((h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
const titleOf = h => ((h.match(/<title>([^<]*)<\/title>/) || [])[1] || '');
const jsStrings = h => [...h.matchAll(/<script(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
// Gate-Funktionen (true = in Ordnung). Sichttext, title, meta UND JS-Strings (Skripte gehören nicht zum Sichttext, könnten aber Varianten-Strings tragen).
const betragFrei = h => ![sichtText(h), titleOf(h), metaOf(h), jsStrings(h)].some(t => PREIS_RE.test(t));
const meterFrei = h => ![sichtText(h), titleOf(h), metaOf(h), jsStrings(h)].some(t => METER_RE.test(t));
const raeumFrei = h => ![sichtText(h), titleOf(h), metaOf(h)].some(t => RAEUM_RE.test(t));
const lowerFirst = t => String(t).charAt(0).toLowerCase() + String(t).slice(1);

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

// Optionen: reviews/ba wie bisher · mitAktion = Ziel-URL des Angebots-Assets (bis 30.11.) · ohneAktion = Nachlass (A7) und Haus (Todesfall-Bewertung im Bewertungsblock, Launch-Gate S6 29.10.)
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
  ['lp/haus-entruempeln/index.html', 'LP haus', { reviews: true, ortSwap: true, ohneAktion: true }],
  ['lp/keller-dachboden-garage/index.html', 'LP keller', { reviews: true }],
  ['lp/entruempelung-havelland/index.html', 'LP entruempelung', { reviews: true, ortSwap: true }],
  ['lp/entruempelung-kosten-havelland/index.html', 'LP entruempelung-kosten', { reviews: true, ortSwap: true, kosten: true }],
  ['lp/danke/index.html', 'LP danke', { danke: true }],
  // Hecken-LPs (Modus hecke): kein Aktions-/Festpreis-/Kachel-/Räumungs-Ablauf-Zwang, eigene Pflicht-Gates unten
  ['lp/heckenschnitt/index.html', 'LP heckenschnitt', { reviews: true, hecke: true }],
  ['lp/hecke-zurueckschneiden/index.html', 'LP hecke-zurueckschneiden', { reviews: true, hecke: true }],
  ['lp/hecke-radikalschnitt/index.html', 'LP hecke-radikalschnitt', { reviews: true, hecke: true }],
  ['lp/hecke-auf-den-stock-setzen/index.html', 'LP hecke-auf-den-stock-setzen', { reviews: true, hecke: true }],
  ['lp/heckenentfernung/index.html', 'LP heckenentfernung', { reviews: true, hecke: true }],
  ['lp/danke-hecke/index.html', 'LP danke-hecke', { danke: true, hecke: true }],
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
const PFLICHT_HIDDEN = ['quelle', 'lp', 'tel', 'email', 'kontaktweg', 'gclid', 'wbraid', 'gbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'landing_url', 'ads_consent', 'access_key', 'subject', 'from_name', 'redirect', 'botcheck'];
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
    else if (o.hecke) check(id, 'Trust-Zeile nennt „Festpreis“ und „Betrieb aus Falkensee“ (Hecke, Wording O19, Owner-Korrektur 06.11.)', /Festpreis/.test(t1Text) && /Betrieb aus Falkensee/.test(t1Text));
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
    if (!o.hecke) check(id, 'Ablauf nennt wörtlich „Termin meist in 2–3 Werktagen“ (Besichtigung, Anzeigen-Überschrift)', has(ablaufH, 'Termin meist in 2–3 Werktagen'));
    if (!o.gewerbe && !o.hecke) check(id, 'FAQ nennt „meist in 2–3 Werktagen“ (Besichtigung)', has(h.slice(h.indexOf('id="fragen"')), 'meist in 2–3 Werktagen'));
    if (o.keinAbPreis) check(id, 'Nachlass: Ablauf ohne Dringlichkeitswörter (schnell, sofort, dringend, zeitnah, kurzfristig, jetzt)', ablaufH.length > 200 && !/schnell|sofort|dringend|zeitnah|kurzfristig|jetzt/i.test(ablaufH));
    // --- „Betrieb aus Falkensee“ (Wortlaut der B-Anzeigen) sichtbar im Trust-Block (nicht Gewerbe)
    if (!o.gewerbe) check(id, 'Trust-Block nennt wörtlich „Betrieb aus Falkensee“', /<div class="trust-row lp-checks">[\s\S]*?<b>Betrieb aus Falkensee<\/b>/.test(h) || has(t1Text, 'Betrieb aus Falkensee'));
    // --- Aktionskarte (v7): gleiche Karte im Hero (nach dem Formular) und in #preise, Texte aus lp.json, Bedingung ausgeschrieben, kein Sternchen
    if (o.hecke) check(id, 'keine Aktionskarte (Hecke: aktion false, kein Aktions-Zwang)', !has(h, 'class="lp-aktion"'));
    if (!o.ohneAktion && !o.hecke && aktAktiv) {
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
    check(id, 'Pflichtfelder: Leerzeichen zählen nicht; Kontaktfeld: mit @ gültige E-Mail, sonst Telefon mit mindestens 6 Ziffern', has(formJs, "/^(text|tel|email)$/.test(e.type)&&!e.value.trim())ok=false;") && has(formJs, "n==='kontakt'") && has(formJs, "v.replace(/\\D/g,'').length>=6") && has(formJs, "v.indexOf('@')>-1?/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(v)"));
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
    const dSlug = entryOf(rel).danke_slug || 'danke';
    check(id, `Redirect /lp/${dSlug}/${o.hecke ? ' (Hecke: danke-hecke)' : ''}`, has(h, `name="redirect" value="https://`) && has(h, `/lp/${dSlug}/"`) && (!o.hecke || dSlug === 'danke-hecke'));
    check(id, 'GTM vorhanden', has(h, 'GTM-TR7JVXZL'));
    // Ein Feld „Telefon oder E-Mail“ (Owner 29.10.): Sichtfeld name=kontakt (Pflicht), Hidden tel/email/kontaktweg füllt das Skript; das Sichtfeld wird nicht mitgesendet (fdata)
    check(id, 'Kontaktfeld „Telefon oder E-Mail“ (name=kontakt, Pflicht, kein type=tel/email)', /<span>Telefon oder E-Mail<\/span><input name="kontakt" type="text"[^>]*\brequired>/.test(h) && !/<input name="tel" type="tel"/.test(h));
    check(id, 'Hidden tel/email/kontaktweg im Formular (kontaktweg-Vorgabe „Anruf“)', has(h, '<input type="hidden" name="tel" value=""><input type="hidden" name="email" value=""><input type="hidden" name="kontaktweg" value="Anruf">'));
    check(id, 'Formular-Skript: Kontaktfeld → tel/email/kontaktweg (Anruf/E-Mail), Sichtfeld nicht im POST, Fehlermeldung „Telefonnummer oder E-Mail-Adresse“', has(formJs, "f.elements['kontaktweg'].value=mail?'E-Mail':'Anruf'") && has(formJs, "d.delete('kontakt')") && has(formJs, 'Bitte geben Sie eine Telefonnummer oder E-Mail-Adresse an.'));
    check(id, 'Kleingedrucktes: „E-Mail-Adresse oder Telefonnummer in gehashter Form“', has(h, 'E-Mail-Adresse oder Telefonnummer in gehashter Form'));
    check(id, 'Klebende Leiste erst nach Scroll (Skript setzt scta-wait, entfernt ab ca. 0,6 Bildschirmhöhen)', has(h, "s.classList.add('scta-wait')") && has(h, 'window.innerHeight*.6'));
    check(id, '>= 3 Objekt-Chips', (h.match(/name="objekt"/g) || []).length >= 3);
    const nObj = (entryOf(rel).objekte || []).length;
    const segSoft = o.hecke ? ' seg-soft' : ''; // Hecke (Designdurchgang 06.11.): dezenter Chip-Zustand, kurze Labels auf jeder Breite
    check(id, `Objekt-Leiste mit ${nObj} Spalten (seg3 nur bei 3 Objekten${o.hecke ? ', Hecke: seg-soft' : ''})`, nObj === 3 ? has(h, `<div class="seg seg3${segSoft}"><label><input type="radio" name="objekt"`) : has(h, `<div class="seg${segSoft}"><label><input type="radio" name="objekt"`));
    // --- Zweitwege (M3): Hero-Variante Buttons, Variante A Textlinks
    if (pos === 'hero') check(id, 'Zweitwege Anruf + WhatsApp (lp-alt)', /<p class="lp-alt">[\s\S]*?href="tel:[\s\S]*?href="https:\/\/wa\.me\//.test(h));
    // --- Wording (S-urteil 12, lp.json _meta)
    // Wording (Umbau 11/2026, Owner): „Festpreis anfragen“ gilt NUR als Button-Text des Preis-CTA direkt unter den Kacheln (#preise); jeder Fließtext trägt „Festpreis für Räumung und Abtransport“.
    const FPA = '<a class="btn btn-acc" href="#anfrage">Festpreis anfragen</a>';
    const hatKacheln = ankerItems.length > 0;
    if (o.hecke) { // Korrektur 06.11.: Hecken-LPs tragen „Festpreis anfragen“ als preis.cta (Button in #preise), nirgends im Fließtext
      const pH = h.indexOf('id="preise"'), preiseSec = pH > -1 ? h.slice(pH, h.indexOf('</section>', pH)) : '';
      const nBtn = (preiseSec.match(/>Festpreis anfragen<\/a>/g) || []).length;
      check(id, 'Hecke: „Festpreis anfragen“ nur als Button in #preise (kein Fließtext)', (h.match(/Festpreis anfragen/g) || []).length === nBtn && nBtn <= 1);
    } else
    check(id, '„Festpreis anfragen“ nur als Preis-CTA-Button (kein Fließtext)', (h.match(/Festpreis anfragen/g) || []).length === (hatKacheln ? 1 : 0) && (!hatKacheln || has(h, FPA)));
    if (hatKacheln) {
      const pS2 = h.indexOf('id="preise"'), preiseH2 = pS2 > -1 ? h.slice(pS2, h.indexOf('</section>', pS2)) : '';
      const iT = preiseH2.indexOf('class="lp-tiles'), iN = preiseH2.indexOf('class="lp-preise-n"'), iC = preiseH2.indexOf(FPA);
      const iP = preiseH2.indexOf('<p>', iC);
      check(id, 'Preis-CTA: Fußnote (lp-preise-n) bleibt direkt unter den Kacheln, CTA folgt darauf und steht vor dem Langtext', iT > -1 && iN > iT && iC > iN && iP > iC && !/<p>/.test(preiseH2.slice(iN, iC)));
      check(id, 'Preis-CTA: Erklärtext direkt darunter mit „Festpreis für Räumung und Abtransport“', has(preiseH2, FPA + '</div><p class="hint lp-preis-cta-h">Festpreis für Räumung und Abtransport, schriftlich nach der kostenlosen Besichtigung.</p>'));
      check(id, 'Preis-CTA führt auf das Formular (#anfrage) wie der Haupt-CTA', preiseH2.includes('href="#anfrage">Festpreis anfragen'));
    }
    // --- Fester Ortssatz (Umbau 11/2026): direkt unter der H1, zusätzlich zur dynamischen Ortsersetzung; Duplikat-Klasse nur, wenn der Lead denselben Wortlaut trägt
    const ORT_S = escH(entryOf(rel).ort_satz || 'Im Havelland, in Berlin-Spandau und Potsdam'); // je LP überschreibbar (ort_satz), Standard unverändert
    check(id, `Ortssatz direkt unter der H1 (statisch, „${ORT_S}“)`, new RegExp('</h1><p class="lp-ort[ "][^>]*>' + ORT_S + '</p><p class="lead">').test(h));
    check(id, 'Ortssatz ohne data-ort (statisch, keine neue JS-Tauschlogik)', !/class="lp-ort[^"]*"[^>]*data-ort/.test(h) && !/lp-ort[^<]*<span data-ort/.test(h));
    check(id, 'lp-ort-dup nur, wenn der Lead den Ortssatz selbst nennt', has(h, 'class="lp-ort lp-ort-dup"') === String(entryOf(rel).lead || '').includes(lowerFirst(entryOf(rel).ort_satz || 'Im Havelland, in Berlin-Spandau und Potsdam')));
    if (o.kosten) {
      check(id, 'Kosten-LP: H1 „Was kostet eine Entrümpelung im Havelland?“ (Ortsteil per data-ort)', /<h1>Was kostet eine <em>Entrümpelung<\/em> <span data-ort="in">im Havelland<\/span>\?<\/h1>/.test(h));
      const fS = h.indexOf('id="preisfaktoren"'), fH = fS > -1 ? h.slice(fS, h.indexOf('</section>', fS)) : '';
      check(id, 'Kosten-LP: Abschnitt #preisfaktoren direkt nach dem Hero mit 4 Faktoren', fH.length > 200 && (fH.match(/class="v rv/g) || []).length === 4 && h.indexOf('</section>', h.indexOf('<section class="phero lp-hero')) < fS && !/<section/.test(h.slice(h.indexOf('</section>', h.indexOf('<section class="phero lp-hero')) + 10, h.lastIndexOf('<section', fS)).replace(/<script[\s\S]*?<\/script>/g, '')));
      check(id, 'Kosten-LP: Preisfaktoren nennen Menge, Zugang, Entsorgung nach Beleg ohne eigenen Aufschlag, Wertanrechnung', /Menge/.test(fH) && /Zugang/.test(fH) && /ohne eigenen Aufschlag/.test(fH) && /Wertanrechnung/.test(fH));
      check(id, 'Kosten-LP: keine Beträge/Beispielrechnung im Faktoren-Abschnitt (kein €/Euro/Ziffernpreis)', fH.length > 200 && !PREIS_RE.test(textOf(fH)));
      check(id, 'Kosten-LP: noindex', /name="robots" content="noindex/.test(h));
    }
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
    // --- Fußzeile (Umbau 11/2026): Rechtsform + Gesellschafter im Wortlaut des Impressums (website/impressum)
    const imp = read('impressum/index.html') || '';
    const impName = (imp.match(/<p>(Haus- &amp; Gartenservice Havelland GbR)<br>/) || [])[1];
    const impGes = (imp.match(/<p>(Vertreten durch die Gesellschafter: [^<]+\.)<\/p>/) || [])[1];
    const foot = (h.match(/<footer class="lp-foot">[\s\S]*?<\/footer>/) || [''])[0];
    check(id, 'Fußzeile: Rechtsform wie Impressum („Haus- & Gartenservice Havelland GbR“)', !!impName && has(foot, `<p class="fnap">${impName}</p>`));
    check(id, 'Fußzeile: „Vertreten durch die Gesellschafter: …“ wortgleich zum Impressum', !!impGes && has(foot, `<p>${impGes}</p>`));
    // --- Nachlass-Lead auf dem Handy (Attribut an der Hero-Section prüfen, nicht das CSS-Selektor-Vorkommen im <head>)
    check(id, 'data-lead-mobil gleich lead_mobil in lp.json', (entryOf(rel).lead_mobil === true) === /<section class="phero lp-hero[^"]*"[^>]*data-lead-mobil/.test(h));

    // ===== Modus hecke: Pflicht-Gates der Hecken-LPs (lp-architektur.md §3, §6 Schritt 2; Owner 06.11.) =====
    if (o.hecke) {
      const en = entryOf(rel);
      // Preise: kein €-Betrag, kein Meterpreis in Sichttext, Title, Meta und JS-Strings; Selbsttest mit Testbetrag (muss rot werden)
      check(id, 'Hecke: kein €-/Euro-Betrag in Sichttext, Title, Meta und JS-Strings', betragFrei(h));
      check(id, 'Hecke: kein Meterpreis (je/pro Meter, lfm, laufende Meter, Meterpreis, Quadratmeterpreis) in Sichttext, Title, Meta und JS-Strings', meterFrei(h));
      check(id, 'Selbsttest: „99 €“ im Sichttext → Betrags-Gate rot', !betragFrei(h.replace('</main>', ' 99 €</main>')));
      check(id, 'Selbsttest: „99 €“ im Title → Betrags-Gate rot', !betragFrei(h.replace('</title>', ' 99 €</title>')));
      check(id, 'Selbsttest: „99 €“ in einem JS-String → Betrags-Gate rot', !betragFrei(h.replace('</body>', "<script>var v='99 €';</script></body>")));
      check(id, 'Selbsttest: „12 € pro Meter“ → Meterpreis-Gate rot', !meterFrei(h.replace('</main>', ' 12 pro Meter</main>')) && !meterFrei(h.replace('</main>', ' Meterpreis</main>')));
      check(id, 'Selbsttest: „3 Meter hoch“ (Kundenzitat) → Meterpreis-Gate bleibt grün', meterFrei(h.replace('</main>', ' Hecken mindestens 3 Meter hoch</main>')));
      // Wording (Korrektur 06.11.): „Festpreis nach kostenloser Besichtigung“ in Title und Meta, „pauschal für Ihre Hecke“ im Text, nie „Pauschalpreis“; kein Räum-/Entrümpelungs-Wort
      check(id, 'Hecke: kein Räum-/Entrümpelungs-Wort (räum, Entrümpel, Festpreis für Räumung) in Sichttext, Title, Meta', raeumFrei(h));
      check(id, 'Selbsttest: „Räumung“ im Sichttext → Räum-Gate rot', !raeumFrei(h.replace('</main>', ' Räumung</main>')));
      check(id, 'Hecke: Wording „Festpreis“ in Title und Meta, nie „Pauschalpreis“', /Festpreis/.test(titleOf(h)) && /Festpreis/.test(metaOf(h)) && !/Pauschalpreis/.test(sichtText(h) + titleOf(h) + metaOf(h)));
      check(id, 'Hecke: keine Bild-Labels (Beispielbild, Symbolbild, echtes Foto …)', !LABEL_RE.test(sichtText(h)));
      // Bewertungen: keine Entrümpelungs-Karte (Tag/Text), Zitat und Auswahl je LP gesetzt (kein Fallback auf milo/mark/nick)
      check(id, 'Hecke: bewertungen_lp je LP gesetzt (kein Standard-Fallback auf die Entrümpelungs-Karten)', Array.isArray(en.bewertungen_lp) && en.bewertungen_lp.length >= 1);
      check(id, 'Hecke: zitat_hero je LP gesetzt (Objekt oder false, kein Fallback auf das Entrümpelungs-Zitat)', en.zitat_hero === false || (en.zitat_hero && typeof en.zitat_hero === 'object'));
      const kartenKeys = [...(en.bewertungen_lp || []), ...(en.zitat_hero && en.zitat_hero.quelle ? [en.zitat_hero.quelle] : [])];
      check(id, 'Hecke: keine Bewertungskarte/Zitat mit Entrümpelungs-Bezug (Tag oder Text) und kein Standard-Key milo/mark/nick', kartenKeys.every(k => { const r = (lpJson.bewertungen || {})[k]; return r && !/entrümpel/i.test(`${r.tag} ${r.t}`) && !['milo', 'mark', 'nick'].includes(k); }));
      // Bilder (Owner 06.11. abends: nur echte Fotos aus dem Google-Unternehmensprofil, keine KI-Paare vn/, kein KI-Stimmungsbild): Hero ba nur mit dem echten Paar arbeit/gbp-hecke-05-*, Hero foto nur arbeit/gbp-hecke-06-einfahrt (echter Mitarbeiter von hinten), Galerie aus Paar 05 und den Einzelfotos 06/08.
      const hero = en.hero || { typ: 'text' };
      check(id, `Hecke: Hero-Typ ${hero.typ} ∈ {text, ba, foto}`, ['text', 'ba', 'foto'].includes(hero.typ));
      const manifestIMG = JSON.parse(fs.readFileSync('assets/img/manifest.json', 'utf8'));
      const ECHT_PAAR = ['arbeit/gbp-hecke-05-vorher', 'arbeit/gbp-hecke-05-nachher'];
      const ECHT_EINZEL = ['arbeit/gbp-hecke-06-einfahrt', 'arbeit/gbp-hecke-08-kirschlorbeer'];
      const paarEcht = f => !f.vn && f.vorher === ECHT_PAAR[0] && f.nachher === ECHT_PAAR[1] && ECHT_PAAR.every(k => manifestIMG[k]);
      const einzelEcht = f => !f.vn && !f.vorher && ECHT_EINZEL.includes(f.slug) && !!manifestIMG[f.slug];
      if (hero.typ === 'ba') check(id, 'Hecke: Hero ba nur mit dem echten Paar arbeit/gbp-hecke-05-vorher/-nachher', paarEcht(hero));
      if (hero.typ === 'foto') check(id, 'Hecke: Hero foto nur arbeit/gbp-hecke-06-einfahrt (echtes Foto, Mitarbeiter von hinten, kein KI-Bild)', hero.slug === 'arbeit/gbp-hecke-06-einfahrt' && !!manifestIMG[hero.slug]);
      check(id, `Hecke: Hero im Output = lp.json (lp-hero-${hero.typ}), kein stiller Rückfall auf Text`, new RegExp(`<section class="phero lp-hero lp-hero-${hero.typ}[ "]`).test(h));
      check(id, 'Hecke: Galerie-Einträge (fotos) nur echtes Paar 05 oder Einzelfotos 06/08, kein vn/-Paar', (en.fotos || []).every(f => paarEcht(f) || einzelEcht(f)));
      check(id, 'Hecke: kein Bild aus vn/ und kein KI-Stimmungsbild (bg-hecke, svc-*-hero) im Output', !/\/assets\/img\/vn\//.test(h) && !/\/assets\/img\/(bg-hecke|svc-[a-z-]+-hero)-/.test(h));
      const baImgs = [...h.matchAll(/<div class="ba[ "][^>]*>\s*<img src="([^"]+)"[^>]*><img class="ba-top" src="([^"]+)"/g)].flatMap(m => [m[1], m[2]]);
      check(id, `Hecke: alle Slider-Bilder (${baImgs.length}) = echtes Paar arbeit/gbp-hecke-05-*`, baImgs.every(u => /\/assets\/img\/arbeit\/gbp-hecke-05-(vorher|nachher)-\d+\.webp$/.test(u)));
      const bilder = [...h.matchAll(/\/assets\/img\/([a-z0-9\/_-]+?)(?:-\d+)?\.(?:webp|avif|jpg|png)/g)].map(m => m[1]).filter(x => x.startsWith('arbeit/') || x.startsWith('vn/'));
      check(id, 'Hecke: alle Arbeitsfotos im Output sind arbeit/gbp-hecke-*', bilder.every(x => /^arbeit\/gbp-hecke-0[568]-/.test(x)));
      // Galerie (#fotos): Vorhandensein je Seite (Entfernung: keine Galerie), Überschrift „So sieht unsere Arbeit aus“, Hinweis „Fotos von unseren Einsätzen im Havelland“, keine Bild-Labels, keine Ortsnamen je Bild
      const fS = h.indexOf('id="fotos"'), fH = fS > -1 ? h.slice(fS, h.indexOf('</section>', fS)) : '';
      const nKarten = (fH.match(/<div class="ba"|<div class="lp-fotokarte"/g) || []).length;
      check(id, (en.fotos || []).length ? `Hecke: Galerie #fotos mit ${(en.fotos || []).length} Karten (lp.json fotos)` : 'Hecke: keine Galerie (fotos leer)', (en.fotos || []).length ? nKarten === en.fotos.length : fS === -1);
      if ((en.fotos || []).length) {
        check(id, 'Hecke: Galerie-Überschrift „So sieht unsere Arbeit aus“, Hinweis „Fotos von unseren Einsätzen im Havelland“', en.fotos_h2 === 'So sieht unsere Arbeit aus' && en.fotos_hint === 'Fotos von unseren Einsätzen im Havelland' && has(fH, '<h2>So sieht unsere Arbeit aus</h2>') && has(fH, 'Fotos von unseren Einsätzen im Havelland') && !LABEL_RE.test(textOf(fH)));
        check(id, 'Hecke: Galerie-Karten ohne Meterangabe, ohne Orts- und Kundennamen in Unterschriften/Alt-Texten', !METER_RE.test(fH.replace('im Havelland', '')) && !/falkensee|potsdam|spandau|kunde/i.test(fH.replace(/<h2>[\s\S]*?<\/p>/, '')));
        check(id, 'Hecke: Einzelfoto-Karten ohne Regler und ohne Vorher/Nachher-Badges', ((fH.match(/class="lp-fotokarte"/g) || []).length === (en.fotos || []).filter(einzelEcht).length) && !/<figure class="lp-fotokarte-w">(?:(?!<\/figure>)[\s\S])*(ba-tag|type="range")/.test(fH));
      }
      // Designdurchgang 06.11.: Leistungs-Kacheln vor dem Formular (kein Preis), Frist-Karte nach dem Formular, vier Vertrauens-Badges, Ablauf-Kicker, Chips dezent
      const hS = h.indexOf('<section class="phero lp-hero'), hH = h.slice(hS, h.indexOf('</section>', hS));
      const lt = [...hH.matchAll(/<a class="lp-tile lp-ltile( own)?" href="#anfrage" data-obj="([^"]+)" data-via="leistung"/g)];
      check(id, `Hecke: 3 Leistungs-Kacheln vor dem Formular, erste = eigene Leistung (lp.json kacheln), je mit data-obj aus objekte`, lt.length === 3 && !!lt[0][1] && !lt[1][1] && lt.every((m, i) => m[2] === en.kacheln.items[i].obj && en.objekte.includes(m[2])) && hH.indexOf('class="lp-tiles') < hH.indexOf('id="anfrage"'));
      check(id, 'Hecke: Kacheln ohne Preis, ohne Betrag, ohne „ab“-Zeile', !/class="pp"><small>ab<\/small>/.test(hH) && !PREIS_RE.test(textOf(hH)));
      check(id, 'Hecke: Frist-Karte (.lp-frist) nach dem Formular, Titel und Bedingung aus lp.json, kein Prozent, kein Dringlichkeitswort', hH.indexOf('class="lp-frist"') > hH.indexOf('id="anfrage"') && has(hH, escH(en.frist.titel)) && has(hH, escH(en.frist.bedingung)) && !/%|nur noch|letzte|schnell sichern|jetzt sichern|begrenzt/i.test(textOf(hH.slice(hH.indexOf('class="lp-frist"'), hH.indexOf('class="lp-frist"') + 700))));
      check(id, 'Hecke: Frist-Karte nennt § 39 BNatSchG und 28. Februar', /39 BNatSchG/.test(en.frist.titel + en.frist.bedingung) && /28\. Februar/.test(en.frist.titel + en.frist.bedingung));
      check(id, 'Hecke: vier Vertrauens-Badges mit Icon (trust-row lp-checks, 4 Einträge)', (h.match(/<div class="t"><svg/g) || []).length === 4 && ['Betrieb aus Falkensee', 'Festpreis nach Besichtigung', 'Foto-Nachweis aufs Handy', 'Kostenlose Besichtigung'].every((t, i) => (en.trust || [])[i] && en.trust[i].b === t));
      // Ablauf (Owner 06.11. abends): wie der Hub, section.sec.tl-row#ablauf, vier Schritte, .twhen-Kicker der Website; einzige Zusage „Antwort am selben Tag“ (freigegeben), keine Tages-/Terminzusage sonst
      const ablS = h.indexOf('id="ablauf"'), ablH = ablS > -1 ? h.slice(h.lastIndexOf('<section', ablS), h.indexOf('</section>', ablS)) : '';
      check(id, 'Hecke: Ablauf als section.sec.tl-row#ablauf mit 4 Schritten (.tli), Titel wie lp.json', /<section class="sec tl-row[ "]/.test(ablH) && (ablH.match(/<div class="tli">/g) || []).length === 4 && (en.ablauf || []).length === 4 && en.ablauf.every(x => has(ablH, `<h3>${escH(x.h)}</h3>`)));
      check(id, 'Hecke: Ablauf-Schritte = Anfrage mit Foto oder Anruf · Kostenlose Besichtigung und Festpreis · Saubere Ausführung, Abfuhr inklusive · Foto-Nachweis aufs Handy', ['Anfrage mit Foto oder Anruf', 'Kostenlose Besichtigung und Festpreis', 'Saubere Ausführung, Abfuhr inklusive', 'Foto-Nachweis aufs Handy'].every((t, i) => (en.ablauf || [])[i] && en.ablauf[i].h === t) && /§ 39/.test(ablH));
      const kick = [...ablH.matchAll(/<span class="twhen">([^<]*)<\/span>/g)].map(m => m[1]);
      check(id, 'Hecke: Ablauf-Kicker „Antwort am selben Tag“ · „Kostenlos · vor Ort“ · „Zum vereinbarten Termin“ · „Direkt nach der Arbeit“', JSON.stringify(kick) === JSON.stringify(['Antwort am selben Tag', 'Kostenlos · vor Ort', 'Zum vereinbarten Termin', 'Direkt nach der Arbeit']));
      check(id, 'Hecke: Ablauf-Kicker ohne Tages-/Terminzusage außer „Antwort am selben Tag“ (keine Ziffer, kein Werktag/Woche/Stunde/sofort/binnen/innerhalb)', kick.length === 4 && kick.every(t => t === 'Antwort am selben Tag' || !/\d|tag|woche|stunde|sofort|binnen|innerhalb/i.test(t)) && !/\d\s*(Werk)?tage|Werktag|binnen|innerhalb von|24 Stunden|48 Stunden/i.test(textOf(ablH)));
      // Zusagen-Band (Owner 06.11. abends): dunkelgrün wie das Wert-Band der Website, vier Zusagen, Serifen-Headline, kein Grain
      const gsS = h.indexOf('class="gstrip gstrip-dark zone-dark"'), gsH = gsS > -1 ? h.slice(gsS, h.indexOf('</section>', gsS)) : '';
      check(id, 'Hecke: Zusagen-Band dunkelgrün (gstrip gstrip-dark zone-dark) mit Serifen-Headline und genau 4 Zusagen', gsH.length > 100 && /<h2 class="serif rv in">/.test(gsH) && (gsH.match(/class="gs rv/g) || []).length === 4);
      check(id, 'Hecke: Zusagen wörtlich aus lp.json zusagen_hecke (Festpreis ist Endpreis · Abfuhr und Entsorgung inklusive · Foto-Nachweis aufs Handy · Antwort am selben Tag)', (lpJson.zusagen_hecke || {}).items && ['Festpreis ist Endpreis', 'Abfuhr und Entsorgung inklusive', 'Foto-Nachweis aufs Handy', 'Antwort am selben Tag'].every((t, i) => lpJson.zusagen_hecke.items[i].h === t && has(gsH, `<h3>${escH(t)}</h3>`)));
      check(id, 'Hecke: Zusagen-Band im CSS dunkel (--green-d, Text --dark-text2, Headline 700, kein Grain/Hintergrundbild, keine Hex-Werte)', has(h, '.gstrip.gstrip-dark{background:var(--green-d)') && has(h, 'color:var(--dark-text2)') && /\.gstrip-dark h2\{[^}]*font-weight:700/.test(h) && !/\.gstrip-dark[^{]*\{[^}]*(url\(|#[0-9a-f]{3,6}\b|grain)/i.test(h));
      check(id, 'Hecke: Hero-Klasse lp-hecke (Foto-Karte, Badge) und HECKE_CSS im Kopf, Chips seg-soft', has(h, ' lp-hecke"') && has(h, '.lp-form .seg.seg-soft label:has(input:checked)'));
      const imgSlugs = [...h.matchAll(/\/assets\/img\/([a-z0-9_-]+?)(?:-\d+)?\.(?:webp|avif|jpg|png)/g)].map(m => m[1]);
      check(id, 'Hecke: Personenbild nur gbp-hecke-06-einfahrt (echter Mitarbeiter von hinten), kein hecke-hinten-*-noah/zaun-hinten-*/Ansprechpartner/KI-Avatar', !imgSlugs.some(x => PERSON_RE.test(x)) && !has(h, 'class="lp-person"'));
      // Überschrift: genau ein kursives Akzentwort in der H1
      const h1H = (h.match(/<h1>([\s\S]*?)<\/h1>/) || [, ''])[1];
      check(id, 'Hecke: H1 mit genau einem <em>', (h1H.match(/<em[\s>]/g) || []).length === 1);
      // Preisfaktoren: vier, direkt nach dem Hero, keine Beträge
      const pfS = h.indexOf('id="preisfaktoren"'), pfH = pfS > -1 ? h.slice(pfS, h.indexOf('</section>', pfS)) : '';
      check(id, 'Hecke: Abschnitt #preisfaktoren mit genau 4 Faktoren', pfH.length > 200 && (pfH.match(/class="v rv/g) || []).length === 4);
      const heroEnd2 = h.indexOf('</section>', h.indexOf('<section class="phero lp-hero'));
      // zwischen Hero und #preisfaktoren darf höchstens #was-wir-tun stehen (Spec: „Was wir tun“ + Preisfaktoren direkt nach dem Hero)
      const zw = pfS > -1 ? h.slice(heroEnd2 + 10, h.lastIndexOf('<section', pfS)).replace(/<script[\s\S]*?<\/script>/g, '') : 'x<section';
      const zwSecs = (zw.match(/<section/g) || []).length;
      check(id, 'Hecke: #preisfaktoren steht direkt nach dem Hero (nur #was-wir-tun darf dazwischen)', pfS > -1 && (zwSecs === 0 || (zwSecs === 1 && /<section class="sec( section-alt)?" id="was-wir-tun"/.test(zw))));
      check(id, 'Hecke: Preisfaktoren ohne Beträge', pfH.length > 200 && !PREIS_RE.test(textOf(pfH)));
      // Formular, noindex
      check(id, 'Hecke: Formular mit gclid-Feld (hidden)', has(h, '<form id="anfrage"') && /<input type="hidden" name="gclid"/.test(h));
      check(id, 'Hecke: noindex,follow', /name="robots" content="noindex, ?follow/.test(h));
      check(id, 'Hecke: danke_slug = danke-hecke (keine Räumungs-Danke-Seite)', en.danke_slug === 'danke-hecke');
      check(id, 'Hecke: msg_objekt ohne Räumungs-Wort', !!en.msg_objekt && !RAEUM_RE.test(en.msg_objekt) && has(h, `objekt:'${String(en.msg_objekt).replace(/'/g, "\\'")}'`));
      // Copy fertig? (Platzhalter [[COPY: …]] aus dem Skelett machen dieses Gate rot, bis die Copy-Agenten fertig sind)
      check(id, `Hecke: Copy fertig, keine Platzhalter [[COPY …]] im Output (${(h.match(/\[\[COPY/g) || []).length} Reste)`, !/\[\[COPY/.test(h));
    }
  } else {
    // Danke-Seite: der Lead mit der Rückruf-Nummer darf nie ausgeblendet werden (P2 H1)
    check(id, 'Anruf-Nummer im Lead vorhanden', has(h, 'Anrufe kommen von'));
    check(id, 'Lead verspricht Anruf, WhatsApp oder E-Mail (Kontaktfeld „Telefon oder E-Mail“), keine Platzhalter-Reste', has(h, 'per Anruf, WhatsApp oder E-Mail') && !has(h, '{tel}') && has(h, 'Anrufe kommen von 01515 6198195'));
    const versteckt = [...h.matchAll(/([^{}]*)\.lead\{display:none\}/g)].filter(m => !/lp-hero-form/.test(m[1]));
    check(id, 'keine unbeschränkte Regel .lead{display:none}', versteckt.length === 0);
    if (o.hecke) {
      check(id, 'Hecke-Danke: kein €-Betrag, kein Meterpreis, kein Räum-/Entrümpelungs-Wort, kein „Pauschalpreis“', betragFrei(h) && meterFrei(h) && raeumFrei(h) && !/Pauschalpreis/.test(sichtText(h)));
      check(id, 'Hecke-Danke: noindex, DANKE_JS (#ok → lead_confirmed), kein Formular', /name="robots" content="noindex/.test(h) && has(h, "location.hash==='#ok'") && has(h, "event:'lead_confirmed'") && !has(h, '<form'));
      check(id, 'Hecke-Danke: Copy fertig (keine Platzhalter)', !/\[\[COPY/.test(h));
    }
  }
});

// Nicht in Sitemaps (alle Sitemap-Dateien des Wurzelverzeichnisses): keine /lp/-URL
P('Sitemaps  [website/sitemap*.xml]');
{ const sm = fs.readdirSync('website').filter(f => /^sitemap.*\.xml$/.test(f)).map(f => fs.readFileSync(`website/${f}`, 'utf8')).join('');
  check('sitemap', 'keine /lp/-URL in einer Sitemap (Hecken-LPs und danke-hecke nicht enthalten)', sm.length > 100 && !/\/lp\//.test(sm)); }
console.log(lines.join('\n'));
if (fails.length) { console.log(`\nACCEPT-LP ROT: ${fails.length} fehlend — ${fails.join(', ')}`); process.exit(1); }
console.log('\nACCEPT-LP GRÜN');
process.exit(0);
