import assert from 'node:assert/strict';
import { STANCE_CARDS } from '../src/stance-cards.js';
import { STONE_WEAPONS } from '../src/weapons.js';
import { weaponAllowsCleave } from '../src/weapon-balance.js';
import {
  GATE3_FULL_PAYOFFS,
  cleaveModeForGate3Expression,
  createStanceGate3Runtime,
  resolveGate3FullPayoff,
} from '../src/stance-gate3-payoffs.js';

const stanceById=id=>STANCE_CARDS.find(stance=>stance.id===id);
const pair=(stanceId,weaponId)=>({stance:stanceById(stanceId),weapon:STONE_WEAPONS[weaponId],weaponId});

assert.equal(Object.keys(GATE3_FULL_PAYOFFS).length,3);
assert.equal(resolveGate3FullPayoff(pair('S24','dagger')).payoff.id,'light-mobile-expression');
assert.equal(resolveGate3FullPayoff(pair('S26','longsword')).payoff.id,'medium-confirmed-form');
assert.equal(resolveGate3FullPayoff(pair('S01','greatsword')).payoff.id,'heavy-breaking-form');
assert.equal(resolveGate3FullPayoff(pair('S24','longsword')).active,false);
assert.equal(cleaveModeForGate3Expression(pair('S24','dagger')),'full-light');
assert.equal(cleaveModeForGate3Expression(pair('S24','longsword')),'adapted-medium');
assert.equal(cleaveModeForGate3Expression(pair('S26','dagger')),'adapted-light');
assert.equal(cleaveModeForGate3Expression(pair('S26','greatsword')),'adapted-heavy');
assert.equal(cleaveModeForGate3Expression(pair('S01','greatsword')),'full-heavy');
assert.equal(cleaveModeForGate3Expression(pair('S23','dagger')),null);

const cleaveWeapon={staminaClass:'Medium',stance2CleaveMode:'full-medium',stance2CurrentAttackGroup:'horizontal'};
assert.equal(weaponAllowsCleave({weaponDef:cleaveWeapon,attackSlot:0,maxCharge:false}),true);
cleaveWeapon.stance2CurrentAttackGroup='stab';
assert.equal(weaponAllowsCleave({weaponDef:cleaveWeapon,attackSlot:0,maxCharge:false}),false);
cleaveWeapon.stance2CleaveMode='adapted-medium';
assert.equal(weaponAllowsCleave({weaponDef:cleaveWeapon,attackSlot:2,maxCharge:false}),false);
assert.equal(weaponAllowsCleave({weaponDef:cleaveWeapon,attackSlot:2,maxCharge:true}),true);
cleaveWeapon.stance2CleaveMode='full-heavy';
assert.equal(weaponAllowsCleave({weaponDef:cleaveWeapon,attackSlot:0,maxCharge:false}),true);
cleaveWeapon.stance2CleaveMode='adapted-heavy';
assert.equal(weaponAllowsCleave({weaponDef:cleaveWeapon,attackSlot:1,maxCharge:true}),false);
assert.equal(weaponAllowsCleave({weaponDef:cleaveWeapon,attackSlot:2,maxCharge:true}),true);
cleaveWeapon.stance2CleaveMode='adapted-light';
assert.equal(weaponAllowsCleave({weaponDef:cleaveWeapon,attackSlot:2,maxCharge:true}),false);
cleaveWeapon.stance2CleaveMode='failed';
assert.equal(weaponAllowsCleave({weaponDef:cleaveWeapon,attackSlot:2,maxCharge:true}),false);

const combatState={
  weapon:'dagger',
  attack:null,
  attackGroup:'vertical',
  hitIds:new Set(),
};
const arena={
  stance:stanceById('S24'),
  chain:{activeSlot:0,stage:'idle',comboDeadline:0},
  swing:{maxChargeCleave:false,stun:.2},
};
const calls=[];
const PC={
  combatState,
  currentWeapon:()=>STONE_WEAPONS[combatState.weapon],
  combatMovePenalty(){return .55;},
  getWeaponHitZones(){return[{damage:10,stagger:1,from:{y:0},to:{y:1}}];},
  startCombatAttack(key,group){calls.push(['attack',key,group]);combatState.attack={key};combatState.attackGroup=group;},
  updateCombat(){calls.push(['update']);},
};
const windowRef={};
const runtime=createStanceGate3Runtime({arenaHandle:{PC,combatState,arena},windowRef});

assert.equal(runtime.snapshot().payoffId,'light-mobile-expression');
assert.equal(PC.combatMovePenalty(),.92,'full Light alignment should preserve movement');
assert.equal(STONE_WEAPONS.dagger.stance2CleaveMode,'full-light');

combatState.weapon='longsword';
arena.stance=stanceById('S24');
runtime.apply();
assert.equal(runtime.snapshot().active,false);
assert.equal(PC.combatMovePenalty(),.55,'adapted pair should not receive the Light movement payoff');
assert.equal(STONE_WEAPONS.longsword.stance2CleaveMode,'adapted-medium');
assert.equal(Object.hasOwn(STONE_WEAPONS.dagger,'stance2CleaveMode'),false,'switching weapons should restore the prior weapon definition');

arena.stance=stanceById('S26');
combatState.weapon='longsword';
combatState.attack={key:'vertical2'};
combatState.attackGroup='vertical';
combatState.hitIds=new Set(['enemy']);
arena.chain.activeSlot=0;
arena.chain.stage='hit1';
arena.chain.comboDeadline=0;
PC.updateCombat=runtime.destroy;
// Restore the runtime after the deliberate method-reference probe above.
runtime.destroy();
const PC2={
  combatState,
  currentWeapon:()=>STONE_WEAPONS[combatState.weapon],
  combatMovePenalty(){return .62;},
  getWeaponHitZones(){return[{damage:10,stagger:1,from:{y:0},to:{y:1}}];},
  startCombatAttack(key,group){combatState.attack={key};combatState.attackGroup=group;},
  updateCombat(){
    combatState.attack=null;
    arena.chain.stage='hit1Ready';
    arena.chain.comboDeadline=10;
  },
};
const mediumRuntime=createStanceGate3Runtime({arenaHandle:{PC:PC2,combatState,arena},windowRef:{}});
PC2.updateCombat();
assert.ok(Math.abs(arena.chain.comboDeadline-10.35)<1e-9,'full Medium alignment should extend the confirmed follow-up window');
assert.equal(STONE_WEAPONS.longsword.stance2CleaveMode,'full-medium');
mediumRuntime.destroy();

arena.stance=stanceById('S01');
combatState.weapon='greatsword';
combatState.attack={key:'vertical10'};
combatState.attackGroup='vertical';
combatState.hitIds=new Set();
arena.chain.activeSlot=0;
arena.swing.maxChargeCleave=false;
arena.swing.stun=.2;
const PC3={
  combatState,
  currentWeapon:()=>STONE_WEAPONS[combatState.weapon],
  combatMovePenalty(){return .52;},
  getWeaponHitZones(){return[{damage:30,stagger:1,from:{y:0},to:{y:1}}];},
  startCombatAttack(){},
  updateCombat(){},
};
const heavyRuntime=createStanceGate3Runtime({arenaHandle:{PC:PC3,combatState,arena},windowRef:{}});
let zones=PC3.getWeaponHitZones();
assert.equal(zones[0].stagger,2,'full Heavy alignment should double stagger');
assert.equal(arena.swing.stun,.42,'full Heavy alignment should establish a stun floor');
arena.chain.activeSlot=2;
arena.swing.maxChargeCleave=true;
arena.swing.stun=.2;
zones=PC3.getWeaponHitZones();
assert.equal(zones[0].stagger,2);
assert.equal(arena.swing.stun,.78,'fully charged Heavy finisher should use the higher stun floor');
assert.equal(STONE_WEAPONS.greatsword.stance2CleaveMode,'full-heavy');

arena.stance=stanceById('S23');
combatState.weapon='dagger';
heavyRuntime.apply();
assert.equal(runtime.snapshot?.active??false,false);
assert.equal(Object.hasOwn(STONE_WEAPONS.greatsword,'stance2CleaveMode'),false,'leaving the pilot should restore the modified weapon');
heavyRuntime.destroy();
assert.equal(combatState.stance2Gate3,undefined);

console.log('stance gate 3 payoff tests passed');
