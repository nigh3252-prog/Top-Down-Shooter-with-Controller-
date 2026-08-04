import { readFileSync, writeFileSync } from 'node:fs';

const seamPath='tests/stance-gate5-input-seam.test.mjs';
const lines=readFileSync(seamPath,'utf8').split('\n');
const index=lines.findIndex(line=>line.startsWith('assert.match(arena,/getPlayerForward'));
if(index<0)throw new Error('input seam test did not contain a facing assertion');
lines[index]="assert.match(arena,/getPlayerForward\\s*\\(\\)\\s*\\{\\s*return\\s*\\{\\s*x:\\s*Math\\.sin\\(actorFacing\\),\\s*z:\\s*Math\\.cos\\(actorFacing\\)\\s*\\};\\s*\\}/);";
writeFileSync(seamPath,lines.join('\n'));

const balancePath='src/weapon-balance.js';
let balance=readFileSync(balancePath,'utf8');
const delayedBoot="    const gate5=await import('./stance-gate5-defense.js');\n    gate5.installStanceGate5Runtime({windowRef:window});\n";
if(balance.includes(delayedBoot)){
  balance=balance.replace(delayedBoot,'');
  writeFileSync(balancePath,balance);
}
if(balance.includes("import('./stance-gate5-defense.js')"))throw new Error('delayed Gate 5 boot still exists');

writeFileSync('tests/hammerfall-shield-presentation.test.mjs',`import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const visuals=readFileSync(new URL('../src/stance-gate5-visuals.js',import.meta.url),'utf8');
assert.ok(visuals.includes('shield.scale.setScalar(1.8)'));
assert.ok(visuals.includes("const shieldStance=lastState.kind==='shield'"));
assert.ok(visuals.includes('return activeModel?.parent||activeModel'));
assert.ok(visuals.includes('guard:{position:new THREE.Vector3(-.42,1.48,1.30)'));
console.log('Hammerfall shield presentation tests passed');
`);

console.log('Adjusted integration checks and removed delayed Gate 5 boot');
