import assert from 'node:assert/strict';
import { ARENA_ABILITY_CATALOG } from '../src/arena-ability-catalog.js';
import { ARENA_ENEMY_CATALOG } from '../src/arena-enemy-catalog.js';
import {
  ACTIVE_COMBAT_PROFILE_STORAGE_KEY,
  applyCombatProfileStorage,
  applyCombatProfileToArena,
  deleteCombatProfile,
  normalizeCombatProfile,
  readActiveCombatProfile,
  readCombatProfileDraft,
  readCombatProfiles,
  saveCombatProfile,
  setActiveCombatProfile,
} from '../src/combat-profile.js';
import { WORKING_ROSTER_HADES_ID } from '../src/encounter-pools.js';

function memoryStorage(){
  const data=new Map();
  return{
    getItem:key=>data.has(key)?data.get(key):null,
    setItem:(key,value)=>data.set(key,String(value)),
    removeItem:key=>data.delete(key),
    dump:()=>new Map(data),
  };
}

const storage=memoryStorage();
const enemyIds=[ARENA_ENEMY_CATALOG[0].id,ARENA_ENEMY_CATALOG[5].id];
const abilityIds=[ARENA_ABILITY_CATALOG[0].id,ARENA_ABILITY_CATALOG[31].id,ARENA_ABILITY_CATALOG.at(-1).id];
const normalized=normalizeCombatProfile({
  id:'crowded',name:'  Crowded   Arcana Test  ',enemyIds:[...enemyIds,'missing'],abilityIds:[...abilityIds,'missing'],
  spawnMultiplier:7,introduction:'INVALID',pressureBudget:9,aggression:0,enemySpeed:9,enemyHealth:0,enemySize:9,idleRange:0,
  directorMode:'missing',createdAt:10,updatedAt:20,
});
assert.equal(normalized.name,'Crowded Arcana Test');
assert.deepEqual(normalized.enemyIds,enemyIds);
assert.deepEqual(normalized.abilityIds,abilityIds);
assert.equal(normalized.spawnMultiplier,1);
assert.equal(normalized.introduction,'slow');
assert.equal(normalized.pressureBudget,4);
assert.equal(normalized.aggression,.25);
assert.equal(normalized.enemySpeed,1.5);
assert.equal(normalized.enemyHealth,.25);
assert.equal(normalized.enemySize,3.5);
assert.equal(normalized.idleRange,1);
assert.equal(normalized.directorMode,'pressureBudget');
assert.equal(normalized.encounterMode,WORKING_ROSTER_HADES_ID);
assert.equal(normalized.cadence,'native-hades');

const saved=saveCombatProfile(storage,{
  id:'crowded',name:'Crowded Arcana Test',enemyIds,abilityIds,
  spawnMultiplier:5,introduction:'high',pressureBudget:3.5,aggression:1.4,
  enemySpeed:.75,enemyHealth:3.25,enemySize:1.8,idleRange:4.5,directorMode:'battleCircle',
},{now:100});
assert.equal(readCombatProfiles(storage).length,1);
assert.equal(readCombatProfiles(storage)[0].updatedAt,100);
const updated=saveCombatProfile(storage,{...saved,name:'Crowded Arcana Updated',pressureBudget:2.75},{now:200});
assert.equal(updated.createdAt,100);
assert.equal(updated.updatedAt,200);
assert.equal(readCombatProfiles(storage).length,1);
assert.equal(readCombatProfiles(storage)[0].name,'Crowded Arcana Updated');

const applied=applyCombatProfileStorage(storage,updated);
const draft=readCombatProfileDraft(storage);
assert.deepEqual(draft.enemyIds,enemyIds);
assert.deepEqual(draft.abilityIds,abilityIds);
assert.equal(draft.spawnMultiplier,5);
assert.equal(draft.introduction,'high');
assert.equal(draft.pressureBudget,2.75);
assert.equal(draft.aggression,1.4);
assert.equal(draft.enemySpeed,.75);
assert.equal(draft.enemyHealth,3.25);
assert.equal(draft.enemySize,1.8);
assert.equal(draft.idleRange,4.5);
assert.equal(draft.directorMode,'battleCircle');
assert.equal(applied.encounterMode,WORKING_ROSTER_HADES_ID);

setActiveCombatProfile(storage,updated);
assert.equal(JSON.parse(storage.getItem(ACTIVE_COMBAT_PROFILE_STORAGE_KEY)).id,'crowded');
assert.equal(readActiveCombatProfile(storage).name,'Crowded Arcana Updated');

const calls=[];
const api={
  arena:{cycleMode:false},
  enemySystem:{
    setSpawnKind:value=>calls.push(['spawn',value]),
    setPressureBudget:value=>calls.push(['pressure',value]),
    setAggression:value=>calls.push(['aggression',value]),
    setSpeedScale:value=>calls.push(['speed',value]),
    setHpScale:value=>calls.push(['health',value]),
    setHeightScale:value=>calls.push(['size',value]),
    setIdleRangeScale:value=>calls.push(['range',value]),
    setCycleOnWaveClear:value=>calls.push(['cycle',value]),
    setDirectorMode:value=>calls.push(['mode',value]),
  },
};
applyCombatProfileToArena(api,updated,{storage,document:null});
assert.deepEqual(calls,[
  ['spawn',WORKING_ROSTER_HADES_ID],
  ['pressure',2.75],
  ['aggression',1.4],
  ['speed',.75],
  ['health',3.25],
  ['size',1.8],
  ['range',4.5],
  ['cycle',false],
  ['mode','battleCircle'],
]);

const cycling={...updated,directorMode:'cycle'};
const cycleCalls=[];
const cycleApi={arena:{cycleMode:false},enemySystem:{
  setSpawnKind:value=>cycleCalls.push(['spawn',value]),
  setPressureBudget:value=>cycleCalls.push(['pressure',value]),
  setAggression:value=>cycleCalls.push(['aggression',value]),
  setSpeedScale:value=>cycleCalls.push(['speed',value]),
  setHpScale:value=>cycleCalls.push(['health',value]),
  setHeightScale:value=>cycleCalls.push(['size',value]),
  setIdleRangeScale:value=>cycleCalls.push(['range',value]),
  setCycleOnWaveClear:value=>cycleCalls.push(['cycle',value]),
  setDirectorMode:value=>cycleCalls.push(['mode',value]),
}};
applyCombatProfileToArena(cycleApi,cycling,{storage,document:null});
assert.equal(cycleApi.arena.cycleMode,true);
assert.ok(cycleCalls.some(call=>call[0]==='cycle'&&call[1]===true));
assert.ok(!cycleCalls.some(call=>call[0]==='mode'));

storage.setItem('enemyLab.workingAbilityPool.v1',JSON.stringify([ARENA_ABILITY_CATALOG[0].id]));
assert.equal(readActiveCombatProfile(storage),null,'manual pool changes detach the saved active profile');
setActiveCombatProfile(storage,cycling);

deleteCombatProfile(storage,'crowded');
assert.equal(readCombatProfiles(storage).length,0);
assert.equal(readActiveCombatProfile(storage),null);

console.log('Combat profile persistence and runtime application: ok');
