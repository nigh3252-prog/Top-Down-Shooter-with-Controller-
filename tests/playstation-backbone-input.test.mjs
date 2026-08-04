import assert from 'node:assert/strict';
import { readPlayStationBackboneInput } from '../src/playstation-backbone-input.js';
const gamepad=(down=[])=>({id:'Backbone One PlayStation',mapping:'standard',buttons:Array.from({length:16},(_,index)=>({pressed:down.includes(index)}))});
{
  const input=readPlayStationBackboneInput(gamepad([0]),{});
  assert.equal(input.current.cross,true);
  assert.equal(input.current.square,false);
  assert.equal(input.pressed.cross,true);
}
{
  const input=readPlayStationBackboneInput(gamepad([2,7]),{});
  assert.equal(input.current.square,true);
  assert.equal(input.current.r2,true);
  assert.equal(input.current.cross,false);
}
{
  const input=readPlayStationBackboneInput(gamepad([6]),{cross:true,l2:false});
  assert.equal(input.pressed.l2,true);
  assert.equal(input.released.cross,true);
}
console.log('PlayStation Backbone input mapping tests passed');
