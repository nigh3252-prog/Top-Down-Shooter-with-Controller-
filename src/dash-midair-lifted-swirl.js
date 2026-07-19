// Dash adapter for threejs_midair_lifted_ground_slice_v1.html.
// The simulation, palette, plane, voxel, and streak formulas below are copied
// from that prototype. Only the outer lifetime/world-coordinate adapter is new.

const NOOP_RUNTIME = Object.freeze({
  beginDash(){},
  emitWorld(){},
  update(){},
  dispose(){},
});

export function installMidairLiftedDashSwirl(api){
  const { THREE, scene } = api || {};
  if(!THREE || !scene || !globalThis.document?.createElement ||
     !THREE.Group || !THREE.CanvasTexture || !THREE.InstancedMesh ||
     !THREE.PlaneGeometry || !THREE.BoxGeometry || !THREE.MeshBasicMaterial ||
     !THREE.Object3D || !THREE.Color || !THREE.Quaternion){
    return NOOP_RUNTIME;
  }

  const renderMode = "quads";
  const palette = "blue";
  const frozenSettings = Object.freeze({
    push:1.9,
    ink:1.45,
    heat:1.85,
    curl:2.45,
    momentum:0.984,
    fade:0.989,
    radius:42,
    layers:4,
    height:0.95,
    voxelSize:0.82,
    breakup:0.38,
    ground:0.00,
    glow:2.25,
    accent:1.8,
    quality:0,
  });

  function settings() {
    return frozenSettings;
  }

  const PATCH_W = 15.5;
  const PATCH_D = 13.5;
  const MAX_LAYERS = 6;
  const VIS_COLS = 26;
  const VIS_ROWS = 24;
  const MAX_INSTANCES = VIS_COLS * VIS_ROWS * MAX_LAYERS;
  const MAX_STROKES = 40;

  let simW = 48;
  let simH = 42;
  let N = simW * simH;
  let u, v, u0, v0, dye, dye0, heat, heat0, pressure, divergence, curlField, solid;

  const dyeCanvas = document.createElement("canvas");
  const dyeCtx = dyeCanvas.getContext("2d", { alpha: true });
  if(!dyeCtx) return NOOP_RUNTIME;
  let imageData, pix, dyeTexture;

  const group = new THREE.Group();
  group.name = "MidairLiftedDashSwirl";
  group.visible = false;
  scene.add(group);

  const color = new THREE.Color();
  const color2 = new THREE.Color();
  const dummy = new THREE.Object3D();
  const camera = { quaternion:new THREE.Quaternion() };
  camera.quaternion.setFromEuler?.(new THREE.Euler(-0.82, 0, 0));

  let restoreRendererCapture = null;
  const rendererProto = THREE.WebGLRenderer?.prototype;
  if(rendererProto?.render){
    const previousRender = rendererProto.render;
    function capturedRender(sceneArg, cameraArg){
      if(sceneArg === scene && cameraArg?.quaternion) camera.quaternion.copy(cameraArg.quaternion);
      return previousRender.apply(this, arguments);
    }
    rendererProto.render = capturedRender;
    restoreRendererCapture = () => {
      if(rendererProto.render === capturedRender) rendererProto.render = previousRender;
    };
  }

  const seeds = new Float32Array(MAX_INSTANCES);
  const jitterX = new Float32Array(MAX_INSTANCES);
  const jitterZ = new Float32Array(MAX_INSTANCES);
  for (let i = 0; i < MAX_INSTANCES; i++) {
    seeds[i] = Math.random();
    jitterX[i] = Math.random() - 0.5;
    jitterZ[i] = Math.random() - 0.5;
  }

  const strokeSeeds = new Float32Array(MAX_STROKES);
  for (let i = 0; i < MAX_STROKES; i++) strokeSeeds[i] = Math.random();

  const strokes = [];

  function cfg() {
    const q = settings().quality;
    if (q === 0) return { dprCap: 1.0, simW: 48, simH: 42, pressureIters: 4 };
    if (q === 1) return { dprCap: 1.15, simW: 60, simH: 52, pressureIters: 6 };
    return { dprCap: 1.30, simW: 72, simH: 62, pressureIters: 8 };
  }

  function worldToGridX(x) {
    return (x / PATCH_W + 0.5) * simW;
  }

  function worldToGridY(z) {
    return (z / PATCH_D + 0.5) * simH;
  }

  function idx(x, y) {
    return x + y * simW;
  }

  function sample(field, x, y) {
    x = Math.max(0.5, Math.min(simW - 1.5, x));
    y = Math.max(0.5, Math.min(simH - 1.5, y));

    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;
    const sx = x - x0;
    const sy = y - y0;

    const i00 = idx(x0, y0);
    const i10 = idx(x1, y0);
    const i01 = idx(x0, y1);
    const i11 = idx(x1, y1);

    const a = field[i00] * (1 - sx) + field[i10] * sx;
    const b = field[i01] * (1 - sx) + field[i11] * sx;
    return a * (1 - sy) + b * sy;
  }

  function makeDyeTexture() {
    dyeCanvas.width = simW;
    dyeCanvas.height = simH;
    imageData = dyeCtx.createImageData(simW, simH);
    pix = imageData.data;
    dyeTexture = new THREE.CanvasTexture(dyeCanvas);
    dyeTexture.colorSpace = THREE.SRGBColorSpace;
    dyeTexture.minFilter = THREE.NearestFilter;
    dyeTexture.magFilter = THREE.NearestFilter;
    dyeTexture.generateMipmaps = false;
    dyeTexture.wrapS = THREE.ClampToEdgeWrapping;
    dyeTexture.wrapT = THREE.ClampToEdgeWrapping;
  }

  makeDyeTexture();

  const fluidPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(PATCH_W, PATCH_D),
    new THREE.MeshBasicMaterial({
      map: dyeTexture,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  fluidPlane.rotation.x = -Math.PI / 2;
  fluidPlane.position.y = 0.025;
  group.add(fluidPlane);

  const fluidGlowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(PATCH_W * 1.02, PATCH_D * 1.02),
    new THREE.MeshBasicMaterial({
      map: dyeTexture,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  fluidGlowPlane.rotation.x = -Math.PI / 2;
  fluidGlowPlane.position.y = 0.035;
  group.add(fluidGlowPlane);

  const airPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(PATCH_W, PATCH_D),
    new THREE.MeshBasicMaterial({
      map: dyeTexture,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  airPlane.rotation.x = -Math.PI / 2;
  airPlane.position.y = 0.92;
  group.add(airPlane);

  const airGlowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(PATCH_W * 1.03, PATCH_D * 1.03),
    new THREE.MeshBasicMaterial({
      map: dyeTexture,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  airGlowPlane.rotation.x = -Math.PI / 2;
  airGlowPlane.position.y = 1.02;
  group.add(airGlowPlane);

  const airHaloPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(PATCH_W * 1.08, PATCH_D * 1.08),
    new THREE.MeshBasicMaterial({
      map: dyeTexture,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  airHaloPlane.rotation.x = -Math.PI / 2;
  airHaloPlane.position.y = 1.10;
  group.add(airHaloPlane);

  const quadMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true,
    side: THREE.DoubleSide
  });

  const cubeMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true
  });

  const strokeMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true,
    side: THREE.DoubleSide
  });

  const quadMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), quadMaterial, MAX_INSTANCES);
  const cubeMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), cubeMaterial, MAX_INSTANCES);
  const strokeMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), strokeMaterial, MAX_STROKES);

  quadMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  cubeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  strokeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  quadMesh.frustumCulled = false;
  cubeMesh.frustumCulled = false;
  strokeMesh.frustumCulled = false;

  group.add(quadMesh);
  group.add(cubeMesh);
  group.add(strokeMesh);

  function clearSim() {
    if (!u) return;
    u.fill(0); v.fill(0);
    u0.fill(0); v0.fill(0);
    dye.fill(0); dye0.fill(0);
    heat.fill(0); heat0.fill(0);
    pressure.fill(0); divergence.fill(0); curlField.fill(0);
    strokes.length = 0;
  }

  function resetSimulationArrays(){
    const c = cfg();
    simW = c.simW;
    simH = c.simH;
    N = simW * simH;

    u = new Float32Array(N);
    v = new Float32Array(N);
    u0 = new Float32Array(N);
    v0 = new Float32Array(N);
    dye = new Float32Array(N);
    dye0 = new Float32Array(N);
    heat = new Float32Array(N);
    heat0 = new Float32Array(N);
    pressure = new Float32Array(N);
    divergence = new Float32Array(N);
    curlField = new Float32Array(N);
    solid = new Uint8Array(N);
  }
  resetSimulationArrays();

  function injectWorld(x, z, dx, dz, pressureValue = 1) {
    const s = settings();
    if (x < -PATCH_W * 0.55 || x > PATCH_W * 0.55 || z < -PATCH_D * 0.55 || z > PATCH_D * 0.55) return;

    const gx = worldToGridX(x);
    const gy = worldToGridY(z);
    const radiusGrid = Math.max(1.8, s.radius / 100 * simW * 0.19);
    const r2 = radiusGrid * radiusGrid;

    const vx = (dx / PATCH_W) * simW * s.push * 0.95 * pressureValue;
    const vy = (dz / PATCH_D) * simH * s.push * 0.95 * pressureValue;
    const speed = Math.hypot(dx, dz);

    const minX = Math.max(2, Math.floor(gx - radiusGrid));
    const maxX = Math.min(simW - 3, Math.ceil(gx + radiusGrid));
    const minY = Math.max(2, Math.floor(gy - radiusGrid));
    const maxY = Math.min(simH - 3, Math.ceil(gy + radiusGrid));

    for (let y = minY; y <= maxY; y++) {
      const yy = y - gy;
      for (let x = minX; x <= maxX; x++) {
        const i = idx(x, y);
        if (solid[i]) continue;

        const xx = x - gx;
        const dist2 = xx * xx + yy * yy;
        if (dist2 > r2) continue;

        const falloff = Math.pow(1 - dist2 / r2, 1.7);

        u[i] += vx * falloff;
        v[i] += vy * falloff;

        const side = Math.sign(vx * yy - vy * xx || 1);
        const tangent = 0.032 * s.curl * s.push * falloff;
        u[i] += -yy * tangent * side;
        v[i] +=  xx * tangent * side;

        const dAdd = (0.022 + speed * 0.85) * s.ink * falloff;
        const hAdd = (0.06 + speed * 1.2) * s.heat * falloff;

        dye[i] = Math.min(4.0, dye[i] + dAdd);
        heat[i] = Math.min(4.0, heat[i] + hAdd);
      }
    }

    if (speed > 0.08) addStroke(x, z, dx, dz, speed);
  }

  function addStroke(x, z, dx, dz, speed) {
    const len = Math.hypot(dx, dz);
    if (len < 0.01) return;
    strokes.push({
      x0: x - dx * 1.8,
      z0: z - dz * 1.8,
      x1: x,
      z1: z,
      life: 1,
      heat: Math.min(1, 0.20 + speed * 1.25),
      width: 0.18 + speed * 0.55,
      len: len
    });
    if (strokes.length > MAX_STROKES) strokes.shift();
  }

  function advectVector() {
    const s = settings();
    u0.set(u);
    v0.set(v);

    const dt = 0.95;

    for (let y = 1; y < simH - 1; y++) {
      for (let x = 1; x < simW - 1; x++) {
        const i = idx(x, y);
        if (solid[i]) {
          u[i] = 0;
          v[i] = 0;
          continue;
        }
        const px = x - u0[i] * dt;
        const py = y - v0[i] * dt;
        u[i] = sample(u0, px, py) * s.momentum;
        v[i] = sample(v0, px, py) * s.momentum;
      }
    }
  }

  function advectScalar(field, prev, fadeFactor) {
    prev.set(field);
    const dt = 0.98;
    for (let y = 1; y < simH - 1; y++) {
      for (let x = 1; x < simW - 1; x++) {
        const i = idx(x, y);
        if (solid[i]) {
          field[i] = 0;
          continue;
        }
        const px = x - u[i] * dt;
        const py = y - v[i] * dt;
        let d = sample(prev, px, py) * fadeFactor;
        if (d < 0.018) d *= 0.92;
        field[i] = Math.min(4.0, d);
      }
    }
  }

  function addVorticity() {
    const s = settings();

    for (let y = 1; y < simH - 1; y++) {
      for (let x = 1; x < simW - 1; x++) {
        const i = idx(x, y);
        if (solid[i]) {
          curlField[i] = 0;
          continue;
        }
        const dv_dx = (v[idx(x + 1, y)] - v[idx(x - 1, y)]) * 0.5;
        const du_dy = (u[idx(x, y + 1)] - u[idx(x, y - 1)]) * 0.5;
        curlField[i] = dv_dx - du_dy;
      }
    }

    const strength = 0.0165 * s.curl;
    for (let y = 2; y < simH - 2; y++) {
      for (let x = 2; x < simW - 2; x++) {
        const i = idx(x, y);
        if (solid[i]) continue;

        const l = Math.abs(curlField[idx(x - 1, y)]);
        const r = Math.abs(curlField[idx(x + 1, y)]);
        const b = Math.abs(curlField[idx(x, y - 1)]);
        const t = Math.abs(curlField[idx(x, y + 1)]);

        let nx = r - l;
        let ny = t - b;
        const len = Math.hypot(nx, ny) + 1e-5;
        nx /= len;
        ny /= len;

        const c = curlField[i];
        u[i] += ny * -c * strength;
        v[i] += nx *  c * strength;
      }
    }
  }

  function project() {
    const c = cfg();
    pressure.fill(0);

    for (let y = 1; y < simH - 1; y++) {
      for (let x = 1; x < simW - 1; x++) {
        const i = idx(x, y);
        if (solid[i]) {
          divergence[i] = 0;
          continue;
        }
        divergence[i] =
          (u[idx(x + 1, y)] - u[idx(x - 1, y)] +
           v[idx(x, y + 1)] - v[idx(x, y - 1)]) * -0.5;
      }
    }

    for (let k = 0; k < c.pressureIters; k++) {
      for (let y = 1; y < simH - 1; y++) {
        for (let x = 1; x < simW - 1; x++) {
          const i = idx(x, y);
          if (solid[i]) continue;
          pressure[i] =
            (divergence[i] +
             pressure[idx(x - 1, y)] + pressure[idx(x + 1, y)] +
             pressure[idx(x, y - 1)] + pressure[idx(x, y + 1)]) * 0.25;
        }
      }
    }

    for (let y = 1; y < simH - 1; y++) {
      for (let x = 1; x < simW - 1; x++) {
        const i = idx(x, y);
        if (solid[i]) continue;
        u[i] -= (pressure[idx(x + 1, y)] - pressure[idx(x - 1, y)]) * 0.5;
        v[i] -= (pressure[idx(x, y + 1)] - pressure[idx(x, y - 1)]) * 0.5;
      }
    }
  }

  function applySolids() {
    for (let y = 1; y < simH - 1; y++) {
      for (let x = 1; x < simW - 1; x++) {
        const i = idx(x, y);
        if (solid[i]) {
          u[i] = 0;
          v[i] = 0;
          dye[i] = 0;
          heat[i] = 0;
          continue;
        }

        const left = solid[idx(x - 1, y)];
        const right = solid[idx(x + 1, y)];
        const down = solid[idx(x, y - 1)];
        const up = solid[idx(x, y + 1)];

        if (left && u[i] < 0) u[i] *= -0.38;
        if (right && u[i] > 0) u[i] *= -0.38;
        if (down && v[i] < 0) v[i] *= -0.38;
        if (up && v[i] > 0) v[i] *= -0.38;

        if (left || right || down || up) {
          u[i] *= 0.94;
          v[i] *= 0.94;
        }
      }
    }
  }

  function updateStrokes() {
    const s = settings();
    for (let i = strokes.length - 1; i >= 0; i--) {
      const st = strokes[i];
      st.life *= 0.86;
      st.width *= 0.965;
      st.heat *= 0.965;
      if (st.life < 0.02 || st.width < 0.02 || s.accent < 0.05) strokes.splice(i, 1);
    }
  }

  function updateSim() {
    advectVector();
    addVorticity();
    project();
    applySolids();
    advectScalar(dye, dye0, settings().fade);
    advectScalar(heat, heat0, 0.955);
    applySolids();
    updateStrokes();
  }

  function mix3(a, b, t, out) {
    out.copy(a).lerp(b, t);
  }

  function paletteColor(body, hot, layerT, out) {
    const cool = Math.max(0, body - hot * 0.55);
    const core = Math.min(1, hot * 1.25);
    const haze = Math.min(1, cool * (0.65 + layerT * 0.35));

    if (palette === "blue") {
      const c0 = new THREE.Color(1.00, 0.99, 1.00);
      const c1 = new THREE.Color(0.48, 0.98, 1.00);
      const c2 = new THREE.Color(0.12, 0.66, 1.00);
      const c3 = new THREE.Color(0.38, 0.20, 0.78);

      if (core > 0.68) mix3(c1, c0, (core - 0.68) / 0.32, out);
      else if (core > 0.30) mix3(c2, c1, (core - 0.30) / 0.38, out);
      else mix3(c3, c2, Math.min(1, core / 0.30), out);

      color2.setRGB(0.10, 0.06, 0.22);
      out.lerp(color2, Math.min(0.55, haze * 0.55 + layerT * 0.14));
      out.multiplyScalar(0.26 + body * 0.95 + core * 0.65);
      return;
    }
  }

  function hotAccentColor(hot, out) {
    if (palette === "blue") {
      out.setRGB(0.62, 1.00, 1.00);
      out.lerp(new THREE.Color(1, 1, 1), Math.min(1, hot * 0.55));
      return;
    }
  }

  function renderGroundTexture() {
    const s = settings();

    for (let i = 0, p = 0; i < N; i++, p += 4) {
      if (solid[i]) {
        pix[p + 0] = 0;
        pix[p + 1] = 0;
        pix[p + 2] = 0;
        pix[p + 3] = 0;
        continue;
      }

      const d = Math.max(0, dye[i]);
      const h = Math.max(0, heat[i]);
      const body = Math.min(1, Math.pow(d * 1.25, 0.75));
      const hot = Math.min(1, Math.pow(Math.min(d, h) * 1.45, 0.78));

      if (body < 0.035) {
        pix[p + 0] = 0;
        pix[p + 1] = 0;
        pix[p + 2] = 0;
        pix[p + 3] = 0;
        continue;
      }

      paletteColor(body, hot, 0, color);

      const a = Math.min(1, body * 0.78 + hot * 0.35);
      pix[p + 0] = Math.floor(Math.min(255, color.r * 255));
      pix[p + 1] = Math.floor(Math.min(255, color.g * 255));
      pix[p + 2] = Math.floor(Math.min(255, color.b * 255));
      pix[p + 3] = Math.floor(Math.min(255, a * 255));
    }

    dyeCtx.putImageData(imageData, 0, 0);
    dyeTexture.needsUpdate = true;

    fluidPlane.material.opacity = s.ground <= 0.001 ? 0 : Math.min(1.6, 0.92 * s.ground);
    fluidGlowPlane.material.opacity = s.ground <= 0.001 ? 0 : Math.min(1.2, 0.42 * s.ground);

    airPlane.material.opacity = Math.min(1.45, 0.78 + s.glow * 0.18);
    airGlowPlane.material.opacity = Math.min(1.10, 0.26 + s.glow * 0.16);
    airHaloPlane.material.opacity = Math.min(0.75, 0.10 + s.glow * 0.08);
  }

  function sampleRenderedGroundColor(gx, gy, out) {
    const x = Math.max(0, Math.min(simW - 1, Math.floor(gx)));
    const y = Math.max(0, Math.min(simH - 1, Math.floor(gy)));
    const p = (x + y * simW) * 4;
    out.setRGB(pix[p + 0] / 255, pix[p + 1] / 255, pix[p + 2] / 255);
    return pix[p + 3] / 255;
  }

  function updateVoxelInstances(time) {
    const s = settings();
    const mesh = renderMode === "cubes" ? cubeMesh : quadMesh;
    const other = renderMode === "cubes" ? quadMesh : cubeMesh;
    mesh.visible = true;
    other.visible = false;

    const activeLayers = s.layers;
    const voxelBaseW = PATCH_W / VIS_COLS;
    const voxelBaseD = PATCH_D / VIS_ROWS;
    const baseSize = Math.min(voxelBaseW, voxelBaseD) * s.voxelSize;
    const midLayer = Math.max(0, Math.min(activeLayers - 1, Math.round((activeLayers - 1) * 0.55)));

    let instance = 0;

    for (let row = 0; row < VIS_ROWS; row++) {
      for (let col = 0; col < VIS_COLS; col++) {
        const gx = (col + 0.5) / VIS_COLS * (simW - 2) + 1;
        const gy = (row + 0.5) / VIS_ROWS * (simH - 2) + 1;

        const iApprox = idx(
          Math.max(1, Math.min(simW - 2, Math.floor(gx))),
          Math.max(1, Math.min(simH - 2, Math.floor(gy)))
        );
        const isSolid = solid[iApprox];

        const d = sample(dye, gx, gy);
        const speed = Math.hypot(sample(u, gx, gy), sample(v, gx, gy));
        const swirl = sample(curlField, gx, gy);
        const body = Math.min(1, Math.pow(d * 1.30, 0.75));
        const groundAlpha = sampleRenderedGroundColor(gx, gy, color);

        const worldX = (col / (VIS_COLS - 1) - 0.5) * PATCH_W;
        const worldZ = (row / (VIS_ROWS - 1) - 0.5) * PATCH_D;

        for (let layer = 0; layer < MAX_LAYERS; layer++) {
          const layerT = layer / Math.max(1, MAX_LAYERS - 1);
          const seed = seeds[instance];
          const distFromMid = Math.abs(layer - midLayer);
          const layerFocus = Math.exp(-Math.pow(distFromMid / 0.95, 2));
          const breakupNoise = seed * 0.06 + 0.05 * Math.sin(time * 1.1 + seed * 18 + layer * 1.6);
          const threshold = 0.05 + s.breakup * 0.08 + distFromMid * 0.14 + breakupNoise;
          const visible = !isSolid && layer < activeLayers && groundAlpha > threshold;

          if (!visible) {
            dummy.position.set(0, -999, 0);
            dummy.scale.set(0.001, 0.001, 0.001);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            mesh.setMatrixAt(instance, dummy.matrix);
            mesh.setColorAt(instance, color.setRGB(0, 0, 0));
            instance++;
            continue;
          }

          const drift = layer * (0.06 + s.height * 0.10);
          const dx = sample(u, gx, gy) * drift + jitterX[instance] * baseSize * (0.18 + distFromMid * 0.06);
          const dz = sample(v, gx, gy) * drift + jitterZ[instance] * baseSize * (0.18 + distFromMid * 0.06);
          const swirlPush = Math.sin(time * 1.7 + seed * 12.0) * swirl * 0.008 * (0.4 + layer);

          const y = 0.28 + layer * (0.14 + s.height * 0.17) + groundAlpha * (0.12 + 0.16 * layerFocus);
          const size = baseSize * (0.68 + groundAlpha * 0.92 + layerFocus * 0.24) * (1.0 - distFromMid * 0.06);
          const pulse = 1 + 0.06 * Math.sin(time * 4.6 + seed * 100);

          dummy.position.set(worldX + dx + swirlPush, y, worldZ + dz - swirlPush);

          if (renderMode === "quads") {
            dummy.quaternion.copy(camera.quaternion);
            dummy.scale.set(size * pulse, size * pulse, 1);
          } else {
            dummy.rotation.set(0, seed * Math.PI * 2, 0);
            dummy.scale.set(size * pulse, size * (0.45 + groundAlpha * 0.95 + layerFocus * 0.22), size * pulse);
          }

          dummy.updateMatrix();
          mesh.setMatrixAt(instance, dummy.matrix);

          sampleRenderedGroundColor(gx, gy, color);
          color.multiplyScalar((0.72 + groundAlpha * 0.82 + speed * 0.03) * (0.66 + layerFocus * 0.58));
          mesh.setColorAt(instance, color);

          instance++;
        }
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  function updateStrokeInstances() {
    const s = settings();
    for (let i = 0; i < MAX_STROKES; i++) {
      const st = strokes[i];
      if (!st || st.life <= 0 || s.accent <= 0.03) {
        dummy.position.set(0, -999, 0);
        dummy.scale.set(0.001, 0.001, 0.001);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        strokeMesh.setMatrixAt(i, dummy.matrix);
        strokeMesh.setColorAt(i, color.setRGB(0, 0, 0));
        continue;
      }

      const mx = (st.x0 + st.x1) * 0.5;
      const mz = (st.z0 + st.z1) * 0.5;
      const dx = st.x1 - st.x0;
      const dz = st.z1 - st.z0;
      const len = Math.max(0.01, Math.hypot(dx, dz));
      const ang = Math.atan2(dz, dx);

      dummy.position.set(mx, 0.94 + st.heat * 0.10, mz);
      dummy.rotation.set(-Math.PI * 0.5, 0, -ang);
      dummy.scale.set(len * 2.0, st.width * s.accent * (0.65 + st.life * 0.55), 1);
      dummy.updateMatrix();
      strokeMesh.setMatrixAt(i, dummy.matrix);

      hotAccentColor(st.heat, color);
      color.multiplyScalar(0.75 + st.life * 0.45);
      strokeMesh.setColorAt(i, color);
    }

    strokeMesh.instanceMatrix.needsUpdate = true;
    if (strokeMesh.instanceColor) strokeMesh.instanceColor.needsUpdate = true;
  }

  let life = 0;
  let time = 0;

  function beginDash({ x, z, direction, distance }){
    const halfDistance = Math.max(0, distance || 0) * 0.5;
    group.position.set(
      x + (direction?.x || 0) * halfDistance,
      0,
      z + (direction?.z || 0) * halfDistance,
    );
    clearSim();
    group.visible = true;
    life = 2.8;
    injectWorld(x - group.position.x, z - group.position.z, 0, 0, 1);
  }

  function emitWorld(x, z, dx, dz){
    if(!group.visible) return;
    injectWorld(x - group.position.x, z - group.position.z, dx, dz, 1);
    life = Math.max(life, 2.8);
  }

  function update(dt){
    if(!group.visible) return;
    time += Math.max(0, dt || 0);
    updateSim();
    renderGroundTexture();
    updateVoxelInstances(time);
    updateStrokeInstances();
    life -= Math.max(0, dt || 0);
    if(life <= 0){
      clearSim();
      group.visible = false;
    }
  }

  function dispose(){
    restoreRendererCapture?.();
    group.parent?.remove(group);
    dyeTexture?.dispose?.();
    for(const mesh of [fluidPlane, fluidGlowPlane, airPlane, airGlowPlane, airHaloPlane, quadMesh, cubeMesh, strokeMesh]){
      mesh.geometry?.dispose?.();
      mesh.material?.dispose?.();
    }
  }

  return { beginDash, emitWorld, update, dispose, group };
}
