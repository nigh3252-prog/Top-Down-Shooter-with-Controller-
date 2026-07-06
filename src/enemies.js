import { createCombatDirector, DEFAULT_DIRECTOR_SETTINGS } from './combat-director.js';
import { ENEMY_ATTACK_BY_KIND } from './enemy-attacks.js';

export const ENEMY_STATS = {
  chaser: { radius: .46, height: 3.15, hp: 38, speed: 4.2, stop: 1.35, color: 0xff8f72 },
  brute: { radius: .62, height: 3.55, hp: 72, speed: 2.9, stop: 1.85, color: 0xd96b6b }
};

export function clamp(value, min, max){ return Math.max(min, Math.min(max, value)); }
export function nextSpawnDelay(wave){ return clamp(2.2 - wave * .07, .95, 2.2); }
export function spawnCap(wave){ return 7 + wave * 2; }

export function createCombatEnemySystem({ THREE, worldRoot, dungeonScale = 6.5, materials = {}, directorOptions = {} }){
  const enemies = [];
  const group = new THREE.Group();
  group.name = 'Combat Enemies';
  worldRoot.add(group);
  const director = createCombatDirector({ ...DEFAULT_DIRECTOR_SETTINGS, ...directorOptions });
  let wave = 1;
  let kills = 0;
  let spawnTimer = 2.0;
  let nextId = 1;
  const tuning = { heightScale: 1, speedScale: 1, playerHp: 100, lastPlayerHit: '' };

  const tmp = new THREE.Vector3();
  const matByKind = {
    chaser: materials.chaser || new THREE.MeshStandardMaterial({ color: ENEMY_STATS.chaser.color, roughness: .7, flatShading: true }),
    brute: materials.brute || new THREE.MeshStandardMaterial({ color: ENEMY_STATS.brute.color, roughness: .72, flatShading: true }),
    flash: materials.flash || new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: .9, roughness: .45, flatShading: true }),
    windup: materials.windup || new THREE.MeshStandardMaterial({ color: 0xffd36a, emissive: 0x7a4a00, emissiveIntensity: .7, roughness: .5, flatShading: true }),
    active: materials.active || new THREE.MeshStandardMaterial({ color: 0xff4f4f, emissive: 0xaa1010, emissiveIntensity: .9, roughness: .45, flatShading: true })
  };

  function visualHeight(e){ return e.height * tuning.heightScale; }
  function applyEnemyVisual(e){
    const h = visualHeight(e);
    e.body.position.y = h * .5; e.body.scale.set(1, tuning.heightScale, .92);
    e.eye.position.set(0, h * .62, e.radius * .88);
    e.barBg.position.set(0, h + .32, 0); e.bar.position.y = e.barBg.position.y;
    if(e.telegraph){ e.telegraph.position.y = .035; e.telegraph.scale.setScalar(e.attack ? e.attack.range : e.stop); e.telegraph.visible = e.state === 'windup' || e.state === 'active'; e.telegraph.material = e.state === 'active' ? matByKind.active : matByKind.windup; }
    if(e.tokenRing) e.tokenRing.visible = !!e.token;
  }

  function makeMesh(kind){
    const s = ENEMY_STATS[kind] || ENEMY_STATS.chaser;
    const root = new THREE.Group(); root.name = `${kind} enemy`;
    const capsuleLength = Math.max(.1, s.height - s.radius * 2);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(s.radius, capsuleLength, 5, 12), matByKind[kind]);
    body.position.y = s.height * .5; body.scale.set(1, 1, .92); body.castShadow = body.receiveShadow = true; root.add(body);
    const eye = new THREE.Mesh(new THREE.BoxGeometry(s.radius * .44, s.radius * .16, s.radius * .08), matByKind.flash); eye.position.set(0, s.height * .62, s.radius * .88); root.add(eye);
    const barBg = new THREE.Mesh(new THREE.BoxGeometry(s.radius * 1.7, .055, .035), matByKind.flash); barBg.position.set(0, s.height + .32, 0);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(s.radius * 1.7, .065, .045), matByKind.chaser); bar.position.copy(barBg.position); bar.position.z += .012; root.add(barBg, bar);
    const telegraph = new THREE.Mesh(new THREE.RingGeometry(.72, .78, 36), matByKind.windup); telegraph.rotation.x = -Math.PI/2; telegraph.visible = false; root.add(telegraph);
    const tokenRing = new THREE.Mesh(new THREE.TorusGeometry(s.radius * 1.25, .025, 6, 32), matByKind.windup); tokenRing.position.y = .08; tokenRing.visible = false; root.add(tokenRing);
    return { root, body, eye, barBg, bar, telegraph, tokenRing };
  }

  function spawn(kind = Math.random() < .22 ? 'brute' : 'chaser'){
    const s = ENEMY_STATS[kind] || ENEMY_STATS.chaser, visual = makeMesh(kind);
    const bounds = 4.9 * dungeonScale, side = Math.floor(Math.random() * 4), margin = 4;
    let x = 0, z = 0;
    if(side === 0){ x = THREE.MathUtils.randFloat(-bounds, bounds); z = -bounds - margin; }
    else if(side === 1){ x = bounds + margin; z = THREE.MathUtils.randFloat(-bounds, bounds); }
    else if(side === 2){ x = THREE.MathUtils.randFloat(-bounds, bounds); z = bounds + margin; }
    else { x = -bounds - margin; z = THREE.MathUtils.randFloat(-bounds, bounds); }
    visual.root.position.set(x, 0, z); group.add(visual.root);
    const e = { id: nextId++, kind, x, z, radius: s.radius, height: s.height, hp: s.hp, maxHp: s.hp, speed: s.speed, stop: s.stop, flash: 0, knockX: 0, knockZ: 0,
      state:'approach', stateTime:0, attack:null, token:null, facing:{x:0,z:1}, windup:0, active:0, recovery:0, hitDone:false, stunned:0, nearEligible:true, slotIndex:-1, deniedTimer:0, cooldown:THREE.MathUtils.randFloat(.2, 1.1), personality:THREE.MathUtils.randFloat(.85, 1.15), ...visual };
    applyEnemyVisual(e); enemies.push(e); return e;
  }

  function reset(){ director.reset(); enemies.splice(0).forEach(e => e.root.parent && e.root.parent.remove(e.root)); wave = 1; kills = 0; spawnTimer = 2.0; tuning.playerHp = 100; tuning.lastPlayerHit = ''; for(let i = 0; i < 4; i++) spawn(i % 4 ? 'chaser' : 'brute'); }
  function damageEnemy(e, amount, knock = { x:0, z:0 }){ e.hp -= amount; e.flash = .12; e.stunned = Math.max(e.stunned, .18); director.releaseAllForEnemy(e); e.state = e.hp <= 0 ? 'dead' : 'stunned'; e.stateTime = 0; e.knockX += (knock.x || 0) * .65; e.knockZ += (knock.z || 0) * .65; if(e.hp <= 0){ kills++; const idx = enemies.indexOf(e); if(idx >= 0) enemies.splice(idx, 1); e.root.parent && e.root.parent.remove(e.root); if(kills >= wave * 10){ wave++; director.onWaveClear(); } return true; } return false; }

  const dist = (e,p) => Math.hypot(p.x - e.x, p.z - e.z) || 1;
  const norm = (x,z) => { const d = Math.hypot(x,z) || 1; return { x:x/d, z:z/d }; };
  function steer(e, x, z, amount, dt){ e.x += x * e.speed * tuning.speedScale * amount * dt; e.z += z * e.speed * tuning.speedScale * amount * dt; }
  function approach(e, p, dt){ const n = norm(p.x - e.x, p.z - e.z); steer(e, n.x, n.z, 1, dt); e.facing = n; }
  function orbit(e, p, dt, amount=.55){ const away = norm(e.x - p.x, e.z - p.z); const side = e.id % 2 ? 1 : -1; const tangent = { x:-away.z * side, z:away.x * side }; const d = dist(e,p); const desired = e.kind === 'brute' ? 3.2 : 2.6; const radial = d < desired - .4 ? 1 : (d > desired + 1.1 ? -1 : 0); const dir = norm(tangent.x * .85 - away.x * radial, tangent.z * .85 - away.z * radial); steer(e, dir.x, dir.z, amount, dt); e.facing = norm(p.x - e.x, p.z - e.z); }
  function moveToSlot(e, p, dt){ const slots = director.getDebugState().slots; const slot = slots[e.slotIndex]; if(!slot){ orbit(e,p,dt); return; } const tx = p.x + Math.cos(slot.angle) * slot.radius, tz = p.z + Math.sin(slot.angle) * slot.radius; const d = Math.hypot(tx-e.x, tz-e.z); const n = norm(tx-e.x, tz-e.z); if(d > .6) steer(e, n.x, n.z, .95, dt); else orbit(e,p,dt,.18); e.facing = norm(p.x - e.x, p.z - e.z); }
  function deniedBehavior(e, p, dt){ if(director.getMode() === 'battleCircle') return moveToSlot(e,p,dt); if(director.getMode() === 'nearFar' && !e.nearEligible){ const away = norm(e.x-p.x, e.z-p.z); if(dist(e,p) < 5) steer(e, away.x, away.z, .7, dt); else orbit(e,p,dt,.45); return; } orbit(e,p,dt,e.kind === 'brute' ? .35 : .65); }
  function chooseAttack(e, p){ const a = ENEMY_ATTACK_BY_KIND[e.kind]; return a && dist(e,p) <= a.range + .65 ? a : null; }
  function startAttack(e, attack){ e.attack = attack; e.state = 'windup'; e.stateTime = 0; e.windup = attack.windup; e.active = attack.active; e.recovery = attack.recovery; e.hitDone = false; e.facing = norm((lastPlayer.x ?? e.x) - e.x, (lastPlayer.z ?? e.z) - e.z); director.grant(e, attack); }
  let lastPlayer = { x:0, z:0 };
  function hitPlayer(e, p){ const a = e.attack; const to = norm(p.x-e.x, p.z-e.z); const d = dist(e,p); const dot = to.x * e.facing.x + to.z * e.facing.z; const ang = Math.acos(clamp(dot, -1, 1)); if(d <= a.range + .45 && ang < (a.arc || 1)){ tuning.playerHp = Math.max(0, tuning.playerHp - a.damage); tuning.lastPlayerHit = `${e.kind} ${a.name} hit for ${a.damage}`; } }

  function updateEnemy(e, dt, player){
    e.flash = Math.max(0, e.flash - dt); e.stateTime += dt; e.cooldown = Math.max(0, e.cooldown - dt); e.stunned = Math.max(0, e.stunned - dt);
    if(e.state === 'stunned' && e.stunned <= 0){ e.state = 'approach'; e.stateTime = 0; }
    else if(e.state === 'windup'){ e.facing = norm(player.x - e.x, player.z - e.z); if(e.stateTime >= e.windup){ e.state = 'active'; e.stateTime = 0; } }
    else if(e.state === 'active'){ if(!e.hitDone){ hitPlayer(e, player); e.hitDone = true; } if(e.stateTime >= e.active){ e.state = 'recovery'; e.stateTime = 0; director.release(e); } }
    else if(e.state === 'recovery'){ if(e.stateTime >= e.recovery){ e.cooldown = (e.attack?.cooldown || 1) * e.personality; e.attack = null; e.state = 'approach'; e.stateTime = 0; } }
    else if(e.state !== 'dead'){
      const attack = chooseAttack(e, player);
      if(attack && e.cooldown <= 0 && director.canGrant(e, attack, { enemies, pressureBudget: director.settings.pressureBudget })) startAttack(e, attack);
      else if(attack && e.cooldown <= 0) deniedBehavior(e, player, dt);
      else if(director.getMode() === 'battleCircle') moveToSlot(e, player, dt);
      else if(dist(e, player) > e.stop) approach(e, player, dt); else orbit(e, player, dt, .4);
    }
    e.x += e.knockX * dt; e.z += e.knockZ * dt; e.knockX *= Math.pow(.08, dt); e.knockZ *= Math.pow(.08, dt);
    e.root.position.set(e.x, 0, e.z); e.root.rotation.y = Math.atan2(e.facing.x, e.facing.z);
    const flashScale = 1 + Math.max(0, e.flash) * .18; e.root.scale.set(flashScale, 1, flashScale); applyEnemyVisual(e);
    e.body.material = e.flash > 0 ? matByKind.flash : (e.state === 'active' ? matByKind.active : (e.state === 'windup' ? matByKind.windup : matByKind[e.kind]));
    const f = clamp(e.hp / e.maxHp, 0, 1); e.bar.scale.x = f; e.bar.position.x = -(1 - f) * e.radius * .85; e.bar.lookAt(tmp.set(player.x, 2, player.z));
  }

  function update(dt, player){
    lastPlayer = player; spawnTimer -= dt;
    const cap = director.getMode() === 'wavePacing' ? Math.max(3, Math.ceil(spawnCap(wave) * .55)) : spawnCap(wave);
    if(spawnTimer <= 0 && enemies.length < cap){ spawn(); spawnTimer = nextSpawnDelay(wave); }
    director.update(dt, { enemies, pressureBudget: director.settings.pressureBudget }); director.markNearEligible(enemies, player); director.assignBattleCircleSlots(enemies, player);
    for(const e of [...enemies]) updateEnemy(e, dt, player);
  }
  function setHeightScale(value){ tuning.heightScale = clamp(Number(value) || 1, .5, 4); enemies.forEach(applyEnemyVisual); }
  function setSpeedScale(value){ tuning.speedScale = clamp(Number(value) || 1, .25, 1.5); }
  function setDirectorMode(mode){ director.setMode(mode); }
  function setPressureBudget(value){ director.settings.pressureBudget = clamp(Number(value) || 1.75, .5, 4); }
  function setCycleOnWaveClear(value){ director.settings.cycleOnWaveClear = !!value; }

  return { enemies, group, director, spawn, reset, update, damageEnemy, setHeightScale, setSpeedScale, setDirectorMode, setPressureBudget, setCycleOnWaveClear, get heightScale(){ return tuning.heightScale; }, get speedScale(){ return tuning.speedScale; }, get wave(){ return wave; }, get kills(){ return kills; }, get playerHp(){ return tuning.playerHp; }, get lastPlayerHit(){ return tuning.lastPlayerHit; } };
}
