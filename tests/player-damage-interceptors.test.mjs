import assert from 'node:assert/strict';
import { createPlayerDamageInterceptorStack } from '../src/player-damage-interceptors.js';
import { installStanceDefenseDamagePipeline } from '../src/stance-defense-damage-pipeline.js';

{
  const applied=[];
  const order=[];
  const stack=createPlayerDamageInterceptorStack({apply:next=>applied.push(next)});
  stack.setLegacy(hit=>{order.push('arcana');return{damage:hit.damage*.5};});
  const stableComposite=applied.at(-1);
  const release=stack.register('stance-defense',hit=>{order.push('stance');return{damage:hit.damage-4};},-100);
  assert.equal(applied.at(-1),stableComposite,'registration must retain one stable composite function identity');
  assert.deepEqual(stableComposite({damage:20,kind:'test'}),{damage:8});
  assert.deepEqual(order,['stance','arcana'],'stance defense must run before the legacy Arcana slot');
  assert.equal(release(),true);
  assert.equal(applied.at(-1),stableComposite,'removing stance defense must retain the same Arcana composite');
  assert.deepEqual(stableComposite({damage:20}),{damage:10});
}

{
  let active=null;
  let arcanaCalls=0;
  const stack=createPlayerDamageInterceptorStack({apply:next=>{active=next;}});
  stack.setLegacy(hit=>{arcanaCalls++;return{damage:hit.damage};});
  stack.register('stance-defense',()=>false,-100);
  assert.deepEqual(active({damage:14}),{damage:0});
  assert.equal(arcanaCalls,0,'zero remaining damage should stop later interceptors');
}

{
  let active=null;
  const stack=createPlayerDamageInterceptorStack({apply:next=>{active=next;}});
  stack.setLegacy(hit=>({damage:hit.damage-1}));
  const staleRelease=stack.register('stance-defense',()=>({damage:2}),-100);
  const currentRelease=stack.register('stance-defense',()=>({damage:7}),-100);
  assert.equal(staleRelease(),false,'an old disposer must not remove a replacement registered under the same id');
  assert.deepEqual(active({damage:20}),{damage:6});
  assert.equal(currentRelease(),true);
  assert.deepEqual(active({damage:20}),{damage:19});
  stack.setLegacy(null);
  assert.equal(active,null);
}

{
  let registered=null;
  let removed=0;
  const system={
    registerPlayerDamageInterceptor(id,interceptor,priority){
      registered={id,interceptor,priority};
      return()=>{removed++;registered=null;return true;};
    },
    unregisterPlayerDamageInterceptor(){throw new Error('returned disposer should be preferred');},
  };
  const pipeline=installStanceDefenseDamagePipeline({system,interceptor:hit=>({damage:hit.damage-3}),priority:-100});
  assert.equal(pipeline.installed,true);
  assert.equal(pipeline.system,system,'the pipeline must retain the original enemy-system identity');
  assert.equal(registered.id,'stance-gate5-defense');
  assert.equal(registered.priority,-100);
  assert.deepEqual(registered.interceptor({damage:10}),{damage:7});
  pipeline.destroy();
  pipeline.destroy();
  assert.equal(removed,1);
}

console.log('player damage interceptor tests passed');
