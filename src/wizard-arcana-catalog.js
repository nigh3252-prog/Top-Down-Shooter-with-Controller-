import { listCards } from './card-registry.js';
import { readonlyMap } from './card-definition.js';
import { isWizardArcanaCard } from './wizard-arcana-cards.js';

const SOURCE_ORDER=Object.freeze({
  'FLAME-STRIKE':1,
  'FLAME-CROSS':2,
  'BOUNCING-BLAZE':3,
  'WIND-SLASH':4,
  'AIR-SPINNER':5,
  'PERFORATING-JET':6,
  'EARTH-KNUCKLES':7,
  'BLADED-VINE':8,
  'STONE-SHOT':9,
  'SPARK-CONTACT':10,
  'BOLT-RAIL':11,
  'VOLT-DISC':12,
  'ICE-DAGGER':13,
  'RIP-TIDE':14,
  'AQUA-ARC':15,
  'CHAOS-CRUSHER':16,
  'SEARING-RUSH':17,
  'FLARE-RUSH':18,
  'IGNITION-RUSH':19,
  'AIR-BURST':20,
  'GUST-BURST':21,
  'RAZOR-BURST':22,
  'SPIKE-TRACK':23,
  'TOXIC-TRAP':24,
  'SNARE-TRACK':25,
  'THUNDER-LINE':26,
  'CIRCUIT-LINE':27,
  'SHOCK-LINE':28,
  'WAVE-FRONT':29,
  'FROST-FEINT':30,
  'FROST-WING':31,
  'CHAOTIC-RIFT':32,
  'HOMING-FLARES':42,
  'DRAGON-ARC':44,
  'FLAME-FUSION':47,
  'RAPID-FIRE-AGENT':53,
  'WARD-OF-FLAMES':54,
  'WHIRLING-TORNADO':58,
  'MENTIS-IMPERIUM':60,
  'HEROIC-LEAP':62,
  'WATER-PRISON':67,
  'CYCLONE-BOOMERANG':68,
  'EARTHEN-AEGIS':69,
  'BALL-LIGHTNING':70,
  'AQUA-BEAM':71,
  'ARCANE-INTERVENTION':72,
});

const SHOWCASE_START=Object.freeze({
  'FLAME-STRIKE':0,'FLAME-CROSS':5.15,'BOUNCING-BLAZE':12,'WIND-SLASH':18.7,
  'AIR-SPINNER':23.7,'PERFORATING-JET':28.7,'EARTH-KNUCKLES':31.4,'BLADED-VINE':38.6,
  'STONE-SHOT':43,'SPARK-CONTACT':46,'BOLT-RAIL':52,'VOLT-DISC':58,
  'HOMING-FLARES':279,'DRAGON-ARC':310,'FLAME-FUSION':338.55,'RAPID-FIRE-AGENT':378.35,
  'WARD-OF-FLAMES':392.45,'WHIRLING-TORNADO':420,'MENTIS-IMPERIUM':434.15,'HEROIC-LEAP':442.85,
  'CYCLONE-BOOMERANG':496.4,'EARTHEN-AEGIS':600.95,'BALL-LIGHTNING':896.4,'WATER-PRISON':1048.5,
  'AQUA-BEAM':1120.7,'ARCANE-INTERVENTION':1206.6,
});

export const WIZARD_ARCANA_SOURCE_ORDER=SOURCE_ORDER;

export function wizardArcanaSourceOrder(cardOrId){
  if(typeof cardOrId==='object'&&Number.isFinite(Number(cardOrId?.analysisOrder)))return Number(cardOrId.analysisOrder);
  const id=typeof cardOrId==='object'?cardOrId?.arcanaId:String(cardOrId||'').trim().toUpperCase().replace(/^WOL-/,'');
  return SOURCE_ORDER[id]??Number.POSITIVE_INFINITY;
}

export function wizardArcanaShowcaseStart(cardOrId){
  if(typeof cardOrId==='object'){
    const direct=Number(cardOrId?.showcaseStart??cardOrId?.sourceClip?.start);
    if(Number.isFinite(direct))return direct;
  }
  const id=typeof cardOrId==='object'?cardOrId?.arcanaId:String(cardOrId||'').trim().toUpperCase().replace(/^WOL-/,'');
  return SHOWCASE_START[id]??Number.POSITIVE_INFINITY;
}

export const WIZARD_ARCANA_CATALOG=Object.freeze(listCards({family:'arcana'}).slice().sort((left,right)=>{
  const showcase=wizardArcanaShowcaseStart(left)-wizardArcanaShowcaseStart(right);
  if(Number.isFinite(showcase)&&showcase!==0)return showcase;
  const analysis=wizardArcanaSourceOrder(left)-wizardArcanaSourceOrder(right);
  return Number.isFinite(analysis)&&analysis!==0?analysis:left.id.localeCompare(right.id);
}));

export const WIZARD_ARCANA_CATALOG_BY_ID=readonlyMap(WIZARD_ARCANA_CATALOG.map(card=>[card.id,card]));
export const WIZARD_ARCANA_CATALOG_BY_ARCANA_ID=readonlyMap(WIZARD_ARCANA_CATALOG.map(card=>[card.arcanaId,card]));

export function wizardArcanaCardById(value){
  const id=String(value||'').trim().toUpperCase();
  if(!id)return null;
  return WIZARD_ARCANA_CATALOG_BY_ID.get(id)||WIZARD_ARCANA_CATALOG_BY_ARCANA_ID.get(id.replace(/^WOL-/,''))||null;
}

export { isWizardArcanaCard };
