import { OAuth2Client } from 'google-auth-library';
import { createServer } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { createServer as createNetServer } from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import open from 'open';

export const BUNDLED_CLIENT_ID = ''; // Fill after GCP OAuth app registration

const TOKEN_DIR = path.join(os.homedir(), '.gam-mcp');
const TOKEN_PATH = path.join(TOKEN_DIR, 'tokens.json');

export function loadTokens() {
  if (!fs.existsSync(TOKEN_PATH)) return null;
  return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
}

export function saveTokens(tokens, clientId) {
  fs.mkdirSync(TOKEN_DIR, { recursive: true });
  fs.writeFileSync(TOKEN_PATH, JSON.stringify({ tokens, clientId }));
}

async function getFreePort() {
  return new Promise((resolve) => {
    const server = createNetServer();
    server.listen(0, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function runOAuthFlow(clientId) {
  const port = await getFreePort();
  const redirectUri = `http://localhost:${port}/callback`;
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');

  const client = new OAuth2Client({ clientId, redirectUri });
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/admanager'],
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  const code = await new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body><h2>Authenticated! You can close this tab.</h2></body></html>');
      server.close();
      if (error) reject(new Error(`OAuth denied: ${error}`));
      else resolve(code);
    });
    server.listen(port, () => {
      console.error('Opening browser for authentication...');
      open(authUrl);
    });
  });

  const { tokens } = await client.getToken({ code, codeVerifier: verifier });
  saveTokens(tokens, clientId);
  return tokens;
}

export function resolveClientId(credentialsFile) {
  if (!credentialsFile) return BUNDLED_CLIENT_ID;
  const creds = JSON.parse(fs.readFileSync(credentialsFile, 'utf8'));
  const entry = creds.installed || creds.web;
  if (!entry?.client_id) {
    throw new Error('Could not find client_id in credentials file. Expected {"installed":{"client_id":...}} or {"web":{"client_id":...}}');
  }
  return entry.client_id;
}

export async function getAuthClient({ credentialsFile, setup } = {}) {
  const clientId = resolveClientId(credentialsFile);
  if (!clientId) throw new Error('No client ID configured. Set BUNDLED_CLIENT_ID or pass --credentials-file.');

  const stored = loadTokens();
  if (setup || !stored) {
    await runOAuthFlow(clientId);
  }

  const { tokens } = loadTokens();
  const client = new OAuth2Client({ clientId });
  client.setCredentials(tokens);

  client.on('tokens', (newTokens) => {
    const existing = loadTokens();
    saveTokens({ ...existing.tokens, ...newTokens }, clientId);
  });

  return client;
}

export async function getAccessToken(client) {
  try {
    const { token } = await client.getAccessToken();
    return token;
  } catch (err) {
    if (err.message?.includes('invalid_grant')) {
      throw new Error('Your GAM session has expired. Re-run with --setup to re-authenticate.');
    }
    throw err;
  }
}
