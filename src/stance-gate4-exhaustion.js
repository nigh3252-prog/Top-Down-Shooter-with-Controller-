import { cardRestoresStamina } from './stance-deck.js';
import { createExhaustionCatchEngine } from './exhaustion-catch.js';

function installHud(document){
  if(!document)return()=>{};
  const stamina=document.getElementById('stWrap');
  if(!stamina)return()=>{};
  let root=document.getElementById('exhaustionCatchHud');
  if(!root){
    const style=document.createElement('style');
    style.textContent=`
      #exhaustionCatchHud{display:none;margin-top:4px;width:150px;box-sizing:border-box;border:1px solid #d4a25f;border-radius:4px;padding:3px 5px;background:rgba(18,28,28,.9);font-size:8px;letter-spacing:.1em;color:#ffd28c}
      #exhaustionCatchHud b{display:flex;justify-content:space-between;gap:6px;font-weight:800}
      #exhaustionCatchHud .catchTrack{height:3px;margin-top:3px;background:#273a39;border-radius:2px;overflow:hidden}
      #exhaustionCatchHud .catchFill{height:100%;width:100%;background:#ffd06c;transform-origin:left center}
      #exhaustionCatchHud[data-phase="success"]{border-color:#74d9b2;color:#a9f1d1} #exhaustionCatchHud[data-phase="success"] .catchFill{background:#74d9b2}
      #exhaustionCatchHud[data-phase="missed"],#exhaustionCatchHud[data-phase="failed"]{border-color:#ff786d;color:#ffaaa2} #exhaustionCatchHud[data-phase="missed"] .catchFill,#exhaustionCatchHud[data-phase="failed"] .catchFill{background:#ff786d}
      #stWrap.catchOpen{border-color:#ffd06c;box-shadow:0 0 8px rgba(255,208,108,.7)}
      #stWrap.catchFailed{border-color:#ff786d;box-shadow:0 0 8px rgba(255,120,109,.65)}
    `;
    document.head.appendChild(style);
    root=document.createElement('div');
    root.id='exhaustionCatchHud';
    root.innerHTML='<b><span class="catchLabel">STANCE CATCH</span><span class="catchTime">0.0</span></b><div class="catchTrack"><div class="catchFill"></div></div>';
    stamina.insertAdjacentElement('afterend',root);
  }
  const label=root.querySelector('.catchLabel'),time=root.querySelector('.catchTime'),fill=root.querySelector('.catchFill');
  return snapshot=>{
    const phase=snapshot?.phase||'idle';
    root.dataset.phase=phase;
    root.style.display=phase==='idle'?'none':'block';
    stamina.classList.toggle('catchOpen',phase==='open'||phase==='success');
    stamina.classList.toggle('catchFailed',phase==='missed'||phase==='failed');
    if(phase==='open'){
      label.textContent='PLAY STANCE';time.textContent=snapshot.remaining.toFixed(2);
      fill.style.transform=`scaleX(${Math.max(0,snapshot.remaining/snapshot.windowDuration)})`;
    }else if(phase==='success'){
      label.textContent='CATCH';time.textContent='CLEAN';fill.style.transform='scaleX(1)';
    }else if(phase==='missed'){
      label.textContent='MISSED';time.textContent='STUMBLE';fill.style.transform='scaleX(1)';
    }else if(phase==='failed'){
      label.textContent='EXHAUSTED';time.textContent=snapshot.remaining.toFixed(1);
      fill.style.transform=`scaleX(${Math.max(0,snapshot.remaining/snapshot.failureLockDuration)})`;
    }
  };
}

export function createStanceGate4Runtime({arenaHandle,windowRef=globalThis.window,documentRef=globalThis.document,basePlayerSpeed=8.5,engineOptions={}}={}){
  const handle=arenaHandle,PC=handle?.PC,arena=handle?.arena,deck=handle?.deck;
  if(!PC?.combatState||!arena?.stamina||!deck?.play)throw new Error('[stance-gate4] missing Combat Arena stamina/deck handle');
  const engine=createExhaustionCatchEngine(engineOptions);
  const renderHud=installHud(documentRef);
  const original={updateCombat:PC.updateCombat,startCombatAttack:PC.startCombatAttack,deckPlay:deck.play};
  let lastStamina=Number(arena.stamina.v)||0;
  let lastActorPosition=readActorPosition();
  let pendingFailure=false,ownsAttackLock=false,lastSnapshot=null;

  function readActorPosition(){
    const p=handle.actorPos;if(!p)return null;
    const x=Number(p.x),z=Number(p.y??p.z);
    return Number.isFinite(x)&&Number.isFinite(z)?{x,z}:null;
  }
  function writeActorPosition(position){
    const p=handle.actorPos;if(!p||!position)return;
    p.x=position.x;if(Number.isFinite(Number(p.y)))p.y=position.z;else p.z=position.z;
  }
  function currentIdentity(){
    return{attackKey:String(PC.combatState.attackKey||''),weaponId:String(PC.combatState.weapon||''),stanceId:String(arena.stance?.id||'')};
  }
  function observeStamina(source='attack'){
    const current=Number(arena.stamina.v)||0;
    const event=engine.trigger({before:lastStamina,after:current,source,...currentIdentity()});
    lastStamina=current;
    return event;
  }
  function clearGate4Lock(){
    if(!ownsAttackLock)return;
    const chain=arena.chain||{};
    chain.inputLockT=0;chain.lightLockT=0;chain.comboDeadline=0;chain.finisherDeadline=0;
    if(chain.stage==='locked')chain.stage='idle';
    PC.combatState.readyLock=0;ownsAttackLock=false;
  }
  function enforceFailureLock(snapshot){
    const chain=arena.chain||{};
    chain.stage='locked';
    chain.inputLockT=Math.max(Number(chain.inputLockT)||0,snapshot.remaining);
    chain.lightLockT=Math.max(Number(chain.lightLockT)||0,snapshot.remaining);
    chain.comboDeadline=0;chain.finisherDeadline=0;chain.activeSlot=-1;
    chain.pendingSlot=-1;chain.pendingStage=null;chain.pendingExpiresAt=0;chain.pendingInput=null;
    PC.combatState.pending=null;PC.combatState.pendingGroup=null;PC.combatState.readyLock=1;
    ownsAttackLock=true;
  }
  function applyFailureMovement(dt,snapshot){
    if(snapshot.phase!=='failed'||arena.dodge?.t>=0)return;
    const current=readActorPosition(),input=handle.arenaMoveInput?.()||{};
    const x=Number(input.x)||0,z=Number(input.z)||0,magnitude=Math.min(1,Math.hypot(x,z));
    if(!current||!lastActorPosition||magnitude<=.001)return;
    const nx=x/magnitude,nz=z/magnitude;
    const dx=current.x-lastActorPosition.x,dz=current.z-lastActorPosition.z;
    const along=Math.max(0,dx*nx+dz*nz);
    const intended=Math.max(0,Number(basePlayerSpeed)||0)*Math.max(0,dt)*magnitude;
    const reduction=Math.min(along,intended*(1-snapshot.movementMultiplier));
    if(reduction>0){current.x-=nx*reduction;current.z-=nz*reduction;writeActorPosition(current);}
  }
  function publish(){
    lastSnapshot=engine.snapshot();
    PC.combatState.stance2Gate4=lastSnapshot;
    renderHud(lastSnapshot);
    return lastSnapshot;
  }
  function processEvents(){
    for(const event of engine.drainEvents()){
      if(event.type==='success'){
        pendingFailure=false;clearGate4Lock();
        windowRef?.__stance2Gate3Runtime?.clearMovementRecovery?.();
      }else if(event.type==='missed'){
        pendingFailure=true;
      }else if(event.type==='failure-finished'){
        pendingFailure=false;clearGate4Lock();
      }else if(event.type==='cancelled'){
        pendingFailure=false;
      }
    }
  }
  function maybeBeginFailure(){
    if(!pendingFailure||PC.combatState.attack)return;
    engine.beginFailure();pendingFailure=false;
    windowRef?.__stance2Gate3Runtime?.clearMovementRecovery?.();
    processEvents();
  }

  PC.startCombatAttack=function(...args){
    const before=Number(arena.stamina.v)||0;
    lastStamina=before;
    const result=original.startCombatAttack.apply(this,args);
    observeStamina('attack-start');processEvents();publish();
    return result;
  };
  deck.play=function(slot){
    const result=original.deckPlay.call(this,slot);
    if(result&&cardRestoresStamina(result)&&engine.snapshot().phase==='open'){
      engine.playStance({cardId:String(result.id||''),stanceId:String(result.id||'')});
      processEvents();publish();
      const clear=()=>windowRef?.__stance2Gate3Runtime?.clearMovementRecovery?.();
      if(typeof queueMicrotask==='function')queueMicrotask(clear);else setTimeout(clear,0);
    }
    return result;
  };
  PC.updateCombat=function(...args){
    const dt=Math.max(0,Number(args[0])||0);
    if(arena.deadT>=0){engine.reset('player-down');pendingFailure=false;clearGate4Lock();}
    observeStamina('stamina-spend');
    if(engine.snapshot().phase==='open'&&(Number(arena.stamina.pending)||0)>engine.config.epsilon){
      engine.cancel('whiff-refund');
    }
    engine.update(dt);processEvents();maybeBeginFailure();
    const before=publish();
    if(before.phase==='failed'){enforceFailureLock(before);applyFailureMovement(dt,before);}
    const result=original.updateCombat.apply(this,args);
    maybeBeginFailure();
    const after=publish();
    if(after.phase==='failed')enforceFailureLock(after);
    lastActorPosition=readActorPosition();
    lastStamina=Number(arena.stamina.v)||0;
    return result;
  };

  publish();
  const api={
    installed:true,engine,snapshot:()=>lastSnapshot,
    reset(reason='manual'){engine.reset(reason);pendingFailure=false;clearGate4Lock();publish();},
    destroy(){
      engine.reset('destroy');pendingFailure=false;clearGate4Lock();
      PC.updateCombat=original.updateCombat;PC.startCombatAttack=original.startCombatAttack;deck.play=original.deckPlay;
      delete PC.combatState.stance2Gate4;renderHud(engine.snapshot());
      if(windowRef?.__stance2Gate4Runtime===api)delete windowRef.__stance2Gate4Runtime;
    },
  };
  return api;
}

export function installStanceGate4Runtime({windowRef=globalThis.window,maxAttempts=240,pollMs=50}={}){
  if(!windowRef)return{installed:false,reason:'missing-window'};
  if(windowRef.__stance2Gate4Runtime?.installed)return windowRef.__stance2Gate4Runtime;
  let attempts=0;
  const attach=()=>{
    const handle=windowRef.__arena;
    if(handle?.PC&&handle?.arena&&handle?.deck&&windowRef.__stance2Gate3Runtime?.installed){
      const runtime=createStanceGate4Runtime({arenaHandle:handle,windowRef,documentRef:windowRef.document});
      windowRef.__stance2Gate4Runtime=runtime;return runtime;
    }
    if(attempts++<maxAttempts)windowRef.setTimeout?.(attach,pollMs);
    return null;
  };
  attach();return{installed:false,pending:true};
}
