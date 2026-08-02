import assert from 'node:assert/strict';
import { STANCE_CARDS } from '../src/stance-cards.js';
import { STONE_WEAPONS } from '../src/weapons.js';
import { createStanceGate3Runtime } from '../src/stance-gate3-payoffs.js';
import {
  STANCE_MOVEMENT_PROFILES,
  movementMultiplierDuringAttack,
  postSwingMovementMultiplier,
  resolveStanceMovementProfile,
} from '../src/stance-movement-profiles.js';

const stance=id=>STANCE_CARDS.find(card=>card.id===id);
const resolve=(stanceId,weaponId)=>resolveStanceMovementProfile({
  stance:stance(stanceId),weapon:STONE_WEAPONS[weaponId],weaponId,
});
const attack={phases:[{t1:.20},{t1:.30},{t1:.46},{t1:.70}],contactAt:.30,total:.70};

assert.equal(Object.keys(STANCE_MOVEMENT_PROFILES).length,9);
for(const stanceId of ['S24','S26','S01']){
  for(const weaponId of ['dagger','longsword','greatsword']){
    assert.equal(resolve(stanceId,weaponId).active,true,`${stanceId}/${weaponId} should have a movement profile`);
  }
}

const ratDagger=resolve('S24','dagger').profile;
assert.equal(movementMultiplierDuringAttack(ratDagger,attack,.10),1);
assert.equal(movementMultiplierDuringAttack(ratDagger,attack,.25),1);
assert.equal(postSwingMovementMultiplier(ratDagger,0),1);

const ratLongsword=resolve('S24','longsword').profile;
assert.equal(movementMultiplierDuringAttack(ratLongsword,attack,.10),.78);
assert.equal(movementMultiplierDuringAttack(ratLongsword,attack,.25),.62);
assert.equal(movementMultiplierDuringAttack(ratLongsword,attack,.55),.58);
assert.equal(postSwingMovementMultiplier(ratLongsword,0),.55);
assert.equal(postSwingMovementMultiplier(ratLongsword,.22),1);

const longBladeDagger=resolve('S26','dagger').profile;
assert.equal(movementMultiplierDuringAttack(longBladeDagger,attack,.10),.92);
assert.equal(movementMultiplierDuringAttack(longBladeDagger,attack,.25),.68);
assert.equal(longBladeDagger.recoveryDuration,.18);

const longBladeLongsword=resolve('S26','longsword').profile;
assert.equal(longBladeLongsword.recoveryDuration,.25);
assert.equal(longBladeLongsword.recoveryMode,'settle');

const longBladeGreatsword=resolve('S26','greatsword').profile;
assert.equal(movementMultiplierDuringAttack(longBladeGreatsword,attack,.10),.52);
assert.equal(movementMultiplierDuringAttack(longBladeGreatsword,attack,.25),0);
assert.equal(longBladeGreatsword.recoveryDuration,.42);
assert.equal(postSwingMovementMultiplier(longBladeGreatsword,.10),0);
assert.ok(postSwingMovementMultiplier(longBladeGreatsword,.30)>0);

const hammerfallLongsword=resolve('S01','longsword').profile;
assert.equal(movementMultiplierDuringAttack(hammerfallLongsword,attack,.25),0);
assert.equal(hammerfallLongsword.recoveryDuration,.32);

const hammerfallGreatsword=resolve('S01','greatsword').profile;
assert.equal(movementMultiplierDuringAttack(hammerfallGreatsword,attack,.10),.35);
assert.equal(movementMultiplierDuringAttack(hammerfallGreatsword,attack,.25),0);
assert.equal(movementMultiplierDuringAttack(hammerfallGreatsword,attack,.55),.15);
assert.equal(postSwingMovementMultiplier(hammerfallGreatsword,0),0);
assert.equal(postSwingMovementMultiplier(hammerfallGreatsword,.18),0);
assert.ok(postSwingMovementMultiplier(hammerfallGreatsword,.34)>.4);
assert.equal(postSwingMovementMultiplier(hammerfallGreatsword,.50),1);

assert.equal(movementMultiplierDuringAttack(resolve('S24','greatsword').profile,attack,.25),null);
assert.equal(movementMultiplierDuringAttack(resolve('S01','dagger').profile,attack,.25),null);

// Runtime integration: Hammerfall + greatsword plants through contact and then
// cancels normal locomotion for the opening portion of its recovery envelope.
const combatState={
  weapon:'greatsword',attack:null,attackGroup:'vertical',t:0,hitIds:new Set(),
};
const arena={
  stance:stance('S01'),chain:{activeSlot:0,stage:'hit1',comboDeadline:0},
  swing:{maxChargeCleave:false,stun:.2},dodge:{t:-1},
};
const actorPos={x:0,y:0};
let completeOnUpdate=false;
const PC={
  combatState,
  currentWeapon:()=>STONE_WEAPONS[combatState.weapon],
  combatMovePenalty(){return .52;},
  getWeaponHitZones(){return[];},
  startCombatAttack(){combatState.attack=attack;combatState.t=0;},
  updateCombat(){if(completeOnUpdate){combatState.attack=null;completeOnUpdate=false;}},
};
const runtime=createStanceGate3Runtime({
  arenaHandle:{PC,combatState,arena,actorPos,arenaMoveInput:()=>({x:1,z:0})},
  windowRef:{},basePlayerSpeed:8.5,
});

PC.startCombatAttack('vertical10','vertical');
combatState.t=.10;
assert.equal(PC.combatMovePenalty(),.35);
combatState.t=.25;
assert.equal(PC.combatMovePenalty(),0);
completeOnUpdate=true;
PC.updateCombat(.016);
assert.ok(runtime.snapshot().recoveryRemaining>.48);

actorPos.x+=.85;
PC.updateCombat(.10);
assert.ok(Math.abs(actorPos.x)<1e-9,'full plant should cancel movement at the start of recovery');
actorPos.x+=.85;
PC.updateCombat(.10);
assert.ok(Math.abs(actorPos.x)<1e-9,'full plant should remain stopped through the 0.18 second hold');

runtime.destroy();
assert.equal(combatState.stance2Gate3,undefined);
console.log('stance movement profile tests passed');
