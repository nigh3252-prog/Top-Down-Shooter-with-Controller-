/*
 * Direct source port for the Wizard of Legend VFX lab.
 *
 * The helper, shader, and Arcana class blocks below are copied from
 * upload/arcana-vfx-lab.html. The factory at the end is the game
 * adapter: it provides the live scene and target/callback seams.
 */
export function createWizardVfxSourcePort({THREE,scene}={}){
  if(!THREE||!scene)throw new Error("Wizard VFX source port requires THREE and scene.");
  const targets=[];
  const caster=new THREE.Group();
  const camRig={dist:21,focus:new THREE.Vector3(0,0.6,0)};
  function layoutTargets(){}
  let onFlashTargets=()=>{};
  let popupContext=null;
  function flashTargets(hits){onFlashTargets(hits);}
const SRC_W = 854, SRC_H = 480;
const TILT_SQUASH = 0.84;

// Palettes sampled directly from the source frames (8-bit quantised buckets).
const PAL = {
  vortex:{
    deep:  0x4a6f7d,   // #587880 groove / funnel shadow
    mid:   0x6fbede,   // #90d8f8 mid body
    base:  0x92eef8,   // #98f0f8 dominant body tone
    hi:    0xc2fbff,   // #a8f8f8 -> highlight roll
    foam:  0xf2feff,
  },
  breaker:{
    deep:  0x4d7284,   // #587888 coil groove
    mid:   0x89b0c4,   // #98b8c8
    base:  0xa8c8d8,   // #a8c8d8 dominant body tone
    hi:    0xd8effb,   // #c0e8f8 -> crest
    foam:  0xf4fcff,
  },
  // Ignition Drive and Engulfing Fissure share the showcase's fire ramp.
  fire:{
    deep:  0xe06000,   // #e06000 ember / underside
    mid:   0xf08800,   // #f08800
    base:  0xf89800,   // #f89800 dominant flame tone
    hi:    0xf8b800,   // #f8b000 -> yellow crest
    foam:  0xfff4c8,   // white-hot core
  },
  smoke:{
    deep:  0x100d0b, mid:0x241f1b, base:0x3a332d, hi:0x554b42, foam:0x6d6158,
  },
  // Tectonic Drill: warm tan auger fins over dark earth shadow.
  earth:{
    deep:  0x6e4c22,   // shadowed fin root
    mid:   0x886840,   // #886840
    base:  0x987850,   // #987850 dominant fin tone
    hi:    0xb89058,   // lit crest
    foam:  0xd8b878,   // dust
  },
  // Dragon Blast and Shearing Chain: near-white wind with a cool grey shadow.
  air:{
    deep:  0x9aa8a8,   // #a0b0b0 shadowed wisp
    mid:   0xc4d2d2,   // #c8d8d8
    base:  0xe6f2f2,   // #e8f0f0 body
    hi:    0xf4fafa,   // #f0f8f8 crest
    foam:  0xffffff,
  },
  // Shearing Chain blades read as near-white with only a light grey shadow.
  slash:{ deep:0xc2cccc, mid:0xdfe9e9, base:0xf2f8f8, hi:0xffffff, foam:0xffffff },
  // Rock-Solid Tomahawk: pale stone blade, no colour cast.
  stone:{
    deep:  0x6f6f6a, mid:0xa09898, base:0xc0b8b0, hi:0xe8e8e8, foam:0xffffff,
  },
};

const TIMELINE = {
  vortex:{
    total:0.80,
    marks:[
      [0.000,0.060,'wind-up','Caster swings; two seed crescents open 180° apart, droplets flick outward.'],
      [0.060,0.200,'bloom','Arms multiply to six and the disc snaps out past full radius.'],
      [0.200,0.420,'spin','Full size, ~2.5 rev/s clockwise, contact foam and the 12 damage tick.'],
      [0.420,0.600,'collapse','Arms tear inward and drop into a low sloshing sheet.'],
      [0.600,0.800,'residue','Flat ripple disc drains away.'],
    ],
  },
  breaker:{
    total:3.50,
    marks:[
      [0.000,1.900,'charge','Coiled cone builds in front of the caster; charge bar runs blue → green.'],
      [1.900,2.650,'roll','Cone detaches and rolls forward at ~11 tiles/s, striking for 10 per pass.'],
      [2.650,3.150,'break','Coil shears into foam and throws a wide crashing fan.'],
      [3.150,3.500,'drain','Spray settles; wet ground fades.'],
    ],
  },
  ignition:{
    total:1.30,
    marks:[
      [0.000,0.080,'plant','Caster strikes forward; the first ignition flash opens at their feet.'],
      [0.080,0.380,'carry','Four compact 10-damage blasts step outward along the aimed line.'],
      [0.380,0.620,'finisher','A visibly larger fifth blast resolves for 30 and applies burn.'],
      [0.620,0.900,'embers','Flame chunks fall out; smoke masses lift off the route.'],
      [0.900,1.300,'scorch','Black scorch strip lingers along the line and fades.'],
    ],
  },
  fissure:{
    total:3.20,
    marks:[
      [0.000,0.320,'placement','Caster strikes the floor; three separate dormant traps crack open.'],
      [0.320,1.300,'armed','Traps sit stationary and harmless, glowing faintly in their cracks.'],
      [1.300,1.420,'trigger','A target enters one trap; that fissure flares and pulls it to the centre.'],
      [1.420,2.100,'consume','Five timed 5-damage hits: star flash, radial spikes, orange splatter.'],
      [2.100,3.200,'spent','The used trap is consumed; the other two stay armed, then expire.'],
    ],
  },
  drill:{
    total:1.60,
    marks:[
      [0.000,0.180,'wind-up','Caster drives down; the floor cracks ahead of them.'],
      [0.180,0.320,'breach','The auger tip breaks the surface, throwing slabs and dust.'],
      [0.320,1.150,'bore','The fin stack travels forward, spinning, striking for 10 per contact.'],
      [1.150,1.400,'submerge','The drill dives back under and collapses the bore.'],
      [1.400,1.600,'settle','Rubble and dust fall out; the churned track stays.'],
    ],
  },
  flamebreath:{
    total:0.95,
    marks:[
      [0.000,0.100,'plant','Caster roots and snapshots the forward aim.'],
      [0.100,0.450,'plume','A broad rounded cone projects forward; three 18-damage hits land inside it.'],
      [0.450,0.700,'decay','The plume falls back toward the mouth and breaks up.'],
      [0.700,0.950,'smoke','Dark smoke lies over the scorched fan and clears.'],
    ],
  },
  crown:{
    total:1.60,
    marks:[
      [0.000,0.120,'slam','Caster slams; the crown opens around their feet.'],
      [0.120,0.780,'ticks','Five rapid 5-damage crown hits; smoke and embers build up.'],
      [0.780,0.980,'finisher','One larger 20-damage blast carries the knockback.'],
      [0.980,1.600,'column','A standing smoke column is left on the caster.'],
    ],
  },
  dragonblast:{
    total:1.55,
    marks:[
      [0.000,0.120,'cast','Caster snapshots aim and sets the head in front of them.'],
      [0.120,0.200,'form','Pale streamers curl inward and the head holds station.'],
      [0.200,0.900,'pulls','Five 8-damage pull hits draw targets toward the mouth.'],
      [0.900,1.240,'blast','One 24-damage blast throws them out; streamers sweep away.'],
      [1.240,1.550,'clear','Wind dissipates.'],
    ],
  },
  shearing:{
    total:1.35,
    marks:[
      [0.000,0.180,'launch','Caster commits to the forward route.'],
      [0.180,0.780,'chain','Six 7-damage crescents alternate side and angle along the advance.'],
      [0.780,1.120,'finisher','One larger 15-damage slash resolves the route with a stronger push.'],
      [1.120,1.350,'settle','Sparkles and wind wisps clear.'],
    ],
  },
  tomahawk:{
    total:2.10,
    marks:[
      [0.000,0.350,'raise','Caster lifts the double-bitted stone axe overhead.'],
      [0.350,1.050,'outbound','The axe flies out spinning flat, striking for 15 with a star flash.'],
      [1.050,1.850,'return','It arcs back along a curved return path toward the caster.'],
      [1.850,2.100,'catch','The axe is caught; dust and chips settle.'],
    ],
  },
};

/* ------------------------------------------------------------------ *
 * Deterministic helpers — every visual is a pure function of phase
 * time, so scrubbing and frame-stepping show exactly what playback does.
 * ------------------------------------------------------------------ */
const TAU = Math.PI*2;
const clamp = (v,a,b)=>v<a?a:v>b?b:v;
const sat = v=>clamp(v,0,1);
const lerp = (a,b,t)=>a+(b-a)*t;
const smooth = t=>{t=sat(t);return t*t*(3-2*t);};
const ease = {
  outCubic:t=>1-Math.pow(1-sat(t),3),
  outQuint:t=>1-Math.pow(1-sat(t),5),
  inCubic:t=>Math.pow(sat(t),3),
  outBack:(t,s=1.7)=>{t=sat(t);const c=t-1;return 1+ (s+1)*c*c*c + s*c*c;},
};
// hash-based rng: stable per index, no state
function rnd(i,salt){
  const x = Math.sin(i*127.1 + salt*311.7)*43758.5453;
  return x - Math.floor(x);
}

/* ------------------------------------------------------------------ *
 * Painterly water shader
 *
 * The source art is hand-painted: flat colour bands, ragged silhouettes,
 * no specular. So lighting is replaced by a quantised ramp driven by a
 * scrolling fbm, and the silhouette is cut by that same noise so edges
 * stay irregular instead of reading as clean geometry.
 * ------------------------------------------------------------------ */
const NOISE_GLSL = `
  float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float vnoise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),
               mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
  }
  float fbm(vec2 p){
    float a=0.5, s=0.0;
    for(int i=0;i<4;i++){ s+=a*vnoise(p); p*=2.03; a*=0.5; }
    return s;
  }
`;

const WATER_VERT = `
  varying vec2 vUv;
  varying float vRim;
  attribute float aEdge;   // 0 at ribbon spine, ±1 at the silhouette
  varying float vEdge;
  void main(){
    vUv = uv;
    vEdge = aEdge;
    vRim = 0.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  }
`;

const WATER_FRAG = `
  precision highp float;
  float sat(float v){ return clamp(v,0.0,1.0); }
  uniform vec3 uDeep, uMid, uBase, uHi, uFoam;
  uniform float uTime, uAlpha, uFlow, uRag, uBands, uFoamAmt, uNoiseScale;
  varying vec2 vUv;
  varying float vEdge;
  ${NOISE_GLSL}
  void main(){
    vec2 np = vec2(vUv.x*uNoiseScale, vUv.y*1.6) + vec2(-uTime*uFlow, uTime*uFlow*0.35);
    float n = fbm(np);
    float n2 = fbm(np*2.7 + 11.3);

    // ragged silhouette: erode the ribbon edge with noise
    float body = 1.0 - abs(vEdge);
    float cut  = body - uRag*(0.55*n + 0.45*n2) - 0.06;
    float a = smoothstep(0.0, 0.16, cut);
    // taper the ends so ribbons dissolve instead of stopping flat
    a *= smoothstep(0.0,0.10,vUv.x) * smoothstep(0.0,0.22,1.0-vUv.x);
    if(a <= 0.004) discard;

    // quantised painted ramp
    float shade = sat(0.42 + 0.44*vEdge + (n-0.5)*1.10 + (0.5-vUv.x)*0.26);
    shade = floor(shade*uBands)/(uBands-1.0);
    vec3 col = shade < 0.34 ? mix(uDeep,uMid,shade/0.34)
             : shade < 0.68 ? mix(uMid,uBase,(shade-0.34)/0.34)
                            : mix(uBase,uHi,(shade-0.68)/0.32);

    // foam crest: a thin ragged rind on the silhouette only, never the interior
    float edgeBand = smoothstep(0.42, 0.04, body);
    float crest = edgeBand * smoothstep(0.44, 0.78, n2) * uFoamAmt;
    col = mix(col, uFoam, crest*0.8);

    gl_FragColor = vec4(col, a*uAlpha);
  }
`;

function waterMaterial(pal, opts={}){
  return new THREE.ShaderMaterial({
    uniforms:{
      uDeep:{value:new THREE.Color(pal.deep)},
      uMid:{value:new THREE.Color(pal.mid)},
      uBase:{value:new THREE.Color(pal.base)},
      uHi:{value:new THREE.Color(pal.hi)},
      uFoam:{value:new THREE.Color(pal.foam)},
      uTime:{value:0},
      uAlpha:{value:1},
      uFlow:{value:opts.flow??0.9},
      uRag:{value:opts.rag??0.30},
      uBands:{value:opts.bands??4.0},
      uFoamAmt:{value:opts.foam??0.55},
      uNoiseScale:{value:opts.noiseScale??5.0},
    },
    vertexShader:WATER_VERT,
    fragmentShader:WATER_FRAG,
    transparent:true, depthWrite:false, side:THREE.DoubleSide,
    blending:THREE.NormalBlending,
  });
}

/* ---------------- ribbon geometry ---------------- */
// Builds a tapered strip along a parametric path. fn(t) -> {p:Vector3, w:number}
function ribbon(fn, segs){
  const pos=[], uvs=[], edge=[], idx=[];
  const up=new THREE.Vector3(0,1,0);
  let prev=null;
  for(let i=0;i<=segs;i++){
    const t=i/segs;
    const s=fn(t);
    const nxt=fn(Math.min(1,t+1/segs));
    const dir=new THREE.Vector3().subVectors(nxt.p, s.p);
    if(dir.lengthSq()<1e-9 && prev) dir.copy(prev);
    dir.normalize(); prev=dir.clone();
    const side=new THREE.Vector3().crossVectors(up,dir).normalize().multiplyScalar(s.w);
    if(side.lengthSq()<1e-9) side.set(s.w,0,0);
    pos.push(s.p.x-side.x, s.p.y-side.y*0.0+ (s.lift||0), s.p.z-side.z);
    pos.push(s.p.x+side.x, s.p.y+ (s.lift||0), s.p.z+side.z);
    uvs.push(t,0, t,1);
    edge.push(-1, 1);
    if(i<segs){
      const a=i*2;
      idx.push(a,a+1,a+2, a+1,a+3,a+2);
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  g.setAttribute('aEdge',new THREE.Float32BufferAttribute(edge,1));
  g.setIndex(idx);
  return g;
}


// One auger blade: an annulus sector wound around the +X travel axis.
function bladeGeometry(rIn,rOut,a0,arcLen,pitch,segs){
  const pos=[],uvs=[],idx=[];
  for(let i=0;i<=segs;i++){
    const t=i/segs, a=a0+arcLen*t, x=pitch*arcLen*t;
    const c=Math.cos(a), s=Math.sin(a);
    pos.push(x, c*rIn,  s*rIn);
    pos.push(x, c*rOut, s*rOut);
    uvs.push(t,0, t,1);
    if(i<segs){ const k=i*2; idx.push(k,k+1,k+2, k+1,k+3,k+2); }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/* ---------------- billboard blob sprites (spray / foam) ---------------- *
 * Painterly droplets: a quad with the same noise cut, always facing the
 * camera, transform computed analytically per frame from the particle seed.
 */
const BLOB_FRAG = `
  precision highp float;
  uniform vec3 uCol, uCol2; uniform float uAlpha, uSeed, uTime, uRag;
  varying vec2 vUv;
  ${NOISE_GLSL}
  void main(){
    vec2 p = vUv*2.0-1.0;
    float d = length(p);
    float n = fbm(vUv*4.5 + uSeed*7.31 + uTime*0.4);
    float a = smoothstep(1.0, 0.72, d + (n-0.5)*uRag*1.7);
    if(a<=0.01) discard;
    vec3 c = mix(uCol2, uCol, smoothstep(0.15,0.9,n));
    gl_FragColor = vec4(c, a*uAlpha);
  }
`;
const BLOB_VERT = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `;

function blobMaterial(col, col2, rag=0.55){
  return new THREE.ShaderMaterial({
    uniforms:{uCol:{value:new THREE.Color(col)},uCol2:{value:new THREE.Color(col2)},
              uAlpha:{value:1},uSeed:{value:0},uTime:{value:0},uRag:{value:rag}},
    vertexShader:BLOB_VERT, fragmentShader:BLOB_FRAG,
    transparent:true, depthWrite:false, side:THREE.DoubleSide,
  });
}

class BlobPool{
  constructor(scene, count, col, col2, rag){
    this.items=[];
    const geo=new THREE.PlaneGeometry(1,1);
    for(let i=0;i<count;i++){
      const m=blobMaterial(col,col2,rag);
      m.uniforms.uSeed.value=rnd(i,3.1);
      const mesh=new THREE.Mesh(geo,m);
      mesh.visible=false; mesh.renderOrder=6;
      scene.add(mesh); this.items.push(mesh);
    }
  }
  reset(){ for(const m of this.items) m.visible=false; }
  place(i,x,y,z,size,alpha,camQuat,stretch=1){
    const m=this.items[i]; if(!m) return;
    m.visible=true;
    m.position.set(x,y,z);
    m.scale.set(size, size*stretch, size);
    m.quaternion.copy(camQuat);
    m.material.uniforms.uAlpha.value=alpha;
  }
}

/* ---- damage popups drawn as camera-facing canvas sprites ---- */
function numberTexture(text,big){
  const w=96,h=64,c=document.createElement('canvas'); c.width=w;c.height=h;
  const g=c.getContext('2d');
  g.font=`900 ${big?40:30}px system-ui,sans-serif`;
  g.textAlign='center'; g.textBaseline='middle';
  if(big){
    g.fillStyle='#c62436';
    g.beginPath();
    for(let i=0;i<16;i++){
      const a=i/16*TAU, r=(i%2?18:29);
      g[i?'lineTo':'moveTo'](w/2+Math.cos(a)*r*1.25, h/2+Math.sin(a)*r);
    }
    g.closePath(); g.fill();
  }
  g.lineWidth=6; g.strokeStyle='#10161c'; g.strokeText(text,w/2,h/2+2);
  g.fillStyle='#ffffff'; g.fillText(text,w/2,h/2+2);
  const t=new THREE.CanvasTexture(c); t.magFilter=THREE.NearestFilter;
  return t;
}
const numCache=new Map();
function numSprite(text,big){
  const key=text+(big?'!':'');
  if(!numCache.has(key)){
    const m=new THREE.SpriteMaterial({map:numberTexture(text,big),transparent:true,depthWrite:false,depthTest:false});
    numCache.set(key,m);
  }
  return numCache.get(key);
}
const popupPool=[];
for(let i=0;i<26;i++){
  const s=new THREE.Sprite(numSprite('10',false));
  s.visible=false; s.renderOrder=20; s.scale.set(1.5,1.0,1);
  scene.add(s); popupPool.push(s);
}
let popupsEnabled=true;
function showPopupsExact(list){ // {x,z,y,text,big,alpha}
  popupPool.forEach(s=>s.visible=false);
  if(!popupsEnabled) return;
  // push overlapping read-outs apart so a multi-hit beat stays legible
  const placed=[];
  for(const p of list){
    let guard=0;
    while(guard++<8 && placed.some(q=>Math.abs(q.x-p.x)<0.9 && Math.abs(q.z-p.z)<0.9 && Math.abs(q.y-p.y)<0.42)){
      p.y+=0.46;
    }
    placed.push(p);
  }
  list.slice(0,popupPool.length).forEach((p,i)=>{
    const s=popupPool[i];
    s.material=numSprite(p.text,p.big);
    s.material.opacity=p.alpha;
    s.position.set(p.x,p.y,p.z);
    s.scale.set(p.big?1.45:1.05, p.big?1.0:0.7, 1);
    s.visible=p.alpha>0.02;
  });
}
function showPopups(list){
  if(!popupContext){showPopupsExact(list);return;}
  popupContext.anchor.updateMatrixWorld(true);
  const mapped=list.map(p=>{
    const point=new THREE.Vector3(p.x,p.y,p.z);
    popupContext.anchor.localToWorld(point);
    return{...p,x:point.x,y:point.y,z:point.z};
  });
  showPopupsExact(mapped);
}
/* ---- shared ground decal (wet patch / splash ring) ---- */
function decalMaterial(pal){
  return new THREE.ShaderMaterial({
    uniforms:{uCol:{value:new THREE.Color(pal.mid)},uCol2:{value:new THREE.Color(pal.deep)},
      uAlpha:{value:0},uTime:{value:0},uRing:{value:0.0},uRag:{value:0.5}},
    vertexShader:BLOB_VERT,
    fragmentShader:`
      precision highp float;
      uniform vec3 uCol,uCol2; uniform float uAlpha,uTime,uRing,uRag;
      varying vec2 vUv;
      ${NOISE_GLSL}
      void main(){
        vec2 p=vUv*2.0-1.0; float d=length(p);
        float n=fbm(vUv*6.0+uTime*0.25);
        float body=smoothstep(1.0,0.55,d+(n-0.5)*uRag);
        float ring=smoothstep(0.10,0.0,abs(d-uRing)) * step(0.01,uRing);
        float a=max(body*0.0, ring*0.30);
        if(a<=0.01) discard;
        gl_FragColor=vec4(mix(uCol2*0.75,uCol,n*0.7),a*uAlpha);
      }`,
    transparent:true, depthWrite:false,
  });
}

/* ------------------------------------------------------------------ *
 * ABILITY 1 — AQUA VORTEX
 *
 * Observed (16:47.96 → 16:48.75, 30 fps):
 *  · two seed crescents open on opposite sides, then the disc fills to
 *    six tapered arms in ~4 frames;
 *  · peak diameter ≈ 200 px ≈ 6.2 tiles, centred on the caster;
 *  · pinwheel rotates clockwise ≈ 2.5 rev/s (~30° per frame);
 *  · arms are broad at mid-radius and hook to a point at the rim;
 *  · collapse drops into a low sloshing sheet, then a flat ripple.
 * ------------------------------------------------------------------ */
class AquaVortex{
  constructor(){
    this.root=new THREE.Group();
    this.pal=PAL.vortex;
    this.ARMS=6;
    this.R=3.1;                       // peak radius in tiles
    this.arms=[];
    for(let i=0;i<this.ARMS;i++){
      const mat=waterMaterial(this.pal,{flow:1.15,rag:0.30,bands:4.0,foam:0.5,noiseScale:5.5});
      const geo=ribbon(t=>this.armPoint(t,i),46);
      const m=new THREE.Mesh(geo,mat);
      m.renderOrder=4;
      this.root.add(m); this.arms.push(m);
    }
    // inner wash: the source keeps the eye filled with a bright sheet
    this.washMat=waterMaterial(this.pal,{flow:0.7,rag:0.34,bands:3.0,foam:0.30,noiseScale:3.0});
    this.wash=new THREE.Mesh(ribbon(t=>{
      const a=t*TAU*1.02, r=1.10;
      return {p:new THREE.Vector3(Math.cos(a)*r,0.05,Math.sin(a)*r), w:0.58};
    },64), this.washMat);
    this.wash.renderOrder=3; this.root.add(this.wash);

    // low sloshing sheet left behind by the collapse
    this.sheetMat=waterMaterial(this.pal,{flow:0.55,rag:0.42,bands:3.0,foam:0.35,noiseScale:3.4});
    this.sheet=new THREE.Mesh(ribbon(t=>{
      const a=t*TAU*1.02, r=1.35;
      return {p:new THREE.Vector3(Math.cos(a)*r,0.06,Math.sin(a)*r), w:0.42};
    },70), this.sheetMat);
    this.sheet.renderOrder=3;
    this.root.add(this.sheet);

    this.decal=new THREE.Mesh(new THREE.PlaneGeometry(9,9), decalMaterial(this.pal));
    this.decal.rotation.x=-Math.PI/2; this.decal.position.y=0.015;
    this.decal.renderOrder=2; this.root.add(this.decal);

    this.spray=new BlobPool(this.root, 34, this.pal.foam, this.pal.base, 0.6);
    this.contact=new BlobPool(this.root, 10, 0xffffff, this.pal.hi, 0.5);
    scene.add(this.root);
    this.root.visible=false;
  }
  // log-spiral arm: wide through the mid-radius, hooked and tapered at the rim
  armPoint(t,i){
    const spin=i/this.ARMS*TAU;
    const sweep=2.10;                        // radians of curl from root to tip
    const a=spin + t*sweep;
    const r=0.55 + (this.R-0.55)*Math.pow(t,0.78);
    // broad through the mid radius, hooked to a point at the rim
    const w=1.00*Math.pow(Math.sin(Math.PI*Math.pow(t,1.28)),0.48)*(1.0-0.12*t);
    // shallow bowl: the rim rides a little higher than the eye
    const lift=0.07 + 0.30*Math.pow(t,2.0);
    return {p:new THREE.Vector3(Math.cos(a)*r, lift, Math.sin(a)*r), w};
  }
  layout(){
    layoutTargets([[2.6,-0.4],[3.0,1.5],[1.2,2.6],[-2.4,1.9],[-3.0,-1.2]]);
    camRig.dist=17.5; camRig.focus.set(0,0.6,0);
  }
  /* deterministic evaluation */
  update(t, camQuat){
    const R=this.root;
    R.visible=true;
    this.spray.reset(); this.contact.reset();

    // --- envelope ---------------------------------------------------
    const bloom = smooth((t-0.045)/0.155);
    const collapse = smooth((t-0.42)/0.18);
    let scale = ease.outBack(sat((t-0.045)/0.16), 1.35);
    scale = lerp(scale, 0.12, collapse);
    const alive = t>0.03 && t<0.62;
    const alpha = sat(bloom*1.2) * (1.0 - smooth((t-0.44)/0.17));

    // arm count ramps in: the first two crescents lead by ~2 frames
    for(let i=0;i<this.ARMS;i++){
      const lead = (i%3===0) ? 0.0 : (i%2===0 ? 0.030 : 0.055);
      const own = sat((t-0.03-lead)/0.09);
      const m=this.arms[i];
      m.visible = alive && own>0.01;
      const u=m.material.uniforms;
      u.uTime.value=t;
      u.uAlpha.value=alpha*sat(own*1.4);
      // arms grow outward from the eye
      m.scale.setScalar(Math.max(0.001, scale*lerp(0.55,1.0,own)));
    }
    // clockwise spin, ~2.5 rev/s, easing as it collapses
    const spinRate = lerp(TAU*2.5, TAU*1.1, collapse);
    R.rotation.y = -(t*spinRate);          // negative Y = clockwise from above
    R.position.set(0,0,0);

    // --- inner wash --------------------------------------------------
    const washA = sat(bloom*1.1)*(1-smooth((t-0.40)/0.16));
    this.wash.visible = washA>0.02;
    this.wash.material.uniforms.uAlpha.value = washA*0.55;
    this.wash.material.uniforms.uTime.value = t;
    this.wash.scale.setScalar(Math.max(0.001,scale*0.98));

    // --- collapse sheet ---------------------------------------------
    const sheetA = smooth((t-0.40)/0.12) * (1-smooth((t-0.60)/0.16));
    this.sheet.visible = sheetA>0.02;
    this.sheet.material.uniforms.uAlpha.value = sheetA*0.85;
    this.sheet.material.uniforms.uTime.value = t;
    this.sheet.scale.setScalar(lerp(0.75,1.5,smooth((t-0.40)/0.30)));

    // --- wet ground -------------------------------------------------
    const d=this.decal.material.uniforms;
    d.uTime.value=t;
    d.uAlpha.value = sat(smooth((t-0.05)/0.12)) * (1-smooth((t-0.55)/0.25));
    d.uRing.value = t<0.30 ? lerp(0.0,0.95,smooth((t-0.04)/0.22)) : 0.0;
    this.decal.scale.setScalar(lerp(0.55,0.92,smooth((t-0.04)/0.30)));

    // --- droplets flicked outward at the opening -------------------
    for(let i=0;i<this.spray.items.length;i++){
      const born = 0.02 + rnd(i,1.7)*0.22;
      const age = t-born;
      const life = 0.30+rnd(i,2.9)*0.26;
      if(age<0 || age>life) continue;
      const k=age/life;
      const a0 = rnd(i,4.4)*TAU - t*1.6;
      const rad = lerp(1.1, this.R*1.12, ease.outCubic(k)) * (0.7+rnd(i,6.1)*0.5);
      const y = 0.16 + Math.sin(k*Math.PI)*(0.5+rnd(i,7.7)*0.85);
      const size = lerp(0.30,0.06,k)*(0.7+rnd(i,8.3)*0.9);
      this.spray.place(i, Math.cos(a0)*rad, y, Math.sin(a0)*rad, size, (1-k)*0.95, camQuat);
    }

    // --- contact foam + damage ticks --------------------------------
    const hits=[], pops=[];
    const tickAt=0.205;                      // the single 12 in the source
    targets.forEach((tg,i)=>{
      const dx=tg.position.x, dz=tg.position.z;
      const dist=Math.hypot(dx,dz);
      const reach=this.R*scale*1.02;
      const inside = alive && dist<reach;
      if(inside){
        const ang=Math.atan2(dz,dx);
        const fi=i%this.contact.items.length;
        const puff = 0.24+0.10*Math.sin(t*38+i);
        this.contact.place(fi, Math.cos(ang)*dist, 0.55, Math.sin(ang)*dist, puff, sat((0.62-t)*6)*0.9, camQuat);
      }
      if(inside && t>=tickAt && t<tickAt+0.05) hits.push({i});
      if(inside && t>=tickAt){
        const age=t-tickAt;
        if(age<0.55){
          pops.push({x:dx*1.02, z:dz*1.02, y:1.5+age*1.5, text:'12', big:true, alpha:1-smooth((age-0.3)/0.25)});
        }
      }
    });
    flashTargets(hits);
    showPopups(pops);

    // caster stays inside the eye and squats through the swing
    caster.position.set(0,0,0);
    caster.rotation.y = -t*1.2;
    caster.scale.y = 1 - 0.12*Math.sin(sat(t/0.12)*Math.PI);
  }
  resetHits(){}
  hide(){ this.root.visible=false; }
}

/* ------------------------------------------------------------------ *
 * ABILITY 2 — AQUA BREAKER
 *
 * Observed (18:05.65 → 18:09.0, 30 fps):
 *  · a coiled cone of water builds in front of the caster over ~1.9 s,
 *    charge bar running blue → green as it grows to ≈ 3 tiles across;
 *  · on release it detaches and rolls forward ≈ 11 tiles/s, keeping the
 *    banded coil silhouette and striking for 10 per pass (15 on entry);
 *  · the coil shears into white foam as it travels, then throws a wide
 *    crashing fan with tall spray spikes;
 *  · palette is much paler and greyer than Aqua Vortex.
 * ------------------------------------------------------------------ */
class AquaBreaker{
  constructor(){
    this.root=new THREE.Group();
    this.pal=PAL.breaker;
    this.COILS=7;
    this.coilGroup=new THREE.Group();
    this.root.add(this.coilGroup);
    this.coils=[];
    for(let i=0;i<this.COILS;i++){
      const mat=waterMaterial(this.pal,{flow:0.85,rag:0.24,bands:4.0,foam:0.6,noiseScale:4.2});
      const geo=ribbon(t=>this.coilPoint(t,i),60);
      const m=new THREE.Mesh(geo,mat);
      m.renderOrder=5;
      this.coilGroup.add(m); this.coils.push(m);
    }
    this.charge=this.makeChargeBar();
    this.root.add(this.charge.group);

    this.trail=new THREE.Mesh(new THREE.PlaneGeometry(1,1), decalMaterial(this.pal));
    this.trail.rotation.x=-Math.PI/2; this.trail.position.y=0.016; this.trail.renderOrder=2;
    this.root.add(this.trail);

    // connected crash sheet — the source breaks into one ragged mass of water,
    // not a cloud of separate puffs, so particles only accent this fan.
    this.fanMat=waterMaterial(this.pal,{flow:0.5,rag:0.5,bands:3.0,foam:0.9,noiseScale:3.2});
    this.fan=new THREE.Mesh(ribbon(t=>{
      const a=(-0.95+1.90*t);                 // ±54° fan opening forward
      const r=2.5;
      return {p:new THREE.Vector3(Math.cos(a)*r, 0.35+0.55*Math.sin(Math.PI*t), Math.sin(a)*r), w:1.35};
    },54), this.fanMat);
    this.fan.renderOrder=6; this.fan.visible=false; this.root.add(this.fan);

    this.foam=new BlobPool(this.root, 58, this.pal.foam, this.pal.hi, 0.85);
    this.crash=new BlobPool(this.root, 46, 0xffffff, this.pal.base, 0.92);
    scene.add(this.root);
    this.root.visible=false;
  }
  makeChargeBar(){
    const group=new THREE.Group();
    const back=new THREE.Mesh(new THREE.PlaneGeometry(1.72,0.26),
      new THREE.MeshBasicMaterial({color:0x0a1119,transparent:true,opacity:0.92,depthTest:false}));
    const fill=new THREE.Mesh(new THREE.PlaneGeometry(1.6,0.16),
      new THREE.MeshBasicMaterial({color:0x59a8ff,depthTest:false}));
    fill.position.z=0.01;
    back.renderOrder=21; fill.renderOrder=22;
    group.add(back); group.add(fill);
    return {group,back,fill};
  }
  // one turn of the coil: a helix wound around a cone that narrows upward
  coilPoint(t,i){
    const turns=1.06;
    const u=(i+t*turns)/this.COILS;              // 0 at the base, 1 at the crown
    const a=t*TAU*turns + i*0.62;
    // cone profile: wide skirt, tight crown, slight belly
    const r=lerp(1.0,0.16,Math.pow(u,1.35)) * (0.92+0.16*Math.sin(u*Math.PI));
    const y=0.06 + u*1.62;
    const w=lerp(0.30,0.11,u);
    return {p:new THREE.Vector3(Math.cos(a)*r, y, Math.sin(a)*r), w};
  }
  layout(){
    layoutTargets([[-1.2,-0.5],[0.2,1.0],[1.4,-1.4],[2.8,0.5],[4.0,-0.9],[4.9,1.3]]);
    camRig.dist=22; camRig.focus.set(-0.6,0.6,0);
  }

  update(t, camQuat){
    const R=this.root; R.visible=true;
    this.foam.reset(); this.crash.reset();

    const T=TIMELINE.breaker;
    const CHARGE=1.90, ROLL_END=2.65, BREAK_END=3.15;
    const casterX=-7.4;
    caster.position.set(casterX,0,0);
    caster.rotation.y=0; caster.scale.y=1;

    // ---- phase parameters -----------------------------------------
    const charging = t<CHARGE;
    const chargeK = sat(t/CHARGE);
    const rollK   = sat((t-CHARGE)/(ROLL_END-CHARGE));
    const breakK  = sat((t-ROLL_END)/(BREAK_END-ROLL_END));
    const drainK  = sat((t-BREAK_END)/(T.total-BREAK_END));

    // size: grows through the charge, holds, then shears apart
    const grow = ease.outCubic(sat((t-0.10)/1.55));
    const size = charging ? lerp(0.18,1.0,grow)
                          : lerp(1.0, 1.22, ease.outCubic(rollK)) * (1-0.9*breakK);

    // position: parked ahead of the caster, then rolls forward
    const parkX = casterX+1.35;
    const travel = 11.0;                              // tiles per second
    const x = charging ? parkX : parkX + travel*(t-CHARGE)*(1-0.35*breakK);
    const bob = charging ? 0.02*Math.sin(t*9) : 0.06*Math.sin(t*22);

    this.coilGroup.position.set(x, bob, 0);
    this.coilGroup.scale.setScalar(Math.max(0.001,size*1.55));
    // spins about its axis while charging, then rolls: fast spin + forward pitch
    this.coilGroup.rotation.y = -t*(charging?TAU*0.85:TAU*2.6);
    this.coilGroup.rotation.z = charging?0:-0.14*Math.sin(t*10);

    const coilAlpha = charging ? sat(chargeK*4.0)
                               : (1 - smooth(breakK*1.9));
    for(let i=0;i<this.COILS;i++){
      const m=this.coils[i];
      const own=sat((chargeK*this.COILS)-(i*0.55));
      m.visible = coilAlpha>0.02 && (charging? own>0.02 : true);
      const u=m.material.uniforms;
      u.uTime.value=t;
      u.uAlpha.value=coilAlpha*(charging?sat(own):1);
      // bands shear apart as the coil breaks up
      u.uRag.value = 0.24 + breakK*0.5;
    }

    // ---- charge bar (blue below ~55%, green above, as in the source)
    const cb=this.charge;
    cb.group.visible = charging;
    if(charging){
      cb.group.position.set(x, 2.5, 0);
      cb.group.quaternion.copy(camQuat);
      const k=chargeK;
      cb.fill.scale.x=Math.max(0.001,k);
      cb.fill.position.x=-(1.6*(1-k))/2;
      cb.fill.material.color.setHex(k<0.55?0x59a8ff:0x63e07a);
    }

    // ---- wet trail behind the roll ---------------------------------
    const tr=this.trail.material.uniforms;
    const rolling = t>=CHARGE && t<BREAK_END;
    this.trail.visible = rolling || drainK<1;
    tr.uTime.value=t;
    tr.uRing.value=0;
    tr.uAlpha.value = rolling?0.5:(1-drainK)*0.4;
    const trailLen = Math.max(0.6, (x-parkX)+2.4);
    this.trail.scale.set(trailLen, 3.1*size, 1);
    this.trail.position.set(parkX + trailLen/2 - 1.0, 0.016, 0);

    // ---- foam torn off the coil while rolling ----------------------
    if(t>=CHARGE-0.05){
      for(let i=0;i<this.foam.items.length;i++){
        const born = CHARGE + rnd(i,3.3)*(BREAK_END-CHARGE);
        const age=t-born;
        const life=0.30+rnd(i,4.8)*0.30;
        if(age<0||age>life) continue;
        const k=age/life;
        const bx = parkX + travel*(born-CHARGE);
        const a0 = rnd(i,5.2)*TAU;
        const spread = lerp(0.25,1.5,k)*(0.6+rnd(i,6.6)*0.9);
        const px = bx - k*2.2 + Math.cos(a0)*spread*0.5;
        const pz = Math.sin(a0)*spread;
        const py = 0.25 + Math.sin(k*Math.PI)*(0.7+rnd(i,7.1)*0.9);
        const s = lerp(0.70,0.14,k)*(0.7+rnd(i,8.4)*0.8);
        this.foam.place(i, px, py, pz, s, (1-k*k), camQuat);
      }
    }

    // ---- crashing fan ----------------------------------------------
    const cxFan = parkX + travel*(ROLL_END-CHARGE);
    this.fan.visible = breakK>0 && breakK<1;
    if(this.fan.visible){
      const k=ease.outQuint(breakK);
      this.fan.position.set(cxFan-0.6, 0, 0);
      this.fan.scale.set(lerp(0.35,1.5,k), lerp(0.5,1.25,k), lerp(0.35,1.5,k));
      this.fan.material.uniforms.uTime.value=t;
      this.fan.material.uniforms.uAlpha.value=(1-smooth((breakK-0.45)/0.55))*0.95;
    }
    if(breakK>0){
      const cx = cxFan;
      for(let i=0;i<this.crash.items.length;i++){
        const born = rnd(i,9.1)*0.20;
        const age = (t-ROLL_END)-born;
        const life = 0.34+rnd(i,10.2)*0.40;
        if(age<0||age>life) continue;
        const k=age/life;
        // a wide fan biased forward, with tall vertical spikes
        const spreadA = (rnd(i,11.3)-0.5)*Math.PI*1.15;
        const dist = lerp(0.3, 4.6, ease.outQuint(k))*(0.5+rnd(i,12.4)*0.9);
        const px = cx + Math.cos(spreadA)*dist*1.15;
        const pz = Math.sin(spreadA)*dist;
        const up = rnd(i,13.5);
        const py = 0.2 + Math.sin(k*Math.PI)*(0.35 + (up>0.7?up*3.4:up*1.0));
        const s = lerp(1.10,0.22,k)*(0.55+rnd(i,14.6)*0.9);
        const spike = up>0.7 ? 2.4 : 1.0;    // a quarter of the mass throws tall spray
        this.crash.place(i, px, py, pz, s, (1-k*k), camQuat, spike);
      }
    }

    // ---- hits: 15 on entry, 10 per pass ----------------------------
    const hits=[], pops=[];
    const ballR = 1.55*size;
    targets.forEach((tg,i)=>{
      const first = tg.userData.firstHit ?? null;
      const d=Math.hypot(tg.position.x-x, tg.position.z);
      const touching = (t>=CHARGE && t<BREAK_END+0.15 && d < ballR+0.45);
      if(touching){
        if(tg.userData.hitAt===undefined) tg.userData.hitAt=t;
        hits.push({i});
      }
      const hitAt=tg.userData.hitAt;
      if(hitAt!==undefined && t>=hitAt){
        const age=t-hitAt;
        if(age<0.7){
          pops.push({x:tg.position.x, z:tg.position.z, y:1.6+age*1.4, text:'15', big:true,
                     alpha:1-smooth((age-0.4)/0.3)});
        }
        // the source stacks a column of small 10s while the wave keeps working
        for(let k=0;k<3;k++){
          const ta=age-(0.14+k*0.15);
          if(ta>0&&ta<0.50){
            pops.push({x:tg.position.x+0.85, z:tg.position.z-0.15, y:1.15+k*0.52+ta*0.7,
                       text:'10', big:false, alpha:1-smooth((ta-0.28)/0.22)});
          }
        }
      }
    });
    flashTargets(hits);
    showPopups(pops);
  }
  resetHits(){ targets.forEach(t=>{ delete t.userData.hitAt; }); }
  hide(){ this.root.visible=false; }
}

/* ------------------------------------------------------------------ *
 * Shared pieces for the fire and earth Arcana
 * ------------------------------------------------------------------ */

// Radiating white spike flash — the showcase draws this on every earth and
// fissure contact, and it is what makes a hit read at 30 fps.
function starTexture(){
  const S=128,c=document.createElement('canvas'); c.width=c.height=S;
  const g=c.getContext('2d');
  g.translate(S/2,S/2);
  g.fillStyle='#ffffff';
  for(let i=0;i<8;i++){
    const a=i/8*TAU + 0.19;
    const len=(i%2?0.30:0.48)*S, w=(i%2?2.2:3.4);
    g.save(); g.rotate(a);
    g.beginPath(); g.moveTo(0,-w); g.lineTo(len,0); g.lineTo(0,w); g.closePath(); g.fill();
    g.restore();
  }
  g.beginPath(); g.arc(0,0,S*0.10,0,TAU); g.fill();
  const t=new THREE.CanvasTexture(c); t.magFilter=THREE.NearestFilter;
  return t;
}
const STAR_TEX=starTexture();
class StarPool{
  constructor(scene,count){
    this.items=[];
    for(let i=0;i<count;i++){
      const m=new THREE.Sprite(new THREE.SpriteMaterial({map:STAR_TEX,transparent:true,depthWrite:false,depthTest:false}));
      m.visible=false; m.renderOrder=12; scene.add(m); this.items.push(m);
    }
  }
  reset(){ for(const m of this.items) m.visible=false; }
  place(i,x,y,z,size,alpha,rot=0){
    const m=this.items[i]; if(!m) return;
    m.visible=alpha>0.02; m.position.set(x,y,z);
    m.scale.set(size,size,1); m.material.opacity=alpha; m.material.rotation=rot;
  }
}

// Opaque props (auger fins, axe blades): quantised three-band flats, no
// specular, matching how the source paints solid objects.
const SOLID_VERT=`
  varying vec3 vN; varying vec2 vUv;
  void main(){ vN=normalize(mat3(modelMatrix)*normal); vUv=uv;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
`;
const SOLID_FRAG=`
  precision highp float;
  float sat(float v){ return clamp(v,0.0,1.0); }
  uniform vec3 uDeep,uMid,uBase,uHi; uniform float uAlpha,uSeed;
  varying vec3 vN; varying vec2 vUv;
  ${NOISE_GLSL}
  void main(){
    float d=dot(normalize(vN), normalize(vec3(-0.30,0.86,0.42)));
    float n=fbm(vUv*5.0+uSeed);
    float shade=sat(d*0.5+0.5+(n-0.5)*0.30);
    shade=floor(shade*3.0)/2.0;
    vec3 col = shade<0.5 ? mix(uDeep,uMid,shade/0.5) : mix(uMid,uBase,(shade-0.5)/0.5);
    col = mix(col,uHi,smoothstep(0.85,1.0,shade));
    gl_FragColor=vec4(col,uAlpha);
  }
`;
function solidMaterial(pal,seed=0){
  return new THREE.ShaderMaterial({
    uniforms:{uDeep:{value:new THREE.Color(pal.deep)},uMid:{value:new THREE.Color(pal.mid)},
      uBase:{value:new THREE.Color(pal.base)},uHi:{value:new THREE.Color(pal.hi)},
      uAlpha:{value:1},uSeed:{value:seed}},
    vertexShader:SOLID_VERT, fragmentShader:SOLID_FRAG,
    transparent:true, depthWrite:true, side:THREE.DoubleSide,
  });
}

// Ground scarring: scorch strips, churned bore tracks, dormant fissure cracks.
function scarMaterial(colA,colB,cracks){
  return new THREE.ShaderMaterial({
    uniforms:{uA:{value:new THREE.Color(colA)},uB:{value:new THREE.Color(colB)},
      uAlpha:{value:0},uTime:{value:0},uCracks:{value:cracks?1:0},uGlow:{value:0}},
    vertexShader:BLOB_VERT,
    fragmentShader:`
      precision highp float;
      uniform vec3 uA,uB; uniform float uAlpha,uTime,uCracks,uGlow;
      varying vec2 vUv;
      ${NOISE_GLSL}
      void main(){
        vec2 p=vUv*2.0-1.0;
        float d=length(p);
        float n=fbm(vUv*7.0);
        float body=smoothstep(1.0,0.25,d+(n-0.5)*0.85);
        float a=body;
        vec3 col=mix(uB,uA,n);
        if(uCracks>0.5){
          // branching cracks: thin dark veins with an ember line inside
          float v=abs(fbm(vUv*5.5+3.7)-0.5);
          float crack=smoothstep(0.075,0.0,v)*body;
          a=crack;
          col=mix(uB,uA,smoothstep(0.03,0.0,v));
          col=mix(col, vec3(1.0,0.62,0.14), smoothstep(0.03,0.0,v)*uGlow);
        }
        if(a<=0.012) discard;
        gl_FragColor=vec4(col,a*uAlpha);
      }`,
    transparent:true, depthWrite:false,
  });
}

/* ------------------------------------------------------------------ *
 * ABILITY 3 — IGNITION DRIVE
 *
 * Source notes (353.0–357.0) plus frame review at 353.35–354.30:
 *  · five ordered blasts step along one aimed ground line;
 *  · the first four are compact 10-damage carry beats, ~0.075 s apart,
 *    each opening on a white-hot core that steps outward;
 *  · the fifth is visibly larger, deals 30, and applies burn;
 *  · flame is painted in flat orange chunks over black smoke masses;
 *  · a black scorch strip is left along the whole route.
 * ------------------------------------------------------------------ */
class IgnitionDrive{
  constructor(){
    this.root=new THREE.Group();
    this.pal=PAL.fire;
    this.BEATS=5;
    this.SPACING=1.75;
    this.originX=-4.6;
    this.flame=new BlobPool(this.root,74,this.pal.base,this.pal.deep,0.78);
    this.core =new BlobPool(this.root,14,this.pal.foam,this.pal.hi,0.42);
    this.smoke=new BlobPool(this.root,34,PAL.smoke.base,PAL.smoke.deep,0.72);
    this.ember=new BlobPool(this.root,26,this.pal.hi,this.pal.mid,0.5);
    this.stars=new StarPool(this.root,6);
    this.scorch=new THREE.Mesh(new THREE.PlaneGeometry(1,1), scarMaterial(0x241d17,0x0b0908,false));
    this.scorch.rotation.x=-Math.PI/2; this.scorch.position.y=0.014; this.scorch.renderOrder=2;
    this.root.add(this.scorch);
    scene.add(this.root); this.root.visible=false;
  }
  beatX(i){ return this.originX + this.SPACING*(i+1); }
  beatTime(i){ return i<4 ? 0.08+i*0.075 : 0.40; }
  layout(){
    layoutTargets([[-1.6,0.15],[0.6,-0.35],[2.6,0.3],[4.2,-0.2],[5.6,0.5]]);
    camRig.dist=19; camRig.focus.set(0.4,0.6,0);
  }
  update(t,camQuat){
    this.root.visible=true;
    this.flame.reset(); this.core.reset(); this.smoke.reset(); this.ember.reset(); this.stars.reset();

    let fi=0, ci=0, si=0, ei=0, sti=0;
    const hits=[], pops=[];

    for(let b=0;b<this.BEATS;b++){
      const bt=this.beatTime(b);
      const age=t-bt;
      const finisher = b===4;
      const R = finisher?2.15:1.25;                 // finisher is visibly larger
      const life = finisher?0.46:0.30;
      const bx=this.beatX(b);
      if(age<0||age>life+0.35) continue;
      const k=sat(age/life);

      // white-hot ignition core, the part that steps outward frame to frame
      if(age<life*0.42 && ci<this.core.items.length){
        const cs=lerp(finisher?1.5:0.95, 0.15, sat(age/(life*0.42)));
        this.core.place(ci++, bx, 0.55, 0, cs, 1-sat(age/(life*0.45)), camQuat);
      }
      // chunky flame body
      const nFlame = finisher?22:14;
      for(let j=0;j<nFlame && fi<this.flame.items.length;j++){
        const seed=b*31+j;
        const a0=rnd(seed,1.4)*TAU;
        const rad=lerp(0.10, R*(0.40+rnd(seed,2.6)*0.62), ease.outCubic(k));
        const px=bx+Math.cos(a0)*rad*1.15;
        const pz=Math.sin(a0)*rad*0.85;
        const py=0.32+Math.sin(k*Math.PI)*(0.55+rnd(seed,3.8)*1.15)+rnd(seed,9.2)*0.25;
        const sz=lerp(finisher?1.75:1.20, 0.22, k)*(0.65+rnd(seed,4.9)*0.8);
        this.flame.place(fi++, px, py, pz, sz, (1-k*k)*0.98, camQuat);
      }
      // black smoke sits under and behind the flame
      const nSmoke = finisher?9:5;
      for(let j=0;j<nSmoke && si<this.smoke.items.length;j++){
        const seed=b*57+j+400;
        const a0=rnd(seed,5.1)*TAU;
        const rad=lerp(0.2, R*0.95, ease.outCubic(k))*(0.5+rnd(seed,6.3)*0.8);
        const py=0.22+k*(0.7+rnd(seed,7.4)*1.3);
        const sz=lerp(finisher?1.85:1.30,0.7,k*0.6)*(0.6+rnd(seed,8.5)*0.7);
        this.smoke.place(si++, bx+Math.cos(a0)*rad, py, Math.sin(a0)*rad*0.8, sz, (1-k)*0.8, camQuat);
      }
      // embers fall out of the blast
      for(let j=0;j<(finisher?7:4) && ei<this.ember.items.length;j++){
        const seed=b*97+j+900;
        const ea=age-0.06-rnd(seed,2.2)*0.10;
        if(ea<0) continue;
        const ek=sat(ea/0.42);
        const a0=rnd(seed,3.3)*TAU;
        const rad=R*(0.7+rnd(seed,4.4)*1.1)*ease.outCubic(ek);
        const py=0.30+Math.sin(ek*Math.PI)*1.05*(0.4+rnd(seed,5.5));
        this.ember.place(ei++, bx+Math.cos(a0)*rad*1.2, py, Math.sin(a0)*rad*0.9,
          lerp(0.30,0.07,ek)*(0.6+rnd(seed,6.6)*0.7), (1-ek)*0.95, camQuat);
      }
      if(age<0.10 && sti<this.stars.items.length){
        this.stars.place(sti++, bx, 0.6, 0, (finisher?4.4:2.6)*(1+age*2), 1-sat(age/0.10), rnd(b,2.1)*TAU);
      }

      // damage + the carry that walks targets into the next blast
      targets.forEach((tg,i)=>{
        const d=Math.hypot(tg.position.x-bx, tg.position.z);
        if(d<R+0.55){
          if(age<0.06) hits.push({i});
          if(age>=0 && age<0.62){
            pops.push({x:tg.position.x, z:tg.position.z, y:1.5+age*1.4,
              text:finisher?'30':'10', big:finisher,
              alpha:1-smooth((age-0.34)/0.26)});
          }
          if(!finisher && age>0 && age<0.16){
            // pushed toward the next beat rather than scattered sideways
            const target=this.beatX(b+1);
            tg.position.x += (target-tg.position.x)*0.16;
          }
        }
      });
    }
    flashTargets(hits); showPopups(pops);

    // scorch strip along the whole route
    const sc=this.scorch.material.uniforms;
    const routeLen=this.SPACING*this.BEATS+1.4;
    const reveal=sat((t-0.06)/0.42);
    this.scorch.scale.set(routeLen*reveal, 2.5, 1);
    this.scorch.position.x=this.originX+0.7+(routeLen*reveal)/2;
    sc.uTime.value=t;
    sc.uAlpha.value=sat(reveal*1.4)*(1-smooth((t-0.95)/0.35))*0.9;

    caster.position.set(this.originX-0.5,0,0);
    caster.rotation.y=0;
    caster.scale.y=1-0.14*Math.sin(sat(t/0.14)*Math.PI);
  }
  hide(){ this.root.visible=false; }
  resetHits(){}
}

/* ------------------------------------------------------------------ *
 * ABILITY 4 — ENGULFING FISSURE
 *
 * Source notes (369.0–378.0) plus frame review at 374.6–375.6:
 *  · base placement creates three separate dormant traps, not one field;
 *  · traps stay stationary and harmless while the caster moves off;
 *  · a target entering one trap is pulled to its centre and consumed by
 *    exactly five timed hits, each a white star flash with radial spikes
 *    and a splatter of flat orange flame petals;
 *  · the used trap is consumed; unused traps stay armed and expire.
 * ------------------------------------------------------------------ */
class EngulfingFissure{
  constructor(){
    this.root=new THREE.Group();
    this.pal=PAL.fire;
    this.OFFSETS=[[1.9,-1.5],[3.1,1.4],[0.5,2.2]];   // authored local offsets
    this.HITS=5;
    this.traps=this.OFFSETS.map((o,i)=>{
      const m=new THREE.Mesh(new THREE.PlaneGeometry(3.4,3.4), scarMaterial(0x2a1c0e,0x080605,true));
      m.rotation.x=-Math.PI/2; m.position.set(o[0],0.016,o[1]); m.renderOrder=2;
      this.root.add(m); return m;
    });
    this.flame=new BlobPool(this.root,60,this.pal.base,this.pal.deep,0.80);
    this.ember=new BlobPool(this.root,22,this.pal.hi,this.pal.mid,0.5);
    this.stars=new StarPool(this.root,7);
    scene.add(this.root); this.root.visible=false;
  }
  layout(){
    layoutTargets([[2.05,-1.15],[5.2,-2.4],[5.9,0.9]]);
    camRig.dist=18; camRig.focus.set(1.6,0.6,0.2);
  }
  update(t,camQuat){
    this.root.visible=true;
    this.flame.reset(); this.ember.reset(); this.stars.reset();
    const TRIG=1.30, HIT0=1.42, GAP=0.135;

    // dormant cracks: appear on the strike, then idle with a faint ember pulse
    this.traps.forEach((m,i)=>{
      const born=0.06+i*0.055;
      const open=sat((t-born)/0.20);
      const used=(i===0);
      const consumed = used ? sat((t-(HIT0+this.HITS*GAP))/0.30) : 0;
      const expire = used?0:sat((t-2.55)/0.60);
      const u=m.material.uniforms;
      u.uTime.value=t;
      u.uAlpha.value=open*(1-consumed)*(1-expire)*0.95;
      u.uGlow.value=0.35+0.25*Math.sin(t*5.0+i*1.7) + (used&&t>TRIG?1.0:0);
      m.scale.setScalar(lerp(0.4,1.0,ease.outCubic(open)));
    });

    const hits=[], pops=[];
    // the triggering target is pulled to the trap centre and held there
    const trap=this.OFFSETS[0];
    const victim=targets[0];
    if(victim){
      if(t<TRIG){
        victim.position.set(2.05,0,-1.15);
      }else{
        const pull=smooth((t-TRIG)/0.12);
        victim.position.x=lerp(2.05,trap[0],pull);
        victim.position.z=lerp(-1.15,trap[1],pull);
      }
    }

    let fi=0, ei=0, si=0;
    for(let h=0;h<this.HITS;h++){
      const ht=HIT0+h*GAP;
      const age=t-ht;
      if(age<0||age>0.42) continue;
      const k=sat(age/0.30);
      const cx=trap[0], cz=trap[1];

      if(age<0.09 && si<this.stars.items.length){
        this.stars.place(si++, cx, 0.75, cz, 3.2+age*7.0, 1-sat(age/0.09), rnd(h,4.2)*TAU);
      }
      for(let j=0;j<11 && fi<this.flame.items.length;j++){
        const seed=h*41+j;
        const a0=rnd(seed,1.9)*TAU;
        const rad=lerp(0.1,1.55*(0.5+rnd(seed,2.8)*0.9),ease.outCubic(k));
        const py=0.3+Math.sin(k*Math.PI)*(0.5+rnd(seed,3.9)*1.25);
        const sz=lerp(0.85,0.14,k)*(0.55+rnd(seed,5.1)*0.9);
        this.flame.place(fi++, cx+Math.cos(a0)*rad*1.1, py, cz+Math.sin(a0)*rad*0.9, sz, (1-k*k), camQuat);
      }
      for(let j=0;j<4 && ei<this.ember.items.length;j++){
        const seed=h*67+j+700;
        const ek=sat(age/0.40);
        const a0=rnd(seed,6.2)*TAU;
        const rad=1.9*ease.outCubic(ek)*(0.5+rnd(seed,7.3)*0.9);
        this.ember.place(ei++, cx+Math.cos(a0)*rad, 0.3+Math.sin(ek*Math.PI)*1.2, cz+Math.sin(a0)*rad*0.85,
          lerp(0.26,0.06,ek)*(0.6+rnd(seed,8.1)*0.8), (1-ek)*0.9, camQuat);
      }
      if(age<0.05) hits.push({i:0});
      if(age<0.5){
        pops.push({x:cx+0.5, z:cz, y:1.35+h*0.30+age*1.1, text:'5', big:false,
                   alpha:1-smooth((age-0.28)/0.22)});
      }
    }
    flashTargets(hits); showPopups(pops);

    // the caster plants the traps, then walks clear the way the source does
    const walk=sat((t-0.36)/1.10);
    caster.position.set(lerp(1.7,-1.7,walk),0,lerp(0.1,1.0,walk));
    caster.rotation.y=0;
    caster.scale.y=1-0.16*Math.sin(sat(t/0.16)*Math.PI);
  }
  hide(){ this.root.visible=false; }
  resetHits(){}
}

/* ------------------------------------------------------------------ *
 * ABILITY 5 — TECTONIC DRILL
 *
 * Frame review at 664.6–666.0 (base) and 669.6–671.2 (charged):
 *  · a conical auger of stacked crescent fins breaks the floor and runs
 *    forward along the ground, point first;
 *  · fins decrease in radius toward the tip and are set on a helix, so the
 *    stack reads as a turning screw;
 *  · warm tan flats with a dark shadowed root, white spark stars on contact;
 *  · slabs and dust are thrown up and the bore leaves a churned track.
 * ------------------------------------------------------------------ */
class TectonicDrill{
  constructor(){
    this.root=new THREE.Group();
    this.pal=PAL.earth;
    this.FINS=7;
    this.rig=new THREE.Group();          // travels
    this.spin=new THREE.Group();         // turns about the travel axis
    this.rig.add(this.spin); this.root.add(this.rig);
    // Solid tapered body plus helical ribs: the source auger reads as one
    // continuous cone of overlapping shells, not as separate floating blades.
    const core=new THREE.Mesh(new THREE.ConeGeometry(0.96,2.95,9,1,true),
      solidMaterial({deep:0x4a3316,mid:0x63481f,base:0x74562a,hi:0x8a693a},0.2));
    core.rotation.z=-Math.PI/2; core.position.x=0.20; this.spin.add(core);
    for(let i=0;i<this.FINS;i++){
      const u=i/(this.FINS-1);                     // 0 at the skirt, 1 at the tip
      const r=lerp(0.99,0.20,Math.pow(u,0.90));
      const geo=new THREE.TorusGeometry(r, lerp(0.19,0.075,u), 5, 16, 4.6);
      const m=new THREE.Mesh(geo, solidMaterial(this.pal, i*0.7));
      m.rotation.y=Math.PI/2;                      // ring lies around the +X axis
      m.rotation.z=i*1.02;                         // helical phase per rib
      m.position.x=lerp(-1.22,1.28,u);
      m.renderOrder=5;
      this.spin.add(m);
    }
    // the point at the leading end
    const tip=new THREE.Mesh(new THREE.ConeGeometry(0.24,0.80,8), solidMaterial(this.pal,3.3));
    tip.rotation.z=-Math.PI/2; tip.position.x=1.72; this.spin.add(tip);

    this.track=new THREE.Mesh(new THREE.PlaneGeometry(1,1), scarMaterial(0x5a4326,0x241a10,false));
    this.track.rotation.x=-Math.PI/2; this.track.position.y=0.015; this.track.renderOrder=2;
    this.root.add(this.track);
    this.rubble=new BlobPool(this.root,40,this.pal.base,this.pal.deep,0.75);
    this.dust  =new BlobPool(this.root,30,this.pal.foam,this.pal.mid,0.7);
    this.stars =new StarPool(this.root,6);
    scene.add(this.root); this.root.visible=false;
  }
  layout(){
    layoutTargets([[-0.6,0.5],[1.4,-0.6],[3.0,0.4],[4.6,-0.5],[6.0,0.6]]);
    camRig.dist=19; camRig.focus.set(0.8,0.6,0);
  }
  posAt(t){
    const START=-5.0, SPEED=9.4, T0=0.32;
    return START + SPEED*Math.max(0,Math.min(t,1.15)-T0);
  }
  update(t,camQuat){
    this.root.visible=true;
    this.rubble.reset(); this.dust.reset(); this.stars.reset();

    const x=this.posAt(t);
    const emerge=smooth((t-0.18)/0.14);
    const submerge=smooth((t-1.15)/0.22);
    const shown=emerge*(1-submerge);

    this.rig.position.set(x, lerp(-1.15,0.62,emerge)-submerge*1.5, 0);
    this.rig.visible=shown>0.02;
    this.spin.rotation.x = t*TAU*3.4;
    this.spin.scale.setScalar(lerp(0.55,1.0,emerge));
    for(const m of this.spin.children) m.material.uniforms.uAlpha.value=sat(shown*1.4);

    // churned bore track behind the drill
    const tr=this.track.material.uniforms;
    const startX=this.posAt(0.32);
    const len=Math.max(0.4, x-startX+1.0);
    this.track.scale.set(len, 1.9, 1);
    this.track.position.x=startX+len/2-0.5;
    tr.uTime.value=t;
    tr.uAlpha.value=sat((t-0.20)/0.16)*(1-smooth((t-1.42)/0.18))*0.85;

    // slabs and dust thrown along the bore
    for(let i=0;i<this.rubble.items.length;i++){
      const born=0.20+rnd(i,1.3)*1.00;
      const age=t-born; const life=0.42+rnd(i,2.4)*0.30;
      if(age<0||age>life) continue;
      const k=age/life;
      const bx=this.posAt(born);
      const side=rnd(i,3.5)<0.5?-1:1;
      const spread=lerp(0.25,1.5,k)*(0.5+rnd(i,4.6)*0.8);
      this.rubble.place(i, bx-k*1.1+ (rnd(i,5.7)-0.5)*0.7, 0.25+Math.sin(k*Math.PI)*(0.8+rnd(i,6.8)*1.1),
        side*spread, lerp(0.42,0.10,k)*(0.6+rnd(i,7.9)*0.8), (1-k)*0.95, camQuat);
    }
    for(let i=0;i<this.dust.items.length;i++){
      const born=0.22+rnd(i,8.2)*1.05;
      const age=t-born; const life=0.55+rnd(i,9.3)*0.35;
      if(age<0||age>life) continue;
      const k=age/life;
      const bx=this.posAt(born);
      this.dust.place(i, bx-k*1.6+(rnd(i,10.4)-0.5)*1.1, 0.2+k*1.1,
        (rnd(i,11.5)-0.5)*2.4*(0.4+k), lerp(0.5,1.15,k)*(0.5+rnd(i,12.6)*0.7), (1-k)*0.42, camQuat);
    }

    // contact: spark star, 10 damage, and a shove along the bore
    const hits=[], pops=[];
    let si=0;
    targets.forEach((tg,i)=>{
      const d=Math.hypot(tg.position.x-x, tg.position.z);
      const touching = shown>0.3 && d<1.35;
      if(touching){
        if(tg.userData.drillAt===undefined) tg.userData.drillAt=t;
        hits.push({i});
        if(si<this.stars.items.length) this.stars.place(si++, x+0.6, 0.7, tg.position.z*0.6, 3.0, 0.95, t*9+i);
      }
      const at=tg.userData.drillAt;
      if(at!==undefined && t>=at && t-at<0.6){
        const age=t-at;
        pops.push({x:tg.position.x, z:tg.position.z, y:1.5+age*1.3, text:'10', big:true,
                   alpha:1-smooth((age-0.34)/0.26)});
      }
    });
    flashTargets(hits); showPopups(pops);

    caster.position.set(-6.2,0,0); caster.rotation.y=0;
    caster.scale.y=1-0.18*Math.sin(sat(t/0.18)*Math.PI);
  }
  resetHits(){ targets.forEach(t=>{ delete t.userData.drillAt; }); }
  hide(){ this.root.visible=false; }
}

/* ------------------------------------------------------------------ *
 * ABILITY 6 — ROCK-SOLID TOMAHAWK
 *
 * Frame review at 678.15–680.0:
 *  · the caster raises a double-bitted stone axe overhead, then throws it;
 *  · two pale stone blades on a short brown haft with an olive binding;
 *  · it flies flat and spins fast, holding a small ground shadow, strikes
 *    for 15 with a white star flash, then arcs back to the caster.
 * ------------------------------------------------------------------ */
class RockSolidTomahawk{
  constructor(){
    this.root=new THREE.Group();
    this.axe=new THREE.Group();
    // blade silhouette: a fan with a curved cutting edge
    const shape=new THREE.Shape();
    shape.moveTo(0.06,-0.14);
    shape.lineTo(0.30,-0.42);
    shape.quadraticCurveTo(0.62,0.0,0.30,0.42);
    shape.lineTo(0.06,0.14);
    shape.closePath();
    const bladeGeo=new THREE.ExtrudeGeometry(shape,{depth:0.10,bevelEnabled:true,bevelSize:0.03,bevelThickness:0.03,bevelSegments:1});
    bladeGeo.center();
    for(const dir of [1,-1]){
      const b=new THREE.Mesh(bladeGeo, solidMaterial(PAL.stone, dir>0?0.4:2.9));
      b.position.x=dir*0.34; b.rotation.y=dir>0?0:Math.PI;
      b.rotation.x=Math.PI/2;
      this.axe.add(b);
    }
    const haft=new THREE.Mesh(new THREE.CylinderGeometry(0.075,0.085,0.95,7),
      new THREE.MeshBasicMaterial({color:0x8a5a30}));
    haft.rotation.x=Math.PI/2; this.axe.add(haft);
    const bind=new THREE.Mesh(new THREE.CylinderGeometry(0.115,0.115,0.20,7),
      new THREE.MeshBasicMaterial({color:0x6f7a3a}));
    bind.rotation.x=Math.PI/2; this.axe.add(bind);
    this.axe.scale.setScalar(1.65);
    this.root.add(this.axe);

    this.shadow=new THREE.Mesh(new THREE.CircleGeometry(0.34,14),
      new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.30}));
    this.shadow.rotation.x=-Math.PI/2; this.shadow.position.y=0.02; this.root.add(this.shadow);

    this.chips=new BlobPool(this.root,26,PAL.stone.mid,PAL.stone.deep,0.85);
    this.dust =new BlobPool(this.root,18,PAL.earth.foam,PAL.earth.mid,0.7);
    this.stars=new StarPool(this.root,4);
    scene.add(this.root); this.root.visible=false;
  }
  layout(){
    layoutTargets([[2.4,-0.2],[4.3,0.9],[5.9,-0.7]]);
    camRig.dist=18; camRig.focus.set(1.4,0.8,0);
  }
  // out along the aim line, then a curved return, as the source shows
  flightAt(t){
    const HOME=new THREE.Vector3(-2.6,1.25,0.2);
    const THROW=0.35, OUT_END=1.05, BACK_END=1.85;
    if(t<THROW){
      const k=smooth(t/THROW);
      return {p:HOME.clone().add(new THREE.Vector3(0.1*k,0.55*k,0)), held:true};
    }
    if(t<OUT_END){
      const k=(t-THROW)/(OUT_END-THROW);
      const e=ease.outCubic(k);
      return {p:new THREE.Vector3(lerp(HOME.x,6.4,e), 1.05+Math.sin(k*Math.PI)*0.42, lerp(HOME.z,-0.5,e)), held:false};
    }
    if(t<BACK_END){
      const k=(t-OUT_END)/(BACK_END-OUT_END);
      const e=smooth(k);
      // curved return: swings wide before coming home
      const ang=lerp(0,Math.PI,e);
      const cx=lerp(6.4,HOME.x,e);
      return {p:new THREE.Vector3(cx, 1.05+Math.sin(e*Math.PI)*0.25, lerp(-0.5,HOME.z,e)+Math.sin(ang)*1.9), held:false};
    }
    return {p:HOME.clone(), held:true};
  }
  update(t,camQuat){
    this.root.visible=true;
    this.chips.reset(); this.dust.reset(); this.stars.reset();

    const f=this.flightAt(t);
    this.axe.position.copy(f.p);
    // held overhead upright, then flat and spinning fast once thrown
    if(f.held && t<0.35){
      this.axe.rotation.set(-1.15,0,0);
      this.axe.rotation.z=lerp(0,-0.5,smooth(t/0.35));
    }else if(t>=1.85){
      this.axe.rotation.set(-1.05,0,0);
    }else{
      this.axe.rotation.set(0, t*TAU*6.2, 0);
    }
    this.shadow.position.set(f.p.x,0.02,f.p.z);
    this.shadow.scale.setScalar(lerp(1.0,0.7,sat((f.p.y-0.9)/0.8)));
    this.shadow.visible=!f.held||t>=1.85;

    const hits=[], pops=[]; let si=0, ci=0, di=0;
    targets.forEach((tg,i)=>{
      const d=Math.hypot(tg.position.x-f.p.x, tg.position.z-f.p.z);
      if(t>0.35 && t<1.85 && d<0.95){
        if(tg.userData.axeAt===undefined) tg.userData.axeAt=t;
        hits.push({i});
      }
      const at=tg.userData.axeAt;
      if(at!==undefined && t>=at){
        const age=t-at;
        if(age<0.10 && si<this.stars.items.length){
          this.stars.place(si++, tg.position.x, 0.95, tg.position.z, 3.4+age*8, 1-sat(age/0.10), rnd(i,3.7)*TAU);
        }
        if(age<0.62){
          pops.push({x:tg.position.x, z:tg.position.z, y:1.55+age*1.3, text:'15', big:true,
                     alpha:1-smooth((age-0.36)/0.26)});
        }
        // stone chips knocked off the contact
        for(let j=0;j<6 && ci<this.chips.items.length;j++){
          const seed=i*29+j;
          const ck=sat((age-rnd(seed,1.1)*0.05)/0.40);
          if(ck<=0||ck>=1) continue;
          const a0=rnd(seed,2.2)*TAU;
          const rad=1.5*ease.outCubic(ck)*(0.4+rnd(seed,3.3)*0.9);
          this.chips.place(ci++, tg.position.x+Math.cos(a0)*rad, 0.4+Math.sin(ck*Math.PI)*1.0,
            tg.position.z+Math.sin(a0)*rad*0.85, lerp(0.17,0.04,ck)*(0.6+rnd(seed,4.4)*0.7), (1-ck)*0.9, camQuat);
        }
      }
    });
    // faint dust off the spin
    if(t>0.35&&t<1.85){
      for(let j=0;j<10 && di<this.dust.items.length;j++){
        const born=0.36+rnd(j,5.5)*1.4;
        const age=t-born; if(age<0||age>0.45) continue;
        const k=age/0.45;
        const bp=this.flightAt(born).p;
        this.dust.place(di++, bp.x-k*0.5, bp.y-0.35+k*0.3, bp.z+(rnd(j,6.6)-0.5)*0.7,
          lerp(0.28,0.55,k), (1-k)*0.3, camQuat);
      }
    }
    flashTargets(hits); showPopups(pops);

    caster.position.set(-2.9,0,0.2); caster.rotation.y=0;
    caster.scale.y=1-0.10*Math.sin(sat(t/0.35)*Math.PI);
  }
  resetHits(){ targets.forEach(t=>{ delete t.userData.axeAt; }); }
  hide(){ this.root.visible=false; }
}


/* ------------------------------------------------------------------ *
 * ABILITY 7 — FLAME BREATH (base form)
 *
 * Source notes (217.0–227.0) plus frame review at 218.40–219.20:
 *  · the caster is planted and projects a broad, close plume forward;
 *  · the footprint is a rounded cone, not a beam and not a travelling ball;
 *  · a white-yellow ignition flash opens at the mouth before the plume;
 *  · a target standing inside takes up to three discrete 18-damage hits;
 *  · the plume collapses into dark smoke lying on the ground.
 * ------------------------------------------------------------------ */
class FlameBreath{
  constructor(){
    this.root=new THREE.Group();
    this.pal=PAL.fire;
    this.REACH=3.4;                       // cone length in tiles
    this.SPREAD=0.80;                     // half-angle, radians
    this.flame=new BlobPool(this.root,72,this.pal.base,this.pal.deep,0.76);
    this.hot  =new BlobPool(this.root,20,this.pal.foam,this.pal.hi,0.55);
    this.smoke=new BlobPool(this.root,30,PAL.smoke.base,PAL.smoke.deep,0.72);
    this.stars=new StarPool(this.root,4);
    this.scorch=new THREE.Mesh(new THREE.PlaneGeometry(1,1), scarMaterial(0x241d17,0x0b0908,false));
    this.scorch.rotation.x=-Math.PI/2; this.scorch.position.y=0.014; this.scorch.renderOrder=2;
    this.root.add(this.scorch);
    scene.add(this.root); this.root.visible=false;
  }
  layout(){
    layoutTargets([[-0.4,-0.5],[0.9,0.7],[2.0,-0.8],[3.0,0.5]]);
    camRig.dist=16.5; camRig.focus.set(-0.6,0.7,0);
  }
  update(t,camQuat){
    this.root.visible=true;
    this.flame.reset(); this.hot.reset(); this.smoke.reset(); this.stars.reset();
    const OPEN=0.10, HOLD=0.45, mouth=-2.6;

    const on = t>=OPEN && t<HOLD;
    const grow = smooth((t-OPEN)/0.11);
    const fade = smooth((t-HOLD)/0.16);
    const reach = this.REACH*grow*(1-fade*0.35);

    // ignition flash at the mouth
    if(t>OPEN-0.03 && t<OPEN+0.13){
      const k=sat((t-(OPEN-0.03))/0.16);
      this.hot.place(0, mouth+0.35, 0.7, 0, lerp(1.5,0.4,k), 1-k, camQuat);
    }
    // the plume itself: blobs streaming outward through a rounded cone
    let fi=0, hi=1;
    for(let i=0;i<this.flame.items.length;i++){
      const seed=i;
      // each blob loops along the cone so the jet reads as continuous
      const phase=(t*2.35 + rnd(seed,1.2))%1;
      if(!on && phase>0.5) continue;
      const u=phase;                                   // 0 at the mouth, 1 at the tip
      const ang=(rnd(seed,2.3)-0.5)*2*this.SPREAD*Math.pow(u,0.42);
      const dist=mouth+0.3+reach*u;
      const spread=Math.sin(ang)*reach*u*1.05;
      const py=0.35+Math.sin(u*Math.PI)*(0.45+rnd(seed,3.4)*0.6);
      const sz=lerp(0.40,1.30,Math.pow(u,0.7))*(0.65+rnd(seed,4.5)*0.75);
      const a=sat(grow)*(1-fade)*(1-Math.pow(u,2.6))*0.98;
      if(a<=0.02) continue;
      this.flame.place(fi++, dist, py, spread, sz, a, camQuat);
      // white-hot near the mouth
      if(u<0.40 && hi<this.hot.items.length){
        this.hot.place(hi++, dist, py, spread*0.8, sz*0.70, a*(1-u/0.40)*0.98, camQuat);
      }
    }
    // smoke lying on the ground as the plume dies
    for(let i=0;i<this.smoke.items.length;i++){
      const born=HOLD-0.16+rnd(i,5.6)*0.28;
      const age=t-born; const life=0.42+rnd(i,6.7)*0.30;
      if(age<0||age>life) continue;
      const k=age/life;
      const u=0.15+rnd(i,7.8)*0.85;
      const ang=(rnd(i,8.9)-0.5)*2*this.SPREAD;
      this.smoke.place(i, mouth+0.3+this.REACH*u, 0.25+k*0.55,
        Math.sin(ang)*this.REACH*u, lerp(0.55,1.2,k)*(0.6+rnd(i,9.1)*0.7), (1-k)*0.55, camQuat);
    }

    // scorched fan under the plume
    const sc=this.scorch.material.uniforms;
    sc.uTime.value=t;
    sc.uAlpha.value=sat(smooth((t-OPEN)/0.18))*(1-smooth((t-0.62)/0.30))*0.75;
    this.scorch.scale.set(this.REACH*1.05*grow, this.REACH*0.95*grow, 1);
    this.scorch.position.x=mouth+0.35+this.REACH*0.52*grow;

    // three discrete hits while a target stands inside the cone
    const hits=[], pops=[]; let si=0;
    const HIT_AT=[0.16,0.28,0.40];
    targets.forEach((tg,i)=>{
      const dx=tg.position.x-mouth, dz=tg.position.z;
      const dist=Math.hypot(dx,dz);
      const inside = dx>0 && dist<reach+0.4 && Math.abs(Math.atan2(dz,dx))<this.SPREAD+0.22;
      HIT_AT.forEach((ht,h)=>{
        const age=t-ht;
        if(age<0||age>0.55||!inside) return;
        if(age<0.05){
          hits.push({i});
          if(si<this.stars.items.length) this.stars.place(si++, tg.position.x, 0.8, tg.position.z, 2.4, 0.9, rnd(h,3.1)*TAU);
        }
        pops.push({x:tg.position.x, z:tg.position.z, y:1.5+age*1.35, text:'18', big:true,
                   alpha:1-smooth((age-0.30)/0.25)});
      });
    });
    flashTargets(hits); showPopups(pops);

    caster.position.set(mouth-0.35,0,0); caster.rotation.y=0;
    caster.scale.y=1-0.12*Math.sin(sat(t/0.12)*Math.PI);
  }
  resetHits(){}
  hide(){ this.root.visible=false; }
}

/* ------------------------------------------------------------------ *
 * ABILITY 8 — SEARING CROWN
 *
 * Source notes (227.0–233.0) plus frame review at 229.10–230.10:
 *  · the caster slams and a fiery crown expands around their feet;
 *  · five rapid low-force ticks hold the focus near the caster;
 *  · smoke and embers accumulate through the tick phase;
 *  · one larger blast resolves the sequence and carries the knockback;
 *  · a black smoke column is left standing on the caster afterwards.
 * ------------------------------------------------------------------ */
class SearingCrown{
  constructor(){
    this.root=new THREE.Group();
    this.pal=PAL.fire;
    this.TICKS=5;
    this.flame=new BlobPool(this.root,80,this.pal.base,this.pal.deep,0.78);
    this.hot  =new BlobPool(this.root,18,this.pal.foam,this.pal.hi,0.5);
    this.smoke=new BlobPool(this.root,38,PAL.smoke.base,PAL.smoke.deep,0.7);
    this.ember=new BlobPool(this.root,24,this.pal.hi,this.pal.mid,0.5);
    this.stars=new StarPool(this.root,8);
    this.scorch=new THREE.Mesh(new THREE.PlaneGeometry(7.5,7.5), scarMaterial(0x241d17,0x0b0908,false));
    this.scorch.rotation.x=-Math.PI/2; this.scorch.position.y=0.014; this.scorch.renderOrder=2;
    this.root.add(this.scorch);
    scene.add(this.root); this.root.visible=false;
  }
  layout(){
    layoutTargets([[1.7,-0.6],[-1.5,1.2],[0.3,2.0],[-2.1,-1.1]]);
    camRig.dist=17; camRig.focus.set(0,0.7,0);
  }
  ringRadius(t){
    const SLAM=0.12, END=0.78;
    if(t<SLAM) return 0.55;
    if(t<END) return lerp(0.75, 2.55, ease.outCubic((t-SLAM)/(END-SLAM)));
    return lerp(2.55, 3.9, ease.outQuint(sat((t-END)/0.22)));   // finisher push
  }
  update(t,camQuat){
    this.root.visible=true;
    this.flame.reset(); this.hot.reset(); this.smoke.reset(); this.ember.reset(); this.stars.reset();
    const SLAM=0.12, FINISH=0.78, END=0.98;
    const R=this.ringRadius(t);
    const live = t>=SLAM && t<END+0.14;
    const alpha = sat(smooth((t-SLAM)/0.08)) * (1-smooth((t-END)/0.18));

    // crown body: a fat annulus of flame chunks centred on the caster
    let fi=0, hi=0;
    if(live){
      const N=this.flame.items.length;
      for(let i=0;i<N;i++){
        const a0=(i/N)*TAU + t*1.15 + rnd(i,1.1)*0.5;
        const rad=R*(0.78+rnd(i,2.2)*0.34);
        const py=0.3+Math.abs(Math.sin(t*7+i))*0.35+rnd(i,3.3)*0.5;
        const sz=(t>FINISH?1.35:0.95)*(0.55+rnd(i,4.4)*0.8);
        this.flame.place(fi++, Math.cos(a0)*rad, py, Math.sin(a0)*rad*0.92, sz, alpha*0.97, camQuat);
        if(i%5===0 && hi<this.hot.items.length){
          this.hot.place(hi++, Math.cos(a0)*rad*1.02, py+0.1, Math.sin(a0)*rad*0.94, sz*0.5, alpha*0.9, camQuat);
        }
      }
    }
    // smoke accumulates through the ticks, then stands as a column
    for(let i=0;i<this.smoke.items.length;i++){
      const born=0.18+rnd(i,5.5)*1.05;
      const age=t-born; const life=0.75+rnd(i,6.6)*0.55;
      if(age<0||age>life) continue;
      const k=age/life;
      const a0=rnd(i,7.7)*TAU;
      const rad=lerp(0.3,1.5,k)*(0.4+rnd(i,8.8)*0.8);
      this.smoke.place(i, Math.cos(a0)*rad, 0.3+k*2.3, Math.sin(a0)*rad*0.85,
        lerp(0.7,1.7,k)*(0.55+rnd(i,9.9)*0.6), (1-k)*0.62, camQuat);
    }
    // embers thrown off the crown
    for(let i=0;i<this.ember.items.length;i++){
      const born=0.16+rnd(i,10.1)*0.72;
      const age=t-born; const life=0.45+rnd(i,11.2)*0.3;
      if(age<0||age>life) continue;
      const k=age/life;
      const a0=rnd(i,12.3)*TAU;
      const rad=this.ringRadius(born)*(1.0+k*1.1);
      this.ember.place(i, Math.cos(a0)*rad, 0.3+Math.sin(k*Math.PI)*1.25, Math.sin(a0)*rad*0.9,
        lerp(0.26,0.06,k)*(0.6+rnd(i,13.4)*0.8), (1-k)*0.95, camQuat);
    }

    const sc=this.scorch.material.uniforms;
    sc.uTime.value=t;
    sc.uAlpha.value=sat(smooth((t-SLAM)/0.14))*(1-smooth((t-1.15)/0.4))*0.8;
    this.scorch.scale.setScalar(sat(R/3.0));

    // five 5-damage ticks, then one 20-damage finisher
    const hits=[], pops=[]; let si=0;
    const tickAt=h=>0.18+h*0.12;
    targets.forEach((tg,i)=>{
      const dist=Math.hypot(tg.position.x,tg.position.z);
      for(let h=0;h<this.TICKS;h++){
        const age=t-tickAt(h);
        if(age<0||age>0.45) continue;
        if(dist>this.ringRadius(tickAt(h))+0.7) continue;
        if(age<0.05) hits.push({i});
        pops.push({x:tg.position.x, z:tg.position.z, y:1.3+h*0.16+age*1.1, text:'5', big:false,
                   alpha:1-smooth((age-0.26)/0.2)});
      }
      const fage=t-FINISH;
      if(fage>=0 && fage<0.7 && dist<4.4){
        if(fage<0.05){
          hits.push({i});
          if(si<this.stars.items.length) this.stars.place(si++, tg.position.x, 0.9, tg.position.z, 4.0, 1-sat(fage/0.12), rnd(i,2.7)*TAU);
        }
        pops.push({x:tg.position.x, z:tg.position.z, y:1.7+fage*1.4, text:'20', big:true,
                   alpha:1-smooth((fage-0.4)/0.3)});
        // the finisher is the hit that actually moves them
        const push=smooth(sat(fage/0.22))*0.055;
        const len=Math.max(0.001,dist);
        tg.position.x+=tg.position.x/len*push*3.0;
        tg.position.z+=tg.position.z/len*push*3.0;
      }
    });
    flashTargets(hits); showPopups(pops);

    caster.position.set(0,0,0); caster.rotation.y=0;
    caster.scale.y=1-0.22*Math.sin(sat(t/0.12)*Math.PI);
  }
  resetHits(){}
  hide(){ this.root.visible=false; }
}

/* ------------------------------------------------------------------ *
 * ABILITY 9 — DRAGON BLAST
 *
 * Source notes (418.0–420.0) plus frame review at 418.85–419.75:
 *  · one stationary wind-dragon head is placed in front of the caster;
 *  · it is built from long pale streamers that curl inward on themselves;
 *  · five 8-damage pull hits draw targets toward the mouth, each marked by
 *    a white star flash;
 *  · one 24-damage blast then throws them out and the streamers sweep away.
 * ------------------------------------------------------------------ */
class DragonBlast{
  constructor(){
    this.root=new THREE.Group();
    this.pal=PAL.air;
    this.HEAD=new THREE.Vector3(1.5,0,0);
    this.STREAMERS=9;
    this.swirl=new THREE.Group();
    this.swirl.position.copy(this.HEAD);
    this.root.add(this.swirl);
    this.bands=[];
    for(let i=0;i<this.STREAMERS;i++){
      const mat=waterMaterial(this.pal,{flow:1.5,rag:0.46,bands:3.0,foam:0.55,noiseScale:6.0});
      // each streamer gets its own curl rate, radius and lift so the mass stays
      // irregular; a clean spiral reads as a whirlpool, not as a wind head
      const curl=1.7+rnd(i,1.3)*1.9, r0=1.35+rnd(i,2.4)*1.15, lift=rnd(i,3.5);
      const geo=ribbon(t=>{
        const a=i/this.STREAMERS*TAU + t*curl + rnd(i,4.6)*1.4;
        const r=0.35+r0*Math.pow(1-t,0.70+rnd(i,5.7)*0.5);
        return {p:new THREE.Vector3(Math.cos(a)*r, 0.30+lift*0.9*t, Math.sin(a)*r*0.9),
                w:lerp(0.34+rnd(i,6.8)*0.22, 0.05, t)};
      },34);
      const m=new THREE.Mesh(geo,mat); m.renderOrder=5;
      this.swirl.add(m); this.bands.push(m);
    }
    this.wisp=new BlobPool(this.root,34,this.pal.base,this.pal.mid,0.66);
    this.stars=new StarPool(this.root,8);
    scene.add(this.root); this.root.visible=false;
  }
  layout(){
    layoutTargets([[4.6,-1.5],[4.2,1.8],[5.8,0.2]]);
    camRig.dist=16.5; camRig.focus.set(1.4,0.7,0);
  }
  update(t,camQuat){
    this.root.visible=true;
    this.wisp.reset(); this.stars.reset();
    const OPEN=0.12, PULL0=0.20, GAP=0.14, BLAST=0.90, END=1.35;

    const form=smooth((t-OPEN)/0.14);
    const gone=smooth((t-BLAST)/0.30);
    const blastK=sat((t-BLAST)/0.34);
    // the head holds still, tightening between pulls and bursting outward at the end
    const tighten=1-0.14*Math.sin(sat((t-PULL0)/0.7)*Math.PI*5);
    this.swirl.scale.setScalar(Math.max(0.001, form*tighten*(1+blastK*1.5)));
    this.swirl.rotation.y=-t*TAU*0.85;
    for(const m of this.bands){
      m.material.uniforms.uTime.value=t;
      m.material.uniforms.uAlpha.value=form*(1-gone)*0.62;
    }
    // loose wisps drawn into the mouth, then flung out by the blast
    for(let i=0;i<this.wisp.items.length;i++){
      const born=OPEN+rnd(i,1.4)*0.75;
      const age=t-born; const life=0.45+rnd(i,2.5)*0.3;
      if(age<0||age>life) continue;
      const k=age/life;
      const a0=rnd(i,3.6)*TAU;
      const inward = t<BLAST;
      const rad = inward ? lerp(2.9,0.5,ease.outCubic(k)) : lerp(0.6,4.2,ease.outCubic(blastK));
      this.wisp.place(i, this.HEAD.x+Math.cos(a0)*rad, 0.35+rnd(i,4.7)*0.9,
        this.HEAD.z+Math.sin(a0)*rad*0.9,
        lerp(0.5,0.16,k)*(0.6+rnd(i,5.8)*0.8), (1-k)*0.8, camQuat);
    }

    const hits=[], pops=[]; let si=0;
    targets.forEach((tg,i)=>{
      for(let h=0;h<5;h++){
        const ht=PULL0+h*GAP;
        const age=t-ht;
        if(age<0||age>0.26) continue;
        const d=Math.hypot(tg.position.x-this.HEAD.x, tg.position.z-this.HEAD.z);
        if(d>4.2) continue;
        if(age<0.05){
          hits.push({i});
          if(si<this.stars.items.length) this.stars.place(si++, tg.position.x, 0.85, tg.position.z, 2.6, 0.95, rnd(h*7+i,1.9)*TAU);
        }
        pops.push({x:tg.position.x, z:tg.position.z, y:1.4+age*1.15, text:'8', big:false,
                   alpha:1-smooth((age-0.12)/0.14)});
      }
      // pulled toward the mouth between hits
      if(t>PULL0 && t<BLAST){
        tg.position.x += (this.HEAD.x-tg.position.x)*0.035;
        tg.position.z += (this.HEAD.z-tg.position.z)*0.035;
      }
      const fage=t-BLAST;
      if(fage>=0 && fage<0.75){
        const d=Math.hypot(tg.position.x-this.HEAD.x, tg.position.z-this.HEAD.z);
        if(d<4.6){
          if(fage<0.05){
            hits.push({i});
            if(si<this.stars.items.length) this.stars.place(si++, tg.position.x, 0.95, tg.position.z, 4.6*(1-sat(fage/0.2)), 1-sat(fage/0.16), rnd(i,6.3)*TAU);
          }
          pops.push({x:tg.position.x, z:tg.position.z, y:1.75+fage*1.35, text:'24', big:true,
                     alpha:1-smooth((fage-0.42)/0.3)});
          const dx=tg.position.x-this.HEAD.x, dz=tg.position.z-this.HEAD.z;
          const len=Math.max(0.001,Math.hypot(dx,dz));
          const push=smooth(sat(fage/0.26))*0.16;
          tg.position.x+=dx/len*push; tg.position.z+=dz/len*push;
        }
      }
    });
    flashTargets(hits); showPopups(pops);

    caster.position.set(-1.2,0,0); caster.rotation.y=0;
    caster.scale.y=1-0.12*Math.sin(sat(t/0.14)*Math.PI);
  }
  resetHits(){}
  hide(){ this.root.visible=false; }
}

/* ------------------------------------------------------------------ *
 * ABILITY 10 — SHEARING CHAIN (base form)
 *
 * Source notes (461.0–472.0) plus frame review at 461.35–462.20:
 *  · the caster advances along the aim line while slashes are scheduled
 *    around the forward attack space;
 *  · base form is exactly six 7-damage slashes plus one larger 15-damage
 *    finisher, each a broad white crescent with 4-point sparkles;
 *  · the slashes alternate side and angle rather than repeating one pose.
 * ------------------------------------------------------------------ */
class ShearingChain{
  constructor(){
    this.root=new THREE.Group();
    this.pal=PAL.air;
    this.SLASHES=6;
    this.START=-4.2; this.ENDX=2.4;
    this.crescents=[];
    for(let i=0;i<this.SLASHES+1;i++){
      const big=(i===this.SLASHES);
      const mat=waterMaterial(PAL.slash,{flow:0.6,rag:0.26,bands:3.0,foam:0.9,noiseScale:4.0});
      const geo=ribbon(t=>{
        const a=-1.25+2.5*t;
        const r=big?2.15:1.45;
        // tapered sickle: fat in the middle, pointed at both tips
        return {p:new THREE.Vector3(Math.cos(a)*r, 0.6, Math.sin(a)*r), w:0.46*Math.pow(Math.sin(Math.PI*t),0.55)*(big?1.35:1)};
      },30);
      const m=new THREE.Mesh(geo,mat); m.renderOrder=6; m.visible=false;
      this.root.add(m); this.crescents.push(m);
    }
    this.spark=new StarPool(this.root,16);
    this.wisp =new BlobPool(this.root,22,this.pal.base,this.pal.mid,0.6);
    scene.add(this.root); this.root.visible=false;
  }
  layout(){
    layoutTargets([[-1.4,0.9],[0.4,-0.9],[1.8,0.7],[3.2,-0.5]]);
    camRig.dist=18; camRig.focus.set(-0.6,0.8,0);
  }
  slashTime(i){ return i<this.SLASHES ? 0.18+i*0.10 : 0.82; }
  casterX(t){
    const k=smooth(sat((t-0.15)/0.72));
    return lerp(this.START,this.ENDX,k);
  }
  update(t,camQuat){
    this.root.visible=true;
    this.spark.reset(); this.wisp.reset();
    const cx=this.casterX(t);

    let si=0, wi=0;
    const hits=[], pops=[];
    for(let i=0;i<=this.SLASHES;i++){
      const st=this.slashTime(i);
      const age=t-st;
      const big=(i===this.SLASHES);
      const m=this.crescents[i];
      const life=big?0.38:0.28;
      if(age<0||age>life){ m.visible=false; continue; }
      const k=age/life;
      const sx=this.casterX(st);
      // alternate side and angle so the chain never repeats a pose
      const side=(i%2?1:-1);
      m.visible=true;
      m.position.set(sx+0.9+rnd(i,1.7)*0.5, 0.1, side*(0.55+rnd(i,2.8)*0.6));
      m.rotation.set(0, -0.7*side + rnd(i,3.9)*1.2, 0);
      m.scale.setScalar(lerp(0.55,1.15,ease.outCubic(k))*(big?1.25:1));
      m.material.uniforms.uTime.value=t;
      m.material.uniforms.uAlpha.value=(1-Math.pow(k,1.7))*0.98;

      if(age<0.10){
        for(let j=0;j<(big?6:3) && si<this.spark.items.length;j++){
          const seed=i*13+j;
          this.spark.place(si++, m.position.x+(rnd(seed,4.1)-0.5)*2.4, 0.7+rnd(seed,5.2)*0.9,
            m.position.z+(rnd(seed,6.3)-0.5)*2.0, (big?3.2:2.1)*(0.7+rnd(seed,7.4)*0.6),
            1-sat(age/0.10), rnd(seed,8.5)*TAU);
        }
      }
      for(let j=0;j<3 && wi<this.wisp.items.length;j++){
        const seed=i*23+j+300;
        this.wisp.place(wi++, m.position.x-k*1.2+(rnd(seed,9.6)-0.5)*1.4, 0.45+k*0.55,
          m.position.z+(rnd(seed,10.7)-0.5)*1.6, lerp(0.32,0.6,k), (1-k)*0.4, camQuat);
      }

      targets.forEach((tg,ti)=>{
        const d=Math.hypot(tg.position.x-m.position.x, tg.position.z-m.position.z);
        if(d<(big?2.6:1.9)){
          if(age<0.05) hits.push({i:ti});
          if(age<0.5){
            pops.push({x:tg.position.x, z:tg.position.z, y:1.45+age*1.2,
              text:big?'15':'7', big:big, alpha:1-smooth((age-0.28)/0.22)});
          }
          // every slash pushes targets along the route
          if(age<0.12) tg.position.x += (big?0.14:0.06);
        }
      });
    }
    flashTargets(hits); showPopups(pops);

    caster.position.set(cx,0,0); caster.rotation.y=0;
    caster.scale.y=1-0.08*Math.sin(sat(t/0.15)*Math.PI);
  }
  resetHits(){}
  hide(){ this.root.visible=false; }
}

  const constructors=Object.freeze({
    "AQUA-VORTEX":AquaVortex,
    "AQUA-BREAKER":AquaBreaker,
    "IGNITION-DRIVE":IgnitionDrive,
    "ENGULFING-FISSURE":EngulfingFissure,
    "TECTONIC-DRILL":TectonicDrill,
    "ROCK-SOLID-TOMAHAWK":RockSolidTomahawk,
    "FLAME-BREATH":FlameBreath,
    "SEARING-CROWN":SearingCrown,
    "DRAGON-BLAST":DragonBlast,
    "SHEARING-CHAIN":ShearingChain,
  });
  function setTargets(next=[]){targets.length=0;targets.push(...next);}
  function setCallbacks({onHits=()=>{}}={}){
    onFlashTargets=onHits;
  }
  function create(id,anchor){
    const Constructor=constructors[String(id||"").toUpperCase()];
    if(!Constructor)return null;
    const instance=new Constructor();
    if(instance.root?.parent)instance.root.parent.remove(instance.root);
    if(anchor)anchor.add(instance.root);else scene.add(instance.root);
    return instance;
  }
  function update(instance,t,camQuat,context){
    popupContext=context||null;
    try{instance?.update?.(t,camQuat);}finally{popupContext=null;}
  }
  function dispose(instance){
    showPopups([]);
    const root=instance?.root;if(!root)return;
    root.parent?.remove(root);
    root.traverse?.(object=>{
      object.geometry?.dispose?.();
      if(Array.isArray(object.material))object.material.forEach(material=>material?.dispose?.());
      else object.material?.dispose?.();
    });
  }
  return{create,dispose,update,setTargets,setCallbacks,clearPopups:()=>showPopups([]),targets,caster,PAL,TIMELINE};
}
