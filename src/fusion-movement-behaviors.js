// Isaac-inspired movement families for the existing fusion-enemy roster.
// This layer deliberately changes only idle locomotion. Attacks, navigation,
// collision, hit reactions, and the antelope's authored charge remain owned by
// the existing arena enemy system.

export const FUSION_MOVEMENT_PROFILES = Object.freeze({
  lion: Object.freeze({ family:'pursuer', pattern:'Gaper pursuit' }),
  spid: Object.freeze({ family:'skitterer', pattern:'Spider stop-and-burst' }),
  sun: Object.freeze({ family:'flier', pattern:'Fly weave' }),
  grab: Object.freeze({ family:'coward', pattern:'Mulligan retreat' }),
  tooth: Object.freeze({ family:'brute', pattern:'Fatty advance' }),
  mother: Object.freeze({ family:'anchor', pattern:'Nest keeper' }),
  stilt: Object.freeze({ family:'anchor', pattern:'Horf plant-and-strike' }),
  ant: Object.freeze({ family:'pursuer', pattern:'Squirt charge' }),
  phx: Object.freeze({ family:'flier', pattern:'Attack Fly swoop orbit' }),
  croc: Object.freeze({ family:'skitterer', pattern:'Round Worm ambush rhythm' }),
});

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=(value,fallback=0)=>Number.isFinite(value)?value:fallback;

function distanceToPlayer(enemy,player){
  return Math.hypot(finite(player?.x)-finite(enemy?.x),finite(player?.z)-finite(enemy?.z));
}

function phaseIndex(clock,period){
  return Math.floor(clock/Math.max(.05,period));
}

export function installFusionMovementBehaviors(system){
  if(!system||typeof system.update!=='function'||!Array.isArray(system.enemies)){
    throw new Error('[fusion-movement] Enemy system with update() and enemies[] is required.');
  }
  if(system.fusionMovementBehaviorsInstalled)return system;

  const baseUpdate=system.update.bind(system);
  const states=new WeakMap();

  function stateFor(enemy){
    let state=states.get(enemy);
    if(!state){
      const seed=((finite(enemy.id,1)*.61803398875)%1+1)%1;
      state={
        baseSpeed:Math.max(.01,finite(enemy.speed,1)),
        baseRole:enemy.role,
        basePreferredRange:Math.max(.1,finite(enemy.preferredRange,2.6)),
        baseOrbitDir:enemy.orbitDir===-1?-1:1,
        clock:seed*2.3,
        phase:-1,
      };
      states.set(enemy,state);
    }
    return state;
  }

  function restore(enemy,state){
    enemy.speed=state.baseSpeed;
    enemy.role=state.baseRole;
    enemy.preferredRange=state.basePreferredRange;
  }

  function setPhaseOrbit(enemy,state,index){
    if(index===state.phase)return;
    state.phase=index;
    enemy.orbitDir=index%2===0?state.baseOrbitDir:-state.baseOrbitDir;
  }

  function apply(enemy,dt,player){
    const profile=enemy?.fusion?FUSION_MOVEMENT_PROFILES[enemy.kind]:null;
    if(!profile||enemy.hp<=0)return;
    const state=stateFor(enemy);
    state.clock+=clamp(finite(dt),0,.1);
    enemy.movementFamily=profile.family;
    enemy.movementPattern=profile.pattern;

    if(system.isRigidBodyActive?.(enemy)){
      restore(enemy,state);
      return;
    }

    const distance=distanceToPlayer(enemy,player);
    const base=state.baseSpeed;

    switch(enemy.kind){
      case 'lion':
        enemy.role='mobile bruiser';
        enemy.preferredRange=2.35;
        enemy.speed=base*1.06;
        break;
      case 'spid':{
        enemy.role='flanker';
        enemy.preferredRange=2.45;
        const period=.92;
        const local=state.clock%period;
        setPhaseOrbit(enemy,state,phaseIndex(state.clock,period));
        enemy.speed=base*(local<.47?1.48:.12);
        break;
      }
      case 'sun':{
        enemy.role='skirmisher';
        enemy.preferredRange=5.4;
        const period=.56;
        setPhaseOrbit(enemy,state,phaseIndex(state.clock,period));
        enemy.speed=base*(.84+.26*(.5+.5*Math.sin(state.clock*10.5)));
        break;
      }
      case 'grab':
        enemy.role='skirmisher';
        enemy.preferredRange=8.2;
        enemy.speed=base*(distance<7.1?1.38:.68);
        break;
      case 'tooth':
        enemy.role='mobile bruiser';
        enemy.preferredRange=1.72;
        enemy.speed=base*.64;
        break;
      case 'mother':{
        enemy.role='area controller';
        enemy.preferredRange=7.1;
        const period=2.2;
        const local=state.clock%period;
        setPhaseOrbit(enemy,state,phaseIndex(state.clock,period));
        enemy.speed=base*(local<.92?.08:.62);
        break;
      }
      case 'stilt':{
        enemy.role='reach sentinel';
        enemy.preferredRange=4.65;
        const period=1.95;
        const local=state.clock%period;
        setPhaseOrbit(enemy,state,phaseIndex(state.clock,period));
        const planted=distance<6.6&&local<1.24;
        enemy.speed=base*(planted?.025:.76);
        break;
      }
      case 'ant':
        // The antelope already owns a Squirt-like charge controller.
        restore(enemy,state);
        break;
      case 'phx':{
        enemy.role='aerial harasser';
        enemy.preferredRange=6.15;
        const period=1.08;
        setPhaseOrbit(enemy,state,phaseIndex(state.clock,period));
        enemy.speed=base*(1.08+.18*(.5+.5*Math.sin(state.clock*7.2)));
        break;
      }
      case 'croc':{
        enemy.role='low ambusher';
        enemy.preferredRange=4.05;
        const period=1.42;
        const local=state.clock%period;
        setPhaseOrbit(enemy,state,phaseIndex(state.clock,period));
        enemy.speed=base*(local<.76?.07:1.62);
        break;
      }
      default:
        restore(enemy,state);
    }
  }

  system.update=function updateWithFusionMovementFamilies(dt,player){
    for(const enemy of system.enemies)apply(enemy,dt,player);
    return baseUpdate(dt,player);
  };

  Object.defineProperties(system,{
    fusionMovementBehaviorsInstalled:{enumerable:true,value:true},
    fusionMovementProfiles:{enumerable:true,value:FUSION_MOVEMENT_PROFILES},
  });
  return system;
}
