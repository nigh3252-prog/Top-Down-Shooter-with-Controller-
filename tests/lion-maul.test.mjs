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
assert.equal(clamped.firstBiteDelay, .2, 'zero delay falls back to the balanced preset');
assert.ok(clamped.stunDuration >= clamped.firstBiteDelay + 5 * clamped.biteInterval);
assert.equal(clamped.recovery, 2.5);

const sequence = createLionMaulSequence(lionMaulPreset('triple'));
assert.equal(sequence.advance(.19).pendingBites, 0);
assert.equal(sequence.advance(.02).pendingBites, 1);
assert.equal(sequence.consumeBite(), 0);
assert.equal(sequence.advance(.27).pendingBites, 1);
assert.equal(sequence.consumeBite(), 1);
assert.equal(sequence.advance(.28).pendingBites, 1);
assert.equal(sequence.consumeBite(), 2);
assert.equal(sequence.snapshot().complete, false, 'the player remains pinned until the full stun duration ends');
assert.equal(sequence.advance(.5).complete, true);
assert.equal(sequence.consumeBite(), null);

console.log('lion maul tests passed');
