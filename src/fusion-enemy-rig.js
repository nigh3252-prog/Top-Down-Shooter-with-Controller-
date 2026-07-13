import { installFusionEnemyRig as installBaseFusionEnemyRig } from './fusion-enemy-rig-base.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function phaseProxy(enemy, phaseCuts){
  const [windupCut, activeCut] = phaseCuts;
  let state = enemy.state;
  let stateTime = enemy.stateTime;

  if(enemy._antScreamActive){
    const progress = clamp((enemy.gestureTime || 0) / Math.max(.001, enemy.gestureDuration || 1.9), 0, 1);
    if(progress < windupCut){
      state = 'windup';
      stateTime = progress;
    } else if(progress < activeCut){
      state = 'active';
      stateTime = progress - windupCut;
    } else {
      state = 'recovery';
      stateTime = progress - activeCut;
    }
  } else if(state === 'windup'){
    stateTime = clamp(stateTime / Math.max(.001, enemy.windup), 0, 1) * windupCut;
  } else if(state === 'active'){
    stateTime = clamp(stateTime / Math.max(.001, enemy.active), 0, 1) * (activeCut - windupCut);
  } else if(state === 'recovery'){
    stateTime = clamp(stateTime / Math.max(.001, enemy.recovery), 0, 1) * (1 - activeCut);
  }

  return {
    ...enemy,
    state,
    stateTime,
    windup:windupCut,
    active:activeCut - windupCut,
    recovery:1 - activeCut,
    attack:enemy._antScreamActive ? { name:'Scream' } : enemy.attack,
    visualGroundSpeed:enemy._antScreamActive ? 0 : enemy.visualGroundSpeed,
    vx:enemy._antScreamActive ? 0 : enemy.vx,
    vz:enemy._antScreamActive ? 0 : enemy.vz,
  };
}

export function installFusionEnemyRig(THREE){
  const rig = installBaseFusionEnemyRig(THREE);
  const baseUpdate = rig.update.bind(rig);

  rig.update = function updateWithAntelopeAnimations(handle, enemy, dt, time, heightScale=1){
    if(enemy?.kind !== 'ant') return baseUpdate(handle, enemy, dt, time, heightScale);

    const animations = handle?.model?.bodyDef?.anims;
    const previousAnimation = animations?.[0];
    if(animations) animations[0] = enemy._antScreamActive ? 'ANT_SCREAM' : 'ANT_CHARGE';

    // Keep the lab animation's authored phase boundaries even when gameplay timing
    // changes, so the charge and scream retain their original readable poses.
    const proxy = phaseProxy(enemy, enemy._antScreamActive ? [.30, .75] : [.28, .68]);
    baseUpdate(handle, proxy, dt, time, heightScale);

    if(animations) animations[0] = previousAnimation;
  };

  return rig;
}
