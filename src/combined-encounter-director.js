import { COMBINED_ENCOUNTER_GROUPS } from './arena-enemy-catalog.js';

export { COMBINED_ENCOUNTER_GROUPS } from './arena-enemy-catalog.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let combinedEncounterPlanResolver=null;

export function setCombinedEncounterPlanResolver(resolver=null){
  const previous=combinedEncounterPlanResolver;
  combinedEncounterPlanResolver=typeof resolver==='function'?resolver:null;
  return previous;
}

function pick(list,random){
  if(!list.length)return null;
  return list[Math.min(list.length-1,Math.floor(random()*list.length))];
}

function hasTag(group,tag){return group.tags?.includes(tag);}

export function areCombinedGroupsCompatible(a,b,depth=1){
  if(!a||!b||a.id===b.id||a.system===b.system)return false;
  if(a.introductionDepth>depth||b.introductionDepth>depth)return false;
  const areaControl=(hasTag(a,'area-denial')&&hasTag(b,'hard-control'))||(hasTag(b,'area-denial')&&hasTag(a,'hard-control'));
  if(areaControl&&depth<8)return false;
  if(depth<8&&a.avoidTags?.some(tag=>hasTag(b,tag)))return false;
  if(depth<8&&b.avoidTags?.some(tag=>hasTag(a,tag)))return false;
  return true;
}

function describeComposition(groups){
  if(!groups.length)return 'empty-roster';
  if(groups.length<2)return 'single-group';
  const tags=new Set(groups.flatMap(group=>group.tags||[]));
  if(tags.has('swarm')&&tags.has('anchor'))return 'swarm-plus-anchor';
  if(tags.has('frontline')&&(tags.has('ranged')||tags.has('ranged-pressure')))return 'frontline-plus-ranged';
  if(tags.has('pursuer')&&tags.has('area-denial'))return 'pursuit-plus-area-denial';
  if(tags.has('hard-control'))return 'control-plus-punish';
  return 'mixed-pair';
}

function budgetForDepth(depth){return clamp(Math.round(14+depth*4.7),18,82);}
function maxTotalForDepth(depth){return clamp(3+Math.ceil(depth*.78),4,14);}

function chooseGroups(groups,depth,budget,random){
  let primary=pick(groups,random)||groups[0];
  const allowPair=depth>=3;
  if(!allowPair&&primary.needsPartner){
    primary=groups.find(group=>!group.needsPartner)||primary;
  }
  if(!allowPair)return [primary];

  const forcePair=!!primary.needsPartner;
  if(!forcePair&&random()<.27)return [primary];
  const partners=groups.filter(group=>
    areCombinedGroupsCompatible(primary,group,depth)&&primary.encounterCost+group.encounterCost<=budget
  );
  const secondary=pick(partners,random);
  if(!secondary){
    if(forcePair)primary=groups.find(group=>!group.needsPartner)||primary;
    return [primary];
  }
  return [primary,secondary];
}

function allocateCounts(groups,budget,maxTotal,random){
  const counts=new Map(groups.map(group=>[group.id,1]));
  let spent=groups.reduce((sum,group)=>sum+group.encounterCost,0);
  let total=groups.length;
  let guard=0;
  while(total<maxTotal&&guard++<100){
    const legal=groups.filter(group=>(counts.get(group.id)||0)<group.maxCount&&spent+group.encounterCost<=budget);
    if(!legal.length)break;
    let chosen;
    if(groups.length>1&&random()<.64&&legal.includes(groups[0]))chosen=groups[0];
    else chosen=pick(legal,random);
    counts.set(chosen.id,(counts.get(chosen.id)||0)+1);
    spent+=chosen.encounterCost;
    total++;
  }
  return {counts,spent,total};
}

export function createBudgetEncounterPlan({
  depth=1,
  random=Math.random,
  groups=COMBINED_ENCOUNTER_GROUPS,
  mode='all-enemies-budget',
}={}){
  const safeDepth=Math.max(1,Math.round(depth)||1);
  const available=(groups||[]).filter(group=>group&&group.id&&group.spawnKind&&group.system);
  const baseBudget=budgetForDepth(safeDepth);
  const maxTotal=maxTotalForDepth(safeDepth);
  if(!available.length){
    return {
      mode,depth:safeDepth,planningDepth:safeDepth,budget:baseBudget,spent:0,totalCount:0,maxTotal,
      typeIds:[],groups:[],composition:'empty-roster',
      activeWeightCap:clamp(2.4+safeDepth*.34,2.75,7),
      pursuitWeightCap:clamp(2.6+safeDepth*.12,2.7,4.2),
      usesWaveSizeSlider:false,
    };
  }

  let planningDepth=safeDepth;
  let eligible=available.filter(group=>(Number(group.introductionDepth)||1)<=planningDepth);
  if(!eligible.length){
    planningDepth=Math.min(...available.map(group=>Math.max(1,Number(group.introductionDepth)||1)));
    eligible=available.filter(group=>(Number(group.introductionDepth)||1)<=planningDepth);
  }
  const cheapest=Math.min(...eligible.map(group=>Math.max(1,Number(group.encounterCost)||1)));
  const budget=Math.max(baseBudget,cheapest);
  const selected=chooseGroups(eligible,planningDepth,budget,random);
  const allocation=allocateCounts(selected,budget,maxTotal,random);
  const plannedGroups=selected.map(group=>({...group,count:allocation.counts.get(group.id)||1}));
  return {
    mode,
    depth:safeDepth,
    planningDepth,
    budget,
    spent:allocation.spent,
    totalCount:allocation.total,
    maxTotal,
    typeIds:plannedGroups.map(group=>group.id),
    groups:plannedGroups,
    composition:describeComposition(plannedGroups),
    activeWeightCap:clamp(2.4+safeDepth*.34,2.75,7),
    pursuitWeightCap:clamp(2.6+safeDepth*.12,2.7,4.2),
    usesWaveSizeSlider:false,
  };
}

export function createCombinedEncounterPlan(options={}){
  const resolved=combinedEncounterPlanResolver?.(options);
  if(resolved)return resolved;
  return createBudgetEncounterPlan({...options,groups:COMBINED_ENCOUNTER_GROUPS,mode:'all-enemies-budget'});
}
