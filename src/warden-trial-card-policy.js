import { starterArcanaIdsForWeapon, starterStanceIdsForWeapon } from './weapon-stance-plan.js';
import {
  WARDEN_TRIAL_STAMINA_MAX,
  starterWardenTrialCardsForWeapon,
} from './warden-trial-progression.js';

const NON_STANCE_CARD_TYPES = new Set(['ability', 'modifier']);

export function wardenTrialUpArcanaIdForCard(card, weaponId) {
  const authoredArcana = String(card?.__wardenTrialArcanaId || '').trim().toUpperCase();
  if (authoredArcana) return authoredArcana;
  const stanceId = String(card?.id ?? card ?? '').trim().toUpperCase();
  const stanceIds = starterStanceIdsForWeapon(weaponId);
  const arcanaIds = starterArcanaIdsForWeapon(weaponId);
  const index = stanceIds.indexOf(stanceId);
  return index >= 0 ? arcanaIds[index] || null : null;
}

export function dispatchWardenTrialUpArcana({
  arcanaId,
  resolveArcanaCard = () => null,
  dispatcher = null,
  context = {},
} = {}) {
  const normalizedId = String(arcanaId || '').trim().toUpperCase();
  const arcanaCard = normalizedId ? resolveArcanaCard(normalizedId) : null;
  if(!arcanaCard){
    return Object.freeze({ accepted:false, reason:'arcana-unavailable', arcanaId:normalizedId || null, arcanaCard:null });
  }
  if(typeof dispatcher?.canPlay !== 'function' || typeof dispatcher?.play !== 'function'
    || dispatcher.canPlay(arcanaCard,context) === false){
    return Object.freeze({ accepted:false, reason:'arcana-not-ready', arcanaId:normalizedId, arcanaCard });
  }
  if(dispatcher.play(arcanaCard,context) === false){
    return Object.freeze({ accepted:false, reason:'arcana-not-ready', arcanaId:normalizedId, arcanaCard });
  }
  return Object.freeze({ accepted:true, reason:'arcana-fired', arcanaId:normalizedId, arcanaCard });
}

export function isWardenTrialRuntime(config = {}) {
  return config?.wardenTrial === true || config?.variant === 'warden-trial';
}

export function wardenTrialStarterIdsForWeapon(weaponId) {
  return [...starterStanceIdsForWeapon(weaponId)];
}

export function starterCardsForWardenTrialWeapon(weaponId, deckCards = []) {
  const byId = new Map((Array.isArray(deckCards) ? deckCards : []).filter(Boolean).map(card => [card.id, card]));
  return starterWardenTrialCardsForWeapon(weaponId, wardenTrialStarterIdsForWeapon(weaponId).map(id => byId.get(id)).filter(Boolean));
}

export function isWardenTrialStaminaCard(card, { weaponId, deckCards = [] } = {}) {
  if (!card || NON_STANCE_CARD_TYPES.has(card.type)) return false;
  // Every authored Warden stance card—both the two weapon starters and cards
  // earned between waves—restores the full trial stamina bar. Ordinary stance
  // cards that are merely present in the global registry remain inert until
  // they are authored into the trial reward pool.
  const authored = card.__wardenTrialCard === true
    || wardenTrialStarterIdsForWeapon(weaponId).includes(card.id);
  if (!authored) return false;
  return Array.isArray(deckCards) && deckCards.some(candidate => (
    candidate === card
      || (card.__wardenTrialPairId && candidate?.__wardenTrialPairId === card.__wardenTrialPairId)
      || (!card.__wardenTrialPairId && candidate?.id === card.id)
  ));
}

export function resolveWardenTrialCardPlay({
  direction = 'up',
  started = false,
  card = null,
  weaponId,
  deckCards = [],
  stamina = 0,
  maxStamina = WARDEN_TRIAL_STAMINA_MAX,
} = {}) {
  const currentStamina = Math.max(0, Number(stamina) || 0);
  if(direction === 'up'){
    if(!started){
      return Object.freeze({ accepted:false, reason:'starter-card-required', started:false, stamina:currentStamina, refill:false });
    }
    const arcanaId = wardenTrialUpArcanaIdForCard(card, weaponId);
    if(!arcanaId){
      return Object.freeze({ accepted:false, reason:'direction-inert', started:true, stamina:currentStamina, refill:false });
    }
    return Object.freeze({ accepted:true, reason:'arcana-fired', started:true, stamina:currentStamina, refill:false, arcanaId });
  }
  if(direction !== 'down'){
    return Object.freeze({ accepted:false, reason:'direction-inert', started:!!started, stamina:currentStamina, refill:false });
  }
  const refill = isWardenTrialStaminaCard(card,{weaponId,deckCards});
  if(!started&&!refill){
    return Object.freeze({ accepted:false, reason:'starter-card-required', started:false, stamina:currentStamina, refill:false });
  }
  return Object.freeze({
    accepted:true,
    reason:refill?'stamina-card':'card-played',
    started:true,
    stamina:refill?Math.max(0,Number(maxStamina)||0):currentStamina,
    refill,
  });
}
