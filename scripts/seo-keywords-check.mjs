// seo-keywords-check — prüft je Seite, ob Ziel-Suchbegriffe (Phrasen) im gebauten HTML vorkommen (sichtbarer Text inkl. eingeklappter <details>).
// Run: node scripts/seo-keywords-check.mjs [git-ref]   — mit Ref zusätzlich Vergleich gegen den alten Stand (Vorkommen alt -> neu).
// Quelle der Begriffe: GSC-Queries (Session 17.09.) + Title/H1-Kernbegriffe je Hub. Kein Gate, Evidenz für den Owner.
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const ref = process.argv[2];
const KW = {
  '/': ['gartenpflege falkensee', 'entrümpelung', 'objektbetreuung', 'hausverwaltung', 'zaunbau', 'havelland'],
  '/entruempelung/': ['entrümpelung falkensee', 'entrümpelung havelland', 'keller entrümpeln', 'garage entrümpeln', 'dachboden entrümpeln', 'gartenhaus', 'schuppen', 'sperrmüll', 'wertstoffhof falkensee', 'nach beleg', 'festpreis', 'haushaltsauflösung', 'gewerbe', 'wohnung', 'in der nähe', 'brieselang', 'dallgow'],
  '/galabau/': ['galabau', 'falkensee', 'havelland', 'zaunbau', 'doppelstab', 'heckenentfernung', 'rodung', 'stubben', 'baumstumpf', 'pflaster', 'kantensteine', 'hochbeet', 'beeteinfassung', 'gartenhaus', '§ 39', '1. oktober', '28. februar', 'festpreis', 'nach beleg'],
  '/haushaltsaufloesung/': ['haushaltsauflösung falkensee', 'haushaltsauflösung havelland', 'wohnungsauflösung', 'erbfall', 'pflegeheim', 'besenrein', 'vollmacht', 'nachlass', 'festpreis', 'nach beleg', 'entrümpelung'],
  '/entruempelung-falkensee/': ['entrümpelung falkensee', 'falkensee', 'wertstoffhof', 'keller', 'garage', 'schuppen', 'festpreis', 'nach beleg', 'finkenkrug', 'falkenhagen'],
  '/entruempelung-brieselang/': ['entrümpelung brieselang', 'brieselang', 'keller', 'garage', 'schuppen', 'festpreis', 'nach beleg', 'wertstoffhof'],
  '/haushaltsaufloesung-falkensee/': ['haushaltsauflösung falkensee', 'falkensee', 'erbfall', 'besenrein', 'festpreis', 'nach beleg', 'wohnung'],
  '/gartenpflege/': ['gartenpflege', 'falkensee', 'havelland', 'rasen', 'hecke', 'laub', 'festpreis'],
  '/heckenschnitt/': ['heckenschnitt', 'falkensee', 'havelland', 'thuja', 'kirschlorbeer', '§ 39', 'festpreis'],
  '/zaunbau/': ['zaunbau', 'doppelstab', 'sichtschutz', 'staketen', 'falkensee', 'havelland', 'festpreis'],
  '/heckenentfernung/': ['heckenentfernung', 'hecke entfernen', 'wurzel', 'falkensee', 'havelland', '1. oktober'],
  '/gartenrodung/': ['gartenrodung', 'rodung', 'verwildert', 'falkensee', 'havelland'],
  '/baumstumpf-entfernen/': ['baumstumpf', 'stubben', 'fräsen', 'falkensee', 'havelland'],
  '/baumschnitt/': ['baumschnitt', 'obstbaum', 'falkensee', 'havelland'],
  '/winterdienst/': ['winterdienst', 'räumpflicht', 'streu', 'falkensee', 'havelland', 'partner'],
  '/steinreinigung/': ['steinreinigung', 'pflaster', 'terrasse', 'falkensee', 'havelland'],
  '/fensterreinigung/': ['fensterreinigung', 'falkensee', 'havelland'],
  '/dachrinnenreinigung/': ['dachrinnenreinigung', 'dachrinne', 'falkensee', 'havelland'],
  '/dachreinigung/': ['dachreinigung', 'moos', 'falkensee', 'havelland', 'partner'],
  '/grundreinigung/': ['grundreinigung', 'falkensee', 'havelland'],
  '/hausmeisterservice/': ['hausmeisterservice', 'hausverwaltung', 'havelland'],
  '/gebaeudereinigung/': ['gebäudereinigung', 'hausverwaltung', 'havelland'],
  '/unterhaltsreinigung/': ['unterhaltsreinigung', 'hausverwaltung', 'havelland'],
  '/objektbetreuung/': ['objektbetreuung', 'hausverwaltung', 'havelland'],
  '/ferienwohnung-reinigung/': ['ferienwohnung', 'reinigung', 'havelland'],
  '/fuer-hausverwaltungen/': ['hausverwaltung', 'weg', 'objekt', 'pflegevertr', 'havelland', 'angebot'],
};
const norm = h => h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').toLowerCase();
const count = (t, k) => t.split(k.toLowerCase()).length - 1;
let missing = 0, dropped = 0;
for (const [url, kws] of Object.entries(KW)) {
  const f = `website${url}index.html`;
  if (!fs.existsSync(f)) { console.log(`${url}: FEHLT`); missing++; continue; }
  const t = norm(fs.readFileSync(f, 'utf8'));
  let o = null;
  if (ref) { try { o = norm(execSync(`git show ${ref}:${f}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })); } catch { o = null; } }
  const rows = kws.map(k => { const n = count(t, k); const m = o ? count(o, k) : null; if (!n) missing++; if (o && m && !n) dropped++; return `${k}${o ? ` ${m}→${n}` : ` ${n}`}${n ? '' : ' ✗'}`; });
  console.log(`${url}\n   ${rows.join(' · ')}`);
}
console.log(`\nERGEBNIS: ${missing ? missing + ' Begriff(e) fehlen' : 'alle Zielbegriffe vorhanden'}${ref ? `, ${dropped} Begriff(e) gegenüber ${ref} verloren` : ''}`);
