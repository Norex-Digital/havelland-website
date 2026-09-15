// lp.mjs — Google-Ads-Landingpages (/lp/<slug>/) + Danke-Seite (/lp/danke/)
// Eigenes Modul, damit generate.mjs nur wenige Zeilen Eingriff braucht (Import, extraHead in head(), buildLp()-Aufruf im RUN-Block).
// Regeln: noindex,follow · nicht in Sitemaps (kein written.*.push) · reduzierte Navigation (Logo + Anruf, kein Menü)
// · eigenes 2-Schritt-Formular (Web3Forms, DSGVO-Checkbox, Klick-IDs/UTM als Hidden-Felder) · Danke-Seite als Conversion-Ziel (#ok-Fragment, kein Storage)
// · Consent-Banner + Klick-Events werden geerbt (CONSENT_BANNER/TRACK_EVENTS) · kein site.js (initBA für .ba-Slider inline, .rv → .rv.in per rvIn()).
// Review 14.09. eingearbeitet: Klick-IDs nur mit Einwilligung im Endgerät gespeichert (sonst nur im Speicher der Seite),
// user_data nur bei Einwilligung, Enter in Schritt 1 → Schritt 2, Nummer sichtbar in Callpill + Sticky-Bar (Anruf-Conversion),
// Tap-Targets ≥ 44 px, ARIA-Kleinigkeiten, LP-Gates in gates.mjs.
// v2 (14.09. abends, ads/audit.md §10b): Site-Komponenten statt .lp-*-Nachbauten — .phero/.shot/.hleaf, gstripFrom(), timelineFrom(),
// .trust-row (Google-Kennzahl aus proof.json), baSlider(), .review-card, .sec/.section-alt; kursiver H1-Akzent + Fraunces-Italic-Preload
// (der Schnitt wird durch .gs .gn / .tli .tn / .ba-cap b ohnehin geladen; pyftsubset-Subset blieb bei 78 KB wegen gvar → Originaldatei).
// Copy: data/copy/lp.json — hero je LP ({typ:'ba'|'foto'|'text'}), trust als [{b,t}], Fotos nur aus dem Manifest (fotos: [] → keine Galerie).

import { baSlider, gstripFrom, timelineFrom } from './components.mjs';

const PHONE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;

// Servicegebiet laut Report Kap. 3.4 / GBP-Servicegebiet (A0 #8)
const GEBIET = ['Falkensee', 'Dallgow-Döberitz', 'Brieselang', 'Schönwalde-Glien', 'Wustermark', 'Nauen', 'Ketzin/Havel', 'Berlin-Spandau'];
export const ATTR_KEYS = ['gclid', 'wbraid', 'gbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']; // auch /kontakt/ (generate.mjs basis())
// Kursiv-Schnitt (H1-Akzent wght 500; .gs .gn/.tli .tn/.ba-cap b wght 600): statt der variablen fraunces-italic-latin.woff2 (81 KB, gvar) zwei statische
// Instanzen (fontTools instancer wght 500/opsz 48 bzw. wght 600/opsz 22, Latin-Subset ohne Hinting, je ~20 KB). Die @font-face in LP_CSS stehen hinter
// site.css unter EIGENEM Familiennamen „Fraunces LP“ (eine zweite @font-face „Fraunces“ verliert in Chromium gegen die Range-Face 400–700 aus
// site.css — gemessen 14.09.: Preload geladen, variable Datei trotzdem benutzt). Die vier Italic-Selektoren zeigen in LP_CSS auf „Fraunces LP“.
// Preload nur der 500er (H1 im Fold); die 600er lädt beim ersten .gn ohne Layout-Shift (feste Breiten). Variable-Datei kostete ~250 ms LCP.
const ITALIC_500 = '/assets/fonts/fraunces-italic-500-lp.woff2';
const ITALIC_600 = '/assets/fonts/fraunces-italic-600-lp.woff2';
const FONT_PRELOAD = `<link rel="preload" href="${ITALIC_500}" as="font" type="font/woff2" crossorigin>`;
const FONT_FACE = `@font-face{font-family:"Fraunces LP";font-style:italic;font-weight:500;font-display:swap;src:url(${ITALIC_500}) format("woff2")}@font-face{font-family:"Fraunces LP";font-style:italic;font-weight:600;font-display:swap;src:url(${ITALIC_600}) format("woff2")}\n.lp-hero h1 em,.gs .gn,.tli .tn,.ba-cap b{font-family:"Fraunces LP","Fraunces",Georgia,serif}`;

// LP-eigenes CSS (mobile-first). Nutzt die Tokens/Klassen aus site.css (.btn, .kf, .faq, .scta, .consent, footer, .zone-deep).
const LP_CSS = `<style>
${FONT_FACE}
.lp-head .nav{justify-content:space-between;min-height:66px}
.lp-head .logo img{height:52px;width:auto}
.lp-head .callpill{font-size:15px;padding:10px 14px}
.lp-head .callpill .num{display:inline}
.lp-hero .kick{margin-bottom:12px;align-items:flex-start;line-height:1.35}
.lp-hero .kick .dot{margin-top:.5em}
.lp-hero-text .grid{grid-template-columns:1fr;max-width:46em}
.lp-cta{flex-direction:column;align-items:stretch;gap:12px}
.lp-cta .btn{width:100%}
.lp-cta .btn svg,.end .btn svg{width:18px;height:18px;flex:0 0 auto}
.tl+.lp-cta{margin-top:36px}
main .sec .head h2{max-width:22em}
.lp-gallery{display:grid;gap:18px}
.lp-preis{background:var(--paper);border:1px solid var(--hair);border-left:3px solid var(--green);border-radius:0 var(--r-el) var(--r-el) 0;padding:18px 20px}
.lp-preis p{color:var(--ink);font-size:16px;line-height:1.55;margin-bottom:10px}
.lp-preis p:last-child{margin-bottom:0}
.lp-form{margin-top:6px}
.lp-form fieldset{border:0;padding:0;margin:0 0 6px}
.lp-form legend{font-weight:700;font-size:15px;color:var(--green-d);letter-spacing:.06em;text-transform:uppercase;margin-bottom:10px}
.lp-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
.kf .lp-chips label{margin:0;display:inline-flex;flex-direction:row;align-items:center;gap:8px;min-height:44px;border:1.5px solid var(--border-visible,var(--hair));border-radius:var(--r-button);padding:10px 16px;background:#fff;font-weight:600;font-size:15px;color:var(--ink);cursor:pointer}
.kf .lp-chips input[type=radio]{width:18px;height:18px;min-height:0;margin:0;padding:0;border:0;background:none;box-shadow:none;accent-color:var(--green-d);flex:0 0 auto}
.lp-chips label:has(input:checked){border-color:var(--green-d);background:var(--paper)}
.lp-chips label:has(input:focus-visible){outline:3px solid var(--accent);outline-offset:2px}
.kf .lp-chips input[type=radio]:focus-visible{outline:none}
.lp-form .row{display:grid;gap:10px}
.lp-form.js .step2{display:none}
.lp-form.js.s2 .step2{display:block}
.lp-form.js.s2 .step1{display:none}
.lp-form:not(.js) [data-next],.lp-form:not(.js) .back,.lp-form:not(.js) .step1 .hint{display:none}
.lp-form .hint{font-size:14px;color:var(--muted);margin-top:8px}
.lp-form .err{display:none;color:var(--error-ink);font-size:14.5px;margin:6px 0 10px;font-weight:600}
.lp-form .err.show{display:block}
.lp-form .back{background:none;border:0;color:var(--green-d);font-weight:600;font-size:15px;min-height:44px;padding:10px 0;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.lp-form .btn{width:100%}
.lp-legal{margin-top:12px}
.lp-foot{background:var(--cream);border-top:1px solid var(--hair);padding:34px 0 30px;font-size:14.5px;color:var(--muted)}
.lp-foot p{margin-bottom:6px}
.lp-foot .legal{margin-top:16px;padding-top:14px}
.lp-foot a,.lp-foot .linklike{color:var(--ink);display:inline-block;padding:8px 0}
.lp-foot .linklike{background:none;border:0;font:inherit;font-weight:500;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
body:has(.consent:not([hidden])) .lp-foot{padding-bottom:210px}
.lp-danke .tli p{color:var(--ink);font-size:16.5px;max-width:40em}
.lp-danke .lp-cta{margin-top:24px}
.scta .wa{background:transparent;color:var(--green-d);box-shadow:none;border:1.5px solid var(--green)}
@media(min-width:600px){body:has(.consent:not([hidden])) .lp-foot{padding-bottom:130px}}
@media(min-width:760px){
  .lp-cta{flex-direction:row;align-items:center;gap:16px}.lp-cta .btn{width:auto}
  .lp-gallery{grid-template-columns:repeat(2,1fr)}
  .lp-form .row{grid-template-columns:1fr 1fr}
  .lp-form .row .full{grid-column:1/-1}
  .lp-form .btn{width:auto}
}
</style>`;

// Attribution beim Einstieg: Klick-IDs/UTM aus der URL in den Seiten-Speicher (window.__hg). Ins Endgerät (localStorage, 90 Tage)
// nur, wenn die Einwilligung vorliegt oder im Banner erteilt wird (§ 25 TDDDG). Merge statt Replace: Klick-IDs werden nur durch
// eine neue Klick-ID ersetzt; reine UTM-Besuche löschen keine gespeicherte gclid. url_passthrough/ads_data_redaction setzt das
// Head-Snippet in generate.mjs site-weit.
export function lpAttribJS(consentKey) {
  return `<script>(function(){var K=${JSON.stringify(ATTR_KEYS)},S='hg_attrib',C='${consentKey}';function allowed(){try{var v=JSON.parse(localStorage.getItem(C)||'null');return !!(v&&v.c==='allow')}catch(e){return false}}
function load(){try{var a=JSON.parse(localStorage.getItem(S)||'null');if(a&&a.ts&&Date.now()-a.ts>90*864e5){localStorage.removeItem(S);return null}return a}catch(e){return null}}
var q=new URLSearchParams(location.search),n={},hit=false,click=false;K.forEach(function(k){var v=q.get(k);if(v){n[k]=v.slice(0,200);hit=true;if(k==='gclid'||k==='wbraid'||k==='gbraid')click=true}});
var cur=load()||{};var m={};for(var k in cur)m[k]=cur[k];if(hit){for(var k2 in n){if(k2==='gclid'||k2==='wbraid'||k2==='gbraid'){if(click)m[k2]=n[k2]}else m[k2]=n[k2]}if(click){m.ts=Date.now();m.landing=location.pathname}else if(!m.landing){m.landing=location.pathname;m.ts=m.ts||Date.now()}}
window.__hg=m;function persist(){try{if(allowed()&&window.__hg&&Object.keys(window.__hg).length){localStorage.setItem(S,JSON.stringify(window.__hg))}}catch(e){}}persist();
document.addEventListener('click',function(e){var b=e.target.closest('#consent [data-c=allow]');if(b){setTimeout(persist,0)}});window.__hgPersist=persist})();</script>`;
}

function lpFormJS(slug, dankeUrl, consentKey) {
  return `<script>(function(){var f=document.getElementById('anfrage');if(!f)return;f.classList.add('js');var started=false;function dl(o){if(window.dataLayer){window.dataLayer.push(o)}}
function consentState(){try{var v=JSON.parse(localStorage.getItem('${consentKey}')||'null');return v&&v.c?v.c:'none'}catch(e){return 'none'}}
f.addEventListener('input',function(){if(!started){started=true;dl({event:'form_start',lp:'${slug}'})}});
var next=f.querySelector('[data-next]'),back=f.querySelector('[data-back]'),err=f.querySelector('.err');
function goStep2(){var r=f.querySelector('input[name=objekt]:checked'),ort=f.elements['ort'];if(!r||!ort||!ort.checkValidity()){err.classList.add('show');if(ort&&!ort.value)ort.focus();return}err.classList.remove('show');f.classList.add('s2');dl({event:'form_step',lp:'${slug}',step:2});var n=f.querySelector('input[name=name]');if(n)n.focus()}
if(next){next.addEventListener('click',goStep2)}
if(back){back.addEventListener('click',function(){f.classList.remove('s2')})}
f.addEventListener('keydown',function(e){if(e.key==='Enter'&&!f.classList.contains('s2')&&e.target.tagName!=='TEXTAREA'){e.preventDefault();goStep2()}});
function fill(){try{var a=window.__hg||{};${JSON.stringify(ATTR_KEYS)}.forEach(function(k){var el=f.elements[k];if(el&&a[k])el.value=a[k]});var lu=f.elements['landing_url'];if(lu)lu.value=(a.landing||location.pathname)+(a.ts?' @'+new Date(a.ts).toISOString():'');var ac=f.elements['ads_consent'];if(ac)ac.value=consentState()}catch(e){}}
function e164(t){t=String(t||'').replace(/\\(\\s*0\\s*\\)/,'').replace(/[^0-9+]/g,'');if(t.indexOf('00')===0)t='+'+t.slice(2);if(t.indexOf('0')===0)t='+49'+t.slice(1);if(t&&t[0]!=='+')t='+49'+t;t=t.replace(/^\\+490/,'+49');return /^\\+\\d{8,15}$/.test(t)?t:''}
f.addEventListener('submit',function(e){e.preventDefault();if(!f.classList.contains('s2')&&f.classList.contains('js')){goStep2();return}if(!f.checkValidity()){f.reportValidity();return}fill();var b=f.querySelector('button[type=submit]'),o=b.textContent;b.disabled=true;b.textContent='Wird gesendet…';
fetch('https://api.web3forms.com/submit',{method:'POST',headers:{Accept:'application/json'},body:new FormData(f)}).then(function(r){return r.json()}).then(function(j){if(j&&j.success){var g=function(n){var el=f.elements[n];return el?String(el.value).trim():''};var r=f.querySelector('input[name=objekt]:checked');var cs=consentState();var done=false,go=function(){if(done)return;done=true;window.location.href='${dankeUrl}#ok'};var ev={event:'generate_lead',lead_source:'ads-lp',lp:'${slug}',objekt:r?r.value:'',kontaktweg:g('kontaktweg'),ads_consent:cs,eventCallback:go,eventTimeout:1200};if(cs==='allow'){ev.user_data={email:g('email')||undefined,phone_number:e164(g('tel'))||undefined}}dl(ev);setTimeout(go,1500)}else{b.disabled=false;b.textContent=o;alert('Es gab ein Problem beim Senden. Bitte rufen Sie uns kurz an oder schreiben Sie per WhatsApp.')}}).catch(function(){b.disabled=false;b.textContent=o;alert('Es gab ein Problem beim Senden. Bitte rufen Sie uns kurz an oder schreiben Sie per WhatsApp.')})});})();</script>`;
}

// Danke: lead_confirmed nur, wenn die Seite über den Formular-Redirect (#ok) erreicht wurde; Fragment wird sofort entfernt (Reload zählt nicht).
const DANKE_JS = `<script>(function(){try{if(location.hash==='#ok'){history.replaceState(null,'',location.pathname);if(window.dataLayer){window.dataLayer.push({event:'lead_confirmed'})}}}catch(e){}})();</script>`;

// Vorher/Nachher-Regler: initBA aus assets/js/site.js (Z.41–53) inline, weil LPs kein site.js laden. Nur angehängt, wenn die Seite ein .ba enthält.
const LP_BA_JS = `<script>(function(){function initBA(ba){if(!ba||ba.__baInit)return;ba.__baInit=true;var range=ba.querySelector('input[type=range]');if(!range)return;function set(){ba.style.setProperty('--pos',range.value+'%')}range.addEventListener('input',function(){set();var stage=ba.closest('.hero-stage');if(stage)stage.classList.add('dragged')});set()}Array.prototype.slice.call(document.querySelectorAll('.ba')).forEach(initBA)})();</script>`;
// site.css setzt .rv{opacity:0} (sichtbar erst mit .in, das site.js per IntersectionObserver setzt). LPs laden kein site.js → jede importierte
// Komponente bekommt ' in' sofort: kein Reveal, kein Layout-Shift. Auf JEDE Komponentenausgabe anwenden (accept.mjs prüft: kein rv ohne in).
const rvIn = html => html.replace(/class="([^"]*)"/g, (m, c) => { const t = c.split(' '); return t.includes('rv') && !t.includes('in') ? `class="${c} in"` : m; });

export function buildLp(d) {
  const { head, write, esc, tel, waHref, nap, DOMAIN, CONSENT_BANNER, TRACK_EVENTS, CONSENT_RESET_JS, CONSENT_KEY, orgSchema, reviews, config, CP, isReal, pic, leaf, proof } = d;
  const consentKey = CONSENT_KEY || 'consent_v2';
  const cp = CP('lp.json');
  if (!cp || !Array.isArray(cp.lps)) return 0;
  const W3F = isReal(config.web3forms_key);
  const dankeUrl = '/lp/danke/';
  const telDisp = esc(nap.phone_display);
  const resetJS = CONSENT_RESET_JS || '';

  const lpHeader = href => `<header class="lp-head"><div class="wrap nav"><a class="logo" href="${href}" aria-label="${esc(nap.name)}"><picture style="display:contents"><source type="image/webp" srcset="/assets/img/logo-lp-360.webp"><img src="/assets/img/logo-lp-180.png" alt="${esc(nap.name)}" width="180" height="193" decoding="async"></picture></a><a class="callpill" href="tel:${tel}">${PHONE_SVG}<span class="num">${telDisp}</span></a></div></header>`;

  // Sticky-Bar mit sichtbarer Nummer (Anruf-Conversion: Google ersetzt den sichtbaren Nummerntext) und gedämpftem WhatsApp (ein Gold je Viewport)
  const lpScta = waText => `<nav class="scta" aria-label="Schnellkontakt"><a class="call" href="tel:${tel}">☎ ${telDisp}</a><a class="wa" href="${waHref(waText)}">WhatsApp</a></nav>`;

  const lpFooter = `<footer class="lp-foot"><div class="wrap"><p class="fnap">${esc(nap.name)}</p><p>${esc(nap.street || '')}, ${esc(nap.zip || '')} ${esc(nap.city)} · <a href="tel:${tel}">${telDisp}</a> · <a href="mailto:${esc(nap.email)}">${esc(nap.email)}</a></p><p>Servicegebiet: ${GEBIET.map(esc).join(' · ')}</p><div class="legal"><a href="/impressum/">Impressum</a><a href="/datenschutz/">Datenschutz</a><button type="button" class="linklike" id="consent-reset">Cookie-Einstellungen</button><a href="/">Zur Website</a></div></div></footer>`;

  // Trust-Zeile wie Home/Hub (.trust-row > .t > b + span). Google-Kennzahl aus proof.google_reviews mit derselben Live-Schwelle wie
  // trustLine in generate.mjs (Prinzip 6: keine hartcodierten Zahlen in lp.json).
  const gr = (proof && proof.google_reviews) || {};
  const grLive = !!(reviews && reviews.enabled) && (gr.count || 0) >= ((reviews && reviews.block_ab_count) || 5) && !!gr.rating;
  const trustGoogle = grLive ? { b: `${Number(gr.rating).toFixed(1).replace('.', ',')} ★`, t: `bei Google · ${gr.count} Bewertungen` } : null;
  const trustRow = items => {
    const all = [trustGoogle, ...(Array.isArray(items) ? items : [])].filter(t => t && t.b && t.t);
    return all.length ? `<div class="trust-row">${all.map(t => `<div class="t"><b>${esc(t.b)}</b><span>${esc(t.t)}</span></div>`).join('')}</div>` : '';
  };

  // Vorher/Nachher-Slider aus components.mjs (WebP-768: baSlider setzt <img src>, kein <picture>; WebP statt JPG spart ~120 KB je Paar — Perf-Messung 14.09.; Hochformat 864/1036 = .ba-Aspect).
  // Der Alt-Suffix der Komponente ist heckenspezifisch („nach dem Schnitt") → für Räumungen ersetzt.
  const imgSrc = slug => `/assets/img/${slug}-768.webp`;
  const baLp = o => baSlider(o).replace(/ — nach dem Schnitt"/g, ' — nach der Räumung"').replace(/ — vor dem Schnitt"/g, ' — vor der Räumung"');
  const baPair = (f, { lcp = false } = {}) => baLp({ vorher: imgSrc(f.vorher), nachher: imgSrc(f.nachher), alt: f.alt || f.cap || 'Entrümpelung', cap: f.cap || '', sub: f.sub || '', hint: true, lcp, w: 864, h: 1036 });
  const pairOk = f => !!(f && f.vorher && f.nachher && pic(f.vorher) && pic(f.nachher));
  // Hero-Schalter je LP (lp.json hero.typ): ba = echte Vorher/Nachher-Fotos als Slider, foto = Manifest-Bild als Fotokarte (.shot .main),
  // text = einspaltig ohne Karte. Fallback ohne hero-Feld: erstes fotos-Paar → ba, sonst text.
  const heroOf = lp => {
    const h = lp.hero || (Array.isArray(lp.fotos) && lp.fotos[0] ? { typ: 'ba', ...lp.fotos[0] } : { typ: 'text' });
    if (h.typ === 'ba' && pairOk(h)) return { cls: 'lp-hero-ba', shot: `<div class="shot">${baPair(h, { lcp: true })}</div>`, key: `${h.vorher}|${h.nachher}` };
    if (h.typ === 'foto' && h.slug && pic(h.slug)) return { cls: 'lp-hero-foto', shot: `<div class="shot">${pic(h.slug, { cls: 'main', alt: h.alt || `${lp.name} im Havelland – ${nap.name}`, sizes: '(max-width:900px) 92vw, 46vw', lcp: true })}</div>`, key: '' };
    return { cls: 'lp-hero-text', shot: '', key: '' };
  };

  const fmtDate = iso => { const m = String(iso || '').match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/); return m ? (m[3] ? `${m[3]}.${m[2]}.${m[1]}` : `${m[2]}/${m[1]}`) : ''; };
  const quotes = (idx, h2) => {
    if (!reviews || !reviews.enabled || !Array.isArray(reviews.reviews)) return '';
    const picked = (idx || []).map(i => reviews.reviews[i]).filter(Boolean);
    if (!picked.length) return '';
    const agg = reviews.aggregate || {};
    const rating = Number(agg.rating || 5).toFixed(1).replace('.', ',');
    const items = picked.map(r => {
      const t = String(r.text || '').replace(/\s+/g, ' ').trim();
      const cut = t.length > 260 ? t.slice(0, t.lastIndexOf(' ', 260)) + ' …' : t;
      const stars = Math.max(1, Math.min(5, r.rating || 5));
      return `<figure class="review-card"><div class="rc-stars" role="img" aria-label="${stars} von 5 Sternen">${'★'.repeat(stars)}</div><blockquote>${esc(cut)}</blockquote><figcaption><b>${esc(r.author)}</b><span>${r.date ? esc(fmtDate(String(r.date).slice(0, 7))) + ' · ' : ''}Google-Bewertung</span></figcaption></figure>`;
    }).join('');
    // .review-grid/.review-card wie /bewertungen/ (generate.mjs); 2 Karten → auto-fit statt 3-Spalten-Raster mit Leerspalte. Kein Link auf /bewertungen/ (LP ohne Ausstiegsrampen).
    return `<section class="sec section-alt" id="bewertungen"><div class="wrap"><div class="head"><h2>${esc(h2 || 'Was Kunden über uns sagen')}</h2></div><p class="hint" style="margin:-4px 0 22px;color:var(--muted)">${rating} von 5 Sternen bei Google · ${esc(agg.count || '')} Bewertungen (Stand ${esc(fmtDate(agg.as_of))}). Auszug, wörtlich.</p><div class="review-grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr));max-width:920px">${items}</div></div></section>`;
  };

  // Galerie: nur echte Fotos als Vorher/Nachher-Slider ({vorher, nachher, cap, sub}); Slugs müssen im Manifest stehen, sonst wird das Paar übersprungen.
  // Das Hero-Paar wird nicht wiederholt (skipKey). Ein einzelnes Paar bleibt einspaltig und begrenzt.
  const gallery = (lp, skipKey) => {
    const pairs = (Array.isArray(lp.fotos) ? lp.fotos : []).filter(f => pairOk(f) && `${f.vorher}|${f.nachher}` !== skipKey);
    if (!pairs.length) return '';
    const items = pairs.map(f => `<div>${baPair(f)}</div>`).join('');
    return `<section class="sec" id="fotos"><div class="wrap"><div class="head"><h2>${esc(lp.fotos_h2 || 'So sieht unsere Arbeit aus')}</h2></div><p class="hint" style="margin:-4px 0 22px;color:var(--muted)">${esc(lp.fotos_hint || 'Echte Fotos aus einem dokumentierten Auftrag, nur zugeschnitten. Genau so bekommen Sie Ihren Foto-Nachweis aufs Handy.')}</p><div class="lp-gallery"${pairs.length === 1 ? ' style="grid-template-columns:1fr;max-width:560px;margin:0 auto"' : ''}>${items}</div></div></section>`;
  };

  const form = lp => {
    const hidden = W3F
      ? `<input type="hidden" name="access_key" value="${esc(config.web3forms_key)}"><input type="hidden" name="subject" value="${esc(lp.form_subject || 'Neue Anfrage (Ads-LP)')}"><input type="hidden" name="from_name" value="${esc(nap.name)}"><input type="hidden" name="redirect" value="${DOMAIN}${dankeUrl}"><input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" style="display:none">`
      : '';
    const attrib = ['quelle', 'lp', ...ATTR_KEYS, 'landing_url', 'ads_consent']
      .map(n => `<input type="hidden" name="${n}" value="${n === 'quelle' ? 'ads-lp' : n === 'lp' ? esc(lp.slug) : ''}">`).join('');
    const chips = (lp.objekte || []).map((o, i) => `<label><input type="radio" name="objekt" value="${esc(o)}"${i === 0 ? ' required' : ''}> ${esc(o)}</label>`).join('');
    return `<form id="anfrage" class="kf lp-form" action="https://api.web3forms.com/submit" method="POST">${hidden}${attrib}
<fieldset class="step1"><legend>1. Was und wo?</legend>
<div class="lp-chips" role="radiogroup" aria-label="Was soll geräumt werden?">${chips}</div>
<div class="row"><label>Ort / PLZ<input name="ort" autocomplete="address-level2" required></label>
<label class="full">Kurz: Was steht an? (optional)<textarea name="anliegen" rows="3" placeholder="z. B. 3-Zimmer-Wohnung, 2. OG ohne Aufzug, bis Ende Oktober"></textarea></label></div>
<p class="err" role="alert">Bitte wählen Sie, was geräumt werden soll, und geben Sie den Ort an.</p>
<button class="btn btn-acc" type="button" data-next>Weiter zu Ihren Kontaktdaten</button>
<p class="hint">Schritt 1 von 2 · dauert unter zwei Minuten</p></fieldset>
<fieldset class="step2"><legend>2. Wie erreichen wir Sie?</legend>
<div class="row"><label>Name<input name="name" autocomplete="name" required></label>
<label>Telefon<input name="tel" type="tel" autocomplete="tel" required></label>
<label class="full">E-Mail<input name="email" type="email" autocomplete="email" placeholder="optional, für das schriftliche Angebot"></label></div>
<div class="lp-chips" role="radiogroup" aria-label="Kontakt am liebsten per"><label><input type="radio" name="kontaktweg" value="Anruf" checked> Rückruf</label><label><input type="radio" name="kontaktweg" value="WhatsApp"> WhatsApp</label><label><input type="radio" name="kontaktweg" value="E-Mail"> E-Mail</label></div>
<label class="chk lp-legal"><input type="checkbox" name="dsgvo" required> <span>Ich bin mit der Verarbeitung meiner Angaben zur Kontaktaufnahme und Angebotserstellung einverstanden (siehe <a href="/datenschutz/">Datenschutzerklärung</a>). Die Einwilligung kann ich jederzeit widerrufen.</span></label>
<button class="btn btn-acc" type="submit">${esc(lp.cta || 'Anfrage absenden')}</button>
<button class="back" type="button" data-back>← zurück</button>
<p class="hint">Wir melden uns meist noch am selben Werktag. Ihre Angaben gehen über den Formulardienst Web3Forms an unser Postfach. Nur wenn Sie im Cookie-Banner zugestimmt haben, übermitteln wir E-Mail und Telefonnummer verschlüsselt (gehasht) an Google, um den Erfolg unserer Anzeigen zu messen – Details in der Datenschutzerklärung.</p></fieldset>
<p class="kf-alt">Lieber direkt? <a href="tel:${tel}">Anrufen: ${telDisp}</a> · <a href="${waHref(lp.wa_text || 'Hallo, ich hätte gern eine kostenlose Besichtigung.')}">WhatsApp schreiben</a></p>
</form>`;
  };

  let n = 0;
  for (const lp of cp.lps) {
    const url = `/lp/${lp.slug}/`;
    const h1 = lp.h1_em && lp.h1.includes(lp.h1_em)
      ? esc(lp.h1).replace(esc(lp.h1_em), `<em>${esc(lp.h1_em)}</em>`)
      : esc(lp.h1);
    const wa = waHref(lp.wa_text || 'Hallo, ich hätte gern eine kostenlose Besichtigung.');
    const H = heroOf(lp);
    const main = `<main id="top">
<section class="phero lp-hero ${H.cls}">${leaf('hleaf')}<div class="wrap grid"><div><span class="kick"><span class="dot"></span> ${esc(lp.kick)}</span><h1>${h1}</h1><p class="lead">${esc(lp.lead)}</p>
<div class="cta-row lp-cta"><a class="btn btn-acc" href="#anfrage">${esc(lp.cta)}</a><a class="btn btn-line" href="tel:${tel}">${PHONE_SVG} Anrufen: ${telDisp}</a><a class="btn btn-line" href="${wa}">WhatsApp mit Foto</a></div>
${trustRow(lp.trust)}</div>${H.shot}</div></section>
${rvIn(gstripFrom((lp.nutzen || []).map(x => ({ h: esc(x.h), p: esc(x.p) }))))}
<section class="sec section-alt"><div class="wrap"><div class="head"><h2>So läuft es ab</h2></div>${rvIn(timelineFrom((lp.ablauf || []).map(x => ({ when: x.when ? esc(x.when) : '', h: esc(x.h), p: esc(x.p) }))))}<div class="cta-row lp-cta"><a class="btn btn-acc" href="#anfrage">${esc(lp.cta)}</a></div></div></section>
${gallery(lp, H.key)}
<section class="sec"><div class="wrap"><div class="head"><h2>${esc(lp.preis.h)}</h2></div><div class="lp-preis">${(lp.preis.p || []).map(t => `<p>${esc(t)}</p>`).join('')}</div></div></section>
${quotes(lp.testimonials, lp.testimonials_h2)}
<section class="sec"><div class="wrap"><div class="head"><h2>Häufige Fragen</h2></div><div class="faq">${(lp.faqs || []).map(f => `<details><summary>${esc(f.q)}<span class="pm" aria-hidden="true"></span></summary><p>${esc(f.a)}</p></details>`).join('')}</div></div></section>
<section class="sec section-alt" id="kontakt"><div class="wrap"><div class="head"><h2>Kostenlose Besichtigung anfragen</h2></div><p class="hint" style="margin:-4px 0 18px;color:var(--muted)">Zwei Schritte, keine Vorkasse, keine Verpflichtung. Der Festpreis für Räumung und Abtransport kommt nach der Besichtigung, Entsorgungsgebühren weisen wir nach Beleg aus.</p>${form(lp)}</div></section>
<section class="zone-deep end"><div class="wrap"><h2>Sie zeigen, wir räumen.</h2><p>Kostenlose Besichtigung, schriftlicher Festpreis für Räumung und Abtransport, besenreine Übergabe – im Havelland und in Berlin-Spandau.</p><div class="cta-row"><a class="btn btn-acc" href="#anfrage">${esc(lp.cta)}</a><a class="btn btn-line" href="tel:${tel}">☎ ${telDisp}</a></div></div></section>
</main>`;
    const baJs = /class="ba[ "]/.test(main) ? LP_BA_JS : '';
    const html = head(lp.title, lp.meta, url, orgSchema(), { noindex: true, extraHead: FONT_PRELOAD + LP_CSS + lpAttribJS(consentKey) })
      + lpHeader('/') + main + lpFooter + lpScta(lp.wa_text || 'Hallo, ich hätte gern eine kostenlose Besichtigung.')
      + CONSENT_BANNER + TRACK_EVENTS + lpFormJS(lp.slug, dankeUrl, consentKey) + resetJS + baJs + '</body></html>';
    write(url, html);
    n++;
  }

  // Danke-Seite (Conversion-Ziel der LPs; noindex; lead_confirmed nur über #ok-Fragment)
  const dk = cp.danke || {};
  // Schritte als Timeline (gleiche Komponente wie der Ablauf; Sätze ohne Titel/Zeitchip). Text-Hero ohne Fotokarte.
  const dkSteps = (dk.next || []).map(t => typeof t === 'string' ? { h: '', p: esc(t) } : { when: t.when ? esc(t.when) : '', h: esc(t.h || ''), p: esc(t.p || '') });
  const dkH1Raw = dk.h1 || 'Danke für Ihre Anfrage.';
  const dkH1 = dk.h1_em && dkH1Raw.includes(dk.h1_em) ? esc(dkH1Raw).replace(esc(dk.h1_em), `<em>${esc(dk.h1_em)}</em>`) : esc(dkH1Raw);
  const main = `<main class="lp-danke"><section class="phero lp-hero lp-hero-text">${leaf('hleaf')}<div class="wrap grid"><div><span class="kick"><span class="dot"></span> Anfrage eingegangen</span><h1>${dkH1}</h1><p class="lead">${esc(dk.lead || '')}</p></div></div></section>
<section class="sec"><div class="wrap"><div class="head"><h2>So geht es weiter</h2></div>${rvIn(timelineFrom(dkSteps))}<p class="hint" style="margin-top:24px;color:var(--muted)">${esc(dk.eilig || '')}</p><div class="cta-row lp-cta"><a class="btn btn-acc" href="tel:${tel}">☎ ${telDisp}</a><a class="btn btn-line" href="${waHref('Hallo, ich habe gerade das Formular geschickt – hier noch ein Foto dazu.')}">Foto per WhatsApp nachschicken</a></div></div></section></main>`;
  write(dankeUrl, head(`${dk.title || 'Danke'} – Havelland`, 'Ihre Anfrage ist beim Haus- & Gartenservice Havelland eingegangen. Wir melden uns meist noch am selben Werktag.', dankeUrl, orgSchema(), { noindex: true, extraHead: FONT_PRELOAD + LP_CSS })
    + lpHeader('/') + main + lpFooter + lpScta('Hallo, ich habe gerade das Formular geschickt – hier noch ein Foto dazu.')
    + CONSENT_BANNER + TRACK_EVENTS + DANKE_JS + resetJS + '</body></html>');
  return n + 1;
}
