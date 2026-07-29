import { ARENA_ENEMY_CATALOG, COMBINED_ENCOUNTER_GROUPS } from './arena-enemy-catalog.js';
import { createBudgetEncounterPlan } from './combined-encounter-director.js';
import { normalizeWorkingRosterIds } from './enemy-lab-working-roster.js';
import { WORKING_ROSTER_HADES_ID } from './encounter-pools.js';
import {
  getHadesEncounterDifficultyRamp,
  getHadesEncounterSpawnMultiplier,
  getHadesProgressionDepth,
  normalizeHadesDifficultyRamp,
  normalizeHadesSpawnMultiplier,
} from './hades-encounter-tuning.js';
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
const SYSTEM_POPULATION_CAP=Object.freeze({original:20,flare:20,hades:200});

function unique(values){return [...new Set((values||[]).filter(Boolean))];}
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}

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
  spawnMultiplier=getHadesEncounterSpawnMultiplier(),
  difficultyRamp=getHadesEncounterDifficultyRamp(),
}={}){
  const safeDepth=Math.max(1,Math.round(Number(depth))||1);
  const safeMultiplier=normalizeHadesSpawnMultiplier(spawnMultiplier);
  const safeRamp=normalizeHadesDifficultyRamp(difficultyRamp);
  const requestedProgressionDepth=getHadesProgressionDepth(safeDepth,safeRamp);
  const normalized=normalizeWorkingRosterIds(rosterIds,catalog);
  const groups=createWorkingRosterGroups(normalized,catalog);
  const basePlan=createBudgetEncounterPlan({
    depth:requestedProgressionDepth,
    random,
    groups,
    mode:WORKING_ROSTER_HADES_ID,
  });
  const scaledGroups=basePlan.groups.map(group=>{
    const cap=SYSTEM_POPULATION_CAP[group.system]??20;
    const count=clamp(Math.round((Number(group.count)||1)*safeMultiplier),1,cap);
    return {
      ...group,
      count,
      maxCount:clamp(Math.round((Number(group.maxCount)||1)*safeMultiplier),1,cap),
    };
  });
  const totalCount=scaledGroups.reduce((sum,group)=>sum+group.count,0);
  const planningDepth=basePlan.planningDepth??requestedProgressionDepth;
  return {
    ...basePlan,
    depth:safeDepth,
    progressionDepth:planningDepth,
    requestedProgressionDepth,
    planningDepth,
    spawnMultiplier:safeMultiplier,
    difficultyRamp:safeRamp,
    groups:scaledGroups,
    totalCount,
    maxTotal:Math.max(totalCount,Math.round((Number(basePlan.maxTotal)||0)*safeMultiplier)),
    activeWeightCap:(Number(basePlan.activeWeightCap)||2.75)*safeMultiplier,
    pursuitWeightCap:(Number(basePlan.pursuitWeightCap)||2.7)*safeMultiplier,
    simultaneousTelegraphs:(planningDepth<4?2:3)*safeMultiplier,
    spawnDelay:planningDepth<3?.78:.64,
    rosterIds:normalized,
    rosterCount:normalized.length,
    availableTypeCount:groups.length,
    sameSystemMixing:false,
    populationCaps:SYSTEM_POPULATION_CAP,
  };
}
