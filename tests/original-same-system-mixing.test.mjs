import assert from 'node:assert/strict';
import { ARENA_ENEMY_CATALOG } from '../src/arena-enemy-catalog.js';
import {
  createCombinedEncounterPlan,
  setCombinedEncounterPlanResolver,
} from '../src/combined-encounter-director.js';
import { ENEMY_LAB_WORKING_ROSTER_STORAGE_KEY } from '../src/enemy-lab-working-roster.js';
import {
  ORIGINAL_MULTI_GROUP_SPAWN_KIND,
  collapseOriginalExecutionGroups,
  installOriginalEncounterGroupSupport,
} from '../src/original-encounter-groups.js';
import { LUGARU_DUELIST_ID } from '../src/lugaru-duelist.js';
import { createWorkingRosterSameSystemPlan } from '../src/working-roster-same-system-plan.js';
import { installWorkingRosterSameSystemMode } from '../src/working-roster-same-system-mode.js';

function seeded(seed){
  let state=seed>>>0;
  return()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
}

const roster=['mace','rock',LUGARU_DUELIST_ID];
const plan=createWorkingRosterSameSystemPlan({
  depth:5,
  rosterIds:roster,
  random:()=>0,
  spawnMultiplier:10,
  difficultyRamp:'slow',
});
assert.equal(plan.sameSystemMixing,true);
assert.equal(plan.groups.length,3,'a focused compatible Original roster mixes without requiring a lucky room roll');
assert.deepEqual(new Set(plan.groups.map(group=>group.system)),new Set(['original']));
assert.deepEqual([...plan.typeIds].sort(),[...roster].sort());
assert.equal(plan.totalCount,20,'scaled Original groups share one 20-body runtime cap');
assert.ok(plan.groups.every(group=>group.count>=1));

const collapsed=collapseOriginalExecutionGroups(plan.groups);
assert.equal(collapsed.collapsed,true);
assert.equal(collapsed.groups.length,1);
assert.equal(collapsed.groups[0].spawnKind,ORIGINAL_MULTI_GROUP_SPAWN_KIND);
assert.equal(collapsed.groups[0].count,20);
assert.equal(collapsed.groups[0].childGroups.length,3);

const rawKinds=['grunt','dagger','mace','rock','captain'];
let rawSpawnKind='goblins';
let rawWaveSize=1;
let rawStarts=0;
let nextId=1;
const group={remove(root){root.parent=null;}};
const system={
  enemies:[],
  director:{releaseAllForEnemy(){}},
  setSpawnKind(kind){rawSpawnKind=kind;},
  setWaveSize(value){rawWaveSize=Math.round(Number(value)||1);},
  startRoomEncounter(){
    rawStarts++;
    this.enemies.splice(0);
    for(let index=0;index<rawWaveSize;index++){
      const kind=rawSpawnKind==='goblins'?rawKinds[index%rawKinds.length]:rawSpawnKind;
      const root={parent:group,traverse(){}};
      this.enemies.push({id:nextId++,kind,hp:10,root,role:'goblin'});
    }
  },
  configureLugaruDuelists(enemies){
    for(const enemy of enemies){enemy._lugaruDuelist=true;enemy.role='duelist';}
  },
  get spawnKind(){return rawSpawnKind;},
};
installOriginalEncounterGroupSupport(system);
system.setWorkingRosterEncounterGroups([
  {system:'original',spawnKind:'mace',count:2},
  {system:'original',spawnKind:'rock',count:3},
  {system:'original',spawnKind:LUGARU_DUELIST_ID,count:1},
]);
system.setSpawnKind(ORIGINAL_MULTI_GROUP_SPAWN_KIND);
system.setWaveSize(6);
system.startRoomEncounter(-1);
assert.equal(rawStarts,3,'the Original runtime starts each authored subgroup once and combines the results');
assert.equal(system.enemies.length,6);
assert.equal(system.enemies.filter(enemy=>enemy.kind==='mace').length,2);
assert.equal(system.enemies.filter(enemy=>enemy.kind==='rock').length,3);
assert.equal(system.enemies.filter(enemy=>enemy._lugaruDuelist).length,1);
assert.equal(system.spawnKind,ORIGINAL_MULTI_GROUP_SPAWN_KIND);

for(let depth=1;depth<=12;depth++){
  for(let seed=1;seed<=200;seed++){
    const ordinary=createCombinedEncounterPlan({depth,random:seeded(depth*1000+seed)});
    assert.equal(new Set(ordinary.groups.map(group=>group.system)).size,ordinary.groups.length,'All Enemies mode keeps one group per runtime');
  }
}

const storageData=new Map([[ENEMY_LAB_WORKING_ROSTER_STORAGE_KEY,JSON.stringify(roster)]]);
const storage={getItem:key=>storageData.get(key)??null,setItem:(key,value)=>storageData.set(key,String(value))};
let assignedGroups=[];
const source={
  originalSystem:{
    supportsSameSystemEncounterGroups:true,
    setWorkingRosterEncounterGroups(groups){assignedGroups=groups.map(group=>({...group}));},
  },
  getWorkingRosterEncounterStatus(){return{active:true};},
};
installWorkingRosterSameSystemMode(source,{storage,catalog:ARENA_ENEMY_CATALOG});
const routed=createCombinedEncounterPlan({depth:5,random:()=>0});
assert.equal(routed.originalGroupsCollapsed,true);
assert.equal(routed.groups.filter(group=>group.system==='original').length,1);
assert.equal(routed.selectedGroups.filter(group=>group.system==='original').length,3);
assert.equal(assignedGroups.length,3);
assert.equal(source.getWorkingRosterEncounterStatus().sameSystemMixing,true);
setCombinedEncounterPlanResolver(null);

console.log('Original same-system roster mixing: ok');
