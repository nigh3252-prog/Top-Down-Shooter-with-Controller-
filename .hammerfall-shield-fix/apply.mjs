#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const write=(path,content)=>writeFileSync(path,content);
function replaceOnce(path,before,after,label){
  const source=read(path);
  if(source.includes(after))return false;
  const index=source.indexOf(before);
  if(index<0)throw new Error(`${path}: could not find ${label}`);
  if(source.indexOf(before,index+before.length)>=0)throw new Error(`${path}: ${label} was not unique`);
  write(path,source.slice(0,index)+after+source.slice(index+before.length));
  return true;
}

replaceOnce(
  'combat-arena.html',
  `  const light = bd(2)||bd(7);
  const heavy = bd(3);
  const shuffle = bd(1);
  const dge = bd(0)||bd(6);`,
  `  const hammerfallDefense = isHammerfallDefenseStance(arena.stance);
  // Backbone's physical X button is the west face button (standard index 2).
  // In Hammerfall it joins Cross / LT as defense instead of also starting a light attack.
  const light = (!hammerfallDefense&&bd(2))||bd(7);
  const heavy = bd(3);
  const shuffle = bd(1);
  const dge = bd(0)||bd(6)||(hammerfallDefense&&bd(2));`,
  'Hammerfall Backbone X routing',
);

replaceOnce(
  'src/stance-gate5-visuals.js',
  `    back:{position:new THREE.Vector3(0,1.72,-.72),rotation:new THREE.Euler(0,Math.PI,0)},
    side:{position:new THREE.Vector3(-1.12,1.34,.04),rotation:new THREE.Euler(0,Math.PI/2,.08)},
    guard:{position:new THREE.Vector3(-.16,1.52,1.05),rotation:new THREE.Euler(0,0,-.04)},`,
  `    back:{position:new THREE.Vector3(0,1.52,-.52),rotation:new THREE.Euler(0,Math.PI,.04)},
    side:{position:new THREE.Vector3(-.90,1.42,.12),rotation:new THREE.Euler(0,Math.PI/2,.08)},
    guard:{position:new THREE.Vector3(-.42,1.48,1.30),rotation:new THREE.Euler(0,0,-.06)},`,
  'player-relative shield poses',
);
replaceOnce(
  'src/stance-gate5-visuals.js',
  'shield.add(board,rim,boss);shield.scale.setScalar(.9);shield.visible=false;root.add(shield);',
  'shield.add(board,rim,boss);shield.scale.setScalar(1.8);shield.visible=false;root.add(shield);',
  'larger kite shield scale',
);
replaceOnce(
  'src/stance-gate5-visuals.js',
  '  function actorRoot(){return PC.combatLayer?.parent?.parent?.parent||PC.combatLayer?.parent?.parent||null;}',
  `  function actorRoot(){
    const activeModel=PC.combatLayer?.parent||null;
    // activeModel is parented to actorVisual, which owns the player's facing yaw.
    return activeModel?.parent||activeModel;
  }`,
  'player-facing visual parent',
);
replaceOnce(
  'src/stance-gate5-visuals.js',
  "    const hammerfall=lastState.stanceId==='S01';",
  "    const hammerfall=lastState.profileId==='hammerfall-shield'||lastState.stanceId==='S01';",
  'Hammerfall visual profile recognition',
);

const testPath='tests/hammerfall-shield-presentation.test.mjs';
const testSource=`import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const arena=readFileSync(new URL('../combat-arena.html',import.meta.url),'utf8');
assert.match(arena,/const hammerfallDefense = isHammerfallDefenseStance\\(arena\\.stance\\);/);
assert.match(arena,/const light = \\(!hammerfallDefense&&bd\\(2\\)\\)\\|\\|bd\\(7\\);/);
assert.match(arena,/const dge = bd\\(0\\)\\|\\|bd\\(6\\)\\|\\|\\(hammerfallDefense&&bd\\(2\\)\\);/);

const visuals=readFileSync(new URL('../src/stance-gate5-visuals.js',import.meta.url),'utf8');
assert.match(visuals,/shield\\.scale\\.setScalar\\(1\\.8\\)/);
assert.match(visuals,/const activeModel=PC\\.combatLayer\\?\\.parent\\|\\|null;/);
assert.match(visuals,/return activeModel\\?\\.parent\\|\\|activeModel;/);
assert.match(visuals,/guard:\\{position:new THREE\\.Vector3\\(-\\.42,1\\.48,1\\.30\\)/);
assert.match(visuals,/profileId==='hammerfall-shield'/);
assert.doesNotMatch(visuals,/parent\\?\\.parent\\?\\.parent\\|\\|PC\\.combatLayer/);

console.log('Hammerfall shield input and presentation tests passed');
`;
if(!existsSync(testPath))write(testPath,testSource);
else if(read(testPath)!==testSource)throw new Error(`${testPath}: already exists with different content`);

const pkg=JSON.parse(read('package.json'));
const command='node tests/hammerfall-shield-presentation.test.mjs';
if(typeof pkg.scripts?.['test:combat']!=='string')throw new Error('package.json: missing scripts.test:combat');
if(!pkg.scripts['test:combat'].includes(command)){
  pkg.scripts['test:combat']+=` && ${command}`;
  write('package.json',JSON.stringify(pkg,null,2)+'\n');
}

console.log('Hammerfall shield fix applied');
