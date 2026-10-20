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
// Fokus-Check (streng, AV-C 1): Der Rumpf von foc() muss EXAKT dem erwarteten Text entsprechen (nur querySelector(sel) + focus mit preventScroll).
// Außerhalb dieses Rumpfs darf es keinen .focus(-Aufruf geben, und jeder foc(-Aufruf muss genau foc('.step1 legend') bzw. foc('.step2 legend') sein.
// Ein foc('input[name=ort]') oder ein umgebauter Rumpf (querySelector("[name=ort]")) wird damit rot (Selbsttests unten).
const FOC_BODY = 'function foc(sel){var l=f.querySelector(sel);if(l)l.focus({preventScroll:true})}';
function focusOk(js) {
  if (js.length <= 500 || js.split(FOC_BODY).length !== 2) return false;
  const rest = js.split(FOC_BODY).join('');
  const calls = (rest.match(/\bfoc\(/g) || []).length;
  const erlaubt = (rest.match(/\bfoc\('\.step[12] legend'\)/g) || []).length;
  return !/\.focus\(/.test(rest) && calls === erlaubt && js.includes("foc('.step2 legend')") && js.includes("foc('.step1 legend')");
}
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
  ['lp/nachlass-aufloesung/index.html', 'LP nachlass', { reviews: true, reviewsMin: 1, ohneAktion: true, keinAbPreis: true, ortSwap: true, nachlassFaq: true }],
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
const PFLICHT_HIDDEN = ['quelle', 'lp', 'gclid', 'wbraid', 'gbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'landing_url', 'ads_consent', 'access_key', 'subject', 'from_name', 'redirect', 'botcheck'];
const EREIGNISSE = ['form_start', 'form_step', 'form_error', 'form_quickstart', 'generate_lead', 'start_via'];

for (const [rel, label, o] of LPS) page(rel, label, h => {
  const id = label.replace(/\s+/g, '-').toLowerCase();
  // --- Grund-Checks (aus accept.mjs übernommen)
  check(id, 'phero>=1', classCount(h, 'phero') >= 1);
  check(id, 'tl>=1', classCount(h, 'tl') >= 1);
  if (o.reviews) check(id, `review-card>=${o.reviewsMin || 2}`, classCount(h, 'review-card') >= (o.reviewsMin || 2));
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
    // --- Trust-Zeile Handy (H2): genau eine, Zahl = proof.google_reviews, Zusatz je LP aus lp.json (Nachlass ohne Preis-/Festpreis-Werbung)
    const t1 = [...h.matchAll(/<p class="lp-trust1">([\s\S]*?)<\/p>/g)];
    check(id, 'genau eine Trust-Zeile (.lp-trust1)', t1.length === 1);
    const t1Text = t1.length ? t1[0][1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
    const t1Soll = `★ ${Number(proofGR.rating).toFixed(1).replace('.', ',')} bei Google (${proofGR.count}) · ${entryOf(rel).trust_zeile || ''}`;
    check(id, `Trust-Zeile = „${t1Soll}“ (Zahl aus data/proof.json)`, t1Text === t1Soll);
    check(id, 'Trust-Zeile: Zusatz-Text steht in lp.json (trust_zeile)', !!entryOf(rel).trust_zeile);
    if (o.keinAbPreis) check(id, 'Trust-Zeile ohne Preis-/Festpreis-Werbung (Nachlass)', !/Festpreis|Preis|€/i.test(t1Text));
    else check(id, 'Trust-Zeile nennt „Festpreis nach Besichtigung“', /Festpreis nach Besichtigung/.test(t1Text));
    // --- Hero-Preiszeilen (Handy-Zellen, Tippziele): jede verlinkte Preiszeile hat aria-label + data-via=preis
    const heroS = h.indexOf('<section class="phero lp-hero'), heroE = h.indexOf('</section>', heroS);
    const heroH = heroS > -1 && heroE > heroS ? h.slice(heroS, heroE) : '';
    const pzLinks = [...heroH.matchAll(/<a class="pz"([^>]*)>/g)];
    if (pzLinks.length) check(id, `Hero-Preiszeilen verlinkt (${pzLinks.length}) mit data-via="preis" und aria-label`, pzLinks.every(m => /data-via="preis"/.test(m[1]) && /aria-label="/.test(m[1])));
    if (o.einstieg) {
      check(id, 'Haushalt-Hero: „Entrümpelung ab 99 €“ steht im Hero', has(heroH, 'Entrümpelung</span> <span class="pp">ab 99 €'));
      check(id, 'Haushalt-Hero: Zusatz „Einstiegspreise für kleine, gut zugängliche Objekte“ sichtbar im Hero', has(heroH, 'Einstiegspreise für kleine, gut zugängliche Objekte'));
    }
    // --- Besichtigungsfrist (Owner 20.10.): Wortlaut der Anzeigen-Überschrift „Termin meist in 2–3 Werktagen“ steht wörtlich im Ablauf jeder Anfrage-LP;
    //     FAQ nennt „2–3 Werktagen“ (Gewerbe: FAQ unverändert). Nachlass bleibt ruhig: keine Dringlichkeitswörter im Ablauf.
    const ablaufS = h.indexOf('class="tl'), ablaufE = h.indexOf('id="preise"');
    const ablaufH = ablaufS > -1 && ablaufE > ablaufS ? h.slice(ablaufS, ablaufE) : '';
    check(id, 'Ablauf nennt wörtlich „Termin meist in 2–3 Werktagen“ (Besichtigung, Anzeigen-Überschrift)', has(ablaufH, 'Termin meist in 2–3 Werktagen'));
    if (!o.gewerbe) check(id, 'FAQ nennt „meist in 2–3 Werktagen“ (Besichtigung)', has(h.slice(h.indexOf('id="fragen"')), 'meist in 2–3 Werktagen'));
    if (o.keinAbPreis) check(id, 'Nachlass: Ablauf ohne Dringlichkeitswörter (schnell, sofort, dringend, zeitnah, kurzfristig, jetzt)', ablaufH.length > 200 && !/schnell|sofort|dringend|zeitnah|kurzfristig|jetzt/i.test(ablaufH));
    // --- „Betrieb aus Falkensee“ (Wortlaut der B-Anzeigen) sichtbar im Trust-Block (nicht Gewerbe)
    if (!o.gewerbe) check(id, 'Trust-Block nennt wörtlich „Betrieb aus Falkensee“', /<div class="trust-row">[\s\S]*?<b>Betrieb aus Falkensee<\/b>[\s\S]*?<\/div><\/div>/.test(h) || has(t1Text, 'Betrieb aus Falkensee'));
    // --- Aktion Kurzform (Handy): Sternchen + Fußzeile direkt darunter; Bedingung „Entsorgungsgebühren“ sichtbar, Vollfassung im Preisblock
    const aktHero = (heroH.match(/<p class="lp-aktion"[\s\S]*?<\/p>/) || [''])[0];
    if (aktHero) {
      const kz = [...aktHero.matchAll(/<span class="kz">([^<]*)<\/span>/g)].map(m => m[1]);
      check(id, 'Aktion Handy: Kurztext endet mit * (Bedingung per Fußzeile)', kz.some(t => /Festpreis bis 30\.11\.\*$/.test(t)));
      check(id, 'Aktion Handy: Fußzeile „* Ohne Entsorgungsgebühren“ direkt darunter (kz kfn)', /<span class="kz kfn">\* Ohne Entsorgungsgebühren[^<]*<\/span><\/p>$/.test(aktHero));
      check(id, 'Aktion Vollfassung (Desktop/#preise): „Entsorgungsgebühren nach Beleg sind ausgenommen“', has(aktHero, 'Entsorgungsgebühren nach Beleg sind ausgenommen') && has(h.slice(h.indexOf('id="preise"')), 'Entsorgungsgebühren nach Beleg sind ausgenommen'));
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
    // Fokus nur über foc(sel) auf die legend des Schritts (kein Tastatur-Sprung, preventScroll); jedes andere .focus( bleibt rot
    check(id, 'kein .focus( im Formular-Skript außer auf legend (keine Tastatur-Sprünge)', focusOk(formJs));
    // Selbsttest: ein eingefügtes Input-.focus( muss den Fokus-Check rot färben (sonst prüft er nichts)
    check(id, 'Selbsttest Fokus-Check: eingefügtes ort.focus() → ✗', formJs.length > 500 && !focusOk(formJs + ";f.elements['ort'].focus()"));
    check(id, "Selbsttest Fokus-Check: foc('input[name=ort]') → ✗", formJs.length > 500 && !focusOk(formJs + ";foc('input[name=ort]')"));
    check(id, 'Selbsttest Fokus-Check: umgebauter foc-Rumpf (querySelector auf name=ort) → ✗', formJs.length > 500 && !focusOk(formJs.replace('f.querySelector(sel)', 'f.querySelector("[name=ort]")')));
    check(id, 'beide Schritt-legends mit tabindex="-1"', (h.match(/<legend tabindex="-1">/g) || []).length === 2);
    for (const e of EREIGNISSE) check(id, `Formular-Skript enthält ${e}`, has(formJs, e));
    // --- Pflichtfelder, Ziele
    for (const n of PFLICHT_HIDDEN) check(id, `hidden ${n}`, has(h, `name="${n}"`));
    check(id, 'Web3Forms-Ziel', has(h, 'action="https://api.web3forms.com/submit"'));
    check(id, 'Redirect /lp/danke/', has(h, '/lp/danke/'));
    check(id, 'GTM vorhanden', has(h, 'GTM-TR7JVXZL'));
    check(id, 'Telefon-Logik je Kontaktweg', has(h, 'data-req-by="kontaktweg"'));
    check(id, '>= 3 Objekt-Chips', (h.match(/name="objekt"/g) || []).length >= 3);
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
    if (o.mitAktion) check(id, 'Aktion vorhanden (Ziel-URL des Angebots-Assets, bis 30.11.)', has(h, 'class="lp-aktion"'));
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
