import assert from 'node:assert/strict';
import {
  applyProfileSettings,
  auditProfileCoverage,
  createArenaControlRegistry,
  snapshotProfileSettings,
  validateProfileSettings,
} from '../src/arena-control-registry.js';

const registry=createArenaControlRegistry();
let amount=2;
let tone='soft';
let globalTheme='neutral';

registry.register({id:'simulation',label:'SIM',source:'test'}, {
  id:'simulation.amount',kind:'range',label:'Amount',min:0,max:10,step:1,get:()=>amount,
  set:value=>{amount=Number(value);return true;},
  placement:{section:'SIM',subsection:'TUNING',order:4,accessibleLabel:'Simulation tuning amount'},
  profile:{path:'simulation.amount',scope:'profile',default:1,normalizer:value=>Number(value),requiresReload:true,migrationId:'phase2.5.amount'},
});
registry.register({id:'presentation',label:'PRESENTATION',source:'test'}, {
  id:'presentation.tone',kind:'text',label:'Tone',get:()=>tone,
  profile:{path:'presentation.tone',scope:'profile',default:'soft',normalizer:value=>String(value),adapter:{
    id:'tone-adapter',
    read:value=>String(value).toUpperCase(),
    apply:value=>{tone=String(value);return true;},
    validate:value=>String(value).length>0||'TONE_REQUIRED',
  }},
});
registry.register({id:'visuals',label:'VISUALS',source:'test'}, {
  id:'visuals.theme',kind:'select',label:'Theme',get:()=>globalTheme,
  options:()=>[{value:'neutral',label:'Neutral'},{value:'akai',label:'Akai'}],
  set:value=>{globalTheme=String(value);return true;},
  profile:{path:'visual.theme',scope:'global',default:'neutral',normalizer:value=>String(value),requiresReload:true},
});
registry.register({id:'actions',label:'ACTIONS',source:'test'}, {
  id:'actions.reset',kind:'button',label:'Reset',invoke:()=>true,
});

const amountSnapshot=registry.getControl('simulation.amount');
assert.deepEqual(amountSnapshot.placement,{
  section:'SIM',subsection:'TUNING',order:4,label:'Amount',accessibleLabel:'Simulation tuning amount',
  fullAccessibleLabel:'Simulation tuning amount',explicit:true,
});
assert.equal(amountSnapshot.profile.path,'simulation.amount');
assert.equal(amountSnapshot.profile.scope,'profile');
assert.equal(amountSnapshot.profile.default,1);
assert.equal(amountSnapshot.profile.requiresReload,true);
assert.equal(amountSnapshot.profile.migrationId,'phase2.5.amount');
assert.equal(registry.getControl('actions.reset').profile.scope,'ephemeral','actions are ephemeral by default');
const contracts=registry.getProfileContracts();
assert.equal(typeof contracts.find(contract=>contract.id==='simulation.amount').profile.normalizer,'function');
assert.equal(contracts.find(contract=>contract.id==='presentation.tone').profile.adapter.id,'tone-adapter');

const snapshot=snapshotProfileSettings(registry);
assert.deepEqual(snapshot.settings,{'simulation.amount':2,'presentation.tone':'SOFT'});
assert.ok(!Object.hasOwn(snapshot.settings,'visual.theme'));
assert.ok(!Object.hasOwn(snapshot.settings,'actions.reset'));

const validation=validateProfileSettings(registry,{settings:{
  'simulation.amount':'6','presentation.tone':'warm','visual.theme':'akai','unknown.future':true,
}} ,{includeGlobal:true});
assert.equal(validation.ok,true);
assert.deepEqual(validation.normalized,{
  'simulation.amount':6,'presentation.tone':'warm','visual.theme':'akai',
});
assert.deepEqual(validation.reloadRequired,['simulation.amount','visual.theme']);
assert.ok(validation.warnings.includes('UNKNOWN_PROFILE_SETTING:unknown.future'));

const applied=applyProfileSettings(registry,{settings:{'simulation.amount':6,'presentation.tone':'warm'} });
assert.equal(applied.ok,true);
assert.deepEqual(applied.applied,['simulation.amount','presentation.tone']);
assert.equal(amount,6);
assert.equal(tone,'warm');

let first=1,second=1;
registry.register({id:'transaction',label:'TRANSACTION',source:'test'}, {
  id:'transaction.first',kind:'range',label:'First',get:()=>first,set:value=>{first=Number(value);return true;},
  profile:{path:'transaction.first',scope:'profile',default:1,normalizer:value=>Number(value)},
});
registry.register({id:'transaction',label:'TRANSACTION',source:'test'}, {
  id:'transaction.second',kind:'range',label:'Second',get:()=>second,set:()=>false,
  profile:{path:'transaction.second',scope:'profile',default:1,normalizer:value=>Number(value)},
});
const failed=applyProfileSettings(registry,{settings:{'transaction.first':9,'transaction.second':9}});
assert.equal(failed.ok,false);
assert.equal(failed.rolledBack,true);
assert.deepEqual(failed.applied,[]);
assert.equal(first,1,'a failed staged apply rolls back earlier controls');

const audit=auditProfileCoverage(registry);
assert.equal(audit.ok,true);
assert.equal(audit.totalControls,6);
assert.equal(audit.ephemeralControls,1);
assert.equal(audit.globalControls,1);
assert.ok(audit.reloadRequired.includes('simulation.amount'));
assert.deepEqual(audit.actionOverrides,[]);

const directApply=applyProfileSettings(registry,{'simulation.amount':3});
assert.equal(directApply.ok,true);
assert.equal(amount,3);

console.log('Arena control profile metadata, snapshots, validation, adapters, rollback, and coverage: ok');
