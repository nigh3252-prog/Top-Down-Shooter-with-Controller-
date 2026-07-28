import assert from 'node:assert/strict';
import { ARENA_ENEMY_CATALOG } from '../src/arena-enemy-catalog.js';
import {
  createCombinedEncounterPlan,
  setCombinedEncounterPlanResolver,
} from '../src/combined-encounter-director.js';
import {
  ENEMY_LAB_WORKING_ROSTER_STORAGE_KEY,
} from '../src/enemy-lab-working-roster.js';
import {
  ALL_ENEMIES_BUDGET_ID,
  WORKING_ROSTER_HADES_ID,
} from '../src/encounter-pools.js';
import { FUSION_ENEMY_OPTIONS } from '../src/fusion-enemies.js';
import { LUGARU_DUELIST_ID } from '../src/lugaru-duelist.js';
import {
  createWorkingRosterEncounterPlan,
} from '../src/working-roster-encounter.js';
import {
  installWorkingRosterEncounterMode,
} from '../src/working-roster-encounter-mode.js';

function seeded(seed){
  let state=seed>>>0;
  return ()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
}

const mixedRoster=['grunt','flareCrackedSkeleton','hadesWretchedWitch'];
const mixedSeen=new Set();
for(let depth=1;depth<=8;depth++){
  for(let seed=1;seed<=120;seed++){
    const plan=createWorkingRosterEncounterPlan({depth,rosterIds:mixedRoster,random:seeded(depth*1000+seed)});
    assert.equal(plan.mode,WORKING_ROSTER_HADES_ID);
    assert.equal(plan.rosterCount,mixedRoster.length);
    assert.ok(plan.groups.length>=1&&plan.groups.length<=2);
    assert.equal(new Set(plan.groups.map(group=>group.system)).size,plan.groups.length);
    assert.ok(plan.groups.every(group=>mixedRoster.includes(group.spawnKind)));
    assert.equal(plan.totalCount,plan.groups.reduce((sum,group)=>sum+group.count,0));
    for(const group of plan.groups)mixedSeen.add(group.spawnKind);
  }
}
assert.deepEqual([...mixedSeen].sort(),[...mixedRoster].sort());

const sameSystemRoster=['grunt','mace',LUGARU_DUELIST_ID];
const sameSystemSeen=new Set();
for(const randomValue of [0,.4,.8]){
  const plan=createWorkingRosterEncounterPlan({depth:8,rosterIds:sameSystemRoster,random:()=>randomValue});
  assert.equal(plan.groups.length,1,'same-system types rotate between encounters until multi-type routing is added');
  assert.equal(plan.groups[0].system,'original');
  sameSystemSeen.add(plan.groups[0].spawnKind);
}
assert.deepEqual([...sameSystemSeen].sort(),[...sameSystemRoster].sort());

const lionPlan=createWorkingRosterEncounterPlan({depth:1,rosterIds:['lion'],random:()=>0});
assert.equal(lionPlan.groups[0].spawnKind,'lion');
assert.equal(lionPlan.groups[0].arenaStatus,'lab-only');
assert.equal(lionPlan.planningDepth,2,'a roster containing only a later enemy remains playable from room one');
const noLionPlan=createWorkingRosterEncounterPlan({depth:8,rosterIds:['spid','hadesNumbskull'],random:()=>0});
assert.ok(noLionPlan.groups.every(group=>group.spawnKind!=='lion'));

const captainPlan=createWorkingRosterEncounterPlan({depth:1,rosterIds:['captain'],random:()=>0});
assert.equal(captainPlan.groups[0].spawnKind,'captain');
assert.equal(captainPlan.planningDepth,6);
assert.ok(captainPlan.budget>=captainPlan.spent);
const emptyPlan=createWorkingRosterEncounterPlan({depth:4,rosterIds:[],random:()=>0});
assert.equal(emptyPlan.totalCount,0);
assert.deepEqual(emptyPlan.groups,[]);

const storageData=new Map([[ENEMY_LAB_WORKING_ROSTER_STORAGE_KEY,JSON.stringify(['grunt','hadesWretchedWitch'])]]);
const storage={
  getItem:key=>storageData.get(key)??null,
  setItem:(key,value)=>storageData.set(key,String(value)),
};
const originalKinds=['grunt','dagger','mace','rock','captain'];
let childSpawnKind='goblins',childWaveSize=1,lugaruConversions=0;
const originalSystem={
  enemies:[],
  director:{releaseAllForEnemy(){}},
  setSpawnKind(kind){childSpawnKind=kind;},
  setWaveSize(value){childWaveSize=Math.round(Number(value)||1);},
  startRoomEncounter(){
    this.enemies.splice(0);
    for(let i=0;i<childWaveSize;i++){
      const root={parent:{remove(){root.parent=null;}}};
      this.enemies.push({kind:originalKinds[i%originalKinds.length],hp:10,root});
    }
  },
  configureLugaruDuelists(enemies){
    lugaruConversions++;
    for(const enemy of enemies){enemy.kind=LUGARU_DUELIST_ID;enemy._lugaruDuelist=true;}
  },
  get spawnKind(){return childSpawnKind;},
};
let topSpawnKind='mixed';
const source={
  enemies:[],
  originalSystem,
  damageEnemy(){return false;},
  setSpawnKind(kind){topSpawnKind=kind;},
  get spawnKind(){return topSpawnKind;},
};
installWorkingRosterEncounterMode(source,{storage,catalog:ARENA_ENEMY_CATALOG});
source.setSpawnKind(WORKING_ROSTER_HADES_ID);
assert.equal(topSpawnKind,ALL_ENEMIES_BUDGET_ID,'roster mode reuses the real combined-system runtime');
assert.equal(source.spawnKind,WORKING_ROSTER_HADES_ID);
const installedPlan=createCombinedEncounterPlan({depth:5,random:()=>0});
assert.equal(installedPlan.mode,WORKING_ROSTER_HADES_ID);
assert.ok(installedPlan.groups.every(group=>['grunt','hadesWretchedWitch'].includes(group.spawnKind)));

originalSystem.setSpawnKind('grunt');
originalSystem.setWaveSize(2);
assert.equal(childWaveSize,10,'individual goblin requests expand one complete five-kind cycle before filtering');
originalSystem.startRoomEncounter(-1);
assert.equal(originalSystem.enemies.length,2);
assert.ok(originalSystem.enemies.every(enemy=>enemy.kind==='grunt'));

originalSystem.setSpawnKind(LUGARU_DUELIST_ID);
originalSystem.setWaveSize(2);
originalSystem.startRoomEncounter(-2);
assert.equal(originalSystem.enemies.length,2);
assert.ok(originalSystem.enemies.every(enemy=>enemy.kind===LUGARU_DUELIST_ID&&enemy._lugaruDuelist));
assert.equal(lugaruConversions,1);

source.setSpawnKind(ALL_ENEMIES_BUDGET_ID);
assert.equal(source.spawnKind,ALL_ENEMIES_BUDGET_ID);
assert.equal(createCombinedEncounterPlan({depth:2,random:()=>0}).mode,ALL_ENEMIES_BUDGET_ID);
storage.setItem(ENEMY_LAB_WORKING_ROSTER_STORAGE_KEY,'[]');
source.setSpawnKind(WORKING_ROSTER_HADES_ID);
assert.equal(source.spawnKind,ALL_ENEMIES_BUDGET_ID,'an empty roster falls back instead of creating an uncleared room');
setCombinedEncounterPlanResolver(null);

assert.equal(FUSION_ENEMY_OPTIONS[0].id,ALL_ENEMIES_BUDGET_ID);
assert.ok(FUSION_ENEMY_OPTIONS.some(option=>option.id===WORKING_ROSTER_HADES_ID));
console.log('Working roster Hades-style encounters: ok');
