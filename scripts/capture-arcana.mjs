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

function usage(){
  return [
    'Capture a deterministic arcana review against its source-video timeline.',
    '',
    'Usage:',
    '  npm run capture:arcana -- --id DRAGON-ARC --stage motion',
    '',
    'Optional:',
    '  --output <dir>   Override the ignored artifact directory',
    '  --browser <exe>  Chrome or Edge executable (also ARCANA_CAPTURE_BROWSER)',
    '  --ffmpeg <exe>   FFmpeg executable (also FFMPEG_PATH)',
    '  --ffprobe <exe>  FFprobe executable (also FFPROBE_PATH; defaults beside FFmpeg)',
  ].join('\n');
}

function readManifest(){
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  if(manifest.schemaVersion!==1)throw new Error(`Unsupported capture manifest schema: ${manifest.schemaVersion}`);
  return manifest;
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

async function captureRun(cdp,{abilityId,stage,runDirectory}){
  fs.mkdirSync(runDirectory,{recursive:true});
  const results=[];
  for(const checkpoint of stage.checkpoints){
    const frames=Math.round(checkpoint/stage.fixedDt);
    const input=JSON.stringify({reset:stage.reset,abilityId,frames,dt:stage.fixedDt});
    const snapshot=await evaluate(cdp,`(async()=>{
      const api=${CAPTURE_API};const input=${input};
      await api.reset(input.reset);if(api.setPaused)await api.setPaused(true);
      await api.cast(input.abilityId);await api.step(input.frames,input.dt);
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      return await api.snapshot();
    })()`);
    const shot=await cdp.call('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
    const image=Buffer.from(shot.data,'base64');
    const imagePath=path.join(runDirectory,checkpointName(checkpoint));
    fs.writeFileSync(imagePath,image);
    results.push({checkpoint,frames,snapshot,imagePath,imageSha256:sha256(image)});
  }
  return results;
}

async function captureTimeline(cdp,{abilityId,stage,timelineDirectory}){
  fs.mkdirSync(timelineDirectory,{recursive:true});
  for(const entry of fs.readdirSync(timelineDirectory)){
    if(/^frame-\d{4}\.png$/i.test(entry))fs.unlinkSync(path.join(timelineDirectory,entry));
  }
  const duration=stage.checkpoints.at(-1),frameCount=Math.round(duration/stage.fixedDt);
  const input=JSON.stringify({reset:stage.reset,abilityId,dt:stage.fixedDt});
  await evaluate(cdp,`(async()=>{
    const api=${CAPTURE_API};const input=${input};
    await api.reset(input.reset);if(api.setPaused)await api.setPaused(true);
    await api.cast(input.abilityId);return await api.snapshot();
  })()`);
  for(let index=0;index<frameCount;index++){
    if(index>0)await evaluate(cdp,`(${CAPTURE_API}).step(1,${JSON.stringify(stage.fixedDt)})`);
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

export function observedMetrics(run){
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

function evaluateAcceptance(acceptance,observed){
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
  return{passed:Object.values(checks).every(check=>check.passed),checks};
}

export async function main(argv=process.argv.slice(2)){
  const options=parseArgs(argv);
  if(options.help){console.log(usage());return;}
  const abilityId=String(options.id??'').toUpperCase();
  const stageName=options.stage??'';
  if(!abilityId||!stageName)throw new Error(`Both --id and --stage are required.\n\n${usage()}`);

  const manifest=readManifest();
  const ability=manifest.abilities[abilityId];
  if(!ability)throw new Error(`Unknown arcana ID ${abilityId}. Available: ${Object.keys(manifest.abilities).join(', ')}`);
  const stage=ability.stages[stageName];
  if(!stage)throw new Error(`Unknown ${abilityId} stage ${stageName}. Available: ${Object.keys(ability.stages).join(', ')}`);
  const sourceVideo=path.resolve(root,manifest.sourceVideo);
  if(!fs.existsSync(sourceVideo))throw new Error(`Source video is missing: ${sourceVideo}`);
  const ffmpeg=resolveFfmpeg(options.ffmpeg);
  const ffprobe=resolveFfprobe(ffmpeg,options.ffprobe);
  const browser=resolveBrowser(options.browser);
  const outputDirectory=path.resolve(root,options.output??path.join(manifest.outputRoot,abilityId.toLowerCase(),stageName));
  fs.mkdirSync(outputDirectory,{recursive:true});

  const query=new URLSearchParams(ability.query).toString();
  const server=await serveRepository();
  const captureUrl=`${server.baseUrl}/${ability.route}?${query}`;
  let launched;let cdp;
  try{
    console.log(`Opening deterministic capture: ${captureUrl}`);
    launched=await launchBrowser(browser,manifest.viewport,captureUrl);
    cdp=new CdpClient(launched.target.webSocketDebuggerUrl);
    await cdp.call('Page.enable');await cdp.call('Runtime.enable');
    await cdp.call('Emulation.setDeviceMetricsOverride',{...manifest.viewport,mobile:false});
    await waitForCaptureApi(cdp);

    const gameDirectory=path.join(outputDirectory,'game');
    const run1=await captureRun(cdp,{abilityId,stage,runDirectory:path.join(gameDirectory,'run-1')});
    const run2=await captureRun(cdp,{abilityId,stage,runDirectory:path.join(gameDirectory,'run-2')});
    const deterministic=run1.map((frame,index)=>stableJson(frame.snapshot)===stableJson(run2[index].snapshot));
    const screenshotHashes=run1.map((frame,index)=>frame.imageSha256===run2[index].imageSha256);
    const deterministicPassed=deterministic.every(Boolean)&&screenshotHashes.every(Boolean);
    const timeline=await captureTimeline(cdp,{abilityId,stage,timelineDirectory:path.join(gameDirectory,'timeline-60fps')});

    const sourceFrames=await extractSourceFrames(ffmpeg,sourceVideo,stage,path.join(outputDirectory,'source'),manifest.viewport);
    const contactSheet=path.join(outputDirectory,'contact-sheet.png');
    await buildContactSheet(ffmpeg,sourceFrames,run1,contactSheet);
    const comparisonVideo=await buildComparisonVideo(ffmpeg,sourceVideo,stage,timeline,outputDirectory);
    const comparisonMedia=await probeComparisonVideo(ffprobe,comparisonVideo,stage,timeline);
    const observed=observedMetrics(run1),acceptanceResult=evaluateAcceptance(stage.acceptance,observed);
    const metrics={
      schemaVersion:1,abilityId,stage:stageName,generatedAt:new Date().toISOString(),captureUrl,
      fixedDt:stage.fixedDt,checkpoints:stage.checkpoints,sourceClip:stage.sourceClip,
      deterministic:{passed:deterministicPassed,snapshotsEqual:deterministic,screenshotHashesEqual:screenshotHashes},
      acceptance:{passed:acceptanceResult.passed,checks:acceptanceResult.checks,contract:stage.acceptance},
      media:{comparison:comparisonMedia},
      observed,
      frames:run1.map((frame,index)=>({
        checkpoint:frame.checkpoint,frames:frame.frames,sourceTime:sourceFrames[index].sourceTime,
        sourceImage:path.relative(outputDirectory,sourceFrames[index].imagePath).replace(/\\/g,'/'),
        gameImage:path.relative(outputDirectory,frame.imagePath).replace(/\\/g,'/'),
        snapshot:frame.snapshot,
      })),
      artifacts:{contactSheet:path.basename(contactSheet),comparisonVideo:path.basename(comparisonVideo),timelineFrames:path.relative(outputDirectory,timeline.directory).replace(/\\/g,'/'),timelineFrameCount:timeline.frameCount},
    };
    fs.writeFileSync(path.join(outputDirectory,'metrics.json'),`${JSON.stringify(metrics,null,2)}\n`);
    if(!deterministicPassed)throw new Error(`Deterministic-state verification failed: repeated fixed-step snapshots differ. Inspect ${path.join(outputDirectory,'metrics.json')}.`);
    if(!comparisonMedia.passed){
      const failed=Object.entries(comparisonMedia.checks).filter(([,check])=>!check.passed).map(([key,check])=>`${key}: expected ${check.expected}, received ${check.actual}`).join('; ');
      throw new Error(`Comparison-video validation failed (${failed}). Inspect ${path.join(outputDirectory,'metrics.json')} and regenerate the media.`);
    }
    if(!acceptanceResult.passed)throw new Error(`Gate-1 motion acceptance failed. Inspect ${path.join(outputDirectory,'metrics.json')}.`);
    console.log(`Capture complete: ${outputDirectory}`);
    console.log(`Deterministic snapshots: ${deterministic.length}/${deterministic.length} matched.`);
    console.log(`Comparison video: ${comparisonMedia.actual.frameCount} frames at ${comparisonMedia.actual.averageFps} FPS for ${comparisonMedia.actual.duration.toFixed(3)}s.`);
    console.log(`Gate-1 motion checks: ${Object.values(acceptanceResult.checks).filter(check=>check.passed).length}/${Object.keys(acceptanceResult.checks).length} passed.`);
  }finally{
    cdp?.close();
    if(launched)await launched.close();
    await server.close();
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(scriptPath)){
  main().catch(error=>{console.error(`Arcana capture failed:\n${error.message}`);process.exitCode=1;});
}
