#!/usr/bin/env bash
# Hero-Fit-Gate: Schritt 1 inkl. "Weiter", die Zweitwege (Anruf, WhatsApp) und die einzeilige Trust-Zeile (.lp-trust1, nur Handy) bei offenem
# Consent-Banner ohne Scrollen oberhalb der Banner-Oberkante sichtbar; die Preiszeilen (.lp-hero-preis .pz) müssen mindestens 44 px hoch/tippbar sein.
# Aufruf: scripts/lp-fit.sh <slug>   (Server vorher: python -m http.server -d website 4173 ; PORT=… überschreibt)
# Exit 0 = grün oder Variante A (SKIP, nur wenn form_pos in lp.json != hero), 1 = rot, 2 = Server/Browser-Fehler, ungültige Messung,
# ausgelieferte Seite != website/lp/<slug>/index.html oder fehlendes Hero-Formular bei form_pos=hero.
# 360x732 und 390x844 sind Pflicht (rot bei Verstoß); 360x640 und 1280x800 sind Warnzeilen und blockieren nicht.
# Alle vier Viewports werden immer gemessen, auch wenn ein früherer rot war.
# Muss-Elemente je Pflicht-Viewport: Weiter, Anruf (Header), WhatsApp (lp-alt), Trust-Zeile (nur < 600 px Breite: dort ersetzt sie den ausgeblendeten Kick;
# Unterkante unter der Banner-Oberkante und einzeilig). Preiszeilen komplett über der Banner-Kante: Muss nur für die Slugs in FIT_PREIS_MUSS
# (Standard: entruempelung-havelland, haushaltsaufloesung-havelland, wohnungsaufloesung, haus-entruempeln, keller-dachboden-garage; Methoden-LP §5 / Maßnahme M7),
# sonst (Messie: Einzelpreis, 3 Zeilen H1) nur Hinweis "PREIS verdeckt" ohne Exit 1; die Tippziel-Höhe ≥ 44 px ist immer Muss.
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
# Messung: Weiter (Hero-Formular), Anruf (Header-Pill), WhatsApp (lp-alt), Trust-Zeile (< 600 px), Preiszeilen. Grenze = Oberkante des offenen Banners.
JS='async () => {
  await document.fonts.ready; await new Promise(r => setTimeout(r, 400));
  const n = document.querySelector(".lp-hero-form [data-next]");
  if (!n) return JSON.stringify({skip: true});
  scrollTo(0, 0);
  const c = document.querySelector(".consent:not([hidden])");
  const lim = c ? Math.min(innerHeight, Math.round(c.getBoundingClientRect().top)) : innerHeight;
  const m = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return {top: Math.round(r.top), bottom: Math.round(r.bottom), ok: r.height > 0 && r.top >= 0 && r.bottom <= lim}; };
  let trust = "na";
  if (innerWidth < 600) {
    const t = document.querySelector(".lp-trust1"); trust = m(".lp-trust1");
    if (t && trust) { const lh = parseFloat(getComputedStyle(t).lineHeight) || 16; trust.one = t.scrollWidth <= t.clientWidth && t.getBoundingClientRect().height <= lh * 1.3; trust.text = t.textContent; }
  }
  let preis = null;
  const pz = [...document.querySelectorAll(".lp-hero-preis .pz")];
  if (pz.length) {
    const rs = pz.map(e => e.getBoundingClientRect());
    const links = pz.filter(e => e.tagName === "A");
    const tap = links.map(e => innerWidth < 600 ? e.getBoundingClientRect().height : parseFloat(getComputedStyle(e, "::after").height) || 0);
    preis = {bottom: Math.round(Math.max(...rs.map(r => r.bottom))), ok: rs.every(r => r.height > 0 && r.top >= 0 && r.bottom <= lim), n: pz.length, links: links.length, tap: tap.length ? Math.round(Math.min(...tap)) : null};
  }
  return JSON.stringify({vh: innerHeight, limit: lim, banner: !!c, bannerH: c ? Math.round(c.getBoundingClientRect().height) : 0,
    next: m(".lp-hero-form [data-next]"), tel: m("header a[href^=\"tel:\"]"), wa: m(".lp-alt a[href*=\"wa.me\"]"), trust, preis,
    hscroll: document.documentElement.scrollWidth > innerWidth});
}'
PWQ open about:blank
# Alles ausserhalb von localhost abbrechen: GTM/GA4/Ads duerfen vom Test nie echte Aufrufe bekommen (Seiten laden GTM beim Start).
PWQ run-code "async page => { await page.context().route(u => /^https?:$/.test(u.protocol) && u.hostname !== 'localhost', r => r.abort()); }"
PWQ goto "$URL"
RC=0
for VP in "360 732 muss" "390 844 muss" "360 640 warn" "1280 800 warn"; do
  set -- $VP
  PWQ resize "$1" "$2"
  PWQ eval "localStorage.clear()"
  PWQ reload
  R=$(PW --raw eval "$JS") || exit 2
  C=0
  node -e '
    let r = JSON.parse(process.argv[1]); if (typeof r === "string") r = JSON.parse(r);
    const muss = process.argv[2] === "muss", id = process.argv[3] + " " + process.argv[4], fp = process.argv[5], preisMuss = (" " + process.argv[6] + " ").includes(" " + process.argv[3] + " ");
    if (r.skip) {
      if (fp !== "hero") { console.log(id + " SKIP (Variante A, form_pos=" + fp + ", kein Hero-Formular)"); process.exit(0); }
      console.error("FIT ROT: " + id + ": form_pos=hero, aber kein .lp-hero-form [data-next] im Hero (Selektor umbenannt oder Formular fehlt)"); process.exit(2);
    }
    const y = o => o ? o.bottom + (o.ok ? "" : "!") : "fehlt";
    const ty = o => o === "na" ? "n/a (Kick sichtbar)" : (o ? o.bottom + (o.ok && o.one ? "" : "!") + (o.one ? "" : " mehrzeilig") : "fehlt");
    const py = o => o ? o.bottom + (o.ok ? "" : "!") + " (" + o.n + " Zeilen, Tippziel " + (o.tap === null ? "-" : o.tap + " px") + ")" : "-";
    console.log(id + " " + (muss ? "muss" : "warn") + " | weiter " + y(r.next) + " | anruf " + y(r.tel) + " | whatsapp " + y(r.wa) + " | trust " + ty(r.trust) + " | preis " + py(r.preis) + " | grenze " + r.limit + " (Banner " + r.bannerH + " von " + r.vh + ") | quer-scroll " + (r.hscroll ? "JA" : "nein"));
    if (!r.banner) { console.error("Banner nicht offen, Messung ungültig"); process.exit(2); }
    const bad = [], hint = [];
    if (!r.next || !r.next.ok) bad.push("Weiter verdeckt");
    if (!r.tel || !r.tel.ok) bad.push("Anruf nicht sichtbar");
    if ((!r.wa || !r.wa.ok) && process.env.FIT_WA_PFLICHT !== "0") bad.push("WhatsApp nicht sichtbar");
    if (r.trust !== "na") {
      if (!r.trust) bad.push("Trust-Zeile fehlt");
      else { if (!r.trust.ok) bad.push("Trust-Zeile verdeckt"); if (!r.trust.one) bad.push("Trust-Zeile mehrzeilig"); }
    }
    if (r.preis) {
      if (!r.preis.ok) (preisMuss ? bad : hint).push("PREIS verdeckt (Preiszeilen reichen bis " + r.preis.bottom + ", Grenze " + r.limit + ")");
      if (r.preis.tap !== null && r.preis.tap < 44) bad.push("Preiszeilen-Tippziel " + r.preis.tap + " px < 44");
    }
    if (hint.length) console.error("HINWEIS: " + id + ": " + hint.join(", "));
    if (bad.length) { console.error((muss ? "FIT ROT: " : "WARNUNG: ") + id + ": " + bad.join(", ")); process.exit(muss ? 1 : 0); }
  ' "$R" "$3" "$SLUG" "$1x$2" "$FP" "$FIT_PREIS_MUSS" || C=$?
  [ "$C" -gt "$RC" ] && RC=$C
done
if [ "$RC" = 0 ]; then echo "FIT GRÜN $SLUG"; else echo "FIT ROT $SLUG (Exit $RC)" >&2; fi
exit "$RC"
