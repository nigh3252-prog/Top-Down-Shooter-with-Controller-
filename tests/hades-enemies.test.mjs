import assert from 'node:assert/strict';
import {
  HADES_ATTACKS,HADES_ENEMY_ARCHETYPES,HADES_TARTARUS_IDS,
  HADES_TARTARUS_POOL_ID,HADES_ENEMY_OPTIONS,isHadesSpawnKind,
} from '../src/hades-enemies.js';

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
console.log('Hades Tartarus enemy research data: ok');
