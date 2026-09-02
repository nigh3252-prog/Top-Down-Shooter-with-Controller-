import assert from 'node:assert/strict';
import {
  createWorldSpriteEnemyRuntimeBridge,
  snapshotWorldSpriteEnemy,
} from '../src/world-sprite-enemy-runtime-bridge.js';

const calls={starts:0,moves:[],updates:[]};
let running=false,destroyed=false;
const enemySystem={
  enemies:[],
  startLabScenario(roomId,plan){
    calls.starts++;
    this.enemies.splice(0,this.enemies.length,
      {id:1,wizardStableId:'original:1',accordion2d:true,hp:44,maxHp:44,x:12,z:8,animPhase:0,root:{rendererOwned:true}},
      {id:2,wizardStableId:'original:2',accordion2d:true,hp:44,maxHp:44,x:-9,z:10,animPhase:1,material:{rendererOwned:true}},
      {id:3,wizardStableId:'original:3',accordion2d:false,hp:30,x:1,z:1},
    );
    return{ok:true,plan:{...plan,roomId}};
  },
  moveEnemyResolved(enemy,position,options){
    calls.moves.push({id:enemy.id,position:{...position},options:{...options}});
    enemy.x=position.x;enemy.z=position.z;
    return{current:{...position}};
  },
  update(delta,player){
    calls.updates.push({delta,player:{...player}});
    this.enemies[0].animPhase+=delta;
  },
};
const bridge=createWorldSpriteEnemyRuntimeBridge({
  enemySystem,
  isRuntimeRunning:()=>running,
  isRuntimeDestroyed:()=>destroyed,
});

const started=bridge.ensureScenario();
assert.equal(started.ok,true);
assert.equal(started.reused,false);
assert.equal(calls.starts,1);
assert.deepEqual(calls.moves.map(call=>call.position),[{x:0,z:-3.8},{x:-3.4,z:2.2}],
  'the actual spawned instances begin on opposite sides of the Warden');
assert.equal(started.enemies.length,2,'only authored world-sprite enemies cross the renderer boundary');
assert.equal(started.enemies[0].root,undefined,'Saturn-owned Three.js objects never cross the bridge');
assert.ok(Object.isFrozen(started.enemies[0]));

const stepped=bridge.step({delta:.2,player:{x:2,z:-4}});
assert.equal(calls.updates.length,1);
assert.deepEqual(calls.updates[0],{
  delta:.05,
  player:{x:2,z:-4,targetable:true,invulnerable:true},
},'Ecctrl advances the existing AI once with a clamped step and safe player target');
assert.equal(stepped[0].animPhase,.05,'the next renderer snapshot reflects authoritative animation state');

running=true;
bridge.step({delta:.016,player:{x:9,z:9}});
assert.equal(calls.updates.length,1,'the bridge cannot double-step enemies while Saturn owns the loop');
assert.equal(bridge.ensureScenario().reused,true);
assert.equal(calls.starts,1,'an existing 2D Lab scenario is preserved');

const custom=snapshotWorldSpriteEnemy({id:'custom',worldSpriteKind:'paper',hp:1,frame:4,root:{skip:true},worldSpriteFrame:{pose:'run',index:2,nested:{skip:true}}});
assert.deepEqual(custom,{id:'custom',worldSpriteKind:'paper',hp:1,frame:4,worldSpriteFrame:{pose:'run',index:2}},
  'future 2D definitions receive primitive authored state without renderer objects');

destroyed=true;
assert.deepEqual(bridge.step({delta:.016}),[]);
assert.equal(bridge.ensureScenario().ok,false);

console.log('World-sprite authoritative runtime bridge contract: ok');
