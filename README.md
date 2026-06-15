# havelland-website

pSEO-Website **Haus- & Gartenservice Havelland** — Static HTML, zero-dependency Generator, Vercel.

## Bauen
```bash
node scripts/generate.mjs        # Sample-Charge (Home + Hubs + Orts-Hubs + Muster-Ortsseiten + Ratgeber)
FULL=1 node scripts/generate.mjs # alle Ortsseiten (erst nach P4 Archetyp-Copy)
```
Output → `website/` (Vercel `outputDirectory`). Lokal prüfen: `website/index.html` im Browser öffnen.

## Struktur
- `data/` — Daten-Layer (services, locations, config, nap, proof, matrix) — Quelle der Wahrheit
- `assets/css/site.css` — Design-System (aligned mit `havelland-design` Tokens) · `assets/img/` — Bilder (AI-Platzhalter)
- `scripts/generate.mjs` — Generator (Templates, Schema ohne FAQPage, interne Links, Sitemaps, robots.txt)
- `website/` — generierter Output (deploybar)

## Design
Design-Sprache = Skill `havelland-design` (`~/.claude/skills/havelland-design/`). Referenz: Planungs-Repo `Haus und Gartenservice Havelland/Website/design/homepage-richtung1-v6.html`.

## Vor Go-Live (offen)
NAP ✅ · Web3Forms/GA4/GTM-IDs in `data/config.json` · echte Fotos · Archetyp-Copy (P4) · Wellen-Indexierung.
