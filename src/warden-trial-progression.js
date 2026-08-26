import { WEAPON_STARTER_ARCANA_IDS } from './weapon-stance-plan.js';
import { arcanaDownStanceId } from './arcana-stance-pairings.js';
import { WIZARD_ARCANA_CATALOG } from './wizard-arcana-catalog.js';
import {
  WARDEN_TRIAL_BAZAAR_TACTICS,
  wardenTrialBazaarItemForArcana,
  wardenTrialBazaarTacticById,
} from './warden-trial-bazaar-catalog.js';

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
const arcanaPairings = WIZARD_ARCANA_CATALOG.map(arcana => {
  const bazaarItem = wardenTrialBazaarItemForArcana(arcana.arcanaId);
  return freezePair({
    id: arcana.arcanaId,
    family: 'arcana',
    weaponId: starterWeaponByArcanaId.get(arcana.arcanaId) || null,
    stanceId: arcanaDownStanceId(arcana.arcanaId),
    arcanaId: arcana.arcanaId,
    tacticId: null,
    element: arcana.element,
    bazaarItemId: bazaarItem?.id || null,
    pendingCooldownSeconds: bazaarItem?.pendingCooldownSeconds ?? null,
  });
});

// Tactics reuse the same 30 authored Down stances. Their Up side is a Bazaar
// setup/payoff action instead of an Arcana, while the existing one-card draw,
// reward, discard, and stance flow remains unchanged.
export const WARDEN_TRIAL_TACTIC_STANCE_IDS = Object.freeze(
  Array.from({ length:30 }, (_,index)=>`S${String(index+1).padStart(2,'0')}`),
);

const tacticPairings = WARDEN_TRIAL_BAZAAR_TACTICS.map((item,index)=>freezePair({
  id:`TACTIC:${item.tacticId}`,
  family:'tactic',
  weaponId:null,
  stanceId:WARDEN_TRIAL_TACTIC_STANCE_IDS[index%WARDEN_TRIAL_TACTIC_STANCE_IDS.length],
  arcanaId:null,
  tacticId:item.tacticId,
  element:null,
  bazaarItemId:item.id,
  pendingCooldownSeconds:item.pendingCooldownSeconds,
}));

export const WARDEN_TRIAL_CARD_PAIRINGS = Object.freeze([
  ...arcanaPairings,
  ...tacticPairings,
]);

const pairById = new Map(WARDEN_TRIAL_CARD_PAIRINGS.map(pair => [pair.id, pair]));

export function wardenTrialPairingForId(value) {
  const id = String(value || '').trim();
  return pairById.get(id) || null;
}

export function wardenTrialPairingForCard(card) {
  const explicit = wardenTrialPairingForId(card?.__wardenTrialPairId);
  if (explicit) return explicit;
  const stanceId = String(card?.__wardenTrialStanceId || card?.id || '').trim().toUpperCase();
  const arcanaId = String(card?.__wardenTrialArcanaId || '').trim().toUpperCase();
  const tacticId = String(card?.__wardenTrialTacticId || '').trim().toUpperCase();
  return WARDEN_TRIAL_CARD_PAIRINGS.find(pair => (
    pair.stanceId === stanceId
      && (pair.arcanaId === arcanaId || pair.tacticId === tacticId)
  )) || null;
}

export function createWardenTrialCard(card, pairing, { starter = false } = {}) {
  if (!card || !pairing?.id) return null;
  const bazaarItem = pairing.family==='tactic'
    ?wardenTrialBazaarTacticById(pairing.tacticId)
    :wardenTrialBazaarItemForArcana(pairing.arcanaId);
  return Object.freeze({
    ...card,
    __wardenTrialCard: true,
    __wardenTrialStarter: starter === true,
    __wardenTrialPairId: pairing.id,
    __wardenTrialWeaponId: pairing.weaponId,
    __wardenTrialStanceId: pairing.stanceId,
    __wardenTrialArcanaId: pairing.arcanaId,
    __wardenTrialTacticId: pairing.tacticId,
    __wardenTrialUpKind: pairing.family,
    __wardenTrialElement: pairing.element,
    __wardenTrialBazaarItemId: bazaarItem?.id || null,
    __wardenTrialBazaar: bazaarItem,
  });
}

function stanceCardById(stanceCards) {
  return new Map((Array.isArray(stanceCards) ? stanceCards : [])
    .filter(Boolean)
    .map(card => [String(card.id || '').trim().toUpperCase(), card]));
}

export function starterWardenTrialCardsForWeapon(weaponId, stanceCards = []) {
  const normalizedWeapon = String(weaponId || '').trim().toLowerCase();
  const byId = stanceCardById(stanceCards);
  return (WEAPON_STARTER_ARCANA_IDS[normalizedWeapon] || WEAPON_STARTER_ARCANA_IDS.longsword)
    .map(arcanaId => pairById.get(arcanaId))
    .map(pair => createWardenTrialCard(byId.get(pair.stanceId), pair, { starter: true }))
    .filter(Boolean);
}

export function wardenTrialRewardCards({
  stanceCards = [],
  selectedPairIds = [],
} = {}) {
  const selected = new Set((Array.isArray(selectedPairIds) ? selectedPairIds : [])
    .map(value => String(value || '').trim())
    .filter(Boolean));
  const byId = stanceCardById(stanceCards);
  return WARDEN_TRIAL_CARD_PAIRINGS
    .filter(pair => !selected.has(pair.id))
    .map(pair => createWardenTrialCard(byId.get(pair.stanceId), pair))
    .filter(Boolean);
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
