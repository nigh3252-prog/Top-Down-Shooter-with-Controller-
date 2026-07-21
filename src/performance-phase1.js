const nowMs = () => globalThis.performance?.now?.() ?? Date.now();

function traverse(node, visit){
  if(!node) return;
  visit(node);
  for(const child of node.children || []) traverse(child, visit);
}

function disableMeshShadows(root, shouldPreserve = () => false){
  let disabled = 0;
  const visit = (node, preserved = false) => {
    if(!node) return;
    const keep = preserved || shouldPreserve(node);
    if(node.isMesh && !keep && node.castShadow){
      node.castShadow = false;
      disabled++;
    }
    for(const child of node.children || []) visit(child, keep);
  };
  visit(root, false);
  return disabled;
}

export function reduceSmallSceneryShadows(world){
  if(!world?.group) return 0;
  let disabled = 0;

  for(const child of world.group.children || []){
    const name = String(child?.name || '');
    if(name === 'akai courtyard visual skin'){
      disabled += disableMeshShadows(child);
    } else if(name.startsWith('boundary district extensions:')){
      // Preserve the large facade and landmark silhouettes. Their shadows help
      // anchor the room; the many signs, lanterns, trim pieces and decals do not
      // need a second shadow-map draw on a phone.
      disabled += disableMeshShadows(child, node =>
        !!node?.userData?.boundaryBuildingKind || !!node?.userData?.boundaryLandmark
      );
    } else if(name.startsWith('boundary room floor:')){
      disabled += disableMeshShadows(child);
    }
  }

  for(const prop of world.boundaryKnockableProps || []){
    disabled += disableMeshShadows(prop?.root);
  }
  return disabled;
}

export function installStableCollisionCache(world){
  if(!world?.getCollisionSegments || world.__phase1CollisionCache) return world?.__phase1CollisionCache || null;

  const sourceGetCollisionSegments = world.getCollisionSegments.bind(world);
  const sourceSetDoorStates = typeof world.setDoorStates === 'function'
    ? world.setDoorStates.bind(world)
    : null;
  const cachedSegments = [];
  let dirty = true;

  const stats = {
    queries:0,
    rebuilds:0,
    invalidations:0,
    segmentCount:0,
    get dirty(){ return dirty; },
  };

  const invalidate = () => {
    if(!dirty) stats.invalidations++;
    dirty = true;
  };

  const rebuild = () => {
    const next = sourceGetCollisionSegments() || [];
    cachedSegments.length = 0;
    cachedSegments.push(...next);
    stats.rebuilds++;
    stats.segmentCount = cachedSegments.length;
    dirty = false;
    return cachedSegments;
  };

  world.getCollisionSegments = () => {
    stats.queries++;
    return dirty ? rebuild() : cachedSegments;
  };
  world.invalidateCollisionSegments = invalidate;

  if(sourceSetDoorStates){
    world.setDoorStates = (...args) => {
      const value = sourceSetDoorStates(...args);
      invalidate();
      return value;
    };
  }

  world.__phase1CollisionCache = { stats, invalidate, rebuild, segments:cachedSegments };
  return world.__phase1CollisionCache;
}

function countRoomObjects(world){
  const counts = { objects:0, meshes:0, shadowCasters:0 };
  traverse(world?.group, object => {
    counts.objects++;
    if(object?.isMesh){
      counts.meshes++;
      if(object.castShadow) counts.shadowCasters++;
    }
  });
  return counts;
}

function perfOverlay(){
  if(typeof document === 'undefined') return null;
  const enabled = new URLSearchParams(globalThis.location?.search || '').get('perf') === '1';
  if(!enabled) return null;
  let element = document.getElementById('phase1PerfOverlay');
  if(element) return element;
  element = document.createElement('pre');
  element.id = 'phase1PerfOverlay';
  element.style.cssText = 'position:fixed;right:max(8px,env(safe-area-inset-right));top:max(8px,env(safe-area-inset-top));z-index:200;margin:0;padding:7px 9px;pointer-events:none;color:#dff;background:rgba(1,8,11,.82);border:1px solid rgba(126,217,221,.45);font:700 10px/1.35 ui-monospace,monospace;white-space:pre;text-align:right';
  document.body.appendChild(element);
  return element;
}

export function installWorldPerformancePhase1(world, { buildMs = 0 } = {}){
  if(!world || world.__phase1Performance) return world;

  const collision = installStableCollisionCache(world);
  const shadowsDisabled = reduceSmallSceneryShadows(world);
  const objectCounts = countRoomObjects(world);
  const overlay = perfOverlay();
  const sourceUpdate = typeof world.update === 'function' ? world.update.bind(world) : () => {};
  const sourceDispose = typeof world.dispose === 'function' ? world.dispose.bind(world) : () => {};
  const frameSamples = [];
  let elapsed = 0;
  let lastQueries = collision?.stats?.queries || 0;
  let queriesPerSecond = 0;

  const stats = {
    buildMs:Math.max(0, Number(buildMs) || 0),
    shadowsDisabled,
    ...objectCounts,
    collision:collision?.stats || null,
    fps:0,
    frameMs:0,
    collisionQueriesPerSecond:0,
    snapshot(){
      return {
        buildMs:this.buildMs,
        fps:this.fps,
        frameMs:this.frameMs,
        objects:this.objects,
        meshes:this.meshes,
        shadowCasters:this.shadowCasters,
        shadowsDisabled:this.shadowsDisabled,
        collisionSegments:this.collision?.segmentCount || 0,
        collisionQueries:this.collision?.queries || 0,
        collisionRebuilds:this.collision?.rebuilds || 0,
        collisionInvalidations:this.collision?.invalidations || 0,
        collisionQueriesPerSecond:this.collisionQueriesPerSecond,
      };
    },
  };

  world.update = dt => {
    const started = nowMs();
    sourceUpdate(dt);
    const updateMs = Math.max(0, nowMs() - started);
    const frameDt = Math.max(0, Number(dt) || 0);
    elapsed += frameDt;
    if(frameDt > 0){
      frameSamples.push(frameDt);
      if(frameSamples.length > 45) frameSamples.shift();
    }
    if(elapsed >= .25){
      const total = frameSamples.reduce((sum, value) => sum + value, 0);
      const average = total / Math.max(1, frameSamples.length);
      stats.fps = average > 0 ? 1 / average : 0;
      stats.frameMs = average * 1000;
      const queryTotal = collision?.stats?.queries || 0;
      queriesPerSecond = (queryTotal - lastQueries) / Math.max(.001, elapsed);
      lastQueries = queryTotal;
      stats.collisionQueriesPerSecond = queriesPerSecond;
      elapsed = 0;
      if(overlay){
        const snapshot = stats.snapshot();
        overlay.textContent = [
          `FPS ${snapshot.fps.toFixed(0)} · ${snapshot.frameMs.toFixed(1)} ms`,
          `ROOM BUILD ${snapshot.buildMs.toFixed(1)} ms`,
          `MESH ${snapshot.meshes} · SHADOW ${snapshot.shadowCasters} (-${snapshot.shadowsDisabled})`,
          `COLLISION ${snapshot.collisionSegments} · REBUILD ${snapshot.collisionRebuilds}`,
          `COLLISION CALLS ${snapshot.collisionQueriesPerSecond.toFixed(0)}/s`,
          `WORLD UPDATE ${updateMs.toFixed(2)} ms`,
        ].join('\n');
      }
    }
  };

  world.dispose = () => {
    if(globalThis.__arenaPerformance?.world === world) globalThis.__arenaPerformance = null;
    sourceDispose();
  };

  world.performanceStats = stats;
  world.__phase1Performance = true;
  globalThis.__arenaPerformance = { world, stats, snapshot:() => stats.snapshot() };
  return world;
}
