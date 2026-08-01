import assert from 'node:assert/strict';
import { createArenaControlRegistry } from '../src/arena-control-registry.js';

const registry=createArenaControlRegistry();
const lifecycle=[];
registry.subscribe(event=>lifecycle.push(event.type));
let selected='standard';
let invoked=0;
registry.register({id:'director',label:'ENCOUNTER DIRECTOR'},{
  id:'director.mode',kind:'select',label:'MODE',get:()=>selected,
  options:[{value:'standard',label:'Standard'},{value:'cycle',label:'Cycle'}],
  set:value=>{selected=String(value);},
});
registry.register({id:'actions',label:'ACTIONS'},{
  id:'actions.reset',kind:'button',label:'RESET',invoke:()=>{invoked++;},active:()=>false,
});

const changes=[];
const unsubscribe=registry.subscribe(event=>changes.push(event));
assert.equal(registry.setControl('director.mode','cycle'),true);
assert.equal(selected,'cycle');
assert.equal(registry.invokeControl('actions.reset'),true);
assert.equal(invoked,1);
unsubscribe();

const groups=registry.getControlGroups();
assert.deepEqual(groups.map(group=>group.id),['director','actions']);
assert.deepEqual(groups[0].controls[0].options.map(option=>option.value),['standard','cycle']);
assert.equal(groups[0].controls[0].value,'cycle');
assert.equal(changes.length,2);
assert.equal(registry.setControl('missing',1),false);
assert.deepEqual(lifecycle.slice(0,2),['register','register']);
assert.equal(registry.remove('actions.reset'),true);
assert.equal(lifecycle.at(-1),'remove');

console.log('arena-control-registry: ok');
