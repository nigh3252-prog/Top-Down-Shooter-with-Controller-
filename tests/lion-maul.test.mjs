import assert from 'node:assert/strict';
import {
  LION_MAUL_PRESETS,
  createLionMaulSequence,
  lionMaulPreset,
  normalizeLionMaulSettings,
} from '../src/lion-maul.js';
import {
  LION_MAUL_ANIMATION_DEFAULTS,
  lionMaulAnimationDuration,
  lionMaulAnimationState,
} from '../src/lion-maul-animation.js';

assert.deepEqual(Object.keys(LION_MAUL_PRESETS), ['quick', 'triple', 'apex']);
assert.equal(lionMaulPreset('quick').biteCount, 2);
assert.equal(lionMaulPreset('triple').biteCount, 3);
assert.equal(lionMaulPreset('apex').biteCount, 4);
assert.equal(lionMaulPreset('triple').firstBiteDelay, .78);
assert.equal(lionMaulPreset('triple').biteInterval, .58);
assert.equal(lionMaulPreset('triple').stunDuration, 2.76);

const clamped = normalizeLionMaulSettings({
  biteCount:99,
  biteDamage:-4,
  biteInterval:.01,
  firstBiteDelay:0,
  stunDuration:.1,
  recovery:99,
});
assert.equal(clamped.biteCount, 6);
assert.equal(clamped.biteDamage, 1);
assert.equal(clamped.biteInterval, .12);
assert.equal(clamped.firstBiteDelay, .78, 'zero delay falls back to the standalone-lab triple preset');
assert.ok(clamped.stunDuration >= lionMaulAnimationDuration(clamped));
assert.equal(clamped.recovery, 2.5);

const settings = lionMaulPreset('triple');
const sequence = createLionMaulSequence(settings);
assert.equal(sequence.advance(settings.firstBiteDelay - .01).pendingBites, 0);
assert.equal(sequence.advance(.02).pendingBites, 1);
assert.equal(sequence.consumeBite(), 0);
assert.equal(sequence.advance(settings.biteInterval - .02).pendingBites, 0);
assert.equal(sequence.advance(.03).pendingBites, 1);
assert.equal(sequence.consumeBite(), 1);
assert.equal(sequence.advance(settings.biteInterval).pendingBites, 1);
assert.equal(sequence.consumeBite(), 2);
assert.equal(sequence.snapshot().complete, false, 'the player remains pinned through the release animation');
assert.equal(sequence.advance(settings.stunDuration).complete, true);
assert.equal(sequence.consumeBite(), null);

const falling = lionMaulAnimationState(LION_MAUL_ANIMATION_DEFAULTS.playerFallDuration, settings);
assert.ok(falling.fall > .99, 'player reaches the demo knockdown pose');
assert.ok(falling.hold > .8, 'lion remains settled while the player is down');
const firstBite = lionMaulAnimationState(settings.firstBiteDelay, settings);
assert.ok(firstBite.snap > .99, 'first damage beat aligns with the demo bite snap');
assert.equal(firstBite.nearestBite, 0);
const betweenBites = lionMaulAnimationState(settings.firstBiteDelay + settings.biteInterval * .5, settings);
assert.ok(betweenBites.snap < .05, 'bites remain visually separated');
const releasing = lionMaulAnimationState(settings.stunDuration - .1, settings);
assert.ok(releasing.release > 0 && releasing.release < 1, 'the exact demo release eases out before completion');

console.log('lion maul tests passed');
