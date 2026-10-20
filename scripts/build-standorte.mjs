// build-standorte.mjs — erzeugt data/standorte.json (Paket 3, Teil A: Standorte). Run: node scripts/build-standorte.mjs
// Berechnet aus GSC (3 Monate, Ortsseiten): Falkensee-Top-8, Kopfbild je Ort, Nachbarorte je Ort.
// Handgepflegte Felder (kern, kern_namen, kern_texte, stufe1, stufe2, kasten_ausschluss) bleiben erhalten, wenn data/standorte.json schon existiert.
// Der Generator (generate.mjs) liest nur die JSON; dieses Skript wird nur bei neuen GSC-Zahlen oder neuen Orten wieder gebraucht.
// Env: GSC_CSV = Pfad zur 01b-gsc-roh.csv (Default: gbr-firma, Paket-1-Ordner neben dem Website-Repo).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GEBIET_REGIONEN } from './components.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const J = f => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));
const CSV = process.env.GSC_CSV || path.resolve(ROOT, '../gbr-firma/websites/havelland/website/leistungen-galabau-2026-10/01b-gsc-roh.csv');
const OUT = path.join(ROOT, 'data/standorte.json');

const services = J('services.json').services;
const orte = J('locations.json'); const ortsteileVon = orte._meta.ortsteile_von || {};
const config = J('config.json');
const IMG = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/img/manifest.json'), 'utf8'));
const orteCopy = (J('copy/orte.json').orte) || {};
const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};

// ---- Standort-Logik, 1:1 aus generate.mjs (PAGE_SVC wird aus dem Quelltext gelesen, nicht kopiert) ----
const gen = fs.readFileSync(path.join(ROOT, 'scripts/generate.mjs'), 'utf8');
const pm = gen.match(/const PAGE_SVC = new Set\(\[([^\]]+)\]\)/);
if (!pm) throw new Error('PAGE_SVC in generate.mjs nicht gefunden');
const PAGE_SVC = new Set([...pm[1].matchAll(/'([^']+)'/g)].map(m => m[1]));
const PREMIUM = new Set(['gross-glienicke', 'berlin-kladow', 'berlin-gatow']);
const sectionOT = new Set(Object.keys(ortsteileVon).filter(s => !PREMIUM.has(s)));
const launch = orte.orte.filter(o => o.geo === 'A' || o.geo === 'B');
const haupt = launch.filter(o => !sectionOT.has(o.slug) && !o.nur_seiten);
const segMatch = (s, o) => s.segment.some(x => o.typ.includes(x));
const orteForService = s => s.b2b_only ? [] : haupt.filter(o => s.orte_fix ? s.orte_fix.includes(o.slug) : segMatch(s, o));
const seitenOrte = s => s.seiten_orte ? s.seiten_orte.map(sl => orte.orte.find(o => o.slug === sl)).filter(Boolean) : orteForService(s);
const servicesForOrt = o => services.filter(s => PAGE_SVC.has(s.slug) && !s.b2b_only && (s.seiten_orte ? s.seiten_orte.includes(o.slug) : s.orte_fix ? s.orte_fix.includes(o.slug) : segMatch(s, o)));
const noindex = s => (config.aktive_welle || 0) < (s && s.wave != null ? s.wave : 1);
const hubSlugs = new Set(haupt.filter(o => servicesForOrt(o).length >= 3).map(o => o.slug));
// existierende + indexierbare Leistungs-Ortsseiten: "svc|ort"
const indexierbar = new Set();
for (const s of services) if (PAGE_SVC.has(s.slug) && !noindex(s)) for (const o of seitenOrte(s)) indexierbar.add(s.slug + '|' + o.slug);

// ---- handgepflegte Felder (Default, wenn noch nicht in der JSON) ----
const DEF = {
  kern: ['gartenpflege', 'heckenschnitt', 'galabau', 'entruempelung'],
  kern_namen: { gartenpflege: 'Gartenpflege', heckenschnitt: 'Heckenschnitt', galabau: 'GaLaBau', entruempelung: 'Entrümpelung' },
  kern_texte: {
    gartenpflege: 'Rasen, Beete und Laub in {ort}, einmalig oder im festen 14-Tage-Rhythmus.',
    heckenschnitt: 'Thuja, Liguster und Kirschlorbeer in {ort} in Form, das Schnittgut nehmen wir mit.',
    galabau: 'Pflaster, Terrasse, Zaun, Erdarbeiten und Rollrasen in {ort}, Festpreis nach der Besichtigung.',
    entruempelung: 'Keller, Garage, Dachboden oder das ganze Haus in {ort} ausgeräumt und besenrein übergeben.'
  },
  stufe1: [
    { key: 'home', label: null, orte: ['falkensee'] },
    { key: 'rund', label: 'Rund um Falkensee', orte: ['dallgow-doeberitz', 'brieselang', 'schoenwalde-glien', 'wustermark', 'nauen'] },
    { key: 'west', label: 'Berliner Westrand', orte: ['berlin-spandau', 'berlin-gatow', 'berlin-kladow', 'gross-glienicke'] }
  ],
  stufe2: [
    { key: 'nord', label: 'Oberhavel, im Norden', orte: ['hohen-neuendorf', 'hennigsdorf', 'oranienburg', 'velten', 'birkenwerder', 'glienicke-nordbahn', 'leegebruch', 'lehnitz', 'kremmen', 'oberkraemer'] },
    { key: 'sued', label: 'Havel und Seen, im Süden', orte: ['werder-havel', 'ketzin'] }
  ],
  kasten_ausschluss: ['winterdienst', 'fensterreinigung']   // Owner 20.10.: nicht mehr prominent, bleiben unter "Außerdem" verlinkt
};
const kern = prev.kern || DEF.kern;
const kern_namen = prev.kern_namen || DEF.kern_namen;
const kern_texte = prev.kern_texte || DEF.kern_texte;
const stufe1 = prev.stufe1 || DEF.stufe1;
const stufe2 = prev.stufe2 || DEF.stufe2;
const kasten_ausschluss = prev.kasten_ausschluss || DEF.kasten_ausschluss;

// ---- Prüfungen ----
const alleOrte = [...stufe1, ...stufe2].flatMap(g => g.orte);
const fehlt = alleOrte.filter(sl => !hubSlugs.has(sl));
const ueber = [...hubSlugs].filter(sl => !alleOrte.includes(sl));
if (fehlt.length) console.warn('! Orte aus den Stufen OHNE Standortseite (fallen aus dem Generator heraus):', fehlt.join(', '));
if (ueber.length) console.warn('! Standortseiten, die in keiner Stufe stehen:', ueber.join(', '));
if (alleOrte.length !== new Set(alleOrte).size) throw new Error('Ort doppelt in den Stufen');

// ---- GSC: Impressionen 3m je Ortsseite ----
const impr = {};   // "svc|ort" -> Impressionen
let csvOk = false;
if (fs.existsSync(CSV)) {
  csvOk = true;
  const lines = fs.readFileSync(CSV, 'utf8').split(/\r?\n/).slice(1);
  for (const ln of lines) {
    const c = ln.split(',');
    if (c[0] !== '3m') continue;
    const m = (c[4] || '').match(/^\/([a-z0-9-]+)\/$/);
    if (!m) continue;
    for (const key of indexierbar) { const [sv, ot] = key.split('|'); if (m[1] === `${sv}-${ot}`) { impr[key] = (impr[key] || 0) + (Number(c[8]) || 0); break; } }
  }
} else console.warn('! GSC-CSV nicht gefunden:', CSV, '- Top-8/Kopfbilder fallen auf Default');

// ---- Falkensee-Top-8: Kern fest (4) + die 4 nachgefragtesten übrigen (ohne Ausschluss), nur indexierbare Ortsseiten ----
const fk = sv => impr[sv + '|falkensee'] || 0;
const weitere = [...indexierbar].map(k => k.split('|')).filter(([sv, ot]) => ot === 'falkensee' && !kern.includes(sv) && !kasten_ausschluss.includes(sv))
  .map(([sv]) => sv).sort((a, b) => fk(b) - fk(a) || a.localeCompare(b));
const falkensee_top = [...kern, ...weitere].slice(0, 8);
// Auffüllen, falls <8 (z. B. ohne GSC): weitere indexierbare Leistungen des Orts, dann Ausgeschlossene
if (falkensee_top.length < 8) for (const sv of services.map(s => s.slug)) { if (falkensee_top.length >= 8) break; if (!falkensee_top.includes(sv) && indexierbar.has(sv + '|falkensee')) falkensee_top.push(sv); }

// ---- Kopfbild je Ort: stärkste Leistung (GSC, ohne kasten_ausschluss und reine B2B-Leistungen) → svc-<slug>-hero, außer sie steht schon als Kern-Karte darunter → standorte-hero ----
const kopfbild = {};
for (const sl of alleOrte) {
  let best = null, bi = 0;
  for (const s of services) { if (kasten_ausschluss.includes(s.slug) || (s.segment.includes('B2B') && !s.segment.includes('B2C'))) continue; const v = impr[s.slug + '|' + sl] || 0; if (v > bi) { bi = v; best = s.slug; } }
  kopfbild[sl] = (best && !kern.includes(best) && IMG[`svc-${best}-hero`]) ? `svc-${best}-hero` : 'standorte-hero';
}

// ---- Nachbarorte: Redaktion (orte.json) zuerst, dann nächste per Kartenposition bis 4 ----
const pos = {}; for (const r of GEBIET_REGIONEN) for (const o of r.orts) pos[o.slug] = [o.px, o.py];
const byName = Object.fromEntries(orte.orte.map(o => [o.name, o.slug]));
const nachbarn = {};
for (const sl of alleOrte) {
  const redakt = ((orteCopy[sl] || {}).nachbarorte || []).map(n => byName[String(n).replace(/&amp;/g, '&')]).filter(x => x && x !== sl && alleOrte.includes(x));
  const list = [...new Set(redakt)];
  const dist = x => { const a = pos[sl], b = pos[x]; return a && b ? Math.hypot(a[0] - b[0], a[1] - b[1]) : 999; };
  const nah = alleOrte.filter(x => x !== sl && !list.includes(x)).sort((a, b) => dist(a) - dist(b));
  while (list.length < 4 && nah.length) list.push(nah.shift());
  nachbarn[sl] = list.slice(0, 5);
}

const out = {
  _meta: {
    zweck: 'Standorte (Paket 3a): Stufen, Falkensee-Top-8, Kopfbild und Nachbarorte. Erzeugt mit scripts/build-standorte.mjs.',
    quelle_gsc: csvOk ? 'GSC 20.07.-18.10.2026 (01b-gsc-roh.csv, Zeitraum 3m, Impressionen der Ortsseiten)' : 'keine GSC-Daten gefunden',
    hand_gepflegt: ['kern', 'kern_namen', 'kern_texte', 'stufe1', 'stufe2', 'kasten_ausschluss'],
    link_regel: 'Ziel je Chip: /<leistung>-<ort>/ wenn die Ortsseite gerendert und indexierbar ist, sonst /<leistung>/ (Hub). Wird im Generator aufgelöst.'
  },
  kern, kern_namen, kern_texte, stufe1, stufe2, kasten_ausschluss,
  falkensee_top, kopfbild, nachbarn
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`standorte.json: ${alleOrte.length} Orte (Stufe 1: ${stufe1.flatMap(g => g.orte).length}, Stufe 2: ${stufe2.flatMap(g => g.orte).length}), Falkensee-Top: ${falkensee_top.join(', ')}`);
console.log('Kopfbild:', Object.entries(kopfbild).map(([k, v]) => `${k}=${v.replace(/^svc-|-hero$/g, '')}`).join(' '));
