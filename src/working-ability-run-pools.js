import { EXTRA_STANCE_CARDS, NON_STANCE_CARDS } from './ability-cards.js';
import { ARENA_ABILITY_CATALOG } from './arena-ability-catalog.js';
import { readWorkingAbilityPool } from './enemy-lab-working-ability-pool.js';
import { STANCE_CARDS } from './stance-cards.js';

const isNonStance=card=>card?.type==='ability'||card?.type==='modifier';
const LEGACY_STANCE_POOL=Object.freeze([...STANCE_CARDS,...EXTRA_STANCE_CARDS]);
const LEGACY_NON_STANCE_POOL=Object.freeze([...NON_STANCE_CARDS]);
const LEGACY_REWARD_POOL=Object.freeze([...LEGACY_STANCE_POOL,...LEGACY_NON_STANCE_POOL]);

export function resolveWorkingAbilityRunPools({
  storage=globalThis.localStorage,
  catalog=ARENA_ABILITY_CATALOG,
}={}){
  const ids=readWorkingAbilityPool(storage,catalog);
  if(!ids.length){
    return{
      active:false,
      ids:[],
      cards:[...LEGACY_REWARD_POOL],
      stancePool:[...LEGACY_STANCE_POOL],
      nonStancePool:[...LEGACY_NON_STANCE_POOL],
      rewardPool:[...LEGACY_REWARD_POOL],
      source:'legacy-fallback',
    };
  }
  const selected=new Set(ids);
  const cards=(catalog||[]).filter(entry=>selected.has(entry.id)).map(entry=>entry.card).filter(Boolean);
  const stancePool=cards.filter(card=>!isNonStance(card));
  const nonStancePool=cards.filter(isNonStance);
  return{
    active:true,
    ids:[...ids],
    cards:[...cards],
    stancePool,
    nonStancePool,
    rewardPool:[...cards],
    source:'working-ability-pool',
  };
}

export function workingAbilityPoolSummary(options={}){
  const pools=resolveWorkingAbilityRunPools(options);
  return{
    active:pools.active,
    count:pools.cards.length,
    stanceCount:pools.stancePool.length,
    nonStanceCount:pools.nonStancePool.length,
    source:pools.source,
  };
}
