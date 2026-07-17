import assert from 'node:assert/strict';
import {
  clearTransientAttackState,
  createCombatSwingInstance,
  installCombatSwingInstances,
} from '../src/combat-swing-instances.js';

const authored={
  label:'Shared Horizontal',
  group:'horizontal',
  phases:[{t0:0,t1:1}],
  __bloodSlashBoosted:true,
  __bloodSlashSpent:true,
  __bingBongPrimaries:new Set([{id:'old'}]),
  __combatSwingId:99,
};
clearTransientAttackState(authored);
assert.equal(authored.__bloodSlashBoosted,undefined);
assert.equal(authored.__bloodSlashSpent,undefined);
assert.equal(authored.__bingBongPrimaries,undefined);
assert.equal(authored.__combatSwingId,undefined);

const direct=createCombatSwingInstance(authored,{swingId:4,boosted:true,spent:true});
assert.notEqual(direct,authored);
assert.equal(direct.__combatSwingId,4);
assert.equal(direct.__bloodSlashBoosted,true);
assert.equal(direct.__bloodSlashSpent,true);
assert.equal(direct.__bingBongPrimaries,undefined);

let boostNext=true;
const PC={combatState:{attack:null,attackGroup:'horizontal'},ATTACKS:{horizontal6:authored}};
const effects={state:{activeAttack:null,boostedAttack:null}};
const hooks={
  onAttackStart(){
    const attack=PC.combatState.attack;
    effects.state.activeAttack=attack;
    effects.state.boostedAttack=null;
    if(boostNext){
      attack.__bloodSlashSpent=true;
      attack.__bloodSlashBoosted=true;
      effects.state.boostedAttack=attack;
    }
  },
  onAttackComplete(){
    effects.state.activeAttack=null;
    effects.state.boostedAttack=null;
  },
};
const runtime=installCombatSwingInstances({PC,hooks,cardEffects:effects});

PC.combatState.attack=authored;
hooks.onAttackStart({group:'horizontal'});
const firstSwing=PC.combatState.attack;
assert.notEqual(firstSwing,authored);
assert.equal(firstSwing.__combatSwingId,1);
assert.equal(firstSwing.__bloodSlashBoosted,true);
assert.equal(effects.state.boostedAttack,firstSwing);
assert.equal(runtime.isCurrentBoosted(),true);
firstSwing.__bingBongPrimaries=new Set(['enemy-a']);
assert.equal(authored.__bingBongPrimaries,undefined);

hooks.onAttackComplete();
boostNext=false;
PC.combatState.attack=authored;
hooks.onAttackStart({group:'horizontal'});
const secondSwing=PC.combatState.attack;
assert.notEqual(secondSwing,firstSwing);
assert.notEqual(secondSwing,authored);
assert.equal(secondSwing.__combatSwingId,2);
assert.equal(secondSwing.__bloodSlashBoosted,undefined);
assert.equal(secondSwing.__bloodSlashSpent,undefined);
assert.equal(secondSwing.__bingBongPrimaries,undefined);
assert.equal(effects.state.boostedAttack,null);
assert.equal(runtime.isCurrentBoosted(),false);
assert.equal(authored.__bloodSlashBoosted,undefined);
assert.equal(authored.__bingBongPrimaries,undefined);
assert.equal(authored.__combatSwingId,undefined);

PC.combatState.attack=null;
runtime.update();
assert.equal(runtime.state.currentAttack,null);
assert.equal(runtime.state.boostedSwingId,0);

console.log('combat swing instance tests passed');
