import { getArenaRuntime, getArenaRuntimeConfig } from './arena-runtime-context.js';
// Current-main combat composition. The local core preserves the validated
// weapon/attack implementation, the Pilebunker layer adds its approved combat
// behavior, and this module installs the remaining dash and Arcana runtimes.

import { installPlayerCombat as installMainPlayerCombat } from './player-combat-pilebunker.js';
import { getArenaEnemySystem, setArenaEnemySource } from './arena-enemy-registry.js';
import { createArenaEnemyRegistryBridge } from './arena-enemy-registry-bridge.js';
import { installBasicDashRuntime } from './basic-dash.js';
import { installDashMagicJet } from './dash-magic-jet.js';
import { createDashJetControlDescriptors } from './dash-magic-jet-panel.js';
import { installCombatCardEffects } from './combat-card-effects.js';
import { createEffectDispatcher, createRuntimeHandlerTable } from './effect-registry.js';
import { installWizardArcanaRuntime } from './wizard-arcana-runtime.js';
import { installWizardFlameStrikeRuntime } from './wizard-flame-strike-runtime.js';
import { installWizardWindSlashRuntime } from './wizard-wind-slash-runtime.js';
import { installWizardAirBasicsRuntime } from './wizard-air-basics-runtime.js';
import { installWizardNextSourceRuntime } from './wizard-next-source-runtime.js';
import { installWizardNextTwentyBasicsRuntime } from './wizard-next-twenty-basics-runtime.js';
import { installWizardNextTwentyDashRuntime } from './wizard-next-twenty-dash-runtime.js';
import { installWizardRebuiltArcanaRuntime } from './wizard-rebuilt-arcana-runtime.js';
import { installWizardFusionLeapRuntime } from './wizard-fusion-leap-runtime.js';
import { installWizardArcaneTypesRuntime } from './wizard-arcane-types-runtime.js';
import { installWizardAlliedArcanaRuntime } from './wizard-allied-arcana-runtime.js';
import { installWizardArcanaDamageScaler } from './wizard-arcana-damage-scaler.js';
import { installWizardVfxArcanaRuntime } from './wizard-vfx-arcana-runtime.js';

export function installPlayerCombat(api){
  const PC=installMainPlayerCombat(api);
  const runtimeMode=getArenaRuntimeConfig()?.mode;
  const supportedArenaRuntime=runtimeMode==='arena'||runtimeMode==='enemy-lab'
    ||/(?:^|\/)combat-arena\.html$/i.test(location.pathname)
    ||/HEX MAZE COMBAT/i.test(document.title);
  if(!supportedArenaRuntime)return PC;

  const {THREE}=api;
  const playerWorld=new THREE.Vector3();
  const playerForward=new THREE.Vector3(0,0,1);
  const identityQ=new THREE.Quaternion();
  const enemyRegistryBridge=createArenaEnemyRegistryBridge({
    getLocalSystem:getArenaEnemySystem,
    setPinnedSource:setArenaEnemySource,
  });
  const basicDashRuntime=installBasicDashRuntime(api);
  const dashMagicJet=installDashMagicJet({
    THREE,scene:api.scene,
    getDashState:()=>basicDashRuntime.state,
    getMazeSegments:()=>getArenaRuntime()?.mazeWorld?.getCollisionSegments?.()||[],
    getRoomKey:()=>getArenaRuntime()?.activeRoomId??null,
    getInterrupted:()=>{
      const handle=getArenaRuntime();
      return !!handle&&(handle.arena?.deadT>=0||!!handle.roomTransition?.active);
    },
  });
  for(const descriptor of createDashJetControlDescriptors(dashMagicJet))api.controlRegistry?.register?.(
    {id:'dash-jet',label:'DASH JET',source:'player-combat',placement:{section:'loadout',subsection:'Dash Jet'},profile:{scope:'profile',pathPrefix:'ability.dashJet'}},
    {...descriptor,profile:descriptor.kind==='button'?{scope:'ephemeral',exclusion:'Reset action; tuned values are stored individually.'}:{path:`ability.dashJet.${descriptor.id.split('.').at(-1)}`,scope:'profile',migrationId:`dash-jet-${descriptor.id}`},placement:{section:'loadout',subsection:'Dash Jet',order:0,accessibleLabel:`Player loadout / Dash Jet / ${descriptor.label}`}},
  );

  // Arcana were authored and validated through the embedded Enemy Lab. Every
  // runtime family now initializes under that same context in the full Combat
  // Arena, then the real URL is restored immediately. This keeps one authored
  // implementation for all 56 cards without enabling Lab-only deck/editor UI.
  const installArenaArcanaRuntime=factory=>factory();

  function getPlayerTransform(){
    const root=api.actorVisual?.parent;
    if(root?.getWorldPosition)root.getWorldPosition(playerWorld);else playerWorld.set(0,0,0);
    playerForward.set(0,0,1).applyQuaternion(api.yawQ||identityQ);
    playerForward.y=0;
    if(playerForward.lengthSq()<1e-6)playerForward.set(0,0,1);
    playerForward.normalize();
    return{x:playerWorld.x,z:playerWorld.z,forwardX:playerForward.x,forwardZ:playerForward.z};
  }
  function advanceArenaPlayer(dx,dz){
    const moveX=Number(dx)||0,moveZ=Number(dz)||0;
    const position=getArenaRuntime()?.actorPos;
    if(!position)return false;
    if(Number.isFinite(position.x))position.x+=moveX;
    if(Number.isFinite(position.y))position.y+=moveZ;
    else if(Number.isFinite(position.z))position.z+=moveZ;
    const root=api.actorVisual?.parent;
    if(root?.position){root.position.x+=moveX;root.position.z+=moveZ;}
    return true;
  }

  const combatEffectRuntime=installCombatCardEffects({
    THREE,scene:api.scene,PC,hooks:api.hooks,
    getPlayer:getPlayerTransform,
    getEnemySystem:getArenaEnemySystem,
    getStance:()=>getArenaRuntime()?.arena?.stance||null,
    getMazeSegments:()=>getArenaRuntime()?.mazeWorld?.getCollisionSegments?.()||[],
  });
  const wizardArcanaDamageScaler=installWizardArcanaDamageScaler({getEnemySystem:getArenaEnemySystem});
  const wizardArcanaRuntime=installArenaArcanaRuntime(()=>installWizardArcanaRuntime({
    THREE,scene:api.scene,
    getPlayer:getPlayerTransform,
    getEnemySystem:getArenaEnemySystem,
    getMazeSegments:()=>getArenaRuntime()?.mazeWorld?.getCollisionSegments?.()||[],
  }));
  const wizardRebuiltArcanaRuntime=installArenaArcanaRuntime(()=>installWizardRebuiltArcanaRuntime({
    THREE,scene:api.scene,
    getPlayer:getPlayerTransform,
    getEnemySystem:getArenaEnemySystem,
    getMazeSegments:()=>getArenaRuntime()?.mazeWorld?.getCollisionSegments?.()||[],
  }));
  const wizardFlameStrikeRuntime=installArenaArcanaRuntime(()=>installWizardFlameStrikeRuntime({
    THREE,scene:api.scene,
    getPlayer:getPlayerTransform,
    getEnemySystem:getArenaEnemySystem,
  }));
  const wizardWindSlashRuntime=installArenaArcanaRuntime(()=>installWizardWindSlashRuntime({
    THREE,scene:api.scene,
    getPlayer:getPlayerTransform,
    getEnemySystem:getArenaEnemySystem,
  }));
  const wizardAirBasicsRuntime=installArenaArcanaRuntime(()=>installWizardAirBasicsRuntime({
    THREE,scene:api.scene,
    getPlayer:getPlayerTransform,
    getEnemySystem:getArenaEnemySystem,
    getMazeSegments:()=>getArenaRuntime()?.mazeWorld?.getCollisionSegments?.()||[],
  }));
  const wizardNextSourceRuntime=installArenaArcanaRuntime(()=>installWizardNextSourceRuntime({
    THREE,scene:api.scene,
    getPlayer:getPlayerTransform,
    getEnemySystem:getArenaEnemySystem,
    getMazeSegments:()=>getArenaRuntime()?.mazeWorld?.getCollisionSegments?.()||[],
    advancePlayer:advanceArenaPlayer,
  }));
  const wizardNextTwentyBasicsRuntime=installArenaArcanaRuntime(()=>installWizardNextTwentyBasicsRuntime({
    THREE,scene:api.scene,
    getPlayer:getPlayerTransform,
    getMoveInput:()=>getArenaRuntime()?.arenaMoveInput?.()||{x:0,z:0},
    getEnemySystem:getArenaEnemySystem,
    getMazeSegments:()=>getArenaRuntime()?.mazeWorld?.getCollisionSegments?.()||[],
    translatePlayer:(dx,dz)=>getArenaRuntime()?.translateArcanaPlayer?.(dx,dz),
    setMovementLock:(locked)=>getArenaRuntime()?.setArcanaMovementLock?.(locked),
    setFacingLock:(direction)=>getArenaRuntime()?.setArcanaFacingLock?.(direction),
  }));
  let arcanaDamageAdapter=null,arcanaDamageSystem=null;
  function syncArcanaDamageInterceptor(){
    let system=null;try{system=getArenaEnemySystem();}catch{return false;}
    if(system===arcanaDamageSystem)return true;
    arcanaDamageSystem?.setPlayerDamageInterceptor?.(null);
    arcanaDamageSystem=system;
    system?.setPlayerDamageInterceptor?.(arcanaDamageAdapter);
    return true;
  }
  const wizardNextTwentyDashRuntime=installArenaArcanaRuntime(()=>installWizardNextTwentyDashRuntime({
    THREE,scene:api.scene,
    getPlayer:getPlayerTransform,
    getMoveInput:()=>getArenaRuntime()?.arenaMoveInput?.()||{x:0,z:0},
    getEnemySystem:getArenaEnemySystem,
    getMazeSegments:()=>getArenaRuntime()?.mazeWorld?.getCollisionSegments?.()||[],
    startDashMotion:(options)=>basicDashRuntime.startDashMotion(options),
    validateTeleportEndpoint:(endpoint)=>getArenaRuntime()?.validateArcanaTeleportEndpoint?.(endpoint)??{ok:false,reason:'arena-unavailable'},
    teleportPlayer:(endpoint)=>getArenaRuntime()?.teleportArcanaPlayer?.(endpoint),
    setPlayerTargetable:(targetable)=>getArenaRuntime()?.setArcanaTargetable?.(targetable),
    setPlayerVisible:(visible)=>getArenaRuntime()?.setArcanaPlayerVisible?.(visible),
    registerPlayerDamageInterceptor:(interceptor)=>{
      arcanaDamageAdapter=hit=>{
        const result=interceptor?.(Number(hit?.damage)||0,hit)||{};
        return{damage:Math.max(0,Number(result?.remaining) || 0)};
      };
      syncArcanaDamageInterceptor();
      return()=>{arcanaDamageAdapter=null;arcanaDamageSystem?.setPlayerDamageInterceptor?.(null);arcanaDamageSystem=null;};
    },
    registerDecoy:(decoy)=>getArenaEnemySystem()?.registerWizardDecoy?.(decoy),
    unregisterDecoy:(id)=>getArenaEnemySystem()?.unregisterWizardDecoy?.(id),
    damagePlayer:(amount,options)=>getArenaEnemySystem()?.damagePlayer?.(amount,{kind:'arcana-status',name:options?.status||'Status',targetableIndependent:options?.targetableIndependent===true}),
  }));
  const wizardFusionLeapRuntime=installArenaArcanaRuntime(()=>installWizardFusionLeapRuntime({
    THREE,scene:api.scene,
    getPlayer:getPlayerTransform,
    getEnemySystem:getArenaEnemySystem,
    getMazeSegments:()=>getArenaRuntime()?.mazeWorld?.getCollisionSegments?.()||[],
    setPlayerPosition:(position,context)=>getArenaRuntime()?.setArcanaPlayerPosition?.(position,context),
    setPlayerInvulnerable:(value,context)=>getArenaRuntime()?.setArcanaPlayerInvulnerable?.(value,context),
    setPlayerAirborne:(value,context)=>getArenaRuntime()?.setArcanaPlayerAirborne?.(value,context),
    setPlayerHeight:(value,context)=>getArenaRuntime()?.setArcanaPlayerHeight?.(value,context),
    setEnemyCarried:(enemy,detail)=>getArenaRuntime()?.setArcanaEnemyCarried?.(enemy,detail),
  }));
  const wizardArcaneTypesRuntime=installArenaArcanaRuntime(()=>installWizardArcaneTypesRuntime({
    THREE,scene:api.scene,
    getPlayer:getPlayerTransform,
    getEnemySystem:getArenaEnemySystem,
    getMazeSegments:()=>getArenaRuntime()?.mazeWorld?.getCollisionSegments?.()||[],
    validatePosition:(position)=>getArenaRuntime()?.validateArcanaTeleportEndpoint?.(position)?.ok===true,
    applyEnemyStatus:(enemy,kind,duration,options)=>getArenaEnemySystem()?.applyStatus?.(enemy,kind,duration,options),
  }));
  const wizardAlliedArcanaRuntime=installArenaArcanaRuntime(()=>installWizardAlliedArcanaRuntime({
    THREE,scene:api.scene,
    getPlayer:getPlayerTransform,
    getEnemySystem:getArenaEnemySystem,
    getMazeSegments:()=>getArenaRuntime()?.mazeWorld?.getCollisionSegments?.()||[],
  }));
  const wizardVfxArcanaRuntime=installArenaArcanaRuntime(()=>installWizardVfxArcanaRuntime({
    THREE,scene:api.scene,
    getPlayer:getPlayerTransform,
    getEnemySystem:getArenaEnemySystem,
    getMazeSegments:()=>getArenaRuntime()?.mazeWorld?.getCollisionSegments?.()||[],
    translatePlayer:(dx,dz)=>getArenaRuntime()?.translateArcanaPlayer?.(dx,dz),
  }));

  function arcanaIdFor(card){return String(card?.arcanaId||card?.id||'').replace(/^WOL-/,'').toUpperCase();}
  function canPlayArcanaCard(card){
    const id=arcanaIdFor(card);
    if(!id||wizardFusionLeapRuntime.busy)return false;
    if(wizardArcaneTypesRuntime.state?.ballCharge&&id!=='BALL-LIGHTNING')return false;
    return true;
  }
  // The local Pilebunker layer owns the exact guided-aim startup; this wrapper
  // deliberately fails closed until that layer exposes its direct card API.
  function canPlayPilebunker(){
    return typeof PC.canPlayPilebunker==='function'&&PC.canPlayPilebunker()===true;
  }
  function playPilebunker(card,context={}){
    try{if(!enemyRegistryBridge.sync({required:true}))return false;}catch{return false;}
    return typeof PC.playPilebunker==='function'&&PC.playPilebunker(card,context)===true;
  }
  function makeArcanaHandler(runtime){
    return{
      canPlay(card,context={}){return canPlayArcanaCard(card)&&runtime?.canPlay?.(card,context)===true;},
      play(card,context={}){return canPlayArcanaCard(card)&&runtime?.play?.(card,context)===true;},
    };
  }
  const pilebunkerCardRuntime=Object.freeze({canPlay:canPlayPilebunker,play:playPilebunker});
  const runtimeHandlerTable=createRuntimeHandlerTable({
    pilebunker:pilebunkerCardRuntime,
    bloodSlash:{canPlay:()=>true,play:()=>combatEffectRuntime.playBloodSlash()},
    bingBong:{canPlay:()=>true,play:()=>true},
    wizardArcana:makeArcanaHandler(wizardArcanaRuntime),
    wizardFlameStrike:makeArcanaHandler(wizardFlameStrikeRuntime),
    wizardWindSlash:makeArcanaHandler(wizardWindSlashRuntime),
    wizardRebuiltArcana:makeArcanaHandler(wizardRebuiltArcanaRuntime),
    wizardAirBasics:makeArcanaHandler(wizardAirBasicsRuntime),
    wizardNextSource:makeArcanaHandler(wizardNextSourceRuntime),
    wizardNextTwentyBasics:makeArcanaHandler(wizardNextTwentyBasicsRuntime),
    wizardNextTwentyDash:makeArcanaHandler(wizardNextTwentyDashRuntime),
    wizardFusionLeap:makeArcanaHandler(wizardFusionLeapRuntime),
    wizardAlliedArcana:makeArcanaHandler(wizardAlliedArcanaRuntime),
    wizardArcaneTypes:makeArcanaHandler(wizardArcaneTypesRuntime),
    wizardVfxArcana:makeArcanaHandler(wizardVfxArcanaRuntime),
  });
  const cardEffectDispatcher=createEffectDispatcher({runtimeHandlers:runtimeHandlerTable});

  function releaseArcanaInput(detail={}){
    return wizardArcaneTypesRuntime.releaseBallLightning?.({...detail,phase:'release'})||false;
  }
  function interruptArcanaInput(reason='interrupted'){
    return wizardArcaneTypesRuntime.interruptBallLightning?.(reason)||false;
  }

  function resetArcanaRuntimeState({preserveResources=false}={}){
    const preserved=preserveResources?{
      dash:Object.fromEntries(Object.entries(wizardNextTwentyDashRuntime.state?.resources||{}).map(([id,value])=>[id,{...value}])),
      fusion:Object.fromEntries(Object.entries(wizardFusionLeapRuntime.state?.resources||{}).map(([id,value])=>[id,{...value}])),
      arcaneTypes:{cooldowns:{...(wizardArcaneTypesRuntime.state?.cooldowns||{})},aquaCharges:Number(wizardArcaneTypesRuntime.state?.aquaCharges)||0,aquaChargeProgress:Number(wizardArcaneTypesRuntime.state?.aquaChargeProgress)||0},
      alliedCooldowns:Object.fromEntries(wizardAlliedArcanaRuntime.cooldowns||[]),
    }:null;
    // Cancel shared locomotion before disposing path-bound payloads.
    basicDashRuntime.reset?.();
    dashMagicJet.clear?.();
    wizardNextTwentyBasicsRuntime.reset?.();
    wizardNextTwentyDashRuntime.reset?.();
    wizardFusionLeapRuntime.reset?.();
    wizardArcaneTypesRuntime.reset?.();
    wizardAlliedArcanaRuntime.reset?.();
    wizardVfxArcanaRuntime.reset?.();
    if(preserved?.dash&&wizardNextTwentyDashRuntime.state){
      wizardNextTwentyDashRuntime.state.resources=Object.fromEntries(
        Object.entries(preserved.dash).map(([id,value])=>[id,{...value}]),
      );
    }
    if(preserved?.fusion&&wizardFusionLeapRuntime.state)wizardFusionLeapRuntime.state.resources=Object.fromEntries(Object.entries(preserved.fusion).map(([id,value])=>[id,{...value}]));
    if(preserved?.arcaneTypes&&wizardArcaneTypesRuntime.state){
      wizardArcaneTypesRuntime.state.cooldowns={...preserved.arcaneTypes.cooldowns};
      wizardArcaneTypesRuntime.state.aquaCharges=preserved.arcanaTypes?.aquaCharges??preserved.arcaneTypes.aquaCharges;
      wizardArcaneTypesRuntime.state.aquaChargeProgress=preserved.arcanaTypes?.aquaChargeProgress??preserved.arcaneTypes.aquaChargeProgress;
    }
    if(preserved?.alliedCooldowns){wizardAlliedArcanaRuntime.cooldowns.clear();for(const [id,value] of Object.entries(preserved.alliedCooldowns))wizardAlliedArcanaRuntime.cooldowns.set(id,value);}
    return{preservedResources:!!preserved};
  }

  const updateMainCombat=PC.updateCombat;
  PC.updateCombat=function(dt,now,sway,rawDt=dt){
    enemyRegistryBridge.sync();
    syncArcanaDamageInterceptor();
    basicDashRuntime.update(dt);
    dashMagicJet.update(dt,now,rawDt);
    const out=updateMainCombat(dt,now,sway,rawDt);
    combatEffectRuntime.update(dt,now);
    wizardArcanaDamageScaler.update();
    wizardArcanaRuntime.update(dt,now);
    wizardRebuiltArcanaRuntime.update(dt,now);
    wizardFlameStrikeRuntime.update(dt,now);
    wizardWindSlashRuntime.update(dt,now);
    wizardAirBasicsRuntime.update(dt,now);
    wizardNextSourceRuntime.update(dt,now);
    wizardNextTwentyBasicsRuntime.update(dt,now);
    wizardNextTwentyDashRuntime.update(dt,now);
    wizardFusionLeapRuntime.update(dt,now);
    wizardArcaneTypesRuntime.update(dt,now);
    wizardAlliedArcanaRuntime.update(dt,now);
    wizardVfxArcanaRuntime.update(dt,now);
    return out;
  };

  Object.defineProperty(PC,'basicDashRuntime',{value:basicDashRuntime,enumerable:true});
  Object.defineProperty(PC,'dashMagicJet',{value:dashMagicJet,enumerable:true});
  Object.defineProperty(PC,'pilebunkerEnemyRegistryBridge',{value:enemyRegistryBridge,enumerable:true});
  Object.defineProperty(PC,'pilebunkerCardRuntime',{value:pilebunkerCardRuntime,enumerable:true});
  Object.defineProperty(PC,'combatEffectRuntime',{value:combatEffectRuntime,enumerable:true});
  Object.defineProperty(PC,'runtimeHandlerTable',{value:runtimeHandlerTable,enumerable:true});
  Object.defineProperty(PC,'cardEffectDispatcher',{value:cardEffectDispatcher,enumerable:true});
  Object.defineProperty(PC,'wizardArcanaDamageScaler',{value:wizardArcanaDamageScaler,enumerable:true});
  Object.defineProperty(PC,'wizardArcanaRuntime',{value:wizardArcanaRuntime,enumerable:true});
  Object.defineProperty(PC,'wizardRebuiltArcanaRuntime',{value:wizardRebuiltArcanaRuntime,enumerable:true});
  Object.defineProperty(PC,'wizardFlameStrikeRuntime',{value:wizardFlameStrikeRuntime,enumerable:true});
  Object.defineProperty(PC,'wizardWindSlashRuntime',{value:wizardWindSlashRuntime,enumerable:true});
  Object.defineProperty(PC,'wizardAirBasicsRuntime',{value:wizardAirBasicsRuntime,enumerable:true});
  Object.defineProperty(PC,'wizardNextSourceRuntime',{value:wizardNextSourceRuntime,enumerable:true});
  Object.defineProperty(PC,'wizardNextTwentyBasicsRuntime',{value:wizardNextTwentyBasicsRuntime,enumerable:true});
  Object.defineProperty(PC,'wizardNextTwentyDashRuntime',{value:wizardNextTwentyDashRuntime,enumerable:true});
  Object.defineProperty(PC,'wizardFusionLeapRuntime',{value:wizardFusionLeapRuntime,enumerable:true});
  Object.defineProperty(PC,'wizardArcaneTypesRuntime',{value:wizardArcaneTypesRuntime,enumerable:true});
  Object.defineProperty(PC,'wizardAlliedArcanaRuntime',{value:wizardAlliedArcanaRuntime,enumerable:true});
  Object.defineProperty(PC,'wizardVfxArcanaRuntime',{value:wizardVfxArcanaRuntime,enumerable:true});
  Object.defineProperty(PC,'releaseArcanaInput',{value:releaseArcanaInput,enumerable:true});
  Object.defineProperty(PC,'interruptArcanaInput',{value:interruptArcanaInput,enumerable:true});
  Object.defineProperty(PC,'resetArcanaRuntimeState',{value:resetArcanaRuntimeState,enumerable:true});
  // Compatibility aliases retained for existing branch debug callers.
  Object.defineProperty(PC,'combatCardEffects',{value:combatEffectRuntime,enumerable:true});
  Object.defineProperty(PC,'combatSwingInstances',{value:{state:combatEffectRuntime.state,update(){},isCurrentBoosted:combatEffectRuntime.isBloodSlashEmpowered},enumerable:true});
  Object.defineProperty(PC,'bloodSlashStatus',{value:{state:combatEffectRuntime.state,entries:combatEffectRuntime.state.bleeds,update(){},reset(){}},enumerable:true});
  return PC;
}
