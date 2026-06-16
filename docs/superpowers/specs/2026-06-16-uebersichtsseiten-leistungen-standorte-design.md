# Design: Übersichtsseiten /leistungen/ & /standorte/ reicher machen

**Datum:** 2026-06-16
**Repo:** `C:\Norex\havelland-website` (branch `master`)
**Status:** abgenommen (Brainstorming), bereit zur Umsetzung

## Problem

`/leistungen/` und `/standorte/` nutzen die generische `listingPage()` in
`scripts/generate.mjs`: nur Phero (H1 + Lead) → flaches Karten-Grid → End-Band.
Kein Bild, keine Gruppierung, kein Fließtext, kein Trust/Prozess — wirkt unfertig,
im Gegensatz zu jeder anderen Seitenart (Home, Hub, Ortsseite, Orts-Hub, Ratgeber).

Ziel: beide Seiten inhaltlich + visuell reicher und conversion-/SEO-stärker machen.

## Constraints (harte Regeln — nicht verletzen)

- **Eingefrorenes Design** (`havelland-design`): #205840 Waldgrün, #E0A23B Akzent,
  Fraunces+Inter, „Nummern statt Icon-Slop", editorial. Nur **additives** CSS.
- **Keine erfundenen Inhalte**: keine Reviews/Sterne/Zahlen/Landmarks. Einleitender
  Fließtext + Gruppen-Intros sind erlaubt (Framing, faktengebunden aus den Daten).
- **KEIN FAQPage-JSON-LD**. Schema-Basis bleibt `HomeAndConstructionBusiness`.
- **Keine Malerarbeiten**. Renovierung wird neutral gerahmt (Kleinreparaturen,
  Boden/Laminat, De-/Montage, Vorarbeiten — existiert real in `hubs.json`).
- Deutsch, Umlaute korrekt. „Fertig" erst wenn das Verifikations-Gate grün ist.

## Scope

**In:** `/leistungen/` und `/standorte/`.
**Out:** Orts-Hubs `/standorte/{ort}/` (haben bereits Hook-Intro + Media-Band +
nummerierte Karten — nicht thin). Keine Änderung an anderen Seitenarten außer dem
kleinen `valueBand()`-Refactor (siehe unten).

## Ansatz

**C · Editorial Kategorie-/Region-Sektionen.** Beide Seiten bekommen dieselbe
angereicherte Anatomie und gruppieren ihre Karten in thematische bzw. geografische
Blöcke (mirror der Home-Teaser), mit Mini-Intros, Bild-Band, Prozess-Steps,
Wert-Band, FAQ und ItemList-Schema. Maximale Wiederverwendung vorhandener Daten,
Bilder und Komponenten.

## Design — /leistungen/

Anatomie (oben → unten):

1. Breadcrumb (`Start › Leistungen`).
2. **Phero**: Kick „Leistungen" + H1 „Unsere Leistungen" + **neuer Intro-Lead**
   (mit Link zu `/standorte/`) + CTA-Row (`ctaA` + WhatsApp).
3. **Media-Band** (`region-havelland`) via `pic()`.
4. **4 Themen-Blöcke**, abwechselnd `section-alt`-Hintergrund, je: Eyebrow
   (Nummer + Label) + H2 + **1-Satz-Intro** + `.cards`-Grid. Jede Karte =
   Service: `h3` Name, `p` aus `sektionen`/`garantie`, Link `/{slug}/`.
5. **Steps** (`stepsSektion(false)`), **Wert-Band** (`valueBand()`), **FAQ**
   (`faqBlock`, 4× Q/A, nur `<details>`), **End-Band** (`endBand`).

**Kategorie-Map** `LEISTUNGEN_KATEGORIEN` (Reihenfolge + Label im Code, Intro in JSON):

| key | Label | Service-Slugs |
|---|---|---|
| `garten` | Garten & Außenanlagen | gartenpflege, heckenschnitt, winterdienst |
| `reinigung` | Reinigung rund ums Haus | steinreinigung, fensterreinigung, dachrinnenreinigung, photovoltaikreinigung, ferienwohnung-reinigung |
| `aufloesung` | Entrümpelung, Auflösung & Umzug | entruempelung, haushaltsaufloesung, grundreinigung, umzugshilfe, renovierung |
| `gewerbe` | Hausmeister & Gewerbe | hausmeisterservice, gebaeudereinigung, unterhaltsreinigung, objektbetreuung |

Deckt alle 17 Services ab (3+5+5+4). Reihenfolge der Karten = Map-Reihenfolge.
Builder muss robust sein: jeder `services`-Slug, der in keiner Kategorie steht,
landet in einem Fallback-Block am Ende (Schutz gegen künftige neue Services).

## Design — /standorte/

Gleiche Anatomie, geografisch gruppiert:

1. Breadcrumb.
2. **Phero**: Kick „Standorte" + H1 + **neuer Intro-Lead** (Link zu `/leistungen/`) + CTA.
3. **Media-Band** (`region-havelland`).
4. Kurzer **Servicegebiet-Fließtext** (großteils aus dem vorhandenen Home-Text
   „Unser Servicegebiet").
5. **4 Region-Blöcke**, abwechselnd `section-alt`, je Eyebrow + H2 + 1-Satz-Intro +
   `.cards`-Grid. Karte = Ort: `h3` Name, `p` PLZ, Link `/standorte/{slug}/`.
6. **„Außerdem im Einsatz in …"**: eine Zeile mit den kleineren Orten/Ortsteilen
   ohne eigene Seite (aus `locations.json`, echte Orte) — mehr lokale Abdeckung.
7. **Steps**, **Wert-Band**, **FAQ** (4× Q/A), **End-Band**.

**Region-Map** `STANDORT_REGIONEN`:

| key | Label | Ort-Slugs |
|---|---|---|
| `west` | Falkensee & westliches Havelland | falkensee, dallgow-doeberitz, brieselang, schoenwalde-glien, wustermark, nauen, ketzin |
| `nord` | Oberhavel & nördliches Umland | oranienburg, hennigsdorf, velten, oberkraemer, kremmen, leegebruch, lehnitz, hohen-neuendorf, birkenwerder, glienicke-nordbahn |
| `berlinrand` | Berliner Westrand & Havelufer | berlin-kladow, berlin-gatow, gross-glienicke, berlin-spandau |
| `seen` | Havelseen & Ferienlagen | werder-havel, schwielowsee |

Builder rendert je Region nur die Slugs, die tatsächlich Money-Page-Orte sind
(`servicesForOrt(o).length >= 3`) — Schnittmenge mit der bestehenden Filterung.
Money-Page-Orte, die in keiner Region stehen, landen in einem Fallback-Block.
„Außerdem im Einsatz" = alle bedienten Orte (`locations.json`) minus Money-Page-Karten.

## Geteilte Bausteine

### Generator (`scripts/generate.mjs`)
- Die zwei `listingPage(...)`-Aufrufe in `basis()` ersetzen durch `leistungenPage()`
  + `standortePage()`. `listingPage()` kann bleiben (für Ratgeber-Index etc. unverändert).
- Wert-Band aus `home()` (Zeilen ~203–204) in Helper `valueBand()` extrahieren;
  `home()` ruft denselben Helper auf (keine sichtbare Änderung der Home).
- Wiederverwendet: `stepsSektion()`, `faqBlock()`, `pic()`, `endBand`, `ctaA`,
  `clampTitle()`, `mkMeta()`, `breadcrumb()`, `orgSchema()`.

### Copy (`data/copy/uebersicht.json`, neu)
Faktenbasiert, in der Marken-Stimme, keine erfundenen Fakten. Form:

```json
{
  "_meta": "Copy für die Übersichtsseiten /leistungen/ + /standorte/.",
  "leistungen": {
    "lead": "…",
    "kategorien": { "garten": "…", "reinigung": "…", "aufloesung": "…", "gewerbe": "…" },
    "faqs": [ { "q": "…", "a": "…" } ]
  },
  "standorte": {
    "lead": "…",
    "servicegebiet": "…",
    "regionen": { "west": "…", "nord": "…", "berlinrand": "…", "seen": "…" },
    "ausserdem_label": "Außerdem im Einsatz in",
    "faqs": [ { "q": "…", "a": "…" } ]
  }
}
```
Je Seite 4 FAQ-Q&A. Generator fällt bei fehlendem Schlüssel auf sichere Defaults zurück.

### Schema
Je Seite zusätzlich zu `orgSchema` + `breadcrumb`:
- `CollectionPage` (`@id … #page`, `about` → Organization).
- `ItemList` mit `ListItem` (position, name, url) für die Services bzw. Orte.

**Kein** FAQPage. Bestehender `head()`/`schema`-Mechanismus wird genutzt.

### CSS (`assets/css/site.css`, additiv, ≤10 Zeilen)
Eine `.cat`-Eyebrow für die Block-Nummer + Label, im Stil vorhandener Tokens
(Fraunces-italic-Nummer in `--accent-d`, Label als `.kick`). Keine Änderung an
eingefrorenen Regeln. (Quelle bleibt SSOT `havelland-design`; Ergänzung gespiegelt.)

## Done-Kriterium (Verifikations-Gate)
- `FULL=1 node scripts/generate.mjs` baut fehlerfrei (Gesamt-Seitenzahl unverändert —
  es werden zwei bestehende Seiten umgebaut, keine hinzugefügt).
- `node scripts/gates.mjs` und `node scripts/validate-data.mjs` grün.
- `/leistungen/` und `/standorte/` enthalten: Media-Band, gruppierte Karten mit
  Block-Intros, Servicegebiet-/Intro-Fließtext, Steps, Wert-Band, FAQ, ItemList.
- Title ≤60 / Meta 150–158 (durch `clampTitle`/`mkMeta` automatisch).
- Keine erfundenen Fakten; eingefrorenes Design unverändert (nur additives CSS).

## Offene Punkte
Keine. (Renovierung bleibt drin — realer Nicht-Maler-Inhalt vorhanden.)
