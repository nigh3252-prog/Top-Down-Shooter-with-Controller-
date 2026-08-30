import assert from 'node:assert/strict';
import { createStanceDeck } from '../src/stance-deck.js';
import {
  WARDEN_ARCANA_DAMAGE_MULTIPLIERS,
  WARDEN_BLOOD_SLASH_GRANT,
  WARDEN_FRAGILE_MULTIPLIER,
  WARDEN_LINK_DURATION_SECONDS,
  WARDEN_BURN_CARD_KIND,
  WARDEN_JET_CARD_KIND,
  createWardenArcanaEngine,
  installWardenArcanaDamageRuntime,
  isWardenGeneratedCard,
  wardenArcanaIdFromDamageOptions,
} from '../src/warden-arcana-engine.js';

const stance = (id, arcanaId) => ({
  id,
  name: id,
  type: 'stance',
  __wardenTrialArcanaId: arcanaId,
});

function makeDeck(cards = []) {
  const deck = createStanceDeck({ rng: () => 0, handSize: 1, compatibilityAdapter: null });
  deck.beginRun(cards);
  return deck;
}

function cast(engine, card, arcanaId, enemies = []) {
  const transaction = engine.beginCast({ card, arcanaId });
  assert.ok(transaction, `the ${arcanaId} cast should start`);
  for (const enemy of enemies) engine.recordArcanaHit(arcanaId, enemy);
  return engine.commitCast(transaction);
}

assert.equal(wardenArcanaIdFromDamageOptions({ aquaBeam:true }), 'AQUA-BEAM');
assert.equal(wardenArcanaIdFromDamageOptions({ cycloneBoomerang:true }), 'CYCLONE-BOOMERANG');
assert.equal(wardenArcanaIdFromDamageOptions({ sourceArcana:'storm-draft' }), 'STORM-DRAFT');

// Shared Flow rules and the Water package.
{
  const engine = createWardenArcanaEngine();
  const ripTide = {};
  assert.equal(cast(engine, ripTide, 'RIP-TIDE').flow, 2, 'Rip Tide generates two Flow with none banked');
  engine.state.flow = 3;
  assert.equal(cast(engine, ripTide, 'RIP-TIDE').flow, 4, 'a Flow cast spends one, then adds Rip Tide\'s two');

  const waveDeck = makeDeck([stance('WAVE', 'WAVE-FRONT'), stance('FILLER', 'WATER-PRISON')]);
  const waveCard = waveDeck.hand[0];
  const waveEngine = createWardenArcanaEngine({ deck: waveDeck });
  const enemyA = { hp: 100 };
  const enemyB = { hp: 100 };
  const wave = cast(waveEngine, waveCard, 'WAVE-FRONT', [enemyA, enemyA, enemyB]);
  assert.equal(wave.flow, 2, 'Wave Front gives one Flow per distinct enemy hit');
  assert.equal(wave.destination, 'discard');
  waveEngine.state.flow = 1;
  const waveWithFlow = cast(waveEngine, waveCard, 'WAVE-FRONT', [enemyA]);
  assert.equal(waveWithFlow.flow, 1, 'Wave Front spends existing Flow before generating its hit Flow');
  assert.equal(waveWithFlow.destination, 'draw-bottom', 'Wave Front with Flow is recycled to the draw pile');
  waveDeck.resolveSlot(0, { destination: waveWithFlow.destination });
  assert.equal(waveDeck.cardsInZone('draw').at(-1), waveCard, 'draw-bottom places Wave Front behind the existing draw pile');

  const bubbleEngine = createWardenArcanaEngine();
  bubbleEngine.state.flow = 4;
  const bubble = cast(bubbleEngine, {}, 'BUBBLE-BARRAGE');
  assert.equal(bubble.bubbleCount, 16, 'Bubble Barrage starts at four bubbles and adds three per Flow');
  assert.equal(bubble.flow, 0, 'Bubble Barrage consumes all Flow');
  const emptyBubble = cast(bubbleEngine, {}, 'BUBBLE-BARRAGE');
  assert.equal(emptyBubble.bubbleCount, 4, 'Bubble Barrage falls back to four bubbles without Flow');

  const vortexEngine = createWardenArcanaEngine();
  vortexEngine.state.flow = 1;
  const vortex = cast(vortexEngine, {}, 'AQUA-VORTEX');
  assert.equal(vortex.sizeMultiplier, 2, 'Aqua Vortex doubles in size when cast with Flow');
  assert.equal(vortex.flow, 1, 'Aqua Vortex spends and then restores one Flow');

  const beam = {};
  const beamEngine = createWardenArcanaEngine();
  beamEngine.state.flow = 1;
  assert.deepEqual(
    cast(beamEngine, beam, 'AQUA-BEAM'),
    { arcanaId: 'AQUA-BEAM', destination: 'keep', preFlow: 1, flow: 0, jetBeat: 0, bubbleCount: 0, sizeMultiplier: 1, aquaBeamUses: 0 },
    'Aqua Beam preserves a use when cast with Flow',
  );
  const beamSecond = cast(beamEngine, beam, 'AQUA-BEAM');
  assert.equal(beamSecond.aquaBeamUses, 1);
  assert.equal(beamSecond.destination, 'keep');
  const beamThird = cast(beamEngine, beam, 'AQUA-BEAM');
  assert.equal(beamThird.aquaBeamUses, 2, 'Aqua Beam exhausts after two non-Flow uses');
  assert.equal(beamThird.destination, 'exhaust');
}

// Fire Burn cards, live-deck scaling, self-Burn accounting, and static multipliers.
{
  const deck = makeDeck([stance('FLAME-CROSS', 'FLAME-CROSS'), stance('FILLER', 'WATER-PRISON')]);
  const engine = createWardenArcanaEngine({ deck });
  const flameCross = deck.hand[0];
  const cross = cast(engine, flameCross, 'FLAME-CROSS');
  assert.equal(cross.destination, 'discard');
  assert.equal(deck.cardsInZone('draw').at(-1).__wardenGeneratedKind, WARDEN_BURN_CARD_KIND,
    'Flame Cross puts Burn at the bottom of the draw pile');

  const homingDeck = makeDeck([stance('HOMING-FLARES', 'HOMING-FLARES'), stance('FILLER', 'WATER-PRISON')]);
  const homingEngine = createWardenArcanaEngine({ deck: homingDeck });
  const homing = cast(homingEngine, homingDeck.hand[0], 'HOMING-FLARES');
  assert.equal(homingDeck.cardsInZone('draw')[0].__wardenGeneratedKind, WARDEN_BURN_CARD_KIND,
    'Homing Flares puts Burn on top of the draw pile');

  const bouncingDeck = makeDeck([stance('BOUNCING-BLAZE', 'BOUNCING-BLAZE')]);
  const bouncingEngine = createWardenArcanaEngine({ deck: bouncingDeck });
  cast(bouncingEngine, bouncingDeck.hand[0], 'BOUNCING-BLAZE');
  assert.equal(bouncingDeck.cardsInZone('discard').filter(card => isWardenGeneratedCard(card, WARDEN_BURN_CARD_KIND)).length, 1,
    'Bouncing Blaze puts its Burn in discard');

  const initialBurn = deck.cardsInZone('draw').at(-1);
  const burn1 = engine.addGenerated(WARDEN_BURN_CARD_KIND, 'discard');
  const burn2 = engine.addGenerated(WARDEN_BURN_CARD_KIND, 'discard');
  assert.equal(engine.snapshot().burns, 3, 'live Burn scaling counts every surviving Burn in the pool');
  assert.equal(engine.prepareDamage({}, 100, { arcanaId: 'FLAME-STRIKE' }).amount, 160,
    'Flame Strike gains twenty percent per live Burn');
  assert.equal(engine.prepareDamage({}, 100, { arcanaId: 'FLAME-BREATH' }).amount, 160,
    'Flame Breath gains twenty percent per live Burn');
  const firstConsumed = engine.consumeBurn();
  assert.ok([initialBurn, burn1, burn2].includes(firstConsumed), 'Burn consumers remove a live Burn from every deck zone');
  assert.equal(engine.snapshot().burns, 2);
  assert.notEqual(engine.consumeBurn(), null);

  const damagePlayerCalls = [];
  const selfBurnEngine = createWardenArcanaEngine({ damagePlayer: (...args) => damagePlayerCalls.push(args) });
  const selfBurnDeck = makeDeck([]);
  const selfBurn = selfBurnEngine.addGenerated(WARDEN_BURN_CARD_KIND, 'discard');
  const down = selfBurnEngine.planDown(selfBurn);
  assert.deepEqual(down, { kind: 'self-burn', destination: 'exhaust', applyStance: false, cooldown: 0 });
  assert.equal(selfBurnEngine.commitDown(down), true);
  assert.equal(selfBurnEngine.snapshot().selfBurns, 1);
  assert.equal(damagePlayerCalls.length, 1);
  assert.equal(damagePlayerCalls[0][0], 10, 'Burn Down deals ten self-damage');

  assert.equal(selfBurnEngine.prepareDamage({}, 100, { arcanaId: 'DRAGON-ARC' }).amount, 120,
    'Dragon Arc gains twenty damage per self-Burn this battle');
  assert.equal(selfBurnEngine.prepareDamage({}, 50, { arcanaId: 'RAPID-FIRE-AGENT' }).amount, 70,
    'Rapid Fire Agent gains twenty damage per self-Burn');
  selfBurnEngine.reset();
  assert.equal(selfBurnEngine.prepareDamage({}, 100, { arcanaId: 'DRAGON-ARC' }).amount, 100,
    'self-Burn count resets between battles');

  for (const [arcanaId, multiplier] of Object.entries({
    'FLAME-CROSS': 3,
    'BOUNCING-BLAZE': 1.5,
    'AQUA-BEAM': 3,
    'WHIRLING-TORNADO': 2,
    'DRAGON-BLAST': 3,
    'PERFORATING-JET': .5,
  })) {
    assert.equal(WARDEN_ARCANA_DAMAGE_MULTIPLIERS[arcanaId], multiplier, `${arcanaId} has its agreed static multiplier`);
    assert.equal(selfBurnEngine.prepareDamage({}, 100, { arcanaId }).amount, 100 * multiplier);
  }
}

// Earth Fragile: consume on a landed hit and restore on a miss.
{
  const engine = createWardenArcanaEngine();
  const enemy = { hp: 100 };
  assert.equal(engine.recordArcanaHit('STONE-SHOT', enemy), true);
  const prepared = engine.prepareDamage(enemy, 100, { arcanaId: 'WATER-PRISON' });
  assert.equal(prepared.amount, 100 * WARDEN_FRAGILE_MULTIPLIER);
  assert.equal(engine.snapshot().fragile, 0, 'Fragile is reserved by the next damage attempt');
  engine.finishDamage(prepared, { landed: true });
  assert.equal(engine.snapshot().fragile, 0, 'a landed hit consumes Fragile');

  engine.recordArcanaHit('STONE-SHOT', enemy);
  const missed = engine.prepareDamage(enemy, 100, { arcanaId: 'WATER-PRISON' });
  engine.finishDamage(missed, { landed: false });
  assert.equal(engine.snapshot().fragile, 1, 'a failed hit rolls Fragile back');
}

// Link lasts five seconds, refreshes, and shares through the damage runtime without recursion.
{
  const enemyA = { hp: 100 };
  const enemyB = { hp: 100 };
  const enemyC = { hp: 100 };
  const system = {
    enemies: [enemyA, enemyB, enemyC],
    damageEnemy(enemy, amount) {
      enemy.hp = Math.max(0, enemy.hp - amount);
      return amount;
    },
  };
  const engine = createWardenArcanaEngine();
  const runtime = installWardenArcanaDamageRuntime({ engine, getEnemySystem: () => system });
  runtime.update();
  engine.recordArcanaHit('CHAOS-CRUSHER', enemyA);
  engine.recordArcanaHit('CHAOS-CRUSHER', enemyB);
  engine.recordArcanaHit('CHAOS-CRUSHER', enemyC);
  assert.equal(enemyA.wardenLinkRemaining, WARDEN_LINK_DURATION_SECONDS);
  engine.update(4);
  assert.equal(enemyA.wardenLinkRemaining, 1);
  engine.recordArcanaHit('CHAOS-CRUSHER', enemyA);
  assert.equal(enemyA.wardenLinkRemaining, WARDEN_LINK_DURATION_SECONDS, 'reapplying Link refreshes its five-second timer');
  system.damageEnemy(enemyA, 10, { x: 0, z: 0 }, { arcanaId: 'CHAOS-CRUSHER' });
  assert.equal(enemyA.hp, 90);
  assert.equal(enemyB.hp, 90);
  assert.equal(enemyC.hp, 90);
  assert.equal(engine.snapshot().linked, 3, 'linked sharing does not recursively multiply the original hit');
  engine.update(5.1);
  assert.equal(engine.snapshot().linked, 0);
  runtime.dispose();
}

// Distinct-hit Haste affects every other owned card, stacks, and drains cooldown at 2x.
{
  const source = stance('AIR-BURST', 'AIR-BURST');
  const target = stance('TARGET', 'WATER-PRISON');
  const third = stance('THIRD', 'EARTH-KNUCKLES');
  const deck = makeDeck([source, target, third]);
  const engine = createWardenArcanaEngine({ deck });
  const firstEnemy = { hp: 100 };
  const secondEnemy = { hp: 100 };
  cast(engine, source, 'AIR-BURST', [firstEnemy, firstEnemy, secondEnemy]);
  assert.equal(engine.hasteForCard(source), 0, 'the source card never grants Haste to itself');
  assert.equal(engine.hasteForCard(target), 2, 'Haste stacks once per distinct enemy hit');
  assert.equal(engine.hasteForCard(third), 2);
  assert.equal(engine.cooldownElapsed(target, 1), 2, 'one second of stored Haste drains one extra second');
  assert.equal(engine.hasteForCard(target), 1);
}

// Odd distinct hits generate Jets; the generated Jet cycles through two projectile beats and Blurring Falconry.
{
  const source = stance('SHEARING', 'SHEARING-CHAIN');
  const deck = makeDeck([source]);
  const engine = createWardenArcanaEngine({ deck });
  const enemies = [{ hp: 1 }, { hp: 1 }, { hp: 1 }, { hp: 1 }];
  cast(engine, source, 'SHEARING-CHAIN', enemies);
  const jets = deck.cardsInZone('discard').filter(card => isWardenGeneratedCard(card, WARDEN_JET_CARD_KIND));
  assert.equal(jets.length, 2, 'Shearing Chain generates one Jet at the first and third distinct hits');

  const jet = jets[0];
  const first = cast(engine, jet, 'PERFORATING-JET');
  const second = cast(engine, jet, 'PERFORATING-JET');
  const third = cast(engine, jet, 'PERFORATING-JET');
  assert.equal(first.arcanaId, 'PERFORATING-JET');
  assert.equal(first.jetBeat, 1);
  assert.equal(second.jetBeat, 2);
  assert.equal(third.arcanaId, 'BLURRING-FALCONRY');
  assert.equal(third.jetBeat, 3);
  assert.equal(third.destination, 'exhaust');
  const nextJet = engine.beginCast({ card:jet, arcanaId:'PERFORATING-JET' });
  assert.equal(engine.decorateArcanaCard({ arcanaId:nextJet.arcanaId }, nextJet).__wardenEngineGeneratedJet, true);
  engine.abortCast(nextJet);
}

// Shock Line is uncapped and all Blood/Bing Bong Down grants are additive and stance-free.
{
  let bloodCharges = 0;
  let bingBongCount = 0;
  const engine = createWardenArcanaEngine({
    addBloodSlashCharges: amount => (bloodCharges += amount),
    enterBingBong: () => { bingBongCount += 1; return true; },
  });
  const enemies = [{}, {}, {}, {}, {}];
  cast(engine, {}, 'SHOCK-LINE', enemies);
  assert.equal(bloodCharges, 5, 'Shock Line adds one Blood Slash charge per distinct hit with no cap');
  assert.equal(engine.planDown({ __wardenTrialArcanaId: 'VOLT-DISC' }).kind, 'blood-slash');
  engine.commitDown(engine.planDown({ __wardenTrialArcanaId: 'VOLT-DISC' }));
  assert.equal(bloodCharges, WARDEN_BLOOD_SLASH_GRANT + 5, 'Blood Slash Down grants three additive charges');
  engine.commitDown(engine.planDown({ __wardenTrialArcanaId: 'KNOCKOUT-BOULDER' }));
  assert.equal(bingBongCount, 1);
}

// Generated cards and cooldown plans use the authoritative deck zones.
{
  const source = stance('SOURCE', 'WATER-PRISON');
  const filler = stance('FILLER', 'WATER-PRISON');
  const deck = makeDeck([source, filler]);
  const engine = createWardenArcanaEngine({ deck });
  const topBurn = engine.addGenerated(WARDEN_BURN_CARD_KIND, 'draw-top');
  const bottomJet = engine.addGenerated(WARDEN_JET_CARD_KIND, 'draw-bottom');
  assert.equal(deck.cardsInZone('draw')[0], topBurn);
  assert.equal(deck.cardsInZone('draw').at(-1), bottomJet);
  assert.equal(engine.cooldownSeconds(topBurn, 'up'), 2, 'Burn Up waits two seconds');
  assert.equal(engine.cooldownSeconds(topBurn, 'down'), 0, 'Burn Down is instant');
  assert.equal(engine.cooldownSeconds(bottomJet, 'up'), 0, 'Jet Up is instant');
  assert.equal(engine.cooldownSeconds(bottomJet, 'down'), 0, 'Jet Down is instant');
  assert.equal(engine.cooldownSeconds({ __wardenTrialArcanaId: 'DRAGON-BLAST' }, 'up'), 9,
    'Dragon Blast has triple the standard three-second cooldown');

  const jetPlan = engine.planDown(bottomJet);
  assert.deepEqual(jetPlan, { kind: 'jet-return', destination: 'draw-bottom', applyStance: false, cooldown: 0 });
  const removed = engine.consumeBurn();
  assert.equal(removed, topBurn);
  assert.equal(deck.pool.includes(topBurn), false, 'consuming Burn removes it from the live deck pool');

  const burnDownDeck = makeDeck([]);
  const burnDownEngine = createWardenArcanaEngine({
    deck: burnDownDeck,
    damagePlayer: () => {},
  });
  const burnInHand = burnDownEngine.addGenerated(WARDEN_BURN_CARD_KIND, 'discard');
  burnDownDeck.beginRun([burnInHand]);
  const burnDown = burnDownEngine.planDown(burnInHand);
  burnDownEngine.commitDown(burnDown);
  burnDownDeck.resolveSlot(0, { destination: burnDown.destination });
  assert.equal(burnDownDeck.pool.includes(burnInHand), false, 'Burn Down exhausts and removes the generated card');

  const jetUpDeck = makeDeck([]);
  const jetUpEngine = createWardenArcanaEngine({ deck: jetUpDeck });
  const jetInHand = jetUpEngine.addGenerated(WARDEN_JET_CARD_KIND, 'discard');
  jetUpDeck.beginRun([jetInHand]);
  const jetUp = cast(jetUpEngine, jetInHand, 'PERFORATING-JET');
  jetUpDeck.resolveSlot(0, { destination: jetUp.destination });
  assert.equal(jetUpDeck.pool.includes(jetInHand), false, 'Jet Up exhausts and removes the generated card');

  const handDeck = makeDeck([stance('HAND', 'WATER-PRISON'), filler]);
  const handCard = handDeck.hand[0];
  const zoneAdded = { id: 'ZONE-ADDED', type: 'stance' };
  handDeck.addCard(zoneAdded, { destination: 'draw-top' });
  assert.equal(handDeck.cardsInZone('draw')[0], zoneAdded);
  assert.equal(handDeck.cardsInZone('pool').includes(zoneAdded), true);
  assert.equal(handDeck.removeFirst(card => card === zoneAdded), zoneAdded);
  assert.equal(handDeck.cardsInZone('draw').includes(zoneAdded), false);
  assert.equal(handDeck.resolveSlot(0, { destination: 'exhaust' }), handCard);
  assert.equal(handDeck.pool.includes(handCard), false, 'resolveSlot exhausts and removes the card from the pool');
}

console.log('Warden Arcana engine tests passed');
