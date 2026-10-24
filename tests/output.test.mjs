import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {verifyOutput} from '../scripts/verify-output.mjs';

test('publish guard rejects dev admin and credential leaks without printing values',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'kabutan-output-'));
  try {
    await mkdir(path.join(dir,'admin'));
    await writeFile(path.join(dir,'index.html'),'<html>ready</html>');
    await writeFile(path.join(dir,'admin/index.html'),'<script src="http://localhost:4001/admin/src/main.tsx"></script>');
    await assert.rejects(verifyOutput(dir,''),/Development admin/);
    await writeFile(path.join(dir,'admin/index.html'),'<script src="/admin/assets/index.js"></script>');
    await assert.doesNotReject(verifyOutput(dir,''));
    // Deliberately synthetic data, not a service credential.
    const probe='NOT_A_REAL_CREDENTIAL_FOR_UNIT_TEST';
    await writeFile(path.join(dir,'admin/index.js'),probe);
    await assert.rejects(verifyOutput(dir,probe),/Build credential detected/);
  } finally {await rm(dir,{recursive:true,force:true});}
});
