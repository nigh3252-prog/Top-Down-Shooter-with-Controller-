import { STANCE_CARDS } from './stance-cards.js';
import { BING_BONG_CARD, BLOOD_SLASH_CARD } from './combat-modifier-cards.js';
import { EDEN_SPELLS } from './eden-spell-catalog.js';
import { WARDEN_ABILITY_CARDS } from './warden-ability-cards.js';

const freeze=value=>Object.freeze(value);
const unique=cards=>{const seen=new Set();return cards.filter(card=>card&&!seen.has(card.id)&&(seen.add(card.id),true));};
const uniqueValues=values=>[...new Set(values.filter(Boolean))];
const words=values=>Array.isArray(values)&&values.length?values.join(', '):'None listed';
const cleanStance=name=>String(name||'').replace(/^S\d+\s*/i,'').trim()||String(name||'');

const GUARD_IDS=new Set(['A11-CHALLENGE','A17-SHIELD-WALL','A18-LIVID','A25-WAR-CRY','A28-COUNTERSTRIKE','A29-CHARGING-BULL','A38-BODYGUARD']);
const BUFF_LABELS=Object.freeze({
  'A17-SHIELD-WALL':'SHIELD WALL','A18-LIVID':'LIVID','A21-TO-THE-DEATH':'DUEL','A22-EARTHSHAKING-STRIKE':'FISSURE','A23-BLOCK-AND-SLASH':'COUNTER READY','A26-WALKING-FORTRESS':'INVULNERABLE','A28-COUNTERSTRIKE':'COUNTERSTRIKE','A32-RING-OF-PAIN':'RING OF PAIN','A34-RAMPAGE':'RAMPAGE','A35-BLESSED-BLADES':'BLESSED BLADES','A36-HORN-OF-VALOR':'HORN OF VALOR','A37-LINE-IN-THE-SAND':'LINE IN THE SAND','A38-BODYGUARD':'BODYGUARD',
});
const ENEMY_STATUS_BY_WARDEN=Object.freeze({
  'A11-CHALLENGE':['taunt'],'A13-POMMEL-STRIKE':['stunPrimer'],'A14-MIGHTY-BLOW':['impactCombo'],'A15-WRATH-OF-HEAVEN':['stunPrimer'],'A16-SPELL-PURGE':['impactCombo'],'A21-TO-THE-DEATH':['taunt','duel'],'A24-WAR-HORN':['fear'],'A25-WAR-CRY':['taunt'],'A28-COUNTERSTRIKE':['taunt'],
});
function entry(base){return freeze({...base,dependencies:freeze(base.dependencies||[]),enemyStatuses:freeze(base.enemyStatuses||[])});}
function stanceEntry(card){return entry({id:`stance:${card.id}`,sourceId:card.id,kind:'stance',family:'Stances',name:card.name,shortName:cleanStance(card.name),card,activation:'press',defaultInDeck:true,summary:`Light-light-heavy · ${(card.styleTags||[]).slice(0,3).join(' · ')||'stance'}`,description:`${cleanStance(card.name)} changes Warden's light-light-heavy attack chain. Style: ${words(card.styleTags)}. Preferred weapons: ${words(card.preferredWeapons)}.`,control:'Play the card to equip this stance and refill weapon stamina.'});}
function modifierEntry(card){return entry({id:`modifier:${card.id}`,sourceId:card.id,kind:'modifier',family:'Modifiers',name:card.name,shortName:card.name,card,activation:'press',defaultInDeck:true,summary:'3 empowered attacks · movement Bleed',description:'Gain three Blood Slash charges. Each following attack spends one charge; horizontal attacks gain a much larger red trail and store damage that releases as the enemy moves.',control:'Play the card to gain three Blood Slash charges.',dependencies:['bloodSlash'],enemyStatuses:['bleed']});}
function wardenEntry(card){const pile=card.id==='A01-PILEBUNKER',duration=Math.max(0,Number(card.effect?.duration)||0);return entry({id:`warden:${card.id}`,sourceId:card.id,kind:'warden',family:'Dragon Age Abilities',name:card.name,shortName:card.short||card.name,card,activation:'press',defaultInDeck:pile,summary:`${card.cost||0} D-Stamina · ${card.cooldown||0}s cooldown`,description:card.description||'Warden warrior ability.',control:'Play the card. It remains in its hand slot during cooldown, then discards and draws a replacement.',dependencies:uniqueValues(['dStamina',GUARD_IDS.has(card.id)?'guard':null,BUFF_LABELS[card.id]?'buffTray':null]),enemyStatuses:ENEMY_STATUS_BY_WARDEN[card.id]||[],buffLabel:BUFF_LABELS[card.id]||'',buffDuration:duration});}
function edenEntry(card){const aimed=card.targeting?.kind!=='instant',deps=['mana'];if(card.id==='CONVERGENCE-FOCUS'||card.id==='CONVERGENCE-TRI-FORCE')deps.push('spellPower');if(card.id==='CONVERGENCE-TRI-FORCE')deps.push('trinity');return entry({id:`eden:${card.id}`,sourceId:card.id,kind:'eden',family:`Eden · ${card.brand}`,name:card.name,shortName:card.name,card,activation:aimed?'hold':'press',defaultInDeck:false,summary:card.summary||`${card.mana==='max'?'MAX':card.mana} Mana · ${aimed?'aimed':'instant'}`,description:card.description,control:aimed?'Hold the card button, aim, and release to cast.':'Play the card to cast immediately.',dependencies:deps,enemyStatuses:/FROST|MELTDOWN|COLD-SNAP/.test(card.id)?['frost']:[]});}

const stances=unique([...STANCE_CARDS,BING_BONG_CARD]);
const wardens=unique(WARDEN_ABILITY_CARDS);
export const ABILITY_TRYOUT_ENTRIES=freeze([...stances.map(stanceEntry),modifierEntry(BLOOD_SLASH_CARD),...wardens.map(wardenEntry),...EDEN_SPELLS.map(edenEntry)]);
export const ABILITY_TRYOUT_BY_ID=freeze(Object.fromEntries(ABILITY_TRYOUT_ENTRIES.map(item=>[item.id,item])));
export const ABILITY_TRYOUT_FAMILIES=freeze([...new Set(ABILITY_TRYOUT_ENTRIES.map(item=>item.family))]);
export const DEFAULT_ENEMY_LAB_DECK_IDS=freeze(ABILITY_TRYOUT_ENTRIES.filter(item=>item.defaultInDeck).map(item=>item.id));
export function cycleTryoutIndex(index,delta,count=ABILITY_TRYOUT_ENTRIES.length){const size=Math.max(0,Math.floor(Number(count)||0));if(!size)return 0;return((Math.floor(Number(index)||0)+Math.trunc(Number(delta)||0))%size+size)%size;}
export function firstTryoutIndexForFamily(family){const index=ABILITY_TRYOUT_ENTRIES.findIndex(item=>item.family===family);return index<0?0:index;}
export function dependenciesForEntries(entries=[]){const resources=new Set(),enemyStatuses=new Set();for(const item of entries){for(const dep of item?.dependencies||[])resources.add(dep);for(const status of item?.enemyStatuses||[])enemyStatuses.add(status);}return freeze({resources:freeze([...resources]),enemyStatuses:freeze([...enemyStatuses])});}
export function selectedEntries(ids=[]){const wanted=new Set(ids);return ABILITY_TRYOUT_ENTRIES.filter(item=>wanted.has(item.id));}
