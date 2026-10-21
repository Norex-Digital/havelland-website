#!/usr/bin/env bash
# Hero-Fit-Gate (v7, Ein-Schritt-Formular, Spec gbr-firma 09-lp-redesign-spec.md §10.3).
# Pass 1 mit offenem Consent-Banner: Anruf (Kopf), Vertrauensleiste (.lp-topbar), Häkchen-Zeile (.lp-trust1, nur < 600 px, einzeilig),
#   Preis-Kacheln (.lp-hero .lp-tiles, Muss nur für die Slugs in FIT_PREIS_MUSS), Objekt-Leiste (.f-obj .seg) und PLZ-Feld komplett über der Banner-Oberkante.
# Pass 2 ohne Banner (Einwilligung „deny“ gesetzt): Absende-Knopf über der Oberkante der klebenden Leiste (.scta) bzw. im Bildschirm (Desktop),
#   WhatsApp in der klebenden Leiste sichtbar (Handy). Kachel-Tippziel ≥ 44 px ist immer Muss.
# Aufruf: scripts/lp-fit.sh <slug>   (Server vorher: python -m http.server -d website 4173 ; PORT=… überschreibt)
# Exit 0 = grün oder SKIP (nur wenn form_pos in lp.json != hero), 1 = rot, 2 = Server/Browser-Fehler, ungültige Messung,
# ausgelieferte Seite != website/lp/<slug>/index.html oder fehlendes Hero-Formular bei form_pos=hero.
# Muss-Viewports: 360x732 (nur Pass 1), 390x844 und 412x915 (Pass 1 + 2). Warnzeilen: 360x732 Pass 2, 360x640, 1280x800 (blockieren nicht).
# FIT_WA_PFLICHT=0 macht "WhatsApp nicht sichtbar" zur Warnung (nur nach schriftlicher Entscheidung von Maurice, Betriebslog).
set -euo pipefail
export MSYS_NO_PATHCONV=1
SLUG="${1:?Aufruf: lp-fit.sh <slug>}"; PORT="${PORT:-4173}"; S="fit-$SLUG-$$"
FIT_PREIS_MUSS="${FIT_PREIS_MUSS:-entruempelung-havelland haushaltsaufloesung-havelland wohnungsaufloesung haus-entruempeln keller-dachboden-garage}"
URL="http://localhost:$PORT/lp/$SLUG/"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RW="$ROOT"; command -v cygpath >/dev/null 2>&1 && RW="$(cygpath -m "$ROOT")"
# Quelle der Wahrheit: form_pos aus lp.json (leer = Slug unbekannt)
FP="$(node -e 'const l=(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).lps||[]).find(x=>x.slug===process.argv[2]);process.stdout.write(l?(l.form_pos||"hero"):"")' "$RW/data/copy/lp.json" "$SLUG")"
[ -n "$FP" ] || { echo "Slug $SLUG steht nicht in data/copy/lp.json" >&2; exit 2; }
# Der Server muss genau die gebaute Datei ausliefern (sonst läuft der Test gegen einen fremden Stand; CR/LF-Unterschiede zählen nicht).
SERVED="$(curl -sf -m 5 "$URL" | tr -d '\r')" || { echo "Server nicht erreichbar: $URL" >&2; exit 2; }
[ -f "$ROOT/website/lp/$SLUG/index.html" ] || { echo "website/lp/$SLUG/index.html fehlt (erst FULL=1 node scripts/generate.mjs)" >&2; exit 2; }
FILE="$(tr -d '\r' < "$ROOT/website/lp/$SLUG/index.html")"
[ "$SERVED" = "$FILE" ] || { echo "Server liefert nicht website/lp/$SLUG/index.html aus (anderer Stand/anderes Verzeichnis auf Port $PORT)" >&2; exit 2; }
T="$(mktemp -d)"
trap 'playwright-cli -s="$S" close >/dev/null 2>&1 || true; rm -rf "$T"' EXIT
cd "$T"
# playwright-cli mit Fehlerausgabe: scheitert ein Aufruf, steht die Meldung auf stderr und das Skript endet mit Exit 2.
PW() { local o; if ! o=$(playwright-cli -s="$S" "$@" 2>&1); then echo "playwright-cli $1 fehlgeschlagen: $o" >&2; return 1; fi; printf '%s\n' "$o"; }
PWQ() { PW "$@" >/dev/null || exit 2; }
# Messung. lim = Oberkante des offenen Banners (Pass 1) bzw. Oberkante der sichtbaren .scta oder Bildschirmhöhe (Pass 2).
JS='async () => {
  await document.fonts.ready; await new Promise(r => setTimeout(r, 400));
  const sb = document.querySelector(".lp-hero-form button[type=submit]");
  if (!sb) return JSON.stringify({skip: true});
  scrollTo(0, 0);
  const vis = e => !!e && getComputedStyle(e).display !== "none" && e.getBoundingClientRect().height > 0;
  const c = document.querySelector(".consent:not([hidden])");
  const sc = document.querySelector(".scta");
  const scTop = vis(sc) ? Math.round(sc.getBoundingClientRect().top) : innerHeight;
  const lim = c ? Math.min(innerHeight, Math.round(c.getBoundingClientRect().top)) : Math.min(innerHeight, scTop);
  const m = s => { const e = document.querySelector(s); if (!vis(e)) return null; const r = e.getBoundingClientRect(); return {top: Math.round(r.top), bottom: Math.round(r.bottom), ok: r.top >= 0 && r.bottom <= lim}; };
  let trust = "na";
  if (innerWidth < 600) {
    const t = document.querySelector(".lp-trust1"); trust = m(".lp-trust1");
    if (t && trust) { const lh = parseFloat(getComputedStyle(t).lineHeight) || 16, sp = t.querySelector("span"); trust.one = !!sp && sp.scrollWidth <= sp.clientWidth + 1 && t.getBoundingClientRect().right <= innerWidth && t.getBoundingClientRect().height <= lh * 1.3; trust.text = t.textContent; }
  }
  let preis = null;
  const tl = [...document.querySelectorAll(".lp-hero .lp-tiles .lp-tile")];
  if (tl.length) {
    const rs = tl.map(e => e.getBoundingClientRect());
    preis = {bottom: Math.round(Math.max(...rs.map(r => r.bottom))), ok: rs.every(r => r.height > 0 && r.top >= 0 && r.bottom <= lim), n: tl.length, tap: Math.round(Math.min(...rs.map(r => r.height)))};
  }
  // WhatsApp liegt IN der klebenden Leiste: Grenze ist hier der Bildschirmrand, nicht die Leisten-Oberkante.
  const waE = document.querySelector(".scta .wa"), waR = vis(sc) && vis(waE) ? waE.getBoundingClientRect() : null;
  const wa = waR ? {top: Math.round(waR.top), bottom: Math.round(waR.bottom), ok: waR.top >= 0 && waR.bottom <= innerHeight} : null;
  return JSON.stringify({vh: innerHeight, limit: lim, banner: !!c, bannerH: c ? Math.round(c.getBoundingClientRect().height) : 0, scta: vis(sc),
    tel: m("header a[href^=\"tel:\"]"), topbar: m(".lp-topbar"), trust, preis, seg: m(".lp-hero-form .f-obj .seg"), ort: m(".lp-hero-form input[name=ort]"),
    submit: m(".lp-hero-form button[type=submit]"), wa, hscroll: document.documentElement.scrollWidth > innerWidth});
}'
PWQ open about:blank
# Alles ausserhalb von localhost abbrechen: GTM/GA4/Ads duerfen vom Test nie echte Aufrufe bekommen (Seiten laden GTM beim Start).
PWQ run-code "async page => { await page.context().route(u => /^https?:$/.test(u.protocol) && u.hostname !== 'localhost', r => r.abort()); }"
PWQ goto "$URL"
RC=0
for VP in "360 732 muss banner" "390 844 muss banner" "412 915 muss banner" "390 844 muss frei" "412 915 muss frei" "360 732 warn frei" "360 640 warn banner" "1280 800 warn frei"; do
  set -- $VP
  PWQ resize "$1" "$2"
  PWQ eval "localStorage.clear()"
  if [ "$4" = frei ]; then PWQ eval "localStorage.setItem('consent_v2', JSON.stringify({c:'deny',v:2,t:Date.now()}))"; fi
  PWQ reload
  R=$(PW --raw eval "$JS") || exit 2
  C=0
  node -e '
    let r = JSON.parse(process.argv[1]); if (typeof r === "string") r = JSON.parse(r);
    const muss = process.argv[2] === "muss", pass = process.argv[7], id = process.argv[3] + " " + process.argv[4] + " " + pass, fp = process.argv[5];
    const preisMuss = (" " + process.argv[6] + " ").includes(" " + process.argv[3] + " ");
    if (r.skip) {
      if (fp !== "hero") { console.log(id + " SKIP (form_pos=" + fp + ", kein Hero-Formular)"); process.exit(0); }
      console.error("FIT ROT: " + id + ": form_pos=hero, aber kein .lp-hero-form button[type=submit] im Hero (Selektor umbenannt oder Formular fehlt)"); process.exit(2);
    }
    const y = o => o ? o.bottom + (o.ok ? "" : "!") : "fehlt";
    const ty = o => o === "na" ? "n/a (Kick sichtbar)" : (o ? o.bottom + (o.ok && o.one ? "" : "!") + (o.one ? "" : " mehrzeilig") : "fehlt");
    const py = o => o ? o.bottom + (o.ok ? "" : "!") + " (" + o.n + " Kacheln, Tippziel " + o.tap + " px)" : "-";
    console.log(id + " " + (muss ? "muss" : "warn") + " | anruf " + y(r.tel) + " | leiste " + y(r.topbar) + " | trust " + ty(r.trust) + " | preis " + py(r.preis)
      + " | objekt " + y(r.seg) + " | plz " + y(r.ort) + " | absenden " + y(r.submit) + " | whatsapp " + (r.wa ? y(r.wa) : "-") + " | grenze " + r.limit
      + (r.banner ? " (Banner " + r.bannerH + " von " + r.vh + ")" : " (ohne Banner, scta " + (r.scta ? "ja" : "nein") + ")") + " | quer-scroll " + (r.hscroll ? "JA" : "nein"));
    if (pass === "banner" && !r.banner) { console.error("Banner nicht offen, Messung ungültig"); process.exit(2); }
    if (pass === "frei" && r.banner) { console.error("Banner trotz gesetzter Einwilligung offen, Messung ungültig"); process.exit(2); }
    const bad = [], hint = [];
    if (r.hscroll) bad.push("horizontaler Scroll");
    if (r.preis && r.preis.tap < 44) bad.push("Kachel-Tippziel " + r.preis.tap + " px < 44");
    if (pass === "banner") {
      if (!r.tel || !r.tel.ok) bad.push("Anruf nicht sichtbar");
      if (!r.topbar || !r.topbar.ok) bad.push("Vertrauensleiste verdeckt/fehlt");
      if (r.trust !== "na") { if (!r.trust) bad.push("Trust-Zeile fehlt"); else { if (!r.trust.ok) bad.push("Trust-Zeile verdeckt"); if (!r.trust.one) bad.push("Trust-Zeile mehrzeilig"); } }
      if (r.preis && !r.preis.ok) (preisMuss ? bad : hint).push("PREIS verdeckt (Kacheln bis " + r.preis.bottom + ", Grenze " + r.limit + ")");
      if (!r.preis && preisMuss) bad.push("Preis-Kacheln fehlen");
      if (!r.seg || !r.seg.ok) bad.push("Objekt-Leiste verdeckt");
      if (!r.ort || !r.ort.ok) bad.push("PLZ-Feld verdeckt");
    } else {
      if (!r.submit || !r.submit.ok) bad.push("Absende-Knopf nicht im ersten Bildschirm (bis " + (r.submit ? r.submit.bottom : "-") + ", Grenze " + r.limit + ")");
      if (parseInt(process.argv[4], 10) < 600 && (!r.wa || !r.wa.ok) && process.env.FIT_WA_PFLICHT !== "0") bad.push("WhatsApp (klebende Leiste) nicht sichtbar");
    }
    if (hint.length) console.error("HINWEIS: " + id + ": " + hint.join(", "));
    if (bad.length) { console.error((muss ? "FIT ROT: " : "WARNUNG: ") + id + ": " + bad.join(", ")); process.exit(muss ? 1 : 0); }
  ' "$R" "$3" "$SLUG" "$1x$2" "$FP" "$FIT_PREIS_MUSS" "$4" || C=$?
  [ "$C" -gt "$RC" ] && RC=$C
done
if [ "$RC" = 0 ]; then echo "FIT GRÜN $SLUG"; else echo "FIT ROT $SLUG (Exit $RC)" >&2; fi
exit "$RC"
