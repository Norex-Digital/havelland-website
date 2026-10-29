// lp-varianten.mjs — zwei ruhigere Varianten des ersten Bildschirms der Ads-LPs (Owner 29.10.2026: „zu viel, unübersichtlich, direkt ins Gesicht“).
// Umschalter: Umgebungsvariable LP_VARIANTE=a|b beim Bauen (FULL=1 LP_VARIANTE=a node scripts/generate.mjs). Ohne Variable = Ist-Stand, byte-gleich.
// Beide Varianten sind reines CSS (Anhang hinter FIT_CSS in lp.mjs); Variante B ändert zusätzlich die H1 im HTML (siehe lp.mjs, Kommentar „Variante B“).
// Übernahme der gewählten Variante: CSS-Block in lp.mjs (FIT_CSS) einfügen bzw. VARIANTE-Default setzen, die Gates bleiben dieselben.
// Unverändert in beiden: Banner, Formularfelder/Hidden-Felder, Tracking, Preis-Wortlaut („inkl. MwSt.“, Fußnote direkt unter den Preisen), Tipp-Ziele ≥ 44 px.

const V = String(process.env.LP_VARIANTE || '').toLowerCase();
if (V && !['a', 'b'].includes(V)) throw new Error(`LP_VARIANTE muss a oder b sein (oder leer = Ist-Stand), gefunden: "${V}"`);
export const VARIANTE = V;

// ---- Variante A: ruhig, gleiche Inhalte ----
// Hierarchie über Weißraum und Textfarbe statt über Flächen: Vertrauensleiste hell statt dunkelgrün, Telefon als Linien-Pill (48 px), Preise als Spalten mit Haarlinie statt Kacheln,
// Formular-Karte ohne Schatten (nur Haarlinie), Gold-Knopf mit weicherem Schein, Blatt-Wasserzeichen weg. Schriftstufen im ersten Bildschirm: 24 (H1) · 20 (Preis) · 16 (Eingabe) · 14/13 (alles Übrige).
const A_CSS = `/* ---- Variante A: ruhig, gleiche Inhalte ---- */
.lp-topbar{background:var(--paper);color:var(--muted);font-weight:500;border-bottom:1px solid var(--hair)}
.lp-topbar .lp-st{font-size:11px}
body .lp-head .callpill{background:transparent;color:var(--green-d);box-shadow:inset 0 0 0 1.5px var(--green);font-weight:600;font-size:15px;min-height:48px;padding:8px 14px}
.lp-head .callpill svg{width:18px;height:18px;color:var(--green)}
.lp-web{font-weight:500;color:var(--muted)}
.lp-hero .btn-acc{box-shadow:0 8px 16px -10px var(--action)}
@media(max-width:899px){.lp-hero .hleaf{display:none}}
@media(max-width:599px){
body .lp-hero:has(.lp-hero-form){padding-top:10px}
body .lp-hero:has(.lp-hero-form) .lp-trust1{font-size:13px;font-weight:500;color:var(--muted);margin-bottom:6px}
.lp-trust1 svg{width:15px;height:15px}
body .lp-hero:has(.lp-hero-form) h1{margin-bottom:0}
body .lp-ort{margin:6px 0 0;font-size:14px;font-weight:500;color:var(--muted)}
body .lp-hero .lp-preise{margin-top:12px}
body .lp-hero .lp-preise-l{margin:0 0 2px;font-size:13px;font-weight:500;letter-spacing:0;text-transform:none}
body .lp-hero .lp-tiles{gap:0}
body .lp-hero .lp-tile{min-height:48px;padding:4px 10px 4px 0;border-radius:0;background:none;box-shadow:none}
body .lp-hero .lp-tile+.lp-tile{padding-left:12px;box-shadow:inset 1px 0 0 var(--hair)}
body .lp-hero .lp-tile .pk{font-size:13px;font-weight:500}
body .lp-hero .lp-tile .pp{font-size:20px}
body .lp-hero .lp-tile .pp small{font-size:12px}
body .lp-hero .lp-preise-n{margin-top:4px;font-size:12.5px;line-height:1.4}
body .lp-hero-form{margin-top:14px}
body .lp-form{padding:10px 12px 12px;box-shadow:0 0 0 1px var(--hair)}
}
@media(max-width:374px){
body .lp-hero:has(.lp-hero-form){padding-top:6px}
body .lp-ort{margin-top:3px}
body .lp-hero .lp-preise{margin-top:8px}
body .lp-hero-form{margin-top:10px}
}`;

// ---- Variante B: reduziert ----
// Weniger Elemente: keine dunkle Leiste, „Zur Website“ im Kopf weg (bleibt in der Fußzeile; das Logo führt ebenfalls zur Website), Häkchen-Zeile als leiser Kleintext ohne Symbol,
// H1: erster Satz groß, kursiver Zusatz als leise Unterzeile, Preise ohne Kacheln und Linien (eine einzeilige Preiszeile passt auf 390 px nur mit ≤ 12 px Schrift, gemessen und verworfen; stehen bleiben drei Spalten, weiter verlinkt, Tipp-Ziel 48 px), Formular ohne Kartenrahmen.
// Die Zeile „Einstiegspreise inkl. MwSt.“ steht als normaler Satz direkt über den Preisen, die Fußnote direkt darunter (Reihenfolge im HTML unverändert).
const B_CSS = `/* ---- Variante B: reduziert ---- */
.lp-topbar{background:transparent;color:var(--muted);font-weight:500}
.lp-topbar .lp-st{font-size:11px}
body .lp-head .callpill{background:transparent;color:var(--green-d);box-shadow:inset 0 0 0 1px var(--border-visible);font-weight:600;font-size:15px;min-height:48px;padding:8px 14px}
.lp-head .callpill svg{width:18px;height:18px;color:var(--green)}
.lp-hero .btn-acc{box-shadow:0 8px 16px -10px var(--action)}
@media(max-width:899px){.lp-hero .hleaf{display:none}}
@media(max-width:599px){
body .lp-topbar .wrap{min-height:26px}
body .lp-head .lp-web{display:none}
body .lp-head .nav{min-height:52px}
body .lp-head .callpill{margin-left:auto}
body .lp-hero:has(.lp-hero-form){padding-top:14px}
body .lp-hero:has(.lp-hero-form) .lp-trust1{margin-bottom:6px;font-size:12px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--green)}
.lp-trust1 svg{display:none}
body .lp-hero:has(.lp-hero-form) h1,body .lp-hero[data-h1-lang]:has(.lp-hero-form) h1{margin-bottom:0}
body .lp-hero[data-h1-tail]:has(.lp-hero-form) h1,body .lp-hero[data-h1-tail][data-h1-lang]:has(.lp-hero-form) h1{font-size:clamp(23px,6.4vw,25px);line-height:1.14}
body .lp-hero h1 em.tail{display:block;margin-top:8px;font-size:16px;line-height:1.3;font-weight:500;color:var(--green)}
body .lp-ort{margin:8px 0 0;font-size:14px;font-weight:500;color:var(--muted)}
body .lp-hero .lp-preise{margin-top:14px}
body .lp-hero .lp-preise-l{margin:0;font-size:13px;font-weight:500;letter-spacing:0;text-transform:none}
body .lp-hero .lp-tiles.n3{grid-template-columns:repeat(3,auto);justify-content:space-between;gap:0}
body .lp-hero .lp-tile{min-height:48px;padding:2px 0;border-radius:0;background:none;box-shadow:none}
body .lp-hero .lp-tile .pk{font-size:13px;font-weight:500}
body .lp-hero .lp-tile .pp{font-size:19px}
body .lp-hero .lp-tile .pp small{font-size:12px}
body .lp-hero .lp-preise-n{margin-top:2px;font-size:12.5px;line-height:1.4}
body .lp-hero-form{margin-top:12px}
body .lp-form{padding:0;gap:8px;background:none;box-shadow:none}
}
@media(max-width:374px){
body .lp-hero:has(.lp-hero-form){padding-top:8px}
body .lp-hero h1 em.tail{margin-top:4px}
body .lp-ort{margin-top:4px}
body .lp-hero .lp-preise{margin-top:8px}
body .lp-hero-form{margin-top:8px}
}`;

export const VARIANT_CSS = V === 'a' ? A_CSS : V === 'b' ? B_CSS : '';
