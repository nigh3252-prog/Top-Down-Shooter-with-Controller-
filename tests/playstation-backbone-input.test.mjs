import assert from 'node:assert/strict';
import { readPlayStationBackboneInput, resolvePlayStationBackboneActions } from '../src/playstation-backbone-input.js';
const gamepad=(down=[],values={})=>({
  id:'Backbone One PlayStation',mapping:'standard',
  buttons:Array.from({length:16},(_,index)=>({pressed:down.includes(index),value:values[index]??(down.includes(index)?1:0)})),
});
{
  const input=readPlayStationBackboneInput(gamepad([0]),{});
  assert.equal(input.current.cross,true);
  assert.equal(input.current.square,false);
  assert.deepEqual(input.rawDown,[0]);
  assert.deepEqual(input.rawPressed,[0]);
  const actions=resolvePlayStationBackboneActions(input);
  assert.equal(actions.defensePressed,true);
  assert.equal(actions.lightPressed,false);
}
{
  // Some Android controller paths can report a face-button alias on the same
  // frame. Defense must win so Hammerfall is not rejected as attack-busy.
  const input=readPlayStationBackboneInput(gamepad([0,2]),{});
  const actions=resolvePlayStationBackboneActions(input);
  assert.equal(actions.aliasConflict,true);
  assert.equal(actions.defensePressed,true);
  assert.equal(actions.lightPressed,false);
}
{
  const input=readPlayStationBackboneInput(gamepad([2,7]),{});
  const actions=resolvePlayStationBackboneActions(input);
  assert.equal(actions.defensePressed,false);
  assert.equal(actions.lightPressed,true);
}
{
  const input=readPlayStationBackboneInput(gamepad([],{0:.9}),{});
  assert.equal(input.current.cross,true,'analog value should count when pressed is false');
}
console.log('PlayStation Backbone input mapping tests passed');
