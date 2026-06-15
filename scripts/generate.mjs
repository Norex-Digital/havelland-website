// Havelland Static-Site-Generator — Node, zero deps. Run: node scripts/generate.mjs  (FULL=1 für alle Ortsseiten)
// Liest data/*.json, rendert gegen havelland-design (site.css), schreibt website/ + Sitemaps. Kein FAQPage-JSON-LD.
import fs from 'fs';

const J = f => JSON.parse(fs.readFileSync(`data/${f}`, 'utf8'));
const services = J('services.json').services;
const loc = J('locations.json'); const orte = loc.orte; const ortsteileVon = loc._meta.ortsteile_von || {};
const nap = J('nap.json'); const config = J('config.json'); const proof = J('proof.json');
const DOMAIN = config.domain.replace(/\/$/, '');
const FULL = !!process.env.FULL;

const PAGE_SVC = new Set(['heckenschnitt','gartenpflege','fensterreinigung','entruempelung','winterdienst','steinreinigung','dachrinnenreinigung','hausmeisterservice','gebaeudereinigung','unterhaltsreinigung','ferienwohnung-reinigung']);
const PREMIUM = new Set(['gross-glienicke','berlin-kladow','berlin-gatow']);
const sectionOT = new Set(Object.keys(ortsteileVon).filter(s => !PREMIUM.has(s)));
const launch = orte.filter(o => o.geo === 'A' || o.geo === 'B');
const haupt = launch.filter(o => !sectionOT.has(o.slug));
const segMatch = (s, o) => s.segment.some(x => o.typ.includes(x));
const orteForService = s => haupt.filter(o => s.orte_fix ? s.orte_fix.includes(o.slug) : segMatch(s, o));
const servicesForOrt = o => services.filter(s => PAGE_SVC.has(s.slug) && (s.orte_fix ? s.orte_fix.includes(o.slug) : segMatch(s, o)));

const esc = t => (t == null ? '' : String(t)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const leaf = cls => `<svg class="${cls}" viewBox="0 0 100 100"><path fill="currentColor" d="M90 10C38 12 10 42 10 92c32-2 52-15 63-35 2 15-3 27-3 27s20-23 20-54c0-10-2-21 0-20Z"/></svg>`;
const tel = nap.phone_e164; const waHref = q => `https://wa.me/${tel.replace('+','')}?text=${encodeURIComponent(q)}`;
const ctaA = '<a class="btn btn-acc" href="/kontakt/">Kostenlose Besichtigung anfragen</a>';

const written = { hubs: [], ortsseiten: [], orts_hubs: [], ratgeber: [], basis: [] };

function orgSchema() {
  const addr = nap.street ? `,"address":{"@type":"PostalAddress","streetAddress":"${esc(nap.street)}","postalCode":"${esc(nap.zip)}","addressLocality":"${esc(nap.city)}","addressCountry":"DE"}` : '';
  return `{"@type":"LocalBusiness","@id":"${DOMAIN}/#organization","name":"${esc(nap.name)}","telephone":"${tel}","url":"${DOMAIN}/"${addr},"areaServed":${JSON.stringify(haupt.map(o=>o.name))}}`;
}
function breadcrumb(items) { // [{name,url}]
  const li = items.map((it,i)=>`{"@type":"ListItem","position":${i+1},"name":"${esc(it.name)}"${it.url?`,"item":"${DOMAIN}${it.url}"`:''}}`).join(',');
  return `{"@type":"BreadcrumbList","itemElement":[${li}]}`.replace('itemElement','itemListElement');
}

function head(title, desc, canonical, schemaGraph) {
  return `<!doctype html><html lang="de"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${DOMAIN}${canonical}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${DOMAIN}${canonical}"><meta property="og:type" content="website">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500;1,9..144,600;1,9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/site.css">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[${schemaGraph}]}</script>
</head><body>`;
}
const header = `<header><div class="wrap nav"><a href="/"><img src="/assets/img/logo.png" alt="${esc(nap.name)}"></a><div class="links"><a href="/leistungen/">Leistungen</a><a href="/standorte/">Standorte</a><a href="/kontakt/">Kontakt</a></div><a class="cta" href="/kontakt/">Besichtigung anfragen</a></div></header>`;
const footer = `<footer><div class="wrap"><span>${esc(nap.name)} · ${esc(nap.street||'')}, ${esc(nap.zip||'')} ${esc(nap.city)} · ${esc(nap.phone_display)}</span><span><a href="/impressum/">Impressum</a> · <a href="/datenschutz/">Datenschutz</a></span></div></footer>`;
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
<div class="shot rv in d2"><img class="main" src="/assets/img/hero-garten.png" alt="Gepflegter Garten im Havelland"><div class="chip2">Foto-Nachweis</div><div class="badge"><span class="ic">${leaf('')}</span><span class="t">Vorher / Nachher<span>per WhatsApp, nach jedem Auftrag</span></span></div></div>
</div></section>
<section class="band">${leaf('leaf')}<div class="wrap"><p class="lead2 rv">Kein Suchen, kein Koordinieren, kein Risiko mit Fremden — <em>ein Anruf, alles erledigt.</em></p>
<div class="vals"><div class="v rv d1"><h4><span class="n">01</span> Aus einer Hand</h4><p>Garten, Reinigung, Winterdienst, Entrümpelung — ein Ansprechpartner für alles.</p></div><div class="v rv d2"><h4><span class="n">02</span> Nachweis statt Versprechen</h4><p>Foto-Dokumentation nach jedem Auftrag, direkt aufs Handy.</p></div><div class="v rv d3"><h4><span class="n">03</span> Festpreis</h4><p>Kostenlose Besichtigung, klarer Preis — kein Nachkommen.</p></div><div class="v rv d4"><h4><span class="n">04</span> Schnell erreichbar</h4><p>WhatsApp-Antwort in Stunden, nicht in Tagen.</p></div></div></div></section>
<section class="sec"><div class="wrap"><div class="head"><h2 class="serif rv">Was wir machen</h2><a class="rv" href="/leistungen/">Alle Leistungen →</a></div><p class="intro rv">Vom regelmäßigen Garten bis zum einmaligen Großeinsatz — koordiniert von einem festen Ansprechpartner.</p><div class="list">${items}</div></div></section>
<section class="proof"><div class="grid"><div class="pic rv"><img src="/assets/img/terrasse.png" alt="Vorher / Nachher"><div class="tags"><span>Vorher</span><span class="acc">Nachher</span></div></div><div class="txt"><h2 class="serif rv">Nachweis, <em>nicht Versprechen.</em></h2><p class="rv d1">Nach jedem Auftrag bekommen Sie Vorher/Nachher-Fotos per WhatsApp. Sie sehen das Ergebnis — auch wenn Sie nicht dabei waren.</p><p class="q rv d2">„Wenn nach unserer Reinigung noch sichtbarer Moos- oder Algenbelag bleibt — wir kommen nochmal. Kostenlos."</p></div></div></section>
${endBand}`;
  write('/', head(`${nap.name} — alles aus einer Hand im Havelland`, 'Garten, Reinigung, Winterdienst & Entrümpelung im Havelland. Ein Ansprechpartner, Festpreis nach Besichtigung, Foto-Nachweis. Jetzt kostenlos anfragen.', '/', orgSchema()) + header + main + footer + revealJS + '</body></html>');
}

// ---------- SERVICE-HUB ----------
function hub(s) {
  const url = `/${s.slug}/`;
  const orteList = orteForService(s);
  const cards = orteList.slice(0, FULL ? 999 : 12).map(o => `<a class="card" href="/${s.slug}-${o.slug}/"><h3>${esc(s.name)} ${esc(o.name)}</h3><p>${esc(s.name)} in ${esc(o.name)} — lokal, Festpreis, Foto-Nachweis.</p><span class="go">Mehr →</span></a>`).join('');
  const sektionen = (s.sektionen || []).map(x => `<h3>${esc(x)}</h3><p>${esc(x)} als Teil unserer ${esc(s.name)} — sauber ausgeführt, mit Foto-Nachweis.</p>`).join('');
  const schema = `${orgSchema()},{"@type":"Service","@id":"${DOMAIN}${url}#service","name":"${esc(s.name)}","serviceType":"${esc(s.name)}","provider":{"@id":"${DOMAIN}/#organization"},"areaServed":${JSON.stringify(orteList.map(o=>o.name))}},${breadcrumb([{name:'Start',url:'/'},{name:s.name,url}])}`;
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>${esc(s.name)}</div>
<section class="phero">${leaf('hleaf')}<div class="wrap grid"><div><span class="kick rv in" style="color:var(--green)">Leistung</span><h1 class="rv in d1">${esc(s.name)} <em>im Havelland</em></h1><p class="lead rv in d2">${esc(s.garantie || 'Festpreis nach Besichtigung, Foto-Nachweis nach jedem Auftrag.')}</p><div class="cta-row rv in d3">${ctaA}<a class="btn btn-line" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a></div></div>
<div class="shot rv in d2"><img class="main" src="/assets/img/hero-garten.png" alt="${esc(s.name)}"><div class="badge"><span class="ic">${leaf('')}</span><span class="t">Foto-Nachweis<span>nach jedem Auftrag</span></span></div></div></div></section>
<section class="sec"><div class="wrap"><div class="prose wide rv"><h2>${esc(s.name)} vom Haus- &amp; Gartenservice Havelland</h2><p>Wir übernehmen ${esc(s.name)} im gesamten Havelland und Berliner Umland — mit festem Ansprechpartner, klarem Festpreis nach Besichtigung und Foto-Dokumentation nach jedem Auftrag.</p>${sektionen}</div></div></section>
${orteList.length ? `<section class="sec section-alt"><div class="wrap"><div class="head"><h2 class="serif rv">${esc(s.name)} in Ihrem Ort</h2></div><div class="cards rv">${cards}</div></div></section>` : ''}
${endBand}`;
  write(url, head(`${s.name} im Havelland — ${nap.name}`, `${s.name} im Havelland & Falkensee: Festpreis nach Besichtigung, Foto-Nachweis, ein Ansprechpartner. Jetzt kostenlos anfragen.`, url, schema) + header + main + footer + revealJS + '</body></html>');
  written.hubs.push(url);
}

// ---------- ORTSSEITE ----------
function ortsseite(s, o) {
  const url = `/${s.slug}-${o.slug}/`;
  const nachbarn = orteForService(s).filter(x => x.slug !== o.slug).slice(0, 4);
  const place = `{"@type":"Place","name":"${esc(o.name)}"${o.plz?`,"address":{"@type":"PostalAddress","postalCode":"${esc(o.plz)}","addressLocality":"${esc(o.name)}","addressCountry":"DE"}`:''}}`;
  const schema = `${orgSchema()},{"@type":"Service","@id":"${DOMAIN}${url}#service","name":"${esc(s.name)} ${esc(o.name)}","serviceType":"${esc(s.name)}","provider":{"@id":"${DOMAIN}/#organization"},"areaServed":${place}},${breadcrumb([{name:'Start',url:'/'},{name:s.name,url:`/${s.slug}/`},{name:o.name,url}])}`;
  const sektionen = (s.sektionen || []).map(x => `<li>${esc(x)}</li>`).join('');
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span><a href="/${s.slug}/">${esc(s.name)}</a><span class="sep">›</span>${esc(o.name)}</div>
<section class="phero">${leaf('hleaf')}<div class="wrap grid"><div><span class="kick rv in" style="color:var(--green)">${esc(o.name)}${o.plz?` · ${esc(o.plz)}`:''}</span><h1 class="rv in d1">${esc(s.name)} <em>in ${esc(o.name)}</em></h1><p class="lead rv in d2">Ihr ${esc(s.name)} in ${esc(o.name)} — vom Haus- &amp; Gartenservice Havelland. Festpreis nach Besichtigung, Foto-Nachweis.</p><div class="cta-row rv in d3">${ctaA}<a class="btn btn-line" href="${waHref(`Hallo, ich brauche ${s.name} in ${o.name}.`)}">WhatsApp</a></div></div>
<div class="shot rv in d2"><img class="main" src="/assets/img/hero-garten.png" alt="${esc(s.name)} in ${esc(o.name)}"><div class="badge"><span class="ic">${leaf('')}</span><span class="t">Vor Ort in ${esc(o.name)}<span>schnelle Reaktion</span></span></div></div></div></section>
<section class="sec"><div class="wrap"><div class="prose wide rv"><h2>${esc(s.name)} in ${esc(o.name)} — zuverlässig &amp; lokal</h2><p>Sie brauchen ${esc(s.name)} in ${esc(o.name)}${o.plz?` (${esc(o.plz)})`:''}? Wir sind im Havelland zuhause, kennen die Region und sind schnell bei Ihnen. ${esc(s.garantie||'')}</p>${sektionen?`<h3>Was dazugehört</h3><ul>${sektionen}</ul>`:''}<p>Kostenlose Besichtigung, danach ein Festpreis ohne Nachkommen — und nach dem Auftrag Vorher/Nachher-Fotos per WhatsApp.</p></div></div></section>
${nachbarn.length?`<section class="sec section-alt"><div class="wrap"><div class="head"><h2 class="serif rv">${esc(s.name)} in der Nähe</h2></div><div class="cards rv">${nachbarn.map(n=>`<a class="card" href="/${s.slug}-${n.slug}/"><h3>${esc(s.name)} ${esc(n.name)}</h3><span class="go">Mehr →</span></a>`).join('')}<a class="card" href="/standorte/${o.slug}/"><h3>Alle Leistungen in ${esc(o.name)}</h3><span class="go">Zum Ort →</span></a></div></div></section>`:''}
${endBand}`;
  write(url, head(`${s.name} ${o.name} — ${nap.name}`, `${s.name} in ${o.name}${o.plz?` (${o.plz})`:''}: lokal, Festpreis nach Besichtigung, Foto-Nachweis. Jetzt kostenlos anfragen.`, url, schema) + header + main + footer + revealJS + '</body></html>');
  written.ortsseiten.push(url);
}

// ---------- ORTS-HUB ----------
function ortsHub(o) {
  const svcs = servicesForOrt(o);
  if (svcs.length < 3) return;
  const url = `/standorte/${o.slug}/`;
  const teile = (ortsteileVon ? Object.entries(ortsteileVon).filter(([,p]) => p === o.name).map(([s]) => s) : []);
  const cards = svcs.map((s,i) => `<a class="card" href="/${s.slug}-${o.slug}/"><span class="n">${String(i+1).padStart(2,'0')}</span><h3>${esc(s.name)}</h3><p>${esc(s.name)} in ${esc(o.name)}.</p><span class="go">Mehr →</span></a>`).join('');
  const schema = `${orgSchema()},{"@type":"CollectionPage","@id":"${DOMAIN}${url}#page","name":"Haus- & Gartenservice in ${esc(o.name)}","about":{"@id":"${DOMAIN}/#organization"}},${breadcrumb([{name:'Start',url:'/'},{name:'Standorte',url:'/standorte/'},{name:o.name,url}])}`;
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span><a href="/standorte/">Standorte</a><span class="sep">›</span>${esc(o.name)}</div>
<section class="phero">${leaf('hleaf')}<div class="wrap"><span class="kick rv in" style="color:var(--green)">Standort</span><h1 class="rv in d1" style="max-width:14em">Haus- &amp; Gartenservice <em>in ${esc(o.name)}</em></h1><p class="lead rv in d2">Alle Leistungen rund um Haus und Garten in ${esc(o.name)}${o.plz?` (${esc(o.plz)})`:''} — von einem festen Ansprechpartner.</p><div class="cta-row rv in d3">${ctaA}</div></div></section>
<section class="sec"><div class="wrap"><div class="head"><h2 class="serif rv">Unsere Leistungen in ${esc(o.name)}</h2></div><div class="cards rv">${cards}</div>${teile.length?`<p class="intro rv" style="margin-top:30px">Auch in ${esc(teile.join(', '))} und Umgebung.</p>`:''}</div></section>
${endBand}`;
  write(url, head(`Haus- & Gartenservice ${o.name} — ${nap.name}`, `Haus- & Gartenservice in ${o.name}: Garten, Reinigung, Winterdienst, Entrümpelung — ein Ansprechpartner, Festpreis, Foto-Nachweis.`, url, schema) + header + main + footer + revealJS + '</body></html>');
  written.orts_hubs.push(url);
}

// ---------- RATGEBER ----------
const RATGEBER = [
  { slug:'wann-hecke-schneiden', title:'Wann darf man die Hecke schneiden?', lead:'Schnittzeiten, Naturschutz und Praxis-Tipps fürs Havelland.', body:`<h2>Die wichtigsten Schnittzeiten</h2><p>Radikale Heckenschnitte sind in Deutschland von <strong>1. März bis 30. September</strong> nur eingeschränkt erlaubt (Bundesnaturschutzgesetz §39), um brütende Vögel zu schützen. Form- und Pflegeschnitte bleiben ganzjährig möglich.</p><h3>Form- vs. Radikalschnitt</h3><ul><li>Formschnitt: schonende Pflege, ganzjährig erlaubt</li><li>Radikalschnitt / Auf-den-Stock: nur Okt–Feb</li></ul><h2>Lieber machen lassen?</h2><p>Wir schneiden Ihre Hecke gerade in Form, nehmen den Grünschnitt mit und kehren sauber — Festpreis nach Besichtigung.</p>`, cta:'heckenschnitt' },
  { slug:'entruempelung-kosten', title:'Was kostet eine Entrümpelung?', lead:'Preisfaktoren, Spannen und wie Sie sparen.', body:`<h2>Wovon der Preis abhängt</h2><ul><li>Menge &amp; Volumen (Keller vs. ganze Wohnung)</li><li>Zugang (Etage, Aufzug, Parkmöglichkeit)</li><li>Entsorgungsart (Sperrmüll, Sondermüll)</li><li>verwertbare Gegenstände (werden angerechnet)</li></ul><h2>Festpreis statt Überraschung</h2><p>Wir machen eine kostenlose Besichtigung und nennen einen Festpreis — kein Aufpreis, egal wie viel am Ende rausgeht.</p>`, cta:'entruempelung' },
  { slug:'winterdienst-pflichten-brandenburg', title:'Winterdienst & Streupflicht in Brandenburg', lead:'Wer haftet, wann geräumt werden muss — und wie Sie sich absichern.', body:`<h2>Räum- und Streupflicht</h2><p>Anlieger müssen Gehwege i.d.R. werktags ab 7 Uhr (sonn-/feiertags später) räumen und bei Glätte streuen — die genaue Zeit regelt die Gemeindesatzung. Bei Stürzen haftet der Pflichtige.</p><h2>Saisonvertrag</h2><p>Mit unserem Winterschutz-Vertrag räumen und streuen wir vor 7 Uhr, mit Foto-Nachweis nach jedem Einsatz — Ihre Haftung ist abgedeckt.</p>`, cta:'winterdienst' },
  { slug:'haushaltsaufloesung-checkliste', title:'Haushaltsauflösung: Checkliste & Ablauf', lead:'Schritt für Schritt — besonders im Erb- oder Pflegefall.', body:`<h2>Ablauf in 5 Schritten</h2><ul><li>Bestandsaufnahme &amp; Wertgegenstände sichern</li><li>Wichtige Dokumente trennen</li><li>Besichtigung &amp; Festpreis</li><li>Auflösung + fachgerechte Entsorgung</li><li>besenreine Übergabe + Foto-Nachweis</li></ul><h2>Diskret &amp; vollständig</h2><p>Gerade in sensiblen Situationen arbeiten wir diskret, zuverlässig und mit klarem Festpreis.</p>`, cta:'haushaltsaufloesung' },
  { slug:'fensterreinigung-preise', title:'Fensterreinigung: Preise & Einflussfaktoren', lead:'Was die Reinigung kostet und wann sich ein Abo lohnt.', body:`<h2>Preisfaktoren</h2><ul><li>Anzahl &amp; Größe der Fenster</li><li>Erreichbarkeit (Leiter, Höhe)</li><li>Verschmutzungsgrad, Rahmen &amp; Bänke</li><li>Einmal- vs. Halbjahres-Abo</li></ul><h2>Schlierenfrei garantiert</h2><p>Innen und außen, inkl. Rahmen — und ein Halbjahres-Abo mit Prioritätstermin, damit Sie nie mehr dran denken müssen.</p>`, cta:'fensterreinigung' },
];
function ratgeber(r) {
  const url = `/ratgeber/${r.slug}/`;
  const schema = `${orgSchema()},{"@type":"Article","@id":"${DOMAIN}${url}#article","headline":"${esc(r.title)}","author":{"@id":"${DOMAIN}/#organization"},"publisher":{"@id":"${DOMAIN}/#organization"}},${breadcrumb([{name:'Start',url:'/'},{name:'Ratgeber',url:'/ratgeber/'},{name:r.title,url}])}`;
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span><a href="/ratgeber/">Ratgeber</a><span class="sep">›</span>${esc(r.title)}</div>
<section class="phero" style="border-bottom:none;padding-bottom:20px"><div class="wrap"><span class="kick rv in" style="color:var(--green)">Ratgeber</span><h1 class="rv in d1" style="max-width:16em">${esc(r.title)}</h1><p class="lead rv in d2">${esc(r.lead)}</p></div></section>
<section class="sec" style="padding-top:20px"><div class="wrap"><div class="prose rv">${r.body}</div></div></section>
<section class="sec section-alt"><div class="wrap center"><a class="btn btn-acc" href="/${r.cta}/">Zu ${esc((services.find(s=>s.slug===r.cta)||{}).name||'unserer Leistung')} →</a></div></section>
${endBand}`;
  write(url, head(`${r.title} — ${nap.name}`, esc(r.lead), url, schema) + header + main + footer + revealJS + '</body></html>');
  written.ratgeber.push(url);
}

// ---------- BASIS: Leistungen / Standorte / Kontakt / Recht ----------
function listingPage(url, title, intro, cardsHtml, schema) {
  const main = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>${esc(title)}</div>
<section class="phero" style="padding-bottom:24px"><div class="wrap"><h1 class="rv in d1">${esc(title)}</h1><p class="lead rv in d2">${esc(intro)}</p></div></section>
<section class="sec" style="padding-top:24px"><div class="wrap"><div class="cards rv">${cardsHtml}</div></div></section>${endBand}`;
  write(url, head(`${title} — ${nap.name}`, intro, url, schema) + header + main + footer + revealJS + '</body></html>');
  written.basis.push(url);
}
function basis() {
  listingPage('/leistungen/', 'Unsere Leistungen', 'Alles rund um Haus und Garten im Havelland — aus einer Hand.',
    services.map(s => `<a class="card" href="/${s.slug}/"><h3>${esc(s.name)}</h3><p>${esc((s.sektionen||[]).slice(0,3).join(' · ')||s.garantie||'')}</p><span class="go">Mehr →</span></a>`).join(''),
    `${orgSchema()},${breadcrumb([{name:'Start',url:'/'},{name:'Leistungen',url:'/leistungen/'}])}`);
  listingPage('/standorte/', 'Unsere Standorte', 'Wir sind im ganzen Havelland und Berliner Umland für Sie da.',
    haupt.filter(o=>servicesForOrt(o).length>=3).map(o => `<a class="card" href="/standorte/${o.slug}/"><h3>${esc(o.name)}</h3><p>${esc(o.plz||'')}</p><span class="go">Zum Ort →</span></a>`).join(''),
    `${orgSchema()},${breadcrumb([{name:'Start',url:'/'},{name:'Standorte',url:'/standorte/'}])}`);
  // Kontakt
  const kontaktMain = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>Kontakt</div>
<section class="phero"><div class="wrap"><h1 class="rv in d1">Kontakt &amp; <em>kostenlose Besichtigung</em></h1><p class="lead rv in d2">Sagen Sie uns, was ansteht — wir melden uns schnell.</p><div class="cta-row rv in d3"><a class="btn btn-acc" href="tel:${tel}">☎ ${esc(nap.phone_display)}</a><a class="btn btn-line" href="${waHref('Hallo, ich hätte gern eine Besichtigung.')}">WhatsApp</a></div><div class="chips rv"><span>${esc(nap.name)}</span><span>${esc(nap.street||'')}, ${esc(nap.zip||'')} ${esc(nap.city)}</span></div></div></section>${endBand}`;
  write('/kontakt/', head(`Kontakt — ${nap.name}`, `Kontakt zum Haus- & Gartenservice Havelland: ${nap.phone_display}, kostenlose Besichtigung.`, '/kontakt/', `${orgSchema()},${breadcrumb([{name:'Start',url:'/'},{name:'Kontakt',url:'/kontakt/'}])}`) + header + kontaktMain + footer + revealJS + '</body></html>');
  written.basis.push('/kontakt/');
  for (const [slug, t] of [['impressum','Impressum'],['datenschutz','Datenschutz']]) {
    const m = `<div class="wrap breadcrumb"><a href="/">Start</a><span class="sep">›</span>${t}</div><section class="sec"><div class="wrap"><div class="prose rv"><h2>${t}</h2><p><em>Platzhalter — Rechtstext folgt (§5 TMG / DSGVO). Kleinunternehmer §19 UStG.</em></p><p>${esc(nap.name)}<br>${esc(nap.street||'')}<br>${esc(nap.zip||'')} ${esc(nap.city)}<br>${esc(nap.phone_display)}</p></div></div></section>${footer.replace('<footer>','<div>').replace('</footer>','</div>')}`;
    write(`/${slug}/`, head(`${t} — ${nap.name}`, t, `/${slug}/`, orgSchema()) + header + m + footer + '</body></html>');
    written.basis.push(`/${slug}/`);
  }
}

// ---------- SITEMAPS ----------
function sitemaps() {
  const sm = (name, urls) => { const x = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`<url><loc>${DOMAIN}${u}</loc></url>`).join('\n')}\n</urlset>\n`; fs.writeFileSync(`website/${name}`, x); };
  sm('sitemap-services.xml', [...written.basis.filter(u=>u==='/'||u==='/leistungen/'), ...written.hubs, ...written.ortsseiten]);
  sm('sitemap-standorte.xml', [...written.orts_hubs, '/standorte/']);
  sm('sitemap-ratgeber.xml', written.ratgeber);
  const idx = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['sitemap-services.xml','sitemap-standorte.xml','sitemap-ratgeber.xml'].map(f=>`<sitemap><loc>${DOMAIN}/${f}</loc></sitemap>`).join('\n')}\n</sitemapindex>\n`;
  fs.writeFileSync('website/sitemap.xml', idx);
  fs.writeFileSync('website/robots.txt', `User-agent: *\nAllow: /\n\n# AI-Crawler erlaubt (AEO/GEO)\nUser-agent: GPTBot\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\n\nSitemap: ${DOMAIN}/sitemap.xml\n`);
}

// ---------- RUN ----------
const SAMPLE_ORTSSEITEN = [['heckenschnitt','falkensee'],['gartenpflege','berlin-kladow'],['steinreinigung','dallgow-doeberitz'],['fensterreinigung','nauen'],['entruempelung','oranienburg'],['winterdienst','falkensee'],['hausmeisterservice','hennigsdorf'],['dachrinnenreinigung','brieselang']];
home();
services.forEach(hub);
haupt.forEach(ortsHub);
RATGEBER.forEach(ratgeber);
basis();
if (FULL) {
  for (const s of services) if (PAGE_SVC.has(s.slug)) for (const o of orteForService(s)) ortsseite(s, o);
} else {
  for (const [ss, os] of SAMPLE_ORTSSEITEN) { const s = services.find(x=>x.slug===ss), o = orte.find(x=>x.slug===os); if (s && o) ortsseite(s, o); }
}
sitemaps();
fs.cpSync('assets', 'website/assets', { recursive: true });  // Assets in den Output (damit /assets/* unter website-root aufgeloest wird)
const total = 1 + written.hubs.length + written.ortsseiten.length + written.orts_hubs.length + written.ratgeber.length + written.basis.length;
console.log(`Generiert (${FULL?'FULL':'SAMPLE'}): home + ${written.hubs.length} Hubs + ${written.ortsseiten.length} Ortsseiten + ${written.orts_hubs.length} Orts-Hubs + ${written.ratgeber.length} Ratgeber + ${written.basis.length} Basis = ${total} Seiten`);
