// seo-drift Baseline — erfasst SEO-kritische Elemente der Tier-1-Seiten (Home + 17 Hubs).
// Run: node scripts/seo-drift-baseline.mjs   → schreibt seo-drift-baseline.json
// Vergleich später: erneut laufen lassen + gegen die Baseline diffen (Regressions-Schutz für die wichtigsten Seiten).
import fs from 'fs';

const TIER1 = ['/', '/gartenpflege/', '/heckenschnitt/', '/winterdienst/', '/steinreinigung/', '/fensterreinigung/', '/dachrinnenreinigung/', '/photovoltaikreinigung/', '/entruempelung/', '/haushaltsaufloesung/', '/grundreinigung/', '/umzugshilfe/', '/renovierung/', '/hausmeisterservice/', '/gebaeudereinigung/', '/unterhaltsreinigung/', '/objektbetreuung/', '/ferienwohnung-reinigung/'];

const grab = (h, re) => { const m = h.match(re); return m ? m[1].trim() : null; };
const baseline = { _meta: 'seo-drift Baseline Tier-1 (Home + 17 Hubs). Erneut laufen + diffen zur Regressionserkennung.', captured_at: 'lokal', pages: {} };

for (const url of TIER1) {
  const f = `website${url}index.html`;
  if (!fs.existsSync(f)) { baseline.pages[url] = { error: 'fehlt' }; continue; }
  const h = fs.readFileSync(f, 'utf8');
  let schemaTypes = [];
  const sm = h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (sm) { try { schemaTypes = (JSON.parse(sm[1])['@graph'] || []).map(x => x['@type']); } catch {} }
  baseline.pages[url] = {
    title: grab(h, /<title>([^<]*)<\/title>/),
    title_len: (grab(h, /<title>([^<]*)<\/title>/) || '').length,
    meta: grab(h, /<meta name="description" content="([^"]*)"/),
    meta_len: (grab(h, /<meta name="description" content="([^"]*)"/) || '').length,
    h1: (grab(h, /<h1[^>]*>([\s\S]*?)<\/h1>/) || '').replace(/<[^>]+>/g, ''),
    h1_count: (h.match(/<h1\b/g) || []).length,
    h2_count: (h.match(/<h2\b/g) || []).length,
    canonical: grab(h, /<link rel="canonical" href="([^"]*)"/),
    schema_types: schemaTypes,
    faq_count: (h.match(/<details><summary>/g) || []).length,
    internal_links: (h.match(/href="\/[^"]*"/g) || []).length,
    word_count: h.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').length,
  };
}
fs.writeFileSync('seo-drift-baseline.json', JSON.stringify(baseline, null, 2));
console.log(`seo-drift Baseline geschrieben: ${Object.keys(baseline.pages).length} Tier-1-Seiten → seo-drift-baseline.json`);
