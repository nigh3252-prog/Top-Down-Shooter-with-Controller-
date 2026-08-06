import assert from 'node:assert/strict';
import { ARENA_ABILITY_CATALOG } from '../src/arena-ability-catalog.js';
import { ARENA_ENEMY_CATALOG } from '../src/arena-enemy-catalog.js';
import {
  COMBAT_PROFILES_STORAGE_KEY,
  CombatProfileLimitError,
  CombatProfileStorageError,
  exportCombatProfile,
  exportCombatProfiles,
  importCombatProfiles,
  normalizeCombatProfile,
  previewCombatProfileImport,
  readCombatProfiles,
  readCombatProfilesWithDiagnostics,
  saveCombatProfile,
  writeCombatProfiles,
} from '../src/combat-profile.js';
import {
  ENEMY_LAB_PROFILE_SCHEMA_VERSION,
  normalizeEnemyLabProfile,
} from '../src/enemy-lab-profile-schema.js';

function memoryStorage(){
  const data=new Map();
  return{
    getItem:key=>data.has(key)?data.get(key):null,
    setItem:(key,value)=>data.set(key,String(value)),
    removeItem:key=>data.delete(key),
  };
}

const enemyId=ARENA_ENEMY_CATALOG[0].id;
const abilityId=ARENA_ABILITY_CATALOG[0].id;
const profile=normalizeCombatProfile({
  id:'profile-one',name:'Profile One',enemyIds:[enemyId,'future.enemy'],abilityIds:[abilityId,'future.card'],
  deckCardIds:[abilityId,'future.deck'],spawnMultiplier:5,introduction:'high',pressureBudget:2.5,
  aggression:1.25,enemySpeed:.75,enemyHealth:3,enemySize:1.5,idleRange:4,arcanaSize:2.5,directorMode:'battleCircle',
  customFutureField:{enabled:true},
},{enemyCatalog:ARENA_ENEMY_CATALOG,abilityCatalog:ARENA_ABILITY_CATALOG,now:100});

assert.equal(profile.schemaVersion,ENEMY_LAB_PROFILE_SCHEMA_VERSION);
assert.equal(profile.version,3);
assert.equal(profile.partial,true,'flat legacy-shaped input is deliberately marked partial');
assert.deepEqual(profile.workspace.content.missingEnemyIds,['future.enemy']);
assert.deepEqual(profile.workspace.content.missingAbilityIds,['future.card']);
assert.deepEqual(profile.workspace.content.missingDeckCardIds,['future.deck']);
assert.deepEqual(profile.extensions.customFutureField,{enabled:true});
assert.ok(profile.warnings.includes('UNKNOWN_PROFILE_FIELD:customFutureField'));
assert.equal(profile.workspace.settings['scenario.pressureBudget'],2.5);

const fullWorkspaceProfile=normalizeCombatProfile({
  format:'enemy-lab-profile',schemaVersion:3,version:3,id:'full-workspace',name:'Full Workspace',partial:false,
  workspace:{
    settings:{
      'player.weapon':'swordShield','player.stance':'S01-LONG-GUARD','player.combatInputMode':'release-chain','player.arcana':{sizeMultiplier:2,damageMultiplier:3},
      'combat.directorMode':'battleCircle','combat.waveSize':7,'combat.antelope.chargeSpeed':1.4,'combat.feel':{WIMPY:{windup:.5}},
      'ability.dashJet.palette':'ember','ability.pilebunker.size':.3,'presentation.theme':'akai','presentation.maze.cellSize':'large',
      'scenario.configuration':{family:'FLARE',enemyId:'flareGoblinScamp',encounterMode:'all-enemies-budget',mode:'wave',packCount:4,threat:'high',partnerId:'grunt',seed:'profile-seed'},
      'capture.configuration':{arcanaId:'DRAGON-ARC',aim:'left',layout:'stationary',rngSeed:'99',stage:'style',effects:true,renderMode:'style'},
    },
    scenario:{family:'FLARE',enemyId:'flareGoblinScamp',encounterMode:'all-enemies-budget',mode:'wave',packCount:4,threat:'high',partnerId:'grunt',seed:'profile-seed',chamber:{layout:'arena'}},
    content:{enemyIds:[enemyId],abilityIds:[abilityId],deckCardIds:[abilityId]},
    capture:{arcanaId:'DRAGON-ARC',aim:'left',layout:'stationary',rngSeed:'99',stage:'style',effects:true,renderMode:'style'},
  },
},{now:150});
assert.equal(fullWorkspaceProfile.partial,false);
for(const path of ['player.weapon','combat.directorMode','ability.dashJet.palette','ability.pilebunker.size','presentation.theme','scenario.configuration','capture.configuration'])assert.ok(Object.hasOwn(fullWorkspaceProfile.workspace.settings,path),`${path} must round-trip`);
assert.equal(fullWorkspaceProfile.workspace.scenario.encounterMode,'all-enemies-budget');
assert.equal(fullWorkspaceProfile.workspace.capture.aim,'left');
assert.deepEqual(fullWorkspaceProfile.workspace.content.deckCardIds,[abilityId]);

const legacy={
  version:2,id:'legacy',name:'Legacy',enemyIds:[enemyId,'removed.enemy'],abilityIds:[abilityId,'removed.card'],
  pressureBudget:3,unknownLegacyField:'preserve me',
};
const storage=memoryStorage();
storage.setItem(COMBAT_PROFILES_STORAGE_KEY,JSON.stringify([legacy]));
const diagnostics=readCombatProfilesWithDiagnostics(storage,{enemyCatalog:ARENA_ENEMY_CATALOG,abilityCatalog:ARENA_ABILITY_CATALOG,now:200});
assert.equal(diagnostics.errors.length,0);
assert.equal(diagnostics.partial,true);
assert.equal(diagnostics.profiles[0].schemaVersion,3);
assert.equal(diagnostics.profiles[0].partial,true);
assert.equal(diagnostics.profiles[0].extensions.unknownLegacyField,'preserve me');
assert.ok(diagnostics.warnings.some(warning=>warning.includes('PARTIAL_PROFILE_SOURCE_VERSION:2')));
assert.deepEqual(readCombatProfiles(storage,{enemyCatalog:ARENA_ENEMY_CATALOG,abilityCatalog:ARENA_ABILITY_CATALOG,now:200})[0].workspace.content.missingEnemyIds,['removed.enemy']);
assert.equal(diagnostics.profiles[0].encounterMode,'all-enemies-budget','v2 empty-roster profiles migrate to All instead of presenting Roster');

const oneJson=exportCombatProfile(profile,{pretty:false});
const onePreview=previewCombatProfileImport(oneJson,{existingProfiles:[profile],collision:'copy',now:300});
assert.equal(onePreview.ok,true);
assert.equal(onePreview.collisions.length,1);
assert.equal(onePreview.profiles[0].id,'profile-one-copy');
assert.equal(onePreview.profiles[0].name,'Profile One (Copy)');
const replaced=importCombatProfiles(oneJson,{existingProfiles:[profile],collision:'replace',now:300});
assert.equal(replaced.ok,true);
assert.deepEqual(replaced.replaced,['profile-one']);
assert.equal(replaced.profiles.length,1);
const skipped=importCombatProfiles(oneJson,{existingProfiles:[profile],collision:'skip',now:300});
assert.equal(skipped.ok,true);
assert.deepEqual(skipped.skipped,['profile-one'],'skip omits the incoming profile during preview and leaves the existing record');
assert.equal(skipped.profiles.length,1);
assert.equal(previewCombatProfileImport('{not json').ok,false);
const future=previewCombatProfileImport(JSON.stringify({...profile,schemaVersion:4,version:4}),{existingProfiles:[],now:300});
assert.equal(future.ok,false,'future schema versions require an explicit migration');
assert.ok(future.errors.some(error=>error.includes('UNSUPPORTED_PROFILE_VERSION:4')));

const allJson=exportCombatProfiles([profile,{...profile,id:'profile-two',name:'Profile Two',updatedAt:101}],{pretty:false});
const allImport=importCombatProfiles(allJson,{existingProfiles:[],collision:'copy',now:400});
assert.equal(allImport.ok,true);
assert.equal(allImport.profiles.length,2);

const fullStorage=memoryStorage();
writeCombatProfiles(fullStorage,[profile]);
assert.equal(readCombatProfiles(fullStorage)[0].id,'profile-one');
const beforeLimit=fullStorage.getItem(COMBAT_PROFILES_STORAGE_KEY);
const twenty=[...Array(20)].map((_,index)=>normalizeEnemyLabProfile({id:`existing-${index}`,name:`Existing ${index}`,updatedAt:index},{now:index}));
writeCombatProfiles(fullStorage,twenty);
const beforeOverflow=fullStorage.getItem(COMBAT_PROFILES_STORAGE_KEY);
assert.throws(()=>saveCombatProfile(fullStorage,{id:'overflow',name:'Overflow'},{now:999}),error=>error instanceof CombatProfileLimitError);
assert.equal(fullStorage.getItem(COMBAT_PROFILES_STORAGE_KEY),beforeOverflow,'profile limit does not silently evict an existing record');
assert.notEqual(beforeLimit,beforeOverflow);

const quotaStorage={getItem:key=>null,setItem:()=>{throw new Error('quota exceeded');},removeItem:()=>{}};
assert.throws(()=>writeCombatProfiles(quotaStorage,[profile]),error=>error instanceof CombatProfileStorageError&&error.code==='PROFILE_STORAGE_WRITE_FAILED');

console.log('Enemy Lab v3 schema, legacy migration, unknown preservation, export/import, collision handling, and visible storage failures: ok');
