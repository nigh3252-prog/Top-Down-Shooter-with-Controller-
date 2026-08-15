// Screen-space renderer for the Accordion Lab puppet.
//
// The supplied prototype is a 2D canvas game. This module keeps its five
// asymmetric PNG parts and animation language, but anchors each puppet to a
// live 3D enemy's projected ground point. Combat, HP, windups, and collisions
// remain authoritative in the shared arena enemy system.

const ACC_SCALE = .50;
const SOURCE_HEIGHT = 84 * ACC_SCALE;
const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
const deg = value => value * Math.PI / 180;
const finite = (value,fallback=0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

const PART_URLS = Object.freeze({
  'leg left': new URL('../media/accordion-enemies/leg-left.png', import.meta.url).href,
  'leg right': new URL('../media/accordion-enemies/leg-right.png', import.meta.url).href,
  'arm left': new URL('../media/accordion-enemies/arm-left.png', import.meta.url).href,
  'arm right': new URL('../media/accordion-enemies/arm-right.png', import.meta.url).href,
  body: new URL('../media/accordion-enemies/body.png', import.meta.url).href,
});

function loadParts(ImageCtor = globalThis.Image){
  const parts={};
  if(typeof ImageCtor!=='function')return parts;
  for(const [key,src] of Object.entries(PART_URLS)){
    const image=new ImageCtor();image.decoding='async';image.src=src;parts[key]=image;
  }
  return parts;
}

export function createAccordionEnemyOverlay({
  canvas = globalThis.document?.createElement?.('canvas'),
  projectWorldToScreen,
  getViewport = () => ({width:globalThis.innerWidth||1,height:globalThis.innerHeight||1}),
  ImageCtor = globalThis.Image,
} = {}){
  if(!canvas || typeof projectWorldToScreen!=='function')return null;
  const ctx=canvas.getContext?.('2d');
  if(!ctx)return null;
  canvas.className='accordionEnemyOverlay';
  canvas.setAttribute('aria-hidden','true');
  Object.assign(canvas.style,{position:'fixed',inset:'0',width:'100%',height:'100%',zIndex:'4',pointerEvents:'none'});
  const parts=loadParts(ImageCtor);
  let viewport={width:1,height:1,dpr:1};

  function resize(){
    const next=getViewport()||{};
    const width=Math.max(1,finite(next.width,globalThis.innerWidth||1));
    const height=Math.max(1,finite(next.height,globalThis.innerHeight||1));
    const dpr=clamp(finite(next.dpr,globalThis.devicePixelRatio||1),1,2);
    if(width===viewport.width&&height===viewport.height&&dpr===viewport.dpr)return;
    viewport={width,height,dpr};
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function project(x,y,z){
    const point=projectWorldToScreen({x,y,z})||{};
    return{x:finite(point.x,-9999),y:finite(point.y,-9999),depth:finite(point.depth,finite(point.z,1))};
  }

  function drawPart(image,w,x,y,ox,oy,rot=0,tx=0,ty=0,sx=1,sy=1,scale=1){
    if(!image?.complete||!image.naturalWidth)return;
    const h=w*(image.naturalHeight/image.naturalWidth);
    ctx.save();
    ctx.translate(x+ox*w*scale,y+oy*h*scale);
    ctx.translate(tx*scale,ty*scale);
    ctx.rotate(deg(rot));
    ctx.scale(sx*scale,sy*scale);
    ctx.drawImage(image,-ox*w,-oy*h,w,h);
    ctx.restore();
  }

  function drawPuppet(enemy,screenX,screenY,scale,now){
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

    let atkAngle=0,atkPush=0,atkU=-1;
    const attackT=finite(enemy.animAttackT,99);
    if(attackT<.74){
      atkU=clamp(attackT/.74,0,1);
      const easeOut=t=>1-Math.pow(1-t,2);
      const easeOutBack=t=>1-Math.pow(1-t,3);
      const easeInOut=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
      const lerp=(a,b,t)=>a+(b-a)*t;
      if(atkU<.27){const w=easeOut(atkU/.27);atkAngle=lerp(0,-26,w);atkPush=lerp(0,-2.2,w);}
      else if(atkU<.42){const st=easeOutBack((atkU-.27)/(.42-.27));atkAngle=lerp(-26,118,st);atkPush=lerp(-2.2,5.4,st);}
      else if(atkU<.58){const h=(atkU-.42)/(.58-.42);atkAngle=lerp(118,108,h);atkPush=lerp(5.4,4.4,h);}
      else{const r=easeInOut((atkU-.58)/(1-.58));atkAngle=lerp(108,0,r);atkPush=lerp(4.4,0,r);}
    }
    const atkSide=enemy.animAttackSide||1;
    const atkLunge=atkPush*atkSide,atkTilt=atkPush*.95*atkSide;
    const swingArmL=atkSide<0?atkAngle:-atkAngle*.24;
    const swingArmR=atkSide>0?-atkAngle:atkAngle*.24;
    const armRaise=Math.max(0,atkPush)*.5;
    const legFront=atkLunge*.28,legBack=-atkLunge*.62;
    const atkLegL=atkSide<0?legFront:legBack,atkLegR=atkSide>0?legFront:legBack;

    ctx.save();
    ctx.translate(screenX,screenY-stepRise*ACC_SCALE*scale);
    ctx.scale(ACC_SCALE*scale,ACC_SCALE*scale);
    ctx.translate(-48,-84);

    ctx.save();
    ctx.globalAlpha=.28;ctx.fillStyle='#000';ctx.beginPath();
    ctx.ellipse(48+(-sideSway*.3+atkLunge*.45),83,28*(1+moveAmount*.10+Math.max(0,atkPush)*.02),4.5,0,0,Math.PI*2);ctx.fill();ctx.restore();

    ctx.save();
    ctx.translate(48,91*.72);ctx.translate(sideSway+atkLunge,0);ctx.rotate(deg(travelTilt+gaitTilt+atkTilt));ctx.translate(-48,-91*.72);
    drawPart(parts['leg left'],19,26,53,.5,.07,-leftX*1.35-atkLegL*.9,leftX+atkLegL,-leftLift,1,1,1);
    drawPart(parts['leg right'],19,51,53,.5,.07,-rightX*1.35-atkLegR*.9,rightX+atkLegR,-rightLift,1,1,1);
    drawPart(parts['arm left'],29,0,33,.88,.07,-leftArmSwing-1.5+swingArmL,0,leftLift*.15-(atkSide<0?armRaise:0),1,1,1);
    drawPart(parts['arm right'],29,67,33,.12,.07,-rightArmSwing+1.5+swingArmR,0,rightLift*.15-(atkSide>0?armRaise:0),1,1,1);
    drawPart(parts.body,61,18,13,.5,.66,0,-sideSway*.32+atkLunge*.35,idleBreath*-.45-Math.max(0,atkPush)*.18,accordion*(1+Math.max(0,atkPush)*.012),1,1);
    ctx.restore();ctx.restore();
  }

  function drawThreatRing(enemy,ground,now){
    const edge=project(finite(enemy.x)+Math.max(.25,finite(enemy.radius,.8)*2.2),0,finite(enemy.z));
    const radius=Math.max(8,Math.abs(edge.x-ground.x));
    if(enemy.state==='windup'){
      const pulse=1+Math.sin(now/35)*.08;
      ctx.beginPath();ctx.arc(ground.x,ground.y,radius*1.55*pulse,0,Math.PI*2);
      ctx.fillStyle='rgba(255,90,70,.08)';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='rgba(255,130,110,.7)';ctx.stroke();
    }
    if(finite(enemy.stunned)>0){
      ctx.beginPath();ctx.arc(ground.x,ground.y,radius*1.55,0,Math.PI*2);
      ctx.fillStyle='rgba(180,220,255,.07)';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='rgba(180,220,255,.55)';ctx.stroke();
    }
  }

  function drawHealth(enemy,ground,bodyPx){
    const width=Math.max(22,bodyPx*.72),height=Math.max(3,bodyPx*.075),top=ground.y-bodyPx*1.12;
    ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillRect(ground.x-width*.5,top,width,height);
    ctx.fillStyle=finite(enemy.flash)>0?'#fff':'#e37a72';
    ctx.fillRect(ground.x-width*.5,top,width*clamp(finite(enemy.hp)/Math.max(1,finite(enemy.maxHp)),0,1),height);
  }

  function render({enemies=[],now=performance.now()}={}){
    resize();
    ctx.clearRect(0,0,viewport.width,viewport.height);
    const visible=[];
    for(const enemy of enemies||[]){
      if(!enemy?.accordion2d||finite(enemy.hp)<=0)continue;
      const ground=project(finite(enemy.x),0,finite(enemy.z));
      const top=project(finite(enemy.x),finite(enemy.height,3.5)*Math.max(1,finite(enemy.visualScale,1))*1.5,finite(enemy.z));
      const bodyPx=Math.max(18,Math.abs(top.y-ground.y));
      if(ground.x<-120||ground.x>viewport.width+120||ground.y<-160||ground.y>viewport.height+160)continue;
      visible.push({enemy,ground,bodyPx,depth:ground.depth});
    }
    visible.sort((a,b)=>b.depth-a.depth);
    for(const item of visible){
      const {enemy,ground,bodyPx}=item;
      drawThreatRing(enemy,ground,now);
      drawPuppet(enemy,ground.x,ground.y,bodyPx/SOURCE_HEIGHT,now);
      drawHealth(enemy,ground,bodyPx);
    }
  }

  resize();
  return Object.freeze({canvas,resize,render,destroy(){canvas.remove?.();}});
}

export { PART_URLS as ACCORDION_ENEMY_PART_URLS };
