const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export const COMBINED_ENCOUNTER_GROUPS = [
  {id:'goblinWarband',label:'Goblin Warband',system:'original',spawnKind:'goblins',introductionDepth:1,encounterCost:5,activeWeight:1,maxCount:10,tags:['frontline','mobile']},

  {id:'fusionSpider',label:'Spider',system:'original',spawnKind:'spid',introductionDepth:1,encounterCost:5,activeWeight:.8,maxCount:8,tags:['mobile','close']},
  {id:'fusionSunSerpent',label:'Sun Serpent',system:'original',spawnKind:'sun',introductionDepth:1,encounterCost:6,activeWeight:.8,maxCount:8,tags:['mobile','skirmisher']},
  {id:'fusionLion',label:'Lion',system:'original',spawnKind:'lion',introductionDepth:2,encounterCost:9,activeWeight:1.3,maxCount:6,tags:['frontline','committed']},
  {id:'fusionToothy',label:'Toothy',system:'original',spawnKind:'tooth',introductionDepth:2,encounterCost:10,activeWeight:1.4,maxCount:5,tags:['frontline','anchor']},
  {id:'fusionGrabber',label:'Grabber',system:'original',spawnKind:'grab',introductionDepth:3,encounterCost:9,activeWeight:1.2,maxCount:5,tags:['frontline','hard-control']},
  {id:'fusionAntelope',label:'Antelope',system:'original',spawnKind:'ant',introductionDepth:3,encounterCost:10,activeWeight:1.4,maxCount:5,tags:['mobile','committed']},
  {id:'fusionCroc',label:'Croc',system:'original',spawnKind:'croc',introductionDepth:4,encounterCost:10,activeWeight:1.2,maxCount:5,tags:['ambusher','frontline']},
  {id:'fusionPhoenix',label:'Phoenix',system:'original',spawnKind:'phx',introductionDepth:4,encounterCost:11,activeWeight:1.3,maxCount:5,tags:['aerial','mobile']},
  {id:'fusionStilt',label:'Stilt',system:'original',spawnKind:'stilt',introductionDepth:5,encounterCost:13,activeWeight:1.7,maxCount:4,tags:['anchor','ranged-pressure']},
  {id:'fusionMother',label:'Mother Courage',system:'original',spawnKind:'mother',introductionDepth:6,encounterCost:15,activeWeight:1.9,maxCount:3,tags:['anchor','hard-control']},

  {id:'flareScamp',label:'Goblin Scamp',system:'flare',spawnKind:'flareGoblinScamp',introductionDepth:1,encounterCost:6,activeWeight:1,maxCount:8,tags:['frontline']},
  {id:'flareSkeleton',label:'Cracked Skeleton',system:'flare',spawnKind:'flareCrackedSkeleton',introductionDepth:2,encounterCost:7,activeWeight:1,maxCount:7,tags:['frontline','duelist']},
  {id:'flareCursedZombie',label:'Cursed Zombie',system:'flare',spawnKind:'flareCursedZombie',introductionDepth:2,encounterCost:6,activeWeight:1,maxCount:8,tags:['frontline','swarm']},
  {id:'flareRunner',label:'Goblin Runner',system:'flare',spawnKind:'flareGoblinRunner',introductionDepth:3,encounterCost:8,activeWeight:1.2,maxCount:6,tags:['mobile','committed']},
  {id:'flareRottingZombie',label:'Rotting Zombie',system:'flare',spawnKind:'flareRottingZombie',introductionDepth:4,encounterCost:9,activeWeight:1.2,maxCount:6,tags:['frontline','anchor']},

  {id:'hadesNumbskull',label:'Numbskull',system:'hades',spawnKind:'hadesNumbskull',introductionDepth:1,encounterCost:3,activeWeight:.5,maxCount:14,tags:['swarm','pursuer']},
  {id:'hadesWitch',label:'Wretched Witch',system:'hades',spawnKind:'hadesWretchedWitch',introductionDepth:1,encounterCost:5,activeWeight:1,maxCount:8,tags:['ranged','support']},
  {id:'hadesThug',label:'Wretched Thug',system:'hades',spawnKind:'hadesWretchedThug',introductionDepth:2,encounterCost:10,activeWeight:1.3,maxCount:5,tags:['frontline','anchor']},
  {id:'hadesPest',label:'Wretched Pest',system:'hades',spawnKind:'hadesWretchedPest',introductionDepth:3,encounterCost:8,activeWeight:1,maxCount:5,needsPartner:true,tags:['area-denial','support'],avoidTags:['hard-control']},
  {id:'hadesLout',label:'Wretched Lout',system:'hades',spawnKind:'hadesWretchedLout',introductionDepth:4,encounterCost:15,activeWeight:1.8,maxCount:3,tags:['frontline','anchor']},
  {id:'hadesBrimstone',label:'Brimstone',system:'hades',spawnKind:'hadesBrimstone',introductionDepth:4,encounterCost:8,activeWeight:1,maxCount:5,tags:['ranged','area-denial']},
  {id:'hadesSkullomat',label:'Skullomat',system:'hades',spawnKind:'hadesSkullomat',introductionDepth:5,encounterCost:18,activeWeight:2,maxCount:1,tags:['anchor','summoner']},
  {id:'hadesWringer',label:'Wringer',system:'hades',spawnKind:'hadesWringer',introductionDepth:6,encounterCost:11,activeWeight:1.2,maxCount:3,tags:['hard-control','frontline'],avoidTags:['area-denial']},
];

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

function chooseGroups(depth,budget,random){
  const eligible=COMBINED_ENCOUNTER_GROUPS.filter(group=>group.introductionDepth<=depth&&group.encounterCost<=budget);
  let primary=pick(eligible,random)||COMBINED_ENCOUNTER_GROUPS[0];
  const allowPair=depth>=3;
  if(!allowPair&&primary.needsPartner){
    primary=eligible.find(group=>!group.needsPartner)||primary;
  }
  if(!allowPair)return [primary];

  const forcePair=!!primary.needsPartner;
  if(!forcePair&&random()<.27)return [primary];
  const partners=eligible.filter(group=>
    areCombinedGroupsCompatible(primary,group,depth)&&primary.encounterCost+group.encounterCost<=budget
  );
  const secondary=pick(partners,random);
  if(!secondary){
    if(forcePair)primary=eligible.find(group=>!group.needsPartner)||primary;
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

export function createCombinedEncounterPlan({depth=1,random=Math.random}={}){
  const safeDepth=Math.max(1,Math.round(depth)||1);
  const budget=budgetForDepth(safeDepth);
  const maxTotal=maxTotalForDepth(safeDepth);
  const selected=chooseGroups(safeDepth,budget,random);
  const allocation=allocateCounts(selected,budget,maxTotal,random);
  const groups=selected.map(group=>({...group,count:allocation.counts.get(group.id)||1}));
  return {
    mode:'all-enemies-budget',
    depth:safeDepth,
    budget,
    spent:allocation.spent,
    totalCount:allocation.total,
    maxTotal,
    typeIds:groups.map(group=>group.id),
    groups,
    composition:describeComposition(groups),
    activeWeightCap:clamp(2.4+safeDepth*.34,2.75,7),
    pursuitWeightCap:clamp(2.6+safeDepth*.12,2.7,4.2),
    usesWaveSizeSlider:false,
  };
}
