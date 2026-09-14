// lp.mjs — Google-Ads-Landingpages (/lp/<slug>/) + Danke-Seite (/lp/danke/)
// Eigenes Modul, damit generate.mjs nur wenige Zeilen Eingriff braucht (Import, extraHead in head(), buildLp()-Aufruf im RUN-Block).
// Regeln: noindex,follow · nicht in Sitemaps (kein written.*.push) · reduzierte Navigation (Logo + Anruf, kein Menü)
// · eigenes 2-Schritt-Formular (Web3Forms, DSGVO-Checkbox, Klick-IDs/UTM als Hidden-Felder) · Danke-Seite als Conversion-Ziel (#ok-Fragment, kein Storage)
// · Consent-Banner + Klick-Events werden geerbt (CONSENT_BANNER/TRACK_EVENTS) · kein site.js, keine .rv-Reveal-Klassen.
// Review 14.09. eingearbeitet: Klick-IDs nur mit Einwilligung im Endgerät gespeichert (sonst nur im Speicher der Seite),
// user_data nur bei Einwilligung, Enter in Schritt 1 → Schritt 2, Nummer sichtbar in Callpill + Sticky-Bar (Anruf-Conversion),
// Kursiv-Font im H1 vermieden (kein Extra-Font-Request), Tap-Targets ≥ 44 px, ARIA-Kleinigkeiten, LP-Gates in gates.mjs.
// Copy: data/copy/lp.json — Bilder nur, wenn lp.fotos Slugs aus dem Manifest enthält (Stand 14.09.: keine echten Entrümpelungs-Fotos → leer).

const PHONE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
const CHECK_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;
const STAR_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;

// Servicegebiet laut Report Kap. 3.4 / GBP-Servicegebiet (A0 #8)
const GEBIET = ['Falkensee', 'Dallgow-Döberitz', 'Brieselang', 'Schönwalde-Glien', 'Wustermark', 'Nauen', 'Ketzin/Havel', 'Berlin-Spandau'];
const ATTR_KEYS = ['gclid', 'wbraid', 'gbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

// LP-eigenes CSS (mobile-first). Nutzt die Tokens/Klassen aus site.css (.btn, .kf, .faq, .scta, .consent, footer, .zone-deep).
const LP_CSS = `<style>
.lp-head .nav{justify-content:space-between;min-height:66px}
.lp-head .logo img{height:52px;width:auto}
.lp-head .callpill{font-size:15px;padding:10px 14px}
.lp-head .callpill .num{display:inline}
.lp-hero{background:var(--paper);border-bottom:1px solid var(--hair);padding:34px 0 30px}
.lp-hero .kick{margin-bottom:12px;align-items:flex-start;line-height:1.35}
.lp-hero .kick .dot{margin-top:.5em}
.lp-hero h1{font-family:var(--font-display);font-weight:600;letter-spacing:-.01em;font-size:clamp(30px,6.2vw,46px);line-height:1.12;max-width:16em}
.lp-hero h1 em{color:var(--green-d);font-style:normal}
.lp-hero .lead{margin-top:16px;font-size:18px;line-height:1.55;color:var(--ink);max-width:34em}
.lp-cta{display:flex;flex-direction:column;gap:12px;margin-top:24px}
.lp-cta .btn{width:100%}
.lp-cta .btn svg,.end .btn svg{width:18px;height:18px;flex:0 0 auto}
.lp-trust{list-style:none;display:grid;gap:8px;margin:26px 0 0;padding:0}
.lp-trust li{display:flex;align-items:center;gap:9px;font-size:15px;color:var(--ink);font-weight:600}
.lp-trust svg{width:16px;height:16px;color:var(--green);flex:0 0 auto}
.lp-trust .star svg{color:#b8860b}
.lp-sec{padding:44px 0}
.lp-sec h2{font-family:var(--font-display);font-weight:600;font-size:clamp(24px,4.6vw,32px);line-height:1.2;margin-bottom:18px;max-width:20em}
.lp-alt{background:var(--paper);border-top:1px solid var(--hair);border-bottom:1px solid var(--hair)}
.lp-cards{display:grid;gap:14px}
.lp-card{background:#fff;border:1px solid var(--hair);border-radius:var(--r-card);padding:20px}
.lp-card h3{font-size:18px;margin-bottom:6px}
.lp-card p{color:var(--muted);font-size:16px;line-height:1.5}
.lp-steps{list-style:none;padding:0;margin:0;display:grid;gap:14px}
.lp-steps li{display:flex;gap:14px;align-items:flex-start}
.lp-steps .n{flex:0 0 40px;width:40px;height:40px;border-radius:50%;background:var(--green-d);color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:700;font-size:18px}
.lp-steps h3{font-size:17px;margin-bottom:4px}
.lp-steps p{color:var(--muted);font-size:15.5px;line-height:1.5}
.lp-preis{background:#fff;border-left:3px solid var(--accent);border-radius:0 var(--r-el) var(--r-el) 0;padding:18px 20px}
.lp-preis p{color:var(--ink);font-size:16px;line-height:1.55;margin-bottom:10px}
.lp-preis p:last-child{margin-bottom:0}
.lp-quotes{display:grid;gap:12px}
.lp-quote{background:#fff;border:1px solid var(--hair);border-radius:var(--r-card);padding:18px 20px;margin:0}
.lp-quote .stars{display:flex;gap:2px;color:#b8860b;margin-bottom:8px}
.lp-quote .stars svg{width:15px;height:15px}
.lp-quote blockquote{margin:0}
.lp-quote p{font-size:15.5px;line-height:1.5;color:var(--ink)}
.lp-quote figcaption{display:block;margin-top:8px;font-size:13.5px;color:var(--muted)}
.lp-gallery{display:grid;gap:14px}
.lp-ba{margin:0;background:#fff;border:1px solid var(--hair);border-radius:var(--r-card);padding:10px}
.lp-ba-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.lp-ba-cell{position:relative;border-radius:var(--r-el);overflow:hidden;aspect-ratio:3/4;background:var(--paper)}
.lp-ba-cell img{width:100%;height:100%;object-fit:cover;display:block}
.lp-ba-tag{position:absolute;left:8px;top:8px;z-index:1;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:4px 9px;border-radius:999px;background:rgba(0,0,0,.62);color:#fff}
.lp-ba-tag-n{background:var(--green-d)}
.lp-ba figcaption{margin-top:8px;font-size:14px;color:var(--muted)}
.lp-form{margin-top:6px}
.lp-form fieldset{border:0;padding:0;margin:0 0 6px}
.lp-form legend{font-weight:700;font-size:15px;color:var(--green-d);letter-spacing:.06em;text-transform:uppercase;margin-bottom:10px}
.lp-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
.kf .lp-chips label{margin:0;display:inline-flex;flex-direction:row;align-items:center;gap:8px;min-height:44px;border:1.5px solid var(--border-visible,var(--hair));border-radius:var(--r-button);padding:10px 16px;background:#fff;font-weight:600;font-size:15px;color:var(--ink);cursor:pointer}
.kf .lp-chips input[type=radio]{width:18px;height:18px;min-height:0;margin:0;padding:0;border:0;background:none;box-shadow:none;accent-color:var(--green-d);flex:0 0 auto}
.lp-chips label:has(input:checked){border-color:var(--green-d);background:var(--paper)}
.lp-form .row{display:grid;gap:10px}
.lp-form.js .step2{display:none}
.lp-form.js.s2 .step2{display:block}
.lp-form.js.s2 .step1{display:none}
.lp-form:not(.js) [data-next],.lp-form:not(.js) .back,.lp-form:not(.js) .step1 .hint{display:none}
.lp-form .hint{font-size:14px;color:var(--muted);margin-top:8px}
.lp-form .err{display:none;color:#a4321c;font-size:14.5px;margin:6px 0 10px;font-weight:600}
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
.lp-danke .n{background:var(--green-d)}
.scta .wa{background:transparent;color:var(--green-d);box-shadow:none;border:1.5px solid var(--green)}
@media(min-width:600px){body:has(.consent:not([hidden])) .lp-foot{padding-bottom:130px}}
@media(min-width:760px){
  .lp-cta{flex-direction:row}.lp-cta .btn{width:auto}
  .lp-trust{grid-template-columns:1fr 1fr}
  .lp-cards{grid-template-columns:repeat(3,1fr)}
  .lp-steps{grid-template-columns:repeat(3,1fr)}.lp-steps li{flex-direction:column}
  .lp-quotes{grid-template-columns:repeat(2,1fr)}
  .lp-gallery{grid-template-columns:repeat(2,1fr)}
  .lp-form .row{grid-template-columns:1fr 1fr}
  .lp-form .row .full{grid-column:1/-1}
  .lp-form .btn{width:auto}
  .lp-sec{padding:60px 0}
}
</style>`;

// Attribution beim Einstieg: Klick-IDs/UTM aus der URL in den Seiten-Speicher (window.__hg). Ins Endgerät (localStorage, 90 Tage)
// nur, wenn die Einwilligung vorliegt oder im Banner erteilt wird (§ 25 TDDDG). Merge statt Replace: Klick-IDs werden nur durch
// eine neue Klick-ID ersetzt; reine UTM-Besuche löschen keine gespeicherte gclid. url_passthrough/ads_data_redaction setzt das
// Head-Snippet in generate.mjs site-weit.
function lpAttribJS(consentKey) {
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

export function buildLp(d) {
  const { head, write, esc, tel, waHref, nap, DOMAIN, CONSENT_BANNER, TRACK_EVENTS, CONSENT_RESET_JS, CONSENT_KEY, orgSchema, reviews, config, CP, isReal, pic } = d;
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

  const trustList = items => `<ul class="lp-trust">${items.map((t, i) => `<li${i === 0 ? ' class="star"' : ''}>${i === 0 ? STAR_SVG : CHECK_SVG}<span>${esc(t)}</span></li>`).join('')}</ul>`;

  const fmtDate = iso => { const m = String(iso || '').match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/); return m ? (m[3] ? `${m[3]}.${m[2]}.${m[1]}` : `${m[2]}/${m[1]}`) : ''; };
  const quotes = idx => {
    if (!reviews || !reviews.enabled || !Array.isArray(reviews.reviews)) return '';
    const picked = (idx || []).map(i => reviews.reviews[i]).filter(Boolean);
    if (!picked.length) return '';
    const agg = reviews.aggregate || {};
    const rating = Number(agg.rating || 5).toFixed(1).replace('.', ',');
    const items = picked.map(r => {
      const t = String(r.text || '').replace(/\s+/g, ' ').trim();
      const cut = t.length > 260 ? t.slice(0, t.lastIndexOf(' ', 260)) + ' …' : t;
      const stars = Math.max(1, Math.min(5, r.rating || 5));
      return `<figure class="lp-quote"><div class="stars" role="img" aria-label="${stars} von 5 Sternen">${STAR_SVG.repeat(stars)}</div><blockquote><p>${esc(cut)}</p></blockquote><figcaption>${esc(r.author)} · Google-Bewertung${r.date ? ', ' + esc(fmtDate(String(r.date).slice(0, 7))) : ''}</figcaption></figure>`;
    }).join('');
    return `<section class="lp-sec lp-alt" id="bewertungen"><div class="wrap"><h2>Was Kunden über unseren Haus- &amp; Gartenservice sagen</h2><p class="hint" style="margin:-8px 0 18px;color:var(--muted)">${rating} von 5 Sternen bei Google · ${esc(agg.count || '')} Bewertungen (Stand ${esc(fmtDate(agg.as_of))}). Auszug, wörtlich.</p><div class="lp-quotes">${items}</div></div></section>`;
  };

  // Galerie: nur echte Fotos als Vorher/Nachher-Paare ({vorher, nachher, cap}); Slugs müssen im Manifest stehen, sonst wird das Paar übersprungen.
  const gallery = lp => {
    const pairs = (Array.isArray(lp.fotos) ? lp.fotos : []).filter(f => f && f.vorher && f.nachher && pic(f.vorher) && pic(f.nachher));
    if (!pairs.length) return '';
    const items = pairs.map(f => `<figure class="lp-ba"><div class="lp-ba-grid"><div class="lp-ba-cell"><span class="lp-ba-tag">Vorher</span>${pic(f.vorher, { alt: `${f.cap || 'Entrümpelung'} vor der Räumung – Einsatzfoto ${nap.name}`, sizes: '(max-width:760px) 46vw, 300px' })}</div><div class="lp-ba-cell"><span class="lp-ba-tag lp-ba-tag-n">Nachher</span>${pic(f.nachher, { alt: `${f.cap || 'Entrümpelung'} nach der Räumung – besenrein`, sizes: '(max-width:760px) 46vw, 300px' })}</div></div>${f.cap ? `<figcaption>${esc(f.cap)}</figcaption>` : ''}</figure>`).join('');
    return `<section class="lp-sec" id="fotos"><div class="wrap"><h2>${esc(lp.fotos_h2 || 'So sieht unsere Arbeit aus')}</h2><p class="hint" style="margin:-8px 0 18px;color:var(--muted)">${esc(lp.fotos_hint || 'Echte Fotos aus einem dokumentierten Auftrag, nur zugeschnitten. Genau so bekommen Sie Ihren Foto-Nachweis aufs Handy.')}</p><div class="lp-gallery">${items}</div></div></section>`;
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
    const main = `<main id="top">
<section class="lp-hero"><div class="wrap"><span class="kick"><span class="dot"></span> ${esc(lp.kick)}</span><h1>${h1}</h1><p class="lead">${esc(lp.lead)}</p>
<div class="lp-cta"><a class="btn btn-acc" href="#anfrage">${esc(lp.cta)}</a><a class="btn btn-line" href="tel:${tel}">${PHONE_SVG} Anrufen: ${telDisp}</a><a class="btn btn-line" href="${wa}">WhatsApp mit Foto</a></div>
${trustList(lp.trust || [])}</div></section>
<section class="lp-sec"><div class="wrap"><h2>Drei Zusagen für Ihre ${esc(lp.name)}</h2><div class="lp-cards">${(lp.nutzen || []).map(x => `<div class="lp-card"><h3>${esc(x.h)}</h3><p>${esc(x.p)}</p></div>`).join('')}</div></div></section>
<section class="lp-sec lp-alt"><div class="wrap"><h2>So läuft es ab</h2><ol class="lp-steps">${(lp.ablauf || []).map((x, i) => `<li><span class="n" aria-hidden="true">${i + 1}</span><div><h3>${esc(x.h)}</h3><p>${esc(x.p)}</p></div></li>`).join('')}</ol><div class="lp-cta"><a class="btn btn-acc" href="#anfrage">${esc(lp.cta)}</a></div></div></section>
${gallery(lp)}
<section class="lp-sec"><div class="wrap"><h2>${esc(lp.preis.h)}</h2><div class="lp-preis">${(lp.preis.p || []).map(t => `<p>${esc(t)}</p>`).join('')}</div></div></section>
${quotes(lp.testimonials)}
<section class="lp-sec"><div class="wrap"><h2>Häufige Fragen</h2><div class="faq">${(lp.faqs || []).map(f => `<details><summary>${esc(f.q)}<span class="pm" aria-hidden="true"></span></summary><p>${esc(f.a)}</p></details>`).join('')}</div></div></section>
<section class="lp-sec lp-alt" id="kontakt"><div class="wrap"><h2>Kostenlose Besichtigung anfragen</h2><p class="hint" style="margin:-6px 0 16px;color:var(--muted)">Zwei Schritte, keine Vorkasse, keine Verpflichtung. Der Festpreis für Räumung und Abtransport kommt nach der Besichtigung, Entsorgungsgebühren weisen wir nach Beleg aus.</p>${form(lp)}</div></section>
<section class="zone-deep end"><div class="wrap"><h2>Sie zeigen, wir räumen.</h2><p>Kostenlose Besichtigung, schriftlicher Festpreis für Räumung und Abtransport, besenreine Übergabe – im Havelland und in Berlin-Spandau.</p><div class="cta-row"><a class="btn btn-acc" href="#anfrage">${esc(lp.cta)}</a><a class="btn btn-line" href="tel:${tel}">☎ ${telDisp}</a></div></div></section>
</main>`;
    const html = head(lp.title, lp.meta, url, orgSchema(), { noindex: true, extraHead: LP_CSS + lpAttribJS(consentKey) })
      + lpHeader(url) + main + lpFooter + lpScta(lp.wa_text || 'Hallo, ich hätte gern eine kostenlose Besichtigung.')
      + CONSENT_BANNER + TRACK_EVENTS + lpFormJS(lp.slug, dankeUrl, consentKey) + resetJS + '</body></html>';
    write(url, html);
    n++;
  }

  // Danke-Seite (Conversion-Ziel der LPs; noindex; lead_confirmed nur über #ok-Fragment)
  const dk = cp.danke || {};
  const main = `<main class="lp-danke"><section class="lp-hero"><div class="wrap"><span class="kick"><span class="dot"></span> Anfrage eingegangen</span><h1>${esc(dk.h1 || 'Danke für Ihre Anfrage.')}</h1><p class="lead">${esc(dk.lead || '')}</p></div></section>
<section class="lp-sec"><div class="wrap"><h2>So geht es weiter</h2><ol class="lp-steps">${(dk.next || []).map((t, i) => `<li><span class="n" aria-hidden="true">${i + 1}</span><div><p style="color:var(--ink);font-size:16.5px">${esc(t)}</p></div></li>`).join('')}</ol><p class="hint" style="margin-top:20px">${esc(dk.eilig || '')}</p><div class="lp-cta"><a class="btn btn-acc" href="tel:${tel}">☎ ${telDisp}</a><a class="btn btn-line" href="${waHref('Hallo, ich habe gerade das Formular geschickt – hier noch ein Foto dazu.')}">Foto per WhatsApp nachschicken</a></div></div></section></main>`;
  write(dankeUrl, head(`${dk.title || 'Danke'} – Havelland`, 'Ihre Anfrage ist beim Haus- & Gartenservice Havelland eingegangen. Wir melden uns meist noch am selben Werktag.', dankeUrl, orgSchema(), { noindex: true, extraHead: LP_CSS })
    + lpHeader('/') + main + lpFooter + lpScta('Hallo, ich habe gerade das Formular geschickt – hier noch ein Foto dazu.')
    + CONSENT_BANNER + TRACK_EVENTS + DANKE_JS + resetJS + '</body></html>');
  return n + 1;
}
