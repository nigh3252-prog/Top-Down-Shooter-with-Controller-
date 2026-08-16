import assert from 'node:assert/strict';
import { STONE_WEAPONS } from '../src/weapons.js';
import {
  WEAPON_STANCE_AXIS,
  WEAPON_STANCE_BALANCE_MATRIX,
  getWeaponStanceBalance,
  stanceAxisForClass,
} from '../src/weapon-stance-plan.js';

assert.deepEqual(WEAPON_STANCE_AXIS, ['Speed', 'Balanced', 'Power']);
assert.equal(stanceAxisForClass('Light'), 'Speed');
assert.equal(stanceAxisForClass('balanced'), 'Balanced');
assert.equal(stanceAxisForClass('POWER'), 'Power');
assert.equal(stanceAxisForClass('missing'), null);

const axisRank={Speed:0,Balanced:1,Power:2};
const weaponClassToAxis={Light:'Speed',Medium:'Balanced',Heavy:'Power'};
const expectedFit=(weaponClass,axis)=>{
  const distance=Math.abs(axisRank[axis]-axisRank[weaponClassToAxis[weaponClass]]);
  return distance===0?'full':distance===1?'adapted':'unusable';
};

assert.deepEqual(new Set(Object.keys(WEAPON_STANCE_BALANCE_MATRIX)), new Set(Object.keys(STONE_WEAPONS)));
for(const [weaponId,weapon] of Object.entries(STONE_WEAPONS)){
  for(const axis of WEAPON_STANCE_AXIS){
    const entry=getWeaponStanceBalance({weaponId,stanceClass:axis});
    assert.ok(entry, `${weaponId}/${axis} should have a matrix entry`);
    assert.equal(entry.fit, expectedFit(weapon.weightClass,axis), `${weaponId}/${axis} fit should follow the class distance`);
    assert.ok(Number.isFinite(entry.tempo.attack));
    assert.ok(Number.isFinite(entry.tempo.recovery));
    assert.ok(entry.summary.length>20);
  }
}

const attackScale=(weaponId,axis)=>{
  const weapon=STONE_WEAPONS[weaponId];
  const entry=getWeaponStanceBalance({weaponId,stanceClass:axis});
  const tune=weapon.tune;
  const core=1+(tune.length-1)*.36+(tune.weight-.35)*.78;
  return core*tune.windup*entry.tempo.attack;
};

assert.ok(attackScale('dagger','Speed')<attackScale('rapier','Speed'),'Dagger Speed should remain faster than Rapier Speed');
assert.ok(attackScale('dagger','Speed')<attackScale('spear','Speed'),'Dagger Speed should remain faster than Spear Speed');
assert.ok(attackScale('greatsword','Balanced')>attackScale('spear','Speed'),'Greatsword Balanced should remain slower than Spear Speed');
assert.ok(attackScale('greatsword','Power')>attackScale('greatsword','Balanced'),'Power should not make Greatsword faster than Balanced');
assert.ok(attackScale('mace','Power')>attackScale('mace','Balanced'),'Power should add commitment to Mace');
assert.equal(getWeaponStanceBalance({weaponId:'not-a-weapon',stanceClass:'Speed'}), null);

console.log('weapon stance balance matrix tests passed');
