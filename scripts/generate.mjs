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
const fixHtml = s => { let p = String(s == null ? '' : s), c; do { c = p; p = p.replace(/&amp;(amp;|lt;|gt;|quot;|#0*39;|nbsp;)/gi, '&$1'); } while (p !== c); return p.replace(/<\/li><\/(strong|em|b|i)>/gi, '</$1></li>'); };
const _pa = v => Array.isArray(v) ? v.map(plain) : (v != null ? plain(v) : v);
function sanHub(h) { for (const k of ['title','meta','h1','h1_em','intro','definition','naehe','ablauf','garantie_text','ortsseite_lead']) if (h[k] != null) h[k] = plain(h[k]); if (h.sections) for (const s of h.sections) { s.h3 = plain(s.h3); s.body = plain(s.body); } if (h.faqs) for (const f of h.faqs) { f.q = plain(f.q); f.a = plain(f.a); } return h; }
function sanArch(a) { a.rahmen = _pa(a.rahmen); a.trust = _pa(a.trust); if (a.faqs) for (const f of a.faqs) { f.q = plain(f.q); f.a = plain(f.a); } return a; }
function sanRat(r) { for (const k of ['title','meta','lead','intro','cta_text']) if (r[k] != null) r[k] = plain(r[k]); if (r.sections) for (const s of r.sections) { s.h2 = plain(s.h2); s.body_html = fixHtml(s.body_html); } if (r.faqs) for (const f of r.faqs) { f.q = plain(f.q); f.a = plain(f.a); } return r; }
function sanOrt(o) { if (o.hook) o.hook = plain(o.hook); if (o.nachbarorte) o.nachbarorte = o.nachbarorte.map(plain); return o; }

const _hubArr = CP('hubs.json'); const hubCopy = {}; if (_hubArr) for (const h of (_hubArr.hubs || _hubArr)) hubCopy[h.slug] = sanHub(h);
const _archArr = CP('archetypes.json'); const archCopy = {}; if (_archArr) for (const a of (_archArr.archetypes || _archArr)) archCopy[a.key] = sanArch(a);
const _ratArr = CP('ratgeber.json'); const ratCopy = ((_ratArr && (_ratArr.ratgeber || _ratArr)) || []).map(sanRat);
const _orteCp = CP('orte.json'); const orteCopy = (_orteCp && _orteCp.orte) || {}; for (const k in orteCopy) sanOrt(orteCopy[k]);

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

const esc = t => (t == null ? '' : String(t)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
// sj: JSON-LD-String-Wert — rohes & (kein HTML-Escape), aber < -> < (kein </script>-Ausbruch) + JSON-escape
const sj = v => String(v == null ? '' : decEnt(v)).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/</g, '\\u003c').replace(/[\r\n\t]+/g, ' ');
const leaf = cls => `<svg class="${cls}" viewBox="0 0 100 100"><path fill="currentColor" d="M90 10C38 12 10 42 10 92c32-2 52-15 63-35 2 15-3 27-3 27s20-23 20-54c0-10-2-21 0-20Z"/></svg>`;
const tel = nap.phone_e164; const waHref = q => `https://wa.me/${tel.replace('+','')}?text=${encodeURIComponent(q)}`;
const ctaA = '<a class="btn btn-acc" href="/kontakt/">Kostenlose Besichtigung anfragen</a>';

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
const META_TAIL = ' Festpreis nach kostenloser Besichtigung, Foto-Nachweis nach jedem Auftrag, ein fester Ansprechpartner im Havelland. Jetzt kostenlos anfragen.';
function mkMeta(s) {
  s = (s || '').replace(/\s+/g, ' ').trim();
  let t = rlen(s) < 150 ? s + META_TAIL : s;            // zu kurz → langen Tail anhängen
  while (rlen(t) > 158) { const sp = t.lastIndexOf(' '); if (sp < 110) break; t = t.slice(0, sp); }
  return t.replace(/[ ,;:.–-]+$/, '') + '.';
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

function head(title, desc, canonical, schemaGraph) {
  return `<!doctype html><html lang="de"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${DOMAIN}${canonical}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${DOMAIN}${canonical}"><meta property="og:type" content="website"><meta property="og:locale" content="de_DE">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500;1,9..144,600;1,9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/site.css">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[${schemaGraph}]}</script>
</head><body>`;
}
const header = `<header><div class="wrap nav"><a href="/"><img src="/assets/img/logo.png" alt="${esc(nap.name)}" width="180" height="50"></a><div class="links"><a href="/leistungen/">Leistungen</a><a href="/standorte/">Standorte</a><a href="/ratgeber/">Ratgeber</a><a href="/kontakt/">Kontakt</a></div><a class="cta" href="/kontakt/">Besichtigung anfragen</a></div></header>`;
const footer = `<footer><div class="wrap"><span>${esc(nap.name)} · ${esc(nap.street||'')}, ${esc(nap.zip||'')} ${esc(nap.city)} · ${esc(nap.phone_display)}</span><span><a href="/leistungen/">Leistungen</a> · <a href="/standorte/">Standorte</a> · <a href="/ratgeber/">Ratgeber</a> · <a href="/impressum/">Impressum</a> · <a href="/datenschutz/">Datenschutz</a></span></div></footer>`;
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
<section class="proof"><div class="grid"><div class="pic rv"><img src="/assets/img/terrasse.png" alt="Vorher / Nachher" width="700" height="500"><div class="tags"><span>Vorher</span><span class="acc">Nachher</span></div></div><div class="txt"><h2 class="serif rv">Nachweis, <em>nicht Versprechen.</em></h2><p class="rv d1">Nach jedem Auftrag bekommen Sie Vorher/Nachher-Fotos per WhatsApp. Sie sehen das Ergebnis — auch wenn Sie nicht dabei waren.</p><p class="q rv d2">„Wenn nach unserer Reinigung noch sichtbarer Moos- oder Algenbelag bleibt — wir kommen nochmal. Kostenlos."</p></div></div></section>
${endBand}`;
  write('/', head(`${nap.name} — aus einer Hand`, mkMeta('Garten, Reinigung, Winterdienst und Entrümpelung im Havelland. Ein fester Ansprechpartner, Festpreis nach Besichtigung, Foto-Nachweis nach jedem Auftrag.'), '/', orgSchema()) + header + main + footer + revealJS + '</body></html>');
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
<section class="phero">${leaf('hleaf')}<div class="wrap grid"><div><span class="kick rv in" style="color:var(--green)">Leistung</span><h1 class="rv in d1">${h1}</h1><p class="lead rv in d2">${lead}</p><div class="cta-row rv in d3">${ctaA}<a class="btn btn-line" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a></div></div>
<div class="shot rv in d2"><img class="main" src="/assets/img/hero-garten.png" alt="${esc(s.name)} im Havelland" width="640" height="480"><div class="badge"><span class="ic">${leaf('')}</span><span class="t">Foto-Nachweis<span>nach jedem Auftrag</span></span></div></div></div></section>
<section class="sec"><div class="wrap"><div class="prose wide rv">${definition}${sektionenHtml}${naehe}${ablauf}<h3>Unsere Garantie</h3><p>${esc(garantieTxt)}</p></div></div></section>
${cardOrte.length ? `<section class="sec section-alt"><div class="wrap"><div class="head"><h2 class="serif rv">${esc(s.name)} in Ihrem Ort</h2></div><div class="cards rv">${cards}</div></div></section>` : ''}
${faqBlock(c && c.faqs)}
${endBand}`;
  write(url, head(title, meta, url, schema) + header + main + footer + revealJS + '</body></html>');
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

  // Body aus Copy-Schicht (mit Fallback)
  const lead = c && c.ortsseite_lead ? fillTok(c.ortsseite_lead, o, oc) : `Ihr ${esc(s.name)} in ${esc(o.name)} — vom Haus- & Gartenservice Havelland.`;
  const hook = oc && oc.hook ? `<p>${esc(oc.hook)}</p>` : '';
  const rahmen = arch && arch.rahmen ? `<p>${esc(fillTok(arch.rahmen, o, oc))}</p>` : '';
  const definition = c && c.definition ? `<p>${esc(c.definition)}</p>` : '';
  const sektionen = (s.sektionen || []).map(x => `<li>${esc(x)}</li>`).join('');
  const ortsteile = (o.ortsteile && o.ortsteile.length) ? `<p>Auch in ${esc(o.ortsteile.join(', '))} und Umgebung sind wir für Sie da.</p>` : '';
  const trust = arch && arch.trust ? `<p>${esc(fillTok(arch.trust, o, oc))}</p>` : `<p>Kostenlose Besichtigung, danach ein Festpreis ohne Nachkommen — und nach dem Auftrag Vorher/Nachher-Fotos per WhatsApp.</p>`;

  // FAQ: 2 rotierte Hub-FAQ + alle Archetyp-FAQ ({ort}-gefüllt) → variiert je Ort
  const hubFaqs = c && c.faqs ? rotate(c.faqs, seed, 2) : [];
  const archFaqs = arch && arch.faqs ? arch.faqs.map(f => ({ q: fillTok(f.q, o, oc), a: fillTok(f.a, o, oc) })) : [];
  const faqs = [...archFaqs, ...hubFaqs];

  const title = clampTitle(`${s.name} ${o.name}${(s.name.length + o.name.length) < 34 ? ' – Havelland' : ''}`);
  const meta = mkMeta(`${s.name} in ${o.name}${o.plz?` (${o.plz})`:''}: lokal, Festpreis nach kostenloser Besichtigung, Foto-Nachweis, ein fester Ansprechpartner.`);

  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span><a href="/${s.slug}/">${esc(s.name)}</a><span class="sep">›</span>${esc(o.name)}</div>
<section class="phero">${leaf('hleaf')}<div class="wrap grid"><div><span class="kick rv in" style="color:var(--green)">${esc(o.name)}${o.plz?` · ${esc(o.plz)}`:''}</span><h1 class="rv in d1">${esc(s.name)} <em>in ${esc(o.name)}</em></h1><p class="lead rv in d2">${esc(lead)}</p><div class="cta-row rv in d3">${ctaA}<a class="btn btn-line" href="${waHref(`Hallo, ich brauche ${s.name} in ${o.name}.`)}">WhatsApp</a></div></div>
<div class="shot rv in d2"><img class="main" src="/assets/img/hero-garten.png" alt="${esc(s.name)} in ${esc(o.name)}" width="640" height="480"><div class="badge"><span class="ic">${leaf('')}</span><span class="t">Vor Ort in ${esc(o.name)}<span>schnelle Reaktion</span></span></div></div></div></section>
<section class="sec"><div class="wrap"><div class="prose wide rv"><h2>${esc(s.name)} in ${esc(o.name)} — zuverlässig &amp; lokal</h2>${hook}${rahmen}${definition}${sektionen?`<h3>Was dazugehört</h3><ul>${sektionen}</ul>`:''}${ortsteile}<h3>Festpreis &amp; Foto-Nachweis</h3>${trust}</div></div></section>
<section class="sec section-alt"><div class="wrap"><div class="head"><h2 class="serif rv">${esc(s.name)} in der Nähe</h2></div><div class="cards rv">${nahCards.map(n=>`<a class="card" href="/${s.slug}-${n.slug}/"><h3>${esc(s.name)} ${esc(n.name)}</h3><span class="go">Mehr →</span></a>`).join('')}${servicesForOrt(o).length>=3?`<a class="card" href="/standorte/${o.slug}/"><h3>Alle Leistungen in ${esc(o.name)}</h3><span class="go">Zum Ort →</span></a>`:`<a class="card" href="/${s.slug}/"><h3>Mehr zu ${esc(s.name)}</h3><span class="go">Zur Leistung →</span></a>`}</div></div></section>
${faqBlock(faqs)}
${endBand}`;
  write(url, head(title, meta, url, schema) + header + main + footer + revealJS + '</body></html>');
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
  write(url, head(clampTitle(`Haus- & Gartenservice ${o.name}`), mkMeta(`Haus- & Gartenservice in ${o.name}${o.plz?` (${o.plz})`:''}: Garten, Reinigung, Winterdienst, Entrümpelung von einem festen Ansprechpartner.`), url, schema) + header + main + footer + revealJS + '</body></html>');
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
  const bodyHtml = (r.sections || []).map(x => `<h2>${esc(x.h2)}</h2>${x.body_html || ''}`).join('');
  const faqHtml = (r.faqs && r.faqs.length) ? `<h2>Häufige Fragen</h2>${r.faqs.map(f=>`<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}` : '';
  const schema = `${orgSchema()},{"@type":"Article","@id":"${DOMAIN}${url}#article","headline":"${esc(r.title)}","inLanguage":"de","author":{"@id":"${DOMAIN}/#organization"},"publisher":{"@id":"${DOMAIN}/#organization"},"mainEntityOfPage":"${DOMAIN}${url}"},${breadcrumb([{name:'Start',url:'/'},{name:'Ratgeber',url:'/ratgeber/'},{name:r.title,url}])}`;
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span><a href="/ratgeber/">Ratgeber</a><span class="sep">›</span>${esc(r.title)}</div>
<section class="phero" style="border-bottom:none;padding-bottom:20px"><div class="wrap"><span class="kick rv in" style="color:var(--green)">Ratgeber</span><h1 class="rv in d1" style="max-width:16em">${esc(r.title)}</h1><p class="lead rv in d2">${esc(r.lead)}</p></div></section>
<section class="sec" style="padding-top:20px"><div class="wrap"><div class="prose rv">${r.intro?`<p class="ratgeber-intro"><strong>${esc(r.intro)}</strong></p>`:''}${bodyHtml}<div class="faq" style="margin-top:24px">${faqHtml}</div></div></div></section>
<section class="sec section-alt"><div class="wrap center"><a class="btn btn-acc" href="/${r.cta_service}/">${esc(r.cta_text || `Zu ${svc.name||'unserer Leistung'}`)} →</a></div></section>
${endBand}`;
  write(url, head(clampTitle(r.title), mkMeta(r.meta || r.lead), url, schema) + header + main + footer + revealJS + '</body></html>');
  written.ratgeber.push(url);
}

// ---------- BASIS: Leistungen / Standorte / Ratgeber-Index / Kontakt / Recht ----------
function listingPage(url, title, intro, cardsHtml, schema) {
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>${esc(title)}</div>
<section class="phero" style="padding-bottom:24px"><div class="wrap"><h1 class="rv in d1">${esc(title)}</h1><p class="lead rv in d2">${esc(intro)}</p></div></section>
<section class="sec" style="padding-top:24px"><div class="wrap"><div class="cards rv">${cardsHtml}</div></div></section>${endBand}`;
  write(url, head(clampTitle(`${title} — ${nap.name}`), mkMeta(`${intro} ${nap.name} im Havelland und Berliner Umland.`), url, schema) + header + main + footer + revealJS + '</body></html>');
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
  // Kontakt
  const kontaktMain = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>Kontakt</div>
<section class="phero"><div class="wrap"><h1 class="rv in d1">Kontakt &amp; <em>kostenlose Besichtigung</em></h1><p class="lead rv in d2">Sagen Sie uns, was ansteht — wir melden uns schnell.</p><div class="cta-row rv in d3"><a class="btn btn-acc" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a><a class="btn btn-line" href="${waHref('Hallo, ich hätte gern eine Besichtigung.')}">WhatsApp</a></div><div class="chips rv"><span>${esc(nap.name)}</span><span>${esc(nap.street||'')}, ${esc(nap.zip||'')} ${esc(nap.city)}</span></div></div></section>${endBand}`;
  write('/kontakt/', head(`Kontakt — ${nap.name}`, mkMeta(`Kontakt zum Haus- & Gartenservice Havelland in ${nap.city}: ${nap.phone_display}, WhatsApp, kostenlose Vor-Ort-Besichtigung mit Festpreis.`), '/kontakt/', `${orgSchema()},${breadcrumb([{name:'Start',url:'/'},{name:'Kontakt',url:'/kontakt/'}])}`) + header + kontaktMain + footer + revealJS + '</body></html>');
  written.basis.push('/kontakt/');
  for (const [slug, t] of [['impressum','Impressum'],['datenschutz','Datenschutz']]) {
    const metaTxt = `${t} — ${nap.name}, ${nap.street}, ${nap.zip} ${nap.city}. Kleinunternehmer nach §19 UStG. Telefon ${nap.phone_display}.`;
    const m = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>${t}</div><section class="phero" style="padding-bottom:24px"><div class="wrap"><h1 class="rv in d1">${t}</h1></div></section><section class="sec" style="padding-top:24px"><div class="wrap"><div class="prose rv"><p><em>Platzhalter — Rechtstext folgt (§5 TMG / DSGVO). Kleinunternehmer §19 UStG.</em></p><p>${esc(nap.name)}<br>${esc(nap.street||'')}<br>${esc(nap.zip||'')} ${esc(nap.city)}<br>${esc(nap.phone_display)}</p></div></div></section>${endBand}`;
    write(`/${slug}/`, head(`${t} — ${nap.name}`, mkMeta(metaTxt), `/${slug}/`, orgSchema()) + header + m + footer + revealJS + '</body></html>');
    written.basis.push(`/${slug}/`);
  }
}

// ---------- SITEMAPS ----------
function sitemaps() {
  const sm = (name, urls) => { const x = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`<url><loc>${DOMAIN}${u}</loc></url>`).join('\n')}\n</urlset>\n`; fs.writeFileSync(`website/${name}`, x); };
  sm('sitemap-services.xml', [...written.basis.filter(u=>u==='/'||u==='/leistungen/'), ...written.hubs, ...written.ortsseiten]);
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
if (FULL) {
  for (const s of services) if (PAGE_SVC.has(s.slug)) for (const o of orteForService(s)) ortsseite(s, o);
} else {
  for (const [ss, os] of SAMPLE_ORTSSEITEN) { const s = services.find(x=>x.slug===ss), o = orte.find(x=>x.slug===os); if (s && o) ortsseite(s, o); }
}
sitemaps();
fs.cpSync('assets', 'website/assets', { recursive: true });
const total = written.basis.length + written.hubs.length + written.ortsseiten.length + written.orts_hubs.length + written.ratgeber.length;
console.log(`Generiert (${FULL?'FULL':'SAMPLE'}): ${written.basis.length} Basis + ${written.hubs.length} Hubs + ${written.ortsseiten.length} Ortsseiten + ${written.orts_hubs.length} Orts-Hubs + ${written.ratgeber.length} Ratgeber = ${total} Seiten`);
