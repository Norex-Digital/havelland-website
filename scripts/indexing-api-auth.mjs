// OAuth2-Desktop-Flow für die Google Indexing API (Scope indexing), ohne npm-Pakete.
// Schritt 1:  node scripts/indexing-api-auth.mjs            → druckt die Zustimmungs-URL, merkt sich den PKCE-Verifier
// Schritt 2a: Browser landet auf http://localhost:8765/?code=… (gleicher Rechner, Listener läuft mit --listen)
// Schritt 2b: oder die komplette Redirect-URL einlösen:  node scripts/indexing-api-auth.mjs --url "http://localhost:8765/?code=…&state=…"
// Zustimmen muss ein Google-Konto, das in der Search Console verifizierter INHABER der Property ist.
// Client:  INDEXING_CLIENT_SECRETS (Default ~/.norex-ct/sessions/gbr-projekt-credentials.json, Desktop-Client "GbR-Desktop")
// Token:   INDEXING_TOKEN_FILE     (Default ~/.norex-ct/sessions/indexing-api-token.json, chmod 600, nie ins Repo)
// Hinweis: OAuth-Apps im Status "Testing" bekommen Refresh-Tokens mit 7 Tagen Laufzeit. Danach Schritt 1 wiederholen.
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import crypto from 'crypto';

const SECRETS = process.env.INDEXING_CLIENT_SECRETS || path.join(os.homedir(), '.norex-ct/sessions/gbr-projekt-credentials.json');
const TOKEN = process.env.INDEXING_TOKEN_FILE || path.join(os.homedir(), '.norex-ct/sessions/indexing-api-token.json');
const PENDING = TOKEN + '.pending';
const SCOPE = 'https://www.googleapis.com/auth/indexing';
const PORT = Number(process.env.INDEXING_AUTH_PORT || 8765);
const REDIRECT = `http://localhost:${PORT}/`;

const arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : null; };
const raw = JSON.parse(fs.readFileSync(SECRETS, 'utf8'));
const client = raw.installed || raw.web;
if (!client || !client.client_id || !client.client_secret) { console.error(`Kein Desktop-Client in ${SECRETS}`); process.exit(1); }

async function exchange(code, verifier) {
  const body = new URLSearchParams({ code, client_id: client.client_id, client_secret: client.client_secret, redirect_uri: REDIRECT, grant_type: 'authorization_code', code_verifier: verifier });
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await res.json();
  if (!res.ok || !j.refresh_token) { console.error('Token-Tausch fehlgeschlagen:', res.status, JSON.stringify(j).slice(0, 300)); process.exit(1); }
  const out = { client_secrets_file: SECRETS, scope: j.scope || SCOPE, refresh_token: j.refresh_token, access_token: j.access_token, expires_at: Date.now() + (j.expires_in || 3600) * 1000, obtained_at: new Date().toISOString() };
  fs.writeFileSync(TOKEN, JSON.stringify(out, null, 2) + '\n', { mode: 0o600 });
  fs.chmodSync(TOKEN, 0o600);
  if (fs.existsSync(PENDING)) fs.unlinkSync(PENDING);
  console.log(`Token gespeichert: ${TOKEN} (Scope ${out.scope}). Test: node scripts/indexing-api-submit.mjs --check 1`);
}

const redirectUrl = arg('--url');
if (redirectUrl) {
  const u = new URL(redirectUrl);
  const code = u.searchParams.get('code');
  const state = u.searchParams.get('state');
  if (!code) { console.error('Kein code-Parameter in der URL.'); process.exit(1); }
  if (!fs.existsSync(PENDING)) { console.error(`Kein offener Auth-Vorgang (${PENDING} fehlt). Erst ohne --url starten.`); process.exit(1); }
  const p = JSON.parse(fs.readFileSync(PENDING, 'utf8'));
  if (state && p.state && state !== p.state) { console.error('state stimmt nicht überein, Vorgang abgebrochen.'); process.exit(1); }
  await exchange(code, p.verifier);
  process.exit(0);
}

const verifier = crypto.randomBytes(32).toString('base64url');
const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
const state = crypto.randomBytes(8).toString('hex');
fs.writeFileSync(PENDING, JSON.stringify({ verifier, state, created: new Date().toISOString() }), { mode: 0o600 });
const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
  client_id: client.client_id, redirect_uri: REDIRECT, response_type: 'code', scope: SCOPE,
  access_type: 'offline', prompt: 'consent', include_granted_scopes: 'false', code_challenge: challenge, code_challenge_method: 'S256', state,
});
console.log('Im Browser öffnen und mit dem Konto zustimmen, das Inhaber der Search-Console-Property ist:\n');
console.log(authUrl + '\n');
if (process.argv.includes('--listen')) {
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, REDIRECT);
    const code = u.searchParams.get('code');
    if (!code) { res.writeHead(400); res.end('kein code'); return; }
    if (u.searchParams.get('state') !== state) { res.writeHead(400); res.end('state falsch'); return; }
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Zustimmung angekommen. Dieses Fenster kann zu.');
    server.close();
    await exchange(code, verifier);
    process.exit(0);
  });
  server.listen(PORT, () => console.log(`Warte auf Redirect unter ${REDIRECT} (Abbruch mit Strg+C). Alternativ die Redirect-URL mit --url einlösen.`));
} else {
  console.log('Danach die komplette Adresse aus der Browserzeile (beginnt mit http://localhost:8765/?code=) hier einlösen:');
  console.log('  node scripts/indexing-api-auth.mjs --url "<Adresse>"');
}
