import assert from 'node:assert/strict';
import { ARENA_ENEMY_CATALOG } from '../src/arena-enemy-catalog.js';
import { ENEMY_LAB_WORKING_ROSTER_STORAGE_KEY } from '../src/enemy-lab-working-roster.js';
import { WORKING_ROSTER_HADES_ID } from '../src/encounter-pools.js';
import { createWorkingRosterEncounterPlan } from '../src/working-roster-encounter.js';
import {
  installWorkingRosterEncounterMode,
  rosterSpawnFlowSettings,
} from '../src/working-roster-encounter-mode.js';

const scaled=createWorkingRosterEncounterPlan({
  depth:3,
  rosterIds:['grunt','hadesNumbskull'],
  random:()=>0,
  spawnMultiplier:5,
  difficultyRamp:'high',
});
assert.equal(scaled.spawnMultiplier,5);
assert.equal(scaled.difficultyRamp,'high');
assert.ok(scaled.requestedProgressionDepth>scaled.depth);
assert.ok(scaled.totalCount>5);
assert.ok(scaled.groups.every(group=>group.count<=scaled.populationCaps[group.system]));

const slowFlow=rosterSpawnFlowSettings({groups:[{system:'original',count:9}],spawnDelay:.72,difficultyRamp:'slow'},'original',9);
const highFlow=rosterSpawnFlowSettings({groups:[{system:'original',count:9}],spawnDelay:.72,difficultyRamp:'high'},'original',9);
assert.deepEqual(highFlow,slowFlow,'enemy-introduction speed must not alter reinforcement cadence');
assert.equal(slowFlow.plannedCount,9);
assert.equal(slowFlow.simultaneousTelegraphs,2);
assert.equal(slowFlow.activeWeightCap,5.85);
assert.equal(slowFlow.spawnDelay,.72);

function geometry(){return{clone:geometry,dispose(){}};}
function material(){return{opacity:0,color:{setHex(){}},clone:material,dispose(){}};}
function position(x=0,y=0,z=0){return{x,y,z,set(nx,ny,nz){this.x=nx;this.y=ny;this.z=nz;}};}
function telegraph(){return{geometry:geometry(),material:material(),position:position(),rotation:{x:0,z:0},scale:{setScalar(){}},clone:telegraph};}
function group(){return{children:[],add(item){item.parent=this;this.children.push(item);},remove(item){this.children=this.children.filter(entry=>entry!==item);item.parent=null;}};}

const storageData=new Map([[ENEMY_LAB_WORKING_ROSTER_STORAGE_KEY,JSON.stringify(['grunt'])]]);
const storage={getItem:key=>storageData.get(key)??null,setItem:(key,value)=>storageData.set(key,String(value))};
const rootGroup=group();
let waveSize=1;
let childUpdates=0;
const spawnXs=[20,18,6,7,14,13,12,11,10];
const originalSystem={
  enemies:[],group:rootGroup,director:{releaseAllForEnemy(){}},
  setSpawnKind(){},setWaveSize(value){waveSize=Math.round(Number(value)||1);},
  startRoomEncounter(){
    this.enemies.splice(0);
    for(let i=0;i<waveSize;i++){
      const root={visible:true,parent:rootGroup,isEnemyRoot:true,position:position(spawnXs[i]??i,0,0),traverse(){}};
      rootGroup.children.push(root);
      this.enemies.push({kind:'grunt',x:spawnXs[i]??i,z:0,hp:10,root,telegraph:telegraph(),cooldown:0});
    }
  },
  update(){childUpdates++;},reset(){this.enemies.splice(0);},clearRoomRuntime(){this.enemies.splice(0);},
  get spawnKind(){return'goblins';},
};
const source={
  enemies:[],originalSystem,flareSystem:{enemies:[],group:group()},hadesSystem:{setTelegraphedSpawns(){}},
  factionService:{releaseTarget(){}},damageEnemy(){},setSpawnKind(){},get spawnKind(){return'mixed';},
  currentEncounterPlan:{groups:[{system:'original',count:9}],totalCount:9,spawnDelay:.72},
};
installWorkingRosterEncounterMode(source,{storage,catalog:ARENA_ENEMY_CATALOG});
source.setSpawnKind(WORKING_ROSTER_HADES_ID);
originalSystem.setSpawnKind('grunt');
originalSystem.setWaveSize(9);
originalSystem.startRoomEncounter(-1);

assert.equal(originalSystem.enemies.length,0,'the opening cohort remains behind spawn rings');
assert.equal(originalSystem.telegraphCount,2,'roster mode opens two Hades-style spawn rings at a time');
assert.equal(originalSystem.queuedSpawnCount,7,'the rest of the batch is held as reinforcements');
assert.equal(rootGroup.children.some(item=>item.isEnemyRoot),false,'enemy models are detached until the preview ring completes');
const openingRingXs=rootGroup.children.map(item=>item.position?.x).filter(Number.isFinite).sort((a,b)=>a-b);
assert.deepEqual(openingRingXs,[6,6],'the opening previews preserve the base roster batch order');

originalSystem.update(.4,{x:0,z:0});
assert.equal(childUpdates,0,'AI remains paused while no enemy has finished spawning');
assert.equal(originalSystem.enemies.length,0);
assert.equal(rootGroup.children.some(item=>item.isEnemyRoot),false);

originalSystem.update(.4,{x:0,z:0});
assert.equal(originalSystem.enemies.length,2,'only the first cohort enters combat after the rings finish');
assert.ok(originalSystem.enemies.every(enemy=>enemy.kind==='grunt'&&enemy.root.visible&&enemy.root.parent===rootGroup));
assert.equal(originalSystem.telegraphCount,2,'the next cohort starts telegraphing immediately');
assert.equal(originalSystem.queuedSpawnCount,5);
assert.equal(childUpdates,1,'active enemies keep fighting while reinforcements telegraph');

originalSystem.update(.8,{x:0,z:0});
assert.equal(originalSystem.enemies.length,4);
assert.equal(originalSystem.telegraphCount,1,'the active-weight ceiling prevents the whole reserve from arriving at once');
assert.equal(originalSystem.queuedSpawnCount,4);

originalSystem.enemies.splice(0,3);
originalSystem.update(.01,{x:0,z:0});
assert.equal(originalSystem.enemies.length,1);
assert.equal(originalSystem.telegraphCount,2,'deaths open room for another reinforcement cohort');
assert.equal(originalSystem.queuedSpawnCount,3);
assert.equal(source.getWorkingRosterEncounterStatus().previewBeforeModel,true);

console.log('Working roster Hades-style gap coverage: ok');
