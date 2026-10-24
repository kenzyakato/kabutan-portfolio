import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
if (!process.env.TINA_PUBLIC_CLIENT_ID || !process.env.TINA_TOKEN) {
  throw new Error('Production admin requires TINA_PUBLIC_CLIENT_ID and a read-only TINA_TOKEN in the build environment. Use npm run build:site for credential-free site validation.');
}
