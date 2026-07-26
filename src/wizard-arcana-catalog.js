import { WIZARD_ARCANA_CARDS, isWizardArcanaCard } from './wizard-arcana-cards.js';
import { WIZARD_AIR_BASIC_CARDS } from './wizard-air-basics-cards.js';
import { WIZARD_NEXT_SOURCE_CARDS } from './wizard-next-source-cards.js';
import { WIZARD_NEXT_TWENTY_CARDS } from './wizard-next-twenty-cards.js';

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
  'WHIRLING-TORNADO':59,
  'WATER-PRISON':68,
});

export const WIZARD_ARCANA_SOURCE_ORDER=SOURCE_ORDER;

export function wizardArcanaSourceOrder(cardOrId){
  const id=typeof cardOrId==='object'?cardOrId?.arcanaId:String(cardOrId||'').trim().toUpperCase().replace(/^WOL-/,'');
  return SOURCE_ORDER[id]??Number.POSITIVE_INFINITY;
}

const combined=[
  ...WIZARD_ARCANA_CARDS,
  ...WIZARD_AIR_BASIC_CARDS,
  ...WIZARD_NEXT_SOURCE_CARDS,
  ...WIZARD_NEXT_TWENTY_CARDS,
];

export const WIZARD_ARCANA_CATALOG=Object.freeze(combined.slice().sort((left,right)=>{
  const order=wizardArcanaSourceOrder(left)-wizardArcanaSourceOrder(right);
  return Number.isFinite(order)&&order!==0?order:left.id.localeCompare(right.id);
}));

export const WIZARD_ARCANA_CATALOG_BY_ID=new Map(WIZARD_ARCANA_CATALOG.map(card=>[card.id,card]));
export const WIZARD_ARCANA_CATALOG_BY_ARCANA_ID=new Map(WIZARD_ARCANA_CATALOG.map(card=>[card.arcanaId,card]));

export function wizardArcanaCardById(value){
  const id=String(value||'').trim().toUpperCase();
  if(!id)return null;
  return WIZARD_ARCANA_CATALOG_BY_ID.get(id)||WIZARD_ARCANA_CATALOG_BY_ARCANA_ID.get(id.replace(/^WOL-/,''))||null;
}

export { isWizardArcanaCard };
