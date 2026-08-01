import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const playerCombat=await readFile(new URL('../src/player-combat.js',import.meta.url),'utf8');
const runDraft=await readFile(new URL('../src/run-draft.js',import.meta.url),'utf8');
const profilesUi=await readFile(new URL('../src/enemy-lab-combat-profiles.js',import.meta.url),'utf8');

assert.match(playerCombat,/function installArenaArcanaRuntime\(factory\)/,'full Combat Arena must provide the authored Enemy Lab Arcana runtime context');
for(const installer of [
  'installWizardArcanaRuntime',
  'installWizardRebuiltArcanaRuntime',
  'installWizardFlameStrikeRuntime',
  'installWizardWindSlashRuntime',
  'installWizardAirBasicsRuntime',
  'installWizardNextSourceRuntime',
  'installWizardNextTwentyBasicsRuntime',
  'installWizardNextTwentyDashRuntime',
  'installWizardFusionLeapRuntime',
  'installWizardArcaneTypesRuntime',
  'installWizardAlliedArcanaRuntime',
]){
  assert.match(
    playerCombat,
    new RegExp(`installArenaArcanaRuntime\\(\\(\\)=>${installer.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\(`),
    `${installer} must run in the full Combat Arena instead of returning an Enemy-Lab-only no-op`,
  );
}
assert.match(playerCombat,/finally\{history\.replaceState\(history\.state,'',original\);\}/,'the temporary runtime context must restore the real Combat Arena URL');

const chooseOffer=runDraft.slice(runDraft.indexOf('function chooseOffer'),runDraft.indexOf('function renderOffers'));
const firstApply=chooseOffer.indexOf('applyActiveCombatProfileToArena(api)');
const reset=chooseOffer.indexOf('forceArenaReset()');
const secondApply=chooseOffer.lastIndexOf('applyActiveCombatProfileToArena(api)');
assert.ok(firstApply>=0&&firstApply<reset,'profile tuning must be applied before the opening encounter reset');
assert.ok(secondApply>reset,'profile controls must be synchronized again after the reset');

assert.match(profilesUi,/SAVE & ACTIVATE/,'saving a profile must visibly make it the active environment');
assert.match(profilesUi,/const active=activateSavedProfile\(saved\)/,'saving must write the profile tuning and active-profile marker, not only the named snapshot');
assert.match(profilesUi,/function activateSavedProfile\(profile\)/,'profile activation must have one shared storage and pool synchronization path');
assert.match(profilesUi,/setActiveCombatProfile\(storage,profile,\{eventTarget:targetWindow\}\)/,'saved and loaded profiles must apply the active environment and dispatch Arcana size');
assert.match(profilesUi,/EDIT ENEMY ROSTER/,'profiles must provide a direct roster-selection path');
assert.match(profilesUi,/EDIT ABILITY POOL/,'profiles must provide a direct Ability Pool selection path');
assert.match(profilesUi,/ARCANA SIZE/,'profiles must expose the saved Enemy Lab Arcana size');
assert.match(profilesUi,/LOAD & ACTIVATE/,'loading a profile must make its environment current');

console.log('Final milestone runtime regressions: ok');
