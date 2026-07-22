// Havelland Static-Site-Generator — Node, zero deps. Run: node scripts/generate.mjs  (FULL=1 für alle Ortsseiten)
// Liest data/*.json + data/copy/*.json (P4-Copy), rendert gegen havelland-design (site.css), schreibt website/ + Sitemaps.
// Kein FAQPage-JSON-LD (Projekt-Regel) — FAQ als nativer <details>-Inhalt.
import fs from 'fs';
import crypto from 'node:crypto';
// Cache-Busting: Inhalts-Hash aus site.css + site.js -> ?v=… an <link>/<script>, damit Browser nach jeder Änderung frisch laden.
const ASSET_VER = crypto.createHash('md5').update(fs.readFileSync('assets/css/site.css')).update(fs.readFileSync('assets/js/site.js')).digest('hex').slice(0, 8);
// Gelockte Voll-Print-Komponenten (Klassen-Hooks 1:1 aus den Previews) — pro Seitentyp verdrahtet.
import {
  baSlider, garantienStrip, schnittkalender, heckenKompass, jahreszeiten, echtProjekt,
  karussell, archivGrid, whatsappFlow, auftragsTimeline, uspBand, faqFilter, gebietskarte,
  trustBadges, fristband, aeoKapsel, beweisMechanik
} from './components.mjs';

const J = f => JSON.parse(fs.readFileSync(`data/${f}`, 'utf8'));
const CP = f => { try { return JSON.parse(fs.readFileSync(`data/copy/${f}`, 'utf8')); } catch { return null; } };
const services = J('services.json').services;
const loc = J('locations.json'); const orte = loc.orte; const ortsteileVon = loc._meta.ortsteile_von || {};
const nap = J('nap.json'); const config = J('config.json'); const proof = J('proof.json');
const reviews = (() => { try { return J('reviews.json'); } catch { return { enabled: false }; } })();
const DOMAIN = config.domain.replace(/\/$/, '');
const FULL = !!process.env.FULL;

// ---------- Analytics-Gerüst (GA4/GTM + Consent Mode v2) — rendert NUR bei echter GTM-ID ----------
const isReal = v => v && !/\b(TBD|XXXX|G-XXXX|GTM-X|null)\b/i.test(String(v));
const GTM = config.gtm_id; const TRACK = isReal(GTM);
const ANALYTICS_HEAD = TRACK ? `
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('consent','default',{ad_storage:'denied',analytics_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',functionality_storage:'granted',security_storage:'granted',wait_for_update:500});</script>
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f)})(window,document,'script','dataLayer','${GTM}');</script>` : '';
const ANALYTICS_BODY = TRACK ? `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>` : '';
const CONSENT_BANNER = TRACK ? `<div id="consent" class="consent" hidden><div class="consent-in"><p>Wir nutzen Cookies und Tools für anonyme Nutzungsstatistik. Sie entscheiden — mehr in der <a href="/datenschutz/">Datenschutzerklärung</a>.</p><div class="consent-btns"><button type="button" class="btn btn-line" data-c="deny">Ablehnen</button><button type="button" class="btn btn-acc" data-c="allow">Akzeptieren</button></div></div></div>
<script>(function(){var box=document.getElementById('consent');if(!box)return;function gtag(){dataLayer.push(arguments)}var grant={analytics_storage:'granted',ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted'};var s=localStorage.getItem('consent');if(s==='allow'){gtag('consent','update',grant)}else if(!s){box.hidden=false}box.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var c=b.getAttribute('data-c');localStorage.setItem('consent',c);if(c==='allow'){gtag('consent','update',grant)}box.hidden=true})})();</script>` : '';
const TRACK_EVENTS = TRACK ? `<script>document.addEventListener('click',function(e){var a=e.target.closest('a');if(!a||!a.href)return;if(a.href.indexOf('tel:')===0){dataLayer.push({event:'phone_call'})}else if(a.href.indexOf('wa.me')>-1||a.href.indexOf('api.whatsapp')>-1){dataLayer.push({event:'whatsapp_click'})}});</script>` : '';

// ---------- Copy-Schicht (P4) — inkl. Sanitizer gegen Agenten-Encoding-Artefakte ----------
// decEnt: dekodiert HTML-Entities (auch mehrfach geschachtelt) -> Klartext; plain: + Tags strippen; fixHtml: body_html reparieren
const decEnt = s => { let p = String(s == null ? '' : s), c; do { c = p; p = p.replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#0*39;/gi, "'").replace(/&apos;/gi, "'").replace(/&nbsp;/gi, ' '); } while (p !== c); return p; };
const plain = s => decEnt(s).replace(/<\/?[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const fixHtml = s => {
  let p = String(s == null ? '' : s), c;
  do { c = p; p = p.replace(/&amp;(amp;|lt;|gt;|quot;|#0*39;|nbsp;)/gi, '&$1'); } while (p !== c);
  p = p.replace(/<\/li><\/(strong|em|b|i)>/gi, '</$1></li>');          // verschachteltes Inline-Tag nach </li>
  do { c = p; p = p.replace(/<\/li>(\s*[^<\s][^<]*?)(<li|<\/ul)/gi, '$1</li>$2'); } while (p !== c); // Orphan-Text ins vorige <li>
  return p;
};
const _pa = v => Array.isArray(v) ? v.map(plain) : (v != null ? plain(v) : v);
function sanHub(h) { for (const k of ['title','meta','h1','h1_em','intro','definition','naehe','ablauf','garantie_text','ortsseite_lead']) if (h[k] != null) h[k] = plain(h[k]); if (h.sections) for (const s of h.sections) { s.h3 = plain(s.h3); s.body = plain(s.body); } if (h.faqs) for (const f of h.faqs) { f.q = plain(f.q); f.a = plain(f.a); } return h; }
function sanArch(a) { a.rahmen = _pa(a.rahmen); a.trust = _pa(a.trust); if (a.faqs) for (const f of a.faqs) { f.q = plain(f.q); f.a = plain(f.a); } return a; }
function sanRat(r) { for (const k of ['title','meta','lead','intro','cta_text']) if (r[k] != null) r[k] = plain(r[k]); if (r.sections) for (const s of r.sections) { s.h2 = plain(s.h2); s.body_html = fixHtml(s.body_html); } if (r.faqs) for (const f of r.faqs) { f.q = plain(f.q); f.a = plain(f.a); } return r; }
function sanOrt(o) { if (o.hook) o.hook = plain(o.hook); if (o.nachbarorte) o.nachbarorte = o.nachbarorte.map(plain); return o; }

const _hubArr = CP('hubs.json'); const hubCopy = {}; if (_hubArr) for (const h of (_hubArr.hubs || _hubArr)) hubCopy[h.slug] = sanHub(h);
const _archArr = CP('archetypes.json'); const archCopy = {}; if (_archArr) for (const a of (_archArr.archetypes || _archArr)) archCopy[a.key] = sanArch(a);
const _ratArr = CP('ratgeber.json'); const ratCopy = ((_ratArr && (_ratArr.ratgeber || _ratArr)) || []).map(sanRat);
const _orteCp = CP('orte.json'); const orteCopy = (_orteCp && _orteCp.orte) || {}; for (const k in orteCopy) sanOrt(orteCopy[k]);
// Welle-1a: bespoke Ortsseiten-Copy (service×ort) — ersetzt Archetyp/Ort-Hook + Archetyp-FAQ auf der Ortsseite (Fallback bleibt Archetyp). Dach: Partner-Framing (gu-modell.md, §5 UWG).
function sanOrtsSvc(o) { if (o.meta != null) o.meta = plain(o.meta); if (o.faqs) for (const f of o.faqs) { f.q = plain(f.q); f.a = plain(f.a); } if (o.orte) for (const k in o.orte) { const e = o.orte[k]; for (const kk of ['hook', 'rahmen', 'trust']) if (e[kk] != null) e[kk] = plain(e[kk]); } return o; }
const _ortsSvcCp = CP('ortsseiten.json'); const ortsSvcCopy = (_ortsSvcCp && _ortsSvcCp.services) || {}; for (const k in ortsSvcCopy) sanOrtsSvc(ortsSvcCopy[k]);
// Reverse-Index Service → Ratgeber (interne Verlinkung, seiten-architektur §7)
const ratgeberByService = {}; for (const r of ratCopy) { if (!r.cta_service) continue; (ratgeberByService[r.cta_service] = ratgeberByService[r.cta_service] || []).push(r); }

// Übersichtsseiten-Copy (/leistungen/ + /standorte/) — Intros/FAQ; Labels stehen in den Maps unten
const _ueb = CP('uebersicht.json') || {}; const uebL = _ueb.leistungen || {}; const uebS = _ueb.standorte || {};
// Gruppierung: Service-Slug → Themen-Block (Portfolio-Refokus 2026-07-22: Garten & Außen · Entrümpelung & Auflösung · Dach · Für Gewerbe & Hausverwaltungen). Reihenfolge = Anzeige-Reihenfolge. b2b_only-Services (hausmeisterservice) leben im Gewerbe-Block.
const LEISTUNGEN_KATEGORIEN = [
  { key: 'garten', label: 'Garten & Außen', slugs: ['gartenpflege', 'heckenschnitt', 'winterdienst', 'steinreinigung', 'fensterreinigung'] },
  { key: 'aufloesung', label: 'Entrümpelung & Auflösung', slugs: ['entruempelung', 'haushaltsaufloesung', 'grundreinigung'] },
  { key: 'dach', label: 'Dach', slugs: ['dachrinnenreinigung', 'dachreinigung'] },
  { key: 'gewerbe', label: 'Für Gewerbe & Hausverwaltungen', slugs: ['hausmeisterservice', 'gebaeudereinigung', 'unterhaltsreinigung', 'objektbetreuung', 'ferienwohnung-reinigung'] }
];
// Ort-Slug → geografische Region (nur Money-Page-Orte werden gerendert; Schnittmenge im Builder)
const STANDORT_REGIONEN = [
  { key: 'west', label: 'Falkensee & westliches Havelland', slugs: ['falkensee', 'dallgow-doeberitz', 'brieselang', 'schoenwalde-glien', 'wustermark', 'nauen', 'ketzin'] },
  { key: 'nord', label: 'Oberhavel & nördliches Umland', slugs: ['oranienburg', 'hennigsdorf', 'velten', 'oberkraemer', 'kremmen', 'leegebruch', 'lehnitz', 'hohen-neuendorf', 'birkenwerder', 'glienicke-nordbahn'] },
  { key: 'berlinrand', label: 'Berliner Westrand & Havelufer', slugs: ['berlin-kladow', 'berlin-gatow', 'gross-glienicke', 'berlin-spandau'] },
  { key: 'seen', label: 'Havelseen & Ferienlagen', slugs: ['werder-havel', 'schwielowsee'] }
];

const PAGE_SVC = new Set(['heckenschnitt','gartenpflege','fensterreinigung','entruempelung','haushaltsaufloesung','winterdienst','steinreinigung','dachrinnenreinigung','dachreinigung','hausmeisterservice','gebaeudereinigung','unterhaltsreinigung','ferienwohnung-reinigung']);
// Gewerk-Klassen fuer die Voll-Print-Komposition der Hubs/Ortsseiten:
//  VOLL_VN   = echtes Vorher/Nachher-Material -> Slider + Heckenkompass + Schnittkalender
//  GARTEN    = Garten ohne V/N-Material -> kein Slider/Kompass, Ortskarten + Foto-Flow
//  REINIGUNG = Reinigungs-Gewerke -> beweisMechanik (Gegenlicht) statt Slider, kein Teleskop/Osmose
//  Rest      = generische Rich-Variante (Entruempelung/Umzug/Hausmeister/Objekt ...)
const VOLL_VN = new Set(['heckenschnitt']);
const GARTEN = new Set(['gartenpflege', 'winterdienst']);
const REINIGUNG = new Set(['fensterreinigung', 'steinreinigung', 'dachrinnenreinigung', 'photovoltaikreinigung', 'grundreinigung', 'gebaeudereinigung', 'unterhaltsreinigung', 'ferienwohnung-reinigung']);
const BEWEIS_KEY = { fensterreinigung: 'fensterreinigung', steinreinigung: 'steinreinigung', dachrinnenreinigung: 'dachrinnenreinigung' }; // eigene Beweis-Copy vorhanden
const gewerkClass = slug => VOLL_VN.has(slug) ? 'voll' : GARTEN.has(slug) ? 'garten' : REINIGUNG.has(slug) ? 'reinigung' : 'generisch';
const waGewerk = s => VOLL_VN.has(s.slug) ? 'meiner Hecke' : REINIGUNG.has(s.slug) ? `meiner Fläche für ${s.name}` : GARTEN.has(s.slug) ? 'meinem Garten' : `meinem Anliegen (${s.name})`;
const PREMIUM = new Set(['gross-glienicke','berlin-kladow','berlin-gatow']);
const sectionOT = new Set(Object.keys(ortsteileVon).filter(s => !PREMIUM.has(s)));
const launch = orte.filter(o => o.geo === 'A' || o.geo === 'B');
const haupt = launch.filter(o => !sectionOT.has(o.slug));
const segMatch = (s, o) => s.segment.some(x => o.typ.includes(x));
// b2b_only-Services (hausmeisterservice): raus aus Privatkunden-Kontexten → keine Ortsseiten, nicht in Orts-Hubs/Kernleistungen. Getragen von /fuer-hausverwaltungen/ + Footer-B2B-Block.
const orteForService = s => s.b2b_only ? [] : haupt.filter(o => s.orte_fix ? s.orte_fix.includes(o.slug) : segMatch(s, o));
const servicesForOrt = o => services.filter(s => PAGE_SVC.has(s.slug) && !s.b2b_only && (s.orte_fix ? s.orte_fix.includes(o.slug) : segMatch(s, o)));
// Service-scharfes Wellen-Gate: Ortsseiten/Ratgeber eines Service indexierbar erst wenn aktive_welle >= service.wave; wave null = globales Gate (<1). Rückwärtskompatibel: bei aktive_welle 0 bleibt ALLES noindex.
const svcWaveNoindex = s => (config.aktive_welle || 0) < (s && s.wave != null ? s.wave : 1);
const svcNoindexBySlug = slug => svcWaveNoindex(services.find(x => x.slug === slug));

// Welche Ortsseiten werden TATSÄCHLICH gerendert? (Manifest-First → Link-Graph geschlossen, keine 404)
const SAMPLE_ORTSSEITEN = [['heckenschnitt','falkensee'],['gartenpflege','berlin-kladow'],['steinreinigung','dallgow-doeberitz'],['fensterreinigung','nauen'],['entruempelung','wustermark'],['haushaltsaufloesung','brieselang'],['winterdienst','falkensee'],['dachreinigung','schoenwalde-glien'],['gebaeudereinigung','berlin-spandau'],['ferienwohnung-reinigung','werder-havel'],['dachrinnenreinigung','dallgow-doeberitz']];
const PAGE_ORTS = [];
for (const s of services) if (PAGE_SVC.has(s.slug)) for (const o of orteForService(s)) PAGE_ORTS.push([s.slug, o.slug]);
const genOrts = new Set((FULL ? PAGE_ORTS : SAMPLE_ORTSSEITEN).map(([a, b]) => a + '|' + b));
const hasOrt = (ss, os) => genOrts.has(ss + '|' + os);
// per-Archetyp Ort-Index → gleichmäßige Pool-Verteilung (eindeutige rahmen/trust-Tupel statt Seed-Kollisionen)
const archOrtIdx = {}; { const cnt = {}; for (const o of haupt) { const a = ((_orteCp && _orteCp.orte && _orteCp.orte[o.slug]) || {}).archetype || 'x'; archOrtIdx[o.slug] = (cnt[a] = (cnt[a] || 0) + 1) - 1; } }

const esc = t => (t == null ? '' : String(t)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
// sj: JSON-LD-String-Wert — rohes & (kein HTML-Escape), aber < -> < (kein </script>-Ausbruch) + JSON-escape
const sj = v => String(v == null ? '' : decEnt(v)).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/</g, '\\u003c').replace(/[\r\n\t]+/g, ' ');
const leaf = cls => `<svg class="${cls}" viewBox="0 0 100 100"><path fill="currentColor" d="M90 10C38 12 10 42 10 92c32-2 52-15 63-35 2 15-3 27-3 27s20-23 20-54c0-10-2-21 0-20Z"/></svg>`;
const tel = nap.phone_e164; const waHref = q => `https://wa.me/${tel.replace('+','')}?text=${encodeURIComponent(q)}`;
const ctaA = '<a class="btn btn-acc" href="/kontakt/#anfrage">Kostenlose Besichtigung anfragen</a>';
const ctaPrim = label => `<a class="btn btn-acc" href="/kontakt/#anfrage">${label}</a>`;
const CTA_ANGEBOT = 'Angebot für Ihr Objekt anfordern';
const isB2Bonly = seg => Array.isArray(seg) && seg.includes('B2B') && !seg.includes('B2C') && !seg.includes('Ferien');

// Token-Füllung für Archetyp-/Ortsseiten-Copy
const fillTok = (t, o, oc) => (t == null ? '' : String(t))
  .split('{ort}').join(o.name)
  .split('{plz}').join(o.plz || '')
  .split('{nachbarorte}').join(((oc && oc.nachbarorte) || []).join(', '));
// H1 mit genau einem kursiven Akzentwort
function emH1(h1, em) {
  const e = esc(h1 || '');
  if (!em) return e;
  const ee = esc(em);
  const i = e.indexOf(ee);
  return i < 0 ? e : e.slice(0, i) + '<em>' + ee + '</em>' + e.slice(i + ee.length);
}
// FAQ-Block (native details, KEIN FAQPage-Schema)
function faqBlock(faqs, alt) {
  if (!faqs || !faqs.length) return '';
  const items = faqs.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('');
  return `<section class="sec${alt ? ' section-alt' : ''}"><div class="wrap"><h2 class="serif rv" style="text-align:center;max-width:18em;margin:0 auto 28px">Häufige Fragen</h2><div class="faq rv">${items}</div></div></section>`;
}
// Title ≤60 / Meta 150–158 erzwingen — escape-aware (gemessen wird die gerenderte Länge mit &amp; etc.)
const rlen = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').length;
function clampTitle(s) { s = (s || '').replace(/\s+/g, ' ').trim(); while (rlen(s) > 60) { const sp = s.lastIndexOf(' '); if (sp < 30) { s = s.slice(0, s.length - 1); continue; } s = s.slice(0, sp); } return s.replace(/[ ,;:–-]+$/, ''); }
const META_TAIL = ' Ein fester Ansprechpartner im Havelland und Berliner Umland, telefonisch oder per WhatsApp erreichbar, mit kostenloser Vor-Ort-Besichtigung.';
const DANGLE = /\s+(per|und|mit|nach|für|im|in|zu|von|der|die|das|ein|eine|einen|am|an|auf|bei|als|wie|oder|aus|über|unter|vor|jetzt|noch|so|dem|den)$/i;
function mkMeta(s) {
  s = (s || '').replace(/\s+/g, ' ').trim();
  let t = rlen(s) < 150 ? s + META_TAIL : s;            // zu kurz → langen Tail anhängen
  while (rlen(t) > 158) { const sp = t.lastIndexOf(' '); if (sp < 110) break; t = t.slice(0, sp); }
  // bevorzugt an Klausel-/Satz-Grenze (Komma/Punkt im hinteren Drittel) kürzen → sauberes Ende
  const cl = Math.max(t.lastIndexOf(', '), t.lastIndexOf('. '));
  if (cl >= 150) t = t.slice(0, cl);
  t = t.replace(/[ ,;:.–-]+$/, '');
  while (DANGLE.test(t)) t = t.replace(DANGLE, '').replace(/[ ,;:.–-]+$/, '');
  return t + '.';
}
// deterministische Rotation (Uniqueness ohne Zufall)
const seedOf = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
function rotate(arr, seed, n) { if (!arr || !arr.length) return []; const out = []; const a = arr.slice(); const start = seed % a.length; for (let i = 0; i < Math.min(n, a.length); i++) out.push(a[(start + i) % a.length]); return out; }

// ---------- BILDER: Manifest + zentrale <picture>-Komponente (AVIF/WebP/Fallback, responsive) ----------
const IMG = JSON.parse(fs.readFileSync('assets/img/manifest.json', 'utf8'));
// pic(): <picture style="display:contents"> -> bestehende .main/.pic-CSS-Regeln greifen weiter aufs <img>. LCP-Bild: fetchpriority statt fehleranfälligem preload bei <picture>.
function pic(slug, { cls = '', alt = '', sizes = '100vw', lcp = false, decorative = false } = {}) {
  const m = IMG[slug];
  if (!m) return '';
  const ss = ext => m.widths.map(w => `/assets/img/${slug}-${w}.${ext} ${w}w`).join(', ');
  const sources = (m.avif ? `<source type="image/avif" srcset="${ss('avif')}" sizes="${sizes}">` : '') + `<source type="image/webp" srcset="${ss('webp')}" sizes="${sizes}">`;
  const aAttr = decorative ? 'alt="" role="presentation"' : `alt="${esc(alt)}"`;
  const lAttr = lcp ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"';
  return `<picture style="display:contents">${sources}<img${cls ? ` class="${cls}"` : ''} src="/assets/img/${slug}-${m.fb_w}.${m.fb_ext}" width="${m.w}" height="${m.h}" ${aAttr} ${lAttr}></picture>`;
}
const imgAbs = slug => { const m = IMG[slug]; return m ? `${DOMAIN}/assets/img/${slug}-${m.fb_w}.${m.fb_ext}` : ''; };
// Service -> Hero-Slug (Renovierung: Maler-Bild tabu -> neutraler Fassaden-Fallback)
const HERO_OVERRIDE = { renovierung: 'bg-fassade' };
const svcHero = slug => IMG[`svc-${slug}-hero`] ? `svc-${slug}-hero` : (HERO_OVERRIDE[slug] || 'bg-fassade');
// Ort -> regionaler Archetyp (c*) für "lokaler Kontext"-Bild
const ARCH_C2 = new Set(['berlin-kladow', 'berlin-gatow', 'gross-glienicke']);
const ARCH_C3 = new Set(['falkensee', 'dallgow-doeberitz', 'nauen', 'hennigsdorf', 'velten', 'hohen-neuendorf', 'birkenwerder', 'glienicke-nordbahn', 'kremmen', 'oranienburg', 'berlin-spandau', 'rathenow', 'premnitz']);
const ARCH_C6 = new Set(['ketzin', 'werder-havel', 'schwielowsee', 'phoeben', 'gross-kreutz', 'milower-land']);
const ortArchImg = o => 'region-' + (ARCH_C2.has(o.slug) ? 'villenvorort' : ARCH_C3.has(o.slug) ? 'kleinstadt' : ARCH_C6.has(o.slug) ? 'havel-umland' : 'brandenburg-gemeinde');
// Ratgeber -> Header-Bild (d*), sonst Service-Hero-Fallback
const RAT_IMG = { 'wann-hecke-schneiden': 'ratgeber-heckenschnitt-zeitpunkt', 'hecke-schneiden-erlaubt': 'ratgeber-heckenschnitt-zeitpunkt', 'heckenschnitt-kosten': 'ratgeber-heckenschnitt-zeitpunkt', 'entruempelung-kosten': 'ratgeber-entruempelung-kosten', 'was-kostet-entruempelung': 'ratgeber-entruempelung-kosten', 'haushaltsaufloesung-kosten': 'ratgeber-haushaltsaufloesung-checkliste', 'haushaltsaufloesung-checkliste': 'ratgeber-haushaltsaufloesung-checkliste', 'fensterreinigung-preise': 'ratgeber-fensterreinigung-preise', 'fenster-putzen-streifenfrei': 'ratgeber-fensterreinigung-preise', 'winterdienst-streupflicht-brandenburg': 'ratgeber-winterdienst-pflichten', 'winterdienst-kosten': 'ratgeber-winterdienst-pflichten', 'dachrinne-reinigen-kosten': 'ratgeber-dachrinne-herbst', 'dachrinne-reinigen-wie-oft': 'ratgeber-dachrinne-herbst', 'terrasse-reinigen': 'ratgeber-pflaster-gruenbelag', 'pflaster-reinigen': 'ratgeber-pflaster-gruenbelag', 'rasen-maehen-wie-oft': 'ratgeber-rasenpflege-kalender', 'rasen-vertikutieren-wann': 'ratgeber-rasenpflege-kalender', 'laub-entfernen-pflicht': 'ratgeber-rasenpflege-kalender', 'gartenpflege-kosten': 'ratgeber-rasenpflege-kalender', 'pv-reinigung-lohnt-sich': 'ratgeber-photovoltaik-reinigung', 'ferienwohnung-endreinigung-kosten': 'ratgeber-ferienwohnung-wechsel', 'umzug-checkliste': 'ratgeber-umzug-tipps' };
const ratHeaderImg = r => RAT_IMG[r.slug] || svcHero(r.cta_service);
// Saison-Hero Home: config.saison_monat überschreibt, sonst Build-Monat (Sommer -> Standard-Hero a1)
const HERO_HOME = (() => { const m = config.saison_monat || (new Date()).getMonth() + 1; if (m >= 3 && m <= 5) return IMG['hero-home-fruehjahr'] ? 'hero-home-fruehjahr' : 'hero-home'; if (m >= 9 && m <= 11) return IMG['hero-home-herbst'] ? 'hero-home-herbst' : 'hero-home'; if (m === 12 || m <= 2) return IMG['hero-home-winter'] ? 'hero-home-winter' : 'hero-home'; return 'hero-home'; })();
// Prozess-Sektion "So läuft es ab" (e1–e4)
const PROZESS = [['anfrage', 'Anfrage', 'Per Telefon oder WhatsApp kurz schildern, was ansteht — gern mit Fotos.'], ['besichtigung', 'Kostenlose Besichtigung', 'Wir kommen vorbei und nennen Ihnen einen Festpreis.'], ['ausfuehrung', 'Saubere Ausführung', 'Pünktlich und gründlich — wir räumen hinter uns auf.'], ['fotoabnahme', 'Foto-Nachweis', 'Vorher-/Nachher-Fotos aufs Handy nach jedem Auftrag.']];
function stepsSektion(alt) {
  const cards = PROZESS.map(([slug, t, d], i) => `<div class="step rv d${i + 1}"><div class="step-img">${pic('prozess-' + slug, { alt: t + ' — Haus- & Gartenservice Havelland', sizes: '(max-width:760px) 44vw, 210px' })}</div><h3><span class="sn">${i + 1}</span> ${esc(t)}</h3><p>${esc(d)}</p></div>`).join('');
  return `<section class="sec${alt ? ' section-alt' : ''}"><div class="wrap"><div class="head"><h2 class="serif rv">So läuft es ab</h2></div><div class="steps rv">${cards}</div></div></section>`;
}

const written = { hubs: [], ortsseiten: [], ortsseitenIdx: [], orts_hubs: [], ratgeber: [], ratgeberIdx: [], basis: [] };

const OH_DE = { Monday: 'Mo', Tuesday: 'Di', Wednesday: 'Mi', Thursday: 'Do', Friday: 'Fr', Saturday: 'Sa', Sunday: 'So' };
// Öffnungszeiten — Schema-Spec + kompakte deutsche Anzeige, Single-Source aus nap.openingHours
const ohSpecJson = (nap.openingHours || []).map(s => `{"@type":"OpeningHoursSpecification","dayOfWeek":[${s.dayOfWeek.map(d => `"${d}"`).join(',')}],"opens":"${s.opens}","closes":"${s.closes}"}`).join(',');
function ohDisplay() {
  const spec = nap.openingHours; if (!spec || !spec.length) return '';
  const hm = t => String(t).replace(':00', '').replace(/^0/, '');
  const parts = spec.map(s => { const d = s.dayOfWeek; const lbl = d.length > 1 ? `${OH_DE[d[0]]}–${OH_DE[d[d.length - 1]]}` : OH_DE[d[0]]; return `${lbl} ${hm(s.opens)}–${hm(s.closes)} Uhr`; });
  if (!spec.some(s => s.dayOfWeek.includes('Sunday'))) parts.push('So geschlossen');
  return parts.join(' · ');
}
function orgSchema() {
  const addr = nap.street ? `,"address":{"@type":"PostalAddress","streetAddress":"${sj(nap.street)}","postalCode":"${sj(nap.zip)}","addressLocality":"${sj(nap.city)}","addressCountry":"DE"}` : '';
  const geo = (nap.geo && nap.geo.lat != null) ? `,"geo":{"@type":"GeoCoordinates","latitude":${nap.geo.lat},"longitude":${nap.geo.lng}}` : '';
  const oh = ohSpecJson ? `,"openingHoursSpecification":[${ohSpecJson}]` : '';
  return `{"@type":"HomeAndConstructionBusiness","@id":"${DOMAIN}/#organization","name":"${sj(nap.name)}","telephone":"${tel}","url":"${DOMAIN}/","image":"${imgAbs('og-default')}","logo":"${DOMAIN}/assets/img/logo.png"${addr}${geo}${oh},"areaServed":${JSON.stringify(haupt.map(o => o.name))}}`;
}
function breadcrumb(items) { // [{name,url}]
  const li = items.map((it,i)=>`{"@type":"ListItem","position":${i+1},"name":"${sj(it.name)}"${it.url?`,"item":"${DOMAIN}${it.url}"`:''}}`).join(',');
  return `{"@type":"BreadcrumbList","itemListElement":[${li}]}`;
}

function head(title, desc, canonical, schemaGraph, opts = {}) {
  const ogSlug = (opts.og && IMG[opts.og]) ? opts.og : 'og-default';
  const om = IMG[ogSlug];
  const ogImg = om ? `<meta property="og:image" content="${DOMAIN}/assets/img/${ogSlug}-${om.fb_w}.${om.fb_ext}"><meta property="og:image:width" content="${om.w}"><meta property="og:image:height" content="${om.h}"><meta property="og:image:alt" content="${esc(title)}"><meta name="twitter:card" content="summary_large_image">` : '';
  return `<!doctype html><html lang="de"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${ANALYTICS_HEAD}
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">${opts.noindex ? '\n<meta name="robots" content="noindex, follow">' : ''}
<link rel="canonical" href="${DOMAIN}${canonical}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${DOMAIN}${canonical}"><meta property="og:type" content="website"><meta property="og:locale" content="de_DE">${ogImg}
<link rel="preload" href="/assets/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/fraunces-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/site.css?v=${ASSET_VER}">
<noscript><style>.rv{opacity:1;transform:none}</style></noscript>
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[${schemaGraph}]}</script>
</head><body>${ANALYTICS_BODY}`;
}
// Header — lock-v2: Logo + Site-Nav + Callpill (sichtbare Nummer) + Besichtigungs-CTA + Progress-Bar (#progress) + gate-sichere .hamb/#nvt/.navmenu-Mechanik
const PHONE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
const header = `<header><div class="wrap nav"><a class="logo" href="/"><img src="/assets/img/logo.png" alt="${esc(nap.name)}" width="180" height="50"></a><nav class="links nav-links" aria-label="Hauptnavigation"><a href="/leistungen/">Leistungen</a><a href="/standorte/">Standorte</a><a href="/ratgeber/">Ratgeber</a><a href="/ueber-uns/">Über uns</a><a href="/kontakt/">Kontakt</a></nav><a class="callpill" href="tel:${tel}">${PHONE_SVG}<span class="num">${esc(nap.phone_display)}</span></a><a class="cta nav-cta" href="/kontakt/">Kostenlose Besichtigung</a><input type="checkbox" id="nvt" class="nvt" aria-label="Menü öffnen und schließen"><label for="nvt" class="hamb" aria-hidden="true"><span></span><span></span><span></span></label><nav class="navmenu mnav" aria-label="Hauptmenü"><a href="/leistungen/">Leistungen</a><a href="/standorte/">Standorte</a><a href="/ratgeber/">Ratgeber</a><a href="/ueber-uns/">Über uns</a><a href="/bewertungen/">Bewertungen</a><a href="/fuer-hausverwaltungen/">Für Hausverwaltungen</a><a href="/kontakt/">Kontakt</a><a href="tel:${tel}">☎ ${esc(nap.phone_display)}</a><a class="btn btn-acc" href="/kontakt/">Kostenlose Besichtigung</a></nav></div><div class="progress" id="progress" aria-hidden="true"></div></header>`;
const sctaBar = waText => `<nav class="scta" aria-label="Schnellkontakt"><a class="call" href="tel:${tel}">☎ Anrufen</a><a class="wa" href="${waHref(waText)}">WhatsApp</a></nav>`;
const SCTA_DEFAULT = sctaBar('Hallo, ich hätte gern eine kostenlose Besichtigung.');
// Footer — lock-v2 fcols-Sitemap (hell): Leistungen A–H / H–W / Unternehmen (inkl. /fuer-hausverwaltungen/) + legal
const footer = `<footer><div class="wrap"><p class="fnap">${esc(nap.name)}</p><p>${esc(nap.street||'')}, ${esc(nap.zip||'')} ${esc(nap.city)} · <a href="tel:${tel}">${esc(nap.phone_display)}</a> · <a href="mailto:${esc(nap.email)}">${esc(nap.email)}</a>${ohDisplay()?`<br>${esc(ohDisplay())}`:''}</p><div class="fcols"><div><h4>Garten &amp; Reinigung</h4><ul><li><a href="/gartenpflege/">Gartenpflege</a></li><li><a href="/heckenschnitt/">Heckenschnitt</a></li><li><a href="/winterdienst/">Winterdienst</a></li><li><a href="/steinreinigung/">Steinreinigung</a></li><li><a href="/fensterreinigung/">Fensterreinigung</a></li><li><a href="/dachrinnenreinigung/">Dachrinnenreinigung</a></li><li><a href="/dachreinigung/">Dachreinigung</a></li></ul></div><div><h4>Entrümpelung &amp; Auflösung</h4><ul><li><a href="/entruempelung/">Entrümpelung</a></li><li><a href="/haushaltsaufloesung/">Haushaltsauflösung</a></li><li><a href="/grundreinigung/">Grundreinigung</a></li><li><a href="/ferienwohnung-reinigung/">Ferienwohnung-Reinigung</a></li></ul><h4 style="margin-top:22px">Für Gewerbe &amp; Hausverwaltungen</h4><ul><li><a href="/fuer-hausverwaltungen/">Für Hausverwaltungen</a></li><li><a href="/hausmeisterservice/">Hausmeisterservice</a></li><li><a href="/gebaeudereinigung/">Gebäudereinigung</a></li><li><a href="/unterhaltsreinigung/">Unterhaltsreinigung</a></li><li><a href="/objektbetreuung/">Objektbetreuung</a></li></ul></div><div><h4>Unternehmen</h4><ul><li><a href="/leistungen/">Alle Leistungen</a></li><li><a href="/standorte/">Standorte</a></li><li><a href="/ratgeber/">Ratgeber</a></li><li><a href="/ueber-uns/">Über uns</a></li><li><a href="/bewertungen/">Bewertungen</a></li><li><a href="/kontakt/">Kontakt</a></li></ul></div></div><div class="legal"><span>${esc(nap.name)} (${esc(nap.rechtsform||'GbR')})</span><a href="/impressum/">Impressum</a><a href="/datenschutz/">Datenschutz</a></div></div></footer>`;
const revealJS = `<script>const io=new IntersectionObserver(e=>e.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}}),{threshold:.12});document.querySelectorAll('.rv:not(.in)').forEach(el=>io.observe(el));</script><script src="/assets/js/site.js?v=${ASSET_VER}" defer></script>` + CONSENT_BANNER + TRACK_EVENTS;
const endBand = `<section class="zone-deep end">${leaf('leaf')}<div class="wrap"><h2 class="serif rv">Sagen Sie uns, was ansteht — wir kümmern uns.</h2><p class="rv d1">Kostenlose Besichtigung, Festpreis, dann erledigt.</p><div class="cta-row rv d2">${ctaA}<a class="btn btn-line" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a></div></div></section>`;
// Partner-/Tippgeber-Variante (Dach): kein eigener Festpreis — Besichtigung + Angebot über den Fachbetrieb, wir koordinieren.
const endBandPartner = `<section class="zone-deep end">${leaf('leaf')}<div class="wrap"><h2 class="serif rv">Sagen Sie uns, was am Dach ansteht — wir koordinieren.</h2><p class="rv d1">Kostenlose Besichtigung durch den geprüften Partner-Fachbetrieb — ein Ansprechpartner für Termin und Ablauf.</p><div class="cta-row rv d2">${ctaA}<a class="btn btn-line" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a></div></div></section>`;
// Dunkles Wert-Band (4 Werte) — auf Home + Übersichtsseiten wiederverwendet
const valueBand = `<section class="band">${leaf('leaf')}<div class="wrap"><p class="lead2 rv">Kein Suchen, kein Koordinieren, kein Risiko mit Fremden — <em>ein Anruf, alles erledigt.</em></p>
<div class="vals"><div class="v rv d1"><h4><span class="n">01</span> Aus einer Hand</h4><p>Garten, Reinigung, Winterdienst, Entrümpelung — ein Ansprechpartner für alles.</p></div><div class="v rv d2"><h4><span class="n">02</span> Nachweis statt Versprechen</h4><p>Foto-Dokumentation nach jedem Auftrag, direkt aufs Handy.</p></div><div class="v rv d3"><h4><span class="n">03</span> Festpreis</h4><p>Kostenlose Besichtigung, klarer Preis — kein Nachkommen.</p></div><div class="v rv d4"><h4><span class="n">04</span> Schnell erreichbar</h4><p>WhatsApp-Antwort in Stunden, nicht in Tagen.</p></div></div></div></section>`;

// Garantie-Strip (lock-v2 .gstrip) — feste 3-Zusagen-Leiste, markenübergreifend (Home + Hubs). Ohne Bild/Overlay-Label.
const gstrip = `<section class="gstrip" aria-label="Unsere drei Zusagen"><div class="wrap"><div class="gstrip-grid"><div class="gs rv"><span class="gn">01</span><div><h3>Festpreis ist Endpreis</h3><p>Nach der kostenlosen Besichtigung steht Ihr Preis — inklusive Abfuhr, ohne Nachforderung.</p></div></div><div class="gs rv d1"><span class="gn">02</span><div><h3>Foto-Nachweis</h3><p>Vorher-/Nachher-Fotos nach jedem Auftrag, direkt aufs Handy — auch wenn Sie nicht da waren.</p></div></div><div class="gs rv d2"><span class="gn">03</span><div><h3>Ein Ansprechpartner</h3><p>Vom ersten Anruf bis zur Abnahme feste Gesichter — kein Callcenter, keine Warteschleife.</p></div></div></div></div></section>`;
// Partner-/Tippgeber-Variante (Dach): keine Eigenleistungs- oder Festpreis-Zusage — Ausführung + Angebot beim geprüften Fachbetrieb, wir koordinieren.
const gstripPartner = `<section class="gstrip" aria-label="Unsere drei Zusagen"><div class="wrap"><div class="gstrip-grid"><div class="gs rv"><span class="gn">01</span><div><h3>Ein Ansprechpartner</h3><p>Von der Anfrage bis zur Abnahme koordinieren wir alles für Sie — Sie müssen nicht mehrere Dachbetriebe selbst vergleichen.</p></div></div><div class="gs rv d1"><span class="gn">02</span><div><h3>Geprüfter Partner-Fachbetrieb</h3><p>Die Arbeit am Dach übernimmt ein geprüfter Fachbetrieb mit passender Ausrüstung und Absicherung.</p></div></div><div class="gs rv d2"><span class="gn">03</span><div><h3>Angebot vom Fachbetrieb</h3><p>Nach der kostenlosen Besichtigung erstellt der ausführende Betrieb Ihr Angebot — transparent und unverbindlich.</p></div></div></div></div></section>`;

function write(url, html) {
  const dir = `website${url}`.replace(/\/$/, '');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${dir}/index.html`, html);
}

// ---------- HOME ----------
function home() {
  // Kernleistungen (Portfolio-Refokus 2026-07-22): 6 feste Einträge. Versprechen-Zeilen im Marken-Stil; Dach-Einträge (05/06) Tippgeber-konform — keine Eigenleistung, kein "ein Preis".
  const KERN = [
    { slug: 'heckenschnitt', label: 'Heckenschnitt', promise: 'Geradlinien-Garantie — bleiben Schnittreste liegen, kommen wir kostenlos nach.' },
    { slug: 'gartenpflege', label: 'Gartenpflege', promise: 'Fällt ein Termin ohne Vorankündigung aus, geht der nächste auf uns.' },
    { slug: 'fensterreinigung', label: 'Fensterreinigung', promise: 'Schlierenfrei — oder wir kommen am selben Tag noch einmal.' },
    { slug: 'entruempelung', label: 'Entrümpelung & Haushaltsauflösung', promise: 'Festpreis nach Besichtigung — besenrein zum vereinbarten Termin.' },
    { slug: 'dachrinnenreinigung', label: 'Dachrinnenreinigung', promise: 'Rinne frei vor dem Winter — Ausführung über geprüften Partner-Fachbetrieb, koordiniert von uns.' },
    { slug: 'dachreinigung', label: 'Dachreinigung', promise: 'Moos und Grünbelag vom Dach — Ausführung durch geprüften Partner-Fachbetrieb, wir koordinieren.' }
  ];
  const fokusCards = KERN.map((k, i) => `<a class="it rv d${i + 1}" href="/${k.slug}/"><span class="no">${String(i + 1).padStart(2, '0')}</span><div><h3>${esc(k.label)}</h3><p>${esc(k.promise)}</p></div><span class="arr">→</span></a>`).join('');
  const main = `
<section class="hero">${leaf('hleaf')}<div class="wrap grid">
<div><span class="kick rv in"><span class="dot"></span> ${esc(nap.city)} · Havelland</span>
<h1 class="rv in d1">Haus und Garten — <em>aus einer Hand</em> gepflegt.</h1>
<p class="lead rv in d2">Garten, Reinigung, Winterdienst, Entrümpelung. Ein fester Ansprechpartner, der zurückruft — Festpreis nach Besichtigung, Foto-Nachweis nach jedem Auftrag.</p>
<div class="cta-row rv in d3">${ctaA}<a class="btn btn-line" href="${waHref('Hallo, ich interessiere mich für Ihre Leistungen.')}">WhatsApp schreiben</a></div>
<div class="trust-row rv in d4"><div class="t"><b>Ein</b><span>fester Ansprechpartner</span></div><div class="t"><b>Festpreis</b><span>nach Besichtigung</span></div><div class="t"><b>Stunden</b><span>statt Tage bis zur Antwort</span></div></div></div>
<div class="shot rv in d2">${baSlider({ slug: '06-02-thuja-grenze', alt: 'Thuja-Hecke an der Grundstücksgrenze', cap: 'Thuja', sub: 'an der Grundstücksgrenze', hint: true, lcp: true })}</div>
</div></section>
${gstrip}
<section class="sec"><div class="wrap"><div class="head"><h2 class="serif rv">Unsere Kernleistungen</h2><a class="rv" href="/leistungen/">Alle Leistungen →</a></div><p class="intro rv">Sechs Leistungen, ein Ansprechpartner — vom regelmäßigen Garten bis zum besenreinen Keller.</p><div class="list">${fokusCards}</div></div></section>
<section class="sec section-alt"><div class="wrap">${jahreszeiten()}</div></section>
<section class="sec"><div class="wrap">${schnittkalender()}</div></section>
${heckenKompass()}
<section class="sec"><div class="wrap">${echtProjekt()}</div></section>
<section class="sec section-alt" id="galerie"><div class="wrap"><div class="head"><h2 class="serif rv">Echte Ergebnisse zum Durchziehen</h2></div><p class="intro rv">Ziehen Sie den Regler — jedes Bild ist ein dokumentierter Schnitt aus dem Havelland.</p>${karussell()}${archivGrid({ ctaHref: '/kontakt/#anfrage' })}</div></section>
<section class="sec"><div class="wrap">${whatsappFlow()}</div></section>
<section class="sec section-alt"><div class="wrap"><div class="head"><h2 class="serif rv">So läuft ein Auftrag</h2></div>${auftragsTimeline()}</div></section>
<section class="band">${leaf('leaf')}<div class="wrap"><p class="lead2 rv">Kein Suchen, kein Koordinieren, kein Risiko mit Fremden — <em>ein Anruf, alles erledigt.</em></p>${uspBand()}</div></section>
<section class="sec"><div class="wrap">${faqFilter()}</div></section>
${gebietskarte()}
${endBand}`;
  write('/', head('Haus- & Gartenservice in Falkensee & Havelland', mkMeta('Garten, Reinigung, Winterdienst und Entrümpelung im Havelland. Ein fester Ansprechpartner, Festpreis nach Besichtigung, Foto-Nachweis nach jedem Auftrag.'), '/', orgSchema()) + header + main + footer + SCTA_DEFAULT + revealJS + '</body></html>');
  written.basis.push('/');
}

// ---------- SERVICE-HUB ----------
function hub(s) {
  const url = `/${s.slug}/`;
  const c = hubCopy[s.slug];
  const orteList = orteForService(s);
  const cardOrte = orteList.filter(o => hasOrt(s.slug, o.slug)).slice(0, FULL ? 999 : 12);
  const cardSub = o => s.partner_modell ? `${esc(s.name)} in ${esc(o.name)} — koordiniert über einen geprüften Partner-Fachbetrieb.` : `${esc(s.name)} in ${esc(o.name)} — lokal, Festpreis, Foto-Nachweis.`;
  const cards = cardOrte.map(o => `<a class="card" href="/${s.slug}-${o.slug}/"><h3>${esc(s.name)} ${esc(o.name)}</h3><p>${cardSub(o)}</p><span class="go">Mehr →</span></a>`).join('');

  const h1 = c ? emH1(c.h1, c.h1_em) : `${esc(s.name)} <em>im Havelland</em>`;
  const lead = c ? esc(c.intro) : esc(s.garantie || 'Festpreis nach Besichtigung, Foto-Nachweis nach jedem Auftrag.');
  const sektionenHtml = c
    ? (c.sections || []).map(x => `<h3>${esc(x.h3)}</h3><p>${esc(x.body)}</p>`).join('')
    : (s.sektionen || []).map(x => `<h3>${esc(x)}</h3><p>${esc(x)} als Teil unserer ${esc(s.name)} — sauber ausgeführt, mit Foto-Nachweis.</p>`).join('');
  const definition = c && c.definition ? `<p class="lead-p"><strong>${esc(c.definition)}</strong></p>` : '';
  const naehe = c && c.naehe ? `<h3>${esc(s.name)} in Ihrer Nähe</h3><p>${esc(c.naehe)}</p>` : '';
  const ablauf = c && c.ablauf ? `<h3>So läuft es ab</h3><p>${esc(c.ablauf)}</p>` : '';
  const garantieTxt = c && c.garantie_text ? c.garantie_text : (s.garantie || 'Kostenlose Besichtigung, danach ein Festpreis als Endpreis.');

  const title = clampTitle(c && c.title ? c.title : `${s.name} im Havelland — ${nap.name}`);
  const meta = mkMeta(c && c.meta ? c.meta : `${s.name} im Havelland und Falkensee: Festpreis nach Besichtigung, Foto-Nachweis, ein fester Ansprechpartner.`);

  const schema = `${orgSchema()},{"@type":"Service","@id":"${DOMAIN}${url}#service","name":"${sj(s.name)}","serviceType":"${sj(s.name)}","image":"${imgAbs(svcHero(s.slug))}","provider":{"@id":"${DOMAIN}/#organization"},"areaServed":${JSON.stringify(orteList.map(o=>o.name))}},${breadcrumb([{name:'Start',url:'/'},{name:s.name,url}])}`;

  // ---- Gewerk-abhaengige Voll-Print-Komposition ----
  const gk = gewerkClass(s.slug);
  const heroShot = gk === 'voll'
    ? baSlider({ slug: '06-02-thuja-grenze', alt: s.name + ' im Havelland', cap: 'Thuja', sub: 'an der Grundstücksgrenze', hint: true, lcp: true })
    : pic(svcHero(s.slug), { cls: 'main', alt: s.name + ' im Havelland — Haus- & Gartenservice Havelland', sizes: '(max-width:900px) 92vw, 60vw', lcp: true });
  const faqData = (c && c.faqs && c.faqs.length) ? c.faqs : null;   // sonst faqFilter-Default
  const flowBlock = `<section class="sec"><div class="wrap">${whatsappFlow({ gewerk: waGewerk(s), partner: !!s.partner_modell })}</div></section>`;
  const timelineBlock = `<section class="sec section-alt"><div class="wrap"><div class="head"><h2 class="serif rv">So läuft ein Auftrag</h2></div>${auftragsTimeline(!!s.partner_modell)}</div></section>`;
  const faqSection = `<section class="sec"><div class="wrap">${faqFilter(faqData)}</div></section>`;
  const cardOrteSection = cardOrte.length ? `<section class="sec section-alt"><div class="wrap"><div class="head"><h2 class="serif rv">${esc(s.name)} in Ihrem Ort</h2></div><div class="cards rv">${cards}</div></div></section>` : '';
  const ratgeberSection = (ratgeberByService[s.slug] || []).length ? `<section class="sec"><div class="wrap"><div class="head"><h2 class="serif rv">Ratgeber rund um ${esc(s.name)}</h2><a class="rv" href="/ratgeber/">Alle Ratgeber →</a></div><div class="cards rv">${(ratgeberByService[s.slug] || []).slice(0, 3).map(r => `<a class="card" href="/ratgeber/${r.slug}/"><h3>${esc(r.title)}</h3><p>${esc(r.lead || '')}</p><span class="go">Lesen →</span></a>`).join('')}</div></div></section>` : '';
  let rich;
  if (gk === 'voll') {
    rich =
      `<section class="sec"><div class="wrap">${schnittkalender()}</div></section>` +
      heckenKompass() +
      `<section class="sec"><div class="wrap">${echtProjekt()}</div></section>` +
      `<section class="sec section-alt" id="galerie"><div class="wrap"><div class="head"><h2 class="serif rv">Ergebnisse zum Durchziehen</h2></div>${karussell()}${archivGrid({ ctaHref: '/kontakt/#anfrage' })}</div></section>` +
      flowBlock + timelineBlock + faqSection + cardOrteSection + gebietskarte() + ratgeberSection;
  } else {
    // Beweis-Mechanik (eigene Vorher/Nachher-Doku) NICHT bei Partner-/Tippgeber-Services (Dach) — wäre Eigenleistungs-Beweis (Design §3).
    const beweis = (gk === 'reinigung' && BEWEIS_KEY[s.slug] && !s.partner_modell)
      ? `<section class="sec"><div class="wrap"><div class="head"><h2 class="serif rv">Woran Sie ein sauberes Ergebnis erkennen</h2></div>${beweisMechanik(BEWEIS_KEY[s.slug])}</div></section>`
      : '';
    // Garten/Generisch: mit Ortskarten; Reinigung: ohne Gebietskarte, Ortskarten bleiben (interne Links)
    rich = beweis + flowBlock + timelineBlock + faqSection + cardOrteSection + ratgeberSection;
  }

  // b2b_only-Hub (hausmeisterservice): Querverlinkung zu /fuer-hausverwaltungen/ (Design §2 — beide Richtungen)
  const b2bCross = s.b2b_only ? `<section class="sec section-alt"><div class="wrap"><div class="prose wide rv"><h2>${esc(s.name)} für Hausverwaltungen &amp; Gewerbe</h2><p>${esc(s.name)} bieten wir im Havelland vor allem für Hausverwaltungen, WEG und Gewerbeobjekte an — mit festem Ansprechpartner, schriftlichem Angebot und Foto-Reporting nach jedem Einsatz. Den vollständigen Überblick über unser Objekt-Angebot finden Sie unter <a href="/fuer-hausverwaltungen/">Für Hausverwaltungen &amp; Gewerbe</a>.</p></div></div></section>` : '';
  // Optionale Copy-Blöcke (H2 + Fließtext, optionale Service-Querverlinkung): Wohnungsauflösungs-H2 + Kannibalisierungs-Firewall Entrümpelung↔Haushaltsauflösung (Design §4). Nur Hubs mit copy.blocks; sonst ''.
  const extraBlocks = (c && Array.isArray(c.blocks) ? c.blocks : []).map((b, i) =>
    `<section class="sec${i % 2 ? '' : ' section-alt'}"><div class="wrap"><div class="prose wide rv"><h2>${esc(b.h2)}</h2><p>${esc(b.body)}${b.link_to ? ` <a href="/${esc(b.link_to)}/">${esc(b.link_text || 'Mehr erfahren')}</a>.` : ''}</p></div></div></section>`).join('');
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>${esc(s.name)}</div>
<section class="phero">${leaf('hleaf')}<div class="wrap grid"><div><span class="kick rv in" style="color:var(--green)">Leistung</span><h1 class="rv in d1">${h1}</h1><p class="lead rv in d2">${lead}</p><div class="cta-row rv in d3">${ctaPrim((isB2Bonly(s.segment) || s.b2b_only) ? CTA_ANGEBOT : 'Kostenlose Besichtigung anfragen')}<a class="btn btn-line" href="${waHref(`Hallo, ich interessiere mich für ${s.name}.`)}">WhatsApp</a><a class="btn btn-line" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a></div></div>
<div class="shot rv in d2">${heroShot}</div></div></section>
${s.partner_modell ? gstripPartner : gstrip}
<section class="sec"><div class="wrap"><div class="prose wide rv">${definition}<h2>${esc(s.name)} im Havelland — was dazugehört</h2>${sektionenHtml}${naehe}${ablauf}<h3>${s.garantie ? 'Unsere Garantie' : 'Unser Versprechen'}</h3><p>${esc(garantieTxt)}</p></div></div></section>
${IMG['svc-' + s.slug + '-detail'] ? `<section class="sec" style="padding-top:0"><div class="wrap"><div class="media-band rv">${pic('svc-' + s.slug + '-detail', { alt: s.name + ' im Detail — Haus- & Gartenservice Havelland', sizes: '(max-width:1100px) 92vw, 1040px' })}</div></div></section>` : ''}
${extraBlocks}
${rich}
${b2bCross}
${s.partner_modell ? endBandPartner : endBand}`;
  write(url, head(title, meta, url, schema) + header + main + footer + sctaBar(`Hallo, ich interessiere mich für ${s.name} im Havelland.`) + revealJS + '</body></html>');
  written.hubs.push(url);
}

// ---------- ORTSSEITE ----------
function ortsseite(s, o) {
  const url = `/${s.slug}-${o.slug}/`;
  const c = hubCopy[s.slug];
  const oc = orteCopy[o.slug];
  const arch = oc ? archCopy[oc.archetype] : null;
  const seed = seedOf(url);
  const nachbarn = orteForService(s).filter(x => x.slug !== o.slug && hasOrt(s.slug, x.slug));
  const nahCards = rotate(nachbarn, seed, 4);

  const place = `{"@type":"Place","name":"${sj(o.name)}"${o.plz?`,"address":{"@type":"PostalAddress","postalCode":"${sj(o.plz)}","addressLocality":"${sj(o.name)}","addressCountry":"DE"}`:''}}`;
  const schema = `${orgSchema()},{"@type":"Service","@id":"${DOMAIN}${url}#service","name":"${sj(s.name)} ${sj(o.name)}","serviceType":"${sj(s.name)}","image":"${imgAbs(svcHero(s.slug))}","provider":{"@id":"${DOMAIN}/#organization"},"areaServed":${place}},${breadcrumb([{name:'Start',url:'/'},{name:s.name,url:`/${s.slug}/`},{name:o.name,url}])}`;

  // Body aus Copy-Schicht (mit Fallback) — Archetyp-Bausteine aus POOLS per Seed (Near-Duplicate-Reduktion)
  const pickPool = (arr, i) => Array.isArray(arr) && arr.length ? arr[((i % arr.length) + arr.length) % arr.length] : (typeof arr === 'string' ? arr : '');
  const idx = archOrtIdx[o.slug] || 0;
  const rLen = arch && Array.isArray(arch.rahmen) ? arch.rahmen.length : 1;
  // Welle-1a: bespoke Service×Ort-Copy (falls vorhanden) hat Vorrang vor Archetyp/Ort-Hook
  const so = ortsSvcCopy[s.slug] || null;
  const soOrt = (so && so.orte && so.orte[o.slug]) || null;
  const lead = c && c.ortsseite_lead ? fillTok(c.ortsseite_lead, o, oc) : `Ihr ${s.name} in ${o.name} — vom Haus- & Gartenservice Havelland.`;
  const hookSrc = soOrt && soOrt.hook ? soOrt.hook : (oc && oc.hook ? oc.hook : '');
  const hook = hookSrc ? `<p>${esc(fillTok(hookSrc, o, oc))}</p>` : '';
  const rahmenTxt = soOrt && soOrt.rahmen ? soOrt.rahmen : pickPool(arch && arch.rahmen, idx);   // eindeutige Verteilung
  const trustTxt = soOrt && soOrt.trust ? soOrt.trust : pickPool(arch && arch.trust, Math.floor(idx / rLen));  // -> (rahmen,trust)-Tupel eindeutig je Archetyp-Ort
  const rahmen = rahmenTxt ? `<p>${esc(fillTok(rahmenTxt, o, oc))}</p>` : '';
  const sektionen = (s.sektionen || []).map(x => `<li>${esc(x)}</li>`).join('');
  const ortsteile = (o.ortsteile && o.ortsteile.length) ? `<p>Auch in ${esc(o.ortsteile.join(', '))} und Umgebung sind wir für Sie da.</p>` : '';
  const trust = trustTxt ? `<p>${esc(fillTok(trustTxt, o, oc))}</p>` : `<p>Kostenlose Besichtigung, danach ein Festpreis ohne Nachkommen — und nach dem Auftrag Vorher/Nachher-Fotos per WhatsApp.</p>`;

  // FAQ: bespoke Service-Ort-Pool (falls vorhanden) ersetzt Archetyp-FAQ UND Hub-FAQ auf der Ortsseite (volle Compliance-Kontrolle, u.a. Dach-Partner-Framing); sonst 2 Archetyp-FAQ + 2 Hub-FAQ wie bisher
  const _faqPool = so && so.faqs ? so.faqs : (arch && arch.faqs);
  const archFaqs = _faqPool ? rotate(_faqPool, idx, 2).map(f => ({ q: fillTok(f.q, o, oc), a: fillTok(f.a, o, oc) })) : [];
  const hubFaqs = (so && so.faqs) ? [] : (c && c.faqs ? rotate(c.faqs.filter(f => !f.hub_only), idx + 1, archFaqs.length ? 2 : 4) : []);
  const faqs = [...archFaqs, ...hubFaqs];
  const ortRatPool = ratgeberByService[s.slug] || [];
  const ortRat = ortRatPool.length ? ortRatPool[idx % ortRatPool.length] : null;
  const ortRatLink = ortRat ? `<p>Mehr zum Thema lesen Sie in unserem Ratgeber: <a href="/ratgeber/${ortRat.slug}/">${esc(ortRat.title)}</a>.</p>` : '';

  const title = clampTitle(`${s.name} ${o.name}${(s.name.length + o.name.length) < 34 ? ' – Havelland' : ''}`);
  const meta = mkMeta(so && so.meta ? fillTok(so.meta, o, oc) : `${s.name} in ${o.name}${o.plz?` (${o.plz})`:''} vom Haus- & Gartenservice Havelland: Festpreis nach kostenloser Besichtigung und Foto-Nachweis nach jedem Auftrag.`);

  // Heckenschnitt-Ort: Vorher/Nachher-Slider im Hero; andere Gewerke: Standard-Bild (kein Slider)
  const ortVoll = VOLL_VN.has(s.slug);
  const heroShotO = ortVoll
    ? baSlider({ slug: '06-02-thuja-grenze', alt: s.name + ' in ' + o.name, cap: 'Thuja', sub: 'in ' + o.name + ' geschnitten', hint: true, lcp: true })
    : pic(svcHero(s.slug), { cls: 'main', alt: s.name + ' in ' + o.name + ' — Haus- & Gartenservice Havelland', sizes: '(max-width:900px) 92vw, 60vw', lcp: true });
  const nachbarSection = `<section class="sec section-alt"><div class="wrap"><div class="head"><h2 class="serif rv">${esc(s.name)} in der Nähe</h2></div><div class="cards rv">${nahCards.map(n=>`<a class="card" href="/${s.slug}-${n.slug}/"><h3>${esc(s.name)} ${esc(n.name)}</h3><span class="go">Mehr →</span></a>`).join('')}${servicesForOrt(o).length>=3?`<a class="card" href="/standorte/${o.slug}/"><h3>Alle Leistungen in ${esc(o.name)}</h3><span class="go">Zum Ort →</span></a>`:`<a class="card" href="/${s.slug}/"><h3>Mehr zu ${esc(s.name)}</h3><span class="go">Zur Leistung →</span></a>`}</div></div></section>`;
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span><a href="/${s.slug}/">${esc(s.name)}</a><span class="sep">›</span>${esc(o.name)}</div>
<section class="phero">${leaf('hleaf')}<div class="wrap grid"><div><span class="kick rv in" style="color:var(--green)">${esc(o.name)}${o.plz?` · ${esc(o.plz)}`:''}</span><h1 class="rv in d1">${esc(s.name)} <em>in ${esc(o.name)}</em></h1><p class="lead rv in d2">${esc(lead)}</p><div class="cta-row rv in d3">${ctaPrim((isB2Bonly(s.segment) || isB2Bonly(o.typ)) ? CTA_ANGEBOT : 'Kostenlose Besichtigung anfragen')}<a class="btn btn-line" href="${waHref(`Hallo, ich brauche ${s.name} in ${o.name}.`)}">WhatsApp</a></div></div>
<div class="shot rv in d2">${heroShotO}</div></div></section>
${s.partner_modell ? gstripPartner : gstrip}
<section class="sec"><div class="wrap"><div class="prose wide rv"><h2>${esc(s.name)} in ${esc(o.name)} — zuverlässig &amp; lokal</h2>${hook}${rahmen}${sektionen?`<h3>Was dazugehört</h3><ul>${sektionen}</ul>`:''}${ortsteile}<h3>${s.partner_modell ? 'Ein Ansprechpartner, ein koordinierter Ablauf' : 'Festpreis &amp; Foto-Nachweis'}</h3>${trust}${ortRatLink}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="media-band rv">${pic(ortArchImg(o), { alt: 'Haus- & Gartenservice in ' + o.name + ' und Umgebung', sizes: '(max-width:1100px) 92vw, 1040px' })}</div></div></section>
<section class="sec"><div class="wrap">${whatsappFlow({ gewerk: waGewerk(s), ort: o.name, partner: !!s.partner_modell })}</div></section>
<section class="sec section-alt"><div class="wrap">${faqFilter(faqs.length ? faqs : null)}</div></section>
${nachbarSection}
${s.partner_modell ? endBandPartner : endBand}`;
  const ni = svcWaveNoindex(s);
  write(url, head(title, meta, url, schema, { noindex: ni }) + header + main + footer + sctaBar(`Hallo, ich brauche ${s.name} in ${o.name}.`) + revealJS + '</body></html>');
  written.ortsseiten.push(url); if (!ni) written.ortsseitenIdx.push(url);
}

// ---------- ORTS-HUB ----------
function ortsHub(o) {
  const svcs = servicesForOrt(o);
  if (svcs.length < 3) return;
  const url = `/standorte/${o.slug}/`;
  const oc = orteCopy[o.slug];
  const teile = (ortsteileVon ? Object.entries(ortsteileVon).filter(([,p]) => p === o.name).map(([s]) => s) : []);
  const cards = svcs.map((s,i) => { const tgt = hasOrt(s.slug, o.slug) ? `/${s.slug}-${o.slug}/` : `/${s.slug}/`; return `<a class="card" href="${tgt}"><span class="n">${String(i+1).padStart(2,'0')}</span><h3>${esc(s.name)}</h3><p>${esc(s.name)} in ${esc(o.name)}.</p><span class="go">Mehr →</span></a>`; }).join('');
  const schema = `${orgSchema()},{"@type":"CollectionPage","@id":"${DOMAIN}${url}#page","name":"Haus- & Gartenservice in ${esc(o.name)}","about":{"@id":"${DOMAIN}/#organization"}},${breadcrumb([{name:'Start',url:'/'},{name:'Standorte',url:'/standorte/'},{name:o.name,url}])}`;
  const intro = oc && oc.hook ? `<p class="lead rv in d2">${esc(oc.hook)}</p>` : `<p class="lead rv in d2">Alle Leistungen rund um Haus und Garten in ${esc(o.name)}${o.plz?` (${esc(o.plz)})`:''} — von einem festen Ansprechpartner.</p>`;
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span><a href="/standorte/">Standorte</a><span class="sep">›</span>${esc(o.name)}</div>
<section class="phero">${leaf('hleaf')}<div class="wrap"><span class="kick rv in" style="color:var(--green)">Standort</span><h1 class="rv in d1" style="max-width:14em">Haus- &amp; Gartenservice <em>in ${esc(o.name)}</em></h1>${intro}<div class="cta-row rv in d3">${ctaA}</div>${trustBadges()}</div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="media-band rv">${pic(ortArchImg(o), { alt: 'Haus- & Gartenservice in ' + o.name, sizes: '(max-width:1100px) 92vw, 1040px' })}</div></div></section>
<section class="sec"><div class="wrap"><div class="head"><h2 class="serif rv">Unsere Leistungen in ${esc(o.name)}</h2></div><div class="cards rv">${cards}</div>${teile.length?`<p class="intro rv" style="margin-top:30px">Auch in ${esc(teile.join(', '))} und Umgebung.</p>`:''}</div></section>
${gstrip}
<section class="sec"><div class="wrap">${whatsappFlow({ ort: o.name, gewerk: 'meinem Anliegen' })}</div></section>
${gebietskarte({ activeSlug: o.slug })}
${endBand}`;
  write(url, head(clampTitle(`Haus- & Gartenservice ${o.name}`), mkMeta(`Haus- & Gartenservice in ${o.name}${o.plz?` (${o.plz})`:''}: Garten, Reinigung, Winterdienst, Entrümpelung von einem festen Ansprechpartner.`), url, schema, { noindex: (config.aktive_welle || 0) < 1 }) + header + main + footer + SCTA_DEFAULT + revealJS + '</body></html>');
  written.orts_hubs.push(url);
}

// ---------- RATGEBER ----------
// Fallback-Artikel falls Copy-Schicht (ratgeber.json) fehlt
const RATGEBER_FALLBACK = [
  { slug:'wann-hecke-schneiden', title:'Wann darf man die Hecke schneiden?', lead:'Schnittzeiten, Naturschutz und Praxis-Tipps fürs Havelland.', sections:[{h2:'Die wichtigsten Schnittzeiten', body_html:'<p>Radikale Heckenschnitte sind von <strong>1. März bis 30. September</strong> nur eingeschränkt erlaubt (Bundesnaturschutzgesetz §39), um brütende Vögel zu schützen. Form- und Pflegeschnitte bleiben ganzjährig möglich.</p>'}], faqs:[], cta_service:'heckenschnitt', cta_text:'Hecke schneiden lassen' },
];
function ratgeberPage(r) {
  const url = `/ratgeber/${r.slug}/`;
  const svc = services.find(s => s.slug === r.cta_service) || {};
  const sameSvc = (ratgeberByService[r.cta_service] || []).filter(x => x.slug !== r.slug);
  const others = ratCopy.filter(x => x.cta_service !== r.cta_service && x.slug !== r.slug);
  const related = [...sameSvc, ...rotate(others, seedOf(r.slug), 3)].slice(0, 3);
  // CTA-Pitch: nachgestellte Kontakt-Imperative ("Sprechen Sie … an / rufen Sie an: NR") strippen — die werden zu echten Buttons
  const ctaPitch = String(r.cta_text || `${svc.name || 'Diese Leistung'} im Havelland — kostenlose Besichtigung, Festpreis, Foto-Doku nach dem Auftrag.`)
    .replace(/\s*(Sprechen Sie|Rufen Sie|rufen Sie|Schreiben Sie|Melden Sie sich)[^.!?]*[.!?]?\s*$/, '').trim();
  const ctaWa = waHref(`Hallo, ich interessiere mich für ${svc.name || 'Ihre Leistungen'}${svc.name ? '' : ''}.`);
  const bodyHtml = (r.sections || []).map(x => `<h2>${esc(x.h2)}</h2>${x.body_html || ''}`).join('');
  // AEO-Direktantwort oben (aus intro); Hecken-Zeitpunkt-Ratgeber bekommen zusaetzlich den Schnittkalender
  const KAL_RATGEBER = new Set(['wann-hecke-schneiden', 'hecke-schneiden-erlaubt']);
  const kalEmbed = KAL_RATGEBER.has(r.slug) ? `<section class="sec section-alt"><div class="wrap">${schnittkalender()}</div></section>` : '';
  const faqSection = (r.faqs && r.faqs.length) ? `<section class="sec"><div class="wrap">${faqFilter(r.faqs)}</div></section>` : '';
  const schema = `${orgSchema()},{"@type":"Article","@id":"${DOMAIN}${url}#article","headline":"${esc(r.title)}","image":"${imgAbs(ratHeaderImg(r))}","inLanguage":"de","author":{"@id":"${DOMAIN}/#organization"},"publisher":{"@id":"${DOMAIN}/#organization"},"mainEntityOfPage":"${DOMAIN}${url}"},${breadcrumb([{name:'Start',url:'/'},{name:'Ratgeber',url:'/ratgeber/'},{name:r.title,url}])}`;
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span><a href="/ratgeber/">Ratgeber</a><span class="sep">›</span>${esc(r.title)}</div>
<section class="phero" style="border-bottom:none;padding-bottom:20px"><div class="wrap"><span class="kick rv in" style="color:var(--green)">Ratgeber</span><h1 class="rv in d1" style="max-width:16em">${esc(r.title)}</h1><p class="lead rv in d2">${esc(r.lead)}</p></div></section>
<section class="sec" style="padding:14px 0 0"><div class="wrap"><div class="media-band rv">${pic(ratHeaderImg(r), { alt: r.title + ' — Ratgeber Haus- & Gartenservice Havelland', sizes: '(max-width:1100px) 92vw, 1040px', lcp: true })}</div></div></section>
<section class="sec" style="padding-top:20px"><div class="wrap"><div class="prose rv">${aeoKapsel(r.intro)}${bodyHtml}</div></div></section>
${kalEmbed}
${faqSection}
<section class="sec section-alt"><div class="wrap center"><h2 class="serif rv">Lieber machen lassen?</h2><p class="rv d1" style="max-width:44em;margin-inline:auto">${esc(ctaPitch)}</p><div class="cta-row rv d2"><a class="btn btn-acc" href="/kontakt/#anfrage">Kostenlose Besichtigung anfragen</a><a class="btn btn-line" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a><a class="btn btn-line" href="${ctaWa}">WhatsApp</a></div>${svc.name?`<p class="rv d3" style="margin-top:14px;font-size:.92rem"><a href="/${r.cta_service}/">Mehr zu ${esc(svc.name)} im Havelland →</a></p>`:''}</div></section>
${related.length ? `<section class="sec"><div class="wrap"><div class="head"><h2 class="serif rv">Das könnte Sie auch interessieren</h2><a class="rv" href="/ratgeber/">Alle Ratgeber →</a></div><div class="cards rv">${related.map(x=>`<a class="card" href="/ratgeber/${x.slug}/"><h3>${esc(x.title)}</h3><p>${esc(x.lead||'')}</p><span class="go">Lesen →</span></a>`).join('')}</div></div></section>` : ''}
${endBand}`;
  const ni = svcNoindexBySlug(r.cta_service);
  write(url, head(clampTitle(r.title), mkMeta(r.meta || r.lead), url, schema, { noindex: ni }) + header + main + footer + SCTA_DEFAULT + revealJS + '</body></html>');
  written.ratgeber.push(url); if (!ni) written.ratgeberIdx.push(url);
}

// ---------- BASIS: Leistungen / Standorte / Ratgeber-Index / Kontakt / Recht ----------
function listingPage(url, title, intro, cardsHtml, schema) {
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>${esc(title)}</div>
<section class="phero" style="padding-bottom:24px"><div class="wrap"><h1 class="rv in d1">${esc(title)}</h1><p class="lead rv in d2">${esc(intro)}</p></div></section>
<section class="sec" style="padding-top:24px"><div class="wrap"><div class="cards rv">${cardsHtml}</div></div></section>${endBand}`;
  write(url, head(clampTitle(`${title} — ${nap.name}`), mkMeta(`${intro} ${nap.name} im Havelland und Berliner Umland.`), url, schema) + header + main + footer + SCTA_DEFAULT + revealJS + '</body></html>');
  written.basis.push(url);
}
// Eyebrow (Nummer + Label) für gruppierte Übersichts-Sektionen
const catHead = (n, label) => `<div class="cat rv"><span class="cat-n">${String(n).padStart(2, '0')}</span><h2 class="serif">${esc(label)}</h2></div>`;

// ---------- ÜBERSICHT: /leistungen/ (Themen-Blöcke) ----------
function leistungenPage() {
  const url = '/leistungen/';
  const bySlug = Object.fromEntries(services.map(s => [s.slug, s]));
  const seen = new Set();
  const ordered = [];   // für ItemList-Schema in Anzeige-Reihenfolge
  const blocks = [];
  let n = 0;
  const renderCards = svcs => svcs.map(s => {
    ordered.push(s);
    const desc = (s.sektionen || []).slice(0, 4).join(' · ') || s.garantie || 'Festpreis nach Besichtigung.';
    return `<a class="card" href="/${s.slug}/"><h3>${esc(s.name)}</h3><p>${esc(desc)}</p><span class="go">Mehr →</span></a>`;
  }).join('');
  for (const cat of LEISTUNGEN_KATEGORIEN) {
    const svcs = cat.slugs.map(sl => bySlug[sl]).filter(Boolean);
    if (!svcs.length) continue;
    svcs.forEach(s => seen.add(s.slug));
    n++;
    const intro = uebL.kategorien && uebL.kategorien[cat.key] ? `<p class="intro rv">${esc(uebL.kategorien[cat.key])}</p>` : '';
    blocks.push(`<section class="sec${n % 2 === 0 ? ' section-alt' : ''}" style="padding:64px 0"><div class="wrap">${catHead(n, cat.label)}${intro}<div class="cards rv">${renderCards(svcs)}</div></div></section>`);
  }
  const rest = services.filter(s => !seen.has(s.slug));   // Schutz: künftige Services ohne Kategorie
  if (rest.length) { n++; blocks.push(`<section class="sec${n % 2 === 0 ? ' section-alt' : ''}" style="padding:64px 0"><div class="wrap">${catHead(n, 'Weitere Leistungen')}<div class="cards rv">${renderCards(rest)}</div></div></section>`); }

  const lead = uebL.lead || 'Alles rund um Haus und Garten im Havelland — aus einer Hand.';
  const introProse = uebL.intro ? `<section class="sec" style="padding:44px 0 0"><div class="wrap"><div class="prose wide rv"><p>${esc(uebL.intro)}</p></div></div></section>` : '';
  const items = ordered.map((s, i) => `{"@type":"ListItem","position":${i + 1},"name":"${sj(s.name)}","item":"${DOMAIN}/${s.slug}/"}`).join(',');
  const schema = `${orgSchema()},{"@type":"CollectionPage","@id":"${DOMAIN}${url}#page","name":"Unsere Leistungen","about":{"@id":"${DOMAIN}/#organization"}},{"@type":"ItemList","@id":"${DOMAIN}${url}#leistungen","name":"Leistungen im Havelland","itemListElement":[${items}]},${breadcrumb([{ name: 'Start', url: '/' }, { name: 'Leistungen', url }])}`;
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>Leistungen</div>
<section class="phero" style="padding-bottom:24px"><div class="wrap"><span class="kick rv in" style="color:var(--green)">Leistungen</span><h1 class="rv in d1">Unsere Leistungen</h1><p class="lead rv in d2">${esc(lead)}</p><div class="cta-row rv in d3">${ctaA}<a class="btn btn-line" href="${waHref('Hallo, ich interessiere mich für Ihre Leistungen.')}">WhatsApp</a></div></div></section>
<section class="sec" style="padding:28px 0 0"><div class="wrap"><div class="media-band rv">${pic('leistungen-band', { alt: 'Das Team des Haus- & Gartenservice Havelland lädt Werkzeug aus dem Firmenwagen', sizes: '(max-width:1100px) 92vw, 1040px' })}</div></div></section>
${introProse}
${blocks.join('\n')}
${stepsSektion(n % 2 !== 0)}
${valueBand}
${faqBlock(uebL.faqs)}
${endBand}`;
  write(url, head(clampTitle(`Unsere Leistungen — ${nap.name}`), mkMeta(uebL.meta || lead), url, schema) + header + main + footer + SCTA_DEFAULT + revealJS + '</body></html>');
  written.basis.push(url);
}

// ---------- ÜBERSICHT: /standorte/ (geografische Regionen) ----------
function standortePage() {
  const url = '/standorte/';
  const money = haupt.filter(o => servicesForOrt(o).length >= 3);
  const bySlug = Object.fromEntries(money.map(o => [o.slug, o]));
  const seen = new Set();
  const ordered = [];
  const blocks = [];
  let n = 0;
  const renderCards = orts => orts.map(o => {
    ordered.push(o);
    return `<a class="card" href="/standorte/${o.slug}/"><h3>${esc(o.name)}</h3><p>${esc(o.plz || '')}</p><span class="go">Zum Ort →</span></a>`;
  }).join('');
  for (const reg of STANDORT_REGIONEN) {
    const orts = reg.slugs.map(sl => bySlug[sl]).filter(Boolean);
    if (!orts.length) continue;
    orts.forEach(o => seen.add(o.slug));
    n++;
    const intro = uebS.regionen && uebS.regionen[reg.key] ? `<p class="intro rv">${esc(uebS.regionen[reg.key])}</p>` : '';
    blocks.push(`<section class="sec${n % 2 === 0 ? ' section-alt' : ''}" style="padding:64px 0"><div class="wrap">${catHead(n, reg.label)}${intro}<div class="cards rv">${renderCards(orts)}</div></div></section>`);
  }
  const rest = money.filter(o => !seen.has(o.slug));   // Schutz: Money-Ort ohne Region
  if (rest.length) { n++; blocks.push(`<section class="sec${n % 2 === 0 ? ' section-alt' : ''}" style="padding:64px 0"><div class="wrap">${catHead(n, 'Weitere Orte im Havelland')}<div class="cards rv">${renderCards(rest)}</div></div></section>`); }

  // "Außerdem im Einsatz": bediente Orte/Ortsteile ohne eigene Seite (echte Orte aus locations.json)
  const cardSlugs = new Set(ordered.map(o => o.slug));
  const extra = launch.filter(o => !cardSlugs.has(o.slug)).map(o => o.name);
  const ausserdem = extra.length ? `<section class="sec" style="padding:0 0 8px"><div class="wrap"><p class="intro rv" style="max-width:62em">${esc(uebS.ausserdem_label || 'Außerdem im Einsatz in')}: ${esc(extra.join(', '))} und Umgebung.</p></div></section>` : '';

  const lead = uebS.lead || 'Wir sind im ganzen Havelland und Berliner Umland für Sie da.';
  const gebiet = uebS.servicegebiet ? `<section class="sec" style="padding:44px 0 0"><div class="wrap"><div class="prose wide rv"><p>${esc(uebS.servicegebiet)}</p></div></div></section>` : '';
  const items = ordered.map((o, i) => `{"@type":"ListItem","position":${i + 1},"name":"${sj(o.name)}","item":"${DOMAIN}/standorte/${o.slug}/"}`).join(',');
  const schema = `${orgSchema()},{"@type":"CollectionPage","@id":"${DOMAIN}${url}#page","name":"Unsere Standorte","about":{"@id":"${DOMAIN}/#organization"}},{"@type":"ItemList","@id":"${DOMAIN}${url}#standorte","name":"Standorte im Havelland","itemListElement":[${items}]},${breadcrumb([{ name: 'Start', url: '/' }, { name: 'Standorte', url }])}`;
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>Standorte</div>
<section class="phero" style="padding-bottom:24px"><div class="wrap"><span class="kick rv in" style="color:var(--green)">Standorte</span><h1 class="rv in d1">Unsere Standorte</h1><p class="lead rv in d2">${esc(lead)}</p><div class="cta-row rv in d3">${ctaA}<a class="btn btn-line" href="${waHref('Hallo, sind Sie auch in meinem Ort im Einsatz?')}">WhatsApp</a></div></div></section>
<section class="sec" style="padding:28px 0 0"><div class="wrap"><div class="media-band rv">${pic('region-havelland', { alt: 'Servicegebiet Havelland und Berliner Umland — Haus- & Gartenservice Havelland', sizes: '(max-width:1100px) 92vw, 1040px' })}</div></div></section>
${gebiet}
${blocks.join('\n')}
${ausserdem}
${stepsSektion(n % 2 !== 0)}
${valueBand}
${faqBlock(uebS.faqs)}
${endBand}`;
  write(url, head(clampTitle(`Unsere Standorte — ${nap.name}`), mkMeta(uebS.meta || lead), url, schema) + header + main + footer + SCTA_DEFAULT + revealJS + '</body></html>');
  written.basis.push(url);
}

function basis() {
  leistungenPage();
  standortePage();
  ratgeberIndex();
  // Kontakt — echte Konversions-Seite: Web3Forms-Formular (Fallback: WhatsApp-Bridge falls kein Key)
  const waNum = tel.replace('+', '');
  const W3F = isReal(config.web3forms_key);
  const formIntro = W3F
    ? 'Ein paar Angaben genügen — wir melden uns schnell zurück, meist noch am selben Tag.'
    : 'Ein paar Angaben genügen. Beim Absenden öffnet sich WhatsApp mit Ihrer vorbereiteten Nachricht — oder rufen Sie direkt an.';
  const formOpen = W3F
    ? `<form id="anfrage" class="kf rv" action="https://api.web3forms.com/submit" method="POST" novalidate><input type="hidden" name="access_key" value="${esc(config.web3forms_key)}"><input type="hidden" name="subject" value="Neue Anfrage über die Website (Havelland)"><input type="hidden" name="from_name" value="${esc(nap.name)}"><input type="hidden" name="redirect" value="${DOMAIN}/danke/"><input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" style="display:none">`
    : `<form id="anfrage" class="kf rv" novalidate>`;
  const formScript = W3F
    ? `<script>(function(){var f=document.getElementById('anfrage');if(!f)return;f.addEventListener('submit',function(e){e.preventDefault();if(!f.checkValidity()){f.reportValidity();return}var b=f.querySelector('button[type=submit]'),o=b.textContent;b.disabled=true;b.textContent='Wird gesendet…';fetch('https://api.web3forms.com/submit',{method:'POST',headers:{Accept:'application/json'},body:new FormData(f)}).then(function(r){return r.json()}).then(function(j){if(j&&j.success){if(window.dataLayer){window.dataLayer.push({event:'generate_lead'})}window.location.href='/danke/'}else{b.disabled=false;b.textContent=o;alert('Es gab ein Problem beim Senden. Bitte rufen Sie uns kurz an oder versuchen Sie es noch einmal.')}}).catch(function(){b.disabled=false;b.textContent=o;alert('Es gab ein Problem beim Senden. Bitte rufen Sie uns kurz an oder versuchen Sie es noch einmal.')})})})();</script>`
    : `<script>(function(){var f=document.getElementById('anfrage');if(!f)return;f.addEventListener('submit',function(e){e.preventDefault();if(!f.checkValidity()){f.reportValidity();return;}var g=function(n){var el=f.elements[n];return el?String(el.value).trim():'';};var msg='Anfrage über die Website. Name: '+g('name')+', Telefon: '+g('tel')+', Ort/PLZ: '+g('ort')+', Anliegen: '+g('anliegen');if(window.dataLayer){window.dataLayer.push({event:'generate_lead'})}window.location.href='https://wa.me/${waNum}?text='+encodeURIComponent(msg);});})();</script>`;
  const kontaktMain = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>Kontakt</div>
<section class="phero"><div class="wrap"><h1 class="rv in d1">Kontakt &amp; <em>kostenlose Besichtigung</em></h1><p class="lead rv in d2">Sagen Sie uns, was ansteht — wir melden uns schnell, meist noch am selben Tag.</p><div class="cta-row rv in d3"><a class="btn btn-acc" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a><a class="btn btn-line" href="${waHref('Hallo, ich hätte gern eine kostenlose Besichtigung.')}">WhatsApp</a></div><div class="chips rv"><span>${esc(nap.name)}</span><span>${esc(nap.street||'')}, ${esc(nap.zip||'')} ${esc(nap.city)}</span>${ohDisplay()?`<span>${esc(ohDisplay())}</span>`:''}</div></div></section>
<section class="sec" style="padding-top:8px"><div class="wrap"><div class="head"><h2 class="serif rv">Anfrage senden</h2></div><p class="intro rv">${formIntro}</p>
${formOpen}
<label>Name<input name="name" autocomplete="name" required></label>
<label>Telefon<input name="tel" type="tel" autocomplete="tel" required></label>
<label>E-Mail<input name="email" type="email" autocomplete="email" placeholder="für die Rückmeldung (optional)"></label>
<label>Ort / PLZ<input name="ort" autocomplete="address-level2"></label>
<label>Was steht an?<textarea name="anliegen" rows="4" required></textarea></label>
<label class="chk"><input type="checkbox" name="dsgvo" required> <span>Ich bin mit der Verarbeitung meiner Angaben zur Kontaktaufnahme einverstanden (siehe <a href="/datenschutz/">Datenschutz</a>).</span></label>
<button class="btn btn-acc" type="submit">Anfrage absenden</button>
<p class="kf-alt">Lieber direkt? <a href="tel:${tel}">Anrufen: ${esc(nap.phone_display)}</a> · <a href="${waHref('Hallo, ich hätte gern eine kostenlose Besichtigung.')}">WhatsApp schreiben</a></p>
</form></div></section>
${formScript}
<section class="zone-deep end">${leaf('leaf')}<div class="wrap"><h2 class="serif rv">Wir sind für Sie da.</h2><p class="rv d1">Rufen Sie an oder schreiben Sie — die Besichtigung ist kostenlos, der Festpreis danach verbindlich.</p><div class="cta-row rv d2"><a class="btn btn-acc" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a><a class="btn btn-line" href="${waHref('Hallo, ich hätte gern eine kostenlose Besichtigung.')}">WhatsApp</a></div></div></section>`;
  write('/kontakt/', head(`Kontakt — ${nap.name}`, mkMeta(`Kontakt zum Haus- & Gartenservice Havelland in ${nap.city}: ${nap.phone_display}, WhatsApp, kostenlose Vor-Ort-Besichtigung mit Festpreis.`), '/kontakt/', `${orgSchema()},${breadcrumb([{name:'Start',url:'/'},{name:'Kontakt',url:'/kontakt/'}])}`) + header + kontaktMain + footer + SCTA_DEFAULT + revealJS + '</body></html>');
  written.basis.push('/kontakt/');
  const legalShell = (t, bodyHtml) => `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>${t}</div><section class="phero" style="padding-bottom:24px"><div class="wrap"><h1 class="rv in d1">${t}</h1></div></section><section class="sec" style="padding-top:24px"><div class="wrap">${bodyHtml}</div></section>${endBand}`;
  const impressumBody = `<div class="prose rv">
<h2>Angaben gemäß § 5 DDG</h2>
<p>Haus- &amp; Gartenservice Havelland GbR<br>${esc(nap.street)}<br>${esc(nap.zip)} ${esc(nap.city)}</p>
<p>Vertreten durch die Gesellschafter: ${esc((nap.gesellschafter || [nap.inhaber]).join(' und '))}.</p>
<h2>Kontakt</h2>
<p>Telefon: <a href="tel:${tel}">${esc(nap.phone_display)}</a><br>E-Mail: <a href="mailto:${esc(nap.email)}">${esc(nap.email)}</a></p>
<h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
<p>${esc(nap.inhaber)}, Anschrift wie oben.</p>
<h2>EU-Streitschlichtung</h2>
<p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr/" rel="nofollow" target="_blank">ec.europa.eu/consumers/odr</a>. Unsere E-Mail-Adresse finden Sie oben.</p>
<h2>Verbraucherstreitbeilegung</h2>
<p>Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
<h2>Haftung für Inhalte</h2>
<p>Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden entsprechender Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.</p>
<h2>Haftung für Links</h2>
<p>Unser Angebot enthält gegebenenfalls Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.</p>
<h2>Urheberrecht</h2>
<p>Die durch den Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.</p>
</div>`;
  write('/impressum/', head(`Impressum — ${nap.name}`, mkMeta(`Impressum des Haus- & Gartenservice Havelland, ${nap.inhaber}, ${nap.street}, ${nap.zip} ${nap.city}. Telefon ${nap.phone_display}, E-Mail ${nap.email}.`), '/impressum/', orgSchema()) + header + legalShell('Impressum', impressumBody) + footer + SCTA_DEFAULT + revealJS + '</body></html>');
  written.basis.push('/impressum/');
  const datenschutzBody = `<div class="prose rv">
<h2>1. Datenschutz auf einen Blick</h2>
<p>Wir nehmen den Schutz Ihrer persönlichen Daten ernst und behandeln Ihre personenbezogenen Daten vertraulich und entsprechend den gesetzlichen Datenschutzvorschriften (DSGVO, BDSG) sowie dieser Datenschutzerklärung. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.</p>
<h2>2. Verantwortlicher</h2>
<p>Verantwortlich für die Datenverarbeitung auf dieser Website ist:</p>
<p>Haus- &amp; Gartenservice Havelland GbR<br>vertreten durch ${esc((nap.gesellschafter || [nap.inhaber]).join(' und '))}<br>${esc(nap.street)}<br>${esc(nap.zip)} ${esc(nap.city)}<br>Telefon: ${esc(nap.phone_display)}<br>E-Mail: ${esc(nap.email)}</p>
<h2>3. SSL-/TLS-Verschlüsselung</h2>
<p>Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher Inhalte eine SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile des Browsers von „http://" auf „https://" wechselt.</p>
<h2>4. Hosting</h2>
<p>Diese Website wird bei einem externen Dienstleister gehostet (Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA). Die beim Besuch der Website automatisch erfassten Daten werden auf den Servern des Hosters verarbeitet. Dabei kann es zu einer Übermittlung in die USA kommen; Grundlage hierfür sind die Standardvertragsklauseln der EU-Kommission. Das Hosting erfolgt zur Anbahnung und Erfüllung des Vertragsverhältnisses mit unseren Interessenten und Kunden (Art. 6 Abs. 1 lit. b DSGVO) sowie im Interesse einer sicheren und schnellen Bereitstellung unseres Online-Angebots (Art. 6 Abs. 1 lit. f DSGVO). Mit dem Hoster haben wir einen Vertrag zur Auftragsverarbeitung geschlossen.</p>
<h2>5. Server-Logfiles</h2>
<p>Der Hoster erhebt und speichert automatisch Informationen in sogenannten Server-Logfiles, die Ihr Browser übermittelt. Dies sind: Browsertyp und -version, verwendetes Betriebssystem, Referrer-URL, Hostname des zugreifenden Rechners, Uhrzeit der Serveranfrage sowie die IP-Adresse. Eine Zusammenführung dieser Daten mit anderen Datenquellen erfolgt nicht. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer technisch fehlerfreien Darstellung und Sicherheit der Website).</p>
<h2>6. Kontaktaufnahme</h2>
<h3>Telefon und E-Mail</h3>
<p>Wenn Sie uns per Telefon oder E-Mail kontaktieren, werden Ihre Angaben zur Bearbeitung der Anfrage und für den Fall von Anschlussfragen gespeichert. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Anbahnung bzw. Erfüllung eines Vertrags) und Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Bearbeitung Ihrer Anfrage). Eine Weitergabe an Dritte erfolgt nicht ohne Ihre Einwilligung.</p>
<h3>Anfrageformular (Web3Forms)</h3>
<p>Für die Verarbeitung von Anfragen über unser Kontaktformular nutzen wir den Dienst Web3Forms (web3forms.com). Beim Absenden werden die von Ihnen eingegebenen Angaben (Name, Telefonnummer, Ort/PLZ, Anliegen) an die Server von Web3Forms übermittelt und von dort als E-Mail an unser Postfach weitergeleitet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. a DSGVO (Ihre mit dem Absenden erteilte Einwilligung) sowie Art. 6 Abs. 1 lit. b DSGVO (Vertragsanbahnung). Zum Schutz vor Spam wird ein technisches Prüfverfahren eingesetzt. Hinweise zum Datenschutz von Web3Forms finden Sie unter <a href="https://web3forms.com/privacy" rel="nofollow" target="_blank">web3forms.com/privacy</a>; eine Datenübermittlung in Drittländer kann dabei nicht ausgeschlossen werden.</p>
<h3>WhatsApp</h3>
<p>Über die WhatsApp-Schaltflächen auf unserer Website können Sie uns direkt per Messenger kontaktieren. Anbieter ist die WhatsApp Ireland Limited, 4 Grand Canal Square, Dublin 2, Irland (Meta). Bei der Nutzung von WhatsApp können Daten (u. a. Ihre Telefonnummer, der Inhalt der Nachricht und Metadaten) auch in die USA übertragen werden. Bitte beachten Sie die Datenschutzhinweise von WhatsApp: <a href="https://www.whatsapp.com/legal/privacy-policy-eea" rel="nofollow" target="_blank">whatsapp.com/legal/privacy-policy-eea</a>. Die Nutzung erfolgt auf Grundlage Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Möchten Sie kein WhatsApp nutzen, erreichen Sie uns telefonisch, per E-Mail oder über das Anfrageformular.</p>
<h2>7. Web-Analyse (Google Analytics 4 / Google Tag Manager)</h2>
<p>Zur Reichweitenmessung und Verbesserung unseres Angebots setzen wir Google Analytics 4 und den Google Tag Manager ein (Anbieter: Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland) — jedoch ausschließlich, nachdem Sie über unseren Consent-Banner ausdrücklich eingewilligt haben (Art. 6 Abs. 1 lit. a DSGVO). Vor Ihrer Einwilligung werden keine Analyse-Cookies gesetzt und keine personenbezogenen Daten zu Analysezwecken an Google übertragen (Google Consent Mode v2, Voreinstellung „abgelehnt"). Bei erteilter Einwilligung kann es zu einer Datenübermittlung in die USA kommen (Grundlage: Standardvertragsklauseln). Ihre Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen, indem Sie Ihre Cookie-Einstellungen anpassen. Informationen zum Umgang mit Nutzerdaten bei Google: <a href="https://policies.google.com/privacy" rel="nofollow" target="_blank">policies.google.com/privacy</a>.</p>
<h2>8. Cookies und Einwilligung</h2>
<p>Ohne Ihre Einwilligung verwenden wir nur technisch notwendige Cookies bzw. lokale Speicherung, die für den Betrieb der Seite erforderlich sind (z. B. um Ihre Cookie-Entscheidung zu speichern). Nicht notwendige Dienste (etwa die Web-Analyse) werden erst nach Ihrer Einwilligung über den Consent-Banner aktiviert. Rechtsgrundlage für notwendige Cookies ist § 25 Abs. 2 TDDDG i. V. m. Art. 6 Abs. 1 lit. f DSGVO, für einwilligungspflichtige Dienste § 25 Abs. 1 TDDDG i. V. m. Art. 6 Abs. 1 lit. a DSGVO.</p>
<h2>9. Schriftarten</h2>
<p>Diese Website bindet ihre Schriftarten lokal von unserem eigenen Server ein. Es wird dabei keine Verbindung zu Servern von Google oder anderen Dritten aufgebaut; eine Übermittlung Ihrer IP-Adresse zu diesem Zweck findet nicht statt.</p>
<h2>10. Speicherdauer</h2>
<p>Soweit innerhalb dieser Erklärung keine speziellere Speicherdauer genannt wurde, verbleiben Ihre personenbezogenen Daten bei uns, bis der Zweck der Verarbeitung entfällt. Anfragen, die zu einem Auftrag führen, bewahren wir im Rahmen der gesetzlichen Aufbewahrungsfristen auf. Machen Sie ein berechtigtes Löschersuchen geltend oder widerrufen eine Einwilligung, werden Ihre Daten gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.</p>
<h2>11. Ihre Rechte</h2>
<p>Ihnen stehen nach der DSGVO folgende Rechte zu:</p>
<ul><li>Recht auf Auskunft (Art. 15 DSGVO)</li><li>Recht auf Berichtigung (Art. 16 DSGVO)</li><li>Recht auf Löschung (Art. 17 DSGVO)</li><li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li><li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li><li>Widerspruchsrecht gegen die Verarbeitung (Art. 21 DSGVO)</li><li>Recht auf Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO)</li></ul>
<p>Zur Ausübung Ihrer Rechte genügt eine formlose Mitteilung an die oben genannten Kontaktdaten.</p>
<h2>12. Beschwerderecht bei der Aufsichtsbehörde</h2>
<p>Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Die für uns zuständige Behörde ist die Landesbeauftragte für den Datenschutz und für das Recht auf Akteneinsicht Brandenburg (LDA), Stahnsdorfer Damm 77, 14532 Kleinmachnow.</p>
<p><em>Diese Datenschutzerklärung wird angepasst, sobald sich die Rechtslage oder die eingesetzten Dienste ändern.</em></p>
</div>`;
  write('/datenschutz/', head(`Datenschutz — ${nap.name}`, mkMeta(`Datenschutzhinweise des Haus- & Gartenservice Havelland in ${nap.city}: Umgang mit Ihren Angaben bei Anfragen per Telefon, WhatsApp und Formular nach DSGVO.`), '/datenschutz/', orgSchema()) + header + legalShell('Datenschutz', datenschutzBody) + footer + SCTA_DEFAULT + revealJS + '</body></html>');
  written.basis.push('/datenschutz/');
}

// ---------- WEITERE BASIS-SEITEN: Über uns / Bewertungen / Danke / 404 ----------
function ueberUns() {
  const url = '/ueber-uns/';
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>Über uns</div>
<section class="phero">${leaf('hleaf')}<div class="wrap grid"><div><span class="kick rv in" style="color:var(--green)">Über uns</span><h1 class="rv in d1">Ein Ansprechpartner für Haus und Garten — <em>im Havelland zuhause</em></h1><p class="lead rv in d2">Hinter dem Haus- &amp; Gartenservice Havelland stehen ${esc((nap.gesellschafter || [nap.inhaber]).join(' und '))} — zwei Gründer aus ${esc(nap.city)}, die selbst mit anpacken. Garten, Reinigung, Winterdienst, Entrümpelung: ein fester Ansprechpartner für alles, Festpreis nach Besichtigung, Foto-Nachweis nach jedem Auftrag.</p><div class="cta-row rv in d3">${ctaA}<a class="btn btn-line" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a></div>${trustBadges()}</div>
<div class="shot rv in d2">${pic('ueber-uns', { cls: 'main', alt: 'Das Team vom Haus- & Gartenservice Havelland am Einsatzfahrzeug', sizes: '(max-width:900px) 92vw, 60vw', lcp: true })}</div></div></section>
<section class="band">${leaf('leaf')}<div class="wrap"><p class="lead2 rv">Aus der Region, für die Region — <em>kurze Wege, klare Absprachen.</em></p>
<div class="vals"><div class="v rv d1"><h4><span class="n">01</span> Aus einer Hand</h4><p>Garten, Reinigung, Winterdienst, Entrümpelung — ein Ansprechpartner für alles rund ums Haus.</p></div><div class="v rv d2"><h4><span class="n">02</span> Nachweis statt Versprechen</h4><p>Foto-Dokumentation vor und nach jedem Auftrag, direkt aufs Handy.</p></div><div class="v rv d3"><h4><span class="n">03</span> Festpreis ist Endpreis</h4><p>Kostenlose Besichtigung, klarer Preis — kein Nachkommen, keine Überraschung.</p></div><div class="v rv d4"><h4><span class="n">04</span> Schnell erreichbar</h4><p>Eine WhatsApp genügt — Antwort in Stunden, nicht in Tagen.</p></div></div></div></section>
<section class="sec"><div class="wrap"><div class="prose wide rv"><h2>Wer hinter dem Service steht</h2><p>Den Haus- &amp; Gartenservice Havelland führen ${esc((nap.gesellschafter || [nap.inhaber]).join(' und '))} als Gründer-Duo: einer ist Ihr Ansprechpartner vor Ort, mit Praxis aus dem Garten- und Gebäudereinigungs-Handwerk, der andere hält bei Planung und Organisation den Rücken frei. Sie haben es vom ersten Anruf bis zur Abnahme mit festen Gesichtern zu tun — kein Callcenter, keine wechselnden Kräfte, keine Warteschleife.</p><p>Und wir sind selbst dabei: Besichtigung, Ausführung und die Foto-Abnahme machen wir persönlich. Bei größeren Aufträgen unterstützen uns eingearbeitete Helfer — die Verantwortung und Ihr Ansprechpartner bleiben aber immer bei uns.</p><p>Der Betrieb sitzt in der ${esc(nap.street)} in ${esc(nap.zip)} ${esc(nap.city)} und ist im gesamten Havelland und Berliner Umland unterwegs. Der Festpreis, den Sie nach der Besichtigung bekommen, ist der Endpreis — kein Aufschlag, keine Überraschung.</p></div></div></section>
<section class="sec section-alt"><div class="wrap"><div class="head"><h2 class="serif rv">So arbeiten wir — in vier Schritten</h2></div>${auftragsTimeline()}</div></section>
<section class="sec"><div class="wrap"><div class="head"><h2 class="serif rv">Was wir übernehmen</h2><a class="rv" href="/leistungen/">Alle Leistungen →</a></div><p class="intro rv">Vom regelmäßigen Garten bis zum einmaligen Großeinsatz — koordiniert von einem festen Ansprechpartner.</p><div class="cards rv"><a class="card" href="/gartenpflege/"><h3>Garten &amp; Außenanlagen</h3><p>Gartenpflege, Heckenschnitt, Winterdienst, Laub.</p><span class="go">Mehr →</span></a><a class="card" href="/fensterreinigung/"><h3>Reinigung</h3><p>Fenster, Terrasse &amp; Pflaster, Dachrinne, Photovoltaik.</p><span class="go">Mehr →</span></a><a class="card" href="/entruempelung/"><h3>Entrümpelung &amp; Auflösung</h3><p>Keller, Wohnung, Haushaltsauflösung, Umzugshilfe.</p><span class="go">Mehr →</span></a><a class="card" href="/hausmeisterservice/"><h3>Hausmeister &amp; Gewerbe</h3><p>Hausmeisterdienst, Gebäude- und Unterhaltsreinigung.</p><span class="go">Mehr →</span></a></div></div></section>
<section class="sec section-alt"><div class="wrap"><div class="prose wide rv"><h2>Unser Servicegebiet</h2><p>Wir sind in ${esc(nap.city)} zuhause und im gesamten Havelland sowie im angrenzenden Berliner Umland für Sie da — von Falkensee über Dallgow-Döberitz, Brieselang, Nauen und Oberkrämer bis Oranienburg, Hennigsdorf und an den Berliner Rand nach Kladow, Gatow und Spandau. Kurze Wege bedeuten schnelle Reaktion und planbare Termine.</p><p>Eine Übersicht aller Orte mit den jeweiligen Leistungen finden Sie auf der Seite <a href="/standorte/">Standorte</a>.</p><h2>Unsere Garantien</h2><p>Wir versprechen nichts, was wir nicht halten. Je Leistung gibt es eine konkrete Zusage — ein paar Beispiele:</p><ul><li><strong>Heckenschnitt:</strong> Bleiben Schnittreste liegen, kommen wir kostenlos nach.</li><li><strong>Fensterreinigung:</strong> Schlierenfrei — oder wir kommen am selben Tag nochmal.</li><li><strong>Winterdienst:</strong> Reaktionszeit-Garantie, sonst anteilige Erstattung.</li><li><strong>Entrümpelung:</strong> Festpreis nach Besichtigung — kein Aufpreis, egal wie viel rausgeht.</li></ul><p>Die vollständige Garantie steht jeweils auf der passenden <a href="/leistungen/">Leistungsseite</a>.</p></div></div></section>
${faqBlock([
  {q:'Bekomme ich einen Nachweis über die ausgeführte Arbeit?',a:'Ja. Nach jedem Auftrag dokumentieren wir das Ergebnis mit Vorher-/Nachher-Fotos und schicken sie Ihnen per WhatsApp. So sehen Sie genau, was gemacht wurde, auch wenn Sie nicht vor Ort waren.'},
  {q:'Was kostet die Besichtigung?',a:'Die Vor-Ort-Besichtigung ist kostenlos und unverbindlich. Wir schauen uns an, was ansteht, und nennen Ihnen danach einen Festpreis. Erst wenn Sie zusagen, legen wir los.'},
  {q:'Bieten Sie auch regelmäßige Pflege oder Wartung an?',a:'Ja. Für Garten, Reinigung oder Winterdienst vereinbaren wir auf Wunsch feste Turnusse oder Saisonverträge — so bleibt alles in Ordnung, ohne dass Sie jedes Mal neu anfragen müssen. Den Umfang legen wir bei der Besichtigung gemeinsam fest.'},
  {q:'In welchen Orten sind Sie tätig?',a:`Wir arbeiten im gesamten Havelland und im angrenzenden Berliner Umland, mit Sitz in ${nap.city}. Eine Übersicht aller bedienten Orte finden Sie auf der Seite Standorte.`},
  {q:'Wie schnell bekomme ich eine Antwort?',a:'Schreiben Sie uns tagsüber eine WhatsApp mit ein paar Fotos, melden wir uns meist innerhalb weniger Stunden zurück und stimmen einen Termin ab.'},
])}
${endBand}`;
  write(url, head(`Über uns — ${nap.name}`, mkMeta(`Haus- & Gartenservice Havelland aus ${nap.city}, geführt von ${(nap.gesellschafter || [nap.inhaber]).join(' und ')} als Gründer-Duo. Wir packen selbst mit an: Festpreis nach Besichtigung, Foto-Nachweis nach jedem Auftrag.`), url, `${orgSchema()},${breadcrumb([{name:'Start',url:'/'},{name:'Über uns',url}])}`) + header + main + footer + SCTA_DEFAULT + revealJS + '</body></html>');
  written.basis.push(url);
}
function bewertungen() {
  const url = '/bewertungen/';
  const r = proof.google_reviews || {};
  // Rating nur wenn reviews.json aktiv UND genug echte Reviews — sonst ehrlicher Empty-State (kein Fake-Sterne)
  const reviewsLive = !!reviews.enabled && (r.count || 0) >= (reviews.block_ab_count || 5) && r.rating;
  // Google-Deeplink: write_review_url aus reviews.json (falls echt), sonst Google-Suche nach dem Betrieb
  const gbp = (reviews.write_review_url && !/TBD|XXXX|null/i.test(String(reviews.write_review_url)))
    ? reviews.write_review_url
    : `https://www.google.com/search?q=${encodeURIComponent(nap.name + ' ' + nap.city)}`;
  const done = proof.auftraege_abgeschlossen || 0;
  // Ehrlicher Auftragszähler statt erfundener Sterne
  const counter = done > 0
    ? `<div class="trust-row rv"><div class="t"><b>${esc(done)}</b><span>dokumentierte Aufträge</span></div><div class="t"><b>Foto</b><span>Nachweis nach jedem Auftrag</span></div><div class="t"><b>Festpreis</b><span>nach Besichtigung</span></div></div>`
    : `<div class="trust-row rv"><div class="t"><b>Foto</b><span>Nachweis nach jedem Auftrag</span></div><div class="t"><b>Festpreis</b><span>nach Besichtigung</span></div><div class="t"><b>Ein</b><span>fester Ansprechpartner</span></div></div>`;
  // Live-Ansehen-Link (Reviews-Ansicht) aus place_id, sonst Google-Suche
  const gbpView = (reviews.place_id && !/TBD|XXXX|null/i.test(String(reviews.place_id)))
    ? `https://search.google.com/local/reviews?placeid=${reviews.place_id}`
    : gbp;
  // Rating-Badge: sichtbarer Text + Live-Link (KEIN aggregateRating-Schema — Google-Policy self-serving)
  const ratingBadge = reviewsLive
    ? `<div class="grating rv"><span class="gr-stars" aria-hidden="true">★★★★★</span><b class="gr-val">${Number(r.rating).toFixed(1).replace('.', ',')}</b><span class="gr-meta">aus ${esc(r.count)} Google-Bewertungen · <a href="${gbpView}" rel="nofollow" target="_blank">live ansehen</a></span></div>`
    : '';
  const body = reviewsLive
    ? `${ratingBadge}<p>Unsere Kundinnen und Kunden bewerten uns bei Google mit ${Number(r.rating).toFixed(1).replace('.', ',')} von 5 Sternen (${esc(r.count)} Bewertungen, Stand Juli 2026). Wir zeigen hier bewusst keine ausgewählten Zitate — die vollständigen, ungefilterten Bewertungen sehen Sie jederzeit live in unserem Google-Profil. Was zählt, ist das Ergebnis vor Ort: Nach jedem Auftrag dokumentieren wir es mit Vorher-/Nachher-Fotos und schicken sie Ihnen per WhatsApp.</p>
<h3>Schon mit uns gearbeitet?</h3><p>Über eine ehrliche Bewertung bei Google freuen wir uns. Sie hilft anderen Nachbarn in der Region, einen verlässlichen Ansprechpartner zu finden.</p>`
    : `<p>Wir sind ein regionaler Betrieb und sammeln Bewertungen direkt bei Google. Hier zeigen wir keine erfundenen Sterne: Was zählt, ist das Ergebnis vor Ort. Nach jedem Auftrag dokumentieren wir es mit Vorher-/Nachher-Fotos und schicken sie Ihnen per WhatsApp — Sie sehen, was Sie bekommen, ohne sich auf Werbeversprechen verlassen zu müssen.</p>
<h3>Schon mit uns gearbeitet?</h3><p>Über eine ehrliche Bewertung bei Google freuen wir uns. Sie hilft anderen Nachbarn in der Region, einen verlässlichen Ansprechpartner zu finden.</p>`;
  // Echte Google-Reviews als Kacheln (verbatim aus reviews.json, via GBP-API gezogen). KEIN Review-JSON-LD (self-serving-Policy) — nur sichtbar.
  const MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const fmtD = d => { const m = String(d || '').match(/^(\d{4})-(\d{2})/); return m ? `${MON[+m[2] - 1]} ${m[1]}` : ''; };
  const rvArr = Array.isArray(reviews.reviews) ? reviews.reviews : [];
  const reviewTiles = (reviewsLive && rvArr.length)
    ? `<section class="sec"><div class="wrap"><div class="head"><h2 class="serif rv">Das sagen unsere Kundinnen und Kunden</h2><a class="rv" href="${gbpView}" rel="nofollow" target="_blank">Alle auf Google →</a></div><div class="review-grid rv">`
      + rvArr.map(t => `<figure class="review-card"><div class="rc-stars" aria-label="${t.rating} von 5 Sternen">${'★'.repeat(Math.max(0, Math.min(5, t.rating | 0)))}</div><blockquote>${esc(t.text)}</blockquote><figcaption><b>${esc(t.author)}</b><span>${fmtD(t.date)} · Google</span></figcaption></figure>`).join('')
      + `</div><p class="gebiet-note rv" style="margin-top:22px">Echte, ungefilterte Google-Bewertungen — ${esc(r.count)} insgesamt. <a href="${gbpView}" rel="nofollow" target="_blank">Alle auf Google ansehen</a>.</p></div></section>`
    : '';
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>Bewertungen</div>
<section class="phero" style="padding-bottom:24px"><div class="wrap"><span class="kick rv in" style="color:var(--green)">Bewertungen</span><h1 class="rv in d1">Bewertungen &amp; <em>Erfahrungen</em></h1><p class="lead rv in d2">Echte Ergebnisse statt großer Worte — und der Weg, uns selbst zu bewerten.</p>${counter}</div></section>
<section class="sec" style="padding-top:24px"><div class="wrap"><div class="prose rv">${body}<p style="margin-top:24px"><a class="btn btn-acc" href="${gbp}" rel="nofollow" target="_blank">Bei Google bewerten</a></p></div></div></section>
${reviewTiles}
<section class="sec section-alt"><div class="wrap"><div class="head"><h2 class="serif rv">So sieht unser Foto-Nachweis aus</h2></div><p class="intro rv">Statt Sternen zeigen wir das Ergebnis: Nach jedem Auftrag bekommen Sie Vorher-/Nachher-Fotos aufs Handy — hier ein Beispiel aus dem Havelland.</p>${echtProjekt()}</div></section>
${endBand}`;
  write(url, head(`Bewertungen — ${nap.name}`, mkMeta(`Bewertungen und Erfahrungen zum Haus- & Gartenservice Havelland in ${nap.city}: Foto-Nachweis nach jedem Auftrag statt erfundener Sterne.`), url, `${orgSchema()},${breadcrumb([{name:'Start',url:'/'},{name:'Bewertungen',url}])}`) + header + main + footer + SCTA_DEFAULT + revealJS + '</body></html>');
  written.basis.push(url);
}
// ---------- B2B: /fuer-hausverwaltungen/ (noindex bis Welle 2) ----------
function b2bPage() {
  const url = '/fuer-hausverwaltungen/';
  const b2b = J('b2b.json');
  const objekte = (b2b.objektklassen || []).map(o => `<li>${esc(o)}</li>`).join('');
  const leist = (b2b.leistungen || []).map((l, i) => `<div class="card"><span class="n">${String(i + 1).padStart(2, '0')}</span><h3>${esc(l)}</h3><span class="go">Aus einer Hand →</span></div>`).join('');
  const zus = (b2b.zusagen || []).map((z, i) => `<div class="v rv d${i + 1}"><h4><span class="n">0${i + 1}</span> ${esc(z)}</h4></div>`).join('');
  const schema = `${orgSchema()},{"@type":"CollectionPage","@id":"${DOMAIN}${url}#page","name":"Für Hausverwaltungen & Gewerbe","about":{"@id":"${DOMAIN}/#organization"}},{"@type":"Service","@id":"${DOMAIN}${url}#service","name":"Objektbetreuung für Hausverwaltungen","serviceType":"Facility Service","provider":{"@id":"${DOMAIN}/#organization"},"areaServed":${JSON.stringify(haupt.map(o => o.name))}},${breadcrumb([{ name: 'Start', url: '/' }, { name: 'Für Hausverwaltungen', url }])}`;
  // B2B statt WhatsApp-Foto-Flow: E-Mail-Angebot als Haupt-CTA (schriftliches Angebot in 48 h)
  const mailtoAngebot = `mailto:${nap.email}?subject=${encodeURIComponent('Angebot Objektbetreuung')}&body=${encodeURIComponent('Guten Tag,\n\nwir sind eine Hausverwaltung / Gewerbe und interessieren uns für Ihre Objektbetreuung.\n\nObjekt(e): \nOrt/PLZ: \nGewünschte Leistungen: \n\nBitte senden Sie uns ein schriftliches Angebot.\n\nMit freundlichen Grüßen')}`;
  const emailCta = `<section class="sec"><div class="wrap center"><div class="head" style="justify-content:center"><h2 class="serif rv">Angebot per E-Mail anfordern</h2></div><p class="intro rv" style="max-width:44em;margin-inline:auto">Senden Sie uns Ihre Objektdaten — Sie erhalten ein schriftliches Angebot per E-Mail, in der Regel innerhalb von 48 Stunden. Ein fester Ansprechpartner, kein Callcenter.</p><div class="cta-row rv d2" style="justify-content:center"><a class="btn btn-acc" href="${mailtoAngebot}">${CTA_ANGEBOT}</a><a class="btn btn-line" href="mailto:${esc(nap.email)}">${esc(nap.email)}</a><a class="btn btn-line" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a></div></div></section>`;
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>Für Hausverwaltungen</div>
<section class="phero">${leaf('hleaf')}<div class="wrap grid"><div><span class="kick rv in" style="color:var(--green)">Für Hausverwaltungen &amp; Gewerbe</span><h1 class="rv in d1">Ein Dienstleister für <em>Ihre Objekte</em> im Havelland</h1><p class="lead rv in d2">Grünpflege, Reinigung, Winterdienst und Objektkontrolle aus einer Hand — mit festem Ansprechpartner, schriftlichem Angebot und Foto-Reporting nach jedem Einsatz.</p><div class="cta-row rv in d3"><a class="btn btn-acc" href="${mailtoAngebot}">${CTA_ANGEBOT}</a><a class="btn btn-line" href="mailto:${esc(nap.email)}">E-Mail schreiben</a><a class="btn btn-line" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a></div></div>
<div class="shot rv in d2">${pic('bg-fassade', { cls: 'main', alt: 'Wohnanlage im Havelland — Objektbetreuung durch den Haus- & Gartenservice Havelland', sizes: '(max-width:900px) 92vw, 60vw', lcp: true })}</div></div></section>
${gstrip}
<section class="sec"><div class="wrap"><div class="prose wide rv"><h2>Für wen wir arbeiten</h2><p>Wir betreuen laufende Objekte zuverlässig und dokumentiert — mit einem festen Ansprechpartner statt wechselnder Kräfte.</p><ul>${objekte}</ul><p>Einzelne Leistungen im Detail: <a href="/hausmeisterservice/">Hausmeisterservice</a>, <a href="/gebaeudereinigung/">Gebäudereinigung</a>, <a href="/unterhaltsreinigung/">Unterhaltsreinigung</a> und <a href="/objektbetreuung/">Objektbetreuung</a>.</p></div></div></section>
<section class="sec section-alt"><div class="wrap"><div class="head"><h2 class="serif rv">Unsere Leistungen für Ihr Objekt</h2></div><div class="cards rv">${leist}</div></div></section>
<section class="band">${leaf('leaf')}<div class="wrap"><p class="lead2 rv">Verlässlich, dokumentiert, ohne Callcenter — <em>ein Ansprechpartner für alle Objekte.</em></p><div class="vals">${zus}</div></div></section>
${emailCta}
${endBand}`;
  write(url, head(clampTitle(`Für Hausverwaltungen & Gewerbe — ${nap.name}`), mkMeta('Haus- & Gartenservice Havelland für Hausverwaltungen, WEG und Gewerbe: Grünpflege, Reinigung, Winterdienst und Objektkontrolle mit festem Ansprechpartner und Foto-Reporting.'), url, schema, { noindex: (config.aktive_welle || 0) < 2 }) + header + main + footer + SCTA_DEFAULT + revealJS + '</body></html>');
  written.basis.push(url);
}
function danke() {
  const url = '/danke/';
  const main = `<section class="phero"><div class="wrap center" style="text-align:center"><div class="mini-illu rv in">${pic('page-danke', { alt: 'Anfrage beim Haus- & Gartenservice Havelland eingegangen', sizes: '(max-width:520px) 78vw, 360px' })}</div><span class="kick rv in" style="color:var(--green);justify-content:center;display:inline-flex">Anfrage eingegangen</span><h1 class="rv in d1" style="margin:0 auto">Danke für Ihre <em>Anfrage</em></h1><p class="lead rv in d2" style="margin:20px auto 28px">Wir haben Ihre Anfrage erhalten und melden uns schnell, meist noch am selben Tag. Bei dringenden Fällen erreichen Sie uns direkt.</p><div class="cta-row rv in d3" style="justify-content:center"><a class="btn btn-acc" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a><a class="btn btn-line" href="${waHref('Hallo, ich hatte gerade eine Anfrage über die Website gesendet.')}">WhatsApp</a></div><p class="rv" style="margin-top:28px"><a href="/leistungen/">Alle Leistungen ansehen</a> · <a href="/ratgeber/">Zum Ratgeber</a></p></div></section>`;
  write(url, head(`Danke — ${nap.name}`, `Danke für Ihre Anfrage beim Haus- & Gartenservice Havelland. Wir melden uns schnell.`, url, orgSchema(), { noindex: true }) + header + main + footer + SCTA_DEFAULT + revealJS + '</body></html>');
  written.basis.push(url);
}
function notFound() {
  const main = `<section class="phero"><div class="wrap center" style="text-align:center"><div class="mini-illu rv in">${pic('page-404', { alt: 'Seite nicht gefunden — Haus- & Gartenservice Havelland', sizes: '(max-width:520px) 78vw, 360px' })}</div><span class="kick rv in" style="color:var(--green);justify-content:center;display:inline-flex">Fehler 404</span><h1 class="rv in d1" style="margin:0 auto">Diese Seite gibt es <em>nicht (mehr)</em></h1><p class="lead rv in d2" style="margin:20px auto 28px">Der Link ist vielleicht veraltet oder vertippt. Hier kommen Sie weiter:</p><div class="cta-row rv in d3" style="justify-content:center"><a class="btn btn-acc" href="/leistungen/">Alle Leistungen</a><a class="btn btn-line" href="/kontakt/">Kontakt</a></div><p class="rv" style="margin-top:24px"><a href="/">Startseite</a> · <a href="/standorte/">Standorte</a> · <a href="/ratgeber/">Ratgeber</a></p></div></section>`;
  const htmlDoc = head(`Seite nicht gefunden — ${nap.name}`, `Die aufgerufene Seite wurde nicht gefunden. Zurück zu den Leistungen des Haus- & Gartenservice Havelland.`, '/404.html', orgSchema(), { noindex: true }) + header + main + footer + SCTA_DEFAULT + revealJS + '</body></html>';
  fs.writeFileSync('website/404.html', htmlDoc); // Vercel Custom-404 (Output-Root)
}

// ---------- RATGEBER-INDEX (thematisch gruppiert) ----------
function ratgeberIndex() {
  const url = '/ratgeber/';
  const list = ratCopy.length ? ratCopy : RATGEBER_FALLBACK;
  const cats = [
    { label: 'Garten & Heckenpflege', svcs: ['gartenpflege', 'heckenschnitt'], teaser: 'Wann geschnitten wird, was der Naturschutz erlaubt und wie regelmäßige Pflege im Havelland aussieht.' },
    { label: 'Reinigung & Außenflächen', svcs: ['fensterreinigung', 'steinreinigung', 'dachrinnenreinigung', 'dachreinigung', 'photovoltaikreinigung', 'gebaeudereinigung', 'grundreinigung', 'unterhaltsreinigung'], teaser: 'Von der streifenfreien Scheibe bis zum moosfreien Dach — Kosten, Turnus und worauf es beim Ergebnis ankommt.' },
    { label: 'Entrümpelung & Umzug', svcs: ['entruempelung', 'haushaltsaufloesung', 'umzugshilfe'], teaser: 'Was Entrümpelung und Haushaltsauflösung kosten, wie ein Festpreis zustande kommt und wie der Ablauf ist.' },
    { label: 'Winterdienst & Hausservice', svcs: ['winterdienst', 'hausmeisterservice', 'ferienwohnung-reinigung', 'objektbetreuung', 'renovierung'], teaser: 'Streupflicht, Reaktionszeiten und laufende Betreuung rund ums Haus im Havelland und Berliner Umland.' },
  ];
  const used = new Set();
  const groups = cats.map(c => { const items = list.filter(r => c.svcs.includes(r.cta_service)); items.forEach(r => used.add(r.slug)); return { label: c.label, teaser: c.teaser, items }; }).filter(c => c.items.length);
  const rest = list.filter(r => !used.has(r.slug));
  if (rest.length) groups.push({ label: 'Weitere Ratgeber', teaser: '', items: rest });
  const sections = groups.map((c, gi) => `<section class="sec${gi % 2 ? ' section-alt' : ''}" style="padding:56px 0"><div class="wrap"><div class="head"><h2 class="serif rv">${esc(c.label)}</h2></div>${c.teaser ? `<p class="intro rv">${esc(c.teaser)}</p>` : ''}<div class="cards rv">${c.items.map((r, i) => `<a class="card guide" href="/ratgeber/${r.slug}/"><span class="n">${String(i + 1).padStart(2, '0')}</span><h3>${esc(r.title)}</h3><p>${esc(r.lead || '')}</p><span class="go">Lesen →</span></a>`).join('')}</div></div></section>`).join('');
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>Ratgeber</div>
<section class="phero" style="padding-bottom:10px"><div class="wrap"><span class="kick rv in" style="color:var(--green)">Ratgeber</span><h1 class="rv in d1">Ratgeber rund um <em>Haus &amp; Garten</em></h1><p class="lead rv in d2">Verständliche Antworten zu Kosten, Terminen und Pflege — aus der Praxis im Havelland und Berliner Umland.</p></div></section>
<section class="sec" style="padding:14px 0 0"><div class="wrap"><div class="media-band rv">${pic('ratgeber-index', { alt: 'Gepflegtes Haus mit Garten im Havelland', sizes: '(max-width:1100px) 92vw, 1040px' })}</div></div></section>
${sections}
${endBand}`;
  write(url, head(`Ratgeber — ${nap.name}`, mkMeta(`Ratgeber vom Haus- & Gartenservice Havelland: Antworten zu Kosten, Terminen und Pflege rund um Garten, Reinigung, Entrümpelung und Winterdienst.`), url, `${orgSchema()},${breadcrumb([{ name: 'Start', url: '/' }, { name: 'Ratgeber', url }])}`) + header + main + footer + SCTA_DEFAULT + revealJS + '</body></html>');
  written.basis.push(url);
}

// ---------- SITEMAPS ----------
function sitemaps() {
  const sm = (name, urls) => { const x = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`<url><loc>${DOMAIN}${u}</loc></url>`).join('\n')}\n</urlset>\n`; fs.writeFileSync(`website/${name}`, x); };
  // Wellen-Gate: Hubs + Kern-Basis immer indexiert. Ortsseiten/Ratgeber service-scharf (nur wenn service.wave <= aktive_welle → in *Idx gesammelt). Orts-Hubs am globalen Gate. Bei aktive_welle=0 sind *Idx leer → Output wie bisher.
  const gate = (config.aktive_welle || 0) < 1;
  sm('sitemap-services.xml', [...written.basis.filter(u=>['/','/leistungen/','/ueber-uns/','/bewertungen/','/kontakt/'].includes(u)), ...written.hubs, ...written.ortsseitenIdx]);
  sm('sitemap-standorte.xml', gate ? [] : [...written.orts_hubs, '/standorte/']);
  sm('sitemap-ratgeber.xml', written.ratgeberIdx.length ? [...written.ratgeberIdx, '/ratgeber/'] : []);
  const idx = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['sitemap-services.xml','sitemap-standorte.xml','sitemap-ratgeber.xml'].map(f=>`<sitemap><loc>${DOMAIN}/${f}</loc></sitemap>`).join('\n')}\n</sitemapindex>\n`;
  fs.writeFileSync('website/sitemap.xml', idx);
  fs.writeFileSync('website/robots.txt', `User-agent: *\nAllow: /\n\n# AI-Crawler erlaubt (AEO/GEO)\nUser-agent: GPTBot\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\nUser-agent: PerplexityBot\nAllow: /\nUser-agent: Google-Extended\nAllow: /\n\nSitemap: ${DOMAIN}/sitemap.xml\n`);
  // llms.txt (GEO)
  const llms = `# ${nap.name}\n\n> Haus- & Gartenservice im Havelland und Berliner Umland. Ein fester Ansprechpartner für Garten, Reinigung, Winterdienst, Entrümpelung und Hausmeisterdienste. Sitz: ${nap.city}. Festpreis nach kostenloser Besichtigung, Foto-Nachweis nach jedem Auftrag.\n\n## Leistungen\n${services.map(s=>`- [${s.name}](${DOMAIN}/${s.slug}/)`).join('\n')}\n\n## Ratgeber\n${(ratCopy.length?ratCopy:RATGEBER_FALLBACK).map(r=>`- [${r.title}](${DOMAIN}/ratgeber/${r.slug}/)`).join('\n')}\n\n## Kontakt\n- Telefon: ${nap.phone_display}\n- Ort: ${nap.street}, ${nap.zip} ${nap.city}\n`;
  fs.writeFileSync('website/llms.txt', llms);
  // IndexNow-Verifikationsdatei (Root) — nur bei echtem Key
  if (config.indexnow_key && !/TBD|XXXX|null/i.test(config.indexnow_key)) fs.writeFileSync(`website/${config.indexnow_key}.txt`, config.indexnow_key);
}

// ---------- RUN ----------
// sauberer Output, keine stale Seiten — Kinder einzeln entfernen (Windows-EPERM-sicher)
if (fs.existsSync('website')) for (const e of fs.readdirSync('website')) { try { fs.rmSync(`website/${e}`, { recursive: true, force: true, maxRetries: 5, retryDelay: 120 }); } catch (err) { console.warn(`WARN wipe ${e}: ${err.code}`); } }
home();
services.forEach(hub);
haupt.forEach(ortsHub);
(ratCopy.length ? ratCopy : RATGEBER_FALLBACK).forEach(ratgeberPage);
basis();
ueberUns();
bewertungen();
b2bPage();
danke();
notFound();
if (FULL) {
  for (const s of services) if (PAGE_SVC.has(s.slug)) for (const o of orteForService(s)) ortsseite(s, o);
} else {
  for (const [ss, os] of SAMPLE_ORTSSEITEN) { const s = services.find(x=>x.slug===ss), o = orte.find(x=>x.slug===os); if (s && o) ortsseite(s, o); }
}
sitemaps();
fs.cpSync('assets', 'website/assets', { recursive: true });
const total = written.basis.length + written.hubs.length + written.ortsseiten.length + written.orts_hubs.length + written.ratgeber.length;
console.log(`Generiert (${FULL?'FULL':'SAMPLE'}): ${written.basis.length} Basis + ${written.hubs.length} Hubs + ${written.ortsseiten.length} Ortsseiten + ${written.orts_hubs.length} Orts-Hubs + ${written.ratgeber.length} Ratgeber = ${total} Seiten`);
