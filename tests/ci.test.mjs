import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import YAML from 'js-yaml';
import {checkTarget} from '../scripts/check-ci-target.mjs';

test('deployment target rejects other repositories, branches and unconfigured destinations',() => {
  const env={GITHUB_REPOSITORY:'kenzyakato/kabutan-portfolio',GITHUB_REF:'refs/heads/main',TINA_PUBLIC_CLIENT_ID:'413ed129-73d5-4372-b05b-bd9e3c0c3989',CLOUDFLARE_ACCOUNT_ID:'6f3b62ae168d61fecc158a0129de4f89',CLOUDFLARE_PAGES_PROJECT_NAME:'kabutan-portfolio'};
  assert.doesNotThrow(()=>checkTarget(env));
  for(const [key,value] of [['GITHUB_REPOSITORY','kenzyakato/another-repo'],['GITHUB_REF','refs/heads/other'],['TINA_PUBLIC_CLIENT_ID','other-project'],['CLOUDFLARE_ACCOUNT_ID',''],['CLOUDFLARE_PAGES_PROJECT_NAME','bad project;command']]) assert.throws(()=>checkTarget({...env,[key]:value}));
});

test('workflow pins actions, restricts main and isolates build/deploy credentials',async () => {
  const workflow=YAML.load(await readFile(new URL('../.github/workflows/deploy-pages.yml',import.meta.url),'utf8'));
  assert.deepEqual(workflow.permissions,{contents:'read'});
  assert.deepEqual(workflow.on.push.branches,['main']);
  assert.ok(!workflow.on.pull_request&&!workflow.on.pull_request_target);
  const job=workflow.jobs.publish;
  assert.match(job.if,/github\.repository == 'kenzyakato\/kabutan-portfolio'/);
  assert.match(job.if,/github\.ref == 'refs\/heads\/main'/);
  for(const step of job.steps.filter(s=>s.uses)) assert.match(step.uses,/@[a-f0-9]{40}$/);
  assert.equal(job.steps[0].with['persist-credentials'],false);
  const build=job.steps.find(s=>s.run==='npm run build');
  const deploy=job.steps.find(s=>s.with?.command);
  assert.equal(build.env.TINA_TOKEN,'${{ secrets.TINA_TOKEN }}');
  assert.ok(!JSON.stringify(build).includes('CLOUDFLARE_API_TOKEN'));
  assert.equal(deploy.with.apiToken,'${{ secrets.CLOUDFLARE_API_TOKEN }}');
  assert.ok(!JSON.stringify(deploy).includes('secrets.TINA_TOKEN'));
  assert.ok(!deploy.with.gitHubToken);
  assert.match(deploy.with.command,/^pages deploy dist .*--branch=main$/);
});
