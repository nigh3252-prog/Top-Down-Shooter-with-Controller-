import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const htmlPath=path.join(root,'wizard-of-legend-arcana-checklist.html');
const html=fs.readFileSync(htmlPath,'utf8');
const dataMatch=html.match(/<script id="wol-data" type="application\/json">([\s\S]*?)<\/script>/);
assert.ok(dataMatch,'checklist must embed its machine-readable dataset');
const data=JSON.parse(dataMatch[1]);
const entries=data.entries;

assert.equal(data.schemaVersion,1,'dataset schema must remain explicitly versioned');
assert.equal(entries.length,67,'the checklist must track 67 source-first analyses');
assert.equal(new Set(entries.map(entry=>entry.id)).size,67,'arcana IDs must be unique');
assert.deepEqual(entries.map(entry=>entry.order),Array.from({length:67},(_,index)=>index+1),'source order must be stable');

const improved=entries.filter(entry=>entry.status!=='legacy-replace');
const implemented=entries.filter(entry=>entry.status==='source-first-implemented');
const pending=entries.filter(entry=>entry.status==='not-implemented');
const legacy=entries.filter(entry=>entry.status==='legacy-replace');
const replacement=entries.filter(entry=>entry.status==='replacement-in-progress');
assert.equal(improved.length,67,'all 67 entries must use the improved source-first analysis');
assert.equal(implemented.length,36,'the next-twenty pass must join the source-first implementation count');
assert.equal(pending.length,31,'31 source-first analyses must remain implementation-pending');
assert.deepEqual(legacy,[],'no legacy entry should remain after the Water Prison reanalysis');
assert.deepEqual(replacement,[],'the completed Dragon Arc design must leave no active replacement queue');
assert.deepEqual(entries.filter(entry=>entry.currentImplementation),[],'completed replacements must not retain an active prototype notice');

for(const name of ['Homing Flares','Dragon Arc','Whirling Tornado','Water Prison']){
  const entry=entries.find(item=>item.name===name);
  assert.equal(entry?.lineage,'rebuilt',`${name} must retain initial-pass to source-first rebuild lineage`);
  assert.equal(entry?.status,'source-first-implemented',`${name} replacement must count as source-first implemented`);
  assert.deepEqual(entry?.defaults,{analysis:true,implementation:true,comparison:false},`${name} completion stages are incorrect`);
  assert.ok(entry?.revisionHistory.includes('first version'),`${name} must preserve its superseded implementation history`);
}

const dragonArc=entries.find(entry=>entry.name==='Dragon Arc');
assert.equal(dragonArc?.lineage,'rebuilt','Dragon Arc must retain its initial-pass to source-first rebuild history');
assert.equal(dragonArc?.status,'source-first-implemented','the finished Dragon Arc design must count as implemented');
assert.deepEqual(dragonArc?.defaults,{analysis:true,implementation:true,comparison:false},'final visual comparison must remain a separate user approval');
assert.match(dragonArc?.revisionHistory,/metric-validated deterministic double-helix motion proxy/i,'Dragon Arc must preserve the durable reference-lock workflow without claiming pending user approval');
assert.match(dragonArc?.revisionHistory,/final visual source comparison remains pending user review/i,'Dragon Arc must leave final visual approval open');
assert.match(dragonArc?.revisionHistory,/articulated segmented dragon silhouette/i,'Dragon Arc must record the completed visual carrier');
assert.match(dragonArc?.analysisMarkdown,/Working motion calibration \[INFERENCE/i,'Dragon Arc must keep measured calibration separate from observed evidence');
assert.match(html,/const CATALOG_REVISION=3/,'completed implementations must migrate older device-local checklist defaults once');
assert.match(html,/payload\.catalogRevision\?\?1/,'progress migration must preserve newer user choices');
assert.match(html,/const CATALOG_MIGRATIONS=\{2:\{'dragon-arc':\{analysis:true,implementation:true\}\},3:/,'revision two must preserve the Dragon Arc completion migration');
assert.match(html,/3:Object\.fromEntries\(NEXT_TWENTY_IMPLEMENTED\.map/,'revision three must migrate the next-twenty implementation defaults');
assert.match(html,/progress=progressFromPayload\(incoming\)/,'imported older progress must receive the same catalog migration as local progress');
assert.doesNotMatch(html,/for\(const entry of data\.entries\).*?entry\.defaults\.implementation/s,'catalog migration must not overwrite unrelated user checklist choices');

for(const name of ['Bolt Rail','Volt Disc']){
  const entry=entries.find(item=>item.name===name);
  assert.equal(entry?.status,'source-first-implemented',`${name} must count as source-first implemented`);
  assert.deepEqual(entry?.defaults,{analysis:true,implementation:true,comparison:false},`${name} completion stages are incorrect`);
}

const referenceLockWindows=new Map([
  ['Whirling Tornado',{start:420.8,end:421.7}],
  ['Water Prison',{start:1051.83,end:1060}],
  ['Homing Flares',{start:280.4,end:282.5}],
  ['Bolt Rail',{start:53.3,end:53.95}],
  ['Volt Disc',{start:58.2,end:59.1}],
]);
for(const [name,window] of referenceLockWindows){
  const entry=entries.find(item=>item.name===name);
  assert.deepEqual(entry?.referenceWindow,window,`${name} must expose its frame-audited base-form review window`);
  assert.match(entry?.revisionHistory,/reference-lock pass/i,`${name} must record the source-lock rebuild`);
  assert.match(entry?.revisionHistory,/final visual source comparison remains pending user review/i,`${name} must preserve the final user approval gate`);
  assert.match(entry?.analysisMarkdown,/Reference-lock frame audit/i,`${name} must retain its detailed frame audit`);
  assert.match(entry?.analysisMarkdown,/\[EVIDENCE[^\]]*\]/i,`${name} must label observed or documented evidence`);
  assert.match(entry?.analysisMarkdown,/\[INFERENCE[^\]]*\]/i,`${name} must keep authored inference separate from source claims`);
}
assert.match(html,/Five-card reference-lock:/,'the checklist must explain the pending five-card review batch');
assert.match(html,/Next-twenty reference-lock:/,'the checklist must explain the pending twenty-card review batch');
assert.match(html,/entry\.referenceWindow\?\?entry/,'clip playback must prefer the audited base-form window');

const nextTwentyNames=['Ice Dagger','Rip Tide','Aqua Arc','Chaos Crusher','Searing Rush','Flare Rush','Ignition Rush','Air Burst','Gust Burst','Razor Burst','Spike Track','Toxic Trap','Snare Track','Thunder Line','Circuit Line','Shock Line','Wave Front','Frost Feint','Frost Wing','Chaotic Rift'];
for(const name of nextTwentyNames){
  const entry=entries.find(item=>item.name===name);
  assert.equal(entry?.status,'source-first-implemented',`${name} must count as source-first implemented`);
  assert.deepEqual(entry?.defaults,{analysis:true,implementation:true,comparison:false},`${name} must remain pending only visual comparison`);
  assert.equal(entry?.lineage,'source-first',`${name} must retain source-first-from-outset lineage`);
  assert.ok(entry?.referenceWindow?.end>entry?.referenceWindow?.start,`${name} must expose its audited base clip`);
  assert.match(entry?.analysisMarkdown,/Reference-lock frame audit/i,`${name} must retain its audit addendum`);
  assert.match(entry?.analysisMarkdown,/\[EVIDENCE[^\]]*\]/i,`${name} must separate evidence`);
  assert.match(entry?.analysisMarkdown,/\[INFERENCE[^\]]*\]/i,`${name} must separate Top Down integration inference`);
  assert.match(entry?.revisionHistory,/contract, source-render, and final-style gates/i,`${name} must record the durable workflow`);
}

for(const name of ['Flame Cross','Bouncing Blaze']){
  const entry=entries.find(item=>item.name===name);
  assert.equal(entry?.lineage,'rebuilt',`${name} must retain initial-pass → source-first rebuild lineage`);
  assert.equal(entry?.status,'source-first-implemented',`${name} must count as rebuilt and implemented`);
  assert.ok(entry?.revisionHistory.includes('first version'),`${name} must explain why its first implementation was superseded`);
}

for(const entry of entries){
  assert.match(entry.id,/^[a-z0-9]+(?:-[a-z0-9]+)*$/,'IDs must be stable anchor-safe slugs');
  assert.ok(Number.isFinite(entry.start)&&Number.isFinite(entry.end)&&entry.start>=0&&entry.end>entry.start,`${entry.name} must have a valid clip range`);
  assert.ok(entry.posterTime===undefined||(Number.isFinite(entry.posterTime)&&entry.posterTime>=entry.start&&entry.posterTime<=entry.end),`${entry.name} poster time must fit its clip`);
  assert.ok(entry.end<=data.video.duration,`${entry.name} clip must fit inside the source video`);
  assert.ok(entry.summary.trim(),`${entry.name} needs an observed-behavior summary`);
  assert.ok(entry.analysisMarkdown.trim(),`${entry.name} needs preserved analysis detail`);
  assert.ok(entry.recipe.trim(),`${entry.name} needs an exact or historical construction recipe`);
  assert.ok(entry.acceptance.trim(),`${entry.name} needs acceptance criteria`);
  assert.ok(entry.citations.length>0&&entry.citations.every(url=>/^https?:\/\//.test(url)),`${entry.name} needs at least one citation`);
  assert.deepEqual(Object.keys(entry.defaults).sort(),['analysis','comparison','implementation'],'each entry must define all three checklist stages');
  assert.ok(html.includes('id="arcana-${entry.id}"'),'runtime card template must create semantic stable anchors');
  if(entry.status==='legacy-replace'){
    assert.deepEqual(entry.defaults,{analysis:false,implementation:false,comparison:false},`${entry.name} legacy prototype must not inflate source-first totals`);
    assert.ok(entry.currentImplementation?.trim(),`${entry.name} must document the current game prototype`);
    assert.match(entry.replacementChecklist,/do not polish/i,`${entry.name} must explicitly direct replacement rather than polishing`);
  }else{
    assert.equal(entry.defaults.analysis,true,`${entry.name} improved analysis should begin checked`);
    assert.equal(entry.defaults.implementation,entry.status==='source-first-implemented',`${entry.name} implementation default must match its source-first status`);
    assert.equal(entry.defaults.comparison,false,`${entry.name} source comparison remains deliberately pending`);
  }
  if(entry.currentImplementation){
    assert.ok(entry.currentImplementation.trim(),`${entry.name} must document the current game prototype`);
    assert.match(entry.replacementChecklist,/do not polish/i,`${entry.name} must explicitly direct replacement rather than polishing`);
  }

  const posterPath=path.join(root,entry.poster);
  const poster=fs.readFileSync(posterPath);
  assert.equal(poster.subarray(0,4).toString('ascii'),'RIFF',`${entry.name} poster must be a WebP RIFF file`);
  assert.equal(poster.subarray(8,12).toString('ascii'),'WEBP',`${entry.name} poster must have a WebP signature`);
}

const requiredUi=[
  'playsinline preload="metadata"','wol.arcanaChecklist.v1','Export progress','Import progress','Reset progress',
  'Copy implementation brief','element-filter','category-filter','lineage-filter','status-filter','sort-order',
  'previous-clip','next-clip','full-showcase','playback-speed','video.addEventListener(\'timeupdate\'',
];
for(const marker of requiredUi)assert.ok(html.includes(marker),`missing checklist UI behavior: ${marker}`);
assert.ok(html.includes('<article class="arcana-card"'),'entries must render as semantic article elements');
assert.ok(html.includes('about-large-files-on-github')&&html.includes('github-pages-limits'),'page must retain GitHub media-limit references');

const indexHtml=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.ok(indexHtml.includes('href="wizard-of-legend-arcana-checklist.html"'),'the root launcher must link to the standalone checklist');

const videoPath=path.join(root,data.video.src);
const video=fs.readFileSync(videoPath);
assert.equal(video.subarray(4,8).toString('ascii'),'ftyp','optimized showcase must have an MP4 ftyp signature');
assert.ok(video.length<85*1024*1024,'optimized showcase must remain below the 85 MiB project target');

function topLevelBoxes(buffer){
  const boxes=[];
  for(let offset=0;offset+8<=buffer.length;){
    let size=buffer.readUInt32BE(offset);const type=buffer.subarray(offset+4,offset+8).toString('ascii');let header=8;
    if(size===1){size=Number(buffer.readBigUInt64BE(offset+8));header=16;}
    if(size===0)size=buffer.length-offset;
    assert.ok(size>=header&&offset+size<=buffer.length,`invalid MP4 box ${type}`);
    boxes.push({type,offset,size,header});offset+=size;
  }
  return boxes;
}

const boxes=topLevelBoxes(video);
const moov=boxes.find(box=>box.type==='moov');
const mdat=boxes.find(box=>box.type==='mdat');
assert.ok(moov&&mdat&&moov.offset<mdat.offset,'MP4 must use faststart with moov before media data');
const moovChildren=topLevelBoxes(video.subarray(moov.offset+moov.header,moov.offset+moov.size));
const mvhd=moovChildren.find(box=>box.type==='mvhd');
assert.ok(mvhd,'MP4 must contain a movie header');
const mvhdData=video.subarray(moov.offset+moov.header+mvhd.offset+mvhd.header);
const version=mvhdData[0];
const timescale=mvhdData.readUInt32BE(version===1?20:12);
const duration=version===1?Number(mvhdData.readBigUInt64BE(24)):mvhdData.readUInt32BE(16);
assert.ok(Math.abs(duration/timescale-data.video.duration)<2,'embedded and encoded video durations must agree');

console.log('Wizard of Legend checklist validation passed.');
