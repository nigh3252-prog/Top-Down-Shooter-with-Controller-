import { starterArcanaIdsForWeapon, starterStanceIdsForWeapon } from './weapon-stance-plan.js';

const normalizeArcanaId = value => String(value?.arcanaId ?? value?.id ?? value ?? '')
  .trim()
  .toUpperCase()
  .replace(/^WOL-/, '');

export function isWardenTrialArcanaCard(card) {
  return card?.type === 'ability' && typeof card?.arcanaId === 'string' && card.arcanaId.length > 0;
}

export function isWardenTrialRuntime(config = {}) {
  return config?.wardenTrial === true || config?.variant === 'warden-trial';
}

export function wardenTrialStarterIdsForWeapon(weaponId) {
  return [...starterStanceIdsForWeapon(weaponId)];
}

export function wardenTrialStarterArcanaIdsForWeapon(weaponId) {
  return [...starterArcanaIdsForWeapon(weaponId)];
}

export function starterCardsForWardenTrialWeapon(weaponId, deckCards = []) {
  const byArcanaId = new Map((Array.isArray(deckCards) ? deckCards : [])
    .filter(isWardenTrialArcanaCard)
    .map(card => [normalizeArcanaId(card), card]));
  return wardenTrialStarterArcanaIdsForWeapon(weaponId)
    .map(id => byArcanaId.get(normalizeArcanaId(id)))
    .filter(Boolean);
}

export function isWardenTrialStaminaCard(card, { weaponId, deckCards = [] } = {}) {
  if (!isWardenTrialArcanaCard(card)) return false;
  const arcanaId = normalizeArcanaId(card);
  if (!wardenTrialStarterArcanaIdsForWeapon(weaponId).includes(arcanaId)) return false;
  return Array.isArray(deckCards)
    && deckCards.some(candidate => isWardenTrialArcanaCard(candidate) && normalizeArcanaId(candidate) === arcanaId);
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
    if(!started || !isWardenTrialArcanaCard(card)){
      return Object.freeze({ accepted:false, reason:!started?'starter-card-required':'direction-inert', started:!!started, stamina:currentStamina, refill:false });
    }
    return Object.freeze({ accepted:true, reason:'arcana-fired', started:true, stamina:currentStamina, refill:false });
  }
  if(direction !== 'down'){
    return Object.freeze({ accepted:false, reason:'direction-inert', started:!!started, stamina:currentStamina, refill:false });
  }
  if(!isWardenTrialArcanaCard(card)){
    return Object.freeze({ accepted:false, reason:'direction-inert', started:!!started, stamina:currentStamina, refill:false });
  }
  const starterCard = isWardenTrialStaminaCard(card,{weaponId,deckCards});
  if(!started&&!starterCard){
    return Object.freeze({ accepted:false, reason:'starter-card-required', started:false, stamina:currentStamina, refill:false });
  }
  return Object.freeze({
    accepted:true,
    reason:starterCard?'stamina-card':'card-played',
    started:true,
    stamina:Math.max(0,Number(maxStamina)||0),
    refill:true,
  });
}
