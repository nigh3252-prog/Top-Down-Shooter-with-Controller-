export const EXHAUSTION_CATCH_DEFAULTS=Object.freeze({
  windowDuration:.72,
  successFlashDuration:.42,
  failureLockDuration:3,
  failureStumbleDuration:.35,
  epsilon:.001,
});

const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));

export function exhaustionFailureMovementMultiplier({elapsed=0,duration=3,stumbleDuration=.35}={}){
  const total=Math.max(.001,Number(duration)||3);
  const stumble=Math.max(0,Math.min(total,Number(stumbleDuration)||0));
  const t=Math.max(0,Number(elapsed)||0);
  if(t>=total)return 1;
  if(t<=stumble){
    const u=stumble>0?clamp01(t/stumble):1;
    return .18+u*.24;
  }
  const u=clamp01((t-stumble)/Math.max(.001,total-stumble));
  return .42+u*.58;
}

export function createExhaustionCatchEngine(options={}){
  const config=Object.freeze({...EXHAUSTION_CATCH_DEFAULTS,...options});
  let serial=0;
  let state={phase:'idle',remaining:0,elapsed:0,trigger:null,serial};
  const events=[];

  function setState(next){state={...state,...next};return snapshot();}
  function emit(type,detail={}){const event=Object.freeze({type,...detail,snapshot:snapshot()});events.push(event);return event;}
  function snapshot(){
    return Object.freeze({
      phase:state.phase,
      remaining:Math.max(0,state.remaining),
      elapsed:Math.max(0,state.elapsed),
      trigger:state.trigger?Object.freeze({...state.trigger}):null,
      serial:state.serial,
      windowDuration:config.windowDuration,
      failureLockDuration:config.failureLockDuration,
      failureStumbleDuration:config.failureStumbleDuration,
      movementMultiplier:state.phase==='failed'?exhaustionFailureMovementMultiplier({elapsed:state.elapsed,duration:config.failureLockDuration,stumbleDuration:config.failureStumbleDuration}):1,
      attacksBlocked:state.phase==='missed'||state.phase==='failed',
      catchOpen:state.phase==='open',
    });
  }
  function drainEvents(){return events.splice(0,events.length);}
  function trigger({before,after,source='attack',attackKey='',weaponId='',stanceId=''}={}){
    const from=Number(before),to=Number(after);
    if(!Number.isFinite(from)||!Number.isFinite(to)||from<=config.epsilon||to>config.epsilon)return null;
    if(state.phase!=='idle')return null;
    serial++;
    setState({phase:'open',remaining:config.windowDuration,elapsed:0,serial,trigger:{source,attackKey,weaponId,stanceId}});
    return emit('opened',{serial});
  }
  function playStance({cardId='',stanceId=''}={}){
    if(state.phase!=='open')return null;
    setState({phase:'success',remaining:config.successFlashDuration,elapsed:0});
    return emit('success',{serial:state.serial,cardId,stanceId});
  }
  function cancel(reason='cancelled'){
    if(state.phase==='idle')return null;
    const previous=state.phase;
    setState({phase:'idle',remaining:0,elapsed:0,trigger:null});
    return emit('cancelled',{reason,previous});
  }
  function beginFailure(){
    if(state.phase!=='missed')return null;
    setState({phase:'failed',remaining:config.failureLockDuration,elapsed:0});
    return emit('failure-started',{serial:state.serial});
  }
  function update(dt){
    const amount=Math.max(0,Number(dt)||0);
    if(state.phase==='idle')return snapshot();
    if(state.phase==='missed')return snapshot();
    const remaining=Math.max(0,state.remaining-amount);
    const elapsed=state.elapsed+amount;
    setState({remaining,elapsed});
    if(remaining>0)return snapshot();
    if(state.phase==='open'){
      setState({phase:'missed',remaining:0,elapsed:0});
      emit('missed',{serial:state.serial});
    }else if(state.phase==='success'){
      setState({phase:'idle',remaining:0,elapsed:0,trigger:null});
      emit('success-finished',{serial:state.serial});
    }else if(state.phase==='failed'){
      setState({phase:'idle',remaining:0,elapsed:0,trigger:null});
      emit('failure-finished',{serial:state.serial});
    }
    return snapshot();
  }
  function reset(reason='reset'){
    const previous=state.phase;
    state={phase:'idle',remaining:0,elapsed:0,trigger:null,serial};
    events.length=0;
    return Object.freeze({reason,previous,snapshot:snapshot()});
  }

  return Object.freeze({config,snapshot,drainEvents,trigger,playStance,cancel,beginFailure,update,reset});
}
