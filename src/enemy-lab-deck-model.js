export function shuffledCopy(values=[],rng=Math.random){
  const out=[...values];
  for(let i=out.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
  return out;
}
export function createEnemyLabDeckModel({entries=[],rng=Math.random,shuffleTime=2}={}){
  const byId=new Map(entries.map(entry=>[entry.id,entry]));
  const state={pool:[],draw:[],discard:[],hand:[null,null],cooldowns:[0,0],shuffleT:-1};
  const refill=slot=>{state.hand[slot]=state.draw.shift()||null;state.cooldowns[slot]=0;};
  function deal(){state.draw=shuffledCopy(state.pool,rng);state.discard=[];state.hand=[null,null];state.cooldowns=[0,0];refill(0);refill(1);}
  function apply(ids){
    const seen=new Set();state.pool=ids.map(id=>byId.get(id)).filter(entry=>entry&&!seen.has(entry.id)&&(seen.add(entry.id),true));
    state.shuffleT=-1;deal();return state.pool;
  }
  function consume(slot){
    const card=state.hand[slot];if(card)state.discard.push(card);state.hand[slot]=null;state.cooldowns[slot]=0;
    if(!state.draw.length&&state.discard.length){state.draw=shuffledCopy(state.discard,rng);state.discard=[];}
    refill(slot);return card;
  }
  function startCooldown(slot,seconds){state.cooldowns[slot]=Math.max(.05,Number(seconds)||.05);}
  function shuffle(){
    if(state.shuffleT>=0||!state.pool.length)return false;
    state.discard.push(...state.hand.filter(Boolean),...state.draw);state.hand=[null,null];state.draw=[];state.cooldowns=[0,0];state.shuffleT=shuffleTime;return true;
  }
  function update(dt){
    const step=Math.max(0,Number(dt)||0),completed=[];
    if(state.shuffleT>=0){state.shuffleT-=step;if(state.shuffleT<=0){state.shuffleT=-1;deal();}return completed;}
    for(let slot=0;slot<2;slot++){if(state.cooldowns[slot]<=0)continue;state.cooldowns[slot]=Math.max(0,state.cooldowns[slot]-step);if(state.cooldowns[slot]<=0){completed.push(state.hand[slot]);consume(slot);}}
    return completed;
  }
  return{state,apply,consume,startCooldown,shuffle,update,cooldownFor:slot=>Math.max(0,state.cooldowns[slot]||0)};
}
