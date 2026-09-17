# W3b „Überblick statt Textwand" — Leistungsseiten lesbar machen

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die drei Pillar-Hubs `/entruempelung/`, `/galabau/`, `/haushaltsaufloesung/` und die drei Tier-1-Ortsseiten (`/entruempelung-falkensee/`, `/entruempelung-brieselang/`, `/haushaltsaufloesung-falkensee/`) werden von Fließtext-Wänden (2.000–2.800 Wörter, 120–160-Wort-Absätze, 1 CTA) zu scannbaren Leistungsseiten: Leistungs-Kacheln mit Kurztext oben, Tiefe in aufklappbaren `<details>`, kurze Blöcke mit Bullets, ≥ 3 Inhalts-CTAs, keine „Was wir nicht anbieten"-Abschnitte. SEO-Tiefe bleibt erhalten (Text bleibt im DOM, nur eingeklappt).

**Owner-Feedback (Maurice, 17.09., Live-Review am Handy):** „viel viel zu lang, zu viel text, zu unübersichtlich, wenig cta … sie wollen ein überblick der leistungen vllt kurz dazu was lesen aber kein paragraphen wann die reihenfolge von rodungen oder zäunen sind auf einer leistungsseite … abschnitte mit was wir nicht anbieten hat dort nix zu suchen" · „/entruempelung/ hat zu viel text das liest sich niemand durch" · „/galabau/ den abschnitt was wir nicht machen raus".

**Architecture:** Opt-in-Layout `layout: "ueberblick"` je Hub in `data/copy/hubs.json`; `hub()` in `scripts/generate.mjs` rendert dann `sections[]` als Kachel-Grid (`h3` + `kurz` + `<details>`-Tiefe) statt als Prose, `blocks[]` bekommen `bullets[]`/`mehr`, `naehe`/`ablauf` wandern als Ein-Absatz-Lead in die Ortskarten- bzw. Timeline-Sektion, `garantie_text` wird eine Zeile unter dem Grid. `tiefBlock()` in `scripts/components.mjs` bekommt dieselbe Kachel-Logik (wenn eine `tief.section` ein `kurz` hat). Andere Hubs (Sections ≈ 60 Wörter) bleiben unverändert.

**Tech Stack:** Node ESM Generator (`FULL=1 node scripts/generate.mjs`), `scripts/gates.mjs`, `scripts/accept.mjs`, `scripts/validate-data.mjs`, reines CSS in `assets/css/site.css`. Repo `C:\Norex\havelland-website`, Branch `master` (Auto-Modus; Merge/Push nach grünen Gates freigegeben).

**Harte Leitplanken (unverändert, gelten für jeden Task):**
- Ads-LP-Leistungsdefinition: Festpreis für Räumung und Abtransport nach kostenloser Besichtigung; Entsorgungsgebühren nach Beleg zzgl. MwSt., ohne Aufschlag; Zusatzleistungen als eigene Position; **kein „inklusive"** bei Entsorgung. Sichtbare Preise „inkl. MwSt." (Regelbesteuerung seit 04.09.2026), kein „Kleinunternehmer"-Wording. GaLaBau: Grünschnitt/Bewuchs/Fräsgut im Festpreis, Rückbau/Sperriges nach Beleg.
- Keine erfundenen Zahlen, keine Kundennamen, keine Rechtsberatung („keine Rechtsberatung"-Hinweis bleibt wo er ist). Fakten nur aus `data/lokalfakten.json` / bestehender Copy übernehmen — nichts Neues erfinden, nur kürzen und umstrukturieren.
- KI-Szenen sind erlaubt, aber **nie** als echtes Foto/echter Auftrag/echte Person ausgeben. `strip-hecke` ist eine KI-Szene → darf nicht „Noah Telo beim Heckenschnitt" heißen.
- Kein FAQPage-Schema (Gate). Anker `#nebengebaeude`, `#gartenhaus`, `#gewerbe` auf `/entruempelung/` müssen bleiben (Startseiten-Kacheln + llms.txt verlinken sie).
- Gates: Title ≤ 60 (rlen mit `&amp;`), Meta 150–158, 1 H1, Broken-Link 0, NearDup < 40 % (misst nur ersten `.prose wide` + FAQ je Ortsseiten-Familie).
- Nur `FULL=1 node scripts/generate.mjs` bauen (Sample-Build löscht 131 Seiten). `git diff -w` ist die Wahrheit (autocrlf). Kein `--amend`, kein `--hard`.

---

## Task 1 — Generator + CSS + Accept: Layout `ueberblick`

**Files:**
- Modify: `scripts/generate.mjs` — `hub()` (ca. Z. 368–465): `sektionenHtml`, `naehe`, `ablauf`, `garantieTxt`, `extraBlocks`, `timelineBlock`, `cardOrteSection`, `main`
- Modify: `scripts/components.mjs` — `tiefBlock()` (Z. 250–256)
- Modify: `assets/css/site.css` — neue Regeln nach `.cards.zaunarten …` (Z. 713–717)
- Modify: `scripts/accept.mjs` — Blöcke `HUB entruempelung` (Z. 70–76), `HUB galabau` (Z. 79–84), Tier-1-Schleife (Z. 88 ff.)
- Modify: `scripts/validate-data.mjs` — neue optionale Felder zulassen (falls das Script Felder whitelistet; sonst nichts)

**Datenvertrag (neu, alles optional, rückwärtskompatibel):**
```
hubs[].layout            "ueberblick" | fehlt (= bisheriges Prose-Layout)
hubs[].sections[].kurz   1–2 Sätze (≤ 30 Wörter) für die Kachel; body = Tiefe im <details>
hubs[].sections[].id     optionaler Anker auf der Kachel
hubs[].blocks[].bullets  string[] (≤ 5 Einträge, je ≤ 14 Wörter) → <ul>
hubs[].blocks[].mehr     string (≤ 90 Wörter) → <details><summary>Mehr dazu</summary>
hubs[].blocks[].cta_after  true | { "h2": "...", "txt": "..." }  (Objekt = eigener CTA-Text statt "Lieber machen lassen?")
ortsseiten tief.sections[].kurz / tief.blocks[].bullets / tief.blocks[].mehr  — identisch
```

- [ ] **Step 1 — CSS.** In `assets/css/site.css` direkt nach Z. 717 (`.cards.zaunarten .card img{…}`) einfügen:

```css
/* Leistungs-Überblick (W3b, 17.09.): Kachel = h3 + Kurztext, Tiefe im <details>. Kein line-clamp wie bei .card p. */
.cards.leist{grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--s-lg,24px)}
.cards.leist .card{padding:24px 24px 18px}
.cards.leist .card>p{display:block;-webkit-line-clamp:unset;overflow:visible;font-size:15px;color:#33392f;margin:0 0 12px}
.cards.leist .card .go{padding-top:10px}
.mehr{margin-top:auto;border-top:1px solid var(--hair)}
.mehr summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0 4px;font-weight:600;font-size:14px;color:var(--green-d)}
.mehr summary::-webkit-details-marker{display:none}
.mehr summary::after{content:"+";font-size:18px;line-height:1;color:var(--green)}
.mehr[open] summary::after{content:"−"}
.mehr>div{padding:6px 0 4px;font-size:14.5px;line-height:1.6;color:#33392f}
.mehr>div p{margin:0 0 10px}
.mehr>div p:last-child{margin-bottom:0}
.prose .mehr{max-width:78ch;margin-top:6px}
.prose .mehr>div{font-size:16px}
.prose ul.bl{margin:0 0 18px}
.versprechen{max-width:78ch;margin:22px auto 0;padding:14px 18px;border:1px solid var(--hair);border-left:4px solid var(--accent);border-radius:var(--r-el,12px);background:#fff;font-size:15px;color:#33392f}
.versprechen strong{color:var(--green-d)}
.sec-lead{max-width:60ch;margin:-4px 0 22px;color:var(--muted);font-size:16px;line-height:1.6}
```

- [ ] **Step 2 — `hub()`: Kachel-Rendering.** In `scripts/generate.mjs` die Zeile `const sektionenHtml = c ? (c.sections || []).map(…)` **unverändert lassen** und danach ergänzen:

```js
  // W3b (17.09.): Layout "ueberblick" — Sections als Kachel-Grid (h3 + kurz + <details>-Tiefe) statt Prose-Wand.
  // Owner-Feedback: "Überblick der Leistungen, kurz dazu lesen, kein Paragraph". Tiefe bleibt im DOM (SEO), nur eingeklappt.
  const ueberblick = !!(c && c.layout === 'ueberblick');
  const kachelHtml = ueberblick ? (c.sections || []).map(x => {
    const kurz = x.kurz || (x.body.split(/(?<=\.)\s/)[0] || '');
    const tiefe = x.body ? `<details class="mehr"><summary>Mehr dazu</summary><div><p>${esc(x.body)}${copyLinksHtml(x)}</p></div></details>` : '';
    return `<div class="card"${x.id ? ` id="${esc(x.id)}"` : ''}><h3>${esc(x.h3)}</h3><p>${esc(kurz)}</p>${tiefe}</div>`;
  }).join('') : '';
```

  Prüfen: `copyLinksHtml` existiert bereits und liefert die `link_to`/`link2_to`-Links einer Section/eines Blocks als HTML (String beginnt mit Leerzeichen). Falls es einen anderen Namen hat: `grep -n "copyLinksHtml" scripts/generate.mjs`.

- [ ] **Step 3 — `hub()`: `naehe`/`ablauf`/`garantie` im Überblick-Layout verschieben.** Die drei Konstanten so ändern:

```js
  const naehe = (c && c.naehe && !ueberblick) ? `<h3>${esc(s.name)} in Ihrer Nähe</h3><p>${esc(c.naehe)}</p>` : '';
  const ablauf = (c && c.ablauf && !ueberblick) ? `<h3>So läuft es ab</h3><p>${esc(c.ablauf)}</p>` : '';
  const garantieTxt = c && c.garantie_text ? c.garantie_text : (s.garantie || 'Kostenlose Besichtigung, danach ein Festpreis als Endpreis.');
  // ueberblick: naehe -> Lead der Ortskarten-Sektion, ablauf -> Lead der Timeline, garantie -> Zeile unter dem Grid
  const naeheLead = (ueberblick && c.naehe) ? `<p class="sec-lead rv">${esc(c.naehe)}</p>` : '';
  const ablaufLead = (ueberblick && c.ablauf) ? `<p class="sec-lead rv">${esc(c.ablauf)}</p>` : '';
```

  Dann in `timelineBlock` und `cardOrteSection` die Leads einbauen (beide Konstanten stehen weiter unten in `hub()`):

```js
  const timelineBlock = `<section class="sec section-alt"><div class="wrap"><div class="head"><h2 class="serif rv">So läuft ein Auftrag</h2></div>${ablaufLead}${auftragsTimeline(!!s.partner_modell, s.slug)}</div></section>`;
  const cardOrteSection = cardOrte.length ? `<section class="sec section-alt"><div class="wrap"><div class="head"><h2 class="serif rv">${esc(s.name)} in Ihrem Ort</h2></div>${naeheLead}<div class="cards rv">${cards}</div></div></section>` : '';
```

- [ ] **Step 4 — `hub()`: Blöcke mit `bullets`/`mehr`/`cta_after`-Objekt.** `extraBlocks` ersetzen durch:

```js
  const ctaAfter = (b) => !b.cta_after ? '' : (typeof b.cta_after === 'object' ? ctaZwischen(s, b.cta_after) : ctaZwischen(s));
  const extraBlocks = (c && Array.isArray(c.blocks) ? c.blocks : []).map((b, i) =>
    `<section class="sec${i % 2 ? '' : ' section-alt'}"${b.id ? ` id="${esc(b.id)}"` : ''}><div class="wrap"><div class="prose wide rv"><h2>${esc(b.h2)}</h2>${b.lead ? `<p class="lead-p"><strong>${esc(b.lead)}</strong></p>` : ''}<p>${esc(b.body)}${copyLinksHtml(b)}</p>${Array.isArray(b.bullets) && b.bullets.length ? `<ul class="bl">${b.bullets.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}${b.mehr ? `<details class="mehr"><summary>Mehr dazu</summary><div><p>${esc(b.mehr)}</p></div></details>` : ''}${(b.img && IMG[b.img]) ? `<figure class="block-fig">${pic(b.img, { alt: b.img_alt || b.h2, sizes: '(max-width:900px) 92vw, 480px' })}</figure>` : ''}</div></div></section>` + ctaAfter(b)).join('');
```

  `ctaZwischen` (Z. 290) um optionale Overrides erweitern — Signatur `const ctaZwischen = (s, o = {}) => {`, danach `const h2 = o.h2 || (p ? … : 'Lieber machen lassen?');` und `const txt = o.txt || (p ? … : 'Kostenlose Besichtigung, Festpreis, dann erledigt.');`. Sonst nichts ändern.

- [ ] **Step 5 — `hub()`: `main` zusammensetzen.** Die Prose-Sektion in `main` (`<section class="sec"><div class="wrap"><div class="prose wide rv">${definition}<h2>…</h2>${sektionenHtml}${naehe}${ablauf}<h3>…Garantie/Versprechen</h3><p>${esc(garantieTxt)}</p></div></div></section>`) durch eine Konstante `leistungsSection` ersetzen, die vor `main` definiert wird:

```js
  const versprechenH = (s.garantie && !s.partner_modell) ? 'Unsere Garantie' : 'Unser Versprechen';
  const leistungsSection = ueberblick
    ? `<section class="sec" id="leistungen"><div class="wrap"><div class="head"><h2 class="serif rv">${esc(c.sections_h2 || (s.name + ' im Havelland — was dazugehört'))}</h2></div>${c.definition ? `<p class="sec-lead rv">${esc(c.definition)}</p>` : ''}<div class="cards leist rv">${kachelHtml}</div><p class="versprechen rv"><strong>${versprechenH}:</strong> ${esc(garantieTxt)}</p></div></section>`
    : `<section class="sec"><div class="wrap"><div class="prose wide rv">${definition}<h2>${esc((c && c.sections_h2) || (s.name + ' im Havelland — was dazugehört'))}</h2>${sektionenHtml}${naehe}${ablauf}<h3>${versprechenH}</h3><p>${esc(garantieTxt)}</p></div></div></section>`;
```

  und in `main` an derselben Stelle `${leistungsSection}` einsetzen. Der bestehende `${zwischen}`-CTA direkt danach bleibt (erster CTA nach dem Grid).

- [ ] **Step 6 — `tiefBlock()` in `scripts/components.mjs`.** Kachel-Logik, wenn mindestens eine Section `kurz` hat:

```js
export function tiefBlock(t, { linkHtml = () => '' } = {}) {
  if (!t) return '';
  const kacheln = (t.sections || []).some(x => x.kurz);
  const secs = kacheln
    ? `<div class="cards leist rv">${(t.sections || []).map(x => `<div class="card"${x.id ? ` id="${esc(x.id)}"` : ''}><h3>${esc(x.h3)}</h3><p>${esc(x.kurz)}</p>${x.body ? `<details class="mehr"><summary>Mehr dazu</summary><div><p>${esc(x.body)}${linkHtml(x)}</p></div></details>` : ''}</div>`).join('')}</div>`
    : (t.sections || []).map(x => `<h3>${esc(x.h3)}</h3><p>${esc(x.body)}${linkHtml(x)}</p>`).join('');
  const ob = t.ortsblock ? `<section class="sec section-alt"><div class="wrap"><div class="ortsblock rv"><h2>${esc(t.ortsblock.h2)}</h2><dl>${(t.ortsblock.items || []).map(i => `<div><dt>${esc(i.k)}</dt><dd>${esc(i.v)}</dd></div>`).join('')}</dl>${t.ortsblock.quelle ? `<p class="oq">Quelle: ${esc(t.ortsblock.quelle)}</p>` : ''}</div></div></section>` : '';
  const blocks = (t.blocks || []).map((b, i) => `<section class="sec${i % 2 ? ' section-alt' : ''}"${b.id ? ` id="${esc(b.id)}"` : ''}><div class="wrap"><div class="prose wide rv"><h2>${esc(b.h2)}</h2>${b.lead ? `<p class="lead-p"><strong>${esc(b.lead)}</strong></p>` : ''}<p>${esc(b.body)}${linkHtml(b)}</p>${Array.isArray(b.bullets) && b.bullets.length ? `<ul class="bl">${b.bullets.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${b.mehr ? `<details class="mehr"><summary>Mehr dazu</summary><div><p>${esc(b.mehr)}</p></div></details>` : ''}</div></div></section>`).join('');
  const head = kacheln
    ? `<section class="sec tief"><div class="wrap"><div class="head"><h2 class="serif rv">${esc(t.h2)}</h2></div>${secs}</div></section>`
    : `<section class="sec tief"><div class="wrap"><div class="prose wide rv"><h2>${esc(t.h2)}</h2>${secs}</div></div></section>`;
  return `${head}${ob}${blocks}`;
}
```

- [ ] **Step 7 — Ortsseite: Zwischen-CTA nach dem Tiefen-Block.** In `ortsseite()` (generate.mjs ca. Z. 470–560) direkt nach `${tief ? tiefBlock(tief, …) : ''}` einen CTA einfügen, **nur** wenn `tief` gesetzt ist: `${tief ? ctaZwischen(s, { h2: 'Foto schicken, Festpreis bekommen.', txt: 'Rückmeldung meist am selben Werktag, kostenlose Besichtigung in ' + o.name + ', schriftlicher Festpreis für Räumung und Abtransport.' }) : ''}`. Vorher `grep -n "ctaZwischen" scripts/generate.mjs` — die Funktion ist im selben Modul definiert (Z. 290), muss nur vor `ortsseite()` stehen (ist sie).

- [ ] **Step 8 — `validate-data.mjs`.** `grep -n "sections\|blocks\|kurz\|bullets" scripts/validate-data.mjs`. Wenn das Script Felder strikt prüft (Whitelist/Schema), `layout`, `kurz`, `id`, `bullets`, `mehr` und `cta_after` als Objekt zulassen. Wenn es nur Pflichtfelder prüft: nichts tun.

- [ ] **Step 9 — `accept.mjs` anpassen.**

  `HUB entruempelung` (Z. 70–76) ergänzen/ersetzen:
```js
  check('entruempelung', 'layout ueberblick: kacheln', classCount(h, 'leist') >= 1 && (h.match(/<details class="mehr">/g) || []).length >= 5);
  check('entruempelung', 'cta >= 3 (zwischen + endband + sticky)', (h.match(/class="cta-row/g) || []).length >= 4);
  check('entruempelung', 'kein nicht-anbieten-Abschnitt', !hasI(h, 'was wir nicht anbieten') && !hasI(h, 'nicht anbieten</h'));
  check('entruempelung', 'KI-Szene nicht als Noah-Foto', !hasI(h, 'Noah Telo beim Heckenschnitt') && !hasI(h, 'Das Foto zeigt ihn'));
```
  (bestehende Checks `fall>=2`, Anker, gstrip Beleg, kein inklusive, faq bleiben.)

  `HUB galabau` (Z. 79–84): Anker-Check ersetzen durch `check('galabau', 'anker', has(h, 'id="genehmigung"') && has(h, 'id="freiraeumen"'));` und ergänzen:
```js
  check('galabau', 'layout ueberblick: kacheln', classCount(h, 'leist') >= 1 && (h.match(/<details class="mehr">/g) || []).length >= 5);
  check('galabau', 'keine nicht-anbieten/grenzen/reihenfolge/saison-Abschnitte', !hasI(h, 'bewusst nicht anbieten') && !has(h, 'id="grenzen"') && !has(h, 'id="reihenfolge"') && !has(h, 'id="saison"'));
  check('galabau', 'cta >= 3', (h.match(/class="cta-row/g) || []).length >= 4);
```

  `HUB haushaltsaufloesung` neu (nach galabau):
```js
page('haushaltsaufloesung/index.html', 'HUB haushaltsaufloesung', h => {
  check('haushaltsaufloesung', 'layout ueberblick: kacheln', classCount(h, 'leist') >= 1 && (h.match(/<details class="mehr">/g) || []).length >= 4);
  check('haushaltsaufloesung', 'anker erbfall/pflegefall/vollmacht', has(h, 'id="erbfall"') && has(h, 'id="pflegefall"') && has(h, 'id="vollmacht"'));
  check('haushaltsaufloesung', 'cta >= 3', (h.match(/class="cta-row/g) || []).length >= 4);
  check('haushaltsaufloesung', 'kein inklusive Entsorgung', !hasI(h, 'inklusive Entsorgung') && !hasI(h, 'Entsorgung inklusive'));
});
```

  Tier-1-Schleife (Z. 88 ff.): zusätzlich `check(rel, 'tief kacheln', classCount(h, 'leist') >= 1)` und `check(rel, 'cta nach tief', hasI(h, 'Foto schicken, Festpreis bekommen'))`.

  Prüfen, dass `classCount` exakt Tokens zählt (`class="cards leist rv"` → Token `leist`) — `grep -n "function classCount" -A 3 scripts/accept.mjs`. Falls `classCount` nur `class="X"` exakt matcht, stattdessen `(h.match(/class="cards leist/g) || []).length >= 1` verwenden.

- [ ] **Step 10 — Smoke-Test ohne Daten-Änderung.** `cd /c/Norex/havelland-website && FULL=1 node scripts/generate.mjs && node scripts/gates.mjs && node scripts/accept.mjs`. Erwartung: Build grün (240 Seiten), gates grün, accept **rot nur** bei den neuen Checks (`layout ueberblick`, `cta >= 3`, `tief kacheln`, galabau-Anker) — die werden erst mit Task 2/3 grün. Alle anderen Checks grün. Kein Rendering-Unterschied bei Hubs ohne `layout` (Stichprobe: `git diff --stat -- website/` zeigt nur die drei Ortsseiten mit dem neuen Tief-CTA, sonst nichts — die Hubs ändern sich erst mit `layout`).

- [ ] **Step 11 — Commit.** `git add scripts/generate.mjs scripts/components.mjs assets/css/site.css website/assets/css/site.css scripts/accept.mjs scripts/validate-data.mjs && git commit -m "W3b Generator: Layout ueberblick (Kacheln + details), Block-Bullets/mehr, Tief-CTA, Accept-Checks"` (nur Dateien, die sich geändert haben; `website/` NICHT committen, das macht der Deploy-Commit am Ende).

**Report:** DONE / DONE_WITH_CONCERNS / BLOCKED + welche accept-Checks erwartungsgemäß rot sind.

---

## Task 2 — Copy `hubs.json`: `/entruempelung/`, `/galabau/`, `/haushaltsaufloesung/`

**Files:**
- Modify: `data/copy/hubs.json` (Hubs `entruempelung`, `galabau`, `haushaltsaufloesung`)

**Skills laden (Skill-Tool, vor der Arbeit, im Report nennen):** `seo-web-copy`, `stop-slop`, `page-cro`, `copy-audit`.

**Regeln für alle drei Hubs:**
1. `"layout": "ueberblick"` setzen.
2. `sections[]` = **nur** buchbare Leistungen (`offer: true`), jede mit `kurz` (1–2 Sätze, ≤ 30 Wörter, konkret: was/wo/Ergebnis — kein „Wir bieten…", kein Slop) und gekürztem `body` (≤ 90 Wörter, Tiefe: typischer Fall, Besonderheit, Preis-Logik in einem Satz). `link_to`/`link_text` behalten.
3. Sections ohne `offer` (Preis-/Entsorgungs-Erklärung, Wertanrechnung, „Erst freiräumen, dann bauen") werden **Blocks** mit `lead` + `body` ≤ 60 Wörter + `bullets` (≤ 5 × ≤ 14 Wörter) + optional `mehr` ≤ 90 Wörter; Abschnitte „was wir nicht anbieten" werden **gestrichen** (das Zwei-Mann-Team-Argument darf in einem Halbsatz im Block „Preis"/„So arbeiten wir" überleben; die Nicht-Liste darf **nur** in einer bestehenden FAQ stehen).
4. Jeder Block: `body` ≤ 60 Wörter. Langtext → `mehr` (≤ 90 Wörter) oder streichen. Anker-`id`s beibehalten wo vorhanden (Ausnahmen unten).
5. `naehe` ≤ 45 Wörter, `ablauf` ≤ 55 Wörter (werden als Ein-Absatz-Lead gerendert). `garantie_text` ≤ 30 Wörter (eine Zeile).
6. `cta_after` auf genau **zwei** Blocks je Hub setzen (mindestens einer mit eigenem Text-Objekt, damit nicht dreimal „Lieber machen lassen?" steht), z. B. `{"h2":"Foto schicken, Festpreis bekommen.","txt":"Rückmeldung meist am selben Werktag, kostenlose Besichtigung, schriftlicher Festpreis für Räumung und Abtransport."}`.
7. `faelle`, `faqs`, `title`, `meta`, `h1`, `h1_em`, `intro`, `definition`, `person`, `ortsseite_lead` **unverändert** (FAQs sind schon eingeklappt). `intro` darf auf ≤ 45 Wörter gekürzt werden.
8. Zielgröße sichtbarer Text (ohne `<details>`, ohne FAQ): ≤ 700 Wörter je Hub. Gesamt inkl. Tiefe: ≤ 60 % des heutigen Umfangs (entruempelung heute ≈ 2.800 W, galabau ≈ 2.500 W, haushaltsaufloesung ≈ 2.000 W).

**Hub-spezifisch:**

`entruempelung`:
- Sections → 5 Kacheln: Keller · Garage · Dachboden · Schuppen/Gartenhaus (mit `id: "schuppen"`) · Wohnung/Haus. `kurz` je Kachel konkret („Über die schmale Kellertreppe nach oben, nach Holz, Metall, Elektro und Rest getrennt zum Wertstoffhof — besenrein am selben Tag.").
- Section „Sperrmüll, Wertstoffhof und Entsorgung nach Beleg" → Block `id: "entsorgung"`, h2 „Was die Entsorgung kostet", lead = Beleg-Satz, bullets: Sperrmüllabfuhr 2×/Jahr + Wartezeit · Wertstoffhof Falkensee Nauener Str. 97 + Öffnungszeiten · gewogen nach Gebührensatzung (Altholz 0,36 €/kg, Stand 2026) · letzter Auftrag: 458 € auf zwei Belegen · Schadstoffe nicht (Annahmestelle nennen). Kein „inklusive".
- Section „Wertanrechnung und was wir nicht anbieten" → Block `id: "wertanrechnung"`, h2 „Wertanrechnung und Zusatzleistungen", body ≤ 50 W: Verwertbares wird angerechnet; Geruch/Schimmel oberflächlich/Grundreinigung als eigene Position. Nicht-Liste (Malern, Böden, Bausanierung) **raus** aus dem Block.
- Blocks `nebengebaeude`, `gartenhaus`, `gewerbe`: kürzen auf lead + ≤ 60 W + 3–4 bullets; Langtext in `mehr`. Block `gartenhaus` behält `link_to: galabau`.
- Block `ansprechpartner`: `img` + `img_alt` **entfernen**, Satz „Das Foto zeigt ihn bei der Arbeit im Havelland, beim Heckenschnitt." **streichen** (KI-Szene, kein Foto von Noah). Rest ≤ 60 W.
- Block `garantie` **streichen** (Dublette zu `garantie_text`); dessen Kernsatz „Ihr Preis bleibt Ihr Preis — auch wenn der Tag länger wird." in `garantie_text` übernehmen.
- Block „Unterschied Entrümpelung und Haushaltsauflösung": ≤ 50 W + Link, `id: "unterschied"`.
- `cta_after`: auf `entsorgung` (Objekt-Text) und `gewerbe` (true).
- Reihenfolge blocks: nebengebaeude → entsorgung → gartenhaus → gewerbe → wertanrechnung → ansprechpartner → unterschied.

`galabau`:
- Sections → 5 Kacheln: Zaunbau · Heckenentfernung/Rodung · Stubben fräsen · Pflaster/Kanten/Wegeplatten · Beeteinfassungen/Hochbeete. Orientierungspreise (40–90 €/lfm Hecke, 2–5 €/cm Stubben, „inkl. MwSt. (Stand 2026)") dürfen im `body` bleiben, nicht im `kurz`.
- Section „Erst freiräumen, dann bauen" → Block `id: "freiraeumen"`, lead „Schuppen, Zaun, Holzhaufen: das räumen wir weg, bevor gebaut wird.", body ≤ 50 W, bullets (Abriss + sortenrein · Rückbau/Sperriges nach Beleg zzgl. MwSt. · ein Angebot für Räumung und Bau), `link_to: "entruempelung#gartenhaus"`.
- Section „Was wir bewusst nicht anbieten" **streichen**. Blocks `reihenfolge`, `saison`, `grenzen` **streichen**. Ihre nützlichen Fakten überleben nur so: `genehmigung`-Block wird „Vorher klären: Zaun, Hecke, Nachbar" mit lead + 3 bullets (Zaun: Höhe/Satzung → Ratgeber-Link; Hecke: Rodung 1.10.–28.2. nach § 39 BNatSchG → Ratgeber-Link; Grenze: vorher mit dem Nachbarn sprechen) + `mehr` ≤ 60 W (Falkenhagen-Gestaltungsregeln, „keine Rechtsberatung"). Der Saison-Fakt (Stubben ganzjährig, Zaun auch im Winter) ist bereits in den FAQs → nichts ergänzen.
- FAQ „Welche GaLaBau-Arbeiten übernehmen Sie — und welche nicht?" bleibt (einzige Stelle der Nicht-Liste).
- `cta_after`: auf `freiraeumen` (Objekt-Text „Zaun, Rodung, Pflaster: ein Angebot.") und `genehmigung` (true).
- `garantie_text` ≤ 30 W, GaLaBau-Beleg-Logik in einem Satz.

`haushaltsaufloesung`:
- Sections (Schritt 1–4) → 4 Kacheln mit `offer: true` **nur** auf Schritt 3 (Verwerten/entsorgen) und Schritt 4 (Besenrein übergeben) — Schritt 1/2 sind Prozess, kein Offer (Schema-Regel). Kachel-`kurz` je Schritt ≤ 25 W; `body` ≤ 80 W.
- Blocks `erbfall`, `pflegefall`, `vollmacht`: lead + ≤ 60 W + bullets; Langtext in `mehr`. Blocks „Wohnungsauflösung im Havelland" (`id: "wohnungsaufloesung"`) und „Unterschied …" (`id: "unterschied"`) ≤ 50 W.
- `cta_after`: auf `vollmacht` (Objekt-Text „Sie müssen nicht vor Ort sein.") und `pflegefall` (true).

- [ ] **Step 1** — Skills laden, `data/copy/hubs.json` lesen (nur die drei Hubs), heutigen Wortumfang notieren.
- [ ] **Step 2** — Copy schreiben (per Python-Patch mit `json.load`/`json.dump(ensure_ascii=False, indent=2)` — vorher `head -c 300 data/copy/hubs.json` und `git diff --stat` nach dem Schreiben prüfen: nur Zeilen der drei Hubs dürfen sich ändern; bei Vollformatierung der Datei Indent/Trailing-Newline an das Original anpassen).
- [ ] **Step 3** — `node scripts/validate-data.mjs && FULL=1 node scripts/generate.mjs && node scripts/gates.mjs && node scripts/accept.mjs` → alles grün, inkl. der neuen Checks aus Task 1.
- [ ] **Step 4** — Wortzählung: `PYTHONIOENCODING=utf-8 python3 -c "…"` sichtbarer Text je Hub (ohne body/mehr/faq) ≤ 700 W, Gesamt ≤ 60 % vorher. Zahlen im Report.
- [ ] **Step 5** — Selbst-Audit gegen Leitplanken: `grep -ci "inklusive" website/entruempelung/index.html website/galabau/index.html` → 0 bei Entsorgung; kein „Kleinunternehmer"; keine neuen Zahlen; `git diff -w -- data/copy/hubs.json | grep "^+" | grep -oE "[0-9][0-9.,]* ?(€|Euro|%|kg|m²|lfm)"` → jede Zahl muss auch im alten Text (`grep "^-"`) oder in `data/lokalfakten.json` vorkommen.
- [ ] **Step 6** — Commit: `git add data/copy/hubs.json && git commit -m "W3b Copy: Hubs entruempelung/galabau/haushaltsaufloesung — Kacheln, Kurztexte, Blöcke gekürzt, Nicht-Listen raus"`.

**Report:** Status, geladene Skills, Wortzahlen vorher/nachher je Hub, Liste gestrichener Abschnitte, offene Zweifel.

---

## Task 3 — Copy `ortsseiten.json`: Tier-1 `tief`-Blöcke

**Files:**
- Modify: `data/copy/ortsseiten.json` (`services.entruempelung.orte.falkensee.tief`, `…brieselang.tief`, `services.haushaltsaufloesung.orte.falkensee.tief`)

**Skills laden:** `seo-web-copy`, `stop-slop`, `programmatic-seo`, `copy-audit`.

**Regeln:**
1. Jede `tief.sections[]` bekommt `kurz` (≤ 25 W, ortskonkret — Straße/Ortsteil/Fakt aus dem bestehenden Text) und `body` ≤ 80 W (heute ≈ 130 W).
2. `tief.blocks[]` (je 2): `lead` + `body` ≤ 60 W + `bullets` ≤ 4; Rest → `mehr` ≤ 80 W oder streichen.
3. `hook`/`rahmen`/`trust` (erster `.prose wide`-Block, NearDup-relevant) **nicht anfassen**. `tief.faqs`, `tief.ortsblock`, `tief.faelle` unverändert.
4. Keine neuen Fakten; jede Zahl/Straße/Öffnungszeit muss im alten Text oder in `data/lokalfakten.json` stehen. Die drei Seiten müssen sich weiterhin klar unterscheiden (kein Copy-Paste zwischen Falkensee und Brieselang).

- [ ] **Step 1** — Skills laden, die drei `tief`-Objekte lesen, Wortumfang notieren.
- [ ] **Step 2** — Patch per Python (`json.dump(ensure_ascii=False, indent=2)`; Format-Diff prüfen wie in Task 2).
- [ ] **Step 3** — `node scripts/validate-data.mjs && FULL=1 node scripts/generate.mjs && node scripts/gates.mjs && node scripts/accept.mjs` → grün; NearDup-Werte je Familie im Report (Gate druckt sie).
- [ ] **Step 4** — Commit: `git add data/copy/ortsseiten.json && git commit -m "W3b Copy: Tier-1 Tiefenblöcke als Kacheln mit Kurztext, Blöcke gekürzt"`.

**Report:** Status, Skills, Wortzahlen vorher/nachher je Seite, NearDup-Max.

---

## Task 4 — Review (Design + CRO + Spec)

**Skills laden:** `havelland-design`, `page-cro`, `copy-audit`, `playwright-cli`.

- [ ] Screenshots Mobile (390 px) + Desktop (1280 px) der sechs Seiten aus `website/` (lokaler Static-Server, z. B. `npx serve website -l 4173` oder `python3 -m http.server 4173 -d website`) nach `docs/superpowers/plans/w3b-screens/`.
- [ ] Prüfen: Above-the-fold = Hero + CTAs; nach dem Scroll zuerst das Kachel-Grid; Kacheln 2–3 Spalten Desktop, 1 Spalte Mobile; `<details>` geschlossen, `+`-Marker sichtbar; Blöcke ≤ 6 Zeilen Fließtext auf Desktop; ≥ 3 CTA-Sektionen sichtbar (Zwischen-CTA, Block-CTAs, Endband) + Sticky-Bar; kein Abschnitt „nicht anbieten"; keine Dublette (gleicher CTA-Text zweimal hintereinander); Design-Tokens (keine neuen Farben, Radien aus Variablen).
- [ ] Spec-Check gegen diesen Plan (Task 2/3 Regeln), Leitplanken-Grep (`inklusive`, `Kleinunternehmer`, `Noah Telo beim`, `nicht anbieten`).
- [ ] Report: Befunde als Liste `Seite · Stelle · Befund · Fix-Vorschlag`, Priorität P1 (blockt Deploy) / P2 / P3. Keine Fixes selbst anwenden.

**Ablauf danach (Controller):** P1/P2 fixen lassen (Implementer derselben Task), Re-Review, dann `FULL=1`-Build committen, `git push origin master`, Live-Check der sechs URLs (`curl -s … | grep -c 'class="cards leist'`), `node scripts/indexnow-submit.mjs`, `status.md` + `organisch-entruempelung-plan.md` §6 ergänzen.

---

## Modell-Plan

| Rolle | Anzahl | Modell | Effort | Grund |
|---|---|---|---|---|
| Implementer Generator/CSS/Accept (T1) | 1 | sonnet | high | abgegrenzte Code-Änderung, vollständige Spec |
| Copy Hubs (T2) | 1 | sonnet | high | Kürzen + Umstrukturieren mit Fakten-Bindung, Skills seo-web-copy/stop-slop/page-cro |
| Copy Tier-1 (T3) | 1 | sonnet | high | parallel zu T2, andere Datei |
| Review Design/CRO/Spec (T4) | 1 | opus | high | Urteil Lesbarkeit vs. SEO-Tiefe, CRO-Bewertung über sechs Seiten |
| Fix-Runden | ≤ 2 | sonnet | medium | nur bei P1/P2 |

Kein Haiku, kein Fable. Max. 1 Opus.

## Validierung (Gates/Skills/Design/Tools) — 17.09.
| Bereich | Befund | Konsequenz |
|---|---|---|
| Gates | NearDup misst nur ersten `.prose wide` + FAQ je Ortsseiten-Familie → `tief`-Kacheln gate-neutral; Hubs sind nicht im NearDup-Gate | T3 lässt `hook/rahmen/trust` unangetastet |
| Gates | `accept.mjs` prüft galabau-Anker `reihenfolge/saison/genehmigung/grenzen` → würde nach Streichung FAIL | T1 Step 9 ersetzt Anker-Check |
| Design | `.card p` hat `line-clamp:3` → würde `kurz` abschneiden; `.faq details` hat eigene Marker-Logik | T1 Step 1 eigene `.cards.leist`/`.mehr`-Regeln ohne Clamp |
| SEO | Text in `<details>` ist im DOM und wird indexiert (Mobile-First), Schema-Offers bleiben aus `offer:true` | Tiefe bleibt, Offers unverändert |
| Verlinkung | `/entruempelung/#nebengebaeude|#gartenhaus|#gewerbe` von Home-Kacheln + llms.txt verlinkt; `/galabau/#…` nirgends verlinkt | Entrümpelung-IDs bleiben, GaLaBau-IDs dürfen weg |
| Tools | `copyLinksHtml`, `ctaZwischen`, `classCount`, `faelleBlock` vorhanden | keine neuen Helfer nötig |
| Skills | `seo-web-copy`, `stop-slop`, `page-cro`, `copy-audit`, `programmatic-seo`, `havelland-design`, `playwright-cli` in der Skill-Liste | je Task benannt |
