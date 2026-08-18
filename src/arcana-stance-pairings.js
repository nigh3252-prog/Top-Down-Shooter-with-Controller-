// The down side of a combined Arcana card changes the active stance.
//
// Element category is the hard constraint for every non-Chaos Arcana:
//   Air/Wind + Lightning -> Light / Speed
//   Fire + Water          -> Medium / Balanced
//   Earth + Ice           -> Heavy / Power
//
// Within each category the pairings are authored for move fantasy and spread
// as evenly as the catalog allows. The three Chaos Arcana are flexible and
// live in Power here to improve the overall stance distribution.

export const ARCANA_ELEMENT_STANCE_CLASS = Object.freeze({
  AIR:'Light',
  WIND:'Light',
  LIGHTNING:'Light',
  FIRE:'Medium',
  WATER:'Medium',
  EARTH:'Heavy',
  ICE:'Heavy',
});

export function arcanaElementStanceClass(element){
  return ARCANA_ELEMENT_STANCE_CLASS[String(element||'').trim().toUpperCase()]||null;
}

export const ARCANA_DOWN_STANCE_IDS = Object.freeze({
  'FLAME-STRIKE':'S03',
  'FLAME-CROSS':'S11',
  'BOUNCING-BLAZE':'S26',
  'WIND-SLASH':'S14',
  'AIR-SPINNER':'S23',
  'PERFORATING-JET':'S16',
  'EARTH-KNUCKLES':'S01',
  'BLADED-VINE':'S06',
  'STONE-SHOT':'S09',
  'SPARK-CONTACT':'S25',
  'BOLT-RAIL':'S16',
  'VOLT-DISC':'S23',
  'ICE-DAGGER':'S07',
  'RIP-TIDE':'S12',
  'AQUA-ARC':'S12',
  'CHAOS-CRUSHER':'S05',
  'SEARING-RUSH':'S20',
  'FLARE-RUSH':'S26',
  'IGNITION-RUSH':'S29',
  'AIR-BURST':'S14',
  'GUST-BURST':'S18',
  'RAZOR-BURST':'S24',
  'SPIKE-TRACK':'S04',
  'TOXIC-TRAP':'S02',
  'SNARE-TRACK':'S10',
  'THUNDER-LINE':'S18',
  'CIRCUIT-LINE':'S24',
  'SHOCK-LINE':'S16',
  'WAVE-FRONT':'S15',
  'FROST-FEINT':'S08',
  'FROST-WING':'S27',
  'CHAOTIC-RIFT':'S04',
  'FLAME-BREATH':'S22',
  'SEARING-CROWN':'S03',
  'BLAZING-LARIAT':'S13',
  'EXPLOSIVE-CHARGE':'S22',
  'HOMING-FLARES':'S13',
  'DRAGON-ARC':'S17',
  'FLAME-FUSION':'S13',
  'IGNITION-DRIVE':'S20',
  'ENGULFING-FISSURE':'S29',
  'RAPID-FIRE-AGENT':'S26',
  'WARD-OF-FLAMES':'S15',
  'DRAGON-BLAST':'S25',
  'WHIRLING-TORNADO':'S14',
  'MENTIS-IMPERIUM':'S18',
  'HEROIC-LEAP':'S24',
  'SHEARING-CHAIN':'S14',
  'STORM-DRAFT':'S25',
  'CYCLONE-BOOMERANG':'S23',
  'BLURRING-FALCONRY':'S19',
  'WHIRLING-WIND-AGENT':'S24',
  'EARTHEN-AEGIS':'S28',
  'TERRA-RING':'S27',
  'GRASPING-EARTH':'S05',
  'TECTONIC-DRILL':'S21',
  'ROCK-SOLID-TOMAHAWK':'S06',
  'KNOCKOUT-BOULDER':'S01',
  'TOXIC-BOLAS':'S28',
  'ROCK-N-ROLL':'S07',
  'EARTH-STOMP-AGENT':'S02',
  'SHOCK-NOVA':'S19',
  'STAR-BOLT':'S19',
  'BALL-LIGHTNING':'S25',
  'AQUA-VORTEX':'S29',
  'WATER-PRISON':'S03',
  'AQUA-BREAKER':'S11',
  'BUBBLE-BARRAGE':'S11',
  'AQUA-BEAM':'S17',
  'ARCANE-INTERVENTION':'S30',
});

export function arcanaDownStanceId(arcanaId){
  const id=String(arcanaId||'').trim().toUpperCase().replace(/^WOL-/,'');
  return ARCANA_DOWN_STANCE_IDS[id]||null;
}
