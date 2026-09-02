// Shared 2.5D presentation layer for authored 2D enemies.
//
// Each enemy is a real Three.js Sprite, so the renderer's depth buffer—not a
// hand-maintained screen-space sort—decides whether it is in front of or behind
// the Warden and world geometry. Definitions provide artwork and sizing while
// this layer owns the common lifecycle and depth-safe material contract.

const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;

function defaultCanvasFactory(width,height){
  const canvas=globalThis.document?.createElement?.('canvas');
  if(!canvas)return null;
  canvas.width=width;canvas.height=height;
  return canvas;
}

function enemyKey(enemy){
  const key=enemy?.wizardStableId??enemy?.id;
  return key===undefined||key===null||key===''?null:String(key);
}

function stableUnit(value){
  let hash=2166136261;
  for(const character of String(value)){hash^=character.charCodeAt(0);hash=Math.imul(hash,16777619);}
  return (hash>>>0)/4294967296;
}

export function createWorldSpriteEnemyLayer({
  THREE,
  parent,
  definitions=[],
  createCanvas=defaultCanvasFactory,
  maxTextureUpdatesPerSecond=720,
  minimumFrameRate=8,
}={}){
  if(!THREE?.Group||!THREE?.CanvasTexture||!THREE?.SpriteMaterial||!THREE?.Sprite){
    throw new TypeError('createWorldSpriteEnemyLayer requires the Three.js sprite APIs.');
  }
  if(!parent?.add)throw new TypeError('createWorldSpriteEnemyLayer requires a Three.js parent.');

  const root=new THREE.Group();
  root.name='World-space sprite enemies';
  parent.add(root);
  const live=new Map();

  function removeInstance(key){
    const instance=live.get(key);
    if(!instance)return;
    root.remove(instance.sprite);
    instance.material.dispose?.();
    instance.texture.dispose?.();
    live.delete(key);
  }

  function makeInstance(key,definition){
    const width=Math.max(1,Math.round(finite(definition.canvasSize?.width,128)));
    const height=Math.max(1,Math.round(finite(definition.canvasSize?.height,128)));
    const canvas=createCanvas(width,height);
    if(!canvas)return null;
    canvas.width=width;canvas.height=height;
    const context=canvas.getContext?.('2d');
    if(!context)return null;
    const texture=new THREE.CanvasTexture(canvas);
    if('colorSpace' in texture&&THREE.SRGBColorSpace)texture.colorSpace=THREE.SRGBColorSpace;
    if('generateMipmaps' in texture)texture.generateMipmaps=false;
    if(THREE.LinearFilter){texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;}
    const material=new THREE.SpriteMaterial({
      map:texture,
      color:0xffffff,
      transparent:true,
      alphaTest:finite(definition.alphaTest,.035),
      depthTest:true,
      depthWrite:true,
      toneMapped:false,
    });
    const sprite=new THREE.Sprite(material);
    sprite.name=`${definition.id||'2d'} world sprite`;
    sprite.center?.set?.(
      finite(definition.anchor?.x,.5),
      finite(definition.anchor?.y,0),
    );
    sprite.userData={...(sprite.userData||{}),worldSpriteEnemy:true,spriteDefinitionId:definition.id||'2d',enemyId:key};
    root.add(sprite);
    const instance={definition,canvas,context,texture,material,sprite,hasFrame:false,lastDrawAt:-Infinity};
    live.set(key,instance);
    return instance;
  }

  function update({enemies=[],now=0}={}){
    const seen=new Set();
    const entries=[];
    const definitionCounts=new Map();
    for(const enemy of enemies||[]){
      const definition=definitions.find(candidate=>candidate?.matches?.(enemy));
      if(!definition||finite(enemy?.hp,1)<=0)continue;
      const key=enemyKey(enemy);
      if(key===null)continue;
      entries.push({enemy,definition,key});
      definitionCounts.set(definition,(definitionCounts.get(definition)||0)+1);
    }
    for(const {enemy,definition,key} of entries){
      seen.add(key);
      let instance=live.get(key);
      if(instance&&instance.definition!==definition){removeInstance(key);instance=null;}
      instance??=makeInstance(key,definition);
      if(!instance)continue;

      const crowdSize=definitionCounts.get(definition)||1;
      const authoredFrameRate=Math.max(1,finite(definition.frameRate,60));
      const updateBudget=Math.max(1,finite(definition.maxTextureUpdatesPerSecond,maxTextureUpdatesPerSecond));
      const frameFloor=Math.max(1,finite(definition.minimumFrameRate,minimumFrameRate));
      const frameRate=Math.min(authoredFrameRate,Math.max(frameFloor,updateBudget/crowdSize));
      const frameInterval=1000/frameRate;
      if(!instance.hasFrame||now<instance.lastDrawAt||now-instance.lastDrawAt>=frameInterval){
        definition.drawFrame?.(instance.context,{
          enemy,
          now,
          width:instance.canvas.width,
          height:instance.canvas.height,
        });
        instance.texture.needsUpdate=true;
        instance.hasFrame=true;
        // First frames upload immediately; crowded follow-up uploads are spread
        // across the interval so large Enemy Lab packs do not spike together.
        instance.lastDrawAt=instance.lastDrawAt===-Infinity&&crowdSize>1
          ?now-stableUnit(key)*frameInterval
          :now;
      }
      const size=definition.worldSize?.(enemy)||{};
      const groundY=enemy.worldSpriteGroundY===undefined
        ? .035+finite(enemy.yOff)+finite(enemy.rootLift)+finite(enemy.wizardAirborneOffset)
        :finite(enemy.worldSpriteGroundY,.035);
      instance.sprite.position.set(
        finite(enemy.x),
        groundY,
        finite(enemy.z),
      );
      instance.sprite.scale.set(
        Math.max(.01,finite(size.width,1)),
        Math.max(.01,finite(size.height,1)),
        1,
      );
      instance.sprite.visible=true;
    }
    for(const key of [...live.keys()])if(!seen.has(key))removeInstance(key);
    return live.size;
  }

  function destroy(){
    for(const key of [...live.keys()])removeInstance(key);
    parent.remove?.(root);
  }

  return Object.freeze({root,update,destroy,getSprite:key=>live.get(String(key))?.sprite||null});
}
