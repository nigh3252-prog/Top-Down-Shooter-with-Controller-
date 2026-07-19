import assert from 'node:assert/strict';
import {
  LION_MAUL_PRESETS,
  createLionMaulSequence,
  lionMaulPreset,
  normalizeLionMaulSettings,
} from '../src/lion-maul.js';

assert.deepEqual(Object.keys(LION_MAUL_PRESETS), ['quick', 'triple', 'apex']);
assert.equal(lionMaulPreset('quick').biteCount, 2);
assert.equal(lionMaulPreset('triple').biteCount, 3);
assert.equal(lionMaulPreset('apex').biteCount, 4);
assert.ok(lionMaulPreset('triple').biteInterval > .4, 'balanced bites should have a readable pause between snaps');

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
assert.equal(clamped.firstBiteDelay, .24, 'zero delay falls back to the balanced preset');
assert.ok(clamped.stunDuration >= clamped.firstBiteDelay + 5 * clamped.biteInterval);
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
assert.equal(sequence.snapshot().complete, false, 'the player remains pinned until the full stun duration ends');
assert.equal(sequence.advance(settings.stunDuration).complete, true);
assert.equal(sequence.consumeBite(), null);

console.log('lion maul tests passed');
