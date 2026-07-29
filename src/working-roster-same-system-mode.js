import { ARENA_ENEMY_CATALOG } from './arena-enemy-catalog.js';
import { readWorkingRoster } from './enemy-lab-working-roster.js';
import { setCombinedEncounterPlanResolver } from './combined-encounter-director.js';
import { collapseOriginalExecutionGroups } from './original-encounter-groups.js';
import { createWorkingRosterSameSystemPlan } from './working-roster-same-system-plan.js';

export function installWorkingRosterSameSystemMode(source,{
  storage=globalThis.localStorage,
  catalog=ARENA_ENEMY_CATALOG,
}={}){
  if(!source||source.__workingRosterSameSystemMode)return source;
  if(!source.originalSystem?.supportsSameSystemEncounterGroups)return source;

  const rosterIds=()=>readWorkingRoster(storage,catalog);
  setCombinedEncounterPlanResolver(({depth=1,random=Math.random}={})=>{
    const status=source.getWorkingRosterEncounterStatus?.();
    if(!status?.active)return null;
    const ids=rosterIds();
    if(!ids.length)return null;
    const selectedPlan=createWorkingRosterSameSystemPlan({depth,random,rosterIds:ids,catalog});
    const execution=collapseOriginalExecutionGroups(selectedPlan.groups);
    source.originalSystem.setWorkingRosterEncounterGroups?.(execution.originalGroups);
    return{
      ...selectedPlan,
      selectedGroups:selectedPlan.groups.map(group=>({...group})),
      groups:execution.groups,
      executionGroups:execution.groups.map(group=>({...group})),
      originalGroups:execution.originalGroups.map(group=>({...group})),
      originalGroupsCollapsed:execution.collapsed,
    };
  });

  const baseStatus=source.getWorkingRosterEncounterStatus?.bind(source);
  source.getWorkingRosterEncounterStatus=()=>({
    ...(baseStatus?.()||{}),
    sameSystemMixing:true,
    sameSystemMixingSystems:['original'],
    maxEncounterTypes:3,
  });
  source.__workingRosterSameSystemMode=true;
  return source;
}
