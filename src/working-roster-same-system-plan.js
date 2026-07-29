import { ARENA_ENEMY_CATALOG } from './arena-enemy-catalog.js';
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
import { createWorkingRosterGroups } from './working-roster-encounter.js';

const SYSTEM_POPULATION_CAP=Object.freeze({original:20,flare:20,hades:20});
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const hasTag=(group,tag)=>group.tags?.includes(tag);

function pick(list,random){
  if(!list.length)return null;
  return list[Math.min(list.length-1,Math.floor(random()*list.length))];
}

export function areWorkingRosterGroupsCompatible(a,b,depth=1){
  if(!a||!b||a.id===b.id)return false;
  if(a.system===b.system&&a.system!=='original')return false;
  if((Number(a.introductionDepth)||1)>depth||(Number(b.introductionDepth)||1)>depth)return false;
  const areaControl=(hasTag(a,'area-denial')&&hasTag(b,'hard-control'))||(hasTag(b,'area-denial')&&hasTag(a,'hard-control'));
  if(areaControl&&depth<8)return false;
  if(depth<8&&a.avoidTags?.some(tag=>hasTag(b,tag)))return false;
  if(depth<8&&b.avoidTags?.some(tag=>hasTag(a,tag)))return false;
  return true;
}

function describeComposition(groups){
  if(!groups.length)return'empty-roster';
  if(groups.length===1)return'single-group';
  const tags=new Set(groups.flatMap(group=>group.tags||[]));
  if(tags.has('swarm')&&tags.has('anchor'))return'swarm-plus-anchor';
  if(tags.has('frontline')&&(tags.has('ranged')||tags.has('ranged-pressure')))return'frontline-plus-ranged';
  if(tags.has('pursuer')&&tags.has('area-denial'))return'pursuit-plus-area-denial';
  if(tags.has('hard-control'))return'control-plus-punish';
  return groups.length>=3?'mixed-trio':'mixed-pair';
}

function budgetForDepth(depth){return clamp(Math.round(14+depth*4.7),18,82);}
function maxTotalForDepth(depth){return clamp(3+Math.ceil(depth*.78),4,14);}

function focusedOriginalMix(eligible,depth,budget){
  if(eligible.length<2||eligible.length>3||!eligible.every(group=>group.system==='original'))return null;
  const selected=[];
  let spent=0;
  for(const group of eligible){
    if(selected.some(existing=>!areWorkingRosterGroupsCompatible(existing,group,depth)))continue;
    if(spent+group.encounterCost>budget)continue;
    selected.push(group);
    spent+=group.encounterCost;
  }
  return selected.length>=2?selected:null;
}

function chooseGroups(eligible,depth,budget,random){
  // A focused all-Original roster is an explicit test request. Once its selected
  // enemies are eligible and fit the room budget, compose them together instead of
  // making the tester reroll rooms until the random pair/trio branch happens.
  const focused=focusedOriginalMix(eligible,depth,budget);
  if(focused)return focused;

  let primary=pick(eligible,random)||eligible[0];
  if(depth<3&&primary.needsPartner)primary=eligible.find(group=>!group.needsPartner)||primary;
  if(depth<3)return[primary];

  const selected=[primary];
  const forcePair=!!primary.needsPartner;
  if(forcePair||random()>=.27){
    const partners=eligible.filter(group=>
      areWorkingRosterGroupsCompatible(primary,group,depth)&&
      primary.encounterCost+group.encounterCost<=budget
    );
    const secondary=pick(partners,random);
    if(secondary)selected.push(secondary);
    else if(forcePair)selected[0]=eligible.find(group=>!group.needsPartner)||primary;
  }

  if(depth<5||selected.length<2)return selected;
  const spent=selected.reduce((sum,group)=>sum+group.encounterCost,0);
  const candidates=eligible.filter(candidate=>
    !selected.includes(candidate)&&
    selected.every(group=>areWorkingRosterGroupsCompatible(group,candidate,depth))&&
    spent+candidate.encounterCost<=budget
  );
  if(!candidates.length)return selected;
  const sameOriginal=candidates.filter(candidate=>
    candidate.system==='original'&&selected.some(group=>group.system==='original')
  );
  const tertiary=pick(sameOriginal.length?sameOriginal:candidates,random);
  if(tertiary)selected.push(tertiary);
  return selected;
}

function allocateCounts(groups,budget,maxTotal,random){
  const counts=new Map(groups.map(group=>[group.id,1]));
  let spent=groups.reduce((sum,group)=>sum+group.encounterCost,0);
  let total=groups.length;
  let guard=0;
  while(total<maxTotal&&guard++<100){
    const legal=groups.filter(group=>(counts.get(group.id)||0)<group.maxCount&&spent+group.encounterCost<=budget);
    if(!legal.length)break;
    const chosen=groups.length>1&&random()<.64&&legal.includes(groups[0])?groups[0]:pick(legal,random);
    counts.set(chosen.id,(counts.get(chosen.id)||0)+1);
    spent+=chosen.encounterCost;
    total++;
  }
  return{counts,spent,total};
}

function scaleGroupsWithinRuntimeCaps(groups,multiplier){
  const desired=groups.map(group=>Math.max(1,Math.round((Number(group.count)||1)*multiplier)));
  const counts=groups.map(()=>1);
  const indicesBySystem=new Map();
  groups.forEach((group,index)=>{
    if(!indicesBySystem.has(group.system))indicesBySystem.set(group.system,[]);
    indicesBySystem.get(group.system).push(index);
  });
  for(const [system,indices] of indicesBySystem){
    const cap=Math.max(indices.length,SYSTEM_POPULATION_CAP[system]??20);
    let total=indices.length;
    const target=Math.min(cap,indices.reduce((sum,index)=>sum+desired[index],0));
    let guard=0;
    while(total<target&&guard++<200){
      const legal=indices.filter(index=>counts[index]<desired[index]);
      if(!legal.length)break;
      legal.sort((a,b)=>(desired[b]-counts[b])-(desired[a]-counts[a])||a-b);
      counts[legal[0]]++;
      total++;
    }
  }
  return groups.map((group,index)=>({
    ...group,
    count:counts[index],
    maxCount:Math.max(counts[index],Math.min(SYSTEM_POPULATION_CAP[group.system]??20,Math.round((Number(group.maxCount)||1)*multiplier))),
  }));
}

export function createWorkingRosterSameSystemPlan({
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
  const available=createWorkingRosterGroups(normalized,catalog);
  const baseBudget=budgetForDepth(requestedProgressionDepth);
  const maxTotal=maxTotalForDepth(requestedProgressionDepth);

  if(!available.length){
    return{
      mode:WORKING_ROSTER_HADES_ID,depth:safeDepth,planningDepth:requestedProgressionDepth,
      progressionDepth:requestedProgressionDepth,requestedProgressionDepth,budget:baseBudget,spent:0,totalCount:0,maxTotal,
      typeIds:[],groups:[],composition:'empty-roster',rosterIds:normalized,rosterCount:normalized.length,
      availableTypeCount:0,sameSystemMixing:true,sameSystemMixingSystems:['original'],maxTypes:3,
      spawnMultiplier:safeMultiplier,difficultyRamp:safeRamp,populationCaps:SYSTEM_POPULATION_CAP,
      activeWeightCap:2.75,pursuitWeightCap:2.7,simultaneousTelegraphs:2,spawnDelay:.78,
    };
  }

  let planningDepth=requestedProgressionDepth;
  let eligible=available.filter(group=>(Number(group.introductionDepth)||1)<=planningDepth);
  if(!eligible.length){
    planningDepth=Math.min(...available.map(group=>Math.max(1,Number(group.introductionDepth)||1)));
    eligible=available.filter(group=>(Number(group.introductionDepth)||1)<=planningDepth);
  }
  const cheapest=Math.min(...eligible.map(group=>Math.max(1,Number(group.encounterCost)||1)));
  const budget=Math.max(baseBudget,cheapest);
  const selected=chooseGroups(eligible,planningDepth,budget,random);
  const allocation=allocateCounts(selected,budget,maxTotal,random);
  const baseGroups=selected.map(group=>({...group,count:allocation.counts.get(group.id)||1}));
  const groups=scaleGroupsWithinRuntimeCaps(baseGroups,safeMultiplier);
  const totalCount=groups.reduce((sum,group)=>sum+group.count,0);

  return{
    mode:WORKING_ROSTER_HADES_ID,
    depth:safeDepth,
    planningDepth,
    progressionDepth:planningDepth,
    requestedProgressionDepth,
    budget,
    spent:allocation.spent,
    totalCount,
    maxTotal:Math.max(totalCount,Math.round(maxTotal*safeMultiplier)),
    typeIds:groups.map(group=>group.id),
    groups,
    composition:describeComposition(groups),
    activeWeightCap:clamp(2.4+safeDepth*.34,2.75,7)*safeMultiplier,
    pursuitWeightCap:clamp(2.6+safeDepth*.12,2.7,4.2)*safeMultiplier,
    simultaneousTelegraphs:(planningDepth<4?2:3)*safeMultiplier,
    spawnDelay:planningDepth<3?.78:.64,
    rosterIds:normalized,
    rosterCount:normalized.length,
    availableTypeCount:available.length,
    sameSystemMixing:true,
    sameSystemMixingSystems:['original'],
    maxTypes:3,
    spawnMultiplier:safeMultiplier,
    difficultyRamp:safeRamp,
    populationCaps:SYSTEM_POPULATION_CAP,
    hasLugaru:groups.some(group=>group.spawnKind===LUGARU_DUELIST_ID),
  };
}
