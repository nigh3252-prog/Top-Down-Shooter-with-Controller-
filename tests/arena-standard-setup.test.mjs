import assert from 'node:assert/strict';
import {
  ARENA_STANDARD_SETUP_HISTORY_STORAGE_KEY,
  ARENA_STANDARD_SETUP_STORAGE_KEY,
  ArenaStandardSetupError,
  arenaStandardBootstrapValues,
  createArenaSetupCandidate,
  diffArenaSetup,
  lockArenaStandardSetup,
  readArenaStandardHistory,
  readArenaStandardSetup,
} from '../src/arena-standard-setup.js';

class MemoryStorage{
  constructor(entries=[]){this.data=new Map(entries);this.failKey='';}
  getItem(key){return this.data.has(key)?this.data.get(key):null;}
  setItem(key,value){if(key===this.failKey)throw new Error('quota');this.data.set(key,String(value));}
  removeItem(key){this.data.delete(key);}
}

const controls=[
  ['presentation.theme','arena'],['presentation.maze.cellSize','arena'],['presentation.maze.roomSize','arena'],
  ['combat.pressure','arena'],['player.combatInputMode','shared'],['player.arcana','arena'],
  ['player.weapon','lab-only'],['player.stance','lab-only'],['lab.chamber.cellSize','lab-only'],
].map(([path,target])=>({path,target}));

const workspace={
  settings:{
    'presentation.theme':'neutral','presentation.maze.cellSize':'small','presentation.maze.roomSize':'large',
    'combat.pressure':2.5,'player.combatInputMode':'modern','player.arcana':{sizeMultiplier:1.5,damageMultiplier:2},
    'player.weapon':'longsword','player.stance':'S24','lab.chamber.cellSize':'large',
  },
  scenario:{source:'planned',encounterMode:'all-enemies-budget',encounterId:'all-enemies-budget',seed:'standard-seed',chamber:{cellSize:'large'},mode:'wave',waveCount:4},
  content:{rosterIds:['grunt','shaman'],abilityPoolIds:['DRAGON-ARC'],currentDeckIds:['S24','DRAGON-ARC']},
};

const candidate=createArenaSetupCandidate({workspace,controls,name:'Balanced Standard',sourceProfileId:'lab-profile-1',now:100});
assert.equal(candidate.ok,true,candidate.errors.join(', '));
assert.equal(candidate.profile.workspace.settings['combat.pressure'],2.5);
assert.equal(candidate.profile.workspace.settings['scenario.encounterId'],'all-enemies-budget');
assert.equal(candidate.profile.workspace.settings['player.combatInputMode'],'modern');
assert.equal(candidate.profile.workspace.settings['player.weapon'],undefined,'Lab actor weapon must not masquerade as the Arena run loadout');
assert.equal(candidate.profile.workspace.settings['lab.chamber.cellSize'],undefined,'the fixed Lab chamber never transfers');
assert.deepEqual(candidate.profile.workspace.content.currentDeckIds,[],'the disposable Lab deck never transfers');
assert.deepEqual(candidate.profile.workspace.content.abilityPoolIds,['DRAGON-ARC']);
assert.deepEqual(candidate.profile.workspace.scenario.chamber,{},'direct chamber fixtures are stripped from planned Arena setup');
assert.ok(candidate.excluded.some(item=>item.path==='content.currentDeckIds'));
assert.ok(candidate.excluded.some(item=>item.path==='lab.chamber.cellSize'));

const direct=createArenaSetupCandidate({workspace:{...workspace,scenario:{...workspace.scenario,source:'direct',encounterMode:'lab-direct',encounterId:'grunt'}},controls});
assert.equal(direct.ok,false);
assert.ok(direct.errors.some(error=>error.includes('planner-backed')));

const emptyRoster=createArenaSetupCandidate({workspace:{...workspace,scenario:{...workspace.scenario,encounterMode:'working-roster-hades',encounterId:'working-roster-hades'},content:{...workspace.content,rosterIds:[]}},controls});
assert.equal(emptyRoster.ok,false);
assert.ok(emptyRoster.errors.some(error=>error.includes('at least one enemy')));

const storage=new MemoryStorage();
const first=lockArenaStandardSetup(storage,candidate,{now:200});
assert.equal(first.standardVersion,1);
assert.equal(readArenaStandardSetup(storage).name,'Balanced Standard');
assert.deepEqual(JSON.parse(storage.getItem('enemyLab.workingRoster.v1')),['grunt','shaman']);
assert.deepEqual(JSON.parse(storage.getItem('enemyLab.workingAbilityPool.v1')),['DRAGON-ARC']);
assert.deepEqual(JSON.parse(storage.getItem('enemyLab.wizardArcana.tweaks.v1')),{sizeMultiplier:1.5,damageMultiplier:2});
assert.equal(storage.getItem('arena.mazeCellSize'),'small');
assert.equal(storage.getItem('arena.mazeRoomCells'),'large');

const changed=createArenaSetupCandidate({workspace:{...workspace,settings:{...workspace.settings,'combat.pressure':3}},controls,name:'Pressure Standard',now:300});
assert.equal(diffArenaSetup(changed,first).some(change=>change.path==='combat.pressure'),true);
const second=lockArenaStandardSetup(storage,changed,{now:400});
assert.equal(second.standardVersion,2);
assert.deepEqual(readArenaStandardHistory(storage).map(entry=>entry.standardVersion),[1]);

const boot=arenaStandardBootstrapValues(second);
assert.equal(boot['arena.theme'],'neutral');
assert.equal(boot['arena.mazeCellSize'],'small');
assert.deepEqual(JSON.parse(boot['enemyLab.workingRoster.v1']),['grunt','shaman']);

const beforeStandard=storage.getItem(ARENA_STANDARD_SETUP_STORAGE_KEY);
const beforeHistory=storage.getItem(ARENA_STANDARD_SETUP_HISTORY_STORAGE_KEY);
storage.failKey=ARENA_STANDARD_SETUP_STORAGE_KEY;
assert.throws(()=>lockArenaStandardSetup(storage,candidate,{now:500}),error=>error instanceof ArenaStandardSetupError&&error.code==='ARENA_SETUP_STORAGE_WRITE_FAILED');
assert.equal(storage.getItem(ARENA_STANDARD_SETUP_STORAGE_KEY),beforeStandard,'failed lock leaves the Standard unchanged');
assert.equal(storage.getItem(ARENA_STANDARD_SETUP_HISTORY_STORAGE_KEY),beforeHistory,'failed lock leaves History unchanged');

console.log('Arena Test-to-Setup candidate filtering, Standard locking, History, boot projection, and rollback: ok');
