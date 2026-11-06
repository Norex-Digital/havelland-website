// Google Indexing API: URL_UPDATED für Sitemap-URLs, Prioritätsliste zuerst. Kein npm-Paket, nur fetch.
// Owner-Entscheid Maurice 07.11.2026, zusätzlich zur Handeinreichung in der Search Console. Googles Doku erlaubt die
// API nur für JobPosting- und BroadcastEvent-Seiten; Einreichungen laufen durch Googles Spam-Prüfung, Zugang kann
// entzogen werden. Doku: gbr-firma 04-Firma-und-Recht/wissen/integrationen/google-indexing-api.md
//
// Nutzung (aus dem Repo-Root, nach dem Build):
//   node scripts/indexing-api-submit.mjs                       Plan anzeigen (Dry-Run)
//   node scripts/indexing-api-submit.mjs --send                senden, bis Tageskontingent (200, Reset Mitternacht Pacific) voll
//   --max N        höchstens N URLs senden            --first datei.txt   diese URLs zuerst (eine je Zeile, Pfad oder volle URL)
//   --only datei.txt  nur diese URLs                   --resend            auch URLs, die laut Log schon gesendet wurden
//   --check N      nach dem Senden N URLs per getMetadata gegenprüfen
// Token: INDEXING_TOKEN_FILE (Default ~/.norex-ct/sessions/indexing-api-token.json) aus scripts/indexing-api-auth.mjs
// Log:   data/indexing-api-log.json (URL → Sendungen mit Zeit und HTTP-Status), wird committet, enthält keine Geheimnisse.
import fs from 'fs';
import os from 'os';
import path from 'path';

const cfg = JSON.parse(fs.readFileSync('data/config.json', 'utf8'));
const DOMAIN = cfg.domain.replace(/\/$/, '');
const TOKEN = process.env.INDEXING_TOKEN_FILE || path.join(os.homedir(), '.norex-ct/sessions/indexing-api-token.json');
const LOG = 'data/indexing-api-log.json';
const DAILY = 200;
const SEND = process.argv.includes('--send');
const RESEND = process.argv.includes('--resend');
const arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : null; };
const MAX = Number(arg('--max') || DAILY);
const CHECK = Number(arg('--check') || 0);

const pacificDay = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const norm = (u) => { u = u.trim(); if (!u || u.startsWith('#')) return null; if (u.startsWith('/')) u = DOMAIN + u; return u; };
const readList = (f) => f ? fs.readFileSync(f, 'utf8').split('\n').map(norm).filter(Boolean) : [];

// Sitemap-URLs wie in indexnow-submit.mjs: Index auflösen, Sub-Sitemaps einsammeln.
const locs = (file) => { const p = `website/${file}`; return fs.existsSync(p) ? [...fs.readFileSync(p, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]) : []; };
const subs = locs('sitemap.xml').map(u => u.split('/').pop()).filter(f => f.endsWith('.xml'));
const sitemapUrls = [...new Set(subs.flatMap(locs))];
if (!sitemapUrls.length) { console.error('Keine URLs in den Sitemaps. Erst bauen.'); process.exit(1); }
const inSitemap = new Set(sitemapUrls);

const log = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, 'utf8')) : { _meta: { zweck: 'Sendungen an die Google Indexing API (urlNotifications:publish). Keine Geheimnisse.' }, sent: {} };
const sentOk = (u) => (log.sent[u] || []).some(e => e.status === 200);
const todayCount = Object.values(log.sent).flat().filter(e => e.status === 200 && e.day === pacificDay()).length;

const first = readList(arg('--first'));
const only = readList(arg('--only'));
const unknown = [...first, ...only].filter(u => !inSitemap.has(u));
if (unknown.length) console.log(`Hinweis: ${unknown.length} Listen-URLs stehen nicht in der Sitemap und werden übersprungen: ${unknown.slice(0, 5).join(', ')}${unknown.length > 5 ? ' …' : ''}`);
let order = only.length ? only.filter(u => inSitemap.has(u)) : [...first.filter(u => inSitemap.has(u)), ...sitemapUrls.filter(u => !first.includes(u))];
order = [...new Set(order)];
const pending = RESEND ? order : order.filter(u => !sentOk(u));
const budget = Math.max(0, Math.min(MAX, DAILY - todayCount));
const batch = pending.slice(0, budget);

console.log(`Sitemap: ${sitemapUrls.length} URLs · Prioritätsliste: ${first.length} · schon gesendet (HTTP 200): ${order.length - pending.length} · offen: ${pending.length}`);
console.log(`Heute (Pacific ${pacificDay()}) bereits gesendet: ${todayCount} von ${DAILY} · dieser Lauf: ${batch.length}${batch.length < pending.length ? ` (Rest ${pending.length - batch.length} für den nächsten Tag)` : ''}`);
if (!SEND) { console.log('Dry-Run. Erste 10 der Reihenfolge:'); batch.slice(0, 10).forEach((u, i) => console.log(`  ${i + 1}. ${u}`)); console.log('Senden mit --send.'); process.exit(0); }
if (!batch.length) { console.log('Nichts zu senden.'); process.exit(0); }

// --- Token ---
if (!fs.existsSync(TOKEN)) { console.error(`Kein Token unter ${TOKEN}. Erst: node scripts/indexing-api-auth.mjs`); process.exit(1); }
const tok = JSON.parse(fs.readFileSync(TOKEN, 'utf8'));
async function accessToken() {
  if (tok.access_token && tok.expires_at && tok.expires_at - Date.now() > 120000) return tok.access_token;
  const raw = JSON.parse(fs.readFileSync(tok.client_secrets_file, 'utf8')); const c = raw.installed || raw.web;
  const body = new URLSearchParams({ client_id: c.client_id, client_secret: c.client_secret, refresh_token: tok.refresh_token, grant_type: 'refresh_token' });
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await res.json();
  if (!res.ok) { console.error('Token-Refresh fehlgeschlagen:', res.status, JSON.stringify(j).slice(0, 300), '\nBei invalid_grant: Refresh-Token abgelaufen (Testing-App: 7 Tage), neu: node scripts/indexing-api-auth.mjs'); process.exit(1); }
  tok.access_token = j.access_token; tok.expires_at = Date.now() + (j.expires_in || 3600) * 1000;
  fs.writeFileSync(TOKEN, JSON.stringify(tok, null, 2) + '\n', { mode: 0o600 });
  return tok.access_token;
}
const save = () => fs.writeFileSync(LOG, JSON.stringify(log, null, 1) + '\n');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let ok = 0, fail = 0, stop = null;
for (const u of batch) {
  const at = await accessToken();
  const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', { method: 'POST', headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ url: u, type: 'URL_UPDATED' }) });
  let j = {}; try { j = await res.json(); } catch {}
  (log.sent[u] ||= []).push({ at: new Date().toISOString(), day: pacificDay(), status: res.status, notifyTime: j.urlNotificationMetadata?.latestUpdate?.notifyTime || null, error: res.ok ? undefined : (j.error?.message || '').slice(0, 160) });
  if (res.ok) ok++; else fail++;
  if (res.status === 429) { stop = 'Kontingent erschöpft (429). Rest morgen nach Mitternacht Pacific.'; break; }
  if (res.status === 403) { stop = `403: ${j.error?.message || ''} (API im Projekt nicht aktiviert oder Konto kein Property-Inhaber).`; break; }
  if (res.status === 401) { stop = '401: Token ungültig, neu anmelden mit scripts/indexing-api-auth.mjs.'; break; }
  if ((ok + fail) % 25 === 0) { save(); console.log(`  … ${ok + fail} von ${batch.length} (ok ${ok}, Fehler ${fail})`); }
  await sleep(180);   // Limit 380 Requests pro Minute über alle Endpunkte
}
save();
console.log(`Gesendet: ok ${ok}, Fehler ${fail}${stop ? `\nAbbruch: ${stop}` : ''}`);

if (CHECK > 0 && ok > 0) {
  const at = await accessToken();
  const sample = batch.filter(sentOk).slice(0, CHECK);
  for (const u of sample) {
    const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications/metadata?url=' + encodeURIComponent(u), { headers: { Authorization: `Bearer ${at}` } });
    let j = {}; try { j = await res.json(); } catch {}
    console.log(`  getMetadata ${u} → HTTP ${res.status}, latestUpdate ${j.latestUpdate?.notifyTime || '-'} (${j.latestUpdate?.type || '-'})`);
    await sleep(350);
  }
}
process.exit(stop && fail && !ok ? 1 : 0);
