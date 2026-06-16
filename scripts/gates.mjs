// Deterministische Quality-Gates für den generierten Output (website/). Run: node scripts/gates.mjs
// Exit 0 = alle harten Gates grün; Exit 1 = mindestens ein hartes Gate rot. Warnungen brechen nicht ab.
import fs from 'fs';
import path from 'path';

const ROOT = 'website';
const DOMAIN = JSON.parse(fs.readFileSync('data/config.json','utf8')).domain.replace(/\/$/,'');
const hard = []; const warn = []; const ok = [];
const FAIL = (g,d)=>hard.push(`${g}: ${d}`);
const WARN = (g,d)=>warn.push(`${g}: ${d}`);
const OK = g=>ok.push(g);

// ---- Dateien sammeln ----
function walk(dir){ let out=[]; for(const e of fs.readdirSync(dir,{withFileTypes:true})){ const p=path.join(dir,e.name); if(e.isDirectory()) out=out.concat(walk(p)); else if(e.name.endsWith('.html')) out.push(p); } return out; }
const files = walk(ROOT);
const urlOf = f => '/' + path.relative(ROOT,f).replace(/\\/g,'/').replace(/index\.html$/,'');
const exists = u => { // interner Link → Datei?
  let p = u.split('#')[0].split('?')[0];
  if(!p.startsWith('/')) return true; // externe / relative ignorieren hier
  if(p.endsWith('/')) p = p+'index.html';
  else if(!path.extname(p)) p = p+'/index.html';
  return fs.existsSync(path.join(ROOT, p));
};

const visibleText = h => h.replace(/<script[^>]*>[\s\S]*?<\/script>/g,' ').replace(/<style[^>]*>[\s\S]*?<\/style>/g,' ').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&[a-z]+;/g,' ').replace(/\s+/g,' ').trim();

// ---- Pro-Datei-Checks ----
let brokenLinks=0; const brokenSamples=[];
let imgNoAlt=0, imgNoDim=0, noScta=0, noHamb=0; const titles=new Map(); const metas=new Map();
const transRe = /\b(fuer|ueber|koennen|koennt|muessen|moechten?|moeglich|schoen|groesse|groesser|qualitaet|taetig|naehe|naehere|haeufig|haeufige|gruen|gruenflaeche|natuerlich|persoenlich|zuverlaessig|regelmaessig|raeumen|geraeumt|fruehjahr|fruehling|gebaeude|aufloesung|entruempelung|haushaltsaufloesung|oberflaeche|baeume|straeucher|waehrend|gemaess|spaeter|draussen|fuehren|massnahmen|grundstuecke?|doeberitz|schoenwalde|oberkraemer|muehlenberge|phoeben)\b/i;
const bodyByService = {}; // service -> [{url,shingles}]

for(const f of files){
  const h = fs.readFileSync(f,'utf8');
  const url = urlOf(f);

  // 1 H1
  const h1s = (h.match(/<h1\b/g)||[]).length;
  if(h1s!==1) FAIL('H1', `${url} hat ${h1s} H1`);

  // lang=de
  if(!/<html lang="de"/.test(h)) FAIL('lang', `${url} ohne lang="de"`);

  // interne Links
  for(const m of h.matchAll(/(?:href|src)="(\/[^"#?]*)"/g)){ if(!exists(m[1])){ brokenLinks++; if(brokenSamples.length<15) brokenSamples.push(`${url} → ${m[1]}`);} }

  // Bilder alt + dim
  for(const m of h.matchAll(/<img\b[^>]*>/g)){ const tag=m[0]; if(!/alt="[^"]+"/.test(tag)) imgNoAlt++; if(!/width="\d+"/.test(tag)||!/height="\d+"/.test(tag)) imgNoDim++; }

  // Title / Meta
  const t=(h.match(/<title>([^<]*)<\/title>/)||[])[1]||'';
  const d=(h.match(/<meta name="description" content="([^"]*)"/)||[])[1]||'';
  titles.set(url, t); metas.set(url, d);
  if(t.length>60) WARN('TitleLen', `${url} Title ${t.length}>60`);
  if(d.length<150||d.length>158) WARN('MetaLen', `${url} Meta ${d.length} (Soll 150–158)`);

  // grep-Verbote
  const visEarly = visibleText(h);
  if(/cdn\.tailwindcss\.com/.test(h)) FAIL('CDN', `${url} nutzt cdn.tailwindcss.com`);
  if(/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(h)) FAIL('FontCDN', `${url} lädt externe Google-Fonts (DSGVO)`);
  if(/\{\{|\}\}/.test(visEarly)) FAIL('Mustache', `${url} enthält {{ }} im Text`);
  const tok = visEarly.match(/\{(ort|plz|nachbarorte|service|[a-z_]{2,})\}/);
  if(tok) FAIL('Token', `${url} unausgefüllter Platzhalter ${tok[0]}`);
  if(/"@type":"FAQPage"/.test(h)) FAIL('FAQPage', `${url} enthält FAQPage-JSON-LD`);
  if(/GTM-X|G-XXXX|G-XXXXX|WF3|TBD-P\d|TBD\b/.test(h)) FAIL('PlatzhalterID', `${url} enthält Platzhalter-ID`);
  if(/"item":"\/[a-z]/.test(h)) FAIL('SchemaRelURL', `${url} relative Schema-URL`);
  if(/&amp;amp;/.test(h)) FAIL('DoppelEntity', `${url} enthält &amp;amp; (Doppel-Escape)`);
  if(/&lt;\/?em&gt;/.test(h)) FAIL('EscapedEm', `${url} escaptes <em> als sichtbarer Text`);
  if(!/class="scta"/.test(h)) noScta++;
  if(!/class="hamb"/.test(h)) noHamb++;

  // ASCII-Transliteration im sichtbaren Text
  const vis = visibleText(h);
  const tm = vis.match(transRe);
  if(tm) FAIL('Translit', `${url} sichtbar "${tm[0]}"`);

  // JSON-LD parsebar + absolute @id
  for(const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){
    try{ const j=JSON.parse(m[1]);
      const s=JSON.stringify(j);
      for(const idm of s.matchAll(/"@id":"([^"]+)"/g)){ if(!/^https?:\/\//.test(idm[1])) FAIL('SchemaAbsId', `${url} @id nicht absolut: ${idm[1]}`); }
    }catch(e){ FAIL('SchemaJSON', `${url} JSON-LD nicht parsebar: ${e.message}`); }
  }

  // canonical == og:url
  const can=(h.match(/<link rel="canonical" href="([^"]+)"/)||[])[1];
  const og=(h.match(/<meta property="og:url" content="([^"]+)"/)||[])[1];
  if(can&&og&&can!==og) FAIL('CanonOG', `${url} canonical≠og:url`);
  if(can && can!==`${DOMAIN}${url}`) WARN('CanonSelf', `${url} canonical=${can}`);

  // Near-Duplicate: Ortsseiten nach Service gruppieren — gemessen NUR am Prose+FAQ-Body (nicht Chrome)
  const om = url.match(/^\/([a-z]+(?:-[a-z]+)*?)-([a-z]+(?:-[a-z]+)*)\/$/);
  if(om && /breadcrumb[^>]*>.*?›.*?›/s.test(h)){ const svc=om[1]; // 2 Breadcrumb-Trenner = Ortsseite
    const pm = h.match(/<div class="prose wide[^"]*">([\s\S]*?)<\/div><\/div><\/section>/);
    const fm = h.match(/<div class="faq rv">([\s\S]*?)<\/div><\/section>/);
    const bodyText = (((pm?pm[1]:'')+' '+(fm?fm[1]:'')).replace(/<[^>]+>/g,' ') || vis);
    const words = bodyText.toLowerCase().replace(/[^a-zäöüß ]/g,' ').split(/\s+/).filter(w=>w.length>2);
    const sh=new Set(); for(let i=0;i<words.length-2;i++) sh.add(words[i]+' '+words[i+1]+' '+words[i+2]);
    if(sh.size>5) (bodyByService[svc]=bodyByService[svc]||[]).push({url, sh});
  }
}

// ---- Aggregat-Gates ----
if(brokenLinks===0) OK('Broken-Link = 0'); else FAIL('BrokenLink', `${brokenLinks} kaputte interne Links, z.B. ${brokenSamples.slice(0,8).join(' | ')}`);
if(imgNoAlt===0) OK('alt≠"" auf allen <img>'); else FAIL('ImgAlt', `${imgNoAlt} <img> ohne alt`);
if(imgNoDim===0) OK('width+height auf allen <img>'); else FAIL('ImgDim', `${imgNoDim} <img> ohne width/height`);
if(noScta===0) OK('Sticky-Mobile-CTA (.scta) auf allen Seiten'); else FAIL('StickyCTA', `${noScta} Seiten ohne .scta`);
if(noHamb===0) OK('Mobile-Hamburger (.hamb) auf allen Seiten'); else FAIL('Hamburger', `${noHamb} Seiten ohne .hamb`);
{ const kf = files.find(f=>urlOf(f)==='/kontakt/'); if(kf && /<form id="anfrage"/.test(fs.readFileSync(kf,'utf8'))) OK('Kontakt-Formular vorhanden'); else FAIL('KontaktForm','/kontakt/ ohne Anfrage-Formular'); }

// Title-Uniqueness
const tvals=[...titles.values()]; const tdup=tvals.filter((v,i)=>tvals.indexOf(v)!==i);
if(tdup.length===0) OK('Titles unique'); else FAIL('TitleDup', `${[...new Set(tdup)].length} doppelte Titles, z.B. "${tdup[0]}"`);
const mvals=[...metas.values()]; const mdup=mvals.filter((v,i)=>mvals.indexOf(v)!==i);
if(mdup.length===0) OK('Metas unique'); else WARN('MetaDup', `${[...new Set(mdup)].length} doppelte Metas`);

// Near-Duplicate je Service-Familie (Jaccard auf 3-Gramm-Shingles)
function jac(a,b){ let inter=0; const small=a.size<b.size?a:b, big=a.size<b.size?b:a; for(const x of small) if(big.has(x)) inter++; return inter/(a.size+b.size-inter); }
let dupPairs=0; let maxSim=0; const dupSamples=[]; let comparedFamilies=0;
for(const svc in bodyByService){ const arr=bodyByService[svc]; if(arr.length<2) continue; comparedFamilies++;
  for(let i=0;i<arr.length;i++) for(let j=i+1;j<arr.length;j++){ const s=jac(arr[i].sh,arr[j].sh); if(s>maxSim) maxSim=s; if(s>0.40){ dupPairs++; if(dupSamples.length<6) dupSamples.push(`${arr[i].url}~${arr[j].url}=${(s*100).toFixed(0)}%`);} }
}
if(comparedFamilies===0) WARN('NearDup', 'keine Service-Familie mit ≥2 Ortsseiten im Output (Sample?)');
else if(dupPairs===0) OK(`Near-Duplicate <40% (max ${(maxSim*100).toFixed(0)}% Ähnlichkeit, ${comparedFamilies} Familien)`);
else FAIL('NearDup', `${dupPairs} Ortsseiten-Paare ≥40% ähnlich (max ${(maxSim*100).toFixed(0)}%), z.B. ${dupSamples.join(' | ')}`);

// ---- Report ----
console.log(`\n=== GATES (${files.length} Seiten) ===`);
console.log('GRÜN:'); ok.forEach(g=>console.log('  ✓ '+g));
if(warn.length){ console.log(`WARN (${warn.length}):`); warn.slice(0,25).forEach(w=>console.log('  ! '+w)); if(warn.length>25) console.log(`  … +${warn.length-25}`); }
if(hard.length){ console.log(`\nROT (${hard.length}):`); hard.slice(0,40).forEach(h=>console.log('  ✗ '+h)); if(hard.length>40) console.log(`  … +${hard.length-40}`); console.log('\nERGEBNIS: ROT'); process.exit(1); }
console.log('\nERGEBNIS: GRÜN (alle harten Gates bestanden)'); process.exit(0);
