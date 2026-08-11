// Source-locked simulation for the two Air dash Arcana demonstrated in the
// Wizard of Legend showcase video: Gust Burst (114.7-124.7s) and Razor Burst
// (124.8-132.3s). Every number here is read back from that footage and the
// matching archive/wizard-of-legend/source-notes/02-gust-razor.md analysis.
//
// The module is headless on purpose: tools/wol-air-dash-demo.html owns input
// and presentation, tests/wol-air-dash-demo.test.mjs owns the source-faithful
// acceptance tests, and both enter through createAirDashDemo.

const clamp=(value,low,high)=>value<low?low:value>high?high:value;
const length=(x,z)=>Math.hypot(x,z);

// The showcase uses the ordinary basic dash for both Arcana: a short, fixed
// forward burst of movement with the payload hung off its origin and endpoint.
export const AIR_DASH_MOTION=Object.freeze({distance:4.6,duration:.2});

export const GUST_BURST_SOURCE=Object.freeze({
  id:'GUST-BURST',name:'Gust Burst',element:'Air',category:'Dash',subtype:'movement',
  clip:Object.freeze([114.7,124.7]),
  charges:2,rechargeSeconds:3.5,
  gatherDamage:5,gatherRadius:2.15,gatherPull:.42,
  draughtDamage:10,pathRadius:1.15,transportFraction:.78,
  enhancedEndpointDamage:5,enhancedEndpointRadius:2.15,
  // Presentation read from the footage: the base cast is pale grey-white wind,
  // the enhanced demonstration runs the same shapes in bright cyan.
  baseTint:'#e8f4f4',enhancedTint:'#54fcfc',
});

export const RAZOR_BURST_SOURCE=Object.freeze({
  id:'RAZOR-BURST',name:'Razor Burst',element:'Air',category:'Dash',subtype:'movement',
  clip:Object.freeze([124.8,132.3]),
  cooldownSeconds:5.12,
  baseDuration:1,baseTicks:5,
  enhancedDuration:1.5,enhancedTicks:7,
  tickDamage:4,radius:1.6,pull:.38,slowDuration:1.1,slowScale:.45,
  // Razor Burst's enhancement is pure lifetime, so the tint never changes.
  baseTint:'#e8f4f4',enhancedTint:'#e8f4f4',
});

export const AIR_DASH_DEMO_SPECS=Object.freeze({'GUST-BURST':GUST_BURST_SOURCE,'RAZOR-BURST':RAZOR_BURST_SOURCE});
export const AIR_DASH_DEMO_IDS=Object.freeze(['GUST-BURST','RAZOR-BURST']);

// Lifetime drives the hit schedule; per-hit damage never moves between forms.
export function razorTickSchedule(enhanced=false){
  const spec=RAZOR_BURST_SOURCE;
  const duration=enhanced?spec.enhancedDuration:spec.baseDuration;
  const ticks=enhanced?spec.enhancedTicks:spec.baseTicks;
  return Object.freeze(Array.from({length:ticks},(_,index)=>Number(((index+1)*duration/ticks).toFixed(6))));
}

// Large enough that the room still fills a tall phone screen once the demo
// page zooms in to roughly the showcase's tile size.
export const DEFAULT_ARENA=Object.freeze({halfWidth:13,halfDepth:13});

// The showcase practises on a field of immobile training dummies.
export function defaultDummyLayout(){
  return [
    {x:1.6,z:-2.4},{x:3.3,z:-1.1},{x:2.2,z:.6},{x:4.4,z:1.3},
    {x:-1.9,z:-1.6},{x:-3.6,z:.4},{x:-2.4,z:2.2},{x:.2,z:2.8},
    {x:5.6,z:-2.8},{x:-5.4,z:-2.6},{x:.4,z:-5.2},{x:2.8,z:4.6},
    {x:-2.2,z:5.4},{x:-6.4,z:2.8},{x:6.8,z:3.2},
  ];
}

export function createAirDashDemo(options={}){
  const arena={...DEFAULT_ARENA,...(options.arena||{})};
  const layout=(options.dummies||defaultDummyLayout()).map(dummy=>({...dummy}));
  const events=[];
  let nextEnemyId=1;

  const state={
    time:0,
    selected:options.selected||'GUST-BURST',
    enhanced:Boolean(options.enhanced),
    player:{x:options.startX??-4.5,z:options.startZ??0,facingX:1,facingZ:0,dashing:false,dashElapsed:0,dashDirX:1,dashDirZ:0,originX:0,originZ:0},
    move:{x:0,z:0},
    enemies:[],
    effects:[],
    gustCharges:GUST_BURST_SOURCE.charges,
    gustRecharge:0,
    razorCooldown:0,
  };

  function spawnDummies(){
    state.enemies.length=0;
    for(const dummy of layout){
      state.enemies.push({
        id:nextEnemyId++,homeX:dummy.x,homeZ:dummy.z,x:dummy.x,z:dummy.z,
        hp:500,maxHp:500,damageTaken:0,hits:0,flash:0,slowRemaining:0,
      });
    }
  }
  spawnDummies();

  function record(event){events.push({time:Number(state.time.toFixed(6)),...event});return event;}

  function clampToArena(value,half){return clamp(value,-half+.5,half-.5);}

  function pullToward(enemy,x,z,fraction){
    enemy.x=clampToArena(enemy.x+(x-enemy.x)*fraction,arena.halfWidth);
    enemy.z=clampToArena(enemy.z+(z-enemy.z)*fraction,arena.halfDepth);
  }

  function applyHit(enemy,damage){
    enemy.hp=Math.max(0,enemy.hp-damage);
    enemy.damageTaken+=damage;
    enemy.hits+=1;
    enemy.flash=.14;
  }

  function enemiesInCircle(x,z,radius){
    return state.enemies.filter(enemy=>length(enemy.x-x,enemy.z-z)<=radius);
  }

  // The draught sweeps the whole crossed corridor, not just its endpoints.
  function enemiesAlongPath(ax,az,bx,bz,radius){
    const dx=bx-ax,dz=bz-az,lengthSq=dx*dx+dz*dz;
    return state.enemies.filter(enemy=>{
      const t=lengthSq>0?clamp(((enemy.x-ax)*dx+(enemy.z-az)*dz)/lengthSq,0,1):0;
      return length(enemy.x-(ax+dx*t),enemy.z-(az+dz*t))<=radius;
    });
  }

  function addEffect(effect){state.effects.push({age:0,...effect});return effect;}

  // Phase 2 of Gust Burst: a compact burst at the dash origin that gathers
  // everything nearby into one group before anything is transported.
  function gustGather(x,z){
    const spec=GUST_BURST_SOURCE;
    const targets=enemiesInCircle(x,z,spec.gatherRadius);
    for(const enemy of targets){applyHit(enemy,spec.gatherDamage);pullToward(enemy,x,z,spec.gatherPull);}
    addEffect({type:'gust-gather',life:.34,x,z,radius:spec.gatherRadius,enhanced:state.enhanced});
    record({type:'gather',arcanaId:spec.id,damage:spec.gatherDamage,x,z,targetIds:targets.map(enemy=>enemy.id)});
    return targets;
  }

  // Phase 3: a separate carrier that moves the gathered group to the endpoint.
  function gustDraught(ax,az,bx,bz){
    const spec=GUST_BURST_SOURCE;
    const targets=enemiesAlongPath(ax,az,bx,bz,spec.pathRadius);
    for(const enemy of targets){applyHit(enemy,spec.draughtDamage);pullToward(enemy,bx,bz,spec.transportFraction);}
    addEffect({type:'gust-draught',life:.42,x:ax,z:az,toX:bx,toZ:bz,enhanced:state.enhanced});
    record({type:'draught',arcanaId:spec.id,damage:spec.draughtDamage,x:bx,z:bz,targetIds:targets.map(enemy=>enemy.id)});
    return targets;
  }

  // Enhanced phase 4: an additive endpoint burst. It never replaces phase 2 or 3.
  function gustEndpointBurst(x,z){
    const spec=GUST_BURST_SOURCE;
    const targets=enemiesInCircle(x,z,spec.enhancedEndpointRadius);
    for(const enemy of targets)applyHit(enemy,spec.enhancedEndpointDamage);
    addEffect({type:'gust-endpoint',life:.34,x,z,radius:spec.enhancedEndpointRadius,enhanced:true});
    record({type:'endpoint',arcanaId:spec.id,damage:spec.enhancedEndpointDamage,x,z,targetIds:targets.map(enemy=>enemy.id)});
    return targets;
  }

  function razorVortex(x,z){
    const spec=RAZOR_BURST_SOURCE;
    const enhanced=state.enhanced;
    const schedule=razorTickSchedule(enhanced);
    addEffect({
      type:'razor-vortex',life:enhanced?spec.enhancedDuration:spec.baseDuration,
      x,z,radius:spec.radius,enhanced,schedule,tickIndex:0,
    });
    record({type:'vortex-spawn',arcanaId:spec.id,x,z,enhanced,ticks:schedule.length,duration:enhanced?spec.enhancedDuration:spec.baseDuration});
  }

  function razorTick(effect){
    const spec=RAZOR_BURST_SOURCE;
    const targets=enemiesInCircle(effect.x,effect.z,spec.radius);
    for(const enemy of targets){
      applyHit(enemy,spec.tickDamage);
      pullToward(enemy,effect.x,effect.z,spec.pull);
      enemy.slowRemaining=Math.max(enemy.slowRemaining,spec.slowDuration);
    }
    effect.tickIndex+=1;
    record({type:'vortex-tick',arcanaId:spec.id,damage:spec.tickDamage,tick:effect.tickIndex,x:effect.x,z:effect.z,targetIds:targets.map(enemy=>enemy.id)});
  }

  function readyReason(id){
    if(state.player.dashing)return 'dashing';
    if(id==='GUST-BURST')return state.gustCharges>=1?null:'no-charge';
    if(id==='RAZOR-BURST')return state.razorCooldown<=0?null:'cooling-down';
    return 'unknown-arcana';
  }

  function cast(id=state.selected){
    const reason=readyReason(id);
    if(reason)return {ok:false,reason};
    const player=state.player;
    const moveLength=length(state.move.x,state.move.z);
    const dirX=moveLength>.001?state.move.x/moveLength:player.facingX;
    const dirZ=moveLength>.001?state.move.z/moveLength:player.facingZ;
    player.facingX=dirX;player.facingZ=dirZ;
    player.dashing=true;player.dashElapsed=0;
    player.dashDirX=dirX;player.dashDirZ=dirZ;
    player.originX=player.x;player.originZ=player.z;
    player.dashArcana=id;

    if(id==='GUST-BURST'){state.gustCharges-=1;gustGather(player.x,player.z);}
    else{state.razorCooldown=RAZOR_BURST_SOURCE.cooldownSeconds;razorVortex(player.x,player.z);}
    record({type:'dash-start',arcanaId:id,x:player.x,z:player.z,enhanced:state.enhanced});
    return {ok:true,reason:null};
  }

  function finishDash(){
    const player=state.player;
    player.dashing=false;
    record({type:'dash-end',arcanaId:player.dashArcana,x:player.x,z:player.z});
    if(player.dashArcana==='GUST-BURST'){
      gustDraught(player.originX,player.originZ,player.x,player.z);
      if(state.enhanced)gustEndpointBurst(player.x,player.z);
    }
  }

  function step(dt){
    const frame=Math.max(0,Math.min(.05,dt));
    state.time+=frame;
    const player=state.player;

    if(state.gustCharges<GUST_BURST_SOURCE.charges){
      state.gustRecharge+=frame;
      while(state.gustRecharge>=GUST_BURST_SOURCE.rechargeSeconds&&state.gustCharges<GUST_BURST_SOURCE.charges){
        state.gustRecharge-=GUST_BURST_SOURCE.rechargeSeconds;
        state.gustCharges+=1;
      }
      if(state.gustCharges>=GUST_BURST_SOURCE.charges)state.gustRecharge=0;
    }
    if(state.razorCooldown>0)state.razorCooldown=Math.max(0,state.razorCooldown-frame);

    if(player.dashing){
      const speed=AIR_DASH_MOTION.distance/AIR_DASH_MOTION.duration;
      const remaining=Math.min(frame,AIR_DASH_MOTION.duration-player.dashElapsed);
      player.x=clampToArena(player.x+player.dashDirX*speed*remaining,arena.halfWidth);
      player.z=clampToArena(player.z+player.dashDirZ*speed*remaining,arena.halfDepth);
      player.dashElapsed+=remaining;
      if(player.dashElapsed>=AIR_DASH_MOTION.duration-1e-9)finishDash();
    }else{
      const moveLength=length(state.move.x,state.move.z);
      if(moveLength>.001){
        const walk=4.4*frame;
        player.x=clampToArena(player.x+state.move.x/moveLength*walk,arena.halfWidth);
        player.z=clampToArena(player.z+state.move.z/moveLength*walk,arena.halfDepth);
        player.facingX=state.move.x/moveLength;player.facingZ=state.move.z/moveLength;
      }
    }

    for(const enemy of state.enemies){
      if(enemy.flash>0)enemy.flash=Math.max(0,enemy.flash-frame);
      if(enemy.slowRemaining>0)enemy.slowRemaining=Math.max(0,enemy.slowRemaining-frame);
    }

    for(let index=state.effects.length-1;index>=0;index--){
      const effect=state.effects[index];
      effect.age+=frame;
      if(effect.type==='razor-vortex'){
        while(effect.tickIndex<effect.schedule.length&&effect.age+1e-9>=effect.schedule[effect.tickIndex])razorTick(effect);
      }
      if(effect.age>=effect.life)state.effects.splice(index,1);
    }
    return state;
  }

  return {
    state,events,arena,
    specs:AIR_DASH_DEMO_SPECS,
    get selected(){return state.selected;},
    get enhanced(){return state.enhanced;},
    select(id){if(AIR_DASH_DEMO_IDS.includes(id))state.selected=id;return state.selected;},
    setEnhanced(value){state.enhanced=Boolean(value);return state.enhanced;},
    setMove(x,z){state.move.x=Number(x)||0;state.move.z=Number(z)||0;},
    // Slow is a real status, so expose the movement scale the way the arena
    // enemy modules do rather than baking it into the dummies.
    movementScale(enemy){return enemy.slowRemaining>0?RAZOR_BURST_SOURCE.slowScale:1;},
    ready(id=state.selected){return readyReason(id)===null;},
    readyReason,
    cast,step,
    resetDummies(){spawnDummies();},
    resetPayloads(){
      state.gustCharges=GUST_BURST_SOURCE.charges;state.gustRecharge=0;state.razorCooldown=0;
      state.effects.length=0;
    },
    clearEvents(){events.length=0;},
  };
}
