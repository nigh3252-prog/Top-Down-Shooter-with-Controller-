import { starterStanceIdsForWeapon } from './weapon-stance-plan.js';
import {
  WARDEN_TRIAL_STAMINA_MAX,
  starterWardenTrialCardsForWeapon,
} from './warden-trial-progression.js';
import { wardenTrialCardId } from './warden-trial-hand.js';

export function wardenTrialCardDirection(card) {
  const direction = String(card?.__wardenTrialDirection || '').trim().toLowerCase();
  return direction === 'up' || direction === 'down' ? direction : null;
}

export function wardenTrialUpArcanaIdForCard(card) {
  if (wardenTrialCardDirection(card) !== 'up') return null;
  const authoredArcana = String(card?.__wardenTrialArcanaId || '').trim().toUpperCase();
  return authoredArcana || null;
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
  return starterWardenTrialCardsForWeapon(weaponId, deckCards);
}

export function isWardenTrialStaminaCard(card, { deckCards = [] } = {}) {
  if (!card || wardenTrialCardDirection(card) !== 'down' || card.__wardenTrialCard !== true) return false;
  const cardId = wardenTrialCardId(card);
  return Array.isArray(deckCards) && deckCards.some(candidate => (
    candidate === card
      || (cardId && wardenTrialCardId(candidate) === cardId)
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
  const requestedDirection=String(direction||'').trim().toLowerCase();
  if(!started){
    return Object.freeze({ accepted:false, reason:'draw-required', started:false, stamina:currentStamina, refill:false });
  }
  const cardDirection=wardenTrialCardDirection(card);
  if(requestedDirection!==cardDirection){
    return Object.freeze({ accepted:false, reason:'wrong-direction', started:true, stamina:currentStamina, refill:false });
  }
  if(requestedDirection === 'up'){
    const arcanaId = wardenTrialUpArcanaIdForCard(card, weaponId);
    if(!arcanaId){
      return Object.freeze({ accepted:false, reason:'direction-inert', started:true, stamina:currentStamina, refill:false });
    }
    return Object.freeze({ accepted:true, reason:'arcana-fired', started:true, stamina:currentStamina, refill:false, arcanaId });
  }
  if(requestedDirection !== 'down'){
    return Object.freeze({ accepted:false, reason:'direction-inert', started:true, stamina:currentStamina, refill:false });
  }
  const refill = isWardenTrialStaminaCard(card,{weaponId,deckCards});
  return Object.freeze({
    accepted:true,
    reason:refill?'stamina-card':'card-played',
    started:true,
    stamina:refill?Math.max(0,Number(maxStamina)||0):currentStamina,
    refill,
  });
}
