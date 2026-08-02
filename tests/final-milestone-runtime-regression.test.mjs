import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const playerCombat=await readFile(new URL('../src/player-combat.js',import.meta.url),'utf8');
const runDraft=await readFile(new URL('../src/run-draft.js',import.meta.url),'utf8');
const profilesUi=await readFile(new URL('../src/enemy-lab-combat-profiles.js',import.meta.url),'utf8');
const labShell=await readFile(new URL('../enemy-lab.html',import.meta.url),'utf8');

assert.match(playerCombat,/const installArenaArcanaRuntime=factory=>factory\(\)/,'the shared runtime must install every authored Arcana family without URL patching');
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
assert.doesNotMatch(playerCombat,/history\.replaceState|searchParams\.set\('enemyLab'/,'Arcana installation must use explicit runtime context rather than mutating the URL');

const chooseOffer=runDraft.slice(runDraft.indexOf('function chooseOffer'),runDraft.indexOf('function renderOffers'));
const firstApply=chooseOffer.indexOf('applyActiveCombatProfileToArena(api)');
const reset=chooseOffer.indexOf('forceArenaReset()');
const secondApply=chooseOffer.lastIndexOf('applyActiveCombatProfileToArena(api)');
assert.ok(firstApply>=0&&firstApply<reset,'profile tuning must be applied before the opening encounter reset');
assert.ok(secondApply>reset,'profile controls must be synchronized again after the reset');

for(const id of ['profileSelect','profileLoad','profileSave','profileSaveAs'])assert.match(labShell,new RegExp(`id="${id}"`),`the persistent profile bar must expose ${id}`);
assert.match(profilesUi,/getElementById\('profileSave'\)[^\n]+saveWorkspaceProfile\(\{asNew:!selected\(\)\}\)/,'Save must update the selected workspace profile');
assert.match(profilesUi,/saveWorkspaceProfile\(\{asNew:true/,'Save As must create a new stable profile');
assert.match(profilesUi,/setStoredJson\(storage,ACTIVE_COMBAT_PROFILE_STORAGE_KEY,saved\)/,'saving must update the active-profile marker as well as the library');
assert.match(profilesUi,/function applyProfile\(profile,/,'profile loading must use one validated application path');
assert.match(profilesUi,/runtime\.applyProfileSettings\?\.\(applicableSettings\(profile\)/,'loading must apply typed settings and compound resources through the profile registry');
assert.match(profilesUi,/hostWindow\.location\.reload\(\)/,'loading must restart once so boot-time settings are consistent');
assert.match(profilesUi,/Selected\. Press Load to apply it\./,'selecting a profile must not silently apply it');
assert.match(profilesUi,/PROFILE COVERAGE COMPLETE/,'profiles must surface typed-control coverage in the Lab');

console.log('Final milestone runtime regressions: ok');
