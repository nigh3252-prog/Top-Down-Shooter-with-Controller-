// Explicit bridge between the authoritative arena enemy simulation and a
// second renderer (currently the Ecctrl/R3F Enemy Lab surface).
//
// Only serializable presentation state crosses the boundary. Three.js roots,
// materials, and other Saturn-owned objects remain private to arena-runtime.

const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export const DEFAULT_WORLD_SPRITE_LAB_PLAN=Object.freeze({
  label:'Ecctrl Wrinkeler Depth',
  groups:Object.freeze([Object.freeze({spawnKind:'accordion2d',count:2})]),
});

export function isWorldSpriteEnemy(enemy){
  return !!(enemy?.accordion2d||enemy?.worldSpriteKind||enemy?.worldSpriteEnemy);
}

export function snapshotWorldSpriteEnemy(enemy={}){
  const snapshot={};
  for(const [key,value] of Object.entries(enemy)){
    if(value===null||['string','number','boolean'].includes(typeof value))snapshot[key]=value;
  }
  if(enemy.worldSpriteFrame&&typeof enemy.worldSpriteFrame==='object'){
    snapshot.worldSpriteFrame=Object.freeze(Object.fromEntries(
      Object.entries(enemy.worldSpriteFrame).filter(([,value])=>value===null||['string','number','boolean'].includes(typeof value)),
    ));
  }
  return Object.freeze(snapshot);
}

export function createWorldSpriteEnemyRuntimeBridge({
  enemySystem,
  isRuntimeRunning=()=>false,
  isRuntimeDestroyed=()=>false,
}={}){
  if(!enemySystem?.enemies||typeof enemySystem.update!=='function'){
    throw new TypeError('createWorldSpriteEnemyRuntimeBridge requires the arena enemy system.');
  }

  const living=()=>enemySystem.enemies.filter(enemy=>isWorldSpriteEnemy(enemy)&&finite(enemy?.hp,1)>0);
  const snapshot=()=>Object.freeze(living().map(snapshotWorldSpriteEnemy));

  function ensureScenario({roomId=-778,plan=DEFAULT_WORLD_SPRITE_LAB_PLAN}={}){
    if(isRuntimeDestroyed())return Object.freeze({ok:false,error:'Arena runtime is destroyed.',enemies:Object.freeze([])});
    const existing=living();
    if(existing.length)return Object.freeze({ok:true,reused:true,enemies:snapshot()});
    const response=enemySystem.startLabScenario?.(roomId,plan);
    if(!response?.ok)return Object.freeze({...response,ok:false,enemies:Object.freeze([])});

    // The regular maze spawner may place the new enemies outside Ecctrl's small
    // hex chamber. Move the actual simulated instances—not presentation copies—
    // to a deterministic front/behind starting pair for the depth check.
    const placements=[{x:0,z:-3.8},{x:-3.4,z:2.2}];
    const spawned=living();
    for(let index=0;index<spawned.length;index++){
      const placement=placements[index%placements.length];
      enemySystem.moveEnemyResolved?.(spawned[index],placement,{resetVelocity:true});
    }
    return Object.freeze({ok:true,reused:false,plan:response.plan||plan,enemies:snapshot()});
  }

  function step({delta=0,player={}}={}){
    if(isRuntimeDestroyed())return Object.freeze([]);
    // Saturn owns simulation while its own render loop is running. Ecctrl owns
    // only the paused-runtime interval, preventing a second AI tick per frame.
    if(!isRuntimeRunning()){
      const dt=clamp(finite(delta),0,.05);
      if(dt>0)enemySystem.update(dt,{
        x:finite(player?.x),z:finite(player?.z),targetable:true,invulnerable:true,
      });
    }
    return snapshot();
  }

  return Object.freeze({ensureScenario,snapshot,step});
}
