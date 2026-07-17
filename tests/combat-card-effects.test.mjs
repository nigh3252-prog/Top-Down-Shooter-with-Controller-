import assert from 'node:assert/strict';
import {
  BLOOD_SLASH_MAX_CHARGES,
  BING_BONG_STANCE_ID,
  BING_BONG_STUN_DURATION,
  MOVEMENT_BLEED,
  bingBongProfile,
  concussionCoefficient,
  contactTagsForZone,
  consumeBloodSlashCharge,
  createAttackExecution,
  pointInRadius,
  selectCapturedHitCandidate,
} from '../src/combat-card-effects.js';

assert.equal(BLOOD_SLASH_MAX_CHARGES,3);
assert.equal(BING_BONG_STANCE_ID,'S31-BING-BONG');
assert.equal(BING_BONG_STUN_DURATION,3);
assert.equal(MOVEMENT_BLEED.duration,5);

// Bing Bong is semantic-tag driven, not inferred from a broad damage type.
assert.equal(contactTagsForZone({id:'katanaHa',type:'slice'}).includes('blunt'),false);
assert.equal(contactTagsForZone({id:'katanaKissaki',type:'pierce'}).includes('blunt'),false);
assert.equal(contactTagsForZone({id:'katanaTsuba',type:'blunt'}).includes('blunt'),false);
assert.equal(concussionCoefficient({id:'katanaTsuba',type:'blunt'}),0);
assert.equal(bingBongProfile(30,0),null);
assert.equal(contactTagsForZone({id:'maceHead',type:'hybrid'}).includes('blunt'),true);
assert.ok(concussionCoefficient({id:'maceHead',type:'hybrid'})>.9);
assert.equal(contactTagsForZone({id:'spearShaft',type:'blunt'}).includes('blunt'),true);

const mace=bingBongProfile(31,concussionCoefficient({id:'maceHead',type:'hybrid'}));
const hammer=bingBongProfile(70,concussionCoefficient({id:'hammerHead',type:'blunt'}));
assert.ok(mace.range>=10);
assert.ok(hammer.range>mace.range);
assert.ok(hammer.range<=14.5);
assert.equal(mace.stun,3);

// The final charge belongs only to its execution. Reusing the same authored
// attack key afterward creates a normal execution with no Blood Slash state.
let charges=1;
const finalUse=consumeBloodSlashCharge(charges,'horizontal');
charges=finalUse.charges;
assert.deepEqual(finalUse,{charges:0,spent:true,empowered:true});
const nextUse=consumeBloodSlashCharge(charges,'horizontal');
assert.deepEqual(nextUse,{charges:0,spent:false,empowered:false});
const finalExecution=createAttackExecution({id:1,attackKey:'horizontal5',group:'horizontal',weaponId:'katana',stanceId:BING_BONG_STANCE_ID,bloodSlash:finalUse});
const nextExecution=createAttackExecution({id:2,attackKey:'horizontal5',group:'horizontal',weaponId:'katana',stanceId:BING_BONG_STANCE_ID,bloodSlash:nextUse});
assert.equal(finalExecution.modifiers.bloodSlash.empowered,true);
assert.equal(nextExecution.modifiers.bloodSlash.empowered,false);
assert.notEqual(finalExecution.hitTargets,nextExecution.hitTargets);
assert.notEqual(finalExecution.bingBongPrimaries,nextExecution.bingBongPrimaries);

// Candidate selection reproduces the collision loop's highest-damage contact
// from the distances captured during that exact pass.
const enemy={radius:1,collisionScale:1};
const enemySystem={heightScale:1};
const shaft={id:'spearShaft',type:'blunt',radius:.1,damage:8};
const head={id:'maceHead',type:'hybrid',radius:.29,damage:31};
const selected=selectCapturedHitCandidate({
  records:[{zone:shaft,minDistance:.2},{zone:head,minDistance:.3}],
  enemy,enemySystem,weaponId:'mace',weaponDef:{},attackKey:'horizontal5',attackGroup:'horizontal',swingDamageMult:1,
});
assert.equal(selected.zone.id,'maceHead');

assert.equal(pointInRadius({originX:3,originZ:4,targetX:9,targetZ:12,range:10}),true);
assert.equal(pointInRadius({originX:3,originZ:4,targetX:9.1,targetZ:12.1,range:10}),false);

console.log('combat-card-effects tests passed');
