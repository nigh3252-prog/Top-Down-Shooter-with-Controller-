import assert from 'node:assert/strict';
import {
  clearTransientAttackState,
  createCombatSwingInstance,
  installCombatSwingInstances,
} from '../src/combat-swing-instances.js';

const authored={
  label:'Shared Horizontal',
  group:'horizontal',
  __bloodSlashBoosted:true,
  __bloodSlashSpent:true,
  __bingBongPrimaries:new Set(['old']),
  __combatSwingId:9,
};
clearTransientAttackState(authored);
assert.equal(authored.__bloodSlashBoosted,undefined);
assert.equal(authored.__bloodSlashSpent,undefined);
assert.equal(authored.__bingBongPrimaries,undefined);
assert.equal(authored.__combatSwingId,undefined);

const copy=createCombatSwingInstance(authored);
assert.notEqual(copy,authored);
assert.equal(copy.label,authored.label);
assert.equal(copy.__bloodSlashBoosted,undefined);

const hooks={onAttackStart(){return'untouched';}};
const PC={ATTACKS:{horizontal6:authored},combatState:{}};
const cardEffects={state:{execution:null},isBloodSlashEmpowered:()=>false};
const adapter=installCombatSwingInstances({PC,hooks,cardEffects});
assert.equal(hooks.onAttackStart(),'untouched');
assert.equal(adapter.state,cardEffects.state);
assert.equal(adapter.isCurrentBoosted(),false);
adapter.update();

console.log('combat-swing-instances compatibility tests passed');
