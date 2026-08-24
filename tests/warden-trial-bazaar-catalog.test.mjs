import assert from 'node:assert/strict';
import { WIZARD_ARCANA_CATALOG } from '../src/wizard-arcana-catalog.js';
import {
  WARDEN_TRIAL_BAZAAR_ARCANA_ITEMS,
  WARDEN_TRIAL_BAZAAR_FALLBACK_PENDING_SECONDS,
  WARDEN_TRIAL_BAZAAR_ITEMS,
  WARDEN_TRIAL_BAZAAR_TACTICS,
  wardenTrialBazaarItemForArcana,
  wardenTrialBazaarPendingCooldownSeconds,
  wardenTrialBazaarTacticById,
} from '../src/warden-trial-bazaar-catalog.js';

assert.equal(WARDEN_TRIAL_BAZAAR_FALLBACK_PENDING_SECONDS, 5);
assert.equal(WARDEN_TRIAL_BAZAAR_ARCANA_ITEMS.length, 70, 'all 70 mapped Arcana have a Bazaar source item');
assert.equal(WARDEN_TRIAL_BAZAAR_TACTICS.length, 43, 'all 43 non-direct Bazaar Tactics are registered');
assert.equal(WARDEN_TRIAL_BAZAAR_ITEMS.length, 113);
assert.equal(new Set(WARDEN_TRIAL_BAZAAR_ITEMS.map(item => item.id)).size, 113, 'Bazaar item IDs are unique');
assert.equal(new Set(WARDEN_TRIAL_BAZAAR_ARCANA_ITEMS.map(item => item.arcanaId)).size, 70, 'Arcana mappings are one-to-one');
assert.equal(new Set(WARDEN_TRIAL_BAZAAR_TACTICS.map(item => item.tacticId)).size, 43, 'Tactic IDs are unique');
assert.ok(WARDEN_TRIAL_BAZAAR_TACTICS.every(item => item.rules.length > 0), 'every Tactic retains its pinned base behavior');
assert.deepEqual(WARDEN_TRIAL_BAZAAR_ARCANA_ITEMS.map(item => item.mappingIndex),
  Array.from({length:70},(_,index)=>index+1));
for (const item of WARDEN_TRIAL_BAZAAR_ITEMS) {
  assert.equal(
    item.pendingCooldownSeconds,
    item.cooldownSeconds ?? WARDEN_TRIAL_BAZAAR_FALLBACK_PENDING_SECONDS,
    `${item.name} keeps raw and effective timing separate`,
  );
}

for (const arcana of WIZARD_ARCANA_CATALOG) {
  const item = wardenTrialBazaarItemForArcana(arcana.arcanaId);
  assert.ok(item, `${arcana.name} resolves to a Bazaar source item`);
  assert.equal(item.family, 'arcana');
  assert.ok(item.pendingCooldownSeconds > 0);
  assert.ok(Object.isFrozen(item));
  assert.ok(Object.isFrozen(item.output));
}

const cauterizingBlade = wardenTrialBazaarItemForArcana('FLAME-STRIKE');
assert.equal(cauterizingBlade.name, 'Cauterizing Blade');
assert.equal(cauterizingBlade.cooldownSeconds, 5);
assert.deepEqual(
  { damage:cauterizingBlade.output.damage, burn:cauterizingBlade.output.burn },
  { damage:20, burn:6 },
);

const boulder = wardenTrialBazaarItemForArcana('KNOCKOUT-BOULDER');
assert.equal(boulder.name, 'The Boulder');
assert.equal(boulder.cooldownSeconds, 22, 'the starting-tier Boulder value remains 22 seconds');
assert.equal(boulder.output.healthDamagePercent, 100);

const dartLauncher = wardenTrialBazaarItemForArcana('PERFORATING-JET');
assert.equal(dartLauncher.output.poison, 3);
assert.equal(dartLauncher.output.ammo, 3);
const doubleBarrel = wardenTrialBazaarItemForArcana('AQUA-ARC');
assert.equal(doubleBarrel.output.damage, 20);
assert.equal(doubleBarrel.output.multicast, 2);

const ambergris = wardenTrialBazaarTacticById('AMBERGRIS');
assert.equal(ambergris.cooldownSeconds, 4);
assert.equal(ambergris.pendingCooldownSeconds, 4);
assert.equal(ambergris.family, 'tactic');

const cannonball = wardenTrialBazaarTacticById('CANNONBALL');
assert.equal(cannonball.cooldownSeconds, null, 'passive source cooldown stays raw null, never zero');
assert.equal(wardenTrialBazaarPendingCooldownSeconds(cannonball), 5);

const passiveArcana = WARDEN_TRIAL_BAZAAR_ARCANA_ITEMS.filter(item => item.cooldownSeconds === null);
const passiveTactics = WARDEN_TRIAL_BAZAAR_TACTICS.filter(item => item.cooldownSeconds === null);
assert.equal(passiveArcana.length, 3);
assert.equal(passiveTactics.length, 13);
for (const item of [...passiveArcana, ...passiveTactics]) {
  assert.equal(item.pendingCooldownSeconds, 5);
  assert.equal(wardenTrialBazaarPendingCooldownSeconds(item), 5);
}

console.log('Warden Trial Bazaar catalog: ok');
