import assert from 'node:assert/strict';
import { STANCE_CARDS } from '../src/stance-cards.js';
import { STONE_WEAPONS } from '../src/weapons.js';
import { weaponAllowsCleave } from '../src/weapon-balance.js';
import {
  GATE3_FULL_PAYOFFS,
  cleaveModeForGate3Expression,
  createStanceGate3Runtime,
  installStanceGate3Runtime,
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
assert.equal(cleaveModeForGate3Expression(pair('S23','dagger')),'full-light');

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

function makeHarness({stanceId,weaponId,movePenalty=.55,attack=null,hitIds=[],activeSlot=0,updateCombat=()=>{}}){
  const combatState={weapon:weaponId,attack,attackGroup:'vertical',t:0,hitIds:new Set(hitIds)};
  const arena={
    stance:stanceById(stanceId),
    chain:{activeSlot,stage:attack?'hit1':'idle',comboDeadline:0},
    swing:{maxChargeCleave:false,stun:.2},
    dodge:{t:-1},
  };
  const PC={
    combatState,
    currentWeapon:()=>STONE_WEAPONS[combatState.weapon],
    combatMovePenalty(){return movePenalty;},
    getWeaponHitZones(){return[{damage:30,stagger:1,from:{y:0},to:{y:1}}];},
    startCombatAttack(key,group){
      combatState.attack={key,phases:[{t1:.2}],contactAt:.3,total:.7};
      combatState.attackGroup=group;
      combatState.t=.1;
    },
    updateCombat(){return updateCombat({PC,combatState,arena});},
  };
  const runtime=createStanceGate3Runtime({arenaHandle:{PC,combatState,arena},windowRef:{}});
  return{PC,combatState,arena,runtime,handle:{PC,combatState,arena}};
}

{
  const {PC,combatState,arena,runtime}=makeHarness({stanceId:'S24',weaponId:'dagger'});
  assert.equal(runtime.snapshot().payoffId,'light-mobile-expression');
  PC.startCombatAttack('vertical10','vertical');
  assert.equal(PC.combatMovePenalty(),1,'full Light alignment should remain fully mobile during normal attacks');
  assert.equal(STONE_WEAPONS.dagger.stance2CleaveMode,'full-light');

  combatState.attack=null;
  combatState.weapon='longsword';
  arena.stance=stanceById('S24');
  runtime.apply();
  assert.equal(runtime.snapshot().active,false);
  assert.equal(PC.combatMovePenalty(),.55,'outside an active swing the original movement value remains untouched');
  assert.equal(STONE_WEAPONS.longsword.stance2CleaveMode,'adapted-medium');
  assert.equal(Object.hasOwn(STONE_WEAPONS.dagger,'stance2CleaveMode'),false,'switching weapons should restore the prior weapon definition');
  runtime.destroy();
}

{
  const {PC,arena,runtime}=makeHarness({
    stanceId:'S26',weaponId:'longsword',attack:{key:'vertical2'},hitIds:['enemy'],activeSlot:0,
    updateCombat({combatState,arena}){
      combatState.attack=null;
      arena.chain.stage='hit1Ready';
      arena.chain.comboDeadline=10;
    },
  });
  PC.updateCombat();
  assert.ok(Math.abs(arena.chain.comboDeadline-10.35)<1e-9,'full Medium alignment should extend the confirmed follow-up window');
  assert.equal(STONE_WEAPONS.longsword.stance2CleaveMode,'full-medium');
  runtime.destroy();
}

{
  const {PC,combatState,arena,runtime}=makeHarness({stanceId:'S01',weaponId:'greatsword',attack:{key:'vertical10'}});
  let zones=PC.getWeaponHitZones();
  assert.equal(zones[0].stagger,2,'full Heavy alignment should double stagger');
  assert.equal(arena.swing.stun,.42,'full Heavy alignment should establish a stun floor');
  assert.equal(STONE_WEAPONS.greatsword.stance2CleaveMode,'full-heavy');

  arena.chain.activeSlot=2;
  arena.swing.maxChargeCleave=true;
  arena.swing.stun=.2;
  zones=PC.getWeaponHitZones();
  assert.equal(zones[0].stagger,2);
  assert.equal(arena.swing.stun,.78,'fully charged Heavy finisher should use the higher stun floor');

  arena.stance=stanceById('S23');
  combatState.weapon='dagger';
  runtime.apply();
  assert.equal(runtime.snapshot().active,true);
  assert.equal(runtime.snapshot().payoffId,'stance2-full-light');
  assert.equal(STONE_WEAPONS.dagger.stance2CleaveMode,'full-light');
  assert.equal(Object.hasOwn(STONE_WEAPONS.greatsword,'stance2CleaveMode'),false,'switching class templates should restore the modified weapon');
  runtime.destroy();
  assert.equal(combatState.stance2Gate3,undefined);
}

{
  assert.deepEqual(
    installStanceGate3Runtime({arenaHandle:null,gate2Runtime:{installed:true}}),
    {installed:false,reason:'missing-arena-runtime'},
  );
  const {runtime,handle}=makeHarness({stanceId:'S24',weaponId:'dagger'});
  runtime.destroy();
  assert.deepEqual(
    installStanceGate3Runtime({arenaHandle:handle,gate2Runtime:null}),
    {installed:false,reason:'missing-gate2-runtime'},
  );
  const installedRuntime=installStanceGate3Runtime({arenaHandle:handle,gate2Runtime:{installed:true}});
  assert.equal(installedRuntime.installed,true,'the explicit installer returns the ready Gate 3 runtime');
  installedRuntime.destroy();
}

console.log('stance gate 3 payoff tests passed');
