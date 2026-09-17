# W1 — Startseite-Cluster + Entrümpelungs-Pillar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Welle 1 aus `gbr-firma/websites/havelland/website/organisch-entruempelung-plan.md`: Startseite ohne Hecken-Fixierung mit 4 Cluster-Kacheln, Hub `/entruempelung/` als Pillar mit echten Fallbeispielen und Ortsfakten, `/haushaltsaufloesung/` als eigenständiger Erbfall-Prozess-Hub, Service+OfferCatalog-Schema, GBP-Leistungs-Items, Indexierungsanträge.

**Architecture:** Static-Generator `scripts/generate.mjs` (Templates) + `scripts/components.mjs` (wiederverwendbare Blöcke) + Daten-Layer `data/copy/*.json` (Copy) + `assets/css/site.css`. Änderungen: eine neue Komponente `clusterKacheln()`, ein neuer Hub-Copy-Block `faelle` (Fallbeispiele mit echten Fotos), ein Feld `fakt` je Ort in `ortsseiten.json`, Schema-Erweiterung in `hub()`, Startseiten-Umbau in `home()`. Qualität über `scripts/gates.mjs` (Pflicht-Gates), `scripts/accept.mjs` (Komponenten-Akzeptanz), Near-Duplicate-Gate, Snapshot-Diff.

**Tech Stack:** Node ≥ 18 (ESM, zero-dependency), Python 3 für Diff/Prüf-Skripte, Vercel (Push → Deploy), GBP Business Information API (MCP `gbp` / `selfbuild-mcp/google-gbp`), GSC (MCP `mcp-gsc`).

**Repo:** `C:\Norex\havelland-website` (Branch `master`, Deploy = Push). Doku-Repo: `C:\Norex\gbr-firma`. Alle Pfade unten relativ zum jeweiligen Repo-Root.

**Harte Regeln (aus CLAUDE.md gbr-firma):** kein Commit/Push ohne Owner-OK · keine neuen Dependencies · echte Fotos nur mit dokumentierter Einwilligung (Gutzke: `kunden/hausgarten/_aktiv/gutzke-monika-2026-09-01/kunde.md` §Foto-Freigabe) · Leistungsdefinition = Ads-LP (Festpreis nach Besichtigung für Räumung + Abtransport; Entsorgungsgebühren nach Beleg; Geruch/Schimmel/Grundreinigung = eigene Position; keine „inklusive"-Versprechen) · **kein FAQPage-Schema** (Gate) · Skills werden per Skill-Tool **geladen**, nicht gelesen.

**Skills je Task (laden, im Chat nennen — validiert 17.09. gegen die Skill-Beschreibungen):** T2–T4 Design: `havelland-design` (Pflicht bei jedem HuG-Bauteil), `page-cro` · T5–T6 Copy: `seo-web-copy` → `stop-slop` → `llm-optimisation` → `copy-audit` (**Gate nach größeren Copy-Updates**) · T5 Step 0: Agent `claude-seo:seo-sxo` (Sonnet) · T7: `seo-schema` · T8: `seo-technical` + **`page-audit` (Launch-Gate, mandatory)** + **`page-cro` (mandatory before go-live)** · T9: MCP `gbp` (`gbp_get_location`, `gbp_update_location` mit `updateMask`, `gbp_set_description` — Schemas geprüft) · T10: MCP `mcp-gsc` (`submit_sitemap`, `batch_url_inspection` — geprüft), Skript `seo-drift-baseline.mjs`. Nicht nötig in W1: `programmatic-seo` (keine Ortsseiten), `seo-local`-Agent (Item-Split ist kein Audit-Fall), `seo-geo` (Mini-Strang W3).

---

## Datei-Landkarte

| Datei | Änderung | Verantwortung |
|---|---|---|
| `scripts/components.mjs` | neu: `clusterKacheln(items)`, `faelleBlock(faelle)`, `echtProjekt()` → zwei Projekte | Wiederverwendbare Blöcke, keine Daten |
| `scripts/generate.mjs` | `home()`: Title/Meta/Lead/Trust, Cluster statt `fokusCards`, Kompass + Kalender raus, Cluster-Strip im Hero · `hub()`: `faelle`-Block, Orts-Fakt in Karten, OfferCatalog-Schema · `footer`: 4 Cluster-Spalten · `sanHub`/`sanOrtsSvc`: neue Felder | Templates |
| `assets/css/site.css` | neu: `.cluster`, `.cl`, `.cl-sub`, `.faelle`, `.fall`, `.hero-strip` | Design-System |
| `data/copy/hubs.json` | `entruempelung`: Pillar-Copy (sections, blocks, faelle, faqs, title/meta/h1) · `haushaltsaufloesung`: Umschreibung | Copy |
| `data/copy/ortsseiten.json` | `services.entruempelung.orte.<ort>.fakt`, `services.haushaltsaufloesung.orte.<ort>.fakt` | Lokaldaten |
| `data/lokalfakten.json` | **neu**: Wertstoffhof/Sperrmüll-Fakten je Ort mit Quelle + Datum (Basis für W2-Ratgeber) | Fakten, belegt |
| `scripts/accept.mjs` | Home: `pills`/`kpanel`/`cal` raus, `cluster`/`hero-strip` rein · Hub entruempelung: `faelle` | Akzeptanz |
| `gbr-firma/websites/havelland/website/status.md` | Eintrag W1 | Doku |
| `gbr-firma/02-Haus und Gartenservice Havelland/wissen/gbp/profil.md`, `content.md` | Leistungs-Items, Beschreibung | Doku GBP |

---

### Task 0: Branch, Baseline-Snapshot, Skills

**Files:** keine Änderung — Vorbereitung.

- [ ] **Step 1: Branch anlegen (kein Worktree nötig — eine Session)**

```bash
cd /c/Norex/havelland-website && git status --short && git checkout -b w1-organisch
```
Expected: `Switched to a new branch 'w1-organisch'`, Working Tree sauber (sonst erst Owner fragen).

- [ ] **Step 2: Baseline bauen und Snapshot sichern (für Byte-Diff der unveränderten Seiten)**

```bash
cd /c/Norex/havelland-website && FULL=1 node scripts/generate.mjs && node scripts/gates.mjs && node scripts/accept.mjs && rm -rf /tmp/w1-base && cp -r website /tmp/w1-base && find website -name index.html | wc -l
```
Expected: Gates `GRÜN`, Accept ohne FAIL, Seitenzahl ≈ 228.

- [ ] **Step 3: Skills laden** — per Skill-Tool: `havelland-design`, `page-cro`, `seo-web-copy`, `llm-optimisation`, `seo-schema`. Im Chat auflisten. Ohne diesen Nachweis gilt W1 als nicht gestartet.

---

### Task 1: Startseite — Title, Meta, Hero-Lead, Trust-Zeile

**Files:**
- Modify: `scripts/generate.mjs` (Funktion `home()`, Hero-Block + `write('/')`-Zeile)

- [ ] **Step 1: Failing check schreiben** — Prüfskript, das die neuen Strings im gebauten Output erwartet:

```bash
cat > /tmp/w1-t1.sh <<'EOF'
h=website/index.html
grep -q '<title>Gartenpflege Falkensee · Entrümpelung · Objektbetreuung</title>' $h || { echo FAIL title; exit 1; }
grep -q 'Garten, Entrümpelung, Objektbetreuung' $h || { echo FAIL lead; exit 1; }
grep -qv 'Welche Hecke steht bei' $h || true
echo OK T1
EOF
cd /c/Norex/havelland-website && bash /tmp/w1-t1.sh
```
Expected: `FAIL title`.

- [ ] **Step 2: Title + Meta ändern** — in `home()` die `write('/', head(...))`-Zeile ersetzen:

```js
  // Title (17.09.): "Gartenpflege Falkensee" bleibt vorn (Pos. 2,1 / 377 Impr. GSC 90 Tage), dahinter die zwei
  // anderen Cluster — Startseite rankt fuer "entruempelung falkensee" (Pos. 7,5) mit Garten-Snippet -> 0 Klicks.
  write('/', head('Gartenpflege Falkensee · Entrümpelung · Objektbetreuung', mkMeta('Gartenpflege, Entrümpelung und Objektbetreuung in Falkensee und im Havelland — ein Ansprechpartner, Festpreis nach Besichtigung, Foto-Nachweis inklusive.'), '/', orgSchema()) + header + main + footer + SCTA_DEFAULT + revealJS + '</body></html>');
```
Validiert 17.09.: Title 55 Zeichen (Gate WARN ab 60, `gates.mjs:54`), Meta 153 (Gate 150–158, `gates.mjs:55`). Der Markenname fällt aus dem Title — Google zeigt den Site-Namen seit 2023 separat aus `WebSite`-Schema/`og:site_name`; beides fehlt heute (`head()` hat kein `og:site_name`, `orgSchema()` kein `WebSite`). Wird in **Task 7 Step 2a** ergänzt; dort auch `orgSchema() + ',' + websiteSchema()` in dieser Zeile aktivieren.

- [ ] **Step 3: Hero-Lead saisonneutral verbreitern** — `homeLead` ersetzen (Herbst-Bezug bleibt über `saisonTeaser`):

```js
  // Hero-Lead (17.09.): drei Cluster in einem Satz, Partner-Framing Winterdienst bleibt. Saisonales lebt im saisonTeaser.
  const homeLead = 'Garten, Entrümpelung, Objektbetreuung — ein fester Ansprechpartner im Havelland. Heckenschnitt und Gartenpflege, Keller und Schuppen ausräumen, Grünpflege und Winterdienst für Ihr Objekt: Festpreis nach kostenloser Besichtigung, Foto-Nachweis nach jedem Auftrag.';
```
Die alte dreifach-Verzweigung (`istHerbst ? … : istWinter ? … : …`) für `homeLead` entfernt; `istHerbst`/`istWinter`/`saisonMonat` bleiben (werden von `saisonTeaser` und T2 nicht mehr für `KERN` gebraucht → Task 2 entfernt `KERN_*`).

- [ ] **Step 4: Trust-Zeile** — dritten Eintrag ersetzen (`Stunden statt Tage` → Cluster-Beleg):

```js
<div class="trust-row rv in d4"><div class="t"><b>Ein</b><span>fester Ansprechpartner</span></div><div class="t"><b>Festpreis</b><span>nach Besichtigung</span></div><div class="t"><b>Foto</b><span>-Nachweis nach jedem Auftrag</span></div></div></div>
```

- [ ] **Step 5: Bauen + Check**

```bash
cd /c/Norex/havelland-website && node scripts/generate.mjs && bash /tmp/w1-t1.sh
```
Expected: `OK T1`.

- [ ] **Step 6: Commit (lokal, Branch)**

```bash
git add scripts/generate.mjs && git commit -m "home: Title/Meta/Lead auf drei Cluster (Garten · Entrümpelung · Objekte), Trust-Zeile Foto-Nachweis"
```

---

### Task 2: Kernleistungen → 4 Cluster-Kacheln

**Files:**
- Modify: `scripts/components.mjs` (neuer Export `clusterKacheln`)
- Modify: `assets/css/site.css` (nach `.it .arr…`, Zeile ~623)
- Modify: `scripts/generate.mjs` (`home()`: `KERN_*`/`fokusCards` raus, Cluster-Sektion rein)
- Modify: `scripts/accept.mjs` (Home-Check `cluster`)

- [ ] **Step 1: Failing Accept-Check** — in `scripts/accept.mjs` nach Zeile 52 (`gebiet-wrap`) einfügen:

```js
  check('home', 'cluster', classCount(h, 'cluster') >= 1);      // 17.09.: 4 Cluster-Kacheln statt 6 Einzelkarten
  check('home', 'cl', classCount(h, 'cl') === 4);
```
Run: `node scripts/accept.mjs` → Expected: FAIL `home cluster`.

- [ ] **Step 2: Komponente** — in `scripts/components.mjs` vor `// VN-Metadaten` einfügen:

```js
// ---------------------------------------------------------------------------
// clusterKacheln — 4 Cluster als .cluster > a.cl (Hub) + .cl-sub (Unterleistungen). Ersetzt seit 17.09. die
// 6 Einzelkarten (.list > a.it) auf der Startseite: drei Käufergruppen (Garten / GaLaBau / Entrümpelung / Objekte)
// bekommen je einen Einstieg, kein Käufer wird bevorzugt (Plan organisch-entruempelung §2 E2).
// items: [{ href, kick, h3, p, subs:[{href,label}], cls }]
// ---------------------------------------------------------------------------
export function clusterKacheln(items) {
  return `<div class="cluster">` + items.map((c, i) =>
    `<div class="cl rv d${i + 1}"><a class="cl-main" href="${esc(c.href)}"><span class="kick">${esc(c.kick)}</span><h3>${esc(c.h3)}</h3><p>${esc(c.p)}</p><span class="arr">Zur Leistung →</span></a>` +
    `<ul class="cl-sub">${c.subs.map(s => `<li><a href="${esc(s.href)}">${esc(s.label)}</a></li>`).join('')}</ul></div>`
  ).join('') + `</div>`;
}
```
(`esc` existiert in components.mjs bereits — prüfen mit `grep -n "^const esc" scripts/components.mjs`; falls nicht, aus generate.mjs kopieren: `const esc = t => (t == null ? '' : String(t)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');`)

- [ ] **Step 3: CSS** — in `assets/css/site.css` direkt nach der `.it .arr`-Regel:

```css
/* Cluster-Kacheln (17.09.) — 4 Einstiege, Tokens wie .it/.card */
.cluster{display:grid;grid-template-columns:repeat(2,1fr);gap:18px}
.cl{display:flex;flex-direction:column;background:#fff;border:1px solid var(--hair);border-radius:16px;overflow:hidden;transition:transform .15s var(--ease),box-shadow .2s,border-color .2s}
.cl:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(0,0,0,.06);border-color:var(--green)}
.cl-main{display:block;padding:24px 24px 18px;color:inherit;text-decoration:none}
.cl-main .kick{display:block;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent-d);margin-bottom:8px}
.cl-main h3{font-family:var(--font-display);font-weight:600;font-size:23px;color:var(--green-d);margin-bottom:6px}
.cl-main p{font-size:15px;color:var(--muted);line-height:1.5}
.cl-main .arr{display:inline-block;margin-top:10px;color:var(--green);font-weight:600}
.cl-sub{list-style:none;margin:0;padding:12px 24px 18px;border-top:1px solid var(--hair);display:flex;flex-wrap:wrap;gap:6px 14px}
.cl-sub a{font-size:14px;color:var(--green-d);text-decoration:underline;text-decoration-color:var(--hair);text-underline-offset:3px}
.cl-sub a:hover{text-decoration-color:var(--green)}
@media(max-width:760px){.cluster{grid-template-columns:1fr}}
```

- [ ] **Step 4: Startseite verdrahten** — in `home()`: die Konstanten `KERN_BASIS`, `WD`, `KERN_HERBST`, `KERN`, `K`, `fokusCards` **löschen** (Saisonlogik für Kacheln entfällt; `saisonMonat`/`istHerbst`/`istWinter` bleiben für `saisonTeaser`). Stattdessen:

```js
  // Kernleistungen = 4 Cluster (17.09., Plan organisch-entruempelung §2). Reihenfolge = Saisonneutral; Saisonales im saisonTeaser.
  const CLUSTER = [
    { href: '/gartenpflege/', kick: 'Garten & Grundstück', h3: 'Gepflegt durchs Jahr', p: 'Rasen, Hecke, Laub, Dachrinne — im Abo oder einmalig, mit festem Termin und Foto-Nachweis.',
      subs: [{ href: '/heckenschnitt/', label: 'Heckenschnitt' }, { href: '/baumschnitt/', label: 'Baumschnitt' }, { href: '/dachrinnenreinigung/', label: 'Dachrinne' }, { href: '/fensterreinigung/', label: 'Fensterreinigung' }, { href: '/winterdienst/', label: 'Winterdienst' }] },
    { href: '/galabau/', kick: 'GaLaBau & Rodung', h3: 'Weg damit, neu gemacht', p: 'Hecke raus, Stubben gefräst, Zaun gesetzt, Fläche frei — kleinere Bau- und Rodungsarbeiten zum Festpreis.',
      subs: [{ href: '/zaunbau/', label: 'Zaunbau' }, { href: '/heckenentfernung/', label: 'Heckenentfernung' }, { href: '/gartenrodung/', label: 'Gartenrodung' }, { href: '/baumstumpf-entfernen/', label: 'Baumstumpf' }] },
    { href: '/entruempelung/', kick: 'Entrümpelung & Haushaltsauflösung', h3: 'Rund ums Haus ausgeräumt', p: 'Keller, Garage, Dachboden, Schuppen oder die ganze Wohnung — Festpreis für Räumung und Abtransport, Entsorgung nach Beleg.',
      subs: [{ href: '/haushaltsaufloesung/', label: 'Haushaltsauflösung' }, { href: '/entruempelung/#nebengebaeude', label: 'Keller · Garage · Dachboden' }, { href: '/entruempelung/#gartenhaus', label: 'Gartenhaus-Abriss' }, { href: '/entruempelung/#gewerbe', label: 'Gewerbe' }] },
    { href: '/fuer-hausverwaltungen/', kick: 'Hausverwaltungen & Objekte', h3: 'Ein Vertrag, ein Ansprechpartner', p: 'Grünpflege, Winterdienst, Treppenhaus und Kleinreparaturen für Ihre Objekte — Foto-Reporting nach jedem Einsatz.',
      subs: [{ href: '/objektbetreuung/', label: 'Objektbetreuung' }, { href: '/unterhaltsreinigung/', label: 'Unterhaltsreinigung' }, { href: '/gartenpflege/', label: 'Grünpflege im Vertrag' }, { href: '/winterdienst/', label: 'Winterdienst' }] }
  ];
```
Und die Kernleistungen-Sektion im `main`-Template ersetzen:

```js
<section class="sec" id="kernleistungen"><div class="wrap"><div class="head"><h2 class="serif rv">Unsere Kernleistungen</h2><a class="rv" href="/leistungen/">Alle Leistungen →</a></div><p class="intro rv">Vier Bereiche, ein Ansprechpartner — vom regelmäßigen Garten über die leere Garage bis zum betreuten Mehrfamilienhaus.</p>${clusterKacheln(CLUSTER)}</div></section>
```
Import ergänzen (Zeile 10–13): `clusterKacheln` in die Import-Liste aus `./components.mjs`.

Die Anker `#nebengebaeude`, `#gartenhaus`, `#gewerbe` werden in Task 5 als `blocks[].id` im Hub angelegt — **Task 5 ist Voraussetzung für einen Link-Gate-Lauf ohne tote Anker** (gates prüfen nur Pfade, nicht Anker; Anker trotzdem in Task 8 per grep verifizieren).

- [ ] **Step 5: Bauen, Accept**

```bash
cd /c/Norex/havelland-website && node scripts/generate.mjs && node scripts/accept.mjs 2>&1 | grep -E "home|FAIL" | head
```
Expected: `home cluster` OK, `home cl` OK, keine FAIL außer den noch offenen `pills/kpanel/cal` (die fallen in Task 3).

- [ ] **Step 6: Commit**

```bash
git add scripts/components.mjs scripts/generate.mjs assets/css/site.css scripts/accept.mjs && git commit -m "home: Kernleistungen als 4 Cluster-Kacheln (clusterKacheln), Saison-Kachellogik entfernt"
```

---

### Task 3: Hecken-Kompass + Schnittkalender von der Startseite, echtProjekt mit zwei Projekten, Hero-Strip

**Files:**
- Modify: `scripts/generate.mjs` (`home()` main-Template)
- Modify: `scripts/components.mjs` (`echtProjekt()`)
- Modify: `assets/css/site.css` (`.hero-strip`, `.echt-grid`)
- Modify: `scripts/accept.mjs`

- [ ] **Step 1: Accept anpassen (Test zuerst)** — in `scripts/accept.mjs` die Home-Zeilen `cal`, `pills`, `kpanel` löschen und ergänzen:

```js
  check('home', 'echt-card>=2', classCount(h, 'echt-card') >= 2);   // 17.09.: Thuja + Gutzke-Abstellkammer
  check('home', 'hero-strip', classCount(h, 'hero-strip') >= 1);
  check('home', 'kein heckenarten', !has(h, 'id="heckenarten"'));
```
Run: `node scripts/accept.mjs` → Expected: FAIL `echt-card>=2`, `hero-strip`, `kein heckenarten`.

- [ ] **Step 2: Startseite: Kompass + Kalender raus** — im `main`-Template von `home()` diese zwei Zeilen löschen:

```js
<section class="sec"><div class="wrap">${schnittkalender()}</div></section>
${heckenKompass()}
```
(Beide bleiben auf `/heckenschnitt/` — `hub()` Zweig `gk === 'voll'` unverändert.) Galerie-Intro anpassen: `jedes Bild ist ein dokumentierter Schnitt aus dem Havelland` → `jedes Bild ist ein dokumentierter Auftrag aus dem Havelland`.

- [ ] **Step 3: echtProjekt → zwei Projekte** — in `scripts/components.mjs` `echtProjekt()` ersetzen:

```js
export function echtProjekt() {
  return `<div class="echt-grid">` +
    `<div class="echt-card rv"><div class="ebody">` +
    `<h3>Thuja-Rückschnitt, dokumentiert vom Einsatz.</h3>` +
    `<p>Mit dem Handy direkt vom Einsatz fotografiert. Kein Studio, kein Nachbearbeiten: Die Plane mit dem Schnittgut liegt noch im Bild. Genau so sieht der Foto-Nachweis aus, den Sie nach jedem Auftrag aufs Handy bekommen.</p></div>` +
    `<div>${baSlider({ vorher: `${ARB}/echt-heckenschnitt-vorher.jpg`, nachher: `${ARB}/echt-heckenschnitt-nachher.jpg`, alt: 'Thuja-Rückschnitt vom Einsatz', cap: 'Thuja-Rückschnitt', sub: 'vom Einsatz fotografiert', quer: true })}</div></div>` +
    `<div class="echt-card rv d1"><div class="ebody">` +
    `<h3>Gartenschuppen leer, Falkensee — an einem Tag.</h3>` +
    `<p>Abstellkammer unter der Treppe und Gartenschuppen ausgeräumt, zwei Fahrten zum Wertstoffhof Falkensee, Gebühren nach Beleg. Vorher/Nachher ging am selben Abend an die Kundin — mit Einwilligung hier zu sehen.</p>` +
    `<div class="echt-next"><a href="/entruempelung/">Entrümpelung rund ums Haus →</a></div></div>` +
    `<div>${baSlider({ vorher: '/assets/img/lp-gutzke-schuppen-vorher-768.jpg', nachher: '/assets/img/lp-gutzke-schuppen-nachher-768.jpg', w: 768, h: 1024, alt: 'Gartenschuppen in Falkensee vor und nach der Entrümpelung', cap: 'Gartenschuppen', sub: 'Falkensee, 1 Tag', vorTxt: 'vor der Räumung', nachTxt: 'nach der Räumung' })}</div></div>` +
    `</div>`;
}
```
`baSlider` kennt `slug` nur als VN-Pfad (`/assets/img/vn/<slug>_vorher.jpg`, Zeile 46–47) — für Manifest-Bilder daher explizit `vorher`/`nachher` (JPG-Fallbacks liegen vor: `assets/img/lp-gutzke-schuppen-{vorher,nachher}-768.jpg`, Hochformat 768×1024 → `quer` **nicht** setzen). Die Alt-Suffixe „nach dem Schnitt / vor dem Schnitt" sind hart codiert (Zeile 56–57) — Signatur um zwei optionale Parameter erweitern, Default unverändert (Bestand bleibt byte-identisch):

```js
export function baSlider({ slug = '', vorher = '', nachher = '', alt = '', cap = '', sub = '',
  quer = false, hint = false, lcp = false, w, h, vorTxt = 'vor dem Schnitt', nachTxt = 'nach dem Schnitt' } = {}) {
  …
    `<img src="${esc(nSrc)}" alt="${base} — ${esc(nachTxt)}" width="${W}" height="${H}" ${pr}>` +
    `<img class="ba-top" src="${esc(vSrc)}" alt="${base} — ${esc(vorTxt)}" width="${W}" height="${H}" ${pr}>` +
```
Nach der Änderung Snapshot-Diff der Hecken-Seiten muss leer bleiben (`diff /tmp/w1-base/heckenschnitt/index.html website/heckenschnitt/index.html`).

CSS ergänzen:
```css
.echt-grid{display:grid;grid-template-columns:1fr;gap:22px}
@media(min-width:900px){.echt-grid{grid-template-columns:1fr 1fr}.echt-grid .echt-card{grid-template-columns:1fr}}
```
(Vorher prüfen: `grep -n "^\.echt-card" assets/css/site.css` — die Karte ist ein 2-Spalten-Grid; in der 2er-Anordnung stapeln wir Text über Slider.)

- [ ] **Step 4: Hero-Strip mit drei echten Fotos** — in `home()` nach dem `.shot`-Div (innerhalb `.wrap.grid`, als drittes Grid-Kind über volle Breite) einfügen:

```js
<div class="hero-strip rv in d3" aria-label="Drei Bereiche, drei echte Aufträge"><a href="/entruempelung/"><img src="/assets/img/gbp/gartenschuppen-nachher.jpg" alt="Leerer Gartenschuppen nach der Entrümpelung in Falkensee" width="640" height="480" loading="lazy" decoding="async"><span>Entrümpelung</span></a><a href="/zaunbau/"><img src="/assets/img/arbeit/zaun-hinten-matte-noah.jpg" alt="Doppelstabmatte wird am Pfosten ausgerichtet" width="640" height="480" loading="lazy" decoding="async"><span>Zaunbau</span></a><a href="/fuer-hausverwaltungen/"><img src="/assets/img/arbeit/hecke-hinten-schere-noah.jpg" alt="Heckenschnitt mit der Schere im Havelland" width="640" height="480" loading="lazy" decoding="async"><span>Objektpflege</span></a></div>
```
Die rohen `<img>` oben sind nur das Ziel-Markup — die GBP-/Arbeits-JPGs sind 400–650 KB und dürfen nicht direkt ins Hero. Bestehende Pipeline nutzen (`scripts/convert-new.py`, Pillow ist im Repo bereits im Einsatz → keine neue Dependency): Quellen als PNG nach `_src4k/` legen, konvertieren, Manifest wird gemerged:

```bash
cd /c/Norex/havelland-website && python - <<'EOF'
from PIL import Image
for src, dst in [('assets/img/gbp/gartenschuppen-nachher.jpg','_src4k/strip-schuppen.png'),('assets/img/arbeit/zaun-hinten-matte-noah.jpg','_src4k/strip-zaun.png'),('assets/img/arbeit/hecke-hinten-schere-noah.jpg','_src4k/strip-hecke.png')]:
    im=Image.open(src).convert('RGB'); w,h=im.size; s=min(w,h*4//3); im=im.crop(((w-s)//2,0,(w-s)//2+s,s*3//4)); im.save(dst)   # 4:3-Crop, EXIF weg
EOF
python scripts/convert-new.py && python -c "import json;m=json.load(open('assets/img/manifest.json'));print([k for k in m if k.startswith('strip-')])"
```
Expected: `['strip-hecke', 'strip-schuppen', 'strip-zaun']`. Dann im Hero-Strip statt `<img …>` je `${pic('strip-schuppen', { alt: 'Leerer Gartenschuppen nach der Entrümpelung in Falkensee', sizes: '(max-width:760px) 30vw, 200px' })}` (analog `strip-zaun`, `strip-hecke`). Gate `LeeresSrcset` schlägt an, wenn ein Slug im Manifest fehlt.

CSS:
```css
.hero-strip{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:8px}
.hero-strip a{position:relative;display:block;border-radius:12px;overflow:hidden;aspect-ratio:4/3;background:var(--hair)}
.hero-strip img{width:100%;height:100%;object-fit:cover;display:block}
.hero-strip span{position:absolute;left:10px;bottom:8px;font-size:13px;font-weight:600;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.5)}
@media(max-width:760px){.hero-strip{gap:8px}.hero-strip span{font-size:12px}}
```

- [ ] **Step 5: Bauen, Accept, Sichtprüfung**

```bash
cd /c/Norex/havelland-website && node scripts/generate.mjs && node scripts/accept.mjs 2>&1 | grep -E "^.*home" && node scripts/gates.mjs | tail -3
```
Expected: alle `home`-Checks OK, Gates GRÜN. Sichtprüfung: `website/index.html` im Browser (Desktop + 390 px), Hero-Strip unter dem Slider, kein horizontaler Scroll, LCP bleibt der Thuja-Slider.

- [ ] **Step 6: Commit**

```bash
git add -A scripts assets/css assets/img && git commit -m "home: Hecken-Kompass + Schnittkalender raus, echtProjekt mit Gutzke-Schuppen, Hero-Strip (3 echte Fotos)"
```

---

### Task 4: Footer in Cluster-Struktur

**Files:**
- Modify: `scripts/generate.mjs` (`const footer`, Zeile ~267)

- [ ] **Step 1: Failing check**

```bash
cd /c/Norex/havelland-website && grep -c '<h4>GaLaBau &amp; Rodung</h4>' website/index.html
```
Expected: `0`.

- [ ] **Step 2: Footer-Spalten ersetzen** — den `<div class="fcols">…</div>`-Block durch vier Cluster-Spalten + Unternehmen:

```js
<div class="fcols"><div><h4><a href="/gartenpflege/">Garten &amp; Grundstück</a></h4><ul><li><a href="/gartenpflege/">Gartenpflege</a></li><li><a href="/gartenpflege/#herbst-paket">Herbst-Paket (Laub)</a></li><li><a href="/heckenschnitt/">Heckenschnitt</a></li><li><a href="/baumschnitt/">Baumschnitt</a></li><li><a href="/dachrinnenreinigung/">Dachrinnenreinigung</a></li><li><a href="/fensterreinigung/">Fensterreinigung</a></li><li><a href="/winterdienst/">Winterdienst</a></li><li><a href="/dachreinigung/">Dachreinigung</a></li><li><a href="/steinreinigung/">Steinreinigung</a></li></ul></div><div><h4><a href="/galabau/">GaLaBau &amp; Rodung</a></h4><ul><li><a href="/zaunbau/">Zaunbau</a></li><li><a href="/heckenentfernung/">Heckenentfernung</a></li><li><a href="/gartenrodung/">Gartenrodung</a></li><li><a href="/baumstumpf-entfernen/">Baumstumpf-Entfernung</a></li><li><a href="/galabau/">GaLaBau-Arbeiten</a></li></ul><h4 style="margin-top:22px"><a href="/entruempelung/">Entrümpelung &amp; Auflösung</a></h4><ul><li><a href="/entruempelung/">Entrümpelung</a></li><li><a href="/haushaltsaufloesung/">Haushaltsauflösung</a></li><li><a href="/grundreinigung/">Grundreinigung</a></li><li><a href="/ferienwohnung-reinigung/">Ferienwohnung-Reinigung</a></li></ul></div><div><h4><a href="/fuer-hausverwaltungen/">Hausverwaltungen &amp; Objekte</a></h4><ul><li><a href="/fuer-hausverwaltungen/">Für Hausverwaltungen</a></li><li><a href="/objektbetreuung/">Objektbetreuung</a></li><li><a href="/hausmeisterservice/">Hausmeisterservice</a></li><li><a href="/unterhaltsreinigung/">Unterhaltsreinigung</a></li><li><a href="/gebaeudereinigung/">Gebäudereinigung</a></li></ul><h4 style="margin-top:22px">Unternehmen</h4><ul><li><a href="/leistungen/">Alle Leistungen</a></li><li><a href="/standorte/">Standorte</a></li><li><a href="/ratgeber/">Ratgeber</a></li><li><a href="/ueber-uns/">Über uns</a></li><li><a href="/bewertungen/">Bewertungen</a></li><li><a href="/kontakt/">Kontakt</a></li></ul></div></div>
```
CSS prüfen: `grep -n "^\.fcols\|footer h4" assets/css/site.css` — `h4 a` ggf. `color:inherit;text-decoration:none` ergänzen.

- [ ] **Step 3: Bauen, prüfen, committen**

```bash
cd /c/Norex/havelland-website && node scripts/generate.mjs && grep -c '<h4><a href="/galabau/">GaLaBau' website/index.html && git add scripts/generate.mjs assets/css/site.css && git commit -m "footer: vier Cluster-Spalten mit Hub-Links"
```
Expected: `1`.

---

### Task 5: Hub `/entruempelung/` → Pillar

**Files:**
- Modify: `data/copy/hubs.json` (Eintrag `slug: "entruempelung"`)
- Create: `data/lokalfakten.json`
- Modify: `data/copy/ortsseiten.json` (`services.entruempelung.orte.<ort>.fakt`)
- Modify: `scripts/generate.mjs` (`hub()`: `faelle`, Orts-Fakt; `sanHub`, `sanOrtsSvc`)
- Modify: `scripts/components.mjs` (`faelleBlock`)
- Modify: `assets/css/site.css` (`.faelle`)
- Modify: `scripts/accept.mjs`

**Skills laden (Pflicht, im Chat nennen):** `seo-web-copy` → `stop-slop` → `llm-optimisation` → `copy-audit` (Gate). Vorab ein Agent `claude-seo:seo-sxo` (Sonnet) — Step 0.

- [ ] **Step 0: SERP-Backwards-Check (Agent `claude-seo:seo-sxo`, model sonnet)** — Auftrag: „Für `https://haus-und-gartenservice-havelland.de/entruempelung/` und die Queries `entrümpelung falkensee`, `entrümpelung havelland`, `keller entrümpeln` prüfen: Seitentyp-Match zur SERP (Local Pack + Ortsseiten + Portale), fehlende Intent-Blöcke, Persona-Sicht (Erbe 50+ am Desktop; Hausbesitzer mit voller Garage). Ergebnis: max. 8 konkrete Ergänzungen für die Pillar-Copy, keine Allgemeinplätze." Befunde in Step 2 einarbeiten; Report nach `docs/superpowers/plans/w1-sxo-entruempelung.md` (Repo-intern, nicht deployt).

- [ ] **Step 1: Lokalfakten recherchieren und belegen** — Datei `data/lokalfakten.json` anlegen. Quellen per WebFetch: Landkreis Havelland → Abfallentsorgung/Wertstoffhöfe (Suche „Wertstoffhof Falkensee Öffnungszeiten Gebühren site:havelland.de" bzw. Betreiber-Seite), Sperrmüll-Anmeldung Landkreis Havelland. Jeder Fakt mit `quelle` (URL) und `stand` (Datum). Eigene Belege: Gutzke 10.09. — zwei Wertstoffhof-Belege 115,84 € + 342,16 € = 458,00 € Entsorgung für Abstellkammer + Gartenschuppen (aus `kunde.md`/`belege/`).

```json
{
  "_meta": "Lokale Fakten für Hub-Ortskarten, Tier-1-Ortsseiten und W2-Ratgeber. Jeder Fakt mit Quelle + Stand. Keine Zahl ohne Beleg.",
  "wertstoffhof": {
    "falkensee": { "name": "Wertstoffhof Falkensee", "adresse": "", "oeffnungszeiten": "", "annahme": [], "gebuehren_hinweis": "", "quelle": "", "stand": "2026-09-17" }
  },
  "sperrmuell": {
    "landkreis_havelland": { "anmeldung": "", "abholungen_pro_jahr": "", "menge": "", "nicht_mitgenommen": [], "quelle": "", "stand": "2026-09-17" }
  },
  "eigene_belege": [
    { "datum": "2026-09-10", "ort": "Falkensee", "auftrag": "Abstellkammer + Gartenschuppen", "wertstoffhof": "Falkensee", "gebuehren_eur": 458.00, "fahrten": 2, "quelle": "kunden/hausgarten/_aktiv/gutzke-monika-2026-09-01/belege/" }
  ]
}
```
Leere Strings sind **nur** in diesem Schritt erlaubt und müssen vor Step 3 gefüllt sein (Gate: `python -c "import json;d=json.load(open('data/lokalfakten.json'));import sys;sys.exit(1 if '' in json.dumps(d) else 0)"` muss 0 liefern). Findet sich eine Zahl nicht belegbar (z. B. Gebühren je m³), Feld auf `"nicht veröffentlicht — Auskunft vor Ort"` setzen, nicht schätzen.

- [ ] **Step 2: Hub-Copy schreiben** — `data/copy/hubs.json`, Eintrag `entruempelung` ersetzen. Struktur und Pflichtinhalte (Prosa entsteht mit `seo-web-copy` + `llm-optimisation`; jede Zahl aus `lokalfakten.json`, Leistungsdefinition = Ads-LP):

```json
{
  "slug": "entruempelung",
  "title": "Entrümpelung Falkensee & Havelland: Keller, Garage, Wohnung",
  "meta": "Entrümpelung in Falkensee und im Havelland: Keller, Garage, Dachboden, Schuppen oder Wohnung. Festpreis für Räumung und Abtransport, Entsorgung nach Beleg.",
  "h1": "Entrümpelung rund ums Haus — in Falkensee und im Havelland",
  "h1_em": "rund ums Haus",
  "definition": "Eine Entrümpelung ist das Ausräumen und fachgerechte Entsorgen von Gegenständen aus Keller, Garage, Dachboden, Schuppen, Wohnung oder Haus durch einen Dienstleister, der besenrein übergibt. Im Unterschied zur Haushaltsauflösung bleibt das Zuhause bewohnt — es geht um Platz, nicht um Abschied.",
  "intro": "…(≤ 60 Wörter: WhatsApp-Foto → Besichtigung → Festpreis für Räumung + Abtransport → Foto-Nachweis; Havelland + Falkensee nennen)…",
  "sections": [
    { "h3": "Keller, Garage und Dachboden entrümpeln", "body": "…(120–160 W.: typische Fälle im Havelland-Siedlungshaus, Zugang/Etage, Wertanrechnung, Foto vorab)…" },
    { "h3": "Schuppen und Gartenhaus — ausräumen oder gleich abreißen", "body": "…(Brücke zu GaLaBau: Rückbau Holzschuppen, Hühnerstall, Metallzaun wie im Axe-Auftrag; Entsorgung Holz/Metall getrennt)…", "link_to": "gartenrodung", "link_text": "Gartenrodung" },
    { "h3": "Wohnung und Haus entrümpeln", "body": "…(Teilräumung vs. komplett; Diskretion; Übergabe besenrein)…", "link_to": "haushaltsaufloesung", "link_text": "Haushaltsauflösung im Erb- oder Pflegefall" },
    { "h3": "Sperrmüll, Wertstoffhof und Entsorgung nach Beleg", "body": "…(Landkreis-Sperrmüll-Regel aus lokalfakten.json; Wertstoffhof Falkensee Fakten; „Entsorgungsgebühren weisen wir nach Beleg aus" — Beispiel 458 € für Abstellkammer + Schuppen, zwei Fahrten)…" },
    { "h3": "Wertanrechnung und was wir nicht anbieten", "body": "…(Verwertbares wird angerechnet; nicht: Malern, Boden, strukturelle Schimmelsanierung → Partner; Geruch/Schimmel/Grundreinigung als eigene Position)…" }
  ],
  "naehe": "…(Falkensee, Dallgow-Döberitz, Brieselang, Schönwalde-Glien, Wustermark, Nauen, Berlin-Spandau — Anfahrt aus Falkensee ≤ 25 min)…",
  "ablauf": "…(1 Foto per WhatsApp → Rückmeldung in Stunden → kostenlose Besichtigung → schriftlicher Festpreis Räumung + Abtransport → Termin → Foto-Nachweis)…",
  "garantie_text": "Der Festpreis für Räumung und Abtransport aus der Besichtigung bleibt, egal wie lange es am Ende dauert. Entsorgungsgebühren weisen wir nach Beleg aus.",
  "blocks": [
    { "id": "nebengebaeude", "h2": "Nebengebäude zuerst: Warum Keller, Garage und Schuppen unsere häufigsten Aufträge sind", "body": "…(Havelland = Einfamilienhaus-Region, Nebengebäude sammeln Jahrzehnte; Zwei-Mann-Team, Anhänger; Beispiel Gutzke ohne Namen)…", "cta_after": true },
    { "id": "gartenhaus", "h2": "Gartenhaus abreißen und entsorgen", "body": "…(Axe: Holzschuppen + Hühnerstall + Metallzaun; Genehmigungsfrage kurz; Holz/Metall/Dachpappe getrennt)…", "link_to": "galabau", "link_text": "Kleinere GaLaBau-Arbeiten" },
    { "id": "gewerbe", "h2": "Gewerbe-Entrümpelung: Büro, Lager, Praxis", "body": "…(Termin außerhalb der Geschäftszeiten, Aktenvernichtung nur über Partner, Entsorgungsnachweis für die Buchhaltung)…" },
    { "h2": "Unterschied Entrümpelung und Haushaltsauflösung", "body": "…(bestehenden Block übernehmen, auf ≤ 120 W. kürzen, Link auf /haushaltsaufloesung/)…", "link_to": "haushaltsaufloesung", "link_text": "Zur Haushaltsauflösung" }
  ],
  "faelle": [
    { "h3": "Abstellkammer und Gartenschuppen, Falkensee", "meta": "September 2026 · 1 Tag · 2 Personen", "body": "Abstellkammer unter der Treppe und ein voller Gartenschuppen. Ausgeräumt, verladen, zwei Fahrten zum Wertstoffhof Falkensee — 458 € Gebühren nach Beleg, im Angebot getrennt vom Festpreis ausgewiesen. Vorher/Nachher ging am selben Abend an die Kundin.", "img": "lp-gutzke-schuppen" },
    { "h3": "Schuppen, Garage und Rückbau, Havelland", "meta": "Sommer 2026 · 3 Blöcke", "body": "Schuppen und Garage inklusive Demontage der Einbauten, Abtransport eines Holzhaufens, danach Abriss von Holzschuppen und Hühnerstall samt Metallzaun — als drei Positionen angeboten, Entsorgung nach Wertstoffhof-Beleg.", "img": "" }
  ],
  "faqs": [
    { "q": "Wie berechnet man eine Entrümpelung?", "a": "…(PAA-Frage 1: Volumen in m³, Zugang, Entsorgungsart; Festpreis nach Besichtigung; Entsorgung nach Beleg)…" },
    { "q": "Was ist der Unterschied zwischen Entrümpelung und Haushaltsauflösung?", "a": "…(PAA-Frage 2, ≤ 60 W.)…" },
    { "q": "Was kostet eine Haushaltsauflösung 70 qm?", "a": "…(PAA-Frage 3: keine Zahl ohne Besichtigung; was den Preis treibt; Link Haushaltsauflösung)…" },
    { "q": "Wie entsorgt man eine Haushaltsauflösung?", "a": "…(PAA-Frage 4: Wertstoffhof, Sperrmüll Landkreis, Verwertung; Beleg)…" },
    { "q": "Was kostet eine Entrümpelung im Havelland?", "a": "…(bestehend, aktualisiert)…" },
    { "q": "Übernehmen Sie auch den Sperrmüll und die Entsorgung?", "a": "…(bestehend)…" },
    { "q": "Rechnen Sie verwertbare Gegenstände an?", "a": "…(bestehend)…" },
    { "q": "Gehen Sie bei sensiblen Entrümpelungen diskret vor?", "a": "…(bestehend)…" },
    { "q": "Räumen Sie auch nur die Garage oder nur den Keller?", "a": "…(ja, Mindestauftrag: eine Anhängerladung; Beispiel)…" }
  ],
  "ortsseite_lead": "Ihre Entrümpelung in {ort}: Keller, Garage, Dachboden, Schuppen oder Wohnung — ausgeräumt und besenrein übergeben. Festpreis für Räumung und Abtransport nach kostenloser Besichtigung in {ort}, Entsorgung nach Beleg, Foto-Nachweis.",
  "skills_applied": ["seo-web-copy", "llm-optimisation", "copy-audit"]
}
```
`faelle[1].img` bleibt leer (Axe-Fotos nicht freigegeben) — Komponente rendert ohne Bild. Title 59 Z. (Hubs laufen durch `clampTitle` ≤ 60 — nie länger schreiben, sonst schneidet der Generator), Meta 155 Z. Wortziel Hub gesamt ≥ 2.000 sichtbare Wörter (Messung Step 7). Nach jeder JSON-Änderung: `node scripts/validate-data.mjs` (Pre-Build-Datengate, Exit 1 bei hartem Fehler). Keine „inklusive"-Formulierung, kein „Festpreis inklusive Entsorgung". Jede Zahl mit Herkunft im Text („nach Beleg", „Landkreis Havelland, Stand 09/2026").

- [ ] **Step 3: copy-audit als Gate** — Skill `copy-audit` auf die neue Copy (Title/Meta/H1/Sections/Blocks/FAQs) laufen lassen; Befunde mit Schwere ≥ „mittel" vor dem Build beheben. Ergebnis kurz im Chat.

- [ ] **Step 4: `faelleBlock`-Komponente** — in `scripts/components.mjs`:

```js
// ---------------------------------------------------------------------------
// faelleBlock — Fallbeispiele (echte Aufträge, anonymisiert) für Pillar-Hubs. .faelle > .fall (h3/meta/p + optional Slider).
// img = Manifest-Basis-Slug eines Vorher/Nachher-Paars ('lp-gutzke-schuppen' -> -vorher/-nachher) oder ''.
// ---------------------------------------------------------------------------
export function faelleBlock(faelle, { heading = 'So sah das zuletzt aus.' } = {}) {
  if (!Array.isArray(faelle) || !faelle.length) return '';
  return `<section class="sec section-alt" id="faelle"><div class="wrap"><div class="head"><h2 class="serif rv">${esc(heading)}</h2></div><p class="intro rv">Echte Aufträge aus dem Havelland, ohne Namen und Adresse — mit Einwilligung der Kunden. Genau so bekommen Sie Ihren Foto-Nachweis.</p><div class="faelle">` +
    faelle.map((f, i) => `<div class="fall rv d${i + 1}"><div class="fbody"><h3>${esc(f.h3)}</h3><p class="fmeta">${esc(f.meta || '')}</p><p>${esc(f.body)}</p></div>${f.img ? `<div>${baSlider({ vorher: `/assets/img/${f.img}-vorher-768.jpg`, nachher: `/assets/img/${f.img}-nachher-768.jpg`, w: 768, h: 1024, alt: f.h3 + ' — vorher und nachher', cap: f.h3.split(',')[0], sub: 'vorher / nachher', vorTxt: 'vor der Räumung', nachTxt: 'nach der Räumung' })}</div>` : ''}</div>`).join('') +
    `</div></div></section>`;
}
```
`f.img` ist der Manifest-Basis-Slug (`lp-gutzke-schuppen` → `-vorher-768.jpg` / `-nachher-768.jpg`, Hochformat 768×1024); `vorTxt`/`nachTxt` aus Task 3 Step 3.

CSS:
```css
.faelle{display:grid;grid-template-columns:1fr;gap:22px}
.fall{display:grid;grid-template-columns:1fr;gap:16px;background:#fff;border:1px solid var(--hair);border-radius:16px;padding:22px}
.fall h3{font-family:var(--font-display);font-weight:600;font-size:21px;color:var(--green-d);margin-bottom:4px}
.fall .fmeta{font-size:13px;color:var(--accent-d);letter-spacing:.04em;margin-bottom:8px}
@media(min-width:900px){.faelle{grid-template-columns:1fr 1fr}}
```

- [ ] **Step 5: Hub-Template verdrahten** — in `hub()`:
  - `sanHub`: `faelle` säubern — nach dem `faqs`-Teil ergänzen: `if (h.faelle) for (const f of h.faelle) { f.h3 = plain(f.h3); f.meta = plain(f.meta || ''); f.body = plain(f.body); }`
  - Nach `extraBlocks` definieren: `const faelleHtml = (c && c.faelle) ? faelleBlock(c.faelle) : '';` und im `main` direkt nach `${extraBlocks}` einfügen: `${faelleHtml}`.
  - Import `faelleBlock` aus `./components.mjs`.

- [ ] **Step 6: Orts-Fakt in den Hub-Karten** — `data/copy/ortsseiten.json` → `services.entruempelung.orte.<ort>` bekommt je ein Feld `fakt` (ein Satz, echt, aus `lokalfakten.json`/Ortswissen), z. B. Falkensee: `"fakt": "Wertstoffhof Falkensee vor Ort — Entsorgungsgebühren weisen wir nach Beleg aus."`, Brieselang: Anfahrt/Wertstoffhof-Zuständigkeit laut Landkreis, Dallgow/Schönwalde/Wustermark analog. Kein Ortsname-Tausch: fünf verschiedene Sätze.
  - `sanOrtsSvc`: `'fakt'` in die Liste `['hook', 'rahmen', 'trust']` aufnehmen.
  - In `hub()` vor `cardSub`: `const soHub = ortsSvcCopy[s.slug] || null;` und `cardSub` ersetzen:
  ```js
  const cardSub = o => { const f = soHub && soHub.orte && soHub.orte[o.slug] && soHub.orte[o.slug].fakt; return f ? esc(f) : (s.partner_modell ? `${esc(s.name)} in ${esc(o.name)} — koordiniert über einen Partner-Fachbetrieb.` : `${esc(s.name)} in ${esc(o.name)} — lokal, Festpreis, Foto-Nachweis.`); };
  ```

- [ ] **Step 7: Accept + Wortzahl-Gate**

`scripts/accept.mjs` ergänzen — Muster wie `page('heckenschnitt/index.html', 'HUB heckenschnitt', h => {…})` (Zeile ~57), direkt danach:
```js
// ---- SERVICE-HUB entruempelung (Pillar, 17.09.) ----
page('entruempelung/index.html', 'HUB entruempelung', h => {
  check('entruempelung', 'fall>=2', classCount(h, 'fall') >= 2);
  check('entruempelung', 'anker nebengebaeude/gartenhaus/gewerbe', has(h, 'id="nebengebaeude"') && has(h, 'id="gartenhaus"') && has(h, 'id="gewerbe"'));
  check('entruempelung', 'gstrip Beleg', has(h, 'Entsorgungsgebühren weisen wir nach Beleg aus'));
  check('entruempelung', 'kein inklusive Entsorgung', !hasI(h, 'inklusive Entsorgung') && !hasI(h, 'Entsorgung inklusive'));
  check('entruempelung', 'faq', classCount(h, 'faq') >= 1);
});
```
Wortzahl:
```bash
cd /c/Norex/havelland-website && node scripts/generate.mjs && node scripts/accept.mjs 2>&1 | grep -E "entruempelung|FAIL" ; python - <<'EOF'
import re,html
s=open('website/entruempelung/index.html',encoding='utf-8').read()
s=re.sub(r'<script.*?</script>|<style.*?</style>','',s,flags=re.S); s=html.unescape(re.sub(r'<[^>]+>',' ',s))
print('Wörter Hub Entrümpelung:',len(s.split()))
EOF
```
Expected: Accept OK, Wörter ≥ 2000. Darunter → Sections/Blocks nachschärfen (keine Füllsätze — Fakten aus lokalfakten.json).

- [ ] **Step 8: Commit**

```bash
git add data/copy/hubs.json data/copy/ortsseiten.json data/lokalfakten.json scripts assets/css && git commit -m "hub entruempelung: Pillar (rund ums Haus), Fallbeispiele, PAA-FAQs, Ortsfakten in Ortskarten; lokalfakten.json"
```

---

### Task 6: Hub `/haushaltsaufloesung/` — Prozess statt Leistungsliste

**Files:**
- Modify: `data/copy/hubs.json` (Eintrag `haushaltsaufloesung`)

**Skills:** `seo-web-copy` → `stop-slop` → `llm-optimisation` → `copy-audit` (Gate). Nach JSON-Änderung `node scripts/validate-data.mjs`.

- [ ] **Step 1: Failing check** — Near-Duplicate-Messung zwischen beiden Hubs (Ziel: Overlap sinkt, aktuell 16 % Jaccard-8):

```bash
cat > /tmp/w1-dup.py <<'EOF'
import re,html,sys
def t(p):
    s=open(p,encoding='utf-8').read(); s=re.sub(r'<script.*?</script>|<style.*?</style>','',s,flags=re.S)
    return html.unescape(re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',s))).lower()
def sh(x,k=8):
    w=x.split(); return set(' '.join(w[i:i+k]) for i in range(len(w)-k+1))
a,b=sh(t(sys.argv[1])),sh(t(sys.argv[2])); print(f"Jaccard-8: {len(a&b)/len(a|b):.0%}")
EOF
cd /c/Norex/havelland-website && python /tmp/w1-dup.py website/entruempelung/index.html website/haushaltsaufloesung/index.html
```
Expected jetzt: ~16 % (Basis). Ziel nach Umbau: ≤ 12 % (Header/Footer/Timeline sind gemeinsam; der Prosa-Anteil muss sich klar trennen).

- [ ] **Step 2: Copy umschreiben** — Struktur:

```json
{
  "slug": "haushaltsaufloesung",
  "title": "Haushaltsauflösung & Wohnungsauflösung Havelland — Erbfall",
  "meta": "Haushaltsauflösung im Havelland bei Erbfall, Pflegefall oder Umzug: Nachlass sichten, verwerten, besenrein übergeben. Festpreis nach kostenloser Besichtigung.",
  "h1": "Haushaltsauflösung im Havelland — Schritt für Schritt, wenn es schwerfällt",
  "h1_em": "Schritt für Schritt",
  "definition": "Eine Haushaltsauflösung ist die vollständige Räumung einer Wohnung oder eines Hauses nach Erbfall, Umzug ins Pflegeheim oder Wegzug — vom Sichten des Nachlasses über die Verwertung und Entsorgung bis zur besenreinen Übergabe an Vermieter oder Käufer.",
  "intro": "…(≤ 60 W.: Angehörige, Zeitdruck Kündigungsfrist, wir übernehmen Ablauf; Falkensee + Havelland)…",
  "sections": [
    { "h3": "Schritt 1 — Sichten: Dokumente, Erinnerungen, Wertgegenstände", "body": "…(vor dem ersten Karton; Kunde bestimmt, was bleibt; Fotos; nichts wird ohne Freigabe entsorgt)…" },
    { "h3": "Schritt 2 — Fristen: Kündigung, Übergabe, Nachlass", "body": "…(Kündigungsfrist Mietvertrag ggü. Vermieter, Übergabeprotokoll, Erbschein nicht unsere Aufgabe — Hinweis)…" },
    { "h3": "Schritt 3 — Verwerten, spenden, entsorgen", "body": "…(Anrechnung Verwertbares, Sozialkaufhaus/Spende auf Wunsch, Wertstoffhof/Sperrmüll nach Beleg)…" },
    { "h3": "Schritt 4 — Besenrein übergeben, mit Foto-Nachweis", "body": "…(Übergabe an Vermieter/Käufer; Grundreinigung als eigene Position, nie im Festpreis)…" }
  ],
  "naehe": "…(Orte; diskret; Anfahrt)…",
  "ablauf": "…(Anruf/WhatsApp → Besichtigung mit Angehörigen oder Schlüsselhalter → schriftlicher Festpreis Räumung + Abtransport → Termin → Foto-Nachweis + Übergabe)…",
  "garantie_text": "Ihre Wohnung ist zur vereinbarten Zeit leer und besenrein — schaffen wir das nicht, räumen wir am nächsten Werktag ohne Aufpreis nach. Entsorgungsgebühren weisen wir nach Beleg aus.",
  "blocks": [
    { "id": "erbfall", "h2": "Haushaltsauflösung im Erbfall: Was Angehörige wissen sollten", "body": "…(Erbengemeinschaft — Freigabe aller; Fristen; Nachlassgegenstände; wir dokumentieren, was rausgeht)…", "cta_after": true },
    { "id": "pflegefall", "h2": "Umzug ins Pflegeheim: Wohnung auflösen, ohne alles wegzuwerfen", "body": "…(Teilumzug ins Heim + Auflösung Rest; Koordination mit Angehörigen; Tempo)…" },
    { "h2": "Wohnungsauflösung im Havelland", "body": "…(bestehender Block, gekürzt)…" },
    { "h2": "Unterschied Entrümpelung und Haushaltsauflösung", "body": "…(≤ 80 W., anders formuliert als im Entrümpelungs-Hub; Link)…", "link_to": "entruempelung", "link_text": "Zur Entrümpelung rund ums Haus" }
  ],
  "faqs": [ …bestehende 7 FAQs, jede auf den Prozess zugespitzt; neu: „Muss ich bei der Auflösung dabei sein?", „Was passiert mit Möbeln, die noch gut sind?", „Wie lange dauert eine Haushaltsauflösung 70 qm?" ],
  "ortsseite_lead": "…(bestehend, „Räumung und Abtransport" + „nach Beleg" ergänzen)…",
  "skills_applied": ["seo-web-copy", "llm-optimisation", "copy-audit"]
}
```
Keine Rechtsberatung (Erbschein, Nachlassgericht nur als Hinweis „klären Sie mit …"), keine Zusagen zur Verwertung in €. Title 58 Z. (behält „Wohnungsauflösung", 3.600 Suchen national), Meta 158 Z.

- [ ] **Step 3: copy-audit Gate**, dann bauen + Duplikat-Messung:

```bash
cd /c/Norex/havelland-website && node scripts/generate.mjs && python /tmp/w1-dup.py website/entruempelung/index.html website/haushaltsaufloesung/index.html && node scripts/gates.mjs | tail -2
```
Expected: `Jaccard-8: ≤ 12 %`, Gates GRÜN.

- [ ] **Step 4: Commit**

```bash
git add data/copy/hubs.json && git commit -m "hub haushaltsaufloesung: Prozess-Hub (Sichten/Fristen/Verwerten/Übergabe), Erbfall + Pflegefall, Abgrenzung zu Entrümpelung"
```

---

### Task 7: Schema Service + OfferCatalog auf Hubs

**Files:**
- Modify: `scripts/generate.mjs` (`hub()`, Konstante `schema`)
- Modify: `scripts/gates.mjs` (Schema-Validität bleibt; kein FAQPage)

**Skill:** `seo-schema`.

- [ ] **Step 1: Failing check**

```bash
cd /c/Norex/havelland-website && grep -c '"@type":"OfferCatalog"' website/entruempelung/index.html
```
Expected: `0`.

- [ ] **Step 2: Schema erweitern** — in `hub()` die `schema`-Konstante ersetzen (nur für Hubs mit `c.sections`; `Offer` ohne Preis, `priceSpecification` bewusst weggelassen — Festpreis erst nach Besichtigung):

```js
  const offers = (c && Array.isArray(c.sections) ? c.sections : []).slice(0, 6).map(x => `{"@type":"Offer","itemOffered":{"@type":"Service","name":"${sj(x.h3)}","serviceType":"${sj(s.name)}","areaServed":${JSON.stringify(orteList.map(o=>o.name))}}}`).join(',');
  const catalog = offers ? `,"hasOfferCatalog":{"@type":"OfferCatalog","name":"${sj(s.name)} — Leistungen","itemListElement":[${offers}]}` : '';
  const schema = `${orgSchema()},{"@type":"Service","@id":"${DOMAIN}${url}#service","name":"${sj(s.name)}","serviceType":"${sj(s.name)}","image":"${imgAbs(svcHero(s.slug))}","${s.partner_modell ? 'broker' : 'provider'}":{"@id":"${DOMAIN}/#organization"},"areaServed":${JSON.stringify(orteList.map(o=>o.name))}${catalog}},${breadcrumb([{name:'Start',url:'/'},{name:s.name,url}])}`;
```

- [ ] **Step 2a: Site-Name-Signal** (Google zeigt den Site-Namen aus `WebSite`-Schema / `og:site_name`) — in `generate.mjs` neben `orgSchema()`:

```js
// WebSite-Schema nur auf der Startseite (Google Site-Name-Richtlinie): name + alternateName, kein SearchAction (keine Site-Suche).
function websiteSchema() { return `{"@type":"WebSite","@id":"${DOMAIN}/#website","url":"${DOMAIN}/","name":"${sj(nap.name)}","alternateName":"Haus- & Gartenservice Havelland","publisher":{"@id":"${DOMAIN}/#organization"},"inLanguage":"de-DE"}`; }
```
In `head()` nach `og:locale` ergänzen: `<meta property="og:site_name" content="${esc(nap.name)}">`. Dann in `home()` (Task-1-Zeile) `orgSchema()` durch `orgSchema() + ',' + websiteSchema()` ersetzen. Check: `grep -c '"@type":"WebSite"' website/index.html` → `1`, `grep -c 'og:site_name' website/gartenpflege/index.html` → `1`.

- [ ] **Step 3: Bauen + Gates (Schema-Validität) + Rich-Results-Test**

```bash
cd /c/Norex/havelland-website && node scripts/generate.mjs && node scripts/gates.mjs | tail -3 && grep -c '"@type":"OfferCatalog"' website/entruempelung/index.html website/gartenpflege/index.html
```
Expected: Gates GRÜN (JSON parsebar, absolute URLs), je `1`. Danach ein Hub extern validieren: `https://validator.schema.org/` mit dem JSON-LD aus `website/entruempelung/index.html` (per WebFetch nicht möglich → Maurice öffnet den Validator oder `node -e` JSON.parse als Mindestgate:
```bash
node -e "const h=require('fs').readFileSync('website/entruempelung/index.html','utf8');for(const m of h.matchAll(/<script type=\"application\/ld\+json\">(.*?)<\/script>/gs)){JSON.parse(m[1]);}console.log('JSON-LD ok')"
```

- [ ] **Step 4: Commit**

```bash
git add scripts/generate.mjs && git commit -m "schema: Service + hasOfferCatalog auf allen Hubs (Offer ohne Preis), WebSite-Schema + og:site_name, kein FAQPage"
```

---

### Task 8: FULL-Build, Gates, Accept, Snapshot-Diff, Link/Anker-Check, Deploy (nach Owner-OK)

**Files:** keine Änderung außer Build-Output.

**Skills (Pflicht-Gates laut Skill-Beschreibung):** `seo-technical` (Checkliste vor Deploy) · `page-audit` (**Launch-Gate, mandatory**) auf `/`, `/entruempelung/`, `/haushaltsaufloesung/` · `page-cro` (**mandatory before go-live**) auf `/` und `/entruempelung/`. Befunde ≥ „mittel" vor Deploy beheben, Rest als Liste in `status.md`.

- [ ] **Step 0: SEO-Drift-Vergleich (gewollte Änderungen sichtbar machen)** — Baseline sichern, neu ziehen, diffen:
```bash
cd /c/Norex/havelland-website && cp seo-drift-baseline.json /tmp/w1-drift-vorher.json && node scripts/seo-drift-baseline.mjs && python3 -c "
import json;a=json.load(open('/tmp/w1-drift-vorher.json'))['pages'];b=json.load(open('seo-drift-baseline.json'))['pages']
for u in a:
  for k in a[u]:
    if a[u].get(k)!=b.get(u,{}).get(k): print(u,k,'|',str(a[u].get(k))[:70],'->',str(b.get(u,{}).get(k))[:70])"
```
Expected: Änderungen nur bei `/`, `/entruempelung/`, `/haushaltsaufloesung/` (Title/Meta/H1) und site-weit nur bei Schema-Feldern (OfferCatalog). Jede andere Zeile = ungewollte Regression → vor Deploy klären. Die neue Baseline wird mit dem Merge committet (Step 7).

- [ ] **Step 1: FULL-Build + alle Gates**

```bash
cd /c/Norex/havelland-website && FULL=1 node scripts/generate.mjs && node scripts/gates.mjs && node scripts/accept.mjs && find website -name index.html | wc -l
```
Expected: Gates GRÜN, Accept ohne FAIL, Seitenzahl wie Baseline (keine neuen URLs in W1).

- [ ] **Step 2: Snapshot-Diff — nur erwartete Seiten geändert**

```bash
cd /c/Norex/havelland-website && diff -rq /tmp/w1-base website | grep -v "sitemap\|llms.txt" | sed 's#website/##' | sort | head -40; echo; diff -rq /tmp/w1-base website | grep -c differ
```
Expected: Alle Seiten unterscheiden sich (Footer site-weit) — das ist gewollt. Prüfen, dass **keine** Ortsseite außer über Footer/Schema verändert wurde: `diff /tmp/w1-base/heckenschnitt-falkensee/index.html website/heckenschnitt-falkensee/index.html | grep '^[<>]' | grep -v 'fcols\|OfferCatalog' | head` → leer.

- [ ] **Step 3: Anker + interne Links**

```bash
cd /c/Norex/havelland-website && for a in nebengebaeude gartenhaus gewerbe faelle; do grep -c "id=\"$a\"" website/entruempelung/index.html; done && grep -o 'href="/[^"#]*' website/index.html | sort -u | sed 's/href="//' | while read p; do [ -f "website$p/index.html" ] || [ -f "website$p" ] || echo "TOT: $p"; done
```
Expected: `1 1 1 1`, keine `TOT:`-Zeile.

- [ ] **Step 4: Near-Duplicate Ortsseiten unverändert (Gate ≤ 35 %)** — `node scripts/gates.mjs` deckt es ab; zusätzlich Hub-Paar: `python /tmp/w1-dup.py website/entruempelung/index.html website/entruempelung-falkensee/index.html` → Expected ≤ 20 %.

- [ ] **Step 5: Sichtprüfung Startseite + beide Hubs** — Browser, Desktop + 390 px: Hero-Strip, Cluster-Kacheln, Fallbeispiele (Slider funktioniert, Bilder laden), Footer 3 Spalten, kein horizontaler Scroll, Consent-Banner unverändert. Screenshot-Notiz im Chat.

- [ ] **Step 5a: Launch-Gates `page-audit` + `page-cro`** — Skills laden, auf die gebauten Seiten anwenden (`website/index.html`, `website/entruempelung/index.html`, `website/haushaltsaufloesung/index.html`; bei URL-Pflicht die Vercel-Preview des Branches). Ergebnis: Score + Befundliste; alles ≥ „mittel" jetzt fixen (Copy zurück ins T5/T6-Muster, Design nach `havelland-design`). Ohne diesen Nachweis kein Step 6.

- [ ] **Step 6: Owner-Freigabe einholen** — Diff-Zusammenfassung im Chat (Commits, geänderte Dateien, Sichtprüfung). **Kein Push ohne „go".**

- [ ] **Step 7: Merge + Push (nach „go")**

```bash
cd /c/Norex/havelland-website && git checkout master && git merge --no-ff w1-organisch -m "W1 organisch Entrümpelung: Startseite-Cluster, Entrümpelungs-Pillar, Haushaltsauflösung-Prozess, OfferCatalog" && git push origin master && git branch -d w1-organisch
```
Expected: Vercel-Deploy „Ready" (Vercel-Dashboard oder `curl -sI https://haus-und-gartenservice-havelland.de/ | grep -i age`). Live-Check:
```bash
for p in / /entruempelung/ /haushaltsaufloesung/; do curl -s "https://haus-und-gartenservice-havelland.de$p" | grep -oE '<title>[^<]*' | head -1; done; curl -s https://haus-und-gartenservice-havelland.de/entruempelung/ | grep -c OfferCatalog
```
Expected: neue Titles, `1`.

---

### Task 9: GBP — Leistungs-Items aufteilen, Beschreibung ergänzen

**Files:**
- Modify (Doku): `gbr-firma/02-Haus und Gartenservice Havelland/wissen/gbp/profil.md`, `content.md`, `posts-log.md`

Werkzeug: MCP `gbp` (`gbp_update_location` mit `updateMask=serviceItems` bzw. `profile.description`) — Location `locations/13372088234041114193`. **Vorher `gbp_get_location` ziehen und alle 25 bestehenden Items übernehmen** (PATCH auf `serviceItems` ersetzt die komplette Liste).

- [ ] **Step 1: Ist-Liste sichern**

`gbp_get_location(name="locations/13372088234041114193")` → `serviceItems` in `/tmp/gbp-serviceitems-vorher.json` speichern (aus dem Tool-Ergebnis kopieren). Ohne diese Sicherung nicht patchen.

- [ ] **Step 2: Neue Liste bauen** — das Item `Entrümpelung & Haushaltsauflösung` (freeFormServiceItem, Kategorie `gcid:house_clearance_service`) durch drei ersetzen; alle anderen 24 unverändert:

```json
[
  {"freeFormServiceItem":{"category":"categories/gcid:house_clearance_service","label":{"displayName":"Entrümpelung Keller, Garage, Dachboden, Schuppen","description":"Nebengebäude und Räume ausräumen, verladen, entsorgen. Festpreis für Räumung und Abtransport nach kostenloser Besichtigung, Entsorgungsgebühren nach Beleg, Foto-Nachweis aufs Handy. Falkensee und Havelland."}}},
  {"freeFormServiceItem":{"category":"categories/gcid:house_clearance_service","label":{"displayName":"Haushaltsauflösung (Erbfall, Pflegefall, Umzug)","description":"Wohnung oder Haus vollständig auflösen: Sichten mit Ihnen, Wertgegenstände sichern, verwerten, entsorgen, besenrein übergeben. Festpreis nach Besichtigung, diskret, mit Foto-Nachweis."}}},
  {"freeFormServiceItem":{"category":"categories/gcid:house_clearance_service","label":{"displayName":"Gartenhaus und Schuppen abreißen und entsorgen","description":"Holzschuppen, Gartenhaus, Hühnerstall oder Metallzaun zurückbauen und getrennt entsorgen — auf Wunsch mit anschließender Gartenrodung. Festpreis nach Besichtigung."}}}
]
```
Beschreibungen ≤ 300 Zeichen (GBP-Limit) — mit `python -c "print(len('…'))"` prüfen.

- [ ] **Step 3: Beschreibung (`profile.description`, ≤ 750 Z.)** — den Satz „Entrümpelung und Haushaltsauflösung erledigen wir diskret und besenrein, inklusive Abtransport und Entsorgung." ersetzen durch: „Entrümpelung rund ums Haus — Keller, Garage, Dachboden, Schuppen — und Haushaltsauflösung im Erb- oder Pflegefall: Festpreis für Räumung und Abtransport, Entsorgung nach Beleg, besenrein." Länge prüfen (≤ 750).

- [ ] **Step 4: PATCH ausführen** — `gbp_update_location(name, updateMask="serviceItems", location={serviceItems:[…27 Items…]})`, dann `updateMask="profile.description"`. Danach `gbp_get_location` → 27 Items, Beschreibung neu. Bei API-Fehler 400: Kategorie-Pfad prüfen (`categories/gcid:…`), nicht wiederholen ohne Ursache.

- [ ] **Step 5: Doku nachziehen** — `profil.md` §Services (27 Items, Datum), `content.md` (drei neue Item-Texte), `posts-log.md` §Profil-Änderungen (17.09./Datum). Commit im gbr-firma-Repo nur mit Owner-OK (Auto-Save nimmt es sonst mit).

---

### Task 10: Indexierungsanträge, Sitemap, Status-Doku

**Files:**
- Modify: `gbr-firma/websites/havelland/website/status.md` (Abschnitt „Letzte Änderungen")
- Modify: `gbr-firma/websites/havelland/website/organisch-entruempelung-plan.md` (§6 Status W1)

- [ ] **Step 1: Sitemaps neu einreichen** (nach Deploy, `lastmod` = Build-Datum): MCP `mcp-gsc` → `submit_sitemap(site_url="https://haus-und-gartenservice-havelland.de/", sitemap_url="https://haus-und-gartenservice-havelland.de/sitemap.xml")`. Expected: Erfolg, `get_sitemaps` zeigt neues `lastSubmitted`.

- [ ] **Step 2: Manuelle Indexierungsanträge (Maurice, GSC-UI, ~10 Min)** — Reihenfolge, je URL „URL-Prüfung → Indexierung beantragen":
  1. `https://haus-und-gartenservice-havelland.de/entruempelung/`
  2. `https://haus-und-gartenservice-havelland.de/haushaltsaufloesung/`
  3. `https://haus-und-gartenservice-havelland.de/`
  4. `https://haus-und-gartenservice-havelland.de/entruempelung-falkensee/`
  5. `https://haus-und-gartenservice-havelland.de/entruempelung-brieselang/`
  6. `https://haus-und-gartenservice-havelland.de/haushaltsaufloesung-falkensee/`
  7. `https://haus-und-gartenservice-havelland.de/galabau/`
  8. `https://haus-und-gartenservice-havelland.de/fuer-hausverwaltungen/`
  (4–6 sind noch die alten Tier-1-Seiten — der Antrag holt den Juli-`noindex`-Stand aus dem Index-Cache, W2 bringt die Tiefe.)

- [ ] **Step 3: Kontrolle nach 7 Tagen** — `batch_url_inspection` für 1–3: `last_crawled` ≥ Deploy-Datum, `/haushaltsaufloesung/` Status ≠ „Crawled – currently not indexed" (sonst W2-Copy nachschärfen, nicht pushen).

- [ ] **Step 3a: Bekannte Grenzen dokumentieren (nicht in W1 lösen)** — in `status.md` unter „Offen": (a) `lastmod` ist ein globales Build-Datum (`generate.mjs:990`) — alle 207 URLs melden bei jedem Build „geändert"; für W2 ein `lastmod` je Seite aus Content-Hash der Copy vorsehen, sonst verwässert das Änderungssignal, das der Index-Pilot braucht. (b) `/leistungen/` gruppiert in `uebersicht.json` nach garten/aufloesung/dach/gewerbe — GaLaBau fehlt als Kategorie, W3 mit dem GaLaBau-Pillar nachziehen.

- [ ] **Step 4: Status-Doku** — `status.md` Eintrag (Datum, Commit-Hash Merge, was live ist, Gates grün, Live-Check) und in `organisch-entruempelung-plan.md` §6 W1 → `live <Datum>, Merge <hash>`. Auto-Save committet; kein manueller Commit nötig.

---

## Self-Review (ausgeführt beim Schreiben)

- **Spec-Abdeckung W1:** Startseite Hero/Title/Kacheln/Hecken-Sektion raus/Footer → T1–T4 · Hub Entrümpelung Pillar (Fallbeispiele, PAA-FAQ, Ortsfakten, Anker für Cluster-Sublinks) → T5 · Haushaltsauflösung Prozess → T6 · Schema Service+OfferCatalog → T7 · Deploy-Gates → T8 · GBP Items + Beschreibung → T9 · Indexierungsanträge + Sitemap → T10. Nicht in W1 (Spec): Ortsseiten-Tiefe, Ratgeber, GaLaBau-Pillar, Hausverwaltungen-Seite (W2/W3).
- **Platzhalter:** Copy-Bodies in T5/T6 sind als `…(Pflichtinhalt)…` spezifiziert, weil die Prosa per Skill-Kette entsteht — das ist die Arbeitsanweisung, kein TBD. `lokalfakten.json` startet mit Leerfeldern und hat ein explizites Leerfeld-Gate vor Nutzung.
- **Konsistenz:** `clusterKacheln` (T2) ↔ Import in `home()` · `faelleBlock` (T5 Step 4) ↔ `faelleHtml` (Step 5) · Anker `nebengebaeude/gartenhaus/gewerbe` (T2 Sublinks) ↔ `blocks[].id` (T5 Step 2) ↔ Accept (T5 Step 7) ↔ Check (T8 Step 3) · `soHub`/`cardSub` (T5 Step 6) · Accept-Änderungen T2/T3/T5 ergänzen sich, keine Doppel-Checks.
- **Offen bewusst:** `baSlider`-Slug-Auflösung für Manifest-Bilder (T3/T5) muss beim Bau geprüft werden — beide Varianten sind angegeben.
