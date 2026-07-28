import { ARENA_ENEMY_CATALOG, COMBINED_ENCOUNTER_GROUPS } from './arena-enemy-catalog.js';
import { createBudgetEncounterPlan } from './combined-encounter-director.js';
import { normalizeWorkingRosterIds } from './enemy-lab-working-roster.js';
import { WORKING_ROSTER_HADES_ID } from './encounter-pools.js';
import { LUGARU_DUELIST_ID } from './lugaru-duelist.js';

const tunedBySpawnKind=new Map(COMBINED_ENCOUNTER_GROUPS.map(group=>[group.spawnKind,group]));
const originalIntroductionDepth=Object.freeze({
  grunt:1,
  dagger:2,
  rock:2,
  mace:3,
  [LUGARU_DUELIST_ID]:5,
  captain:6,
});

function unique(values){return [...new Set((values||[]).filter(Boolean))];}

export function createWorkingRosterGroups(rosterIds,catalog=ARENA_ENEMY_CATALOG){
  const normalized=normalizeWorkingRosterIds(rosterIds,catalog);
  const selected=new Set(normalized);
  return catalog.filter(enemy=>selected.has(enemy.id)).map(enemy=>{
    const tuned=tunedBySpawnKind.get(enemy.spawnKind);
    return Object.freeze({
      id:enemy.id,
      sourceEnemyId:enemy.id,
      label:enemy.label,
      system:enemy.system,
      spawnKind:enemy.spawnKind,
      introductionDepth:originalIntroductionDepth[enemy.id]??tuned?.introductionDepth??enemy.introductionDepth??1,
      encounterCost:tuned?.encounterCost??enemy.encounterCost??8,
      activeWeight:tuned?.activeWeight??enemy.activeWeight??1,
      maxCount:tuned?.maxCount??enemy.maxCount??8,
      needsPartner:!!(tuned?.needsPartner??enemy.needsPartner),
      tags:Object.freeze(unique(tuned?.tags??enemy.tags)),
      avoidTags:Object.freeze(unique(tuned?.avoidTags??enemy.avoidTags)),
      arenaStatus:enemy.arenaStatus||'candidate',
    });
  });
}

export function createWorkingRosterEncounterPlan({
  depth=1,
  rosterIds=[],
  random=Math.random,
  catalog=ARENA_ENEMY_CATALOG,
}={}){
  const normalized=normalizeWorkingRosterIds(rosterIds,catalog);
  const groups=createWorkingRosterGroups(normalized,catalog);
  const plan=createBudgetEncounterPlan({
    depth,
    random,
    groups,
    mode:WORKING_ROSTER_HADES_ID,
  });
  return {
    ...plan,
    rosterIds:normalized,
    rosterCount:normalized.length,
    availableTypeCount:groups.length,
    sameSystemMixing:false,
  };
}
