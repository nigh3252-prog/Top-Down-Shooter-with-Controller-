import { starterStanceIdsForWeapon } from './weapon-stance-plan.js';

const NON_STANCE_CARD_TYPES = new Set(['ability', 'modifier']);
const WARDEN_TRIAL_UP_ARCANA_IDS = Object.freeze({
  S26:'RAPID-FIRE-AGENT',
  S29:'AQUA-VORTEX',
});

export function wardenTrialUpArcanaIdForCard(card) {
  const stanceId = String(card?.id ?? card ?? '').trim().toUpperCase();
  return WARDEN_TRIAL_UP_ARCANA_IDS[stanceId] || null;
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
  if(direction === 'up'){
    if(!started){
      return Object.freeze({ accepted:false, reason:'starter-card-required', started:false, stamina:currentStamina, refill:false });
    }
    const arcanaId = wardenTrialUpArcanaIdForCard(card);
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
