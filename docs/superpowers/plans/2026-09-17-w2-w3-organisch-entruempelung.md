# W2+W3 — Tier-1-Ortsseiten, lokale Ratgeber, GaLaBau-Pillar, Hausverwaltungen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wellen 2+3 aus `gbr-firma/websites/havelland/website/organisch-entruempelung-plan.md`: drei Tier-1-Ortsseiten mit echter Tiefe, vier lokale Ratgeber (Wertstoffhof/Sperrmüll, Keller-Garage-Dachboden, Gartenhaus), `/galabau/` als Cluster-Pillar, `/fuer-hausverwaltungen/` als Objektpflege-Angebot, ehrliches `lastmod` je Seite, `/leistungen/` mit GaLaBau-Kategorie, AEO-Mini-Audit.

**Architecture:** Wie W1 — Static-Generator (`scripts/generate.mjs`, `scripts/components.mjs`), Copy in `data/copy/*.json`, Fakten in `data/lokalfakten.json`. Neu: optionaler Tiefen-Block je Ortsseite (`ortsseiten.json` → `services.<svc>.orte.<ort>.tief`), `data/lastmod.json` (Content-Hash → Datum), Ratgeber-Einträge in `ratgeber.json`, B2B-Copy in `b2b.json`.

**Tech Stack:** Node ≥ 18 (ESM, zero-dependency), Python 3 für Prüfungen, Vercel. Gates: `scripts/validate-data.mjs`, `scripts/gates.mjs` (Near-Duplicate ≤ 35 % zwischen Ortsseiten!), `scripts/accept.mjs`.

**Repo:** `C:\Norex\havelland-website`. Branch **`w2-w3-organisch`** (setzt auf `w1-organisch` `850b6148` auf, solange der W1-Merge nach `master` aussteht — beim Merge geht W1+W2+W3 zusammen). Baseline für Diffs: `850b6148`.

**Harte Regeln (wie W1):** nur `FULL=1`-Builds · kein Push/Merge/amend/reset --hard · Auto-Save-Zwischenstände per `reset --soft` entflechten · 236 Seiten + **4 neue Ratgeber = 240** ab T3 · Leistungsdefinition = Ads-LP (Festpreis für Räumung und Abtransport nach Besichtigung; Entsorgung nach Beleg zzgl. MwSt.; Zusatzleistungen eigene Position; kein „inklusive"; Preise „inkl. MwSt."; keine erfundenen Zahlen — Quelle `data/lokalfakten.json`, Belege gbr-firma `kunden/`) · keine Kundennamen in Text/URLs · kein FAQPage-Schema · Skills werden per Skill-Tool **geladen**.

**Skills je Task:** T1/T7/T8 Code: keine Copy-Skills, `seo-technical` bei T7 · T2/T3/T4/T5/T6 Copy: `seo-web-copy` → `stop-slop` → `llm-optimisation` → `copy-audit` (Gate); T2 zusätzlich `programmatic-seo` (Ortsseiten-Regeln, Near-Duplicate), T5 zusätzlich `page-cro` · T8: Agent `claude-seo:seo-geo` (Sonnet) · T9: `page-audit`, `page-cro`, `seo-technical`, `playwright-cli`.

**Owner-Entscheide, die gelten:** Referenz Hausverwaltungen: genau der Satz „Wir betreuen bereits Objekte im Havelland in festen Pflegeverträgen." (Maurice 17.09., ohne Zusatz) · Fotos Gutzke freigegeben (Website + GBP) · Ansprechpartner Noah Telo mit Arbeitsfoto ok · Zitate nur aus `data/reviews.json` · Preisbeispiel 1.190 € + 458 € darf genannt werden.

---

## Datei-Landkarte

| Datei | Änderung |
|---|---|
| `scripts/generate.mjs` | `ortsseite()`: Tiefen-Block rendern; `sanOrtsSvc`: neue Felder; `sitemaps()`: `lastmod` je URL aus `data/lastmod.json`; `LEISTUNGEN_KATEGORIEN`: GaLaBau-Kategorie; `RAT_IMG`: 4 neue Ratgeber-Bilder |
| `scripts/components.mjs` | `tiefBlock(tief, s, o)` (Ortsseiten-Tiefe), `faelleBlock` wiederverwendet |
| `scripts/accept.mjs` | Checks Tier-1-Ortsseiten, 4 Ratgeber, GaLaBau, B2B |
| `assets/css/site.css` | `.ortsblock` (Faktenkasten) |
| `data/copy/ortsseiten.json` | `services.entruempelung.orte.{falkensee,brieselang}.tief`, `services.haushaltsaufloesung.orte.falkensee.tief` |
| `data/copy/ratgeber.json` | +4 Einträge |
| `data/copy/hubs.json` | `galabau` Pillar-Copy |
| `data/copy/uebersicht.json` | `kategorien.galabau` |
| `data/b2b.json` | Objektpflege-Copy |
| `data/lokalfakten.json` | + Wertstoffhof Nauen/Schwanebeck, Sperrmüll-Details, BbgBO-Fakt Gartenhaus (mit Quelle) |
| `data/lastmod.json` | **neu**, generiert |
| `gbr-firma/…/organisch-entruempelung-plan.md` §6, `status.md` | Status W2/W3 |

---

### Task 0: Branch + Baseline

- [ ] `cd /c/Norex/havelland-website && git checkout w1-organisch && git status --short | wc -l` → 0; `git checkout -b w2-w3-organisch` · `FULL=1 node scripts/generate.mjs && node scripts/gates.mjs | tail -1 && node scripts/accept.mjs | tail -1 && find website -name index.html | wc -l` → GRÜN/GRÜN/236 · `git rev-parse --short HEAD` notieren (Baseline).

---

### Task 1: Generator — Tiefen-Block für Tier-1-Ortsseiten

**Files:** `scripts/generate.mjs` (`ortsseite()`, `sanOrtsSvc`), `scripts/components.mjs` (`tiefBlock`), `assets/css/site.css`, `scripts/accept.mjs`

Datenmodell (`data/copy/ortsseiten.json` → `services.<svc>.orte.<ort>.tief`):
```json
"tief": {
  "h2": "Entrümpelung in Falkensee — Keller, Garage, Dachboden, Wohnung",
  "sections": [ { "h3": "…", "body": "…" } ],
  "ortsblock": { "h2": "Entsorgung in Falkensee: Wertstoffhof, Sperrmüll, Anfahrt", "items": [ { "k": "Wertstoffhof", "v": "…" }, { "k": "Sperrmüll", "v": "…" }, { "k": "Anfahrt", "v": "…" } ], "quelle": "Landkreis Havelland, Stand 09/2026" },
  "blocks": [ { "id": "…", "h2": "…", "body": "…", "link_to": "…", "link_text": "…" } ],
  "faelle": [ { "h3": "…", "meta": "…", "body": "…", "img": "fall-schuppen-falkensee", "zitat": "", "zitat_von": "" } ],
  "faqs": [ { "q": "…", "a": "…" } ]
}
```
- [ ] **Step 1 (Test zuerst):** `scripts/accept.mjs` neuer Block:
```js
// ---- TIER-1-ORTSSEITEN (W2) ----
for (const rel of ['entruempelung-falkensee/index.html', 'entruempelung-brieselang/index.html', 'haushaltsaufloesung-falkensee/index.html']) {
  page(rel, `TIER1 ${rel.split('/')[0]}`, h => {
    check(rel, 'tief', classCount(h, 'tief') >= 1);
    check(rel, 'ortsblock', classCount(h, 'ortsblock') >= 1);
    check(rel, 'kein inklusive Entsorgung', !hasI(h, 'inklusive Entsorgung') && !hasI(h, 'Entsorgung inklusive'));
    check(rel, 'kein Kundenname', !hasI(h, 'gutzke'));
  });
}
```
`node scripts/accept.mjs` → FAIL `tief` (erwartet).
- [ ] **Step 2 Komponente** (`components.mjs`, vor `// VN-Metadaten`):
```js
// tiefBlock — Tiefen-Inhalt für Tier-1-Ortsseiten (W2): eigene H2 + H3-Sektionen, Faktenkasten (.ortsblock), optionale Blocks mit Anker/Link,
// Fallbeispiele (faelleBlock) und bespoke FAQs (werden vom Aufrufer eingesetzt). Nur wenn ortsseiten.json → orte.<ort>.tief existiert.
export function tiefBlock(t, { linkHtml = () => '' } = {}) {
  if (!t) return '';
  const secs = (t.sections || []).map(x => `<h3>${esc(x.h3)}</h3><p>${esc(x.body)}${linkHtml(x)}</p>`).join('');
  const ob = t.ortsblock ? `<section class="sec section-alt"><div class="wrap"><div class="ortsblock rv"><h2>${esc(t.ortsblock.h2)}</h2><dl>${(t.ortsblock.items || []).map(i => `<div><dt>${esc(i.k)}</dt><dd>${esc(i.v)}</dd></div>`).join('')}</dl>${t.ortsblock.quelle ? `<p class="oq">Quelle: ${esc(t.ortsblock.quelle)}</p>` : ''}</div></div></section>` : '';
  const blocks = (t.blocks || []).map((b, i) => `<section class="sec${i % 2 ? ' section-alt' : ''}"${b.id ? ` id="${esc(b.id)}"` : ''}><div class="wrap"><div class="prose wide rv"><h2>${esc(b.h2)}</h2><p>${esc(b.body)}${linkHtml(b)}</p></div></div></section>`).join('');
  return `<section class="sec tief"><div class="wrap"><div class="prose wide rv"><h2>${esc(t.h2)}</h2>${secs}</div></div></section>${ob}${blocks}`;
}
```
- [ ] **Step 3 Generator:** in `ortsseite()`: `const tief = soOrt && soOrt.tief ? soOrt.tief : null;` · `sanOrtsSvc` normalisiert `tief.h2`, `sections[].h3/body`, `ortsblock.h2/items[].k/v/quelle`, `blocks[].h2/body/link_text`, `faelle[]`, `faqs[]` mit `plain()` · im `main` nach dem ersten `<section class="sec">…prose…</section>` einfügen: `${tief ? tiefBlock(tief, { linkHtml: copyLinksHtml }) : ''}${tief && tief.faelle ? faelleBlock(tief.faelle, { heading: 'So sah das zuletzt in ' + o.name + ' aus.' }) : ''}` · FAQs: wenn `tief.faqs` vorhanden → `faqs = tief.faqs` (ersetzt Archetyp+Hub-FAQ komplett) · Import `tiefBlock`.
  **Near-Duplicate-Gate (validiert 17.09.):** `gates.mjs:96–132` misst je Service-Familie **nur den ersten** `<div class="prose wide">`-Block + FAQ (3-Gramm-Shingles, FAIL ab 40 %). Der Tiefen-Block liegt in eigenen `.prose`-Containern danach und fließt nicht ins Gate ein — die bespoke `tief.faqs` dagegen schon (FAQ-Block wird gemessen): Tier-1-FAQs müssen sich deshalb untereinander und vom Archetyp-Pool klar unterscheiden.
- [ ] **Step 4 CSS:**
```css
.ortsblock{background:#fff;border:1px solid var(--hair);border-radius:var(--r-card);padding:24px}
.ortsblock h2{font-family:var(--font-display);font-size:clamp(22px,2.4vw,28px);margin-bottom:14px}
.ortsblock dl{display:grid;grid-template-columns:1fr;gap:10px 18px;margin:0}
.ortsblock dt{font-weight:700;color:var(--green-d)}.ortsblock dd{margin:0;color:var(--muted)}
.ortsblock .oq{font-size:13px;color:var(--muted);margin-top:12px}
@media(min-width:760px){.ortsblock dl{grid-template-columns:1fr 1fr}}
```
- [ ] **Step 5** Build (ohne `tief`-Daten byte-identisch: `git diff -w --stat -- website/ | tail -1` → nur `?v=`), Commit `ortsseiten: Tiefen-Block (tiefBlock/ortsblock/faelle/faqs) für Tier-1-Seiten`.

---

### Task 2: Tier-1-Copy — `/entruempelung-falkensee/`, `/entruempelung-brieselang/`, `/haushaltsaufloesung-falkensee/`

**Files:** `data/copy/ortsseiten.json`, `data/lokalfakten.json` (+Brieselang-Fakten: nächstgelegener Wertstoffhof, Anfahrtszeit aus Falkensee; Ortsteile beider Orte aus öffentlicher Quelle).
**Skills:** `programmatic-seo` (Near-Duplicate/Ortsseiten-Regeln) → `seo-web-copy` → `stop-slop` → `llm-optimisation` → `copy-audit`.

- [ ] **Step 1 Fakten:** `lokalfakten.json` ergänzen: `wertstoffhof.nauen_schwanebeck` (Adresse, Öffnungszeiten oder „Auskunft vor Ort", Quelle), `orte.falkensee` / `orte.brieselang` (`ortsteile`, `anfahrt_min_aus_falkensee`, `plz`, Quelle: Gemeinde-/Stadt-Website), Sperrmüll-Details unverändert. Kein Leerstring-Gate-Verstoß.
- [ ] **Step 2 Copy je Seite** (Ziel 1.500–2.000 sichtbare Wörter je Seite, paarweise Jaccard-8 ≤ 20 %; **kein** Ortsname-Austausch — jede Seite braucht andere Beispiele, andere Ortsteile, anderen Blickwinkel):
  - **entruempelung-falkensee:** `tief.h2` „Entrümpelung in Falkensee — Keller, Garage, Dachboden, Wohnung"; Sections: Siedlungshaus-Realität Falkensee (Nachkriegs-Siedlungen, Keller/Dachboden), Garage/Schuppen (Fall 1 als `faelle[0]` mit `img: "fall-schuppen-falkensee"`, Preis 1.190 € + 458 € wie im Hub, Ortsteil ohne Straße), Wohnung/Haus + Vollmacht; `ortsblock` Wertstoffhof Falkensee (Adresse, Zeiten, Gebühren-Hinweis), Sperrmüll-Regel, Anfahrt „aus Falkensee 0 km — wir sitzen hier"; Blocks: `#ortsteile` (Falkenhagen, Finkenkrug, Seegefeld, Waldheim — nur belegte Ortsteile), `#gewerbe-falkensee` kurz; FAQs 5 mit Ortsbezug (PAA-nah: „Was kostet eine Entrümpelung in Falkensee?" → Beispiel; „Wie schnell …?"; „Muss ich vor Ort sein?"; „Wohin kommt der Sperrmüll?"; „Auch nur Garage?").
  - **entruempelung-brieselang:** anderer Blickwinkel: Pendlerort, Neubau + Altbestand, Zeisigweg/Bahnhofsviertel nur, wenn belegbar; `ortsblock`: nächstgelegener Wertstoffhof (Falkensee Nauener Straße ~10 min oder Nauen/Schwanebeck — aus lokalfakten), Sperrmüll-Regel, Anfahrt aus Falkensee; **kein** Fallbeispiel (keine Brieselang-Aufträge belegt) → stattdessen Block „Was wir in Brieselang typischerweise vorfinden" (ehrlich allgemein); FAQs 5.
  - **haushaltsaufloesung-falkensee:** Prozess-Sicht wie Hub, aber lokal: Übergabe an Falkenseer Vermieter/Hausverwaltungen, Wertstoffhof vor Ort (Vorteil bei mehreren Fahrten), Vollmacht/Abwesenheit (Kundin aus dem Fall 1 wohnte nicht vor Ort — ohne Namen), Sozialkaufhaus/Spende (nur nennen, wenn ein konkretes belegbar ist, sonst allgemein); FAQs 5.
  - Verbotene Formulierungen wie W1. Jede Zahl aus `lokalfakten.json`.
- [ ] **Step 3** `copy-audit` je Seite, `node scripts/validate-data.mjs`, FULL-Build, Gates (Near-Dup!), Accept, Wortzahl je Seite, Jaccard paarweise (3 Paare) + gegen den Hub (≤ 20 %), Commit `ortsseiten tier-1: Falkensee ×2 + Brieselang mit Tiefe, Ortsblock, Fallbeispiel, FAQs`.

---

### Task 3: Ratgeber Wertstoffhof Falkensee + Sperrmüll Havelland

**Files:** `data/copy/ratgeber.json` (+2), `scripts/generate.mjs` (`RAT_IMG`: `'wertstoffhof-falkensee': 'svc-entruempelung-hero'`, `'sperrmuell-havelland-anmelden': 'svc-entruempelung-hero'` — kein passendes echtes Foto; **kein** KI-Bild neu generieren), `data/lokalfakten.json` (falls neue Fakten).
**Skills:** `seo-web-copy` → `stop-slop` → `llm-optimisation` → `copy-audit`.

- [ ] **Step 1 Struktur** (Felder wie bestehende Einträge: `slug, title, meta, lead, intro, sections[{h2, body_html}], faqs, cta_service:"entruempelung", cta_text`):
  - `wertstoffhof-falkensee`: Title „Wertstoffhof Falkensee: Öffnungszeiten, Gebühren, Annahme (2026)" (≤ 60), Sections: Adresse + Öffnungszeiten (Tabelle als `<table>` im `body_html`), Was wird angenommen / was nicht, Gebühren nach Abfallgebührensatzung 2026 (€/kg-Sätze aus `lokalfakten.json`, mit „Stand"), Kleinmengen vs. Wiegung, Praxistipps (Anhänger, Sortierung), „Zu viel für den Wertstoffhof? Wir holen ab." (CTA-Block im Text mit Link `/entruempelung/`), Beispiel aus eigenem Auftrag (458 € nach Beleg). FAQs: Öffnungszeiten Samstag? Kostenlos für Privathaushalte? Was kostet Altholz? Nimmt der Wertstoffhof Sperrmüll aus Haushaltsauflösungen? — jede Antwort answer-first, Quelle nennen.
  - `sperrmuell-havelland-anmelden`: Title „Sperrmüll im Havelland anmelden: Regeln, Fristen, was nicht mitkommt" (≤ 60); Sections: So melden Sie an (Online/Telefon/Karte — Kontakt aus lokalfakten), 2×/Jahr + bis 4 Wochen Wartezeit, Bereitstellung (bis 6 Uhr, was zählt als Sperrmüll), Ausschlussliste (inkl. größere Mengen aus Haushaltsauflösungen), Alternativen (Wertstoffhof, Abholung durch uns), Gemeinden Falkensee/Brieselang/Dallgow/Schönwalde/Wustermark — nur belegte Unterschiede, sonst „gilt kreisweit". FAQs 5.
  - Alle Zahlen mit Quelle + Stand; keine Rechtsberatung; keine Preisversprechen.
- [ ] **Step 2** Ratgeber-Sitemap: `written.ratgeberIdx` nimmt neue Einträge automatisch (cta_service `entruempelung` wave 1 ≤ aktive_welle 2). `RAT_IMG` ergänzen. `scripts/accept.mjs`: `page('ratgeber/wertstoffhof-falkensee/index.html', …)` mit `check(…, 'table', has(h,'<table'))`, `check(…, 'cta hub', has(h,'href="/entruempelung/"'))`; analog Sperrmüll.
- [ ] **Step 3** `copy-audit`, validate-data, FULL-Build → **238 Seiten**, Gates/Accept, Commit `ratgeber: Wertstoffhof Falkensee + Sperrmüll Havelland (lokaler Info-Cluster, 2.400 Suchen/Monat)`.

---

### Task 4: `/galabau/` Pillar

**Files:** `data/copy/hubs.json` (Eintrag `galabau`), ggf. `data/copy/uebersicht.json`.
**Skills:** `seo-web-copy` → `stop-slop` → `llm-optimisation` → `copy-audit`. Copy-Basis lesen: gbr-firma `websites/havelland/website/herbst-winter-2026-27-umsetzungsplan.md`, `zaunbau-konzept.md`, `hubs.json` Einträge `zaunbau`, `heckenentfernung`, `gartenrodung`, `baumstumpf-entfernen` (nicht duplizieren — verlinken).

- [ ] **Step 1 Copy:** Title ≤ 60 (rlen!), z. B. „GaLaBau Falkensee & Havelland: Zaun, Rodung, Pflaster" · Meta 150–158 · H1 „Kleinere GaLaBau-Arbeiten im Havelland — Zaun, Rodung, Stubben, Pflaster" · `sections_h2` „GaLaBau im Havelland — was wir bauen und wegmachen" · Sections (je 120–170 W., `offer:true` nur bei echten Leistungen): Zaunbau (link_to `zaunbau`), Heckenentfernung + Rodung (link_to `heckenentfernung`, link2_to `gartenrodung`), Stubben fräsen (link_to `baumstumpf-entfernen`), Pflaster/Kanten/Wegeplatten ausbessern, Beeteinfassungen/Hochbeete, „Erst freiräumen, dann bauen" (Brücke zu `/entruempelung/#gartenhaus`) · Blocks: `#reihenfolge` (Rodung → Zaun → Pflege: ein Ansprechpartner, ein Termin), `#saison` (Rodungsfenster 1.10.–28.2., Zaunbau ganzjährig außer Frost — nur belegte Aussagen), `#grenzen` (Ehrlich: keine Großprojekte, kein Tiefbau, Handwerksrecht) · `faelle`: nur wenn belegte GaLaBau-Aufträge mit Foto-Freigabe existieren (gbr-firma `kunden/` prüfen — Sahm: Flächenräumung + Zaunrückbau, Freigabe? Wenn nicht dokumentiert → kein Fall) · FAQs 8 (bestehende 5 aktualisiert + „Können Sie nach der Rodung direkt den Zaun setzen?" bleibt, + „Was kostet ein 20-m-Doppelstabmattenzaun?" nur mit der bereits im Zaunbau-Hub genannten Spanne) · Wortziel ≥ 1.800.
- [ ] **Step 2** `copy-audit`, Build, Gates, Accept (`page('galabau/index.html', …)` mit Anker-Checks), Jaccard vs `/zaunbau/` ≤ 15 %, Commit `hub galabau: Cluster-Pillar (Zaun, Rodung, Stubben, Pflaster), Brücken zu Sub-Hubs`.

---

### Task 5: `/fuer-hausverwaltungen/` — Objektpflege-Angebot

**Files:** `data/b2b.json`.
**Skills:** `seo-web-copy` → `stop-slop` → `page-cro` → `copy-audit`.

- [ ] **Step 0 Struktur lesen (validiert 17.09.):** `b2bPage()` (`generate.mjs:897–962`) rendert `title_tag, meta, kick, h1 (+h1_em), lead, intro{h2,body}, objektklassen_detail[{name,body}], leistungen_detail[{h3, ausfuehrung:'eigen'|'partner', chip, body, link_to, label}], band_lead, zusagen_detail[{h4,body}], gstrip, ablauf{h2,schritte[{when,h,p}]}, faqs[{q,a}], cta{h2,body,mail_subject,mail_body}, endband, scta_text`. Genau diese Felder befüllen — keine neuen erfinden; `link_to` als Slug (hrefOf). Der Referenz-Satz kommt in `intro.body` als erster Satz.
- [ ] **Step 1 Copy:** Heute ist die Seite Winterdienst-fixiert (Title „Winterdienst für WEG, Hausverwaltung und Gewerbe"). Neu: Title „Objektpflege für Hausverwaltungen & WEG im Havelland" (≤ 60), Meta 150–158, H1 „Objektpflege für Hausverwaltungen, WEG und Gewerbe im Havelland — ein Vertrag, ein Ansprechpartner", `lead` mit allen vier Bausteinen (Grünpflege + Laub eigene Ausführung · Winterdienst + Dachrinne über Partner-Fachbetrieb · Treppenhaus/Unterhaltsreinigung eigene Ausführung · Kleinreparaturen/Objektkontrolle), **Referenz-Satz exakt:** „Wir betreuen bereits Objekte im Havelland in festen Pflegeverträgen." (im `intro`), `leistungen`/`leistungen_detail` als Leistungspaket (je Baustein: Turnus, Nachweis, wer führt aus), `zusagen` bleiben (Noah Telo, schriftliches Angebot nach Begehung, Nachweis je Einsatz, Vertrag mit dem, der ausführt), `ablauf` (Anfrage → Begehung → Angebot je Objekt → Vertrag → Foto-Reporting), FAQs 6 (bestehende 5 + „Wie läuft die Abrechnung bei mehreren Objekten?"). Keine Preise. Partner-Framing bei Winterdienst/Dachrinne beibehalten (`partnermodell_hinweis`).
- [ ] **Step 2** `copy-audit` + `page-cro` (B2B-Conversion: CTA „Angebot für Ihr Objekt anfordern" bleibt), validate-data, Build, Gates, Accept (`page('fuer-hausverwaltungen/index.html', …)` mit `has(h,'Pflegeverträgen')`), Commit `b2b: Objektpflege-Angebot statt Winterdienst-Fixierung, Leistungspaket, Referenz-Satz (Owner 17.09.)`.

---

### Task 6: Ratgeber Keller/Garage/Dachboden + Gartenhaus abreißen

**Files:** `data/copy/ratgeber.json` (+2), `scripts/generate.mjs` (`RAT_IMG`: `'keller-garage-dachboden-entruempeln': 'fall-schuppen-falkensee-nachher'`? — Hochformat, ungeeignet für Media-Band → `svc-entruempelung-hero`; `'gartenhaus-abreissen-entsorgen': 'svc-gartenrodung-hero'`), `data/lokalfakten.json` (BbgBO-Fakt).
**Skills:** wie T3.

- [ ] **Step 1 Fakten:** Brandenburgische Bauordnung — verfahrensfreie Gebäude/Abbruch (§ 61 BbgBO, Größe in m³ Brutto-Rauminhalt) per WebFetch aus Primärquelle (bravors.brandenburg.de) mit Paragraf + Stand in `lokalfakten.json` → `recht.bbgbo_gartenhaus`; wenn nicht eindeutig belegbar → im Text nur „ob ein Abbruch anzeige- oder genehmigungsfrei ist, hängt von Größe und Lage ab — klären Sie das mit dem Bauamt" (keine Zahl).
- [ ] **Step 2 Copy:**
  - `keller-garage-dachboden-entruempeln`: Title „Keller, Garage oder Dachboden entrümpeln: Kosten & Ablauf" (≤ 60); Sections: Was kostet es (Preistreiber; echtes Beispiel 1.190 € + 458 € Falkensee, „Beispiel, kein Pauschalpreis"), Selbst machen vs. Firma (Wertstoffhof-Gebühren, Anhänger, Zeit — Zahlen aus Satzung), Ablauf in 5 Schritten, Was mit Wertsachen/Altholz/Elektro passiert, Sonderfälle (Öltank, Asbest → Fachbetrieb; nur Hinweis), FAQ 6 (inkl. PAA „Wie berechnet man eine Entrümpelung?" aus Hub-Sicht anders formuliert).
  - `gartenhaus-abreissen-entsorgen`: Title „Gartenhaus abreißen und entsorgen: Kosten, Ablauf, Regeln" (≤ 60); Sections: Genehmigung/Anzeige (BbgBO-Fakt oder Bauamt-Hinweis), Ablauf Rückbau (Fall 2 aus dem Hub ohne Preise), Entsorgung getrennt (Holz 0,36 €/kg, Teerpappe 0,70 €/kg mit Nachweis, Schrott 0,00 — aus Satzung), Kostenrahmen ehrlich („nach Besichtigung, Beispiel nur für Räumung: …"), Danach: Fläche nutzen (Brücke `/galabau/`, `/gartenrodung/`), FAQ 5.
- [ ] **Step 3** `RAT_IMG`, Accept-Checks, `copy-audit`, Build → **240 Seiten**, Gates/Accept, Commit `ratgeber: Keller/Garage/Dachboden + Gartenhaus abreißen (Nebengebäude-Nische)`.

---

### Task 7: `lastmod` je Seite aus Content-Hash

**Files:** `scripts/generate.mjs` (`sitemaps()`), `data/lastmod.json` (neu, committet).

- [ ] **Step 1 Test:** nach zwei Builds ohne Änderung muss `git diff --stat -- website/sitemap*.xml` leer sein (heute: jeder Build setzt alle `lastmod` auf heute).
- [ ] **Step 2 Implementierung** in `sitemaps()`:
```js
  // lastmod je URL aus Content-Hash (W2): nur wenn sich der sichtbare Inhalt geändert hat, bekommt die URL ein neues Datum.
  // Volatile Teile (Asset-Version ?v=, Sitemap-Datum) werden vor dem Hashen entfernt. Persistenz: data/lastmod.json (committen!).
  const LM_FILE = 'data/lastmod.json';
  const lm = fs.existsSync(LM_FILE) ? JSON.parse(fs.readFileSync(LM_FILE, 'utf8')) : {};
  const today = new Date().toISOString().slice(0, 10);
  const hashOf = u => { const p = `website${u}index.html`; if (!fs.existsSync(p)) return null; const h = fs.readFileSync(p, 'utf8').replace(/\?v=[a-f0-9]+/g, ''); return crypto.createHash('sha1').update(h).digest('hex'); };
  const lastmodOf = u => { const h = hashOf(u); if (!h) return today; const e = lm[u]; if (!e || e.hash !== h) lm[u] = { hash: h, date: today }; return lm[u].date; };
  const sm = (name, urls) => { const x = `…${urls.map(u=>`<url><loc>${DOMAIN}${u}</loc><lastmod>${lastmodOf(u)}</lastmod></url>`).join('\n')}…`; fs.writeFileSync(`website/${name}`, x); };
  … nach den drei sm()-Aufrufen: fs.writeFileSync(LM_FILE, JSON.stringify(lm, null, 0));
  … Sitemap-Index-lastmod = Maximum der enthaltenen Daten je Datei.
```
`crypto` ist bereits importiert (`generate.mjs:5` `import crypto from 'node:crypto'`) — nichts ergänzen. Erstlauf setzt alle URLs auf heute (ehrlich: W1/W2 haben Footer/Schema site-weit geändert). `gates.mjs` prüft Sitemaps nur auf `/lp/`-URLs — kein Konflikt.
- [ ] **Step 3** Zwei Builds hintereinander → zweiter Build ändert keine Sitemap; Änderung an einer Hub-Copy → nur diese URL bekommt neues Datum. Gates GRÜN. Commit `sitemaps: lastmod je URL aus Content-Hash (data/lastmod.json)`.

---

### Task 8: Kleine Posten — `/leistungen/` GaLaBau-Kategorie, AEO-Mini-Audit

- [ ] **`/leistungen/`:** `LEISTUNGEN_KATEGORIEN` in `generate.mjs`: neue Kategorie `{ key:'galabau', label:'GaLaBau & Rodung', slugs:['galabau','zaunbau','heckenentfernung','gartenrodung','baumstumpf-entfernen'] }` nach `garten`; diese 5 Slugs aus `garten` entfernen; `data/copy/uebersicht.json` → `leistungen.kategorien.galabau` Beschreibungstext (ein Satz, wie die anderen). Build, ItemList-Schema ohne Doppelung prüfen, Commit.
- [ ] **AEO-Mini-Audit (Agent `claude-seo:seo-geo`, Sonnet, read-only):** `/entruempelung/`, `/haushaltsaufloesung/`, `/ratgeber/wertstoffhof-falkensee/` gegen Zitierfähigkeit (Definitionen, Zahlen mit Quelle, Entitäten, llms.txt) prüfen → max. 6 konkrete Copy-Ergänzungen; Report `docs/superpowers/plans/w3-geo-audit.md`; Befunde ≤ 30 Min Aufwand direkt in `hubs.json`/`ratgeber.json` einarbeiten (Sonnet), Rest in `status.md` „offen".

---

### Task 9: Launch-Gates + Owner-Push (wie W1 T8)

- [ ] Drift-Diff (`seo-drift-baseline.mjs`) gegen Baseline aus Task 0; FULL-Build; Gates/Accept; **240 Seiten**; Snapshot: nur erwartete Seiten geändert (3 Tier-1, 4 Ratgeber, galabau, b2b, leistungen, Sitemaps, `?v=`); Anker/Links/Bilder; Kundenname-Check über `website/`; Jaccard Tier-1 paarweise + vs Hubs; Screenshots 1280/390 der 3 Tier-1-Seiten + galabau + b2b + 1 Ratgeber; `page-audit` (Tier-1 ×3, galabau, b2b, 2 Ratgeber), `page-cro` (b2b, entruempelung-falkensee), `seo-technical`; Fixes ≥ „mittel"; Commit; **GO/NO-GO-Bericht**. Push/Merge: Owner (Permission).
- [ ] Nach Deploy: `node scripts/indexnow-submit.mjs` (Bing/Yandex; `indexnow_key` in `data/config.json` vorhanden — validiert 17.09.), Sitemap in GSC neu einreichen, Indexierungsanträge (Owner): 3 Tier-1 + 4 Ratgeber + galabau + b2b; `status.md` + Plan §6 W2/W3 → live.

---

## Self-Review
- Spec-Abdeckung W2: Tier-1-Ortsseiten (T1+T2), Ratgeber Wertstoffhof/Sperrmüll (T3), lastmod (T7), Gutzke-Bewertungsbitte → **außerhalb dieses Plans** (Gmail-Entwurf macht der Controller direkt, Regel „Kunden-Mails nur als Entwurf"). W3: galabau (T4), Hausverwaltungen (T5), Ratgeber Nebengebäude (T6), AEO-Mini (T8), `/leistungen/` (T8).
- Placeholder: Copy-Bodies als Pflichtinhalt-Vorgaben (Skill-Kette), Fakten-Felder mit Leerstring-Gate; BbgBO-Fakt mit expliziter Fallback-Formulierung.
- Konsistenz: `tief`-Felder (T1) ↔ Copy (T2) ↔ Accept-Checks; `faelleBlock` aus W1 wiederverwendet; `sections_h2`/`offer` aus W1 im galabau-Eintrag; Seitenzahl 236 → 238 (T3) → 240 (T6).

## Validierung 17.09. (vor Fan-out, wie W1)
| Bereich | Befund | Konsequenz |
|---|---|---|
| Gates | NearDup misst nur ersten Prose-Block + FAQ (3-Gramm, FAIL ≥ 40 %) | T1/T2: bespoke FAQs müssen sich klar unterscheiden; Tiefen-Block ist gate-neutral |
| Gates | Meta 150–158, Title ≤ 60 (rlen mit `&amp;`), 1 H1, kein FAQPage, Broken-Link 0, `LeeresSrcset` | alle neuen Ratgeber/Hubs danach schreiben; `RAT_IMG` für 4 Ratgeber setzen |
| Skills | `programmatic-seo`, `seo-web-copy`, `stop-slop`, `llm-optimisation`, `copy-audit`, `page-cro`, `page-audit`, `seo-technical`, `playwright-cli` vorhanden; Agent `claude-seo:seo-geo` vorhanden | je Task benannt |
| Tools | `crypto` importiert; `indexnow_key` gesetzt; `mcp-gsc submit_sitemap` geprüft (W1) | T7/T9 |
| Design | Tokens `--r-card --hair --green-d --muted --font-display` vorhanden; `dl/dt/dd` ohne globale Regeln → `.ortsblock`-CSS selbstständig | T1 |
| Daten | `b2bPage()`-Felder exakt erfasst; `sanRat` erwartet `sections[].body_html` (HTML erlaubt, wird `fixHtml`); `written.ratgeberIdx` nimmt neue Ratgeber automatisch (cta_service wave 1 ≤ aktive_welle 2) | T3/T5/T6 |
| Verlinkung | Hub `/entruempelung/` zeigt Ratgeber-Sektion automatisch (max 3, `ratgeberByService`) — mit 8 Entrümpelungs-Ratgebern rutschen ältere raus: Reihenfolge = Reihenfolge in `ratgeber.json` → neue lokale Ratgeber **vor** die alten Kosten-Ratgeber setzen | T3/T6 |
| Ranking | Tier-1-Seiten bekommen keine neuen URLs; `haushaltsaufloesung-falkensee` ist indexiert (Pos. 11) — Title/H1 bleiben, nur Tiefe kommt dazu | T2 |
