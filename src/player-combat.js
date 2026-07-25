// Merge-forward integration wrapper. The complete current-main combat module
// keeps Pilebunker defaults, vertical melee aim, and the approved weapon core;
// this layer adds the centralized Blood Slash / Bing Bong effect runtime.
//
// The pinned module has its own relative-import module graph, including its own
// arena-enemy registry instance. Bridge the local router into that registry so
// Pilebunker sees and damages the same enemies rendered by this branch.

import { installPlayerCombat as installMainPlayerCombat } from 'https://cdn.jsdelivr.net/gh/nigh3252-prog/Top-Down-Shooter-with-Controller-@091c4b7afd3667fe2851de83912c873e200d1d9c/src/player-combat.js';
import { setArenaEnemySource as setPinnedArenaEnemySource } from 'https://cdn.jsdelivr.net/gh/nigh3252-prog/Top-Down-Shooter-with-Controller-@091c4b7afd3667fe2851de83912c873e200d1d9c/src/arena-enemy-registry.js';
import { getArenaEnemySystem } from './arena-enemy-registry.js';
import { createArenaEnemyRegistryBridge } from './arena-enemy-registry-bridge.js';
import { installBasicDashRuntime } from './basic-dash.js';
import { installDashMagicJet } from './dash-magic-jet.js';
import { installDashJetPanel } from './dash-magic-jet-panel.js';
import { installCombatCardEffects } from './combat-card-effects.js';
import { installWizardArcanaRuntime } from './wizard-arcana-runtime.js';
import { installWizardArcanaDamageScaler } from './wizard-arcana-damage-scaler.js';
import { installEnemyLabArcanaControlsHotfix } from './enemy-lab-arcana-controls-hotfix.js';

export function installPlayerCombat(api){
  const PC=installMainPlayerCombat(api);
  const arenaPage=/(?:^|\/)combat-arena\.html$/i.test(location.pathname)||/HEX MAZE COMBAT/i.test(document.title);
  if(!arenaPage)return PC;

  const {THREE}=api;
  const playerWorld=new THREE.Vector3();
  const playerForward=new THREE.Vector3(0,0,1);
  const identityQ=new THREE.Quaternion();
  const enemyRegistryBridge=createArenaEnemyRegistryBridge({
    getLocalSystem:getArenaEnemySystem,
    setPinnedSource:setPinnedArenaEnemySource,
  });
  const basicDashRuntime=installBasicDashRuntime(api);
  const dashMagicJet=installDashMagicJet({
    THREE,scene:api.scene,
    getDashState:()=>basicDashRuntime.state,
    getMazeSegments:()=>window.__arena?.mazeWorld?.getCollisionSegments?.()||[],
    getRoomKey:()=>window.__arena?.activeRoomId??null,
    getInterrupted:()=>{
      const handle=window.__arena;
      return !!handle&&(handle.arena?.deadT>=0||!!handle.roomTransition?.active);
    },
  });
  installDashJetPanel({runtime:dashMagicJet});
  installEnemyLabArcanaControlsHotfix();

  function getPlayerTransform(){
    const root=api.actorVisual?.parent;
    if(root?.getWorldPosition)root.getWorldPosition(playerWorld);else playerWorld.set(0,0,0);
    playerForward.set(0,0,1).applyQuaternion(api.yawQ||identityQ);
    playerForward.y=0;
    if(playerForward.lengthSq()<1e-6)playerForward.set(0,0,1);
    playerForward.normalize();
    return{x:playerWorld.x,z:playerWorld.z,forwardX:playerForward.x,forwardZ:playerForward.z};
  }

  const combatEffectRuntime=installCombatCardEffects({
    THREE,scene:api.scene,PC,hooks:api.hooks,
    getPlayer:getPlayerTransform,
    getEnemySystem:getArenaEnemySystem,
    getStance:()=>window.__arena?.arena?.stance||null,
    getMazeSegments:()=>window.__arena?.mazeWorld?.getCollisionSegments?.()||[],
  });
  const wizardArcanaDamageScaler=installWizardArcanaDamageScaler({getEnemySystem:getArenaEnemySystem});
  const wizardArcanaRuntime=installWizardArcanaRuntime({
    THREE,scene:api.scene,
    getPlayer:getPlayerTransform,
    getEnemySystem:getArenaEnemySystem,
    getMazeSegments:()=>window.__arena?.mazeWorld?.getCollisionSegments?.()||[],
  });

  // Update syncing normally establishes the bridge before the player can use a
  // card. The required play-time check prevents a visual-only Pilebunker if the
  // arena registry ever changes or fails to initialize in a future merge.
  window.addEventListener('powbunker:play',()=>enemyRegistryBridge.sync({required:true}));

  const updateMainCombat=PC.updateCombat;
  PC.updateCombat=function(dt,now,sway,rawDt=dt){
    enemyRegistryBridge.sync();
    basicDashRuntime.update(dt);
    dashMagicJet.update(dt,now,rawDt);
    const out=updateMainCombat(dt,now,sway,rawDt);
    combatEffectRuntime.update(dt,now);
    wizardArcanaDamageScaler.update();
    wizardArcanaRuntime.update(dt,now);
    return out;
  };

  Object.defineProperty(PC,'basicDashRuntime',{value:basicDashRuntime,enumerable:true});
  Object.defineProperty(PC,'dashMagicJet',{value:dashMagicJet,enumerable:true});
  Object.defineProperty(PC,'pilebunkerEnemyRegistryBridge',{value:enemyRegistryBridge,enumerable:true});
  Object.defineProperty(PC,'combatEffectRuntime',{value:combatEffectRuntime,enumerable:true});
  Object.defineProperty(PC,'wizardArcanaDamageScaler',{value:wizardArcanaDamageScaler,enumerable:true});
  Object.defineProperty(PC,'wizardArcanaRuntime',{value:wizardArcanaRuntime,enumerable:true});
  // Compatibility aliases retained for existing branch debug callers.
  Object.defineProperty(PC,'combatCardEffects',{value:combatEffectRuntime,enumerable:true});
  Object.defineProperty(PC,'combatSwingInstances',{value:{state:combatEffectRuntime.state,update(){},isCurrentBoosted:combatEffectRuntime.isBloodSlashEmpowered},enumerable:true});
  Object.defineProperty(PC,'bloodSlashStatus',{value:{state:combatEffectRuntime.state,entries:combatEffectRuntime.state.bleeds,update(){},reset(){}},enumerable:true});
  return PC;
}
