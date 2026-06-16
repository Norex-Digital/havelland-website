// Havelland Static-Site-Generator — Node, zero deps. Run: node scripts/generate.mjs  (FULL=1 für alle Ortsseiten)
// Liest data/*.json + data/copy/*.json (P4-Copy), rendert gegen havelland-design (site.css), schreibt website/ + Sitemaps.
// Kein FAQPage-JSON-LD (Projekt-Regel) — FAQ als nativer <details>-Inhalt.
import fs from 'fs';

const J = f => JSON.parse(fs.readFileSync(`data/${f}`, 'utf8'));
const CP = f => { try { return JSON.parse(fs.readFileSync(`data/copy/${f}`, 'utf8')); } catch { return null; } };
const services = J('services.json').services;
const loc = J('locations.json'); const orte = loc.orte; const ortsteileVon = loc._meta.ortsteile_von || {};
const nap = J('nap.json'); const config = J('config.json'); const proof = J('proof.json');
const DOMAIN = config.domain.replace(/\/$/, '');
const FULL = !!process.env.FULL;

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
// Reverse-Index Service → Ratgeber (interne Verlinkung, seiten-architektur §7)
const ratgeberByService = {}; for (const r of ratCopy) { if (!r.cta_service) continue; (ratgeberByService[r.cta_service] = ratgeberByService[r.cta_service] || []).push(r); }

const PAGE_SVC = new Set(['heckenschnitt','gartenpflege','fensterreinigung','entruempelung','winterdienst','steinreinigung','dachrinnenreinigung','hausmeisterservice','gebaeudereinigung','unterhaltsreinigung','ferienwohnung-reinigung']);
const PREMIUM = new Set(['gross-glienicke','berlin-kladow','berlin-gatow']);
const sectionOT = new Set(Object.keys(ortsteileVon).filter(s => !PREMIUM.has(s)));
const launch = orte.filter(o => o.geo === 'A' || o.geo === 'B');
const haupt = launch.filter(o => !sectionOT.has(o.slug));
const segMatch = (s, o) => s.segment.some(x => o.typ.includes(x));
const orteForService = s => haupt.filter(o => s.orte_fix ? s.orte_fix.includes(o.slug) : segMatch(s, o));
const servicesForOrt = o => services.filter(s => PAGE_SVC.has(s.slug) && (s.orte_fix ? s.orte_fix.includes(o.slug) : segMatch(s, o)));

// Welche Ortsseiten werden TATSÄCHLICH gerendert? (Manifest-First → Link-Graph geschlossen, keine 404)
const SAMPLE_ORTSSEITEN = [['heckenschnitt','falkensee'],['gartenpflege','berlin-kladow'],['steinreinigung','dallgow-doeberitz'],['fensterreinigung','nauen'],['entruempelung','oranienburg'],['winterdienst','falkensee'],['hausmeisterservice','hennigsdorf'],['gebaeudereinigung','berlin-spandau'],['ferienwohnung-reinigung','werder-havel'],['dachrinnenreinigung','hohen-neuendorf']];
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
const ctaA = '<a class="btn btn-acc" href="/kontakt/">Kostenlose Besichtigung anfragen</a>';
const ctaPrim = label => `<a class="btn btn-acc" href="/kontakt/">${label}</a>`;
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
  if (cl >= 130) t = t.slice(0, cl);
  t = t.replace(/[ ,;:.–-]+$/, '');
  while (DANGLE.test(t)) t = t.replace(DANGLE, '').replace(/[ ,;:.–-]+$/, '');
  return t + '.';
}
// deterministische Rotation (Uniqueness ohne Zufall)
const seedOf = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
function rotate(arr, seed, n) { if (!arr || !arr.length) return []; const out = []; const a = arr.slice(); const start = seed % a.length; for (let i = 0; i < Math.min(n, a.length); i++) out.push(a[(start + i) % a.length]); return out; }

const written = { hubs: [], ortsseiten: [], orts_hubs: [], ratgeber: [], basis: [] };

function orgSchema() {
  const addr = nap.street ? `,"address":{"@type":"PostalAddress","streetAddress":"${sj(nap.street)}","postalCode":"${sj(nap.zip)}","addressLocality":"${sj(nap.city)}","addressCountry":"DE"}` : '';
  return `{"@type":"LocalBusiness","@id":"${DOMAIN}/#organization","name":"${sj(nap.name)}","telephone":"${tel}","url":"${DOMAIN}/"${addr},"areaServed":${JSON.stringify(haupt.map(o=>o.name))}}`;
}
function breadcrumb(items) { // [{name,url}]
  const li = items.map((it,i)=>`{"@type":"ListItem","position":${i+1},"name":"${sj(it.name)}"${it.url?`,"item":"${DOMAIN}${it.url}"`:''}}`).join(',');
  return `{"@type":"BreadcrumbList","itemListElement":[${li}]}`;
}

function head(title, desc, canonical, schemaGraph, opts = {}) {
  return `<!doctype html><html lang="de"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">${opts.noindex ? '\n<meta name="robots" content="noindex, follow">' : ''}
<link rel="canonical" href="${DOMAIN}${canonical}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${DOMAIN}${canonical}"><meta property="og:type" content="website"><meta property="og:locale" content="de_DE">
<link rel="preload" href="/assets/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/fraunces-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/site.css">
<noscript><style>.rv{opacity:1;transform:none}</style></noscript>
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[${schemaGraph}]}</script>
</head><body>`;
}
const header = `<header><div class="wrap nav"><a href="/"><img src="/assets/img/logo.png" alt="${esc(nap.name)}" width="180" height="50"></a><div class="links"><a href="/leistungen/">Leistungen</a><a href="/standorte/">Standorte</a><a href="/ratgeber/">Ratgeber</a><a href="/ueber-uns/">Über uns</a><a href="/kontakt/">Kontakt</a></div><a class="cta" href="/kontakt/">Besichtigung anfragen</a><input type="checkbox" id="nvt" class="nvt" aria-hidden="true"><label for="nvt" class="hamb" role="button" aria-label="Menü öffnen"><span></span><span></span><span></span></label><nav class="navmenu" aria-label="Hauptmenü"><a href="/leistungen/">Leistungen</a><a href="/standorte/">Standorte</a><a href="/ratgeber/">Ratgeber</a><a href="/ueber-uns/">Über uns</a><a href="/bewertungen/">Bewertungen</a><a href="/kontakt/">Kontakt</a><a href="tel:${tel}">☎ ${esc(nap.phone_display)}</a><a class="btn btn-acc" href="/kontakt/">Kostenlose Besichtigung</a></nav></div></header>`;
const sctaBar = waText => `<nav class="scta" aria-label="Schnellkontakt"><a class="call" href="tel:${tel}">☎ Anrufen</a><a class="wa" href="${waHref(waText)}">WhatsApp</a></nav>`;
const SCTA_DEFAULT = sctaBar('Hallo, ich hätte gern eine kostenlose Besichtigung.');
const footer = `<footer><div class="wrap"><span>${esc(nap.name)} · ${esc(nap.street||'')}, ${esc(nap.zip||'')} ${esc(nap.city)} · ${esc(nap.phone_display)}</span><span><a href="/leistungen/">Leistungen</a> · <a href="/standorte/">Standorte</a> · <a href="/ratgeber/">Ratgeber</a> · <a href="/ueber-uns/">Über uns</a> · <a href="/bewertungen/">Bewertungen</a> · <a href="/impressum/">Impressum</a> · <a href="/datenschutz/">Datenschutz</a></span></div></footer>`;
const revealJS = `<script>const io=new IntersectionObserver(e=>e.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}}),{threshold:.12});document.querySelectorAll('.rv:not(.in)').forEach(el=>io.observe(el));</script>`;
const endBand = `<section class="end">${leaf('leaf')}<div class="wrap"><h2 class="serif rv">Sagen Sie uns, was ansteht — wir kümmern uns.</h2><p class="rv d1">Kostenlose Besichtigung, Festpreis, dann erledigt.</p><div class="cta-row rv d2">${ctaA}<a class="btn btn-line" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a></div></div></section>`;

function write(url, html) {
  const dir = `website${url}`.replace(/\/$/, '');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${dir}/index.html`, html);
}

// ---------- HOME ----------
function home() {
  const nine = services.slice(0, 9);
  const items = nine.map((s,i)=>`<a class="it rv" href="/${s.slug}/"><span class="no">${String(i+1).padStart(2,'0')}</span><div><h3>${esc(s.name)}</h3><p>${esc((s.sektionen||[]).slice(0,4).join(' · ')|| s.garantie || 'Festpreis nach Besichtigung.')}</p></div><span class="arr">→</span></a>`).join('');
  const main = `
<section class="hero">${leaf('hleaf')}<div class="wrap grid">
<div><span class="kick rv in"><span class="dot"></span> ${esc(nap.city)} · Havelland</span>
<h1 class="rv in d1">Haus und Garten — <em>aus einer Hand</em> gepflegt.</h1>
<p class="lead rv in d2">Garten, Reinigung, Winterdienst, Entrümpelung. Ein fester Ansprechpartner, der zurückruft — Festpreis nach Besichtigung, Foto-Nachweis nach jedem Auftrag.</p>
<div class="cta-row rv in d3">${ctaA}<a class="btn btn-line" href="${waHref('Hallo, ich interessiere mich für Ihre Leistungen.')}">WhatsApp schreiben</a></div>
<div class="trust-row rv in d4"><div class="t"><b>Ein</b><span>fester Ansprechpartner</span></div><div class="t"><b>Festpreis</b><span>nach Besichtigung</span></div><div class="t"><b>Stunden</b><span>statt Tage bis zur Antwort</span></div></div></div>
<div class="shot rv in d2"><img class="main" src="/assets/img/hero-garten.png" alt="Gepflegter Garten im Havelland" width="720" height="600"><div class="chip2">Foto-Nachweis</div><div class="badge"><span class="ic">${leaf('')}</span><span class="t">Vorher / Nachher<span>per WhatsApp, nach jedem Auftrag</span></span></div></div>
</div></section>
<section class="band">${leaf('leaf')}<div class="wrap"><p class="lead2 rv">Kein Suchen, kein Koordinieren, kein Risiko mit Fremden — <em>ein Anruf, alles erledigt.</em></p>
<div class="vals"><div class="v rv d1"><h4><span class="n">01</span> Aus einer Hand</h4><p>Garten, Reinigung, Winterdienst, Entrümpelung — ein Ansprechpartner für alles.</p></div><div class="v rv d2"><h4><span class="n">02</span> Nachweis statt Versprechen</h4><p>Foto-Dokumentation nach jedem Auftrag, direkt aufs Handy.</p></div><div class="v rv d3"><h4><span class="n">03</span> Festpreis</h4><p>Kostenlose Besichtigung, klarer Preis — kein Nachkommen.</p></div><div class="v rv d4"><h4><span class="n">04</span> Schnell erreichbar</h4><p>WhatsApp-Antwort in Stunden, nicht in Tagen.</p></div></div></div></section>
<section class="sec"><div class="wrap"><div class="head"><h2 class="serif rv">Was wir machen</h2><a class="rv" href="/leistungen/">Alle Leistungen →</a></div><p class="intro rv">Vom regelmäßigen Garten bis zum einmaligen Großeinsatz — koordiniert von einem festen Ansprechpartner.</p><div class="list">${items}</div></div></section>
<section class="proof"><div class="grid"><div class="pic rv"><img src="/assets/img/terrasse.png" alt="Beispiel eines gepflegten Außenbereichs im Havelland" width="700" height="500"><div class="tags">${(proof.vorher_nachher && proof.vorher_nachher.echt && proof.vorher_nachher.echt.length) ? '<span>Vorher</span><span class="acc">Nachher</span>' : `<span>${esc((proof.vorher_nachher && proof.vorher_nachher.platzhalter_label) || 'Beispielhafte Darstellung')}</span>`}</div></div><div class="txt"><h2 class="serif rv">Nachweis, <em>nicht Versprechen.</em></h2><p class="rv d1">Nach jedem Auftrag bekommen Sie Vorher/Nachher-Fotos per WhatsApp. Sie sehen das Ergebnis — auch wenn Sie nicht dabei waren.</p><p class="q rv d2">„Wenn nach unserer Reinigung noch sichtbarer Moos- oder Algenbelag bleibt — wir kommen nochmal. Kostenlos."</p></div></div></section>
${endBand}`;
  write('/', head(`${nap.name} — aus einer Hand`, mkMeta('Garten, Reinigung, Winterdienst und Entrümpelung im Havelland. Ein fester Ansprechpartner, Festpreis nach Besichtigung, Foto-Nachweis nach jedem Auftrag.'), '/', orgSchema()) + header + main + footer + SCTA_DEFAULT + revealJS + '</body></html>');
  written.basis.push('/');
}

// ---------- SERVICE-HUB ----------
function hub(s) {
  const url = `/${s.slug}/`;
  const c = hubCopy[s.slug];
  const orteList = orteForService(s);
  const cardOrte = orteList.filter(o => hasOrt(s.slug, o.slug)).slice(0, FULL ? 999 : 12);
  const cards = cardOrte.map(o => `<a class="card" href="/${s.slug}-${o.slug}/"><h3>${esc(s.name)} ${esc(o.name)}</h3><p>${esc(s.name)} in ${esc(o.name)} — lokal, Festpreis, Foto-Nachweis.</p><span class="go">Mehr →</span></a>`).join('');

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

  const schema = `${orgSchema()},{"@type":"Service","@id":"${DOMAIN}${url}#service","name":"${sj(s.name)}","serviceType":"${sj(s.name)}","provider":{"@id":"${DOMAIN}/#organization"},"areaServed":${JSON.stringify(orteList.map(o=>o.name))}},${breadcrumb([{name:'Start',url:'/'},{name:s.name,url}])}`;
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>${esc(s.name)}</div>
<section class="phero">${leaf('hleaf')}<div class="wrap grid"><div><span class="kick rv in" style="color:var(--green)">Leistung</span><h1 class="rv in d1">${h1}</h1><p class="lead rv in d2">${lead}</p><div class="cta-row rv in d3">${ctaPrim(isB2Bonly(s.segment) ? CTA_ANGEBOT : 'Kostenlose Besichtigung anfragen')}<a class="btn btn-line" href="${waHref(`Hallo, ich interessiere mich für ${s.name}.`)}">WhatsApp</a><a class="btn btn-line" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a></div></div>
<div class="shot rv in d2"><img class="main" src="/assets/img/hero-garten.png" alt="${esc(s.name)} im Havelland" width="640" height="480"><div class="badge"><span class="ic">${leaf('')}</span><span class="t">Foto-Nachweis<span>nach jedem Auftrag</span></span></div></div></div></section>
<section class="sec"><div class="wrap"><div class="prose wide rv">${definition}<h2>${esc(s.name)} im Havelland — was dazugehört</h2>${sektionenHtml}${naehe}${ablauf}<h3>Unsere Garantie</h3><p>${esc(garantieTxt)}</p></div></div></section>
${cardOrte.length ? `<section class="sec section-alt"><div class="wrap"><div class="head"><h2 class="serif rv">${esc(s.name)} in Ihrem Ort</h2></div><div class="cards rv">${cards}</div></div></section>` : ''}
${(ratgeberByService[s.slug]||[]).length ? `<section class="sec"><div class="wrap"><div class="head"><h2 class="serif rv">Ratgeber rund um ${esc(s.name)}</h2><a class="rv" href="/ratgeber/">Alle Ratgeber →</a></div><div class="cards rv">${(ratgeberByService[s.slug]||[]).slice(0,3).map(r=>`<a class="card" href="/ratgeber/${r.slug}/"><h3>${esc(r.title)}</h3><p>${esc(r.lead||'')}</p><span class="go">Lesen →</span></a>`).join('')}</div></div></section>` : ''}
${faqBlock(c && c.faqs)}
${endBand}`;
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
  const schema = `${orgSchema()},{"@type":"Service","@id":"${DOMAIN}${url}#service","name":"${sj(s.name)} ${sj(o.name)}","serviceType":"${sj(s.name)}","provider":{"@id":"${DOMAIN}/#organization"},"areaServed":${place}},${breadcrumb([{name:'Start',url:'/'},{name:s.name,url:`/${s.slug}/`},{name:o.name,url}])}`;

  // Body aus Copy-Schicht (mit Fallback) — Archetyp-Bausteine aus POOLS per Seed (Near-Duplicate-Reduktion)
  const pickPool = (arr, i) => Array.isArray(arr) && arr.length ? arr[((i % arr.length) + arr.length) % arr.length] : (typeof arr === 'string' ? arr : '');
  const idx = archOrtIdx[o.slug] || 0;
  const rLen = arch && Array.isArray(arch.rahmen) ? arch.rahmen.length : 1;
  const lead = c && c.ortsseite_lead ? fillTok(c.ortsseite_lead, o, oc) : `Ihr ${s.name} in ${o.name} — vom Haus- & Gartenservice Havelland.`;
  const hook = oc && oc.hook ? `<p>${esc(oc.hook)}</p>` : '';
  const rahmenTxt = pickPool(arch && arch.rahmen, idx);                       // eindeutige Verteilung
  const trustTxt = pickPool(arch && arch.trust, Math.floor(idx / rLen));      // -> (rahmen,trust)-Tupel eindeutig je Archetyp-Ort
  const rahmen = rahmenTxt ? `<p>${esc(fillTok(rahmenTxt, o, oc))}</p>` : '';
  const sektionen = (s.sektionen || []).map(x => `<li>${esc(x)}</li>`).join('');
  const ortsteile = (o.ortsteile && o.ortsteile.length) ? `<p>Auch in ${esc(o.ortsteile.join(', '))} und Umgebung sind wir für Sie da.</p>` : '';
  const trust = trustTxt ? `<p>${esc(fillTok(trustTxt, o, oc))}</p>` : `<p>Kostenlose Besichtigung, danach ein Festpreis ohne Nachkommen — und nach dem Auftrag Vorher/Nachher-Fotos per WhatsApp.</p>`;

  // FAQ: 2 Archetyp-FAQ ({ort}-spezifisch) + 2 Hub-FAQ (idx-rotiert, je Ort andere) → ortspezifisch + Near-Dup-Marge
  const archFaqs = arch && arch.faqs ? rotate(arch.faqs, idx, 2).map(f => ({ q: fillTok(f.q, o, oc), a: fillTok(f.a, o, oc) })) : [];
  const hubFaqs = c && c.faqs ? rotate(c.faqs, idx + 1, archFaqs.length ? 2 : 4) : [];
  const faqs = [...archFaqs, ...hubFaqs];
  const ortRatPool = ratgeberByService[s.slug] || [];
  const ortRat = ortRatPool.length ? ortRatPool[idx % ortRatPool.length] : null;
  const ortRatLink = ortRat ? `<p>Mehr zum Thema lesen Sie in unserem Ratgeber: <a href="/ratgeber/${ortRat.slug}/">${esc(ortRat.title)}</a>.</p>` : '';

  const title = clampTitle(`${s.name} ${o.name}${(s.name.length + o.name.length) < 34 ? ' – Havelland' : ''}`);
  const meta = mkMeta(`${s.name} in ${o.name}${o.plz?` (${o.plz})`:''} vom Haus- & Gartenservice Havelland: Festpreis nach kostenloser Besichtigung und Foto-Nachweis nach jedem Auftrag.`);

  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span><a href="/${s.slug}/">${esc(s.name)}</a><span class="sep">›</span>${esc(o.name)}</div>
<section class="phero">${leaf('hleaf')}<div class="wrap grid"><div><span class="kick rv in" style="color:var(--green)">${esc(o.name)}${o.plz?` · ${esc(o.plz)}`:''}</span><h1 class="rv in d1">${esc(s.name)} <em>in ${esc(o.name)}</em></h1><p class="lead rv in d2">${esc(lead)}</p><div class="cta-row rv in d3">${ctaPrim((isB2Bonly(s.segment) || isB2Bonly(o.typ)) ? CTA_ANGEBOT : 'Kostenlose Besichtigung anfragen')}<a class="btn btn-line" href="${waHref(`Hallo, ich brauche ${s.name} in ${o.name}.`)}">WhatsApp</a></div></div>
<div class="shot rv in d2"><img class="main" src="/assets/img/hero-garten.png" alt="${esc(s.name)} in ${esc(o.name)}" width="640" height="480"><div class="badge"><span class="ic">${leaf('')}</span><span class="t">Vor Ort in ${esc(o.name)}<span>schnelle Reaktion</span></span></div></div></div></section>
<section class="sec"><div class="wrap"><div class="prose wide rv"><h2>${esc(s.name)} in ${esc(o.name)} — zuverlässig &amp; lokal</h2>${hook}${rahmen}${sektionen?`<h3>Was dazugehört</h3><ul>${sektionen}</ul>`:''}${ortsteile}<h3>Festpreis &amp; Foto-Nachweis</h3>${trust}${ortRatLink}</div></div></section>
<section class="sec section-alt"><div class="wrap"><div class="head"><h2 class="serif rv">${esc(s.name)} in der Nähe</h2></div><div class="cards rv">${nahCards.map(n=>`<a class="card" href="/${s.slug}-${n.slug}/"><h3>${esc(s.name)} ${esc(n.name)}</h3><span class="go">Mehr →</span></a>`).join('')}${servicesForOrt(o).length>=3?`<a class="card" href="/standorte/${o.slug}/"><h3>Alle Leistungen in ${esc(o.name)}</h3><span class="go">Zum Ort →</span></a>`:`<a class="card" href="/${s.slug}/"><h3>Mehr zu ${esc(s.name)}</h3><span class="go">Zur Leistung →</span></a>`}</div></div></section>
${faqBlock(faqs)}
${endBand}`;
  write(url, head(title, meta, url, schema) + header + main + footer + sctaBar(`Hallo, ich brauche ${s.name} in ${o.name}.`) + revealJS + '</body></html>');
  written.ortsseiten.push(url);
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
<section class="phero">${leaf('hleaf')}<div class="wrap"><span class="kick rv in" style="color:var(--green)">Standort</span><h1 class="rv in d1" style="max-width:14em">Haus- &amp; Gartenservice <em>in ${esc(o.name)}</em></h1>${intro}<div class="cta-row rv in d3">${ctaA}</div></div></section>
<section class="sec"><div class="wrap"><div class="head"><h2 class="serif rv">Unsere Leistungen in ${esc(o.name)}</h2></div><div class="cards rv">${cards}</div>${teile.length?`<p class="intro rv" style="margin-top:30px">Auch in ${esc(teile.join(', '))} und Umgebung.</p>`:''}</div></section>
${endBand}`;
  write(url, head(clampTitle(`Haus- & Gartenservice ${o.name}`), mkMeta(`Haus- & Gartenservice in ${o.name}${o.plz?` (${o.plz})`:''}: Garten, Reinigung, Winterdienst, Entrümpelung von einem festen Ansprechpartner.`), url, schema) + header + main + footer + SCTA_DEFAULT + revealJS + '</body></html>');
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
  const bodyHtml = (r.sections || []).map(x => `<h2>${esc(x.h2)}</h2>${x.body_html || ''}`).join('');
  const faqHtml = (r.faqs && r.faqs.length) ? `<h2>Häufige Fragen</h2>${r.faqs.map(f=>`<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}` : '';
  const schema = `${orgSchema()},{"@type":"Article","@id":"${DOMAIN}${url}#article","headline":"${esc(r.title)}","inLanguage":"de","author":{"@id":"${DOMAIN}/#organization"},"publisher":{"@id":"${DOMAIN}/#organization"},"mainEntityOfPage":"${DOMAIN}${url}"},${breadcrumb([{name:'Start',url:'/'},{name:'Ratgeber',url:'/ratgeber/'},{name:r.title,url}])}`;
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span><a href="/ratgeber/">Ratgeber</a><span class="sep">›</span>${esc(r.title)}</div>
<section class="phero" style="border-bottom:none;padding-bottom:20px"><div class="wrap"><span class="kick rv in" style="color:var(--green)">Ratgeber</span><h1 class="rv in d1" style="max-width:16em">${esc(r.title)}</h1><p class="lead rv in d2">${esc(r.lead)}</p></div></section>
<section class="sec" style="padding-top:20px"><div class="wrap"><div class="prose rv">${r.intro?`<p class="ratgeber-intro"><strong>${esc(r.intro)}</strong></p>`:''}${bodyHtml}<div class="faq" style="margin-top:24px">${faqHtml}</div></div></div></section>
<section class="sec section-alt"><div class="wrap center"><a class="btn btn-acc" href="/${r.cta_service}/">${esc(r.cta_text || `Zu ${svc.name||'unserer Leistung'}`)} →</a></div></section>
${related.length ? `<section class="sec"><div class="wrap"><div class="head"><h2 class="serif rv">Das könnte Sie auch interessieren</h2><a class="rv" href="/ratgeber/">Alle Ratgeber →</a></div><div class="cards rv">${related.map(x=>`<a class="card" href="/ratgeber/${x.slug}/"><h3>${esc(x.title)}</h3><p>${esc(x.lead||'')}</p><span class="go">Lesen →</span></a>`).join('')}</div></div></section>` : ''}
${endBand}`;
  write(url, head(clampTitle(r.title), mkMeta(r.meta || r.lead), url, schema) + header + main + footer + SCTA_DEFAULT + revealJS + '</body></html>');
  written.ratgeber.push(url);
}

// ---------- BASIS: Leistungen / Standorte / Ratgeber-Index / Kontakt / Recht ----------
function listingPage(url, title, intro, cardsHtml, schema) {
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>${esc(title)}</div>
<section class="phero" style="padding-bottom:24px"><div class="wrap"><h1 class="rv in d1">${esc(title)}</h1><p class="lead rv in d2">${esc(intro)}</p></div></section>
<section class="sec" style="padding-top:24px"><div class="wrap"><div class="cards rv">${cardsHtml}</div></div></section>${endBand}`;
  write(url, head(clampTitle(`${title} — ${nap.name}`), mkMeta(`${intro} ${nap.name} im Havelland und Berliner Umland.`), url, schema) + header + main + footer + SCTA_DEFAULT + revealJS + '</body></html>');
  written.basis.push(url);
}
function basis() {
  listingPage('/leistungen/', 'Unsere Leistungen', 'Alles rund um Haus und Garten im Havelland — aus einer Hand.',
    services.map(s => `<a class="card" href="/${s.slug}/"><h3>${esc(s.name)}</h3><p>${esc((s.sektionen||[]).slice(0,3).join(' · ')||s.garantie||'')}</p><span class="go">Mehr →</span></a>`).join(''),
    `${orgSchema()},${breadcrumb([{name:'Start',url:'/'},{name:'Leistungen',url:'/leistungen/'}])}`);
  listingPage('/standorte/', 'Unsere Standorte', 'Wir sind im ganzen Havelland und Berliner Umland für Sie da.',
    haupt.filter(o=>servicesForOrt(o).length>=3).map(o => `<a class="card" href="/standorte/${o.slug}/"><h3>${esc(o.name)}</h3><p>${esc(o.plz||'')}</p><span class="go">Zum Ort →</span></a>`).join(''),
    `${orgSchema()},${breadcrumb([{name:'Start',url:'/'},{name:'Standorte',url:'/standorte/'}])}`);
  // Ratgeber-Index
  const ratItems = written.ratgeber.length ? null : null;
  const ratList = (ratCopy.length ? ratCopy : RATGEBER_FALLBACK);
  listingPage('/ratgeber/', 'Ratgeber', 'Antworten rund um Garten, Reinigung und Haus — verständlich erklärt.',
    ratList.map(r => `<a class="card" href="/ratgeber/${r.slug}/"><h3>${esc(r.title)}</h3><p>${esc(r.lead||'')}</p><span class="go">Lesen →</span></a>`).join(''),
    `${orgSchema()},${breadcrumb([{name:'Start',url:'/'},{name:'Ratgeber',url:'/ratgeber/'}])}`);
  // Kontakt — echte Konversions-Seite: Telefon/WhatsApp prominent + Anfrage-Formular (WhatsApp-Bridge bis Web3Forms-Key vorliegt)
  const waNum = tel.replace('+', '');
  const kontaktMain = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>Kontakt</div>
<section class="phero"><div class="wrap"><h1 class="rv in d1">Kontakt &amp; <em>kostenlose Besichtigung</em></h1><p class="lead rv in d2">Sagen Sie uns, was ansteht — wir melden uns schnell, meist noch am selben Tag.</p><div class="cta-row rv in d3"><a class="btn btn-acc" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a><a class="btn btn-line" href="${waHref('Hallo, ich hätte gern eine kostenlose Besichtigung.')}">WhatsApp</a></div><div class="chips rv"><span>${esc(nap.name)}</span><span>${esc(nap.street||'')}, ${esc(nap.zip||'')} ${esc(nap.city)}</span></div></div></section>
<section class="sec" style="padding-top:8px"><div class="wrap"><div class="head"><h2 class="serif rv">Anfrage senden</h2></div><p class="intro rv">Ein paar Angaben genügen. Beim Absenden öffnet sich WhatsApp mit Ihrer vorbereiteten Nachricht — oder rufen Sie direkt an.</p>
<form id="anfrage" class="kf rv" novalidate>
<label>Name<input name="name" autocomplete="name" required></label>
<label>Telefon<input name="tel" type="tel" autocomplete="tel" required></label>
<label>Ort / PLZ<input name="ort" autocomplete="address-level2"></label>
<label>Was steht an?<textarea name="anliegen" rows="4" required></textarea></label>
<label class="chk"><input type="checkbox" name="dsgvo" required> Ich bin mit der Verarbeitung meiner Angaben zur Kontaktaufnahme einverstanden (siehe <a href="/datenschutz/">Datenschutz</a>).</label>
<button class="btn btn-acc" type="submit">Anfrage absenden</button>
<p class="kf-alt">Lieber direkt? <a href="tel:${tel}">Anrufen: ${esc(nap.phone_display)}</a> · <a href="${waHref('Hallo, ich hätte gern eine kostenlose Besichtigung.')}">WhatsApp schreiben</a></p>
</form></div></section>
<script>(function(){var f=document.getElementById('anfrage');if(!f)return;f.addEventListener('submit',function(e){e.preventDefault();if(!f.checkValidity()){f.reportValidity();return;}var g=function(n){var el=f.elements[n];return el?String(el.value).trim():'';};var msg='Anfrage über die Website. Name: '+g('name')+', Telefon: '+g('tel')+', Ort/PLZ: '+g('ort')+', Anliegen: '+g('anliegen');window.location.href='https://wa.me/${waNum}?text='+encodeURIComponent(msg);});})();</script>
<section class="end">${leaf('leaf')}<div class="wrap"><h2 class="serif rv">Wir sind für Sie da.</h2><p class="rv d1">Rufen Sie an oder schreiben Sie — die Besichtigung ist kostenlos, der Festpreis danach verbindlich.</p><div class="cta-row rv d2"><a class="btn btn-acc" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a><a class="btn btn-line" href="${waHref('Hallo, ich hätte gern eine kostenlose Besichtigung.')}">WhatsApp</a></div></div></section>`;
  write('/kontakt/', head(`Kontakt — ${nap.name}`, mkMeta(`Kontakt zum Haus- & Gartenservice Havelland in ${nap.city}: ${nap.phone_display}, WhatsApp, kostenlose Vor-Ort-Besichtigung mit Festpreis.`), '/kontakt/', `${orgSchema()},${breadcrumb([{name:'Start',url:'/'},{name:'Kontakt',url:'/kontakt/'}])}`) + header + kontaktMain + footer + SCTA_DEFAULT + revealJS + '</body></html>');
  written.basis.push('/kontakt/');
  const legalShell = (t, bodyHtml) => `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>${t}</div><section class="phero" style="padding-bottom:24px"><div class="wrap"><h1 class="rv in d1">${t}</h1></div></section><section class="sec" style="padding-top:24px"><div class="wrap">${bodyHtml}</div></section>${endBand}`;
  const impressumBody = `<div class="prose rv">
<h2>Angaben gemäß § 5 TMG</h2>
<p>${esc(nap.inhaber)}<br>${esc(nap.name)}<br>${esc(nap.street)}<br>${esc(nap.zip)} ${esc(nap.city)}</p>
<h2>Kontakt</h2>
<p>Telefon: <a href="tel:${tel}">${esc(nap.phone_display)}</a>${nap.email ? `<br>E-Mail: <a href="mailto:${esc(nap.email)}">${esc(nap.email)}</a>` : ''}</p>
<h2>Umsatzsteuer</h2>
<p>Kleinunternehmer gemäß § 19 UStG. Es wird keine Umsatzsteuer ausgewiesen.</p>
<h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
<p>${esc(nap.inhaber)}, Anschrift wie oben.</p>
<h2>Streitbeilegung</h2>
<p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit: <a href="https://ec.europa.eu/consumers/odr/" rel="nofollow">ec.europa.eu/consumers/odr</a>. Zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle sind wir nicht verpflichtet und nicht bereit.</p>
${nap.email ? '' : '<p><em>Hinweis: Eine E-Mail-Adresse für die elektronische Kontaktaufnahme (§ 5 TMG) wird vor dem Launch ergänzt.</em></p>'}
</div>`;
  write('/impressum/', head(`Impressum — ${nap.name}`, mkMeta(`Impressum des Haus- & Gartenservice Havelland, ${nap.inhaber}, ${nap.street}, ${nap.zip} ${nap.city}. Kleinunternehmer nach § 19 UStG, Telefon ${nap.phone_display}.`), '/impressum/', orgSchema()) + header + legalShell('Impressum', impressumBody) + footer + SCTA_DEFAULT + revealJS + '</body></html>');
  written.basis.push('/impressum/');
  const datenschutzBody = `<div class="prose rv">
<h2>Datenschutz auf einen Blick</h2>
<p>Verantwortlich für die Datenverarbeitung auf dieser Website ist ${esc(nap.inhaber)}, ${esc(nap.name)}, ${esc(nap.street)}, ${esc(nap.zip)} ${esc(nap.city)}, Telefon ${esc(nap.phone_display)}.</p>
<h2>Kontaktaufnahme</h2>
<p>Wenn Sie uns per Telefon, WhatsApp oder über das Anfrageformular erreichen, verarbeiten wir Ihre Angaben ausschließlich zur Bearbeitung Ihrer Anfrage und für etwaige Anschlussfragen (Art. 6 Abs. 1 lit. b und f DSGVO). Eine Weitergabe an Dritte erfolgt nicht ohne Ihre Einwilligung.</p>
<h2>Ihre Rechte</h2>
<p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch sowie ein Beschwerderecht bei der zuständigen Aufsichtsbehörde.</p>
<p><em>Hinweis: Die vollständige Datenschutzerklärung (inkl. Hosting, Cookie-/Consent-Banner, Anfrageformular-Dienst, Web-Analyse und Schriftarten) wird vor dem Launch ergänzt und juristisch geprüft.</em></p>
</div>`;
  write('/datenschutz/', head(`Datenschutz — ${nap.name}`, mkMeta(`Datenschutzhinweise des Haus- & Gartenservice Havelland in ${nap.city}: Umgang mit Ihren Angaben bei Anfragen per Telefon, WhatsApp und Formular nach DSGVO.`), '/datenschutz/', orgSchema()) + header + legalShell('Datenschutz', datenschutzBody) + footer + SCTA_DEFAULT + revealJS + '</body></html>');
  written.basis.push('/datenschutz/');
}

// ---------- WEITERE BASIS-SEITEN: Über uns / Bewertungen / Danke / 404 ----------
function ueberUns() {
  const url = '/ueber-uns/';
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>Über uns</div>
<section class="phero">${leaf('hleaf')}<div class="wrap grid"><div><span class="kick rv in" style="color:var(--green)">Über uns</span><h1 class="rv in d1">Ein Ansprechpartner für Haus und Garten — <em>im Havelland zuhause</em></h1><p class="lead rv in d2">Hinter dem Haus- &amp; Gartenservice Havelland stehen ${esc(nap.inhaber)} und sein Partner — ein kleines Team aus ${esc(nap.city)}, das selbst mit anpackt. Garten, Reinigung, Winterdienst, Entrümpelung: ein fester Ansprechpartner für alles, Festpreis nach Besichtigung, Foto-Nachweis nach jedem Auftrag.</p><div class="cta-row rv in d3">${ctaA}<a class="btn btn-line" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a></div></div>
<div class="shot rv in d2"><img class="main" src="/assets/img/hero-garten.png" alt="Gepflegter Garten im Havelland" width="640" height="480"><div class="badge"><span class="ic">${leaf('')}</span><span class="t">Foto-Nachweis<span>nach jedem Auftrag</span></span></div></div></div></section>
<section class="band">${leaf('leaf')}<div class="wrap"><p class="lead2 rv">Aus der Region, für die Region — <em>kurze Wege, klare Absprachen.</em></p>
<div class="vals"><div class="v rv d1"><h4><span class="n">01</span> Aus einer Hand</h4><p>Garten, Reinigung, Winterdienst, Entrümpelung — ein Ansprechpartner für alles rund ums Haus.</p></div><div class="v rv d2"><h4><span class="n">02</span> Nachweis statt Versprechen</h4><p>Foto-Dokumentation vor und nach jedem Auftrag, direkt aufs Handy.</p></div><div class="v rv d3"><h4><span class="n">03</span> Festpreis ist Endpreis</h4><p>Kostenlose Besichtigung, klarer Preis. Als Kleinunternehmer nach § 19 UStG ohne Mehrwertsteuer-Aufschlag.</p></div><div class="v rv d4"><h4><span class="n">04</span> Schnell erreichbar</h4><p>Eine WhatsApp genügt — Antwort in Stunden, nicht in Tagen.</p></div></div></div></section>
<section class="sec"><div class="wrap"><div class="prose wide rv"><h2>Wer hinter dem Service steht</h2><p>Den Haus- &amp; Gartenservice Havelland führen wir zu zweit: ${esc(nap.inhaber)} ist Ihr Ansprechpartner vor Ort, mit Praxis aus dem Garten- und Gebäudereinigungs-Handwerk. Sein Partner hält ihm bei Planung und Organisation den Rücken frei. Sie haben es vom ersten Anruf bis zur Abnahme mit festen Gesichtern zu tun — kein Callcenter, keine wechselnden Kräfte, keine Warteschleife.</p><p>Und wir sind selbst dabei: Besichtigung, Ausführung und die Foto-Abnahme machen wir persönlich. Bei größeren Aufträgen unterstützen uns eingearbeitete Helfer — die Verantwortung und Ihr Ansprechpartner bleiben aber immer bei uns.</p><p>Der Betrieb sitzt in der ${esc(nap.street)} in ${esc(nap.zip)} ${esc(nap.city)} und ist im gesamten Havelland und Berliner Umland unterwegs. Als Kleinunternehmer nach § 19 UStG arbeiten wir ohne Mehrwertsteuer-Aufschlag — der Festpreis nach der Besichtigung ist der Endpreis.</p></div></div></section>
<section class="sec section-alt"><div class="wrap"><div class="prose wide rv"><h2>So arbeiten wir — in vier Schritten</h2><ul><li><strong>1. Sie melden sich.</strong> Per Telefon oder WhatsApp, kurz was ansteht — gern mit ein paar Fotos. Meist antworten wir innerhalb weniger Stunden.</li><li><strong>2. Kostenlose Besichtigung.</strong> Wir kommen vorbei, schauen uns die Sache vor Ort an und nennen Ihnen einen Festpreis. Die Besichtigung kostet nichts und verpflichtet zu nichts.</li><li><strong>3. Saubere Ausführung.</strong> Zum vereinbarten Termin, pünktlich und gründlich — und wir räumen hinter uns auf.</li><li><strong>4. Foto-Nachweis.</strong> Nach dem Auftrag bekommen Sie Vorher-/Nachher-Fotos aufs Handy. Sie sehen das Ergebnis, auch wenn Sie nicht zu Hause waren.</li></ul></div></div></section>
<section class="sec"><div class="wrap"><div class="head"><h2 class="serif rv">Was wir übernehmen</h2><a class="rv" href="/leistungen/">Alle Leistungen →</a></div><p class="intro rv">Vom regelmäßigen Garten bis zum einmaligen Großeinsatz — koordiniert von einem festen Ansprechpartner.</p><div class="cards rv"><a class="card" href="/gartenpflege/"><h3>Garten &amp; Außenanlagen</h3><p>Gartenpflege, Heckenschnitt, Winterdienst, Laub.</p><span class="go">Mehr →</span></a><a class="card" href="/fensterreinigung/"><h3>Reinigung</h3><p>Fenster, Terrasse &amp; Pflaster, Dachrinne, Photovoltaik.</p><span class="go">Mehr →</span></a><a class="card" href="/entruempelung/"><h3>Entrümpelung &amp; Auflösung</h3><p>Keller, Wohnung, Haushaltsauflösung, Umzugshilfe.</p><span class="go">Mehr →</span></a><a class="card" href="/hausmeisterservice/"><h3>Hausmeister &amp; Gewerbe</h3><p>Hausmeisterdienst, Gebäude- und Unterhaltsreinigung.</p><span class="go">Mehr →</span></a></div></div></section>
<section class="sec section-alt"><div class="wrap"><div class="prose wide rv"><h2>Unser Servicegebiet</h2><p>Wir sind in ${esc(nap.city)} zuhause und im gesamten Havelland sowie im angrenzenden Berliner Umland für Sie da — von Falkensee über Dallgow-Döberitz, Brieselang, Nauen und Oberkrämer bis Oranienburg, Hennigsdorf und an den Berliner Rand nach Kladow, Gatow und Spandau. Kurze Wege bedeuten schnelle Reaktion und planbare Termine.</p><p>Eine Übersicht aller Orte mit den jeweiligen Leistungen finden Sie auf der Seite <a href="/standorte/">Standorte</a>.</p><h2>Unsere Garantien</h2><p>Wir versprechen nichts, was wir nicht halten. Je Leistung gibt es eine konkrete Zusage — ein paar Beispiele:</p><ul><li><strong>Heckenschnitt:</strong> Bleiben Schnittreste liegen, kommen wir kostenlos nach.</li><li><strong>Fensterreinigung:</strong> Schlierenfrei — oder wir kommen am selben Tag nochmal.</li><li><strong>Winterdienst:</strong> Reaktionszeit-Garantie, sonst anteilige Erstattung.</li><li><strong>Entrümpelung:</strong> Festpreis nach Besichtigung — kein Aufpreis, egal wie viel rausgeht.</li></ul><p>Die vollständige Garantie steht jeweils auf der passenden <a href="/leistungen/">Leistungsseite</a>.</p></div></div></section>
${faqBlock([
  {q:'Bekomme ich einen Nachweis über die ausgeführte Arbeit?',a:'Ja. Nach jedem Auftrag dokumentieren wir das Ergebnis mit Vorher-/Nachher-Fotos und schicken sie Ihnen per WhatsApp. So sehen Sie genau, was gemacht wurde, auch wenn Sie nicht vor Ort waren.'},
  {q:'Was kostet die Besichtigung?',a:'Die Vor-Ort-Besichtigung ist kostenlos und unverbindlich. Wir schauen uns an, was ansteht, und nennen Ihnen danach einen Festpreis. Erst wenn Sie zusagen, legen wir los.'},
  {q:'Kommt zum Festpreis noch Mehrwertsteuer dazu?',a:'Nein. Als Kleinunternehmer nach § 19 UStG weisen wir keine Umsatzsteuer aus. Der vereinbarte Festpreis ist der Endpreis, mit dem Sie sicher planen können.'},
  {q:'In welchen Orten sind Sie tätig?',a:`Wir arbeiten im gesamten Havelland und im angrenzenden Berliner Umland, mit Sitz in ${nap.city}. Eine Übersicht aller bedienten Orte finden Sie auf der Seite Standorte.`},
  {q:'Wie schnell bekomme ich eine Antwort?',a:'Schreiben Sie uns tagsüber eine WhatsApp mit ein paar Fotos, melden wir uns meist innerhalb weniger Stunden zurück und stimmen einen Termin ab.'},
])}
${endBand}`;
  write(url, head(`Über uns — ${nap.name}`, mkMeta(`Haus- & Gartenservice Havelland aus ${nap.city}, geführt von ${nap.inhaber} und Partner. Wir packen selbst mit an: Festpreis ohne Mehrwertsteuer, Foto-Nachweis nach jedem Auftrag.`), url, `${orgSchema()},${breadcrumb([{name:'Start',url:'/'},{name:'Über uns',url}])}`) + header + main + footer + SCTA_DEFAULT + revealJS + '</body></html>');
  written.basis.push(url);
}
function bewertungen() {
  const url = '/bewertungen/';
  const r = proof.google_reviews || {};
  const hasReviews = r.count > 0 && r.rating;
  const gbp = `https://www.google.com/search?q=${encodeURIComponent(nap.name + ' ' + nap.city)}`;
  const body = hasReviews
    ? `<p>Unsere Kundinnen und Kunden bewerten uns bei Google mit <strong>${esc(r.rating)}</strong> von 5 Sternen (${esc(r.count)} Bewertungen).</p>`
    : `<p>Wir sind ein regionaler Betrieb und sammeln Bewertungen direkt bei Google. Hier zeigen wir keine erfundenen Sterne: Was zählt, ist das Ergebnis vor Ort. Nach jedem Auftrag dokumentieren wir es mit Vorher-/Nachher-Fotos und schicken sie Ihnen per WhatsApp — Sie sehen, was Sie bekommen, ohne sich auf Werbeversprechen verlassen zu müssen.</p>
<h3>Schon mit uns gearbeitet?</h3><p>Über eine ehrliche Bewertung bei Google freuen wir uns. Sie hilft anderen Nachbarn in der Region, einen verlässlichen Ansprechpartner zu finden.</p>`;
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>Bewertungen</div>
<section class="phero" style="padding-bottom:24px"><div class="wrap"><span class="kick rv in" style="color:var(--green)">Bewertungen</span><h1 class="rv in d1">Bewertungen &amp; <em>Erfahrungen</em></h1><p class="lead rv in d2">Echte Ergebnisse statt großer Worte — und der Weg, uns selbst zu bewerten.</p></div></section>
<section class="sec" style="padding-top:24px"><div class="wrap"><div class="prose rv">${body}<p style="margin-top:24px"><a class="btn btn-acc" href="${gbp}" rel="nofollow">Bei Google bewerten</a></p></div></div></section>
${endBand}`;
  write(url, head(`Bewertungen — ${nap.name}`, mkMeta(`Bewertungen und Erfahrungen zum Haus- & Gartenservice Havelland in ${nap.city}: Foto-Nachweis nach jedem Auftrag statt erfundener Sterne.`), url, `${orgSchema()},${breadcrumb([{name:'Start',url:'/'},{name:'Bewertungen',url}])}`) + header + main + footer + SCTA_DEFAULT + revealJS + '</body></html>');
  written.basis.push(url);
}
function danke() {
  const url = '/danke/';
  const main = `<section class="phero"><div class="wrap center" style="text-align:center"><span class="kick rv in" style="color:var(--green);justify-content:center;display:inline-flex">Anfrage eingegangen</span><h1 class="rv in d1" style="margin:0 auto">Danke für Ihre <em>Anfrage</em></h1><p class="lead rv in d2" style="margin:20px auto 28px">Wir haben Ihre Anfrage erhalten und melden uns schnell, meist noch am selben Tag. Bei dringenden Fällen erreichen Sie uns direkt.</p><div class="cta-row rv in d3" style="justify-content:center"><a class="btn btn-acc" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a><a class="btn btn-line" href="${waHref('Hallo, ich hatte gerade eine Anfrage über die Website gesendet.')}">WhatsApp</a></div><p class="rv" style="margin-top:28px"><a href="/leistungen/">Alle Leistungen ansehen</a> · <a href="/ratgeber/">Zum Ratgeber</a></p></div></section>`;
  write(url, head(`Danke — ${nap.name}`, `Danke für Ihre Anfrage beim Haus- & Gartenservice Havelland. Wir melden uns schnell.`, url, orgSchema(), { noindex: true }) + header + main + footer + SCTA_DEFAULT + revealJS + '</body></html>');
  written.basis.push(url);
}
function notFound() {
  const main = `<section class="phero"><div class="wrap center" style="text-align:center"><span class="kick rv in" style="color:var(--green);justify-content:center;display:inline-flex">Fehler 404</span><h1 class="rv in d1" style="margin:0 auto">Diese Seite gibt es <em>nicht (mehr)</em></h1><p class="lead rv in d2" style="margin:20px auto 28px">Der Link ist vielleicht veraltet oder vertippt. Hier kommen Sie weiter:</p><div class="cta-row rv in d3" style="justify-content:center"><a class="btn btn-acc" href="/leistungen/">Alle Leistungen</a><a class="btn btn-line" href="/kontakt/">Kontakt</a></div><p class="rv" style="margin-top:24px"><a href="/">Startseite</a> · <a href="/standorte/">Standorte</a> · <a href="/ratgeber/">Ratgeber</a></p></div></section>`;
  const htmlDoc = head(`Seite nicht gefunden — ${nap.name}`, `Die aufgerufene Seite wurde nicht gefunden. Zurück zu den Leistungen des Haus- & Gartenservice Havelland.`, '/404.html', orgSchema(), { noindex: true }) + header + main + footer + SCTA_DEFAULT + revealJS + '</body></html>';
  fs.writeFileSync('website/404.html', htmlDoc); // Vercel Custom-404 (Output-Root)
}

// ---------- SITEMAPS ----------
function sitemaps() {
  const sm = (name, urls) => { const x = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`<url><loc>${DOMAIN}${u}</loc></url>`).join('\n')}\n</urlset>\n`; fs.writeFileSync(`website/${name}`, x); };
  sm('sitemap-services.xml', [...written.basis.filter(u=>['/','/leistungen/','/ueber-uns/','/bewertungen/','/kontakt/'].includes(u)), ...written.hubs, ...written.ortsseiten]);
  sm('sitemap-standorte.xml', [...written.orts_hubs, '/standorte/']);
  sm('sitemap-ratgeber.xml', [...written.ratgeber, '/ratgeber/']);
  const idx = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['sitemap-services.xml','sitemap-standorte.xml','sitemap-ratgeber.xml'].map(f=>`<sitemap><loc>${DOMAIN}/${f}</loc></sitemap>`).join('\n')}\n</sitemapindex>\n`;
  fs.writeFileSync('website/sitemap.xml', idx);
  fs.writeFileSync('website/robots.txt', `User-agent: *\nAllow: /\n\n# AI-Crawler erlaubt (AEO/GEO)\nUser-agent: GPTBot\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\nUser-agent: PerplexityBot\nAllow: /\nUser-agent: Google-Extended\nAllow: /\n\nSitemap: ${DOMAIN}/sitemap.xml\n`);
  // llms.txt (GEO)
  const llms = `# ${nap.name}\n\n> Haus- & Gartenservice im Havelland und Berliner Umland. Ein fester Ansprechpartner für Garten, Reinigung, Winterdienst, Entrümpelung und Hausmeisterdienste. Sitz: ${nap.city}. Festpreis nach kostenloser Besichtigung, Foto-Nachweis nach jedem Auftrag.\n\n## Leistungen\n${services.map(s=>`- [${s.name}](${DOMAIN}/${s.slug}/)`).join('\n')}\n\n## Ratgeber\n${(ratCopy.length?ratCopy:RATGEBER_FALLBACK).map(r=>`- [${r.title}](${DOMAIN}/ratgeber/${r.slug}/)`).join('\n')}\n\n## Kontakt\n- Telefon: ${nap.phone_display}\n- Ort: ${nap.street}, ${nap.zip} ${nap.city}\n`;
  fs.writeFileSync('website/llms.txt', llms);
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
