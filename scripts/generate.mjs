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
  trustBadges, fristband, aeoKapsel, beweisMechanik, saisonTeaser, clusterKacheln, faelleBlock, tiefBlock,
  leistungsListe, vorteileBlock, passtBlock, orteBlock, soLaeufts, galabauKarten, ergebnisPaare,
  seitenHero, badgeSitz, ortZeile, falkenseeKasten, gruppenKopf, stufe2Band, kernKarten, anfaelltBlock, naeheZeile, faqKurz,   // Paket 3 (Standorte)
  zielgruppenKarten, gwListe, zusagenBand4, zweiWege, anlaesseBlock, fuerWen, ablaufSektion   // Paket 3 (Gewerbe)
} from './components.mjs';
import { buildLp, lpAttribJS, ATTR_KEYS } from './lp.mjs';

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
const CONSENT_KEY = 'consent_v2'; // Review 14.09.: versionierter Consent-Speicher (Zweck-Erweiterung Ads) — Alt-Key 'consent' wird ignoriert
const ANALYTICS_HEAD = TRACK ? `
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('consent','default',{ad_storage:'denied',analytics_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',functionality_storage:'granted',security_storage:'granted',wait_for_update:500});gtag('set','url_passthrough',true);gtag('set','ads_data_redaction',true);try{var __c=JSON.parse(localStorage.getItem('${CONSENT_KEY}')||'null');if(__c&&__c.c==='allow'&&Date.now()-(__c.t||0)<365*864e5){gtag('consent','update',{ad_storage:'granted',analytics_storage:'granted',ad_user_data:'granted',ad_personalization:'granted'})}}catch(e){}</script>
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f)})(window,document,'script','dataLayer','${GTM}');</script>` : '';
const ANALYTICS_BODY = TRACK ? `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>` : '';
const CONSENT_BANNER = TRACK ? `<div id="consent" class="consent" hidden><div class="consent-in"><p>Wir nutzen Cookies für Statistik (Google Analytics) und die Erfolgsmessung unserer Google-Werbung — Daten gehen an Google, auch in die USA. Details und Widerruf in der <a href="/datenschutz/">Datenschutzerklärung</a>.</p><div class="consent-btns"><button type="button" class="btn btn-line" data-c="deny">Ablehnen</button><button type="button" class="btn btn-acc" data-c="allow">Akzeptieren</button></div></div></div>
<script>(function(){var box=document.getElementById('consent');if(!box)return;var K='${CONSENT_KEY}';function gtag(){dataLayer.push(arguments)}var grant={analytics_storage:'granted',ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted'},deny={analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'};function read(){try{var v=JSON.parse(localStorage.getItem(K)||'null');if(v&&v.t&&Date.now()-v.t>365*864e5){localStorage.removeItem(K);return null}return v}catch(e){return null}}if(!read()){box.hidden=false}box.addEventListener('click',function(e){var b=e.target.closest('button[data-c]');if(!b)return;var c=b.getAttribute('data-c');try{localStorage.setItem(K,JSON.stringify({c:c,v:2,t:Date.now()}))}catch(x){}gtag('consent','update',c==='allow'?grant:deny);if(window.dataLayer){dataLayer.push({event:'consent_choice',consent_choice:c})}box.hidden=true})})();</script>` : '';
const CONSENT_RESET_JS = TRACK ? `<script>(function(){var a=document.getElementById('consent-reset');if(!a)return;a.addEventListener('click',function(e){e.preventDefault();try{localStorage.removeItem('${CONSENT_KEY}')}catch(x){}var box=document.getElementById('consent');if(box){box.hidden=false;box.scrollIntoView({behavior:'smooth',block:'end'})}})})();</script>` : '';
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
function sanHub(h) { for (const k of ['title','meta','h1','h1_em','intro','definition','naehe','ablauf','garantie_text','ortsseite_lead','sections_h2']) if (h[k] != null) h[k] = plain(h[k]); if (h.sections) for (const s of h.sections) { s.h3 = plain(s.h3); s.body = plain(s.body); } if (h.faqs) for (const f of h.faqs) { f.q = plain(f.q); f.a = plain(f.a); } if (h.faelle) for (const f of h.faelle) { for (const k of ['h3','meta','body','zitat','zitat_von']) if (f[k] != null) f[k] = plain(f[k]); } if (h.blocks) for (const b of h.blocks) { for (const k of ['h2','lead','body','img_alt']) if (b[k] != null) b[k] = plain(b[k]); } return h; }   // faelle/blocks[].lead|img_alt (Pillar-Hub 17.09.)
function sanArch(a) { a.rahmen = _pa(a.rahmen); a.trust = _pa(a.trust); if (a.faqs) for (const f of a.faqs) { f.q = plain(f.q); f.a = plain(f.a); } return a; }
function sanRat(r) { for (const k of ['title','meta','lead','intro','cta_text']) if (r[k] != null) r[k] = plain(r[k]); if (r.sections) for (const s of r.sections) { s.h2 = plain(s.h2); s.body_html = fixHtml(s.body_html); } if (r.faqs) for (const f of r.faqs) { f.q = plain(f.q); f.a = plain(f.a); } return r; }
function sanOrt(o) { if (o.hook) o.hook = plain(o.hook); if (o.nachbarorte) o.nachbarorte = o.nachbarorte.map(plain); return o; }

const _hubArr = CP('hubs.json'); const hubCopy = {}; if (_hubArr) for (const h of (_hubArr.hubs || _hubArr)) hubCopy[h.slug] = sanHub(h);
const _archArr = CP('archetypes.json'); const archCopy = {}; if (_archArr) for (const a of (_archArr.archetypes || _archArr)) archCopy[a.key] = sanArch(a);
const _ratArr = CP('ratgeber.json'); const ratCopy = ((_ratArr && (_ratArr.ratgeber || _ratArr)) || []).map(sanRat);
const _orteCp = CP('orte.json'); const orteCopy = (_orteCp && _orteCp.orte) || {}; for (const k in orteCopy) sanOrt(orteCopy[k]);
// Welle-1a: bespoke Ortsseiten-Copy (service×ort) — ersetzt Archetyp/Ort-Hook + Archetyp-FAQ auf der Ortsseite (Fallback bleibt Archetyp). Dach: Partner-Framing (gu-modell.md, §5 UWG).
function sanOrtsSvc(o) { if (o.meta != null) o.meta = plain(o.meta); if (o.faqs) for (const f of o.faqs) { f.q = plain(f.q); f.a = plain(f.a); } if (o.orte) for (const k in o.orte) { const e = o.orte[k]; for (const kk of ['hook', 'rahmen', 'trust', 'fakt']) if (e[kk] != null) e[kk] = plain(e[kk]);
  // tief (W2): Tiefen-Block für Tier-1-Ortsseiten — h2/sections/ortsblock/blocks/faelle/faqs sanitizen.
  if (e.tief) { const t = e.tief; if (t.h2 != null) t.h2 = plain(t.h2); for (const x of (t.sections || [])) { x.h3 = plain(x.h3); x.body = plain(x.body); if (x.link_text != null) x.link_text = plain(x.link_text); } if (t.ortsblock) { t.ortsblock.h2 = plain(t.ortsblock.h2); for (const i of (t.ortsblock.items || [])) { i.k = plain(i.k); i.v = plain(i.v); } if (t.ortsblock.quelle != null) t.ortsblock.quelle = plain(t.ortsblock.quelle); } for (const b of (t.blocks || [])) { b.h2 = plain(b.h2); b.body = plain(b.body); if (b.link_text != null) b.link_text = plain(b.link_text); } for (const f of (t.faelle || [])) for (const k of ['h3','meta','body','zitat','zitat_von']) if (f[k] != null) f[k] = plain(f[k]); for (const f of (t.faqs || [])) { f.q = plain(f.q); f.a = plain(f.a); } for (const k of ['cta_grid', 'cta_after']) if (t[k]) { if (t[k].h2 != null) t[k].h2 = plain(t[k].h2); if (t[k].txt != null) t[k].txt = plain(t[k].txt); } }
} return o; }   // fakt (17.09.): Ein-Satz-Ortsfakt für die Hub-Ortskarten
const _ortsSvcCp = CP('ortsseiten.json'); const ortsSvcCopy = (_ortsSvcCp && _ortsSvcCp.services) || {}; for (const k in ortsSvcCopy) sanOrtsSvc(ortsSvcCopy[k]);
// Reverse-Index Service → Ratgeber (interne Verlinkung, seiten-architektur §7)
// Erster Satz eines Fließtexts; Abkürzungen (ca., z. B., inkl., bzw., Nr. …) und Ordnungszahlen vor Monatsnamen (1. Oktober) zählen nicht als Satzende.
const ABKUERZ = /(?:^|[\s(„"])(?:ca|z\. ?B|d\. ?h|u\. ?a|u\. ?U|inkl|bzw|Nr|ggf|ggfs|evtl|vgl|max|min|Abs|Std|Mio|Tsd|bzgl|usw|etc|zzgl|Str|Dr|Prof|St)\.$/i;
const MONAT = /^(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\b/;
function ersterSatz(txt) {
  const s = String(txt == null ? '' : txt).replace(/\s+/g, ' ').trim();
  const re = /[.!?](?=\s|$)/g; let m;
  while ((m = re.exec(s)) !== null) {
    const head = s.slice(0, m.index + 1), rest = s.slice(m.index + 1).trim();
    if (!rest) return s;
    if (m[0] === '.' && (ABKUERZ.test(head) || (/(?:^|\s)\d{1,2}\.$/.test(head) && (MONAT.test(rest) || /^[a-zäöüß]/.test(rest))))) continue;
    return head;
  }
  return s;
}
const RATGEBER_AUSBLENDEN = { heckenschnitt: ['hecke-schneiden-erlaubt'] };   // fast gleich zu wann-hecke-schneiden (Copy M4)
const ratgeberByService = {}; for (const r of ratCopy) { if (!r.cta_service) continue; (ratgeberByService[r.cta_service] = ratgeberByService[r.cta_service] || []).push(r); }

// Übersichtsseiten-Copy (/leistungen/ + /standorte/) — Intros/FAQ; Labels stehen in den Maps unten
const _ueb = CP('uebersicht.json') || {}; const uebL = _ueb.leistungen || {}; const uebS = _ueb.standorte || {};
// ---------- Gewerbe (Paket 3b, 21.10.2026): Copy data/copy/gewerbe.json + Zielgruppen-Stammdaten ----------
// Spec: websites/havelland/website/paket3-standorte-gewerbe-2026-10/01-design-spec.md Teil B. Copy = { uebersicht, zielgruppen.<key> }; fehlende Felder fallen auf Standardwerte zurück (Seiten bleiben baubar).
const GW_SKIP = new Set(['url', 'slug', 'key', 'to', 'link_to', 'mail_body', 'ausfuehrung', 'quellen', 'quelle', '_meta']);   // URLs, Slugs, Mailtext mit Zeilenumbrüchen: nicht durch plain() schicken
const sanGw = (v, k) => Array.isArray(v) ? v.map(x => sanGw(x, k)) : (v && typeof v === 'object') ? Object.fromEntries(Object.entries(v).map(([kk, vv]) => [kk, sanGw(vv, kk)])) : (typeof v === 'string' && !GW_SKIP.has(k)) ? plain(v) : v;
const GW = sanGw(CP('gewerbe.json') || {});
const gwU = GW.uebersicht || {};
const ZG = {   // Reihenfolge = Reihenfolge in Menü, Karten, Footer
  hausverwaltungen: { url: '/fuer-hausverwaltungen/', nav: 'Hausverwaltungen & WEG', wer: 'Hausverwaltungen', bild: 'svc-objektbetreuung-hero', schema: 'Wohnungsräumung und Objektpflege für Hausverwaltungen und WEG', publikum: 'Hausverwaltungen und Wohnungseigentümergemeinschaften' },
  firmen: { url: '/fuer-firmen/', nav: 'Firmen & Gewerbe', wer: 'Firmen', bild: 'svc-gebaeudereinigung-hero', schema: 'Reinigung, Hausmeister und Außenanlagen für Firmen', publikum: 'Firmen und Gewerbebetriebe' },
  pflegeeinrichtungen: { url: '/fuer-pflegeeinrichtungen/', nav: 'Pflegeeinrichtungen', wer: 'Pflegeeinrichtungen', bildKey: 'pflege', bild: 'svc-haushaltsaufloesung-hero', schema: 'Zimmer- und Wohnungsräumung für Pflegeeinrichtungen', publikum: 'Pflegeeinrichtungen und Pflegedienste' },
  bestatter: { url: '/fuer-bestatter/', nav: 'Bestatter', wer: 'Bestattern', bild: 'zielgruppe-bestatter', bild2: 'svc-grundreinigung-hero', schema: 'Haushaltsauflösung nach einem Todesfall für Bestatter und Angehörige', publikum: 'Bestattungshäuser und Angehörige' }
};
const GW_PARTNER_EXTRA = new Set();   // Owner 20.10. abends: Grundreinigung ist Eigenleistung (Partner-Angabe aufgehoben). Partner bleiben nur Winterdienst, Dachrinnen-/Dachreinigung (services.json partner_modell) und Bauendreinigung (nur Text, kein eigener Service).
// Gruppierung: Service-Slug → Themen-Block (Portfolio-Refokus 2026-07-22: Garten & Außen · Entrümpelung & Auflösung · Dach · Für Gewerbe & Hausverwaltungen). Reihenfolge = Anzeige-Reihenfolge. b2b_only-Services (hausmeisterservice) leben im Gewerbe-Block.
// Paket 1 (20.10., Owner-Reihenfolge): EINE Gliederung für Menü, /leistungen/, Fußzeile, Startseite.
// kern = groß (Menü, Buttons), auf_anfrage = kleine Textlinks („Auf Anfrage auch“). Einträge: Service-Slug oder {href,label}.
const LEISTUNGEN_KATEGORIEN = [
  { key: 'garten', label: 'Garten & Pflege', href: '/gartenpflege/', satz: 'Damit der Garten das ganze Jahr ordentlich aussieht.', foto: 'svc-baumschnitt-hero',
    kern: ['gartenpflege', 'heckenschnitt', 'baumschnitt', 'heckenentfernung', { href: '/gartenpflege/#herbst-paket', label: 'Herbst-Paket' }], auf_anfrage: [] },
  { key: 'haus', label: 'Haus & Reinigung', href: '/leistungen/#haus', satz: 'Rund ums Haus sauber und sicher, auch im Winter.', foto: 'svc-dachrinnenreinigung-hero',
    kern: ['dachrinnenreinigung', 'winterdienst', 'steinreinigung'], auf_anfrage: ['fensterreinigung', 'dachreinigung'] },
  { key: 'galabau', label: 'Garten- und Landschaftsbau', href: '/galabau/', satz: 'Bauen, pflastern, neu anlegen — und vorher roden.', foto: 'svc-pflasterarbeiten-hero',
    kern: ['pflasterarbeiten', 'terrassenbau', 'zaunbau', 'erdarbeiten', 'gartenrodung', 'rollrasen-verlegen'], auf_anfrage: ['einfahrt-pflastern', 'gartengestaltung', 'baumstumpf-entfernen', 'baumfaellung', { href: '/pflasterarbeiten/#kantensteine', label: 'Kantensteine & Hochbeete' }] },
  { key: 'aufloesung', label: 'Entrümpelung & Auflösung', href: '/entruempelung/', satz: 'Ausräumen, abfahren, besenrein übergeben.', foto: 'svc-haushaltsaufloesung-hero',
    kern: ['entruempelung', 'haushaltsaufloesung', 'grundreinigung'], auf_anfrage: [] },
  { key: 'gewerbe', label: 'Hausverwaltungen & Gewerbe', href: '/gewerbe/', satz: 'Ein Vertrag, ein Ansprechpartner für Ihre Objekte.', foto: 'svc-objektbetreuung-hero',
    kern: ['objektbetreuung', 'hausmeisterservice', 'unterhaltsreinigung', 'gebaeudereinigung'], auf_anfrage: ['ferienwohnung-reinigung'] }
];
for (const k of LEISTUNGEN_KATEGORIEN) k.slugs = [...k.kern, ...k.auf_anfrage].filter(x => typeof x === 'string');   // alle Service-Slugs (ItemList, Prüfungen)
// Kurzlabels für Menü + Fußzeile (Service-Namen sind teils lang, z. B. "Baumstumpf- & Wurzelentfernung")
const NAV_LABEL = { 'baumstumpf-entfernen': 'Baumstumpf entfernen', grundreinigung: 'Auszugsreinigung', 'ferienwohnung-reinigung': 'Ferienwohnung-Reinigung', baumschnitt: 'Baumschnitt', 'rollrasen-verlegen': 'Rollrasen verlegen', 'einfahrt-pflastern': 'Einfahrt pflastern', heckenentfernung: 'Hecke entfernen', dachrinnenreinigung: 'Dachrinne' };
const navLabel = s => NAV_LABEL[s.slug] || s.name;
// Eintrag → {href,label,slug}; unbekannte Slugs fallen raus (kein toter Link).
const katItem = x => { if (typeof x !== 'string') return { href: x.href, label: x.label, slug: null }; const s = services.find(v => v.slug === x); return s ? { href: `/${s.slug}/`, label: navLabel(s), slug: s.slug } : null; };
const katKern = k => k.kern.map(katItem).filter(Boolean);
const katAnfrage = k => k.auf_anfrage.map(katItem).filter(Boolean);
const katServices = k => k.slugs.map(sl => services.find(s => s.slug === sl)).filter(Boolean);

const PAGE_SVC = new Set(['heckenschnitt','gartenpflege','fensterreinigung','entruempelung','haushaltsaufloesung','winterdienst','steinreinigung','dachrinnenreinigung','dachreinigung','hausmeisterservice','gebaeudereinigung','unterhaltsreinigung','ferienwohnung-reinigung','heckenentfernung','baumstumpf-entfernen','pflasterarbeiten','erdarbeiten','baumfaellung','galabau']);   // GaLaBau-Ausbau 20.10.: Ortsseiten nur über service.seiten_orte
// Paket 1 (20.10.): Hubs im Grundgerüst (Spec 05-design-spec-paket1.md §3.3). Entrümpelung bleibt bis Paket 2 im alten Aufbau; Gewerbe-Hubs seit Paket 3 (21.10.) im Grundgerüst.
const GW_HUBS = ['objektbetreuung', 'hausmeisterservice', 'unterhaltsreinigung', 'gebaeudereinigung', 'ferienwohnung-reinigung'];
const GRUNDGERUEST = new Set([...GW_HUBS, 'gartenpflege', 'heckenschnitt', 'baumschnitt', 'heckenentfernung', 'dachrinnenreinigung', 'winterdienst', 'steinreinigung', 'fensterreinigung', 'dachreinigung', 'galabau', 'pflasterarbeiten', 'einfahrt-pflastern', 'terrassenbau', 'zaunbau', 'gartengestaltung', 'rollrasen-verlegen', 'erdarbeiten', 'gartenrodung', 'baumfaellung', 'baumstumpf-entfernen']);
const ORTE_TOP = (() => { try { return J('orte-top.json'); } catch { return { fallback: ['falkensee'] }; } })();
// Gewerk-Klassen fuer die Voll-Print-Komposition der Hubs/Ortsseiten:
//  VOLL_VN   = echtes Vorher/Nachher-Material -> Slider + Heckenkompass + Schnittkalender
//  GARTEN    = Garten ohne V/N-Material -> kein Slider/Kompass, Ortskarten + Foto-Flow
//  REINIGUNG = Reinigungs-Gewerke -> beweisMechanik (Gegenlicht) statt Slider, kein Teleskop/Osmose
//  Rest      = generische Rich-Variante (Entruempelung/Umzug/Hausmeister/Objekt ...)
const VOLL_VN = new Set(['heckenschnitt']);
const GARTEN = new Set(['gartenpflege', 'winterdienst', 'heckenentfernung', 'baumstumpf-entfernen', 'gartenrodung', 'baumschnitt', 'galabau', 'zaunbau', 'pflasterarbeiten', 'einfahrt-pflastern', 'terrassenbau', 'rollrasen-verlegen', 'gartengestaltung', 'erdarbeiten', 'baumfaellung']);
const REINIGUNG = new Set(['fensterreinigung', 'steinreinigung', 'dachrinnenreinigung', 'photovoltaikreinigung', 'grundreinigung', 'gebaeudereinigung', 'unterhaltsreinigung', 'ferienwohnung-reinigung']);
const BEWEIS_KEY = { fensterreinigung: 'fensterreinigung', steinreinigung: 'steinreinigung', dachrinnenreinigung: 'dachrinnenreinigung' }; // eigene Beweis-Copy vorhanden
const gewerkClass = slug => VOLL_VN.has(slug) ? 'voll' : GARTEN.has(slug) ? 'garten' : REINIGUNG.has(slug) ? 'reinigung' : 'generisch';
// WhatsApp-Block: das Foto zeigt Heckenschnitt — auf Services ohne Hecken-Bezug neutrale Alt-/Unterzeile (Audit 2026-08 P2-b; 15.09. + Entrümpelung/Haushaltsauflösung, Review 14.09.)
const FOTO_NEUTRAL = new Set(['baumstumpf-entfernen', 'winterdienst', 'entruempelung', 'haushaltsaufloesung', 'pflasterarbeiten', 'einfahrt-pflastern', 'terrassenbau', 'rollrasen-verlegen', 'gartengestaltung', 'erdarbeiten', 'baumfaellung']);
const waGewerk = s => VOLL_VN.has(s.slug) ? 'meiner Hecke' : REINIGUNG.has(s.slug) ? `meiner Fläche für ${s.name}` : GARTEN.has(s.slug) ? 'meinem Garten' : `meinem Anliegen (${s.name})`;
const PREMIUM = new Set(['gross-glienicke','berlin-kladow','berlin-gatow']);
const sectionOT = new Set(Object.keys(ortsteileVon).filter(s => !PREMIUM.has(s)));
const launch = orte.filter(o => o.geo === 'A' || o.geo === 'B');
// nur_seiten-Orte (GaLaBau-Ausbau 20.10., z. B. Potsdam): kein Teil des Servicegebiets-Rasters (keine Orts-Hubs, kein areaServed, kein Segment-Matching) — nur über service.seiten_orte erreichbar.
const haupt = launch.filter(o => !sectionOT.has(o.slug) && !o.nur_seiten);
const segMatch = (s, o) => s.segment.some(x => o.typ.includes(x));
// b2b_only-Services (hausmeisterservice): raus aus Privatkunden-Kontexten → keine Ortsseiten, nicht in Orts-Hubs/Kernleistungen. Getragen von /fuer-hausverwaltungen/ + Footer-B2B-Block.
const orteForService = s => s.b2b_only ? [] : haupt.filter(o => s.orte_fix ? s.orte_fix.includes(o.slug) : segMatch(s, o));
// seiten_orte (20.10.): gezielte Ortsseiten je Service, unabhängig vom areaServed-Raster (orteForService bleibt fürs Schema).
const seitenOrte = s => s.seiten_orte ? s.seiten_orte.map(sl => orte.find(o => o.slug === sl)).filter(Boolean) : orteForService(s);
const servicesForOrt = o => services.filter(s => PAGE_SVC.has(s.slug) && !s.b2b_only && (s.seiten_orte ? s.seiten_orte.includes(o.slug) : s.orte_fix ? s.orte_fix.includes(o.slug) : segMatch(s, o)));
const ortsHubSlugs = new Set(haupt.filter(o => servicesForOrt(o).length >= 3).map(o => o.slug));   // Orte mit /standorte/<slug>/ (Gebietskarten-Links, Owner 18.09.)
// Service-scharfes Wellen-Gate: Ortsseiten/Ratgeber eines Service indexierbar erst wenn aktive_welle >= service.wave; wave null = globales Gate (<1). Rückwärtskompatibel: bei aktive_welle 0 bleibt ALLES noindex.
const svcWaveNoindex = s => (config.aktive_welle || 0) < (s && s.wave != null ? s.wave : 1);
const svcNoindexBySlug = slug => svcWaveNoindex(services.find(x => x.slug === slug));

// Welche Ortsseiten werden TATSÄCHLICH gerendert? (Manifest-First → Link-Graph geschlossen, keine 404)
const SAMPLE_ORTSSEITEN = [['heckenschnitt','falkensee'],['gartenpflege','berlin-kladow'],['steinreinigung','dallgow-doeberitz'],['fensterreinigung','nauen'],['entruempelung','wustermark'],['haushaltsaufloesung','brieselang'],['winterdienst','falkensee'],['dachreinigung','schoenwalde-glien'],['gebaeudereinigung','berlin-spandau'],['ferienwohnung-reinigung','werder-havel'],['dachrinnenreinigung','dallgow-doeberitz']];
const PAGE_ORTS = [];
for (const s of services) if (PAGE_SVC.has(s.slug)) for (const o of seitenOrte(s)) PAGE_ORTS.push([s.slug, o.slug]);
const genOrts = new Set((FULL ? PAGE_ORTS : SAMPLE_ORTSSEITEN).map(([a, b]) => a + '|' + b));
const hasOrt = (ss, os) => genOrts.has(ss + '|' + os);
// per-Archetyp Ort-Index → gleichmäßige Pool-Verteilung (eindeutige rahmen/trust-Tupel statt Seed-Kollisionen)
const archOrtIdx = {}; { const cnt = {}; for (const o of haupt) { const a = ((_orteCp && _orteCp.orte && _orteCp.orte[o.slug]) || {}).archetype || 'x'; archOrtIdx[o.slug] = (cnt[a] = (cnt[a] || 0) + 1) - 1; } }
// Service-Versatz auf denselben Pool: ohne ihn zogen ALLE Services eines Ortes denselben rahmen/trust-Eintrag
// (heckenschnitt-falkensee, gartenpflege-falkensee, winterdienst-falkensee … wortgleich — Duplicate-Signal 08.08.2026).
// Pool ist 4 rahmen × 3 trust = 12 Kombis je Archetyp; bei ≤9 Services pro Ort kollidiert kein (rahmen,trust)-Tupel.
const svcPoolIdx = {}; services.forEach((s, i) => { svcPoolIdx[s.slug] = i; });

const esc = t => (t == null ? '' : String(t)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
// sj: JSON-LD-String-Wert — rohes & (kein HTML-Escape), aber < -> < (kein </script>-Ausbruch) + JSON-escape
const sj = v => String(v == null ? '' : decEnt(v)).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/</g, '\\u003c').replace(/[\r\n\t]+/g, ' ');
const leaf = cls => `<svg class="${cls}" viewBox="0 0 100 100"><path fill="currentColor" d="M90 10C38 12 10 42 10 92c32-2 52-15 63-35 2 15-3 27-3 27s20-23 20-54c0-10-2-21 0-20Z"/></svg>`;
const tel = nap.phone_e164; const waHref = q => `https://wa.me/${tel.replace('+','')}?text=${encodeURIComponent(q)}`;
const ctaA = '<a class="btn btn-acc" href="/kontakt/#anfrage">Kostenlose Besichtigung anfragen</a>';
const ctaPrim = label => `<a class="btn btn-acc" href="/kontakt/#anfrage">${label}</a>`;
// Primär-CTA-Label je Service (Umbau 03.09.): Winterdienst bekommt ein sprechendes Label, sonst Standard.
const primLabel = s => (s && s.slug === 'winterdienst') ? 'Winterdienst-Besichtigung anfragen' : 'Kostenlose Besichtigung anfragen';
// Copy-Link-Ziel "slug" oder "slug#anker" oder "ratgeber/slug" → "/slug/#anker" (kein rohes HTML in JSON)
const hrefOf = t => { const [p, f] = String(t || '').split('#'); return `/${p.replace(/^\/|\/$/g, '')}/${f ? '#' + f : ''}`; };
const copyLinks = x => [x.link_to ? `<a href="${hrefOf(x.link_to)}">${esc(x.link_text || 'Mehr erfahren')}</a>` : '', x.link2_to ? `<a href="${hrefOf(x.link2_to)}">${esc(x.link2_text || 'Mehr erfahren')}</a>` : ''].filter(Boolean);
const copyLinksHtml = x => { const l = copyLinks(x); return l.length ? ' ' + l.join(' · ') + '.' : ''; };
const CTA_ANGEBOT = 'Begehung anfragen';   // Nachbesserung 20.10.: ein Label, ein Ziel (/kontakt/#anfrage) auf allen Gewerbe-Seiten
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
  const items = faqs.map(f => `<details><summary>${esc(f.q)}<span class="pm" aria-hidden="true"></span></summary><p>${esc(f.a)}</p></details>`).join('');
  return `<section class="sec${alt ? ' section-alt' : ''}"><div class="wrap"><h2 class="serif rv" style="text-align:center;max-width:18em;margin:0 auto 28px">Häufige Fragen</h2><div class="faq rv">${items}</div></div></section>`;
}
// Title ≤60 / Meta 150–158 erzwingen — escape-aware (gemessen wird die gerenderte Länge mit &amp; etc.)
const rlen = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').length;
function clampTitle(s) { s = (s || '').replace(/\s+/g, ' ').trim(); while (rlen(s) > 60) { const sp = s.lastIndexOf(' '); if (sp < 30) { s = s.slice(0, s.length - 1); continue; } s = s.slice(0, sp); } s = s.replace(/[ ,;:–-]+$/, ''); while (DANGLE.test(s)) s = s.replace(DANGLE, '').replace(/[ ,;:–-]+$/, ''); return s; } // kein hängendes "im/und" nach dem Kürzen (Umbau 03.09.)
const META_TAIL = ' Ein fester Ansprechpartner im Havelland und Berliner Umland, telefonisch oder per WhatsApp erreichbar, mit kostenloser Vor-Ort-Besichtigung.';
const DANGLE = /\s+(per|und|mit|nach|für|im|in|zu|von|der|die|das|ein|eine|einen|am|an|auf|bei|als|wie|oder|aus|über|unter|vor|jetzt|noch|so|dem|den|selben|selbe|selber|selbem)$/i;   // „am selben“ (ohne „Tag“) ist ein Abbruch, kein Satzende
// Tail klauselweise (16.09., Audit Zaunbau): vorher wurde der ganze META_TAIL angehängt und hart bei 158 gekürzt →
// bei Copy-Metas um 140–150 Zeichen blieb „… Ein fester." als Rest (19 Seiten betroffen). Jetzt nur ganze Klauseln, die passen.
// Article-Schema (Audit Zaunbau 16.09.): datePublished/dateModified fehlten sitewide. Copy-Feld date_published/date_modified je Ratgeber, sonst Default = Launch der Ratgeber-Welle.
const RATGEBER_DEFAULT_DATE = '2026-07-01';
const META_CLAUSES = ['Ein fester Ansprechpartner im Havelland und Berliner Umland', 'telefonisch oder per WhatsApp erreichbar', 'mit kostenloser Vor-Ort-Besichtigung'];
function mkMeta(s) {
  s = (s || '').replace(/\s+/g, ' ').trim();
  const finish = t => { t = t.replace(/[ ,;:.–-]+$/, ''); while (DANGLE.test(t)) t = t.replace(DANGLE, '').replace(/[ ,;:.–-]+$/, ''); return t + '.'; };
  if (rlen(s) >= 150) {                                   // lang genug → nur kürzen, bevorzugt an Klausel-/Satz-Grenze
    let t = s;
    while (rlen(t) > 158) { const sp = t.lastIndexOf(' '); if (sp < 110) break; t = t.slice(0, sp); }
    const cl = Math.max(t.lastIndexOf(', '), t.lastIndexOf('. '));
    if (cl >= 150) t = t.slice(0, cl);
    return finish(t);
  }
  let t = s.replace(/[ ,;:.–-]+$/, '');                    // zu kurz → Tail-Klauseln anhängen, solange sie ganz passen
  META_CLAUSES.forEach((c, i) => { const cand = t + (i === 0 ? '. ' : ', ') + c; if (rlen(cand) <= 157) t = cand; });
  return finish(t);
}
// deterministische Rotation (Uniqueness ohne Zufall)
const seedOf = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
function rotate(arr, seed, n) { if (!arr || !arr.length) return []; const out = []; const a = arr.slice(); const start = seed % a.length; for (let i = 0; i < Math.min(n, a.length); i++) out.push(a[(start + i) % a.length]); return out; }

// ---------- BILDER: Manifest + zentrale <picture>-Komponente (AVIF/WebP/Fallback, responsive) ----------
const IMG = JSON.parse(fs.readFileSync('assets/img/manifest.json', 'utf8'));
// pic(): <picture style="display:contents"> -> bestehende .main/.pic-CSS-Regeln greifen weiter aufs <img>. LCP-Bild: fetchpriority statt fehleranfälligem preload bei <picture>.
function pic(slug, { cls = '', alt = '', sizes = '100vw', lcp = false, eager = false, decorative = false } = {}) {
  const m = IMG[slug];
  if (!m) return '';
  const ss = ext => m.widths.map(w => `/assets/img/${slug}-${w}.${ext} ${w}w`).join(', ');
  const sources = (m.avif ? `<source type="image/avif" srcset="${ss('avif')}" sizes="${sizes}">` : '') + `<source type="image/webp" srcset="${ss('webp')}" sizes="${sizes}">`;
  const aAttr = decorative ? 'alt="" role="presentation"' : `alt="${esc(alt)}"`;
  const lAttr = lcp ? 'fetchpriority="high" decoding="async"' : eager ? 'decoding="async"' : 'loading="lazy" decoding="async"';   // eager: sichtbar im ersten Bildschirm, nicht lazy (kein fetchpriority)
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
const RAT_IMG = { 'wann-hecke-schneiden': 'ratgeber-heckenschnitt-zeitpunkt', 'hecke-schneiden-erlaubt': 'ratgeber-heckenschnitt-zeitpunkt', 'heckenschnitt-kosten': 'ratgeber-heckenschnitt-zeitpunkt', 'hecke-entfernen-erlaubt': 'ratgeber-heckenschnitt-zeitpunkt', 'hecke-entfernen-kosten': 'ratgeber-heckenschnitt-zeitpunkt', 'entruempelung-kosten': 'ratgeber-entruempelung-kosten', 'was-kostet-entruempelung': 'ratgeber-entruempelung-kosten', 'haushaltsaufloesung-kosten': 'ratgeber-haushaltsaufloesung-checkliste', 'haushaltsaufloesung-checkliste': 'ratgeber-haushaltsaufloesung-checkliste', 'fensterreinigung-preise': 'ratgeber-fensterreinigung-preise', 'fenster-putzen-streifenfrei': 'ratgeber-fensterreinigung-preise', 'winterdienst-streupflicht-brandenburg': 'ratgeber-winterdienst-pflichten', 'winterdienst-kosten': 'ratgeber-winterdienst-pflichten', 'dachrinne-reinigen-kosten': 'ratgeber-dachrinne-herbst', 'dachrinne-reinigen-wie-oft': 'ratgeber-dachrinne-herbst', 'terrasse-reinigen': 'ratgeber-pflaster-gruenbelag', 'pflaster-reinigen': 'ratgeber-pflaster-gruenbelag', 'rasen-maehen-wie-oft': 'ratgeber-rasenpflege-kalender', 'rasen-vertikutieren-wann': 'ratgeber-rasenpflege-kalender', 'laub-entfernen-pflicht': 'ratgeber-rasenpflege-kalender', 'gartenpflege-kosten': 'ratgeber-rasenpflege-kalender', 'pv-reinigung-lohnt-sich': 'ratgeber-photovoltaik-reinigung', 'ferienwohnung-endreinigung-kosten': 'ratgeber-ferienwohnung-wechsel', 'umzug-checkliste': 'ratgeber-umzug-tipps', 'baumstumpf-entfernen-kosten': 'svc-baumstumpf-entfernen-hero', 'verwilderten-garten-roden': 'svc-gartenrodung-hero', 'zaun-kosten': 'ratgeber-zaun-kosten', 'doppelstabmattenzaun-montage-kosten': 'ratgeber-doppelstab-montage', 'zaun-genehmigung-brandenburg': 'ratgeber-zaun-genehmigung-brandenburg', 'wertstoffhof-falkensee': 'svc-entruempelung-hero', 'sperrmuell-havelland-anmelden': 'svc-entruempelung-hero', 'keller-garage-dachboden-entruempeln': 'svc-entruempelung-hero', 'gartenhaus-abreissen-entsorgen': 'svc-gartenrodung-hero' };
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
  // GEO (W3-Audit 17.09.): sameAs verankert die Organization am Google-Unternehmensprofil (nap.same_as) — nur rendern, wenn das Array nicht leer ist.
  const sameAs = (Array.isArray(nap.same_as) && nap.same_as.length) ? `,"sameAs":${JSON.stringify(nap.same_as)}` : '';
  return `{"@type":"HomeAndConstructionBusiness","@id":"${DOMAIN}/#organization","name":"${sj(nap.name)}","telephone":"${tel}","url":"${DOMAIN}/","image":"${imgAbs('og-default')}","logo":"${DOMAIN}/assets/img/logo.png"${addr}${geo}${oh}${sameAs},"areaServed":${JSON.stringify(haupt.map(o => o.name))}}`;
}
function breadcrumb(items) { // [{name,url}]
  const li = items.map((it,i)=>`{"@type":"ListItem","position":${i+1},"name":"${sj(it.name)}"${it.url?`,"item":"${DOMAIN}${it.url}"`:''}}`).join(',');
  return `{"@type":"BreadcrumbList","itemListElement":[${li}]}`;
}
// WebSite-Schema nur auf der Startseite (Google Site-Name-Richtlinie): name + publisher-Verknuepfung zur Organization, kein SearchAction (keine Site-Suche).
// nap.name ist bereits die Kurzform ("Haus- & Gartenservice Havelland", keine "GbR"-Endung) -> kein alternateName, sonst Duplikat zu name.
function websiteSchema() {
  return `{"@type":"WebSite","@id":"${DOMAIN}/#website","url":"${DOMAIN}/","name":"${sj(nap.name)}","publisher":{"@id":"${DOMAIN}/#organization"},"inLanguage":"de-DE"}`;
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
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${DOMAIN}${canonical}"><meta property="og:type" content="website"><meta property="og:locale" content="de_DE"><meta property="og:site_name" content="${esc(nap.name)}">${ogImg}
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" sizes="96x96" href="/assets/img/favicon-96.png">
<link rel="icon" type="image/png" sizes="192x192" href="/assets/img/favicon-192.png">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/fraunces-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/site.css?v=${ASSET_VER}">
<noscript><style>.rv{opacity:1;transform:none}</style></noscript>
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[${schemaGraph}]}</script>${opts.extraHead || ''}
</head><body>${ANALYTICS_BODY}`;
}
// Header — lock-v2: Logo + Site-Nav + Callpill (sichtbare Nummer) + Besichtigungs-CTA + Progress-Bar (#progress) + gate-sichere .hamb/#nvt/.navmenu-Mechanik
const PHONE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
// Leistungs-Dropdown (20.10.): Desktop = Panel bei Hover/Fokus (CSS .nav-dd), Mobil = aufklappbare Gruppe (<details>) im Burger-Menü. Quelle: LEISTUNGEN_KATEGORIEN.
const navDdPanel = `<div class="nav-dd-panel">${LEISTUNGEN_KATEGORIEN.map(k => `<div class="nav-dd-col"><a class="nav-dd-h" href="${k.href}">${esc(k.label)}</a>${katKern(k).map(it => `<a href="${it.href}">${esc(it.label)}</a>`).join('')}<a class="nav-dd-more" href="${k.href}">Alle →</a></div>`).join('')}<a class="nav-dd-all" href="/leistungen/">Alle Leistungen im Überblick →</a></div>`;
const mnavLeistungen = `<details class="mnav-dd"><summary>Leistungen</summary>${LEISTUNGEN_KATEGORIEN.map(k => `<details class="mnav-grp"><summary>${esc(k.label)}</summary>${katKern(k).map(it => `<a href="${it.href}">${esc(it.label)}</a>`).join('')}<a class="mnav-grp-h" href="${k.href}">Alle: ${esc(k.label)} →</a></details>`).join('')}<a class="mnav-grp-h" href="/leistungen/">Alle Leistungen →</a></details>`;
// Menü „Für Gewerbe“ (Paket 3b): Desktop = kleines Dropdown (CSS .nav-dd), Mobil = aufklappbare Gruppe wie „Leistungen“.
const gwDdLinks = Object.values(ZG).map(z => `<a href="${z.url}">${esc(z.nav)}</a>`).join('');
const navGewerbe = `<div class="nav-dd nav-dd-sm"><a href="/gewerbe/" aria-haspopup="true">Für Gewerbe</a><div class="nav-dd-panel"><div class="nav-dd-col">${gwDdLinks}</div><a class="nav-dd-all" href="/gewerbe/">Alles für Gewerbe →</a></div></div>`;
const mnavGewerbe = `<details class="mnav-dd"><summary>Für Gewerbe</summary>${gwDdLinks}<a class="mnav-grp-h" href="/gewerbe/">Alles für Gewerbe →</a></details>`;
const header = `<header><div class="wrap nav"><a class="logo" href="/"><picture style="display:contents"><source type="image/webp" srcset="/assets/img/logo-176.webp"><img src="/assets/img/logo-176.png" alt="${esc(nap.name)}" width="176" height="176"></picture></a><nav class="links nav-links" aria-label="Hauptnavigation"><div class="nav-dd"><a href="/leistungen/" aria-haspopup="true">Leistungen</a>${navDdPanel}</div><a href="/standorte/">Standorte</a><a href="/ratgeber/">Ratgeber</a>${navGewerbe}<a href="/ueber-uns/">Über uns</a><a href="/kontakt/">Kontakt</a></nav><a class="callpill" href="tel:${tel}">${PHONE_SVG}<span class="num">${esc(nap.phone_display)}</span></a><a class="cta nav-cta" href="/kontakt/">Kostenlose Besichtigung</a><input type="checkbox" id="nvt" class="nvt" aria-label="Menü öffnen und schließen"><label for="nvt" class="hamb" aria-hidden="true"><span></span><span></span><span></span></label><nav class="navmenu mnav" aria-label="Hauptmenü">${mnavLeistungen}<a href="/standorte/">Standorte</a><a href="/ratgeber/">Ratgeber</a><a href="/ueber-uns/">Über uns</a><a href="/bewertungen/">Bewertungen</a>${mnavGewerbe}<a href="/kontakt/">Kontakt</a><a href="tel:${tel}">☎ ${esc(nap.phone_display)}</a><a class="btn btn-acc" href="/kontakt/">Kostenlose Besichtigung</a></nav></div><div class="progress" id="progress" aria-hidden="true"></div></header>`;
const WA_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.8 14.16c-.25.69-1.45 1.32-1.99 1.36-.53.05-.53.42-3.34-.7-2.81-1.12-4.6-3.98-4.74-4.16-.14-.19-1.13-1.5-1.13-2.86 0-1.36.71-2.03.97-2.31.25-.28.55-.35.74-.35.18 0 .37 0 .53.01.17.01.4-.06.62.48.25.6.83 2.07.9 2.22.07.14.12.31.02.5-.09.18-.14.3-.28.46-.14.16-.29.36-.42.48-.14.14-.28.28-.12.55.16.28.71 1.18 1.53 1.91 1.06.94 1.95 1.24 2.23 1.38.28.14.44.12.6-.07.18-.21.69-.81.88-1.09.18-.28.37-.23.62-.14.25.09 1.6.76 1.87.9.28.14.46.21.53.32.07.12.07.66-.18 1.35Z"/></svg>`;
const sctaBar = waText => `<nav class="scta" aria-label="Schnellkontakt"><a class="call" href="tel:${tel}">☎ Anrufen</a><a class="wa" href="${waHref(waText)}">WhatsApp</a></nav><a class="wa-fab" href="${waHref(waText)}" aria-label="WhatsApp schreiben" title="WhatsApp schreiben">${WA_SVG}</a>`;   // wa-fab (Owner 18.09.): runder WhatsApp-Button mit Logo wie im Vor-Phase-3-Build (gbr-firma/websites/havelland/website/deploy-preview), Desktop-Pendant zur mobilen Sticky-Bar
const SCTA_DEFAULT = sctaBar('Hallo, ich hätte gern eine kostenlose Besichtigung.');
// Footer — lock-v2 fcols-Sitemap (hell): Leistungen A–H / H–W / Unternehmen (inkl. /fuer-hausverwaltungen/) + legal
// Fußzeile (20.10.): Spalten aus LEISTUNGEN_KATEGORIEN — gleiche Gliederung wie Menü und /leistungen/.
// Mobil (<= 900 px): je Bereich eine aufklappbare Gruppe (<details class="fgrp">, Kopf = 44-px-Zeile, zu); Desktop: immer offen, Optik unverändert. Alle Links bleiben im HTML (open-Attribut serverseitig, Schließen per Inline-Skript hinter dem Footer).
const fGrp = (kopf, items) => `<details class="fgrp" open><summary>${kopf}</summary><ul>${items}</ul></details>`;
const fkGroup = (k, extra = '') => fGrp(`<h4><a href="${k.href}">${esc(k.label)}</a></h4>`, `<li class="fgrp-all"><a href="${k.href}">Alle: ${esc(k.label)} →</a></li>${extra}${[...katKern(k), ...katAnfrage(k)].map(it => `<li><a href="${it.href}">${esc(it.label)}</a></li>`).join('')}`);
const fkBy = key => LEISTUNGEN_KATEGORIEN.find(k => k.key === key);
const footerCols = `<div class="fcols"><div>${fkGroup(fkBy('garten'))}<div style="margin-top:22px">${fkGroup(fkBy('haus'))}</div></div><div>${fkGroup(fkBy('galabau'))}</div><div>${fkGroup(fkBy('aufloesung'))}<div style="margin-top:22px">${fkGroup(fkBy('gewerbe'), Object.values(ZG).map(z => `<li><a href="${z.url}">${esc(z.nav)}</a></li>`).join(''))}</div></div><div>${fGrp('<h4>Unternehmen</h4>', '<li><a href="/leistungen/">Alle Leistungen</a></li><li><a href="/standorte/">Standorte</a></li><li><a href="/ratgeber/">Ratgeber</a></li><li><a href="/ueber-uns/">Über uns</a></li><li><a href="/bewertungen/">Bewertungen</a></li><li><a href="/kontakt/">Kontakt</a></li>')}</div></div>`;
const FOOT_JS = `<script>(function(){var m=window.matchMedia('(max-width:900px)'),g=document.querySelectorAll('footer .fgrp');function s(){g.forEach(function(d){d.open=!m.matches})}s();if(m.addEventListener)m.addEventListener('change',s);else m.addListener(s);g.forEach(function(d){d.addEventListener('toggle',function(){if(!m.matches&&!d.open)d.open=true})})})();</script>`;
const footer = `<footer><div class="wrap"><p class="fnap">${esc(nap.name)}</p><p class="fnap-l"><span class="ni">${esc(nap.street||'')}, ${esc(nap.zip||'')} ${esc(nap.city)}</span><span class="sep"> · </span><a href="tel:${tel}">${esc(nap.phone_display)}</a><span class="sep"> · </span><a href="mailto:${esc(nap.email)}">${esc(nap.email)}</a>${ohDisplay()?`<span class="oh">${esc(ohDisplay())}</span>`:''}</p>${footerCols}<div class="legal"><span>${esc(nap.name)} (${esc(nap.rechtsform||'GbR')})</span><a href="/impressum/">Impressum</a><a href="/datenschutz/">Datenschutz</a><a href="#" id="consent-reset">Cookie-Einstellungen</a></div></div></footer>${FOOT_JS}`;
const revealJS = `<script>const io=new IntersectionObserver(e=>e.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}}),{threshold:.12});document.querySelectorAll('.rv:not(.in)').forEach(el=>io.observe(el));</script><script src="/assets/js/site.js?v=${ASSET_VER}" defer></script>` + CONSENT_BANNER + TRACK_EVENTS + CONSENT_RESET_JS;
const endBand = `<section class="zone-deep end">${leaf('leaf')}<div class="wrap"><h2 class="serif rv">Sagen Sie uns, was ansteht — wir kümmern uns.</h2><p class="rv d1">Kostenlose Besichtigung, Festpreis, dann erledigt.</p><div class="cta-row rv d2">${ctaA}<a class="btn btn-line" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a></div></div></section>`;
// Partner-/Tippgeber-Variante (Dach): kein eigener Festpreis — Besichtigung + Angebot über den Fachbetrieb, wir koordinieren.
// Partner-Wording je Service (01.09.): Dach-Texte rendern sonst woertlich 'Dach' auf Winterdienst-Seiten (Template-Bug, gefunden 01.09.).
const PARTNER_TXT = {
  dach: { was: 'was am Dach ansteht', arbeit: 'Die Arbeit am Dach', vergleich: 'mehrere Dachbetriebe' },
  winterdienst: { was: 'welche Flächen im Winter frei sein müssen', arbeit: 'Räumen und Streuen', vergleich: 'mehrere Räumdienste' },
};
const partnerTxt = s => (s && s.slug === 'winterdienst') ? PARTNER_TXT.winterdienst : PARTNER_TXT.dach;
const endBandPartner = s => { const t = partnerTxt(s); return `<section class="zone-deep end">${leaf('leaf')}<div class="wrap"><h2 class="serif rv">Sagen Sie uns, ${t.was} — wir koordinieren.</h2><p class="rv d1">Kostenlose Besichtigung durch den Partner-Fachbetrieb, Angebot vom ausführenden Betrieb.</p><div class="cta-row rv d2">${ctaPrim(primLabel(s))}<a class="btn btn-line" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a></div></div></section>`; };
// Leistungsname für H2 von FAQ/Ablauf (20.10., SEO M-6): „Häufige Fragen zu {Name}“, „So läuft {Name} ab“. Name aus services.json; Ausnahme GaLaBau (Kurzform, grammatisch tragfähig).
const H2_NAME = { galabau: 'GaLaBau' };
const h2Name = s => H2_NAME[s.slug] || s.name;
// Zwischen-CTA-Texte Paket 1 (20.10., Copy H16): mit Preise-Block „Passt der Rahmen?“, sonst eigener Kurztext (nie wortgleich zum Abschluss-Band). Partner: kein „Festpreis“. Immer genau ein Button (WhatsApp).
const zwischenOpts = (s, mitPreise) => {
  const wa = `Hallo, ich interessiere mich für ${s.name}.`;
  if (s.partner_modell) return s.slug === 'winterdienst'
    ? { h2: 'Flächen schicken, Rückmeldung bekommen', txt: 'Adresse und Flächen per WhatsApp genügen. Die Besichtigung durch den Partner-Fachbetrieb ist kostenlos und unverbindlich.', wa, waLabel: 'Flächen per WhatsApp schicken' }
    : { h2: 'Foto schicken, Rückmeldung bekommen', txt: 'Ein Foto per WhatsApp genügt. Die Besichtigung durch den Partner-Fachbetrieb ist kostenlos und unverbindlich.', wa, waLabel: 'Foto per WhatsApp schicken' };
  return mitPreise
    ? { h2: 'Passt der Rahmen?', txt: 'Schicken Sie uns ein Foto, wir besichtigen kostenlos und nennen den Preis.', wa, waLabel: 'Foto per WhatsApp schicken' }
    : { h2: 'Foto schicken, Festpreis bekommen', txt: 'Ein Bild per WhatsApp genügt für die erste Einschätzung, die Besichtigung ist kostenlos.', wa, waLabel: 'Foto per WhatsApp schicken' };
};
// Zwischen-CTA nach der Prose (Umbau 03.09.): Markup wie die Ratgeber-Sektion "Lieber machen lassen?". Erster Inhalts-CTA damit nach ≤600 W statt ~1.400.
const ctaZwischen = (s, o = {}) => {
  const p = !!(s && s.partner_modell); const t = partnerTxt(s);
  const h2 = o.h2 || (p ? `Sagen Sie uns, ${t.was} — wir koordinieren.` : 'Lieber machen lassen?');
  const txt = o.txt || (p ? (s.slug === 'winterdienst' ? 'Kostenlose Besichtigung durch den Partner-Fachbetrieb, Saisonvertrag vor dem ersten Schnee.' : 'Kostenlose Besichtigung durch den Partner-Fachbetrieb, Angebot vom ausführenden Betrieb.') : 'Kostenlose Besichtigung, Festpreis, dann erledigt.');
  const kern = `<h2 class="serif rv">${esc(h2)}</h2><p class="rv d1" style="max-width:44em;margin-inline:auto">${esc(txt)}</p><div class="cta-row rv d2" style="justify-content:center">${o.wa ? `<a class="btn btn-acc" href="${waHref(o.wa)}">${esc(o.waLabel || 'Per WhatsApp schreiben')}</a>` : `${ctaPrim(primLabel(s))}<a class="btn btn-line" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a>`}</div>`;
  if (o.inner) return `<div class="center cta-zw cta-zw-in">${kern}</div>`;
  return `<section class="sec${o.alt === false ? '' : ' section-alt'}"><div class="wrap center cta-zw">${kern}</div></section>`;
};
// Schluss-Band je Hub (Runde 1, Dubletten): seitenspezifische Zeile statt „Kostenlose Besichtigung, Festpreis, dann erledigt.“ auf jeder Seite.
const ENDBAND_ZEILE = {
  gartenpflege: 'Rasen, Hecke, Beete und Laub aus einer Hand, auf Wunsch alle 14 Tage.',
  heckenschnitt: 'Hecke in Form, Grünschnitt abgefahren, Fläche besenrein.',
  baumschnitt: 'Obstbäume, Ziergehölze und Sträucher fachgerecht in Form gebracht.',
  heckenentfernung: 'Hecke weg, Wurzeln gefräst, Fläche eben und frei.',
  steinreinigung: 'Saubere Flächen, ohne dass Sie Gerät leihen oder schrubben.',
  fensterreinigung: 'Klare Scheiben innen und außen, Sie nennen nur den Termin.',
  galabau: 'Garten, Pflaster, Zaun und Erdarbeiten aus einer Hand.',
  pflasterarbeiten: 'Hof, Weg und Einfahrt mit tragfähigem Unterbau.',
  'einfahrt-pflastern': 'Eine Einfahrt, die dem Auto standhält: befahrbar gebaut, nicht nur gepflastert.',
  terrassenbau: 'Eine Terrasse mit Gefälle vom Haus weg und Unterbau, der nicht absackt.',
  zaunbau: 'Zaun nach Spatenprobe montiert, Abnahme mit Foto.',
  gartengestaltung: 'Terrasse, Wege, Beete und Rasen in einem Plan.',
  'rollrasen-verlegen': 'Fertiger Rasen auf vorbereitetem Boden, angegossen.',
  erdarbeiten: 'Aushub, Planum und Mutterboden mit dem Minibagger.',
  gartenrodung: 'Aus dem verwilderten Grundstück wird wieder eine freie Fläche.',
  baumfaellung: 'Der Baum fachgerecht gefällt, Abtransport inklusive.',
  'baumstumpf-entfernen': 'Stubben bis unter das Bodenniveau gefräst, im selben Termin.'
};
const endBandHub = s => ENDBAND_ZEILE[s.slug] ? endBand.replace('Kostenlose Besichtigung, Festpreis, dann erledigt.', ENDBAND_ZEILE[s.slug]) : endBand;
// Dunkles Wert-Band (4 Werte) — auf Home + Übersichtsseiten wiederverwendet
const valueBand = `<section class="band">${leaf('leaf')}<div class="wrap"><p class="lead2 rv">Kein Suchen, kein Koordinieren, kein Risiko mit Fremden — <em>ein Anruf, alles erledigt.</em></p>
<div class="vals"><div class="v rv d1"><h4><span class="n">01</span> Aus einer Hand</h4><p>Garten, Reinigung, Entrümpelung — ein Ansprechpartner. Winterdienst und Dachrinne laufen über Partner-Fachbetriebe.</p></div><div class="v rv d2"><h4><span class="n">02</span> Nachweis statt Versprechen</h4><p>Foto-Dokumentation nach jedem Auftrag, direkt aufs Handy.</p></div><div class="v rv d3"><h4><span class="n">03</span> Festpreis</h4><p>Kostenlose Besichtigung, klarer Preis — kein Nachkommen.</p></div><div class="v rv d4"><h4><span class="n">04</span> Schnell erreichbar</h4><p>WhatsApp-Antwort am selben Tag.</p></div></div></div></section>`;

// Sichtbare Trust-Zeile für Service-Hubs (Audit 2026-08, P1-2): Rating + Anzahl aus proof.google_reviews
// (kein Hardcode-Drift; via GBP-API pflegen), gleiche Live-Gate-Logik wie /bewertungen/. NUR sichtbarer
// Text mit Link auf /bewertungen/ — KEIN aggregateRating-Schema (Google-Policy: self-serving).
const trustLine = (() => {
  const gr = proof.google_reviews || {};
  const live = !!reviews.enabled && (gr.count || 0) >= (reviews.block_ab_count || 5) && gr.rating;
  return live ? `<p class="hub-trust rv in d4"><a href="/bewertungen/">${Number(gr.rating).toFixed(1).replace('.', ',')}&nbsp;★ bei Google · ${esc(gr.count)} Bewertungen</a></p>` : '';
})();

// Garantie-Strip (lock-v2 .gstrip) — feste 3-Zusagen-Leiste, markenübergreifend (Home + Hubs). Ohne Bild/Overlay-Label.
const gstrip = `<section class="gstrip" aria-label="Unsere drei Zusagen"><div class="wrap"><div class="gstrip-grid"><div class="gs rv"><span class="gn">01</span><div><h3>Festpreis ist Endpreis</h3><p>Nach der kostenlosen Besichtigung steht Ihr Preis — inklusive Abfuhr, ohne Nachforderung.</p></div></div><div class="gs rv d1"><span class="gn">02</span><div><h3>Foto-Nachweis</h3><p>Vorher-/Nachher-Fotos nach jedem Auftrag, direkt aufs Handy — auch wenn Sie nicht da waren.</p></div></div><div class="gs rv d2"><span class="gn">03</span><div><h3>Ein Ansprechpartner</h3><p>Vom ersten Anruf bis zur Abnahme feste Gesichter — kein Callcenter, keine Warteschleife.</p></div></div></div></div></section>`;
// Beleg-Variante (Owner 14.09.): Entrümpelung/Haushaltsauflösung — Entsorgungsgebühren nach Beleg, nicht im Festpreis
const BELEG_SVCS = new Set(['entruempelung', 'haushaltsaufloesung']);
// Startseite (W3b Review #17): Abfuhr im Preis, Entsorgungsgebühren bei Entrümpelung nach Beleg — Hub-gstrips bleiben je Gewerk.
const gstripHome = gstrip.replace('<p>Nach der kostenlosen Besichtigung steht Ihr Preis — inklusive Abfuhr, ohne Nachforderung.</p>', '<p>Nach der kostenlosen Besichtigung steht Ihr Preis schriftlich fest. Entsorgungsgebühren rechnen wir nach Beleg ab, ohne eigenen Aufschlag.</p>');   // Owner 20.10.: Startseite an Beleg-Logik angeglichen
const gstripBeleg = `<section class="gstrip" aria-label="Unsere drei Zusagen"><div class="wrap"><div class="gstrip-grid"><div class="gs rv"><span class="gn">01</span><div><h3>Festpreis für Räumung &amp; Abtransport</h3><p>Nach der kostenlosen Besichtigung steht Ihr Preis schriftlich fest. Entsorgungsgebühren weisen wir nach Beleg aus.</p></div></div><div class="gs rv d1"><span class="gn">02</span><div><h3>Foto-Nachweis</h3><p>Vorher-/Nachher-Fotos nach jedem Auftrag, direkt aufs Handy — auch wenn Sie nicht da waren.</p></div></div><div class="gs rv d2"><span class="gn">03</span><div><h3>Ein Ansprechpartner</h3><p>Vom ersten Anruf bis zur Abnahme feste Gesichter — kein Callcenter, keine Warteschleife.</p></div></div></div></div></section>`;
// Hybrid-Variante (galabau, 17.09.): Grünschnitt/Fräsgut im Festpreis, Rückbau/Sperriges nach Beleg — Text unter dem Strip differenziert genauso; Standard-„ohne Nachforderung“ wäre ein Widerspruch.
const GRUEN_BELEG_SVCS = new Set(['galabau']);
// Weitere Varianten der Zusage 01 (20.10., Copy K1/H7): „inklusive Abfuhr, ohne Nachforderung“ nur dort, wo es stimmt.
// Aushub/Altbelag/Gartenbau: Entsorgung nach Beleg · Baumfällung: Abtransport inklusive, Stadtgebühren nicht · Fenster/Stein: keine Abfuhr.
const ZUSAGE_STD = '<h3>Festpreis ist Endpreis</h3><p>Nach der kostenlosen Besichtigung steht Ihr Preis — inklusive Abfuhr, ohne Nachforderung.</p>';
const zusageVariante = (h3, p) => { if (!gstrip.includes(ZUSAGE_STD)) throw new Error('gstrip: Zusage 01 nicht gefunden'); return gstrip.replace(ZUSAGE_STD, `<h3>${h3}</h3><p>${p}</p>`); };
const AUSHUB_BELEG_SVCS = new Set(['zaunbau', 'erdarbeiten', 'pflasterarbeiten', 'einfahrt-pflastern', 'terrassenbau', 'gartengestaltung', 'rollrasen-verlegen']);
const ZUSAGE_ENTSORGUNG = { 'rollrasen-verlegen': 'Altrasen und Aushub', gartengestaltung: 'Aushub und Grünschnitt', erdarbeiten: 'des Aushubs', zaunbau: 'des alten Zauns' };
const gstripAushubBeleg = slug => { const w = ZUSAGE_ENTSORGUNG[slug]; const ent = /^des /.test(w || '') ? `Entsorgung ${w}` : `Entsorgung von ${w || 'Aushub und Altbelag'}`; return zusageVariante('Festpreis steht schriftlich', `Nach der kostenlosen Besichtigung steht Ihr Preis schriftlich fest. ${ent} rechnen wir nach Beleg ab, ohne eigenen Aufschlag.`); };
const gstripRodung = zusageVariante('Festpreis steht schriftlich', 'Nach der kostenlosen Besichtigung steht Ihr Preis fest. Grünschnitt und Wurzelholz sind darin enthalten, Unrat und Sperriges rechnen wir nach Beleg ab.');
const gstripBaumfaellung = zusageVariante('Festpreis steht schriftlich', 'Nach der kostenlosen Besichtigung steht Ihr Preis schriftlich fest, inklusive Abtransport. Nicht enthalten: Gebühren der Stadt für die Fällgenehmigung und Ersatzpflanzungen.');
const OHNE_ABFUHR_SVCS = new Set(['fensterreinigung', 'steinreinigung', 'unterhaltsreinigung', 'gebaeudereinigung', 'ferienwohnung-reinigung', 'objektbetreuung', 'hausmeisterservice']);   // Paket 3: Reinigungs- und Kontrollgang-Hubs ohne Abfuhr (Spec A §4.2)
const gstripOhneAbfuhr = zusageVariante('Festpreis ist Endpreis', 'Nach der kostenlosen Besichtigung steht Ihr Preis schriftlich fest, ohne Nachforderung.');
// Zusagen-Leiste je Service: Partner > Beleg (Entrümpelung) > Hybrid (galabau) > Aushub-Beleg > Baumfällung > Reinigung ohne Abfuhr > Standard
const gstripFor = s => s.partner_modell ? gstripPartner(s) : BELEG_SVCS.has(s.slug) ? gstripBeleg : GRUEN_BELEG_SVCS.has(s.slug) ? gstripGruenBeleg : AUSHUB_BELEG_SVCS.has(s.slug) ? gstripAushubBeleg(s.slug) : s.slug === 'gartenrodung' ? gstripRodung : s.slug === 'baumfaellung' ? gstripBaumfaellung : OHNE_ABFUHR_SVCS.has(s.slug) ? gstripOhneAbfuhr : gstrip;
const gstripGruenBeleg = `<section class="gstrip" aria-label="Unsere drei Zusagen"><div class="wrap"><div class="gstrip-grid"><div class="gs rv"><span class="gn">01</span><div><h3>Festpreis steht schriftlich</h3><p>Nach der kostenlosen Besichtigung steht Ihr Preis fest. Grünschnitt und Fräsgut sind darin enthalten, Rückbau und Sperriges rechnen wir nach Beleg ab.</p></div></div><div class="gs rv d1"><span class="gn">02</span><div><h3>Foto-Nachweis</h3><p>Vorher-/Nachher-Fotos nach jedem Auftrag, direkt aufs Handy — auch wenn Sie nicht da waren.</p></div></div><div class="gs rv d2"><span class="gn">03</span><div><h3>Ein Ansprechpartner</h3><p>Vom ersten Anruf bis zur Abnahme feste Gesichter — kein Callcenter, keine Warteschleife.</p></div></div></div></div></section>`;
// Partner-/Tippgeber-Variante (Dach): keine Eigenleistungs- oder Festpreis-Zusage — Ausführung + Angebot beim Fachbetrieb, wir koordinieren.
const gstripPartner = s => { const t = partnerTxt(s); return `<section class="gstrip" aria-label="Unsere drei Zusagen"><div class="wrap"><div class="gstrip-grid"><div class="gs rv"><span class="gn">01</span><div><h3>Ein Ansprechpartner</h3><p>Von der Anfrage bis zur Abnahme koordinieren wir alles für Sie — Sie müssen nicht ${t.vergleich} selbst vergleichen.</p></div></div><div class="gs rv d1"><span class="gn">02</span><div><h3>Fachgerecht ausgeführt</h3><p>${t.arbeit} übernimmt ein Fachbetrieb mit passender Ausrüstung und Absicherung.</p></div></div><div class="gs rv d2"><span class="gn">03</span><div><h3>Angebot vom Fachbetrieb</h3><p>Nach der kostenlosen Besichtigung erstellt der ausführende Betrieb Ihr Angebot — transparent und unverbindlich.</p></div></div></div></div></section>`; };

function write(url, html) {
  const dir = `website${url}`.replace(/\/$/, '');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${dir}/index.html`, html);
}

// ---------- HOME ----------
function home() {
  // Saison-Hero-Steuerung ueber config.saison_monat (Override zum Testen), sonst der Build-Monat — wird von saisonTeaser gebraucht.
  const saisonMonat = config.saison_monat || (new Date()).getMonth() + 1;
  // Hero-Lead (17.09.): drei Cluster in einem Satz, Partner-Framing Winterdienst bleibt. Saisonales lebt im saisonTeaser.
  const homeLead = 'Garten, GaLaBau, Entrümpelung, Objektbetreuung — ein fester Ansprechpartner im Havelland. Heckenschnitt und Gartenpflege, Pflaster, Terrasse und Zaun, Keller und Schuppen ausräumen, Grünpflege für Ihr Objekt: Festpreis nach kostenloser Besichtigung, Foto-Nachweis nach jedem Auftrag.';
  // Kernleistungen = 4 Cluster (17.09., Plan organisch-entruempelung §2). Reihenfolge saisonneutral; Saisonales im saisonTeaser.
  const CLUSTER = [
    { href: '/gartenpflege/', kick: 'Garten & Pflege', h3: 'Gepflegt durchs Jahr', p: 'Rasen, Hecke, Laub und Baumschnitt — im Abo oder einmalig, mit festem Termin und Foto-Nachweis.',
      subs: [{ href: '/heckenschnitt/', label: 'Heckenschnitt' }, { href: '/baumschnitt/', label: 'Baumschnitt' }, { href: '/heckenentfernung/', label: 'Hecke entfernen' }, { href: '/baumstumpf-entfernen/', label: 'Baumstumpf entfernen' }, { href: '/gartenpflege/#herbst-paket', label: 'Herbst-Paket' }] },
    { href: '/leistungen/#haus', kick: 'Haus & Reinigung', h3: 'Rund ums Haus sauber', p: 'Dachrinne, Winterdienst und Steinreinigung — ein Termin, ein Ansprechpartner.',
      subs: [{ href: '/dachrinnenreinigung/', label: 'Dachrinne' }, { href: '/winterdienst/', label: 'Winterdienst' }, { href: '/fensterreinigung/', label: 'Fensterreinigung' }, { href: '/steinreinigung/', label: 'Steinreinigung' }] },
    { href: '/galabau/', kick: 'Garten- und Landschaftsbau', h3: 'Gebaut, gepflastert, neu angelegt', p: 'Pflaster, Terrasse, Zaun, Erdarbeiten und Rollrasen — dazu Gartenrodung. Festpreis nach kostenloser Besichtigung.',
      subs: [{ href: '/pflasterarbeiten/', label: 'Pflasterarbeiten' }, { href: '/terrassenbau/', label: 'Terrassenbau' }, { href: '/zaunbau/', label: 'Zaunbau' }, { href: '/erdarbeiten/', label: 'Erdarbeiten' }, { href: '/rollrasen-verlegen/', label: 'Rollrasen' }] },
    { href: '/entruempelung/', kick: 'Entrümpelung & Haushaltsauflösung', h3: 'Rund ums Haus ausgeräumt', p: 'Keller, Garage, Dachboden, Schuppen oder die ganze Wohnung — Festpreis für Räumung und Abtransport, Entsorgung nach Beleg.',
      subs: [{ href: '/haushaltsaufloesung/', label: 'Haushaltsauflösung' }, { href: '/entruempelung/#nebengebaeude', label: 'Keller · Garage · Dachboden' }, { href: '/grundreinigung/', label: 'Auszugsreinigung' }] },
    { href: '/fuer-hausverwaltungen/', kick: 'Hausverwaltungen & Objekte', h3: 'Ein Vertrag, ein Ansprechpartner', p: 'Grünpflege, Winterdienst, Treppenhaus und Kleinreparaturen für Ihre Objekte — Foto-Reporting nach jedem Einsatz.',
      subs: [{ href: '/objektbetreuung/', label: 'Objektbetreuung' }, { href: '/unterhaltsreinigung/', label: 'Unterhaltsreinigung' }, { href: '/gebaeudereinigung/', label: 'Gebäudereinigung' }, { href: '/winterdienst/', label: 'Winterdienst' }] }
  ];
  const main = `
<section class="hero">${leaf('hleaf')}<div class="wrap grid">
<div><span class="kick rv in"><span class="dot"></span> ${esc(nap.city)} · Havelland</span>
<h1 class="rv in d1">Haus und Garten — <em>aus einer Hand</em> gepflegt.</h1>
<p class="lead rv in d2">${homeLead}</p>
<div class="cta-row rv in d3">${ctaA}<a class="btn btn-line" href="${waHref('Hallo, ich interessiere mich für Ihre Leistungen.')}">WhatsApp schreiben</a></div>
<div class="trust-row rv in d4"><div class="t"><b>Ein</b><span>fester Ansprechpartner</span></div><div class="t"><b>Festpreis</b><span>nach Besichtigung</span></div><div class="t"><b>Foto-Nachweis</b><span>nach jedem Auftrag</span></div></div></div>
<div class="shot rv in d2">${baSlider({ slug: '06-02-thuja-grenze', alt: 'Thuja-Hecke an der Grundstücksgrenze', cap: 'Thuja', sub: 'an der Grundstücksgrenze', hint: true, lcp: true })}</div>
<div class="hero-strip rv in d3" role="group" aria-label="Drei Bereiche"><a href="/entruempelung/">${pic('svc-entruempelung-hero', { alt: 'Kartons werden aus dem vollen Keller getragen — Entrümpelung im Havelland', sizes: '(max-width:760px) 30vw, 200px' })}<span>Entrümpelung</span></a><a href="/zaunbau/">${pic('svc-zaunbau-hero', { alt: 'Zaunpfosten wird mit der Wasserwaage ausgerichtet', sizes: '(max-width:760px) 30vw, 200px' })}<span>Zaunbau</span></a><a href="/fuer-hausverwaltungen/">${pic('svc-objektbetreuung-hero', { alt: 'Kontrollgang an einer Wohnanlage — Objektpflege für Hausverwaltungen im Havelland', sizes: '(max-width:760px) 30vw, 200px' })}<span>Objektpflege</span></a></div>
</div></section>
${gstripHome}
${saisonTeaser(saisonMonat)}
<section class="sec" id="kernleistungen"><div class="wrap"><div class="head"><h2 class="serif rv">Unsere Kernleistungen</h2><a class="rv" href="/leistungen/">Alle Leistungen →</a></div><p class="intro rv">Fünf Bereiche, ein Ansprechpartner — vom neuen Pflaster über den gepflegten Garten und die leere Garage bis zum betreuten Mehrfamilienhaus.</p>${clusterKacheln(CLUSTER)}</div></section>
${gwHomeBand()}
<section class="sec section-alt"><div class="wrap">${jahreszeiten()}</div></section>
<section class="sec"><div class="wrap">${echtProjekt()}</div></section>
<section class="sec section-alt" id="galerie"><div class="wrap"><div class="head"><h2 class="serif rv">Echte Ergebnisse zum Durchziehen</h2></div><p class="intro rv">Ziehen Sie den Regler — jedes Bild ist ein dokumentierter Auftrag aus dem Havelland.</p>${karussell()}${archivGrid({ ctaHref: '/kontakt/#anfrage' })}</div></section>
<section class="sec"><div class="wrap">${whatsappFlow({ legacy: true })}</div></section>
<section class="sec section-alt tl-row"><div class="wrap"><div class="head"><h2 class="serif rv">So läuft ein Auftrag</h2></div>${auftragsTimeline(false, '', true)}</div></section>
<section class="band">${leaf('leaf')}<div class="wrap"><p class="lead2 rv">Kein Suchen, kein Koordinieren, kein Risiko mit Fremden — <em>ein Anruf, alles erledigt.</em></p>${uspBand()}</div></section>
${gebietskarte({ linkOrte: ortsHubSlugs })}
<section class="sec"><div class="wrap">${faqFilter(null, { legacy: true })}</div></section>
${endBand}`;
  // Title (17.09.): "Gartenpflege Falkensee" bleibt vorn (Pos. 2,1 / 377 Impr. GSC 90 Tage), dahinter die zwei
  // anderen Cluster — Startseite rankt fuer "entruempelung falkensee" (Pos. 7,5) mit Garten-Snippet -> 0 Klicks.
  // Marke kommt ab Task 7 ueber WebSite-Schema + og:site_name (Title-Gate <= 60 Zeichen).
  write('/', head('Gartenpflege Falkensee · Entrümpelung · Objektbetreuung', mkMeta('Gartenpflege, Entrümpelung und Objektbetreuung in Falkensee und im Havelland — ein Ansprechpartner, Festpreis nach Besichtigung, Foto-Nachweis inklusive.'), '/', orgSchema() + ',' + websiteSchema()) + header + main + footer + SCTA_DEFAULT + revealJS + '</body></html>');
  written.basis.push('/');
}

// ---------- SERVICE-HUB ----------
function hub(s) {
  const url = `/${s.slug}/`;
  const c = hubCopy[s.slug];
  const orteList = orteForService(s);
  const cardOrte = seitenOrte(s).filter(o => hasOrt(s.slug, o.slug)).slice(0, FULL ? 999 : 12);
  // Ortskarten-Text (17.09.): bespoke Ein-Satz-Ortsfakt aus ortsseiten.json (services.<slug>.orte.<ort>.fakt) hat Vorrang vor dem generischen Satz.
  const soHub = ortsSvcCopy[s.slug] || null;
  const cardSub = o => { const f = soHub && soHub.orte && soHub.orte[o.slug] && soHub.orte[o.slug].fakt; return f ? esc(f) : (s.partner_modell ? `${esc(s.name)} in ${esc(o.name)} — koordiniert über einen Partner-Fachbetrieb.` : `${esc(s.name)} in ${esc(o.name)} — lokal, Festpreis, Foto-Nachweis.`); };
  const cards = cardOrte.map(o => `<a class="card" href="/${s.slug}-${o.slug}/"><h3>${esc(s.name)} ${esc(o.name)}</h3><p>${cardSub(o)}</p><span class="go">Mehr →</span></a>`).join('');

  const h1 = c ? emH1(c.h1, c.h1_em) : `${esc(s.name)} <em>im Havelland</em>`;
  const lead = c ? esc(c.intro) : esc(s.garantie || 'Festpreis nach Besichtigung, Foto-Nachweis nach jedem Auftrag.');
  const sektionenHtml = c
    ? (c.sections || []).map(x => `<h3>${esc(x.h3)}</h3><p>${esc(x.body)}${copyLinksHtml(x)}</p>`).join('')   // optionale link_to/link2_to je Sektion (Umbau 03.09.), kein rohes HTML
    : (s.sektionen || []).map(x => `<h3>${esc(x)}</h3><p>${esc(x)} als Teil unserer ${esc(s.name)} — sauber ausgeführt, mit Foto-Nachweis.</p>`).join('');
  // W3b (17.09.): Layout "ueberblick" — Sections als Kachel-Grid (h3 + kurz + <details>-Tiefe) statt Prose-Wand.
  // Owner-Feedback: "Überblick der Leistungen, kurz dazu lesen, kein Paragraph". Tiefe bleibt im DOM (SEO), nur eingeklappt.
  const ueberblick = !!(c && c.layout === 'ueberblick');
  const kachelHtml = ueberblick ? (c.sections || []).map(x => {
    const kurz = x.kurz || (x.body.split(/(?<=\.)\s/)[0] || '');
    // Owner 18.09.: hat die Kachel eine eigene Seite (link_to), verlinken Titel + "Zur Seite" direkt dorthin; Links dann nicht mehr im Details-Text.
    const href = x.link_to ? hrefOf(x.link_to) : '';
    const tiefe = x.body ? `<details class="mehr"><summary>Mehr dazu</summary><div><p>${esc(x.body)}${href ? '' : copyLinksHtml(x)}</p></div></details>` : '';
    const go = href ? `<a class="go" href="${href}">${esc(x.link_text || 'Zur Seite')} →</a>` : '';
    return `<div class="card"${x.id ? ` id="${esc(x.id)}"` : ''}><h3>${(href && x.seite) ? `<a href="${href}">${esc(x.h3)}</a>` : esc(x.h3)}</h3><p>${esc(kurz)}</p>${go}${tiefe}</div>`;
  }).join('') : '';
  const definition = c && c.definition ? `<p class="lead-p"><strong>${esc(c.definition)}</strong></p>` : '';
  const naehe = (c && c.naehe && !ueberblick) ? `<h3>${esc(s.name)} in Ihrer Nähe</h3><p>${esc(c.naehe)}</p>` : '';
  const ablauf = (c && c.ablauf && !ueberblick) ? `<h3>So läuft es ab</h3><p>${esc(c.ablauf)}</p>` : '';
  const garantieTxt = c && c.garantie_text ? c.garantie_text : (s.garantie || 'Kostenlose Besichtigung, danach ein Festpreis als Endpreis.');
  // ueberblick: naehe -> Lead der Ortskarten-Sektion, ablauf -> Lead der Timeline, garantie -> Zeile unter dem Grid
  const naeheLead = (ueberblick && c.naehe) ? `<p class="sec-lead rv">${esc(c.naehe)}</p>` : '';
  // ablauf wird im ueberblick-Layout nicht mehr gerendert: die Timeline "So läuft ein Auftrag" ist der Ablauf (Review #8, Dublette).

  const title = clampTitle(c && c.title ? c.title : `${s.name} im Havelland — ${nap.name}`);
  const meta = mkMeta(c && c.meta ? c.meta : `${s.name} im Havelland und Falkensee: Festpreis nach Besichtigung, Foto-Nachweis, ein fester Ansprechpartner.`);

  // Schema (17.09.): Service + hasOfferCatalog aus den Copy-Sektionen (Konkurrenz-Standard). Bewusst OHNE price/priceSpecification —
  // Festpreis entsteht erst nach Besichtigung. Kein FAQPage (Gate). areaServed = Orte des Service.
  // Fix (17.09., Review): Opt-in statt Positions-Heuristik — nur Sections mit offer:true (Redaktionsentscheidung in hubs.json) werden Offers.
  // Default ist kein Offer: Prozessschritte/Rechtslage/USP/Disclaimer/Preis-Erklärung/Referenzen/Verweise sind KEINE buchbaren Leistungen.
  // SEO H-5 (20.10.): Hub-Karten-Layout (galabau) leitet die Offers aus den sichtbaren Kern-Karten ab (eine Quelle, keine zweite Liste); sonst offer:true-Sektionen wie bisher.
  const offerSrc = (c && c.layout === 'hub-karten' && c.karten && Array.isArray(c.karten.kern)) ? c.karten.kern.map(k => ({ h3: k.h3, link_to: k.to, seite: true })) : (c && Array.isArray(c.sections) ? c.sections : []).filter(x => x.offer === true);
  const offers = offerSrc.slice(0, 6).map(x => `{"@type":"Offer"${(x.link_to && x.seite) ? `,"url":"${DOMAIN}${hrefOf(x.link_to)}"` : ''},"itemOffered":{"@type":"Service","name":"${sj(x.h3)}","serviceType":"${sj(s.name)}","${s.partner_modell ? 'broker' : 'provider'}":{"@id":"${DOMAIN}/#organization"},"areaServed":${JSON.stringify(orteList.map(o=>o.name))}}}`).join(',');
  const catalog = offers ? `,"hasOfferCatalog":{"@type":"OfferCatalog","name":"${sj(s.name)} — Leistungen","itemListElement":[${offers}]}` : '';
  // GEO (W3-Audit 17.09.): Person-Schema für den textlich genannten Ansprechpartner — Opt-in über hubs.json (c.person:true), Daten aus nap.ansprechpartner (Single-Source).
  // Owner 20.10.: beide Inhaber als Ansprechpartner (gesellschafter = Rufnamen aus nap.json)
  const personSchema = (c && c.person && nap.ansprechpartner) ? (nap.gesellschafter || [nap.ansprechpartner.name]).map(n => `,{"@type":"Person","@id":"${DOMAIN}/#${n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}","name":"${sj(n)}","jobTitle":"${sj(nap.ansprechpartner.rolle)}","worksFor":{"@id":"${DOMAIN}/#organization"}}`).join('') : '';
  const schema = `${orgSchema()},{"@type":"Service","@id":"${DOMAIN}${url}#service","name":"${sj(s.name)}","serviceType":"${sj(s.name)}","image":"${imgAbs(svcHero(s.slug))}","${s.partner_modell ? 'broker' : 'provider'}":{"@id":"${DOMAIN}/#organization"},"areaServed":${JSON.stringify(orteList.map(o=>o.name))}${catalog}}${personSchema},${breadcrumb([{name:'Start',url:'/'},{name:s.name,url}])}`;

  // ---- Gewerk-abhaengige Voll-Print-Komposition ----
  const gk = gewerkClass(s.slug);
  const heroShot = gk === 'voll'
    ? baSlider({ slug: '06-02-thuja-grenze', alt: s.name + ' im Havelland', cap: 'Thuja', sub: 'an der Grundstücksgrenze', hint: true, lcp: true })
    : pic(svcHero(s.slug), { cls: 'main', alt: s.name + ' im Havelland — Haus- & Gartenservice Havelland', sizes: '(max-width:900px) 92vw, 60vw', lcp: true });
  const faqData = (c && c.faqs && c.faqs.length) ? c.faqs : null;   // sonst faqFilter-Default
  // Winterdienst: WA-Flow ohne Foto-Zusage (Partner) — "Adresse und Flächenbeschreibung reichen" (Umbau 03.09.)
  // Zaunbau (16.09.): eigenes Flow-Motiv statt Heckenschnitt-Default (KI-Szene mit Element, Logo per logo-composite.py — Foto Assets §0: Szene erlaubt, kein Beweis).
  const flowFoto = s.slug === 'zaunbau' ? { src: '/assets/img/arbeit/zaun-hinten-matte-noah.jpg', alt: 'Doppelstabmatte am Pfosten ausrichten — Haus- &amp; Gartenservice Havelland', cap: 'Handarbeit, wo es drauf ankommt', sub: 'Pfosten &amp; Matten', w: 1856, h: 2304 } : null;
  const flowBlock = `<section class="sec"><div class="wrap">${whatsappFlow({ gewerk: waGewerk(s), partner: !!s.partner_modell, fotoNeutral: FOTO_NEUTRAL.has(s.slug), winter: s.slug === 'winterdienst', foto: flowFoto })}</div></section>`;
  const timelineBlock = `<section class="sec section-alt"><div class="wrap"><div class="head"><h2 class="serif rv">So läuft ein Auftrag</h2></div>${auftragsTimeline(!!s.partner_modell, s.slug)}</div></section>`;
  const faqSection = `<section class="sec"><div class="wrap">${faqFilter(faqData)}</div></section>`;
  const cardOrteSection = cardOrte.length ? `<section class="sec"><div class="wrap"><div class="head"><h2 class="serif rv">${esc(s.name)} in Ihrem Ort</h2></div>${naeheLead}<div class="cards rv">${cards}</div></div></section>` : '';
  // Ratgeber-Teaser (20.10., Copy H15/M4): nur der erste Satz von lead; ausgeblendete Artikel je Hub (Daten: hub.ratgeber_ausblenden, sonst RATGEBER_AUSBLENDEN)
  const ratAus = new Set([...(RATGEBER_AUSBLENDEN[s.slug] || []), ...((c && c.ratgeber_ausblenden) || [])]);
  const ratList = (ratgeberByService[s.slug] || []).filter(r => !ratAus.has(r.slug) && !svcNoindexBySlug(r.cta_service)).slice(0, 3);   // noindex-Ratgeber (Wellen-Gate) nicht von Hubs verlinken
  const ratgeberSection = ratList.length ? `<section class="sec section-alt"><div class="wrap"><div class="head"><h2 class="serif rv">Ratgeber rund um ${esc(s.name)}</h2><a class="rv" href="/ratgeber/">Alle Ratgeber →</a></div><div class="cards rv">${ratList.map(r => `<a class="card" href="/ratgeber/${r.slug}/"><h3>${esc(r.title)}</h3><p>${esc(r.teaser || ersterSatz(r.lead || ''))}</p><span class="go">Lesen →</span></a>`).join('')}</div></div></section>` : '';
  let rich;
  if (gk === 'voll') {
    rich =
      `<section class="sec"><div class="wrap">${schnittkalender()}</div></section>` +
      heckenKompass() +
      `<section class="sec"><div class="wrap">${echtProjekt({ nur: 'thuja' })}</div></section>` +
      `<section class="sec section-alt" id="galerie"><div class="wrap"><div class="head"><h2 class="serif rv">Ergebnisse zum Durchziehen</h2></div>${karussell()}${archivGrid(undefined, { ctaHref: '/kontakt/#anfrage', compact: true })}</div></section>` +
      flowBlock + timelineBlock + cardOrteSection + gebietskarte({ linkOrte: ortsHubSlugs }) + ratgeberSection + faqSection;   // Owner 18.09.: FAQ ganz unten, nach den Orten
  } else {
    // Beweis-Mechanik (eigene Vorher/Nachher-Doku) NICHT bei Partner-/Tippgeber-Services (Dach) — wäre Eigenleistungs-Beweis (Design §3).
    const beweis = (gk === 'reinigung' && BEWEIS_KEY[s.slug] && !s.partner_modell)
      ? `<section class="sec"><div class="wrap"><div class="head"><h2 class="serif rv">Woran Sie ein sauberes Ergebnis erkennen</h2></div>${beweisMechanik(BEWEIS_KEY[s.slug])}</div></section>`
      : '';
    // Garten/Generisch: mit Ortskarten; Reinigung: ohne Gebietskarte, Ortskarten bleiben (interne Links)
    rich = beweis + flowBlock + timelineBlock + cardOrteSection + ratgeberSection + faqSection;   // Owner 18.09.: FAQ ganz unten, nach den Orten
  }

  // b2b_only-Hub (hausmeisterservice): Querverlinkung zu /fuer-hausverwaltungen/ (Design §2 — beide Richtungen)
  const b2bCross = s.b2b_only ? `<section class="sec section-alt"><div class="wrap"><div class="prose wide rv"><h2>${esc(s.name)} für Hausverwaltungen &amp; Gewerbe</h2><p>${esc(s.name)} bieten wir im Havelland vor allem für Hausverwaltungen, WEG und Gewerbeobjekte an — mit festem Ansprechpartner, schriftlichem Angebot und Foto-Reporting nach jedem Einsatz. Den vollständigen Überblick über unser Objekt-Angebot finden Sie unter <a href="/fuer-hausverwaltungen/">Für Hausverwaltungen &amp; Gewerbe</a>.</p></div></div></section>` : '';
  // Optionale Copy-Blöcke (H2 + Fließtext, optionale Service-Querverlinkung): Wohnungsauflösungs-H2 + Kannibalisierungs-Firewall Entrümpelung↔Haushaltsauflösung (Design §4). Nur Hubs mit copy.blocks; sonst ''.
  // Blocks: optionales id (Anker-Ziel, z. B. /gartenpflege/#herbst-paket) + zweiter Link link2_to/link2_text; Ziele auch mit #anker oder ratgeber/… (Umbau 03.09.).
  // Pillar-Hub (17.09.): optionales b.lead (fetter Kernsatz vor dem Body, z. B. Übergabe-Garantie) + optionales Bild b.img/b.img_alt (Manifest-Slug, z. B. Ansprechpartner-Arbeitsfoto).
  // Layout-Runde 20.10.: Winterdienst-Leistungsfoto = neutrales Räum-Motiv ohne Fremdmarke (altes svc-winterdienst-detail zeigte einen Streuwagen mit lesbarem „SUBSTRAL“-Aufdruck); Zaunbau hat kein -detail mehr (war Dublette von zaunart-doppelstab).
  const detailKey = s.slug === 'winterdienst' ? '' : 'svc-' + s.slug + '-detail';   // Winterdienst: das neutrale Räum-Motiv ist jetzt das Hero-Bild (21.10., kein Logo-Personal bei Partnerleistung), kein zweites Leistungsfoto
  const hasDetail = !!IMG[detailKey];
  // Zaunarten-Vergleich (Zaunbau, 16.09.): Karten aus copy.zaunarten — Produktszenen (KI, gleiches Grundstück), kein Projektbezug; Preisfeld = Projektspanne oder "nach Besichtigung", nie €/lfm. Nur Hubs mit copy.zaunarten; sonst ''.
  const zaunarten = (c && Array.isArray(c.zaunarten) && c.zaunarten.length) ? `<section class="sec section-alt" id="zaunarten"><div class="wrap"><div class="head"><h2 class="serif rv">Welcher Zaun passt zu Ihrem Grundstück?</h2><p class="rv">Fünf Systeme an fünf typischen Havelland-Grundstücken — vom Siedlungshaus bis zum Neubau. Die drei oberen sind unsere Standardsysteme, Alu und Schmuckzaun bauen wir auf Anfrage. Die Bilder zeigen die Zaunart, nicht ein Kundenprojekt.</p></div><div class="cards zaunarten rv">${c.zaunarten.map(z => `<div class="card${z.fokus ? '' : ' card-muted'}">${IMG[z.img] ? pic(z.img, { alt: esc(z.name) + ' — Beispiel im Vorgarten', sizes: '(max-width:700px) 92vw, 33vw' }) : ''}<h3>${esc(z.name)}${z.fokus ? '' : ' <span class="chip chip-muted">auf Anfrage</span>'}</h3><p><strong>Sichtschutz:</strong> ${esc(z.sichtschutz)}<br><strong>Haltbarkeit:</strong> ${esc(z.haltbarkeit)}<br><strong>Lieferzeit:</strong> ${esc(z.lieferzeit)}<br><strong>Für wen:</strong> ${esc(z.passend)}</p><p><strong>20 m montiert:</strong> ${esc(z.spanne)}</p></div>`).join('')}</div></div></section>` : '';
  // Zwischen-CTA nach der Prose auf allen Hubs ohne Galerie-CTA (voll = Heckenschnitt hat die Galerie)
  const zwischen = (s.partner_modell || gk !== 'voll') ? ctaZwischen(s) : '';
  // Zonen-Parität (W3b Review #2): paper/weiß wechseln fortlaufend, Zwischen-CTAs zählen mit — kein paper-auf-paper.
  let paper = false;                       // nach leistungsSection (weiß)
  if (zaunarten) paper = true; if (zwischen) paper = true; if (hasDetail) paper = false;
  const zone = () => { paper = !paper; return paper ? ' section-alt' : ''; };
  // cta_after (CRO 16.09.; W3b 17.09.: Objekt = eigener CTA-Text statt Standard-Zwischen-CTA) — kontextueller CTA direkt nach dem Block mit höchster Kaufabsicht.
  const ctaAfter = (b) => !b.cta_after ? '' : ctaZwischen(s, { ...(typeof b.cta_after === 'object' ? b.cta_after : {}), alt: (paper = !paper) });
  // Blocks: bullets -> <ul class="bl">, Links bei Bullets hinter der Liste (Review #7), mehr -> <details>.
  const extraBlocks = (c && Array.isArray(c.blocks) ? c.blocks : []).map(b => {
    const hasBul = Array.isArray(b.bullets) && b.bullets.length > 0;
    const links = copyLinksHtml(b).trim();
    return `<section class="sec${zone()}"${b.id ? ` id="${esc(b.id)}"` : ''}><div class="wrap"><div class="prose wide rv"><h2>${esc(b.h2)}</h2>${b.lead ? `<p class="lead-p"><strong>${esc(b.lead)}</strong></p>` : ''}<p>${esc(b.body)}${hasBul ? '' : copyLinksHtml(b)}</p>${hasBul ? `<ul class="bl">${b.bullets.map(t => `<li>${esc(t)}</li>`).join('')}</ul>${links ? `<p>${links}</p>` : ''}` : ''}${b.mehr ? `<details class="mehr"><summary>Mehr dazu</summary><div><p>${esc(b.mehr)}</p></div></details>` : ''}${(b.img && IMG[b.img]) ? `<figure class="block-fig">${pic(b.img, { alt: b.img_alt || b.h2, sizes: '(max-width:900px) 92vw, 480px' })}</figure>` : ''}</div></div></section>` + ctaAfter(b);
  }).join('');
  // Hub-Querverweis (20.10., page-audit #5): Bestands-Hubs verlinken die passende neue GaLaBau-Seite.
  const HUB_CROSS = {
    gartenrodung: { h2: 'Nach der Rodung: Boden und Neuanlage', p: 'Ist die Fläche frei, planieren wir, bringen Mutterboden ein und legen auf Wunsch Rasen, Wege oder Beete neu an.', href: '/erdarbeiten/', a: 'Zu den Erdarbeiten', href2: '/gartengestaltung/', a2: 'Zur Gartengestaltung' },
    'baumstumpf-entfernen': { h2: 'Der Baum steht noch?', p: 'Wir fällen ihn auch, prüfen vorher die Baumschutzsatzung und fräsen den Stumpf im selben Einsatz weg.', href: '/baumfaellung/', a: 'Zur Baumfällung' },
    baumschnitt: { h2: 'Schnitt reicht nicht mehr?', p: 'Ist ein Baum zu groß, krank oder steht im Weg, fällen wir ihn in Teilstücken und klären vorher die Genehmigung.', href: '/baumfaellung/', a: 'Zur Baumfällung' },
    heckenentfernung: { h2: 'Hecke weg, und dann?', p: 'Auf die freie Fläche kommt neuer Rollrasen, ein Zaun oder ein frisch angelegtes Beet, aus einer Hand.', href: '/rollrasen-verlegen/', a: 'Zum Rollrasen', href2: '/gartengestaltung/', a2: 'Zur Gartengestaltung' },
    gartenpflege: { h2: 'Rasen nicht mehr zu retten?', p: 'Dann legen wir ihn neu an: Altrasen raus, Boden vorbereiten, Rollrasen verlegen.', href: '/rollrasen-verlegen/', a: 'Zum Rollrasen verlegen' },
    steinreinigung: { h2: 'Pflaster abgesackt oder kaputt?', p: 'Reinigen hilft dann nicht mehr. Wir setzen Steine neu, richten den Unterbau und pflastern auch neue Wege und Einfahrten.', href: '/pflasterarbeiten/', a: 'Zu den Pflasterarbeiten' }
  };
  const hx = HUB_CROSS[s.slug];
  const hubCross = hx ? `<section class="sec${zone()}"><div class="wrap"><div class="prose wide rv"><h2>${esc(hx.h2)}</h2><p>${esc(hx.p)} <a href="${hx.href}">${esc(hx.a)}</a>${hx.href2 ? ` · <a href="${hx.href2}">${esc(hx.a2)}</a>` : ''}.</p></div></div></section>` : '';
  // Fallbeispiele (echte Aufträge, anonymisiert) — nur Hubs mit copy.faelle; sonst ''. Parität weiterführen.
  const faelleHtml = (c && c.faelle) ? faelleBlock(c.faelle, { alt: (paper = !paper) }) : '';
  // W3b (17.09.): Layout "ueberblick" — Kachel-Grid + Versprechen-Zeile statt Prose-Wand; Legacy-Hubs ohne layout unverändert.
  const versprechenH = (s.garantie && !s.partner_modell) ? 'Unsere Garantie' : 'Unser Versprechen';
  const leistungsSection = ueberblick
    ? `<section class="sec" id="leistungen"><div class="wrap"><div class="head"><h2 class="serif rv">${esc(c.sections_h2 || (s.name + ' im Havelland — was dazugehört'))}</h2></div>${c.definition ? `<p class="sec-lead rv">${esc(c.definition)}</p>` : ''}<div class="cards leist rv">${kachelHtml}</div><p class="garantie-line rv"><strong>${versprechenH}:</strong> ${esc(garantieTxt)}</p></div></section>`
    : `<section class="sec"><div class="wrap"><div class="prose wide rv">${definition}<h2>${esc((c && c.sections_h2) || (s.name + ' im Havelland — was dazugehört'))}</h2>${sektionenHtml}${naehe}${ablauf}<h3>${versprechenH}</h3><p>${esc(garantieTxt)}</p></div></div></section>`;
  // ---- Paket 1: Grundgerüst (Kopf → Zusagen → Leistungen → Beweis → Zwischen-CTA → Blöcke → Passt → Orte → Ablauf → Ratgeber → FAQ → Ende) ----
  if (GRUNDGERUEST.has(s.slug)) {
    const partner = !!s.partner_modell;
    let z = false; const alt = () => (z = !z);   // Zonen-Parität: weiß/paper im Wechsel ab dem Leistungsteil
    const slugOfTo = to => String(to || '').split('#')[0].replace(/^\/|\/$/g, '').split('/').pop();
    const heroOf = sl => IMG['svc-' + sl + '-hero'] ? 'svc-' + sl + '-hero' : (sl === 'gewerbe' ? gwHeroSlug() : /^fuer-/.test(sl) && ZG[sl.slice(5)] ? zgBild(sl.slice(5)) : null);   // Paket 3: Zielgruppenseiten (fuer-firmen, …) und /gewerbe/ als „Passt“-Ziel
    const fotoOf = (src, alt) => { if (!src) return ''; if (IMG[src]) return pic(src, { alt, sizes: '(max-width:900px) 92vw, 46vw' }); if (!/\.(jpe?g|png|webp)$/i.test(src)) return pic('ueber-uns', { alt: 'Noah Telo und Maurice Brehm am Einsatzfahrzeug', sizes: '(max-width:900px) 92vw, 46vw' }); return `<img src="/assets/img/${esc(src)}" alt="${esc(alt)}" width="1200" height="900" loading="lazy" decoding="async">`; };
    const h2Leist = (c && c.sections_h2) || (s.name + ' im Havelland — was dazugehört');
    const leist = (c && c.layout === 'hub-karten' && c.karten)
      ? galabauKarten({ h2: h2Leist, lead: c.definition || '', kern: c.karten.kern.map(k => ({ href: hrefOf(k.to), h3: k.h3, p: k.p, imgHtml: heroOf(slugOfTo(k.to)) ? pic(heroOf(slugOfTo(k.to)), { alt: k.h3 + ' im Havelland', sizes: '(max-width:560px) 92vw, (max-width:900px) 46vw, 31vw' }) : '' })), ausserdem: (c.karten.ausserdem || []).map(a => ({ href: hrefOf(a.to), label: a.label })) })
      : leistungsListe({ h2: h2Leist, fotoHtml: IMG[detailKey] ? pic(detailKey, { alt: s.name + ' im Detail — Haus- & Gartenservice Havelland', sizes: '(max-width:900px) 92vw, 46vw' }) : '', items: (c && c.sections) || (s.sektionen || []).map(x => ({ h3: x, kurz: '' })), garantie: garantieTxt, garantieLabel: versprechenH });
    z = false;   // Leistungsteil = weiß
    if (zaunarten) z = true;   // Zaunarten-Abschnitt ist fest „paper“: der nächste Abschnitt wechselt auf weiß
    // Frist-Block zeitunabhängig (Runde 2): kein Monat, kein „jetzt“, kein Datum-Button.
    const fristData = (c && c.frist) ? { h2: 'Hecken entfernen ist nur vom <em>1. Oktober bis 28. Februar</em> erlaubt.', text: 'So schützt § 39 BNatSchG brütende Vögel. Besichtigung und Angebot gibt es das ganze Jahr.', cta: 'Termin im Fenster sichern' } : null;
    let beweis = '';
    if (c && c.ergebnisse === 'karussell') beweis = `<section class="sec${alt() ? ' section-alt' : ''}" id="galerie"><div class="wrap"><div class="head"><h2 class="serif rv">Ergebnisse zum Durchziehen</h2></div>${karussell()}${archivGrid(undefined, { ctaHref: '/kontakt/#anfrage', compact: true })}</div></section>`;
    else if (c && c.ergebnisse && Array.isArray(c.ergebnisse.paare)) { alt(); beweis = ergebnisPaare({ paare: c.ergebnisse.paare }); }
    else if (c && Array.isArray(c.vorteile) && c.vorteile.length) beweis = vorteileBlock({ items: c.vorteile, frist: fristData, alt: alt() });
    // Zwischen-CTA (20.10., Spec §3.3 Pkt. 4, Copy H5/H16): entfällt, wenn der Beweis einen eigenen Button hat (Karussell-CTA-Kachel, Frist-Block).
    // Mit Preise-Block steht er HINTER dem Preise-Block (bei Referenzprojekt hinter dem späteren von beiden, Beweis vor CTA), mit Ein-Button-Text; ohne Preise-Block an der alten Stelle, Text weicht vom Abschluss-Band ab.
    const blocksArr = (c && Array.isArray(c.blocks)) ? c.blocks : [];
    const preisIdx = (i => i >= 0 ? i : blocksArr.findIndex(b => /preis|kosten(?!los)/i.test(b.h2 || '')))(blocksArr.findIndex(b => b.id === 'preise'));
    const refIdx = blocksArr.findIndex(b => b.id === 'referenzprojekt');
    const ctaIdx = preisIdx >= 0 ? Math.max(preisIdx, refIdx) : -1;
    const zwHatBeweisButton = !!fristData || (c && c.ergebnisse === 'karussell');
    const zwOpts = zwischenOpts(s, preisIdx >= 0);
    const zw = (zwHatBeweisButton || ctaIdx >= 0) ? '' : ctaZwischen(s, { ...zwOpts, alt: alt() });
    // übrige Copy-Blöcke (Preise, Herbst-Paket …) — Querverweise sind nach `passt` gewandert
    // Heckenarten (Layout-Runde 20.10.): je Art Name fett + erster Satz (Schnittzeitpunkt) sichtbar, Rest eingeklappt — gleicher Text, kompakter. Ohne „Name: Satz“-Form bleibt der Punkt unverändert.
    const artenLi = t => { const m = String(t).match(/^([^:]{2,80}):\s+([\s\S]+)$/); if (!m) return `<li>${esc(t)}</li>`; const sp = m[2].match(/^([\s\S]+?[.!?])\s+(?=[A-ZÄÖÜ])([\s\S]+)$/); return `<li><b>${esc(m[1])}</b><span>${esc(sp ? sp[1] : m[2])}</span>${sp ? `<details class="mehr"><summary>Mehr dazu</summary><div><p>${esc(sp[2])}</p></div></details>` : ''}</li>`; };
    // Block-Innenleben (Überschrift-Tag h2 im Einzelabschnitt, h3 in einer Gruppe)
    const blockProse = (b, tag, cls) => {
      const hasBul = Array.isArray(b.bullets) && b.bullets.length > 0; const links = copyLinksHtml(b).trim();
      return `<div class="prose ${cls}rv"${tag === 'h3' && b.id ? ` id="${esc(b.id)}"` : ''}><${tag}>${esc(b.h2)}</${tag}>${b.lead ? `<p class="lead-p"><strong>${esc(b.lead)}</strong></p>` : ''}<p>${esc(b.body)}${hasBul ? '' : copyLinksHtml(b)}</p>${hasBul ? `<ul class="bl${b.id === 'heckenarten' ? ' bl-arten' : ''}">${b.bullets.map(t => b.id === 'heckenarten' ? artenLi(t) : `<li>${esc(t)}</li>`).join('')}</ul>${links ? `<p>${links}</p>` : ''}` : ''}</div>`;
    };
    // Zwischen-CTA steht als Streifen am Ende des Preise-Abschnitts (kein eigener Abschnitt: Spec „Hub ≤ 9 Abschnitte“)
    const ctaInline = () => ctaZwischen(s, { ...zwOpts, inner: true });
    // Blöcke mit gleichem `gruppe` (aufeinanderfolgend) stehen in EINEM Abschnitt als Spalten; `gruppe_h2` (am ersten Block) ist die Abschnitts-Überschrift, die Block-H2 werden zu H3.
    let restBlocks = '';
    for (let bi = 0; bi < blocksArr.length; bi++) {
      const b = blocksArr[bi];
      if (b.gruppe) {
        const grp = []; let e = bi; while (e < blocksArr.length && blocksArr[e].gruppe === b.gruppe) { grp.push(blocksArr[e]); e++; }
        const ctaHier = ctaIdx >= bi && ctaIdx < e && !zwHatBeweisButton;
        restBlocks += `<section class="sec${alt() ? ' section-alt' : ''}" id="${esc(b.gruppe)}"><div class="wrap"><div class="head"><h2 class="serif rv">${esc(b.gruppe_h2 || b.h2)}</h2></div><div class="bgrp bgrp-${grp.length} rv">${grp.map(x => blockProse(x, 'h3', '')).join('')}</div>${ctaHier ? ctaInline() : ''}</div></section>`;
        bi = e - 1; continue;
      }
      const ctaHier = bi === ctaIdx && !zwHatBeweisButton;
      restBlocks += `<section class="sec${alt() ? ' section-alt' : ''}"${b.id ? ` id="${esc(b.id)}"` : ''}><div class="wrap">${blockProse(b, 'h2', 'wide blk ')}${ctaHier ? ctaInline() : ''}</div></section>`;
    }
    const faelle = (c && c.faelle) ? faelleBlock(c.faelle, { alt: alt() }) : '';
    const passt = passtBlock({ items: ((c && c.passt) || []).map(x => { const sl = slugOfTo(x.to); const hk = heroOf(sl); return { href: hrefOf(x.to), h3: x.h3, p: x.p, link_text: x.link_text, imgHtml: hk ? pic(hk, { alt: x.h3, sizes: '(max-width:560px) 92vw, 340px' }) : '' }; }), alt: alt() });
    if (!passt) alt();
    // Orte: Falkensee zuerst, dann GSC-Top, aufgefüllt mit Fallback, nur gerenderte Ortsseiten
    const kand = [...(ORTE_TOP[s.slug] || []), ...(ORTE_TOP.fallback || []), ...seitenOrte(s).map(o => o.slug)];
    // M-7 (SEO): Orte-Block nur mit indexierbaren Ortsseiten (Wellen-Gate), sonst ganz weglassen. H-4 + Owner „Verlinkung komplett“: Top 6 als Buttons, alle übrigen als Textzeile „Weitere Orte“.
    const orteIdx = svcWaveNoindex(s) ? [] : [...new Set(kand)].filter(sl => hasOrt(s.slug, sl));
    const ortLink = sl => ({ href: `/${s.slug}-${sl}/`, name: (orte.find(o => o.slug === sl) || {}).name || sl });
    const topOrte = orteIdx.slice(0, 6).map(ortLink);
    const weitereOrte = orteIdx.slice(6).map(ortLink).sort((a, b) => a.name.localeCompare(b.name, 'de'));
    // Gewerbe-Hubs (Paket 3): eigenes Orte-Motiv svc-<slug>-orte; ein orte_foto, das Hero oder Leistungsfoto der Seite doppelt, wird dadurch ersetzt.
    const gwOrte = GW_HUBS.includes(s.slug) && IMG[`svc-${s.slug}-orte`] ? { src: `svc-${s.slug}-orte`, alt: IMG[`svc-${s.slug}-orte`].alt || `${s.name} im Havelland` } : null;
    const ofDup = !!(c && c.orte_foto) && [`svc-${s.slug}-detail`, svcHero(s.slug)].includes(c.orte_foto.src);
    const of = (c && c.orte_foto && !(gwOrte && ofDup)) ? c.orte_foto : (gwOrte || { src: 'ueber-uns', alt: 'Noah Telo und Maurice Brehm am Einsatzfahrzeug' });
    // Runde 1 (Befund winterdienst): Anker = „Leistung Ort“ (z. B. „Winterdienst Brieselang“), damit die exakten Orts-Phrasen auf dem Hub stehen, auf denen er laut GSC ausspielt; live standen sie in den Ortskarten.
    const orteHtml = orteBlock({ name: s.name, fotoHtml: fotoOf(of.src, of.alt), orte: topOrte, weitere: weitereOrte, partner, alt: alt(), ankerPrefix: h2Name(s) + ' ' });
    if (!orteHtml) alt();
    const ablaufHint = GW_HUBS.includes(s.slug) ? '' : (s.slug === 'winterdienst' ? 'Der schnellste Weg in drei Schritten: Adresse und Flächen nennen (Gehweg, Zufahrt, Hauseingang oder Hof), per WhatsApp senden, in einem Satz schreiben, welche Flächen bis wann frei sein sollen. Ungefähre Meter genügen, ausmessen müssen Sie nichts. Lieber anrufen? Auch das geht.' : 'Der schnellste Weg in drei Schritten: Fläche fotografieren (einmal längs, einmal von vorn), das Foto per WhatsApp senden, in zwei Sätzen schreiben, was passieren soll und wo Sie stehen. Sie müssen nichts ausmessen und kein Formular ausfüllen. Lieber anrufen? Auch das geht.');
    const ablauf = soLaeufts({ partner, slug: s.slug, name: h2Name(s), waText: `Hallo, ich interessiere mich für ${s.name}.`, alt: alt(), hint: esc(ablaufHint) });
    const ratgeberGG = ratgeberSection ? ratgeberSection.replace('<section class="sec section-alt">', `<section class="sec${alt() ? ' section-alt' : ''}">`) : '';   // Zonen-Parität bis zum Ende (Ablauf, Ratgeber, FAQ im Wechsel)
    const faqSectionGG = `<section class="sec${alt() ? ' section-alt' : ''}"><div class="wrap">${faqFilter(faqData, { heading: `Häufige Fragen zu <em>${esc(h2Name(s))}</em>` })}</div></section>`;
    const mainGG = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>${esc(s.name)}</div>
<section class="phero">${leaf('hleaf')}<div class="wrap grid"><div><span class="kick rv in" style="color:var(--green)">Leistung</span><h1 class="rv in d1">${h1}</h1><p class="lead rv in d2">${lead}</p><div class="cta-row rv in d3">${ctaPrim((isB2Bonly(s.segment) || s.b2b_only) ? CTA_ANGEBOT : primLabel(s))}<a class="btn btn-line" href="${waHref(`Hallo, ich interessiere mich für ${s.name}.`)}">WhatsApp</a><a class="btn btn-line" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a></div>${trustLine}</div>
<div class="shot rv in d2">${heroShot}</div></div></section>
${gstripFor(s)}
${leist}
${zaunarten}
${beweis}
${zw}
${restBlocks}${faelle}
${passt}
${orteHtml}
${ablauf}
${ratgeberGG}
${faqSectionGG}
${partner ? endBandPartner(s) : endBandHub(s)}`;
    write(url, head(title, meta, url, schema, { og: svcHero(s.slug) }).replace('</head><body>', GW_HUBS.includes(s.slug) ? '</head><body class="gw-hub">' : '</head><body>') + header + mainGG + footer + sctaBar(`Hallo, ich interessiere mich für ${s.name} im Havelland.`) + revealJS + '</body></html>');
    written.hubs.push(url);
    return;
  }
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>${esc(s.name)}</div>
<section class="phero">${leaf('hleaf')}<div class="wrap grid"><div><span class="kick rv in" style="color:var(--green)">Leistung</span><h1 class="rv in d1">${h1}</h1><p class="lead rv in d2">${lead}</p><div class="cta-row rv in d3">${ctaPrim((isB2Bonly(s.segment) || s.b2b_only) ? CTA_ANGEBOT : primLabel(s))}<a class="btn btn-line" href="${waHref(`Hallo, ich interessiere mich für ${s.name}.`)}">WhatsApp</a><a class="btn btn-line" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a></div>${trustLine}</div>
<div class="shot rv in d2">${heroShot}</div></div></section>
${gstripFor(s)}
${leistungsSection}
${zaunarten}
${zwischen}
${IMG[detailKey] ? `<section class="sec" style="padding-top:0"><div class="wrap"><div class="media-band rv">${pic(detailKey, { alt: s.name + ' im Detail — Haus- & Gartenservice Havelland', sizes: '(max-width:1100px) 92vw, 1040px' })}</div></div></section>` : ''}
${extraBlocks}${hubCross}${faelleHtml}
${rich}
${b2bCross}
${s.partner_modell ? endBandPartner(s) : endBand}`;
  write(url, head(title, meta, url, schema, { og: svcHero(s.slug) }) + header + main + footer + sctaBar(`Hallo, ich interessiere mich für ${s.name} im Havelland.`) + revealJS + '</body></html>');
  written.hubs.push(url);
}

// ---------- ORTSSEITE ----------
function ortsseite(s, o) {
  const url = `/${s.slug}-${o.slug}/`;
  const c = hubCopy[s.slug];
  const oc = orteCopy[o.slug];
  const so = ortsSvcCopy[s.slug] || null;
  const soOrt = (so && so.orte && so.orte[o.slug]) || null;
  const tief = soOrt && soOrt.tief ? soOrt.tief : null;   // W2: Tiefen-Block für Tier-1-Ortsseiten
  // W4 (21.09.): CTA-Texte des Tiefen-Blocks kommen aus tief.cta_grid / tief.cta_after (ortsseiten.json); Fallback je Service, Partner ohne Festpreis-Text (UWG).
  const tiefCtaDefault = (s.slug === 'winterdienst') ? { h2: 'Flächen nennen, Saisonangebot bekommen.', txt: 'Kostenlose Besichtigung in ' + o.name + ' durch den Partner-Fachbetrieb, Saisonpreis vor der Zusage, Einsatznachweis nach jeder Räumung.' } : s.partner_modell ? {} : { h2: 'Foto schicken, Festpreis bekommen.', txt: 'Rückmeldung am selben Werktag, kostenlose Besichtigung in ' + o.name + ', schriftlicher Festpreis für Räumung und Abtransport.' };
  // W4 (21.09.): Tier-1 auch für Partner-Services (winterdienst/falkensee) — CTA nach dem Tiefen-Block dann ohne Festpreis-Text (Partner-Default aus ctaZwischen), UWG-Framing.
  // Zonen-Parität nach tiefBlock (Kopf weiß -> ortsblock paper -> blocks i%2): letzte Zone paper? (Review #2)
  const tiefPaper = tief ? ((tief.blocks && tief.blocks.length) ? ((tief.blocks.length - 1) % 2 === 1) : !!tief.ortsblock) : false;
  // Guard (03.09., C5 Nr. 60): Partner-Service ohne bespoke Copy rendert keine Orts-Hooks/Archetyp-Pools — die tragen Festpreis-/Foto-/Eigenleistungs-Zusagen.
  const partnerNoCopy = !!s.partner_modell && !soOrt;
  const arch = oc ? (partnerNoCopy ? (archCopy['partner-winterdienst'] || null) : archCopy[oc.archetype]) : null; // Partner-Pool statt Festpreis-Pools
  const seed = seedOf(url);
  const nachbarn = seitenOrte(s).filter(x => x.slug !== o.slug && hasOrt(s.slug, x.slug));
  const nahCards = rotate(nachbarn, seed, 4);

  const place = `{"@type":"Place","name":"${sj(o.name)}"${o.plz?`,"address":{"@type":"PostalAddress","postalCode":"${sj(o.plz)}","addressLocality":"${sj(o.name)}","addressCountry":"DE"}`:''}}`;
  const schema = `${orgSchema()},{"@type":"Service","@id":"${DOMAIN}${url}#service","name":"${sj(s.name)} ${sj(o.name)}","serviceType":"${sj(s.name)}","image":"${imgAbs(svcHero(s.slug))}","${s.partner_modell ? 'broker' : 'provider'}":{"@id":"${DOMAIN}/#organization"},"areaServed":${place}},${breadcrumb([{name:'Start',url:'/'},{name:s.name,url:`/${s.slug}/`},{name:o.name,url}])}`;

  // Body aus Copy-Schicht (mit Fallback) — Archetyp-Bausteine aus POOLS per Seed (Near-Duplicate-Reduktion)
  const pickPool = (arr, i) => Array.isArray(arr) && arr.length ? arr[((i % arr.length) + arr.length) % arr.length] : (typeof arr === 'string' ? arr : '');
  const idx = (archOrtIdx[o.slug] || 0) + (svcPoolIdx[s.slug] || 0); // Ort + Service, sonst teilen sich alle Services eines Ortes den Text
  // Partner-Pool (03.09.): Index global über alle Orte, sonst teilen sich Orte verschiedener Archetypen dasselbe (rahmen,trust)-Tupel (NearDup).
  const idxP = s.partner_modell ? haupt.findIndex(x => x.slug === o.slug) : idx; // 04.09.: global für alle Partner-Ortsseiten (bespoke + Pool), sonst kollidieren Rotationen
  const rLen = arch && Array.isArray(arch.rahmen) ? arch.rahmen.length : 1;
  // Welle-1a: bespoke Service×Ort-Copy (falls vorhanden) hat Vorrang vor Archetyp/Ort-Hook
  const lead = c && c.ortsseite_lead ? fillTok(c.ortsseite_lead, o, oc) : `Ihr ${s.name} in ${o.name} — vom Haus- & Gartenservice Havelland.`;
  // Reihenfolge (Umbau 03.09.): bespoke Hook → bei Partner-Services der Partner-Pool-Hook (nie oc.hook: der trägt "Anfahrt steckt im Festpreis") → sonst Orts-Hook
  const hookSrc = soOrt && soOrt.hook ? soOrt.hook : (s.partner_modell ? (arch && arch.hooks ? pickPool(arch.hooks, idxP + 1) : '') : (oc && oc.hook ? oc.hook : ''));
  const hook = hookSrc ? `<p>${esc(fillTok(hookSrc, o, oc))}</p>` : '';
  const rahmenTxt = soOrt && soOrt.rahmen ? soOrt.rahmen : pickPool(arch && arch.rahmen, idxP);   // eindeutige Verteilung
  const trustTxt = soOrt && soOrt.trust ? soOrt.trust : pickPool(arch && arch.trust, Math.floor(idxP / rLen));  // -> (rahmen,trust)-Tupel eindeutig je Archetyp-Ort
  // W3b (Review #9): rahmen eingeklappt — Intro nach dem Hero wird halb so lang, Text bleibt im DOM (NearDup-Gate misst den Block weiterhin).
  const rahmen = rahmenTxt ? `<details class="mehr"><summary>Mehr über unsere Arbeit in ${esc(o.name)}</summary><div><p>${esc(fillTok(rahmenTxt, o, oc))}</p></div></details>` : '';
  const sektionen = (s.sektionen || []).map(x => `<li>${esc(x)}</li>`).join('');
  const ortsteile = (o.ortsteile && o.ortsteile.length && !s.seiten_orte) ? `<p>Auch in ${esc(o.ortsteile.join(', '))} und Umgebung sind wir für Sie da.</p>` : '';
  const trust = trustTxt ? `<p>${esc(fillTok(trustTxt, o, oc))}</p>` : (s.partner_modell ? `<p>Kostenlose Besichtigung durch den Partner-Fachbetrieb, das Angebot kommt vom ausführenden Betrieb — wir koordinieren Termin und Ablauf.</p>` : `<p>Kostenlose Besichtigung, danach ein Festpreis ohne Nachkommen — und nach dem Auftrag Vorher/Nachher-Fotos per WhatsApp.</p>`);

  // FAQ: bespoke Service-Ort-Pool (falls vorhanden) ersetzt Archetyp-FAQ UND Hub-FAQ auf der Ortsseite (volle Compliance-Kontrolle, u.a. Dach-Partner-Framing); sonst 2 Archetyp-FAQ + 2 Hub-FAQ wie bisher
  const _faqPool = so && so.faqs ? so.faqs : (partnerNoCopy ? null : (arch && arch.faqs));
  // Partner-Ortsseiten (04.09.): zwei FAQs als paarweise eindeutiges Paar aus dem Pool (je zwei Seiten teilen höchstens eine Frage) — NearDup-Gate.
  const faqPaar = (pool, k) => { const n = pool.length; if (n < 3) return pool; const runde = Math.floor(k / n); const i = k % n; const j = (i + 1 + 2 * runde) % n; return j === i ? [pool[i]] : [pool[i], pool[j]]; };
  const archFaqs = _faqPool ? (s.partner_modell ? faqPaar(_faqPool, idxP) : (_faqPool.length >= 3 ? faqPaar(_faqPool, idx) : rotate(_faqPool, idx, 2))).map(f => ({ q: fillTok(f.q, o, oc), a: fillTok(f.a, o, oc) })) : [];
  // so.hub_faq_fill = N (Umbau 03.09., winterdienst): bespoke Pool liefert 2, der Hub füllt auf N auf; ohne das Feld bleibt bespoke = Hub-FAQ aus.
  const faqFill = so && so.faqs ? Math.max(0, (so.hub_faq_fill || 0) - archFaqs.length) : (archFaqs.length ? 2 : 4);
  const hubFaqs = (so && so.faqs && !faqFill) ? [] : (c && c.faqs ? ((hp => (hp.length <= 4 && faqFill === 2 && !s.partner_modell) ? (hp.length < 3 ? rotate(hp, idx + 1, 1) : faqPaar(hp, idx * 5 + 2 + Math.floor(idx / 4))) : rotate(hp, (s.partner_modell ? idxP : idx) + 1, faqFill))(c.faqs.filter(f => !f.hub_only))) : []);   // R2: gekürzter Hub-FAQ-Pool (≤4): paarweise verschiedene Paare statt Rotation (NearDup)
  // W2: bespoke Tiefen-FAQs (tief.faqs) ersetzen archFaqs+hubFaqs komplett, wenn gesetzt.
  const faqs = (tief && tief.faqs && tief.faqs.length) ? tief.faqs : [...archFaqs, ...hubFaqs];
  const ortRatPool = ratgeberByService[s.slug] || [];
  const ortRat = (soOrt && soOrt.ratgeber && ratCopy.find(r => r.slug === soOrt.ratgeber)) || (ortRatPool.length ? ortRatPool[idx % ortRatPool.length] : null); // soOrt.ratgeber = fester Ratgeber je Ort (Falkensee → Uhrzeiten)
  const ortRatLink = ortRat ? `<p>Mehr zum Thema lesen Sie in unserem Ratgeber: <a href="/ratgeber/${ortRat.slug}/">${esc(ortRat.title)}</a>.</p>` : '';

  // Ortsseiten-Title: optionales title_suffix je Service (data/services.json) statt des generischen
  // "– Havelland". Nur gesetzt, wo das Suchmotiv einen Zusatz rechtfertigt (saisonale Gewerke) —
  // Services ohne das Feld behalten den bisherigen Title unverändert.
  const tSuffix = s.title_suffix ? ` – ${s.title_suffix}`
    : ((s.name.length + o.name.length) < 34 ? ' – Havelland' : '');
  // Passt der volle Suffix nicht in 60 Zeichen, greift title_suffix_short (services.json) statt eines abgeschnittenen Titels.
  const tShort = (s.title_suffix && s.title_suffix_short && rlen(`${s.name} ${o.name}${tSuffix}`) > 60) ? ` – ${s.title_suffix_short}` : tSuffix;
  const title = clampTitle(soOrt && soOrt.title ? fillTok(soOrt.title, o, oc) : `${s.name} ${o.name}${tShort}`);   // 20.10.: bespoke Title je Ort (z. B. „Gartenbau Spandau“ statt Service-Name + Ort)
  const meta = mkMeta(soOrt && soOrt.meta ? fillTok(soOrt.meta, o, oc) : so && so.meta ? fillTok(so.meta, o, oc) : (s.partner_modell ? `${s.name} in ${o.name}${o.plz?` (${o.plz})`:''}: Ausführung durch einen Partner-Fachbetrieb, koordiniert über einen festen Ansprechpartner vom Haus- & Gartenservice Havelland.` : `${s.name} in ${o.name}${o.plz?` (${o.plz})`:''} vom Haus- & Gartenservice Havelland: Festpreis nach kostenloser Besichtigung und Foto-Nachweis nach jedem Auftrag.`));

  // Heckenschnitt-Ort: Vorher/Nachher-Slider im Hero; andere Gewerke: Standard-Bild (kein Slider)
  const ortVoll = VOLL_VN.has(s.slug);
  const heroShotO = ortVoll
    ? baSlider({ slug: '06-02-thuja-grenze', alt: s.name + ' in ' + o.name, cap: 'Thuja', sub: 'in ' + o.name + ' geschnitten', hint: true, lcp: true })
    : pic(svcHero(s.slug), { cls: 'main', alt: s.name + ' in ' + o.name + ' — Haus- & Gartenservice Havelland', sizes: '(max-width:900px) 92vw, 60vw', lcp: true });
  // Herbst-Paket Deploy 1/2: Cross-Sektion nach dem prose-Container — bewusst AUSSERHALB des ersten
  // <div class="prose wide">-Blocks (NearDup-Gate misst prose+faq). heckenschnitt-Ortsseiten verlinken
  // auf den Entfernungs-Hub; heckenentfernung↔baumstumpf-entfernen verlinken den Schwester-Hub (Deploy 2).
  const ORT_CROSS = {
    heckenschnitt: { h2: 'Hecke soll komplett weg?', p: `Manchmal ist die Hecke nicht mehr zu retten — verkahlt, zu groß geworden oder im Weg. Dann entfernen wir sie komplett samt Wurzel, fräsen die Stubben und entsorgen alles, zulässig vom 1. Oktober bis 28. Februar.`, href: '/heckenentfernung/', a: 'Mehr zur Heckenentfernung im Havelland' },
    heckenentfernung: { h2: 'Stubben und Wurzeln gleich mit raus', p: `Nach der Heckenentfernung bleiben oft noch einzelne Baumstümpfe auf dem Grundstück. Die fräsen wir im selben Einsatz mit weg — inklusive Einebnen und Entsorgung des Fräsguts.`, href: '/baumstumpf-entfernen/', a: 'Mehr zur Baumstumpf- & Wurzelentfernung' },
    'baumstumpf-entfernen': { h2: 'Ganze Hecke weg statt einzelner Stumpf?', p: `Wenn nicht nur ein Stumpf stört, sondern eine komplette Hecke verschwinden soll, übernehmen wir auch das: Rückschnitt, Rodung samt Wurzel und Entsorgung — im gesetzlichen Fenster vom 1. Oktober bis 28. Februar.`, href: '/heckenentfernung/', a: 'Mehr zur Heckenentfernung im Havelland' }
  };
  const cx = ORT_CROSS[s.slug];
  const crossSection = cx ? `<section class="sec section-alt"><div class="wrap"><div class="prose wide rv"><h2>${esc(cx.h2)}</h2><p>${esc(cx.p)} <a href="${cx.href}">${esc(cx.a)}</a>.</p></div></div></section>` : '';
  const nachbarSection = `<section class="sec section-alt"><div class="wrap"><div class="head"><h2 class="serif rv">${esc(s.name)} in der Nähe</h2></div><div class="cards rv">${nahCards.map(n=>`<a class="card" href="/${s.slug}-${n.slug}/"><h3>${esc(s.name)} ${esc(n.name)}</h3><span class="go">Mehr →</span></a>`).join('')}${ortsHubSlugs.has(o.slug)?`<a class="card" href="/standorte/${o.slug}/"><h3>Alle Leistungen in ${esc(o.name)}</h3><span class="go">Zum Ort →</span></a>`:`<a class="card" href="/${s.slug}/"><h3>Mehr zu ${esc(s.name)}</h3><span class="go">Zur Leistung →</span></a>`}</div></div></section>`;
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span><a href="/${s.slug}/">${esc(s.name)}</a><span class="sep">›</span>${esc(o.name)}</div>
<section class="phero">${leaf('hleaf')}<div class="wrap grid"><div><span class="kick rv in" style="color:var(--green)">${esc(o.name)}${o.plz?` · ${esc(o.plz)}`:''}</span><h1 class="rv in d1">${esc(s.name)} <em>in ${esc(o.name)}</em></h1><p class="lead rv in d2">${esc(lead)}</p><div class="cta-row rv in d3">${ctaPrim((isB2Bonly(s.segment) || (isB2Bonly(o.typ) && !s.seiten_orte)) ? CTA_ANGEBOT : 'Kostenlose Besichtigung anfragen')}<a class="btn btn-line" href="${waHref(`Hallo, ich brauche ${s.name} in ${o.name}.`)}">WhatsApp</a></div></div>
<div class="shot rv in d2">${heroShotO}</div></div></section>
${gstripFor(s)}
<section class="sec"><div class="wrap"><div class="prose wide rv"><h2>${esc(s.name)} in ${esc(o.name)} — zuverlässig &amp; lokal</h2>${hook}${rahmen}${sektionen?`<h3>Was dazugehört</h3><ul>${sektionen}</ul>`:''}${ortsteile}<h3>${s.partner_modell ? 'Ein Ansprechpartner, ein koordinierter Ablauf' : 'Festpreis &amp; Foto-Nachweis'}</h3>${trust}${ortRatLink}</div></div></section>
${tief ? tiefBlock(tief, { linkHtml: copyLinksHtml, hrefOf, ctaAfterGrid: tief.cta_grid ? ctaZwischen(s, { ...tief.cta_grid }) : '' }) : ''}${tief ? ctaZwischen(s, { ...(tief.cta_after || tiefCtaDefault), alt: !tiefPaper }) : ''}${tief && tief.faelle && tief.faelle.length ? faelleBlock(tief.faelle, { heading: 'So sah das zuletzt in ' + o.name + ' aus.', alt: tiefPaper }) : ''}${crossSection}
<section class="sec" style="padding-top:0"><div class="wrap"><div class="media-band rv">${pic(ortArchImg(o), { alt: 'Haus- & Gartenservice in ' + o.name + ' und Umgebung', sizes: '(max-width:1100px) 92vw, 1040px' })}</div></div></section>
<section class="sec"><div class="wrap">${whatsappFlow({ gewerk: waGewerk(s), ort: o.name, partner: !!s.partner_modell, fotoNeutral: FOTO_NEUTRAL.has(s.slug) || s.slug === 'winterdienst', winter: s.slug === 'winterdienst' })}</div></section>
${nachbarSection}
<section class="sec"><div class="wrap">${faqFilter(faqs.length ? faqs : null)}</div></section>
${s.partner_modell ? endBandPartner(s) : endBand}`;
  const ni = svcWaveNoindex(s);
  write(url, head(title, meta, url, schema, { noindex: ni, og: svcHero(s.slug) }) + header + main + footer + sctaBar(`Hallo, ich brauche ${s.name} in ${o.name}.`) + revealJS + '</body></html>');
  written.ortsseiten.push(url); if (!ni) written.ortsseitenIdx.push(url);
}

// ---------- STANDORTE (Paket 3a, 21.10.2026): /standorte/ + 22 Standortseiten ----------
// Spec: websites/havelland/website/paket3-standorte-gewerbe-2026-10/01-design-spec.md Teil A. Daten: data/standorte.json (scripts/build-standorte.mjs) + Copy data/copy/standorte-orte.json / uebersicht.json (Schlüssel standorte).
// Copy-Fallback: fehlt ein Eintrag, greift die bestehende Copy (orteCopy.hook, uebS.*).
const SX = J('standorte.json');
const _soCp = CP('standorte-orte.json') || {};
const soCopy = (_soCp && _soCp.orte) || _soCp;   // { <ort-slug>: {title, meta, lead, anfaellt[3], faqs[3], quellen} }
for (const k in soCopy) { const e = soCopy[k]; for (const f of ['title', 'meta', 'lead']) if (e[f] != null) e[f] = plain(e[f]); if (e.anfaellt) for (const x of e.anfaellt) { x.h3 = plain(x.h3); x.p = plain(x.p); } if (e.faqs) for (const x of e.faqs) { x.q = plain(x.q); x.a = plain(x.a); } }
// Link-Regel (Spec §3): existiert /<leistung>-<ort>/ und ist indexierbar → dorthin, sonst auf den Hub /<leistung>/.
const sxIsOrt = (sv, ort) => hasOrt(sv, ort) && !svcNoindexBySlug(sv);
const sxHref = (sv, ort) => sxIsOrt(sv, ort) ? `/${sv}-${ort}/` : `/${sv}/`;
const sxLabel = sv => (SX.kern_namen && SX.kern_namen[sv]) || navLabel(services.find(x => x.slug === sv) || { name: sv, slug: sv });
const ortBySlug = Object.fromEntries(orte.map(o => [o.slug, o]));
const deListe = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' und ' + a[a.length - 1];
// Sätze eines Fließtexts (für den Fallback aus orteCopy.hook: Kopf = Sätze 1–2, Rest = Prosa unter „Was anfällt“)
const sxSaetze = txt => { const out = []; let rest = String(txt || '').replace(/\s+/g, ' ').trim(); while (rest && out.length < 30) { const s = ersterSatz(rest); if (!s) break; out.push(s); rest = rest.slice(s.length).trim(); } return out; };
// Kopfbild: standorte-hero (G2) wird vom Bild-Agenten geliefert; solange es nicht im Manifest steht, trägt ueber-uns das Bild.
const SX_HERO_ALT = 'Maurice und Noah tragen Material zum Transporter, Haus- & Gartenservice Havelland';
const sxHeroPic = (slug, { alt = '', lcp = true } = {}) => {
  if (slug === 'standorte-hero' || !IMG[slug]) {
    const real = !!IMG['standorte-hero'];
    return pic(real ? 'standorte-hero' : 'ueber-uns', { cls: 'main', alt: alt || (real ? (IMG['standorte-hero'].alt || SX_HERO_ALT) : 'Noah Telo und Maurice Brehm am Einsatzfahrzeug'), sizes: '(max-width:900px) 92vw, 46vw', lcp });
  }
  return pic(slug, { cls: 'main', alt, sizes: '(max-width:900px) 92vw, 46vw', lcp });
};
// Ablauf in 4 Schritten, ortsneutral formuliert; Reaktionszeiten nur wie vom Owner bestätigt (20.10.): „am selben Tag“, „meist innerhalb weniger Tage“.
const sxAblauf = ort => [
  { when: 'Am selben Tag', h: 'Foto oder Anruf', p: `Schildern Sie per WhatsApp oder Telefon kurz, was in ${esc(ort)} ansteht, ein Handyfoto reicht. Wir antworten am selben Tag.` },
  { when: 'Meist innerhalb weniger Tage', h: 'Kostenlose Besichtigung', p: `Wir kommen in ${esc(ort)} vorbei, schauen uns alles an und nennen den Festpreis. Nach der Besichtigung steht Ihr Preis schriftlich fest.` },
  { when: 'Zum vereinbarten Termin', h: 'Erledigt', p: 'Pünktlich und gründlich, wir räumen hinter uns auf und übergeben besenrein.' },
  { when: 'Direkt nach der Arbeit', h: 'Fotos aufs Handy', p: 'Vorher- und Nachher-Fotos, auch wenn Sie nicht zu Hause waren.' }
];

// ---------- ORTS-HUB (Standortseite) ----------
function ortsHub(o) {
  const svcs = servicesForOrt(o);
  if (svcs.length < 3) return;
  const url = `/standorte/${o.slug}/`;
  const oc = orteCopy[o.slug] || {};
  const sc = soCopy[o.slug] || {};
  const teile = (ortsteileVon ? Object.entries(ortsteileVon).filter(([, p]) => p === o.name).map(([s]) => s) : []).map(sl => (ortBySlug[sl] || {}).name || sl);
  // Kopf: lead aus der neuen Copy, sonst die ersten zwei Sätze der bestehenden Ortsbeschreibung
  const hookS = sxSaetze(oc.hook);
  const lead = sc.lead || hookS.slice(0, 2).join(' ') || `Alle Leistungen rund um Haus und Garten in ${o.name}${o.plz ? ` (${o.plz})` : ''}, von einem festen Ansprechpartner.`;
  // Kopfbild (Spec §6): data/standorte.json kopfbild[ort], Standard standorte-hero
  const kb = SX.kopfbild[o.slug] || 'standorte-hero';
  const kbSvc = (/^svc-(.+)-hero$/.exec(kb) || [])[1];
  const kbName = kbSvc ? ((services.find(x => x.slug === kbSvc) || {}).name || kbSvc) : '';
  const bild = sxHeroPic(kb, { alt: kbSvc ? `${kbName} in ${o.name} — Haus- & Gartenservice Havelland` : '' });
  // 4 Kern-Karten (feste Leistungen) + „Außerdem“ = alle übrigen indexierbaren Leistungs-Ortsseiten des Orts
  const kernItems = SX.kern.map(sv => {
    const s = services.find(x => x.slug === sv);
    return { name: s.name, kurz: sxLabel(sv), href: sxHref(sv, o.slug), ortsseite: sxIsOrt(sv, o.slug), p: String((SX.kern_texte || {})[sv] || '').split('{ort}').join(o.name), img: pic(svcHero(sv), { alt: `${s.name} in ${o.name}`, sizes: '(max-width:560px) 92vw, (max-width:900px) 46vw, 23vw' }) };
  });
  const ausser = svcs.filter(s => !SX.kern.includes(s.slug) && sxIsOrt(s.slug, o.slug));
  const partnerN = ausser.filter(s => s.partner_modell).map(s => navLabel(s));
  const note = partnerN.length ? `${deListe(partnerN)} koordinieren wir über einen Partner-Fachbetrieb, das Angebot kommt vom Fachbetrieb.` : '';
  // Nachbarorte: nur Orte mit Standortseite
  const nah = (SX.nachbarn[o.slug] || []).filter(sl => ortsHubSlugs.has(sl) && sl !== o.slug).map(sl => ({ href: `/standorte/${sl}/`, name: ortBySlug[sl].name }));
  // FAQ: 3 ortsbezogene aus der Copy, sonst bestätigte Standardantworten (Owner 20.10.)
  const faqs = (sc.faqs && sc.faqs.length ? sc.faqs : [
    { q: `Kommen Sie auch nach ${o.name}?`, a: `Ja, ${o.name} gehört zu unserem Einsatzgebiet. Schicken Sie uns kurz Ihre Adresse per WhatsApp, wir antworten am selben Tag.` },
    { q: 'Kostet die Anfahrt extra?', a: 'Nein, die Anfahrt ist im Festpreis enthalten. Den Preis nennen wir nach der kostenlosen Besichtigung.' },
    { q: 'Wie schnell bekomme ich einen Termin?', a: 'Die Besichtigung klappt meist innerhalb weniger Tage. Den Arbeitstermin stimmen wir danach mit Ihnen ab.' }
  ]).slice(0, 3);
  const items = (sc.anfaellt && sc.anfaellt.length ? sc.anfaellt : []).slice(0, 3);
  const prose = items.length ? '' : hookS.slice(2).join(' ');

  const schema = `${orgSchema()},{"@type":"CollectionPage","@id":"${DOMAIN}${url}#page","name":"Haus- & Gartenservice in ${sj(o.name)}","about":{"@id":"${DOMAIN}/#organization"},"contentLocation":{"@type":"Place","name":"${sj(o.name)}"}},${breadcrumb([{ name: 'Start', url: '/' }, { name: 'Standorte', url: '/standorte/' }, { name: o.name, url }])}`;
  const waText = `Hallo, ich brauche Hilfe in ${o.name}.`;
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span><a href="/standorte/">Standorte</a><span class="sep">›</span>${esc(o.name)}</div>
${seitenHero({ kick: o.plz ? `Standort · ${o.plz} ${o.name}` : 'Standort', h1: `Haus- &amp; Gartenservice in <em>${esc(o.name)}</em>`, lead, leaf: leaf('hleaf'), bild, trust: trustLine, cta: `${ctaA}<a class="btn btn-line" href="${waHref(waText)}">WhatsApp</a>` })}
${gstripOhneAbfuhr}
${kernKarten({ ort: o.name, items: kernItems, weitere: ausser.map(s => ({ href: `/${s.slug}-${o.slug}/`, label: navLabel(s) })), note, lead: 'Unsere vier Hauptleistungen vor Ort. Ein Klick führt zur Seite mit allen Einzelheiten.', alt: false })}
${anfaelltBlock({ ort: o.name, items, prose, teile, alt: true })}
${soLaeufts({ name: `es in ${o.name}`, waText, alt: false, items: sxAblauf(o.name), reihe: true })}
${naeheZeile({ orte: nah, alt: true })}
${faqKurz({ h2: `Häufige Fragen zu <em>${esc(o.name)}</em>`, faqs, alt: false })}
${endBand}`;
  write(url, head(clampTitle(sc.title || `Haus- & Gartenservice ${o.name}`), mkMeta(sc.meta || `Haus- & Gartenservice in ${o.name}${o.plz ? ` (${o.plz})` : ''}: Garten, Reinigung, Winterdienst, Entrümpelung von einem festen Ansprechpartner.`), url, schema, { noindex: (config.aktive_welle || 0) < 2, og: kb }) + header + main + footer + sctaBar(waText) + revealJS + '</body></html>');
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
  const ctaPitch = String(r.cta_text || ((svc && svc.partner_modell) ? `${svc.name} im Havelland — kostenlose Besichtigung durch den Partner-Fachbetrieb, ein Ansprechpartner für Termin und Ablauf.` : `${(svc && svc.name) || 'Diese Leistung'} im Havelland — kostenlose Besichtigung, Festpreis, Foto-Doku nach dem Auftrag.`))
    .replace(/\s*(Sprechen Sie|Rufen Sie|rufen Sie|Schreiben Sie|Melden Sie sich)[^.!?]*[.!?]?\s*$/, '').trim();
  const ctaWa = waHref(`Hallo, ich interessiere mich für ${svc.name || 'Ihre Leistungen'}${svc.name ? '' : ''}.`);
  const bodyHtml = (r.sections || []).map(x => `<h2>${esc(x.h2)}</h2>${x.body_html || ''}`).join('');
  // AEO-Direktantwort oben (aus intro); Hecken-Zeitpunkt-Ratgeber bekommen zusaetzlich den Schnittkalender
  const KAL_RATGEBER = new Set(['wann-hecke-schneiden', 'hecke-schneiden-erlaubt', 'hecke-entfernen-erlaubt']);
  const kalEmbed = KAL_RATGEBER.has(r.slug) ? `<section class="sec section-alt"><div class="wrap">${schnittkalender()}</div></section>` : '';
  const faqSection = (r.faqs && r.faqs.length) ? `<section class="sec"><div class="wrap">${faqFilter(r.faqs)}</div></section>` : '';
  // GEO (W3-Audit 17.09.): optionale about/mentions aus ratgeber.json verankern Ort/Betreiber als Entität im Article-Schema statt nur im Fließtext.
  const entList = arr => Array.isArray(arr) && arr.length ? arr.map(e => `{"@type":"${sj(e.type)}","name":"${sj(e.name)}"}`).join(',') : '';
  const aboutJson = entList(r.about); const mentionsJson = entList(r.mentions);
  const schema = `${orgSchema()},{"@type":"Article","@id":"${DOMAIN}${url}#article","headline":"${esc(r.title)}","image":"${imgAbs(ratHeaderImg(r))}","inLanguage":"de","author":{"@id":"${DOMAIN}/#organization"},"publisher":{"@id":"${DOMAIN}/#organization"},"mainEntityOfPage":"${DOMAIN}${url}","datePublished":"${sj(r.date_published || RATGEBER_DEFAULT_DATE)}","dateModified":"${sj(r.date_modified || r.date_published || RATGEBER_DEFAULT_DATE)}"${aboutJson ? `,"about":[${aboutJson}]` : ''}${mentionsJson ? `,"mentions":[${mentionsJson}]` : ''}},${breadcrumb([{name:'Start',url:'/'},{name:'Ratgeber',url:'/ratgeber/'},{name:r.title,url}])}`;
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span><a href="/ratgeber/">Ratgeber</a><span class="sep">›</span>${esc(r.title)}</div>
<section class="phero" style="border-bottom:none;padding-bottom:20px"><div class="wrap"><span class="kick rv in" style="color:var(--green)">Ratgeber</span><h1 class="rv in d1" style="max-width:16em">${esc(r.title)}</h1><p class="lead rv in d2">${esc(r.lead)}</p></div></section>
<section class="sec" style="padding:14px 0 0"><div class="wrap"><div class="media-band rv">${pic(ratHeaderImg(r), { alt: r.title + ' — Ratgeber Haus- & Gartenservice Havelland', sizes: '(max-width:1100px) 92vw, 1040px', lcp: true })}</div></div></section>
<section class="sec" style="padding-top:20px"><div class="wrap"><div class="prose rv">${aeoKapsel(r.intro)}${bodyHtml}</div></div></section>
${kalEmbed}
${faqSection}
<section class="sec section-alt"><div class="wrap center"><h2 class="serif rv">Lieber machen lassen?</h2><p class="rv d1" style="max-width:44em;margin-inline:auto">${esc(ctaPitch)}</p><div class="cta-row rv d2"><a class="btn btn-acc" href="/kontakt/#anfrage">Kostenlose Besichtigung anfragen</a><a class="btn btn-line" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a><a class="btn btn-line" href="${ctaWa}">WhatsApp</a></div>${svc.name?`<p class="rv d3" style="margin-top:14px;font-size:.92rem"><a href="/${r.cta_service}/">Mehr zu ${esc(svc.name)} im Havelland →</a></p>`:''}</div></section>
${related.length ? `<section class="sec"><div class="wrap"><div class="head"><h2 class="serif rv">Das könnte Sie auch interessieren</h2><a class="rv" href="/ratgeber/">Alle Ratgeber →</a></div><div class="cards rv">${related.map(x=>`<a class="card" href="/ratgeber/${x.slug}/"><h3>${esc(x.title)}</h3><p>${esc(x.lead||'')}</p><span class="go">Lesen →</span></a>`).join('')}</div></div></section>` : ''}
${(svc && svc.partner_modell) ? endBandPartner(svc) : endBand}`;
  const ni = svcNoindexBySlug(r.cta_service);
  write(url, head(clampTitle(r.title), mkMeta(r.meta || r.lead), url, schema, { noindex: ni, og: ratHeaderImg(r) }) + header + main + footer + SCTA_DEFAULT + revealJS + '</body></html>');
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
  // Paket 1 (20.10., Entwurf leistungen-entwurf-5): kurzer Kopf → Top 4 → 5 Bereiche (Kern-Buttons + „Auf Anfrage auch“) → 3 FAQ → Ende. Keine Preise.
  const url = '/leistungen/';
  const TOP = [['gartenpflege', 'Rasen, Beete, Laub, einmalig oder im Abo.'], ['entruempelung', 'Keller, Garage, Dachboden, ganze Wohnung.'], ['heckenschnitt', 'Form- und Rückschnitt, Grünschnitt nehmen wir mit.'], ['zaunbau', 'Doppelstab, Sichtschutz, Staketen.']];
  const topHtml = TOP.map(([sl, p], ti) => { const sv = services.find(x => x.slug === sl); return sv ? `<a href="/${sl}/">${pic(svcHero(sl), { alt: sv.name + ' im Havelland', sizes: '(max-width:900px) 46vw, 23vw', lcp: ti === 0, eager: ti === 1 })}<div><h3>${esc(sv.name)}</h3><p>${esc(p)}</p></div></a>` : ''; }).join('');
  const bereiche = LEISTUNGEN_KATEGORIEN.map(k => {
    const kern = katKern(k).map(it => `<a href="${it.href}">${esc(it.label)}</a>`).join('');
    const anf = katAnfrage(k);
    const satz = (uebL.kategorien && uebL.kategorien[k.key + '_kurz']) || k.satz;
    return `<div class="lx-b" id="${k.key}">${IMG[k.foto] ? pic(k.foto, { alt: k.label + ' — Haus- & Gartenservice Havelland', sizes: '(max-width:900px) 92vw, 220px' }) : ''}<div><h3>${k.href.startsWith('/leistungen/') ? esc(k.label) : `<a href="${k.href}">${esc(k.label)}</a>`}</h3><p>${esc(satz)}</p><div class="lx-chips">${kern}</div>${anf.length ? `<p class="lx-more">Auf Anfrage auch: ${anf.map(it => `<a href="${it.href}">${esc(it.label)}</a>`).join(' · ')}</p>` : ''}</div></div>`;
  }).join('');
  const ordered = LEISTUNGEN_KATEGORIEN.flatMap(k => k.slugs).map(sl => services.find(x => x.slug === sl)).filter(Boolean);
  const rest = services.filter(sv => !ordered.includes(sv) && sv.slug !== 'galabau');
  const items = [...ordered, ...rest].map((sv, i) => `{"@type":"ListItem","position":${i + 1},"name":"${sj(sv.name)}","item":"${DOMAIN}/${sv.slug}/"}`).join(',');
  const schema = `${orgSchema()},{"@type":"CollectionPage","@id":"${DOMAIN}${url}#page","name":"Unsere Leistungen","about":{"@id":"${DOMAIN}/#organization"}},{"@type":"ItemList","@id":"${DOMAIN}${url}#leistungen","name":"Leistungen im Havelland","itemListElement":[${items}]},${breadcrumb([{ name: 'Start', url: '/' }, { name: 'Leistungen', url }])}`;
  const lead = uebL.lead || 'Garten, Haus, Bau und Entrümpelung im Havelland — kostenlose Besichtigung, schriftlicher Festpreis, ein Ansprechpartner.';
  const faqs = (uebL.faqs || []).slice(0, 3);
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>Leistungen</div>
<section class="lx-hero"><div class="wrap"><span class="kick rv in" style="color:var(--green)">Leistungen</span><h1 class="rv in d1">Was dürfen wir für Sie <em>erledigen</em>?</h1><p class="lead rv in d2">${esc(lead)}</p><div class="cta-row rv in d3">${ctaA}<a class="btn btn-line" href="${waHref('Hallo, ich interessiere mich für Ihre Leistungen.')}">WhatsApp</a></div>${trustLine}</div></section>
<section class="sec"><div class="wrap"><h2 class="lx-h2 rv">Am häufigsten angefragt</h2><div class="lx-top rv">${topHtml}</div></div></section>
<section class="sec section-alt"><div class="wrap"><h2 class="lx-h2 rv">Alle Leistungen nach Bereich</h2>${bereiche}</div></section>
${faqBlock(faqs)}
${endBand}`;
  write(url, head(clampTitle(`Unsere Leistungen — ${nap.name}`), mkMeta(uebL.meta || lead), url, schema) + header + main + footer + SCTA_DEFAULT + revealJS + '</body></html>');
  written.basis.push(url);
}

// ---------- ÜBERSICHT: /standorte/ (Paket 3a: Stufe 1 als Zeilen, Stufe 2 als dunkles Band) ----------
function standortePage() {
  const url = '/standorte/';
  const hat = sl => ortsHubSlugs.has(sl);   // nur Orte mit wirklich gerenderter Standortseite
  const kernChips = sl => SX.kern.map(sv => ({ href: sxHref(sv, sl), label: sxLabel(sv) }));
  // Stufe 1: Falkensee als Kasten, übrige Gruppen als Zeilen
  const stufe1 = SX.stufe1.map(g => {
    const sl = g.orte.filter(hat);
    if (!sl.length) return '';
    if (g.key === 'home') {
      const fk = ortBySlug[sl[0]];
      return falkenseeKasten({ slug: fk.slug, name: fk.name, plz: fk.plz, satz: uebS.sitz_satz || 'Unser Sitz. Hier sind wir am schnellsten vor Ort.', chips: SX.falkensee_top.map(sv => ({ href: sxHref(sv, fk.slug), label: sxLabel(sv) })) })
        + sl.slice(1).map(x => ortZeile({ slug: x, name: ortBySlug[x].name, plz: ortBySlug[x].plz, chips: kernChips(x) })).join('');
    }
    return gruppenKopf(g.label) + sl.map(x => ortZeile({ slug: x, name: ortBySlug[x].name, plz: ortBySlug[x].plz, chips: kernChips(x) })).join('');
  }).join('');
  const nHome = SX.stufe1.flatMap(g => g.orte).filter(hat).length;
  const zuhause = `<section class="sec" id="zuhause"><div class="wrap"><h2 class="serif rv">Hier sind wir zu <em>Hause</em></h2><p class="sx-sub rv">${esc(uebS.home_sub || `Falkensee und ${nHome - 1} Orte rund um unseren Sitz. Pro Ort führen die Leistungs-Knöpfe direkt zur passenden Seite.`)}</p>${stufe1}</div></section>`;
  // Stufe 2: Textzeile je Region, darunter Leistungen + WhatsApp
  const auch = stufe2Band({
    sub: uebS.auch_sub || 'Etwas weiter weg, aber dieselben Leistungen. Schicken Sie uns Ihren Ort per WhatsApp, wir antworten am selben Tag.',
    regionen: SX.stufe2.map(g => ({ label: g.label, orte: g.orte.filter(hat).map(sl => ({ href: `/standorte/${sl}/`, name: ortBySlug[sl].name, plz: ortBySlug[sl].plz })) })).filter(r => r.orte.length),
    leistungen: SX.kern.map(sv => ({ href: `/${sv}/`, label: sxLabel(sv) })), mehr: { href: '/leistungen/', label: 'und mehr' },
    waHref: waHref('Hallo, sind Sie auch in meinem Ort im Einsatz?')
  });
  const faqs = (uebS.faqs || []).slice(0, 3);
  const reihe = [...SX.stufe1, ...SX.stufe2].flatMap(g => g.orte).filter(hat);
  const items = reihe.map((sl, i) => `{"@type":"ListItem","position":${i + 1},"name":"${sj(ortBySlug[sl].name)}","item":"${DOMAIN}/standorte/${sl}/"}`).join(',');
  const schema = `${orgSchema()},{"@type":"CollectionPage","@id":"${DOMAIN}${url}#page","name":"Unsere Standorte","about":{"@id":"${DOMAIN}/#organization"}},{"@type":"ItemList","@id":"${DOMAIN}${url}#standorte","name":"Standorte im Havelland","itemListElement":[${items}]},${breadcrumb([{ name: 'Start', url: '/' }, { name: 'Standorte', url }])}`;
  const lead = uebS.lead || 'Unser Sitz ist Falkensee. Von hier fahren wir in die Nachbarorte und an den Berliner Westrand, für Garten, Hecke, Umbau und Entrümpelung.';
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>Standorte</div>
${seitenHero({ kick: 'Standorte', h1: 'Wo wir <em>unterwegs</em> sind', lead, leaf: leaf('hleaf'), trust: trustLine,
    cta: `${ctaA}<a class="btn btn-line" href="${waHref('Hallo, sind Sie auch in meinem Ort im Einsatz?')}">WhatsApp</a>`,
    bild: sxHeroPic('standorte-hero'), badge: badgeSitz({ titel: `Sitz in ${nap.city}`, zeile: nap.street || '' }) })}
${gstripOhneAbfuhr}
${zuhause}
${auch}
${faqKurz({ h2: 'Häufige Fragen zu unseren <em>Standorten</em>', faqs, alt: true })}
${endBand}`;
  write(url, head(clampTitle(uebS.title || `Unsere Standorte — ${nap.name}`), mkMeta(uebS.meta || lead), url, schema, { og: IMG['standorte-hero'] ? 'standorte-hero' : undefined }) + header + main + footer + SCTA_DEFAULT + revealJS + '</body></html>');
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
    ? 'Ein paar Angaben genügen — wir melden uns schnell zurück, noch am selben Werktag.'
    : 'Ein paar Angaben genügen. Beim Absenden öffnet sich WhatsApp mit Ihrer vorbereiteten Nachricht — oder rufen Sie direkt an.';
  const formOpen = W3F
    ? `<form id="anfrage" class="kf rv" action="https://api.web3forms.com/submit" method="POST" novalidate><input type="hidden" name="access_key" value="${esc(config.web3forms_key)}"><input type="hidden" name="subject" value="Neue Anfrage über die Website (Havelland)"><input type="hidden" name="from_name" value="${esc(nap.name)}"><input type="hidden" name="redirect" value="${DOMAIN}/danke/"><input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" style="display:none">${['quelle', 'lp', ...ATTR_KEYS, 'landing_url', 'ads_consent'].map(n => `<input type="hidden" name="${n}" value="${n === 'quelle' ? 'kontakt' : ''}">`).join('')}`
    : `<form id="anfrage" class="kf rv" novalidate>`;
  const formScript = W3F
    ? `<script>(function(){var f=document.getElementById('anfrage');if(!f)return;function consentState(){try{var v=JSON.parse(localStorage.getItem('${CONSENT_KEY}')||'null');return v&&v.c?v.c:'none'}catch(e){return 'none'}}
function fill(){try{var a=window.__hg||{};${JSON.stringify(ATTR_KEYS)}.forEach(function(k){var el=f.elements[k];if(el&&a[k])el.value=a[k]});var lu=f.elements['landing_url'];if(lu)lu.value=(a.landing||location.pathname)+(a.ts?' @'+new Date(a.ts).toISOString():'');var ac=f.elements['ads_consent'];if(ac)ac.value=consentState()}catch(e){}}
function e164(t){t=String(t||'').replace(/\\(\\s*0\\s*\\)/,'').replace(/[^0-9+]/g,'');if(t.indexOf('00')===0)t='+'+t.slice(2);if(t.indexOf('0')===0)t='+49'+t.slice(1);if(t&&t[0]!=='+')t='+49'+t;t=t.replace(/^\\+490/,'+49');return /^\\+\\d{8,15}$/.test(t)?t:''}
f.addEventListener('submit',function(e){e.preventDefault();if(!f.checkValidity()){f.reportValidity();return}var b=f.querySelector('button[type=submit]'),o=b.textContent;b.disabled=true;b.textContent='Wird gesendet…';fill();fetch('https://api.web3forms.com/submit',{method:'POST',headers:{Accept:'application/json'},body:new FormData(f)}).then(function(r){return r.json()}).then(function(j){if(j&&j.success){var done=false,go=function(){if(done)return;done=true;window.location.href='/danke/'};var cs=consentState();var ev={event:'generate_lead',lead_source:'kontakt',ads_consent:cs,eventCallback:go,eventTimeout:1200};if(cs==='allow'){var g=function(n){var el=f.elements[n];return el?String(el.value).trim():''};ev.user_data={email:g('email')||undefined,phone_number:e164(g('tel'))||undefined}}if(window.dataLayer){window.dataLayer.push(ev)}setTimeout(go,1500)}else{b.disabled=false;b.textContent=o;alert('Es gab ein Problem beim Senden. Bitte rufen Sie uns kurz an oder versuchen Sie es noch einmal.')}}).catch(function(){b.disabled=false;b.textContent=o;alert('Es gab ein Problem beim Senden. Bitte rufen Sie uns kurz an oder versuchen Sie es noch einmal.')})})})();</script>`
    : `<script>(function(){var f=document.getElementById('anfrage');if(!f)return;f.addEventListener('submit',function(e){e.preventDefault();if(!f.checkValidity()){f.reportValidity();return;}var g=function(n){var el=f.elements[n];return el?String(el.value).trim():'';};var msg='Anfrage über die Website. Name: '+g('name')+', Telefon: '+g('tel')+', Ort/PLZ: '+g('ort')+', Anliegen: '+g('anliegen');if(window.dataLayer){window.dataLayer.push({event:'generate_lead'})}window.location.href='https://wa.me/${waNum}?text='+encodeURIComponent(msg);});})();</script>`;
  const kontaktMain = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>Kontakt</div>
<section class="phero"><div class="wrap"><h1 class="rv in d1">Kontakt &amp; <em>kostenlose Besichtigung</em></h1><p class="lead rv in d2">Sagen Sie uns, was ansteht — wir melden uns schnell, noch am selben Werktag.</p><div class="cta-row rv in d3"><a class="btn btn-acc" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a><a class="btn btn-line" href="${waHref('Hallo, ich hätte gern eine kostenlose Besichtigung.')}">WhatsApp</a></div><div class="chips rv"><span>${esc(nap.name)}</span><span>${esc(nap.street||'')}, ${esc(nap.zip||'')} ${esc(nap.city)}</span>${ohDisplay()?`<span>${esc(ohDisplay())}</span>`:''}</div></div></section>
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
  write('/kontakt/', head(`Kontakt — ${nap.name}`, mkMeta(`Kontakt zum Haus- & Gartenservice Havelland in ${nap.city}: ${nap.phone_display}, WhatsApp, kostenlose Vor-Ort-Besichtigung mit Festpreis.`), '/kontakt/', `${orgSchema()},${breadcrumb([{name:'Start',url:'/'},{name:'Kontakt',url:'/kontakt/'}])}`, { extraHead: lpAttribJS(CONSENT_KEY) }) + header + kontaktMain + footer + SCTA_DEFAULT + revealJS + '</body></html>');
  written.basis.push('/kontakt/');
  const legalShell = (t, bodyHtml) => `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>${t}</div><section class="phero" style="padding-bottom:24px"><div class="wrap"><h1 class="rv in d1">${t}</h1></div></section><section class="sec" style="padding-top:24px"><div class="wrap">${bodyHtml}</div></section>${endBand}`;
  const impressumBody = `<div class="prose rv">
<h2>Angaben gemäß § 5 DDG</h2>
<p>Haus- &amp; Gartenservice Havelland GbR<br>${esc(nap.street)}<br>${esc(nap.zip)} ${esc(nap.city)}</p>
<p>Vertreten durch die Gesellschafter: ${esc((nap.gesellschafter_impressum || nap.gesellschafter || [nap.inhaber]).join(' und '))}.</p>
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
<p>Haus- &amp; Gartenservice Havelland GbR<br>vertreten durch ${esc((nap.gesellschafter_impressum || nap.gesellschafter || [nap.inhaber]).join(' und '))}<br>${esc(nap.street)}<br>${esc(nap.zip)} ${esc(nap.city)}<br>Telefon: ${esc(nap.phone_display)}<br>E-Mail: ${esc(nap.email)}</p>
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
<!-- E9 (14.09.): Text erweitert für Ads-Landingpages — vor Go-Live juristisch gegenlesen -->
<p>Für die Verarbeitung von Anfragen über unsere Kontaktformulare nutzen wir den Dienst Web3Forms (web3forms.com, betrieben von Backdrop Ventures, Indien). Beim Absenden werden die von Ihnen eingegebenen Angaben (Name, Telefonnummer, E-Mail-Adresse – optional –, Ort/PLZ, Anliegen; auf unseren Anzeigen-Seiten zusätzlich Art des Objekts und gewünschter Kontaktweg) an die Server von Web3Forms übermittelt und von dort als E-Mail an unser Postfach bei Google (Gmail, Google Ireland Limited) weitergeleitet. Web3Forms setzt für den Versand und den Spam-Schutz Unterauftragsverarbeiter ein, deren Server auch in den USA stehen (u. a. Amazon Web Services, CleanTalk, Automattic/Akismet); die Übermittlung stützt sich auf Standardvertragsklauseln der EU-Kommission (Art. 46 Abs. 2 lit. c DSGVO). Wenn Sie über eine Google-Anzeige zu uns gekommen sind, übermittelt das Formular zusätzlich die von Google an die Aufruf-Adresse angehängte Klick-Kennung (GCLID, WBRAID oder GBRAID), die Herkunftsparameter der Anzeige (UTM) sowie Zeitpunkt und Seite Ihres Einstiegs, damit wir einen späteren Auftrag der Anzeige zuordnen können (Abschnitt 7a). Rechtsgrundlage für die Anfrage ist Art. 6 Abs. 1 lit. a DSGVO (Ihre mit dem Absenden erteilte Einwilligung) sowie Art. 6 Abs. 1 lit. b DSGVO (Vertragsanbahnung); für die Klick-Kennung aus der Aufruf-Adresse Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Erfolgsmessung unserer Werbung). Hinweise zum Datenschutz von Web3Forms: <a href="https://web3forms.com/privacy" rel="nofollow" target="_blank">web3forms.com/privacy</a>.</p>
<h3>WhatsApp</h3>
<p>Über die WhatsApp-Schaltflächen auf unserer Website können Sie uns direkt per Messenger kontaktieren. Anbieter ist die WhatsApp Ireland Limited, 4 Grand Canal Square, Dublin 2, Irland (Meta). Bei der Nutzung von WhatsApp können Daten (u. a. Ihre Telefonnummer, der Inhalt der Nachricht und Metadaten) auch in die USA übertragen werden. Bitte beachten Sie die Datenschutzhinweise von WhatsApp: <a href="https://www.whatsapp.com/legal/privacy-policy-eea" rel="nofollow" target="_blank">whatsapp.com/legal/privacy-policy-eea</a>. Die Nutzung erfolgt auf Grundlage Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Möchten Sie kein WhatsApp nutzen, erreichen Sie uns telefonisch, per E-Mail oder über das Anfrageformular.</p>
<h2>7. Web-Analyse (Google Analytics 4 / Google Tag Manager)</h2>
<p>Zur Reichweitenmessung und Verbesserung unseres Angebots setzen wir Google Analytics 4 und den Google Tag Manager ein (Anbieter: Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland) — jedoch ausschließlich, nachdem Sie über unseren Consent-Banner ausdrücklich eingewilligt haben (Art. 6 Abs. 1 lit. a DSGVO). Vor Ihrer Einwilligung werden keine Analyse-Cookies gesetzt und keine personenbezogenen Daten zu Analysezwecken an Google übertragen (Google Consent Mode v2, Voreinstellung „abgelehnt"). Bei erteilter Einwilligung kann es zu einer Datenübermittlung in die USA kommen (Grundlage: Standardvertragsklauseln). Ihre Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen, indem Sie Ihre Cookie-Einstellungen anpassen. Informationen zum Umgang mit Nutzerdaten bei Google: <a href="https://policies.google.com/privacy" rel="nofollow" target="_blank">policies.google.com/privacy</a>.</p>
<h2>7a. Google Ads: Conversion-Messung, Anruf-Messung, Offline-Zuordnung</h2>
<p>Wir schalten Anzeigen bei Google Ads (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland). Um zu messen, ob eine Anzeige zu einer Anfrage geführt hat, nutzen wir das Google-Ads-Conversion-Tracking über den Google Tag Manager – ausschließlich, nachdem Sie über unseren Cookie-Banner eingewilligt haben (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Mit Ihrer Einwilligung setzt Google ein Conversion-Cookie (Speicherdauer bis zu 90 Tage) und wir übermitteln bei einer Formular-Anfrage Ihre E-Mail-Adresse und Telefonnummer in gehashter, für Google nicht direkt lesbarer Form (Enhanced Conversions), um Anfragen einer Anzeige zuzuordnen. Ohne Einwilligung setzt Google keine Cookies; es werden dann nur eingeschränkte, cookielose Statussignale ohne Werbe-Kennungen an Google übertragen (Google Consent Mode v2 mit Datenschwärzung).</p>
<p><strong>Klick-Kennung und Offline-Zuordnung.</strong> Google hängt beim Klick auf eine Anzeige eine Klick-Kennung an die Aufruf-Adresse (GCLID, WBRAID oder GBRAID). Diese Kennung übernehmen wir zusammen mit Ihrer Formular-Anfrage in unsere Kundenakte (berechtigtes Interesse, Art. 6 Abs. 1 lit. f DSGVO). In Ihrem Browser speichern wir die Kennung nur mit Ihrer Einwilligung (lokale Speicherung, 90 Tage). Kommt es zu einem Auftrag, melden wir Google die Klick-Kennung, das Auftragsdatum und den Auftragswert zurück (Offline-Conversion), damit unsere Anzeigen auf tatsächliche Aufträge statt auf bloße Anfragen ausgerichtet werden; Ihr Name oder Ihre Kontaktdaten sind darin nicht enthalten.</p>
<p><strong>Anruf-Messung.</strong> Wenn Sie über eine Google-Anzeige zu uns kommen, kann Google die auf der Seite angezeigte Telefonnummer vorübergehend durch eine Google-Weiterleitungsnummer ersetzen. Rufen Sie diese Nummer an, verarbeitet Google Beginn, Dauer und den anrufenden Anschluss in gekürzter Form, um den Anruf der Anzeige zuzuordnen; das Gespräch selbst wird nicht aufgezeichnet. Auch das geschieht nur nach Ihrer Einwilligung im Cookie-Banner.</p>
<p>Datenübermittlung an Google in die USA erfolgt auf Grundlage des EU-US Data Privacy Framework und der Standardvertragsklauseln. Ihre Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen: Klicken Sie im Seitenfuß auf „Cookie-Einstellungen“ und wählen Sie „Ablehnen“. Weitere Informationen: <a href="https://policies.google.com/privacy" rel="nofollow" target="_blank">policies.google.com/privacy</a>, Einstellungen zu personalisierter Werbung: <a href="https://adssettings.google.com" rel="nofollow" target="_blank">adssettings.google.com</a>.</p>
<h2>8. Cookies und Einwilligung</h2>
<p>Ohne Ihre Einwilligung verwenden wir nur technisch notwendige Cookies bzw. lokale Speicherung, die für den Betrieb der Seite erforderlich sind (Ihre Cookie-Entscheidung speichern wir im Browser unter „consent_v2“ für 12 Monate). Nicht notwendige Dienste (Web-Analyse, Google-Ads-Conversion-Messung, Speicherung der Klick-Kennung im Browser) werden erst nach Ihrer Einwilligung über den Cookie-Banner aktiviert. Über „Cookie-Einstellungen“ im Seitenfuß können Sie Ihre Entscheidung jederzeit ändern. Rechtsgrundlage für notwendige Cookies ist § 25 Abs. 2 TDDDG i. V. m. Art. 6 Abs. 1 lit. f DSGVO, für einwilligungspflichtige Dienste § 25 Abs. 1 TDDDG i. V. m. Art. 6 Abs. 1 lit. a DSGVO.</p>
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
<section class="phero">${leaf('hleaf')}<div class="wrap grid"><div><span class="kick rv in" style="color:var(--green)">Über uns</span><h1 class="rv in d1">Ein Ansprechpartner für Haus und Garten — <em>im Havelland zuhause</em></h1><p class="lead rv in d2">Hinter dem Haus- &amp; Gartenservice Havelland stehen ${esc((nap.gesellschafter || [nap.inhaber]).join(' und '))} — zwei Gründer aus ${esc(nap.city)}, die selbst mit anpacken. Garten, Reinigung, Entrümpelung: ein fester Ansprechpartner für alles, Festpreis nach Besichtigung, Foto-Nachweis nach jedem Auftrag; Winterdienst über einen Partner-Fachbetrieb.</p><div class="cta-row rv in d3">${ctaA}<a class="btn btn-line" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a></div>${trustBadges()}</div>
<div class="shot rv in d2">${pic('ueber-uns', { cls: 'main', alt: 'Das Team vom Haus- & Gartenservice Havelland am Einsatzfahrzeug', sizes: '(max-width:900px) 92vw, 60vw', lcp: true })}</div></div></section>
<section class="band">${leaf('leaf')}<div class="wrap"><p class="lead2 rv">Aus der Region, für die Region — <em>kurze Wege, klare Absprachen.</em></p>
<div class="vals"><div class="v rv d1"><h4><span class="n">01</span> Aus einer Hand</h4><p>Garten, Reinigung, Entrümpelung — ein Ansprechpartner. Winterdienst und Dachrinne laufen über Partner-Fachbetriebe.</p></div><div class="v rv d2"><h4><span class="n">02</span> Nachweis statt Versprechen</h4><p>Foto-Dokumentation vor und nach jedem Auftrag, direkt aufs Handy.</p></div><div class="v rv d3"><h4><span class="n">03</span> Festpreis ist Endpreis</h4><p>Kostenlose Besichtigung, klarer Preis — kein Nachkommen, keine Überraschung.</p></div><div class="v rv d4"><h4><span class="n">04</span> Schnell erreichbar</h4><p>Eine WhatsApp genügt, Antwort am selben Tag.</p></div></div></div></section>
<section class="sec"><div class="wrap"><div class="prose wide rv"><h2>Wer hinter dem Service steht</h2><p>Den Haus- &amp; Gartenservice Havelland führen ${esc((nap.gesellschafter || [nap.inhaber]).join(' und '))} als Gründer-Duo: einer ist Ihr Ansprechpartner vor Ort, mit Praxis aus dem Garten- und Gebäudereinigungs-Handwerk, der andere hält bei Planung und Organisation den Rücken frei. Sie haben es vom ersten Anruf bis zur Abnahme mit festen Gesichtern zu tun — kein Callcenter, keine wechselnden Kräfte, keine Warteschleife.</p><p>Und wir sind selbst dabei: Besichtigung, Ausführung und die Foto-Abnahme machen wir persönlich. Bei größeren Aufträgen unterstützen uns eingearbeitete Helfer — die Verantwortung und Ihr Ansprechpartner bleiben aber immer bei uns.</p><p>Der Betrieb sitzt in der ${esc(nap.street)} in ${esc(nap.zip)} ${esc(nap.city)} und ist im gesamten Havelland und Berliner Umland unterwegs. Der Festpreis, den Sie nach der Besichtigung bekommen, ist der Endpreis — kein Aufschlag, keine Überraschung.</p></div></div></section>
<section class="sec section-alt"><div class="wrap"><div class="head"><h2 class="serif rv">So arbeiten wir — in vier Schritten</h2></div>${auftragsTimeline()}</div></section>
<section class="sec"><div class="wrap"><div class="head"><h2 class="serif rv">Was wir übernehmen oder koordinieren</h2><a class="rv" href="/leistungen/">Alle Leistungen →</a></div><p class="intro rv">Vom regelmäßigen Garten bis zum einmaligen Großeinsatz — koordiniert von einem festen Ansprechpartner.</p><div class="cards rv"><a class="card" href="/gartenpflege/"><h3>Garten &amp; Außenanlagen</h3><p>Gartenpflege, Heckenschnitt, Winterdienst, Laub.</p><span class="go">Mehr →</span></a><a class="card" href="/fensterreinigung/"><h3>Reinigung</h3><p>Fenster, Terrasse &amp; Pflaster, Dachrinne.</p><span class="go">Mehr →</span></a><a class="card" href="/entruempelung/"><h3>Entrümpelung &amp; Auflösung</h3><p>Keller, Wohnung, Haushaltsauflösung, Wohnungsauflösung.</p><span class="go">Mehr →</span></a><a class="card" href="/hausmeisterservice/"><h3>Hausmeister &amp; Gewerbe</h3><p>Hausmeisterdienst, Gebäude- und Unterhaltsreinigung.</p><span class="go">Mehr →</span></a></div></div></section>
<section class="sec section-alt"><div class="wrap"><div class="prose wide rv"><h2>Unser Servicegebiet</h2><p>Wir sind in ${esc(nap.city)} zuhause und im gesamten Havelland sowie im angrenzenden Berliner Umland für Sie da — von Falkensee über Dallgow-Döberitz, Brieselang, Nauen und Oberkrämer bis Oranienburg, Hennigsdorf und an den Berliner Rand nach Kladow, Gatow und Spandau. Kurze Wege bedeuten schnelle Reaktion und planbare Termine.</p><p>Eine Übersicht aller Orte mit den jeweiligen Leistungen finden Sie auf der Seite <a href="/standorte/">Standorte</a>.</p><h2>Unsere Garantien</h2><p>Wir versprechen nichts, was wir nicht halten. Je Leistung gibt es eine konkrete Zusage — ein paar Beispiele:</p><ul><li><strong>Heckenschnitt:</strong> Bleiben Schnittreste liegen, kommen wir kostenlos nach.</li><li><strong>Fensterreinigung:</strong> Schlierenfrei — oder wir kommen am selben Tag nochmal.</li><li><strong>Winterdienst:</strong> Ausführung durch einen Partner-Fachbetrieb im Saisonvertrag — wir koordinieren, der Einsatznachweis kommt nach jedem Einsatz.</li><li><strong>Entrümpelung:</strong> Festpreis für Räumung und Abtransport nach Besichtigung, Entsorgungsgebühren nach Beleg.</li></ul><p>Die vollständige Garantie steht jeweils auf der passenden <a href="/leistungen/">Leistungsseite</a>.</p></div></div></section>
${faqBlock([
  {q:'Bekomme ich einen Nachweis über die ausgeführte Arbeit?',a:'Ja. Nach jedem Auftrag dokumentieren wir das Ergebnis mit Vorher-/Nachher-Fotos und schicken sie Ihnen per WhatsApp. So sehen Sie genau, was gemacht wurde, auch wenn Sie nicht vor Ort waren.'},
  {q:'Was kostet die Besichtigung?',a:'Die Vor-Ort-Besichtigung ist kostenlos und unverbindlich. Wir schauen uns an, was ansteht, und nennen Ihnen danach einen Festpreis. Erst wenn Sie zusagen, legen wir los.'},
  {q:'Bieten Sie auch regelmäßige Pflege oder Wartung an?',a:'Ja. Für Garten und Reinigung vereinbaren wir auf Wunsch feste Turnusse; den Winterdienst-Saisonvertrag schließen Sie mit unserem Partner-Fachbetrieb — so bleibt alles in Ordnung, ohne dass Sie jedes Mal neu anfragen müssen. Den Umfang legen wir bei der Besichtigung gemeinsam fest.'},
  {q:'In welchen Orten sind Sie tätig?',a:`Wir arbeiten im gesamten Havelland und im angrenzenden Berliner Umland, mit Sitz in ${nap.city}. Eine Übersicht aller bedienten Orte finden Sie auf der Seite Standorte.`},
  {q:'Wie schnell bekomme ich eine Antwort?',a:'Schreiben Sie uns tagsüber eine WhatsApp mit ein paar Fotos, melden wir uns am selben Tag zurück und stimmen einen Termin ab.'},
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
  // Stand-Angabe aus proof.google_reviews.as_of ableiten (nicht hart verdrahten — Zahl und Datum altern gemeinsam)
  const MONS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const standM = String(r.as_of || '').match(/^(\d{4})-(\d{2})/);
  const stand = standM ? `${MONS[+standM[2] - 1]} ${standM[1]}` : 'Juli 2026';
  const body = reviewsLive
    ? `${ratingBadge}<p>Unsere Kundinnen und Kunden bewerten uns bei Google mit ${Number(r.rating).toFixed(1).replace('.', ',')} von 5 Sternen (${esc(r.count)} Bewertungen, Stand ${stand}). Wir zeigen hier bewusst keine ausgewählten Zitate — die vollständigen, ungefilterten Bewertungen sehen Sie jederzeit live in unserem Google-Profil. Was zählt, ist das Ergebnis vor Ort: Nach jedem Auftrag dokumentieren wir es mit Vorher-/Nachher-Fotos und schicken sie Ihnen per WhatsApp.</p>
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
// ---------- GEWERBE (Paket 3b, 21.10.2026): /gewerbe/ + Zielgruppenseiten (Hausverwaltungen, Firmen, Pflegeeinrichtungen, Bestatter) ----------
// Spec Teil B (B3/B4/B5). Alle Texte aus data/copy/gewerbe.json (uebersicht, zielgruppen.<key>); /fuer-hausverwaltungen/ ergänzt data/b2b.json (Objektklassen, Leistungen mit Ausführungs-Chip, Ablauf, FAQ).
// Partner-Leistungen (Winterdienst, Dachrinne, Dachreinigung; Bauendreinigung nur im Text): nur im Beschreibungssatz, kein Label auf /gewerbe/; Schema mit broker. Grundreinigung = Eigenleistung (provider). Kein FAQPage.
// Owner 20.10. abends: ALLE Gewerbe-Seiten (/gewerbe/ + 4 Zielgruppenseiten) sind immer indexierbar, unabhängig von aktive_welle (Sitemap + llms.txt ebenfalls ohne Wellen-Gate). Die Gewerbe-Hubs tragen nie ein noindex.
const gwIndex = true;
const gwSec = n => (gwU.sections && gwU.sections[n]) || {};
const emLast = t => { const e = esc(t || ''); const m = /^(.*?)(\S+?)([?!.:]*)$/.exec(e); return m ? `${m[1]}<em>${m[2]}</em>${m[3]}` : e; };
const h2Of = (text, em) => em ? emH1(text, em) : emLast(text);
const gwCtaTel = `<a class="btn btn-line" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a>`;
// Zielgruppen-Karten (Startseiten-Band + /gewerbe/): Copy uebersicht.karten, sonst Standardtexte
const GW_KARTEN_DEF = {
  hausverwaltungen: 'Wohnungsräumung, Grünpflege, Laub und Treppenhaus für Ihre Objekte.',
  firmen: 'Unterhaltsreinigung, Außenanlagen und Hausmeisterarbeiten im festen Turnus.',
  pflegeeinrichtungen: 'Zimmer und Wohnungen in Absprache räumen, wenn Bewohner ausziehen.',
  bestatter: 'Wohnungsauflösung für die Familien, die Sie begleiten, besenrein übergeben.'
};
// Bild je Zielgruppe: eigenes Motiv `zielgruppe-<key>` (Task 10), sonst Fallback aus ZG; Kopf /gewerbe/: `gewerbe-hero`, sonst Objektbetreuung.
const zgBild = key => [`zielgruppe-${key}`, `zielgruppe-${ZG[key].bildKey || key}`, ZG[key].bild, ZG[key].bild2, 'svc-objektbetreuung-hero'].find(sl => sl && IMG[sl]);
const gwHeroSlug = () => ['gewerbe-hero', 'svc-objektbetreuung-hero'].find(sl => IMG[sl]);
function gwKarten() {
  return Object.entries(ZG).map(([key, m]) => {
    const c = (gwU.karten || []).find(x => x.key === key || x.url === m.url) || {};
    const bild = zgBild(key);
    return { href: m.url, h3: c.h3 || m.nav, p: c.p || GW_KARTEN_DEF[key], label: c.label || 'Mehr erfahren', imgHtml: pic(bild, { alt: IMG[bild] && IMG[bild].alt ? IMG[bild].alt : `${c.h3 || m.nav} — Haus- & Gartenservice Havelland`, sizes: '(max-width:560px) 92vw, (max-width:1000px) 46vw, 23vw' }) };
  });
}
// Startseiten-Band „Für Gewerbe und Einrichtungen“ (nach dem Leistungs-Cluster; übrige Startseiten-Texte bleiben unverändert)
function gwHomeBand() {
  const hb = gwU.home_band || {};
  return zielgruppenKarten({ dark: true, id: 'gewerbe', h2: h2Of(hb.h2 || 'Für Gewerbe und Einrichtungen', hb.h2 ? hb.h2_em : 'Einrichtungen'), sub: hb.sub || 'Hausverwaltungen, Firmen, Pflegeeinrichtungen und Bestatter: ein Ansprechpartner, Angebot nach Begehung.', items: gwKarten(), link: { href: '/gewerbe/', label: hb.link || 'Alles für Gewerbe' } });
}
// Abschluss-Band: Text aus endband {h2,p}; Buttons wahlweise Begehung+Telefon (Standard) oder fertige Buttons (Hausverwaltungen: E-Mail-Angebot)
const endBandGw = (e = {}, btns = '') => `<section class="zone-deep end">${leaf('leaf')}<div class="wrap"><h2 class="serif rv">${esc(e.h2 || 'Welche Objekte stehen an? Wir schauen sie uns an.')}</h2><p class="rv d1">${esc(e.p || 'Begehung kostenlos, schriftliches Angebot, Antwort am selben Tag.')}</p><div class="cta-row rv d2">${btns || (ctaPrim('Begehung anfragen') + gwCtaTel)}</div></div></section>`;
// Standard-Zusagen und -Ablauf (Spec B3), falls die Copy sie nicht liefert
const GW_ZUSAGEN_DEF = [{ h3: 'Ein Ansprechpartner', p: 'Eine feste Kontaktperson für alle Objekte und Leistungen. Wir antworten am selben Tag.' }, { h3: 'Angebot nach Begehung', p: 'Die Begehung ist kostenlos. Danach erhalten Sie ein schriftliches Angebot.' }, { h3: 'Nachweis mit Fotos', p: 'Nach jedem Einsatz bekommen Sie Fotos.' }, { h3: 'Rechnung an Sie', p: 'Unsere Rechnung weist die Umsatzsteuer aus.' }];
const GW_ABLAUF_DEF = [{ h: 'Anfrage', p: 'Per Mail, Telefon oder WhatsApp. Wir antworten am selben Tag.' }, { h: 'Begehung', p: 'Kostenlos vor Ort. Der Termin liegt meist innerhalb weniger Tage.' }, { h: 'Angebot', p: 'Schriftlich, mit Leistungsumfang und Turnus.' }, { h: 'Start', p: 'Feste Termine und Fotos nach jedem Einsatz.' }];
const gwServiceName = sl => (services.find(x => x.slug === sl) || {}).name || sl;
const gwIsPartner = (sl, flag) => sl !== 'grundreinigung' && (!!flag || GW_PARTNER_EXTRA.has(sl) || !!(services.find(x => x.slug === sl) || {}).partner_modell);   // Grundreinigung nie Partner (Owner 20.10. abends)
const gwSlugOf = to => String(to || '').split('#')[0].replace(/^\/|\/$/g, '');
const gwWrite = (url, title, meta, schema, main, scta, ogSlug) => write(url, head(clampTitle(title), mkMeta(meta), url, schema, { noindex: !gwIndex, og: ogSlug }) + header + main + footer + sctaBar(scta) + revealJS + '</body></html>');

// ---------- /gewerbe/ ----------
function gewerbePage() {
  const url = '/gewerbe/'; const u = gwU;
  const h1 = h2Of(u.h1 || 'Für Verwaltungen, Firmen und Einrichtungen', u.h1 ? u.h1_em : 'Einrichtungen');
  const lead = u.lead || 'Wir pflegen Objekte, reinigen Gebäude und räumen Wohnungen, im Havelland, in Falkensee und in Spandau. Ein Ansprechpartner, ein Angebot nach Begehung, Nachweis nach jedem Einsatz.';
  const leist = (u.leistungen || []).filter(x => services.some(sv => sv.slug === x.slug)).map(x => ({ href: `/${x.slug}/`, h3: x.name || gwServiceName(x.slug), p: x.p }));   // KEINE Ausführungs-Labels (Owner 20.10.)
  const sZ = gwSec('zielgruppen'), sL = gwSec('leistungen'), sU = gwSec('zusagen'), sA = gwSec('ablauf'), sF = gwSec('faq');
  const heroSlug = gwHeroSlug();
  const hero = seitenHero({ cls: 'gw-phero', kick: u.kick || 'Für Gewerbe', h1, lead, leaf: leaf('hleaf'), trust: trustLine,
    cta: `${ctaPrim('Begehung anfragen')}${gwCtaTel}`,
    bild: pic(heroSlug, { cls: 'main', alt: (IMG[heroSlug] && IMG[heroSlug].alt) || 'Mitarbeiter von Haus- & Gartenservice Havelland vor einem Mehrfamilienhaus', sizes: '(max-width:900px) 92vw, 46vw', lcp: true }) });
  const faqs = (u.faqs || []).slice(0, 7);
  const items = Object.values(ZG).map((m, i) => `{"@type":"ListItem","position":${i + 1},"name":"${sj(m.nav)}","item":"${DOMAIN}${m.url}"}`).join(',');
  const schema = `${orgSchema()},{"@type":"CollectionPage","@id":"${DOMAIN}${url}#page","name":"Für Gewerbe","about":{"@id":"${DOMAIN}/#organization"}},{"@type":"ItemList","@id":"${DOMAIN}${url}#zielgruppen","name":"Leistungen für Gewerbe nach Zielgruppe","itemListElement":[${items}]},${breadcrumb([{ name: 'Start', url: '/' }, { name: 'Für Gewerbe', url }])}`;
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>Für Gewerbe</div>
${hero}
${zielgruppenKarten({ h2: h2Of(sZ.h2 || 'Für wen wir arbeiten', sZ.h2 ? sZ.h2_em : 'arbeiten'), sub: sZ.sub || 'Vier Zielgruppen, jede mit eigener Seite: was wir übernehmen und wie es abläuft.', items: gwKarten(), alt: true })}
${gwListe({ h2: h2Of(sL.h2 || 'Leistungen für Gewerbe', sL.h2 ? sL.h2_em : 'Gewerbe'), sub: sL.sub || '', items: leist, alt: false })}
${zusagenBand4({ h2: h2Of(sU.h2 || 'Was bei jedem Auftrag feststeht', sU.h2 ? sU.h2_em : 'feststeht'), sub: sU.sub || '', items: (u.zusagen && u.zusagen.length) ? u.zusagen : GW_ZUSAGEN_DEF })}
${ablaufSektion({ h2: h2Of(sA.h2 || 'So kommen Sie zum Angebot', sA.h2 ? sA.h2_em : 'Angebot'), items: (u.ablauf && u.ablauf.length) ? u.ablauf : GW_ABLAUF_DEF, cta: `${ctaPrim('Begehung anfragen')}${gwCtaTel}`, alt: false })}
${faqKurz({ h2: h2Of(sF.h2 || 'Häufige Fragen zu Aufträgen für Gewerbe', sF.h2 ? sF.h2_em : 'Gewerbe'), faqs, alt: true })}
${endBandGw(u.endband)}`;
  gwWrite(url, u.title || 'Für Gewerbe: Objektpflege und Reinigung im Havelland', u.meta || lead, schema, main, u.scta_text || 'Guten Tag, wir sind eine Hausverwaltung / ein Unternehmen im Havelland und interessieren uns für Ihre Leistungen.', heroSlug);
  written.basis.push(url);
}

// ---------- Zielgruppenseiten ----------
function zielgruppePage(key) {
  const m = ZG[key]; const url = m.url; const hv = key === 'hausverwaltungen';
  const z = sanGw({ ...(hv ? J('b2b.json') : {}), ...((GW.zielgruppen || {})[key] || {}) });
  const u = gwU;
  const bildSlug = zgBild(key);
  // --- Kopf ---
  const h1 = h2Of(z.h1 || `Leistungen für ${m.nav}`, z.h1 ? z.h1_em : '');
  const lead = z.lead || 'Ein Ansprechpartner, ein Angebot nach der Begehung, Nachweis nach jedem Einsatz.';
  const kick = z.kick || m.nav;
  const waKopf = z.cta_wa_text || null;
  // Hausverwaltungen: Angebot per E-Mail (Ziel der B2B-Mails); übrige: Begehung über das Formular
  const cta = (z.cta && typeof z.cta === 'object') ? z.cta : {};
  const mailtoAngebot = `mailto:${nap.email}?subject=${encodeURIComponent(cta.mail_subject || 'Angebot Objektbetreuung')}&body=${encodeURIComponent(cta.mail_body || 'Guten Tag,\n\nwir sind eine Hausverwaltung / Gewerbe und interessieren uns für Ihre Objektbetreuung.\n\nObjekt(e): \nOrt/PLZ: \nGewünschte Leistungen: \n\nBitte senden Sie uns ein schriftliches Angebot.\n\nMit freundlichen Grüßen')}`;
  // Nachbesserung 20.10.: ein Hauptbutton auf allen Zielgruppenseiten (Formular /kontakt/#anfrage). Pflege/Bestatter sagen „Besichtigung“, übrige „Begehung“. Hausverwaltungen: E-Mail nur als Nebenweg.
  const primLbl = (key === 'pflegeeinrichtungen' || key === 'bestatter') ? 'Besichtigung anfragen' : 'Begehung anfragen';
  const ctaBtnsHv = `${ctaPrim(primLbl)}<a class="btn btn-line" href="${mailtoAngebot}">${esc(cta.mail_label || 'Objektliste per Mail senden')}</a>${gwCtaTel}`;
  const heroCta = hv ? ctaBtnsHv : `${ctaPrim(primLbl)}${waKopf ? `<a class="btn btn-line" href="${waHref(waKopf)}">WhatsApp</a>` : ''}${gwCtaTel}`;
  const hero = seitenHero({ cls: 'gw-phero', kick, h1, lead, leaf: leaf('hleaf'), trust: (key === 'pflegeeinrichtungen' || key === 'bestatter') ? '' : trustLine, cta: heroCta,
    bild: pic(bildSlug, { cls: 'main', alt: z.bild_alt || (IMG[bildSlug] && IMG[bildSlug].alt) || `${m.nav} — Haus- & Gartenservice Havelland`, sizes: '(max-width:900px) 92vw, 46vw', lcp: true }) });

  // --- Leistungen ---
  let leistItems; let leistH2; let leistSub = ''; let leistNote = '';
  if (hv) {
    const det = z.leistungen_detail || [];
    leistItems = det.length
      ? det.map(l => ({ href: hrefOf(l.link_to), h3: l.h3, p: l.body, chip: l.chip || null, partner: l.ausfuehrung === 'partner', linkLabel: l.label || 'Mehr erfahren', slug: gwSlugOf(l.link_to) }))
      : (z.leistungen || []).map(l => ({ href: null, h3: l, p: '', slug: null }));
    leistH2 = h2Of(z.leistungen_h2 || 'Unsere Leistungen für Ihr Objekt', z.leistungen_h2 ? z.leistungen_h2_em : 'Ihr Objekt');
    const verlinkt = new Set(leistItems.map(x => x.slug).filter(Boolean));
    const weitere = ['winterdienst', 'gartenpflege', 'dachrinnenreinigung', 'entruempelung', 'haushaltsaufloesung', 'hausmeisterservice'].filter(sl => !verlinkt.has(sl) && services.some(sv => sv.slug === sl));
    const hinweis = z.partnermodell_hinweis ? esc(z.partnermodell_hinweis) : '';
    leistNote = [hinweis, weitere.length ? `Weitere Leistungen im Detail: ${weitere.map(sl => `<a href="/${sl}/">${esc(gwServiceName(sl))}</a>`).join(', ')}.` : ''].filter(Boolean).join(' ');
  } else {
    leistItems = (z.leistungen || []).filter(l => services.some(sv => sv.slug === l.slug)).map(l => ({ href: `/${l.slug}/`, h3: l.h3 || gwServiceName(l.slug), p: l.p, partner: gwIsPartner(l.slug, l.partner), slug: l.slug }));
    leistH2 = h2Of(z.leistungen_h2 || 'Was wir übernehmen', z.leistungen_h2 ? z.leistungen_h2_em : 'übernehmen');
    leistSub = z.leistungen_sub || '';
  }
  // --- Zusagen / Ablauf / FAQ ---
  const zusagenSrc = hv ? ((z.zusagen_detail || []).length ? z.zusagen_detail.map(x => ({ h3: x.h4, p: x.body })) : (z.zusagen || []).map(x => ({ h3: x, p: '' }))) : (z.zusagen || []);
  const zusagen = zusagenSrc.length ? zusagenSrc : ((u.zusagen && u.zusagen.length) ? u.zusagen : GW_ZUSAGEN_DEF);
  const sU = gwSec('zusagen'), sA = gwSec('ablauf');
  const ablaufSrc = hv ? ((z.ablauf && Array.isArray(z.ablauf.schritte)) ? z.ablauf.schritte.map(x => typeof x === 'string' ? { p: x } : x) : []) : (z.ablauf || []);
  const ablauf = ablaufSrc.length ? ablaufSrc : ((u.ablauf && u.ablauf.length) ? u.ablauf : GW_ABLAUF_DEF);
  const ablaufH2 = (hv && z.ablauf && z.ablauf.h2) ? h2Of(z.ablauf.h2, 'Angebot') : h2Of(z.ablauf_h2 || sA.h2 || 'So kommen Sie zum Angebot', z.ablauf_h2 ? z.ablauf_h2_em : (sA.h2 ? sA.h2_em : 'Angebot'));
  const faqs = (z.faqs || []).slice(0, 7);
  const faqH2 = z.faq_h2 ? h2Of(z.faq_h2, z.faq_h2_em) : `Häufige Fragen von <em>${esc(m.wer)}</em>`;
  const endband = z.endband || u.endband || {};
  const ablaufCta = `${ctaPrim(primLbl)}${gwCtaTel}`;

  // --- Zielgruppen-spezifischer Block nach dem Kopf ---
  let block = '';
  if (hv) {
    const intro = z.intro || { h2: 'Für wen wir arbeiten', body: 'Wir betreuen laufende Objekte dokumentiert — mit einem festen Ansprechpartner statt wechselnder Kräfte.' };
    const obj = (z.objektklassen_detail || []).length ? z.objektklassen_detail : (z.objektklassen || []).map(x => ({ name: x }));
    block = fuerWen({ h2: h2Of(intro.h2, intro.h2 === 'Für wen wir arbeiten' ? 'arbeiten' : ''), body: intro.body, items: obj, alt: false });
  } else if (z.zwei_wege) {
    const w = z.zwei_wege;
    const weiterText = w.verweisen_wa_text || `Haus- & Gartenservice Havelland aus Falkensee. Kostenlose Besichtigung, schriftlicher Festpreis. WhatsApp und Telefon: ${nap.phone_display}.`;
    block = zweiWege({ h2: h2Of(w.h2 || 'Zwei Wege zu uns', w.h2 ? w.h2_em : 'Wege'), lead: w.lead || '',
      beauftragen: { h3: w.beauftragen_h3, items: w.beauftragen, button: primLbl, href: '/kontakt/#anfrage' },
      verweisen: { h3: w.verweisen_h3, items: w.verweisen, button: w.verweisen_button || 'WhatsApp-Nummer weitergeben', hint: w.verweisen_hint || '', href: `https://wa.me/?text=${encodeURIComponent(weiterText)}` }, alt: true });   // Owner 20.10.: keine Visitenkarten, Text zum Weiterleiten per WhatsApp
  } else if ((z.anlaesse || []).length) {
    block = anlaesseBlock({ h2: h2Of(z.anlaesse_h2 || 'Wann Firmen uns rufen', z.anlaesse_h2 ? z.anlaesse_h2_em : 'rufen'), items: z.anlaesse, alt: false });
  }
  // Zonen-Wechsel hell → (alt) → hell: ohne Block folgt die Leistungsliste direkt auf den Kopf (weiß), mit „Zwei Wege“ (alt) wieder weiß, mit Anlässen (weiß) alt, bei Hausverwaltungen (Für wen, weiß) alt.
  const leistAlt = hv ? true : (z.zwei_wege ? false : (block ? true : false));
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span><a href="/gewerbe/">Für Gewerbe</a><span class="sep">›</span>${esc(m.nav)}</div>
${hero}
${block}
${gwListe({ h2: leistH2, sub: leistSub, items: leistItems, alt: leistAlt, note: leistNote })}
${zusagenBand4({ h2: h2Of(z.zusagen_h2 || sU.h2 || 'Was bei jedem Auftrag feststeht', z.zusagen_h2 ? z.zusagen_h2_em : (sU.h2 ? sU.h2_em : 'feststeht')), sub: hv ? (z.band_lead || '') : '', items: zusagen })}
${ablaufSektion({ h2: ablaufH2, items: ablauf, cta: ablaufCta, alt: false })}
${faqKurz({ h2: faqH2, faqs, alt: true })}
${endBandGw(endband, hv ? ctaBtnsHv : `${ctaPrim(primLbl)}${gwCtaTel}`)}`;

  // --- Schema: Service + OfferCatalog (Partner-Leistungen mit broker), Breadcrumb, kein FAQPage ---
  const areaServed = JSON.stringify(haupt.map(o => o.name));
  const offerItems = leistItems.filter(x => x.slug && services.some(sv => sv.slug === x.slug));
  const offers = offerItems.map(x => `{"@type":"Offer","url":"${DOMAIN}${x.href}","itemOffered":{"@type":"Service","name":"${sj(x.h3)}","serviceType":"${sj(gwServiceName(x.slug))}","${gwIsPartner(x.slug, x.partner) ? 'broker' : 'provider'}":{"@id":"${DOMAIN}/#organization"},"areaServed":${areaServed}}}`).join(',');
  const schema = `${orgSchema()},{"@type":"Service","@id":"${DOMAIN}${url}#service","name":"${sj(m.schema)}","serviceType":"${sj(m.schema)}","provider":{"@id":"${DOMAIN}/#organization"},"audience":{"@type":"Audience","audienceType":"${sj(m.publikum)}"},"areaServed":${areaServed}${offers ? `,"hasOfferCatalog":{"@type":"OfferCatalog","name":"${sj(m.nav)} — Leistungen","itemListElement":[${offers}]}` : ''}},${breadcrumb([{ name: 'Start', url: '/' }, { name: 'Für Gewerbe', url: '/gewerbe/' }, { name: m.nav, url }])}`;
  const titleTag = hv ? (z.title_tag || z.title) : z.title;
  gwWrite(url, titleTag || `${m.nav} — ${nap.name}`, z.meta || lead, schema, main, z.scta_text || z.cta_wa_text || 'Guten Tag, wir sind ein Unternehmen im Havelland und interessieren uns für Ihre Leistungen.', bildSlug);
  written.basis.push(url);
}
function gewerbeSeiten() { gewerbePage(); for (const k of Object.keys(ZG)) zielgruppePage(k); }
function danke() {
  const url = '/danke/';
  const main = `<section class="phero"><div class="wrap center" style="text-align:center"><div class="mini-illu rv in">${pic('page-danke', { alt: 'Anfrage beim Haus- & Gartenservice Havelland eingegangen', sizes: '(max-width:520px) 78vw, 360px' })}</div><span class="kick rv in" style="color:var(--green);justify-content:center;display:inline-flex">Anfrage eingegangen</span><h1 class="rv in d1" style="margin:0 auto">Danke für Ihre <em>Anfrage</em></h1><p class="lead rv in d2" style="margin:20px auto 28px">Wir haben Ihre Anfrage erhalten und melden uns schnell, noch am selben Werktag. Bei dringenden Fällen erreichen Sie uns direkt.</p><div class="cta-row rv in d3" style="justify-content:center"><a class="btn btn-acc" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a><a class="btn btn-line" href="${waHref('Hallo, ich hatte gerade eine Anfrage über die Website gesendet.')}">WhatsApp</a></div><p class="rv" style="margin-top:28px"><a href="/leistungen/">Alle Leistungen ansehen</a> · <a href="/ratgeber/">Zum Ratgeber</a></p></div></section>`;
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
    { label: 'Garten & Heckenpflege', svcs: ['gartenpflege', 'heckenschnitt', 'heckenentfernung', 'baumstumpf-entfernen', 'gartenrodung', 'baumschnitt', 'galabau', 'zaunbau'], teaser: 'Wann geschnitten wird, was der Naturschutz erlaubt und wie regelmäßige Pflege im Havelland aussieht.' },
    { label: 'Reinigung & Außenflächen', svcs: ['fensterreinigung', 'steinreinigung', 'dachrinnenreinigung', 'dachreinigung', 'photovoltaikreinigung', 'gebaeudereinigung', 'grundreinigung', 'unterhaltsreinigung'], teaser: 'Von der streifenfreien Scheibe bis zum moosfreien Dach — Kosten, Turnus und worauf es beim Ergebnis ankommt.' },
    { label: 'Entrümpelung & Umzug', svcs: ['entruempelung', 'haushaltsaufloesung', 'umzugshilfe'], teaser: 'Was Entrümpelung und Haushaltsauflösung kosten, wie ein Festpreis zustande kommt und wie der Ablauf ist.' },
    { label: 'Winterdienst & Hausservice', svcs: ['winterdienst', 'hausmeisterservice', 'ferienwohnung-reinigung', 'objektbetreuung', 'renovierung'], teaser: 'Streupflicht, Saisonverträge und laufende Betreuung rund ums Haus im Havelland und Berliner Umland.' },
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
  // lastmod ist Pflicht, nicht Deko: ohne Änderungssignal crawlt Google freigeschaltete Seiten nicht neu
  // und behält den alten noindex-Stand (Vorfall 08.08.2026: 36 Seiten seit 13.07. nicht neu gecrawlt).
  // lastmod je URL aus Content-Hash (W2, 17.09.): nur wenn sich der Seiteninhalt geändert hat, bekommt die URL ein neues Datum.
  // Volatile Teile (Asset-Version ?v=…) werden vor dem Hashen entfernt. Persistenz in data/lastmod.json (committen!).
  // Erstlauf setzt alle URLs auf das Build-Datum — ehrlich, weil W1/W2 Footer/Schema site-weit geändert haben.
  const LM_FILE = 'data/lastmod.json';
  const lm = fs.existsSync(LM_FILE) ? JSON.parse(fs.readFileSync(LM_FILE, 'utf8')) : {};
  const today = new Date().toISOString().slice(0, 10);
  const hashOf = u => { const p = `website${u}index.html`; if (!fs.existsSync(p)) return null; const h = fs.readFileSync(p, 'utf8').replace(/\?v=[a-f0-9]+/g, '').replace(/\r\n/g, '\n'); return crypto.createHash('sha1').update(h).digest('hex'); };
  const lastmodOf = u => { const h = hashOf(u); if (!h) return today; const e = lm[u]; if (!e || e.hash !== h) lm[u] = { hash: h, date: today }; return lm[u].date; };
  const sm = (name, urls) => { const dates = urls.map(lastmodOf); const x = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u, i) => `<url><loc>${DOMAIN}${u}</loc><lastmod>${dates[i]}</lastmod></url>`).join('\n')}\n</urlset>\n`; fs.writeFileSync(`website/${name}`, x); return dates.length ? dates.reduce((a, b) => a > b ? a : b) : today; };
  // Wellen-Gate: Hubs + Kern-Basis immer indexiert. Ortsseiten/Ratgeber service-scharf (nur wenn service.wave <= aktive_welle → in *Idx gesammelt). Orts-Hubs am globalen Gate. Bei aktive_welle=0 sind *Idx leer → Output wie bisher.
  const gate = (config.aktive_welle || 0) < 2; // Orts-Hubs erst ab Welle 2 (Welle 1 = nur service-scharfe Ortsseiten via *Idx)
  const lmServices = sm('sitemap-services.xml', [...written.basis.filter(u=>['/','/leistungen/','/ueber-uns/','/bewertungen/','/kontakt/', '/gewerbe/', ...Object.values(ZG).map(m => m.url)].includes(u)), ...written.hubs, ...written.ortsseitenIdx]);  // 14.09.: B2B-Seite ab Welle 2 in die Sitemap; Paket 3b: + /gewerbe/ und die drei neuen Zielgruppenseiten
  const lmStandorte = sm('sitemap-standorte.xml', gate ? [] : [...written.orts_hubs, '/standorte/']);
  const lmRatgeber = sm('sitemap-ratgeber.xml', written.ratgeberIdx.length ? [...written.ratgeberIdx, '/ratgeber/'] : []);
  fs.writeFileSync(LM_FILE, JSON.stringify(lm, null, 0) + '\n');
  const idx = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[['sitemap-services.xml',lmServices],['sitemap-standorte.xml',lmStandorte],['sitemap-ratgeber.xml',lmRatgeber]].map(([f,d])=>`<sitemap><loc>${DOMAIN}/${f}</loc><lastmod>${d}</lastmod></sitemap>`).join('\n')}\n</sitemapindex>\n`;
  fs.writeFileSync('website/sitemap.xml', idx);
  fs.writeFileSync('website/robots.txt', `User-agent: *\nAllow: /\n\n# AI-Crawler erlaubt (AEO/GEO)\nUser-agent: GPTBot\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\nUser-agent: PerplexityBot\nAllow: /\nUser-agent: Google-Extended\nAllow: /\n\nSitemap: ${DOMAIN}/sitemap.xml\n`);
  // llms.txt (GEO)
  // GEO (W3-Audit 17.09.): Kurzbeschreibung je Zeile, damit ein Crawler, der nur llms.txt liest, den Kern ohne Seitenaufruf erkennt.
  const firstSentence = t => { if (!t) return ''; const m = String(t).match(/^[^.!?]*[.!?]/); let x = (m ? m[0] : String(t)).trim(); if (x.length > 160) x = x.slice(0, 157).trimEnd() + '…'; return x; };
  // B2B-Seite (17.09., Launch-Gate-Fund): fehlte in llms.txt, obwohl ab aktive_welle>=2 indexiert und in sitemap-services.xml — gleiche Gate-Bedingung wie dort.
  const b2bLlms = (() => { const b2b = J('b2b.json'); const zeile = (titel, href, lead) => `- [${titel}](${DOMAIN}${href})${lead ? `: ${firstSentence(lead)}` : ''}`; const zg = k => ({ ...(k === 'hausverwaltungen' ? b2b : {}), ...((GW.zielgruppen || {})[k] || {}) }); return `\n\n## Für Gewerbe\n${[zeile(gwU.title || 'Für Gewerbe: Objektpflege und Reinigung', '/gewerbe/', gwU.lead), ...Object.entries(ZG).map(([k, m]) => zeile(zg(k).title || m.nav, m.url, zg(k).lead))].join('\n')}`; })();   // Paket 3b: /gewerbe/ + vier Zielgruppenseiten (vorher nur B2B-Seite)
  const llms = `# ${nap.name}\n\n> Haus- & Gartenservice im Havelland und Berliner Umland. Ein fester Ansprechpartner für Garten, Reinigung, Entrümpelung und Hausmeisterdienste; Winterdienst und Dachrinnenreinigung koordiniert über Partner-Fachbetriebe. Sitz: ${nap.city}. Garten und Reinigung: Festpreis nach kostenloser Besichtigung, Foto-Nachweis nach jedem Auftrag.\n\n## Leistungen\n${services.map(s=>{ const def = hubCopy[s.slug] && hubCopy[s.slug].definition; return `- [${s.name}](${DOMAIN}/${s.slug}/)${def ? `: ${firstSentence(def)}` : ''}`; }).join('\n')}${b2bLlms}\n\n## Ratgeber\n${(ratCopy.length?ratCopy:RATGEBER_FALLBACK).map(r=>`- [${r.title}](${DOMAIN}/ratgeber/${r.slug}/)${r.lead ? `: ${r.lead}` : ''}`).join('\n')}\n\n## Kontakt\n- Telefon: ${nap.phone_display}\n- Ort: ${nap.street}, ${nap.zip} ${nap.city}\n`;
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
gewerbeSeiten();
danke();
// Ads-Landingpages (/lp/<slug>/ + /lp/danke/): noindex, nicht in Sitemaps — scripts/lp.mjs, Copy data/copy/lp.json (Ads-Kampagne Entrümpelung, 14.09.2026)
buildLp({ head, write, esc, tel, waHref, nap, DOMAIN, CONSENT_BANNER, TRACK_EVENTS, CONSENT_RESET_JS, CONSENT_KEY, orgSchema, reviews, config, CP, isReal, pic, leaf, proof, IMG });
notFound();
if (FULL) {
  for (const s of services) if (PAGE_SVC.has(s.slug)) for (const o of seitenOrte(s)) ortsseite(s, o);
} else {
  for (const [ss, os] of SAMPLE_ORTSSEITEN) { const s = services.find(x=>x.slug===ss), o = orte.find(x=>x.slug===os); if (s && o) ortsseite(s, o); }
}
sitemaps();
fs.cpSync('assets', 'website/assets', { recursive: true });
fs.copyFileSync('assets/img/favicon.ico', 'website/favicon.ico'); // Root-Fallback für Google-SERP-Favicon
const total = written.basis.length + written.hubs.length + written.ortsseiten.length + written.orts_hubs.length + written.ratgeber.length;
console.log(`Generiert (${FULL?'FULL':'SAMPLE'}): ${written.basis.length} Basis + ${written.hubs.length} Hubs + ${written.ortsseiten.length} Ortsseiten + ${written.orts_hubs.length} Orts-Hubs + ${written.ratgeber.length} Ratgeber = ${total} Seiten`);
