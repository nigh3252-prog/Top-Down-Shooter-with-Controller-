import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

import {
  arenaStandardBootstrapValues,
  createArenaSetupCandidate,
  lockArenaStandardSetup,
} from '../src/arena-standard-setup.js';
import { WORKING_ROSTER_HADES_ID } from '../src/encounter-pools.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXED_DT = .25;
const COLD_BOOT_ITERATIONS = 20;
const LOCKED_ROSTER = Object.freeze(['grunt']);
const LOCKED_PRESSURE_BUDGET = 2.5;
const TEST_SEED = 'gate1c-cold-boot';
const WORKING_ROSTER_KEY = 'enemyLab.workingRoster.v1';

const MIME_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
]);

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

class MemoryStorage {
  constructor() {
    this.data = new Map();
  }

  getItem(key) {
    return this.data.has(key) ? this.data.get(key) : null;
  }

  setItem(key, value) {
    this.data.set(key, String(value));
  }

  removeItem(key) {
    this.data.delete(key);
  }
}

class CdpClient {
  constructor(url) {
    if (typeof WebSocket !== 'function') {
      throw new Error('Gate 1C cold-boot integration requires Node.js 22 global WebSocket support.');
    }
    this.nextId = 1;
    this.pending = new Map();
    this.socket = new WebSocket(url);
    this.opened = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', () => reject(new Error('Could not connect to the browser debugging socket.')), { once: true });
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const request = this.pending.get(message.id);
      if (!request) return;
      this.pending.delete(message.id);
      if (message.error) request.reject(new Error(`${request.method}: ${message.error.message}`));
      else request.resolve(message.result);
    });
    this.socket.addEventListener('close', () => {
      for (const request of this.pending.values()) request.reject(new Error('Browser debugging socket closed unexpectedly.'));
      this.pending.clear();
    });
  }

  async call(method, params = {}) {
    await this.opened;
    const id = this.nextId++;
    const promise = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject, method }));
    this.socket.send(JSON.stringify({ id, method, params }));
    return promise;
  }

  close() {
    this.socket.close();
  }
}

async function closeBrowserResources({cdp=null,browserProcess=null,userDataDir=null}={}) {
  try { cdp?.close(); } catch {}
  let killed=false;
  try {
    if (browserProcess?.exitCode === null) {
      browserProcess.kill();
      killed=true;
    }
  } catch {}
  if (killed) await sleep(100);
  if (userDataDir) {
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
  }
}

async function evaluate(cdp, expression) {
  const result = await cdp.call('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (result.exceptionDetails) {
    const detail = result.exceptionDetails.exception?.description ?? result.exceptionDetails.text;
    throw new Error(`Browser evaluation failed:\n${detail}`);
  }
  return result.result?.value;
}

async function callPage(cdp, callback, ...args) {
  return evaluate(cdp, `(${callback.toString()})(${args.map(value => JSON.stringify(value)).join(',')})`);
}

function findBrowser() {
  const candidates = process.platform === 'win32'
    ? [
      path.join(process.env.ProgramFiles || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env['ProgramFiles(x86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env.ProgramFiles || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(process.env['ProgramFiles(x86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    ]
    : ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge'];
  const browser = candidates.find(candidate => candidate && (candidate.includes(path.sep) ? fs.existsSync(candidate) : true));
  if (!browser) throw new Error('A Chrome/Edge browser is required for the Gate 1C cold-boot integration test.');
  return browser;
}

async function serveRepository() {
  const server = http.createServer((request, response) => {
    try {
      const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? '127.0.0.1'}`);
      const relative = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '') || 'index.html';
      const target = path.resolve(ROOT, relative);
      if (target !== ROOT && !target.startsWith(`${ROOT}${path.sep}`)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const stat = fs.statSync(target);
      const file = stat.isDirectory() ? path.join(target, 'index.html') : target;
      response.writeHead(200, {
        'Content-Type': MIME_TYPES.get(path.extname(file).toLowerCase()) ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      fs.createReadStream(file).pipe(response);
    } catch (error) {
      response.writeHead(error?.code === 'ENOENT' ? 404 : 500).end(error?.code === 'ENOENT' ? 'Not found' : 'Server error');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    server,
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise(resolve => server.close(resolve)),
  };
}

async function waitForDevtools(userDataDir, browserProcess, stderr) {
  const portFile = path.join(userDataDir, 'DevToolsActivePort');
  const deadline = Date.now() + 15000;
  let processError=null;
  const onProcessError=error=>{processError=error;};
  browserProcess.once('error', onProcessError);
  try {
    while (Date.now() < deadline) {
      if (processError) throw processError;
      if (browserProcess.exitCode !== null) throw new Error(`Browser exited before startup.\n${stderr()}`);
      if (fs.existsSync(portFile)) {
        try {
          const [port] = fs.readFileSync(portFile, 'utf8').trim().split(/\r?\n/);
          if (Number(port) > 0) return Number(port);
        } catch (error) {
          if (!['EBUSY', 'EACCES', 'EPERM', 'ENOENT'].includes(error?.code)) throw error;
        }
      }
      await sleep(100);
    }
    throw new Error(`Timed out waiting for the browser debugging endpoint.\n${stderr()}`);
  } finally {
    browserProcess.off('error', onProcessError);
  }
}

async function launchBrowser(browser, url) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate1c-cold-boot-chrome-'));
  const stderrChunks = [];
  let browserProcess=null;
  let cdp=null;
  try {
    browserProcess = spawn(browser, [
      '--headless=new',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-renderer-backgrounding',
      '--disable-gpu',
      '--enable-unsafe-swiftshader',
      '--remote-debugging-port=0',
      '--remote-allow-origins=*',
      `--user-data-dir=${userDataDir}`,
      '--window-size=1024,768',
      'about:blank',
    ], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    browserProcess.stderr.on('data', chunk => {
      if (stderrChunks.length < 80) stderrChunks.push(String(chunk));
    });
    const stderr = () => stderrChunks.join('').slice(-10000);
    const port = await waitForDevtools(userDataDir, browserProcess, stderr);
    const response = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
    if (!response.ok) throw new Error(`Browser refused to create a tab (${response.status}).`);
    const target = await response.json();
    if (!target.webSocketDebuggerUrl) throw new Error('Browser did not expose a page debugging socket.');
    cdp = new CdpClient(target.webSocketDebuggerUrl);
    return {
      cdp,
      browserProcess,
      userDataDir,
      close: () => closeBrowserResources({browserProcess,userDataDir}),
    };
  } catch (error) {
    await closeBrowserResources({cdp,browserProcess,userDataDir});
    throw error;
  }
}

async function waitForDocument(cdp) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      if (await evaluate(cdp, 'document.readyState === "complete"')) return;
    } catch {}
    await sleep(50);
  }
  throw new Error('Timed out waiting for the test page document.');
}

async function waitForRuntime(cdp, mode) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const state = await evaluate(cdp, `(async()=>{
        const {getArenaRuntime}=await import('./src/arena-runtime-context.js');
        const runtime=getArenaRuntime();
        const snapshot=runtime?.snapshot?.();
        return {
          mode:runtime?.config?.mode||null,
          ready:!!snapshot?.ready,
          running:!!snapshot?.running,
          planned:!!snapshot?.encounterPlan,
        };
      })()`);
      if (state?.mode === mode && state.ready && state.running && (mode !== 'arena' || state.planned)) return;
    } catch {}
    await sleep(100);
  }
  throw new Error(`Timed out waiting for the ${mode} Arena runtime.`);
}

async function navigate(cdp, url, mode) {
  await cdp.call('Page.navigate', { url });
  await waitForDocument(cdp);
  await waitForRuntime(cdp, mode);
}

async function reload(cdp, mode) {
  await cdp.call('Page.reload', { ignoreCache: true });
  await waitForDocument(cdp);
  await waitForRuntime(cdp, mode);
}

async function waitForRunDraft(cdp) {
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){
    try{
      const state=await evaluate(cdp, `(()=>({
        installed:globalThis.__STONE_RUN_DRAFT_INSTALLED__===true,
        offerCount:document.querySelectorAll('.runOffer').length,
        startGateHidden:document.getElementById('startGate')?.classList.contains('hidden')===true,
      }))()`);
      if(state?.installed&&state.offerCount>=3&&!state.startGateHidden)return state;
    }catch{}
    await sleep(50);
  }
  throw new Error('Timed out waiting for the real run-start/loadout selection UI.');
}

async function completeRunStart(cdp) {
  await waitForRunDraft(cdp);
  const selected=await evaluate(cdp, `(()=>{
    const offer=document.querySelector('.runOffer');
    if(!offer)return null;
    const label=offer.querySelector('.runOfferWeapon')?.textContent?.trim()||'';
    offer.click();
    return label;
  })()`);
  if(!selected)throw new Error('The run-start/loadout UI did not expose a selectable offer.');

  const deadline=Date.now()+15000;
  let last=null,stable=0;
  while(Date.now()<deadline){
    try{
      const state=await evaluate(cdp, `(async()=>{
        await new Promise(resolve=>requestAnimationFrame(resolve));
        const {getArenaRuntime}=await import('./src/arena-runtime-context.js');
        const runtime=getArenaRuntime();
        const snapshot=runtime?.snapshot?.()||{};
        const activeProfile=JSON.parse(localStorage.getItem('arena.activeCombatProfile.v1')||'null');
        return {
          selectedOffer:${JSON.stringify(selected)},
          runStarted:runtime?.arena?.started===true,
          paused:snapshot.paused===true,
          startGateHidden:document.getElementById('startGate')?.classList.contains('hidden')===true,
          offerCount:document.querySelectorAll('.runOffer').length,
          encounterMode:snapshot.encounterMode||null,
          planMode:snapshot.encounterPlan?.mode||null,
          activeProfileEncounterId:activeProfile?.workspace?.scenario?.encounterId||null,
          activeProfileRoster:activeProfile?.workspace?.content?.rosterIds||null,
        };
      })()`);
      const key=JSON.stringify(state);
      if(state?.runStarted&&!state.paused&&state.startGateHidden&&state.offerCount>=3&&state.encounterMode===WORKING_ROSTER_HADES_ID&&state.planMode===WORKING_ROSTER_HADES_ID&&state.activeProfileEncounterId===WORKING_ROSTER_HADES_ID&&JSON.stringify(state.activeProfileRoster)===JSON.stringify(LOCKED_ROSTER)){
        stable=key===last?stable+1:1;
        if(stable>=2)return{...state,handoffSettled:true};
      }else stable=0;
      last=key;
    }catch{}
  }
  throw new Error(`Timed out waiting for the post-loadout profile handoff to settle: ${JSON.stringify(last)}`);
}

function createLockedStandard() {
  const controls = [
    ['presentation.theme', 'arena'],
    ['presentation.maze.cellSize', 'arena'],
    ['presentation.maze.roomSize', 'arena'],
    ['combat.directorMode', 'arena'],
    ['combat.pressure', 'arena'],
    ['combat.aggression', 'arena'],
    ['combat.enemySpeed', 'arena'],
    ['combat.enemyHealth', 'arena'],
    ['combat.enemySize', 'arena'],
    ['combat.idleRange', 'arena'],
    ['player.combatInputMode', 'shared'],
  ].map(([path, target]) => ({ path, target }));
  const workspace = {
    settings: {
      'presentation.theme': 'neutral',
      'presentation.maze.cellSize': 'small',
      'presentation.maze.roomSize': 'medium',
      'combat.directorMode': 'pressureBudget',
      'combat.pressure': LOCKED_PRESSURE_BUDGET,
      'combat.aggression': 1,
      'combat.enemySpeed': .5,
      'combat.enemyHealth': 2.5,
      'combat.enemySize': 1.5,
      'combat.idleRange': 3,
      'player.combatInputMode': 'brawler',
    },
    scenario: {
      source: 'planned',
      encounterMode: WORKING_ROSTER_HADES_ID,
      encounterId: WORKING_ROSTER_HADES_ID,
      seed: TEST_SEED,
      layout: 'maze',
    },
    content: {
      rosterIds: [...LOCKED_ROSTER],
      abilityPoolIds: [],
      currentDeckIds: [],
    },
  };
  const candidate = createArenaSetupCandidate({
    workspace,
    controls,
    name: 'Gate 1C Locked Goblin Standard',
    sourceProfileId: 'gate1c-test-profile',
    now: 100,
  });
  assert.equal(candidate.ok, true, candidate.errors.join(', '));
  const storage = new MemoryStorage();
  const manifest = lockArenaStandardSetup(storage, candidate, { now: 200 });
  const bootstrap = arenaStandardBootstrapValues(manifest);
  assert.deepEqual(JSON.parse(bootstrap[WORKING_ROSTER_KEY]), [...LOCKED_ROSTER]);

  // These values represent a prior session. The real cold-boot bootstrap must
  // replace them from the locked Standard before the Arena module starts.
  storage.setItem(WORKING_ROSTER_KEY, JSON.stringify(['hadesWretchedWitch']));
  storage.setItem('arena.activeCombatProfile.v1', JSON.stringify({ encounterMode: 'all-enemies-budget', rosterIds: ['hadesWretchedWitch'] }));
  storage.setItem('stoneWandererSettings.v1.arena.spawnKind', JSON.stringify('hadesWretchedWitch'));
  return Object.fromEntries(storage.data);
}

async function installStorage(cdp, entries) {
  return callPage(cdp, values => {
    localStorage.clear();
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, String(value));
    return Object.fromEntries(Object.keys(values).map(key => [key, localStorage.getItem(key)]));
  }, entries);
}

async function runtimeState(cdp, { stop = true } = {}) {
  return callPage(cdp, async shouldStop => {
    const {getArenaRuntime}=await import('./src/arena-runtime-context.js');
    const runtime=getArenaRuntime();
    if (shouldStop) runtime?.stop?.();
    const enemySystem=runtime?.enemySystem;
    const copy=value => value == null ? value : JSON.parse(JSON.stringify(value));
    const enemyState=system => ({
      spawnKind:system?.spawnKind||null,
      pressureBudget:Number(system?.director?.settings?.pressureBudget),
      queuedSpawnCount:Number(system?.queuedSpawnCount||0),
      telegraphCount:Number(system?.telegraphCount||0),
      enemies:(system?.enemies||[]).map(enemy => ({
        id:enemy.id||null,
        kind:enemy.kind||enemy.spawnKind||null,
        hp:Number(enemy.hp),
      })),
    });
    const snapshot=runtime?.snapshot?.()||{};
    const plan=copy(runtime?.getEncounterPlan?.()||snapshot.encounterPlan||null);
    const standard=copy(JSON.parse(localStorage.getItem('arena.standardSetup.v1')||'null'));
    const profileSettings=standard?.profile?.workspace?.settings||{};
    const profileValidation=copy(runtime?.validateProfileSettings?.(profileSettings,{includeGlobal:true})||null);
    const activeProfile=copy(JSON.parse(localStorage.getItem('arena.activeCombatProfile.v1')||'null'));
    const original=enemyState(enemySystem?.originalSystem);
    const flare=enemyState(enemySystem?.flareSystem);
    const hades=enemyState(enemySystem?.hadesSystem);
    const living=(enemySystem?.enemies||[]).map(enemy => ({kind:enemy.kind||enemy.spawnKind||null,hp:Number(enemy.hp)}));
    return {
      config:{mode:runtime?.config?.mode||null,enemyLab:!!runtime?.config?.enemyLab},
      standardVersion:document.documentElement.dataset.arenaStandardVersion||'',
      standard:{
        format:standard?.format||null,
        schemaVersion:Number(standard?.schemaVersion)||null,
        standardVersion:Number(standard?.standardVersion)||null,
        lockedAt:Number(standard?.lockedAt)||null,
        scenario:copy(standard?.profile?.workspace?.scenario||null),
        roster:copy(standard?.profile?.workspace?.content?.rosterIds||null),
      },
      activeProfile:{
        scenario:copy(activeProfile?.workspace?.scenario||null),
        roster:copy(activeProfile?.workspace?.content?.rosterIds||null),
      },
      snapshot:{
        ready:!!snapshot.ready,
        encounterMode:snapshot.encounterMode||null,
        aliveCount:Number(snapshot.aliveCount||0),
        queuedSpawnCount:Number(snapshot.queuedSpawnCount||0),
        telegraphCount:Number(snapshot.telegraphCount||0),
        encounterModeWarning:snapshot.encounterModeWarning||'',
      },
      plan,
      profileValidation,
      profileSettingKeys:Object.keys(profileSettings),
      activeRoomId:runtime?.activeRoomId??null,
      progress:runtime?.encounterState?.progress||null,
      encounterRoomId:runtime?.encounterState?.encounterRoomId??null,
      rosterStatus:copy(enemySystem?.getWorkingRosterEncounterStatus?.()||null),
      living,
      childSystems:{original,flare,hades},
      storage:{
        roster:localStorage.getItem('enemyLab.workingRoster.v1'),
        spawnKind:localStorage.getItem('stoneWandererSettings.v1.arena.spawnKind'),
      },
    };
  }, stop);
}

function assertColdBootState(state) {
  assert.equal(state.config.mode, 'arena');
  assert.equal(state.runStart?.handoffSettled, true, 'cold boot must follow the asynchronous run-start/loadout handoff');
  assert.equal(state.runStart?.runStarted, true);
  assert.equal(state.runStart?.paused, false);
  assert.equal(state.runStart?.startGateHidden, true);
  assert.equal(state.runStart?.offerCount, 3);
  assert.equal(state.runStart?.encounterMode, WORKING_ROSTER_HADES_ID);
  assert.equal(state.runStart?.planMode, WORKING_ROSTER_HADES_ID);
  assert.equal(state.runStart?.activeProfileEncounterId, WORKING_ROSTER_HADES_ID);
  assert.deepEqual(state.runStart?.activeProfileRoster, [...LOCKED_ROSTER]);
  assert.equal(state.standardVersion, '1', 'the synchronous Arena Standard bootstrap must run before module boot');
  assert.equal(state.standard.format, 'arena-standard-setup');
  assert.equal(state.standard.schemaVersion, 1);
  assert.equal(state.standard.standardVersion, 1);
  assert.equal(state.standard.lockedAt, 200);
  assert.equal(state.standard.scenario.encounterId, WORKING_ROSTER_HADES_ID);
  assert.deepEqual(state.standard.roster, [...LOCKED_ROSTER]);
  assert.equal(state.activeProfile.scenario.encounterId, WORKING_ROSTER_HADES_ID);
  assert.deepEqual(state.activeProfile.roster, [...LOCKED_ROSTER]);
  assert.equal(state.snapshot.encounterMode, WORKING_ROSTER_HADES_ID, JSON.stringify({
    standardVersion:state.standardVersion,
    storage:state.storage,
    rosterStatus:state.rosterStatus,
    warning:state.snapshot.encounterModeWarning,
    plan:state.plan,
    profileSettingKeys:state.profileSettingKeys,
    profileValidation:state.profileValidation,
  }));
  assert.equal(state.snapshot.encounterModeWarning, '');
  assert.equal(state.rosterStatus?.active, true);
  assert.deepEqual(state.rosterStatus?.ids, [...LOCKED_ROSTER]);
  assert.equal(state.plan?.mode, WORKING_ROSTER_HADES_ID);
  assert.ok(state.plan?.totalCount > 0, 'the first uncleared room needs a non-empty plan');
  assert.ok(state.plan?.groups?.length > 0);
  assert.ok(state.plan.groups.every(group => LOCKED_ROSTER.includes(group.spawnKind)), 'the plan may use only the locked roster');
  assert.ok(state.living.every(enemy => LOCKED_ROSTER.includes(enemy.kind)), 'living enemies may use only the locked roster');
  assert.equal(state.childSystems.original.spawnKind, 'grunt');
  assert.equal(state.childSystems.flare.enemies.length, 0);
  assert.equal(state.childSystems.hades.enemies.length, 0);
  assert.equal(state.childSystems.original.pressureBudget, LOCKED_PRESSURE_BUDGET);
  assert.equal(state.childSystems.flare.pressureBudget, LOCKED_PRESSURE_BUDGET);
  assert.equal(state.childSystems.hades.pressureBudget, LOCKED_PRESSURE_BUDGET);

  const activity = state.snapshot.aliveCount + state.snapshot.queuedSpawnCount + state.snapshot.telegraphCount;
  assert.ok(activity > 0, `cold boot must show living, queued, or telegraphed activity: ${JSON.stringify({ snapshot:state.snapshot, plan:state.plan, living:state.living, childSystems:state.childSystems })}`);
  assert.ok(state.snapshot.queuedSpawnCount > 0 || state.snapshot.telegraphCount > 0, 'roster mode must expose Hades-style introduction activity');
  assert.equal(activity, state.plan.totalCount, 'the first wave must not duplicate or drop planned enemies');
  assert.deepEqual(JSON.parse(state.storage.roster), [...LOCKED_ROSTER]);
  assert.equal(JSON.parse(state.storage.spawnKind), WORKING_ROSTER_HADES_ID, 'the locked Standard must replace the stale direct spawn setting before the first room');
  assert.equal(state.progress?.cleared, 0, 'the first room must remain uncleared on boot');
}

function signature(state) {
  return JSON.stringify({
    mode:state.snapshot.encounterMode,
    room:state.activeRoomId,
    pressure:state.childSystems.original.pressureBudget,
    plan:state.plan?.groups?.map(group => [group.spawnKind, group.count]),
    total:state.plan?.totalCount,
    activity:state.snapshot.aliveCount + state.snapshot.queuedSpawnCount + state.snapshot.telegraphCount,
  });
}

async function exerciseLaterRoom(cdp) {
  return callPage(cdp, async fixedDt => {
    const {getArenaRuntime}=await import('./src/arena-runtime-context.js');
    const {axialToWorld}=await import('./src/hex-maze-navigation.js');
    const runtime=getArenaRuntime();
    const rafDescriptor=Object.getOwnPropertyDescriptor(globalThis,'requestAnimationFrame');
    const cancelRafDescriptor=Object.getOwnPropertyDescriptor(globalThis,'cancelAnimationFrame');
    const performanceObject=globalThis.performance;
    const performancePrototype=Object.getPrototypeOf(performanceObject);
    const performanceDescriptor=Object.getOwnPropertyDescriptor(performanceObject,'now');
    const performancePrototypeDescriptor=Object.getOwnPropertyDescriptor(performancePrototype,'now');
    let patchedRaf=false,patchedCancelRaf=false,patchedPerformanceTarget='';
    let virtualNow=Number(performanceObject.now());
    let callbackId=0;
    const callbacks=new Map();
    const restore=()=>{
      runtime.stop?.();
      if(patchedPerformanceTarget==='own'){
        if(performanceDescriptor)Object.defineProperty(performanceObject,'now',performanceDescriptor);
        else delete performanceObject.now;
      }else if(patchedPerformanceTarget==='prototype'){
        if(performancePrototypeDescriptor)Object.defineProperty(performancePrototype,'now',performancePrototypeDescriptor);
        else delete performancePrototype.now;
      }
      if(patchedCancelRaf){
        if(cancelRafDescriptor)Object.defineProperty(globalThis,'cancelAnimationFrame',cancelRafDescriptor);
        else delete globalThis.cancelAnimationFrame;
      }
      if(patchedRaf){
        if(rafDescriptor)Object.defineProperty(globalThis,'requestAnimationFrame',rafDescriptor);
        else delete globalThis.requestAnimationFrame;
      }
    };
    const installClock=()=>{
      try{
        Object.defineProperty(performanceObject,'now',{configurable:true,value:()=>virtualNow});
        patchedPerformanceTarget='own';
        return;
      }catch{}
      if(performanceDescriptor)throw new Error('Deterministic Arena frame clock unavailable: performance.now is not configurable.');
      try{
        Object.defineProperty(performancePrototype,'now',{configurable:true,value:()=>virtualNow});
        patchedPerformanceTarget='prototype';
      }catch{throw new Error('Deterministic Arena frame clock unavailable: Performance.prototype.now is not configurable.');}
    };
    const installRaf=()=>{
      try{
        Object.defineProperty(globalThis,'requestAnimationFrame',{configurable:true,writable:true,value:callback=>{const id=++callbackId;callbacks.set(id,callback);return id;}});
        patchedRaf=true;
        Object.defineProperty(globalThis,'cancelAnimationFrame',{configurable:true,writable:true,value:id=>callbacks.delete(id)});
        patchedCancelRaf=true;
      }catch{throw new Error('Deterministic Arena frame seam unavailable: requestAnimationFrame cannot be controlled.');}
    };
    const fixedStep=()=>{
      virtualNow+=Number(fixedDt)*1000;
      const pending=[...callbacks.values()];
      callbacks.clear();
      pending.forEach(callback=>callback(virtualNow));
      return pending.length;
    };
    const activeState=()=>{
      const snapshot=runtime.snapshot();
      return {
        snapshot,
        activeRoomId:runtime.activeRoomId,
        encounterRoomId:runtime.encounterState.encounterRoomId,
        plan:runtime.getEncounterPlan?.()||snapshot.encounterPlan||null,
        progress:runtime.encounterState.progress,
        enemies:(runtime.enemySystem.enemies||[]).map(enemy => ({kind:enemy.kind||enemy.spawnKind||null,hp:Number(enemy.hp)})),
        childSystems:['originalSystem','flareSystem','hadesSystem'].map(key => ({key,enemies:(runtime.enemySystem[key]?.enemies||[]).map(enemy => ({kind:enemy.kind,hp:Number(enemy.hp)})),queued:Number(runtime.enemySystem[key]?.queuedSpawnCount||0),telegraph:Number(runtime.enemySystem[key]?.telegraphCount||0)})),
        doors:runtime.mazeWorld.getDoorTargets().map(door => ({edge:door.edge,state:door.state,roomA:door.roomA,roomB:door.roomB})),
      };
    };

    runtime.stop?.();
    if(runtime.arena?.started!==true||runtime.snapshot?.().paused===true)throw new Error('The real run-start handoff did not leave Arena simulation running.');
    const firstRoomId=runtime.activeRoomId;
    let cleared=false;
    let fixedSteps=0;
    let result=null;
    try{
      installClock();
      installRaf();
      runtime.start();
      for(;fixedSteps<160&&!cleared;fixedSteps++){
        for(const enemy of [...runtime.enemySystem.enemies])runtime.enemySystem.damageEnemy(enemy,100000,{x:0,z:0},{power:100});
        fixedStep();
        cleared=runtime.encounterState.isCleared(firstRoomId);
      }
      const breakable=runtime.mazeWorld.getDoorTargets().find(door =>
        door.state==='breakable'&&(door.roomA===firstRoomId||door.roomB===firstRoomId)
      );
      if(!breakable){
        const state=activeState();
        result={ok:false,reason:cleared?'no-breakable-door':'first-room-not-cleared',firstRoomId,firstRoomCleared:cleared,fixedSteps,frameDriver:'actual-runtime-requestAnimationFrame',...state};
      }else{
        const opened=runtime.encounterState.openDoor(breakable.edge,firstRoomId);
        runtime.mazeWorld.setDoorStates({
          sealedRoomIds:runtime.encounterState.sealedRoomIds,
          openedDoorEdges:runtime.encounterState.openedDoorEdges,
          roomCleared:runtime.encounterState.isCleared(firstRoomId),
        },{animateOpenedEdge:breakable.edge});
        const toRoomId=breakable.roomA===firstRoomId?breakable.roomB:breakable.roomA;
        const toKey=breakable.roomA===firstRoomId?breakable.cellB:breakable.cellA;
        const toCell=runtime.dungeon.cells.get(toKey);
        const toCenter=axialToWorld(toCell.q,toCell.r,20);
        const moved=runtime.setArcanaPlayerPosition({x:toCenter.x,z:toCenter.z});
        let transitionStarted=false,transitionCompleted=false,transitionSteps=0;
        // Arena's frame() intentionally caps elapsed time at 50 ms. Give the
        // real transition controller enough actual frames to reach its .98 s
        // duration; this remains the Arena loop rather than an enemy-only
        // lifecycle shortcut.
        for(;transitionSteps<48;transitionSteps++){
          fixedStep();
          transitionStarted=transitionStarted||runtime.roomTransition.active||runtime.activeRoomId!==firstRoomId;
          if(transitionStarted&&runtime.activeRoomId===toRoomId&&!runtime.roomTransition.active){transitionCompleted=true;break;}
        }
        const state=activeState();
        result={ok:true,firstRoomId,firstRoomCleared:cleared,fixedSteps,opened,started:transitionStarted,completed:transitionCompleted,transitionSteps,playerMove:moved,laterRoomId:runtime.activeRoomId,frameDriver:'actual-runtime-requestAnimationFrame',...state};
      }
    }finally{
      restore();
    }
    return {
      ...result,
      progress:result.progress,
      snapshot:{
        encounterMode:result.snapshot?.encounterMode,
        aliveCount:Number(result.snapshot?.aliveCount||0),
        queuedSpawnCount:Number(result.snapshot?.queuedSpawnCount||0),
        telegraphCount:Number(result.snapshot?.telegraphCount||0),
      },
      plan:JSON.parse(JSON.stringify(result.plan||null)),
      living:(result.enemies||[]).map(enemy=>enemy.kind),
    };
  }, FIXED_DT);
}

async function exerciseEmptyRosterFallback(cdp) {
  return callPage(cdp, async () => {
    const {getArenaRuntime}=await import('./src/arena-runtime-context.js');
    const runtime=getArenaRuntime();
    runtime.stop();
    localStorage.setItem('enemyLab.workingRoster.v1', '[]');
    const blocked=runtime.selectEncounterMode('working-roster-hades');
    runtime.reset();
    runtime.stop();
    const snapshot=runtime.snapshot();
    return {
      blocked,
      state:{
        encounterMode:snapshot.encounterMode,
        aliveCount:Number(snapshot.aliveCount||0),
        queuedSpawnCount:Number(snapshot.queuedSpawnCount||0),
        telegraphCount:Number(snapshot.telegraphCount||0),
      },
      plan:JSON.parse(JSON.stringify(runtime.getEncounterPlan?.()||snapshot.encounterPlan||null)),
      roster:localStorage.getItem('enemyLab.workingRoster.v1'),
    };
  });
}

async function exerciseEnemyLabDirectSpawn(cdp) {
  return callPage(cdp, async () => {
    const {getArenaRuntime}=await import('./src/arena-runtime-context.js');
    const runtime=getArenaRuntime();
    runtime.stop();
    const direct=runtime.startLabScenario(-777, {
      label:'Gate 1C direct Lab regression',
      groups:[{spawnKind:'hadesWretchedWitch',count:2}],
    });
    runtime.enemySystem.update(.9, {
      x:Number(runtime.actorPos?.x)||0,
      z:Number(runtime.actorPos?.y)||0,
      targetable:false,
      invulnerable:true,
    });
    const snapshot=runtime.snapshot();
    return {
      direct:JSON.parse(JSON.stringify(direct)),
      mode:snapshot.encounterMode,
      labMode:!!runtime.enemySystem.labMode,
      kinds:runtime.enemySystem.enemies.map(enemy => enemy.kind||enemy.spawnKind||null),
      rosterStatus:JSON.parse(JSON.stringify(runtime.enemySystem.getWorkingRosterEncounterStatus?.()||null)),
    };
  });
}

async function main() {
  let server=null;
  let browser=null;
  let cdp=null;

  try {
    server=await serveRepository();
    const storage=createLockedStandard();
    browser=await launchBrowser(findBrowser(), `${server.baseUrl}/index.html`);
    cdp=browser.cdp;
    await cdp.call('Page.enable');
    await cdp.call('Runtime.enable');
    await cdp.call('Emulation.setDeviceMetricsOverride', {width:1024,height:768,deviceScaleFactor:1,mobile:false});
    await cdp.call('Page.navigate', {url:`${server.baseUrl}/index.html`});
    await waitForDocument(cdp);
    await installStorage(cdp, storage);
    await navigate(cdp, `${server.baseUrl}/combat-arena.html?seed=${TEST_SEED}`, 'arena');

    const signatures=[];
    let firstBoot=null;
    for (let iteration=0; iteration<COLD_BOOT_ITERATIONS; iteration++) {
      if (iteration>0) await reload(cdp, 'arena');
      const runStart=await completeRunStart(cdp);
      const state=await runtimeState(cdp);
      state.runStart=runStart;
      try {
        assertColdBootState(state);
      } catch (error) {
        error.message=`cold boot iteration ${iteration+1}/${COLD_BOOT_ITERATIONS}: ${error.message}`;
        throw error;
      }
      if (!firstBoot) firstBoot=state;
      signatures.push(signature(state));
    }
    assert.equal(new Set(signatures).size, 1, 'fixed-seed cold boots must produce the same first-room plan and activity accounting');

    const failures=[];
    let later=null;
    try {
      later=await exerciseLaterRoom(cdp);
      assert.equal(later.ok, true, later.reason ? `${later.reason}: ${JSON.stringify(later)}` : 'later-room exercise failed');
      assert.equal(later.firstRoomCleared, true);
      assert.equal(later.opened, true);
      assert.equal(later.started, true);
      assert.equal(later.completed, true);
      assert.notEqual(later.laterRoomId, later.firstRoomId);
      assert.equal(later.progress.cleared, 1);
      assert.equal(later.snapshot.encounterMode, WORKING_ROSTER_HADES_ID);
      assert.ok(later.plan?.totalCount > 0, 'the later uncleared room must receive a new plan');
      assert.ok(later.plan.groups.every(group => LOCKED_ROSTER.includes(group.spawnKind)));
      assert.ok(later.living.every(kind => LOCKED_ROSTER.includes(kind)));
      assert.ok(later.snapshot.aliveCount + later.snapshot.queuedSpawnCount + later.snapshot.telegraphCount > 0);
    } catch (error) {
      failures.push(`later-room: ${error.message}`);
    }

    let fallback=null;
    try {
      fallback=await exerciseEmptyRosterFallback(cdp);
      assert.equal(fallback.blocked.ok, false);
      assert.equal(fallback.blocked.reason, 'roster-empty');
      assert.equal(fallback.blocked.mode, 'all-enemies-budget');
      assert.equal(fallback.state.encounterMode, 'all-enemies-budget');
      assert.ok(fallback.plan?.totalCount > 0, 'empty-roster fallback must start a playable All · Budgeted encounter');
      assert.ok(fallback.state.aliveCount + fallback.state.queuedSpawnCount + fallback.state.telegraphCount > 0);
      assert.equal(fallback.roster, '[]');
    } catch (error) {
      failures.push(`empty-roster fallback: ${error.message}`);
    }

    let direct=null;
    try {
      await navigate(cdp, `${server.baseUrl}/enemy-lab.html`, 'enemy-lab');
      direct=await exerciseEnemyLabDirectSpawn(cdp);
      assert.equal(direct.direct.ok, true);
      assert.equal(direct.direct.plan.mode, 'enemy-lab');
      assert.equal(direct.labMode, true);
      assert.deepEqual(direct.kinds, ['hadesWretchedWitch', 'hadesWretchedWitch']);
      assert.equal(direct.rosterStatus.active, false);
    } catch (error) {
      failures.push(`Enemy Lab direct spawn: ${error.message}`);
    }

    console.log(JSON.stringify({
      coldBootIterations:COLD_BOOT_ITERATIONS,
      deterministicSignatures:new Set(signatures).size,
      firstPlan:firstBoot.plan,
      firstActivity:firstBoot.snapshot,
      laterRoom:later,
      emptyRosterFallback:fallback,
      enemyLabDirect:direct,
      failures,
      scope:'Gate 1C deterministic cold-boot, room-transition, fallback, and direct-Lab regression',
    }, null, 2));
    if (failures.length) throw new Error(failures.join('\n'));
  } finally {
    try { cdp?.close(); } catch {}
    try { await browser?.close(); } catch {}
    try { await server?.close(); } catch {}
  }
}

main().catch(error => {
  console.error(`Gate 1C cold-boot integration failed: ${error.stack || error.message}`);
  process.exitCode=1;
});
