import { CARD_REGISTRY } from './card-registry.js';
import { EFFECT_REGISTRY, createEffectDispatcher } from './effect-registry.js';
import {
  getArenaEnemy,
  listArenaEnemies,
  requireArenaEnemy,
} from './arena-enemy-content-registry.js';

// Public content facade. Family modules remain free to own their pure
// definitions, while gameplay and tooling use one entry point per pillar.
export const cards = CARD_REGISTRY;

export const effects = Object.freeze({
  get: EFFECT_REGISTRY.get,
  require: EFFECT_REGISTRY.require,
  list: EFFECT_REGISTRY.list,
  createDispatcher: createEffectDispatcher,
});

export const enemies = Object.freeze({
  get: getArenaEnemy,
  require: requireArenaEnemy,
  list: listArenaEnemies,
});

export const gameContent = Object.freeze({cards, effects, enemies});

export default gameContent;
