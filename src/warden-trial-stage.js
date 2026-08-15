const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const smoothstep=(edge0,edge1,value)=>{
  const t=clamp((value-edge0)/Math.max(1e-6,edge1-edge0),0,1);
  return t*t*(3-2*t);
};

export function normalizeWardenTrialScreenMargins(margins={}){
  const read=(key,fallback)=>clamp(Number.isFinite(Number(margins[key]))?Number(margins[key]):fallback,0,.4);
  return Object.freeze({
    left:read('left',.08),
    right:read('right',.08),
    top:read('top',.22),
    bottom:read('bottom',.1),
  });
}

export function createWardenTrialStageBoundary({
  projectWorldToNdc,
  groundPointFromNdc,
  margins,
}={}){
  if(typeof projectWorldToNdc!=='function'||typeof groundPointFromNdc!=='function'){
    throw new TypeError('Warden Trial stage boundary requires projection and ground-ray adapters.');
  }
  const safe=normalizeWardenTrialScreenMargins(margins);
  const baseBounds=Object.freeze({
    minX:-1+safe.left*2,
    maxX:1-safe.right*2,
    minY:-1+safe.bottom*2,
    maxY:1-safe.top*2,
  });
  const projectedRadius=(point,radius)=>{
    const r=Math.max(0,Number(radius)||0);
    if(r<=0)return{x:0,y:0};
    const center=projectWorldToNdc(point);
    const samples=[
      projectWorldToNdc({x:point.x+r,z:point.z}),
      projectWorldToNdc({x:point.x-r,z:point.z}),
      projectWorldToNdc({x:point.x,z:point.z+r}),
      projectWorldToNdc({x:point.x,z:point.z-r}),
    ];
    return samples.reduce((padding,sample)=>({
      x:Math.max(padding.x,Math.abs((Number(sample?.x)||0)-(Number(center?.x)||0))),
      y:Math.max(padding.y,Math.abs((Number(sample?.y)||0)-(Number(center?.y)||0))),
    }),{x:0,y:0});
  };
  const clampPoint=(point,radius=0)=>{
    const requested={x:Number(point?.x)||0,z:Number(point?.z)||0};
    const ndc=projectWorldToNdc(requested);
    if(!Number.isFinite(Number(ndc?.x))||!Number.isFinite(Number(ndc?.y)))return requested;
    const padding=projectedRadius(requested,radius);
    const minX=Math.min(baseBounds.maxX,baseBounds.minX+padding.x);
    const maxX=Math.max(minX,baseBounds.maxX-padding.x);
    const minY=Math.min(baseBounds.maxY,baseBounds.minY+padding.y);
    const maxY=Math.max(minY,baseBounds.maxY-padding.y);
    const clampedNdc={x:clamp(Number(ndc.x),minX,maxX),y:clamp(Number(ndc.y),minY,maxY)};
    if(Math.abs(clampedNdc.x-ndc.x)<1e-7&&Math.abs(clampedNdc.y-ndc.y)<1e-7)return requested;
    const grounded=groundPointFromNdc(clampedNdc);
    return Number.isFinite(Number(grounded?.x))&&Number.isFinite(Number(grounded?.z))
      ?{x:Number(grounded.x),z:Number(grounded.z)}
      :requested;
  };
  const contains=(point,radius=0)=>{
    const clamped=clampPoint(point,radius);
    return Math.hypot(clamped.x-(Number(point?.x)||0),clamped.z-(Number(point?.z)||0))<1e-6;
  };
  const resolveMovement=(position,delta,radius=0)=>{
    const previous={x:Number(position?.x)||0,z:Number(position?.z)||0};
    const requested={
      x:previous.x+(Number(delta?.x)||0),
      z:previous.z+(Number(delta?.z)||0),
    };
    const current=clampPoint(requested,radius);
    const collided=Math.hypot(current.x-requested.x,current.z-requested.z)>1e-6;
    return{...current,collided,previous,requested,current};
  };
  return Object.freeze({
    margins:safe,
    bounds:baseBounds,
    projectWorldToNdc,
    groundPointFromNdc,
    clampPoint,
    contains,
    resolveMovement,
  });
}

export function createWardenTrialCenterField({stage,softEdge=.64,fullEdge=.9}={}){
  if(!stage||typeof stage.projectWorldToNdc!=='function'||typeof stage.groundPointFromNdc!=='function'){
    throw new TypeError('Warden Trial center field requires a projected stage boundary.');
  }
  const bounds=stage.bounds;
  const centerNdc=Object.freeze({
    x:(bounds.minX+bounds.maxX)*.5,
    y:(bounds.minY+bounds.maxY)*.5,
  });
  const halfWidth=Math.max(1e-6,(bounds.maxX-bounds.minX)*.5);
  const halfHeight=Math.max(1e-6,(bounds.maxY-bounds.minY)*.5);
  const soft=clamp(Number(softEdge)||.64,0,1);
  const full=Math.max(soft+1e-3,clamp(Number(fullEdge)||.9,0,1.25));
  const resolveCenter=()=>{
    const centerGround=stage.groundPointFromNdc(centerNdc);
    return Number.isFinite(Number(centerGround?.x))&&Number.isFinite(Number(centerGround?.z))
      ?Object.freeze({x:Number(centerGround.x),z:Number(centerGround.z)})
      :null;
  };
  let center=resolveCenter();
  const refresh=()=>{
    center=resolveCenter();
    return center;
  };
  const projectedRadius=(point,radius)=>{
    const r=Math.max(0,Number(radius)||0);
    if(r<=0)return{x:0,y:0};
    const projected=stage.projectWorldToNdc(point);
    const samples=[
      stage.projectWorldToNdc({x:point.x+r,z:point.z}),
      stage.projectWorldToNdc({x:point.x-r,z:point.z}),
      stage.projectWorldToNdc({x:point.x,z:point.z+r}),
      stage.projectWorldToNdc({x:point.x,z:point.z-r}),
    ];
    return samples.reduce((padding,sample)=>({
      x:Math.max(padding.x,Math.abs((Number(sample?.x)||0)-(Number(projected?.x)||0))),
      y:Math.max(padding.y,Math.abs((Number(sample?.y)||0)-(Number(projected?.y)||0))),
    }),{x:0,y:0});
  };
  const sample=(point={},radius=0)=>{
    const requested={x:Number(point?.x)||0,z:Number(point?.z)||0};
    const projected=stage.projectWorldToNdc(requested);
    if(!center||!Number.isFinite(Number(projected?.x))||!Number.isFinite(Number(projected?.y))){
      return Object.freeze({
        pressure:0,
        edgeDistance:0,
        direction:Object.freeze({x:0,z:0}),
        center,
        ndc:null,
      });
    }
    const padding=projectedRadius(requested,radius);
    const edgeX=(Math.abs(Number(projected.x)-centerNdc.x)+padding.x)/halfWidth;
    const edgeY=(Math.abs(Number(projected.y)-centerNdc.y)+padding.y)/halfHeight;
    const edgeDistance=Math.max(edgeX,edgeY);
    const pressure=smoothstep(soft,full,edgeDistance);
    const dx=center.x-requested.x,dz=center.z-requested.z,length=Math.hypot(dx,dz);
    return Object.freeze({
      pressure,
      edgeDistance,
      direction:Object.freeze(length>1e-6?{x:dx/length,z:dz/length}:{x:0,z:0}),
      center,
      ndc:Object.freeze({x:Number(projected.x),y:Number(projected.y)}),
    });
  };
  return Object.freeze({
    bounds,
    centerNdc,
    get center(){ return center; },
    softEdge:soft,
    fullEdge:full,
    refresh,
    sample,
  });
}
