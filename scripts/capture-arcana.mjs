import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const scriptPath=fileURLToPath(import.meta.url);
const scriptDir=path.dirname(scriptPath);
const root=path.resolve(scriptDir,'..');
const manifestPath=path.join(scriptDir,'arcana-capture-manifest.json');
const MIME_TYPES=new Map([
  ['.css','text/css; charset=utf-8'],['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],
  ['.json','application/json; charset=utf-8'],['.mjs','text/javascript; charset=utf-8'],['.mp4','video/mp4'],
  ['.png','image/png'],['.svg','image/svg+xml'],['.webp','image/webp'],
]);

export function parseArgs(argv){
  const result={};
  for(let index=0;index<argv.length;index+=1){
    const token=argv[index];
    if(token==='--help'||token==='-h'){result.help=true;continue;}
    if(!token.startsWith('--'))throw new Error(`Unexpected argument: ${token}`);
    const equals=token.indexOf('=');
    const key=token.slice(2,equals<0?undefined:equals);
    const value=equals<0?argv[++index]:token.slice(equals+1);
    if(!value||value.startsWith('--'))throw new Error(`Missing value for --${key}`);
    result[key]=value;
  }
  return result;
}

export function expandCaptureStages(value='contract'){
  return String(value||'contract').split(',').map(stage=>stage.trim().toLowerCase()).filter(Boolean).flatMap(stage=>stage==='all'?['contract','source','style']:[stage]).filter((stage,index,stages)=>stages.indexOf(stage)===index);
}

function usage(){
  return [
    'Capture a deterministic arcana review against its source-video timeline.',
    '',
    'Usage:',
    '  npm run capture:arcana -- --id DRAGON-ARC --stage motion',
    '  npm run capture:arcana -- --id DRAGON-ARC --stage style',
    '  npm run capture:arcana -- --id WATER-PRISON --scenario stacked --stage contract',
    '  npm run capture:arcana -- --batch session-five --stage all',
    '',
    'Optional:',
    '  --scenario <id>  Select a manifest scenario (defaults to the ability default)',
    '  --batch <id>     Run a manifest batch sequentially; session-five includes every acceptance scenario',
    '  --stage all      Expand to contract, source, and style in that order (motion remains Dragon-only)',
    '  --output <dir>   Override the ignored artifact directory (single capture only)',
    '  --browser <exe>  Chrome or Edge executable (also ARCANA_CAPTURE_BROWSER)',
    '  --ffmpeg <exe>   FFmpeg executable (also FFMPEG_PATH)',
    '  --ffprobe <exe>  FFprobe executable (also FFPROBE_PATH; defaults beside FFmpeg)',
  ].join('\n');
}

function readManifest(){
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  if(manifest.schemaVersion!==2)throw new Error(`Unsupported capture manifest schema: ${manifest.schemaVersion}`);
  validateCaptureManifest(manifest);
  return manifest;
}

function mergeObjects(base={},override={}){
  const result={...(base||{})};
  for(const [key,value] of Object.entries(override||{})){
    if(value&&typeof value==='object'&&!Array.isArray(value)&&result[key]&&typeof result[key]==='object'&&!Array.isArray(result[key]))result[key]=mergeObjects(result[key],value);
    else result[key]=value;
  }
  return result;
}

export function resolveCaptureJob(manifest,{id,scenario:requestedScenario,stage:requestedStage}={}){
  const abilityId=String(id||'').trim().toUpperCase(),ability=manifest?.abilities?.[abilityId];
  if(!ability)throw new Error(`Unknown arcana ID ${abilityId||'(missing)'}. Available: ${Object.keys(manifest?.abilities||{}).join(', ')}`);
  const scenarioName=String(requestedScenario||ability.defaultScenario||'source-base'),scenario=ability.scenarios?.[scenarioName];
  if(!scenario)throw new Error(`Unknown ${abilityId} scenario ${scenarioName}. Available: ${Object.keys(ability.scenarios||{}).join(', ')}`);
  const stageName=String(requestedStage||'contract'),scenarioStage=scenario.stages?.[stageName];
  if(!scenarioStage)throw new Error(`Unknown ${abilityId}/${scenarioName} stage ${stageName}. Available: ${Object.keys(scenario.stages||{}).join(', ')}`);
  const defaultStage=manifest.defaults?.stages?.[stageName]||(abilityId==='DRAGON-ARC'&&stageName==='motion'?manifest.defaults?.stages?.contract:null);
  if(!defaultStage)throw new Error(`Capture stage ${stageName} has no manifest defaults.`);
  const fixedDt=Number(scenario.fixedDt??ability.fixedDt??manifest.defaults?.fixedDt),durationFrames=Math.trunc(Number(scenario.durationFrames));
  const checkpointFrames=(scenario.checkpointFrames||[]).map(value=>Math.trunc(Number(value)));
  const stage=mergeObjects(defaultStage,scenarioStage);if(abilityId==='DRAGON-ARC'&&stageName==='motion')stage.stage='motion';
  const reset=mergeObjects(mergeObjects(mergeObjects(manifest.defaults?.reset,ability.reset),scenario.reset),stage.reset);
  reset.stage=stage.stage||stageName;reset.effects=stage.effects;reset.renderMode=stage.renderMode;
  const query={...(manifest.defaults?.query||{}),...(ability.query||{}),...(scenario.query||{}),...(stage.query||{}),stage:reset.stage,effects:stage.effects?'1':'0',renderMode:stage.renderMode};
  return{
    abilityId,ability,scenarioName,scenario,stageName,
    route:ability.route||manifest.defaults?.route||'enemy-lab.html',query,runtimeId:ability.runtimeId||'',telemetryAdapter:scenario.telemetryAdapter||ability.telemetryAdapter||'generic',
    stage:{...stage,fixedDt,durationFrames,checkpointFrames,checkpoints:checkpointFrames.map(frame=>frame*fixedDt),sourceClip:{...(scenario.sourceClip||{})},reset,actions:[...(scenario.actions||[])].sort((left,right)=>left.frame-right.frame),acceptance:scenario.acceptance||{mode:'advisory',checks:[]}},
  };
}

export function validateCaptureManifest(manifest){
  if(manifest?.schemaVersion!==2)throw new Error('Arcana capture manifest must use schemaVersion 2.');
  const errors=[],fixedDt=Number(manifest.defaults?.fixedDt);
  if(!(fixedDt>0))errors.push('defaults.fixedDt must be positive');
  const supportedActions=new Set(['cast','press','hold','release','setaim','settargethp','deckplay','setresource']);
  for(const [abilityId,ability] of Object.entries(manifest.abilities||{})){
    for(const [scenarioName,scenario] of Object.entries(ability.scenarios||{})){
      const duration=Math.trunc(Number(scenario.durationFrames)),checkpoints=scenario.checkpointFrames||[],actions=scenario.actions||[],clip=scenario.sourceClip||{};
      if(!(duration>0))errors.push(`${abilityId}/${scenarioName} durationFrames must be positive`);
      if(!checkpoints.length||checkpoints.some((frame,index)=>!Number.isInteger(frame)||frame<=0||frame>duration||(index&&frame<=checkpoints[index-1])))errors.push(`${abilityId}/${scenarioName} checkpointFrames must be positive, increasing integer frames within duration`);
      if(actions.some((action,index)=>!Number.isInteger(action.frame)||action.frame<0||action.frame>duration||(index&&action.frame<actions[index-1].frame)))errors.push(`${abilityId}/${scenarioName} actions must be frame ordered and within duration`);
      for(const action of actions){const op=String(action.op||action.type||'').toLowerCase();if(!supportedActions.has(op))errors.push(`${abilityId}/${scenarioName} uses unsupported action ${op||'(missing)'}`);}
      if(!(Number(clip.start)<=Number(clip.timelineStart)&&Number(clip.timelineStart)<=Number(clip.timelineEnd??clip.end)&&Number(clip.timelineEnd??clip.end)<=Number(clip.end)))errors.push(`${abilityId}/${scenarioName} source timeline must stay inside its bounded clip`);
      if(clip.compare!==false&&Number(clip.timelineStart)+duration*fixedDt>Number(clip.timelineEnd??clip.end)+1e-6)errors.push(`${abilityId}/${scenarioName} synchronized duration exceeds timelineEnd`);
      const stageNames=Object.keys(scenario.stages||{}),requiredStages=['contract','source','style'];
      for(const stageName of requiredStages)if(!stageNames.includes(stageName))errors.push(`${abilityId}/${scenarioName} is missing ${stageName} stage`);
      for(const stageName of stageNames)if(stageName==='motion'&&abilityId!=='DRAGON-ARC')errors.push(`${abilityId}/${scenarioName} may not declare the Dragon-only motion alias`);
      const fixtures=mergeObjects(manifest.defaults?.reset?.fixtures||{},scenario.reset?.fixtures||{});
      for(const target of fixtures.targets||[])if(!Number.isInteger(target.spawnFrame??0)||(target.spawnFrame??0)<0||(target.spawnFrame??0)>duration)errors.push(`${abilityId}/${scenarioName} target ${target.id||'(unnamed)'} has invalid spawnFrame`);
      for(const projectile of fixtures.hostileProjectiles||[])if(!Number.isInteger(projectile.spawnFrame??0)||(projectile.spawnFrame??0)<0||(projectile.spawnFrame??0)>duration)errors.push(`${abilityId}/${scenarioName} hostile projectile ${projectile.id||'(unnamed)'} has invalid spawnFrame`);
      for(const resource of fixtures.resources||[])if(!resource.runtimeId||!/^[A-Za-z_$][\w$]*$/.test(String(resource.key||''))||!['number','string','boolean'].includes(typeof resource.value))errors.push(`${abilityId}/${scenarioName} has an invalid resource fixture`);
      if(fixtures.deck&&(!fixtures.deck.primaryArcanaId||!fixtures.deck.oppositeArcanaId))errors.push(`${abilityId}/${scenarioName} deck fixture requires primaryArcanaId and oppositeArcanaId`);
    }
  }
  for(const [batchName,jobs] of Object.entries(manifest.batches||{})){
    const seen=new Set();for(const job of jobs||[]){const key=`${job.abilityId}/${job.scenario}`;
      if(!manifest.abilities?.[job.abilityId]?.scenarios?.[job.scenario])errors.push(`${batchName} references unknown ${key}`);
      if(seen.has(key))errors.push(`${batchName} repeats ${key}`);seen.add(key);
    }
    if(batchName==='session-five')for(const [abilityId,ability] of Object.entries(manifest.abilities||{}))if(abilityId!=='DRAGON-ARC')for(const scenarioName of Object.keys(ability.scenarios||{}))if(!seen.has(`${abilityId}/${scenarioName}`))errors.push(`${batchName} omits ${abilityId}/${scenarioName}`);
  }
  if(errors.length)throw new Error(`Invalid capture manifest:\n- ${errors.join('\n- ')}`);
  return true;
}

function executableWorks(command,args){
  if(!command)return false;
  if((command.includes(path.sep)||command.includes('/'))&&!fs.existsSync(command))return false;
  const result=spawnSync(command,args,{stdio:'ignore',windowsHide:true});
  return !result.error&&result.status===0;
}

function findFileWithin(directory,fileName,maxDepth=4){
  if(maxDepth<0||!directory||!fs.existsSync(directory))return'';
  let entries=[];
  try{entries=fs.readdirSync(directory,{withFileTypes:true});}catch{return'';}
  const direct=entries.find(entry=>entry.isFile()&&entry.name.toLowerCase()===fileName.toLowerCase());
  if(direct)return path.join(directory,direct.name);
  for(const entry of entries){
    if(!entry.isDirectory())continue;
    const found=findFileWithin(path.join(directory,entry.name),fileName,maxDepth-1);
    if(found)return found;
  }
  return'';
}

function temporaryCodexFfmpeg(){
  let candidates=[];
  try{
    candidates=fs.readdirSync(os.tmpdir(),{withFileTypes:true})
      .filter(entry=>entry.isDirectory()&&entry.name.startsWith('codex-ffmpeg-'))
      .map(entry=>path.join(os.tmpdir(),entry.name));
  }catch{return'';}
  for(const directory of candidates){
    const found=findFileWithin(directory,process.platform==='win32'?'ffmpeg.exe':'ffmpeg',4);
    if(found)return found;
  }
  return'';
}

export function resolveFfmpeg(explicit=''){
  const candidates=[explicit,process.env.FFMPEG_PATH,'ffmpeg'];
  if(process.platform==='win32')candidates.push(temporaryCodexFfmpeg());
  const found=candidates.find(candidate=>executableWorks(candidate,['-version']));
  if(found)return found;
  throw new Error([
    'FFmpeg was not found, so source frames and comparison media cannot be generated.',
    'Install FFmpeg and add it to PATH, or set FFMPEG_PATH to the ffmpeg executable.',
    'You may also pass --ffmpeg "C:\\path\\to\\ffmpeg.exe".',
  ].join('\n'));
}

export function resolveFfprobe(ffmpeg,explicit=''){
  const extension=path.extname(ffmpeg||'');
  const sibling=ffmpeg?path.join(path.dirname(ffmpeg),`ffprobe${extension}`):'';
  const candidates=[explicit,process.env.FFPROBE_PATH,sibling,'ffprobe'];
  const found=candidates.find(candidate=>executableWorks(candidate,['-version']));
  if(found)return found;
  throw new Error([
    'FFprobe was not found, so the generated comparison video cannot be validated.',
    'Install the FFprobe companion included with FFmpeg, add it to PATH, or set FFPROBE_PATH.',
    'You may also pass --ffprobe "C:\\path\\to\\ffprobe.exe".',
  ].join('\n'));
}

export function resolveBrowser(explicit=''){
  const win=process.platform==='win32';
  const candidates=[explicit,process.env.ARCANA_CAPTURE_BROWSER];
  if(win){
    const local=process.env.LOCALAPPDATA;
    const program=process.env.ProgramFiles;
    const programX86=process.env['ProgramFiles(x86)'];
    candidates.push(
      program&&path.join(program,'Google','Chrome','Application','chrome.exe'),
      programX86&&path.join(programX86,'Google','Chrome','Application','chrome.exe'),
      local&&path.join(local,'Google','Chrome','Application','chrome.exe'),
      program&&path.join(program,'Microsoft','Edge','Application','msedge.exe'),
      programX86&&path.join(programX86,'Microsoft','Edge','Application','msedge.exe'),
    );
  }else if(process.platform==='darwin'){
    candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');
  }else{
    candidates.push('google-chrome','google-chrome-stable','chromium','chromium-browser','microsoft-edge');
  }
  const found=candidates.find(candidate=>candidate&&(
    ((candidate.includes(path.sep)||candidate.includes('/'))&&fs.existsSync(candidate))
    ||executableWorks(candidate,['--version'])
  ));
  if(found)return found;
  throw new Error([
    'A Chrome/Edge browser was not found, so the deterministic game capture cannot run.',
    'Install Chrome or Edge, set ARCANA_CAPTURE_BROWSER, or pass --browser <executable>.',
  ].join('\n'));
}

function serveRepository(){
  const server=http.createServer((request,response)=>{
    try{
      const requestUrl=new URL(request.url??'/',`http://${request.headers.host??'127.0.0.1'}`);
      const relative=decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '')||'index.html';
      const target=path.resolve(root,relative);
      if(target!==root&&!target.startsWith(`${root}${path.sep}`)){
        response.writeHead(403).end('Forbidden');return;
      }
      const stat=fs.statSync(target);
      const file=stat.isDirectory()?path.join(target,'index.html'):target;
      response.writeHead(200,{
        'Content-Type':MIME_TYPES.get(path.extname(file).toLowerCase())??'application/octet-stream',
        'Cache-Control':'no-store',
      });
      fs.createReadStream(file).pipe(response);
    }catch(error){
      response.writeHead(error?.code==='ENOENT'?404:500).end(error?.code==='ENOENT'?'Not found':'Server error');
    }
  });
  return new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(0,'127.0.0.1',()=>resolve({
      server,
      baseUrl:`http://127.0.0.1:${server.address().port}`,
      close:()=>new Promise(done=>server.close(done)),
    }));
  });
}

function delay(milliseconds){return new Promise(resolve=>setTimeout(resolve,milliseconds));}

async function waitForDevtools(userDataDir,processHandle,stderr){
  const portFile=path.join(userDataDir,'DevToolsActivePort');
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){
    if(processHandle.exitCode!==null)throw new Error(`Browser exited before capture startup.\n${stderr()}`);
    if(fs.existsSync(portFile)){
      try{
        const [port]=fs.readFileSync(portFile,'utf8').trim().split(/\r?\n/);
        if(Number(port)>0)return Number(port);
      }catch(error){
        if(!['EBUSY','EACCES','EPERM','ENOENT'].includes(error?.code))throw error;
      }
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for the browser debugging endpoint.\n${stderr()}`);
}

async function launchBrowser(browser,viewport,url){
  const userDataDir=fs.mkdtempSync(path.join(os.tmpdir(),'arcana-capture-chrome-'));
  const stderrChunks=[];
  const child=spawn(browser,[
    '--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking',
    '--disable-component-update','--disable-renderer-backgrounding','--enable-unsafe-swiftshader',
    '--remote-debugging-port=0','--remote-allow-origins=*',`--user-data-dir=${userDataDir}`,
    `--window-size=${viewport.width},${viewport.height}`,'about:blank',
  ],{stdio:['ignore','ignore','pipe'],windowsHide:true});
  child.stderr.on('data',chunk=>{if(stderrChunks.length<60)stderrChunks.push(String(chunk));});
  const stderr=()=>stderrChunks.join('').slice(-8000);
  try{
    const port=await waitForDevtools(userDataDir,child,stderr);
    const response=await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`,{method:'PUT'});
    if(!response.ok)throw new Error(`Browser refused to create a capture tab (${response.status}).`);
    const target=await response.json();
    if(!target.webSocketDebuggerUrl)throw new Error('Browser did not expose a page debugging socket.');
    return{
      child,userDataDir,target,
      close:async()=>{
        try{await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`);}catch{}
        if(child.exitCode===null)child.kill();
        await delay(100);
        try{fs.rmSync(userDataDir,{recursive:true,force:true});}catch{}
      },
    };
  }catch(error){
    if(child.exitCode===null)child.kill();
    try{fs.rmSync(userDataDir,{recursive:true,force:true});}catch{}
    throw error;
  }
}

class CdpClient{
  constructor(url){
    if(typeof WebSocket!=='function')throw new Error('This capture runner requires Node.js 22 or newer (global WebSocket support).');
    this.nextId=1;this.pending=new Map();
    this.socket=new WebSocket(url);
    this.opened=new Promise((resolve,reject)=>{
      this.socket.addEventListener('open',resolve,{once:true});
      this.socket.addEventListener('error',()=>reject(new Error('Could not connect to the browser debugging socket.')),{once:true});
    });
    this.socket.addEventListener('message',event=>{
      const message=JSON.parse(event.data);
      if(!message.id)return;
      const request=this.pending.get(message.id);
      if(!request)return;
      this.pending.delete(message.id);
      if(message.error)request.reject(new Error(`${request.method}: ${message.error.message}`));
      else request.resolve(message.result);
    });
    this.socket.addEventListener('close',()=>{
      for(const request of this.pending.values())request.reject(new Error('Browser debugging socket closed unexpectedly.'));
      this.pending.clear();
    });
  }
  async call(method,params={}){
    await this.opened;
    const id=this.nextId++;
    const promise=new Promise((resolve,reject)=>this.pending.set(id,{resolve,reject,method}));
    this.socket.send(JSON.stringify({id,method,params}));
    return promise;
  }
  close(){this.socket.close();}
}

async function evaluate(cdp,expression){
  const result=await cdp.call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});
  if(result.exceptionDetails){
    const description=result.exceptionDetails.exception?.description??result.exceptionDetails.text;
    throw new Error(`Browser evaluation failed:\n${description}`);
  }
  return result.result.value;
}

const CAPTURE_API=`window.__abilityCapture || document.querySelector('iframe')?.contentWindow?.__abilityCapture`;

async function waitForCaptureApi(cdp){
  const deadline=Date.now()+30000;
  while(Date.now()<deadline){
    try{
      const ready=await evaluate(cdp,`(async()=>{
        const api=${CAPTURE_API};
        if(!api)return false;
        return Boolean(typeof api.ready==='function'?await api.ready():api.ready);
      })()`);
      if(ready)return;
    }catch{}
    await delay(200);
  }
  throw new Error([
    'Timed out waiting for window.__abilityCapture.',
    'Open the deep link manually and check the browser console for Enemy Lab startup errors.',
  ].join('\n'));
}

function checkpointName(time){return `checkpoint-${time.toFixed(2).replace('.','-')}.png`;}
function timelineFrameName(index){return `frame-${String(index).padStart(4,'0')}.png`;}
function stable(value){
  if(Array.isArray(value))return value.map(stable);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));
  return value;
}
function stableJson(value){return JSON.stringify(stable(value));}
function sha256(buffer){return crypto.createHash('sha256').update(buffer).digest('hex');}

export function captureRevision(){
  const head=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}),status=spawnSync('git',['status','--porcelain','--untracked-files=no'],{cwd:root,encoding:'utf8',windowsHide:true});
  const fileHash=file=>fs.existsSync(file)?sha256(fs.readFileSync(file)):null;
  function readHeadFallback(){
    try{
      const dotGit=path.join(root,'.git'),pointer=fs.statSync(dotGit).isDirectory()?dotGit:path.resolve(root,String(fs.readFileSync(dotGit,'utf8')).trim().replace(/^gitdir:\s*/i,'')),headText=String(fs.readFileSync(path.join(pointer,'HEAD'),'utf8')).trim();
      if(!headText.startsWith('ref:'))return/^[0-9a-f]{40,64}$/i.test(headText)?headText:null;
      const ref=headText.slice(4).trim(),commonFile=path.join(pointer,'commondir'),common=fs.existsSync(commonFile)?path.resolve(pointer,String(fs.readFileSync(commonFile,'utf8')).trim()):pointer;
      for(const directory of[pointer,common]){const refFile=path.join(directory,ref);if(fs.existsSync(refFile))return String(fs.readFileSync(refFile,'utf8')).trim();}
      const packed=path.join(common,'packed-refs');if(fs.existsSync(packed)){const match=String(fs.readFileSync(packed,'utf8')).split(/\r?\n/).find(line=>line.endsWith(` ${ref}`));if(match)return match.split(' ')[0];}
    }catch{}
    return null;
  }
  return{commit:head.status===0?String(head.stdout||'').trim()||null:readHeadFallback(),dirty:status.status===0?Boolean(String(status.stdout||'').trim()):null,manifestSha256:fileHash(manifestPath),runnerSha256:fileHash(scriptPath)};
}

function actionsAtFrame(stage,frame){return(stage.actions||[]).filter(action=>action.frame===frame);}

async function resetScenario(cdp,{stage}){
  const input=JSON.stringify({reset:stage.reset,actions:actionsAtFrame(stage,0)});
  return evaluate(cdp,`(async()=>{
    const api=${CAPTURE_API};const input=${input};
    await api.reset(input.reset);if(api.setPaused)await api.setPaused(true);
    for(const action of input.actions){const act=api.act||api.perform;if(act)await act.call(api,action);else if(action.op==='cast')await api.cast(action.arcanaId);}
    return await api.snapshot();
  })()`);
}

async function stepScenarioFrame(cdp,{stage,frame}){
  const input=JSON.stringify({dt:stage.fixedDt,actions:actionsAtFrame(stage,frame)});
  return evaluate(cdp,`(async()=>{
    const api=${CAPTURE_API};const input=${input};await api.step(1,input.dt);
    for(const action of input.actions){const act=api.act||api.perform;if(act)await act.call(api,action);else if(action.op==='cast')await api.cast(action.arcanaId);}
    return await api.snapshot();
  })()`);
}

async function captureRun(cdp,{stage,runDirectory}){
  fs.mkdirSync(runDirectory,{recursive:true});
  const results=[],trace=[],checkpointSet=new Set(stage.checkpointFrames);
  let snapshot=await resetScenario(cdp,{stage});trace.push({frame:0,time:0,snapshot,hash:sha256(Buffer.from(stableJson(snapshot)))});
  for(let frame=1;frame<=stage.durationFrames;frame++){
    snapshot=await stepScenarioFrame(cdp,{stage,frame});trace.push({frame,time:frame*stage.fixedDt,snapshot,hash:sha256(Buffer.from(stableJson(snapshot)))});
    if(!checkpointSet.has(frame))continue;
    await evaluate(cdp,'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    const shot=await cdp.call('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false}),image=Buffer.from(shot.data,'base64'),checkpoint=frame*stage.fixedDt;
    const imagePath=path.join(runDirectory,checkpointName(checkpoint));fs.writeFileSync(imagePath,image);
    results.push({checkpoint,frames:frame,snapshot,imagePath,imageSha256:sha256(image)});
  }
  return{frames:results,trace,traceHashes:trace.map(entry=>entry.hash)};
}

function writeSemanticTrace(run,file,{abilityId,scenario,stage,fixedDt,revision}={}){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const artifact={schemaVersion:1,abilityId,scenario,stage,fixedDt,revision,frameCount:run.trace.length,frames:run.trace.map(entry=>({frame:entry.frame,time:entry.time,sha256:entry.hash,snapshot:entry.snapshot}))};
  fs.writeFileSync(file,`${JSON.stringify(artifact)}\n`);return file;
}

async function captureTimeline(cdp,{stage,timelineDirectory}){
  fs.mkdirSync(timelineDirectory,{recursive:true});
  for(const entry of fs.readdirSync(timelineDirectory)){
    if(/^frame-\d{4}\.png$/i.test(entry))fs.unlinkSync(path.join(timelineDirectory,entry));
  }
  const duration=stage.durationFrames*stage.fixedDt,frameCount=stage.durationFrames;
  await resetScenario(cdp,{stage});
  for(let index=0;index<frameCount;index++){
    if(index>0)await stepScenarioFrame(cdp,{stage,frame:index});
    const shot=await cdp.call('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
    fs.writeFileSync(path.join(timelineDirectory,timelineFrameName(index)),Buffer.from(shot.data,'base64'));
  }
  return{directory:timelineDirectory,frameCount,duration};
}

function runProcess(executable,args,label){
  return new Promise((resolve,reject)=>{
    const child=spawn(executable,args,{stdio:['ignore','ignore','pipe'],windowsHide:true});
    const stderr=[];
    child.stderr.on('data',chunk=>{if(stderr.length<100)stderr.push(String(chunk));});
    child.once('error',error=>reject(new Error(`${label} could not start: ${error.message}`)));
    child.once('exit',code=>code===0?resolve():reject(new Error(`${label} failed with exit code ${code}.\n${stderr.join('').slice(-12000)}`)));
  });
}

function runProcessOutput(executable,args,label){
  return new Promise((resolve,reject)=>{
    const child=spawn(executable,args,{stdio:['ignore','pipe','pipe'],windowsHide:true});
    const stdout=[];const stderr=[];
    child.stdout.on('data',chunk=>stdout.push(String(chunk)));
    child.stderr.on('data',chunk=>{if(stderr.length<100)stderr.push(String(chunk));});
    child.once('error',error=>reject(new Error(`${label} could not start: ${error.message}`)));
    child.once('exit',code=>code===0?resolve(stdout.join('')):reject(new Error(`${label} failed with exit code ${code}.\n${stderr.join('').slice(-12000)}`)));
  });
}

async function extractSourceFrames(ffmpeg,videoPath,stage,sourceDirectory,viewport){
  fs.mkdirSync(sourceDirectory,{recursive:true});
  const frames=[];
  for(const checkpoint of stage.checkpoints){
    const sourceTime=stage.sourceClip.timelineStart+checkpoint;
    const output=path.join(sourceDirectory,checkpointName(checkpoint));
    await runProcess(ffmpeg,[
      '-hide_banner','-loglevel','error','-y','-ss',String(sourceTime),'-i',videoPath,'-frames:v','1',
      '-vf',`scale=${viewport.width}:${viewport.height}:force_original_aspect_ratio=decrease,pad=${viewport.width}:${viewport.height}:(ow-iw)/2:(oh-ih)/2`,output,
    ],`Source-frame extraction at ${sourceTime.toFixed(2)}s`);
    frames.push({checkpoint,sourceTime,imagePath:output});
  }
  return frames;
}

function scalePad(input,label){return `[${input}:v]scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2,setsar=1[${label}]`;}

async function buildContactSheet(ffmpeg,sourceFrames,gameRun,output){
  const args=['-hide_banner','-loglevel','error','-y'];
  const filters=[];const rows=[];
  for(let index=0;index<sourceFrames.length;index+=1){
    args.push('-i',sourceFrames[index].imagePath,'-i',gameRun[index].imagePath);
    const sourceLabel=`source${index}`;const gameLabel=`game${index}`;const rowLabel=`row${index}`;
    filters.push(scalePad(index*2,sourceLabel),scalePad(index*2+1,gameLabel),`[${sourceLabel}][${gameLabel}]hstack=inputs=2[${rowLabel}]`);
    rows.push(`[${rowLabel}]`);
  }
  filters.push(`${rows.join('')}vstack=inputs=${rows.length}[sheet]`);
  args.push('-filter_complex',filters.join(';'),'-map','[sheet]','-frames:v','1',output);
  await runProcess(ffmpeg,args,'Contact-sheet generation');
}

function concatPath(file){return path.resolve(file).replace(/\\/g,'/').replace(/'/g,"'\\''");}

async function buildComparisonVideo(ffmpeg,sourceVideo,stage,timeline,outputDirectory){
  const output=path.join(outputDirectory,'comparison.mp4');
  const duration=timeline.duration,outputFrames=Math.round(duration/stage.fixedDt),framePattern=path.join(timeline.directory,'frame-%04d.png');
  const filters=[
    '[0:v]scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2,fps=60,setsar=1,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=0.1[source]',
    '[1:v]scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2,fps=60,setsar=1,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=0.1[game]',
    `[source][game]hstack=inputs=2,tpad=stop_mode=clone:stop_duration=0.2,trim=duration=${duration},setpts=PTS-STARTPTS,fps=60[comparison]`,
  ].join(';');
  await runProcess(ffmpeg,[
    '-hide_banner','-loglevel','error','-y','-ss',String(stage.sourceClip.timelineStart),'-t',String(duration),'-i',sourceVideo,
    '-framerate',String(Math.round(1/stage.fixedDt)),'-start_number','0','-i',framePattern,
    '-filter_complex',filters,'-map','[comparison]','-an','-frames:v',String(outputFrames),'-r','60',
    '-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',output,
  ],'Synchronized comparison-video generation');
  return output;
}

function rational(value){
  if(typeof value==='number')return value;
  const text=String(value??'');
  if(!text.includes('/'))return Number(text);
  const [numerator,denominator]=text.split('/').map(Number);
  return denominator?numerator/denominator:NaN;
}

function firstFinite(...values){
  for(const value of values){const number=Number(value);if(Number.isFinite(number))return number;}
  return NaN;
}

export function validateComparisonProbe(probe,{fps,frameCount,duration,width=1280,height=360}){
  const stream=probe?.streams?.[0]??{};
  const actual={
    codec:String(stream.codec_name??''),pixelFormat:String(stream.pix_fmt??''),
    width:Number(stream.width),height:Number(stream.height),
    averageFps:rational(stream.avg_frame_rate),nominalFps:rational(stream.r_frame_rate),
    frameCount:firstFinite(stream.nb_read_frames,stream.nb_frames),
    duration:firstFinite(stream.duration,probe?.format?.duration),
  };
  const expected={codec:'h264',pixelFormat:'yuv420p',width,height,fps,frameCount,duration};
  const exact=(expectedValue,actualValue)=>({expected:expectedValue,actual:actualValue,passed:actualValue===expectedValue});
  const close=(expectedValue,actualValue,tolerance)=>({expected:expectedValue,actual:actualValue,tolerance,passed:Number.isFinite(actualValue)&&Math.abs(actualValue-expectedValue)<=tolerance});
  const checks={
    codec:exact(expected.codec,actual.codec),pixelFormat:exact(expected.pixelFormat,actual.pixelFormat),
    width:exact(expected.width,actual.width),height:exact(expected.height,actual.height),
    averageFps:close(expected.fps,actual.averageFps,1e-6),nominalFps:close(expected.fps,actual.nominalFps,1e-6),
    frameCount:exact(expected.frameCount,actual.frameCount),duration:close(expected.duration,actual.duration,1e-3),
  };
  return{passed:Object.values(checks).every(check=>check.passed),expected,actual,checks,probe};
}

async function probeComparisonVideo(ffprobe,videoPath,stage,timeline){
  const text=await runProcessOutput(ffprobe,[
    '-v','error','-count_frames','-select_streams','v:0',
    '-show_entries','stream=codec_name,pix_fmt,width,height,r_frame_rate,avg_frame_rate,duration,nb_frames,nb_read_frames:format=format_name,duration',
    '-of','json',videoPath,
  ],'Comparison-video FFprobe validation');
  let probe;
  try{probe=JSON.parse(text);}catch(error){throw new Error(`FFprobe returned invalid JSON for ${videoPath}: ${error.message}`);}
  return validateComparisonProbe(probe,{
    fps:Math.round(1/stage.fixedDt),frameCount:Math.round(timeline.duration/stage.fixedDt),
    duration:timeline.duration,width:1280,height:360,
  });
}

function pointFrom(projectile){return projectile.position??projectile.head??projectile.world??projectile;}
function tangentFrom(projectile){return projectile.tangent??projectile.direction??null;}

function dragonObservedMetrics(run){
  const projectiles=run.flatMap(frame=>Array.isArray(frame.snapshot?.projectiles)?frame.snapshot.projectiles:[]);
  const points=projectiles.map(pointFrom).filter(point=>Number.isFinite(point?.x)&&Number.isFinite(point?.z));
  const footprint=run.map(frame=>frame.snapshot?.playerFootprint).find(Number.isFinite)??null;
  const lateral=points.map(point=>point.z);
  const yaws=projectiles.map(tangentFrom).filter(Boolean).map(tangent=>Math.abs(Math.atan2(Number(tangent.z)||0,Number(tangent.x)||0)*180/Math.PI));
  const runtimeSnapshots=run.map(frame=>frame.snapshot?.runtimes?.find(runtime=>runtime.id==='wizardRebuiltArcana')?.snapshot).filter(Boolean);
  const dragonArc=runtimeSnapshots.map(snapshot=>snapshot.dragonArc).find(Boolean)??{};
  const emissionMap=new Map();
  for(const snapshot of runtimeSnapshots){
    for(const effect of snapshot.effects??[]){
      if(effect.type!=='dragonProjectile'||!Number.isFinite(Number(effect.emissionIndex))||!Number.isFinite(Number(effect.emittedAt)))continue;
      emissionMap.set(Number(effect.emissionIndex),Number(effect.emittedAt));
    }
  }
  const emissionTimesSeconds=[...emissionMap.entries()].sort((left,right)=>left[0]-right[0]).map(([,time])=>time);
  const emissionIntervalsSeconds=emissionTimesSeconds.slice(1).map((time,index)=>time-emissionTimesSeconds[index]);
  const emissionIntervalSeconds=emissionIntervalsSeconds.length?emissionIntervalsSeconds.reduce((sum,value)=>sum+value,0)/emissionIntervalsSeconds.length:null;
  const fullReleaseSeconds=emissionTimesSeconds.length>1?emissionTimesSeconds.at(-1)-emissionTimesSeconds[0]:null;
  return{
    captureDerived:{
      emittedProjectiles:emissionMap.size,emissionTimesSeconds,emissionIntervalsSeconds,emissionIntervalSeconds,fullReleaseSeconds,
      maximumVisibleProjectiles:Math.max(0,...run.map(frame=>frame.snapshot?.projectiles?.length??0)),
      playerFootprint:footprint,
      peakToPeakWorld:lateral.length?Math.max(...lateral)-Math.min(...lateral):null,
      peakToPeakPlayerFootprints:lateral.length&&footprint?(Math.max(...lateral)-Math.min(...lateral))/footprint:null,
      maximumAbsoluteYawDegrees:yaws.length?Math.max(...yaws):null,
    },
    specDerived:{
      wavelengthPlayerFootprints:Number(dragonArc.wavelengthPlayerDiameters),
      adjacentPhaseDegrees:Number(dragonArc.adjacentPhaseDegrees),
      everyOtherPhaseDifferenceDegrees:Number(dragonArc.everyOtherPhaseDifferenceDegrees),
    },
  };
}

function eventKind(event){return String(event?.kind||event?.event||event?.type||'').toLowerCase();}
function eventIdentity(event,index=0){
  return String(event?.eventId||event?.id||[eventKind(event),event?.instanceId??event?.stableId??event?.emissionId??'',event?.seq??event?.serial??event?.frame??event?.time??event?.at??'',event?.targetId??'',event?.index??index].join('|'));
}
function payloadFromExplicit(explicit,abilityId){
  if(!explicit||typeof explicit!=='object')return null;
  return explicit.telemetry?.abilities?.[abilityId]||explicit.abilities?.[abilityId]||(explicit.telemetry?.abilityId===abilityId?explicit.telemetry:null)||(explicit.abilityId===abilityId?explicit:null)||(Array.isArray(explicit.semanticEvents)||Array.isArray(explicit.effects)?explicit:null)||null;
}
function instanceBelongs(instance,abilityId){
  if(instance?.arcanaId)return instance.arcanaId===abilityId;
  const type=String(instance?.type||instance?.semanticKind||'').toLowerCase();
  if(abilityId==='BOLT-RAIL')return type.includes('boltrail')||type.includes('bolt-rail');
  if(abilityId==='VOLT-DISC')return type.includes('voltdisc')||type.includes('volt-disc');
  return false;
}
function contractFor(explicit,abilityId){
  const key={'HOMING-FLARES':'homingFlares','WHIRLING-TORNADO':'whirlingTornado','WATER-PRISON':'waterPrison'}[abilityId];
  return key?explicit?.abilityContracts?.[key]||{}:{};
}
function collectAbilityTelemetry(run,{runtimeId='',abilityId=''}={}){
  const frames=[],eventMap=new Map();
  for(const entry of run||[]){
    const snapshot=entry.snapshot||entry,runtime=(snapshot.runtimes||[]).find(value=>!runtimeId||value.id===runtimeId),explicit=runtime?.snapshot,payload=payloadFromExplicit(explicit,abilityId)||{};
    const events=[...(payload.events||[]),...(explicit?.events||[]),...(explicit?.semanticEvents||[])].filter(event=>!event.arcanaId&&!event.abilityId||event.arcanaId===abilityId||event.abilityId===abilityId);
    events.forEach((event,index)=>eventMap.set(eventIdentity(event,index),event));
    const instances=(payload.instances||payload.effects||explicit?.effects||[]).filter(instance=>instanceBelongs(instance,abilityId));
    frames.push({frame:entry.frame??snapshot.frame,time:entry.time??snapshot.time,snapshot,runtime,explicit,payload:{...payload,metrics:{...contractFor(explicit,abilityId),...(payload.metrics||{})}},instances});
  }
  return{frames,events:[...eventMap.values()],final:frames.at(-1)||null};
}
function uniqueIds(values){return new Set(values.filter(value=>value!==undefined&&value!==null).map(String));}
function maximum(values,fallback=null){const finiteValues=values.map(Number).filter(Number.isFinite);return finiteValues.length?Math.max(...finiteValues):fallback;}
function distance(a,b){return a&&b&&Number.isFinite(Number(a.x))&&Number.isFinite(Number(a.z))&&Number.isFinite(Number(b.x))&&Number.isFinite(Number(b.z))?Math.hypot(a.x-b.x,a.z-b.z):null;}
function targetFrameValues(telemetry,targetId){return telemetry.frames.map(frame=>({frame:frame.frame,time:frame.time,target:[...(frame.snapshot?.captureDummies||[]),...(frame.snapshot?.enemies||[])].find(value=>String(value.id)===String(targetId))})).filter(value=>value.target);}

const telemetryAdapters={
  'dragon-arc':(run)=>dragonObservedMetrics(run),
  'homing-flares':(run,context)=>{
    const telemetry=collectAbilityTelemetry(run,context),created=telemetry.events.filter(event=>/flare-(created|spawned)/.test(eventKind(event))),outcomes=telemetry.events.filter(event=>/flare-(hit|intercepted|expired|consumed)/.test(eventKind(event)));
    const flareFrames=telemetry.frames.map(frame=>frame.instances.flatMap(instance=>instance.flares||[])),createdIds=uniqueIds([...created.map(event=>event.instanceId??event.stableId??event.flareId??event.emissionId),...flareFrames.flat().map(flare=>flare.id)]),outcomeIds=outcomes.map(event=>String(event.instanceId??event.stableId??event.flareId??event.emissionId??'')),outcomeCounts=new Map();for(const id of outcomeIds)outcomeCounts.set(id,(outcomeCounts.get(id)||0)+1);
    const metricsFrames=telemetry.frames.map(frame=>frame.payload.metrics||{}),storedCounts=flareFrames.map(flares=>flares.filter(flare=>flare.state==='stored').length),orbitDirection=metricsFrames.map(metric=>metric.orbitDirection).find(Boolean);
    const uniqueOutcomeOwnership=outcomeCounts.size?[...outcomeCounts.values()].every(count=>count===1)&&[...outcomeCounts.keys()].every(id=>!createdIds.size||createdIds.has(id)):null;
    const casts=telemetry.events.filter(event=>eventKind(event)==='cast'),storageExpiries=outcomes.filter(event=>eventKind(event).includes('expired')&&event.reason==='storage-duration'),storageLifetimes=storageExpiries.map(event=>{const flareId=String(event.stableId||''),cast=casts.filter(value=>flareId.startsWith(String(value.stableId||''))).sort((left,right)=>String(right.stableId||'').length-String(left.stableId||'').length)[0];return cast?Number(event.time)-Number(cast.time):null;});
    const hitTargets=uniqueIds(outcomes.filter(event=>eventKind(event).includes('hit')).map(event=>event.targetId)),finalActive=telemetry.final?.instances?.some(instance=>instance.type==='homingFlares')??false;
    return{captureDerived:{createdFlares:createdIds.size||maximum(metricsFrames.map(metric=>metric.count),null),maximumStoredFlares:maximum([...storedCounts,...metricsFrames.map(metric=>metric.count)],null),clockwiseOrbit:orbitDirection?orbitDirection==='clockwise':null,interceptions:outcomes.filter(event=>eventKind(event).includes('intercepted')).length,expiredFlares:outcomes.filter(event=>eventKind(event).includes('expired')).length,uniqueHitTargets:hitTargets.size,uniqueOutcomeOwnership,allCreatedHaveOutcome:uniqueOutcomeOwnership===true&&createdIds.size>0&&outcomeCounts.size===createdIds.size,storageLifetimeSeconds:maximum(storageLifetimes,null),storageLifetimeSamplesSeconds:storageLifetimes.filter(Number.isFinite),reportedStorageAgeSeconds:maximum(storageExpiries.map(event=>event.storageAge),null),cleanedUp:telemetry.frames.length?!finalActive:null},telemetry:{eventCount:telemetry.events.length}};
  },
  'whirling-tornado':(run,context)=>{
    const telemetry=collectAbilityTelemetry(run,context),casts=telemetry.events.filter(event=>eventKind(event)==='cast'),ticks=telemetry.events.filter(event=>/tornado-tick|^tick$/.test(eventKind(event))),finishers=telemetry.events.filter(event=>/tornado-finisher|finisher/.test(eventKind(event))),intercepts=telemetry.events.filter(event=>/intercept|projectile-erased/.test(eventKind(event))),positions=telemetry.frames.flatMap(frame=>frame.instances.filter(instance=>instance.type==='whirlingTornado').map(instance=>instance.position).filter(Boolean)),origin=positions[0],finalPrimaryActive=telemetry.final?.instances?.some(instance=>instance.type==='whirlingTornado')??false;
    const castTime=Number(casts[0]?.time)||0,expectedTickTimes=[.12,.30,.48,.66],tickTimes=ticks.map(event=>Number(event.time)-castTime),insideId='tornado-inside',outsideId='tornado-outside',insideFrames=targetFrameValues(telemetry,insideId),outsideFrames=targetFrameValues(telemetry,outsideId),damageObserved=frames=>frames.length?(Number(frames[0].target.hp)-Math.min(...frames.map(frame=>Number(frame.target.hp)))):null,maximumKnock=frames=>maximum(frames.map(frame=>Math.hypot(Number(frame.target.knockX)||0,Number(frame.target.knockZ)||0)),frames.length?0:null),permittedTransients=telemetry.final?.instances?.filter(instance=>instance.type==='whirlingTornadoTransient').length??0;
    return{captureDerived:{tickCount:ticks.length,tickTimesSeconds:tickTimes,maximumTickTimingErrorSeconds:maximum(tickTimes.map((time,index)=>Math.abs(time-expectedTickTimes[index])),null),tickDamageExact:ticks.length===4&&ticks.every(event=>Number(event.damage)===8),finisherCount:finishers.length,finisherDamageExact:finishers.length===1&&Number(finishers[0].damage)===10,insideTargetAllTicks:ticks.length===4&&ticks.every(event=>event.targetIds?.includes(insideId)),insideTargetFinished:finishers.length===1&&finishers[0].targetIds?.includes(insideId)===true,outsideTargetUntouched:[...ticks,...finishers].every(event=>!event.targetIds?.includes(outsideId)),insideTargetDamage:damageObserved(insideFrames),outsideTargetDamage:damageObserved(outsideFrames),insideMaximumKnock:maximumKnock(insideFrames),outsideMaximumKnock:maximumKnock(outsideFrames),interceptions:intercepts.length,originDrift:maximum(positions.map(position=>distance(origin,position)),positions.length?0:null),primaryCleanedUp:telemetry.frames.length?!finalPrimaryActive:null,permittedFinisherTransients:permittedTransients,cleanedUp:telemetry.frames.length?!finalPrimaryActive:null},telemetry:{eventCount:telemetry.events.length}};
  },
  'water-prison':(run,context)=>{
    const telemetry=collectAbilityTelemetry(run,context),impacts=telemetry.events.filter(event=>/prison-impact|^impact$|^attached$/.test(eventKind(event))),ticks=telemetry.events.filter(event=>/prison-tick|^tick$/.test(eventKind(event))),instances=uniqueIds(telemetry.events.filter(event=>eventKind(event)==='cast').map(event=>event.instanceId??event.stableId).concat(telemetry.frames.flatMap(frame=>frame.instances.filter(instance=>instance.type==='waterPrison').map(instance=>instance.instanceId??instance.stableId??instance.id)))),finalActive=telemetry.final?.instances?.some(instance=>instance.type==='waterPrison')??false;
    const carrierEnds=telemetry.events.filter(event=>eventKind(event)==='carrier-ended'),releases=telemetry.events.filter(event=>eventKind(event)==='released'),durationLifetimes=[];for(const attached of impacts){const released=releases.find(event=>event.stableId===attached.stableId&&event.reason==='duration'&&Number(event.time)>=Number(attached.time));if(released)durationLifetimes.push(Number(released.time)-Number(attached.time));}
    const lockDrifts=[];for(const frame of telemetry.frames)for(const instance of frame.instances.filter(value=>value.type==='waterPrison'&&value.lock&&value.capturedId)){const target=[...(frame.snapshot?.captureDummies||[]),...(frame.snapshot?.enemies||[])].find(value=>String(value.id)===String(instance.capturedId));const drift=distance(target,instance.lock);if(drift!==null)lockDrifts.push(drift);}
    return{captureDerived:{instanceCount:instances.size,impactCount:impacts.length,tickCount:ticks.length,maximumStack:maximum(impacts.map(event=>event.stackCount),null),maximumLockDrift:maximum(lockDrifts,lockDrifts.length?0:null),captureLifetimeSeconds:maximum(durationLifetimes,null),captureLifetimesSeconds:durationLifetimes,carrierWallEnds:carrierEnds.filter(event=>event.reason==='wall').length,carrierRangeEnds:carrierEnds.filter(event=>event.reason==='range').length,targetInvalidReleases:releases.filter(event=>event.reason==='target-invalid').length,ammoRechargeEvents:telemetry.events.filter(event=>eventKind(event)==='ammo-recharged').length,finalAmmo:Number.isFinite(Number(telemetry.final?.explicit?.waterAmmo))?Number(telemetry.final.explicit.waterAmmo):null,cleanedUp:telemetry.frames.length?!finalActive:null},telemetry:{eventCount:telemetry.events.length}};
  },
  'bolt-rail':(run,context)=>{
    const telemetry=collectAbilityTelemetry(run,context),streams=telemetry.events.filter(event=>/bolt-rail-stream|bolt-(stream|emission)|stream-emitted/.test(eventKind(event))),hits=telemetry.events.filter(event=>/bolt-stream-hit|stream-hit/.test(eventKind(event))),finisherEvents=telemetry.events.filter(event=>/bolt-rail-finisher|bolt-finisher|finisher-burst/.test(eventKind(event))),finishers=finisherEvents.filter(event=>event.triggered!==false),travelling=maximum(telemetry.frames.map(frame=>frame.instances.filter(instance=>/projectile/.test(String(instance.type||instance.kind||'').toLowerCase())).length),0);
    return{captureDerived:{streamCount:uniqueIds(streams.map(event=>event.stableId??event.instanceId??event.emissionId??event.beat)).size,streamHitCount:hits.length||streams.reduce((sum,event)=>sum+(event.hitTargetIds?.length||0),0),finisherCount:finishers.length,missedFinisherCount:finisherEvents.filter(event=>event.triggered===false).length,finisherTargetCount:maximum(finishers.map(event=>event.targetIds?.length||0),0),travellingProjectiles:travelling},telemetry:{eventCount:telemetry.events.length}};
  },
  'volt-disc':(run,context)=>{
    const telemetry=collectAbilityTelemetry(run,context),emissions=telemetry.events.filter(event=>/disc-(created|emitted|spawned|press)/.test(eventKind(event))),direct=telemetry.events.filter(event=>/disc-(direct-(damage|hit)|carrier-hit)/.test(eventKind(event))),zero=telemetry.events.filter(event=>/disc-(contact-burst|contact-event)/.test(eventKind(event))&&Number(event.damage)===0),terminal=telemetry.events.filter(event=>/disc-terminal-burst/.test(eventKind(event))&&Number(event.damage)>0),eventDiscId=event=>String(event.stableId||event.instanceId||event.discId||event.emissionId||`${event.comboSerial??0}:${event.press??0}`).replace(/:(contact|terminal|wall-fizzle)$/,''),ids=uniqueIds(emissions.map(eventDiscId)),payloadCounts=new Map();for(const event of[...direct,...terminal]){const id=eventDiscId(event);payloadCounts.set(id,(payloadCounts.get(id)||0)+1);}
    const directionKey=event=>event.direction&&`${Number(event.direction.x).toFixed(3)},${Number(event.direction.z).toFixed(3)}`,deckFrames=telemetry.frames.map(frame=>frame.snapshot?.captureDeck).filter(Boolean),comboCompletions=telemetry.events.filter(event=>eventKind(event)==='volt-disc-combo-complete');
    const retained=deckFrames.some(deck=>deck.manualSequence?.press===1&&deck.hand?.[0]==='VOLT-DISC'),oppositeUsed=deckFrames.some(deck=>deck.manualSequence?.press===1&&deck.hand?.[0]==='VOLT-DISC'&&deck.hand?.[1]!=='BOLT-RAIL');
    return{captureDerived:{discCount:ids.size,pressEvents:emissions.length,uniqueAimDirections:uniqueIds(emissions.map(directionKey)).size,directDamageEvents:direct.length,zeroDamageBurstEvents:zero.length,terminalDamageEvents:terminal.length,wallFizzles:telemetry.events.filter(event=>eventKind(event)==='volt-disc-wall-fizzle').length,comboStarts:telemetry.events.filter(event=>eventKind(event)==='volt-disc-combo-start').length,comboExpired:telemetry.events.filter(event=>eventKind(event)==='volt-disc-combo-expired').length,deckRetainedAfterFirst:retained,oppositeSlotUsable:oppositeUsed,deckSequenceCompleted:comboCompletions.length>0,exactlyOnePayload:payloadCounts.size?([...payloadCounts.values()].every(count=>count===1)&&[...payloadCounts.keys()].every(id=>!ids.size||ids.has(id))):null},telemetry:{eventCount:telemetry.events.length}};
  },
  generic:(run,context)=>{const telemetry=collectAbilityTelemetry(run,context);return{captureDerived:{eventCount:telemetry.events.length},telemetry:{eventCount:telemetry.events.length}};},
};

export function observedMetrics(run,context={}){
  const adapter=telemetryAdapters[context.telemetryAdapter||'dragon-arc']||telemetryAdapters.generic;
  return adapter(run,{runtimeId:context.runtimeId||'',abilityId:context.abilityId||'DRAGON-ARC'});
}

function valueAtPath(source,pathText){return String(pathText||'').split('.').filter(Boolean).reduce((value,key)=>value?.[key],source);}

export function evaluateAcceptance(acceptance,observed){
  if(Array.isArray(acceptance?.checks)){
    const checks={};
    for(const contract of acceptance.checks){
      const value=valueAtPath(observed,contract.metric),op=contract.op||'exact';let passed=false;
      if(op==='exact')passed=value===contract.value;
      else if(op==='range')passed=Number.isFinite(Number(value))&&Number(value)>=contract.min&&Number(value)<=contract.max;
      else if(op==='minimum')passed=Number.isFinite(Number(value))&&Number(value)>=contract.min;
      else if(op==='maximum')passed=Number.isFinite(Number(value))&&Number(value)<=contract.max;
      else if(op==='truthy')passed=value===true;
      else if(op==='falsy')passed=value===false;
      checks[contract.id]={...contract,value,passed,measurementSource:String(contract.metric||'').split('.')[0]||'captureDerived'};
    }
    const contractPassed=Object.values(checks).every(check=>check.passed),required=acceptance.mode!=='advisory';
    return{passed:required?contractPassed:true,contractPassed,required,checks};
  }
  const capture=observed.captureDerived??{},spec=observed.specDerived??{};
  const range=(key,value,bounds)=>({key,value,min:bounds?.[0],max:bounds?.[1],passed:Number.isFinite(value)&&value>=bounds[0]&&value<=bounds[1]});
  const exact=(key,value,expected)=>({key,value,expected,passed:Number.isFinite(value)&&value===expected});
  const checks={
    projectileCount:{...exact('projectileCount',capture.emittedProjectiles,acceptance.projectileCount),measurementSource:'captureDerived'},
    emissionIntervalSeconds:{...range('emissionIntervalSeconds',capture.emissionIntervalSeconds,acceptance.emissionIntervalSeconds),measurementSource:'captureDerived'},
    fullReleaseSeconds:{...range('fullReleaseSeconds',capture.fullReleaseSeconds,acceptance.fullReleaseSeconds),measurementSource:'captureDerived'},
    peakToPeakPlayerFootprints:{...range('peakToPeakPlayerFootprints',capture.peakToPeakPlayerFootprints,acceptance.peakToPeakPlayerFootprints),measurementSource:'captureDerived'},
    wavelengthPlayerFootprints:{...range('wavelengthPlayerFootprints',spec.wavelengthPlayerFootprints,acceptance.wavelengthPlayerFootprints),measurementSource:'specDerived'},
    adjacentPhaseDegrees:{...range('adjacentPhaseDegrees',spec.adjacentPhaseDegrees,acceptance.adjacentPhaseDegrees),measurementSource:'specDerived'},
    everyOtherPhaseToleranceDegrees:{key:'everyOtherPhaseToleranceDegrees',value:spec.everyOtherPhaseDifferenceDegrees,max:acceptance.everyOtherPhaseToleranceDegrees,passed:Number.isFinite(spec.everyOtherPhaseDifferenceDegrees)&&spec.everyOtherPhaseDifferenceDegrees<=acceptance.everyOtherPhaseToleranceDegrees,measurementSource:'specDerived'},
    visibleYawDegrees:{...range('visibleYawDegrees',capture.maximumAbsoluteYawDegrees,acceptance.visibleYawDegrees),measurementSource:'captureDerived'},
  };
  return{passed:Object.values(checks).every(check=>check.passed),contractPassed:Object.values(checks).every(check=>check.passed),required:true,checks};
}

function findMetricFiles(directory){
  if(!fs.existsSync(directory))return[];
  const result=[];
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    const file=path.join(directory,entry.name);
    if(entry.isDirectory())result.push(...findMetricFiles(file));
    else if(entry.isFile()&&entry.name==='metrics.json')result.push(file);
  }
  return result;
}

export function buildReviewIndex(outputRoot){
  const entries=[];
  for(const file of findMetricFiles(outputRoot)){
    let metrics;try{metrics=JSON.parse(fs.readFileSync(file,'utf8'));}catch{continue;}
    const relativeDirectory=path.relative(outputRoot,path.dirname(file)).replace(/\\/g,'/');
    entries.push({
      abilityId:metrics.abilityId,scenario:metrics.scenario||'source-base',stage:metrics.stage||path.basename(path.dirname(file)),generatedAt:metrics.generatedAt,relativeDirectory,
      deterministicPassed:metrics.deterministic?.passed===true,
      acceptancePassed:metrics.acceptance?.contractPassed??metrics.acceptance?.passed===true,
      mediaPassed:metrics.media?.comparison?.passed??metrics.media?.comparison?.skipped===true,
      metrics:`${relativeDirectory}/metrics.json`,
      contactSheet:metrics.artifacts?.contactSheet?`${relativeDirectory}/${metrics.artifacts.contactSheet}`:null,
      comparisonVideo:metrics.artifacts?.comparisonVideo?`${relativeDirectory}/${metrics.artifacts.comparisonVideo}`:null,
      telemetryRun1:metrics.artifacts?.telemetryRun1?`${relativeDirectory}/${metrics.artifacts.telemetryRun1}`:null,
      telemetryRun2:metrics.artifacts?.telemetryRun2?`${relativeDirectory}/${metrics.artifacts.telemetryRun2}`:null,
      sourceClip:metrics.sourceClip,
      revision:metrics.revision||null,
    });
  }
  entries.sort((left,right)=>String(left.abilityId).localeCompare(String(right.abilityId))||String(left.scenario).localeCompare(String(right.scenario))||String(left.stage).localeCompare(String(right.stage)));
  const abilityMap=new Map();
  for(const entry of entries){
    if(!abilityMap.has(entry.abilityId))abilityMap.set(entry.abilityId,new Map());
    const scenarios=abilityMap.get(entry.abilityId);
    if(!scenarios.has(entry.scenario))scenarios.set(entry.scenario,{scenario:entry.scenario,sourceClip:entry.sourceClip,stages:{contract:null,source:null,style:null}});
    scenarios.get(entry.scenario).stages[entry.stage]=entry;
  }
  const abilities=[...abilityMap.entries()].map(([abilityId,scenarios])=>({abilityId,scenarios:[...scenarios.values()]}));
  const revisions=[...new Map(entries.filter(entry=>entry.revision?.commit).map(entry=>[`${entry.revision.commit}:${entry.revision.dirty}`,entry.revision])).values()];
  return{schemaVersion:2,generatedAt:new Date().toISOString(),revisions,abilities,entries};
}

function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));}
export function renderReviewIndexHtml(index){
  const artifactLinks=entry=>[['metrics',entry.metrics],['sheet',entry.contactSheet],['video',entry.comparisonVideo],['trace 1',entry.telemetryRun1],['trace 2',entry.telemetryRun2]].filter(([,href])=>href).map(([label,href])=>`<a href="${escapeHtml(href)}">${label}</a>`).join(' &middot; ');
  const stageCell=entry=>entry?`<div class="verdict ${entry.deterministicPassed&&entry.acceptancePassed&&entry.mediaPassed?'pass':'fail'}">${entry.deterministicPassed&&entry.acceptancePassed&&entry.mediaPassed?'PASS':'CHECK'}</div><small>det ${entry.deterministicPassed?'pass':'fail'} &middot; contract ${entry.acceptancePassed?'pass':'fail'} &middot; media ${entry.mediaPassed?'pass':'skip/fail'}</small>${entry.contactSheet?`<a class="preview-link" href="${escapeHtml(entry.contactSheet)}"><img class="preview" loading="lazy" src="${escapeHtml(entry.contactSheet)}" alt="${escapeHtml(`${entry.abilityId} ${entry.scenario} ${entry.stage} contact sheet`)}"></a>`:''}<div class="links">${artifactLinks(entry)}</div>`:'<span class="pending">not captured</span>';
  const sourceWindow=clip=>clip?`${escapeHtml(clip.start)}&ndash;${escapeHtml(clip.end)}s<br><small>audited ${escapeHtml(clip.timelineStart)}&ndash;${escapeHtml(clip.timelineEnd??clip.end)}s${clip.compare===false?' &middot; behavior-only':''}</small>`:'<span class="pending">not recorded</span>';
  const sections=(index.abilities||[]).map(ability=>`<section><h2>${escapeHtml(ability.abilityId)}</h2><table><thead><tr><th>Scenario</th><th>Source window</th><th>Contract</th><th>Source render</th><th>Style</th></tr></thead><tbody>${ability.scenarios.map(scenario=>`<tr><th scope="row">${escapeHtml(scenario.scenario)}</th><td>${sourceWindow(scenario.sourceClip)}</td><td>${stageCell(scenario.stages.contract)}</td><td>${stageCell(scenario.stages.source)}</td><td>${stageCell(scenario.stages.style)}</td></tr>`).join('')}</tbody></table></section>`).join('');
  const revisions=(index.revisions||[]).map(revision=>`${escapeHtml(String(revision.commit).slice(0,12))}${revision.dirty?' (dirty worktree)':''}`).join(', ')||'not recorded';
  return`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Arcana capture review index</title><style>:root{color-scheme:dark}body{background:#0d1117;color:#e6edf3;font:14px system-ui;margin:clamp(1rem,3vw,2.5rem)}section{margin:2rem 0;overflow:auto}table{border-collapse:collapse;width:100%;min-width:860px}th,td{border:1px solid #30363d;padding:.6rem;text-align:left;vertical-align:top}thead th{background:#161b22}a{color:#58a6ff}.verdict{font-weight:800}.pass{color:#63d98b}.fail{color:#ff887f}.pending,small{color:#9da7b3}.preview-link{display:block}.preview{display:block;width:100%;max-width:320px;max-height:220px;object-fit:contain;background:#080b10;border:1px solid #30363d;border-radius:.35rem;margin:.55rem 0}.links{margin-top:.35rem;white-space:normal}</style><h1>Arcana capture review index</h1><p>Generated ${escapeHtml(index.generatedAt)}<br>Revision: ${revisions}</p>${sections}</html>`;
}

function writeReviewIndex(outputRoot){
  fs.mkdirSync(outputRoot,{recursive:true});
  const index=buildReviewIndex(outputRoot);
  fs.writeFileSync(path.join(outputRoot,'review-index.json'),`${JSON.stringify(index,null,2)}\n`);
  fs.writeFileSync(path.join(outputRoot,'review-index.html'),renderReviewIndexHtml(index));
  return index;
}

async function runCaptureJob({manifest,job,options,server,browser,ffmpeg,ffprobe,sourceVideo,outputRoot}){
  const {abilityId,scenarioName,stageName,stage}=job;
  const legacyDragon=abilityId==='DRAGON-ARC'&&scenarioName==='source-base'&&!options.scenario;
  const outputDirectory=path.resolve(root,options.output??path.join(manifest.outputRoot,abilityId.toLowerCase(),...(legacyDragon?[stageName]:[scenarioName,stageName])));
  fs.mkdirSync(outputDirectory,{recursive:true});
  const captureUrl=`${server.baseUrl}/${job.route}?${new URLSearchParams(job.query)}`;
  let launched;let cdp;
  try{
    console.log(`Opening deterministic capture: ${captureUrl}`);
    launched=await launchBrowser(browser,manifest.viewport,captureUrl);cdp=new CdpClient(launched.target.webSocketDebuggerUrl);
    await cdp.call('Page.enable');await cdp.call('Runtime.enable');await cdp.call('Emulation.setDeviceMetricsOverride',{...manifest.viewport,mobile:false});await waitForCaptureApi(cdp);
    const gameDirectory=path.join(outputDirectory,'game');
    const run1=await captureRun(cdp,{stage,runDirectory:path.join(gameDirectory,'run-1')}),run2=await captureRun(cdp,{stage,runDirectory:path.join(gameDirectory,'run-2')});
    const revision=captureRevision(),telemetryDirectory=path.join(outputDirectory,'telemetry');
    const telemetryRun1=writeSemanticTrace(run1,path.join(telemetryDirectory,'run-1.json'),{abilityId,scenario:scenarioName,stage:stageName,fixedDt:stage.fixedDt,revision});
    const telemetryRun2=writeSemanticTrace(run2,path.join(telemetryDirectory,'run-2.json'),{abilityId,scenario:scenarioName,stage:stageName,fixedDt:stage.fixedDt,revision});
    const traceSnapshotsEqual=run1.traceHashes.map((hash,index)=>hash===run2.traceHashes[index]);
    const screenshotHashesEqual=run1.frames.map((frame,index)=>frame.imageSha256===run2.frames[index]?.imageSha256);
    // Semantic state is the deterministic contract. Exact GPU pixels are retained as
    // an advisory diagnostic because tiny platform-level color rounding is expected.
    const deterministicPassed=run1.traceHashes.length===run2.traceHashes.length&&traceSnapshotsEqual.every(Boolean);
    const screenshotExactPassed=run1.frames.length===run2.frames.length&&screenshotHashesEqual.every(Boolean);
    let timeline=null,sourceFrames=[],contactSheet=null,comparisonVideo=null;
    let comparisonMedia={skipped:true,reason:'Deterministic contract fixture has no synchronized source-media comparison.'};
    if(stage.sourceClip.compare!==false){
      timeline=await captureTimeline(cdp,{stage,timelineDirectory:path.join(gameDirectory,'timeline-60fps')});
      sourceFrames=await extractSourceFrames(ffmpeg,sourceVideo,stage,path.join(outputDirectory,'source'),manifest.viewport);
      contactSheet=path.join(outputDirectory,'contact-sheet.png');await buildContactSheet(ffmpeg,sourceFrames,run1.frames,contactSheet);
      comparisonVideo=await buildComparisonVideo(ffmpeg,sourceVideo,stage,timeline,outputDirectory);comparisonMedia=await probeComparisonVideo(ffprobe,comparisonVideo,stage,timeline);
    }
    const observed=observedMetrics(run1.trace,{telemetryAdapter:job.telemetryAdapter,runtimeId:job.runtimeId,abilityId});
    const acceptanceResult=evaluateAcceptance(stage.acceptance,observed),artifacts={};
    artifacts.telemetryRun1=path.relative(outputDirectory,telemetryRun1).replace(/\\/g,'/');artifacts.telemetryRun2=path.relative(outputDirectory,telemetryRun2).replace(/\\/g,'/');
    if(contactSheet)artifacts.contactSheet=path.basename(contactSheet);if(comparisonVideo)artifacts.comparisonVideo=path.basename(comparisonVideo);
    if(timeline){artifacts.timelineFrames=path.relative(outputDirectory,timeline.directory).replace(/\\/g,'/');artifacts.timelineFrameCount=timeline.frameCount;}
    const metrics={
      schemaVersion:2,abilityId,scenario:scenarioName,stage:stageName,renderMode:stage.renderMode,effects:Boolean(stage.effects),generatedAt:new Date().toISOString(),captureUrl,revision,
      fixedDt:stage.fixedDt,durationFrames:stage.durationFrames,checkpointFrames:stage.checkpointFrames,checkpoints:stage.checkpoints,sourceClip:stage.sourceClip,actions:stage.actions,fixtures:stage.reset.fixtures,
      deterministic:{passed:deterministicPassed,traceFrameCount:run1.traceHashes.length,traceSnapshotsEqual,screenshotExactPassed,screenshotHashesEqual,run1TraceHashes:run1.traceHashes,run2TraceHashes:run2.traceHashes},
      acceptance:{passed:acceptanceResult.passed,contractPassed:acceptanceResult.contractPassed,required:acceptanceResult.required,checks:acceptanceResult.checks,contract:stage.acceptance},
      media:{comparison:comparisonMedia},observed,
      frames:run1.frames.map((frame,index)=>({checkpoint:frame.checkpoint,frames:frame.frames,sourceTime:sourceFrames[index]?.sourceTime??null,sourceImage:sourceFrames[index]?path.relative(outputDirectory,sourceFrames[index].imagePath).replace(/\\/g,'/'):null,gameImage:path.relative(outputDirectory,frame.imagePath).replace(/\\/g,'/'),snapshot:frame.snapshot})),artifacts,
    };
    const metricsPath=path.join(outputDirectory,'metrics.json');fs.writeFileSync(metricsPath,`${JSON.stringify(metrics,null,2)}\n`);writeReviewIndex(outputRoot);
    if(!deterministicPassed)throw new Error(`Deterministic trace verification failed for ${abilityId}/${scenarioName}/${stageName}. Inspect ${metricsPath}.`);
    if(!comparisonMedia.skipped&&!comparisonMedia.passed){const failed=Object.entries(comparisonMedia.checks).filter(([,check])=>!check.passed).map(([key,check])=>`${key}: expected ${check.expected}, received ${check.actual}`).join('; ');throw new Error(`Comparison-video validation failed (${failed}). Inspect ${metricsPath}.`);}
    if(!acceptanceResult.passed)throw new Error(`${abilityId}/${scenarioName}/${stageName} acceptance failed. Inspect ${metricsPath}.`);
    console.log(`Capture complete: ${outputDirectory}`);console.log(`Deterministic trace: ${traceSnapshotsEqual.filter(Boolean).length}/${traceSnapshotsEqual.length} frames matched. Exact checkpoint pixels: ${screenshotHashesEqual.filter(Boolean).length}/${screenshotHashesEqual.length} (advisory).`);console.log(`Acceptance checks: ${Object.values(acceptanceResult.checks).filter(check=>check.passed).length}/${Object.keys(acceptanceResult.checks).length} passed.`);
    return metrics;
  }finally{cdp?.close();if(launched)await launched.close();}
}

export async function main(argv=process.argv.slice(2)){
  const options=parseArgs(argv);if(options.help){console.log(usage());return;}
  if(!options.batch&&(!options.id||!options.stage))throw new Error(`Both --id and --stage are required for a single capture.\n\n${usage()}`);
  const stageNames=expandCaptureStages(options.stage||'contract');
  const manifest=readManifest(),requests=[];
  if(options.batch){const batch=manifest.batches?.[options.batch];if(!batch)throw new Error(`Unknown capture batch ${options.batch}. Available: ${Object.keys(manifest.batches||{}).join(', ')}`);for(const entry of batch)for(const stage of stageNames)requests.push({...entry,stage});}
  else for(const stage of stageNames)requests.push({id:options.id,scenario:options.scenario,stage});
  if(options.output&&requests.length!==1)throw new Error('--output is only supported for one capture; batch and --stage all paths come from the manifest.');
  const jobs=requests.map(request=>resolveCaptureJob(manifest,{id:request.abilityId||request.id,scenario:request.scenario,stage:request.stage}));
  const sourceVideo=path.resolve(root,manifest.sourceVideo),needsMedia=jobs.some(job=>job.stage.sourceClip.compare!==false);
  if(needsMedia&&!fs.existsSync(sourceVideo))throw new Error(`Source video is missing: ${sourceVideo}`);
  const ffmpeg=needsMedia?resolveFfmpeg(options.ffmpeg):null,ffprobe=needsMedia?resolveFfprobe(ffmpeg,options.ffprobe):null,browser=resolveBrowser(options.browser),outputRoot=path.resolve(root,manifest.outputRoot),server=await serveRepository(),failures=[];
  try{
    for(const job of jobs){try{await runCaptureJob({manifest,job,options,server,browser,ffmpeg,ffprobe,sourceVideo,outputRoot});}catch(error){const failure=`${job.abilityId}/${job.scenarioName}/${job.stageName}: ${error.message}`;failures.push(failure);console.error(failure);}}
  }finally{await server.close();writeReviewIndex(outputRoot);}
  if(failures.length)throw new Error(`${failures.length} capture job${failures.length===1?'':'s'} failed:\n- ${failures.join('\n- ')}`);
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(scriptPath)){
  main().catch(error=>{console.error(`Arcana capture failed:\n${error.message}`);process.exitCode=1;});
}
