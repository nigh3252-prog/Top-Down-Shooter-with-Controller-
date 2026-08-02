import assert from 'node:assert/strict';
import { gameContent } from '../src/game-content.js';

assert.ok(Object.isFrozen(gameContent));
assert.ok(Object.isFrozen(gameContent.cards));
assert.ok(Object.isFrozen(gameContent.effects));
assert.ok(Object.isFrozen(gameContent.enemies));

const cards = gameContent.cards.list();
const effects = gameContent.effects.list();
const enemies = gameContent.enemies.list();
const routedCards = cards.filter(card => card.effectId);

assert.equal(cards.length, 79, 'the exact current card inventory is preserved');
assert.equal(routedCards.length, 49, 'all 49 non-standard cards resolve through the effect registry');
assert.equal(effects.length, 49, 'each routed card owns one effect definition');
assert.equal(enemies.length, 29, 'the exact current enemy inventory is preserved');
assert.equal(new Set(cards.map(card => card.id)).size, cards.length, 'card ids are unique');
assert.equal(new Set(effects.map(effect => effect.effectId)).size, effects.length, 'effect ids are unique');
assert.equal(new Set(enemies.map(enemy => enemy.id)).size, enemies.length, 'enemy ids are unique');

for (const card of cards) {
  assert.equal(gameContent.cards.get(card.id), card);
  assert.equal(gameContent.cards.require(card.id), card);
  assert.ok(Object.isFrozen(card), `${card.id} is frozen`);

  if (card.type === 'ability' || card.type === 'modifier') {
    assert.ok(card.effectId, `${card.id} references an effect`);
  }
  if (card.effectId) {
    const effect = gameContent.effects.require(card.effectId);
    assert.ok(effect.runtimeHandlerId, `${card.effectId} references one runtime handler`);
  }
}

for (const enemy of enemies) {
  assert.equal(gameContent.enemies.get(enemy.id), enemy);
  assert.equal(gameContent.enemies.require(enemy.spawnKind), enemy);
  assert.ok(Object.isFrozen(enemy), `${enemy.id} is frozen`);
  assert.ok(enemy.runtimeAdapter, `${enemy.id} has a runtime adapter`);
  for (const attackId of enemy.attackIds) {
    assert.ok(enemy.attacks.some(attack => attack.id === attackId), `${enemy.id} resolves attack ${attackId}`);
  }
}

assert.throws(() => gameContent.cards.require('missing-card'), /Unknown card/);
assert.throws(() => gameContent.effects.require('missing-effect'), /Unknown effect/);
assert.throws(() => gameContent.enemies.require('missing-enemy'), /Unknown enemy/);

console.log('gameContent cards/effects/enemies facade: ok');
