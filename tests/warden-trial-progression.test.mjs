import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { STANCE_CARDS } from '../src/stance-cards.js';
import { WIZARD_ARCANA_CATALOG } from '../src/wizard-arcana-catalog.js';
import {
  WARDEN_TRIAL_CARD_PAIRINGS,
  WARDEN_TRIAL_MAX_WAVE_SIZE,
  WARDEN_TRIAL_STAMINA_MAX,
  WARDEN_TRIAL_WAVE_SIZES,
  createWardenTrialAbilityCard,
  drawWardenTrialRewardChoices,
  starterWardenTrialCardsForWeapon,
  wardenTrialRewardCards,
  wardenTrialWaveSize,
} from '../src/warden-trial-progression.js';
import { wardenTrialCardDirection } from '../src/warden-trial-card-policy.js';
import { ARENA_SHELL_HTML } from '../src/arena-shell.js';

assert.equal(WARDEN_TRIAL_STAMINA_MAX,200);
assert.equal(WARDEN_TRIAL_WAVE_SIZES[0],7);
assert.equal(WARDEN_TRIAL_WAVE_SIZES.at(-1),WARDEN_TRIAL_MAX_WAVE_SIZE);
assert.equal(wardenTrialWaveSize(2),10);
assert.equal(wardenTrialWaveSize(999),100);
assert.equal(WARDEN_TRIAL_CARD_PAIRINGS.length,70,'legacy pairing data remains available to audit authored starter relationships');

const starters=starterWardenTrialCardsForWeapon('longsword',STANCE_CARDS);
assert.deepEqual(starters.map(card=>card.id),['WOL-RAPID-FIRE-AGENT','S26','WOL-AQUA-VORTEX','S29']);
assert.deepEqual(starters.map(wardenTrialCardDirection),['up','down','up','down']);
assert.equal(new Set(starters.map(card=>card.__wardenTrialCardId)).size,4);
assert.ok(starters.every(card=>card.__wardenTrialTiming.setupSeconds===0));
const timedAbility=createWardenTrialAbilityCard({
  ...WIZARD_ARCANA_CATALOG[0],
  __wardenTrialTiming:{setupSeconds:.75,cooldownSeconds:2.5},
});
assert.deepEqual(timedAbility.__wardenTrialTiming,{setupSeconds:.75,cooldownSeconds:2.5},'authored future timing survives Warden wrapping');

const selectedCardIds=starters.map(card=>card.__wardenTrialCardId);
const rewardPool=wardenTrialRewardCards({stanceCards:STANCE_CARDS,selectedCardIds});
assert.equal(rewardPool.length,WIZARD_ARCANA_CATALOG.length+STANCE_CARDS.length-starters.length);
assert.equal(rewardPool.filter(card=>wardenTrialCardDirection(card)==='up').length,68);
assert.equal(rewardPool.filter(card=>wardenTrialCardDirection(card)==='down').length,28);
assert.equal(new Set(rewardPool.map(card=>card.__wardenTrialCardId)).size,rewardPool.length);
assert.ok(rewardPool.every(card=>card.__wardenTrialTiming.setupSeconds===0));
assert.ok(rewardPool.every(card=>!selectedCardIds.includes(card.__wardenTrialCardId)));

const choices=drawWardenTrialRewardChoices(rewardPool,3,()=>0);
assert.equal(choices.length,3);
assert.equal(new Set(choices.map(card=>card.__wardenTrialCardId)).size,3);

assert.equal((ARENA_SHELL_HTML.match(/data-trial-hand-slot=/g)||[]).length,3);
assert.match(ARENA_SHELL_HTML,/id="trialUpSlot"/);
assert.match(ARENA_SHELL_HTML,/id="trialDownSlot"/);
assert.match(ARENA_SHELL_HTML,/id="trialDiscardDraw"/);
assert.match(ARENA_SHELL_HTML,/id="trialCardGlobalCooldown"/);
assert.doesNotMatch(ARENA_SHELL_HTML,/id="trialCard" class="trialCard"/,'the linked two-sided card is gone');

const runtimeSource=await readFile(new URL('../src/arena-runtime.js',import.meta.url),'utf8');
assert.match(runtimeSource,/createWardenTrialHand\(\{ handSize:WARDEN_TRIAL_SETTINGS\.cardHandSize \}\)/);
assert.match(runtimeSource,/deck\.discardAndDraw\(\)/);
assert.match(runtimeSource,/hasNearbyWardenTrialEnemy\(\{/);
assert.match(runtimeSource,/selectedCardIds:\[\.\.\.wardenTrialSelectedCardIds\]/);
assert.doesNotMatch(runtimeSource,/handSize:wardenTrialMode\?1:2/);

console.log('Warden Trial independent progression: ok');
