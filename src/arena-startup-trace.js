const TRACE_FLAG_VALUES=new Set(['1','true','yes','on']);
const TRACE_QUERY_KEYS=Object.freeze(['arenaTrace','arenaStartupTrace','debugArenaStartup','traceArenaStartup']);
const TRACE_DEBUG_VALUES=new Set(['1','true','arena','arena-startup','arena-startup-trace','startup']);
const DEFAULT_EVENT_LIMIT=240;

function queryValue(location,key){
  try{return new URLSearchParams(location?.search||'').get(key)||'';}catch{return'';}
}

export function isArenaStartupTraceEnabled(location=globalThis.location){
  if(TRACE_QUERY_KEYS.some(key=>TRACE_FLAG_VALUES.has(String(queryValue(location,key)).toLowerCase())))return true;
  const debug=String(queryValue(location,'debug')).trim().toLowerCase();
  const trace=String(queryValue(location,'trace')).trim().toLowerCase();
  return TRACE_DEBUG_VALUES.has(debug)||TRACE_DEBUG_VALUES.has(trace);
}

function finite(value,fallback){
  const number=Number(value);
  return Number.isFinite(number)?number:fallback;
}

function round(value){
  return Math.round(Number(value)*100)/100;
}

const EMPTY_VALUES=Object.freeze({
  standard:null,
  profile:null,
  encounter:null,
  director:null,
  roster:null,
  room:null,
  queue:0,
  telegraph:0,
  living:0,
  activity:null,
});

export function createArenaStartupTrace({
  location=globalThis.location,
  logger=globalThis.console,
  clock=Date,
  performanceRef=globalThis.performance,
  maxEvents=DEFAULT_EVENT_LIMIT,
}={}){
  const enabled=isArenaStartupTraceEnabled(location);
  const events=[];
  const limit=Math.max(1,Math.round(Number(maxEvents)||DEFAULT_EVENT_LIMIT));
  const monotonicStart=finite(performanceRef?.now?.(),0);
  let sequence=0;
  let values={...EMPTY_VALUES};

  function mark(phase,details={}){
    if(!enabled)return null;
    const wallNow=finite(clock?.now?.(),Date.now());
    const monotonicNow=finite(performanceRef?.now?.(),monotonicStart);
    const nextValues={...values};
    for(const key of Object.keys(EMPTY_VALUES)){
      if(Object.prototype.hasOwnProperty.call(details,key))nextValues[key]=details[key];
    }
    values=nextValues;
    const event=Object.freeze({
      marker:'arena-startup',
      sequence:++sequence,
      phase:String(phase||'event'),
      timestamp:new Date(wallNow).toISOString(),
      elapsedMs:round(monotonicNow-monotonicStart),
      values:Object.freeze({...nextValues}),
      ...nextValues,
      ...Object.fromEntries(Object.entries(details).filter(([key])=>!Object.prototype.hasOwnProperty.call(EMPTY_VALUES,key))),
    });
    events.push(event);
    if(events.length>limit)events.splice(0,events.length-limit);
    const write=typeof logger?.debug==='function'?logger.debug:logger?.log;
    if(typeof write==='function')write.call(logger,'[arena-startup]',JSON.stringify(event));
    return event;
  }

  return Object.freeze({
    enabled,
    mark,
    snapshot:()=>Object.freeze(events.slice()),
    latest:()=>Object.freeze({...values}),
    clear(){events.length=0;sequence=0;values={...EMPTY_VALUES};},
  });
}
