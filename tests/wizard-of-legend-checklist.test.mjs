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
assert.equal(entries.length,41,'the checklist must track 37 source-first analyses plus four legacy replacements');
assert.equal(new Set(entries.map(entry=>entry.id)).size,41,'arcana IDs must be unique');
assert.deepEqual(entries.map(entry=>entry.order),Array.from({length:41},(_,index)=>index+1),'source order must be stable');

const improved=entries.filter(entry=>entry.status!=='legacy-replace');
const implemented=entries.filter(entry=>entry.status==='source-first-implemented');
const pending=entries.filter(entry=>entry.status==='not-implemented');
const legacy=entries.filter(entry=>entry.status==='legacy-replace');
assert.equal(improved.length,37,'37 entries must use the improved source-first analysis');
assert.equal(implemented.length,10,'only ten source-first implementations count as complete');
assert.equal(pending.length,27,'27 improved analyses must remain implementation-pending');
assert.deepEqual(legacy.map(entry=>entry.name),['Homing Flares','Dragon Arc','Whirling Tornado','Water Prison'],'legacy replacement queue changed unexpectedly');

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
