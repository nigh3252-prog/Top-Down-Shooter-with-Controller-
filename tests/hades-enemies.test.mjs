import assert from 'node:assert/strict';
import {
  HADES_ATTACKS,HADES_ENEMY_ARCHETYPES,HADES_TARTARUS_IDS,
  HADES_TARTARUS_POOL_ID,HADES_ENEMY_OPTIONS,isHadesSpawnKind,
} from '../src/hades-enemies.js';
import {
  createHadesEncounterPlan,isHadesPairCompatible,
} from '../src/hades-encounter-director.js';
import {
  HADES_DIFFICULTY_RAMP_PRESETS,HADES_SPAWN_MULTIPLIERS,
  getHadesProgressionDepth,normalizeHadesDifficultyRamp,normalizeHadesSpawnMultiplier,
  setHadesEncounterSpawnMultiplier,setHadesNativeModeActive,
} from '../src/hades-encounter-tuning.js';
import { FUSION_ENEMY_OPTIONS } from '../src/fusion-enemies.js';

assert.equal(HADES_TARTARUS_IDS.length,8);
assert.deepEqual(HADES_TARTARUS_IDS,[
  'hadesWretchedThug','hadesWretchedWitch','hadesWretchedLout','hadesWretchedPest',
  'hadesNumbskull','hadesSkullomat','hadesWringer','hadesBrimstone',
]);
assert.equal(HADES_ENEMY_ARCHETYPES.hadesWretchedThug.source.health,160);
assert.equal(HADES_ENEMY_ARCHETYPES.hadesWretchedWitch.source.baseDamage,5);
assert.equal(HADES_ENEMY_ARCHETYPES.hadesWretchedLout.source.health,210);
assert.equal(HADES_ENEMY_ARCHETYPES.hadesWretchedPest.source.combatStyle,'Traps');
assert.equal(HADES_ENEMY_ARCHETYPES.hadesNumbskull.source.health,30);
assert.equal(HADES_ENEMY_ARCHETYPES.hadesSkullomat.summonId,'hadesNumbskull');
assert.equal(HADES_ATTACKS.hadesWringerGrab.restrain,1);
assert.equal(HADES_ATTACKS.hadesBrimstoneBeam.beamTicks,17);
assert.ok(HADES_ATTACKS.hadesLoutCharge.uninterruptible);
assert.ok(isHadesSpawnKind(HADES_TARTARUS_POOL_ID));
assert.ok(HADES_ENEMY_OPTIONS.some(option=>option.id==='hadesBrimstone'));
assert.ok(FUSION_ENEMY_OPTIONS.some(option=>option.id===HADES_TARTARUS_POOL_ID));

assert.deepEqual(HADES_SPAWN_MULTIPLIERS,[1,2,5,10]);
assert.equal(HADES_DIFFICULTY_RAMP_PRESETS.slow.depthScale,1);
assert.equal(HADES_DIFFICULTY_RAMP_PRESETS.medium.depthScale,2);
assert.equal(HADES_DIFFICULTY_RAMP_PRESETS.high.depthScale,4);
assert.equal(normalizeHadesSpawnMultiplier(5),5);
assert.equal(normalizeHadesSpawnMultiplier(7),1);
assert.equal(normalizeHadesDifficultyRamp('HIGH'),'high');
assert.equal(normalizeHadesDifficultyRamp('extreme'),'slow');
assert.equal(getHadesProgressionDepth(4,'slow'),4);
assert.equal(getHadesProgressionDepth(4,'medium'),7);
assert.equal(getHadesProgressionDepth(4,'high'),13);

for(const id of HADES_TARTARUS_IDS){
  const def=HADES_ENEMY_ARCHETYPES[id];
  assert.ok(def.encounterCost>0,`${id} needs encounterCost`);
  assert.ok(def.activeWeight>0,`${id} needs activeWeight`);
  assert.ok(def.territoryMode,`${id} needs territoryMode`);
  assert.ok(def.leashRadius>=def.homeRadius,`${id} leash must contain home radius`);
}

const early=createHadesEncounterPlan({depth:1,targetCount:6,spawnMultiplier:1,difficultyRamp:'slow',random:()=>0});
assert.equal(early.typeIds.length,1);
assert.ok(early.entries.length<6);
assert.equal(early.progressionDepth,1);

let seed=17;
const random=()=>((seed=(seed*48271)%2147483647)/2147483647);
const later=createHadesEncounterPlan({depth:7,targetCount:6,spawnMultiplier:1,difficultyRamp:'slow',random});
assert.ok(later.typeIds.length<=2);
assert.ok(later.entries.every(id=>later.typeIds.includes(id)));
assert.ok(later.entries.length>early.entries.length);
assert.ok(later.activeWeightCap>early.activeWeightCap);
assert.ok(later.pursuitWeightCap>=early.pursuitWeightCap);
assert.equal(isHadesPairCompatible('hadesWretchedPest','hadesWringer',6),false);
assert.equal(isHadesPairCompatible('hadesWretchedThug','hadesWretchedWitch',6),true);

const baseline=createHadesEncounterPlan({depth:3,targetCount:6,spawnMultiplier:1,difficultyRamp:'slow',random:()=>0});
for(const multiplier of [2,5,10]){
  const scaled=createHadesEncounterPlan({depth:3,targetCount:6,spawnMultiplier:multiplier,difficultyRamp:'slow',random:()=>0});
  assert.equal(scaled.entries.length,baseline.entries.length*multiplier);
  assert.equal(scaled.activeWeightCap,baseline.activeWeightCap*multiplier);
  assert.equal(scaled.pursuitWeightCap,baseline.pursuitWeightCap*multiplier);
  assert.equal(scaled.simultaneousTelegraphs,baseline.simultaneousTelegraphs*multiplier);
}

const slow=createHadesEncounterPlan({depth:3,targetCount:6,spawnMultiplier:1,difficultyRamp:'slow',random:()=>.99});
const medium=createHadesEncounterPlan({depth:3,targetCount:6,spawnMultiplier:1,difficultyRamp:'medium',random:()=>.99});
const high=createHadesEncounterPlan({depth:3,targetCount:6,spawnMultiplier:1,difficultyRamp:'high',random:()=>.99});
assert.equal(slow.progressionDepth,3);
assert.equal(medium.progressionDepth,5);
assert.equal(high.progressionDepth,9);
assert.ok(medium.entries.length>=slow.entries.length);
assert.ok(high.entries.length>=medium.entries.length);
assert.ok(high.typeIds.every(id=>HADES_ENEMY_ARCHETYPES[id].introductionDepth<=high.progressionDepth));

const baseCaps=new Map(HADES_TARTARUS_IDS.map(id=>[id,HADES_ENEMY_ARCHETYPES[id].maxActive]));
setHadesEncounterSpawnMultiplier(5,{persist:false});
setHadesNativeModeActive(true);
for(const [id,base] of baseCaps)assert.equal(HADES_ENEMY_ARCHETYPES[id].maxActive,base*5);
setHadesNativeModeActive(false);
for(const [id,base] of baseCaps)assert.equal(HADES_ENEMY_ARCHETYPES[id].maxActive,base);
setHadesEncounterSpawnMultiplier(1,{persist:false});

console.log('Hades Tartarus native routing, encounter density, and difficulty ramp: ok');
