import { readFileSync, writeFileSync } from 'node:fs';

const path='tests/stance-gate5-input-seam.test.mjs';
const lines=readFileSync(path,'utf8').split('\n');
const index=lines.findIndex(line=>line.startsWith('assert.match(arena,/getPlayerForward'));
if(index<0)throw new Error('input seam test did not contain a facing assertion');
lines[index]="assert.match(arena,/getPlayerForward\\s*\\(\\)\\s*\\{\\s*return\\s*\\{\\s*x:\\s*Math\\.sin\\(actorFacing\\),\\s*z:\\s*Math\\.cos\\(actorFacing\\)\\s*\\};\\s*\\}/);";
writeFileSync(path,lines.join('\n'));
console.log('Adjusted authoritative-facing assertion');
