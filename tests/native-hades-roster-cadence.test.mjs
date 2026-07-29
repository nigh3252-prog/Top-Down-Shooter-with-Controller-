import assert from 'node:assert/strict';
import { WORKING_ROSTER_HADES_ID } from '../src/encounter-pools.js';
import {
  createNativeHadesCadencePlan,
  installNativeHadesRosterCadence,
} from '../src/hades-native-roster-cadence.js';

const nineEnemyPlan=createNativeHadesCadencePlan(9);
assert.ok(Math.abs(nineEnemyPlan.activeWeightCap-5.85)<1e-9);
assert.equal(nineEnemyPlan.simultaneousTelegraphs,2);
assert.equal(nineEnemyPlan.spawnDelay,.72);
assert.deepEqual(createNativeHadesCadencePlan(1),{
  activeWeightCap:2.5,
  simultaneousTelegraphs:2,
  spawnDelay:.72,
});

function geometry(){return{clone:geometry,dispose(){}};}
function material(){return{opacity:0,color:{setHex(){}},clone:material,dispose(){}};}
function vector(){return{x:1,y:1,z:1,set(x,y,z){this.x=x;this.y=y;this.z=z;},multiplyScalar(value){this.x*=value;this.y*=value;this.z*=value;}};}
function telegraph(){return{geometry:geometry(),material:material(),position:vector(),rotation:{x:0,z:0},scale:vector(),clone:telegraph};}
function group(){return{children:[],add(item){if(item.parent&&item.parent!==this)item.parent.remove?.(item);item.parent=this;if(!this.children.includes(item))this.children.push(item);},remove(item){this.children=this.children.filter(entry=>entry!==item);if(item)item.parent=null;}};}

function makeSystem(kind='grunt',count=9){
  const rootGroup=group();
  let childUpdates=0;
  let oldAdapterEnabled=null;
  const system={
    enemies:[],
    group:rootGroup,
    setWorkingRosterSpawnTelegraphs(value){oldAdapterEnabled=!!value;},
    startRoomEncounter(){
      this.enemies.splice(0);
      for(let index=0;index<count;index++){
        const root={visible:true,parent:null,position:vector()};
        rootGroup.add(root);
        this.enemies.push({
          id:index+1,
          kind,
          role:'goblin',
          hp:10,
          radius:1,
          x:4+index*.35,
          z:index%2?.5:-.5,
          cooldown:.3,
          root,
          telegraph:telegraph(),
        });
      }
    },
    update(){childUpdates++;},
    reset(){this.enemies.splice(0);},
    clearRoomRuntime(){this.enemies.splice(0);},
    get childUpdates(){return childUpdates;},
    get oldAdapterEnabled(){return oldAdapterEnabled;},
  };
  return system;
}

const originalSystem=makeSystem('grunt',9);
const flareSystem=makeSystem('flareGoblinScamp',0);
let selected='';
const source={
  originalSystem,
  flareSystem,
  hadesSystem:{},
  currentEncounterPlan:{groups:[{system:'original',count:9}]},
  setSpawnKind(kind){selected=kind;return kind;},
  getWorkingRosterEncounterStatus(){return{active:selected===WORKING_ROSTER_HADES_ID};},
};

installNativeHadesRosterCadence(source);
source.setSpawnKind(WORKING_ROSTER_HADES_ID);
assert.equal(originalSystem.oldAdapterEnabled,false,'the approximation adapter is disabled in roster mode');
assert.equal(flareSystem.oldAdapterEnabled,false);
assert.equal(source.getWorkingRosterEncounterStatus().cadence,'native-hades');

originalSystem.startRoomEncounter(-1);
assert.equal(originalSystem.enemies.length,0,'models do not exist in the active simulation before their rings finish');
assert.equal(originalSystem.telegraphCount,2,'native Hades fallback opens two rings');
assert.equal(originalSystem.queuedSpawnCount,7);
assert.equal(originalSystem.group.children.filter(child=>String(child.name||'').includes('native Hades spawn preview')).length,2);

originalSystem.update(.36,{x:0,z:0});
assert.equal(originalSystem.childUpdates,0,'AI remains paused while no spawn has completed');
assert.equal(originalSystem.enemies.length,0);

originalSystem.update(.37,{x:0,z:0});
assert.equal(originalSystem.enemies.length,2);
assert.equal(originalSystem.telegraphCount,2,'the next legal cohort starts immediately');
assert.equal(originalSystem.queuedSpawnCount,5);
assert.equal(originalSystem.childUpdates,1);

originalSystem.update(.73,{x:0,z:0});
assert.equal(originalSystem.enemies.length,4,'the catalog max-active limit matches Hades per-kind gating');
assert.equal(originalSystem.telegraphCount,0);
assert.equal(originalSystem.queuedSpawnCount,5);

originalSystem.enemies.splice(0,2);
originalSystem.update(.01,{x:0,z:0});
assert.equal(originalSystem.telegraphCount,2,'deaths open space for the next Hades-style reinforcement cohort');
assert.equal(originalSystem.queuedSpawnCount,3);

source.setSpawnKind('all-enemies-budget');
assert.equal(originalSystem.queuedSpawnCount,0);
assert.equal(originalSystem.telegraphCount,0);

console.log('Native Hades roster cadence: ok');
