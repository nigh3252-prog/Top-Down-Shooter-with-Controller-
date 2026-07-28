import {
  HADES_ENEMY_ARCHETYPES,
  HADES_TARTARUS_IDS,
  HADES_TARTARUS_POOL_ID,
  isHadesEnemy,
} from './hades-enemies.js';
import {
  getHadesEncounterDifficultyRamp,
  getHadesEncounterSpawnMultiplier,
  getHadesProgressionDepth,
  normalizeHadesDifficultyRamp,
  normalizeHadesSpawnMultiplier,
} from './hades-encounter-tuning.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function pick(list,random){
  if(!list.length)return null;
  return list[Math.min(list.length-1,Math.floor(random()*list.length))];
}

function shuffle(list,random){
  const out=[...list];
  for(let i=out.length-1;i>0;i--){
    const j=Math.floor(random()*(i+1));
    [out[i],out[j]]=[out[j],out[i]];
  }
  return out;
}

function hasTag(def,tag){return def.pairingTags?.includes(tag);}

export function isHadesPairCompatible(aId,bId,depth=1){
  if(aId===bId)return false;
  const a=HADES_ENEMY_ARCHETYPES[aId],b=HADES_ENEMY_ARCHETYPES[bId];
  if(!a||!b)return false;
  if(a.introductionDepth>depth||b.introductionDepth>depth)return false;
  const dangerousEarly=(
    (hasTag(a,'area-denial')&&hasTag(b,'hard-control'))||
    (hasTag(b,'area-denial')&&hasTag(a,'hard-control'))
  );
  if(dangerousEarly&&depth<8)return false;
  if(depth<8&&a.avoidPairTags?.some(tag=>hasTag(b,tag)))return false;
  if(depth<8&&b.avoidPairTags?.some(tag=>hasTag(a,tag)))return false;
  return true;
}

function describeComposition(typeIds){
  if(typeIds.length<2)return 'single-type';
  const defs=typeIds.map(id=>HADES_ENEMY_ARCHETYPES[id]);
  const tags=new Set(defs.flatMap(def=>def.pairingTags||[]));
  if(tags.has('swarm')&&tags.has('anchor'))return 'swarm-plus-anchor';
  if(tags.has('frontline')&&tags.has('ranged'))return 'frontline-plus-ranged';
  if(tags.has('pursuer')&&tags.has('area-denial'))return 'pursuit-plus-area-denial';
  if(tags.has('hard-control'))return 'control-plus-punish';
  return 'mixed-pair';
}

function eligibleIds(depth){
  return HADES_TARTARUS_IDS.filter(id=>HADES_ENEMY_ARCHETYPES[id].introductionDepth<=depth);
}

function chooseTypes(depth,random){
  const eligible=eligibleIds(depth);
  const allowPair=depth>=3;
  let primary=pick(eligible,random)||HADES_TARTARUS_IDS[0];
  if(!allowPair&&HADES_ENEMY_ARCHETYPES[primary].needsPartner){
    primary=eligible.find(id=>!HADES_ENEMY_ARCHETYPES[id].needsPartner)||primary;
  }
  if(!allowPair)return [primary];

  const forcePair=HADES_ENEMY_ARCHETYPES[primary].needsPartner;
  const usePair=forcePair||random()>.24;
  if(!usePair)return [primary];

  const partners=eligible.filter(id=>isHadesPairCompatible(primary,id,depth));
  const secondary=pick(partners,random);
  if(!secondary){
    if(forcePair){
      primary=eligible.find(id=>!HADES_ENEMY_ARCHETYPES[id].needsPartner)||primary;
    }
    return [primary];
  }
  return [primary,secondary];
}

function countForDepth(baseCount,depth){
  const ramp=.74+Math.min(10,Math.max(1,depth))*.075;
  return clamp(Math.round(baseCount*ramp),1,20);
}

function buildEntries(typeIds,totalCount,random){
  if(typeIds.length===1)return Array.from({length:totalCount},()=>typeIds[0]);
  const [primary,secondary]=typeIds;
  const secondaryShare=clamp(.28+random()*.18,.25,.48);
  let secondaryCount=clamp(Math.round(totalCount*secondaryShare),1,totalCount-1);
  const primaryDef=HADES_ENEMY_ARCHETYPES[primary];
  const secondaryDef=HADES_ENEMY_ARCHETYPES[secondary];
  if(primaryDef.encounterCost>secondaryDef.encounterCost*1.8){
    secondaryCount=Math.max(secondaryCount,Math.ceil(totalCount*.55));
  }
  const primaryCount=totalCount-secondaryCount;
  const tail=shuffle([
    ...Array.from({length:Math.max(0,primaryCount-1)},()=>primary),
    ...Array.from({length:secondaryCount},()=>secondary),
  ],random);
  return [primary,...tail];
}

export function createHadesEncounterPlan({
  depth=1,
  targetCount=6,
  spawnKind=HADES_TARTARUS_POOL_ID,
  spawnMultiplier=getHadesEncounterSpawnMultiplier(),
  difficultyRamp=getHadesEncounterDifficultyRamp(),
  random=Math.random,
}={}){
  const safeDepth=Math.max(1,Math.round(depth)||1);
  const safeMultiplier=normalizeHadesSpawnMultiplier(spawnMultiplier);
  const safeDifficultyRamp=normalizeHadesDifficultyRamp(difficultyRamp);
  const progressionDepth=getHadesProgressionDepth(safeDepth,safeDifficultyRamp);
  const baseCount=countForDepth(clamp(Math.round(targetCount)||6,1,20),progressionDepth);
  const totalCount=clamp(baseCount*safeMultiplier,1,200);
  const typeIds=isHadesEnemy(spawnKind)?[spawnKind]:chooseTypes(progressionDepth,random);
  const entries=buildEntries(typeIds,totalCount,random);
  const baseActiveWeightCap=clamp(2.5+progressionDepth*.35,2.75,6.5);
  const basePursuitWeightCap=clamp(2.6+progressionDepth*.12,2.7,3.8);
  const baseTelegraphs=progressionDepth<4?2:3;
  return {
    depth:safeDepth,
    progressionDepth,
    spawnMultiplier:safeMultiplier,
    difficultyRamp:safeDifficultyRamp,
    typeIds,
    entries,
    composition:describeComposition(typeIds),
    activeWeightCap:baseActiveWeightCap*safeMultiplier,
    pursuitWeightCap:basePursuitWeightCap*safeMultiplier,
    simultaneousTelegraphs:baseTelegraphs*safeMultiplier,
    spawnDelay:progressionDepth<3?.78:.64,
  };
}
