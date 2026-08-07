import { readFileSync, writeFileSync } from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const write=(path,content)=>writeFileSync(path,content);
function replaceOnce(path,before,after,label){
  const source=read(path);
  if(source.includes(after))return;
  const count=source.split(before).length-1;
  if(count!==1)throw new Error(`${path}: expected one ${label}, found ${count}`);
  write(path,source.replace(before,after));
}
function insertBeforeOnce(path,marker,block,label){
  const source=read(path);
  if(source.includes(block.trim()))return;
  const count=source.split(marker).length-1;
  if(count!==1)throw new Error(`${path}: expected one ${label}, found ${count}`);
  write(path,source.replace(marker,`${block}\n\n${marker}`));
}
function replaceBetween(path,startMarker,endMarker,replacement,label){
  const source=read(path);
  const start=source.indexOf(startMarker),end=source.indexOf(endMarker,start);
  if(start<0||end<0)throw new Error(`${path}: could not locate ${label}`);
  write(path,source.slice(0,start)+replacement+source.slice(end));
}

// Gate 2: keep the nine approved pilot profiles as the canonical source data,
// then resolve every stance/weapon pair through its Light/Medium/Heavy class cell.
replaceOnce(
  'src/stance-gate2-runtime.js',
  `import { guardPoseFor } from './guard-poses.js';\nimport { resolveStanceWeaponCompatibility } from './stance-compatibility.js';`,
  `import { guardPoseFor } from './guard-poses.js';\nimport { resolveStanceWeaponCompatibility } from './stance-compatibility.js';\nimport { STONE_WEAPONS } from './weapons.js';`,
  'STONE_WEAPONS import',
);
const gate2ClassBlock=`const classPairKey=(stanceClass,weaponClass)=>\`${'${stanceClass}:${weaponClass}'}\`;\nexport const GATE2_CLASS_TEMPLATE_SOURCES=Object.freeze({\n  'Light:Light':'S24:dagger',\n  'Light:Medium':'S24:longsword',\n  'Light:Heavy':'S24:greatsword',\n  'Medium:Light':'S26:dagger',\n  'Medium:Medium':'S26:longsword',\n  'Medium:Heavy':'S26:greatsword',\n  'Heavy:Light':'S01:dagger',\n  'Heavy:Medium':'S01:longsword',\n  'Heavy:Heavy':'S01:greatsword',\n});\nexport const GATE2_CLASS_PAIR_TEMPLATES=Object.freeze(Object.fromEntries(\n  Object.entries(GATE2_CLASS_TEMPLATE_SOURCES).map(([key,sourcePair])=>[key,GATE2_PAIR_PROFILES[sourcePair]]),\n));\nfunction materializeClassTemplateProfile({template,pilotProfile,stanceId,weaponId,compatibility}={}){\n  if(!template)return null;\n  if(pilotProfile)return pilotProfile;\n  return freezeProfile({\n    ...template,\n    id:\`stance2-\${String(compatibility?.stanceClass||'unknown').toLowerCase()}-\${String(compatibility?.weaponClass||'unknown').toLowerCase()}-\${String(compatibility?.tier||'unknown')}\`,\n    sourceProfileId:template.id,\n    stanceId,weaponId,\n    label:\`${'${template.label}'} · CLASS TEMPLATE\`,\n  });\n}`;
insertBeforeOnce('src/stance-gate2-runtime.js','export function isGate2PilotPair',gate2ClassBlock,'Gate 2 class-template insertion point');
const gate2Resolver=`export function resolveGate2PilotProfile({stance,weapon,weaponId=''}={}){\n  const stanceId=String(stance?.id||stance||'');\n  const resolvedWeaponId=String(weaponId||weapon?.id||'');\n  const compatibility=resolveStanceWeaponCompatibility({stance,weapon,weaponId:resolvedWeaponId});\n  const pilotProfile=GATE2_PAIR_PROFILES[pairKey(stanceId,resolvedWeaponId)]||null;\n  const templateKey=classPairKey(compatibility.stanceClass,compatibility.weaponClass);\n  const template=GATE2_CLASS_PAIR_TEMPLATES[templateKey]||null;\n  const profile=materializeClassTemplateProfile({template,pilotProfile,stanceId,weaponId:resolvedWeaponId,compatibility});\n  const originalChain=BASELINE_CHAIN_BY_ID.get(stanceId)||Object.freeze([...(stance?.chain||[])]);\n  return Object.freeze({\n    active:!!profile&&compatibility.tier!=='unknown',\n    stanceId,\n    weaponId:resolvedWeaponId,\n    compatibility,\n    templateKey,\n    sourceProfileId:profile?.sourceProfileId||profile?.id||null,\n    profile,\n    effectiveChain:Object.freeze([...(profile?.moveKeys||originalChain)]),\n  });\n}\n`;
replaceBetween('src/stance-gate2-runtime.js','export function resolveGate2PilotProfile','\n\nfunction materializeFailureAttack',gate2Resolver,'Gate 2 resolver');
replaceOnce(
  'src/stance-gate2-runtime.js',
  `    if(!stance||!isGate2PilotPair(stance.id,requestedWeapon))return{ok:false,error:'Unknown Gate 2 pilot pair'};`,
  `    if(!stance||!STONE_WEAPONS[requestedWeapon])return{ok:false,error:'Unknown Stance 2 pair'};`,
  'universal pair selector',
);
replaceOnce(
  'src/stance-gate2-runtime.js',
  `      label:resolved.profile?.label||'OUTSIDE GATE 2 PILOT',`,
  `      label:resolved.profile?.label||'UNKNOWN STANCE 2 PAIR',`,
  'universal snapshot label',
);

// Movement: the same nine pilot cells are now class-pair templates for every stance.
const movementClassBlock=`const movementClassPairKey=(stanceClass,weaponClass)=>\`${'${stanceClass}:${weaponClass}'}\`;\nexport const STANCE_MOVEMENT_CLASS_TEMPLATE_SOURCES=Object.freeze({\n  'Light:Light':'S24:dagger',\n  'Light:Medium':'S24:longsword',\n  'Light:Heavy':'S24:greatsword',\n  'Medium:Light':'S26:dagger',\n  'Medium:Medium':'S26:longsword',\n  'Medium:Heavy':'S26:greatsword',\n  'Heavy:Light':'S01:dagger',\n  'Heavy:Medium':'S01:longsword',\n  'Heavy:Heavy':'S01:greatsword',\n});\nexport const STANCE_MOVEMENT_CLASS_TEMPLATES=Object.freeze(Object.fromEntries(\n  Object.entries(STANCE_MOVEMENT_CLASS_TEMPLATE_SOURCES).map(([key,sourcePair])=>[key,STANCE_MOVEMENT_PROFILES[sourcePair]]),\n));\nfunction materializeMovementTemplate(template,pilotProfile,stanceId,weaponId,gate2){\n  if(!template)return null;\n  if(pilotProfile)return pilotProfile;\n  return freezeProfile({\n    ...template,\n    id:\`stance2-movement-\${String(gate2?.compatibility?.stanceClass||'unknown').toLowerCase()}-\${String(gate2?.compatibility?.weaponClass||'unknown').toLowerCase()}\`,\n    sourceProfileId:template.id,\n    stanceId,weaponId,\n  });\n}`;
insertBeforeOnce('src/stance-movement-profiles.js','export function resolveStanceMovementProfile',movementClassBlock,'movement class-template insertion point');
const movementResolver=`export function resolveStanceMovementProfile({stance,weapon,weaponId=''}={}){\n  const stanceId=String(stance?.id||stance||'');\n  const resolvedWeaponId=String(weaponId||weapon?.id||'');\n  const gate2=resolveGate2PilotProfile({stance,weapon,weaponId:resolvedWeaponId});\n  const pilotProfile=STANCE_MOVEMENT_PROFILES[pairKey(stanceId,resolvedWeaponId)]||null;\n  const templateKey=movementClassPairKey(gate2.compatibility.stanceClass,gate2.compatibility.weaponClass);\n  const template=STANCE_MOVEMENT_CLASS_TEMPLATES[templateKey]||null;\n  const profile=materializeMovementTemplate(template,pilotProfile,stanceId,resolvedWeaponId,gate2);\n  return Object.freeze({active:!!profile&&gate2.active,stanceId,weaponId:resolvedWeaponId,templateKey,gate2,profile});\n}\n`;
replaceBetween('src/stance-movement-profiles.js','export function resolveStanceMovementProfile','\n\nexport function movementMultiplierDuringAttack',movementResolver,'movement resolver');

// Gate 3: matched classes inherit the already-approved Light/Medium/Heavy payoff.
const gate3ClassBlock=`export const GATE3_FULL_CLASS_PAYOFFS=Object.freeze({\n  Light:GATE3_FULL_PAYOFFS[pairKey('S24','dagger')],\n  Medium:GATE3_FULL_PAYOFFS[pairKey('S26','longsword')],\n  Heavy:GATE3_FULL_PAYOFFS[pairKey('S01','greatsword')],\n});\nfunction materializeFullClassPayoff(template,pilotPayoff,stanceId,weaponId,gate2){\n  if(!template)return null;\n  if(pilotPayoff)return pilotPayoff;\n  return freezePayoff({\n    ...template,\n    id:\`stance2-full-\${String(gate2?.compatibility?.stanceClass||'unknown').toLowerCase()}\`,\n    sourcePayoffId:template.id,\n    stanceId,weaponId,\n  });\n}`;
insertBeforeOnce('src/stance-gate3-payoffs.js','export function resolveGate3FullPayoff',gate3ClassBlock,'Gate 3 class payoff insertion point');
const gate3Resolver=`export function resolveGate3FullPayoff({stance,weapon,weaponId=''}={}){\n  const stanceId=String(stance?.id||stance||'');\n  const resolvedWeaponId=String(weaponId||weapon?.id||'');\n  const gate2=resolveGate2PilotProfile({stance,weapon,weaponId:resolvedWeaponId});\n  const pilotPayoff=GATE3_FULL_PAYOFFS[pairKey(stanceId,resolvedWeaponId)]||null;\n  const template=gate2.compatibility.tier==='full'?GATE3_FULL_CLASS_PAYOFFS[gate2.compatibility.stanceClass]||null:null;\n  const payoff=materializeFullClassPayoff(template,pilotPayoff,stanceId,resolvedWeaponId,gate2);\n  return Object.freeze({\n    active:!!payoff&&gate2.active&&gate2.compatibility.tier==='full',\n    stanceId,\n    weaponId:resolvedWeaponId,\n    gate2,\n    payoff,\n  });\n}\n`;
replaceBetween('src/stance-gate3-payoffs.js','export function resolveGate3FullPayoff','\n\nexport function cleaveModeForGate3Expression',gate3Resolver,'Gate 3 resolver');

// Existing tests: update the handful of assertions that intentionally treated non-pilot cards as inactive.
replaceOnce(
  'tests/stance-gate2-runtime.test.mjs',
  `assert.equal(resolveGate2PilotProfile({stance:stanceById('S23'),weapon:STONE_WEAPONS.longsword,weaponId:'longsword'}).active,false);`,
  `assert.equal(resolveGate2PilotProfile({stance:stanceById('S23'),weapon:STONE_WEAPONS.longsword,weaponId:'longsword'}).active,true);`,
  'Gate 2 non-pilot resolver expectation',
);
replaceOnce(
  'tests/stance-gate2-runtime.test.mjs',
  `assert.equal(runtime.snapshot().active,false);\nfor(const key of ['weight','windup','follow','recovery']){\n  assert.equal(combatState.tune[key],STONE_WEAPONS.greatsword.tune[key],\`non-pilot \${key} tuning must remain untouched\`);\n}`,
  `assert.equal(runtime.snapshot().active,true);\nassert.equal(runtime.snapshot().failed,true,'Light stance + Heavy weapon should inherit the Rat Step + Greatsword failure template');\nassert.deepEqual(arena.stance.chain,[GATE2_FAILURE_ATTACKS.tooHeavy,GATE2_FAILURE_ATTACKS.tooHeavy,GATE2_FAILURE_ATTACKS.tooHeavy]);`,
  'Gate 2 non-pilot runtime expectation',
);
replaceOnce(
  'tests/stance-gate2-runtime.test.mjs',
  `assert.equal(runtime.selectPair({stanceId:'S02',weaponId:'dagger'}).ok,false);`,
  `assert.equal(runtime.selectPair({stanceId:'S02',weaponId:'dagger'}).ok,true);\nassert.equal(runtime.snapshot().failed,true,'Heavy stance + Light weapon should inherit the Hammerfall + Dagger failure template');`,
  'Gate 2 universal selector expectation',
);
replaceOnce(
  'tests/stance-gate3-payoffs.test.mjs',
  `assert.equal(cleaveModeForGate3Expression(pair('S23','dagger')),null);`,
  `assert.equal(cleaveModeForGate3Expression(pair('S23','dagger')),'full-light');`,
  'Gate 3 non-pilot cleave expectation',
);
replaceOnce(
  'tests/stance-gate3-payoffs.test.mjs',
  `  assert.equal(runtime.snapshot().active,false);\n  assert.equal(Object.hasOwn(STONE_WEAPONS.greatsword,'stance2CleaveMode'),false,'leaving the pilot should restore the modified weapon');`,
  `  assert.equal(runtime.snapshot().active,true);\n  assert.equal(runtime.snapshot().payoffId,'stance2-full-light');\n  assert.equal(STONE_WEAPONS.dagger.stance2CleaveMode,'full-light');\n  assert.equal(Object.hasOwn(STONE_WEAPONS.greatsword,'stance2CleaveMode'),false,'switching class templates should restore the modified weapon');`,
  'Gate 3 universal full payoff expectation',
);

const rolloutTest=`import assert from 'node:assert/strict';\nimport { STANCE_CARDS } from '../src/stance-cards.js';\nimport { STONE_WEAPONS } from '../src/weapons.js';\nimport { getStanceClass, getWeaponClass } from '../src/stance-compatibility.js';\nimport { GATE2_CLASS_PAIR_TEMPLATES, GATE2_FAILURE_ATTACKS, resolveGate2PilotProfile } from '../src/stance-gate2-runtime.js';\nimport { STANCE_MOVEMENT_CLASS_TEMPLATES, resolveStanceMovementProfile } from '../src/stance-movement-profiles.js';\nimport { GATE3_FULL_CLASS_PAYOFFS, resolveGate3FullPayoff } from '../src/stance-gate3-payoffs.js';\n\nassert.equal(Object.keys(GATE2_CLASS_PAIR_TEMPLATES).length,9);\nassert.equal(Object.keys(STANCE_MOVEMENT_CLASS_TEMPLATES).length,9);\nassert.equal(Object.keys(GATE3_FULL_CLASS_PAYOFFS).length,3);\n\nlet checked=0;\nfor(const stance of STANCE_CARDS){\n  const stanceClass=getStanceClass(stance);\n  assert.ok(stanceClass,\`\${stance.id} must have a stance class\`);\n  for(const [weaponId,weapon] of Object.entries(STONE_WEAPONS)){\n    const weaponClass=getWeaponClass(weapon);\n    assert.ok(weaponClass,\`\${weaponId} must have a weapon class\`);\n    const gate2=resolveGate2PilotProfile({stance,weapon,weaponId});\n    assert.equal(gate2.active,true,\`\${stance.id}/\${weaponId} should resolve through the class template\`);\n    assert.equal(gate2.templateKey,\`\${stanceClass}:\${weaponClass}\`);\n    assert.equal(gate2.profile.tier,gate2.compatibility.tier);\n    assert.equal(gate2.effectiveChain.length,3);\n    const movement=resolveStanceMovementProfile({stance,weapon,weaponId});\n    assert.equal(movement.active,true,\`\${stance.id}/\${weaponId} should inherit a movement template\`);\n    assert.equal(movement.templateKey,\`\${stanceClass}:\${weaponClass}\`);\n    if(stanceClass===weaponClass){\n      assert.deepEqual(gate2.effectiveChain,stance.chain,\`\${stance.id}/\${weaponId} full expression should keep the stance-authored chain\`);\n      assert.equal(resolveGate3FullPayoff({stance,weapon,weaponId}).active,true);\n    }\n    if(stanceClass==='Light'&&weaponClass==='Heavy')assert.ok(gate2.effectiveChain.every(key=>key===GATE2_FAILURE_ATTACKS.tooHeavy));\n    if(stanceClass==='Heavy'&&weaponClass==='Light')assert.ok(gate2.effectiveChain.every(key=>key===GATE2_FAILURE_ATTACKS.tooLight));\n    checked++;\n  }\n}\nassert.equal(checked,STANCE_CARDS.length*Object.keys(STONE_WEAPONS).length);\n\nconst lightMedium=resolveGate2PilotProfile({stance:STANCE_CARDS.find(s=>s.id==='S23'),weapon:STONE_WEAPONS.katana,weaponId:'katana'});\nassert.equal(lightMedium.sourceProfileId,'rat-step-longsword-adapted');\nassert.deepEqual(lightMedium.effectiveChain,['vertical10','stab3','horizontal3']);\nconst mediumHeavy=resolveGate2PilotProfile({stance:STANCE_CARDS.find(s=>s.id==='S03'),weapon:STONE_WEAPONS.battleaxe,weaponId:'battleaxe'});\nassert.equal(mediumHeavy.sourceProfileId,'long-blade-greatsword-adapted');\nassert.deepEqual(mediumHeavy.effectiveChain,['vertical10','stab5','horizontal6']);\nconst heavyMediumMovement=resolveStanceMovementProfile({stance:STANCE_CARDS.find(s=>s.id==='S02'),weapon:STONE_WEAPONS.mace,weaponId:'mace'});\nassert.equal(heavyMediumMovement.profile.sourceProfileId,'hammerfall-longsword-planted');\nassert.equal(heavyMediumMovement.profile.recoveryDuration,.32);\nassert.equal(heavyMediumMovement.profile.recoveryHold,.10);\nconst fullHeavy=resolveGate3FullPayoff({stance:STANCE_CARDS.find(s=>s.id==='S02'),weapon:STONE_WEAPONS.battleaxe,weaponId:'battleaxe'});\nassert.equal(fullHeavy.active,true);\nassert.equal(fullHeavy.payoff.sourcePayoffId,'heavy-breaking-form');\nassert.equal(fullHeavy.payoff.staggerMult,2);\n\nconsole.log(\`Stance 2 class-template rollout tests passed across \${checked} stance/weapon pairs.\`);\n`;
write('tests/stance-class-template-rollout.test.mjs',rolloutTest);

const pkg=JSON.parse(read('package.json'));
const rolloutCmd='node tests/stance-class-template-rollout.test.mjs';
if(!pkg.scripts['test:combat'].includes(rolloutCmd))pkg.scripts['test:combat']+=` && ${rolloutCmd}`;
write('package.json',JSON.stringify(pkg,null,2)+'\n');

const doc=`# Stance 2.0 Class Template Rollout\n\nThe approved Rat Step / Long Blade Form / Hammerfall Guard × Dagger / Longsword / Greatsword pilot is the canonical class behavior matrix for all stance attacks.\n\n| Stance class | Light weapon | Medium weapon | Heavy weapon |\n| --- | --- | --- | --- |\n| Light | Rat Step + Dagger | Rat Step + Longsword | Rat Step + Greatsword |\n| Medium | Long Blade + Dagger | Long Blade + Longsword | Long Blade + Greatsword |\n| Heavy | Hammerfall + Dagger | Hammerfall + Longsword | Hammerfall + Greatsword |\n\nEvery one of the 30 stance cards resolves through this matrix using its existing Light / Medium / Heavy classification. Every weapon definition with a weight class resolves through the same matrix, including the Light Whip even though it is outside the main ten-weapon order.\n\nThe nine pilot cells remain the source data. Same-class cells keep each stance's authored three-move chain. Adapted cells use the approved alternate chain, grip, pacing, reach, damage, stagger, and movement profile from their source pilot cell. Light + Heavy and Heavy + Light use the approved failed-use attacks. Matched Light, Medium, and Heavy pairs also inherit the corresponding Gate 3 payoff.\n\nDefense assignment is a separate stance-ID layer and does not change this attack/weight behavior.\n`;
write('docs/design/STANCE_2_CLASS_TEMPLATE.md',doc);

const stanceDoc='docs/design/STANCE_2.md';
let stanceText=read(stanceDoc);
const note=`\n### Canonical class-template rollout\n\nThe tested 3×3 pilot is now the canonical attack/movement template for the complete roster. All 30 stances and every weighted weapon resolve by stance class × weapon class; no new pair-specific behavior is invented during rollout. Same-class pairs retain the stance-authored chain, adapted and failed pairs inherit the approved pilot-cell expression, and matched-class Gate 3 payoffs apply by class. See \`STANCE_2_CLASS_TEMPLATE.md\`.\n`;
if(!stanceText.includes('### Canonical class-template rollout')){
  const marker='\n### Full expression\n';
  if(!stanceText.includes(marker))throw new Error('STANCE_2.md: missing Full expression marker');
  stanceText=stanceText.replace(marker,`${note}${marker}`);
  write(stanceDoc,stanceText);
}

console.log('Stance 2 class-template rollout patch applied');
