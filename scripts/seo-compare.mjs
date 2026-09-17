// seo-compare — vergleicht SEO-kritische Signale einer Seite zwischen einem Git-Stand (z. B. Live-Commit) und dem aktuellen Build.
// Run: node scripts/seo-compare.mjs <git-ref> [/url/ …]   (ohne URLs: Home + alle Hubs + Tier-1-Ortsseiten)
// Zweck (W3b, 17.09.): Nachweis, dass Umbau auf Kachel-Layout Title/Meta/H1/Canonical/Schema/Links/Keyword-Abdeckung nicht verschlechtert.
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const ref = process.argv[2];
if (!ref) { console.error('Usage: node scripts/seo-compare.mjs <git-ref> [/url/ ...]'); process.exit(2); }
const DEFAULT = ['/', '/gartenpflege/', '/heckenschnitt/', '/winterdienst/', '/steinreinigung/', '/fensterreinigung/', '/dachrinnenreinigung/', '/dachreinigung/', '/entruempelung/', '/haushaltsaufloesung/', '/grundreinigung/', '/hausmeisterservice/', '/gebaeudereinigung/', '/unterhaltsreinigung/', '/objektbetreuung/', '/ferienwohnung-reinigung/', '/heckenentfernung/', '/baumstumpf-entfernen/', '/gartenrodung/', '/baumschnitt/', '/galabau/', '/zaunbau/', '/entruempelung-falkensee/', '/entruempelung-brieselang/', '/haushaltsaufloesung-falkensee/', '/fuer-hausverwaltungen/'];
const urls = process.argv.slice(3).length ? process.argv.slice(3) : DEFAULT;

const grab = (h, re) => { const m = h.match(re); return m ? m[1].trim() : ''; };
const strip = s => s.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&quot;/g, "'").replace(/\s+/g, ' ').trim();
const words = t => t.toLowerCase().replace(/[^a-zäöüß0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3);
const STOP = new Set(['auch', 'aber', 'oder', 'nicht', 'eine', 'einer', 'eines', 'einem', 'einen', 'sich', 'dass', 'dann', 'nach', 'beim', 'ihre', 'ihren', 'ihrem', 'ihrer', 'sind', 'wird', 'werden', 'haben', 'wenn', 'noch', 'mehr', 'über', 'unter', 'kommt', 'kommen', 'dazu', 'damit', 'ohne', 'alles', 'allem', 'aller', 'diese', 'dieser', 'dieses', 'dort', 'hier', 'meist', 'schon', 'sehr', 'kein', 'keine', 'keinen', 'wieder', 'dafür', 'dabei', 'danach', 'davor', 'vorher', 'zwischen', 'deshalb', 'wo', 'was', 'wer', 'wie']);
function analyse(h) {
  const body = h.replace(/[\s\S]*?<main[^>]*>/, '').replace(/<footer[\s\S]*$/, '');
  const main = strip(body);
  const sm = h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  let schema = [];
  if (sm) { try { const j = JSON.parse(sm[1]); schema = (j['@graph'] || [j]).map(x => x['@type'] + (x.hasOfferCatalog ? `(+${(x.hasOfferCatalog.itemListElement || []).length} Offers)` : '')); } catch { schema = ['PARSE-ERROR']; } }
  const links = new Set([...body.matchAll(/href="(\/[^"#?]*)/g)].map(m => m[1]));
  const kw = new Set(words(main).filter(w => !STOP.has(w)));
  return {
    title: grab(h, /<title>([^<]*)<\/title>/), meta: grab(h, /<meta name="description" content="([^"]*)"/),
    h1: strip(grab(h, /<h1[^>]*>([\s\S]*?)<\/h1>/)), canonical: grab(h, /<link rel="canonical" href="([^"]*)"/),
    robots: grab(h, /<meta name="robots" content="([^"]*)"/), schema,
    h2: [...body.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map(m => strip(m[1])),
    h3: [...body.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)].map(m => strip(m[1])),
    links, imgAlt: (body.match(/<img[^>]*alt="[^"]+"/g) || []).length,
    wordsTotal: main.split(' ').length, kw, text: main.toLowerCase()
  };
}
let worse = 0;
for (const url of urls) {
  const f = `website${url}index.html`;
  let oldH; try { oldH = execSync(`git show ${ref}:${f}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { console.log(`\n## ${url}  — im Ref nicht vorhanden (neue Seite)`); continue; }
  if (!fs.existsSync(f)) { console.log(`\n## ${url}  — FEHLT im Build`); worse++; continue; }
  const a = analyse(oldH), b = analyse(fs.readFileSync(f, 'utf8'));
  const same = k => a[k] === b[k];
  const lostKw = [...a.kw].filter(w => !b.kw.has(w));
  const lostLinks = [...a.links].filter(l => !b.links.has(l));
  const lostH2 = a.h2.filter(x => !b.h2.includes(x)), lostH3 = a.h3.filter(x => !b.h3.includes(x));
  const flags = [];
  if (!same('title')) flags.push(`TITLE geändert: "${a.title}" -> "${b.title}"`);
  if (!same('meta')) flags.push('META geändert');
  if (!same('h1')) flags.push(`H1 geändert: "${a.h1}" -> "${b.h1}"`);
  if (!same('canonical')) flags.push('CANONICAL geändert');
  if (!same('robots')) flags.push(`ROBOTS geändert: ${a.robots} -> ${b.robots}`);
  if (JSON.stringify(a.schema) !== JSON.stringify(b.schema)) flags.push(`SCHEMA: ${a.schema.join(',')} -> ${b.schema.join(',')}`);
  if (lostLinks.length) flags.push(`interne Links weg: ${lostLinks.join(' ')}`);
  const cov = a.kw.size ? Math.round((1 - lostKw.length / a.kw.size) * 100) : 100;
  if (flags.length || cov < 85) worse++;
  console.log(`\n## ${url}`);
  console.log(`  Title/Meta/H1/Canonical/Schema: ${flags.length ? 'ABWEICHUNG' : 'identisch'}${flags.length ? '\n  - ' + flags.join('\n  - ') : ''}`);
  console.log(`  Wörter gesamt (inkl. eingeklappt): ${a.wordsTotal} -> ${b.wordsTotal} | H2 ${a.h2.length} -> ${b.h2.length} | H3 ${a.h3.length} -> ${b.h3.length} | interne Links ${a.links.size} -> ${b.links.size} | img-alt ${a.imgAlt} -> ${b.imgAlt}`);
  console.log(`  Keyword-Abdeckung (Wortformen > 3 Zeichen aus alter Seite noch vorhanden): ${cov} %  (${lostKw.length} von ${a.kw.size} weg)`);
  if (lostH2.length) console.log(`  H2 entfallen: ${lostH2.map(x => `"${x}"`).join(', ')}`);
  if (lostH3.length) console.log(`  H3 entfallen: ${lostH3.map(x => `"${x}"`).join(', ')}`);
  if (lostKw.length) console.log(`  Beispiele entfallener Wörter: ${lostKw.slice(0, 25).join(', ')}`);
}
console.log(`\nERGEBNIS: ${worse ? worse + ' Seite(n) mit Abweichung bei Title/Meta/H1/Canonical/Schema/Links oder Abdeckung < 85 %' : 'keine Abweichung bei Title/Meta/H1/Canonical/Schema/Links, Abdeckung ≥ 85 % überall'}`);
