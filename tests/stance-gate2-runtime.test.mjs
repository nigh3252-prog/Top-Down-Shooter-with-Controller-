import assert from 'node:assert/strict';
import { STANCE_CARDS } from '../src/stance-cards.js';
import { STONE_WEAPONS } from '../src/weapons.js';
import {
  GATE2_FAILURE_ATTACKS,
  GATE2_PAIR_PROFILES,
  GATE2_STANCE_IDS,
  GATE2_WEAPON_IDS,
  createStanceGate2Runtime,
  resolveGate2PilotProfile,
} from '../src/stance-gate2-runtime.js';

const stanceById=id=>STANCE_CARDS.find(stance=>stance.id===id);
const expectedTier={
  'S24:dagger':'full','S24:longsword':'adapted','S24:greatsword':'unusable',
  'S26:dagger':'adapted','S26:longsword':'full','S26:greatsword':'adapted',
  'S01:dagger':'unusable','S01:longsword':'adapted','S01:greatsword':'full',
};

assert.equal(Object.keys(GATE2_PAIR_PROFILES).length,9);
for(const stanceId of GATE2_STANCE_IDS){
  for(const weaponId of GATE2_WEAPON_IDS){
    const resolved=resolveGate2PilotProfile({stance:stanceById(stanceId),weapon:STONE_WEAPONS[weaponId],weaponId});
    assert.equal(resolved.active,true,`${stanceId}/${weaponId} should be in the pilot`);
    assert.equal(resolved.compatibility.tier,expectedTier[`${stanceId}:${weaponId}`]);
    assert.equal(resolved.profile.tier,expectedTier[`${stanceId}:${weaponId}`]);
    assert.equal(resolved.effectiveChain.length,3);
  }
}
assert.deepEqual(resolveGate2PilotProfile({stance:stanceById('S24'),weapon:STONE_WEAPONS.dagger,weaponId:'dagger'}).effectiveChain,stanceById('S24').chain);
assert.deepEqual(resolveGate2PilotProfile({stance:stanceById('S24'),weapon:STONE_WEAPONS.longsword,weaponId:'longsword'}).effectiveChain,stanceById('S24').chain);
assert.deepEqual(resolveGate2PilotProfile({stance:stanceById('S24'),weapon:STONE_WEAPONS.greatsword,weaponId:'greatsword'}).effectiveChain,[GATE2_FAILURE_ATTACKS.tooHeavy,GATE2_FAILURE_ATTACKS.tooHeavy,GATE2_FAILURE_ATTACKS.tooHeavy]);
assert.equal(resolveGate2PilotProfile({stance:stanceById('S23'),weapon:STONE_WEAPONS.longsword,weaponId:'longsword'}).active,true);

class V3{
  constructor(x=0,y=0,z=0){this.set(x,y,z);}
  set(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;return this;}
}
const originalRatStep=[...stanceById('S24').chain];
const allMoveKeys=new Set(Object.values(GATE2_PAIR_PROFILES).flatMap(profile=>profile.moveKeys||[]));
const attacks={};
for(const key of allMoveKeys){
  if(key===GATE2_FAILURE_ATTACKS.tooHeavy||key===GATE2_FAILURE_ATTACKS.tooLight)continue;
  attacks[key]={group:key.startsWith('stab')?'stab':key.startsWith('horizontal')?'horizontal':'vertical',label:key};
}
const combatState={
  weapon:'longsword',
  tune:{length:1,weight:.35,windup:1,follow:1,recovery:1},
  chargePull:0,
};
const calls=[];
const PC={
  ATTACKS:attacks,
  P:value=>value,
  IDLE:{id:'idle'},
  Ease:{linear:t=>t,outCubic:t=>t,inCubic:t=>t,outQuad:t=>t,outBack:t=>t},
  TUNE_DEFAULTS:{length:1,weight:.35,windup:1,follow:1,recovery:1},
  BASE_RIG:{gripCenter:-.14},
  RIG:{bladeBase:.06,bladeTip:1.14,gripCenter:-.14,handR:new V3(0,-.05,.02),handL:new V3(0,-.24,-.02)},
  combatState,
  currentWeapon:()=>STONE_WEAPONS[combatState.weapon],
  updateCombat(){calls.push(['update']);},
  getWeaponHitZones(){return[{from:new V3(0,.10,0),to:new V3(0,1.10,0),damage:10,stagger:1}]},
  setReadyPose(){calls.push(['ready']);},
  selectCombatWeapon(id){combatState.weapon=id;combatState.tune={...PC.TUNE_DEFAULTS,...STONE_WEAPONS[id].tune};calls.push(['weapon',id]);},
  startCombatAttack(key,group){calls.push(['attack',key,group]);combatState.attackKey=key;},
};
const arena={stance:stanceById('S24'),chain:{activeSlot:0},charge:{active:true,queued:true,forceTier:1}};
const handle={PC,combatState,arena};
const runtime=createStanceGate2Runtime({arenaHandle:handle,windowRef:{}});

let snapshot=runtime.snapshot();
assert.equal(snapshot.profileId,'rat-step-longsword-adapted');
assert.deepEqual(arena.stance.chain,originalRatStep,'adjacent weight should preserve Rat Step authored attacks');
assert.ok(PC.RIG.gripCenter>0,'half-sword grip should move up the blade');
const baseScale=1+(combatState.tune.length-1)*.36+(combatState.tune.weight-.35)*.78;
assert.ok(Math.abs(baseScale-GATE2_PAIR_PROFILES['S24:longsword'].pace.strike)<1e-6,'stance pace should dominate the weapon timing base');

const adaptedZones=PC.getWeaponHitZones();
assert.equal(adaptedZones.length,1);
assert.ok(Math.abs(adaptedZones[0].damage-7.2)<1e-6);
assert.ok(Math.abs(adaptedZones[0].stagger-.56)<1e-6);
assert.ok(adaptedZones[0].to.y<1.10,'half-sword reach should be shortened');
PC.startCombatAttack('vertical10','vertical');
assert.deepEqual(calls.at(-1),['attack','vertical10','vertical']);

PC.selectCombatWeapon('greatsword');
snapshot=runtime.snapshot();
assert.equal(snapshot.failed,true);
assert.deepEqual(arena.stance.chain,[GATE2_FAILURE_ATTACKS.tooHeavy,GATE2_FAILURE_ATTACKS.tooHeavy,GATE2_FAILURE_ATTACKS.tooHeavy]);
assert.equal(PC.getWeaponHitZones().length,0,'failed expression must not create damaging hit zones');
arena.chain.activeSlot=2;arena.charge.active=true;arena.charge.queued=true;
PC.startCombatAttack('vertical9','vertical');
assert.equal(calls.at(-1)[1],GATE2_FAILURE_ATTACKS.tooHeavy);
assert.equal(arena.charge.active,false,'failed heavy input should not enter charge hold');
assert.equal(arena.charge.queued,false);

arena.stance=stanceById('S23');
PC.setReadyPose({});
assert.deepEqual(stanceById('S24').chain,originalRatStep,'leaving the pilot stance should restore its authored chain');
assert.equal(runtime.snapshot().active,true);
assert.equal(runtime.snapshot().failed,true,'Light stance + Heavy weapon should inherit the Rat Step + Greatsword failure template');
assert.deepEqual(arena.stance.chain,[GATE2_FAILURE_ATTACKS.tooHeavy,GATE2_FAILURE_ATTACKS.tooHeavy,GATE2_FAILURE_ATTACKS.tooHeavy]);

const selected=runtime.selectPair({stanceId:'S01',weaponId:'dagger'});
assert.equal(selected.ok,true);
assert.equal(arena.stance.id,'S01');
assert.equal(combatState.weapon,'dagger');
assert.equal(runtime.snapshot().profileId,'hammerfall-dagger-failed');
assert.equal(PC.getWeaponHitZones().length,0);
assert.equal(runtime.selectPair({stanceId:'S02',weaponId:'dagger'}).ok,true);
assert.equal(runtime.snapshot().failed,true,'Heavy stance + Light weapon should inherit the Hammerfall + Dagger failure template');

runtime.destroy();
assert.deepEqual(stanceById('S24').chain,originalRatStep);
assert.equal(combatState.stance2Gate2,undefined);
for(const key of ['weight','windup','follow','recovery']){
  assert.equal(combatState.tune[key],STONE_WEAPONS.dagger.tune[key],`destroy should restore dagger ${key} tuning`);
}
console.log('stance gate 2 runtime tests passed');
