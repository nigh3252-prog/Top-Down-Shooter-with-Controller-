import assert from 'node:assert/strict';
import { createArenaRuntimeLifecycle } from '../src/arena-runtime-lifecycle.js';

const scheduled=[];
const cancelled=[];
const frames=[];
let nextId=1;
const lifecycle=createArenaRuntimeLifecycle({
  requestAnimationFrame:callback=>{const id=nextId++;scheduled.push({id,callback});return id;},
  cancelAnimationFrame:id=>cancelled.push(id),
  onFrame:time=>frames.push(time),
});

assert.equal(lifecycle.start(),true);
assert.equal(lifecycle.running,true);
assert.equal(scheduled.length,1);
assert.equal(lifecycle.start(),true,'starting an active runtime is idempotent');
assert.equal(scheduled.length,1);

const first=scheduled.shift();
first.callback(16);
assert.deepEqual(frames,[16]);
assert.equal(scheduled.length,1,'a live frame schedules its successor');

assert.equal(lifecycle.stop(),true);
assert.deepEqual(cancelled,[2]);
assert.equal(lifecycle.running,false);
const stopped=scheduled.shift();
stopped.callback(32);
assert.deepEqual(frames,[16],'a stopped runtime ignores a queued callback');
assert.equal(scheduled.length,0);

assert.equal(lifecycle.start(),true);
assert.equal(lifecycle.destroy(),true);
assert.equal(lifecycle.destroy(),false);
assert.equal(lifecycle.running,false);
assert.equal(lifecycle.destroyed,true);
assert.equal(lifecycle.start(),false);
console.log('arena runtime lifecycle: ok');
