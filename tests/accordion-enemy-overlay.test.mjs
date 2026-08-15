import assert from 'node:assert/strict';
import {
  ACCORDION_ENEMY_PART_URLS,
  createAccordionEnemyOverlay,
} from '../src/accordion-enemy-overlay.js';

const calls = { drawImage:0, clearRect:0 };
const context = {
  setTransform(){}, clearRect(){ calls.clearRect++; }, save(){}, restore(){},
  translate(){}, scale(){}, rotate(){}, drawImage(){ calls.drawImage++; },
  beginPath(){}, ellipse(){}, fill(){}, arc(){}, stroke(){}, fillRect(){},
};
const canvas = {
  style:{}, width:0, height:0,
  getContext:()=>context,
  setAttribute(){},
  remove(){},
};
class FakeImage {
  constructor(){ this.complete=true; this.naturalWidth=100; this.naturalHeight=120; }
}

const overlay = createAccordionEnemyOverlay({
  canvas,
  ImageCtor:FakeImage,
  getViewport:()=>({width:320,height:240,dpr:1}),
  projectWorldToScreen:({x,y,z})=>({x:160+x*12,y:210-y*18-z*2,depth:z}),
});
assert.ok(overlay);
assert.equal(Object.keys(ACCORDION_ENEMY_PART_URLS).length,5);
assert.ok(ACCORDION_ENEMY_PART_URLS.body.endsWith('/media/accordion-enemies/body.png'));

overlay.render({now:100,enemies:[{
  accordion2d:true,hp:20,maxHp:30,x:0,z:0,height:3.55,visualScale:1,
  speed:3.5,maxGroundSpeed:3.5,drawVx:1,drawVz:0,animPhase:0,animSeed:0,
  animAttackT:99,animAttackSide:1,state:'idle',radius:.86,
}]});
assert.equal(calls.clearRect,1);
assert.equal(calls.drawImage,5,'the hybrid overlay draws all five asymmetric puppet parts');
overlay.destroy();

console.log('Accordion 2D hybrid overlay projection and asset contract: ok');
