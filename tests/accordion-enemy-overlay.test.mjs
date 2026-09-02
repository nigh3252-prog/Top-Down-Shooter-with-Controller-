import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ACCORDION_ENEMY_PART_URLS,
  accordionEnemySpriteMetrics,
  createAccordionEnemySpriteDefinition,
} from '../src/accordion-enemy-sprite.js';
import { createWorldSpriteEnemyLayer } from '../src/world-sprite-enemy-layer.js';
import {
  WORLD_SPRITE_ENEMY_DEFINITION_IDS,
  createWorldSpriteEnemyDefinitions,
} from '../src/world-sprite-enemy-registry.js';

const calls={drawImage:0,clearRect:0,customDraw:0,materialDispose:0,textureDispose:0};
const makeContext=()=>({
  setTransform(){},clearRect(){calls.clearRect++;},save(){},restore(){},
  translate(){},scale(){},rotate(){},drawImage(){calls.drawImage++;},
  beginPath(){},ellipse(){},fill(){},arc(){},stroke(){},fillRect(){},
});
const makeCanvas=()=>({width:0,height:0,getContext:()=>makeContext()});

class FakeImage{
  constructor(){this.complete=true;this.naturalWidth=100;this.naturalHeight=120;}
}
class FakeVector{
  set(x,y,z){this.x=x;this.y=y;if(z!==undefined)this.z=z;return this;}
}
class FakeGroup{
  constructor(){this.children=[];this.name='';}
  add(...objects){for(const object of objects){object.parent=this;this.children.push(object);}}
  remove(object){this.children=this.children.filter(child=>child!==object);if(object?.parent===this)object.parent=null;}
}
class FakeCanvasTexture{
  constructor(image){this.image=image;this.needsUpdate=false;this.generateMipmaps=true;this.colorSpace='';}
  dispose(){calls.textureDispose++;}
}
class FakeSpriteMaterial{
  constructor(options){Object.assign(this,options);}
  dispose(){calls.materialDispose++;}
}
class FakeSprite{
  constructor(material){this.material=material;this.position=new FakeVector();this.scale=new FakeVector();this.center=new FakeVector();this.userData={};this.visible=true;}
}
const THREE={
  Group:FakeGroup,
  CanvasTexture:FakeCanvasTexture,
  SpriteMaterial:FakeSpriteMaterial,
  Sprite:FakeSprite,
  SRGBColorSpace:'srgb',
  LinearFilter:'linear',
};

const parent=new FakeGroup();
const accordionDefinition=createAccordionEnemySpriteDefinition({ImageCtor:FakeImage});
assert.deepEqual(WORLD_SPRITE_ENEMY_DEFINITION_IDS,['accordion2d']);
assert.deepEqual(createWorldSpriteEnemyDefinitions({ImageCtor:FakeImage}).map(definition=>definition.id),['accordion2d'],
  'all Three.js surfaces share one extensible sprite-definition registry');
const genericDefinition={
  id:'future-2d-enemy',canvasSize:{width:64,height:96},alphaTest:.08,
  matches:enemy=>enemy?.spriteKind==='future-2d-enemy',
  worldSize:()=>({width:2,height:3}),
  drawFrame:()=>{calls.customDraw++;},
};
const layer=createWorldSpriteEnemyLayer({
  THREE,parent,createCanvas:makeCanvas,definitions:[accordionDefinition,genericDefinition],
});

assert.equal(Object.keys(ACCORDION_ENEMY_PART_URLS).length,5);
assert.ok(ACCORDION_ENEMY_PART_URLS.body.endsWith('/media/accordion-enemies/body.png'));
assert.equal(parent.children[0],layer.root,'the sprite layer is a real child of the Three.js world');

const wrinkler={
  id:3,wizardStableId:'original:0003',accordion2d:true,hp:20,maxHp:30,x:1.25,z:-2.5,
  height:3.55,visualScale:1,speed:3.5,maxGroundSpeed:3.5,drawVx:1,drawVz:0,
  animPhase:0,animSeed:0,animAttackT:99,animAttackSide:1,state:'idle',radius:.86,
};
assert.equal(layer.update({now:100,enemies:[wrinkler,{id:4,hp:1,x:-1,z:2,spriteKind:'future-2d-enemy'},{hp:1,spriteKind:'future-2d-enemy'}]}),2,
  'renderer instances require stable enemy identities');
assert.equal(calls.drawImage,5,'the world sprite still composes all five asymmetric puppet parts');
assert.equal(calls.customDraw,1,'the same layer accepts another 2D enemy definition without a renderer branch');

const sprite=layer.getSprite('original:0003');
assert.ok(sprite?.userData.worldSpriteEnemy);
assert.deepEqual({x:sprite.position.x,y:sprite.position.y,z:sprite.position.z},{x:1.25,y:.035,z:-2.5});
assert.equal(sprite.center.x,.5,'the sprite is anchored at its feet');
const spriteMetrics=accordionEnemySpriteMetrics();
assert.equal(sprite.center.y,spriteMetrics.anchorY,'the puppet feet, rather than transparent canvas padding, sit on the ground');
assert.ok(sprite.scale.x>0&&sprite.scale.y>0);
assert.ok(Math.abs(sprite.scale.y*spriteMetrics.bodyCoverage-(wrinkler.height*1.5))<1e-9,
  'the visible puppet keeps the original projected world height');
assert.equal(sprite.material.transparent,true);
assert.equal(sprite.material.alphaTest,.035,'transparent background pixels are discarded before depth writes');
assert.equal(sprite.material.depthTest,true,'the Warden and world geometry can occlude the sprite');
assert.equal(sprite.material.depthWrite,true,'the sprite can occlude geometry behind it');
assert.equal(sprite.material.toneMapped,false);
assert.equal(sprite.renderOrder,undefined,'the sprite does not bypass normal scene depth with a forced render order');
layer.update({now:110,enemies:[wrinkler]});
assert.equal(calls.drawImage,5,'the puppet texture is capped below render FPS for large Enemy Lab packs');
layer.update({now:150,enemies:[wrinkler]});
assert.equal(calls.drawImage,10,'the puppet advances on its next authored sprite frame');

assert.equal(layer.update({enemies:[]}),0,'dead or removed enemies leave the world layer');
assert.equal(calls.materialDispose,2);
assert.equal(calls.textureDispose,2);
layer.destroy();
assert.equal(parent.children.length,0);

let crowdDraws=0;
const crowdParent=new FakeGroup();
const crowdLayer=createWorldSpriteEnemyLayer({
  THREE,parent:crowdParent,createCanvas:makeCanvas,
  definitions:[{...genericDefinition,drawFrame:()=>{crowdDraws++;},frameRate:24}],
});
const crowd=Array.from({length:100},(_,index)=>({id:`crowd-${index}`,hp:1,spriteKind:'future-2d-enemy'}));
crowdLayer.update({now:0,enemies:crowd});
assert.equal(crowdDraws,100,'every new sprite receives an initial texture');
crowdLayer.update({now:50,enemies:crowd});
assert.ok(crowdDraws<200,'crowded packs share a bounded, staggered texture-upload budget');
crowdLayer.destroy();

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const runtime=readFileSync(join(root,'src/arena-runtime.js'),'utf8');
const enemyBase=readFileSync(join(root,'src/arena-enemies-base.js'),'utf8');
const ecctrl=readFileSync(join(root,'tools/ecctrl-lab-source/src/ecctrl-lab.jsx'),'utf8');
assert.doesNotMatch(runtime,/createAccordionEnemyOverlay|projectWorldToScreen/,'the arena no longer paints Wrinkelers after WebGL');
assert.match(runtime,/worldSpriteEnemyLayer\.update\([\s\S]*renderer\.render\(scene, camera\)/,'sprite textures enter the scene before its normal render');
assert.match(runtime,/createWorldSpriteEnemyRuntimeBridge\(\{[\s\S]*isRuntimeRunning:\(\)=>running/,'the alternate renderer receives an explicit authoritative simulation bridge');
assert.match(runtime,/definitions:createWorldSpriteEnemyDefinitions\(\)/,'the Saturn renderer consumes the shared sprite registry');
assert.doesNotMatch(enemyBase,/if\(a\.accordion2d\) root\.visible=false/,'native world-space health and telegraph markers remain visible');
assert.match(ecctrl,/function WorldSpriteEnemyBridgeLayer/);
assert.match(ecctrl,/createWorldSpriteEnemyLayer\(\{/,'Ecctrl uses the same extensible sprite layer');
assert.match(ecctrl,/definitions: createWorldSpriteEnemyDefinitions\(\)/,'Ecctrl consumes the same sprite registry as Saturn');
assert.match(ecctrl,/enemyBridge\.step\?\.\(\{/,'Ecctrl advances the authoritative enemy state through the injected bridge');
assert.match(ecctrl,/<WorldSpriteEnemyBridgeLayer[\s\S]*enemyBridge=\{enemyBridge\}/,'the live enemies share the Warden Canvas');
assert.doesNotMatch(ecctrl,/makeWrinkelerPreview|ecctrl-preview/,'no synthetic preview enemies replace the Lab instances');
assert.equal(existsSync(join(root,'src/accordion-enemy-overlay.js')),false,'the fixed DOM overlay has been removed');

console.log('Accordion world-sprite composition, depth, lifecycle, and extensibility contract: ok');
