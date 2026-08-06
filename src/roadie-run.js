import { getArenaRuntime } from './arena-runtime-context.js';
export const ROADIE_GAMEPAD_BUTTON = 0; // Standard Gamepad mapping: PlayStation Cross / Xbox A.

const HOLD_THRESHOLD = .17;
const EXTRA_RUN_SPEED = 4.8;
const SKID_DURATION = .34;
const SKID_START_SPEED = 5.4;
const PLAYER_RADIUS = 1.05;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const wrapPi = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

export function createRoadieState(){
  return {
    held:false,
    holdTime:0,
    engaged:false,
    sprint:0,
    skidT:SKID_DURATION,
    skidSide:1,
    phase:0,
    lastDir:{ x:0, z:1 },
  };
}

export function stepRoadieBlend(current, target, dt){
  const rate = target > current ? 5.2 : 8.5;
  return current + (target - current) * Math.min(1, Math.max(0, dt) * rate);
}

function closestPointOnSegment(point, a, b){
  const dx = b.x - a.x, dz = b.z - a.z;
  const lengthSq = dx * dx + dz * dz || 1;
  const t = clamp(((point.x - a.x) * dx + (point.z - a.z) * dz) / lengthSq, 0, 1);
  return { x:a.x + dx * t, z:a.z + dz * t };
}

function resolveCircleMovement(position, delta, radius, wallSegments){
  const result = { x:position.x, z:position.z, collided:false };
  const distance = Math.hypot(delta.x, delta.z);
  const steps = Math.max(1, Math.ceil(distance / Math.max(radius * .45, .08)));
  for(let step = 0; step < steps; step++){
    result.x += delta.x / steps;
    result.z += delta.z / steps;
    for(let pass = 0; pass < 3; pass++){
      let moved = false;
      for(const wall of wallSegments){
        const closest = closestPointOnSegment(result, wall.a, wall.b);
        let dx = result.x - closest.x, dz = result.z - closest.z;
        let wallDistance = Math.hypot(dx, dz);
        if(wallDistance >= radius) continue;
        if(wallDistance < 1e-6){
          const sx = wall.b.x - wall.a.x, sz = wall.b.z - wall.a.z;
          dx = -sz; dz = sx; wallDistance = Math.hypot(dx, dz) || 1;
        }
        const push = (radius - wallDistance + 1e-4) / wallDistance;
        result.x += dx * push;
        result.z += dz * push;
        result.collided = moved = true;
      }
      if(!moved) break;
    }
  }
  return result;
}

function normalizedDirection(x, z){
  const length = Math.hypot(x, z);
  return length > .001 ? { x:x / length, z:z / length, magnitude:length } : { x:0, z:0, magnitude:0 };
}

function worldYawFromObject(object){
  if(!object?.getWorldQuaternion || !object.quaternion?.clone) return 0;
  const q = object.getWorldQuaternion(object.quaternion.clone());
  return Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.z * q.z));
}

export function installRoadieRun(){
  if(typeof window === 'undefined' || window.__roadieRun) return;

  const state = createRoadieState();
  let lastFrameTime = performance.now();
  let lastAfterPosition = null;
  let previousCross = false;
  let nativeGetGamepads = null;
  let gamepadMaskInstalled = false;
  let installError = null;

  try {
    if(typeof navigator.getGamepads === 'function'){
      nativeGetGamepads = navigator.getGamepads.bind(navigator);
      const maskedGetGamepads = () => Array.from(nativeGetGamepads() || [], pad => {
        if(!pad) return pad;
        const maskedButtons = Array.from(pad.buttons || [], (button, index) => index === ROADIE_GAMEPAD_BUTTON
          ? { pressed:false, touched:false, value:0 }
          : button);
        return new Proxy(pad, {
          get(target, property){
            if(property === 'buttons') return maskedButtons;
            const value = Reflect.get(target, property, target);
            return typeof value === 'function' ? value.bind(target) : value;
          }
        });
      });
      Object.defineProperty(navigator, 'getGamepads', {
        configurable:true,
        writable:true,
        value:maskedGetGamepads,
      });
      gamepadMaskInstalled = true;
    }
  } catch(error){
    installError = error;
  }

  if(!gamepadMaskInstalled){
    console.error('Roadie run did not load: unable to reserve the controller Cross button. Dodge remains unchanged.', installError);
    window.__roadieRun = {
      unavailable:true,
      error:installError,
      gamepadButton:ROADIE_GAMEPAD_BUTTON,
    };
    return;
  }

  function arenaApi(){ return getArenaRuntime() || null; }

  function performDodgeTap(){
    arenaApi()?.triggerDodge?.();
  }

  function beginHold(){
    if(state.held) return;
    state.held = true;
    state.holdTime = 0;
    state.engaged = false;
  }

  function endHold({ cancelled = false } = {}){
    if(!state.held) return;
    const wasRoadie = state.engaged || state.sprint > .12;
    const wasTap = !cancelled && !wasRoadie && state.holdTime < HOLD_THRESHOLD + .045;
    state.held = false;
    state.engaged = false;
    if(wasRoadie){
      state.skidT = 0;
      state.skidSide = Math.sin(state.phase) >= 0 ? 1 : -1;
    }
    if(wasTap) performDodgeTap();
  }

  function cancelHold(){
    if(state.held) endHold({ cancelled:true });
    state.engaged = false;
    state.sprint = 0;
    state.skidT = SKID_DURATION;
  }

  function readRawGamepad(){
    try { return nativeGetGamepads?.()?.[0] || null; }
    catch { return null; }
  }

  function readGamepadDirection(gamepad){
    if(!gamepad) return { x:0, z:0, magnitude:0 };
    const deadzone = value => Math.abs(value) > .16 ? value : 0;
    let x = deadzone(gamepad.axes?.[0] || 0);
    let z = deadzone(gamepad.axes?.[1] || 0);
    if(gamepad.buttons?.[14]?.pressed) x -= 1;
    if(gamepad.buttons?.[15]?.pressed) x += 1;
    return normalizedDirection(x, z);
  }

  function pollCross(){
    const gamepad = readRawGamepad();
    const pressed = !!gamepad?.buttons?.[ROADIE_GAMEPAD_BUTTON]?.pressed;
    if(pressed && !previousCross) beginHold();
    if(!pressed && previousCross) endHold();
    previousCross = pressed;
    return gamepad;
  }

  function canRoadie(api){
    return !!api
      && api.arena?.started
      && !api.arena?.paused
      && api.arena?.deadT < 0
      && api.arena?.dodge?.t < 0
      && !api.combatState?.attack
      && !api.roomTransition?.active;
  }

  function applyRoadiePose(api){
    const intensity = state.sprint;
    const skid = state.skidT < SKID_DURATION ? 1 - state.skidT / SKID_DURATION : 0;
    if(intensity < .001 && skid < .001) return;
    const activeModel = api.PC?.combatLayer?.parent;
    if(!activeModel) return;

    const pulse = Math.sin(state.phase);
    const stomp = Math.abs(Math.sin(state.phase));
    const parentYaw = worldYawFromObject(activeModel.parent);
    const moveYaw = Math.atan2(state.lastDir.x, state.lastDir.z);
    const localRunYaw = wrapPi(moveYaw - parentYaw);
    const runWeight = intensity + skid * .55;

    activeModel.position.x += pulse * .055 * intensity;
    activeModel.position.y -= .10 * intensity + stomp * .055 * intensity + .10 * skid;
    activeModel.position.z += .12 * intensity - .055 * skid;
    activeModel.rotation.x += .20 * intensity - .16 * skid;
    activeModel.rotation.y += localRunYaw * clamp(runWeight, 0, .88);
    activeModel.rotation.z += -pulse * .07 * intensity + state.skidSide * .18 * skid;

    const bodyGroup = activeModel.children.find(child => child?.isGroup && child !== api.PC.combatLayer);
    if(bodyGroup){
      bodyGroup.rotation.x += .10 * intensity - .08 * skid;
      bodyGroup.rotation.z += pulse * .045 * intensity + state.skidSide * .06 * skid;
    }
  }

  function ensureCombatPoseWrapper(api){
    const PC = api?.PC;
    if(!PC || PC.__roadiePoseWrapped) return;
    const originalUpdateCombat = PC.updateCombat.bind(PC);
    PC.updateCombat = (...args) => {
      const result = originalUpdateCombat(...args);
      applyRoadiePose(arenaApi());
      return result;
    };
    Object.defineProperty(PC, '__roadiePoseWrapped', { value:true });
  }

  function applyExtraMovement(api, direction, distance){
    if(distance <= 0 || direction.magnitude <= .001) return false;
    const start = { x:api.actorPos.x, z:api.actorPos.y };
    const delta = { x:direction.x * distance, z:direction.z * distance };
    const walls = api.mazeWorld?.getCollisionSegments?.() || [];
    const resolved = resolveCircleMovement(start, delta, PLAYER_RADIUS, walls);
    api.actorPos.set(resolved.x, resolved.z);
    return resolved.collided;
  }

  function frame(now){
    requestAnimationFrame(frame);
    const dt = Math.min(.05, Math.max(0, (now - lastFrameTime) / 1000));
    lastFrameTime = now;
    const gamepad = pollCross();
    const api = arenaApi();
    if(!api?.actorPos){
      lastAfterPosition = null;
      return;
    }
    ensureCombatPoseWrapper(api);

    const current = { x:api.actorPos.x, z:api.actorPos.y };
    const baseDelta = lastAfterPosition
      ? normalizedDirection(current.x - lastAfterPosition.x, current.z - lastAfterPosition.z)
      : { x:0, z:0, magnitude:0 };
    const gamepadDirection = readGamepadDirection(gamepad);
    const direction = gamepadDirection.magnitude > .12 ? gamepadDirection : baseDelta;

    const allowed = canRoadie(api);
    if(state.held) state.holdTime += dt;
    if(state.held && state.holdTime >= HOLD_THRESHOLD && allowed && direction.magnitude > .01){
      state.engaged = true;
    }
    if(!allowed){
      state.engaged = false;
      state.skidT = SKID_DURATION;
    }

    state.sprint = stepRoadieBlend(state.sprint, state.engaged && allowed ? 1 : 0, dt);
    if((state.engaged || state.sprint > .05) && direction.magnitude > .01){
      state.lastDir.x = direction.x;
      state.lastDir.z = direction.z;
      state.phase += dt * (9 + state.sprint * 5.5);
    }

    let collided = false;
    if(allowed && state.sprint > .01){
      collided = applyExtraMovement(api, { ...state.lastDir, magnitude:1 }, EXTRA_RUN_SPEED * state.sprint * dt);
    }
    if(!state.held && state.skidT < SKID_DURATION && allowed){
      state.skidT = Math.min(SKID_DURATION, state.skidT + dt);
      const skid = 1 - state.skidT / SKID_DURATION;
      collided = applyExtraMovement(api, { ...state.lastDir, magnitude:1 }, SKID_START_SPEED * skid * skid * dt) || collided;
      if(collided) state.skidT = SKID_DURATION;
    } else if(!allowed){
      state.skidT = SKID_DURATION;
    }

    lastAfterPosition = { x:api.actorPos.x, z:api.actorPos.y };
  }

  window.addEventListener('blur', cancelHold);
  document.addEventListener('visibilitychange', ()=>{ if(document.hidden) cancelHold(); });
  window.__roadieRun = {
    state,
    beginHold,
    endHold,
    cancel:cancelHold,
    gamepadButton:ROADIE_GAMEPAD_BUTTON,
    gamepadMaskInstalled,
    tuning:{ HOLD_THRESHOLD, EXTRA_RUN_SPEED, SKID_DURATION, SKID_START_SPEED },
  };
  requestAnimationFrame(frame);
}
