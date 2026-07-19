// Fluid solver copied from threejs_midair_lifted_ground_slice_v1.html.
// The only solver-adjacent integration change is that maze line segments build
// the solid mask instead of the prototype's hard-coded demo rectangles/circles.
export function createPrototypeFluidSimulation({settings,layout,getMazeSegments=()=>[]}={}){
  const PATCH_W=layout.patchWidth;
  const PATCH_D=layout.patchDepth;
  let simW=layout.simulationColumns;
  let simH=layout.simulationRows;
  let N=simW*simH;
  let u,v,u0,v0,dye,dye0,heat,heat0,pressure,divergence,curlField,solid;
  let centerX=0,centerZ=0;
  const strokes=[];

  function cfg(){return{dprCap:1,simW:48,simH:42,pressureIters:4};}

  function worldToGridX(x){return(x/PATCH_W+.5)*simW;}
  function worldToGridY(z){return(z/PATCH_D+.5)*simH;}
  function idx(x,y){return x+y*simW;}

  function sample(field,x,y){
    x=Math.max(.5,Math.min(simW-1.5,x));
    y=Math.max(.5,Math.min(simH-1.5,y));
    const x0=Math.floor(x),y0=Math.floor(y),x1=x0+1,y1=y0+1,sx=x-x0,sy=y-y0;
    const i00=idx(x0,y0),i10=idx(x1,y0),i01=idx(x0,y1),i11=idx(x1,y1);
    const a=field[i00]*(1-sx)+field[i10]*sx;
    const b=field[i01]*(1-sx)+field[i11]*sx;
    return a*(1-sy)+b*sy;
  }

  function clearSim(){
    if(!u)return;
    u.fill(0);v.fill(0);u0.fill(0);v0.fill(0);dye.fill(0);dye0.fill(0);
    heat.fill(0);heat0.fill(0);pressure.fill(0);divergence.fill(0);curlField.fill(0);
    strokes.length=0;
  }

  function injectWorld(x,z,dx,dz,pressureValue=1){
    const s=settings();
    if(x<-PATCH_W*.55||x>PATCH_W*.55||z<-PATCH_D*.55||z>PATCH_D*.55)return;
    const gx=worldToGridX(x),gy=worldToGridY(z);
    const radiusGrid=Math.max(1.8,s.radius/100*simW*.19),r2=radiusGrid*radiusGrid;
    const vx=dx/PATCH_W*simW*s.push*.95*pressureValue;
    const vy=dz/PATCH_D*simH*s.push*.95*pressureValue;
    const speed=Math.hypot(dx,dz);
    const minX=Math.max(2,Math.floor(gx-radiusGrid)),maxX=Math.min(simW-3,Math.ceil(gx+radiusGrid));
    const minY=Math.max(2,Math.floor(gy-radiusGrid)),maxY=Math.min(simH-3,Math.ceil(gy+radiusGrid));
    for(let y=minY;y<=maxY;y++){
      const yy=y-gy;
      for(let x=minX;x<=maxX;x++){
        const i=idx(x,y);if(solid[i])continue;
        const xx=x-gx,dist2=xx*xx+yy*yy;if(dist2>r2)continue;
        const falloff=Math.pow(1-dist2/r2,1.7);
        u[i]+=vx*falloff;v[i]+=vy*falloff;
        const side=Math.sign(vx*yy-vy*xx||1);
        const tangent=.032*s.curl*s.push*falloff;
        u[i]+=-yy*tangent*side;v[i]+=xx*tangent*side;
        const dAdd=(.022+speed*.85)*s.ink*falloff;
        const hAdd=(.06+speed*1.2)*s.heat*falloff;
        dye[i]=Math.min(4,dye[i]+dAdd);heat[i]=Math.min(4,heat[i]+hAdd);
      }
    }
    if(speed>.08)addStroke(x,z,dx,dz,speed);
  }

  function addStroke(x,z,dx,dz,speed){
    const len=Math.hypot(dx,dz);if(len<.01)return;
    strokes.push({x0:x-dx*1.8,z0:z-dz*1.8,x1:x,z1:z,life:1,heat:Math.min(1,.20+speed*1.25),width:.18+speed*.55,len});
    if(strokes.length>layout.maxStrokes)strokes.shift();
  }

  function advectVector(){
    const s=settings();u0.set(u);v0.set(v);const dt=.95;
    for(let y=1;y<simH-1;y++)for(let x=1;x<simW-1;x++){
      const i=idx(x,y);if(solid[i]){u[i]=0;v[i]=0;continue;}
      const px=x-u0[i]*dt,py=y-v0[i]*dt;
      u[i]=sample(u0,px,py)*s.momentum;v[i]=sample(v0,px,py)*s.momentum;
    }
  }

  function advectScalar(field,prev,fadeFactor){
    prev.set(field);const dt=.98;
    for(let y=1;y<simH-1;y++)for(let x=1;x<simW-1;x++){
      const i=idx(x,y);if(solid[i]){field[i]=0;continue;}
      const px=x-u[i]*dt,py=y-v[i]*dt;
      let d=sample(prev,px,py)*fadeFactor;if(d<.018)d*=.92;
      field[i]=Math.min(4,d);
    }
  }

  function addVorticity(){
    const s=settings();
    for(let y=1;y<simH-1;y++)for(let x=1;x<simW-1;x++){
      const i=idx(x,y);if(solid[i]){curlField[i]=0;continue;}
      const dv_dx=(v[idx(x+1,y)]-v[idx(x-1,y)])*.5;
      const du_dy=(u[idx(x,y+1)]-u[idx(x,y-1)])*.5;
      curlField[i]=dv_dx-du_dy;
    }
    const strength=.0165*s.curl;
    for(let y=2;y<simH-2;y++)for(let x=2;x<simW-2;x++){
      const i=idx(x,y);if(solid[i])continue;
      const l=Math.abs(curlField[idx(x-1,y)]),r=Math.abs(curlField[idx(x+1,y)]);
      const b=Math.abs(curlField[idx(x,y-1)]),t=Math.abs(curlField[idx(x,y+1)]);
      let nx=r-l,ny=t-b;const len=Math.hypot(nx,ny)+1e-5;nx/=len;ny/=len;
      const c=curlField[i];u[i]+=ny*-c*strength;v[i]+=nx*c*strength;
    }
  }

  function project(){
    const c=cfg();pressure.fill(0);
    for(let y=1;y<simH-1;y++)for(let x=1;x<simW-1;x++){
      const i=idx(x,y);if(solid[i]){divergence[i]=0;continue;}
      divergence[i]=(u[idx(x+1,y)]-u[idx(x-1,y)]+v[idx(x,y+1)]-v[idx(x,y-1)])*-.5;
    }
    for(let k=0;k<c.pressureIters;k++)for(let y=1;y<simH-1;y++)for(let x=1;x<simW-1;x++){
      const i=idx(x,y);if(solid[i])continue;
      pressure[i]=(divergence[i]+pressure[idx(x-1,y)]+pressure[idx(x+1,y)]+pressure[idx(x,y-1)]+pressure[idx(x,y+1)])*.25;
    }
    for(let y=1;y<simH-1;y++)for(let x=1;x<simW-1;x++){
      const i=idx(x,y);if(solid[i])continue;
      u[i]-=(pressure[idx(x+1,y)]-pressure[idx(x-1,y)])*.5;
      v[i]-=(pressure[idx(x,y+1)]-pressure[idx(x,y-1)])*.5;
    }
  }

  function applySolids(){
    for(let y=1;y<simH-1;y++)for(let x=1;x<simW-1;x++){
      const i=idx(x,y);
      if(solid[i]){u[i]=0;v[i]=0;dye[i]=0;heat[i]=0;continue;}
      const left=solid[idx(x-1,y)],right=solid[idx(x+1,y)],down=solid[idx(x,y-1)],up=solid[idx(x,y+1)];
      if(left&&u[i]<0)u[i]*=-.38;if(right&&u[i]>0)u[i]*=-.38;
      if(down&&v[i]<0)v[i]*=-.38;if(up&&v[i]>0)v[i]*=-.38;
      if(left||right||down||up){u[i]*=.94;v[i]*=.94;}
    }
  }

  function updateStrokes(){
    const s=settings();
    for(let i=strokes.length-1;i>=0;i--){
      const st=strokes[i];st.life*=.86;st.width*=.965;st.heat*=.965;
      if(st.life<.02||st.width<.02||s.accent<.05)strokes.splice(i,1);
    }
  }

  function updateSim(){
    advectVector();addVorticity();project();applySolids();
    advectScalar(dye,dye0,settings().fade);advectScalar(heat,heat0,.955);
    applySolids();updateStrokes();
  }

  function pointSegmentDistance(px,pz,a,b){
    const abx=b.x-a.x,abz=b.z-a.z,lengthSq=abx*abx+abz*abz;
    if(lengthSq<=1e-8)return Math.hypot(px-a.x,pz-a.z);
    const t=Math.max(0,Math.min(1,((px-a.x)*abx+(pz-a.z)*abz)/lengthSq));
    return Math.hypot(px-(a.x+abx*t),pz-(a.z+abz*t));
  }

  function buildSolidMask(){
    solid.fill(0);const segments=getMazeSegments?.()||[];
    const wallRadius=Math.max(.42,Number(layout.wallMaskRadius)||.42);
    for(let y=1;y<simH-1;y++)for(let x=1;x<simW-1;x++){
      const wx=centerX+(x/simW-.5)*PATCH_W,wz=centerZ+(y/simH-.5)*PATCH_D;
      for(const segment of segments){
        if(!segment?.a||!segment?.b)continue;
        if(pointSegmentDistance(wx,wz,segment.a,segment.b)<=wallRadius){solid[idx(x,y)]=1;break;}
      }
    }
  }

  function initialize(){
    simW=cfg().simW;simH=cfg().simH;N=simW*simH;
    u=new Float32Array(N);v=new Float32Array(N);u0=new Float32Array(N);v0=new Float32Array(N);
    dye=new Float32Array(N);dye0=new Float32Array(N);heat=new Float32Array(N);heat0=new Float32Array(N);
    pressure=new Float32Array(N);divergence=new Float32Array(N);curlField=new Float32Array(N);solid=new Uint8Array(N);
    buildSolidMask();clearSim();
  }
  function setCenter(x,z){centerX=Number(x)||0;centerZ=Number(z)||0;buildSolidMask();clearSim();}
  function maxDye(){let max=0;for(let i=0;i<N;i++)if(dye[i]>max)max=dye[i];return max;}
  initialize();

  return{
    PATCH_W,PATCH_D,get simW(){return simW;},get simH(){return simH;},get N(){return N;},
    get centerX(){return centerX;},get centerZ(){return centerZ;},
    get u(){return u;},get v(){return v;},get dye(){return dye;},get heat(){return heat;},
    get curlField(){return curlField;},get solid(){return solid;},strokes,
    idx,sample,clearSim,injectWorld,updateSim,setCenter,buildSolidMask,maxDye,
  };
}
