// lp-bloecke.mjs — Bausteine des LP-Redesigns (Spec gbr-firma ads/daten/2026-10-20-ueberarbeitung/09-lp-redesign-spec.md):
// Vertrauensleiste, Häkchen-Zeile (Handy), Preis-Kacheln, Zitat, Aktionskarte, Vertrauenspunkte, Bewertungen, dazu BLOECKE_CSS.
// Reine Funktionen (Daten rein, HTML raus). Escaping kommt vom Aufrufer (esc/escA aus lp.mjs). Test: node --test scripts/lp-bloecke.test.mjs
// Klassen-Regel (accept.mjs der Website-Session): nie lp-card/lp-steps/lp-quote/lp-ba-grid/lp-trust → hier lp-zitat und lp-checks;
// trust-row und review-card bleiben als Klassen erhalten (accept.mjs zählt sie).

export const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m8 12.5 2.6 2.6L16 9.5"/></svg>';
export const ICON_CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
export const ICON_ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';

export const note5 = r => Number(r).toFixed(1).replace('.', ',');
export const datumDE = iso => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}.${m[2]}.${m[1]}` : ''; };
export const monatDE = iso => { const m = String(iso || '').match(/^(\d{4})-(\d{2})/); return m ? `${m[2]}/${m[1]}` : ''; };
export const sterne = () => '<span class="lp-st" role="img" aria-label="5 von 5 Sternen">★★★★★</span>';

// Vertrauensleiste über dem Kopf (nicht klebend). gr = proof.google_reviews, nur bei grLive übergeben, sonst null → keine Leiste.
export function topbar(gr, esc) {
  if (!gr) return '';
  return `<div class="lp-topbar"><div class="wrap">${sterne()}<span>${esc(note5(gr.rating))} bei Google · ${esc(gr.count)} Bewertungen</span><span class="d" aria-hidden="true">·</span><span class="fk">Betrieb aus Falkensee</span></div></div>`;
}

// Handy-Zeile an der Kick-Position: nur trust_zeile der LP mit Häkchen (die Google-Zahl steht in der Leiste).
export function trustZeile(text, esc) {
  return text ? `<p class="lp-trust1">${ICON_CHECK}<span>${esc(text)}</span></p>` : '';
}

// Preis-Kacheln aus preis.anker.items. Der Text bleibt zusammenhängend („Wohnungsauflösung ab 499 €“) für Message Match und die
// Belegprüfung der Anzeigentexte: das Kurzlabel k steht im DOM NACH dem Preis und wird auf dem Handy per CSS (order:-1) nach oben geholt.
const PZ = /^(.*?)\s+ab\s+([\d.]+(?:,\d+)?\s?€)\s*$/;
export function kacheln(items, { esc, escA }) {
  const xs = (items || []).map(x => typeof x === 'string' ? { t: x } : x).filter(x => x && x.t);
  if (!xs.length) return '';
  if (xs.length > 3) throw new Error(`preis.anker: höchstens 3 Einträge (Kacheln), gefunden ${xs.length}`);
  const zelle = x => {
    const m = PZ.exec(x.t);
    const inner = m
      ? `<span class="pl">${esc(m[1])}</span> <span class="pp"><small>ab</small> ${esc(m[2])}</span>${x.k ? `<span class="pk" aria-hidden="true">${esc(x.k)}</span>` : ''}`
      : `<span class="pl">${esc(x.t)}</span>`;
    return x.obj
      ? `<a class="lp-tile" href="#anfrage" data-obj="${escA(x.obj)}" data-via="preis" aria-label="${x.k ? escA(x.k) + ': ' : ''}${escA(x.t)} – Anfrage zu ${escA(x.obj)} starten">${inner}<span class="go" aria-hidden="true">Anfragen ${ICON_CHEV}</span></a>`
      : `<div class="lp-tile">${inner}</div>`;
  };
  return `<div class="lp-tiles n${xs.length}">${xs.map(zelle).join('')}</div>`;
}

// Preisblock: Zeile „Einstiegspreis(e) inkl. MwSt.“ + Kacheln + Hinweis. Im Abschnitt #preise ohne Zeile (dort steht die H2).
export function preisBlock(anker, note, ctx, { label = true } = {}) {
  const k = kacheln(anker && anker.items, ctx);
  if (!k) return '';
  const n = anker.items.filter(x => x && (typeof x === 'string' || x.t)).length;
  return `<div class="lp-preise">${label ? `<p class="lp-preise-l">${n > 1 ? 'Einstiegspreise' : 'Einstiegspreis'} inkl. MwSt.</p>` : ''}${k}${note ? `<p class="lp-preise-n">${ctx.esc(note)}</p>` : ''}</div>`;
}

// Zitat unter dem Formular: wörtlicher Auszug aus einer echten Google-Bewertung (lp.mjs prüft die Wörtlichkeit gegen lp.json bewertungen).
export function zitat(z, esc) {
  if (!z || !z.t || !z.a) return '';
  return `<figure class="lp-zitat"><blockquote>„${esc(z.t)}“</blockquote><figcaption>${sterne()}<span>${esc(z.a)}${z.tag ? ' · ' + esc(z.tag) : ''} · Google</span></figcaption></figure>`;
}

// Aktionskarte (Klasse lp-aktion bleibt: AKTION_JS blendet sie nach data-bis aus). Bedingung ausgeschrieben, kein Sternchen.
export function aktionKarte(akt, { esc, escA }) {
  if (!akt) return '';
  for (const k of ['bis', 'badge', 'karte_titel', 'karte_bedingung']) if (!akt[k]) throw new Error(`lp.json aktion.${k} fehlt`);
  return `<div class="lp-aktion" data-bis="${escA(akt.bis)}"><span class="badge" aria-hidden="true">${esc(akt.badge)}</span><p><b>${esc(akt.karte_titel)}</b><span>${esc(akt.karte_bedingung)}</span></p></div>`;
}

// Vertrauenspunkte 2×2 mit Häkchen (Klasse trust-row für accept.mjs, Optik über lp-checks).
export function punkte(items, esc) {
  const xs = (items || []).filter(t => t && t.b && t.t);
  if (!xs.length) return '';
  return `<div class="trust-row lp-checks">${xs.map(t => `<div class="t">${ICON_CHECK}<b>${esc(t.b)}</b><span>${esc(t.t)}</span></div>`).join('')}</div>`;
}

// Bewertungen: Kopf mit Note/Zahl/Stand aus proof.google_reviews (gr nur bei grLive), Karten wörtlich, erste hervorgehoben, ein kursives Wort im H2.
export function bewertungen({ items, gr, h2, em }, esc) {
  const xs = (items || []).filter(r => r && r.t && r.a);
  if (!xs.length) return '';
  const titel = em && h2.includes(em) ? esc(h2).replace(esc(em), `<em>${esc(em)}</em>`) : esc(h2);
  const kopf = gr ? `<div class="lp-rsum"><span class="n">${esc(note5(gr.rating))}</span><span class="c">${sterne()}<b>${esc(gr.count)} Bewertungen bei Google</b><small>Stand ${esc(datumDE(gr.as_of))} · Auszug, wörtlich</small></span></div>` : '';
  const karte = (r, i) => `<figure class="review-card lp-rc${i === 0 ? ' feat' : ''}"><div class="top">${sterne()}${r.tag ? `<span class="tag">${esc(r.tag)}</span>` : ''}</div><blockquote${r.t.length > 320 ? ' class="lang"' : ''}>${esc(r.t)}</blockquote><figcaption><b>${esc(r.a)}</b>${esc(monatDE(r.datum))} · Google-Bewertung</figcaption></figure>`;
  return `<section class="sec section-alt" id="bewertungen"><div class="wrap"><div class="head"><h2>${titel}</h2></div>${kopf}<div class="lp-rgrid n${xs.length}">${xs.map(karte).join('')}</div></div></section>`;
}

// CSS der Bausteine (nur Tokens aus tokens.css/site.css, kein #fff: --lp-surface aus LP_CSS). Wird in lp.mjs ans Ende von LP_CSS gehängt.
export const BLOECKE_CSS = `/* ---- Redesign 20.10. (lp-bloecke.mjs) ---- */
.lp-st{color:var(--accent);letter-spacing:1.5px}
.lp-topbar{background:var(--green-deep);color:var(--dark-text2);font-size:12.5px;font-weight:600;line-height:1.2}
.lp-topbar .wrap{display:flex;justify-content:center;align-items:center;gap:10px;min-height:32px;white-space:nowrap;overflow:hidden}
.lp-topbar .lp-st{font-size:11.5px}
.lp-topbar .d{opacity:.55}
@media(max-width:460px){.lp-topbar .d,.lp-topbar .fk{display:none}}
.lp-head .nav{justify-content:flex-start;gap:6px}
.lp-head .callpill{margin-left:0}
.lp-web{margin-left:auto;display:inline-flex;align-items:center;gap:4px;min-height:44px;padding:0 8px;border-radius:var(--r-button);font-size:14px;font-weight:600;color:var(--green-d);text-decoration:none;white-space:nowrap}
.lp-web svg{width:14px;height:14px;flex:0 0 auto}
.lp-web:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
@media(hover:hover){.lp-web:hover{background:var(--paper)}}
@media(max-width:374px){.lp-web .lw{display:none}}
.lp-trust1 svg{width:16px;height:16px;flex:0 0 auto;color:var(--green)}
.lp-trust1 span{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lp-preise{margin:14px 0 0}
.lp-preise-l{margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.lp-tiles{display:grid;gap:8px}
.lp-tiles.n2{grid-template-columns:repeat(2,minmax(0,1fr))}
.lp-tiles.n3{grid-template-columns:repeat(3,minmax(0,1fr))}
.lp-tile{display:flex;flex-direction:column;gap:1px;min-height:44px;padding:11px 12px 10px;border-radius:14px;background:var(--lp-surface);color:var(--ink);text-decoration:none;box-shadow:0 0 0 1px rgba(21,32,26,.07),0 1px 2px rgba(21,32,26,.05),0 10px 22px -14px rgba(14,46,31,.45);transition:scale var(--t-fast) var(--ease),box-shadow .2s var(--ease);-webkit-tap-highlight-color:transparent}
a.lp-tile:active{scale:.96}
a.lp-tile:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
@media(hover:hover){a.lp-tile:hover{box-shadow:0 0 0 1.5px var(--green),0 10px 22px -14px rgba(14,46,31,.45)}}
.lp-tile .pl,.lp-tile .pk{font-size:12.5px;font-weight:600;line-height:1.2;color:var(--muted)}
.lp-tile .pk{display:none}
.lp-tile .pp{font-family:var(--font-display);font-size:24px;font-weight:700;line-height:1.1;color:var(--green-d);font-variant-numeric:tabular-nums;letter-spacing:-.01em;white-space:nowrap}
.lp-tile .pp small{font-family:var(--font-body);font-size:12px;font-weight:600;color:var(--muted);margin-right:3px;letter-spacing:0}
.lp-tile .go{display:inline-flex;align-items:center;gap:2px;margin-top:5px;font-size:12px;font-weight:700;color:var(--green)}
.lp-tile .go svg{width:13px;height:13px}
.lp-tiles.n1 .lp-tile{flex-direction:row;flex-wrap:wrap;align-items:baseline;column-gap:10px}
.lp-tiles.n1 .lp-tile .pl{font-size:15px;color:var(--ink)}
.lp-tiles.n1 .lp-tile .go{margin:0 0 0 auto}
.lp-preise-n{margin:8px 0 0;font-size:13px;line-height:1.4;color:var(--muted);text-wrap:pretty}
@media(max-width:599px){
.lp-tiles:not(.n1) .lp-tile:has(.pk) .pl{display:none}
.lp-tiles:not(.n1) .lp-tile .pk{display:block;order:-1}
.lp-hero .lp-preise{margin-top:10px}
.lp-hero .lp-preise-l{margin-bottom:6px}
.lp-hero .lp-tile{padding:8px 10px}
.lp-hero .lp-tile .go{display:none}
.lp-hero .lp-tile .pp{font-size:21px}
.lp-hero .lp-preise-n{margin-top:6px;font-size:12.5px}
.lp-preis{padding:14px}
.lp-preis .lp-tile{padding:8px}
.lp-preis .lp-tile .go{display:none}
.lp-preis .lp-tile .pp{font-size:19px}
}
.lp-zitat{margin:12px 0 0;padding:12px 14px 12px 16px;border-radius:14px;background:var(--paper);box-shadow:inset 3px 0 0 var(--green)}
.lp-zitat blockquote{margin:0;font-family:"Fraunces LP","Fraunces",Georgia,serif;font-style:italic;font-weight:500;font-size:16.5px;line-height:1.35;color:var(--ink);text-wrap:pretty}
.lp-zitat figcaption{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center;margin-top:6px;font-size:12.5px;color:var(--muted)}
.lp-zitat .lp-st{font-size:12px}
.lp-aktion{margin:14px 0 0;padding:14px 16px;border-radius:16px;background:var(--green-d);color:var(--dark-text2);display:flex;align-items:center;gap:14px}
.lp-aktion .badge{flex:0 0 54px;display:grid;place-items:center;width:54px;height:54px;border-radius:50%;background:var(--green-deep);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.18);color:var(--dark-text1);font-family:var(--font-display);font-weight:700;font-size:17px;font-variant-numeric:tabular-nums;white-space:nowrap}
.lp-aktion p{margin:0;display:grid;gap:3px}
.lp-aktion b{color:var(--dark-text1);font-size:15.5px;line-height:1.3;text-wrap:balance}
.lp-aktion p span{font-size:13.5px;line-height:1.35;color:var(--dark-text2)}
.lp-preis .lp-preise{margin:0}
.lp-preis .lp-aktion p{margin:0;color:var(--dark-text2);font-size:15px;line-height:1.3}
.lp-preis .lp-preise-n{margin:8px 0 0;font-size:13px;line-height:1.4;color:var(--muted)}
.lp-preis .lp-aktion{margin:16px 0 18px}
.trust-row.lp-checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:18px;padding-top:0;border-top:0}
.lp-checks .t{display:grid;grid-template-columns:22px 1fr;column-gap:8px;align-items:start;align-content:start;font-size:12.5px;line-height:1.3;color:var(--muted)}
.lp-checks svg{grid-row:span 2;width:22px;height:22px;color:var(--green)}
.lp-checks .t b{display:block;font-family:var(--font-body);font-size:14px;font-weight:700;line-height:1.25;color:var(--ink)}
@media(min-width:760px){.lp-hero .lp-preise,.lp-hero .lp-zitat,.lp-hero .lp-aktion,.lp-hero .lp-checks{max-width:44em}}
.lp-rsum{display:flex;align-items:center;gap:14px;margin:-6px 0 22px}
.lp-rsum .n{font-family:var(--font-display);font-size:46px;font-weight:700;line-height:1;color:var(--green-d)}
.lp-rsum .lp-st{display:block;font-size:17px}
.lp-rsum b{display:block;font-size:14px;font-weight:600;line-height:1.35;color:var(--ink)}
.lp-rsum small{display:block;font-size:12.5px;color:var(--muted)}
.lp-rgrid{display:grid;gap:14px;max-width:920px}
@media(min-width:760px){.lp-rgrid.n2{grid-template-columns:repeat(2,minmax(0,1fr))}.lp-rgrid.n3{grid-template-columns:1.25fr 1fr}.lp-rgrid.n3 .feat{grid-row:span 2}}
.lp-rc{background:var(--lp-surface);padding:18px 18px 16px}
.lp-rc .top{display:flex;justify-content:space-between;align-items:center;gap:10px}
.lp-rc .tag{font-size:11.5px;font-weight:700;letter-spacing:.04em;color:var(--green-d);background:var(--paper);border-radius:999px;padding:4px 10px}
.lp-rc blockquote{font-size:15px;line-height:1.55;text-wrap:pretty}
.lp-rc.feat blockquote{font-family:"Fraunces LP","Fraunces",Georgia,serif;font-style:italic;font-weight:500;font-size:20px;line-height:1.35}
/* lange Zitate (> 320 Zeichen, z. B. Nachlass): kleinere Schrift in der hervorgehobenen Karte */
.lp-rc.feat blockquote.lang{font-size:17px;line-height:1.45}
@media(prefers-reduced-motion:reduce){.lp-tile{transition:none}a.lp-tile:active{scale:1}}`;
