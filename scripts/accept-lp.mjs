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
// · keinAbPreis = [S2] JE_LP: nur Nachlass ohne „ab …€“-Anker; Haus/Keller/Wohnung/Entrümpelung zeigen ihren Ab-Preis selbst
// · ortSwap = ort_swap Pflicht (data-ort im Hero)
const LPS = [
  ['lp/haushaltsaufloesung-havelland/index.html', 'LP haushaltsaufloesung', { reviews: true, ba: 2, mitAktion: true }],
  ['lp/messie-wohnung-raeumung/index.html', 'LP messie', { reviews: true }],
  ['lp/gewerbe-entruempelung/index.html', 'LP gewerbe', { reviews: true }],
  ['lp/nachlass-aufloesung/index.html', 'LP nachlass', { reviews: true, ohneAktion: true, keinAbPreis: true }],
  ['lp/wohnungsaufloesung/index.html', 'LP wohnung', { reviews: true }],
  ['lp/haus-entruempeln/index.html', 'LP haus', { reviews: true, ortSwap: true }],
  ['lp/keller-dachboden-garage/index.html', 'LP keller', { reviews: true }],
  ['lp/entruempelung-havelland/index.html', 'LP entruempelung', { reviews: true, ortSwap: true }],
  ['lp/danke/index.html', 'LP danke', { danke: true }],
];
const PFLICHT_HIDDEN = ['quelle', 'lp', 'gclid', 'wbraid', 'gbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'landing_url', 'ads_consent', 'access_key', 'subject', 'from_name', 'redirect', 'botcheck'];
const EREIGNISSE = ['form_start', 'form_step', 'form_error', 'form_quickstart', 'generate_lead', 'start_via'];

for (const [rel, label, o] of LPS) page(rel, label, h => {
  const id = label.replace(/\s+/g, '-').toLowerCase();
  // --- Grund-Checks (aus accept.mjs übernommen)
  check(id, 'phero>=1', classCount(h, 'phero') >= 1);
  check(id, 'tl>=1', classCount(h, 'tl') >= 1);
  if (o.reviews) check(id, 'review-card>=2', classCount(h, 'review-card') >= 2);
  if (o.ba) check(id, `ba>=${o.ba}`, classCount(h, 'ba') >= o.ba);
  check(id, 'kein rv ohne in', rvOhneIn(h) === 0);
  check(id, 'keine lp-card/lp-steps/lp-quote/lp-ba-grid/lp-trust', lpAltKlassen(h) === 0);
  if (!o.danke) {
    check(id, 'gstrip>=1', classCount(h, 'gstrip') >= 1);
    check(id, 'trust-row>=1', classCount(h, 'trust-row') >= 1);
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
    const focOhneLegend = formJs.replace("function foc(sel){var l=f.querySelector(sel);if(l)l.focus({preventScroll:true})}", '')
      .replace(/foc\('\.step[12] legend'\)/g, '');
    check(id, 'kein .focus( im Formular-Skript außer auf legend (keine Tastatur-Sprünge)', formJs.length > 500 && !/\.focus\(/.test(focOhneLegend) && has(formJs, "foc('.step2 legend')"));
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
    if (o.keinAbPreis) check(id, '[S2] keine Ab-Preise (Regel 23.09.)', !/\bab\s+\d[\d.]*\s?€/i.test(h));
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
