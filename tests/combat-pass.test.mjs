import assert from 'node:assert/strict';
import { STANCE_CARDS } from '../src/stance-cards.js';
import { GUARD_POSES, guardPoseFor } from '../src/guard-poses.js';
import { STONE_WEAPON_ORDER, STONE_WEAPONS, normalizeStoneWeaponId } from '../src/weapons.js';
import { WEAPON_AFFINITIES, getWeaponDamageMultiplier } from '../src/combat-balance.js';
import { RAPIER_TIP_TUNING, WEAPON_STAMINA_MULTIPLIERS, getWeaponStaminaMultiplier, staminaCostForWeapon, weaponAllowsCleave } from '../src/weapon-balance.js';
import { HEAVY_LIGHT_STAGE, lightFollowupForStage, shouldStartBufferedFollowup } from '../src/combat-links.js';
import { COMBAT_INPUT_MODES, DEFAULT_COMBAT_INPUT_MODE, bufferExpiresAt, getCombatInputMode, lightFollowupForActiveMove, shouldExpireBufferedInput } from '../src/combat-input-modes.js';
import { createAttackInterpreter } from '../src/attack-interpreter.js';

class Vector3 {
  constructor(x=0,y=0,z=0){ this.set(x,y,z); this.isVector3=true; }
  set(x,y,z){ this.x=x; this.y=y; this.z=z; return this; }
  copy(v){ return this.set(v.x,v.y,v.z); }
  normalize(){ const d=Math.hypot(this.x,this.y,this.z)||1; this.x/=d; this.y/=d; this.z/=d; return this; }
  lerpVectors(a,b,t){ return this.set(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.z+(b.z-a.z)*t); }
}
class Vector2 {
  constructor(x=0,y=0){ this.set(x,y); this.isVector2=true; }
  set(x,y){ this.x=x; this.y=y; return this; }
  copy(v){ return this.set(v.x,v.y); }
  lerpVectors(a,b,t){ return this.set(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t); }
}
const THREE={
  Vector2, Vector3,
  MathUtils:{
    clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
    lerp:(a,b,t)=>a+(b-a)*t
  }
};

assert.equal(normalizeStoneWeaponId('saber'),'katana','legacy saber saves migrate to katana');
assert(!STONE_WEAPON_ORDER.includes('saber'),'saber is no longer selectable');
assert(STONE_WEAPON_ORDER.includes('katana'),'katana is selectable');
assert.equal(STONE_WEAPONS.katana.kind,'katana');
assert(WEAPON_AFFINITIES.katana,'katana has combat balance data');
assert(Number.isFinite(getWeaponDamageMultiplier({
  weaponId:'katana', attackKey:'horizontal4', attackGroup:'horizontal',
  hitType:'slice', zoneId:'katanaHa'
})),'katana damage resolves through the normal balance path');

const expectedStaminaClasses={
  longsword:'Medium', dagger:'Light', rapier:'Light', katana:'Medium', whip:'Light',
  mace:'Medium', spear:'Medium', battleaxe:'Heavy', warhammer:'Heavy', claymore:'Heavy', greatsword:'Heavy'
};
for(const [weaponId,staminaClass] of Object.entries(expectedStaminaClasses)){
  assert.equal(STONE_WEAPONS[weaponId].staminaClass,staminaClass,`${weaponId} has a definite stamina class`);
  assert.equal(STONE_WEAPONS[weaponId].weightClass,staminaClass,`${weaponId} displays the same definite weight class`);
}
assert.deepEqual(WEAPON_STAMINA_MULTIPLIERS,{Light:.5,Medium:1,Heavy:1.5});
assert.equal(getWeaponStaminaMultiplier(STONE_WEAPONS.rapier),.5);
assert.equal(staminaCostForWeapon(18,STONE_WEAPONS.rapier),9);
assert.equal(staminaCostForWeapon(18,STONE_WEAPONS.longsword),18);
assert.equal(staminaCostForWeapon(18,STONE_WEAPONS.greatsword),27);
assert.equal(weaponAllowsCleave({weaponDef:STONE_WEAPONS.rapier,attackSlot:0,maxCharge:false}),false);
assert.equal(weaponAllowsCleave({weaponDef:STONE_WEAPONS.dagger,attackSlot:2,maxCharge:false}),false);
assert.equal(weaponAllowsCleave({weaponDef:STONE_WEAPONS.whip,attackSlot:2,maxCharge:true}),true);
assert.equal(weaponAllowsCleave({weaponDef:STONE_WEAPONS.spear,attackSlot:0,maxCharge:false}),true);
assert.deepEqual(RAPIER_TIP_TUNING,{from:.92,to:1.04,radius:.11,damage:36,stagger:.5});

assert.equal(STANCE_CARDS.length,30);
const usedGuards=new Set();
let japaneseAssignments=0;
for(const stance of STANCE_CARDS){
  assert(GUARD_POSES[stance.guardId],`${stance.id} references a real guard pose`);
  assert.equal(guardPoseFor(stance),GUARD_POSES[stance.guardId].pose);
  assert(!stance.preferredWeapons.includes('saber'),`${stance.id} has no stale saber affinity`);
  for(const weaponId of stance.preferredWeapons) assert(STONE_WEAPONS[weaponId],`${stance.id} affinity ${weaponId} exists`);
  usedGuards.add(stance.guardId);
  if(GUARD_POSES[stance.guardId].tradition==='Japanese') japaneseAssignments++;
}
assert(usedGuards.size>=14,'stances use a broad set of visibly distinct guards');
assert(japaneseAssignments>0 && japaneseAssignments<STANCE_CARDS.length/2,'guard mix is mostly European with some Japanese positions');

assert.deepEqual(lightFollowupForStage('hit1'),{slot:1,pendingStage:'hit2'});
assert.deepEqual(lightFollowupForStage('heavy'),{slot:0,pendingStage:HEAVY_LIGHT_STAGE});
assert.equal(lightFollowupForStage(HEAVY_LIGHT_STAGE),null,'heavy follow-up cannot chain another light');
assert.equal(lightFollowupForStage('finisher'),null);

const combatModeIds=COMBAT_INPUT_MODES.map(mode=>mode.id);
assert.deepEqual(combatModeIds,['flow','brawler','precision','legacy']);
assert.equal(DEFAULT_COMBAT_INPUT_MODE,'brawler','Absolum Brawler is the default timing mode');
assert.equal(getCombatInputMode('missing').id,DEFAULT_COMBAT_INPUT_MODE,'unknown timing mode falls back to Absolum Brawler');

const flowMode=getCombatInputMode('flow');
const brawlerMode=getCombatInputMode('brawler');
const precisionMode=getCombatInputMode('precision');
const legacyMode=getCombatInputMode('legacy');
assert.equal(flowMode.requireHitToLink,false);
assert.equal(flowMode.postSecondLock,false);
assert.equal(legacyMode.requireHitToLink,true);
assert.equal(legacyMode.postSecondLock,true);
assert.equal(brawlerMode.persistentBuffer,true);
assert.equal(bufferExpiresAt(brawlerMode,10),Infinity);
assert(Math.abs(bufferExpiresAt(flowMode,10)-10.22)<1e-9);
assert(Math.abs(bufferExpiresAt(precisionMode,10)-10.06)<1e-9);
assert.deepEqual(lightFollowupForActiveMove({activeSlot:0,stage:'hit1',mode:flowMode}),{slot:1,pendingStage:'hit2'});
assert.deepEqual(lightFollowupForActiveMove({activeSlot:1,stage:'hit2',mode:flowMode}),{slot:0,pendingStage:'hit1'});
assert.deepEqual(lightFollowupForActiveMove({activeSlot:2,stage:'heavy',mode:flowMode}),{slot:0,pendingStage:HEAVY_LIGHT_STAGE});
assert.equal(lightFollowupForActiveMove({activeSlot:1,stage:'hit2',mode:legacyMode}),null);
assert.equal(lightFollowupForActiveMove({activeSlot:0,stage:HEAVY_LIGHT_STAGE,mode:flowMode}),null);
assert.equal(shouldExpireBufferedInput({
  mode:flowMode, now:10.23, expiresAt:10.22, attackTime:.10, comboAt:.20,
}),true,'an early buffered press expires before its link point');
assert.equal(shouldExpireBufferedInput({
  mode:flowMode, now:10.23, expiresAt:10.22, attackTime:.20, comboAt:.20,
}),false,'a queued press survives once the authored link point is reached');
assert.equal(shouldExpireBufferedInput({
  mode:brawlerMode, now:99, expiresAt:10, attackTime:.10, comboAt:.20,
}),false,'Absolum mode keeps one persistent intent');

const interpreter=createAttackInterpreter(THREE);
const first=interpreter.ATTACKS.vertical5;
const second=interpreter.ATTACKS.horizontal4;
assert(first.comboAt<first.total,'link point opens at recovery start, before full completion');
assert.equal(shouldStartBufferedFollowup(first,first.comboAt-.001,'horizontal4'),false);
assert.equal(shouldStartBufferedFollowup(first,first.comboAt,'horizontal4'),true);
assert.equal(shouldStartBufferedFollowup(first,first.total,null),false);

const recoveryPhase=first.phases[first.phases.length-1];
assert.equal(recoveryPhase.pose,interpreter.IDLE,'authored recoveries share the mutable ready pose');
interpreter.setIdlePose(guardPoseFor('ochsRight'));
assert(Math.abs(interpreter.IDLE.hold.x-GUARD_POSES.ochsRight.pose.hold[0])<1e-9);
const recovered=interpreter.sampleAttack(first,first.total,interpreter.work);
assert(Math.abs(recovered.hold.x-interpreter.IDLE.hold.x)<1e-9,'completed attack returns to the selected stance guard');

// The runtime captures this outgoing pose and uses it as crossfade alpha zero
// for the next windup, guaranteeing no intervening neutral/guard frame.
const outgoing=interpreter.P({hold:[0,1,0],tip:[0,1,0]});
interpreter.sampleAttack(first,first.comboAt,outgoing);
const incoming=interpreter.P({hold:[0,1,0],tip:[0,1,0]});
interpreter.sampleAttack(second,0,incoming);
const linked=interpreter.P({hold:[0,1,0],tip:[0,1,0]});
interpreter.poseLerp(outgoing,incoming,0,linked);
assert.deepEqual([linked.hold.x,linked.hold.y,linked.hold.z],[outgoing.hold.x,outgoing.hold.y,outgoing.hold.z]);

console.log('combat pass tests passed');
