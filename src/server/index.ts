import { existsSync } from 'node:fs';
import path from 'node:path';
import { createApp } from './app';
import { createCoreClient } from './core-client';

if (existsSync('.env')) process.loadEnvFile('.env');

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable ${name}`);
    process.exit(1);
  }
  return value;
}

/** Empty/unset: trust nothing; a number: that many hops; otherwise Express's own syntax (loopback, IPs, CIDRs). */
function parseTrustProxy(value: string | undefined): boolean | number | string {
  if (!value) return false;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

const core = createCoreClient(required('CORE_URL'), required('API_KEY'));
const port = Number(process.env.PORT || 8082);
// dist/node/server/ -> dist/client; absent in dev, where vite serves the client.
const clientDir = path.resolve(__dirname, '../../client');

const app = createApp({
  core,
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  staticDir: existsSync(clientDir) ? clientDir : undefined,
});

app.listen(port, () => {
  console.info(`aurora-info listening on :${port}`);
});
