import { starterStanceIdsForWeapon } from './weapon-stance-plan.js';

const NON_STANCE_CARD_TYPES = new Set(['ability', 'modifier']);

export function isWardenTrialRuntime(config = {}) {
  return config?.wardenTrial === true || config?.variant === 'warden-trial';
}

export function wardenTrialStarterIdsForWeapon(weaponId) {
  return [...starterStanceIdsForWeapon(weaponId)];
}

export function starterCardsForWardenTrialWeapon(weaponId, deckCards = []) {
  const byId = new Map((Array.isArray(deckCards) ? deckCards : []).filter(Boolean).map(card => [card.id, card]));
  return wardenTrialStarterIdsForWeapon(weaponId).map(id => byId.get(id)).filter(Boolean);
}

export function isWardenTrialStaminaCard(card, { weaponId, deckCards = [] } = {}) {
  if (!card || NON_STANCE_CARD_TYPES.has(card.type)) return false;
  if (!wardenTrialStarterIdsForWeapon(weaponId).includes(card.id)) return false;
  return Array.isArray(deckCards) && deckCards.some(candidate => candidate?.id === card.id);
}

export function resolveWardenTrialCardPlay({
  direction = 'up',
  started = false,
  card = null,
  weaponId,
  deckCards = [],
  stamina = 0,
  maxStamina = 100,
} = {}) {
  const currentStamina = Math.max(0, Number(stamina) || 0);
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
