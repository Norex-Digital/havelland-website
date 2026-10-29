// lp.mjs — Google-Ads-Landingpages (/lp/<slug>/) + Danke-Seite (/lp/danke/)
// Eigenes Modul, damit generate.mjs nur wenige Zeilen Eingriff braucht (Import, extraHead in head(), buildLp()-Aufruf im RUN-Block).
// Regeln: noindex,follow · nicht in Sitemaps (kein written.*.push) · reduzierte Navigation (Vertrauensleiste, Logo, „Zur Website“, Anruf; kein Menü)
// · eigenes 1-Schritt-Formular (Web3Forms, DSGVO-Checkbox, Klick-IDs/UTM als Hidden-Felder) · Danke-Seite als Conversion-Ziel (#ok-Fragment, kein Storage)
// · Consent-Banner + Klick-Events werden geerbt (CONSENT_BANNER/TRACK_EVENTS) · kein site.js (initBA für .ba-Slider inline, .rv → .rv.in per rvIn()).
// Review 14.09. eingearbeitet: Klick-IDs nur mit Einwilligung im Endgerät gespeichert (sonst nur im Speicher der Seite),
// user_data nur bei Einwilligung, Enter in Schritt 1 → Schritt 2, Nummer sichtbar in Callpill + Sticky-Bar (Anruf-Conversion),
// Tap-Targets ≥ 44 px, ARIA-Kleinigkeiten, LP-Gates in gates.mjs.
// v2 (14.09. abends, ads/audit.md §10b): Site-Komponenten statt .lp-*-Nachbauten — .phero/.shot/.hleaf, gstripFrom(), timelineFrom(),
// .trust-row (Google-Kennzahl aus proof.json), baSlider(), .review-card, .sec/.section-alt; kursiver H1-Akzent + Fraunces-Italic-Preload
// (der Schnitt wird durch .gs .gn / .tli .tn / .ba-cap b ohnehin geladen; pyftsubset-Subset blieb bei 78 KB wegen gvar → Originaldatei).
// v6 (20.10., AV-Korrekturen): einzeilige Trust-Zeile (.lp-trust1) an der Kick-Position im Handy-Hero (Zahl aus proof.google_reviews), Preiszeilen mobil als
// 44-px-Zellen (Objekt klein, Preis fett), Aktion mobil in Kurzfassung (Sternchen + Fußzeile direkt darunter: Bedingung „ohne Entsorgungsgebühren“ sichtbar), Tipp-Ziele ≥ 44 px, eigenes Attribut-Escaping (escA), Token statt #fff.
// v7 (20.10. spät, Spec gbr-firma 09-lp-redesign-spec.md): Ein-Schritt-Formular (Variante B), Vertrauensleiste + „Zur Website“, Preis-Kacheln über dem Formular,
// Zitat aus echter Google-Bewertung, Aktionskarte ohne Sternchen, Häkchen-Punkte, Bewertungen aus lp.json (Bausteine: lp-bloecke.mjs), Hero-Bild Desktop fest/mittig.
// Copy: data/copy/lp.json — hero je LP ({typ:'ba'|'foto'|'text'}), trust als [{b,t}], Fotos nur aus dem Manifest (fotos: [] → keine Galerie).

import { baSlider, gstripFrom, timelineFrom } from './components.mjs';
import { topbar, trustZeile, preisBlock, zitat, aktionKarte, punkte, bewertungen, BLOECKE_CSS, ICON_ARROW } from './lp-bloecke.mjs';
import { VARIANTE, VARIANT_CSS } from './lp-varianten.mjs'; // LP_VARIANTE=a|b: ruhigere Varianten des ersten Bildschirms (ohne Variable: Ist-Stand)

const PHONE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;

// Servicegebiet laut Report Kap. 3.4 / GBP-Servicegebiet (A0 #8), Rathenow + Premnitz seit Maßnahme M8 (Quelle data/locations.json)
// Umbau 11/2026 (Prüfung 29.10.: 63 % der Klicker sitzen in Berlin/Potsdam): fester Ortssatz unter der H1, zusätzlich zur dynamischen Ortsersetzung (data-ort/ORT_JS bleibt unverändert, keine JS-Logik).
const ORT_SATZ = 'Im Havelland, in Berlin-Spandau und Potsdam';
const ORT_PHRASE = 'im Havelland, in Berlin-Spandau und Potsdam';
const GEBIET = ['Falkensee', 'Dallgow-Döberitz', 'Brieselang', 'Schönwalde-Glien', 'Wustermark', 'Nauen', 'Ketzin/Havel', 'Rathenow', 'Premnitz', 'Berlin-Spandau', 'Potsdam'];
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

// Umbau 11/2026 (Prüfung 29.10., B6: 84 % der Klicks mobil, Haupt-Button lag auf 390x844 hinter dem Cookie-Banner [Oberkante y 688]):
// Der Banner bleibt unangetastet (Text/Verhalten rechtlich geprüft). Der erste Bildschirm wird dichter gesetzt, damit der Absende-Knopf des Hero-Formulars
// über der Banner-Oberkante endet, obwohl der feste Ortssatz (.lp-ort) dazukommt: engere Kopf-/Hero-/Formular-Abstände, Name und Telefon nebeneinander
// (Telefon-Platzhalter entfällt dort, das Label „Telefon“ bleibt). Die Preis-Fußnote (.lp-preise-n) behält Text, Größe und Platz direkt unter den Kacheln.
// Steht NACH BLOECKE_CSS, weil dessen @media(max-width:599px) dieselben Selektoren setzt (gleiche Spezifität, spätere Regel gewinnt).
const FIT_CSS = `/* ---- Umbau 11/2026: Ortssatz, Hero-Fit, Preis-CTA ---- */
.lp-ort{margin:6px 0 0;font-size:15px;line-height:1.35;font-weight:600;color:var(--green-d)}
.lp-preis-cta{margin-top:16px}
.lp-preis-cta+.lp-preis-cta-h{margin:8px 0 0;font-size:14px;line-height:1.4;color:var(--muted)}
.lp-preis-cta+.lp-preis-cta-h+.lp-aktion{margin-top:16px}
@media(min-width:900px){.lp-ort-dup{display:none}}
@media(max-width:599px){
.lp-ort{margin:2px 0 0;font-size:clamp(12px,3.4vw,13.5px);line-height:1.3;font-weight:600}
.lp-ort+.lead{margin-top:4px}
.lp-topbar .wrap{min-height:28px}
.lp-head .nav{min-height:50px}
.lp-head .logo img{height:38px}
.lp-head .callpill{padding:8px 14px}
.lp-hero:has(.lp-hero-form){padding-top:8px}
.lp-hero .lp-preise{margin-top:8px}
.lp-hero .lp-preise-l{margin-bottom:4px}
.lp-hero .lp-tile{padding:6px 10px}
.lp-hero .lp-preise-n{margin-top:4px}
.lp-hero-form{margin-top:8px}
.lp-form{padding:10px;gap:6px}
.lp-form legend{margin-bottom:4px}
.lp-form .frow{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.lp-form .frow .fld:first-child{grid-column:1/-1}
.lp-form .fld input[name=kontakt]::placeholder{color:transparent}
.lp-form .more summary{min-height:40px}
.lp-form .ffoot{gap:4px}
}`;

// LP-eigenes CSS (mobile-first). Nutzt die Tokens/Klassen aus site.css (.btn, .kf, .faq, .scta, .consent, footer, .zone-deep).
const LP_CSS = `<style>
${FONT_FACE}
:root{--lp-surface:#fff}
.lp-head .nav{justify-content:space-between;min-height:66px}
.lp-head .logo img{height:52px;width:auto}
.lp-head .callpill{font-size:15px;padding:10px 14px}
.lp-head .callpill .num{display:inline}
.lp-hero .kick{margin-bottom:12px;align-items:flex-start;line-height:1.35}
.lp-hero .kick .dot{margin-top:.5em}
.lp-hero-text:not(:has(.lp-hero-form)) .grid{grid-template-columns:1fr;max-width:46em}
.lp-cta{flex-direction:column;align-items:stretch;gap:12px}
.lp-cta .btn{width:100%}
.lp-cta .btn svg,.end .btn svg{width:18px;height:18px;flex:0 0 auto}
.tl+.lp-cta{margin-top:36px}
main .sec .head h2{max-width:22em}
.lp-gallery{display:grid;gap:18px}
.lp-preis{background:var(--paper);border:1px solid var(--hair);border-left:3px solid var(--green);border-radius:0 var(--r-el) var(--r-el) 0;padding:18px 20px}
.lp-preis p{color:var(--ink);font-size:16px;line-height:1.55;margin-bottom:10px}
.lp-preis p:last-child{margin-bottom:0}
.lp-foot{background:var(--cream);border-top:1px solid var(--hair);padding:34px 0 30px;font-size:14.5px;color:var(--muted)}
.lp-foot p{margin-bottom:6px}
.lp-foot .legal{margin-top:16px;padding-top:14px}
.lp-foot a,.lp-foot .linklike{color:var(--ink);display:inline-block;padding:8px 0}
.lp-foot .linklike{background:none;border:0;font:inherit;font-weight:500;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
body:has(.consent:not([hidden])) .lp-foot{padding-bottom:210px}
.lp-danke .tli p{color:var(--ink);font-size:16.5px;max-width:40em}
.lp-danke .lp-cta{margin-top:24px}
.scta .wa{background:transparent;color:var(--green-d);box-shadow:none;border:1.5px solid var(--green)}
.lp-trust1{display:none;margin:0 0 6px;font-size:clamp(11.5px,3.5vw,13px);font-weight:600;line-height:1.3;color:var(--green-d);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.005em}
.lp-quick{margin:20px 0 16px}
.lp-quick-l{font-weight:700;font-size:15px;color:var(--green-d);letter-spacing:.06em;text-transform:uppercase;margin-bottom:10px}
.lp-quick-c{display:flex;flex-wrap:wrap;gap:8px}
.lp-quick-c a{display:inline-flex;align-items:center;min-height:44px;border:1.5px solid var(--green);border-radius:var(--r-button);padding:10px 16px;background:var(--lp-surface);font-weight:600;font-size:15px;color:var(--green-d);text-decoration:none;transition:background-color .2s,scale .15s}
.lp-quick-c a:hover{background:var(--paper)}
.lp-quick-c a:active{scale:.96}
.lp-chips .qs,.lp-quick-c .qs{display:none}
.lp-preis+.lp-cta{margin-top:22px}
.lp-preis+.lp-cta+.hint{margin-top:10px;font-size:14.5px;color:var(--muted)}
@media(max-width:899px){body:not(:has(.consent:not([hidden]))) .lp-hero .lp-cta .btn-line{display:none}}
@media(max-width:599px){.lp-hero .lead{font-size:17px;line-height:1.5}.lp-quick{margin:16px 0 14px}.lp-quick-l{font-size:13.5px;margin-bottom:8px}.lp-quick-c{gap:6px}.lp-quick-c a{padding:8px 11px;font-size:14px}.lp-quick-c .ql{display:none}.lp-quick-c .qs{display:inline}.lp-chips .ql{display:none}.lp-chips .qs{display:inline}}
@media(min-width:600px){body:has(.consent:not([hidden])) .lp-foot{padding-bottom:130px}}
@media(min-width:760px){
  .lp-cta{flex-direction:row;align-items:center;gap:16px}.lp-cta .btn{width:auto}
  .lp-gallery{grid-template-columns:repeat(2,1fr)}
}
.lp-hero .hleaf{pointer-events:none}
.lp-hero-form{margin:14px 0 6px}
.lp-preisverweis a{display:inline-flex;align-items:center;min-height:44px;font-weight:600;color:var(--green-d)}
#anfrage{scroll-margin-top:82px}
.lp-person{display:flex;align-items:center;gap:12px;margin:14px 0 0;font-size:15px;line-height:1.4;color:var(--ink)}
.lp-person picture{display:flex;flex:0 0 auto}
.lp-person .av,.lp-person img{width:56px;height:56px;border-radius:50%;object-fit:cover;flex:0 0 auto}
@media (max-width:899px){.lp-hero:has(.lp-hero-form) .kick{margin-bottom:6px}.lp-hero:has(.lp-hero-form) h1{font-size:clamp(26px,7vw,34px);margin-bottom:8px}.lp-hero:has(.lp-hero-form):not([data-lead-mobil]) .lead{display:none}}
@media(max-width:599px){
.lp-head .nav{min-height:56px}
.lp-head .logo img{height:42px}
.lp-hero:has(.lp-hero-form){padding:8px 0 36px}
.lp-hero:has(.lp-hero-form) .kick{display:none}
.lp-hero:has(.lp-hero-form) .lp-trust1{display:flex;align-items:center;gap:6px;margin-bottom:4px}
.lp-hero[data-lead-mobil] .lead{font-size:16px;line-height:1.4;margin:6px 0 4px}
.lp-hero[data-h1-lang]:has(.lp-hero-form) h1{font-size:clamp(19px,5.6vw,22px)}
.lp-hero:has(.lp-hero-form) h1{font-size:clamp(21px,6.1vw,24px);line-height:1.1;margin-bottom:2px}
.lp-hero-form{margin-top:8px}
}
@media(min-width:900px){.lp-hero:has(.lp-hero-form) .grid{align-items:start;grid-template-columns:1.4fr .6fr;gap:40px}.lp-hero:has(.lp-hero-form) .shot{align-self:center}.lp-hero:has(.lp-hero-form){overflow:clip;padding-top:18px}.lp-hero:has(.lp-hero-form) .kick{margin-bottom:6px}.lp-hero:has(.lp-hero-form) .lead{margin-top:8px}.lp-hero-form{margin-top:12px}.lp-hero:has(.lp-hero-form) h1{font-size:clamp(36px,3.5vw,46px);line-height:1.04}.lp-hero:has(.lp-hero-form) .lead{font-size:18px;margin-bottom:0;max-width:40em}}
@media(min-width:900px){.lp-hero-text.lp-hero:has(.lp-hero-form) .grid{grid-template-columns:1fr;max-width:1180px}}
/* ---- Formular v2: ein Schritt, schlank. Außen --r-image (24) = innen --r-el (12) + Innenabstand (12): konzentrisch. ---- */
.lp-form{position:relative;z-index:1;display:grid;gap:10px;max-width:none;margin:0;padding:12px;border:0;border-radius:var(--r-image);background:var(--lp-surface);box-shadow:0 0 0 1px rgba(21,32,26,.07),0 1px 2px rgba(21,32,26,.05),0 24px 44px -28px rgba(14,46,31,.34)}
.lp-form fieldset{border:0;padding:0;margin:0;min-width:0}
.lp-form legend{font-weight:600;font-size:14px;line-height:1.3;color:var(--green-d);margin:2px 2px 8px;padding:0}
.lp-form legend:focus{outline:none}
.lp-form .seg{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:2px;padding:3px;border-radius:var(--r-el);background:var(--paper);box-shadow:inset 0 0 0 1px var(--border-visible);transition:box-shadow .15s var(--ease)}
.lp-form .seg3{grid-template-columns:repeat(3,minmax(0,1fr))}
.lp-form .seg label{position:relative;display:flex;flex-direction:row;align-items:center;justify-content:center;gap:0;margin:0;min-height:44px;padding:0 4px;border-radius:calc(var(--r-el) - 3px);font-weight:600;font-size:14.5px;line-height:1.15;color:var(--ink);text-align:center;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;transition:background-color .15s var(--ease),color .15s var(--ease),box-shadow .15s var(--ease),scale .12s var(--ease)}
.lp-form .seg input{position:absolute;inset:0;width:100%;height:100%;min-height:0;margin:0;padding:0;border:0;opacity:0;cursor:pointer}
.lp-form .seg label:has(input:checked){background:var(--green-d);color:var(--dark-text1);box-shadow:0 1px 2px rgba(14,46,31,.35)}
.lp-form .seg label:active{scale:.96}
.lp-form .seg label:has(input:focus-visible){outline:3px solid var(--accent);outline-offset:2px}
@media(hover:hover){.lp-form .seg label:hover:not(:has(input:checked)){background:rgba(22,65,45,.07)}}
.lp-form .seg label+label::before{content:"";position:absolute;left:-2px;top:12px;bottom:12px;width:1px;background:var(--border-visible);opacity:.55;transition:opacity .15s var(--ease)}
.lp-form .seg label:has(input:checked)::before,.lp-form .seg label:has(input:checked)+label::before{opacity:0}
.lp-form .seg .ql{display:none}
.lp-form .f-obj.bad .seg{box-shadow:inset 0 0 0 1.5px var(--error)}
.lp-form .frow{display:grid;gap:10px}
.lp-form .fld{position:relative;display:block;margin:0;font-weight:400;font-size:16px;color:var(--ink)}
.lp-form .fld>span{position:absolute;left:14px;top:9px;z-index:1;font-size:12.5px;line-height:1;font-weight:600;color:var(--green-d);pointer-events:none}
.lp-form .fld input,.lp-form .fld textarea{display:block;width:100%;min-height:54px;padding:25px 14px 7px;border:0;border-radius:var(--r-el);background:var(--paper);box-shadow:inset 0 0 0 1px var(--border-visible);font:400 16px/1.3 var(--font-body);color:var(--ink);transition:box-shadow .15s var(--ease),background-color .15s var(--ease)}
.lp-form .fld textarea{min-height:96px;resize:vertical}
.lp-form .fld input::placeholder,.lp-form .fld textarea::placeholder{color:var(--muted);opacity:.85}
.lp-form .fld input:focus,.lp-form .fld textarea:focus{outline:3px solid var(--accent);outline-offset:2px;box-shadow:inset 0 0 0 1.5px var(--green-d);background:var(--lp-surface)}
.lp-form .fld.bad input{box-shadow:inset 0 0 0 1.5px var(--error)}
.lp-form .more{margin:-2px 0 0}
.lp-form .more summary{display:flex;align-items:center;gap:9px;min-height:44px;padding:0 2px;font-weight:600;font-size:15px;color:var(--green-d);cursor:pointer;list-style:none;border-radius:var(--r-el)}
.lp-form .more summary::-webkit-details-marker{display:none}
.lp-form .more summary::before{content:"";flex:0 0 auto;width:20px;height:20px;border-radius:50%;box-shadow:inset 0 0 0 1.5px var(--green-d);background:linear-gradient(var(--green-d),var(--green-d)) center/10px 1.5px no-repeat,linear-gradient(var(--green-d),var(--green-d)) center/1.5px 10px no-repeat;transition:background-size .2s var(--ease)}
.lp-form .more[open] summary::before{background-size:10px 1.5px,0 0}
.lp-form .more summary small{font-size:inherit;font-weight:400;color:var(--muted)}
.lp-form .more-body{display:grid;gap:10px;padding:2px 0 6px}
.lp-form .ffoot{display:grid;gap:10px}
.lp-form .chk{display:flex;flex-direction:row;align-items:center;gap:10px;min-height:44px;margin:0;padding:2px;font-weight:400;font-size:13.5px;line-height:1.4;color:var(--muted);cursor:pointer}
.lp-form .chk input{appearance:none;-webkit-appearance:none;flex:0 0 22px;width:22px;height:22px;min-height:0;margin:0;padding:0;border:0;border-radius:6px;background:var(--lp-surface);box-shadow:inset 0 0 0 1.5px var(--border-visible);cursor:pointer;transition:background-color .15s var(--ease),box-shadow .15s var(--ease)}
.lp-form .chk input:checked{background:var(--green-d) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 22 22'%3E%3Cpath d='M6 11.5l3.2 3.2L16 7.8' fill='none' stroke='white' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/100% no-repeat;box-shadow:none}
.lp-form .chk input:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.lp-form .chk a{color:var(--green-d);font-weight:600;text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--green)}
.lp-form .chk.bad{color:var(--error-ink)}
.lp-form .chk.bad input{box-shadow:inset 0 0 0 2px var(--error)}
.lp-form .err{display:none;margin:0;padding:9px 12px;border-left:3px solid var(--error);border-radius:0 var(--r-el) var(--r-el) 0;background:rgba(214,69,63,.08);color:var(--error-ink);font-size:14.5px;line-height:1.4;font-weight:600}
.lp-form .err.show{display:block}
.lp-form .btn{width:100%;justify-self:stretch;margin:0;min-height:54px}
.lp-form .fine1{margin:0;text-align:center;font-size:13px;line-height:1.4;color:var(--muted)}
.lp-form .fine{margin:0 2px;font-size:12px;line-height:1.5;color:var(--muted);text-wrap:pretty}
.lp-alt{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:0 2px;margin:0;padding-top:4px;border-top:1px solid var(--hair)}
.lp-alt a{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:44px;padding:0 10px;border-radius:var(--r-button);font-weight:600;font-size:15px;color:var(--green-d);text-decoration:none;transition:background-color .15s var(--ease),scale .12s var(--ease)}
.lp-alt a svg{width:17px;height:17px;flex:0 0 auto}
.lp-alt a+a{position:relative}
.lp-alt a+a::before{content:"";position:absolute;left:-2px;top:13px;bottom:13px;width:1px;background:var(--hair)}
.lp-alt a:active{scale:.96}
@media(hover:hover){.lp-alt a:hover{background:var(--paper);text-decoration:none}}
@media(max-width:599px){.lp-form{gap:8px}.lp-form legend{margin:0 2px 6px;font-size:13.5px}.lp-form .frow{gap:8px}.lp-form .fld input{min-height:50px;padding:22px 14px 6px}.lp-form .fld>span{top:8px}.lp-form .ffoot{gap:8px}.lp-form .more{margin:-4px 0 -2px}.lp-form{padding:10px 12px 12px}.lp-form .chk{min-height:40px;padding:0 2px;font-size:13px}.lp-form .more summary{min-height:44px}}
@media(max-width:399px){.lp-form .seg label{font-size:14px;padding:0 2px}.lp-alt a{font-size:14px;padding:0 6px;gap:5px}.lp-alt a svg{width:15px;height:15px}}
@media(min-width:760px){
.lp-form{padding:14px;gap:12px}
.lp-form legend{font-size:15px}
.lp-form .seg label{font-size:15.5px}
.lp-form .seg .ql{display:inline}
.lp-form .seg .qs{display:none}
.lp-form .frow{grid-template-columns:repeat(3,minmax(0,1fr))}
.lp-form .ffoot{grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:20px}
.lp-form .ffoot .err{grid-column:1/-1}
.lp-form .btn{width:auto;padding-left:34px;padding-right:34px}
.lp-hero-form .lp-form{max-width:44em}
}
${BLOECKE_CSS}
${FIT_CSS}${VARIANT_CSS ? '\n' + VARIANT_CSS : ''}
</style>`;

// Attribution beim Einstieg: Klick-IDs/UTM aus der URL in den Seiten-Speicher (window.__hg). Ins Endgerät (localStorage, 90 Tage)
// nur, wenn die Einwilligung vorliegt oder im Banner erteilt wird (§ 25 TDDDG). Merge statt Replace: Klick-IDs werden nur durch
// eine neue Klick-ID ersetzt; reine UTM-Besuche löschen keine gespeicherte gclid. url_passthrough/ads_data_redaction setzt das
// Head-Snippet in generate.mjs site-weit.
export function lpAttribJS(consentKey) {
  return `<script>(function(){var K=${JSON.stringify(ATTR_KEYS)},S='hg_attrib',C='${consentKey}';function allowed(){try{var v=JSON.parse(localStorage.getItem(C)||'null');return !!(v&&v.c==='allow')}catch(e){return false}}
function load(){try{var a=JSON.parse(localStorage.getItem(S)||'null');if(a&&a.ts&&Date.now()-a.ts>90*864e5){localStorage.removeItem(S);return null}return a}catch(e){return null}}
var q=new URLSearchParams(location.search),n={},hit=false,click=false;K.forEach(function(k){var v=q.get(k);if(v){n[k]=v.slice(0,200);hit=true;if(k==='gclid'||k==='wbraid'||k==='gbraid')click=true}});
var ok0=allowed();if(!ok0){try{localStorage.removeItem(S)}catch(e){}}var cur=(ok0&&load())||{};var m={};for(var k in cur)m[k]=cur[k];if(hit){for(var k2 in n){if(k2==='gclid'||k2==='wbraid'||k2==='gbraid'){if(click)m[k2]=n[k2]}else m[k2]=n[k2]}if(click){m.ts=Date.now();m.landing=location.pathname}else if(!m.landing){m.landing=location.pathname;m.ts=m.ts||Date.now()}}
window.__hg=m;function persist(){try{if(allowed()&&window.__hg&&Object.keys(window.__hg).length){localStorage.setItem(S,JSON.stringify(window.__hg))}}catch(e){}}persist();
document.addEventListener('click',function(e){var b=e.target.closest('#consent [data-c=allow]');if(b){setTimeout(persist,0)}if(e.target.closest('#consent [data-c=deny],#consent-reset')){try{localStorage.removeItem(S)}catch(x){}}});window.__hgPersist=persist})();</script>`;
}

function lpFormJS(slug, dankeUrl, consentKey) {
  // Ein-Schritt-Formular. Events: form_start (erste Eingabe), form_quickstart (Preis-/Chip-Klick), form_step{step:2} (Objekt + Ort gültig und ein Kontaktfeld
  // fokussiert/befüllt), form_error{field} (je Feld einmal), generate_lead (nach erfolgreichem Senden). Kein .focus() ohne Nutzeraktion:
  // Fokus nur beim Enter-Weiter und im Fehlerfall nach dem Absenden.
  return `<script>(function(){var f=document.getElementById('anfrage');if(!f)return;f.classList.add('js');f.noValidate=true;var started=false,sent2=false,errd={},via='',sm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';function dl(o){if(window.dataLayer){window.dataLayer.push(o)}}
function err1(k){if(errd[k])return;errd[k]=1;dl({event:'form_error',lp:'${slug}',field:k==='kontakt'?'tel':k})}
function consentState(){try{var v=JSON.parse(localStorage.getItem('${consentKey}')||'null');return v&&v.c?v.c:'none'}catch(e){return 'none'}}
var err=f.querySelector('.err'),sb=f.querySelector('button[type=submit]'),sbt=sb?sb.textContent:'',more=f.querySelector('.more');
var MSG={objekt:'Bitte wählen Sie aus, was geräumt werden soll.',ort:'Bitte geben Sie PLZ oder Ort an.',name:'Bitte geben Sie Ihren Namen an.',kontakt:'Bitte geben Sie eine Telefonnummer oder E-Mail-Adresse an.',email:'Bitte geben Sie eine gültige E-Mail-Adresse an.',dsgvo:'Bitte stimmen Sie der Verarbeitung Ihrer Angaben zu.'},ORDER=['objekt','ort','name','kontakt','dsgvo'],CONTACT={name:1,kontakt:1,anliegen:1};
function el1(n){return f.querySelector('[name='+n+']')}
function box(n){var e=el1(n);return e?(n==='objekt'?e.closest('.f-obj'):n==='dsgvo'?e.closest('.chk'):e.closest('.fld')):null}
function mark(n,on){var b=box(n),e=el1(n);if(b)b.classList.toggle('bad',on);if(e){if(on)e.setAttribute('aria-invalid','true');else e.removeAttribute('aria-invalid')}}
function kv(){var e=f.elements['kontakt'];return e?e.value.trim():''}
function fdata(){var d=new FormData(f);d.delete('kontakt');return d}
function stepOk(){var r=f.querySelector('input[name=objekt]:checked'),o=f.elements['ort'];return r&&o&&o.value.trim()&&o.checkValidity()?r.value:''}
function touched(){var n=f.elements['name'],t=f.elements['kontakt'],a=document.activeElement;return !!((n&&n.value.trim())||(t&&t.value.trim())||(a&&a.name&&CONTACT[a.name]))}
function step2(){if(sent2||!touched())return;var v=stepOk();if(v){sent2=true;dl({event:'form_step',lp:'${slug}',step:2,objekt:v})}}
f.addEventListener('focusin',function(e){if(e.target.name&&CONTACT[e.target.name])step2()});
f.addEventListener('input',function(e){var n=e.target.name;if(n){mark(n,false);step2()}if(err&&err.classList.contains('show')&&!f.querySelector('.bad'))err.classList.remove('show');if(!started){started=true;dl({event:'form_start',lp:'${slug}',start_via:via||(n==='objekt'?'chip':'field')})}});
document.addEventListener('click',function(e){var q=e.target.closest('[data-obj]');if(!q)return;var v=q.getAttribute('data-obj'),r=Array.prototype.filter.call(f.querySelectorAll('input[name=objekt]'),function(x){return x.value===v})[0];if(!r)return;e.preventDefault();r.checked=true;via=q.getAttribute('data-via')||'chip';r.dispatchEvent(new Event('input',{bubbles:true}));via='';dl({event:'form_quickstart',lp:'${slug}',objekt:v,start_via:q.getAttribute('data-via')||'chip'});var b=f.getBoundingClientRect();if(b.top<0||b.top>window.innerHeight*0.6){f.scrollIntoView({behavior:sm,block:'start'})}});
var NEXT={ort:'name',name:'kontakt'};
f.addEventListener('keydown',function(e){if(e.key!=='Enter'||e.target.tagName!=='INPUT'||e.target.type==='checkbox'||e.target.type==='radio')return;var nx=NEXT[e.target.name];if(nx){e.preventDefault();var t=f.elements[nx];if(t)t.focus()}});
window.addEventListener('pageshow',function(e){if(e.persisted&&sb){sb.disabled=false;sb.textContent=sbt;if(f.__sent){f.__sent=false;f.reset();started=false;sent2=false;errd={}}}});
function fill(){try{var k=kv(),mail=k.indexOf('@')>-1;f.elements['tel'].value=mail?'':k;f.elements['email'].value=mail?k:'';f.elements['kontaktweg'].value=mail?'E-Mail':'Anruf'}catch(e){}try{var a=window.__hg||{};${JSON.stringify(ATTR_KEYS)}.forEach(function(k){var el=f.elements[k];if(el&&a[k])el.value=a[k]});var lu=f.elements['landing_url'];if(lu)lu.value=(a.landing||location.pathname)+(a.ts?' @'+new Date(a.ts).toISOString():'');var ac=f.elements['ads_consent'];if(ac)ac.value=consentState()}catch(e){}}
function e164(t){t=String(t||'').replace(/\\(\\s*0\\s*\\)/,'').replace(/[^0-9+]/g,'');if(t.indexOf('00')===0)t='+'+t.slice(2);if(t.indexOf('0')===0)t='+49'+t.slice(1);if(t&&t[0]!=='+')t='+49'+t;t=t.replace(/^\\+490/,'+49');return /^\\+\\d{8,15}$/.test(t)?t:''}
function validate(){var bad=[];ORDER.forEach(function(n){var e=el1(n);if(!e)return;var ok=e.checkValidity();if(ok&&e.required&&/^(text|tel|email)$/.test(e.type)&&!e.value.trim())ok=false;if(ok&&n==='kontakt'){var v=e.value.trim();ok=v.indexOf('@')>-1?/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(v):/^[+()\\d\\s\\/.-]+$/.test(v)&&v.replace(/\\D/g,'').length>=6}mark(n,!ok);if(!ok){bad.push(n);err1(n)}});if(!bad.length){err.classList.remove('show');return true}
err.textContent=bad.length===1?(bad[0]==='kontakt'&&kv().indexOf('@')>-1?MSG.email:MSG[bad[0]]):'Bitte ergänzen Sie die markierten Felder.';err.classList.add('show');var first=bad[0],e=el1(first);if(first==='objekt'){var fs=e.closest('fieldset');if(fs)fs.scrollIntoView({behavior:sm,block:'center'});e.focus({preventScroll:true})}else{if(first==='email'&&more)more.open=true;e.focus()}return false}
f.addEventListener('submit',function(e){e.preventDefault();if(!validate())return;fill();var b=f.querySelector('button[type=submit]'),o=b.textContent;b.disabled=true;b.textContent='Wird gesendet…';
fetch('https://api.web3forms.com/submit',{method:'POST',headers:{Accept:'application/json'},body:fdata()}).then(function(r){return r.json()}).then(function(j){if(j&&j.success){f.__sent=true;var g=function(n){var el=f.elements[n];return el?String(el.value).trim():''};var r=f.querySelector('input[name=objekt]:checked');var cs=consentState();var done=false,go=function(){if(done)return;done=true;window.location.href='${dankeUrl}#ok'};var ev={event:'generate_lead',lead_source:'ads-lp',lp:'${slug}',objekt:r?r.value:'',kontaktweg:g('kontaktweg'),ads_consent:cs,eventCallback:go,eventTimeout:1200};if(cs==='allow'){ev.user_data={email:g('email')||undefined,phone_number:e164(g('tel'))||undefined}}dl(ev);setTimeout(go,1500)}else{b.disabled=false;b.textContent=o;err1('submit');alert('Es gab ein Problem beim Senden. Bitte rufen Sie uns kurz an oder schreiben Sie per WhatsApp.')}}).catch(function(){b.disabled=false;b.textContent=o;err1('submit');alert('Es gab ein Problem beim Senden. Bitte rufen Sie uns kurz an oder schreiben Sie per WhatsApp.')})});})();</script>`;
}

// Klebende Kontaktleiste (.scta) erst einblenden, wenn ca. 0,6 Bildschirmhöhen gescrollt wurden (Owner 29.10.: nicht im ersten Bildschirm).
// Nur auf den LPs (nicht auf /lp/danke/). .scta-wait + Transition (transform/visibility, .25 s; reduced-motion: keine Transition) stehen in site.css; die Leiste ist
// position:fixed, es gibt also keinen Layout-Sprung (CLS 0). Einmal sichtbar bleibt sie sichtbar (kein Flackern). Ohne JS bleibt sie sichtbar (Klasse setzt erst das Skript).
const SCTA_WAIT_JS = `<script>(function(){var s=document.querySelector('.scta');if(!s)return;function t(){return Math.round(window.innerHeight*.6)}function on(){if((window.pageYOffset||document.documentElement.scrollTop||0)>=t()){s.classList.remove('scta-wait');window.removeEventListener('scroll',on)}}s.classList.add('scta-wait');window.addEventListener('scroll',on,{passive:true});on()})();</script>`;

// Danke: lead_confirmed nur, wenn die Seite über den Formular-Redirect (#ok) erreicht wurde; Fragment wird sofort entfernt (Reload zählt nicht).
const DANKE_JS = `<script>(function(){try{if(location.hash==='#ok'){history.replaceState(null,'',location.pathname);if(window.dataLayer){window.dataLayer.push({event:'lead_confirmed'})}}}catch(e){}})();</script>`;

// Vorher/Nachher-Regler: initBA aus assets/js/site.js (Z.41–53) inline, weil LPs kein site.js laden. Nur angehängt, wenn die Seite ein .ba enthält.
// v4 (01.10.): Ort im Hero passend zum Standort des Suchenden. Google Ads hängt per Final-URL-Suffix der Kampagne
// loc_physical_ms={loc_physical_ms} an (Kriteriums-ID des physischen Standorts, meist PLZ/Stadtteil). Die IDs unten stammen aus
// geographic_view + geo_target_constant (Konto 5818024627, 17.09.–01.10.2026): P = Potsdam (Stadt, Stadtteile, PLZ 14467–14482),
// B = Spandau inkl. Kladow/Gatow (PLZ 13581–13599, 13629, 14089). Unbekannte ID / kein Parameter → Standardtext („im Havelland").
// Kein Speichern im Endgerät (nur URL lesen), läuft synchron direkt nach dem Hero → kein sichtbarer Textwechsel.
// Neue Gebiete: IDs per GAQL (geo_target_constant) ergänzen. Ersetzt wird nur, was lp.ort_swap markiert (h1: Form „in …", kick: Name).
const ORT_IDS = {
  P: [1003886, 9193451, 9214326, 9043185, 9043186, 9043183, 9043184, 9043187, 9068443, 9043159, 9043160, 9226520, 9211295, 9193521, 9211863, 9213567, 9219685, 9219864, 9220924, 9230190, 9236578, 9241239],
  B: [1003854, 9061138, 9210414, 9258317, 9191153, 9192284, 9193553, 9210882, 9214403, 9214627, 9043137, 9068352, 9043140, 9043193, 9043189, 9043188, 9068272, 9043143, 9043138, 9043139, 9043141, 9043144],
};
const ORT_FORM = { P: { in: 'in Potsdam', n: 'Potsdam' }, B: { in: 'in Berlin-Spandau', n: 'Berlin-Spandau' } };
const ORT_JS = `<script>(function(){try{var id=new URLSearchParams(location.search).get('loc_physical_ms');if(!id)return;var I=${JSON.stringify(ORT_IDS)},F=${JSON.stringify(ORT_FORM)},k=null;for(var g in I){if(I[g].indexOf(+id)>-1){k=g;break}}if(!k)return;Array.prototype.forEach.call(document.querySelectorAll('[data-ort]'),function(el){el.textContent=F[k][el.getAttribute('data-ort')]||el.textContent});document.documentElement.setAttribute('data-ort-gebiet',k)}catch(e){}})();</script>`;

const LP_BA_JS = `<script>(function(){function initBA(ba){if(!ba||ba.__baInit)return;ba.__baInit=true;var range=ba.querySelector('input[type=range]');if(!range)return;function set(){ba.style.setProperty('--pos',range.value+'%')}range.addEventListener('input',function(){set();var stage=ba.closest('.hero-stage');if(stage)stage.classList.add('dragged')});set()}Array.prototype.slice.call(document.querySelectorAll('.ba')).forEach(initBA)})();</script>`;
// site.css setzt .rv{opacity:0} (sichtbar erst mit .in, das site.js per IntersectionObserver setzt). LPs laden kein site.js → jede importierte
// Komponente bekommt ' in' sofort: kein Reveal, kein Layout-Shift. Auf JEDE Komponentenausgabe anwenden (accept.mjs prüft: kein rv ohne in).
const rvIn = html => html.replace(/class="([^"]*)"/g, (m, c) => { const t = c.split(' '); return t.includes('rv') && !t.includes('in') ? `class="${c} in"` : m; });

export function buildLp(d) {
  const { head, write, esc, tel, waHref, nap, DOMAIN, CONSENT_BANNER, TRACK_EVENTS, CONSENT_RESET_JS, CONSENT_KEY, orgSchema, reviews, config, CP, isReal, pic, leaf, proof, IMG } = d;
  const consentKey = CONSENT_KEY || 'consent_v2';
  // esc aus generate.mjs maskiert kein Anführungszeichen: für Attributwerte hier ein eigenes Escaping, damit ein " in lp.json das Attribut nicht aufbricht.
  const escA = v => esc(v).replace(/"/g, '&quot;');
  // pic() aus generate.mjs maskiert in alt="…" kein Anführungszeichen (und escaped selbst): gerade " vorher durch ein typografisches ” ersetzen.
  const altQ = v => String(v).replace(/"/g, '”');
  const cp = CP('lp.json');
  if (!cp || !Array.isArray(cp.lps)) return 0;
  const W3F = isReal(config.web3forms_key);
  const dankeUrl = '/lp/danke/';
  const telDisp = esc(nap.phone_display);
  const resetJS = CONSENT_RESET_JS || '';
  // v5 (02.10.): Aktion aus lp.json (Root „aktion“ {label,text,bis}) — Pflicht-Gegenstück zum Angebots-Asset der Kampagne (Google prüft das Angebot
  // auf der Final-URL). Nach „bis“ rendert der Generator nichts mehr; für bereits ausgelieferte Seiten blendet AKTION_JS sie clientseitig aus.
  const akt = cp.aktion && cp.aktion.bis && Date.now() <= new Date(cp.aktion.bis + 'T23:59:59+01:00').getTime() ? cp.aktion : null;
  // v7: eine Aktionskarte für Hero und #preise (badge, karte_titel, karte_bedingung), Bedingung ausgeschrieben, kein Sternchen (Spec 09 §5).
  const aktKarte = aktionKarte(akt, { esc, escA });
  const AKTION_JS = akt ? `<script>(function(){var n=Date.now();Array.prototype.forEach.call(document.querySelectorAll('.lp-aktion[data-bis]'),function(el){if(n>new Date(el.getAttribute('data-bis')+'T23:59:59+01:00').getTime())el.remove()})})();</script>` : '';

  // Google-Kennzahl aus proof.google_reviews mit derselben Live-Schwelle wie trustLine in generate.mjs (Prinzip 6: keine hartcodierten Zahlen in lp.json).
  const gr = (proof && proof.google_reviews) || {};
  const grLive = !!(reviews && reviews.enabled) && (gr.count || 0) >= ((reviews && reviews.block_ab_count) || 5) && !!gr.rating;

  // Kopf (v7): Vertrauensleiste (nur bei grLive), Logo, „Zur Website“ als einziger Ausgang (Owner 20.10., kein Menü), Telefon-Pill mit sichtbarer Nummer.
  const lpHeader = href => `${topbar(grLive ? gr : null, esc)}<header class="lp-head"><div class="wrap nav"><a class="logo" href="${href}" aria-label="${escA(nap.name)}"><picture style="display:contents"><source type="image/webp" srcset="/assets/img/logo-lp-360.webp"><img src="/assets/img/logo-lp-180.png" alt="${escA(nap.name)}" width="180" height="193" decoding="async"></picture></a><a class="lp-web" href="/"><span class="lw">Zur </span>Website ${ICON_ARROW}</a><a class="callpill" href="tel:${tel}">${PHONE_SVG}<span class="num">${telDisp}</span></a></div></header>`;

  // Sticky-Bar mit sichtbarer Nummer (Anruf-Conversion: Google ersetzt den sichtbaren Nummerntext) und gedämpftem WhatsApp (ein Gold je Viewport)
  const lpScta = waText => `<nav class="scta" aria-label="Schnellkontakt"><a class="call" href="tel:${tel}">☎ ${telDisp}</a><a class="wa" href="${waHref(waText)}">WhatsApp</a></nav>`;

  // Fußzeile (Umbau 11/2026): Rechtsform + Gesellschafter im Wortlaut des Impressums (generate.mjs impressumBody: „Haus- & Gartenservice Havelland GbR“ / „Vertreten durch die Gesellschafter: …“), beides aus data/nap.json.
  const gesellschafter = esc((nap.gesellschafter_impressum || nap.gesellschafter || [nap.inhaber]).join(' und '));
  const lpFooter = `<footer class="lp-foot"><div class="wrap"><p class="fnap">${esc(nap.name)} ${esc(nap.rechtsform || 'GbR')}</p><p>Vertreten durch die Gesellschafter: ${gesellschafter}.</p><p>${esc(nap.street || '')}, ${esc(nap.zip || '')} ${esc(nap.city)} · <a href="tel:${tel}">${telDisp}</a> · <a href="mailto:${esc(nap.email)}">${esc(nap.email)}</a></p><p>Servicegebiet: ${GEBIET.map(esc).join(' · ')}</p><div class="legal"><a href="/impressum/">Impressum</a><a href="/datenschutz/">Datenschutz</a><button type="button" class="linklike" id="consent-reset">Cookie-Einstellungen</button><a href="/">Zur Website</a></div></div></footer>`;

  // Vorher/Nachher-Slider aus components.mjs (WebP-768: baSlider setzt <img src>, kein <picture>; WebP statt JPG spart ~120 KB je Paar — Perf-Messung 14.09.; Hochformat 864/1036 = .ba-Aspect).
  // Der Alt-Suffix der Komponente ist heckenspezifisch („nach dem Schnitt") → für Räumungen ersetzt.
  const imgSrc = slug => `/assets/img/${slug}-768.webp`;
  const baLp = o => baSlider(o).replace(/ — nach dem Schnitt"/g, ' — nach der Räumung"').replace(/ — vor dem Schnitt"/g, ' — vor der Räumung"');
  // Aspect-Ratio aus dem Manifest (Fall-Fotos sind 768/1024 = 3:4, nicht 864/1036) — sonst wird das Bild in der falschen Box beschnitten.
  const baPair = (f, { lcp = false } = {}) => { const m = (IMG && IMG[f.vorher]) || {}; return baLp({ vorher: imgSrc(f.vorher), nachher: imgSrc(f.nachher), alt: f.alt || f.cap || 'Entrümpelung', cap: f.cap || '', sub: f.sub || '', hint: true, lcp, w: m.w || 864, h: m.h || 1036 }); };
  const pairOk = f => !!(f && f.vorher && f.nachher && pic(f.vorher) && pic(f.nachher));
  // Hero-Schalter je LP (lp.json hero.typ): ba = echte Vorher/Nachher-Fotos als Slider, foto = Manifest-Bild als Fotokarte (.shot .main),
  // text = einspaltig ohne Karte. Fallback ohne hero-Feld: erstes fotos-Paar → ba, sonst text.
  const heroOf = lp => {
    const h = lp.hero || (Array.isArray(lp.fotos) && lp.fotos[0] ? { typ: 'ba', ...lp.fotos[0] } : { typ: 'text' });
    if (h.typ === 'ba' && pairOk(h)) return { cls: 'lp-hero-ba', shot: `<div class="shot">${baPair(h, { lcp: true })}</div>`, key: `${h.vorher}|${h.nachher}` };
    if (h.typ === 'foto' && h.slug && pic(h.slug)) return { cls: 'lp-hero-foto', shot: `<div class="shot">${pic(h.slug, { cls: 'main', alt: altQ(h.alt || `${lp.name} im Havelland – ${nap.name}`), sizes: '(max-width:900px) 92vw, 46vw', lcp: true })}</div>`, key: '' };
    return { cls: 'lp-hero-text', shot: '', key: '' };
  };

  // Bewertungen (v7, Spec 09 §7): wörtliche GBP-Texte aus lp.json (bewertungen), Auswahl je LP (bewertungen_lp, sonst bewertungen_lp_standard).
  // data/reviews.json bleibt Quelle der Website-Session (/bewertungen/); hier nur die Live-Schwelle (grLive).
  const revOn = !!(reviews && reviews.enabled); // Schalter der Website-Session: aus = keine Bewertungskarten und kein Hero-Zitat
  const revOf = lp => (lp.bewertungen_lp || cp.bewertungen_lp_standard || []).map(k => {
    const r = (cp.bewertungen || {})[k];
    if (!r) throw new Error(`lp ${lp.slug}: bewertungen.${k} fehlt in lp.json`);
    return r;
  });
  // Hero-Zitat: zitat_hero der LP (false = keins) vor dem Standard; muss wörtlicher Teil der verknüpften Bewertung sein (keine erfundenen Zitate).
  const zitatOf = lp => {
    const z = lp.zitat_hero === false ? null : (lp.zitat_hero || cp.zitat_hero || null);
    if (z && !String((((cp.bewertungen || {})[z.quelle]) || {}).t || '').includes(z.t)) throw new Error(`lp ${lp.slug}: zitat_hero ist kein wörtlicher Auszug aus bewertungen.${z.quelle}`);
    return z;
  };

  // Galerie: nur echte Fotos als Vorher/Nachher-Slider ({vorher, nachher, cap, sub}); Slugs müssen im Manifest stehen, sonst wird das Paar übersprungen.
  // Das Hero-Paar wird nicht wiederholt (skipKey). Ein einzelnes Paar bleibt einspaltig und begrenzt.
  const gallery = (lp, skipKey) => {
    const pairs = (Array.isArray(lp.fotos) ? lp.fotos : []).filter(f => pairOk(f) && `${f.vorher}|${f.nachher}` !== skipKey);
    if (!pairs.length) return '';
    const items = pairs.map(f => `<div>${baPair(f)}</div>`).join('');
    return `<section class="sec" id="fotos"><div class="wrap"><div class="head"><h2>${esc(lp.fotos_h2 || 'So sieht unsere Arbeit aus')}</h2></div><p class="hint" style="margin:-4px 0 22px;color:var(--muted)">${esc(lp.fotos_hint || 'Echte Fotos aus einem dokumentierten Auftrag, nur zugeschnitten. Genau so bekommen Sie Ihren Foto-Nachweis aufs Handy.')}</p><div class="lp-gallery"${pairs.length === 1 ? ' style="grid-template-columns:1fr;max-width:560px;margin:0 auto"' : ''}>${items}</div></div></section>`;
  };

  const shortLabel = o => String(o).split(' / ')[0];
  const objLabel = (o, lp) => { const k = ((lp && lp.objekte_kurz) || {})[o] || shortLabel(o); return k !== o ? `<span class="ql">${esc(o)}</span><span class="qs">${esc(k)}</span>` : esc(o); };
  const form = (lp, pos, wa) => {
    const hidden = W3F
      ? `<input type="hidden" name="access_key" value="${escA(config.web3forms_key)}"><input type="hidden" name="subject" value="${escA(lp.form_subject || 'Neue Anfrage (Ads-LP)')}"><input type="hidden" name="from_name" value="${escA(nap.name)}"><input type="hidden" name="redirect" value="${DOMAIN}${dankeUrl}"><input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" style="display:none">`
      : '';
    const attrib = ['quelle', 'lp', ...ATTR_KEYS, 'landing_url', 'ads_consent']
      .map(n => `<input type="hidden" name="${n}" value="${n === 'quelle' ? 'ads-lp' : n === 'lp' ? escA(lp.slug) : ''}">`).join('');
    // Ein Schritt (v2): Objekt als Segment-Leiste (Kurzlabel auf dem Handy, voller Wortlaut ab 760 px), PLZ/Name/Telefon mit Label im Feld,
    // Kontaktweg fest „Anruf“ (versteckt). „Weitere Angaben“ (E-Mail, Freitext, Kontaktweg-Wahl) auf Owner-Wunsch 29.10.2026 entfernt. Radio-Inputs bleiben echte Inputs (unsichtbar über dem Segment).
    if (![3, 4].includes((lp.objekte || []).length)) throw new Error(`lp ${lp.slug}: objekte braucht 3 oder 4 Einträge (Segment-Leiste)`);
    const chips = (lp.objekte || []).map((o, i) => `<label><input type="radio" name="objekt" value="${escA(o)}"${i === 0 ? ' required' : ''}>${objLabel(o, lp)}</label>`).join('');
    const alt = pos === 'hero'
      ? `<p class="lp-alt"><a href="tel:${tel}">${PHONE_SVG} ${telDisp}</a><a href="${wa}">WhatsApp mit Foto</a></p>`
      : `<p class="kf-alt">Lieber direkt? <a href="tel:${tel}">Anrufen: ${telDisp}</a> · <a href="${wa}">WhatsApp schreiben</a></p>`;
    return `<form id="anfrage" class="kf lp-form" action="https://api.web3forms.com/submit" method="POST">${hidden}${attrib}
<fieldset class="f-obj"><legend>${esc(lp.form_legend || 'Was soll geräumt werden – und wo?')}</legend><div class="seg${(lp.objekte || []).length === 3 ? ' seg3' : ''}">${chips}</div></fieldset>
<div class="frow"><label class="fld"><span>PLZ oder Ort</span><input name="ort" autocomplete="postal-code" enterkeyhint="next" placeholder="z. B. 14612 Falkensee" required></label>
<label class="fld"><span>Name</span><input name="name" autocomplete="name" enterkeyhint="next" required></label>
<label class="fld"><span>Telefon oder E-Mail</span><input name="kontakt" type="text" autocomplete="tel" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="für Rückruf oder Angebot" required></label></div>
<input type="hidden" name="tel" value=""><input type="hidden" name="email" value=""><input type="hidden" name="kontaktweg" value="Anruf">
<p class="err" role="alert"></p>
<div class="ffoot"><label class="chk"><input type="checkbox" name="dsgvo" required><span>Ich stimme der Verarbeitung meiner Angaben zur Kontaktaufnahme und für das Angebot zu (<a href="/datenschutz/">Datenschutz</a>).</span></label>
<button class="btn btn-acc" type="submit">${esc(lp.cta_form || 'Kostenlos anfragen')}</button></div>
<p class="fine1">Besichtigung und Angebot kostenlos · Antwort noch am selben Werktag</p>
${alt}
<p class="fine">Ihre Einwilligung können Sie jederzeit widerrufen. Keine Werbeanrufe. Ihre Angaben gehen über den Formulardienst Web3Forms an unser Postfach. Nur wenn Sie im Cookie-Banner zugestimmt haben, übermitteln wir Ihre E-Mail-Adresse oder Telefonnummer in gehashter Form an Google, um den Erfolg unserer Anzeigen zu messen – Details in der Datenschutzerklärung.</p>
</form>`;
  };

  const normItem = x => typeof x === 'string' ? { t: x } : x;

  let n = 0;
  for (const lp of cp.lps) {
    for (const x of ((lp.preis && lp.preis.anker && lp.preis.anker.items) || []).map(normItem)) if (x.obj && !(lp.objekte || []).includes(x.obj)) throw new Error(`lp ${lp.slug}: preis.anker obj "${x.obj}" steht nicht in objekte`);
    if (lp.lead_mobil && String(lp.lead || '').length > 90) throw new Error(`lp ${lp.slug}: lead_mobil verlangt lead <= 90 Zeichen`);
    const url = `/lp/${lp.slug}/`;
    // Variante B: steht der kursive Zusatz am Ende der H1 (nach einem ersten Satz), wird er samt Schlusspunkt zur leisen Unterzeile (em.tail, CSS in lp-varianten.mjs).
    const emAt = lp.h1_em ? lp.h1.indexOf(lp.h1_em) : -1;
    const h1Tail = VARIANTE === 'b' && emAt > 0 && ['', '.'].includes(lp.h1.slice(emAt + lp.h1_em.length));
    const h1 = h1Tail
      ? `${esc(lp.h1.slice(0, emAt))}<em class="tail">${esc(lp.h1.slice(emAt))}</em>`
      : lp.h1_em && lp.h1.includes(lp.h1_em)
        ? esc(lp.h1).replace(esc(lp.h1_em), `<em>${esc(lp.h1_em)}</em>`)
        : esc(lp.h1);
    const wa = waHref(lp.wa_text || 'Hallo, ich hätte gern eine kostenlose Besichtigung.');
    const H = heroOf(lp);
    const os = lp.ort_swap || {};
    const ortWrap = (html, t, form) => t && html.includes(esc(t)) ? html.replace(esc(t), `<span data-ort="${form}">${esc(t)}</span>`) : html;
    const h1o = ortWrap(h1, os.h1, 'in'), kicko = ortWrap(esc(lp.kick), os.kick, 'n');
    const ortJs = (h1o !== h1 || kicko !== esc(lp.kick)) ? ORT_JS : '';
    // v3 (01.10., ads-check: 1 Formularstart auf 58 Klicks): Ab-Preise im Fold (Preis-Suchende, Sitelink #preise = 20 % der Klicks).
    // v7 (Owner 20.10. „oben“): Preis-Kacheln ÜBER dem Formular; Tippen auf eine Kachel wählt das Objekt vor (form_quickstart, data-via=preis).
    // Preise nur aus lp.preis.anker (keine Zahl doppelt pflegen), „inkl. MwSt.“ steht in der Zeile über den Kacheln.
    const anker = lp.preis && lp.preis.anker;
    const heroPreis = preisBlock(anker, lp.preis.hero_note ?? 'Entsorgungsgebühren nach Beleg, ohne eigenen Aufschlag', { esc, escA });
    const quick = (lp.objekte || []).length ? `<div class="lp-quick"><p class="lp-quick-l" id="q-${escA(lp.slug)}">${esc(lp.quick_label || 'Was soll geräumt werden?')}</p><div class="lp-quick-c" role="group" aria-labelledby="q-${escA(lp.slug)}">${lp.objekte.map(o => `<a href="#anfrage" data-obj="${escA(o)}">${objLabel(o, lp)}</a>`).join('')}</div></div>` : '';
    const pos = lp.form_pos === 'nach-preis' ? 'nach-preis' : 'hero';
    const heroForm = pos === 'hero' ? `<div class="lp-hero-form">${form(lp, 'hero', wa)}</div>` : '';
    const aktLp = lp.aktion === false ? '' : aktKarte;
    const heroCta = pos === 'nach-preis' ? `<div class="cta-row lp-cta"><a class="btn btn-acc" href="#anfrage">${esc(lp.cta)}</a><a class="btn btn-line" href="tel:${tel}">${PHONE_SVG} Anrufen: ${telDisp}</a><a class="btn btn-line" href="${wa}">WhatsApp mit Foto</a></div>` : '';
    const person = lp.kontaktperson && lp.kontaktperson.zeigen && lp.kontaktperson.slug && pic(lp.kontaktperson.slug)
      ? `<p class="lp-person">${pic(lp.kontaktperson.slug, { cls: 'av', alt: altQ(lp.kontaktperson.alt || ''), sizes: '56px' })}<span>${esc(lp.kontaktperson.zeile)}</span></p>` : '';
    // Umbau 11/2026 (Prüfung B3: Preis-Sitelink landet auf #preise, Formular 4.200 px darüber): CTA direkt unter den Kacheln samt Fußnote, vor dem langen Text.
    // Der Button heißt „Festpreis anfragen“ (Owner-Vorgabe); der Erklärtext darunter trägt den vollen Wortlaut „Festpreis für Räumung und Abtransport“. Nur mit Kacheln (preis.anker).
    const preisCta = preisBlock(anker, anker && anker.note, { esc, escA }, { label: false })
      ? `<div class="cta-row lp-cta lp-preis-cta"><a class="btn btn-acc" href="#anfrage">Festpreis anfragen</a></div><p class="hint lp-preis-cta-h">Festpreis für Räumung und Abtransport, schriftlich nach der kostenlosen Besichtigung.</p>` : '';
    const preisVerweis = lp.preis && lp.preis.verweis ? `<p class="lp-preisverweis"><a href="/lp/${escA(lp.preis.verweis.slug)}/#preise">${esc(lp.preis.verweis.t || 'Preise ansehen')}</a></p>` : '';
    const kontaktSec = pos === 'nach-preis' ? `<section class="sec" id="kontakt"><div class="wrap"><div class="head"><h2>${esc(lp.kontakt_h2 || 'Kostenlose Besichtigung anfragen')}</h2></div><p class="hint" style="margin:-4px 0 18px;color:var(--muted)">Ein Schritt, keine Vorkasse, keine Verpflichtung. Der Festpreis für Räumung und Abtransport kommt nach der Besichtigung, Entsorgungsgebühren weisen wir nach Beleg aus.</p>${form(lp, 'nach-preis', wa)}</div></section>` : '';
    // was_wir_tun {h, p, items:[{h,p}]} (optional, z. B. Allgemein-LP): Abschnitt direkt nach dem Hero. Gleiche Komponenten wie die Startseite (.sec/.head, .sec-lead, .vals/.v mit kursiver Nummer .vn),
    // Reveal-Klassen über rvIn(). Kein eigenes CSS.
    const valsSec = (id, d, hDefault) => d && Array.isArray(d.items) && d.items.length
      ? `<section class="sec" id="${id}"><div class="wrap"><div class="head"><h2>${esc(d.h || hDefault)}</h2></div>${d.p ? `<p class="sec-lead">${esc(d.p)}</p>` : ''}${rvIn(`<div class="vals">${d.items.map((x, i) => `<div class="v rv${i ? ` d${i}` : ''}"><h3><span class="vn">${String(i + 1).padStart(2, '0')}</span>${esc(x.h)}</h3><p>${esc(x.p)}</p></div>`).join('')}</div>`)}</div></section>` : '';
    const wwt = valsSec('was-wir-tun', lp.was_wir_tun, 'Was wir tun');
    // preis_faktoren {h, p, items:[{h,p}]} (Kosten-LP, Umbau 11/2026): Einflussfaktoren auf den Preis, direkt nach dem Hero, nur Aussagen aus den bestehenden LPs, keine Beträge.
    const pfk = valsSec('preisfaktoren', lp.preis_faktoren, 'Was den Preis bestimmt');
    const main = `<main id="top">
<section class="phero lp-hero ${H.cls}"${lp.lead_mobil ? ' data-lead-mobil' : ''}${lp.h1.length > 80 ? ' data-h1-lang' : ''}${h1Tail ? ' data-h1-tail' : ''}>${leaf('hleaf')}<div class="wrap grid"><div><span class="kick"><span class="dot"></span> ${kicko}</span>${trustZeile(lp.trust_zeile, esc)}<h1>${h1o}</h1><p class="lp-ort${String(lp.lead || '').includes(ORT_PHRASE) ? ' lp-ort-dup' : ''}">${esc(ORT_SATZ)}</p><p class="lead">${esc(lp.lead)}</p>
${heroPreis}${heroForm || quick}${heroForm && revOn ? zitat(zitatOf(lp), esc) : ''}${aktLp}${heroCta}
${punkte(lp.trust, esc)}${person}</div>${H.shot}</div></section>${ortJs}
${wwt}${pfk}
${rvIn(gstripFrom((lp.nutzen || []).map(x => ({ h: esc(x.h), p: esc(x.p) }))))}
<section class="sec section-alt"><div class="wrap"><div class="head"><h2>${esc(lp.abschnitt_ablauf || 'So läuft es ab')}</h2></div>${lp.ablauf_lead ? `<p class="sec-lead">${esc(lp.ablauf_lead)}</p>` : ''}${rvIn(timelineFrom((lp.ablauf || []).map(x => ({ when: x.when ? esc(x.when) : '', h: esc(x.h), p: esc(x.p) }))))}<div class="cta-row lp-cta"><a class="btn btn-acc" href="#anfrage">${esc(lp.cta)}</a></div></div></section>
${gallery(lp, H.key)}
<section class="sec" id="preise"><div class="wrap"><div class="head"><h2>${esc(lp.preis.h)}</h2></div><div class="lp-preis">${preisBlock(anker, anker && anker.note, { esc, escA }, { label: false })}${preisCta}${aktLp}${preisVerweis}${(lp.preis.p || []).map(t => `<p>${esc(t)}</p>`).join('')}</div><div class="cta-row lp-cta"><a class="btn btn-acc" href="#anfrage">${esc(lp.preis.cta || lp.cta)}</a><a class="btn btn-line" href="${wa}">Foto per WhatsApp schicken</a></div><p class="hint">${esc(lp.preis.cta_hint || 'Den Festpreis für Räumung und Abtransport nennen wir nach der kostenlosen Besichtigung, schriftlich.')}</p></div></section>
${!revOn ? '' : bewertungen({ items: revOf(lp), gr: grLive ? gr : null, h2: lp.testimonials_h2 || 'Was Kunden über uns sagen', em: lp.testimonials_h2_em || 'sagen' }, esc)}
${kontaktSec}
<section class="sec section-alt" id="fragen"><div class="wrap"><div class="head"><h2>Häufige Fragen</h2></div><div class="faq">${(lp.faqs || []).map(f => `<details><summary>${esc(f.q)}<span class="pm" aria-hidden="true"></span></summary><p>${esc(f.a)}</p></details>`).join('')}</div></div></section>
<section class="zone-deep end"><div class="wrap"><h2>${esc(lp.end_h2 || 'Sie zeigen, wir räumen.')}</h2><p>${esc(lp.end_p || 'Kostenlose Besichtigung, schriftlicher Festpreis für Räumung und Abtransport, besenreine Übergabe – im Havelland, in Berlin-Spandau und Potsdam.')}</p><div class="cta-row"><a class="btn btn-acc" href="#anfrage">${esc(lp.cta)}</a><a class="btn btn-line" href="tel:${tel}">☎ ${telDisp}</a></div></div></section>
</main>`;
    const baJs = /class="ba[ "]/.test(main) ? LP_BA_JS : '';
    const html = head(lp.title, lp.meta, url, orgSchema(), { noindex: true, extraHead: FONT_PRELOAD + LP_CSS + lpAttribJS(consentKey) })
      + lpHeader('/') + main + lpFooter + lpScta(lp.wa_text || 'Hallo, ich hätte gern eine kostenlose Besichtigung.') + SCTA_WAIT_JS
      + CONSENT_BANNER + TRACK_EVENTS + lpFormJS(lp.slug, dankeUrl, consentKey) + resetJS + baJs + AKTION_JS + '</body></html>';
    write(url, html);
    n++;
  }

  // Danke-Seite (Conversion-Ziel der LPs; noindex; lead_confirmed nur über #ok-Fragment)
  const dk = cp.danke || {};
  // Schritte als Timeline (gleiche Komponente wie der Ablauf; Sätze ohne Titel/Zeitchip). Text-Hero ohne Fotokarte.
  const dkSteps = (dk.next || []).map(t => typeof t === 'string' ? { h: '', p: esc(t) } : { when: t.when ? esc(t.when) : '', h: esc(t.h || ''), p: esc(t.p || '') });
  const dkH1Raw = dk.h1 || 'Danke für Ihre Anfrage.';
  const dkH1 = dk.h1_em && dkH1Raw.includes(dk.h1_em) ? esc(dkH1Raw).replace(esc(dk.h1_em), `<em>${esc(dk.h1_em)}</em>`) : esc(dkH1Raw);
  const main = `<main class="lp-danke"><section class="phero lp-hero lp-hero-text">${leaf('hleaf')}<div class="wrap grid"><div><span class="kick"><span class="dot"></span> Anfrage eingegangen</span><h1>${dkH1}</h1><p class="lead">${esc(dk.lead || '').replace('{tel}', telDisp)}</p></div></div></section>
<section class="sec"><div class="wrap"><div class="head"><h2>So geht es weiter</h2></div>${rvIn(timelineFrom(dkSteps))}<p class="hint" style="margin-top:24px;color:var(--muted)">${esc(dk.eilig || '')}</p><div class="cta-row lp-cta"><a class="btn btn-acc" href="tel:${tel}">☎ ${telDisp}</a><a class="btn btn-line" href="${waHref('Hallo, ich habe gerade das Formular geschickt – hier noch ein Foto dazu.')}">Foto per WhatsApp nachschicken</a></div></div></section></main>`;
  write(dankeUrl, head(`${dk.title || 'Danke'} – Havelland`, 'Ihre Anfrage ist beim Haus- & Gartenservice Havelland eingegangen. Wir melden uns noch am selben Werktag.', dankeUrl, orgSchema(), { noindex: true, extraHead: FONT_PRELOAD + LP_CSS })
    + lpHeader('/') + main + lpFooter + lpScta('Hallo, ich habe gerade das Formular geschickt – hier noch ein Foto dazu.')
    + CONSENT_BANNER + TRACK_EVENTS + DANKE_JS + resetJS + '</body></html>');
  return n + 1;
}
