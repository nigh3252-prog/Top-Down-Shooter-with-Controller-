import { LUGARU_DUELIST_ID } from './lugaru-duelist.js';
import { ORIGINAL_MULTI_GROUP_SPAWN_KIND } from './original-encounter-groups.js';
import { WARDEN_TRIAL_INITIAL_WAVE_SIZE } from './warden-trial-progression.js';

export const WARDEN_TRIAL_ENEMY_SET_IDS = Object.freeze({
  CYLINDERS:'cylinders',
  GOBLINS_LUGARU:'goblins-lugaru',
  ACCORDION_2D:'accordion-2d',
});

export const WARDEN_TRIAL_ENEMY_SET_OPTIONS = Object.freeze([
  Object.freeze({id:WARDEN_TRIAL_ENEMY_SET_IDS.CYLINDERS,label:'CYLINDERS'}),
  Object.freeze({id:WARDEN_TRIAL_ENEMY_SET_IDS.GOBLINS_LUGARU,label:'GOBLINS + LUGARU'}),
  Object.freeze({id:WARDEN_TRIAL_ENEMY_SET_IDS.ACCORDION_2D,label:'2D ACCORDION + 3D'}),
]);

export const WARDEN_TRIAL_WAVE_SIZE=WARDEN_TRIAL_INITIAL_WAVE_SIZE;

export const WARDEN_TRIAL_GOBLIN_GROUPS = Object.freeze([
  Object.freeze({system:'original',spawnKind:'grunt',label:'Grunt',count:2}),
  Object.freeze({system:'original',spawnKind:'dagger',label:'Dagger',count:1}),
  Object.freeze({system:'original',spawnKind:'mace',label:'Mace',count:1}),
  Object.freeze({system:'original',spawnKind:'rock',label:'Rock',count:1}),
  Object.freeze({system:'original',spawnKind:'captain',label:'Captain',count:1}),
  Object.freeze({system:'original',spawnKind:LUGARU_DUELIST_ID,label:'Lugaru',count:1}),
]);

const validEnemySetIds=new Set(WARDEN_TRIAL_ENEMY_SET_OPTIONS.map(option=>option.id));

export function normalizeWardenTrialEnemySet(value){
  const requested=String(value||'');
  return validEnemySetIds.has(requested)?requested:WARDEN_TRIAL_ENEMY_SET_IDS.CYLINDERS;
}

export function configureWardenTrialEnemySet(enemySystem,value){
  const id=normalizeWardenTrialEnemySet(value);
  if(id===WARDEN_TRIAL_ENEMY_SET_IDS.GOBLINS_LUGARU){
    const original=enemySystem?.originalSystem;
    if(typeof original?.setWorkingRosterEncounterGroups!=='function')throw new Error('The Original goblin roster mixer is unavailable.');
    original.setWorkingRosterEncounterGroups(WARDEN_TRIAL_GOBLIN_GROUPS);
    enemySystem.setSpawnKind(ORIGINAL_MULTI_GROUP_SPAWN_KIND);
  }else if(id===WARDEN_TRIAL_ENEMY_SET_IDS.ACCORDION_2D)enemySystem.setSpawnKind('accordion2d');
  else enemySystem.setSpawnKind('trialDot');
  enemySystem.setWaveSize(WARDEN_TRIAL_WAVE_SIZE);
  return WARDEN_TRIAL_ENEMY_SET_OPTIONS.find(option=>option.id===id);
}
