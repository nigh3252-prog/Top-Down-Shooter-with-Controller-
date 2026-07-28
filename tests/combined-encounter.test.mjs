import assert from 'node:assert/strict';
import {
  COMBINED_ENCOUNTER_GROUPS,
  areCombinedGroupsCompatible,
  createCombinedEncounterPlan,
} from '../src/combined-encounter-director.js';
import {
  ARENA_ENEMY_CATALOG,
  ARENA_ENEMY_FAMILIES,
  COMBINED_ENCOUNTER_GROUPS as CATALOG_COMBINED_ENCOUNTER_GROUPS,
  getArenaEnemyCatalogEntry,
} from '../src/arena-enemy-catalog.js';
import { ALL_ENEMIES_BUDGET_ID } from '../src/encounter-pools.js';
import { FUSION_ENEMY_OPTIONS } from '../src/fusion-enemies.js';
import { HADES_TARTARUS_POOL_ID } from '../src/hades-enemies.js';

function seeded(seed){
  let state=seed>>>0;
  return ()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
}

assert.equal(COMBINED_ENCOUNTER_GROUPS,CATALOG_COMBINED_ENCOUNTER_GROUPS,'the encounter director should re-export the canonical catalog groups');
assert.deepEqual(ARENA_ENEMY_FAMILIES,['GOBLINS','FUSION','FLARE','HADES']);
assert.equal(new Set(ARENA_ENEMY_CATALOG.map(enemy=>enemy.id)).size,ARENA_ENEMY_CATALOG.length,'catalog enemy ids should be unique');
assert.ok(ARENA_ENEMY_CATALOG.some(enemy=>enemy.id==='Lugaru Duelist'));
assert.ok(ARENA_ENEMY_CATALOG.every(enemy=>enemy.spawnKind&&enemy.label&&enemy.family&&enemy.system));
assert.ok(ARENA_ENEMY_CATALOG.every(enemy=>['candidate','arena','lab','disabled'].includes(enemy.arenaStatus)));
for(const group of COMBINED_ENCOUNTER_GROUPS){
  if(group.spawnKind==='goblins')continue;
  const catalogEnemy=getArenaEnemyCatalogEntry(group.spawnKind);
  assert.ok(catalogEnemy,`combined group ${group.id} should point to a catalog enemy`);
  assert.equal(group.system,catalogEnemy.system);
  assert.equal(group.label,catalogEnemy.label);
}

const seenSystems=new Set();
let maxCount=0;
for(let depth=1;depth<=14;depth++){
  for(let seed=1;seed<=200;seed++){
    const plan=createCombinedEncounterPlan({depth,random:seeded(depth*1000+seed)});
    assert.equal(plan.usesWaveSizeSlider,false);
    assert.ok(plan.groups.length>=1&&plan.groups.length<=2);
    assert.equal(new Set(plan.groups.map(group=>group.system)).size,plan.groups.length);
    assert.equal(plan.totalCount,plan.groups.reduce((sum,group)=>sum+group.count,0));
    assert.ok(plan.spent<=plan.budget);
    assert.ok(plan.groups.every(group=>group.introductionDepth<=depth));
    if(depth<3)assert.equal(plan.groups.length,1);
    if(plan.groups.length===1)assert.ok(!plan.groups[0].needsPartner);
    if(plan.groups.length===2)assert.ok(areCombinedGroupsCompatible(plan.groups[0],plan.groups[1],depth));
    for(const group of plan.groups)seenSystems.add(group.system);
    maxCount=Math.max(maxCount,plan.totalCount);
  }
}

assert.deepEqual([...seenSystems].sort(),['flare','hades','original']);
assert.ok(maxCount>6,'later budget encounters should exceed the manual six-enemy slider');
assert.ok(COMBINED_ENCOUNTER_GROUPS.some(group=>group.spawnKind==='goblins'));
assert.ok(COMBINED_ENCOUNTER_GROUPS.some(group=>group.spawnKind==='mother'));
assert.ok(COMBINED_ENCOUNTER_GROUPS.some(group=>group.spawnKind==='flareGoblinRunner'));
assert.ok(COMBINED_ENCOUNTER_GROUPS.some(group=>group.spawnKind==='hadesWretchedWitch'));
assert.equal(FUSION_ENEMY_OPTIONS[0].id,ALL_ENEMIES_BUDGET_ID);
assert.ok(FUSION_ENEMY_OPTIONS.some(option=>option.id===HADES_TARTARUS_POOL_ID));
console.log('Canonical enemy catalog and combined encounter budget planner: ok');
