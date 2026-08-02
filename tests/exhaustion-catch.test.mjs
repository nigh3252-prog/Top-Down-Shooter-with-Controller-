import assert from 'node:assert/strict';
import {
  createExhaustionCatchEngine,
  exhaustionFailureMovementMultiplier,
} from '../src/exhaustion-catch.js';

{
  const engine=createExhaustionCatchEngine();
  assert.equal(engine.trigger({before:0,after:0}),null);
  assert.equal(engine.trigger({before:10,after:2}),null);
  const opened=engine.trigger({before:10,after:0,source:'attack-start',attackKey:'vertical9'});
  assert.equal(opened.type,'opened');
  assert.equal(engine.snapshot().phase,'open');
  assert.equal(engine.snapshot().catchOpen,true);
  engine.update(.30);
  assert.ok(Math.abs(engine.snapshot().remaining-.42)<1e-9);
  const success=engine.playStance({cardId:'S24',stanceId:'S24'});
  assert.equal(success.type,'success');
  assert.equal(engine.snapshot().phase,'success');
  assert.equal(engine.snapshot().attacksBlocked,false);
  engine.update(.42);
  assert.equal(engine.snapshot().phase,'idle');
}

{
  const engine=createExhaustionCatchEngine();
  engine.trigger({before:5,after:0});
  const cancelled=engine.cancel('whiff-refund');
  assert.equal(cancelled.type,'cancelled');
  assert.equal(cancelled.reason,'whiff-refund');
  assert.equal(engine.snapshot().phase,'idle');
}

{
  const engine=createExhaustionCatchEngine();
  engine.trigger({before:8,after:0});
  engine.update(.73);
  assert.equal(engine.snapshot().phase,'missed');
  assert.equal(engine.snapshot().attacksBlocked,true);
  assert.equal(engine.playStance({cardId:'S01'}),null,'a late stance play cannot rescue a missed catch');
  const failure=engine.beginFailure();
  assert.equal(failure.type,'failure-started');
  assert.equal(engine.snapshot().phase,'failed');
  assert.ok(engine.snapshot().movementMultiplier<.2);
  engine.update(.35);
  assert.ok(engine.snapshot().movementMultiplier>=.41&&engine.snapshot().movementMultiplier<=.43);
  engine.update(2.65);
  assert.equal(engine.snapshot().phase,'idle');
}

{
  const samples=[0,.1,.35,1,2,3].map(elapsed=>exhaustionFailureMovementMultiplier({elapsed,duration:3,stumbleDuration:.35}));
  for(let i=1;i<samples.length;i++)assert.ok(samples[i]>=samples[i-1],`movement curve must be monotonic at ${i}`);
  assert.equal(samples.at(-1),1);
}

console.log('exhaustion catch engine tests passed');
