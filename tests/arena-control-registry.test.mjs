import assert from 'node:assert/strict';
import { createArenaControlRegistry } from '../src/arena-control-registry.js';

const registry=createArenaControlRegistry();
let amount=2,enabled=false,invocations=0;
const events=[];
const unsubscribe=registry.subscribe(event=>events.push(event.type));
registry.register({id:'tuning',label:'TUNING',source:'test'},{id:'tuning.amount',kind:'range',label:'Amount',min:0,max:5,step:.5,get:()=>amount,set:value=>(amount=Number(value),true)});
registry.register({id:'tuning',label:'TUNING',source:'test'},{id:'tuning.enabled',kind:'check',label:'Enabled',checked:()=>enabled,set:value=>(enabled=!!value,true)});
registry.register({id:'actions',label:'ACTIONS',source:'test'},{id:'actions.fire',kind:'button',label:'Fire',invoke:()=>{invocations++;return true;}});

assert.equal(registry.getControlGroups().length,2);
assert.equal(registry.getControl('tuning.amount').value,2);
assert.equal(registry.setControl('tuning.amount',3.5),true);
assert.equal(amount,3.5);
assert.equal(registry.setControl('tuning.enabled',true),true);
assert.equal(enabled,true);
assert.equal(registry.invokeControl('actions.fire'),true);
assert.equal(invocations,1);
assert.equal(registry.setControl('missing',1),false);
assert.throws(()=>registry.register({id:'other'},{id:'tuning.amount',kind:'range'}),/already registered/);
assert.ok(events.includes('register')&&events.includes('change')&&events.includes('invoke'));
unsubscribe();
const before=events.length;registry.setControl('tuning.amount',1);assert.equal(events.length,before);
assert.equal(Object.isFrozen(registry.getControlGroups()),true);

console.log('Arena typed control registry snapshots, mutation, invocation, and subscriptions: ok');
