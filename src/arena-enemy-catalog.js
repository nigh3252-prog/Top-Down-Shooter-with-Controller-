import { FUSION_ARCHETYPES } from './fusion-enemies.js';
import { FLARE_ENEMY_ARCHETYPES } from './flare-enemies.js';
import { HADES_ENEMY_ARCHETYPES } from './hades-enemies.js';
import { LUGARU_DUELIST_ARCHETYPE, LUGARU_DUELIST_ID } from './lugaru-duelist.js';

export const ARENA_ENEMY_FAMILIES = Object.freeze(['GOBLINS','FUSION','FLARE','HADES']);

const ORIGINAL_ENEMY_METADATA = Object.freeze({
  grunt:{label:'Goblin Grunt',role:'frontliner',tags:['frontline'],encounterCost:5,maxCount:4},
  dagger:{label:'Goblin Dagger',role:'flanker',tags:['mobile','close'],encounterCost:5,maxCount:4},
  mace:{label:'Goblin Mace',role:'anchor',tags:['frontline','anchor'],encounterCost:10,maxCount:4},
  rock:{label:'Goblin Rock Thrower',role:'ranged support',tags:['ranged','support'],encounterCost:6,maxCount:4},
  captain:{label:'Goblin Captain',role:'elite anchor',tags:['frontline','anchor','elite'],encounterCost:15,maxCount:4},
  [LUGARU_DUELIST_ID]:{label:'Lugaru Duelist',role:LUGARU_DUELIST_ARCHETYPE.role,tags:LUGARU_DUELIST_ARCHETYPE.pairingTags,encounterCost:LUGARU_DUELIST_ARCHETYPE.encounterCost,maxCount:LUGARU_DUELIST_ARCHETYPE.maxActive},
});

const FUSION_LABELS = Object.freeze({
  lion:'Lion',spid:'Spider',sun:'Sun Serpent',grab:'Grabber',tooth:'Toothy',
  mother:'Mother Courage',stilt:'Stilt',ant:'Antelope',phx:'Phoenix',croc:'Croc',
});

const FUSION_METADATA = Object.freeze({
  lion:{arenaStatus:'lab-only'},
});

const unique = values => [...new Set((values||[]).filter(Boolean))];
const finite = (value,fallback) => Number.isFinite(Number(value))?Number(value):fallback;

function catalogEntry({id,label,family,system,data={},meta={}}){
  const tags=unique(meta.tags??data.pairingTags??data.categories);
  const avoidTags=unique(meta.avoidTags??data.avoidPairTags);
  return Object.freeze({
    id,
    spawnKind:id,
    label:label||data.label||id,
    family,
    system,
    role:meta.role||data.role||'enemy',
    tags:Object.freeze(tags),
    avoidTags:Object.freeze(avoidTags),
    encounterCost:finite(meta.encounterCost??data.encounterCost,8),
    activeWeight:finite(meta.activeWeight??data.activeWeight,1),
    maxCount:finite(meta.maxCount??data.maxActive,8),
    needsPartner:!!(meta.needsPartner??data.needsPartner),
    introductionDepth:Math.max(1,Math.round(finite(meta.introductionDepth??data.introductionDepth,1))),
    arenaStatus:meta.arenaStatus||'candidate',
  });
}

const originalEntries=Object.entries(ORIGINAL_ENEMY_METADATA).map(([id,meta])=>catalogEntry({id,label:meta.label,family:'GOBLINS',system:'original',data:id===LUGARU_DUELIST_ID?LUGARU_DUELIST_ARCHETYPE:{},meta}));
const fusionEntries=Object.entries(FUSION_ARCHETYPES).map(([id,data])=>catalogEntry({id,label:FUSION_LABELS[id]||id,family:'FUSION',system:'original',data,meta:FUSION_METADATA[id]||{}}));
const flareEntries=Object.entries(FLARE_ENEMY_ARCHETYPES).map(([id,data])=>catalogEntry({id,label:data.label||id,family:'FLARE',system:'flare',data}));
const hadesEntries=Object.entries(HADES_ENEMY_ARCHETYPES).map(([id,data])=>catalogEntry({id,label:data.label||id,family:'HADES',system:'hades',data}));

export const ARENA_ENEMY_CATALOG = Object.freeze([
  ...originalEntries,
  ...fusionEntries,
  ...flareEntries,
  ...hadesEntries,
]);

const catalogBySpawnKind=new Map(ARENA_ENEMY_CATALOG.map(enemy=>[enemy.spawnKind,enemy]));
export function getArenaEnemyCatalogEntry(spawnKind){return catalogBySpawnKind.get(spawnKind)||null;}

function encounterGroup({id,spawnKind,label,system,introductionDepth,encounterCost,activeWeight,maxCount,needsPartner,tags,avoidTags}){
  const base=getArenaEnemyCatalogEntry(spawnKind);
  const group={
    id,
    label:label||base?.label||spawnKind,
    system:system||base?.system||'original',
    spawnKind,
    introductionDepth:Math.max(1,Math.round(finite(introductionDepth??base?.introductionDepth,1))),
    encounterCost:finite(encounterCost??base?.encounterCost,8),
    activeWeight:finite(activeWeight??base?.activeWeight,1),
    maxCount:Math.max(1,Math.round(finite(maxCount??base?.maxCount,8))),
    tags:Object.freeze(unique(tags??base?.tags)),
  };
  if(needsPartner??base?.needsPartner)group.needsPartner=true;
  const avoided=unique(avoidTags??base?.avoidTags);
  if(avoided.length)group.avoidTags=Object.freeze(avoided);
  return Object.freeze(group);
}

export const COMBINED_ENCOUNTER_GROUPS = Object.freeze([
  encounterGroup({id:'goblinWarband',label:'Goblin Warband',system:'original',spawnKind:'goblins',introductionDepth:1,encounterCost:5,activeWeight:1,maxCount:10,tags:['frontline','mobile']}),

  encounterGroup({id:'fusionSpider',spawnKind:'spid',introductionDepth:1,encounterCost:5,activeWeight:.8,maxCount:8,tags:['mobile','close']}),
  encounterGroup({id:'fusionSunSerpent',spawnKind:'sun',introductionDepth:1,encounterCost:6,activeWeight:.8,maxCount:8,tags:['mobile','skirmisher']}),
  encounterGroup({id:'fusionLion',spawnKind:'lion',introductionDepth:2,encounterCost:9,activeWeight:1.3,maxCount:6,tags:['frontline','committed']}),
  encounterGroup({id:'fusionToothy',spawnKind:'tooth',introductionDepth:2,encounterCost:10,activeWeight:1.4,maxCount:5,tags:['frontline','anchor']}),
  encounterGroup({id:'fusionGrabber',spawnKind:'grab',introductionDepth:3,encounterCost:9,activeWeight:1.2,maxCount:5,tags:['frontline','hard-control']}),
  encounterGroup({id:'fusionAntelope',spawnKind:'ant',introductionDepth:3,encounterCost:10,activeWeight:1.4,maxCount:5,tags:['mobile','committed']}),
  encounterGroup({id:'fusionCroc',spawnKind:'croc',introductionDepth:4,encounterCost:10,activeWeight:1.2,maxCount:5,tags:['ambusher','frontline']}),
  encounterGroup({id:'fusionPhoenix',spawnKind:'phx',introductionDepth:4,encounterCost:11,activeWeight:1.3,maxCount:5,tags:['aerial','mobile']}),
  encounterGroup({id:'fusionStilt',spawnKind:'stilt',introductionDepth:5,encounterCost:13,activeWeight:1.7,maxCount:4,tags:['anchor','ranged-pressure']}),
  encounterGroup({id:'fusionMother',spawnKind:'mother',introductionDepth:6,encounterCost:15,activeWeight:1.9,maxCount:3,tags:['anchor','hard-control']}),

  encounterGroup({id:'flareScamp',spawnKind:'flareGoblinScamp',introductionDepth:1,encounterCost:6,activeWeight:1,maxCount:8,tags:['frontline']}),
  encounterGroup({id:'flareSkeleton',spawnKind:'flareCrackedSkeleton',introductionDepth:2,encounterCost:7,activeWeight:1,maxCount:7,tags:['frontline','duelist']}),
  encounterGroup({id:'flareCursedZombie',spawnKind:'flareCursedZombie',introductionDepth:2,encounterCost:6,activeWeight:1,maxCount:8,tags:['frontline','swarm']}),
  encounterGroup({id:'flareRunner',spawnKind:'flareGoblinRunner',introductionDepth:3,encounterCost:8,activeWeight:1.2,maxCount:6,tags:['mobile','committed']}),
  encounterGroup({id:'flareRottingZombie',spawnKind:'flareRottingZombie',introductionDepth:4,encounterCost:9,activeWeight:1.2,maxCount:6,tags:['frontline','anchor']}),

  encounterGroup({id:'hadesNumbskull',spawnKind:'hadesNumbskull',introductionDepth:1,encounterCost:3,activeWeight:.5,maxCount:14,tags:['swarm','pursuer']}),
  encounterGroup({id:'hadesWitch',spawnKind:'hadesWretchedWitch',introductionDepth:1,encounterCost:5,activeWeight:1,maxCount:8,tags:['ranged','support']}),
  encounterGroup({id:'hadesThug',spawnKind:'hadesWretchedThug',introductionDepth:2,encounterCost:10,activeWeight:1.3,maxCount:5,tags:['frontline','anchor']}),
  encounterGroup({id:'hadesPest',spawnKind:'hadesWretchedPest',introductionDepth:3,encounterCost:8,activeWeight:1,maxCount:5,needsPartner:true,tags:['area-denial','support'],avoidTags:['hard-control']}),
  encounterGroup({id:'hadesLout',spawnKind:'hadesWretchedLout',introductionDepth:4,encounterCost:15,activeWeight:1.8,maxCount:3,tags:['frontline','anchor']}),
  encounterGroup({id:'hadesBrimstone',spawnKind:'hadesBrimstone',introductionDepth:4,encounterCost:8,activeWeight:1,maxCount:5,tags:['ranged','area-denial']}),
  encounterGroup({id:'hadesSkullomat',spawnKind:'hadesSkullomat',introductionDepth:5,encounterCost:18,activeWeight:2,maxCount:1,tags:['anchor','summoner']}),
  encounterGroup({id:'hadesWringer',spawnKind:'hadesWringer',introductionDepth:6,encounterCost:11,activeWeight:1.2,maxCount:3,tags:['hard-control','frontline'],avoidTags:['area-denial']}),
]);

if(typeof window!=='undefined'&&/(?:^|\/)enemy-lab\.html$/.test(window.location?.pathname||'')&&new URLSearchParams(window.location.search).get('capture')!=='1'){
  import('./enemy-lab-working-roster.js')
    .then(({installEnemyLabWorkingRoster})=>installEnemyLabWorkingRoster({catalog:ARENA_ENEMY_CATALOG,families:ARENA_ENEMY_FAMILIES}))
    .catch(error=>console.warn('[enemy-lab-roster] could not install',error));
}
