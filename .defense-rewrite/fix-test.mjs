import { readFileSync, writeFileSync } from 'node:fs';

const testPath='tests/stance-gate5-input-seam.test.mjs';
const lines=readFileSync(testPath,'utf8').split('\n');
const index=lines.findIndex(line=>line.startsWith('assert.match(arena,/getPlayerForward'));
if(index<0)throw new Error('input seam test did not contain a facing assertion');
lines[index]="assert.match(arena,/getPlayerForward\\s*\\(\\)\\s*\\{\\s*return\\s*\\{\\s*x:\\s*Math\\.sin\\(actorFacing\\),\\s*z:\\s*Math\\.cos\\(actorFacing\\)\\s*\\};\\s*\\}/);";
writeFileSync(testPath,lines.join('\n'));

const balancePath='src/weapon-balance.js';
let balance=readFileSync(balancePath,'utf8');
const delayedBoot="    const gate5=await import('./stance-gate5-defense.js');\n    gate5.installStanceGate5Runtime({windowRef:window});\n";
if(balance.includes(delayedBoot)){
  balance=balance.replace(delayedBoot,'');
  writeFileSync(balancePath,balance);
}
if(balance.includes("import('./stance-gate5-defense.js')"))throw new Error('delayed Gate 5 boot still exists');
console.log('Adjusted integration assertions and removed delayed Gate 5 boot');
