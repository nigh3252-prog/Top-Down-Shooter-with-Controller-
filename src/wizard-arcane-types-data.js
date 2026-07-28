const freezeArray = values => Object.freeze(values.map(value => Object.freeze({...value})));

export const WIZARD_ARCANE_TYPES_SOURCE_ASSET = 'media/wizard-of-legend/wizard-of-legend-arcana-showcase-480p.mp4';

export const WIZARD_ARCANE_TYPES_SOURCE_WINDOWS = Object.freeze({
  'CYCLONE-BOOMERANG': Object.freeze({start: '08:16.40', end: '08:17.90'}),
  'EARTHEN-AEGIS': Object.freeze({start: '10:00.95', end: '10:05.55'}),
  'BALL-LIGHTNING': Object.freeze({start: '14:56.40', end: '15:01.00'}),
  'AQUA-BEAM': Object.freeze({start: '18:40.70', end: '18:42.75'}),
  'ARCANE-INTERVENTION': Object.freeze({start: '20:06.60', end: '20:11.35'}),
});

export const CYCLONE_BOOMERANG_SPEC = Object.freeze({
  id: 'CYCLONE-BOOMERANG',
  element: 'Air',
  cooldown: 3.5,
  outboundDamage: 15,
  returnDamage: 15,
  sourceKnockback: 15,
  worldKnockback: 1.5,
  speed: 13,
  range: 8.5,
  radius: 1.35,
  catchRadius: .72,
  enhancedEnabled: false,
  chargedSignatureEnabled: false,
});

export const EARTHEN_AEGIS_SPEC = Object.freeze({
  id: 'EARTHEN-AEGIS',
  element: 'Earth',
  cooldown: 8,
  duration: 4.5,
  shieldCount: 8,
  damage: 5,
  sourceKnockback: 10,
  worldKnockback: 1,
  orbitRadius: 3.55,
  shieldRadius: .68,
  angularSpeed: 1.2,
  spinDuration: .18,
  shieldYawSpeed: 2.3,
  enhancedEnabled: false,
});

export const BALL_LIGHTNING_SPEC = Object.freeze({
  id: 'BALL-LIGHTNING',
  element: 'Lightning',
  cooldown: 5.5,
  damage: 12,
  minHits: 5,
  maxHits: 10,
  fullChargeDuration: 1.5,
  hitInterval: .075,
  speed: 10.5,
  range: 12,
  minRadius: .52,
  maxRadius: 1,
  sourceKnockback: 75,
  worldKnockback: 7.5,
  maximumShockDuration: .625,
  enhancedEnabled: false,
  chargedSignatureEnabled: false,
});

export const AQUA_BEAM_SPEC = Object.freeze({
  id: 'AQUA-BEAM',
  element: 'Water',
  chargeInterval: .75,
  minCharges: 3,
  maxCharges: 10,
  tickDamage: 10,
  tickInterval: .12,
  sourceKnockback: 20,
  worldKnockback: 2,
  range: 13.5,
  halfWidth: 1.15,
  maxAimRadians: Math.PI / 12,
  destroysProjectiles: true,
  piercesEnemies: true,
  enhancedEnabled: false,
  chargedSignatureEnabled: false,
});

export const ARCANE_INTERVENTION_SPEC = Object.freeze({
  id: 'ARCANE-INTERVENTION',
  element: 'Chaos',
  cooldown: 4.25,
  activationDelay: 2,
  throwRange: 8.75,
  minimumThrowDistance: .6,
  wallClearance: .42,
  captureRadius: 3.8,
  arrivalDamage: 25,
  arrivalSourceKnockback: -10,
  stormTickDamage: 5,
  stormSourceKnockback: -1,
  stormRadius: 3.05,
  stormTickTimes: Object.freeze([.18, .36, .54, .72, .90]),
  largeEnemyRadius: 1.1,
  landingSpacing: .55,
  enhancedEnabled: false,
  chargedSignatureEnabled: false,
});

export const WIZARD_ARCANE_TYPE_SPECS = Object.freeze({
  [CYCLONE_BOOMERANG_SPEC.id]: CYCLONE_BOOMERANG_SPEC,
  [EARTHEN_AEGIS_SPEC.id]: EARTHEN_AEGIS_SPEC,
  [BALL_LIGHTNING_SPEC.id]: BALL_LIGHTNING_SPEC,
  [AQUA_BEAM_SPEC.id]: AQUA_BEAM_SPEC,
  [ARCANE_INTERVENTION_SPEC.id]: ARCANE_INTERVENTION_SPEC,
});

export const WIZARD_ARCANE_TYPE_IDS = Object.freeze(Object.keys(WIZARD_ARCANE_TYPE_SPECS));

export const WIZARD_ARCANE_TYPE_CONTRACTS = freezeArray(WIZARD_ARCANE_TYPE_IDS.map(id => ({
  arcanaId: id,
  sourceAsset: WIZARD_ARCANE_TYPES_SOURCE_ASSET,
  sourceWindow: WIZARD_ARCANE_TYPES_SOURCE_WINDOWS[id],
  baseOnly: true,
  enhancedEnabled: false,
  chargedSignatureEnabled: false,
})));

export function normalizeWizardArcaneTypeId(value) {
  return String(value?.arcanaId || value?.id || value || '').trim().toUpperCase().replace(/^WOL-/, '');
}

export function wizardArcaneTypeSpec(value) {
  return WIZARD_ARCANE_TYPE_SPECS[normalizeWizardArcaneTypeId(value)] || null;
}
