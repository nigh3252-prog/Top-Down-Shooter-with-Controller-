import assert from 'node:assert/strict';
import {
  HADES_ATTACKS,HADES_ENEMY_ARCHETYPES,HADES_TARTARUS_IDS,
  HADES_TARTARUS_POOL_ID,HADES_ENEMY_OPTIONS,isHadesSpawnKind,
} from '../src/hades-enemies.js';
import {
  createHadesEncounterPlan,isHadesPairCompatible,
} from '../src/hades-encounter-director.js';

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

for(const id of HADES_TARTARUS_IDS){
  const def=HADES_ENEMY_ARCHETYPES[id];
  assert.ok(def.encounterCost>0,`${id} needs encounterCost`);
  assert.ok(def.activeWeight>0,`${id} needs activeWeight`);
  assert.ok(def.territoryMode,`${id} needs territoryMode`);
  assert.ok(def.leashRadius>=def.homeRadius,`${id} leash must contain home radius`);
}

const early=createHadesEncounterPlan({depth:1,targetCount:6,random:()=>0});
assert.equal(early.typeIds.length,1);
assert.ok(early.entries.length<6);

let seed=17;
const random=()=>((seed=(seed*48271)%2147483647)/2147483647);
const later=createHadesEncounterPlan({depth:7,targetCount:6,random});
assert.ok(later.typeIds.length<=2);
assert.ok(later.entries.every(id=>later.typeIds.includes(id)));
assert.ok(later.entries.length>early.entries.length);
assert.ok(later.activeWeightCap>early.activeWeightCap);
assert.ok(later.pursuitWeightCap>=early.pursuitWeightCap);
assert.equal(isHadesPairCompatible('hadesWretchedPest','hadesWringer',6),false);
assert.equal(isHadesPairCompatible('hadesWretchedThug','hadesWretchedWitch',6),true);

console.log('Hades Tartarus enemy research and encounter planning: ok');
