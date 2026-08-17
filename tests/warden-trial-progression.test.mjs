import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { STANCE_CARDS } from '../src/stance-cards.js';
import {
  WARDEN_TRIAL_CARD_PAIRINGS,
  WARDEN_TRIAL_MAX_WAVE_SIZE,
  WARDEN_TRIAL_STAMINA_MAX,
  WARDEN_TRIAL_WAVE_SIZES,
  drawWardenTrialRewardChoices,
  starterWardenTrialCardsForWeapon,
  wardenTrialRewardCards,
  wardenTrialWaveSize,
} from '../src/warden-trial-progression.js';
import {
  isWardenTrialStaminaCard,
  resolveWardenTrialCardPlay,
} from '../src/warden-trial-card-policy.js';
import { ARENA_SHELL_HTML } from '../src/arena-shell.js';

assert.equal(WARDEN_TRIAL_STAMINA_MAX, 200);
assert.equal(WARDEN_TRIAL_WAVE_SIZES[0], 7);
assert.equal(WARDEN_TRIAL_WAVE_SIZES.at(-1), WARDEN_TRIAL_MAX_WAVE_SIZE);
assert.ok(WARDEN_TRIAL_WAVE_SIZES.every((size, index) => index === 0 || size >= WARDEN_TRIAL_WAVE_SIZES[index - 1]));
assert.equal(wardenTrialWaveSize(1), 7);
assert.equal(wardenTrialWaveSize(2), 10);
assert.equal(wardenTrialWaveSize(999), 100);

assert.equal(WARDEN_TRIAL_CARD_PAIRINGS.length, 22, 'the reward catalog keeps all authored weapon pairings');
assert.equal(new Set(WARDEN_TRIAL_CARD_PAIRINGS.map(pair => pair.id)).size, 22, 'shared stance IDs still produce distinct rewards');

const starters = starterWardenTrialCardsForWeapon('longsword', STANCE_CARDS);
assert.deepEqual(starters.map(card => card.id), ['S26', 'S29']);
assert.deepEqual(starters.map(card => card.__wardenTrialArcanaId), ['RAPID-FIRE-AGENT', 'AQUA-VORTEX']);
assert.ok(starters.every(card => card.__wardenTrialCard === true));

const starterPairIds = starters.map(card => card.__wardenTrialPairId);
const rewardPool = wardenTrialRewardCards({ stanceCards: STANCE_CARDS, selectedPairIds: starterPairIds });
assert.equal(rewardPool.length, 20, 'the two weapon starters are not offered again');
assert.equal(new Set(rewardPool.map(card => card.__wardenTrialPairId)).size, rewardPool.length);
assert.ok(rewardPool.every(card => isWardenTrialStaminaCard(card, { weaponId: 'longsword', deckCards: [card] })));

const choices = drawWardenTrialRewardChoices(rewardPool, 3, () => 0);
assert.equal(choices.length, 3);
assert.equal(new Set(choices.map(card => card.__wardenTrialPairId)).size, 3);
for (const card of [...starters, ...rewardPool]) {
  assert.deepEqual(
    resolveWardenTrialCardPlay({
      direction: 'down',
      started: true,
      card,
      weaponId: 'longsword',
      deckCards: [card],
      stamina: 17,
      maxStamina: WARDEN_TRIAL_STAMINA_MAX,
    }),
    { accepted: true, reason: 'stamina-card', started: true, stamina: WARDEN_TRIAL_STAMINA_MAX, refill: true },
    `${card.id} restores the full Warden stamina bar when pulled down`,
  );
}

assert.match(ARENA_SHELL_HTML, /id="wardenRewardGate"/);
assert.equal((ARENA_SHELL_HTML.match(/class="wardenRewardChoice"/g) || []).length, 3);
assert.match(ARENA_SHELL_HTML, /id="wardenRewardSkip"/);
assert.match(ARENA_SHELL_HTML, /Skip this card reward and start the next wave without adding a card/);

const arenaRuntimeSource = await readFile(new URL('../src/arena-runtime.js', import.meta.url), 'utf8');
assert.match(arenaRuntimeSource, /function skipWardenTrialReward\(\)[\s\S]*?return startNextWardenTrialWave\(\);/,
  'skipping resumes play through the same no-card wave transition used by an exhausted reward pool');
assert.match(arenaRuntimeSource, /wardenRewardSkipButton\?\.addEventListener\('click',skipWardenTrialReward\)/,
  'the skip control is wired to the runtime action');
assert.match(arenaRuntimeSource, /chooseWardenTrialReward,skipWardenTrialReward,/,
  'the runtime exposes reward selection and skipping for integration checks');

console.log('Warden Trial progression: ok');
