# W3 — AEO/GEO-Mini-Audit: Entrümpelung/Haushaltsauflösung-Hubs + Wertstoffhof-Ratgeber

> Read-only Audit, Branch `w2-w3-organisch`, nicht deployt. Geprüft: `website/entruempelung/index.html`, `website/haushaltsaufloesung/index.html`, `website/ratgeber/wertstoffhof-falkensee/index.html`, `website/llms.txt`, `website/robots.txt`. Quelle für Fixes: `data/nap.json`, `data/copy/ratgeber.json`, `data/copy/hubs.json`, `scripts/generate.mjs` (Generator, kein Direct-Edit der HTML).

## Stand (Stärken)

- **robots.txt**: `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended` explizit erlaubt, `User-agent: *` → `Allow: /` deckt `OAI-SearchBot`/Bingbot zusätzlich ab. Sitemap verlinkt. Kein Blocker.
- **llms.txt**: valide Struktur (Titel, Kurzbeschreibung, Leistungen, Ratgeber, Kontakt), beide neuen Hubs + der Wertstoffhof-Ratgeber sind verlinkt.
- **FAQPage-Schema**: korrekt nirgends eingesetzt (Projekt-Regel eingehalten), FAQs laufen nur über `<details>`.
- **NAP-Konsistenz**: Name, Adresse, Telefon, Ansprechpartner (Noah Telo) sind Single-Source aus `data/nap.json` und über alle drei Seiten identisch — kein Drift.
- **Wertstoffhof-Ratgeber**: die "Kurze Antwort"-Box (Zeile 21) ist ein Lehrbuch-Beispiel für eine zitierfähige Passage — Adresse, Öffnungszeiten, Gebühren-Grundregel, explizites `Angaben laut Betreiber, Stand 17.09.2026`. Das ist der Absatz, den ein LLM auf „Wertstoffhof Falkensee Öffnungszeiten" ziehen würde — passt.
- **Unterschied Entrümpelung/Haushaltsauflösung**: auf beiden Hub-Seiten als eigener H2 + eigene FAQ-Frage (Frageform!) mit self-contained 3-Satz-Antwort — direkt zitierfähig.

## Lücken

1. **Kein `sameAs` auf der Organization** (alle 3 Seiten, `#organization`-Block, generiert in `scripts/generate.mjs:233 orgSchema()` aus `data/nap.json`) — keine Verankerung zu Google Business Profile/Social, schwächste, aber günstigste Entity-Signal-Lücke.
2. **Kein `Person`-Schema für Noah Telo** — er ist textlich Ansprechpartner (`entruempelung/index.html#ansprechpartner`, `haushaltsaufloesung/index.html` „So läuft es ab"), aber nirgends als Entität im `@graph` verankert.
3. **Article-Schema Wertstoffhof-Ratgeber ohne `about`/`mentions`** (`scripts/generate.mjs:596`) — Ort „Falkensee" und Betreiber „Abfallbehandlungsgesellschaft Havelland mbH" stehen nur im Fließtext, nicht als Entität im Schema.
4. **llms.txt Leistungen-Liste**: Entrümpelung/Haushaltsauflösung sind reine Links ohne Kurzbeschreibung — ein Crawler, der nur `llms.txt` liest, kann den Kern-Unterschied (bewohnt vs. komplett aufgelöst) nicht ohne Seitenaufruf erkennen.
5. **Query-Mismatch bei der Preis-FAQ**: `/entruempelung/` fragt „Was kostet eine Entrümpelung im Havelland?", die Zielfrage aus dem Suchvolumen ist aber „… in Falkensee". Falkensee steht nur im Fließtext, nicht in der Frage selbst.
6. **Inkonsistentes Stand-Tag**: der Sperrmüllabfuhr-Fakt („Sperrmüllabfuhr nimmt größere Mengen aus Haushaltsauflösungen nicht mit") trägt auf `/entruempelung/` ein `(Stand 09/2026)`, auf `/haushaltsaufloesung/` (Quelle: `data/copy/hubs.json`) fehlt das Tag bei identischer Aussage.

## Die 6 Copy-/Daten-Ergänzungen

1. **`data/nap.json`** — Feld `sameAs` (Array) ergänzen, z. B. Google Business Profile-Link der Falkensee-Adresse (+ ggf. Facebook/Instagram, falls vorhanden). In `orgSchema()` (`scripts/generate.mjs:233`) durchreichen. **Aufwand: ≤30 Min** (abhängig davon, ob GBP-URL sofort vorliegt).
2. **`data/nap.json` + `scripts/generate.mjs`** — minimalen `Person`-Eintrag im `@graph` ergänzen: `{"@type":"Person","name":"Noah Telo","worksFor":{"@id":".../#organization"}}`, referenziert vom Entrümpelung-Service (`provider`/`employee`). Name als „Noah Telo" (Rufname, wie im Fließtext), nicht die Impressum-Vollform. **Aufwand: ≤30 Min.**
3. **`scripts/generate.mjs:596`** (Article-Schema Ratgeber) — `about`/`mentions` ergänzen: `"about":{"@type":"Place","name":"Falkensee"},"mentions":{"@type":"Organization","name":"Abfallbehandlungsgesellschaft Havelland mbH"}`. **Aufwand: ≤30 Min.**
4. **`data/copy/hubs.json`** (Quelle der `llms.txt`-Leistungsliste, sofern generiert) bzw. direkt die `llms.txt`-Template-Zeilen — je einen Halbsatz ergänzen: „- [Entrümpelung](…): Keller, Garage, Dachboden, Schuppen — Zuhause bleibt bewohnt." / „- [Haushaltsauflösung](…): komplette Räumung bei Erbfall, Pflegefall, Umzug, inkl. Sichten von Dokumenten/Wertsachen." **Aufwand: ≤10 Min.**
5. **`data/copy/ratgeber.json`** bzw. Entrümpelung-FAQ-Quelle — FAQ-Frage „Was kostet eine Entrümpelung im Havelland?" zu „Was kostet eine Entrümpelung in Falkensee?" umformulieren (Havelland bleibt im Fließtext als Gebiet), damit die Passage 1:1 auf die Ziel-Query matcht. **Aufwand: ≤10 Min.**
6. **`data/copy/hubs.json`** (Haushaltsauflösung, Schritt 3) — `(Stand 09/2026)` an den Sperrmüllabfuhr-Satz anhängen, analog zur Entrümpelung-Seite, für konsistente Zitierfähigkeit derselben Tatsachenbehauptung. **Aufwand: ≤10 Min.**
