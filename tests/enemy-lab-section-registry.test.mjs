import assert from 'node:assert/strict';
import {
  ENEMY_LAB_SECTION_ORDER,
  createEnemyLabSectionRegistry,
} from '../src/enemy-lab-section-registry.js';

const registry=createEnemyLabSectionRegistry();
assert.deepEqual(ENEMY_LAB_SECTION_ORDER,[
  'encounter','enemies','loadout','combat','visuals','capture','diagnostics','profiles',
]);
assert.deepEqual(registry.sectionIds,ENEMY_LAB_SECTION_ORDER);
assert.deepEqual(registry.sections().map(section=>section.label),[
  'ENCOUNTER','ENEMIES / ROSTER','PLAYER LOADOUT','COMBAT BEHAVIOR','VISUALS','CAPTURE','DIAGNOSTICS','PROFILES',
]);

const events=[];
registry.subscribe(event=>events.push(event.type));
registry.registerView({id:'late-view',sectionId:'combat',label:'Late',order:20,render:()=>null});
registry.registerView({id:'early-view',sectionId:'combat',label:'Early',order:10,render:()=>null});
assert.deepEqual(registry.getViews('combat').map(view=>view.id),['early-view','late-view']);
assert.throws(()=>registry.registerView({id:'late-view',sectionId:'combat',render:()=>null}),/Duplicate/);
const viewIdsBeforeSelection=registry.getViews('combat').map(view=>view.id);
assert.deepEqual(registry.select('profiles'),{ok:true,sectionId:'profiles'});
assert.deepEqual(registry.getViews('combat').map(view=>view.id),viewIdsBeforeSelection,'section selection cannot rebuild or remove unrelated views');
assert.equal(registry.select('tools').ok,false);
registry.registerSlot({id:'profile-bar',sectionId:'profiles',slot:'profile-bar',render:()=>null});
const slotIdsBeforeSelection=registry.getSlots('profiles').map(slot=>slot.id);
registry.select('encounter');
assert.deepEqual(registry.getSlots('profiles').map(slot=>slot.id),slotIdsBeforeSelection,'section selection cannot rebuild or remove registered slots');
registry.invalidate('profiles');
registry.dispatch({type:'profile-bar-action',action:'activate'});
assert.deepEqual(events,['register','register','select','slot-register','select','invalidate','profile-bar-action']);
console.log('Enemy Lab section registry: ok');
