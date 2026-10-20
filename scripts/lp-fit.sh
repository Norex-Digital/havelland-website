#!/usr/bin/env bash
# Hero-Fit-Gate: Schritt 1 inkl. "Weiter" und die Zweitwege (Anruf, WhatsApp) bei offenem Consent-Banner ohne Scrollen
# oberhalb der Banner-Oberkante sichtbar.
# Aufruf: scripts/lp-fit.sh <slug>   (Server vorher: python -m http.server -d website 4173 ; PORT=… überschreibt)
# Exit 0 = grün oder Variante A (SKIP), 1 = rot, 2 = Server/Browser-Fehler oder ungültige Messung.
# 360x732 und 390x844 sind Pflicht (rot bei Verstoß); 360x640 und 1280x800 sind Warnzeilen und blockieren nicht.
# Alle vier Viewports werden immer gemessen, auch wenn ein früherer rot war.
# FIT_WA_PFLICHT=0 macht "WhatsApp nicht sichtbar" zur Warnung (nur nach schriftlicher Entscheidung von Maurice, Betriebslog).
set -euo pipefail
export MSYS_NO_PATHCONV=1
SLUG="${1:?Aufruf: lp-fit.sh <slug>}"; PORT="${PORT:-4173}"; S="fit-$SLUG-$$"
URL="http://localhost:$PORT/lp/$SLUG/"
curl -sf -m 5 "$URL" >/dev/null || { echo "Server nicht erreichbar: $URL" >&2; exit 2; }
T="$(mktemp -d)"
trap 'playwright-cli -s="$S" close >/dev/null 2>&1 || true; rm -rf "$T"' EXIT
cd "$T"
# playwright-cli mit Fehlerausgabe: scheitert ein Aufruf, steht die Meldung auf stderr und das Skript endet mit Exit 2.
PW() { local o; if ! o=$(playwright-cli -s="$S" "$@" 2>&1); then echo "playwright-cli $1 fehlgeschlagen: $o" >&2; return 1; fi; printf '%s\n' "$o"; }
PWQ() { PW "$@" >/dev/null || exit 2; }
# Messung: Weiter (Hero-Formular), Anruf (Header-Pill), WhatsApp (lp-alt). Grenze = Oberkante des offenen Banners.
JS='async () => {
  await document.fonts.ready; await new Promise(r => setTimeout(r, 400));
  const n = document.querySelector(".lp-hero-form [data-next]");
  if (!n) return JSON.stringify({skip: true});
  scrollTo(0, 0);
  const c = document.querySelector(".consent:not([hidden])");
  const lim = c ? Math.min(innerHeight, Math.round(c.getBoundingClientRect().top)) : innerHeight;
  const m = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return {top: Math.round(r.top), bottom: Math.round(r.bottom), ok: r.height > 0 && r.top >= 0 && r.bottom <= lim}; };
  return JSON.stringify({vh: innerHeight, limit: lim, banner: !!c, bannerH: c ? Math.round(c.getBoundingClientRect().height) : 0,
    next: m(".lp-hero-form [data-next]"), tel: m("header a[href^=\"tel:\"]"), wa: m(".lp-alt a[href*=\"wa.me\"]"),
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
    const muss = process.argv[2] === "muss", id = process.argv[3] + " " + process.argv[4];
    if (r.skip) { console.log(id + " SKIP (Variante A, kein Hero-Formular)"); process.exit(0); }
    const y = o => o ? o.bottom + (o.ok ? "" : "!") : "fehlt";
    console.log(id + " " + (muss ? "muss" : "warn") + " | weiter " + y(r.next) + " | anruf " + y(r.tel) + " | whatsapp " + y(r.wa) + " | grenze " + r.limit + " (Banner " + r.bannerH + " von " + r.vh + ") | quer-scroll " + (r.hscroll ? "JA" : "nein"));
    if (!r.banner) { console.error("Banner nicht offen, Messung ungültig"); process.exit(2); }
    const bad = [];
    if (!r.next || !r.next.ok) bad.push("Weiter verdeckt");
    if (!r.tel || !r.tel.ok) bad.push("Anruf nicht sichtbar");
    if ((!r.wa || !r.wa.ok) && process.env.FIT_WA_PFLICHT !== "0") bad.push("WhatsApp nicht sichtbar");
    if (bad.length) { console.error((muss ? "FIT ROT: " : "WARNUNG: ") + id + ": " + bad.join(", ")); process.exit(muss ? 1 : 0); }
  ' "$R" "$3" "$SLUG" "$1x$2" || C=$?
  [ "$C" -gt "$RC" ] && RC=$C
done
if [ "$RC" = 0 ]; then echo "FIT GRÜN $SLUG"; else echo "FIT ROT $SLUG (Exit $RC)" >&2; fi
exit "$RC"
