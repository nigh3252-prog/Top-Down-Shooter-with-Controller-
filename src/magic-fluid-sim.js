import { ORANGE_DASH_MAGIC } from './magic-brush-presets.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

function pointSegmentDistance(px,pz,a,b){
  const abx=b.x-a.x,abz=b.z-a.z;
  const lengthSq=abx*abx+abz*abz;
  if(lengthSq<=1e-8)return Math.hypot(px-a.x,pz-a.z);
  const t=clamp(((px-a.x)*abx+(pz-a.z)*abz)/lengthSq,0,1);
  return Math.hypot(px-(a.x+abx*t),pz-(a.z+abz*t));
}

export function createMagicFluidField(options={}){
  const config={...ORANGE_DASH_MAGIC,...options};
  const width=Math.max(1,Number(config.patchWidth)||24);
  const depth=Math.max(1,Number(config.patchDepth)||24);
  const columns=Math.max(8,Math.round(config.columns||36));
  const rows=Math.max(8,Math.round(config.rows||36));
  const count=columns*rows;
  const u=new Float32Array(count),v=new Float32Array(count);
  const u0=new Float32Array(count),v0=new Float32Array(count);
  const dye=new Float32Array(count),dye0=new Float32Array(count);
  const heat=new Float32Array(count),heat0=new Float32Array(count);
  const pressure=new Float32Array(count),divergence=new Float32Array(count),curlField=new Float32Array(count);
  const solid=new Uint8Array(count);
  const state={centerX:Number(options.centerX)||0,centerZ:Number(options.centerZ)||0,active:false,idleFor:0,accumulator:0,maxMaterial:0};

  const index=(x,y)=>x+y*columns;
  const gridX=worldXValue=>(worldXValue-(state.centerX-width*.5))/width*(columns-1);
  const gridY=worldZValue=>(worldZValue-(state.centerZ-depth*.5))/depth*(rows-1);
  const worldX=x=>state.centerX-width*.5+x/(columns-1)*width;
  const worldZ=y=>state.centerZ-depth*.5+y/(rows-1)*depth;

  function sample(field,x,y){
    x=clamp(x,.5,columns-1.5);y=clamp(y,.5,rows-1.5);
    const x0=Math.floor(x),y0=Math.floor(y),x1=x0+1,y1=y0+1,sx=x-x0,sy=y-y0;
    const a=field[index(x0,y0)]*(1-sx)+field[index(x1,y0)]*sx;
    const b=field[index(x0,y1)]*(1-sx)+field[index(x1,y1)]*sx;
    return a*(1-sy)+b*sy;
  }

  function sampleWorld(field,worldXValue,worldZValue){
    return sample(field,gridX(worldXValue),gridY(worldZValue));
  }

  function clear(){
    for(const field of[u,v,u0,v0,dye,dye0,heat,heat0,pressure,divergence,curlField])field.fill(0);
    state.active=false;state.idleFor=0;state.accumulator=0;state.maxMaterial=0;
  }

  function setCenter(x,z){state.centerX=Number(x)||0;state.centerZ=Number(z)||0;clear();}

  function rebuildSolids(segments=[]){
    solid.fill(0);
    const radius=Math.max(.01,Number(config.wallRadius)||.55);
    for(let y=1;y<rows-1;y++)for(let x=1;x<columns-1;x++){
      const wx=worldX(x),wz=worldZ(y);
      for(const segment of segments||[]){
        if(!segment?.a||!segment?.b)continue;
        if(pointSegmentDistance(wx,wz,segment.a,segment.b)<=radius){solid[index(x,y)]=1;break;}
      }
    }
  }

  function injectWorld(x,z,dx,dz,{radius=1.55,material=.26,heatAmount=.40,curl=1}={}){
    const gx=gridX(x),gy=gridY(z);
    if(gx<-2||gx>columns+1||gy<-2||gy>rows+1)return false;
    const radiusGrid=Math.max(1.4,radius/width*columns);
    const r2=radiusGrid*radiusGrid;
    const vx=dx/width*columns;
    const vy=dz/depth*rows;
    const minX=Math.max(2,Math.floor(gx-radiusGrid)),maxX=Math.min(columns-3,Math.ceil(gx+radiusGrid));
    const minY=Math.max(2,Math.floor(gy-radiusGrid)),maxY=Math.min(rows-3,Math.ceil(gy+radiusGrid));
    let touched=false;
    for(let yy=minY;yy<=maxY;yy++){
      const oy=yy-gy;
      for(let xx=minX;xx<=maxX;xx++){
        const i=index(xx,yy);if(solid[i])continue;
        const ox=xx-gx,dist2=ox*ox+oy*oy;if(dist2>r2)continue;
        const falloff=Math.pow(1-dist2/r2,1.7);
        u[i]+=vx*falloff;v[i]+=vy*falloff;
        const tangent=.028*(Number(curl)||0)*falloff;
        u[i]+=-oy*tangent;v[i]+=ox*tangent;
        dye[i]=Math.min(4,dye[i]+Math.max(0,material)*falloff);
        heat[i]=Math.min(4,heat[i]+Math.max(0,heatAmount)*falloff);
        touched=true;
      }
    }
    if(touched){state.active=true;state.idleFor=0;}
    return touched;
  }

  function injectBurst({origin,direction,length=.72,radius=1.55,steps=3,push=.52,material=.26,heat:heatAmount=.40}={}){
    const len=Math.hypot(direction?.x||0,direction?.z||0)||1;
    const dirX=(direction?.x||0)/len,dirZ=(direction?.z||0)/len;
    const total=Math.max(1,Math.round(steps));
    let touched=false;
    for(let step=0;step<total;step++){
      const t=total===1?0:step/(total-1);
      const taper=1-t*.52;
      touched=injectWorld(
        (origin?.x||0)+dirX*length*t,
        (origin?.z||0)+dirZ*length*t,
        dirX*push*taper,
        dirZ*push*taper,
        {radius:radius*(1+t*.22),material:material*taper/total*2.25,heatAmount:heatAmount*taper/total*2.25,curl:1},
      )||touched;
    }
    return touched;
  }

  function advectVector(){
    u0.set(u);v0.set(v);
    for(let y=1;y<rows-1;y++)for(let x=1;x<columns-1;x++){
      const i=index(x,y);if(solid[i]){u[i]=0;v[i]=0;continue;}
      u[i]=sample(u0,x-u0[i]*.92,y-v0[i]*.92)*config.momentum;
      v[i]=sample(v0,x-u0[i]*.92,y-v0[i]*.92)*config.momentum;
    }
  }

  function addVorticity(){
    for(let y=1;y<rows-1;y++)for(let x=1;x<columns-1;x++){
      const i=index(x,y);if(solid[i]){curlField[i]=0;continue;}
      curlField[i]=(v[index(x+1,y)]-v[index(x-1,y)]-u[index(x,y+1)]+u[index(x,y-1)])*.5;
    }
    for(let y=2;y<rows-2;y++)for(let x=2;x<columns-2;x++){
      const i=index(x,y);if(solid[i])continue;
      let nx=Math.abs(curlField[index(x+1,y)])-Math.abs(curlField[index(x-1,y)]);
      let ny=Math.abs(curlField[index(x,y+1)])-Math.abs(curlField[index(x,y-1)]);
      const length=Math.hypot(nx,ny)+1e-5;nx/=length;ny/=length;
      const c=curlField[i],strength=config.curlStrength;
      u[i]+=ny*-c*strength;v[i]+=nx*c*strength;
    }
  }

  function project(){
    pressure.fill(0);
    for(let y=1;y<rows-1;y++)for(let x=1;x<columns-1;x++){
      const i=index(x,y);if(solid[i]){divergence[i]=0;continue;}
      divergence[i]=(u[index(x+1,y)]-u[index(x-1,y)]+v[index(x,y+1)]-v[index(x,y-1)])*-.5;
    }
    for(let pass=0;pass<config.pressureIterations;pass++)for(let y=1;y<rows-1;y++)for(let x=1;x<columns-1;x++){
      const i=index(x,y);if(solid[i])continue;
      pressure[i]=(divergence[i]+pressure[index(x-1,y)]+pressure[index(x+1,y)]+pressure[index(x,y-1)]+pressure[index(x,y+1)])*.25;
    }
    for(let y=1;y<rows-1;y++)for(let x=1;x<columns-1;x++){
      const i=index(x,y);if(solid[i])continue;
      u[i]-=(pressure[index(x+1,y)]-pressure[index(x-1,y)])*.5;
      v[i]-=(pressure[index(x,y+1)]-pressure[index(x,y-1)])*.5;
    }
  }

  function applySolids(){
    for(let y=1;y<rows-1;y++)for(let x=1;x<columns-1;x++){
      const i=index(x,y);
      if(solid[i]){u[i]=v[i]=dye[i]=heat[i]=0;continue;}
      const left=solid[index(x-1,y)],right=solid[index(x+1,y)],down=solid[index(x,y-1)],up=solid[index(x,y+1)];
      if(left&&u[i]<0)u[i]*=-.32;if(right&&u[i]>0)u[i]*=-.32;
      if(down&&v[i]<0)v[i]*=-.32;if(up&&v[i]>0)v[i]*=-.32;
      if(left||right||down||up){u[i]*=.92;v[i]*=.92;}
    }
  }

  function advectScalar(field,previous,fade){
    previous.set(field);
    let max=0;
    for(let y=1;y<rows-1;y++)for(let x=1;x<columns-1;x++){
      const i=index(x,y);if(solid[i]){field[i]=0;continue;}
      let value=sample(previous,x-u[i]*.96,y-v[i]*.96)*fade;
      if(value<.008)value*=.82;
      field[i]=Math.min(4,value);if(field===dye&&value>max)max=value;
    }
    return max;
  }

  function step(){
    advectVector();addVorticity();project();applySolids();
    state.maxMaterial=advectScalar(dye,dye0,config.materialFade);
    advectScalar(heat,heat0,config.heatFade);applySolids();
    if(state.maxMaterial<config.sleepThreshold)state.idleFor+=config.fixedStep;else state.idleFor=0;
    if(state.idleFor>=config.sleepDelay)clear();
  }

  function update(dt){
    if(!state.active)return false;
    state.accumulator=Math.min(.15,state.accumulator+Math.max(0,Number(dt)||0));
    while(state.accumulator>=config.fixedStep&&state.active){state.accumulator-=config.fixedStep;step();}
    return state.active;
  }

  function materialCentroid(){
    let total=0,x=0,z=0;
    for(let yy=0;yy<rows;yy++)for(let xx=0;xx<columns;xx++){
      const amount=dye[index(xx,yy)];if(amount<=0)continue;
      total+=amount;x+=worldX(xx)*amount;z+=worldZ(yy)*amount;
    }
    return total>0?{x:x/total,z:z/total,total}:{x:state.centerX,z:state.centerZ,total:0};
  }

  return{
    config,state,columns,rows,width,depth,u,v,dye,heat,curlField,solid,index,
    clear,setCenter,rebuildSolids,injectWorld,injectBurst,update,materialCentroid,
    worldX,worldZ,gridX,gridY,sampleWorld,
  };
}
