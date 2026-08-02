import { ARCANA_TWEAKS_EVENT, clampArcanaSize, readArcanaTweaks } from './wizard-arcana-settings.js';

const TAU=Math.PI*2;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const round=value=>Math.round((Number(value)||0)*1e9)/1e9;

export const WIZARD_FUSION_LEAP_SEMANTIC_EVENT='wizard-fusion-leap:semantic';

export const FLAME_FUSION_SPEC=Object.freeze({
  id:'FLAME-FUSION',element:'Fire',cooldown:6,arrowDelay:.32,
  fireball:Object.freeze({kind:'fireball',damage:28,burnLevel:1,speed:5.2,range:11.5,radius:.48}),
  arrow:Object.freeze({kind:'arrow',damage:10,burnLevel:1,speed:18.2,range:13.5,radius:.18}),
  fusion:Object.freeze({kind:'fusion-arrow',count:5,damage:12,burnLevel:2,speed:16.5,range:10.5,radius:.17,angles:Object.freeze([-.52,-.26,0,.26,.52])}),
});

export const HEROIC_LEAP_SPEC=Object.freeze({
  id:'HEROIC-LEAP',element:'Air',cooldown:6,rushDistance:5.6,rushDuration:.18,rushRadius:.58,
  clearance:.62,airDuration:.78,airHeight:3.2,vortexRadius:5.0,vortexDamage:5,
  vortexTickTimes:Object.freeze([.08,.20,.32,.44,.56]),landingRadius:3.2,landingDamage:25,carriedDamage:50,
});

export const FIRE_BURN_LEVELS=Object.freeze({
  1:Object.freeze({level:1,ticks:8,tickDamage:2,interval:.25}),
  2:Object.freeze({level:2,ticks:8,tickDamage:4,interval:.25}),
});

export const WIZARD_FUSION_LEAP_SPECS=Object.freeze({
  [FLAME_FUSION_SPEC.id]:FLAME_FUSION_SPEC,
  [HEROIC_LEAP_SPEC.id]:HEROIC_LEAP_SPEC,
});

export function normalizeFusionLeapVisualMode(stage='style'){
  const value=String(stage||'style').trim().toLowerCase();
  if(value==='motion'||value==='proxy'||value==='contract')return'contract';
  if(value==='reference'||value==='source')return'source';
  return'style';
}

export function createReferenceCountedLease(onChange=()=>{}){
  let serial=0;
  const entries=new Map();
  const notify=(active,detail)=>onChange?.(active,{count:entries.size,...detail});
  function acquire(reason='lease',detail={}){
    const token=`${String(reason||'lease')}:${String(++serial).padStart(4,'0')}`,wasEmpty=entries.size===0;
    entries.set(token,{reason:String(reason||'lease'),detail:{...detail}});
    if(wasEmpty)notify(true,{reason:String(reason||'lease'),token,...detail});
    let released=false;
    return()=>{
      if(released)return false;released=true;
      const entry=entries.get(token);if(!entry)return false;
      entries.delete(token);if(entries.size===0)notify(false,{reason:entry.reason,token,...entry.detail});return true;
    };
  }
  function clear(reason='clear'){
    if(!entries.size)return false;entries.clear();notify(false,{reason:String(reason||'clear'),token:null});return true;
  }
  function reset(reason='reset'){const changed=clear(reason);serial=0;return changed;}
  return Object.freeze({acquire,clear,reset,snapshot:()=>Object.freeze({active:entries.size>0,count:entries.size,tokens:Object.freeze([...entries.keys()])})});
}

export function normalizeDirection(direction,fallback={x:0,z:1}){
  const x=Number(direction?.x)||0,z=Number(direction?.z)||0,length=Math.hypot(x,z);
  if(length>1e-8)return Object.freeze({x:x/length,z:z/length});
  const fx=Number(fallback?.x)||0,fz=Number(fallback?.z)||1,fl=Math.hypot(fx,fz)||1;
  return Object.freeze({x:fx/fl,z:fz/fl});
}

export function segmentCircleFirstHit(start,end,center,radius){
  const sx=Number(start?.x)||0,sz=Number(start?.z)||0,dx=(Number(end?.x)||0)-sx,dz=(Number(end?.z)||0)-sz;
  const cx=sx-(Number(center?.x)||0),cz=sz-(Number(center?.z)||0),r=Math.max(0,Number(radius)||0),c=cx*cx+cz*cz-r*r;
  if(c<=0)return Object.freeze({t:0,x:sx,z:sz});
  const a=dx*dx+dz*dz;if(a<1e-12)return null;
  const b=2*(cx*dx+cz*dz),disc=b*b-4*a*c;if(disc<0)return null;
  const t=(-b-Math.sqrt(disc))/(2*a);if(t<0||t>1)return null;
  return Object.freeze({t,x:sx+dx*t,z:sz+dz*t});
}

export function movingCircleFirstHit(aStart,aEnd,aRadius,bStart,bEnd,bRadius){
  const relativeStart={x:(Number(aStart?.x)||0)-(Number(bStart?.x)||0),z:(Number(aStart?.z)||0)-(Number(bStart?.z)||0)};
  const relativeEnd={x:(Number(aEnd?.x)||0)-(Number(bEnd?.x)||0),z:(Number(aEnd?.z)||0)-(Number(bEnd?.z)||0)};
  const hit=segmentCircleFirstHit(relativeStart,relativeEnd,{x:0,z:0},Math.max(0,Number(aRadius)||0)+Math.max(0,Number(bRadius)||0));
  if(!hit)return null;
  const a={x:(Number(aStart?.x)||0)+((Number(aEnd?.x)||0)-(Number(aStart?.x)||0))*hit.t,z:(Number(aStart?.z)||0)+((Number(aEnd?.z)||0)-(Number(aStart?.z)||0))*hit.t};
  const b={x:(Number(bStart?.x)||0)+((Number(bEnd?.x)||0)-(Number(bStart?.x)||0))*hit.t,z:(Number(bStart?.z)||0)+((Number(bEnd?.z)||0)-(Number(bStart?.z)||0))*hit.t};
  return Object.freeze({t:hit.t,x:(a.x+b.x)/2,z:(a.z+b.z)/2,a:Object.freeze(a),b:Object.freeze(b)});
}

function segmentIntersection2D(a,b,c,d){
  const rx=b.x-a.x,rz=b.z-a.z,sx=d.x-c.x,sz=d.z-c.z,cross=rx*sz-rz*sx;if(Math.abs(cross)<1e-10)return null;
  const qx=c.x-a.x,qz=c.z-a.z,t=(qx*sz-qz*sx)/cross,u=(qx*rz-qz*rx)/cross;
  return t>=0&&t<=1&&u>=0&&u<=1?{t,u,x:a.x+rx*t,z:a.z+rz*t}:null;
}

function firstWallHit(start,end,walls=[]){
  let best=null;for(let index=0;index<walls.length;index++){const wall=walls[index];if(!wall?.a||!wall?.b)continue;const hit=segmentIntersection2D(start,end,wall.a,wall.b);if(hit&&(!best||hit.t<best.hit.t-1e-9||Math.abs(hit.t-best.hit.t)<=1e-9&&index<best.index))best={wall,hit,index};}return best;
}

function carrierWallBlock(start,end,walls=[],radius=0){
  const dx=end.x-start.x,dz=end.z-start.z,distance=Math.hypot(dx,dz);if(distance<1e-10)return null;
  const clearance=Math.max(0,Number(radius)||0),probeDistance=distance+clearance,direction={x:dx/distance,z:dz/distance},probeEnd={x:start.x+direction.x*probeDistance,z:start.z+direction.z*probeDistance},wall=firstWallHit(start,probeEnd,walls);if(!wall)return null;
  const resolvedDistance=clamp(probeDistance*wall.hit.t-clearance,0,distance),t=resolvedDistance/distance;
  return{type:'wall',t,hit:{t,x:start.x+dx*t,z:start.z+dz*t},wallHit:{x:wall.hit.x,z:wall.hit.z},wall};
}

function pointSegmentDistance(point,a,b){
  const dx=b.x-a.x,dz=b.z-a.z,denom=dx*dx+dz*dz,t=denom>1e-10?clamp(((point.x-a.x)*dx+(point.z-a.z)*dz)/denom,0,1):0;
  return Math.hypot(point.x-(a.x+dx*t),point.z-(a.z+dz*t));
}

export function resolveHeroicLeapRush({origin={x:0,z:0},direction={x:0,z:1},distance=HEROIC_LEAP_SPEC.rushDistance,walls=[],clearance=HEROIC_LEAP_SPEC.clearance}={}){
  const forward=normalizeDirection(direction),travel=Math.max(0,Number(distance)||0),requested={x:(Number(origin.x)||0)+forward.x*travel,z:(Number(origin.z)||0)+forward.z*travel},wall=firstWallHit(origin,requested,walls);
  if(!wall)return Object.freeze({origin:Object.freeze({x:Number(origin.x)||0,z:Number(origin.z)||0}),requested:Object.freeze(requested),resolved:Object.freeze({...requested}),direction:forward,distance:travel,blocked:false});
  const resolvedDistance=Math.max(0,travel*wall.hit.t-Math.max(0,Number(clearance)||0)),resolved={x:(Number(origin.x)||0)+forward.x*resolvedDistance,z:(Number(origin.z)||0)+forward.z*resolvedDistance};
  return Object.freeze({origin:Object.freeze({x:Number(origin.x)||0,z:Number(origin.z)||0}),requested:Object.freeze(requested),resolved:Object.freeze(resolved),direction:forward,distance:resolvedDistance,blocked:true});
}

export function defaultHeroicLeapCarryEligible(enemy){
  if(!enemy||Number(enemy.hp)<=0)return false;
  const def=enemy.def||{},rank=String(enemy.rank||enemy.tier||enemy.classification||enemy.sizeClass||def.sizeClass||'').toLowerCase(),kind=String(enemy.kind||enemy.type||'').toLowerCase(),role=String(enemy.role||def.role||'').toLowerCase();
  if(enemy.boss===true||enemy.isBoss===true||def.boss===true||def.isBoss===true||enemy.isElite===true||def.isElite===true||enemy.large===true||enemy.isLarge===true||enemy.eliteSize==='large')return false;
  if(rank.includes('boss')||rank.includes('large')||kind.includes('boss')||role==='boss'||role==='spawner')return false;
  if(Number(enemy.targetScale)>=1.5||Number(def.targetScale)>=1.5||Number(enemy.radius)>=1.4||Number(def.radius)>=1.4)return false;
  if(enemy.knockbackImmune===true||def.knockbackImmune===true||enemy.immuneToKnockback===true||def.immuneToKnockback===true||enemy.canBeKnockedBack===false||enemy.knockbackMultiplier===0)return false;
  return true;
}

function isEnemyLabRuntime(){
  if(typeof window==='undefined')return false;
  try{const params=new URLSearchParams(globalThis.location?.search||'');if(params.get('enemyLab')==='1'||params.get('mode')==='enemy-lab')return true;return !!(window.parent&&window.parent!==window&&window.frameElement?.id==='arenaFrame'&&/(?:^|\/)enemy-lab\.html$/i.test(window.parent.location?.pathname||''));}catch{return false;}
}
function currentVisualMode(){
  try{const params=new URLSearchParams(globalThis.location?.search||'');if(params.get('capture')!=='1')return'style';const capture=window.__abilityCapture?.snapshot?.()||{},stage=capture.stage||capture.renderMode||params.get('stage')||params.get('renderMode')||'style';return normalizeFusionLeapVisualMode(stage);}catch{return'style';}
}
function playerFrame(getPlayer){const player=getPlayer?.()||{},forward=normalizeDirection({x:player.forwardX,z:player.forwardZ});return{x:Number(player.x)||0,z:Number(player.z)||0,forward};}
function aliveEnemies(system){return(system?.enemies||[]).filter(enemy=>enemy&&Number(enemy.hp)>0);}
function enemyRadius(enemy,system){return Math.max(.40,(Number(enemy?.radius)||1)*(Number(system?.heightScale)||1)*.70);}
function targetId(enemy,system){const explicit=enemy?.__abilityCaptureDummyId??enemy?.wizardStableId??enemy?.stableId??enemy?.id??enemy?.spawnId;if(explicit!==undefined&&explicit!==null)return String(explicit);return`enemy-${Math.max(0,system?.enemies?.indexOf?.(enemy)??0)}`;}
function projectileId(projectile,index=0){return String(projectile?.id??projectile?.stableId??projectile?.kind??`hostile-projectile-${index}`);}
function hostileProjectiles(system){return Array.isArray(system?.hostileProjectiles)?system.hostileProjectiles.filter(projectile=>projectile&&!projectile.dead):[];}
function destroyHostileProjectile(system,projectile){if(!projectile||projectile.dead)return false;const result=system?.destroyHostileProjectile?.(projectile);if(result===false)return false;projectile.dead=true;projectile.life=0;if(projectile.mesh)projectile.mesh.visible=false;return true;}
function disposeObject(root){if(!root)return;root.parent?.remove?.(root);root.traverse?.(object=>{object.geometry?.dispose?.();if(Array.isArray(object.material))object.material.forEach(material=>material?.dispose?.());else object.material?.dispose?.();});}

const PALETTES=Object.freeze({
  Fire:Object.freeze({deep:0x7b1c12,main:0xff5722,hot:0xffbd42,core:0xffffdf,smoke:0x372019}),
  Air:Object.freeze({deep:0x17788a,main:0x45d8e4,hot:0xa9faff,core:0xf5ffff,smoke:0x355c64}),
});
function makeMaterial(THREE,color,opacity=.86,{additive=true,wireframe=false}={}){return new THREE.MeshBasicMaterial({color,transparent:true,opacity,wireframe,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending,depthWrite:false,side:THREE.DoubleSide});}
function addMesh(THREE,group,geometry,color,opacity=.86,options={}){const mesh=new THREE.Mesh(geometry,makeMaterial(THREE,color,opacity,options));mesh.userData.baseOpacity=opacity;group.add(mesh);return mesh;}
function tag(object,key,value=true){object.userData[key]=value;return object;}
function finishVisual(scene,group,{name,position,direction={x:0,z:1},mode='style',size=1,y=0}={}){group.name=name;group.userData.visualMode=mode;group.userData.baseScale=size;group.position.set(position.x,y,position.z);group.rotation.y=Math.atan2(direction.x,direction.z);group.scale.setScalar(size);group.renderOrder=8;scene.add(group);return group;}

function makeFireProjectileVisual(THREE,scene,{kind,position,direction,mode,size=1}={}){
  const colors=PALETTES.Fire,group=new THREE.Group(),arrow=kind!=='fireball',radius=kind==='fusion-arrow'?.62:arrow?.42:1.15;
  if(arrow){
    const tip=tag(addMesh(THREE,group,new THREE.ConeGeometry(radius*.72,radius*3.8,7),colors.main,.94,{additive:false}),'arrowTip');tip.rotation.x=Math.PI/2;tip.position.z=radius*.78;
    if(mode!=='contract'){const shaft=tag(addMesh(THREE,group,new THREE.SphereGeometry(1,8,6),colors.main,.82),'arrowShaft');shaft.scale.set(radius*.25,radius*.22,radius*2.15);shaft.position.z=-radius*.78;const core=tag(addMesh(THREE,group,new THREE.ConeGeometry(radius*.30,radius*3.15,6),colors.core,.94),'arrowCore');core.rotation.x=Math.PI/2;core.position.z=radius*.72;}
    if(mode==='style')for(let index=1;index<=5;index++){const echo=tag(addMesh(THREE,group,new THREE.SphereGeometry(radius*(.46-index*.045),7,5),index%2?colors.hot:colors.main,.60-index*.07),'arrowEcho',index);echo.position.z=-radius*(1.2+index*.72);}
  }else{
    tag(addMesh(THREE,group,new THREE.SphereGeometry(radius,12,8),mode==='contract'?colors.hot:colors.main,.92,{additive:mode==='contract'}),'fireballShell');
    if(mode!=='contract'){tag(addMesh(THREE,group,new THREE.SphereGeometry(radius*.58,10,7),colors.core,.96),'fireballCore');const tail=tag(addMesh(THREE,group,new THREE.ConeGeometry(radius*.46,radius*2.3,7),colors.hot,.68),'fireballTail');tail.rotation.x=-Math.PI/2;tail.position.z=-radius*1.1;}
    if(mode==='style')for(let index=0;index<8;index++){const angle=index*TAU/8,ember=tag(addMesh(THREE,group,new THREE.SphereGeometry(radius*(.07+(index%3)*.012),6,4),index%2?colors.core:colors.hot,.76),'fireballEmber',index);ember.position.set(Math.cos(angle)*radius*.82,.12+index%2*.12,Math.sin(angle)*radius*.65-radius*.34);}
  }
  return finishVisual(scene,group,{name:`Wizard Arcana Flame Fusion ${kind} ${mode}`,position,direction,mode,size});
}

function makeFusionBurstVisual(THREE,scene,{position,direction,mode,size=1}={}){
  const colors=PALETTES.Fire,group=new THREE.Group(),layers=mode==='contract'?1:mode==='source'?3:5;
  for(let index=0;index<layers;index++){const ring=tag(addMesh(THREE,group,new THREE.RingGeometry(.14+index*.12,.32+index*.15,28),index===layers-1?colors.core:index%2?colors.hot:colors.main,.90-index*.12),'fusionRing',index);ring.rotation.x=-Math.PI/2;ring.position.y=.08+index*.025;}
  if(mode==='style')for(let index=0;index<10;index++){const angle=index*TAU/10,spark=tag(addMesh(THREE,group,new THREE.SphereGeometry(.045+(index%2)*.012,6,4),index%3?colors.hot:colors.core,.84),'fusionSpark',index);spark.position.set(Math.cos(angle)*(.45+(index%3)*.12),.18+(index%3)*.08,Math.sin(angle)*(.45+(index%3)*.12));}
  return finishVisual(scene,group,{name:`Wizard Arcana Flame Fusion transform ${mode}`,position,direction,mode,size});
}

function makeLeapVisual(THREE,scene,{position,direction,mode,size=1,kind='rush'}={}){
  const colors=PALETTES.Air,group=new THREE.Group(),vortex=kind==='vortex',layers=mode==='contract'?1:mode==='source'?5:7;
  if(vortex){
    for(let index=0;index<layers;index++){
      const radius=mode==='contract'?HEROIC_LEAP_SPEC.vortexRadius:HEROIC_LEAP_SPEC.vortexRadius-index*.46;
      const arc=mode==='contract'?TAU:TAU*(.68+(index%3)*.09);
      const ring=tag(addMesh(THREE,group,new THREE.TorusGeometry(radius,.16+index*.025,7,42,arc),index===layers-1?colors.core:index%2?colors.hot:colors.main,.88-index*.07),'vortexRing',index);
      ring.rotation.x=Math.PI/2;ring.rotation.z=index*1.17;ring.position.set((index%2?1:-1)*index*.11,.10+index*.22,(index%3-1)*.14);
    }
    if(mode!=='contract'){
      const column=tag(addMesh(THREE,group,new THREE.CylinderGeometry(1.15,4.15,2.35,20,1,true),colors.main,mode==='source'?.13:.18),'vortexColumn');
      column.position.y=1.15;
    }
  }
  else{for(let index=0;index<layers;index++){const streak=tag(addMesh(THREE,group,new THREE.SphereGeometry(1,8,6),index===layers-1?colors.core:index%2?colors.hot:colors.main,.72+index*.05),'rushStreak',index);streak.scale.set(.18+index*.07,.12+index*.04,.75+index*.30);streak.position.set((index%2?1:-1)*index*.07,.25+index*.08,-index*.30);}}
  if(mode==='style')for(let index=0;index<16;index++){const angle=index*TAU/16,node=tag(addMesh(THREE,group,new THREE.SphereGeometry(.055+(index%3)*.018,6,4),index%2?colors.hot:colors.core,.80),'airNode',index),radius=vortex?2.2+(index%4)*.72:.48;node.position.set(Math.cos(angle)*radius,.22+(index%4)*.28,Math.sin(angle)*(vortex?radius:.72));}
  return finishVisual(scene,group,{name:`Wizard Arcana Heroic Leap ${kind} ${mode}`,position,direction,mode,size});
}

function makeImpactVisual(THREE,scene,{position,mode,size=1,element='Air',kind='impact'}={}){
  const colors=PALETTES[element],group=new THREE.Group(),layers=mode==='contract'?1:mode==='source'?2:4;
  for(let index=0;index<layers;index++){const ring=tag(addMesh(THREE,group,new THREE.RingGeometry(.16+index*.16,.42+index*.22,30),index===layers-1?colors.core:index%2?colors.hot:colors.main,.86-index*.12),'impactRing',index);ring.rotation.x=-Math.PI/2;ring.position.y=.04+index*.025;}
  return finishVisual(scene,group,{name:`Wizard Arcana ${kind} ${mode}`,position,mode,size});
}

function cloneResources(resources){const result={};for(const [id,value] of Object.entries(resources))result[id]={cooldown:value.cooldown,remaining:round(value.remaining),ready:value.remaining<=1e-9};return result;}
function emptyResources(){return{
  [FLAME_FUSION_SPEC.id]:{cooldown:FLAME_FUSION_SPEC.cooldown,remaining:0},
  [HEROIC_LEAP_SPEC.id]:{cooldown:HEROIC_LEAP_SPEC.cooldown,remaining:0},
};}

export function installWizardFusionLeapRuntime({
  THREE,scene,getPlayer,getEnemySystem,getMazeSegments=()=>[],getAimDirection=null,setPlayerPosition=null,
  setPlayerInvulnerable=()=>{},setPlayerAirborne=()=>{},setPlayerHeight=()=>{},setEnemyCarried=null,
  canCarryEnemy=defaultHeroicLeapCarryEligible,enabled=isEnemyLabRuntime(),
}={}){
  const initial=readArcanaTweaks(),inertState={effects:[],resources:emptyResources(),sizeMultiplier:initial.sizeMultiplier};
  const empty=()=>({simulationTime:0,lastCast:null,visualMode:'style',activeLeap:null,invulnerability:{active:false,count:0,tokens:[]},resources:cloneResources(inertState.resources),effects:[],semanticEvents:[]});
  if(!THREE||!scene||!enabled)return{state:inertState,cast(){return false;},canCast(){return false;},canPlay(){return false;},play(){return false;},update(){},snapshot:empty,cleanup(){},reset(){},dispose(){},get busy(){return false;}};

  const state={elapsed:0,lastCast:null,visualMode:'style',sizeMultiplier:initial.sizeMultiplier,effects:[],semanticEvents:[],semanticSerial:0,castSerials:new Map(),resources:emptyResources(),activeLeap:null};
  const invulnerability=createReferenceCountedLease((active,detail)=>setPlayerInvulnerable?.(active,{source:'wizardArcana',arcanaId:HEROIC_LEAP_SPEC.id,...detail}));

  function semantic(kind,detail={}){
    const event={eventId:`FUSION-LEAP:SEMANTIC:${String(++state.semanticSerial).padStart(5,'0')}`,time:round(state.elapsed),kind,...detail};state.semanticEvents.push(event);
    try{window.dispatchEvent(new CustomEvent(WIZARD_FUSION_LEAP_SEMANTIC_EVENT,{detail:event}));}catch{}return event;
  }
  function nextCastId(id){const serial=(state.castSerials.get(id)||0)+1;state.castSerials.set(id,serial);return`${id}:${String(serial).padStart(4,'0')}`;}
  function add(effect){state.effects.push(effect);return effect;}
  function remove(effect){const index=state.effects.indexOf(effect);if(index>=0)state.effects.splice(index,1);for(const mesh of[effect?.mesh,...(effect?.meshes||[])])disposeObject(mesh);effect.mesh=null;effect.meshes=[];}
  function aimDirection(detail={},frame=playerFrame(getPlayer)){const candidate=detail.direction||detail.aimDirection||getAimDirection?.()||{x:frame.forward.x,z:frame.forward.z};return normalizeDirection(candidate,frame.forward);}
  function setPlayer(position,context={}){const player=getPlayer?.();if(setPlayerPosition)setPlayerPosition({x:position.x,z:position.z},context);else if(player){player.x=position.x;player.z=position.z;if(player.mesh?.position)player.mesh.position.set(position.x,player.mesh.position.y||0,position.z);}}
  function moveEnemy(enemy,position,height=0,context={}){if(!enemy)return;if(setEnemyCarried)setEnemyCarried(enemy,{active:true,x:position.x,z:position.z,height,...context});else{enemy.x=position.x;enemy.z=position.z;enemy.__heroicLeapCarried=true;enemy.wizardAirborneOffset=height;}}
  function releaseEnemy(enemy,context={}){if(!enemy)return;if(setEnemyCarried)setEnemyCarried(enemy,{active:false,x:Number(enemy.x)||0,z:Number(enemy.z)||0,height:0,...context});else{delete enemy.__heroicLeapCarried;delete enemy.wizardAirborneOffset;}}
  function dealDamage(system,enemy,amount,knock={x:0,z:0},options={}){
    const{allowDefeatedTarget=false,...damageOptions}=options;if(!system||!enemy||(!allowDefeatedTarget&&Number(enemy.hp)<=0))return false;
    const before=Number(enemy.hp),killed=system.damageEnemy?.(enemy,amount,knock,{source:'wizardArcana',power:.36,pop:.06,...damageOptions});
    // Arena enemy systems return whether the hit killed, not whether damage was
    // accepted. Preserve that contract while still recognizing nonlethal hits.
    return killed===true||Number(enemy.hp)<before;
  }
  function hasLineOfSight(origin,target){const wall=firstWallHit(origin,target,getMazeSegments?.()||[]);return !wall||wall.hit.t>=1-1e-7;}
  function currentSize(){return clampArcanaSize(state.sizeMultiplier);}
  function canCast(card){const id=String(card?.arcanaId||card?.id||card||'').replace(/^WOL-/,'');if(!WIZARD_FUSION_LEAP_SPECS[id])return false;if(state.resources[id].remaining>1e-9)return false;if(id===HEROIC_LEAP_SPEC.id&&state.activeLeap)return false;return true;}

  function addBurn(enemy,level,castStable,parentStable){
    const spec=FIRE_BURN_LEVELS[level];if(!spec||!enemy||Number(enemy.hp)<=0)return null;
    const existing=state.effects.filter(effect=>effect.type==='fusionBurn'&&effect.parentStable===parentStable).length,stableId=`${parentStable}:burn:${String(existing+1).padStart(2,'0')}`;
    add({type:'fusionBurn',arcanaId:FLAME_FUSION_SPEC.id,stableId,parentStable,castStable,target:enemy,targetId:targetId(enemy,getEnemySystem?.()),level,age:0,nextTick:spec.interval,ticksRemaining:spec.ticks,tickSerial:0,spec});
    semantic('burn-applied',{arcanaId:FLAME_FUSION_SPEC.id,stableId,parentStable,targetId:targetId(enemy,getEnemySystem?.()),level,ticks:spec.ticks,tickDamage:spec.tickDamage,interval:spec.interval});return stableId;
  }
  function spawnFlameProjectile({kind,castStable,origin,direction,index=1,visualMode=state.visualMode,size=currentSize()}){
    const spec=kind==='fireball'?FLAME_FUSION_SPEC.fireball:kind==='arrow'?FLAME_FUSION_SPEC.arrow:FLAME_FUSION_SPEC.fusion,stableId=`${castStable}:${kind}:${String(index).padStart(2,'0')}`,mesh=makeFireProjectileVisual(THREE,scene,{kind,position:origin,direction,mode:visualMode,size});
    const effect=add({type:'flameProjectile',semanticKind:kind,arcanaId:FLAME_FUSION_SPEC.id,stableId,castStable,age:0,distance:0,position:{...origin},previous:{...origin},direction:{...direction},velocity:{x:direction.x*spec.speed,z:direction.z*spec.speed},spec,size,visualMode,mesh});
    semantic('flame-projectile-emitted',{arcanaId:effect.arcanaId,stableId,castStable,projectileKind:kind,origin:{...origin},direction:{...direction},damage:spec.damage,burnLevel:spec.burnLevel,visualMode});return effect;
  }
  function castFlameFusion(detail={}){
    const id=FLAME_FUSION_SPEC.id,frame=playerFrame(getPlayer),direction=aimDirection(detail,frame),castStable=nextCastId(id),visualMode=currentVisualMode(),size=currentSize();
    state.resources[id].remaining=FLAME_FUSION_SPEC.cooldown;state.lastCast=id;state.visualMode=visualMode;
    spawnFlameProjectile({kind:'fireball',castStable,origin:{x:frame.x,z:frame.z},direction,visualMode,size});
    add({type:'flameFusionSequence',arcanaId:id,stableId:`${castStable}:sequence`,castStable,age:0,delay:FLAME_FUSION_SPEC.arrowDelay,emitted:false,visualMode,size});
    semantic('flame-fusion-cast',{arcanaId:id,stableId:castStable,firstAim:{...direction},arrowDelay:FLAME_FUSION_SPEC.arrowDelay,cooldown:FLAME_FUSION_SPEC.cooldown});return true;
  }

  function selectCarryContact(origin,end,system,size=1){
    const candidates=[];for(const enemy of aliveEnemies(system)){if(!canCarryEnemy?.(enemy)||!hasLineOfSight(origin,enemy))continue;const hit=segmentCircleFirstHit(origin,end,enemy,HEROIC_LEAP_SPEC.rushRadius*size+enemyRadius(enemy,system));if(hit)candidates.push({enemy,hit,id:targetId(enemy,system)});}
    candidates.sort((a,b)=>a.hit.t-b.hit.t||a.id.localeCompare(b.id));return candidates[0]||null;
  }
  function acquireCarryOnRush(action,start,end){
    if(action.carryTarget)return action.carryTarget;const system=getEnemySystem?.(),contact=selectCarryContact(start,end,system,action.size);if(!contact)return null;
    action.carryTarget=contact.enemy;action.carryTargetId=contact.id;action.carryContact={x:contact.hit.x,z:contact.hit.z};
    semantic('heroic-leap-carry-contact',{arcanaId:action.arcanaId,stableId:`${action.castStable}:carry-contact`,actionStableId:action.stableId,targetId:contact.id,position:{...action.carryContact},rushProgress:round(action.age/action.life)});return contact.enemy;
  }
  function castHeroicLeap(detail={}){
    const id=HEROIC_LEAP_SPEC.id,frame=playerFrame(getPlayer),direction=aimDirection(detail,frame),resolution=resolveHeroicLeapRush({origin:{x:frame.x,z:frame.z},direction,distance:HEROIC_LEAP_SPEC.rushDistance,walls:getMazeSegments?.()||[],clearance:HEROIC_LEAP_SPEC.clearance}),castStable=nextCastId(id),visualMode=currentVisualMode(),size=currentSize(),stableId=`${castStable}:action`;
    state.resources[id].remaining=HEROIC_LEAP_SPEC.cooldown;state.lastCast=id;state.visualMode=visualMode;
    const action=add({type:'heroicLeapAction',semanticKind:'rush',arcanaId:id,stableId,castStable,phase:'rush',age:0,life:HEROIC_LEAP_SPEC.rushDuration,origin:{...resolution.origin},position:{...resolution.origin},endpoint:{...resolution.resolved},direction:{...direction},blocked:resolution.blocked,carryTarget:null,carryTargetId:null,carryContact:null,carried:false,releaseInvulnerability:null,visualMode,size,mesh:makeLeapVisual(THREE,scene,{position:resolution.origin,direction,mode:visualMode,size,kind:'rush'})});
    state.activeLeap=action;semantic('heroic-leap-rush-started',{arcanaId:id,stableId:castStable,actionStableId:stableId,origin:{...resolution.origin},requested:{...resolution.requested},endpoint:{...resolution.resolved},direction:{...direction},blocked:resolution.blocked,carryCandidateId:action.carryTargetId,cooldown:HEROIC_LEAP_SPEC.cooldown});return true;
  }
  function cast(card,detail={}){const id=String(card?.arcanaId||card?.id||'').replace(/^WOL-/,'');if(!canCast(id))return false;if(id===FLAME_FUSION_SPEC.id)return castFlameFusion(detail);if(id===HEROIC_LEAP_SPEC.id)return castHeroicLeap(detail);return false;}
  function canPlay(card,context={}){return canCast(card?.arcanaId||card,context);}
  function play(card,context={}){return canPlay(card,context)?cast(card,context):false;}

  function planProjectile(effect,dt){
    const remaining=Math.max(0,effect.spec.range-effect.distance),requested=Math.min(effect.spec.speed*dt,remaining),start={...effect.position},end={x:start.x+effect.direction.x*requested,z:start.z+effect.direction.z*requested},system=getEnemySystem?.();let block=null;
    const wall=carrierWallBlock(start,end,getMazeSegments?.()||[],effect.spec.radius*effect.size);if(wall)block=wall;
    for(const enemy of aliveEnemies(system)){if(!hasLineOfSight(start,enemy))continue;const hit=segmentCircleFirstHit(start,end,enemy,effect.spec.radius*effect.size+enemyRadius(enemy,system));if(hit&&(!block||hit.t<block.t-1e-9))block={type:'enemy',t:hit.t,hit,enemy,id:targetId(enemy,system)};}
    return{effect,start,end,requested,block,rangeEnds:requested>=remaining-1e-9};
  }
  function spawnFusionFan(fireball,arrow,hit){
    const castStable=arrow.castStable,origin={x:hit.x,z:hit.z},direction={...arrow.direction},visualMode=arrow.visualMode,size=arrow.size,burstStable=`${castStable}:fusion:01`;
    makeTransient(makeFusionBurstVisual(THREE,scene,{position:origin,direction,mode:visualMode,size}),origin,visualMode,size,.30,'fusion-transform',burstStable,FLAME_FUSION_SPEC.id);
    remove(fireball);remove(arrow);
    const arrows=FLAME_FUSION_SPEC.fusion.angles.map((angle,index)=>spawnFlameProjectile({kind:'fusion-arrow',castStable,origin,direction:rotate(direction,angle),index:index+1,visualMode,size}));
    semantic('flame-fusion-transformed',{arcanaId:FLAME_FUSION_SPEC.id,stableId:burstStable,castStable,fireballStableId:fireball.stableId,arrowStableId:arrow.stableId,collisionPoint:origin,incomingDirection:direction,count:arrows.length,childStableIds:arrows.map(value=>value.stableId),parentPayloadSuppressed:true});
  }
  function rotate(direction,angle){const c=Math.cos(angle),s=Math.sin(angle);return{x:direction.x*c-direction.z*s,z:direction.x*s+direction.z*c};}
  function resolveFlameProjectiles(dt){
    const parents=state.effects.filter(effect=>effect.type==='flameProjectile'),plans=new Map(parents.map(effect=>[effect,planProjectile(effect,dt)])),consumed=new Set();
    const arrows=parents.filter(effect=>effect.semanticKind==='arrow'),fireballs=parents.filter(effect=>effect.semanticKind==='fireball');
    const fusions=[];for(const arrow of arrows)for(const fireball of fireballs){if(arrow.castStable!==fireball.castStable)continue;const ap=plans.get(arrow),fp=plans.get(fireball),hit=movingCircleFirstHit(ap.start,ap.end,arrow.spec.radius*arrow.size,fp.start,fp.end,fireball.spec.radius*fireball.size);if(!hit)continue;const arrowBlock=ap.block?.t??Infinity,fireballBlock=fp.block?.t??Infinity,arrowPrecedes=ap.block?.type==='wall'?hit.t<arrowBlock-1e-9:hit.t<=arrowBlock+1e-9,fireballPrecedes=fp.block?.type==='wall'?hit.t<fireballBlock-1e-9:hit.t<=fireballBlock+1e-9;if(arrowPrecedes&&fireballPrecedes)fusions.push({arrow,fireball,hit});}
    fusions.sort((a,b)=>a.hit.t-b.hit.t||a.arrow.stableId.localeCompare(b.arrow.stableId));
    for(const fusion of fusions){if(consumed.has(fusion.arrow)||consumed.has(fusion.fireball)||!state.effects.includes(fusion.arrow)||!state.effects.includes(fusion.fireball))continue;consumed.add(fusion.arrow);consumed.add(fusion.fireball);spawnFusionFan(fusion.fireball,fusion.arrow,fusion.hit);}
    for(const effect of parents){if(consumed.has(effect)||!state.effects.includes(effect))continue;const plan=plans.get(effect),terminal=plan.block,end=terminal?{x:plan.start.x+(plan.end.x-plan.start.x)*terminal.t,z:plan.start.z+(plan.end.z-plan.start.z)*terminal.t}:plan.end,travel=Math.hypot(end.x-plan.start.x,end.z-plan.start.z);effect.previous=plan.start;effect.position=end;effect.distance+=travel;effect.age+=dt;effect.mesh?.position?.set(end.x,.38+Math.sin(state.elapsed*11)*.04,end.z);effect.mesh?.children?.forEach((child,index)=>{if(child.userData?.fireballEmber!==undefined)child.position.y=.12+(index%2)*.12+Math.sin(state.elapsed*13+index)*.06;});
      if(terminal?.type==='enemy'){
        const system=getEnemySystem?.(),knock={x:effect.direction.x*.7,z:effect.direction.z*.7},dealt=dealDamage(system,terminal.enemy,effect.spec.damage,knock,{arcanaId:effect.arcanaId,stableId:effect.stableId,flameFusion:true,projectileKind:effect.semanticKind});
        if(dealt)addBurn(terminal.enemy,effect.spec.burnLevel,effect.castStable,effect.stableId);
        semantic('flame-projectile-hit',{arcanaId:effect.arcanaId,stableId:effect.stableId,castStable:effect.castStable,projectileKind:effect.semanticKind,targetId:terminal.id,damage:effect.spec.damage,burnLevel:effect.spec.burnLevel,nonpiercing:true});remove(effect);continue;
      }
      if(terminal?.type==='wall'){semantic('flame-projectile-fizzled',{arcanaId:effect.arcanaId,stableId:effect.stableId,castStable:effect.castStable,projectileKind:effect.semanticKind,reason:'wall',position:{...end},damage:0});remove(effect);continue;}
      if(plan.rangeEnds){semantic('flame-projectile-expired',{arcanaId:effect.arcanaId,stableId:effect.stableId,castStable:effect.castStable,projectileKind:effect.semanticKind,distance:round(effect.distance)});remove(effect);}
    }
  }

  function beginAirborne(action){
    action.phase='airborne';action.semanticKind='airborne';action.age=0;action.life=HEROIC_LEAP_SPEC.airDuration;action.position={...action.endpoint};setPlayer(action.endpoint,{source:'wizardArcana',arcanaId:action.arcanaId,phase:'takeoff'});disposeObject(action.mesh);action.mesh=makeLeapVisual(THREE,scene,{position:action.endpoint,direction:action.direction,mode:action.visualMode,size:action.size,kind:'airborne'});
    action.releaseInvulnerability=invulnerability.acquire('heroic-leap-airborne',{stableId:action.stableId});setPlayerAirborne?.(true,{source:'wizardArcana',arcanaId:action.arcanaId,stableId:action.stableId,height:0});
    if(action.carryTarget&&Number(action.carryTarget.hp)>0&&canCarryEnemy?.(action.carryTarget)){action.carried=true;moveEnemy(action.carryTarget,action.endpoint,0,{arcanaId:action.arcanaId,stableId:action.stableId,phase:'takeoff'});semantic('heroic-leap-target-carried',{arcanaId:action.arcanaId,stableId:`${action.castStable}:carry`,actionStableId:action.stableId,targetId:action.carryTargetId,vortexExcluded:true});}
    const vortex=add({type:'heroicVortex',semanticKind:'ground-vortex',arcanaId:action.arcanaId,stableId:`${action.castStable}:vortex`,castStable:action.castStable,action,age:0,life:HEROIC_LEAP_SPEC.airDuration,position:{...action.endpoint},tickIndex:0,visualMode:action.visualMode,size:action.size,mesh:makeLeapVisual(THREE,scene,{position:action.endpoint,direction:action.direction,mode:action.visualMode,size:action.size,kind:'vortex'})});action.vortex=vortex;
    semantic('heroic-leap-takeoff',{arcanaId:action.arcanaId,stableId:action.stableId,vortexStableId:vortex.stableId,position:{...action.endpoint},invulnerable:true,carriedTargetId:action.carried?action.carryTargetId:null});
  }
  function damageVortexTick(vortex,tick){
    const system=getEnemySystem?.(),targetIds=[];for(const enemy of aliveEnemies(system)){if(vortex.action?.carried&&enemy===vortex.action.carryTarget)continue;if(Math.hypot(enemy.x-vortex.position.x,enemy.z-vortex.position.z)>HEROIC_LEAP_SPEC.vortexRadius*vortex.size+enemyRadius(enemy,system)||!hasLineOfSight(vortex.position,enemy))continue;if(dealDamage(system,enemy,HEROIC_LEAP_SPEC.vortexDamage,{x:0,z:0},{arcanaId:vortex.arcanaId,stableId:vortex.stableId,heroicLeap:true,vortex:true,tick,hitReaction:false,noHitStun:true,noAttackCancel:true}))targetIds.push(targetId(enemy,system));}
    semantic('heroic-leap-vortex-tick',{arcanaId:vortex.arcanaId,stableId:`${vortex.stableId}:tick:${String(tick).padStart(2,'0')}`,vortexStableId:vortex.stableId,tick,damage:HEROIC_LEAP_SPEC.vortexDamage,targetIds,carriedTargetExcluded:vortex.action?.carried?vortex.action.carryTargetId:null});
  }
  function advanceVortexTicks(vortex,throughAge){while(vortex.tickIndex<HEROIC_LEAP_SPEC.vortexTickTimes.length&&throughAge+1e-9>=HEROIC_LEAP_SPEC.vortexTickTimes[vortex.tickIndex]){vortex.tickIndex++;damageVortexTick(vortex,vortex.tickIndex);}}
  function interceptVortexProjectiles(vortex){
    const system=getEnemySystem?.(),values=hostileProjectiles(system);for(let index=0;index<values.length;index++){const projectile=values[index],radius=Number(projectile.r??projectile.radius)||.16;if(Math.hypot((Number(projectile.x)||0)-vortex.position.x,(Number(projectile.z)||0)-vortex.position.z)>HEROIC_LEAP_SPEC.vortexRadius*vortex.size+radius||!hasLineOfSight(vortex.position,projectile))continue;if(destroyHostileProjectile(system,projectile))semantic('heroic-leap-projectile-blocked',{arcanaId:vortex.arcanaId,stableId:`${vortex.stableId}:intercept:${projectileId(projectile,index)}`,vortexStableId:vortex.stableId,projectileId:projectileId(projectile,index),position:{x:Number(projectile.x)||0,z:Number(projectile.z)||0}});}
  }
  function landHeroicLeap(action){
    const vortex=action.vortex;if(vortex&&state.effects.includes(vortex)){advanceVortexTicks(vortex,HEROIC_LEAP_SPEC.airDuration);interceptVortexProjectiles(vortex);remove(vortex);}action.vortex=null;
    action.releaseInvulnerability?.();action.releaseInvulnerability=null;setPlayerHeight?.(0,{source:'wizardArcana',arcanaId:action.arcanaId,stableId:action.stableId});setPlayerAirborne?.(false,{source:'wizardArcana',arcanaId:action.arcanaId,stableId:action.stableId,height:0});setPlayer(action.endpoint,{source:'wizardArcana',arcanaId:action.arcanaId,phase:'landing'});
    const carriedTarget=action.carried?action.carryTarget:null,carriedTargetWasAlive=!!carriedTarget&&Number(carriedTarget.hp)>0,carriedTargetId=carriedTarget?action.carryTargetId:null;
    const system=getEnemySystem?.(),landingTargetIds=[];for(const enemy of aliveEnemies(system)){if(Math.hypot(enemy.x-action.endpoint.x,enemy.z-action.endpoint.z)>HEROIC_LEAP_SPEC.landingRadius*action.size+enemyRadius(enemy,system)||!hasLineOfSight(action.endpoint,enemy))continue;if(dealDamage(system,enemy,HEROIC_LEAP_SPEC.landingDamage,{x:0,z:0},{arcanaId:action.arcanaId,stableId:action.stableId,heroicLeap:true,landing:true}))landingTargetIds.push(targetId(enemy,system));}
    let carriedSlamApplied=false,carriedSlamDispatched=false,landingKilledCarriedTarget=false;if(carriedTargetWasAlive){carriedSlamDispatched=true;landingKilledCarriedTarget=Number(carriedTarget.hp)<=0;const slamStableId=`${action.castStable}:carried-slam`;carriedSlamApplied=!!dealDamage(system,carriedTarget,HEROIC_LEAP_SPEC.carriedDamage,{x:0,z:0},{allowDefeatedTarget:true,arcanaId:action.arcanaId,stableId:slamStableId,heroicLeap:true,carriedSlam:true,separatePayload:true});semantic('heroic-leap-carried-slam',{arcanaId:action.arcanaId,stableId:slamStableId,actionStableId:action.stableId,targetId:carriedTargetId,damage:HEROIC_LEAP_SPEC.carriedDamage,separatePayload:true,landingKilledTarget:landingKilledCarriedTarget,applied:carriedSlamApplied});}
    if(action.carried)releaseEnemy(action.carryTarget,{arcanaId:action.arcanaId,stableId:action.stableId,phase:'landing'});
    makeTransient(makeImpactVisual(THREE,scene,{position:action.endpoint,mode:action.visualMode,size:action.size,element:'Air',kind:'Heroic Leap landing'}),action.endpoint,action.visualMode,action.size,.34,'heroic-landing',`${action.castStable}:landing`,action.arcanaId);
    semantic('heroic-leap-landed',{arcanaId:action.arcanaId,stableId:`${action.castStable}:landing`,actionStableId:action.stableId,position:{...action.endpoint},landingDamage:HEROIC_LEAP_SPEC.landingDamage,landingTargetIds,carriedTargetId:action.carried?action.carryTargetId:null,carriedDamage:action.carried?HEROIC_LEAP_SPEC.carriedDamage:0,carriedSlamDispatched,carriedSlamApplied,landingKilledCarriedTarget,invulnerable:false,vortexTicks:vortex?.tickIndex||0});state.activeLeap=null;remove(action);
  }
  function updateHeroicAction(action,dt){
    action.age+=dt;if(action.phase==='rush'){const k=clamp(action.age/action.life,0,1),eased=1-Math.pow(1-k,3),start={...action.position},position={x:action.origin.x+(action.endpoint.x-action.origin.x)*eased,z:action.origin.z+(action.endpoint.z-action.origin.z)*eased};acquireCarryOnRush(action,start,position);action.position=position;setPlayer(position,{source:'wizardArcana',arcanaId:action.arcanaId,phase:'rush',progress:k});action.mesh?.position?.set(position.x,.18+Math.sin(k*Math.PI)*.18,position.z);if(k>=1)beginAirborne(action);return;}
    const k=clamp(action.age/action.life,0,1),height=Math.sin(k*Math.PI)*HEROIC_LEAP_SPEC.airHeight;action.currentHeight=height;setPlayerHeight?.(height,{source:'wizardArcana',arcanaId:action.arcanaId,stableId:action.stableId,progress:k});action.mesh?.position?.set(action.endpoint.x,height,action.endpoint.z);if(action.carried&&action.carryTarget&&Number(action.carryTarget.hp)>0)moveEnemy(action.carryTarget,action.endpoint,height*.88,{arcanaId:action.arcanaId,stableId:action.stableId,phase:'airborne',progress:k});if(k>=1)landHeroicLeap(action);
  }
  function postEnemyUpdate(){
    const action=state.activeLeap;if(!action?.carried||!action.carryTarget||Number(action.carryTarget.hp)<=0)return false;
    moveEnemy(action.carryTarget,action.endpoint,Math.max(0,Number(action.currentHeight)||0)*.88,{arcanaId:action.arcanaId,stableId:action.stableId,phase:'post-enemy-update'});return true;
  }
  function updateVortex(vortex,dt){vortex.age+=dt;advanceVortexTicks(vortex,vortex.age);interceptVortexProjectiles(vortex);vortex.mesh?.children?.forEach((child,index)=>{if(child.userData?.vortexRing!==undefined)child.rotation.z+=(index%2?1:-1)*dt*(4+index*.7);});if(vortex.age>=vortex.life&&!vortex.action)remove(vortex);}
  function updateBurn(effect,dt){effect.age+=dt;const system=getEnemySystem?.();if(!effect.target||Number(effect.target.hp)<=0){remove(effect);return;}while(effect.ticksRemaining>0&&effect.age+1e-9>=effect.nextTick){effect.tickSerial++;dealDamage(system,effect.target,effect.spec.tickDamage,{x:0,z:0},{arcanaId:effect.arcanaId,stableId:effect.stableId,flameFusion:true,burn:true,burnLevel:effect.level,tick:effect.tickSerial,hitReaction:false,noHitStun:true,noAttackCancel:true});semantic('burn-tick',{arcanaId:effect.arcanaId,stableId:effect.stableId,parentStable:effect.parentStable,targetId:effect.targetId,level:effect.level,tick:effect.tickSerial,damage:effect.spec.tickDamage});effect.ticksRemaining--;effect.nextTick+=effect.spec.interval;if(Number(effect.target.hp)<=0)break;}if(effect.ticksRemaining<=0||Number(effect.target.hp)<=0)remove(effect);}
  function makeTransient(mesh,position,visualMode,size,life,semanticKind,stableId,arcanaId){return add({type:'fusionLeapTransient',semanticKind,arcanaId,stableId,age:0,life,position:{...position},visualMode,size,mesh});}
  function updateTransient(effect,dt){effect.age+=dt;const k=clamp(effect.age/effect.life,0,1);effect.mesh?.traverse?.(child=>{if(child.material)child.material.opacity=(child.userData?.baseOpacity??.72)*(1-k);});if(k>=1)remove(effect);}
  function updateSequence(effect,dt){effect.age+=dt;if(effect.emitted||effect.age+1e-9<effect.delay)return;effect.emitted=true;const frame=playerFrame(getPlayer),direction=aimDirection({},frame);spawnFlameProjectile({kind:'arrow',castStable:effect.castStable,origin:{x:frame.x,z:frame.z},direction,index:1,visualMode:effect.visualMode,size:effect.size});semantic('flame-fusion-second-aim',{arcanaId:effect.arcanaId,stableId:effect.stableId,castStable:effect.castStable,aim:{...direction},liveAim:true});remove(effect);}

  function releaseLeapForCleanup(action){if(!action)return;action.releaseInvulnerability?.();action.releaseInvulnerability=null;if(action.carried)releaseEnemy(action.carryTarget,{arcanaId:action.arcanaId,stableId:action.stableId,phase:'cleanup'});setPlayerHeight?.(0,{source:'wizardArcanaCleanup',arcanaId:action.arcanaId});setPlayerAirborne?.(false,{source:'wizardArcanaCleanup',arcanaId:action.arcanaId});}
  function cleanup({resetResources=true}={}){if(state.activeLeap)releaseLeapForCleanup(state.activeLeap);for(const effect of[...state.effects])remove(effect);invulnerability.reset('runtime-cleanup');state.activeLeap=null;state.elapsed=0;state.lastCast=null;state.visualMode='style';state.semanticEvents.length=0;state.semanticSerial=0;state.castSerials.clear();if(resetResources)state.resources=emptyResources();}
  function reset(){cleanup({resetResources:true});}
  function effectSnapshot(effect){
    const result={type:effect.type,semanticKind:effect.semanticKind||'',arcanaId:effect.arcanaId||'',stableId:effect.stableId||'',age:round(effect.age),visualMode:effect.visualMode||''};
    for(const key of['life','distance','nextTick','ticksRemaining','tickIndex','level'])if(Number.isFinite(Number(effect[key])))result[key]=round(effect[key]);
    for(const key of['position','previous','origin','endpoint','direction','velocity'])if(effect[key])result[key]={x:round(effect[key].x),z:round(effect[key].z)};
    if(effect.phase)result.phase=effect.phase;if(effect.castStable)result.castStable=effect.castStable;if(effect.carryTargetId)result.carryTargetId=effect.carryTargetId;if(typeof effect.carried==='boolean')result.carried=effect.carried;if(typeof effect.blocked==='boolean')result.blocked=effect.blocked;return result;
  }
  function snapshot(){return{simulationTime:round(state.elapsed),lastCast:state.lastCast,visualMode:state.visualMode,activeLeap:state.activeLeap?effectSnapshot(state.activeLeap):null,invulnerability:invulnerability.snapshot(),resources:cloneResources(state.resources),effects:state.effects.map(effectSnapshot),semanticEvents:state.semanticEvents.map(event=>structuredCloneSafe(event))};}
  function structuredCloneSafe(value){if(Array.isArray(value))return value.map(structuredCloneSafe);if(value&&typeof value==='object'){const result={};for(const [key,item] of Object.entries(value))if(typeof item!=='function'&&key!=='mesh'&&key!=='target'&&key!=='enemy')result[key]=structuredCloneSafe(item);return result;}return value;}
  function update(dt){
    const frame=Math.max(0,Number(dt)||0);if(frame<=0)return;state.elapsed+=frame;for(const resource of Object.values(state.resources))resource.remaining=Math.max(0,resource.remaining-frame);
    for(const effect of[...state.effects])if(effect.type==='flameFusionSequence'&&state.effects.includes(effect))updateSequence(effect,frame);
    resolveFlameProjectiles(frame);
    for(const effect of[...state.effects]){if(!state.effects.includes(effect))continue;if(effect.type==='fusionBurn')updateBurn(effect,frame);else if(effect.type==='heroicLeapAction')updateHeroicAction(effect,frame);else if(effect.type==='heroicVortex')updateVortex(effect,frame);else if(effect.type==='fusionLeapTransient')updateTransient(effect,frame);}
  }
  const onPlay=event=>play(event?.detail?.card,event?.detail||{}),onTweaks=event=>{state.sizeMultiplier=clampArcanaSize(event?.detail?.sizeMultiplier);};
  window.addEventListener('wizard-arcana:play',onPlay);window.addEventListener(ARCANA_TWEAKS_EVENT,onTweaks);
  return{state,cast,canCast,canPlay,play,update,postEnemyUpdate,snapshot,cleanup,reset,dispose(){window.removeEventListener('wizard-arcana:play',onPlay);window.removeEventListener(ARCANA_TWEAKS_EVENT,onTweaks);cleanup();},get busy(){return !!state.activeLeap;}};
}
