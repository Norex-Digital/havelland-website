// lp-bloecke.test.mjs — Unit-Tests der Redesign-Bausteine. Aufruf im Worktree-Root: node --test scripts/lp-bloecke.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { topbar, trustZeile, kacheln, preisBlock, zitat, aktionKarte, punkte, bewertungen, datumDE, monatDE, BLOECKE_CSS } from './lp-bloecke.mjs';

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escA = s => esc(s).replace(/"/g, '&quot;');
const ctx = { esc, escA };
const text = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const VERBOTEN = /\b(lp-card|lp-steps|lp-quote|lp-ba-grid|lp-trust)\b/;

test('topbar: Note und Zahl aus proof, ohne gr leer', () => {
  const h = topbar({ rating: 5, count: 21 }, esc);
  assert.match(h, /^<div class="lp-topbar"><div class="wrap">/);
  assert.equal(text(h), '★★★★★ 5,0 bei Google · 21 Bewertungen · Betrieb aus Falkensee');
  assert.equal(topbar(null, esc), '');
});

test('trustZeile: nur trust_zeile mit Häkchen, leer ohne Text', () => {
  const h = trustZeile('Festpreis nach Besichtigung', esc);
  assert.match(h, /^<p class="lp-trust1"><svg /);
  assert.equal(text(h), 'Festpreis nach Besichtigung');
  assert.equal(trustZeile('', esc), '');
  assert.ok(!VERBOTEN.test(h));
});

test('kacheln: Text zusammenhängend, Links mit data-obj/data-via/aria-label', () => {
  const h = kacheln([
    { t: 'Entrümpelung ab 99 €', obj: 'Keller / Dachboden', k: 'Entrümpelung' },
    { t: 'Wohnungsauflösung ab 499 €', obj: 'Wohnung', k: 'Wohnung' },
    { t: 'Komplettes Haus ab 749 €', obj: 'Haus', k: 'Ganzes Haus' },
  ], ctx);
  assert.match(h, /^<div class="lp-tiles n3">/);
  for (const t of ['Entrümpelung ab 99 €', 'Wohnungsauflösung ab 499 €', 'Komplettes Haus ab 749 €']) assert.ok(text(h).includes(t), t);
  assert.equal((h.match(/<a class="lp-tile" href="#anfrage" data-obj="[^"]+" data-via="preis" aria-label="[^"]+ – Anfrage zu [^"]+ starten">/g) || []).length, 3);
  assert.ok(h.includes('data-obj="Keller / Dachboden"'));
  assert.ok(h.includes('<span class="pl">Entrümpelung</span> <span class="pp"><small>ab</small> 99 €</span><span class="pk" aria-hidden="true">Entrümpelung</span>'));
});

test('kacheln: Eintrag ohne obj ist kein Link, Tausenderpunkt bleibt, leer → leer', () => {
  const h = kacheln([{ t: 'Messie-Wohnung ab 1.500 €' }], ctx);
  assert.match(h, /^<div class="lp-tiles n1"><div class="lp-tile">/);
  assert.ok(!h.includes('data-via'));
  assert.ok(text(h).includes('Messie-Wohnung ab 1.500 €'));
  assert.equal(kacheln([], ctx), '');
  assert.equal(kacheln(undefined, ctx), '');
  assert.ok(text(kacheln(['Wohnungsauflösung ab 499 €'], ctx)).includes('Wohnungsauflösung ab 499 €'));
});

test('kacheln: Kurzlabel steht im zugänglichen Namen (Label-in-Name), mehr als 3 Einträge brechen ab', () => {
  const h = kacheln([{ t: 'Komplettes Haus ab 749 €', obj: 'Haus', k: 'Ganzes Haus' }], ctx);
  assert.ok(h.includes('aria-label="Ganzes Haus: Komplettes Haus ab 749 € – Anfrage zu Haus starten"'));
  assert.throws(() => kacheln(['A ab 1 €', 'B ab 2 €', 'C ab 3 €', 'D ab 4 €'], ctx), /höchstens 3/);
});

test('kacheln: Anführungszeichen im Objekt brechen das Attribut nicht auf', () => {
  const h = kacheln([{ t: 'X ab 1 €', obj: 'A "B"' }], ctx);
  assert.ok(h.includes('data-obj="A &quot;B&quot;"'));
});

test('preisBlock: Zeile Einzahl/Mehrzahl, Hinweis, ohne Zeile in #preise, ohne Anker leer', () => {
  const a2 = { items: ['A ab 1 €', 'B ab 2 €'] };
  assert.ok(preisBlock(a2, 'für kleine Objekte', ctx).includes('<p class="lp-preise-l">Einstiegspreise inkl. MwSt.</p>'));
  assert.ok(preisBlock({ items: ['A ab 1 €'] }, '', ctx).includes('<p class="lp-preise-l">Einstiegspreis inkl. MwSt.</p>'));
  assert.ok(preisBlock(a2, 'für kleine Objekte', ctx).endsWith('<p class="lp-preise-n">für kleine Objekte</p></div>'));
  assert.ok(!preisBlock(a2, 'x', ctx, { label: false }).includes('lp-preise-l'));
  assert.equal(preisBlock(null, 'x', ctx), '');
  assert.equal(preisBlock({ items: [] }, 'x', ctx), '');
});

test('zitat: deutsche Anführungszeichen, Name, Leistung, Google; ohne Leistung kein doppelter Punkt', () => {
  const h = zitat({ t: 'Es ging schnell und war trotzdem qualitativ und sauber', a: 'Milo Rost', tag: 'Entrümpelung' }, esc);
  assert.match(h, /^<figure class="lp-zitat"><blockquote>„Es ging schnell und war trotzdem qualitativ und sauber“<\/blockquote>/);
  assert.ok(text(h).endsWith('Milo Rost · Entrümpelung · Google'));
  assert.ok(text(zitat({ t: 'Zuverlässig', a: 'Nikita', tag: '' }, esc)).endsWith('Nikita · Google'));
  assert.equal(zitat(null, esc), '');
  assert.ok(!VERBOTEN.test(h));
});

test('aktionKarte: lp-aktion + data-bis, Bedingung ausgeschrieben, kein Sternchen; fehlende Felder brechen ab', () => {
  const akt = { bis: '2026-11-30', badge: '−10 %', karte_titel: 'Herbst-Aktion: 10 % auf den Festpreis für Räumung und Abtransport', karte_bedingung: 'bei Auftrag bis 30.11.2026 · Entsorgungsgebühren nach Beleg ausgenommen' };
  const h = aktionKarte(akt, ctx);
  assert.match(h, /^<div class="lp-aktion" data-bis="2026-11-30"><span class="badge" aria-hidden="true">−10 %<\/span>/);
  assert.ok(text(h).includes('Herbst-Aktion: 10 % auf den Festpreis für Räumung und Abtransport bei Auftrag bis 30.11.2026 · Entsorgungsgebühren nach Beleg ausgenommen'));
  assert.ok(!h.includes('*'));
  assert.equal(aktionKarte(null, ctx), '');
  assert.throws(() => aktionKarte({ bis: '2026-11-30' }, ctx), /aktion\.badge/);
});

test('punkte: trust-row lp-checks, leere Einträge raus', () => {
  const h = punkte([{ b: 'Festpreis', t: 'nach Besichtigung' }, { b: '', t: 'x' }, null], esc);
  assert.match(h, /^<div class="trust-row lp-checks"><div class="t"><svg /);
  assert.equal((h.match(/class="t"/g) || []).length, 1);
  assert.ok(!VERBOTEN.test(h));
  assert.equal(punkte([], esc), '');
});

test('bewertungen: Kopf aus proof, review-card je Eintrag, erste hervorgehoben, ein kursives Wort', () => {
  const items = [{ a: 'Milo Rost', datum: '2026-09-17', tag: 'Entrümpelung', t: 'Die Jungs haben eine Entrümpelung bei mir gemacht' }, { a: 'Nick', datum: '2026-07-21', tag: 'Garten & Entrümpelung', t: 'Top Service' }];
  const h = bewertungen({ items, gr: { rating: 5, count: 21, as_of: '2026-10-20' }, h2: 'Was Kunden über uns sagen', em: 'sagen' }, esc);
  assert.match(h, /^<section class="sec section-alt" id="bewertungen">/);
  assert.ok(h.includes('<h2>Was Kunden über uns <em>sagen</em></h2>'));
  assert.ok(text(h).includes('5,0 ★★★★★ 21 Bewertungen bei Google Stand 20.10.2026 · Auszug, wörtlich'));
  assert.equal((h.match(/class="review-card lp-rc/g) || []).length, 2);
  assert.equal((h.match(/class="review-card lp-rc feat"/g) || []).length, 1);
  assert.ok(text(h).includes('Milo Rost 09/2026 · Google-Bewertung'));
  assert.ok(h.includes('Garten &amp; Entrümpelung'));
  assert.ok(!text(bewertungen({ items, gr: null, h2: 'Was Kunden über uns sagen', em: 'sagen' }, esc)).includes('Bewertungen bei Google'));
  assert.equal(bewertungen({ items: [], gr: null, h2: 'x' }, esc), '');
  assert.ok(!VERBOTEN.test(h));
});

test('Datumsformate', () => {
  assert.equal(datumDE('2026-10-20'), '20.10.2026');
  assert.equal(monatDE('2026-09-17'), '09/2026');
  assert.equal(datumDE(''), '');
});

test('CSS: nur Tokens, kein #fff, keine verbotenen Klassen, kein transition:all', () => {
  assert.ok(!/#fff\b/i.test(BLOECKE_CSS));
  assert.ok(!/background:#/i.test(BLOECKE_CSS));
  assert.ok(!VERBOTEN.test(BLOECKE_CSS));
  assert.ok(!/transition:all/.test(BLOECKE_CSS));
});
