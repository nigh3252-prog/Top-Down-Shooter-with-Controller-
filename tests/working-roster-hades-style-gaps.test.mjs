import assert from 'node:assert/strict';
import { ARENA_ENEMY_CATALOG } from '../src/arena-enemy-catalog.js';
import { ENEMY_LAB_WORKING_ROSTER_STORAGE_KEY } from '../src/enemy-lab-working-roster.js';
import { WORKING_ROSTER_HADES_ID } from '../src/encounter-pools.js';
import { createWorkingRosterEncounterPlan } from '../src/working-roster-encounter.js';
import { installWorkingRosterEncounterMode } from '../src/working-roster-encounter-mode.js';

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

function geometry(){return{clone:geometry,dispose(){}};}
function material(){return{opacity:0,color:{setHex(){}},clone:material,dispose(){}};}
function telegraph(){return{geometry:geometry(),material:material(),position:{set(){}},rotation:{x:0,z:0},scale:{setScalar(){}},clone:telegraph};}
function group(){return{children:[],add(item){item.parent=this;this.children.push(item);},remove(item){this.children=this.children.filter(entry=>entry!==item);item.parent=null;}};}

const storageData=new Map([[ENEMY_LAB_WORKING_ROSTER_STORAGE_KEY,JSON.stringify(['grunt'])]]);
const storage={getItem:key=>storageData.get(key)??null,setItem:(key,value)=>storageData.set(key,String(value))};
const rootGroup=group();
let waveSize=1;
let childUpdates=0;
const originalSystem={
  enemies:[],group:rootGroup,director:{releaseAllForEnemy(){}},
  setSpawnKind(){},setWaveSize(value){waveSize=Math.round(Number(value)||1);},
  startRoomEncounter(){
    this.enemies.splice(0);
    for(let i=0;i<waveSize;i++){
      const root={visible:true,parent:rootGroup,traverse(){}};
      rootGroup.children.push(root);
      this.enemies.push({kind:['grunt','dagger','mace','rock','captain'][i%5],hp:10,root,telegraph:telegraph()});
    }
  },
  update(){childUpdates++;},reset(){this.enemies.splice(0);},clearRoomRuntime(){this.enemies.splice(0);},
  get spawnKind(){return'goblins';},
};
const source={
  enemies:[],originalSystem,flareSystem:{enemies:[],group:group()},hadesSystem:{setTelegraphedSpawns(){}},
  factionService:{releaseTarget(){}},damageEnemy(){},setSpawnKind(){},get spawnKind(){return'mixed';},
};
installWorkingRosterEncounterMode(source,{storage,catalog:ARENA_ENEMY_CATALOG});
source.setSpawnKind(WORKING_ROSTER_HADES_ID);
originalSystem.setSpawnKind('grunt');
originalSystem.setWaveSize(9);
originalSystem.startRoomEncounter(-1);
assert.equal(originalSystem.enemies.length,0);
assert.equal(originalSystem.telegraphCount,9);
originalSystem.update(.4,{});
assert.equal(childUpdates,0);
originalSystem.update(.4,{});
assert.equal(originalSystem.enemies.length,9);
assert.ok(originalSystem.enemies.every(enemy=>enemy.kind==='grunt'&&enemy.root.visible));
assert.equal(childUpdates,1);

console.log('Working roster Hades-style gap coverage: ok');
