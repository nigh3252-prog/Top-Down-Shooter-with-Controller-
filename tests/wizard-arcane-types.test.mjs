import assert from 'node:assert/strict';
import {
  AQUA_BEAM_SPEC,
  ARCANE_INTERVENTION_SPEC,
  BALL_LIGHTNING_SPEC,
  CYCLONE_BOOMERANG_SPEC,
  EARTHEN_AEGIS_SPEC,
  WIZARD_ARCANE_TYPE_CONTRACTS,
  WIZARD_ARCANE_TYPE_IDS,
  WIZARD_ARCANE_TYPES_SOURCE_WINDOWS,
  wizardArcaneTypeSpec,
} from '../src/wizard-arcane-types-data.js';
import { WIZARD_ARCHETYPE_SAMPLER_CARDS } from '../src/wizard-archetype-sampler-cards.js';
import { createStanceDeck, normalizeManualSequence } from '../src/stance-deck.js';
import {
  WIZARD_ARCANE_TYPES_SEMANTIC_EVENT,
  clampArcaneAimDirection,
  installWizardArcaneTypesRuntime,
  isLargeArcaneEnemy,
  normalizeWizardArcaneTypesRenderMode,
  resolveArcaneRodDestination,
} from '../src/wizard-arcane-types-runtime.js';

class Transform {
  constructor() { this.x = 0; this.y = 0; this.z = 0; }
  set(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; return this; }
  setScalar(value) { return this.set(value, value, value); }
}

class Object3D {
  constructor() {
    this.children = [];
    this.position = new Transform();
    this.rotation = new Transform();
    this.scale = new Transform().set(1, 1, 1);
    this.userData = {};
    this.parent = null;
    this.visible = true;
    this.name = '';
  }
  add(...children) { for (const child of children) { child.parent = this; this.children.push(child); } return this; }
  remove(child) { const index = this.children.indexOf(child); if (index >= 0) this.children.splice(index, 1); child.parent = null; }
  traverse(visitor) { visitor(this); for (const child of this.children) child.traverse?.(visitor); }
}

class Group extends Object3D {}
class Geometry { dispose() { this.disposed = true; } }
class Material { constructor(options = {}) { Object.assign(this, options); } dispose() { this.disposed = true; } }
class Mesh extends Object3D { constructor(geometry = new Geometry(), material = new Material()) { super(); this.geometry = geometry; this.material = material; } }

const THREE = {
  Group, Mesh,
  SphereGeometry: Geometry, TorusGeometry: Geometry, BoxGeometry: Geometry,
  DodecahedronGeometry: Geometry, RingGeometry: Geometry, IcosahedronGeometry: Geometry,
  CylinderGeometry: Geometry, ConeGeometry: Geometry,
  MeshBasicMaterial: Material,
  AdditiveBlending: 'add', NormalBlending: 'normal', DoubleSide: 'double',
};

class EventTargetMock {
  constructor() { this.listeners = new Map(); this.semantic = []; this.mode = 'style'; }
  addEventListener(type, listener) { const values = this.listeners.get(type) || []; values.push(listener); this.listeners.set(type, values); }
  removeEventListener(type, listener) { this.listeners.set(type, (this.listeners.get(type) || []).filter(value => value !== listener)); }
  dispatchEvent(event) { if (event.type === WIZARD_ARCANE_TYPES_SEMANTIC_EVENT) this.semantic.push(event.detail); for (const listener of this.listeners.get(event.type) || []) listener(event); return true; }
}

globalThis.CustomEvent = class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
globalThis.location = {search: '?enemyLab=1&capture=1&stage=style', pathname: '/combat-arena.html'};
globalThis.localStorage = {getItem: () => null, setItem: () => {}};

assert.deepEqual(WIZARD_ARCANE_TYPE_IDS, [
  'CYCLONE-BOOMERANG', 'EARTHEN-AEGIS', 'BALL-LIGHTNING', 'AQUA-BEAM', 'ARCANE-INTERVENTION',
]);
assert.equal(WIZARD_ARCANE_TYPE_CONTRACTS.length, 5);
assert.ok(WIZARD_ARCANE_TYPE_CONTRACTS.every(contract => contract.baseOnly && !contract.enhancedEnabled && !contract.chargedSignatureEnabled));
assert.deepEqual(WIZARD_ARCANE_TYPES_SOURCE_WINDOWS['AQUA-BEAM'], {start: '18:40.70', end: '18:42.75'});
assert.equal(wizardArcaneTypeSpec('WOL-BALL-LIGHTNING'), BALL_LIGHTNING_SPEC);
const arcaneTypeCards=WIZARD_ARCHETYPE_SAMPLER_CARDS.filter(card=>WIZARD_ARCANE_TYPE_IDS.includes(card.arcanaId));
const arcaneTypeCardsById=new Map(arcaneTypeCards.map(card=>[card.arcanaId,card]));
assert.equal(arcaneTypeCards.length, 5);
assert.equal(arcaneTypeCardsById.size, 5);
assert.ok(arcaneTypeCards.every(card => card.id === `WOL-${card.arcanaId}` && card.baseFormOnly && !card.enhancedVariantEnabled && !card.chargedVariantEnabled));
const interventionCard=arcaneTypeCardsById.get('ARCANE-INTERVENTION');
assert.deepEqual(normalizeManualSequence(interventionCard), {presses: 2, timeout: 2.1, label: 'RIFT'}, 'normal deck input must retain Arcane Intervention through its full two-second activation window');

assert.deepEqual({damage: CYCLONE_BOOMERANG_SPEC.outboundDamage, returnDamage: CYCLONE_BOOMERANG_SPEC.returnDamage, cooldown: CYCLONE_BOOMERANG_SPEC.cooldown}, {damage: 15, returnDamage: 15, cooldown: 3.5});
assert.deepEqual({count: EARTHEN_AEGIS_SPEC.shieldCount, duration: EARTHEN_AEGIS_SPEC.duration, damage: EARTHEN_AEGIS_SPEC.damage, knockback: EARTHEN_AEGIS_SPEC.sourceKnockback, cooldown: EARTHEN_AEGIS_SPEC.cooldown}, {count: 8, duration: 4.5, damage: 5, knockback: 10, cooldown: 8});
assert.deepEqual({damage: BALL_LIGHTNING_SPEC.damage, minHits: BALL_LIGHTNING_SPEC.minHits, maxHits: BALL_LIGHTNING_SPEC.maxHits, cooldown: BALL_LIGHTNING_SPEC.cooldown}, {damage: 12, minHits: 5, maxHits: 10, cooldown: 5.5});
assert.deepEqual({interval: AQUA_BEAM_SPEC.chargeInterval, min: AQUA_BEAM_SPEC.minCharges, max: AQUA_BEAM_SPEC.maxCharges, damage: AQUA_BEAM_SPEC.tickDamage}, {interval: .75, min: 3, max: 10, damage: 10});
assert.deepEqual({cooldown: ARCANE_INTERVENTION_SPEC.cooldown, arrival: ARCANE_INTERVENTION_SPEC.arrivalDamage, storm: ARCANE_INTERVENTION_SPEC.stormTickDamage, ticks: ARCANE_INTERVENTION_SPEC.stormTickTimes.length}, {cooldown: 4.25, arrival: 25, storm: 5, ticks: 5});

assert.equal(normalizeWizardArcaneTypesRenderMode('motion'), 'contract');
assert.equal(normalizeWizardArcaneTypesRenderMode('proxy'), 'contract');
assert.equal(normalizeWizardArcaneTypesRenderMode('reference'), 'source');
assert.equal(normalizeWizardArcaneTypesRenderMode('style'), 'style');
const clampedAim = clampArcaneAimDirection({x: 0, z: 1}, {x: 1, z: 0}, Math.PI / 5);
assert.ok(Math.abs(Math.acos(clampedAim.z) - Math.PI / 5) < 1e-9);
assert.ok(clampedAim.x > 0 && clampedAim.z > 0);
assert.equal(isLargeArcaneEnemy({radius: 1.2}), true);
assert.equal(isLargeArcaneEnemy({radius: .5}), false);

const destination = resolveArcaneRodDestination({
  origin: {x: 0, z: 0}, direction: {x: 0, z: 1}, distance: 8,
  walls: [{a: {x: -3, z: 4}, b: {x: 3, z: 4}}], clearance: .5,
});
assert.equal(destination.valid, true);
assert.equal(destination.blockedByWall, true);
assert.ok(destination.resolvedDistance < 4 && destination.position.z < 4);
const invalidDestination = resolveArcaneRodDestination({origin: {x: 0, z: 0}, direction: {x: 0, z: 1}, isNavigable: () => false});
assert.equal(invalidDestination.valid, false);

const eventTarget = new EventTargetMock();
eventTarget.__abilityCapture = {snapshot: () => ({stage: eventTarget.mode})};
const scene = new Group();
const player = {x: 0, z: 0, forwardX: 0, forwardZ: 1};
const hits = [], statuses = [];
const system = {
  enemies: [], hostileProjectiles: [], heightScale: 1,
  damageEnemy(enemy, amount, knock, options) { hits.push({enemy, amount, knock, options}); enemy.hp -= amount; return true; },
};
const walls = [];
const runtime = installWizardArcaneTypesRuntime({
  THREE, scene,
  getPlayer: () => player,
  getEnemySystem: () => system,
  getMazeSegments: () => walls,
  applyEnemyStatus(enemy, status, duration, options) { statuses.push({enemy, status, duration, options}); },
  eventTarget,
});
const cast = (id, detail = {}) => runtime.cast({id: `WOL-${id}`, arcanaId: id}, detail);
const step = (seconds, dt = .02) => { for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += dt) runtime.update(Math.min(dt, seconds - elapsed), elapsed); };

const cycloneTarget = {id: 'cyclone-target', x: 0, z: 3, hp: 1000, radius: .3};
system.enemies = [cycloneTarget];
assert.equal(cast('CYCLONE-BOOMERANG'), true);
assert.equal(runtime.canCast('CYCLONE-BOOMERANG'), false);
assert.equal(runtime.snapshot().effects[0].stableId, 'CYCLONE-BOOMERANG:0001');
step(2);
assert.deepEqual(hits.filter(hit => hit.options.cycloneBoomerang).map(hit => [hit.amount, hit.options.leg]), [[15, 'outbound'], [15, 'return']]);
assert.equal(runtime.snapshot().effects.some(effect => effect.type === 'cycloneBoomerang'), false);
step(1.5);
assert.equal(runtime.canCast('CYCLONE-BOOMERANG'), true);

runtime.reset(); hits.length = 0; system.enemies = [];
assert.equal(cast('CYCLONE-BOOMERANG'), true);
while (runtime.snapshot().effects[0]?.phase === 'outbound') runtime.update(.05, 0);
player.x = 3;
step(2);
const liveCatch = runtime.snapshot().semanticEvents.find(event => event.kind === 'cyclone-caught');
assert.ok(liveCatch);
assert.deepEqual(liveCatch.ownerPosition, {x: 3, z: 0});
runtime.reset(); player.x = 0;
assert.equal(cast('CYCLONE-BOOMERANG'), true);
assert.equal(runtime.snapshot().effects[0].stableId, 'CYCLONE-BOOMERANG:0001', 'reset restarts deterministic per-Arcana IDs');

runtime.reset(); hits.length = 0; system.enemies = []; walls.length = 0;
player.x = 0; player.z = 0; player.forwardX = 0; player.forwardZ = 1;
assert.equal(cast('CYCLONE-BOOMERANG'), true);
const cycloneLaunch = runtime.snapshot().semanticEvents.find(event => event.kind === 'cyclone-launched');
assert.equal(cycloneLaunch.targetRoundTrip, .8);
assert.ok(cycloneLaunch.travelSpeed > CYCLONE_BOOMERANG_SPEC.speed, 'the audited source cadence replaces the old slow travel calibration');
while (runtime.snapshot().effects.some(effect => effect.type === 'cycloneBoomerang')) runtime.update(1 / 120, 0);
const auditedCatch = runtime.snapshot().semanticEvents.find(event => event.kind === 'cyclone-caught');
assert.ok(auditedCatch.time >= .79 && auditedCatch.time <= .82, `base round trip should stay near the audited 0.8 s window, got ${auditedCatch.time}`);

runtime.reset(); hits.length = 0; walls.length = 0;
const cycloneBeforeWall = {id: 'cyclone-before-wall', x: 0, z: 1.4, hp: 1000, radius: .3};
const cycloneBehindWall = {id: 'cyclone-behind-wall', x: 0, z: 2.1, hp: 1000, radius: .3};
system.enemies = [cycloneBeforeWall, cycloneBehindWall];
walls.push({a: {x: -3, z: 2}, b: {x: 3, z: 2}});
assert.equal(cast('CYCLONE-BOOMERANG'), true);
step(.5, .01);
assert.ok(hits.some(hit => hit.enemy === cycloneBeforeWall && hit.options.leg === 'outbound'), 'the valid pre-wall sweep still resolves hits');
assert.equal(hits.filter(hit => hit.enemy === cycloneBehindWall).length, 0, 'the carrier radius must not reach through its clipped wall endpoint');
const wallTurn = runtime.snapshot().semanticEvents.find(event => event.kind === 'cyclone-turned' && event.reason === 'wall');
assert.ok(wallTurn && wallTurn.position.z <= 2 - CYCLONE_BOOMERANG_SPEC.radius + 1e-6, 'the visible carrier turns with its center clear of scenery');

runtime.reset(); hits.length = 0; walls.length = 0; system.enemies = [];
walls.push({a: {x: 1.5, z: 3}, b: {x: 1.5, z: 6}});
assert.equal(cast('CYCLONE-BOOMERANG'), true);
while (runtime.snapshot().effects[0]?.phase === 'outbound') runtime.update(1 / 120, 0);
const cycloneBehindReturnWall = {id: 'cyclone-behind-return-wall', x: 1.58, z: 4.02, hp: 1000, radius: .3};
system.enemies = [cycloneBehindReturnWall];
player.x = 3; player.z = 0;
step(1, 1 / 120);
assert.equal(hits.filter(hit => hit.enemy === cycloneBehindReturnWall && hit.options.leg === 'return').length, 0, 'the returning sweep must not damage through scenery');
const returnFizzle = runtime.snapshot().semanticEvents.find(event => event.kind === 'cyclone-fizzled');
assert.deepEqual({leg: returnFizzle?.leg, reason: returnFizzle?.reason, damage: returnFizzle?.damage}, {leg: 'return', reason: 'wall', damage: 0});
assert.equal(runtime.snapshot().effects.some(effect => effect.type === 'cycloneBoomerang'), false, 'a wall-blocked return cleans up instead of crossing the wall');
walls.length = 0; player.x = 0; player.z = 0;

runtime.reset(); hits.length = 0;
const aegisTarget = {id: 'aegis-target', x: EARTHEN_AEGIS_SPEC.orbitRadius, z: 0, hp: 1000, radius: .3};
const hostile = {id: 'hostile-bolt', x: EARTHEN_AEGIS_SPEC.orbitRadius, z: 0, radius: .12, life: 2, dead: false, mesh: {visible: true}};
system.enemies = [aegisTarget]; system.hostileProjectiles = [hostile];
assert.equal(cast('EARTHEN-AEGIS'), true);
runtime.update(.01, 0);
let aegis = runtime.snapshot().effects.find(effect => effect.type === 'earthenAegis');
assert.equal(aegis.shields.length, 8);
assert.deepEqual(aegis.shields.map(shield => shield.stableId), Array.from({length: 8}, (_, index) => `EARTHEN-AEGIS:0001:shield:${String(index + 1).padStart(2, '0')}`));
assert.equal(hits.filter(hit => hit.options.earthenAegis).length, 1);
assert.equal(hits.find(hit => hit.options.earthenAegis).amount, 5);
assert.equal(hostile.dead, true);
assert.equal(aegis.shields.length, 8, 'projectile interception must not consume an Aegis shield');
step(4.5);
assert.equal(runtime.snapshot().effects.some(effect => effect.type === 'earthenAegis'), false);
assert.equal(runtime.canCast('EARTHEN-AEGIS'), false, '8 second cooldown outlives the 4.5 second shield ring');
step(3.5);
assert.equal(runtime.canCast('EARTHEN-AEGIS'), true);

runtime.reset(); hits.length = 0; statuses.length = 0; system.hostileProjectiles = [];
const ballTarget = {id: 'ball-target', x: 0, z: 2.5, hp: 2000, radius: .3};
system.enemies = [ballTarget];
assert.equal(runtime.beginBallLightning({slot: 0}), true);
assert.equal(runtime.snapshot().ballLightningCharge.vulnerable, true);
runtime.update(BALL_LIGHTNING_SPEC.fullChargeDuration, 0);
assert.equal(runtime.snapshot().ballLightningCharge.projectedHits, 10);
assert.equal(runtime.releaseBallLightning({slot: 1}), false, 'releasing the other card input must not fire an owned charge');
assert.equal(runtime.snapshot().ballLightningCharge.inputSlot, 0);
assert.equal(runtime.releaseBallLightning({slot: 0}), true);
step(1);
const ballHits = hits.filter(hit => hit.options.ballLightning);
assert.equal(ballHits.length, 10);
assert.ok(ballHits.every(hit => hit.amount === 12));
assert.deepEqual(statuses.map(value => [value.status, value.options.contact]), [['shock', 'initial'], ['shock', 'final']]);
assert.equal(runtime.snapshot().semanticEvents.find(event => event.kind === 'ball-complete').totalDamage, 120);
assert.equal(runtime.canCast('BALL-LIGHTNING'), false);

runtime.reset(); statuses.length = 0;
assert.equal(cast('BALL-LIGHTNING', {phase: 'begin'}), true);
runtime.update(.5, 0);
assert.equal(cast('BALL-LIGHTNING', {phase: 'interrupt'}), true);
assert.equal(runtime.snapshot().ballLightningCharge, null);
assert.equal(runtime.snapshot().effects.some(effect => /ballLightning/.test(effect.type)), false);
assert.equal(runtime.snapshot().semanticEvents.at(-1).kind, 'ball-charge-interrupted');
assert.equal(runtime.canCast('BALL-LIGHTNING'), false, 'an interrupted vulnerable hold still commits the cooldown');

runtime.reset(); hits.length = 0; system.enemies = []; system.hostileProjectiles = [];
assert.equal(cast('AQUA-BEAM'), false);
assert.equal(runtime.snapshot().castSerial, 0, 'resource rejection must happen before card/cast consumption');
step(AQUA_BEAM_SPEC.chargeInterval * AQUA_BEAM_SPEC.minCharges, .05);
assert.equal(runtime.snapshot().resources.aqua.charges, 3);
const aquaTarget = {id: 'aqua-target', x: 0, z: 4, hp: 1000, radius: .3};
const aquaProjectile = {id: 'aqua-projectile', x: 0, z: 2, radius: .1, life: 2, dead: false, mesh: {visible: true}};
system.enemies = [aquaTarget]; system.hostileProjectiles = [aquaProjectile];
assert.equal(cast('AQUA-BEAM'), true);
assert.equal(runtime.snapshot().resources.aqua.charges, 0);
step(.5);
assert.deepEqual(hits.filter(hit => hit.options.aquaBeam).map(hit => hit.amount), [10, 10, 10]);
assert.equal(aquaProjectile.dead, true);

runtime.reset(); hits.length = 0; system.hostileProjectiles = [];
step(AQUA_BEAM_SPEC.chargeInterval * AQUA_BEAM_SPEC.maxCharges, .05);
assert.equal(runtime.snapshot().resources.aqua.charges, 10);
const aquaNear = {id: 'aqua-near', x: 0, z: 3, hp: 2000, radius: .3};
const aquaFar = {id: 'aqua-far', x: .2, z: 7, hp: 2000, radius: .3};
system.enemies = [aquaNear, aquaFar];
assert.equal(cast('AQUA-BEAM'), true);
player.forwardX = 1; player.forwardZ = 0;
runtime.update(.01, 0);
const sweptBeam = runtime.snapshot().effects.find(effect => effect.type === 'aquaBeam');
assert.ok(Math.acos(sweptBeam.initialDirection.x * sweptBeam.direction.x + sweptBeam.initialDirection.z * sweptBeam.direction.z) <= AQUA_BEAM_SPEC.maxAimRadians + 1e-9);
player.forwardX = 0; player.forwardZ = 1;
step(1.3);
assert.equal(hits.filter(hit => hit.options.aquaBeam && hit.enemy === aquaNear).length, 10);
assert.equal(hits.filter(hit => hit.options.aquaBeam && hit.enemy === aquaFar).length, 10, 'the beam must pierce and tick every aligned target');

runtime.reset(); hits.length = 0; system.hostileProjectiles = []; walls.length = 0;
step(AQUA_BEAM_SPEC.chargeInterval * AQUA_BEAM_SPEC.minCharges, .05);
const aquaBeforeWall = {id: 'aqua-before-wall', x: 0, z: 2, hp: 1000, radius: .3};
const aquaBehindWall = {id: 'aqua-behind-wall', x: 0, z: 4, hp: 1000, radius: .3};
system.enemies = [aquaBeforeWall, aquaBehindWall];
walls.push({a: {x: -3, z: 3}, b: {x: 3, z: 3}});
assert.equal(cast('AQUA-BEAM'), true); step(.5);
assert.equal(hits.filter(hit => hit.options.aquaBeam && hit.enemy === aquaBeforeWall).length, 3);
assert.equal(hits.filter(hit => hit.options.aquaBeam && hit.enemy === aquaBehindWall).length, 0, 'the beam must not damage through scenery');
assert.ok(runtime.snapshot().semanticEvents.filter(event => event.kind === 'aqua-beam-tick').every(event => event.blockedByWall && event.resolvedRange < 3));

runtime.reset(); hits.length = 0; statuses.length = 0; system.hostileProjectiles = []; walls.length = 0;
walls.push({a: {x: -3, z: 4}, b: {x: 3, z: 4}});
const interventionTarget = {id: 'regular', x: .3, z: .3, hp: 2000, radius: .3, vx: 1, vz: 1};
const interventionLarge = {id: 'large', x: -.3, z: .3, hp: 2000, radius: 1.2};
system.enemies = [interventionTarget, interventionLarge];
assert.equal(cast('ARCANE-INTERVENTION', {destination: {x: 0, z: 7}}), true);
let intervention = runtime.snapshot().effects.find(effect => effect.type === 'arcaneInterventionField');
assert.ok(intervention.rodPosition.z < 4 && intervention.destination.blockedByWall);
assert.equal(runtime.canCast('ARCANE-INTERVENTION'), true, 'an active field always accepts its activation recast');
assert.equal(cast('ARCANE-INTERVENTION'), true);
assert.ok(interventionTarget.z > 3 && interventionTarget.z < 4);
assert.deepEqual({x: interventionLarge.x, z: interventionLarge.z}, {x: -.3, z: .3});
assert.equal(hits.filter(hit => hit.enemy === interventionTarget && hit.options.arcaneInterventionArrival).length, 1);
const interventionArrival = hits.find(hit => hit.enemy === interventionTarget && hit.options.arcaneInterventionArrival);
const towardRod = {x: intervention.rodPosition.x - interventionTarget.x, z: intervention.rodPosition.z - interventionTarget.z};
assert.ok(interventionArrival.knock.x * towardRod.x + interventionArrival.knock.z * towardRod.z > 0, 'arrival knockback must pull teleported targets inward toward the rod');
assert.ok(Math.abs(Math.hypot(interventionArrival.knock.x, interventionArrival.knock.z) - 1) < 1e-9, 'the documented -10 source knockback scales to one world unit');
assert.equal(hits.filter(hit => hit.enemy === interventionLarge).length, 0);
step(1.1);
assert.deepEqual(hits.filter(hit => hit.enemy === interventionTarget).map(hit => hit.amount), [25, 5, 5, 5, 5, 5]);
assert.equal(runtime.snapshot().semanticEvents.find(event => event.kind === 'intervention-activated').reason, 'recast');
assert.equal(runtime.canCast('ARCANE-INTERVENTION'), false);

runtime.reset(); hits.length = 0; walls.length = 0;
const delayedTarget = {id: 'delayed', x: 0, z: 1, hp: 1000, radius: .3};
system.enemies = [delayedTarget];
assert.equal(cast('ARCANE-INTERVENTION'), true);
step(ARCANE_INTERVENTION_SPEC.activationDelay + .05, .05);
assert.equal(runtime.snapshot().semanticEvents.find(event => event.kind === 'intervention-activated').reason, 'delay');
assert.ok(delayedTarget.z > 8, 'automatic activation teleports to the validated rod endpoint');

// Collision-adjusted landings are authoritative for simulation, later
// non-overlap choices, inward knockback, and capture telemetry.
runtime.reset(); hits.length = 0; walls.length = 0;
const resolvedA = {id: 'resolved-a', x: 0, z: 1, hp: 1000, radius: .3, vx: 2, vz: 2};
const resolvedB = {id: 'resolved-b', x: .1, z: 1, hp: 1000, radius: .3, vx: 2, vz: 2};
system.enemies = [resolvedA, resolvedB];
const interventionMoves = [];
system.moveEnemyResolved = (enemy, requested, options) => {
  const current = enemy === resolvedA ? {x: -requested.x, z: requested.z} : {...requested};
  interventionMoves.push({enemy, requested: {...requested}, current: {...current}, options});
  enemy.x = current.x; enemy.z = current.z;
  return {requested: {...requested}, current: {...current}, collided: enemy === resolvedA};
};
assert.equal(cast('ARCANE-INTERVENTION', {destination: {x: 0, z: 6}}), true);
const resolvedField = runtime.snapshot().effects.find(effect => effect.type === 'arcaneInterventionField');
assert.equal(cast('ARCANE-INTERVENTION'), true);
assert.equal(interventionMoves.length, 2);
assert.deepEqual(interventionMoves[0].options, {resetVelocity: true, source: 'arcane-intervention'});
assert.deepEqual({x: resolvedA.x, z: resolvedA.z}, interventionMoves[0].current, 'the enemy must remain at the mover-resolved point');
assert.ok(
  Math.hypot(interventionMoves[1].requested.x - interventionMoves[0].current.x, interventionMoves[1].requested.z - interventionMoves[0].current.z) >= ARCANE_INTERVENTION_SPEC.landingSpacing * .72,
  'the next landing must avoid the previous target\'s actual collision-adjusted point',
);
const resolvedArrival = hits.find(hit => hit.enemy === resolvedA && hit.options.arcaneInterventionArrival);
const resolvedTowardRod = {x: resolvedField.rodPosition.x - resolvedA.x, z: resolvedField.rodPosition.z - resolvedA.z};
assert.ok(resolvedArrival.knock.x * resolvedTowardRod.x + resolvedArrival.knock.z * resolvedTowardRod.z > 0, 'arrival pull must use the actual resolved point');
const teleportEvent = runtime.snapshot().semanticEvents.find(event => event.kind === 'intervention-target-teleported' && event.targetId === 'resolved-a');
assert.deepEqual(teleportEvent.resolvedPosition, interventionMoves[0].current);
assert.equal(teleportEvent.adjusted, true);
const resolvedActivation = runtime.snapshot().semanticEvents.find(event => event.kind === 'intervention-activated');
assert.deepEqual(resolvedActivation.landings.find(landing => landing.targetId === 'resolved-a').resolvedPosition, interventionMoves[0].current);
delete system.moveEnemyResolved;

// Exercise the actual stance deck event path: the first press keeps the same
// card in its slot, and the second press reaches the active runtime field before
// consuming/drawing that slot.
runtime.reset(); hits.length = 0; walls.length = 0; system.enemies = [];
globalThis.window=eventTarget;
eventTarget.__arena={arena:{stamina:{v:30,pending:0,recoverDelayT:0}}};
const interventionStance={id:'S-INTERVENTION-TEST',name:'INTERVENTION TEST STANCE',type:'stance',chain:['horizontal4','vertical8','stab5']};
const interventionDeck=createStanceDeck({rng:()=>0});
interventionDeck.beginRun([interventionStance,interventionCard],{openingStanceId:interventionStance.id});
assert.equal(interventionDeck.hand[0],interventionCard);
const interventionFirstPress=interventionDeck.play(0);
assert.equal(interventionFirstPress.__manualSequence.press,1);
assert.equal(interventionDeck.hand[0],interventionCard,'first press must not consume or draw over Arcane Intervention');
interventionDeck.update(1.5);
assert.equal(interventionDeck.hand[0],interventionCard,'the card must remain available throughout the runtime\'s final reactivation window');
await Promise.resolve();
assert.ok(runtime.snapshot().activeInterventionStableId,'first normal deck event must place the intervention field');
const interventionSecondPress=interventionDeck.play(0);
assert.deepEqual(interventionSecondPress.__manualSequence,{press:2,total:2,timeout:2.1,complete:true});
assert.notEqual(interventionDeck.hand[0],interventionCard,'activation press consumes the retained card exactly once');
await Promise.resolve();
assert.equal(runtime.snapshot().activeInterventionStableId,null,'second normal deck event must reactivate the existing field rather than start another card');
assert.equal(runtime.snapshot().semanticEvents.find(event => event.kind === 'intervention-activated').reason,'recast');

runtime.cleanup();
assert.equal(scene.children.length, 0);
assert.equal(runtime.snapshot().effects.length, 0);

const deterministicTrace = () => {
  runtime.reset();
  player.x = 0; player.z = 0; player.forwardX = 0; player.forwardZ = 1;
  system.enemies = []; system.hostileProjectiles = []; walls.length = 0;
  assert.equal(cast('CYCLONE-BOOMERANG'), true);
  for (let frame = 0; frame < 24; frame++) runtime.update(.05, frame * .05);
  return runtime.snapshot();
};
assert.deepEqual(deterministicTrace(), deterministicTrace(), 'fixed inputs and timesteps must produce identical semantic snapshots');

for (const [stage, expected, layers] of [['motion', 'contract', 1], ['reference', 'source', 3], ['style', 'style', 6]]) {
  eventTarget.mode = stage;
  globalThis.location.search = `?enemyLab=1&capture=1&stage=${stage}`;
  runtime.reset();
  system.enemies = [];
  assert.equal(cast('EARTHEN-AEGIS'), true);
  aegis = runtime.snapshot().effects.find(effect => effect.type === 'earthenAegis');
  assert.equal(aegis.visualMode, expected);
  assert.equal(aegis.shields[0].visualMarkers.layers, layers);
  runtime.cleanup();
  assert.equal(scene.children.length, 0, `${expected} visuals must clean without leaking meshes`);
}

globalThis.location.search = '?enemyLab=1'; eventTarget.mode = 'motion';
runtime.reset(); system.enemies = [];
assert.equal(cast('EARTHEN-AEGIS'), true);
assert.equal(runtime.snapshot().effects[0].visualMode, 'style', 'production is hard-gated to polished style rendering');
runtime.dispose();
assert.equal(scene.children.length, 0);

const invalidRuntime = installWizardArcaneTypesRuntime({getPlayer: () => player, getEnemySystem: () => system, validatePosition: () => false, eventTarget: new EventTargetMock()});
assert.equal(invalidRuntime.canCast('ARCANE-INTERVENTION'), false);
assert.equal(invalidRuntime.cast({arcanaId: 'ARCANE-INTERVENTION'}), false);
assert.equal(invalidRuntime.snapshot().castSerial, 0, 'an invalid rod endpoint is rejected before cast consumption');
invalidRuntime.dispose();

console.log('wizard arcane types tests passed');
