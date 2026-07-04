export const ENEMY_STATS = {
  chaser: { radius: .46, height: 3.15, hp: 38, speed: 4.2, stop: 1.15, color: 0xff8f72 },
  brute: { radius: .62, height: 3.55, hp: 72, speed: 2.9, stop: 1.45, color: 0xd96b6b }
};

export function clamp(value, min, max){ return Math.max(min, Math.min(max, value)); }
export function nextSpawnDelay(wave){ return clamp(2.2 - wave * .07, .95, 2.2); }
export function spawnCap(wave){ return 7 + wave * 2; }
export function createCombatEnemySystem({ THREE, worldRoot, dungeonScale = 6.5, materials = {} }){
  const enemies = [];
  const group = new THREE.Group();
  group.name = 'Combat Enemies';
  worldRoot.add(group);
  let wave = 1;
  let kills = 0;
  let spawnTimer = 2.0;
  const tuning = { heightScale: 1, speedScale: 1 };

  const tmp = new THREE.Vector3();
  const matByKind = {
    chaser: materials.chaser || new THREE.MeshStandardMaterial({ color: ENEMY_STATS.chaser.color, roughness: .7, flatShading: true }),
    brute: materials.brute || new THREE.MeshStandardMaterial({ color: ENEMY_STATS.brute.color, roughness: .72, flatShading: true }),
    flash: materials.flash || new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: .9, roughness: .45, flatShading: true })
  };

  function visualHeight(e){ return e.height * tuning.heightScale; }

  function applyEnemyVisual(e){
    const h = visualHeight(e);
    e.body.position.y = h * .5;
    e.body.scale.set(1, tuning.heightScale, .92);
    e.eye.position.set(0, h * .62, e.radius * .88);
    e.barBg.position.set(0, h + .32, 0);
    e.bar.position.y = e.barBg.position.y;
  }

  function makeMesh(kind){
    const s = ENEMY_STATS[kind] || ENEMY_STATS.chaser;
    const root = new THREE.Group();
    root.name = `${kind} enemy`;
    const capsuleLength = Math.max(.1, s.height - s.radius * 2);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(s.radius, capsuleLength, 5, 12), matByKind[kind]);
    body.position.y = s.height * .5;
    body.scale.set(1, 1, .92);
    body.castShadow = body.receiveShadow = true;
    root.add(body);
    const eye = new THREE.Mesh(new THREE.BoxGeometry(s.radius * .44, s.radius * .16, s.radius * .08), matByKind.flash);
    eye.position.set(0, s.height * .62, s.radius * .88);
    root.add(eye);
    const barBg = new THREE.Mesh(new THREE.BoxGeometry(s.radius * 1.7, .055, .035), matByKind.flash);
    barBg.position.set(0, s.height + .32, 0);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(s.radius * 1.7, .065, .045), matByKind.chaser);
    bar.position.copy(barBg.position); bar.position.z += .012;
    root.add(barBg, bar);
    return { root, body, eye, barBg, bar };
  }

  function spawn(kind = Math.random() < .22 ? 'brute' : 'chaser'){
    const s = ENEMY_STATS[kind] || ENEMY_STATS.chaser;
    const visual = makeMesh(kind);
    const bounds = 4.9 * dungeonScale;
    const side = Math.floor(Math.random() * 4), margin = 4;
    let x = 0, z = 0;
    if(side === 0){ x = THREE.MathUtils.randFloat(-bounds, bounds); z = -bounds - margin; }
    else if(side === 1){ x = bounds + margin; z = THREE.MathUtils.randFloat(-bounds, bounds); }
    else if(side === 2){ x = THREE.MathUtils.randFloat(-bounds, bounds); z = bounds + margin; }
    else { x = -bounds - margin; z = THREE.MathUtils.randFloat(-bounds, bounds); }
    visual.root.position.set(x, 0, z);
    group.add(visual.root);
    const e = { kind, x, z, radius: s.radius, height: s.height, hp: s.hp, maxHp: s.hp, speed: s.speed, stop: s.stop, flash: 0, knockX: 0, knockZ: 0, ...visual };
    applyEnemyVisual(e);
    enemies.push(e);
    return e;
  }

  function reset(){
    enemies.splice(0).forEach(e => e.root.parent && e.root.parent.remove(e.root));
    wave = 1; kills = 0; spawnTimer = 2.0;
    for(let i = 0; i < 4; i++) spawn(i % 4 ? 'chaser' : 'brute');
  }

  function damageEnemy(e, amount, knock = { x:0, z:0 }){
    e.hp -= amount; e.flash = .12; e.knockX += (knock.x || 0) * .65; e.knockZ += (knock.z || 0) * .65;
    if(e.hp <= 0){
      kills++;
      const idx = enemies.indexOf(e); if(idx >= 0) enemies.splice(idx, 1);
      e.root.parent && e.root.parent.remove(e.root);
      if(kills >= wave * 10) wave++;
      return true;
    }
    return false;
  }

  function update(dt, player){
    spawnTimer -= dt;
    if(spawnTimer <= 0 && enemies.length < spawnCap(wave)){ spawn(); spawnTimer = nextSpawnDelay(wave); }
    for(const e of enemies){
      e.flash = Math.max(0, e.flash - dt);
      const dx = player.x - e.x, dz = player.z - e.z, dist = Math.hypot(dx, dz) || 1;
      if(dist > e.stop){ e.x += dx / dist * e.speed * tuning.speedScale * dt; e.z += dz / dist * e.speed * tuning.speedScale * dt; }
      e.x += e.knockX * dt; e.z += e.knockZ * dt; e.knockX *= Math.pow(.08, dt); e.knockZ *= Math.pow(.08, dt);
      e.root.position.set(e.x, 0, e.z);
      e.root.rotation.y = Math.atan2(dx, dz);
      const flashScale = 1 + Math.max(0, e.flash) * .18;
      e.root.scale.set(flashScale, 1, flashScale);
      applyEnemyVisual(e);
      e.body.material = e.flash > 0 ? matByKind.flash : matByKind[e.kind];
      const f = clamp(e.hp / e.maxHp, 0, 1); e.bar.scale.x = f; e.bar.position.x = -(1 - f) * e.radius * .85; e.bar.lookAt(tmp.set(player.x, 2, player.z));
    }
  }

  function setHeightScale(value){ tuning.heightScale = clamp(Number(value) || 1, .5, 4); enemies.forEach(applyEnemyVisual); }
  function setSpeedScale(value){ tuning.speedScale = clamp(Number(value) || 1, .25, 1.5); }

  return { enemies, group, spawn, reset, update, damageEnemy, setHeightScale, setSpeedScale, get heightScale(){ return tuning.heightScale; }, get speedScale(){ return tuning.speedScale; }, get wave(){ return wave; }, get kills(){ return kills; } };
}
