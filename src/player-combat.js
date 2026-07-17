// Merge-forward integration wrapper. The complete current-main combat module
// keeps Pilebunker defaults, vertical melee aim, and the approved weapon core;
// this layer adds the centralized Blood Slash / Bing Bong effect runtime.

import { installPlayerCombat as installMainPlayerCombat } from 'https://cdn.jsdelivr.net/gh/nigh3252-prog/Top-Down-Shooter-with-Controller-@091c4b7afd3667fe2851de83912c873e200d1d9c/src/player-combat.js';
import { getArenaEnemySystem } from './arena-enemy-registry.js';
import { installCombatCardEffects } from './combat-card-effects.js';

export function installPlayerCombat(api){
  const PC=installMainPlayerCombat(api);
  const arenaPage=/(?:^|\/)combat-arena\.html$/i.test(location.pathname)||/HEX MAZE COMBAT/i.test(document.title);
  if(!arenaPage)return PC;

  const {THREE}=api;
  const playerWorld=new THREE.Vector3();
  const playerForward=new THREE.Vector3(0,0,1);
  const identityQ=new THREE.Quaternion();

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

  const updateMainCombat=PC.updateCombat;
  PC.updateCombat=function(dt,now,sway,rawDt=dt){
    const out=updateMainCombat(dt,now,sway,rawDt);
    combatEffectRuntime.update(dt,now);
    return out;
  };

  Object.defineProperty(PC,'combatEffectRuntime',{value:combatEffectRuntime,enumerable:true});
  // Compatibility aliases retained for existing branch debug callers.
  Object.defineProperty(PC,'combatCardEffects',{value:combatEffectRuntime,enumerable:true});
  Object.defineProperty(PC,'combatSwingInstances',{value:{state:combatEffectRuntime.state,update(){},isCurrentBoosted:combatEffectRuntime.isBloodSlashEmpowered},enumerable:true});
  Object.defineProperty(PC,'bloodSlashStatus',{value:{state:combatEffectRuntime.state,entries:combatEffectRuntime.state.bleeds,update(){},reset(){}},enumerable:true});
  return PC;
}
