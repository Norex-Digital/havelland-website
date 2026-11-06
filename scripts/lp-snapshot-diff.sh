#!/usr/bin/env bash
# Beweis der Unversehrtheit: baut den Stand von <ref> (Standard origin/master) in einem Temp-Worktree und den aktuellen Stand, vergleicht byteweise.
# Aufruf: scripts/lp-snapshot-diff.sh [ref]     (Voraussetzung: sauber committeter oder zumindest lauffaehiger Arbeitsstand; baut FULL=1)
# Pflicht: alle LPs und die Danke-Seite des Basisstands (Entruempelung, Messfenster) bleiben byteidentisch. Zusaetzlich wird website/ ausserhalb von /lp/
# verglichen: erlaubt sind nur neue Dateien (Hecken-Bilder, neue LP-Seiten) und assets/img/manifest.json (nur Zusatzeintraege, wird separat geprueft).
# Exit 0 = IDENTISCH, 1 = Abweichung, 2 = Aufbau-Fehler.
set -euo pipefail
REF="${1:-origin/master}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/lp-snap.XXXXXX")"
cleanup() { git -C "$ROOT" worktree remove --force "$TMP/base" >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
git -C "$ROOT" worktree add --detach "$TMP/base" "$REF" >/dev/null 2>&1 || { echo "Worktree fuer $REF fehlgeschlagen" >&2; exit 2; }
echo "Basis: $REF ($(git -C "$TMP/base" rev-parse --short HEAD)) bauen ..."
( cd "$TMP/base" && FULL=1 node scripts/generate.mjs >/dev/null ) || { echo "Basis-Build fehlgeschlagen" >&2; exit 2; }
echo "Aktuellen Stand bauen ..."
( cd "$ROOT" && FULL=1 node scripts/generate.mjs >/dev/null ) || { echo "Build fehlgeschlagen" >&2; exit 2; }
BAD=0; N=0
SLUGS="$(node -e 'for (const l of (JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).lps||[])) console.log(l.slug)' "$TMP/base/data/copy/lp.json")"
for S in $SLUGS danke; do
  N=$((N+1))
  A="$TMP/base/website/lp/$S/index.html"; B="$ROOT/website/lp/$S/index.html"
  if cmp -s "$A" "$B"; then echo "  identisch  lp/$S/"; else echo "  ABWEICHUNG lp/$S/"; BAD=$((BAD+1)); fi
done
echo "Seiten gepruefte LP-Basis: $N, abweichend: $BAD"
echo "--- website/ ausserhalb /lp/ (diff -rq Basis gegen aktuell) ---"
DIFF="$(diff -rq "$TMP/base/website" "$ROOT/website" | grep -v "/website/lp\b" | grep -v "website/lp/" || true)"
printf '%s\n' "$DIFF" | sed "s#$TMP/base/##; s#$ROOT/##" | sed '/^$/d'
CHG="$(printf '%s\n' "$DIFF" | grep -c '^Files ' || true)"
echo "geaenderte (nicht nur neue) Dateien ausserhalb /lp/: $CHG"
# erlaubt: nur assets/img/manifest.json (Zusatzeintraege)
FREMD="$(printf '%s\n' "$DIFF" | grep '^Files ' | grep -v 'assets/img/manifest.json' || true)"
[ -z "$FREMD" ] || { echo "UNERLAUBT geaendert:"; echo "$FREMD"; BAD=$((BAD+1)); }
FEHLT="$(printf '%s\n' "$DIFF" | grep "^Only in $TMP/base" || true)"
[ -z "$FEHLT" ] || { echo "UNERLAUBT fehlend im aktuellen Stand:"; echo "$FEHLT"; BAD=$((BAD+1)); }
# manifest: Basis-Eintraege unveraendert
node -e '
const fs=require("fs");const a=JSON.parse(fs.readFileSync(process.argv[1],"utf8")),b=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
const bad=Object.keys(a).filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k]));
console.log("manifest.json: "+Object.keys(a).length+" Basis-Eintraege, "+bad.length+" geaendert, "+(Object.keys(b).length-Object.keys(a).length)+" neu");
process.exit(bad.length?1:0)' "$TMP/base/assets/img/manifest.json" "$ROOT/assets/img/manifest.json" || BAD=$((BAD+1))
if [ "$BAD" -eq 0 ]; then echo "SNAPSHOT-DIFF IDENTISCH ($N Basis-LP-Seiten byteidentisch)"; exit 0; fi
echo "SNAPSHOT-DIFF ABWEICHUNG ($BAD)"; exit 1
