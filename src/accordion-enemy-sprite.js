// Renderer-agnostic artwork for The Wrinkeler.
//
// The arena and the Ecctrl experiment both feed this painter into the shared
// world-sprite layer. The painter deliberately knows nothing about cameras or
// screen coordinates: it only paints one transparent sprite frame.

const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
const deg = value => value * Math.PI / 180;
const finite = (value,fallback=0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export const ACCORDION_ENEMY_SPRITE_SIZE=Object.freeze({width:192,height:208});
const ACCORDION_SOURCE_SIZE=Object.freeze({width:96,height:84});
const ACCORDION_ANIMATION_PADDING_X=10;

export function accordionEnemySpriteMetrics({
  width=ACCORDION_ENEMY_SPRITE_SIZE.width,
  height=ACCORDION_ENEMY_SPRITE_SIZE.height,
}={}){
  const artScale=Math.min(
    (width-8)/(ACCORDION_SOURCE_SIZE.width+ACCORDION_ANIMATION_PADDING_X*2),
    (height-20)/ACCORDION_SOURCE_SIZE.height,
  );
  const bodyPixelHeight=ACCORDION_SOURCE_SIZE.height*artScale;
  const footY=height-8;
  return Object.freeze({
    artScale,
    bodyPixelHeight,
    bodyCoverage:bodyPixelHeight/height,
    footY,
    anchorY:(height-footY)/height,
  });
}

export const ACCORDION_ENEMY_PART_URLS=Object.freeze({
  'leg left': new URL('../media/accordion-enemies/leg-left.png',import.meta.url).href,
  'leg right': new URL('../media/accordion-enemies/leg-right.png',import.meta.url).href,
  'arm left': new URL('../media/accordion-enemies/arm-left.png',import.meta.url).href,
  'arm right': new URL('../media/accordion-enemies/arm-right.png',import.meta.url).href,
  body: new URL('../media/accordion-enemies/body.png',import.meta.url).href,
});

export function loadAccordionEnemyParts(ImageCtor=globalThis.Image){
  const parts={};
  if(typeof ImageCtor!=='function')return parts;
  for(const [key,src] of Object.entries(ACCORDION_ENEMY_PART_URLS)){
    const image=new ImageCtor();image.decoding='async';image.src=src;parts[key]=image;
  }
  return parts;
}

function drawPart(ctx,image,w,x,y,ox,oy,rot=0,tx=0,ty=0,sx=1,sy=1){
  if(!image?.complete||!image.naturalWidth)return;
  const h=w*(image.naturalHeight/image.naturalWidth);
  ctx.save();
  ctx.translate(x+ox*w,y+oy*h);
  ctx.translate(tx,ty);
  ctx.rotate(deg(rot));
  ctx.scale(sx,sy);
  ctx.drawImage(image,-ox*w,-oy*h,w,h);
  ctx.restore();
}

export function drawAccordionEnemySpriteFrame(ctx,{
  enemy={},
  now=0,
  parts={},
  width=ACCORDION_ENEMY_SPRITE_SIZE.width,
  height=ACCORDION_ENEMY_SPRITE_SIZE.height,
}={}){
  if(!ctx)return false;
  ctx.clearRect(0,0,width,height);

  const speed=Math.max(1,finite(enemy.speed,1));
  const maxSpeed=Math.max(speed,finite(enemy.maxGroundSpeed,speed));
  const moveAmount=clamp(Math.hypot(finite(enemy.drawVx),finite(enemy.drawVz))/maxSpeed,0,1);
  const stepPhase=finite(enemy.animPhase,now*.005);
  const pL=stepPhase,pR=stepPhase+Math.PI;
  const stride=3.4*moveAmount,liftHeight=3.15*moveAmount;
  const leftX=Math.cos(pL)*stride,rightX=Math.cos(pR)*stride;
  const leftLift=Math.max(0,-Math.sin(pL))*liftHeight;
  const rightLift=Math.max(0,-Math.sin(pR))*liftHeight;
  const stepRise=Math.abs(Math.sin(stepPhase))*1.55*moveAmount;
  const idleBreath=Math.sin(now*.0024+finite(enemy.animSeed));
  const accordion=1+idleBreath*.018+Math.sin(stepPhase*2)*.012*moveAmount;
  const sideSway=Math.sin(stepPhase)*1.15*moveAmount;
  const gaitTilt=Math.sin(stepPhase)*1.8*moveAmount;
  const travelTilt=clamp(finite(enemy.drawVx)/speed,-1,1)*1.6;
  const armLag=.42;
  const leftArmSwing=Math.sin(stepPhase-armLag)*6.2*moveAmount;
  const rightArmSwing=Math.sin(stepPhase+Math.PI-armLag)*6.2*moveAmount;

  let atkAngle=0,atkPush=0;
  const attackT=finite(enemy.animAttackT,99);
  if(attackT<.74){
    const atkU=clamp(attackT/.74,0,1);
    const easeOut=t=>1-Math.pow(1-t,2);
    const easeOutBack=t=>1-Math.pow(1-t,3);
    const easeInOut=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
    const lerp=(a,b,t)=>a+(b-a)*t;
    if(atkU<.27){const w=easeOut(atkU/.27);atkAngle=lerp(0,-26,w);atkPush=lerp(0,-2.2,w);}
    else if(atkU<.42){const st=easeOutBack((atkU-.27)/(.42-.27));atkAngle=lerp(-26,118,st);atkPush=lerp(-2.2,5.4,st);}
    else if(atkU<.58){const hold=(atkU-.42)/(.58-.42);atkAngle=lerp(118,108,hold);atkPush=lerp(5.4,4.4,hold);}
    else{const recover=easeInOut((atkU-.58)/(1-.58));atkAngle=lerp(108,0,recover);atkPush=lerp(4.4,0,recover);}
  }
  const atkSide=enemy.animAttackSide||1;
  const atkLunge=atkPush*atkSide,atkTilt=atkPush*.95*atkSide;
  const swingArmL=atkSide<0?atkAngle:-atkAngle*.24;
  const swingArmR=atkSide>0?-atkAngle:atkAngle*.24;
  const armRaise=Math.max(0,atkPush)*.5;
  const legFront=atkLunge*.28,legBack=-atkLunge*.62;
  const atkLegL=atkSide<0?legFront:legBack,atkLegR=atkSide>0?legFront:legBack;

  const {artScale,bodyPixelHeight,footY}=accordionEnemySpriteMetrics({width,height});
  ctx.save();
  ctx.translate(width*.5,footY-stepRise*artScale);
  ctx.scale(artScale,artScale);
  ctx.translate(-48,-84);

  ctx.save();
  ctx.globalAlpha=.28;ctx.fillStyle='#000';ctx.beginPath();
  ctx.ellipse(48+(-sideSway*.3+atkLunge*.45),83,28*(1+moveAmount*.10+Math.max(0,atkPush)*.02),4.5,0,0,Math.PI*2);ctx.fill();ctx.restore();

  ctx.save();
  ctx.translate(48,91*.72);ctx.translate(sideSway+atkLunge,0);ctx.rotate(deg(travelTilt+gaitTilt+atkTilt));ctx.translate(-48,-91*.72);
  drawPart(ctx,parts['leg left'],19,26,53,.5,.07,-leftX*1.35-atkLegL*.9,leftX+atkLegL,-leftLift);
  drawPart(ctx,parts['leg right'],19,51,53,.5,.07,-rightX*1.35-atkLegR*.9,rightX+atkLegR,-rightLift);
  drawPart(ctx,parts['arm left'],29,0,33,.88,.07,-leftArmSwing-1.5+swingArmL,0,leftLift*.15-(atkSide<0?armRaise:0));
  drawPart(ctx,parts['arm right'],29,67,33,.12,.07,-rightArmSwing+1.5+swingArmR,0,rightLift*.15-(atkSide>0?armRaise:0));
  drawPart(ctx,parts.body,61,18,13,.5,.66,0,-sideSway*.32+atkLunge*.35,idleBreath*-.45-Math.max(0,atkPush)*.18,accordion*(1+Math.max(0,atkPush)*.012));
  ctx.restore();ctx.restore();

  // Match the old projected puppet's health proportions while keeping the bar
  // inside the same depth-tested texture as the body.
  const barWidth=bodyPixelHeight*.72,barHeight=Math.max(4,bodyPixelHeight*.075);
  const barX=(width-barWidth)*.5,barY=Math.max(2,footY-bodyPixelHeight*1.12);
  ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillRect(barX,barY,barWidth,barHeight);
  ctx.fillStyle=finite(enemy.flash)>0?'#fff':'#e37a72';
  ctx.fillRect(barX,barY,barWidth*clamp(finite(enemy.hp)/Math.max(1,finite(enemy.maxHp,1)),0,1),barHeight);
  return true;
}

export function createAccordionEnemySpriteDefinition({ImageCtor=globalThis.Image}={}){
  const parts=loadAccordionEnemyParts(ImageCtor);
  const metrics=accordionEnemySpriteMetrics();
  return Object.freeze({
    id:'accordion2d',
    canvasSize:ACCORDION_ENEMY_SPRITE_SIZE,
    alphaTest:.035,
    frameRate:24,
    anchor:Object.freeze({x:.5,y:metrics.anchorY}),
    matches:enemy=>!!enemy?.accordion2d,
    worldSize(enemy={}){
      const visibleBodyHeight=Math.max(.25,finite(enemy.height,3.55)*Math.max(1,finite(enemy.visualScale,1))*1.5);
      const worldHeight=visibleBodyHeight/metrics.bodyCoverage;
      return{
        width:worldHeight*(ACCORDION_ENEMY_SPRITE_SIZE.width/ACCORDION_ENEMY_SPRITE_SIZE.height),
        height:worldHeight,
      };
    },
    drawFrame:(ctx,frame)=>drawAccordionEnemySpriteFrame(ctx,{...frame,parts}),
  });
}
