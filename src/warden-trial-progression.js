import { WEAPON_STARTER_ARCANA_IDS } from './weapon-stance-plan.js';
import { arcanaDownStanceId } from './arcana-stance-pairings.js';
import { WIZARD_ARCANA_CATALOG } from './wizard-arcana-catalog.js';

// Warden Trial deliberately has a larger resource budget than the ordinary
// Arena. Keep this value here with the trial's authored progression so the
// runtime and policy tests share one source of truth.
export const WARDEN_TRIAL_STAMINA_MAX = 200;
export const WARDEN_TRIAL_INITIAL_WAVE_SIZE = 7;
export const WARDEN_TRIAL_MAX_WAVE_SIZE = 100;
export const WARDEN_TRIAL_REWARD_CHOICE_COUNT = 3;

// The curve is intentionally discrete: each cleared wave gets a predictable,
// inspectable count, then the trial settles at the requested 100-enemy ceiling.
// Keeping it as data makes tuning the run feel straightforward without hiding
// the ramp in a formula.
export const WARDEN_TRIAL_WAVE_SIZES = Object.freeze([
  7, 10, 14, 18, 23, 29, 36, 44, 53, 63, 74, 86, 100,
]);

export function wardenTrialWaveSize(waveNumber = 1) {
  const wave = Math.max(1, Math.trunc(Number(waveNumber) || 1));
  return WARDEN_TRIAL_WAVE_SIZES[Math.min(wave, WARDEN_TRIAL_WAVE_SIZES.length) - 1]
    ?? WARDEN_TRIAL_MAX_WAVE_SIZE;
}

const freezePair = pair => Object.freeze({ ...pair });

const starterWeaponByArcanaId = new Map(Object.entries(WEAPON_STARTER_ARCANA_IDS)
  .flatMap(([weaponId, arcanaIds]) => arcanaIds.map(arcanaId => [arcanaId, weaponId])));

// Every canonical Arcana receives one authored down-side stance. Arcana IDs
// are unique while stance IDs intentionally repeat, allowing all 70 Arcana to
// live in the finite Warden Trial upgrade pool without duplicating an Arcana.
export const WARDEN_TRIAL_CARD_PAIRINGS = Object.freeze(
  WIZARD_ARCANA_CATALOG.map(arcana => freezePair({
    id: arcana.arcanaId,
    weaponId: starterWeaponByArcanaId.get(arcana.arcanaId) || null,
    stanceId: arcanaDownStanceId(arcana.arcanaId),
    arcanaId: arcana.arcanaId,
    element: arcana.element,
  })),
);

const pairById = new Map(WARDEN_TRIAL_CARD_PAIRINGS.map(pair => [pair.id, pair]));
const arcanaById = new Map(WIZARD_ARCANA_CATALOG.map(card => [card.arcanaId, card]));

export function wardenTrialPairingForId(value) {
  const id = String(value || '').trim();
  return pairById.get(id) || null;
}

export function wardenTrialPairingForCard(card) {
  const explicit = wardenTrialPairingForId(card?.__wardenTrialPairId);
  if (explicit) return explicit;
  const arcanaId = String(card?.__wardenTrialArcanaId || '').trim().toUpperCase();
  return arcanaId ? pairById.get(arcanaId) || null : null;
}

const timingForCard = card => Object.freeze({
  setupSeconds:0,
  ...(card?.__wardenTrialTiming || {}),
});

export function createWardenTrialAbilityCard(card, { starter = false } = {}) {
  if (!card?.arcanaId) return null;
  return Object.freeze({
    ...card,
    __wardenTrialCard: true,
    __wardenTrialStarter: starter === true,
    __wardenTrialCardId: `up:${card.id}`,
    __wardenTrialDirection: 'up',
    __wardenTrialArcanaId: card.arcanaId,
    __wardenTrialElement: card.element,
    __wardenTrialTiming: timingForCard(card),
  });
}

export function createWardenTrialStanceCard(card, { starter = false } = {}) {
  if (!card?.id) return null;
  return Object.freeze({
    ...card,
    type:'stance',
    __wardenTrialCard: true,
    __wardenTrialStarter: starter === true,
    __wardenTrialCardId: `down:${card.id}`,
    __wardenTrialDirection: 'down',
    __wardenTrialStanceId: card.id,
    __wardenTrialTiming: timingForCard(card),
  });
}

// Kept as a compatibility constructor for callers that still have the old
// Arcana/stance pairing data. New Warden play uses the two independent helpers
// above and never builds a dual-purpose card.
export function createWardenTrialCard(card, pairing, { starter = false, direction = 'down' } = {}) {
  if (direction === 'up') return createWardenTrialAbilityCard(arcanaById.get(pairing?.arcanaId), { starter });
  return createWardenTrialStanceCard(card, { starter });
}

function stanceCardById(stanceCards) {
  return new Map((Array.isArray(stanceCards) ? stanceCards : [])
    .filter(Boolean)
    .map(card => [String(card.id || '').trim().toUpperCase(), card]));
}

export function starterWardenTrialCardsForWeapon(weaponId, stanceCards = []) {
  const normalizedWeapon = String(weaponId || '').trim().toLowerCase();
  const byId = stanceCardById(stanceCards);
  const arcanaIds = WEAPON_STARTER_ARCANA_IDS[normalizedWeapon] || WEAPON_STARTER_ARCANA_IDS.longsword;
  return arcanaIds.flatMap(arcanaId => {
    const pairing = pairById.get(arcanaId);
    return [
      createWardenTrialAbilityCard(arcanaById.get(arcanaId), { starter:true }),
      createWardenTrialStanceCard(byId.get(pairing?.stanceId), { starter:true }),
    ].filter(Boolean);
  });
}

export function wardenTrialRewardCards({
  stanceCards = [],
  selectedCardIds = [],
  selectedPairIds = [],
} = {}) {
  const selected = new Set((Array.isArray(selectedCardIds) ? selectedCardIds : [])
    .map(value => String(value || '').trim())
    .filter(Boolean));
  // Accepting the former option keeps stacked callers from crashing while the
  // runtime migrates; pair IDs exclude only their Up card in the independent
  // catalog because Down stances are no longer owned by a pairing.
  (Array.isArray(selectedPairIds) ? selectedPairIds : []).forEach(value => {
    const arcana = arcanaById.get(String(value || '').trim().toUpperCase());
    if (arcana) selected.add(`up:${arcana.id}`);
  });
  const byId = stanceCardById(stanceCards);
  return [
    ...WIZARD_ARCANA_CATALOG.map(card => createWardenTrialAbilityCard(card)),
    ...[...byId.values()].map(card => createWardenTrialStanceCard(card)),
  ].filter(card => card && !selected.has(card.__wardenTrialCardId));
}

export function drawWardenTrialRewardChoices(cards = [], count = WARDEN_TRIAL_REWARD_CHOICE_COUNT, rng = Math.random) {
  const pool = Array.isArray(cards) ? cards.filter(Boolean).slice() : [];
  const wanted = Math.max(0, Math.min(Math.trunc(Number(count) || 0), pool.length));
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const random = Number(rng?.()) || 0;
    const swap = Math.max(0, Math.min(index, Math.floor(random * (index + 1))));
    [pool[index], pool[swap]] = [pool[swap], pool[index]];
  }
  return pool.slice(0, wanted);
}
