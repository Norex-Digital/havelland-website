---
stand: 2026-09-17
zweck: SERP-Backwards-Analyse (Step 0, W1 Task 5) für Hub /entruempelung/ — Vorlage für hubs.json-Copy (Task 5 Step 2).
queries: "entrümpelung falkensee" (SERP-Snapshot vorhanden) · "entrümpelung havelland" · "keller entrümpeln" (nur Volumen/Nische, kein SERP-Snapshot)
methode: read-only — bekannte GSC/DataForSEO-Datenlage aus organisch-entruempelung-plan.md + WebFetch (Sparschwein-Startseite, Beräumfix, Hauptstadt-Entsorger, eigener Hub-Live-Stand). Keine neuen SERP-Abfragen.
---

# SXO-Backwards-Check: /entruempelung/

## 1. Seitentyp-Match

SERP "entrümpelung falkensee" = 3er Local Pack (HavelClean, Sparschwein Brieselang, Wohnungsauflösung Engel) + PAA (4 Fragen) + organisch **Firmen-Ortsseiten** (Beräumfix, Hauptstadt-Entsorger, Klarweg24, Rudi Rümpel) + Portale (Kleinanzeigen, MyHammer, blauarbeit). Gewinner-Typ: **lokale Firmenseite mit Ortsbezug**, nicht Ratgeber/Portal. Sparschwein gewinnt sogar mit der **Startseite** (Havelland+Falkensee kombiniert, Preisanker im Title) — exakt das Muster, das bei uns aktuell umgekehrt schadet (Startseite rankt statt Hub, aber ohne Entrümpelungs-Signal im Title).

Unser Hub-Typ (regionaler Pillar, mehrere Orte + Unterthemen) ist als Kategorie richtig, aber **dünner** als die Gewinner: 1.544 Wörter vs. Beräumfix/Hauptstadt-Entsorger 2.500–3.200 Wörter (WebFetch-Schätzung, Größenordnung bestätigt). Fehlende Elemente ggü. den Gewinnern: Preisanker/-spanne (Sparschwein: "ab 99 €" im Title + Preisstufe "1 m³ = 99 €"), benannter lokaler Ansprechpartner mit Foto (Beräumfix), Einzel-Kundenzitate statt nur Aggregat-Stern (alle drei Konkurrenten), eigene Vollmacht-Sektion für Erbfälle (Beräumfix). Vorhanden bei uns bereits (Gegenprobe WebFetch, deckt sich mit „5,0★/19 Bewertungen", 3-Schritte-Foto-Weg, 4-Schritte-Ablauf, FAQ, Ortsnamen): Grundstruktur ist richtig, Tiefe fehlt.

## 2. Intent-Lücken (Top-3-Firmenseiten vs. unser Hub)

| Block bei Konkurrenz | Wer | Bei uns? |
|---|---|---|
| Vollmacht zur Wohnungsübergabe (Erbe muss nicht vor Ort sein) | Beräumfix | fehlt komplett |
| Namentlicher Ansprechpartner + Foto | Beräumfix ("Sebastian Dunger") | fehlt, nur "wir" |
| Preisstufen-Anker ("1 m³ = 99 €") | Sparschwein | fehlt (Policy: kein Festpreis ohne Besichtigung — aber Belegzahl statt Fantasiepreis möglich) |
| Einzel-Kundenzitate mit Ort/Datum | Sparschwein (4), Beräumfix (8) | nur Aggregat 5,0★/19, kein Zitat |
| Eigene Übergabegarantie als benannter Block | Beräumfix | Garantietext vorhanden, aber nicht als eigener H2/H3 |
| "Fotos schicken, Festpreis ganz ohne Termin" | Hauptstadt-Entsorger | wir verlangen immer Besichtigung (Policy) — Lücke zur Erwartungshaltung "schnell" |
| Exact-Match-Abschnitte "Keller/Garage/Dachboden" statt Sammel-H2 | keiner der drei — **Whitespace** | fehlt, aktuell Sammel-H2 "was dazugehört" |

## 3. Persona-Sicht

**(a) Erbin/Erbe 50+, Desktop, Zeitdruck (Kündigungsfrist Vermieter).** Muss in 10 Sekunden sehen: dass sie nicht selbst anreisen muss (Vollmacht), eine Reaktionszeit-Zahl (Stunden, nicht "irgendwann"), Festpreis-Versprechen + Beleg-Transparenz bei Entsorgung, und einen sofort klickbaren Kontaktweg. Aktuell fehlt das Vollmacht-Signal ganz — größtes Risiko, dass sie zu Beräumfix abwandert, weil die das explizit lösen.

**(b) Hausbesitzer, volle Garage/Schuppen, mobil.** Braucht: Foto-Ablauf ganz oben (haben wir), echte Vorher/Nachher-Fotos aus Nebengebäuden (nicht nur Wohnungs-/Kellerbilder), eine Preisorientierung ohne Fantasiezahl (unser 458-€-Beleg wirkt hier stärker als "Festpreis nach Besichtigung" allein) und die Sicherheit, dass Strukturarbeiten (Schimmel, Malern) klar ausgeschlossen sind, damit keine Überraschung entsteht.

## 4. Warum rankt die Startseite statt des Hubs

Kombination aus vier Signalen: **Content-Tiefe** (Hub 1.544 W. vs. Gewinner 2.000–3.200 W.); **fehlende Exact-Match-Substruktur** (Sammel-H2 "was dazugehört" statt "Keller entrümpeln"/"Garage entrümpeln" als eigene Überschriften — Google matched das breiter formulierte Domain-Signal der Startseite statt der ungenauen Hub-Struktur); **Crawl-Frequenz** (Hub alle 3–4 Wochen vs. Startseite ~10 Tage, verstärkt den Rückstand); **Internal-Linking** (Startseite ist die am stärksten verlinkte Seite im Footer/Nav, der Hub bislang nicht gleichwertig eingebunden — wird mit den 4 Cluster-Kacheln in Task 2 behoben, ist aber noch nicht live).

## 8 konkrete Ergänzungen für die Pillar-Copy (hubs.json, Slug `entruempelung`)

1. **Vollmacht-Satz im Block "Wohnung und Haus entrümpeln"** (sections[2]) + neue FAQ: "Muss ich bei der Haushaltsauflösung persönlich vor Ort sein?" → Antwort: kurze Vollmacht reicht für Besichtigung/Übergabe. Beleg: Beräumfix hat eigenen H2 "Vollmacht zur Wohnungsübergabe" — deckt die Erben-Persona (Zeitdruck, oft nicht vor Ort) ab, bei uns 0 Erwähnung.
2. **Reaktionszeit-Zahl im `ablauf`-Feld/Intro**: "Rückmeldung auf Ihr Foto innerhalb von Stunden" konkret vorziehen (nicht erst im Ablauf-Absatz vergraben, sondern in den ersten 60 Wörtern des `intro`). Beleg: Beräumfix wirbt mit "100 % Termintreue"/"kurzfristige Auftragsannahme", Hauptstadt-Entsorger mit "Festpreis ganz ohne Termin" — beide schneller kommuniziert als wir.
3. **Exact-Match-Unterüberschriften** statt Sammel-H2: in Block `nebengebaeude` je eine eigene h4-Zeile "Keller entrümpeln", "Garage entrümpeln", "Dachboden entrümpeln", "Gartenhaus/Schuppen entrümpeln" (aktuell nur ein Fließtext-Block). Beleg: Google-Ads-Volumen "keller entrümpeln" 480/Monat + "… kosten" 590 als eigene Suchintention; keiner der drei Konkurrenten besetzt das mit eigener Überschrift — Whitespace.
4. **Belegzahl in den Fließtext ziehen**, nicht nur in `faelle[0]`: im Block "Sperrmüll, Wertstoffhof und Entsorgung nach Beleg" den Satz "Bei einer Abstellkammer und einem Gartenschuppen lagen unsere Entsorgungsgebühren zuletzt bei 458 € (zwei Fahrten zum Wertstoffhof Falkensee)" direkt im Fließtext platzieren. Beleg: Sparschwein gewinnt Aufmerksamkeit über den Preisanker "ab 99 €" im Title — wir dürfen laut Preis-Policy keine Pauschale versprechen, aber ein belegter Realwert schlägt "keine Zahl".
5. **Benannter Ansprechpartner mit Foto**: neuer Satz/Mini-Block "Ihr Ansprechpartner im Havelland: Noah Telo — meldet sich persönlich auf Ihr Foto zurück" (Foto nur falls Freigabe vorliegt, sonst nur Name+Satz). Beleg: Beräumfix hat H2 "Ihr Kundenberater für Falkensee" mit Foto+Name — Vertrauenssignal, das unser Hub (nur "wir") nicht hat.
6. **Einzel-Kundenzitat statt nur Aggregat-Stern**: in `faelle[0]` ein wörtliches Zitat der Kundin ergänzen (mit Einwilligung, Ort+Monat, z. B. "Gutzke, Falkensee, September 2026: '…'"), zusätzlich zur bestehenden 5,0★/19-Bewertungsanzeige. Beleg: Sparschwein (4 Zitate mit Google-Profil-Link) und Beräumfix (8 Zitate) zeigen beide Einzelstimmen — glaubwürdiger für die skeptische Erben-Persona als eine reine Zahl.
7. **Garantie als eigener benannter Block**: bestehenden `garantie_text` aus dem Fließtext lösen und als eigene h3 "Unsere Übergabe-Garantie" mit fettem Kernsatz formatieren. Beleg: Beräumfix hat eigenen H2 "Übergabegarantie auf alle Leistungen" — eigener Block ist scanbarer für die zeitkritische Erben-Persona als Fließtext.
8. **Vorläufige Preisspanne bei kleinen Nebengebäude-Mengen** im "Der schnellste Weg"-Block ergänzen: "Bei kleineren Mengen — z. B. einzelner Keller oder Garage — nennen wir anhand Ihrer Fotos oft schon eine erste Preisspanne, der Festpreis folgt nach der Besichtigung." Beleg: Hauptstadt-Entsorger wirbt mit eigenem H2 "Fotos schicken, Festpreis erhalten – ganz ohne Termin" — stärkstes Frictionless-Versprechen im Feld; Formulierung bleibt Policy-konform (Spanne statt Festpreis ohne Besichtigung).

## Limitierungen

- Detaillierter SERP-Snapshot (Local Pack, PAA, organische Reihenfolge) liegt nur für **"entrümpelung falkensee"** vor (aus organisch-entruempelung-plan.md, DataForSEO Falkensee Desktop). Für "entrümpelung havelland" und "keller entrümpeln" gibt es keine frische SERP-Klassifizierung — Punkte 3/8 stützen sich auf die dokumentierte Google-Ads-Volumen-Nische (Plan §1, Fund 2), nicht auf eine geprüfte SERP-Zusammensetzung dieser Queries.
- Wortzahl-Schätzungen der Konkurrenzseiten stammen aus WebFetch-Modelllesung (grobe Größenordnung, kein Zeichen-Zähler); eigene Zahl (1.544 W.) ist die belegte Vorgabe aus der Aufgabenstellung.
- Local-Pack-Reihenfolge/Sterne sind Stand der letzten DataForSEO-Stichprobe (Plan-Datum 17.09.) — kein Live-Re-Check in diesem Lauf (keine bezahlten Abfragen, wie beauftragt).
- Schema-Empfehlungen (z. B. AggregateRating/Review-Schema für die bestehenden 19 Bewertungen) sind bewusst ausgeklammert — das ist Aufgabe von `seo-schema` (Task 7 im W1-Plan), nicht dieser Copy-Analyse.
