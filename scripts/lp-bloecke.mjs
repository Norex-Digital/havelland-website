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

// ===================== Hecken-LPs: Designdurchgang 06.11.2026 (nur raeumung:false, die Entrümpelungs-Seiten bleiben byteidentisch) =====================
export const ICON_CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/><path d="m9 15 2 2 4-4"/></svg>';

// Leistungs-Kacheln über dem Formular (Gegenstück zu den Preis-Kacheln der Entrümpelung, ohne Preis): Leistung klein, Zeitfenster als Serifen-Zeile,
// die eigene Leistung der Seite (erste Kachel) hervorgehoben. Tippen wählt die Leistung im Formular vor (data-via="leistung").
// Klassen: lp-tile bleibt (Tipp-Ziel-Messung in lp-fit.sh), lp-ltile als Hecken-Zusatz (accept-lp zählt nur class="lp-tile" exakt = Preis-Kacheln).
export function leistungsKacheln(k, { esc, escA }) {
  const xs = ((k && k.items) || []).filter(x => x && x.obj && x.k && x.v);
  if (!xs.length) return '';
  if (xs.length > 3) throw new Error(`kacheln: höchstens 3 Einträge, gefunden ${xs.length}`);
  const zelle = (x, i) => `<a class="lp-tile lp-ltile${i === 0 ? ' own' : ''}" href="#anfrage" data-obj="${escA(x.obj)}" data-via="leistung" aria-label="${escA(x.k)}: ${escA(x.v)} – Anfrage dazu starten"><span class="pl">${esc(x.k)}</span><span class="pp">${esc(x.v)}</span><span class="go" aria-hidden="true">Anfragen ${ICON_CHEV}</span></a>`;
  return `<div class="lp-preise lp-leist">${k.label ? `<p class="lp-preise-l">${esc(k.label)}</p>` : ''}<div class="lp-tiles n${xs.length}">${xs.map(zelle).join('')}</div>${k.note ? `<p class="lp-preise-n">${esc(k.note)}</p>` : ''}</div>`;
}

// Frist-/Saison-Karte (Gegenstück zur Aktionskarte): dunkle Karte, Kalender-Symbol statt Prozent-Abzeichen, kein Dringlichkeitswort, keine Zahl außer den gesetzlichen Daten.
export function fristKarte(f, { esc }) {
  if (!f) return '';
  for (const k of ['titel', 'bedingung']) if (!f[k]) throw new Error(`lp.json frist.${k} fehlt`);
  return `<div class="lp-frist"><span class="badge" aria-hidden="true">${ICON_CAL}</span><p><b>${esc(f.titel)}</b><span>${esc(f.bedingung)}</span></p></div>`;
}

// Hero-Foto-Karte (Hecke, ohne Vorher/Nachher): überlappendes Info-Badge aus den Zusagen der Seite (kein Bild-Label, keine Behauptung zum Foto).
export const FOTO_BADGE = `<span class="badge"><span class="ic">${ICON_CHECK}</span><span class="t">Festpreis nach Besichtigung<span>Abfuhr inklusive</span></span></span>`;

// Zusagen-Band (Hecke, Owner 06.11.): dunkelgrüne Zone wie das Wert-Band der Website (.band / .zone-dark): Serifen-Headline 700 weiß, Text --dark-text2, kein Grain.
// Markup bleibt .gstrip > .gstrip-grid > .gs (accept-Gate gstrip), vier Zusagen aus lp.json zusagen_hecke {h, em, label, items:[{h,p}]}.
export function zusagenBand(z, esc) {
  if (!z || !Array.isArray(z.items) || z.items.length !== 4) throw new Error('lp.json zusagen_hecke braucht genau 4 items');
  const h = z.em && z.h.includes(z.em) ? esc(z.h).replace(esc(z.em), `<em>${esc(z.em)}</em>`) : esc(z.h);
  const rows = z.items.map((x, i) => `<div class="gs rv${i ? ` d${i}` : ''}"><span class="gn">${String(i + 1).padStart(2, '0')}</span><div><h3>${esc(x.h)}</h3><p>${esc(x.p)}</p></div></div>`).join('');
  return `<section class="gstrip gstrip-dark zone-dark" aria-label="${esc(z.label || 'Unsere vier Zusagen')}"><div class="wrap"><h2 class="serif rv">${h}</h2><div class="gstrip-grid">${rows}</div></div></section>`;
}

// CSS nur für Hecken-LPs (eigener <style>-Block hinter LP_CSS, damit die Entrümpelungs-Seiten byteidentisch bleiben).
export const HECKE_CSS = `<style>
/* ---- Hecken-LPs: Designdurchgang 06.11.2026 ---- */
/* Leistungs-Kacheln: gleicher Rhythmus wie die Preis-Kacheln, eigene Leistung mit Linie und leichter Grünfüllung */
.lp-ltile .pp{font-size:22px;letter-spacing:-.005em}
.lp-ltile.own{background:color-mix(in srgb,var(--green) 7%,var(--lp-surface));box-shadow:0 0 0 1.5px var(--green),0 10px 22px -14px rgba(14,46,31,.45)}
.lp-ltile.own .pl{color:var(--green-d)}
.lp-ltile .pl{font-weight:700}
@media(max-width:599px){.lp-hero .lp-ltile{padding:8px 9px}.lp-hero .lp-ltile .pp{font-size:16px}.lp-hero .lp-ltile .pl{font-size:12px}}
@media(max-width:374px){.lp-hero .lp-ltile .pp{font-size:14.5px}}
/* Formular-Chips: dezenter Zustand (weiße Fläche, grüne Linie, fette Schrift) statt schwerem Vollblock; kurze Labels auf jeder Breite */
.lp-form .seg.seg-soft .ql{display:none}
.lp-form .seg.seg-soft .qs{display:inline}
.lp-form .seg.seg-soft label{font-size:15px}
.lp-form .seg.seg-soft label:has(input:checked){background:var(--lp-surface);color:var(--green-d);font-weight:700;box-shadow:0 0 0 1.5px var(--green),0 2px 6px -2px rgba(14,46,31,.22)}
@media(min-width:760px){.lp-form .seg.seg-soft label{font-size:15.5px}}
@media(max-width:399px){.lp-form .seg.seg-soft label{font-size:14px}}
/* Frist-Karte */
.lp-frist{margin:14px 0 0;padding:14px 16px;border-radius:16px;background:var(--green-d);color:var(--dark-text2);display:flex;align-items:center;gap:14px}
.lp-frist .badge{flex:0 0 54px;display:grid;place-items:center;width:54px;height:54px;border-radius:50%;background:var(--green-deep);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.18);color:var(--dark-text1)}
.lp-frist .badge svg{width:26px;height:26px}
.lp-frist p{margin:0;display:grid;gap:3px}
.lp-frist b{color:var(--dark-text1);font-size:15.5px;line-height:1.3;text-wrap:balance}
.lp-frist p span{font-size:13.5px;line-height:1.35;color:var(--dark-text2)}
@media(min-width:760px){.lp-hero .lp-leist,.lp-hero .lp-frist{max-width:44em}}
/* Hero-Foto (ohne Vorher/Nachher): Karte im Format des Sliders, Info-Badge überlappt */
.lp-hecke.lp-hero-foto .shot .main{aspect-ratio:864/1036;object-fit:cover}
.lp-hecke .shot .badge{background:var(--lp-surface)}
@media(min-width:900px){.lp-hecke .shot .badge{left:-26px}}
@media(max-width:899px){.lp-hecke.lp-hero-foto .shot{max-width:420px}.lp-hecke .shot .badge{left:14px;bottom:20px}}
/* Galerie: drei Paare nebeneinander ab Desktop; zwei Paare begrenzt, damit ein Paar samt Unterschrift in einen 900-px-Bildschirm passt */
@media(min-width:900px){.lp-gallery.n3{grid-template-columns:repeat(3,minmax(0,1fr))}.lp-gallery.n2{max-width:880px}}
/* Einzelfoto-Karte in der Galerie: Format, Radius und Schatten wie der Slider (.ba), ohne Regler und Badges; Unterschrift = .ba-cap */
.lp-fotokarte-w{margin:0}
.lp-fotokarte{position:relative;border-radius:var(--r-image);overflow:hidden;box-shadow:var(--sh-photo);aspect-ratio:675/790;background:var(--surface2)}
.lp-fotokarte img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
/* Zusagen-Band dunkelgrün wie das Wert-Band der Website: weiße Serifen-Headline 700, Text --dark-text2, Nummern in --green-soft, kein Grain */
.gstrip.gstrip-dark{background:var(--green-d);border:0;padding:60px 0 56px}
.gstrip-dark h2{font-family:var(--font-display);font-weight:700;font-size:clamp(28px,3.4vw,40px);line-height:1.16;letter-spacing:-.018em;color:var(--dark-text1);max-width:19em;margin:0 0 34px;text-wrap:balance}
.gstrip-dark h2 em{font-style:italic;font-weight:700;color:var(--green-soft)}
.gstrip-dark .gstrip-grid{gap:26px 32px}
.gstrip-dark .gs{display:grid;grid-template-columns:auto 1fr;column-gap:10px;row-gap:7px;align-items:baseline;align-content:start}
.gstrip-dark .gs>div{display:contents}
.gstrip-dark .gs .gn{flex:none;font-size:16px;color:var(--green-soft)}
.gstrip-dark .gs h3{grid-column:2;margin:0;font:700 16px/1.3 "Inter",system-ui,sans-serif;color:var(--dark-text1)}
.gstrip-dark .gs p{grid-column:1/-1;margin:0;font-size:16px;line-height:1.5;font-weight:500;color:var(--dark-text2);text-wrap:pretty}
/* Design-Review 06.11.: ungerades letztes Item der Listen über beide Spalten zentriert (Prinzip 5), vier Zusagen als 2x2 bzw. 4 Spalten statt 3+1 */
@media(min-width:640px){#was-wir-tun .v:last-child:nth-child(odd),#preisfaktoren .v:last-child:nth-child(odd){grid-column:1/-1;justify-self:center;width:calc(50% - 20px)}.gstrip-grid:has(>.gs:nth-child(4):last-child){grid-template-columns:repeat(2,1fr)}}
@media(min-width:1000px){.gstrip-grid:has(>.gs:nth-child(4):last-child){grid-template-columns:repeat(4,1fr)}}
/* Leistungs-Kacheln: Leistungsname auf dem Desktop 13.5 px (Zielgruppe 50 bis 70) */
@media(min-width:600px){.lp-hero .lp-ltile .pl{font-size:13.5px}}
</style>`;

// Kachel-Hervorhebung folgt der Chip-Auswahl (sonst zeigt die Kachel „Formschnitt“, während der Chip „Rückschnitt“ gewählt ist). Nur Hecke.
export const HECKE_JS = `<script>(function(){var f=document.getElementById('anfrage');var t=[].slice.call(document.querySelectorAll('.lp-ltile'));if(!f||!t.length)return;function s(){var c=f.querySelector('input[name=objekt]:checked');if(!c)return;t.forEach(function(a){a.classList.toggle('own',a.getAttribute('data-obj')===c.value)})}f.addEventListener('change',s);document.addEventListener('click',function(e){if(e.target.closest('.lp-ltile'))setTimeout(s,0)});s()})();</script>`;
