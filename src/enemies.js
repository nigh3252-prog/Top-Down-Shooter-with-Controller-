import { createCombatDirector, DEFAULT_DIRECTOR_SETTINGS } from './combat-director.js';
import { ENEMY_ATTACK_BY_KIND } from './enemy-attacks.js';
import { ATTACK_DEFINITIONS } from './attacks.js';
import { STANCE_CARDS } from './stance-cards.js';
import { STONE_WEAPONS, buildStoneWeaponMesh } from './weapons.js';

export const ENEMY_STATS = {
  chaser: { radius: .46, height: 3.15, hp: 38, speed: 4.2, stop: 1.35, color: 0xff8f72 },
  brute: { radius: .62, height: 3.55, hp: 72, speed: 2.9, stop: 1.85, color: 0xd96b6b },
  maceGoblin: { radius: .38, height: 1.75, hp: 32, speed: 4.55, stop: 1.58, color: 0x70b85b, bellyColor: 0xb6d17b, armorColor: 0x5c3b24, weapon: 'mace', stanceId: 'S02', role: 'light close attacker' },
  spearGoblin: { radius: .38, height: 1.9, hp: 36, speed: 3.8, stop: 2.55, color: 0x5fae7d, bellyColor: 0xc7d78a, armorColor: 0x3f5a35, weapon: 'spear', stanceId: 'S20', role: 'reach poker' }
};

export function clamp(value, min, max){ return Math.max(min, Math.min(max, value)); }
export function nextSpawnDelay(wave){ return clamp(2.2 - wave * .07, .95, 2.2); }
export function spawnCap(wave){ return 7 + wave * 2; }


const GOBLIN_KINDS = new Set(['maceGoblin', 'spearGoblin']);
const Ease = {
  linear:t=>t,
  inQuad:t=>t*t,
  outQuad:t=>t*(2-t),
  inCubic:t=>t*t*t,
  outCubic:t=>1-Math.pow(1-t,3),
  inOutCubic:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,
  inQuint:t=>t*t*t*t*t,
  outBack:t=>{const c=1.0;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);}
};

function makePoseFactory(THREE){
  const P = o => ({
    hold:new THREE.Vector3(o.hold[0], o.hold[1], o.hold[2]),
    tip:new THREE.Vector3(o.tip[0], o.tip[1], o.tip[2]).normalize(),
    roll:o.roll||0, twist:o.twist||0, pitch:o.pitch||0, lean:o.lean||0,
    hipTwist:o.hipTwist||0,
    hip:new THREE.Vector3((o.hip&&o.hip[0])||0,0,(o.hip&&o.hip[2])||0),
    lower:o.lower||0, lunge:o.lunge||0,
    head:new THREE.Vector2((o.head&&o.head[0])||0,(o.head&&o.head[1])||0)
  });
  const IDLE = P({ hold:[0.16,1.00,0.36], tip:[0.05,0.80,0.55], roll:0.20, twist:-0.16, pitch:0.02, lean:0.03, hipTwist:-0.08, hip:[0,0,0.02], lower:0.04, head:[-0.06,0.05] });
  function poseLerp(a,b,e,out){ out.hold.lerpVectors(a.hold,b.hold,e); out.tip.lerpVectors(a.tip,b.tip,e).normalize(); out.roll=a.roll+(b.roll-a.roll)*e; out.twist=a.twist+(b.twist-a.twist)*e; out.pitch=a.pitch+(b.pitch-a.pitch)*e; out.lean=a.lean+(b.lean-a.lean)*e; out.hipTwist=a.hipTwist+(b.hipTwist-a.hipTwist)*e; out.hip.lerpVectors(a.hip,b.hip,e); out.lower=a.lower+(b.lower-a.lower)*e; out.lunge=a.lunge+(b.lunge-a.lunge)*e; out.head.lerpVectors(a.head,b.head,e); return out; }
  function buildAttack(def){ let t=0, contactAt=0; const phases=def.phases.map(ph=>{ const out={ dur:ph.dur, ease:Ease[ph.ease]||Ease.linear, pose:ph.pose==='IDLE'?IDLE:P(ph.pose) }; out.t0=t; t+=out.dur; out.t1=t; if(ph.contact){ out.contact=true; contactAt=out.t1; } return out; }); return { group:def.group, label:def.label, phases, total:t, contactAt, comboAt:phases[phases.length-1]?.t0||0 }; }
  function sampleAttack(att,t,out){ t=clamp(t,0,att.total); let ph=att.phases[0], i=0; for(;i<att.phases.length;i++){ if(t<=att.phases[i].t1){ ph=att.phases[i]; break; } } if(i>=att.phases.length) ph=att.phases[att.phases.length-1]; const from=i===0?IDLE:att.phases[i-1].pose; const local=ph.dur>0?clamp((t-ph.t0)/ph.dur,0,1):1; return poseLerp(from, ph.pose, ph.ease(local), out); }
  return { P, IDLE, work:P({hold:[0,1,0],tip:[0,1,0]}), buildAttack, sampleAttack };
}

export function createCombatEnemySystem({ THREE, worldRoot, dungeonScale = 6.5, materials = {}, directorOptions = {} }){
  const enemies = [];
  const group = new THREE.Group();
  group.name = 'Combat Enemies';
  worldRoot.add(group);
  const director = createCombatDirector({ ...DEFAULT_DIRECTOR_SETTINGS, ...directorOptions });
  let wave = 1;
  let kills = 0;
  let waveKills = 0;
  let spawnedThisWave = 0;
  let spawnTimer = 2.0;
  let nextId = 1;
  const tuning = { heightScale: 2, speedScale: 1, playerHp: 100, lastPlayerHit: '', waveSize: 6, idleRangeScale: 1.15 };

  const tmp = new THREE.Vector3();
  const weaponUp = new THREE.Vector3(0, 1, 0);
  const tipQ = new THREE.Quaternion();
  const rollQ = new THREE.Quaternion();
  const deathPieces = [];
  const poseTools = makePoseFactory(THREE);
  const goblinDebug = { showRig:false, spawnGoblins:true };
  const matByKind = {
    chaser: materials.chaser || new THREE.MeshStandardMaterial({ color: ENEMY_STATS.chaser.color, roughness: .7, flatShading: true }),
    brute: materials.brute || new THREE.MeshStandardMaterial({ color: ENEMY_STATS.brute.color, roughness: .72, flatShading: true }),
    maceGoblin: materials.maceGoblin || new THREE.MeshStandardMaterial({ color: ENEMY_STATS.maceGoblin.color, roughness: .78, flatShading: true }),
    spearGoblin: materials.spearGoblin || new THREE.MeshStandardMaterial({ color: ENEMY_STATS.spearGoblin.color, roughness: .78, flatShading: true }),
    flash: materials.flash || new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: .9, roughness: .45, flatShading: true }),
    windup: materials.windup || new THREE.MeshStandardMaterial({ color: 0xffd36a, emissive: 0x7a4a00, emissiveIntensity: .7, roughness: .5, flatShading: true }),
    active: materials.active || new THREE.MeshStandardMaterial({ color: 0xff4f4f, emissive: 0xaa1010, emissiveIntensity: .9, roughness: .45, flatShading: true }),
    goblinBelly: materials.goblinBelly || new THREE.MeshStandardMaterial({ color: 0xbfd582, roughness: .85, flatShading: true }),
    goblinArmor: materials.goblinArmor || new THREE.MeshStandardMaterial({ color: 0x543820, roughness: .8, flatShading: true }),
    goblinEye: materials.goblinEye || new THREE.MeshStandardMaterial({ color: 0xfff1a8, emissive: 0xffc34d, emissiveIntensity: .45, roughness: .4, flatShading: true }),
    matSilver: materials.matSilver || new THREE.MeshStandardMaterial({ color: 0xb8c4c0, metalness: .15, roughness: .48, flatShading: true }),
    matBronze: materials.matBronze || new THREE.MeshStandardMaterial({ color: 0xa8793a, metalness: .08, roughness: .55, flatShading: true }),
    matGlow: materials.matGlow || new THREE.MeshStandardMaterial({ color: 0x8dd2ff, emissive: 0x2c8eff, emissiveIntensity: .35, roughness: .4, flatShading: true }),
    matLeather: materials.matLeather || new THREE.MeshStandardMaterial({ color: 0x5a3420, roughness: .82, flatShading: true }),
    matIron: materials.matIron || new THREE.MeshStandardMaterial({ color: 0x788078, metalness: .12, roughness: .5, flatShading: true })
  };

  function setGoblinColors(kind, colors = {}){ const s = ENEMY_STATS[kind]; if(!s) return; if(colors.body != null){ s.color = colors.body; matByKind[kind]?.color?.setHex?.(colors.body); } if(colors.belly != null) s.bellyColor = colors.belly; if(colors.armor != null) s.armorColor = colors.armor; }
  function setGoblinRigDebug(value){ goblinDebug.showRig = !!value; enemies.forEach(e => { if(e.rigDebug) e.rigDebug.visible = goblinDebug.showRig; }); }
  function setSpawnGoblins(value){ goblinDebug.spawnGoblins = !!value; }

  function visualHeight(e){ return e.height * tuning.heightScale; }
  function updateSharedEnemyMarkers(e, h){
    e.barBg.position.set(0, h + .32, 0); e.bar.position.y = e.barBg.position.y;
    if(e.telegraph){ e.telegraph.position.y = .035; e.telegraph.scale.setScalar(e.attack ? e.attack.range : e.stop); e.telegraph.visible = e.state === 'windup' || e.state === 'active'; e.telegraph.material = e.state === 'active' ? matByKind.active : matByKind.windup; }
    if(e.tokenRing) e.tokenRing.visible = !!e.token;
  }
  function applyBasicEnemyVisual(e){
    const h = visualHeight(e);
    e.body.position.y = h * .5; e.body.scale.set(1, tuning.heightScale, .92);
    e.eye.position.set(0, h * .62, e.radius * .88);
    updateSharedEnemyMarkers(e, h);
  }
  function applyGoblinVisual(e){
    const h = visualHeight(e);
    if(e.bodyRoot) e.bodyRoot.scale.setScalar(tuning.heightScale);
    updateSharedEnemyMarkers(e, h);
    if(e.goblinGlow){
      const attacking = e.state === 'windup' || e.state === 'active';
      e.goblinGlow.visible = e.flash > 0 || attacking;
      e.goblinGlow.material.opacity = clamp((e.flash * 2.8) + (e.state === 'active' ? .28 : (e.state === 'windup' ? .16 : 0)), 0, .55);
      e.goblinGlow.material.color.setHex(e.state === 'active' ? 0xff6b55 : (e.flash > 0 ? 0xffffff : 0xffd36a));
      e.goblinGlow.position.y = e.height * .52;
      e.goblinGlow.scale.set(1.2, e.height * 1.1, 1.0);
    }
  }
  function applyEnemyVisual(e){ GOBLIN_KINDS.has(e.kind) ? applyGoblinVisual(e) : applyBasicEnemyVisual(e); }

  function meshLocalBox(w,h,d,mat,jit=0,pos=[0,0,0]){ const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat); m.position.set(pos[0],pos[1],pos[2]); m.castShadow = m.receiveShadow = true; return m; }
  function meshLocalIco(r,mat,pos=[0,0,0]){ const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r,0), mat); m.position.set(pos[0],pos[1],pos[2]); m.castShadow = m.receiveShadow = true; return m; }
  function makeGoblinRig(kind, root, s){
    const pelvis = new THREE.Group(); pelvis.name = 'goblin pelvis'; root.add(pelvis);
    const torsoRoot = new THREE.Group(); torsoRoot.name = 'goblin torsoRoot'; pelvis.add(torsoRoot);
    const headRoot = new THREE.Group(); headRoot.name = 'goblin headRoot'; torsoRoot.add(headRoot);
    const weaponRigRoot = new THREE.Group(); weaponRigRoot.name = 'goblin weaponRigRoot'; torsoRoot.add(weaponRigRoot);
    const weaponRoot = new THREE.Group(); weaponRoot.name = `${kind} weaponRoot`; weaponRigRoot.add(weaponRoot);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(s.radius, Math.max(.1, s.height - s.radius * 2), 6, 14), matByKind[kind]);
    body.position.y = s.height * .5; body.scale.set(1, 1, .9); body.castShadow = body.receiveShadow = true; torsoRoot.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(s.radius * .62, 12, 8), new THREE.MeshStandardMaterial({ color:s.bellyColor, roughness:.86, flatShading:true }));
    belly.scale.set(1,.72,.16); belly.position.set(0, s.height*.44, s.radius*.82); torsoRoot.add(belly);
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(s.radius*1.03, s.radius*1.05, .09, 16), new THREE.MeshStandardMaterial({ color:s.armorColor, roughness:.78, flatShading:true }));
    belt.position.y = s.height*.38; torsoRoot.add(belt);
    const head = new THREE.Mesh(new THREE.SphereGeometry(s.radius*.72, 14, 10), matByKind[kind]); head.scale.set(1,.82,.9); head.position.y = s.height*.82; headRoot.add(head);
    const ears = [];
    const earGeo = new THREE.ConeGeometry(s.radius*.23, s.radius*.42, 4); [-1,1].forEach(side=>{ const ear = new THREE.Mesh(earGeo, matByKind[kind]); ear.position.set(side*s.radius*.62, s.height*.84, s.radius*.02); ear.rotation.z = -side*Math.PI*.5; ear.rotation.y = side*.25; headRoot.add(ear); ears.push(ear); });
    const eye = new THREE.Mesh(new THREE.BoxGeometry(s.radius*.78, s.radius*.11, s.radius*.06), matByKind.goblinEye); eye.position.set(0, s.height*.86, s.radius*.58); headRoot.add(eye);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(s.radius*.42, s.radius*.055, s.radius*.04), matByKind.goblinArmor); mouth.position.set(0, s.height*.77, s.radius*.6); headRoot.add(mouth);
    const RIG = { bladeBase:.08, bladeTip:1.15, gripCenter:-.14 };
    const weaponParts = {};
    const addGrip = (r=.022,len=.40)=>{ const m = new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,8), matByKind.matLeather); m.position.y=-.14; m.castShadow=m.receiveShadow=true; weaponRoot.add(m); weaponRoot.add(meshLocalIco(.045, matByKind.matIron, [0,-.37,0])); };
    const addGuard = (w=.34)=>weaponRoot.add(meshLocalBox(w,.045,.07,matByKind.matBronze,0,[0,RIG.bladeBase,0]));
    buildStoneWeaponMesh({ THREE, weaponDef:STONE_WEAPONS[s.weapon] || STONE_WEAPONS.mace, weaponRoot, RIG, bladeLen:RIG.bladeTip-RIG.bladeBase, base:RIG.bladeBase, materials:matByKind, helpers:{ addGrip, addGuard, meshLocalBox, meshLocalIco }, weaponParts });
    weaponRoot.scale.setScalar(.9); weaponRoot.rotation.x = .35; weaponRoot.position.set(.28, s.height*.56, .16);
    const goblinGlow = new THREE.Mesh(new THREE.SphereGeometry(s.radius * .72, 12, 8), new THREE.MeshBasicMaterial({ color:0xffd36a, transparent:true, opacity:0, depthWrite:false }));
    goblinGlow.visible = false; torsoRoot.add(goblinGlow);
    const rigDebug = new THREE.Group(); rigDebug.name = 'goblin invisible puppet rig debug'; rigDebug.visible = goblinDebug.showRig; root.add(rigDebug);
    const axis = new THREE.Mesh(new THREE.BoxGeometry(.025, s.height, .025), matByKind.windup); axis.position.y = s.height*.5; rigDebug.add(axis);
    return { bodyRoot:pelvis, pelvis, torsoRoot, headRoot, weaponRigRoot, weaponRoot, weaponParts, RIG, body, belly, belt, head, ears, eye, mouth, goblinGlow, rigDebug };
  }
  function makeMesh(kind){
    const s = ENEMY_STATS[kind] || ENEMY_STATS.chaser;
    const root = new THREE.Group(); root.name = `${kind} enemy`;
    let visual;
    if(GOBLIN_KINDS.has(kind)) visual = makeGoblinRig(kind, root, s);
    else {
      const capsuleLength = Math.max(.1, s.height - s.radius * 2);
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(s.radius, capsuleLength, 5, 12), matByKind[kind]);
      body.position.y = s.height * .5; body.scale.set(1, 1, .92); body.castShadow = body.receiveShadow = true; root.add(body);
      const eye = new THREE.Mesh(new THREE.BoxGeometry(s.radius * .44, s.radius * .16, s.radius * .08), matByKind.flash); eye.position.set(0, s.height * .62, s.radius * .88); root.add(eye);
      visual = { body, eye };
    }
    const barBg = new THREE.Mesh(new THREE.BoxGeometry(s.radius * 1.7, .055, .035), matByKind.flash); barBg.position.set(0, s.height + .32, 0);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(s.radius * 1.7, .065, .045), matByKind.chaser); bar.position.copy(barBg.position); bar.position.z += .012; root.add(barBg, bar);
    const telegraph = new THREE.Mesh(new THREE.RingGeometry(.72, .78, 36), matByKind.windup); telegraph.rotation.x = -Math.PI/2; telegraph.visible = false; root.add(telegraph);
    const tokenRing = new THREE.Mesh(new THREE.TorusGeometry(s.radius * 1.25, .025, 6, 32), matByKind.windup); tokenRing.position.y = .08; tokenRing.visible = false; root.add(tokenRing);
    return { root, ...visual, barBg, bar, telegraph, tokenRing };
  }

  function chooseSpawnKind(){ return Math.random() < .55 ? 'maceGoblin' : 'spearGoblin'; }
  function spawn(kind = chooseSpawnKind()){
    const s = ENEMY_STATS[kind] || ENEMY_STATS.chaser, visual = makeMesh(kind);
    const bounds = 4.9 * dungeonScale, side = Math.floor(Math.random() * 4), margin = 4;
    let x = 0, z = 0;
    if(side === 0){ x = THREE.MathUtils.randFloat(-bounds, bounds); z = -bounds - margin; }
    else if(side === 1){ x = bounds + margin; z = THREE.MathUtils.randFloat(-bounds, bounds); }
    else if(side === 2){ x = THREE.MathUtils.randFloat(-bounds, bounds); z = bounds + margin; }
    else { x = -bounds - margin; z = THREE.MathUtils.randFloat(-bounds, bounds); }
    visual.root.position.set(x, 0, z); group.add(visual.root);
    spawnedThisWave++;
    const stance = STANCE_CARDS.find(card => card.id === s.stanceId) || STANCE_CARDS.find(card => card.preferredWeapons?.includes?.(s.weapon)) || STANCE_CARDS[0];
    const e = { id: nextId++, kind, x, z, radius: s.radius, height: s.height, hp: s.hp, maxHp: s.hp, speed: s.speed, stop: s.stop, flash: 0, knockX: 0, knockZ: 0,
      state:'approach', stateTime:0, attack:null, token:null, facing:{x:0,z:1}, windup:0, active:0, recovery:0, hitDone:false, stunned:0, nearEligible:true, slotIndex:-1, deniedTimer:0, cooldown:THREE.MathUtils.randFloat(.2, 1.1), personality:THREE.MathUtils.randFloat(.85, 1.15), weaponId:s.weapon, stance, comboIndex:0, visualAttack:null, visualAttackKey:null, visualAttackTime:0, visualAttackContactAt:0, visualAttackTotal:0, ...visual };
    applyEnemyVisual(e); enemies.push(e); return e;
  }

  function startWave(){
    waveKills = 0; spawnedThisWave = 0; spawnTimer = 1.0;
    const count = Math.max(1, Math.min(20, Math.round(tuning.waveSize)));
    const firstWaveMix = ['maceGoblin', 'spearGoblin', 'maceGoblin', 'spearGoblin'];
    for(let i = 0; i < count; i++) spawn(firstWaveMix[i % firstWaveMix.length]);
  }
  function clearDeathPieces(){ deathPieces.forEach(p => { if(p.mesh?.parent) p.mesh.parent.remove(p.mesh); }); deathPieces.length = 0; }
  function reset(){ director.reset(); enemies.splice(0).forEach(e => e.root.parent && e.root.parent.remove(e.root)); clearDeathPieces(); wave = 1; kills = 0; tuning.playerHp = 100; tuning.lastPlayerHit = ''; startWave(); }
  function finishWave(){ wave++; director.onWaveClear(); startWave(); }
  function damageEnemy(e, amount, knock = { x:0, z:0 }){ e.hp -= amount; e.flash = .12; e.stunned = Math.max(e.stunned, .18); director.releaseAllForEnemy(e); e.state = e.hp <= 0 ? 'dead' : 'stunned'; e.stateTime = 0; e.knockX += (knock.x || 0) * .65; e.knockZ += (knock.z || 0) * .65; if(e.hp <= 0){ kills++; waveKills++; const idx = enemies.indexOf(e); if(idx >= 0) enemies.splice(idx, 1); shatterEnemy(e, knock); e.root.parent && e.root.parent.remove(e.root); if(waveKills >= tuning.waveSize) finishWave(); return true; } return false; }

  const dist = (e,p) => Math.hypot(p.x - e.x, p.z - e.z) || 1;
  const norm = (x,z) => { const d = Math.hypot(x,z) || 1; return { x:x/d, z:z/d }; };
  function steer(e, x, z, amount, dt){ e.x += x * e.speed * tuning.speedScale * amount * dt; e.z += z * e.speed * tuning.speedScale * amount * dt; }
  function approach(e, p, dt){ const n = norm(p.x - e.x, p.z - e.z); steer(e, n.x, n.z, 1, dt); e.facing = n; }
  function idleDesired(e){ return (e.kind === 'brute' ? 3.2 : 2.6) * tuning.idleRangeScale; }
  function orbit(e, p, dt, amount=.55){ const away = norm(e.x - p.x, e.z - p.z); const side = e.id % 2 ? 1 : -1; const tangent = { x:-away.z * side, z:away.x * side }; const d = dist(e,p); const desired = idleDesired(e); const radial = d < desired - .4 ? 1 : (d > desired + 1.1 ? -1 : 0); const dir = norm(tangent.x * .85 - away.x * radial, tangent.z * .85 - away.z * radial); steer(e, dir.x, dir.z, amount, dt); e.facing = norm(p.x - e.x, p.z - e.z); }
  function moveToSlot(e, p, dt){ const slots = director.getDebugState().slots; const slot = slots[e.slotIndex]; if(!slot){ orbit(e,p,dt); return; } const tx = p.x + Math.cos(slot.angle) * slot.radius, tz = p.z + Math.sin(slot.angle) * slot.radius; const d = Math.hypot(tx-e.x, tz-e.z); const n = norm(tx-e.x, tz-e.z); if(d > .6) steer(e, n.x, n.z, .95, dt); else orbit(e,p,dt,.18); e.facing = norm(p.x - e.x, p.z - e.z); }
  function deniedBehavior(e, p, dt){ if(director.getMode() === 'battleCircle') return moveToSlot(e,p,dt); if(director.getMode() === 'nearFar' && !e.nearEligible){ const away = norm(e.x-p.x, e.z-p.z); if(dist(e,p) < 5 * tuning.idleRangeScale) steer(e, away.x, away.z, .7, dt); else orbit(e,p,dt,.45); return; } orbit(e,p,dt,e.kind === 'brute' ? .35 : .65); }
  function chooseAttack(e, p){ const a = ENEMY_ATTACK_BY_KIND[e.kind]; return a && dist(e,p) <= a.range + .65 ? a : null; }
  function prepareGoblinAttack(e){ if(!GOBLIN_KINDS.has(e.kind) || !e.stance?.chain?.length) return; const key = e.stance.chain[e.comboIndex % e.stance.chain.length]; const def = ATTACK_DEFINITIONS[key]; e.comboIndex++; e.visualAttackKey = key; e.visualAttack = def ? poseTools.buildAttack(def) : null; e.visualAttackTime = 0; e.visualAttackContactAt = e.visualAttack?.contactAt || 0; e.visualAttackTotal = e.visualAttack?.total || 0; }
  function startAttack(e, attack){ prepareGoblinAttack(e); e.attack = attack; e.state = 'windup'; e.stateTime = 0; e.windup = attack.windup; e.active = attack.active; e.recovery = attack.recovery; e.hitDone = false; e.facing = norm((lastPlayer.x ?? e.x) - e.x, (lastPlayer.z ?? e.z) - e.z); director.grant(e, attack); }
  let lastPlayer = { x:0, z:0 };
  function hitPlayer(e, p){ const a = e.attack; const to = norm(p.x-e.x, p.z-e.z); const d = dist(e,p); const dot = to.x * e.facing.x + to.z * e.facing.z; const ang = Math.acos(clamp(dot, -1, 1)); if(d <= a.range + .45 && ang < (a.arc || 1)){ tuning.playerHp = Math.max(0, tuning.playerHp - a.damage); tuning.lastPlayerHit = `${e.kind} ${a.name} hit for ${a.damage}`; } }

  function applyGoblinPose(e, dt){
    if(!GOBLIN_KINDS.has(e.kind) || !e.weaponRigRoot) return;
    const active = e.visualAttack && (e.state === 'windup' || e.state === 'active' || e.state === 'recovery');
    const p = active ? poseTools.sampleAttack(e.visualAttack, e.visualAttackTime, poseTools.work) : poseTools.IDLE;
    const scale = .58;
    e.pelvis.position.set((p.hip.x || 0) * scale, -(p.lower || 0) * .12, (p.hip.z || 0) * scale + (p.lunge || 0) * .45);
    e.pelvis.rotation.y = p.hipTwist;
    e.torsoRoot.rotation.set(p.pitch, p.twist, p.lean);
    e.headRoot.rotation.set(p.head.y, p.head.x, 0);
    e.weaponRigRoot.position.set(p.hold.x * scale, p.hold.y * scale, p.hold.z * scale);
    tipQ.setFromUnitVectors(weaponUp, p.tip);
    rollQ.setFromAxisAngle(p.tip, p.roll);
    e.weaponRigRoot.quaternion.copy(tipQ).multiply(rollQ);
  }


  function addDeathPieceFromObject(obj, geo, mat, knock, spread = 1){
    const pieceGeo = geo || obj.geometry?.clone?.() || new THREE.BoxGeometry(.2, .2, .2);
    const pieceMat = mat || obj.material || matByKind.flash;
    const mesh = new THREE.Mesh(pieceGeo, pieceMat); obj.getWorldPosition(mesh.position); obj.getWorldQuaternion(mesh.quaternion); obj.getWorldScale(mesh.scale); mesh.castShadow = mesh.receiveShadow = true; worldRoot.add(mesh);
    const dir = new THREE.Vector3(knock.x || 0, 0, knock.z || 0); if(dir.lengthSq() < 1e-5) dir.set((Math.random()-.5), 0, (Math.random()-.5)); dir.normalize();
    const vel = dir.multiplyScalar((1.2 + Math.random() * 1.8) * spread).add(new THREE.Vector3((Math.random()-.5)*1.2, 1.4 + Math.random()*1.8, (Math.random()-.5)*1.2));
    deathPieces.push({ mesh, vel, ang:new THREE.Vector3((Math.random()-.5)*5, (Math.random()-.5)*5, (Math.random()-.5)*5), age:0 });
  }
  function shatterEnemy(e, knock = { x:0, z:0 }){
    if(GOBLIN_KINDS.has(e.kind)){
      addDeathPieceFromObject(e.body, null, e.body.material, knock, 1.05);
      if(e.belly) addDeathPieceFromObject(e.belly, null, e.belly.material, knock, .95);
      if(e.head) addDeathPieceFromObject(e.head, null, e.head.material, knock, 1.2);
      (e.ears || []).forEach(ear => addDeathPieceFromObject(ear, null, ear.material, knock, 1.4));
      if(e.belt) addDeathPieceFromObject(e.belt, null, e.belt.material, knock, 1.0);
      if(e.weaponRoot) addDeathPieceFromObject(e.weaponRoot, new THREE.BoxGeometry(.08, Math.max(.45, e.RIG?.bladeTip || .9), .08), matByKind.matIron, knock, 1.35);
      return;
    }
    const top = new THREE.Object3D(), mid = new THREE.Object3D(), bot = new THREE.Object3D();
    [top, mid, bot].forEach(o => e.body.add(o));
    top.position.set(0, e.height*.18, 0); mid.position.set(0, 0, 0); bot.position.set(0, -e.height*.18, 0);
    addDeathPieceFromObject(top, new THREE.SphereGeometry(e.radius*.55, 8, 6), matByKind[e.kind] || matByKind.chaser, knock, 1.1);
    addDeathPieceFromObject(mid, new THREE.BoxGeometry(e.radius*.9, e.height*.24, e.radius*.7), matByKind[e.kind] || matByKind.chaser, knock, 1.0);
    addDeathPieceFromObject(bot, new THREE.SphereGeometry(e.radius*.48, 8, 6), matByKind[e.kind] || matByKind.chaser, knock, .9);
    addDeathPieceFromObject(e.eye, null, e.eye.material, knock, 1.35);
  }
  function updateDeathPieces(dt){
    for(let i = deathPieces.length - 1; i >= 0; i--){
      const p = deathPieces[i]; p.age += dt; p.vel.y -= 5.2 * dt; p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.ang.x * dt; p.mesh.rotation.y += p.ang.y * dt; p.mesh.rotation.z += p.ang.z * dt;
      if(p.mesh.position.y < .08){ p.mesh.position.y = .08; p.vel.y *= -.28; p.vel.x *= .75; p.vel.z *= .75; p.ang.multiplyScalar(.75); }
      if(p.age > 5){ p.mesh.parent && p.mesh.parent.remove(p.mesh); deathPieces.splice(i, 1); }
    }
  }
  function updateGoblinAttackState(e, dt, player){
    if(!GOBLIN_KINDS.has(e.kind) || !(e.state === 'windup' || e.state === 'active')) return false;
    const total = e.visualAttackTotal || ((e.attack?.windup || 0) + (e.attack?.active || 0) + (e.attack?.recovery || 0)) || .75;
    const contactAt = e.visualAttackContactAt || Math.min(total, e.attack?.windup || total * .45);
    const prev = e.visualAttackTime || 0;
    e.facing = norm(player.x - e.x, player.z - e.z);
    e.visualAttackTime = Math.min(total, prev + dt);
    e.state = e.visualAttackTime >= contactAt ? 'active' : 'windup';
    if(!e.hitDone && prev < contactAt && e.visualAttackTime >= contactAt){ hitPlayer(e, player); e.hitDone = true; }
    if(e.visualAttackTime >= total){ director.release(e); e.cooldown = (e.attack?.cooldown || 1) * e.personality; e.attack = null; e.visualAttack = null; e.state = 'approach'; e.stateTime = 0; }
    return true;
  }

  function resolveEnemySpacing(){
    for(let pass = 0; pass < 2; pass++){
      for(let i = 0; i < enemies.length; i++){
        const a = enemies[i]; if(a.state === 'dead') continue;
        for(let j = i + 1; j < enemies.length; j++){
          const b = enemies[j]; if(b.state === 'dead') continue;
          let dx = b.x - a.x, dz = b.z - a.z;
          let d = Math.hypot(dx, dz);
          const minD = Math.max(.05, (a.radius + b.radius) * 2);
          if(d >= minD) continue;
          if(d < 1e-4){ const angle = ((a.id * 17 + b.id * 31) % 360) * Math.PI / 180; dx = Math.cos(angle); dz = Math.sin(angle); d = 1; }
          const push = (minD - d) * .5;
          const nx = dx / d, nz = dz / d;
          a.x -= nx * push; a.z -= nz * push;
          b.x += nx * push; b.z += nz * push;
        }
      }
    }
  }

  function updateEnemy(e, dt, player){
    e.flash = Math.max(0, e.flash - dt); e.stateTime += dt; e.cooldown = Math.max(0, e.cooldown - dt); e.stunned = Math.max(0, e.stunned - dt);
    if(e.state === 'stunned' && e.stunned <= 0){ e.state = 'approach'; e.stateTime = 0; }
    else if(updateGoblinAttackState(e, dt, player)){ /* authored goblin attack timing handled above */ }
    else if(e.state === 'windup'){ e.facing = norm(player.x - e.x, player.z - e.z); if(e.stateTime >= e.windup){ e.state = 'active'; e.stateTime = 0; } }
    else if(e.state === 'active'){ if(!e.hitDone){ hitPlayer(e, player); e.hitDone = true; } if(e.stateTime >= e.active){ e.state = 'recovery'; e.stateTime = 0; director.release(e); } }
    else if(e.state === 'recovery'){ if(e.stateTime >= e.recovery){ e.cooldown = (e.attack?.cooldown || 1) * e.personality; e.attack = null; e.state = 'approach'; e.stateTime = 0; } }
    else if(e.state !== 'dead'){
      const attack = chooseAttack(e, player);
      if(attack && e.cooldown <= 0 && director.canGrant(e, attack, { enemies, pressureBudget: director.settings.pressureBudget })) startAttack(e, attack);
      else if(attack && e.cooldown <= 0) deniedBehavior(e, player, dt);
      else if(director.getMode() === 'battleCircle') moveToSlot(e, player, dt);
      else if(dist(e, player) > e.stop * Math.min(tuning.idleRangeScale, 2.5)) approach(e, player, dt); else orbit(e, player, dt, .4);
    }
    e.x += e.knockX * dt; e.z += e.knockZ * dt; e.knockX *= Math.pow(.08, dt); e.knockZ *= Math.pow(.08, dt);
    applyGoblinPose(e, dt);
    e.root.position.set(e.x, 0, e.z); e.root.rotation.y = Math.atan2(e.facing.x, e.facing.z);
    const flashScale = 1 + Math.max(0, e.flash) * .18; e.root.scale.set(flashScale, flashScale, flashScale); applyEnemyVisual(e);
    if(!GOBLIN_KINDS.has(e.kind)) e.body.material = e.flash > 0 ? matByKind.flash : (e.state === 'active' ? matByKind.active : (e.state === 'windup' ? matByKind.windup : matByKind[e.kind]));
    const f = clamp(e.hp / e.maxHp, 0, 1); e.bar.scale.x = f; e.bar.position.x = -(1 - f) * e.radius * .85; e.bar.lookAt(tmp.set(player.x, 2, player.z));
  }

  function update(dt, player){
    lastPlayer = player; spawnTimer -= dt;
    const cap = Math.max(1, Math.min(20, Math.round(tuning.waveSize)));
    if(spawnTimer <= 0 && spawnedThisWave < cap && enemies.length < cap){ spawn(chooseSpawnKind()); spawnTimer = nextSpawnDelay(wave); }
    director.update(dt, { enemies, pressureBudget: director.settings.pressureBudget }); director.markNearEligible(enemies, player); director.assignBattleCircleSlots(enemies, player);
    for(const e of [...enemies]) updateEnemy(e, dt, player);
    resolveEnemySpacing();
    for(const e of enemies) e.root.position.set(e.x, 0, e.z);
    updateDeathPieces(dt);
  }
  function setHeightScale(value){ tuning.heightScale = clamp(Number(value) || 1, .5, 4); enemies.forEach(applyEnemyVisual); }
  function setSpeedScale(value){ tuning.speedScale = clamp(Number(value) || 1, .25, 1.5); }
  function setDirectorMode(mode){ director.setMode(mode); }
  function setPressureBudget(value){ director.settings.pressureBudget = clamp(Number(value) || 1.75, .5, 4); }
  function setCycleOnWaveClear(value){ director.settings.cycleOnWaveClear = !!value; }
  function setWaveSize(value){ tuning.waveSize = clamp(Math.round(Number(value) || 6), 1, 20); }
  function setIdleRangeScale(value){ tuning.idleRangeScale = clamp(Number(value) || 1.15, .75, 3); }

  return { enemies, group, director, spawn, reset, update, damageEnemy, setGoblinColors, setGoblinRigDebug, setSpawnGoblins, setHeightScale, setSpeedScale, setDirectorMode, setPressureBudget, setCycleOnWaveClear, setWaveSize, setIdleRangeScale, get heightScale(){ return tuning.heightScale; }, get speedScale(){ return tuning.speedScale; }, get waveSize(){ return tuning.waveSize; }, get idleRangeScale(){ return tuning.idleRangeScale; }, get wave(){ return wave; }, get waveKills(){ return waveKills; }, get kills(){ return kills; }, get playerHp(){ return tuning.playerHp; }, get lastPlayerHit(){ return tuning.lastPlayerHit; } };
}
