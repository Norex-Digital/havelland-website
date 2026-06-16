// Pre-Build-Daten-Gate (generator-spec). Run: node scripts/validate-data.mjs
// Prüft data/*.json + data/copy/*.json VOR dem Render. Exit 1 bei hartem Fehler; WARN bricht nicht ab.
import fs from 'fs';

const hard = [], warn = [];
const FAIL = m => hard.push(m), WARN = m => warn.push(m);
const J = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { FAIL(`${f}: JSON ungültig — ${e.message}`); return null; } };
const ASCII = /^[a-z0-9-]+$/;
const isPH = v => v == null || /\b(TBD|XXXX|G-XXXX|GTM-X|null)\b/i.test(String(v));
const SEG = new Set(['B2C', 'B2B', 'Ferien']);

const config = J('data/config.json'), nap = J('data/nap.json'), proof = J('data/proof.json');
const svc = J('data/services.json'), loc = J('data/locations.json');
const hubs = J('data/copy/hubs.json'), arch = J('data/copy/archetypes.json'), rat = J('data/copy/ratgeber.json'), orteCp = J('data/copy/orte.json');

// --- config ---
if (config) {
  if (!config.domain || !/^https:\/\//.test(config.domain)) FAIL('config.domain fehlt/kein https');
  for (const k of ['ga4_id', 'gtm_id', 'web3forms_key']) if (isPH(config[k])) WARN(`config.${k} ist Platzhalter (Mensch-Blocker, Build ok)`);
}
// --- nap (build-kritisch) ---
if (nap) {
  for (const k of ['name', 'street', 'zip', 'city', 'phone_e164', 'phone_display']) if (isPH(nap[k])) FAIL(`nap.${k} fehlt/Platzhalter (build-kritisch)`);
  if (nap.zip && !/^\d{5}$/.test(nap.zip)) FAIL(`nap.zip kein 5-stelliger PLZ: ${nap.zip}`);
  for (const k of ['email', 'openingHours']) if (nap[k] == null) WARN(`nap.${k}=null (konditional weggelassen — Mensch ergänzt)`);
  if (!nap.geo || nap.geo.lat == null) WARN('nap.geo=null (Geo-Schema weggelassen — Mensch ergänzt)');
}
// --- services ---
const svcSlugs = new Set();
if (svc && svc.services) {
  for (const s of svc.services) {
    if (!s.slug || !ASCII.test(s.slug)) FAIL(`service slug nicht ASCII: ${JSON.stringify(s.slug)}`);
    if (svcSlugs.has(s.slug)) FAIL(`service slug doppelt: ${s.slug}`); svcSlugs.add(s.slug);
    if (!s.name) FAIL(`service ${s.slug}: name fehlt`);
    if (!Array.isArray(s.segment) || !s.segment.length) FAIL(`service ${s.slug}: segment fehlt/leer`);
    else for (const seg of s.segment) if (!SEG.has(seg)) FAIL(`service ${s.slug}: unbekanntes segment "${seg}"`);
  }
} else FAIL('services.json: services[] fehlt');
// --- locations ---
const locSlugs = new Set();
if (loc && loc.orte) {
  for (const o of loc.orte) {
    if (!o.slug || !ASCII.test(o.slug)) FAIL(`ort slug nicht ASCII: ${JSON.stringify(o.slug)}`);
    if (locSlugs.has(o.slug)) FAIL(`ort slug doppelt: ${o.slug}`); locSlugs.add(o.slug);
    if (!o.name) FAIL(`ort ${o.slug}: name fehlt`);
    if (!o.plz || !/^\d{5}$/.test(o.plz)) FAIL(`ort ${o.slug}: PLZ ungültig (${o.plz})`);
    if (!['A', 'B', 'LT'].includes(o.geo)) FAIL(`ort ${o.slug}: geo ∉ {A,B,LT} (${o.geo})`);
    if (!Array.isArray(o.typ) || !o.typ.length) FAIL(`ort ${o.slug}: typ fehlt/leer`);
    else for (const t of o.typ) if (!SEG.has(t)) FAIL(`ort ${o.slug}: unbekannter typ "${t}"`);
    // sichtbarer Name sollte keine ASCII-Transliteration tragen (slug ist getrennt)
    if (/\b(doeberitz|schoenwalde|oberkraemer|gross |muehlen|phoeben)\b/i.test(o.name)) WARN(`ort ${o.slug}: name evtl. ASCII-transliteriert: "${o.name}"`);
  }
} else FAIL('locations.json: orte[] fehlt');
// --- Copy-Drift ---
const arr = x => Array.isArray(x) ? x : (x ? (x.hubs || x.archetypes || x.ratgeber || []) : []);
if (hubs) for (const h of arr(hubs)) if (!svcSlugs.has(h.slug)) FAIL(`copy/hubs: Slug "${h.slug}" nicht in services`);
if (rat) for (const r of arr(rat)) if (r.cta_service && !svcSlugs.has(r.cta_service)) FAIL(`copy/ratgeber ${r.slug}: cta_service "${r.cta_service}" nicht in services`);
if (orteCp && orteCp.orte) for (const k of Object.keys(orteCp.orte)) if (!locSlugs.has(k)) FAIL(`copy/orte: Slug "${k}" nicht in locations`);
if (arch) { const keys = arr(arch).map(a => a.key); for (const need of ['brandenburg', 'berlinrand', 'b2b', 'ferien']) if (!keys.includes(need)) WARN(`copy/archetypes: Archetyp "${need}" fehlt`); }
// --- Translit in sichtbarer Copy (WARN) ---
const tre = /\b(fuer|ueber|grundstuck\w*|hauser|mussen|straucher|grunbelag|fruhjahr|naturlich|personlich|zuverlassig|regelmassig|raumen|gebaude|aufloesung)\b/i;
for (const [name, data] of [['hubs', hubs], ['archetypes', arch], ['ratgeber', rat]]) {
  if (data) { const m = JSON.stringify(data, (k, v) => k === '_meta' ? undefined : v).match(tre); if (m) WARN(`copy/${name}: mögliche ASCII-Transliteration "${m[0]}"`); }
}

// --- Report ---
console.log(`\n=== validate-data (${svcSlugs.size} Services · ${locSlugs.size} Orte) ===`);
if (warn.length) { console.log(`WARN (${warn.length}):`); warn.forEach(w => console.log('  ! ' + w)); }
if (hard.length) { console.log(`\nROT (${hard.length}):`); hard.forEach(h => console.log('  ✗ ' + h)); console.log('\nERGEBNIS: ROT — Build blockiert'); process.exit(1); }
console.log('\nERGEBNIS: GRÜN (Daten valide, Build freigegeben)');
