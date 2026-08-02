export const STANCE_SPEND_SOURCES=Object.freeze({
  attack:'stance-attack',
  charge:'stance-charge',
  defense:'stance-defense',
});

const eligibleSources=new Set(Object.values(STANCE_SPEND_SOURCES));

export function evaluateStanceSpend({
  available=0,
  cost=0,
  source=STANCE_SPEND_SOURCES.attack,
  catchPhase='idle',
  epsilon=.001,
}={}){
  const reserve=Math.max(0,Number(available)||0);
  const requested=Math.max(0,Number(cost)||0);
  const phase=String(catchPhase||'idle');
  const stanceDerived=eligibleSources.has(source);

  if(requested<=epsilon){
    return Object.freeze({
      allowed:true,
      source,
      available:reserve,
      requestedCost:requested,
      actualSpent:0,
      overdrawAmount:0,
      overdraw:false,
      opensCatch:false,
      reason:'free-action',
    });
  }

  if(reserve+epsilon>=requested){
    const remaining=Math.max(0,reserve-requested);
    return Object.freeze({
      allowed:true,
      source,
      available:reserve,
      requestedCost:requested,
      actualSpent:Math.min(reserve,requested),
      overdrawAmount:0,
      overdraw:false,
      opensCatch:remaining<=epsilon,
      reason:remaining<=epsilon?'final-reserve':'affordable',
    });
  }

  if(stanceDerived&&phase==='idle'&&reserve>epsilon){
    return Object.freeze({
      allowed:true,
      source,
      available:reserve,
      requestedCost:requested,
      actualSpent:reserve,
      overdrawAmount:requested-reserve,
      overdraw:true,
      opensCatch:true,
      reason:'overdraw',
    });
  }

  return Object.freeze({
    allowed:false,
    source,
    available:reserve,
    requestedCost:requested,
    actualSpent:0,
    overdrawAmount:Math.max(0,requested-reserve),
    overdraw:false,
    opensCatch:false,
    reason:reserve<=epsilon?'empty-reserve':phase!=='idle'?'catch-already-active':'ineligible-source',
  });
}
