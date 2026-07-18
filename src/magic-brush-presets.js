export const ORANGE_DASH_MAGIC = Object.freeze({
  id:'orange-dash',
  school:'orange',
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
  jetLength:2.05,
  jetRadius:1.35,
  jetSteps:5,
  jetSpacing:.42,
  jetPush:.16,
  jetMaterial:.34,
  jetHeat:.46,
});

// Compatibility alias for callers created during the first red-dash pass.
export const RED_DASH_MAGIC = ORANGE_DASH_MAGIC;

function normalized(x,z,fallback={x:0,z:1}){
  const length=Math.hypot(x,z);
  if(length<=1e-6)return{...fallback};
  return{x:x/length,z:z/length};
}

function mixColor(a,b,t){
  return[
    a[0]+(b[0]-a[0])*t,
    a[1]+(b[1]-a[1])*t,
    a[2]+(b[2]-a[2])*t,
  ];
}

export function emberPaletteRGBA(dye,heat){
  const d=Math.max(0,Number(dye)||0),h=Math.max(0,Number(heat)||0);
  const body=Math.min(1,Math.pow(d*1.25,.75));
  const hot=Math.min(1,Math.pow(Math.min(d,h)*1.45,.78));
  if(body<.035)return[0,0,0,0];

  const cool=Math.max(0,body-hot*.55);
  const core=Math.min(1,hot*1.25);
  const white=[1,.98,.92];
  const yellow=[1,.86,.22];
  const orange=[1,.48,.08];
  const magenta=[.96,.20,.66];
  const purple=[.26,.06,.26];
  let out;
  if(core>.70)out=mixColor(yellow,white,(core-.70)/.30);
  else if(core>.44)out=mixColor(orange,yellow,(core-.44)/.26);
  else if(core>.22)out=mixColor(magenta,orange,(core-.22)/.22);
  else out=mixColor(purple,magenta,Math.min(1,core/.22));

  const haze=Math.min(.44,cool*.42);
  out=mixColor(out,purple,haze);
  const brightness=.26+body*1.02+core*.62;
  const alpha=Math.min(1,body*.78+hot*.35);
  return[
    Math.min(1,out[0]*brightness),
    Math.min(1,out[1]*brightness),
    Math.min(1,out[2]*brightness),
    alpha,
  ];
}

export function createOrangeDashJet({position,dashDirection,preset=ORANGE_DASH_MAGIC,intensity=1}={}){
  const dash=normalized(dashDirection?.x||0,dashDirection?.z||0,{x:0,z:-1});
  const clean=value=>Math.abs(value)<1e-12?0:value;
  const strength=Math.max(.1,Number(intensity)||1);
  return{
    school:preset.school,
    origin:{x:Number(position?.x)||0,z:Number(position?.z)||0},
    direction:{x:clean(-dash.x),z:clean(-dash.z)},
    length:preset.jetLength,
    radius:preset.jetRadius,
    steps:preset.jetSteps,
    push:preset.jetPush*strength,
    material:preset.jetMaterial*strength,
    heat:preset.jetHeat*strength,
  };
}

export const createRedDashBurst=createOrangeDashJet;
