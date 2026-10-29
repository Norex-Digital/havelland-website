#!/usr/bin/env bash
# Formular-Durchlauf lokal. Aufruf: scripts/lp-form-test.sh <slug> <deny|allow> [PORT]
# Server vorher: python -m http.server -d website 4173   (Standard-Port 4173; PORT als 3. Argument oder Umgebungsvariable)
# Mockt Web3Forms (Antwort {"success":true}), GTM, GA4, Google Ads; alles andere ausserhalb von localhost wird abgebrochen
# (kein echter Versand, keine echten Messpunkte). NIE gegen die Live-Domain starten (Host muss localhost sein).
# Ein-Schritt-Formular (v7), ein Feld "Telefon oder E-Mail" (name=kontakt; seit 29.10.2026, JS teilt in die Hidden-Felder tel/email/kontaktweg).
# SCENARIO=happy (Standard): E-Mail-Eingabe → POST email=…, tel leer, kontaktweg=E-Mail, user_data.email bei allow. SCENARIO=voll zusaetzlich: leeres Absenden
# (form_error dsgvo,name,objekt,ort,tel je 1x; das Kontaktfeld meldet weiter field=tel) und Kurzstart ueber die echte Preis-Kachel (a.lp-tile[data-obj], form_quickstart:preis).
# SCENARIO=tel: Telefon-Eingabe → POST tel=…, email leer, kontaktweg=Anruf, user_data.phone_number bei allow.
# Hat die Seite keinen solchen Link (Nachlass, Messie, Gewerbe), wird KEIN synthetischer eingehaengt: form_quickstart wird dort nicht erwartet (0 Ereignisse),
# das Protokoll sagt "Quickstart-Preiszeile: nicht vorhanden". Ein eingehaengtes Element (#__synthetisch) waere ein Fehler.
# Der Server muss genau website/lp/<slug>/index.html ausliefern (CR/LF-Unterschiede zaehlen nicht), sonst Exit 2. form_pos != hero in lp.json: SKIP (Exit 0).
# Ereignisse werden ueber sessionStorage ueber die Weiterleitung gerettet, weil window.dataLayer auf /lp/danke/ neu beginnt.
# Exit 0 = FORM GRUEN, 1 = FORM ROT, 2 = Server-/Browser-Fehler.
set -euo pipefail
export MSYS_NO_PATHCONV=1
SLUG="${1:?Aufruf: lp-form-test.sh <slug> <deny|allow> [PORT]}"; C="${2:?deny|allow}"; PORT="${3:-${PORT:-4173}}"
SCENARIO="${SCENARIO:-happy}"; S="form-$C-$$"
case "$C" in deny|allow) ;; *) echo "Consent muss deny oder allow sein" >&2; exit 2 ;; esac
case "$SCENARIO" in happy|voll|tel) ;; *) echo "SCENARIO muss happy, voll oder tel sein" >&2; exit 2 ;; esac
URL="http://localhost:$PORT/lp/$SLUG/"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RW="$ROOT"; command -v cygpath >/dev/null 2>&1 && RW="$(cygpath -m "$ROOT")"
FP="$(node -e 'const l=(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).lps||[]).find(x=>x.slug===process.argv[2]);process.stdout.write(l?(l.form_pos||"hero"):"")' "$RW/data/copy/lp.json" "$SLUG")"
[ -n "$FP" ] || { echo "Slug $SLUG steht nicht in data/copy/lp.json" >&2; exit 2; }
SERVED="$(curl -sf -m 5 "$URL" | tr -d '\r')" || { echo "Server nicht erreichbar: $URL" >&2; exit 2; }
[ -f "$ROOT/website/lp/$SLUG/index.html" ] || { echo "website/lp/$SLUG/index.html fehlt (erst FULL=1 node scripts/generate.mjs)" >&2; exit 2; }
FILE="$(tr -d '\r' < "$ROOT/website/lp/$SLUG/index.html")"
[ "$SERVED" = "$FILE" ] || { echo "Server liefert nicht website/lp/$SLUG/index.html aus (anderer Stand/anderes Verzeichnis auf Port $PORT)" >&2; exit 2; }
# Echter Preiszeilen-Link vorhanden? (aus der ausgelieferten Seite; nur dann wird form_quickstart:preis getestet und erwartet)
case "$FILE" in *'data-via="preis"'*) HASLINK=1 ;; *) HASLINK=0 ;; esac
if [ "$FP" != hero ]; then echo "SKIP $SLUG (Variante A, form_pos=$FP: kein Hero-Formular, der Hero-Durchlauf gilt nicht)"; exit 0; fi
T="$(mktemp -d)"
trap 'playwright-cli -s="$S" close >/dev/null 2>&1 || true; rm -rf "$T"' EXIT
cd "$T"
PW() { playwright-cli -s="$S" "$@"; }
PW open about:blank >/dev/null || { echo "Browser-Start fehlgeschlagen" >&2; exit 2; }
# Zuerst (= niedrigste Prioritaet): alles ausserhalb von localhost abbrechen. Die Mocks darunter werden spaeter registriert und gewinnen.
PW run-code "async page => { await page.context().route(u => /^https?:$/.test(u.protocol) && u.hostname !== 'localhost', r => r.abort()); }" >/dev/null
PW route "https://api.web3forms.com/**" --body='{"success":true}' --content-type=application/json >/dev/null
PW route "https://www.googletagmanager.com/**" --status=204 --body='' >/dev/null
PW route "https://*.google-analytics.com/**" --status=204 --body='' >/dev/null
PW route "https://*.googleadservices.com/**" --status=204 --body='' >/dev/null
RL="$(PW route-list)"
case "$RL" in *web3forms*) ;; *) echo "ABBRUCH: Web3Forms nicht gemockt"; exit 1 ;; esac
# dataLayer-Ereignisse mitschreiben (sessionStorage ueberlebt die Weiterleitung auf /lp/danke/)
PW run-code "async page => { await page.addInitScript(() => { try { var k='__dl'; var dl = window.dataLayer = window.dataLayer || []; var p = dl.push.bind(dl); dl.push = function(){ for (var i=0;i<arguments.length;i++){ var a=arguments[i]; if(a && a.event){ var s=JSON.parse(sessionStorage.getItem(k)||'[]'); s.push(a); sessionStorage.setItem(k,JSON.stringify(s)); } } return p.apply(null, arguments); }; } catch(e){} }); }" >/dev/null
PW goto "http://localhost:$PORT/lp/$SLUG/?gclid=TEST123" >/dev/null

if [ "$SCENARIO" = voll ]; then
  VOLL_A="await page.click('.lp-hero-form button[type=submit]');
  await page.click('.lp-hero-form .seg label:has(input[name=objekt]) >> nth=0');
  if (await page.locator('a.lp-tile[data-obj]').count()) { await page.locator('a.lp-tile[data-obj]').first().click({ force: true }); await page.evaluate(() => { const a = document.querySelector('a.lp-tile[data-obj]'), r = document.querySelector('input[name=objekt]:checked'); window.dataLayer.push({ event: 'test_quickstart_check', ok: !!(a && r && r.value === a.getAttribute('data-obj')) }); }); }"
else
  VOLL_A=""
fi
if [ "$SCENARIO" = tel ]; then
  WEG="await page.fill('.lp-hero-form input[name=name]', 'Test');
  await page.fill('.lp-hero-form input[name=kontakt]', '030 1234567');"
else
  WEG="await page.fill('.lp-hero-form input[name=name]', 'Test');
  await page.fill('.lp-hero-form input[name=kontakt]', 'test@example.invalid');"
fi
OUTRUN=$(PW run-code "async page => {
  await page.click('#consent [data-c=$C]');
  $VOLL_A
  await page.click('.lp-hero-form .seg label:has(input[name=objekt]) >> nth=0');
  await page.fill('.lp-hero-form input[name=ort]', '14612');
  $WEG
  await page.check('.lp-hero-form input[name=dsgvo]');
  await Promise.all([page.waitForURL('**/lp/danke/**', { timeout: 8000 }), page.click('.lp-hero-form button[type=submit]')]);
}" 2>&1) || true
case "$OUTRUN" in *'### Error'*) echo "FORM ROT: Durchlauf abgebrochen:"; printf '%s\n' "$OUTRUN" | sed -n '/^### Error/,+6p' | head -12 || true; exit 1 ;; esac
sleep 1
# Zustand auf der Danke-Seite, dann Neuladen (darf kein zweites lead_confirmed ausloesen)
STATE='JSON.stringify({loc: location.pathname + location.hash, dl: JSON.parse(sessionStorage.getItem("__dl") || "[]"), cookie: document.cookie, hg: localStorage.getItem("hg_attrib"), consent: localStorage.getItem("consent_v2")})'
PW --raw eval "$STATE" > "$T/state1.json"
PW reload >/dev/null; sleep 1
PW --raw eval "$STATE" > "$T/state2.json"
# Netzwerk: alle Requests (inkl. statische) und der Web3Forms-POST
PW requests --static > "$T/requests.txt"
N=$(grep -E '\[POST\] https://api\.web3forms\.com/submit' "$T/requests.txt" | sed -E 's/^([0-9]+)\..*/\1/' | head -1 || true)
[ -n "$N" ] || { echo "FORM ROT: kein Web3Forms-POST gesehen"; exit 1; }
PW request-body "$N" | tr -d '\r' > "$T/post.txt"

cat > "$T/check.js" <<'EOF'
const fs = require('fs');
const [T, C, SLUG, SCEN, HASLINK] = process.argv.slice(2);
const TEL = SCEN === 'tel';
const rd = f => fs.readFileSync(T + '/' + f, 'utf8');
const js = f => { let r = JSON.parse(rd(f)); if (typeof r === 'string') r = JSON.parse(r); return r; };
const s1 = js('state1.json'), s2 = js('state2.json');
const bad = [];
// --- Ereignisse
const all = s1.dl;
const ev = all.filter(e => !String(e.event).startsWith('gtm.') && !String(e.event).startsWith('test_'));
const tag = e => e.event + (e.start_via ? ':' + e.start_via : e.step ? ':' + e.step : e.field ? ':' + e.field : '');
const n = k => ev.filter(e => e.event === k).length;
if (s1.loc !== '/lp/danke/') bad.push('Ziel ' + s1.loc);
['form_start', 'form_step', 'generate_lead', 'lead_confirmed'].forEach(k => { if (n(k) !== 1) bad.push(k + ' x' + n(k)); });
const cc = ev.filter(e => e.event === 'consent_choice');
if (cc.length !== 1 || cc[0].consent_choice !== C) bad.push('consent_choice != ' + C);
const fs0 = ev.find(e => e.event === 'form_start');
if (!fs0 || fs0.start_via !== 'chip') bad.push('form_start:chip fehlt (start_via=' + (fs0 && fs0.start_via) + ')');
const st = ev.find(e => e.event === 'form_step');
if (!st || st.step !== 2) bad.push('form_step:2 fehlt');
if (SCEN !== 'voll') {
  if (n('form_quickstart') !== 0) bad.push('form_quickstart ohne Preis-Kachel-Tipp');
  if (n('form_error') !== 0) bad.push('form_error');
} else {
  const fe = ev.filter(e => e.event === 'form_error').map(e => e.field).sort().join(',');
  if (fe !== 'dsgvo,name,objekt,ort,tel') bad.push('form_error erwartet dsgvo,name,objekt,ort,tel (je 1x), war: ' + fe);
  const q = ev.filter(e => e.event === 'form_quickstart');
  if (HASLINK === '1') { if (q.length !== 1 || q[0].start_via !== 'preis') bad.push('form_quickstart:preis x' + q.length); const qc = all.filter(e => e.event === 'test_quickstart_check'); if (qc.length !== 1 || !qc[0].ok) bad.push('Preis-Kachel wählt das Objekt nicht vor'); }
  else if (q.length !== 0) bad.push('form_quickstart x' + q.length + ' obwohl die Seite keinen Preiszeilen-Link hat');
}
// Reihenfolge: consent_choice < form_start < form_step < generate_lead < lead_confirmed
const idx = k => ev.findIndex(e => e.event === k);
const ord = ['consent_choice', 'form_start', 'form_step', 'generate_lead', 'lead_confirmed'].map(idx);
if (ord.some((v, i) => i && v <= ord[i - 1])) bad.push('Reihenfolge der Ereignisse');
// --- generate_lead: Consent, user_data nur bei allow
const gl = ev.find(e => e.event === 'generate_lead') || {};
if (gl.ads_consent !== C) bad.push('generate_lead.ads_consent=' + gl.ads_consent);
if (gl.lead_source !== 'ads-lp' || gl.lp !== SLUG) bad.push('generate_lead lead_source/lp');
if (C === 'deny' && 'user_data' in gl) bad.push('user_data trotz deny');
if (C === 'allow') {
  if (TEL) {
    if (!gl.user_data || gl.user_data.phone_number !== '+49301234567') bad.push('user_data.phone_number != +49301234567 bei allow');
    if (gl.user_data && gl.user_data.email) bad.push('user_data.email gesetzt obwohl keine E-Mail');
  } else {
    if (!gl.user_data || gl.user_data.email !== 'test@example.invalid') bad.push('user_data.email != test@example.invalid bei allow');
    if (gl.user_data && gl.user_data.phone_number) bad.push('user_data.phone_number gesetzt obwohl keine Telefonnummer');
  }
}
if (gl.kontaktweg !== (TEL ? 'Anruf' : 'E-Mail')) bad.push('generate_lead.kontaktweg=' + gl.kontaktweg);
// --- Neuladen der Danke-Seite: kein zweites lead_confirmed
const lc2 = s2.dl.filter(e => e.event === 'lead_confirmed').length;
if (lc2 !== 1) bad.push('lead_confirmed nach Neuladen x' + lc2);
// --- Consent-Speicher: hg_attrib (Klick-ID im Endgeraet) nur bei allow; keine Cookies der Seite
const hg = s1.hg ? JSON.parse(s1.hg) : null;
if (C === 'deny' && hg) bad.push('hg_attrib gespeichert trotz deny');
if (C === 'allow' && !(hg && hg.gclid === 'TEST123')) bad.push('hg_attrib ohne gclid bei allow');
if (s1.cookie) bad.push('document.cookie nicht leer: ' + s1.cookie);
if (!s1.consent || JSON.parse(s1.consent).c !== C) bad.push('consent_v2 != ' + C);
// --- POST
const body = rd('post.txt');
const f = {}; const re = /name="([^"]+)"\n\n([\s\S]*?)\n(?=--)/g; let m;
while ((m = re.exec(body + '\n--')) !== null) f[m[1]] = m[2];
if (f.gclid !== 'TEST123') bad.push('gclid=' + f.gclid + ' im POST');
if (f.ads_consent !== C) bad.push('ads_consent=' + f.ads_consent + ' im POST');
if (f.quelle !== 'ads-lp') bad.push('quelle=' + f.quelle);
if (f.lp !== SLUG) bad.push('lp=' + f.lp);
if (!f.access_key) bad.push('access_key fehlt');
if (!/\/lp\/danke\/$/.test(f.redirect || '')) bad.push('redirect=' + f.redirect);
if (!/^\/lp\/[a-z-]+\/ @\d{4}-/.test(f.landing_url || '')) bad.push('landing_url=' + f.landing_url);
const wegOk = TEL ? (f.kontaktweg === 'Anruf' && f.tel === '030 1234567' && f.email === '') : (f.kontaktweg === 'E-Mail' && f.email === 'test@example.invalid' && f.tel === '');
if (!f.objekt || f.ort !== '14612' || !wegOk || f.name !== 'Test' || f.dsgvo === undefined) bad.push('Nutzfelder im POST unvollstaendig (kontaktweg/tel/email: ' + JSON.stringify([f.kontaktweg, f.tel, f.email]) + ')');
if ('kontakt' in f) bad.push('Sichtfeld kontakt im POST (soll nur tel/email/kontaktweg enthalten)');
for (const k of ['tel', 'email', 'kontaktweg']) if (!(k in f)) bad.push('POST-Feld ' + k + ' fehlt');
for (const k of ['wbraid', 'gbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'subject', 'from_name'])
  if (!(k in f)) bad.push('hidden ' + k + ' fehlt im POST');
// --- Netzwerk: nur Mock-Hosts ausser localhost; genau ein POST
const reqs = rd('requests.txt').split('\n').filter(l => /^\d+\. \[/.test(l));
const hosts = new Set(), posts = reqs.filter(l => /\[POST\]/.test(l));
reqs.forEach(l => { const u = (l.match(/\] (https?:\/\/[^\s/]+)/) || [])[1]; if (u && !/^https?:\/\/localhost(:\d+)?$/.test(u)) hosts.add(u.replace(/^https?:\/\//, '')); });
const ok = h => /^(api\.web3forms\.com|www\.googletagmanager\.com|[a-z0-9.-]+\.google-analytics\.com|[a-z0-9.-]+\.googleadservices\.com)$/.test(h);
const fremd = [...hosts].filter(h => !ok(h));
if (fremd.length) bad.push('Request an nicht gemockten Host (abgebrochen): ' + fremd.join(', '));
if (posts.length !== 1) bad.push('POST-Anzahl ' + posts.length);
else if (!/=> \[200\]/.test(posts[0])) bad.push('POST ohne 200 vom Mock: ' + posts[0]);
// --- Protokoll
console.log('Ereignisse (' + SCEN + ', ' + C + '): ' + ev.map(tag).join(' '));
if (SCEN === 'voll') console.log('Quickstart-Preis-Kachel: ' + (HASLINK === '1' ? 'echte Kachel der Seite, getestet (form_quickstart:preis x1)' : 'nicht vorhanden auf dieser Seite, nicht getestet und nicht erwartet (keine synthetische Kachel)'));
const gp = Object.assign({}, gl); delete gp.eventTimeout;
console.log('generate_lead: ' + JSON.stringify(gp));
const show = Object.keys(f).map(k => k + '=' + (k === 'access_key' ? f[k].slice(0, 8) + '…' : JSON.stringify(f[k]))).join('  ');
console.log('POST-Felder: ' + show);
console.log('externe Hosts (alle gemockt/abgebrochen): ' + [...hosts].join(', '));
console.log('Speicher: hg_attrib=' + (hg ? JSON.stringify({gclid: hg.gclid}) : 'leer') + ' consent_v2=' + s1.consent.replace(/,"t":\d+/, '') + ' cookie=' + JSON.stringify(s1.cookie));
if (bad.length) { console.error('FORM ROT: ' + bad.join(' | ')); process.exit(1); }
EOF
# Windows: node ist nativ und versteht /tmp/… nicht, daher Pfad umwandeln (auf dem Mac gibt es kein cygpath)
TW="$T"; command -v cygpath >/dev/null 2>&1 && TW="$(cygpath -m "$T")"
node "$TW/check.js" "$TW" "$C" "$SLUG" "$SCENARIO" "$HASLINK"
echo "FORM GRÜN $SLUG $C ($SCENARIO; POST gemockt, gclid=TEST123, ads_consent=$C)"
