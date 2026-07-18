export const RED_DASH_MAGIC = Object.freeze({
  id:'red-dash',
  school:'red',
  patchWidth:14,
  patchDepth:12,
  columns:36,
  rows:30,
  renderHeight:.96,
  fixedStep:1/30,
  momentum:.982,
  materialFade:.948,
  heatFade:.925,
  curlStrength:.018,
  pressureIterations:4,
  wallRadius:.28,
  sleepThreshold:.012,
  sleepDelay:.32,
  burstLength:1.55,
  burstRadius:.48,
  burstSteps:6,
  burstPush:.34,
  burstMaterial:1.35,
  burstHeat:1.75,
});

function normalized(x,z,fallback={x:0,z:1}){
  const length=Math.hypot(x,z);
  if(length<=1e-6)return{...fallback};
  return{x:x/length,z:z/length};
}

export function createRedDashBurst({position,dashDirection,preset=RED_DASH_MAGIC}={}){
  const dash=normalized(dashDirection?.x||0,dashDirection?.z||0,{x:0,z:-1});
  const clean=value=>Math.abs(value)<1e-12?0:value;
  return{
    school:preset.school,
    origin:{x:Number(position?.x)||0,z:Number(position?.z)||0},
    direction:{x:clean(-dash.x),z:clean(-dash.z)},
    length:preset.burstLength,
    radius:preset.burstRadius,
    steps:preset.burstSteps,
    push:preset.burstPush,
    material:preset.burstMaterial,
    heat:preset.burstHeat,
  };
}
