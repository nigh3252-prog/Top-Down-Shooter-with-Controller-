import RAPIER from '@dimforge/rapier3d-compat';

let rapierReady = null;
async function ensureRapier(){
  if(!rapierReady) rapierReady = RAPIER.init();
  await rapierReady;
  return RAPIER;
}

export async function createArenaPhysicsWorld({ THREE, arenaRadius = 9 } = {}){
  const R = await ensureRapier();
  const world = new R.World({ x:0, y:-9.8, z:0 });
  const fixedDt = 1 / 60;
  let accumulator = 0;
  const bodies = new Map();

  function addFixedCuboid({ x=0, y=0, z=0, hx=1, hy=1, hz=1 }){
    const rb = world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(x, y, z));
    world.createCollider(R.ColliderDesc.cuboid(hx, hy, hz).setFriction(.9).setRestitution(.22), rb);
    return rb;
  }

  const wall = .55;
  addFixedCuboid({ y:-.08, hx:arenaRadius + 2, hy:.08, hz:arenaRadius + 2 });
  addFixedCuboid({ x: arenaRadius + wall, y:1.1, hx:wall, hy:1.2, hz:arenaRadius + wall });
  addFixedCuboid({ x:-arenaRadius - wall, y:1.1, hx:wall, hy:1.2, hz:arenaRadius + wall });
  addFixedCuboid({ z: arenaRadius + wall, y:1.1, hx:arenaRadius + wall, hy:1.2, hz:wall });
  addFixedCuboid({ z:-arenaRadius - wall, y:1.1, hx:arenaRadius + wall, hy:1.2, hz:wall });

  function bodyHeightFor(e){ return Math.max(.65, (e.height || 1) * (e.heightScale || 1)); }
  function createEnemyBody(e, { dir = { x:0, z:1 }, force = 8, lift = 4, torque = 8 } = {}){
    removeEnemyBody(e);
    const h = bodyHeightFor(e);
    const radius = Math.max(.18, e.radius || .3);
    const half = Math.max(.08, h * .5 - radius);
    const desc = R.RigidBodyDesc.dynamic()
      .setTranslation(e.x || 0, Math.max(radius + .04, (e.airY || 0) + h * .5), e.z || 0)
      .setLinearDamping(.24)
      .setAngularDamping(.36)
      .setCanSleep(false);
    const body = world.createRigidBody(desc);
    const collider = world.createCollider(
      R.ColliderDesc.capsule(half, radius).setDensity(1.1).setFriction(.82).setRestitution(.38),
      body
    );
    const d = new THREE.Vector3(dir?.x || 0, 0, dir?.z || 1); if(d.lengthSq() < 1e-5) d.set(0,0,1); d.normalize();
    const side = new THREE.Vector3(-d.z, 0, d.x);
    body.applyImpulse({ x:d.x * force, y:lift, z:d.z * force }, true);
    body.applyTorqueImpulse({ x:side.x * torque + (Math.random()-.5)*torque*.25, y:(Math.random()-.5)*torque*.2, z:side.z * torque + (Math.random()-.5)*torque*.25 }, true);
    bodies.set(e.id, { body, collider, height:h });
    e.physicsMode = 'rigid';
    e.physicsBody = body;
    e.physicsCollider = collider;
    e.physicsHeight = h;
    return body;
  }

  function removeEnemyBody(e){
    const rec = bodies.get(e.id);
    if(!rec) return;
    world.removeCollider(rec.collider, true);
    world.removeRigidBody(rec.body);
    bodies.delete(e.id);
    e.physicsBody = null; e.physicsCollider = null; e.physicsMode = 'animated';
  }

  function syncEnemy(e){
    const rec = bodies.get(e.id); if(!rec) return false;
    const t = rec.body.translation(); const r = rec.body.rotation();
    e.x = t.x; e.z = t.z; e.airY = Math.max(0, t.y - rec.height * .5);
    e.root.position.set(t.x, t.y - rec.height * .5, t.z);
    e.root.quaternion.set(r.x, r.y, r.z, r.w);
    return true;
  }

  function step(dt){
    accumulator = Math.min(.12, accumulator + dt);
    while(accumulator >= fixedDt){ world.step(); accumulator -= fixedDt; }
  }

  function isSettled(e, minSpeed = .28){
    const rec = bodies.get(e.id); if(!rec) return false;
    const v = rec.body.linvel(); const w = rec.body.angvel();
    return Math.hypot(v.x,v.y,v.z) + Math.hypot(w.x,w.y,w.z) < minSpeed;
  }

  return { RAPIER:R, world, step, createEnemyBody, removeEnemyBody, syncEnemy, isSettled };
}
