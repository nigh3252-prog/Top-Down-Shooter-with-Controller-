import assert from 'node:assert/strict';
import {
  STANCE_CLASSES,
  STANCE_CLASS_BY_ID,
  getStanceClass,
  getWeaponClass,
  resolveStanceWeaponCompatibility,
  stanceClassCounts,
} from '../src/stance-compatibility.js';

assert.deepEqual(STANCE_CLASSES,['Light','Medium','Heavy']);
assert.equal(Object.keys(STANCE_CLASS_BY_ID).length,30);
for(let index=1;index<=30;index++){
  const id=`S${String(index).padStart(2,'0')}`;
  assert.ok(STANCE_CLASSES.includes(getStanceClass(id)),`${id} must have a valid stance class`);
}
assert.deepEqual(stanceClassCounts(),{Light:7,Medium:10,Heavy:13});

const dagger={id:'dagger',weightClass:'Light'};
const longsword={id:'longsword',weightClass:'Medium'};
const greatsword={id:'greatsword',weightClass:'Heavy'};
const ratStep={id:'S24',preferredWeapons:['dagger']};
const longBlade={id:'S26',preferredWeapons:['longsword','claymore']};
const hammerfall={id:'S01',preferredWeapons:['warhammer','mace']};

assert.equal(getWeaponClass({staminaClass:'Heavy'}),'Heavy');
assert.equal(resolveStanceWeaponCompatibility({stance:ratStep,weapon:dagger,weaponId:'dagger'}).tier,'full');
assert.equal(resolveStanceWeaponCompatibility({stance:ratStep,weapon:longsword,weaponId:'longsword'}).tier,'adapted');
assert.equal(resolveStanceWeaponCompatibility({stance:ratStep,weapon:greatsword,weaponId:'greatsword'}).tier,'unusable');
assert.equal(resolveStanceWeaponCompatibility({stance:longBlade,weapon:dagger,weaponId:'dagger'}).tier,'adapted');
assert.equal(resolveStanceWeaponCompatibility({stance:longBlade,weapon:longsword,weaponId:'longsword'}).tier,'full');
assert.equal(resolveStanceWeaponCompatibility({stance:longBlade,weapon:greatsword,weaponId:'greatsword'}).tier,'adapted');
assert.equal(resolveStanceWeaponCompatibility({stance:hammerfall,weapon:dagger,weaponId:'dagger'}).tier,'unusable');
assert.equal(resolveStanceWeaponCompatibility({stance:hammerfall,weapon:longsword,weaponId:'longsword'}).tier,'adapted');
assert.equal(resolveStanceWeaponCompatibility({stance:hammerfall,weapon:greatsword,weaponId:'greatsword'}).tier,'full');

const preferred=resolveStanceWeaponCompatibility({stance:ratStep,weapon:dagger,weaponId:'dagger'});
const offStyle=resolveStanceWeaponCompatibility({stance:ratStep,weapon:{id:'rapier',weightClass:'Light'},weaponId:'rapier'});
assert.equal(preferred.preferredWeapon,true);
assert.equal(offStyle.tier,'full');
assert.equal(offStyle.preferredWeapon,false);
assert.equal(resolveStanceWeaponCompatibility({stance:{id:'missing'},weapon:dagger}).tier,'unknown');

console.log('stance compatibility tests passed');
