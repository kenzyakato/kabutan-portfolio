import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function checkTarget(env) {
  if (env.GITHUB_REPOSITORY !== 'kenzyakato/kabutan-portfolio') throw Error('Deployment is restricted to the Kabutan repository');
  if (env.GITHUB_REF !== 'refs/heads/main') throw Error('Only main may deploy');
  if (env.TINA_PUBLIC_CLIENT_ID !== '413ed129-73d5-4372-b05b-bd9e3c0c3989') throw Error('Tina project client ID is missing or incorrect');
  if (env.CLOUDFLARE_ACCOUNT_ID !== '6f3b62ae168d61fecc158a0129de4f89') throw Error('Cloudflare account must match the verified Kabutan account');
  if (env.CLOUDFLARE_PAGES_PROJECT_NAME !== 'kabutan-portfolio') throw Error('Cloudflare project must be kabutan-portfolio');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  checkTarget(process.env);
  console.log('Kabutan main deployment target variables validated');
}
