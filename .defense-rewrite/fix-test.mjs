import { readFileSync, writeFileSync } from 'node:fs';

const path='tests/stance-gate5-input-seam.test.mjs';
let source=readFileSync(path,'utf8');
const before="assert.match(arena,/getPlayerForward\\(\\)\\{return\\{x:Math\\.sin\\(actorFacing\\),z:Math\\.cos\\(actorFacing\\)\\};\\}/);";
const after="assert.match(arena,/getPlayerForward\\s*\\(\\)\\s*\\{\\s*return\\s*\\{\\s*x:\\s*Math\\.sin\\(actorFacing\\),\\s*z:\\s*Math\\.cos\\(actorFacing\\)\\s*\\};\\s*\\}/);";
if(!source.includes(after)){
  if(!source.includes(before))throw new Error('input seam test did not contain the expected facing assertion');
  source=source.replace(before,after);
  writeFileSync(path,source);
}
console.log('Adjusted authoritative-facing assertion');
