import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { STANCE_CARDS } from '../src/stance-cards.js';
import { arcanaDownStanceId, arcanaElementStanceClass } from '../src/arcana-stance-pairings.js';
import { getStanceClass } from '../src/stance-compatibility.js';
import { WIZARD_ARCANA_CATALOG } from '../src/wizard-arcana-catalog.js';
import { WEAPON_STARTER_ARCANA_IDS, WEAPON_STARTER_STANCE_IDS } from '../src/weapon-stance-plan.js';
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
  wardenTrialUpArcanaIdForCard,
} from '../src/warden-trial-card-policy.js';
import { wardenTrialCardCooldownSeconds } from '../src/warden-trial-card-cooldown.js';
import { ARENA_SHELL_HTML } from '../src/arena-shell.js';

assert.equal(WARDEN_TRIAL_STAMINA_MAX, 200);
assert.equal(WARDEN_TRIAL_WAVE_SIZES[0], 7);
assert.equal(WARDEN_TRIAL_WAVE_SIZES.at(-1), WARDEN_TRIAL_MAX_WAVE_SIZE);
assert.ok(WARDEN_TRIAL_WAVE_SIZES.every((size, index) => index === 0 || size >= WARDEN_TRIAL_WAVE_SIZES[index - 1]));
assert.equal(wardenTrialWaveSize(1), 7);
assert.equal(wardenTrialWaveSize(2), 10);
assert.equal(wardenTrialWaveSize(999), 100);

assert.equal(WARDEN_TRIAL_CARD_PAIRINGS.length, 70, 'the reward catalog contains every canonical Arcana');
assert.equal(WARDEN_TRIAL_CARD_PAIRINGS.length, WIZARD_ARCANA_CATALOG.length);
assert.equal(new Set(WARDEN_TRIAL_CARD_PAIRINGS.map(pair => pair.id)).size, 70, 'every combined reward has a stable unique ID');
assert.equal(new Set(WARDEN_TRIAL_CARD_PAIRINGS.map(pair => pair.arcanaId)).size, 70, 'Arcana never repeat across combined rewards');

const arcanaById = new Map(WIZARD_ARCANA_CATALOG.map(card => [card.arcanaId, card]));
const pairingCountsByStance = new Map(STANCE_CARDS.map(card => [card.id, 0]));
for (const pairing of WARDEN_TRIAL_CARD_PAIRINGS) {
  const arcana = arcanaById.get(pairing.arcanaId);
  assert.ok(arcana, `${pairing.arcanaId} resolves through the canonical Arcana catalog`);
  assert.equal(pairing.stanceId, arcanaDownStanceId(pairing.arcanaId));
  assert.ok(pairingCountsByStance.has(pairing.stanceId), `${pairing.arcanaId} has a real stance`);
  pairingCountsByStance.set(pairing.stanceId, pairingCountsByStance.get(pairing.stanceId) + 1);
  const expectedClass = arcanaElementStanceClass(arcana.element);
  if (expectedClass) assert.equal(getStanceClass(pairing.stanceId), expectedClass,
    `${arcana.name} follows the ${arcana.element} stance-tier rule`);
  else {
    assert.equal(arcana.element, 'Chaos', `${arcana.name} is the only flexible element case`);
    assert.equal(getStanceClass(pairing.stanceId), 'Heavy', `${arcana.name} uses the chosen Power treatment for Chaos`);
  }
}
assert.ok([...pairingCountsByStance.values()].every(count => count >= 1), 'all 30 stances appear in the combined-card catalog');
for (const stanceClass of ['Light', 'Medium', 'Heavy']) {
  const counts = STANCE_CARDS
    .filter(card => getStanceClass(card) === stanceClass)
    .map(card => pairingCountsByStance.get(card.id));
  assert.ok(Math.max(...counts) - Math.min(...counts) <= 1,
    `${stanceClass} pairings are distributed as evenly as the element catalog permits`);
}

for (const [weaponId, arcanaIds] of Object.entries(WEAPON_STARTER_ARCANA_IDS)) {
  const stanceIds = WEAPON_STARTER_STANCE_IDS[weaponId];
  arcanaIds.forEach((arcanaId, index) => {
    const pairing = WARDEN_TRIAL_CARD_PAIRINGS.find(candidate => candidate.arcanaId === arcanaId);
    assert.equal(pairing?.weaponId, weaponId, `${arcanaId} remains a ${weaponId} starter`);
    assert.equal(pairing?.stanceId, stanceIds[index], `${arcanaId} retains its authored starter stance`);
  });
}

const starters = starterWardenTrialCardsForWeapon('longsword', STANCE_CARDS);
assert.deepEqual(starters.map(card => card.id), ['S26', 'S29']);
assert.deepEqual(starters.map(card => card.__wardenTrialArcanaId), ['RAPID-FIRE-AGENT', 'AQUA-VORTEX']);
assert.ok(starters.every(card => card.__wardenTrialCard === true));

const starterPairIds = starters.map(card => card.__wardenTrialPairId);
const rewardPool = wardenTrialRewardCards({ stanceCards: STANCE_CARDS, selectedPairIds: starterPairIds });
assert.equal(rewardPool.length, 68, 'all remaining Arcana are available after the two weapon starters');
assert.equal(new Set(rewardPool.map(card => card.__wardenTrialPairId)).size, rewardPool.length);
assert.equal(new Set([...starters, ...rewardPool].map(card => card.__wardenTrialArcanaId)).size, 70,
  'the opening cards plus upgrade pool cover every Arcana exactly once');
assert.ok(rewardPool.every(card => isWardenTrialStaminaCard(card, { weaponId: 'longsword', deckCards: [card] })));

const choices = drawWardenTrialRewardChoices(rewardPool, 3, () => 0);
assert.equal(choices.length, 3);
assert.equal(new Set(choices.map(card => card.__wardenTrialPairId)).size, 3);
for (const card of [...starters, ...rewardPool]) {
  assert.equal(wardenTrialCardCooldownSeconds('up'), 3, `${card.__wardenTrialArcanaId} uses the shared upward cooldown`);
  assert.equal(wardenTrialCardCooldownSeconds('down'), 1, `${card.id} uses the shared downward cooldown`);
  const upward = resolveWardenTrialCardPlay({
    direction: 'up',
    started: true,
    card,
    weaponId: 'longsword',
    deckCards: [card],
    stamina: 17,
    maxStamina: WARDEN_TRIAL_STAMINA_MAX,
  });
  assert.equal(upward.accepted, true, `${card.__wardenTrialArcanaId} can fire upward`);
  assert.equal(upward.arcanaId, card.__wardenTrialArcanaId);
  assert.equal(wardenTrialUpArcanaIdForCard(card, 'longsword'), card.__wardenTrialArcanaId);
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
