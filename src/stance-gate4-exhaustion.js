import { cardRestoresStamina } from './stance-deck.js';
import { createExhaustionCatchEngine, EXHAUSTION_CATCH_DEFAULTS } from './exhaustion-catch.js';
import { evaluateStanceSpend, STANCE_SPEND_SOURCES } from './stance-spend-policy.js';
import { StoneSettings } from './settings.js';

const CATCH_WINDOW_BASE=EXHAUSTION_CATCH_DEFAULTS.windowDuration;
const CATCH_WINDOW_SETTING='arena.stance2.catchWindowMultiplier';
const CHARGE_COST_MULTIPLIER=.75;
const clampMultiplier=value=>Math.max(1,Math.min(10,Math.round(Number(value)||1)));

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
      #body-stance2Gate4 .stance2ControlNote{color:#5f8781;font-size:8px;line-height:1.45;margin:-12px 0 12px}
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
      const amount=Math.max(0,Number(snapshot.trigger?.overdrawAmount)||0);
      label.textContent=amount>0?`OVERDRAW +${amount.toFixed(0)} · PLAY STANCE`:'PLAY STANCE';
      time.textContent=snapshot.remaining.toFixed(2);
      fill.style.transform=`scaleX(${Math.max(0,snapshot.remaining/snapshot.windowDuration)})`;
    }else if(phase==='success'){
      label.textContent='STANCE CATCH';time.textContent='CLEAN';fill.style.transform='scaleX(1)';
    }else if(phase==='missed'){
      label.textContent='MISSED';time.textContent='STUMBLE';fill.style.transform='scaleX(1)';
    }else if(phase==='failed'){
      label.textContent='EXHAUSTED';time.textContent=snapshot.remaining.toFixed(1);
      fill.style.transform=`scaleX(${Math.max(0,snapshot.remaining/snapshot.failureLockDuration)})`;
    }
  };
}

function installCatchControls(document,{initialMultiplier=2,onChange=()=>{}}={}){
  if(!document)return{destroy(){},setValue(){}};
  const parent=document.getElementById('dirTab'),reset=document.getElementById('resetBtn');
  if(!parent||!reset)return{destroy(){},setValue(){}};
  document.getElementById('body-stance2Gate4')?.previousElementSibling?.remove();
  document.getElementById('body-stance2Gate4')?.remove();

  const header=document.createElement('button');header.className='ptitle sect';header.type='button';
  const body=document.createElement('div');body.className='sbody';body.id='body-stance2Gate4';
  const row=document.createElement('div');row.className='srow';
  const label=document.createElement('div');label.className='slabel';
  const value=document.createElement('span');value.className='sval';label.textContent='STANCE CATCH WINDOW ';label.appendChild(value);
  const input=document.createElement('input');input.type='range';input.min='1';input.max='10';input.step='1';input.setAttribute('aria-label','Stance Catch window multiplier');
  const note=document.createElement('div');note.className='stance2ControlNote';note.textContent='Whole-number multiplier of the 0.72 second base window. Stored for future playtests.';
  row.append(label,input);body.append(row,note);parent.insertBefore(header,reset);parent.insertBefore(body,reset);

  let collapsed=!!StoneSettings.get('arena.section.stance2Gate4',false);
  const syncHeader=()=>{header.textContent=`${collapsed?'▸':'▾'} STANCE 2.0`;body.style.display=collapsed?'none':'block';};
  const syncValue=raw=>{
    const multiplier=clampMultiplier(raw);input.value=String(multiplier);
    value.textContent=`×${multiplier} · ${(CATCH_WINDOW_BASE*multiplier).toFixed(2)} SEC`;
    return multiplier;
  };
  syncHeader();syncValue(initialMultiplier);
  header.addEventListener('click',()=>{collapsed=!collapsed;StoneSettings.set('arena.section.stance2Gate4',collapsed);syncHeader();});
  input.addEventListener('input',()=>{
    const multiplier=syncValue(input.value);StoneSettings.set(CATCH_WINDOW_SETTING,multiplier);onChange(multiplier);
  });
  return{setValue:syncValue,destroy(){header.remove();body.remove();}};
}

function installCatchVisual({PC,windowRef,documentRef}={}){
  if(!PC||!windowRef||!documentRef)return{update(){},pulse(){},destroy(){}};
  let visual=null,lastSnapshot=null,pendingPulse=null,destroyed=false;
  (async()=>{
    try{
      const THREE=await import('three');if(destroyed)return;
      const segments=96,radius=1.48,points=[];
      for(let index=0;index<=segments;index++){
        const angle=-Math.PI/2-(index/segments)*Math.PI*2;
        points.push(new THREE.Vector3(Math.cos(angle)*radius,.075,Math.sin(angle)*radius));
      }
      const baseGeometry=new THREE.BufferGeometry().setFromPoints(points);
      const arcGeometry=baseGeometry.clone();arcGeometry.setDrawRange(0,2);
      const group=new THREE.Group();group.name='Stance Catch Ring';group.visible=false;
      const baseMaterial=new THREE.LineBasicMaterial({color:0xd29d45,transparent:true,opacity:.24,depthWrite:false});
      const arcMaterial=new THREE.LineBasicMaterial({color:0xffe09a,transparent:true,opacity:.95,depthWrite:false});
      const base=new THREE.Line(baseGeometry,baseMaterial),arc=new THREE.Line(arcGeometry,arcMaterial);
      const flashMaterial=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
      const flash=new THREE.Mesh(new THREE.RingGeometry(1.04,1.72,64),flashMaterial);flash.rotation.x=-Math.PI/2;flash.position.y=.082;flash.visible=false;
      const light=new THREE.PointLight(0xffefc7,0,8,2);light.position.set(0,2.1,0);
      group.add(base,arc,flash,light);
      visual={segments,group,base,arc,flash,light,flashTime:0,flashDuration:.24,baseGeometry,arcGeometry,baseMaterial,arcMaterial,flashMaterial};
      if(pendingPulse){pulse(pendingPulse);pendingPulse=null;}update(lastSnapshot,0);
    }catch(error){console.warn('[stance-gate4] Catch Ring did not install',error);}
  })();
  function ensureParent(){
    if(!visual)return null;
    const actorRoot=PC.combatLayer?.parent?.parent?.parent||PC.combatLayer?.parent?.parent||null;
    if(actorRoot&&visual.group.parent!==actorRoot){visual.group.parent?.remove(visual.group);actorRoot.add(visual.group);}
    return actorRoot;
  }
  function pulse(kind='open'){
    if(!visual){pendingPulse=kind;return;}
    visual.flashTime=visual.flashDuration;visual.flash.visible=true;
    const color=kind==='success'?0x8dffd0:kind==='missed'?0xff8177:0xffffff;
    visual.flashMaterial.color.setHex(color);visual.light.color.setHex(color);
  }
  function update(snapshot,dt=0){
    lastSnapshot=snapshot||lastSnapshot;if(!visual||!lastSnapshot)return;ensureParent();
    const phase=lastSnapshot.phase||'idle',visible=phase==='open'||phase==='success'||phase==='missed';
    visual.group.visible=visible||visual.flashTime>0;visual.base.visible=visible;visual.arc.visible=visible;
    if(phase==='open'){
      const fraction=Math.max(0,Math.min(1,lastSnapshot.remaining/Math.max(.001,lastSnapshot.windowDuration)));
      visual.arcGeometry.setDrawRange(0,Math.max(2,Math.floor(visual.segments*fraction)+1));
      visual.arcMaterial.color.setHex(0xffe09a);visual.baseMaterial.color.setHex(0xd29d45);visual.arcMaterial.opacity=.72+Math.sin(lastSnapshot.elapsed*18)*.2;
    }else if(phase==='success'){
      visual.arcGeometry.setDrawRange(0,visual.segments+1);visual.arcMaterial.color.setHex(0x74d9b2);visual.baseMaterial.color.setHex(0x74d9b2);visual.arcMaterial.opacity=.9;
    }else if(phase==='missed'){
      visual.arcGeometry.setDrawRange(0,visual.segments+1);visual.arcMaterial.color.setHex(0xff786d);visual.baseMaterial.color.setHex(0xff786d);visual.arcMaterial.opacity=.95;
    }
    if(visual.flashTime>0){
      visual.flashTime=Math.max(0,visual.flashTime-Math.max(0,Number(dt)||0));
      const strength=visual.flashTime/visual.flashDuration;visual.flash.visible=true;visual.flashMaterial.opacity=strength*.82;
      visual.flash.scale.setScalar(1+(1-strength)*.72);visual.light.intensity=5.2*strength;
    }else{visual.flash.visible=false;visual.flashMaterial.opacity=0;visual.light.intensity=0;}
  }
  return{update,pulse,destroy(){
    destroyed=true;if(!visual)return;visual.group.parent?.remove(visual.group);
    visual.baseGeometry.dispose();visual.arcGeometry.dispose();visual.flash.geometry.dispose();
    visual.baseMaterial.dispose();visual.arcMaterial.dispose();visual.flashMaterial.dispose();visual=null;
  }};
}

export function createStanceGate4Runtime({arenaHandle,windowRef=globalThis.window,documentRef=globalThis.document,basePlayerSpeed=8.5,engineOptions={}}={}){
  const handle=arenaHandle,PC=handle?.PC,arena=handle?.arena,deck=handle?.deck;
  if(!PC?.combatState||!arena?.stamina||!deck?.play)throw new Error('[stance-gate4] missing Combat Arena stamina/deck handle');
  let windowMultiplier=documentRef?clampMultiplier(StoneSettings.get(CATCH_WINDOW_SETTING,2)):clampMultiplier(engineOptions.windowMultiplier||1);
  const engine=createExhaustionCatchEngine({...engineOptions,windowDuration:engineOptions.windowDuration??CATCH_WINDOW_BASE*windowMultiplier});
  const renderHud=installHud(documentRef),visual=installCatchVisual({PC,windowRef,documentRef});
  const controls=installCatchControls(documentRef,{initialMultiplier:windowMultiplier,onChange:setWindowMultiplier});
  const original={updateCombat:PC.updateCombat,startCombatAttack:PC.startCombatAttack,deckPlay:deck.play,spendQuote:globalThis.__STANCE_SPEND_QUOTE__};
  let lastStamina=Number(arena.stamina.v)||0,lastActorPosition=readActorPosition();
  let pendingFailure=false,ownsAttackLock=false,lastSnapshot=null,pendingSpendQuote=null,spendContext=null;

  function readActorPosition(){
    const p=handle.actorPos;if(!p)return null;const x=Number(p.x),z=Number(p.y??p.z);
    return Number.isFinite(x)&&Number.isFinite(z)?{x,z}:null;
  }
  function writeActorPosition(position){
    const p=handle.actorPos;if(!p||!position)return;p.x=position.x;
    if(Number.isFinite(Number(p.y)))p.y=position.z;else p.z=position.z;
  }
  function currentIdentity(){return{attackKey:String(PC.combatState.attackKey||''),weaponId:String(PC.combatState.weapon||''),stanceId:String(arena.stance?.id||'')};}
  function quoteStanceSpend({cost}={}){
    const actualCost=Math.max(0,Number(cost)||0),epsilon=engine.config.epsilon;
    const chargeRelease=spendContext!=='attack'&&arena.charge?.active&&!!PC.combatState.attack&&(Number(arena.swing?.staminaSpent)||0)>epsilon;
    const chargeFraction=chargeRelease?Math.max(0,Math.min(1,(Number(arena.charge.tier)-1/3)/(2/3))):0;
    const factor=chargeRelease?CHARGE_COST_MULTIPLIER*chargeFraction:1;
    if(factor<=epsilon)return{quotedCost:actualCost};
    const source=chargeRelease?STANCE_SPEND_SOURCES.charge:STANCE_SPEND_SOURCES.attack;
    const decision=evaluateStanceSpend({available:arena.stamina.v,cost:actualCost*factor,source,catchPhase:engine.snapshot().phase,epsilon});
    if(!decision.allowed)return{quotedCost:actualCost,decision};
    if(decision.opensCatch||decision.overdraw)pendingSpendQuote=decision;
    if(arena.swing)arena.swing.overdrawAmount=decision.overdrawAmount;
    return{quotedCost:decision.actualSpent/factor,decision};
  }
  globalThis.__STANCE_SPEND_QUOTE__=quoteStanceSpend;

  function observeStamina(source='attack'){
    const current=Number(arena.stamina.v)||0,quote=pendingSpendQuote;
    const event=engine.trigger({
      before:lastStamina,after:current,source:quote?.source||source,...currentIdentity(),
      requestedCost:quote?.requestedCost||0,actualSpent:quote?.actualSpent||Math.max(0,lastStamina-current),
      overdrawAmount:quote?.overdrawAmount||0,overdraw:quote?.overdraw===true,
    });
    pendingSpendQuote=null;lastStamina=current;return event;
  }
  function clearGate4Lock(){
    if(!ownsAttackLock)return;const chain=arena.chain||{};
    chain.inputLockT=0;chain.lightLockT=0;chain.comboDeadline=0;chain.finisherDeadline=0;
    if(chain.stage==='locked')chain.stage='idle';PC.combatState.readyLock=0;ownsAttackLock=false;
  }
  function enforceFailureLock(snapshot){
    const chain=arena.chain||{};chain.stage='locked';
    chain.inputLockT=Math.max(Number(chain.inputLockT)||0,snapshot.remaining);chain.lightLockT=Math.max(Number(chain.lightLockT)||0,snapshot.remaining);
    chain.comboDeadline=0;chain.finisherDeadline=0;chain.activeSlot=-1;chain.pendingSlot=-1;chain.pendingStage=null;chain.pendingExpiresAt=0;chain.pendingInput=null;
    PC.combatState.pending=null;PC.combatState.pendingGroup=null;PC.combatState.readyLock=1;ownsAttackLock=true;
  }
  function applyFailureMovement(dt,snapshot){
    if(snapshot.phase!=='failed'||arena.dodge?.t>=0)return;
    const current=readActorPosition(),input=handle.arenaMoveInput?.()||{};
    const x=Number(input.x)||0,z=Number(input.z)||0,magnitude=Math.min(1,Math.hypot(x,z));
    if(!current||!lastActorPosition||magnitude<=.001)return;
    const nx=x/magnitude,nz=z/magnitude,dx=current.x-lastActorPosition.x,dz=current.z-lastActorPosition.z;
    const along=Math.max(0,dx*nx+dz*nz),intended=Math.max(0,Number(basePlayerSpeed)||0)*Math.max(0,dt)*magnitude;
    const reduction=Math.min(along,intended*(1-snapshot.movementMultiplier));
    if(reduction>0){current.x-=nx*reduction;current.z-=nz*reduction;writeActorPosition(current);}
  }
  function publish(dt=0){
    lastSnapshot=Object.freeze({...engine.snapshot(),windowMultiplier,baseWindowDuration:CATCH_WINDOW_BASE});
    PC.combatState.stance2Gate4=lastSnapshot;renderHud(lastSnapshot);visual.update(lastSnapshot,dt);return lastSnapshot;
  }
  function processEvents(){
    for(const event of engine.drainEvents()){
      if(event.type==='opened')visual.pulse('open');
      else if(event.type==='success'){pendingFailure=false;clearGate4Lock();visual.pulse('success');windowRef?.__stance2Gate3Runtime?.clearMovementRecovery?.();}
      else if(event.type==='missed'){pendingFailure=true;visual.pulse('missed');}
      else if(event.type==='failure-finished'){pendingFailure=false;clearGate4Lock();}
      else if(event.type==='cancelled')pendingFailure=false;
    }
  }
  function maybeBeginFailure(){
    if(!pendingFailure||PC.combatState.attack)return;
    engine.beginFailure();pendingFailure=false;windowRef?.__stance2Gate3Runtime?.clearMovementRecovery?.();processEvents();
  }
  function setWindowMultiplier(value){
    windowMultiplier=clampMultiplier(value);StoneSettings.set(CATCH_WINDOW_SETTING,windowMultiplier);
    engine.setWindowDuration(CATCH_WINDOW_BASE*windowMultiplier);controls.setValue(windowMultiplier);publish();return windowMultiplier;
  }

  PC.startCombatAttack=function(...args){
    lastStamina=Number(arena.stamina.v)||0;pendingSpendQuote=null;if(arena.swing)arena.swing.overdrawAmount=0;
    spendContext='attack';let result;
    try{result=original.startCombatAttack.apply(this,args);}finally{spendContext=null;}
    observeStamina('attack-start');processEvents();publish();return result;
  };
  deck.play=function(slot){
    const result=original.deckPlay.call(this,slot);
    if(result&&cardRestoresStamina(result)&&engine.snapshot().phase==='open'){
      engine.playStance({cardId:String(result.id||''),stanceId:String(result.id||'')});processEvents();publish();
      const clear=()=>windowRef?.__stance2Gate3Runtime?.clearMovementRecovery?.();
      if(typeof queueMicrotask==='function')queueMicrotask(clear);else setTimeout(clear,0);
    }
    return result;
  };
  PC.updateCombat=function(...args){
    const dt=Math.max(0,Number(args[0])||0);
    if(arena.deadT>=0){engine.reset('player-down');pendingFailure=false;clearGate4Lock();}
    observeStamina('stamina-spend');
    if(engine.snapshot().phase==='open'&&(Number(arena.stamina.pending)||0)>engine.config.epsilon)engine.cancel('whiff-refund');
    engine.update(dt);processEvents();maybeBeginFailure();
    const before=publish(dt);if(before.phase==='failed'){enforceFailureLock(before);applyFailureMovement(dt,before);}
    const result=original.updateCombat.apply(this,args);
    observeStamina('attack-chain');processEvents();maybeBeginFailure();
    const after=publish(0);if(after.phase==='failed')enforceFailureLock(after);
    lastActorPosition=readActorPosition();lastStamina=Number(arena.stamina.v)||0;return result;
  };

  publish();
  const api={installed:true,engine,snapshot:()=>lastSnapshot,setWindowMultiplier,
    reset(reason='manual'){engine.reset(reason);pendingFailure=false;pendingSpendQuote=null;clearGate4Lock();publish();},
    destroy(){
      engine.reset('destroy');pendingFailure=false;pendingSpendQuote=null;clearGate4Lock();
      PC.updateCombat=original.updateCombat;PC.startCombatAttack=original.startCombatAttack;deck.play=original.deckPlay;
      if(globalThis.__STANCE_SPEND_QUOTE__===quoteStanceSpend){if(typeof original.spendQuote==='function')globalThis.__STANCE_SPEND_QUOTE__=original.spendQuote;else delete globalThis.__STANCE_SPEND_QUOTE__;}
      delete PC.combatState.stance2Gate4;renderHud(engine.snapshot());visual.destroy();controls.destroy();
      if(windowRef?.__stance2Gate4Runtime===api)delete windowRef.__stance2Gate4Runtime;
    }};
  return api;
}

export function installStanceGate4Runtime({windowRef=globalThis.window,maxAttempts=240,pollMs=50}={}){
  if(!windowRef)return{installed:false,reason:'missing-window'};
  if(windowRef.__stance2Gate4Runtime?.installed)return windowRef.__stance2Gate4Runtime;
  let attempts=0;
  const attach=()=>{
    const handle=windowRef.__arena;
    if(handle?.PC&&handle?.arena&&handle?.deck&&windowRef.__stance2Gate3Runtime?.installed){
      const runtime=createStanceGate4Runtime({arenaHandle:handle,windowRef,documentRef:windowRef.document});windowRef.__stance2Gate4Runtime=runtime;return runtime;
    }
    if(attempts++<maxAttempts)windowRef.setTimeout?.(attach,pollMs);return null;
  };
  attach();return{installed:false,pending:true};
}
