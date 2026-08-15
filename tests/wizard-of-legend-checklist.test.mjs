import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const htmlPath=path.join(root,'tools','wizard-of-legend-arcana-checklist.html');
const html=fs.readFileSync(htmlPath,'utf8');
const rail=fs.readFileSync(path.join(root,'tools','wizard-of-legend-arcana-rail.js'),'utf8');
const uiSource=`${html}\n${rail}`;
const dataMatch=html.match(/<script id="wol-data" type="application\/json">([\s\S]*?)<\/script>/);
assert.ok(dataMatch,'checklist must embed its machine-readable dataset');
const data=JSON.parse(dataMatch[1]);
const entries=data.entries;

assert.equal(data.schemaVersion,1,'dataset schema must remain explicitly versioned');
assert.equal(entries.length,149,'the checklist must track every distinct Arcana in the source video');
assert.equal(new Set(entries.map(entry=>entry.id)).size,149,'arcana IDs must be unique');
assert.deepEqual(entries.map(entry=>entry.order),Array.from({length:149},(_,index)=>index+1),'showcase order must remain stable and contiguous');

const onlineReferencePath=path.join(root,'archive','wizard-of-legend','source-notes','gate2-online-reference.md');
const onlineReference=fs.readFileSync(onlineReferencePath,'utf8');
assert.equal((onlineReference.match(/^## \d+\. /gm)??[]).length,149,'the online reference must cover every Gate 1 Arcana');
for(const entry of entries){
  assert.ok(entry.onlineReferenceMarkdown?.trim(),`${entry.name} must carry its documented-online reference in the generated entry`);
  assert.equal(entry.onlineReference?.evidence,'documented-online',`${entry.name} online evidence label is incorrect`);
  assert.ok(/^https?:\/\//.test(entry.onlineReference?.sourceUrl??''),`${entry.name} online reference must expose a source URL`);
  assert.ok(entry.citations.includes(entry.onlineReference.sourceUrl),`${entry.name} online source must remain attached to its citations`);
}

for(const entry of entries){
  assert.ok(entry.onlineReference?.documentedBehavior?.includes('[DOCUMENTED]'),'every entry must carry detailed documented behavior');
  assert.match(entry.onlineReferenceMarkdown,/Wiki behavior/,'every entry must carry its wiki behavior field');
}
const wikiPrimary=entries.filter(entry=>entry.onlineReference.sourceUrl.includes('wizardoflegend.fandom.com'));
assert.equal(wikiPrimary.length,144,'individual Wizard of Legend Wiki pages must be primary for 144 entries');
assert.deepEqual(
  entries.filter(entry=>!entry.onlineReference.sourceUrl.includes('wizardoflegend.fandom.com')).map(entry=>entry.name),
  ['Gale-Force Alignment','Magnetic Follow-Up','Rock-Solid Tomahawk',"Rock N' Roll",'Cascading Blitz'],
  'only the five explicitly labeled page-shell fallbacks may use the community catalog',
);
const airSpinner=entries.find(entry=>entry.name==='Air Spinner');
assert.match(airSpinner.onlineReference.documentedBehavior,/orbits the player once/i,'Air Spinner must retain the wiki sequence detail');
assert.match(airSpinner.onlineReference.documentedBehavior,/second disc spawns behind the player/i,'Air Spinner must retain the enhanced placement detail');
assert.match(airSpinner.onlineReference.wikiStats,/Damage: 6, 10/,'Air Spinner must retain wiki infobox damage');
const ripTide=entries.find(entry=>entry.name==='Rip Tide');
assert.match(ripTide.onlineReference.documentedBehavior,/8, 7 and 5 damage/i,'Rip Tide must retain per-ripple wiki damage');
assert.match(ripTide.onlineReference.documentedBehavior,/uninterruptable combo/i,'Rip Tide must retain its one-input combo rule');
assert.match(ripTide.onlineReference.wikiStrategies,/pierce through all enemies/i,'Rip Tide must retain its documented piercing behavior');

const inventoryOnly=entries.filter(entry=>entry.status==='inventory-only');
const analyzed=entries.filter(entry=>entry.status!=='inventory-only');
const improved=analyzed.filter(entry=>entry.status!=='legacy-replace');
const implemented=entries.filter(entry=>entry.status==='source-first-implemented');
const pending=entries.filter(entry=>entry.status==='not-implemented');
const legacy=entries.filter(entry=>entry.status==='legacy-replace');
const replacement=entries.filter(entry=>entry.status==='replacement-in-progress');
assert.equal(analyzed.length,88,'the curated demo ports must promote their eight inventory-only records');
assert.equal(inventoryOnly.length,61,'61 records must remain inventory-only');
assert.equal(improved.length,88,'all 88 analyzed entries must use the improved source-first analysis');
assert.equal(implemented.length,70,'the ten new curated cards must join the source-first implementation count');
assert.equal(pending.length,18,'18 source-first analyses must remain implementation-pending');
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
assert.match(html,/const CATALOG_REVISION=8/,'the curated demo expansion must bump the stored progress revision');
assert.match(rail,/const CATALOG_REVISION=8/,'the tools rail must share the curated demo catalog revision');
assert.match(html,/payload\.catalogRevision\?\?1/,'progress migration must preserve newer user choices');
assert.match(html,/const CATALOG_MIGRATIONS=\{2:\{'dragon-arc':\{analysis:true,implementation:true\}\},3:/,'revision two must preserve the Dragon Arc completion migration');
assert.match(html,/3:Object\.fromEntries\(NEXT_TWENTY_IMPLEMENTED\.map/,'revision three must migrate the next-twenty implementation defaults');
assert.match(html,/4:Object\.fromEntries\(ARCHETYPE_SAMPLER_IMPLEMENTED\.map/,'revision four must migrate the archetype sampler implementation defaults');
assert.match(html,/const VFX_LAB_IMPLEMENTED=\['flame-breath','searing-crown','ignition-drive','engulfing-fissure','dragon-blast','shearing-chain','terra-ring','grasping-earth','tectonic-drill','rock-solid-tomahawk','shock-nova','star-bolt','aqua-vortex','aqua-breaker'\]/,'the checklist must name every VFX-lab card in its migration set');
assert.match(html,/7:Object\.fromEntries\(VFX_LAB_IMPLEMENTED\.map/,'revision seven must migrate the VFX-lab implementation defaults');
assert.match(rail,/7:Object\.fromEntries\(VFX_LAB_IMPLEMENTED\.map/,'the tools rail must migrate the VFX-lab implementation defaults');
assert.match(html,/const CURATED_DEMO_IMPLEMENTED=\['bladed-vine','spark-contact','gust-burst','razor-burst','thunder-line','circuit-line','blazing-lariat','explosive-charge','storm-draft','blurring-falconry','whirling-wind-agent','knockout-boulder','toxic-bolas','rock-n-roll','earth-stomp-agent','bubble-barrage'\]/,'the checklist must name all sixteen curated replacements and additions');
assert.match(html,/8:Object\.fromEntries\(CURATED_DEMO_IMPLEMENTED\.map/,'revision eight must migrate curated demo defaults');
assert.match(rail,/8:Object\.fromEntries\(CURATED_DEMO_IMPLEMENTED\.map/,'the tools rail must migrate curated demo defaults');
assert.match(html,/progress=progressFromPayload\(incoming\)/,'imported older progress must receive the same catalog migration as local progress');
assert.doesNotMatch(html,/for\(const entry of data\.entries\).*?entry\.defaults\.implementation/s,'catalog migration must not overwrite unrelated user checklist choices');

for(const name of ['Bolt Rail','Volt Disc']){
  const entry=entries.find(item=>item.name===name);
  assert.equal(entry?.status,'source-first-implemented',`${name} must count as source-first implemented`);
  assert.deepEqual(entry?.defaults,{analysis:true,implementation:true,comparison:false},`${name} completion stages are incorrect`);
}

for(const name of ['Flame Breath','Searing Crown','Ignition Drive','Engulfing Fissure','Dragon Blast','Shearing Chain','Terra Ring','Grasping Earth','Tectonic Drill','Rock-Solid Tomahawk','Shock Nova','Star Bolt','Aqua Vortex','Aqua Breaker']){
  const entry=entries.find(item=>item.name===name);
  assert.equal(entry?.lineage,'source-first',`${name} must be labeled as a native source-first card`);
  assert.equal(entry?.status,'source-first-implemented',`${name} must show as implemented in the Arcana preview`);
  assert.deepEqual(entry?.defaults,{analysis:true,implementation:true,comparison:false},`${name} implementation checkbox defaults are incorrect`);
  assert.ok(entry?.recipe?.trim()&&entry?.acceptance?.trim()&&entry?.units?.length,`${name} must retain a playable recipe and acceptance gate`);
  assert.match(entry?.analysisMarkdown,/VFX lab/i,`${name} must retain uploaded VFX-lab evidence`);
  assert.match(entry?.revisionHistory,/VFX lab port/i,`${name} must record the implementation migration`);
}

for(const name of ['Bladed Vine','Spark Contact','Gust Burst','Razor Burst','Thunder Line','Circuit Line','Blazing Lariat','Explosive Charge','Storm Draft','Blurring Falconry','Whirling Wind Agent','Knockout Boulder','Toxic Bolas',"Rock N' Roll",'Earth Stomp Agent','Bubble Barrage']){
  const entry=entries.find(item=>item.name===name);
  assert.equal(entry?.status,'source-first-implemented',`${name} curated demo must show as implemented`);
  assert.deepEqual(entry?.defaults,{analysis:true,implementation:true,comparison:false},`${name} curated defaults are incorrect`);
  assert.match(entry?.revisionHistory,/Curated demo port/,`${name} must record the curated source replacement`);
  assert.match(entry?.analysisMarkdown,/exact uploaded source/i,`${name} must retain exact-demo evidence`);
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
assert.match(html,/Archetype sampler:/,'the checklist must explain the varied ten-card review batch');
assert.match(html,/data-action="watch-reference"/,'a card must offer its audited base-form reference lock when one exists');
assert.match(html,/data-action="watch-segment"/,'a card must offer its individual base and charged showcase segments');
assert.match(html,/function showcaseClip\(entry\)\{return entry\.showcaseWindow\?\?entry;\}/,'default playback must use the full Gate 1 showcase window');

const nextTwentyNames=['Ice Dagger','Rip Tide','Aqua Arc','Chaos Crusher','Searing Rush','Flare Rush','Ignition Rush','Air Burst','Gust Burst','Razor Burst','Spike Track','Toxic Trap','Snare Track','Thunder Line','Circuit Line','Shock Line','Wave Front','Frost Feint','Frost Wing','Chaotic Rift'];
const curatedNextTwenty=new Set(['Gust Burst','Razor Burst','Thunder Line','Circuit Line']);
for(const name of nextTwentyNames){
  const entry=entries.find(item=>item.name===name);
  assert.equal(entry?.status,'source-first-implemented',`${name} must count as source-first implemented`);
  assert.deepEqual(entry?.defaults,{analysis:true,implementation:true,comparison:false},`${name} must remain pending only visual comparison`);
  assert.equal(entry?.lineage,'source-first',`${name} must retain source-first-from-outset lineage`);
  assert.ok(entry?.referenceWindow?.end>entry?.referenceWindow?.start,`${name} must expose its audited base clip`);
  assert.match(entry?.analysisMarkdown,/Reference-lock frame audit/i,`${name} must retain its audit addendum`);
  assert.match(entry?.analysisMarkdown,/\[EVIDENCE[^\]]*\]/i,`${name} must separate evidence`);
  assert.match(entry?.analysisMarkdown,/\[INFERENCE[^\]]*\]/i,`${name} must separate Top Down integration inference`);
  assert.match(entry?.revisionHistory,curatedNextTwenty.has(name)?/Curated demo port/:/contract, source-render, and final-style gates/i,`${name} must record the durable workflow`);
}

const archetypeSamplerNames=['Rapid Fire Agent','Ward of Flames','Mentis Imperium','Flame Fusion','Heroic Leap','Cyclone Boomerang','Earthen Aegis','Ball Lightning','Aqua Beam','Arcane Intervention'];
for(const name of archetypeSamplerNames){
  const entry=entries.find(item=>item.name===name);
  assert.equal(entry?.status,'source-first-implemented',`${name} must count as implemented`);
  assert.deepEqual(entry?.defaults,{analysis:true,implementation:true,comparison:false},`${name} must remain pending only visual comparison`);
  assert.ok(entry?.referenceWindow?.end>entry?.referenceWindow?.start,`${name} must expose a base reference window`);
  assert.match(entry?.analysisMarkdown,/Reference-lock frame audit/i,`${name} must retain its audit addendum`);
  assert.match(entry?.analysisMarkdown,/\[EVIDENCE[^\]]*\]/i,`${name} must separate observed evidence`);
  assert.match(entry?.analysisMarkdown,/\[INFERENCE[^\]]*\]/i,`${name} must separate integration inference`);
  assert.match(entry?.revisionHistory,/contract, source-render, and final-style gates/i,`${name} must record the durable workflow`);
}
for(const name of ['Cyclone Boomerang','Earthen Aegis','Ball Lightning','Aqua Beam','Arcane Intervention']){
  const entry=entries.find(item=>item.name===name);
  assert.ok(entry?.units.length>=2,`${name} must extract reusable construction units`);
}
assert.match(entries.find(entry=>entry.name==='Aqua Beam')?.analysisMarkdown,/five-beam[\s\S]*(?:not included|remain(?:s)? disabled)/i,'Aqua Beam must remain base-form only');

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
  if(entry.status!=='inventory-only'){
    assert.ok(entry.recipe.trim(),`${entry.name} needs an exact or historical construction recipe`);
    assert.ok(entry.acceptance.trim(),`${entry.name} needs acceptance criteria`);
  }
  assert.ok(entry.citations.length>0&&entry.citations.every(url=>/^https?:\/\//.test(url)),`${entry.name} needs at least one citation`);
  assert.deepEqual(Object.keys(entry.defaults).sort(),['analysis','comparison','implementation'],'each entry must define all three checklist stages');
  assert.ok(html.includes('id="arcana-${entry.id}"'),'runtime card template must create semantic stable anchors');

  const segments=entry.showcaseSegments;
  assert.ok(Array.isArray(segments)&&segments.length>0,`${entry.name} must carry its Gate 1 showcase segments`);
  assert.equal(segments[0].kind,'base','the first demonstration of an Arcana must be its base form');
  assert.deepEqual(segments.map(segment=>segment.kind).slice(1),segments.length>1?['charged']:[],`${entry.name} may only add a charged demonstration`);
  for(const segment of segments){
    assert.ok(segment.end>segment.start,`${entry.name} showcase segment must advance in time`);
    assert.ok(segment.end<=data.video.duration,`${entry.name} showcase segment must fit inside the source video`);
  }
  assert.deepEqual(entry.showcaseWindow,{
    start:Math.min(...segments.map(segment=>segment.start)),
    end:Math.max(...segments.map(segment=>segment.end)),
  },`${entry.name} showcase window must span its demonstrations`);
  if(entry.referenceWindow){
    // The ledger stores whole-second showcase boundaries, so a frame-audited
    // lock may sit up to one rounded second outside them, but never further.
    assert.ok(entry.referenceWindow.start>=entry.showcaseWindow.start-1&&entry.referenceWindow.end<=entry.showcaseWindow.end+1,
      `${entry.name} frame-audited lock must track its showcase window`);
  }

  if(entry.status==='inventory-only'){
    assert.equal(entry.lineage,'inventory',`${entry.name} must declare video-inventory lineage`);
    assert.deepEqual(entry.defaults,{analysis:false,implementation:false,comparison:false},`${entry.name} must not claim analysis or implementation credit`);
    assert.match(entry.analysisMarkdown,/^# Gate 1 video inventory/,`${entry.name} must state that only the inventory gate is complete`);
    assert.equal(entry.recipe,'',`${entry.name} must not invent a construction recipe before analysis`);
    assert.equal(entry.acceptance,'',`${entry.name} must not invent acceptance criteria before analysis`);
    assert.equal(entry.units.length,0,`${entry.name} must not claim extracted construction units`);
  }else if(entry.status==='legacy-replace'){
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

const ledgerPath=path.join(root,'archive','wizard-of-legend','source-notes','gate1-video-inventory.md');
const ledger=fs.readFileSync(ledgerPath,'utf8').replace(/\r\n/g,'\n');
const ledgerRows=[...ledger.matchAll(/^\|\s*(\d+)\s*\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|\s*$/gm)];
assert.equal(ledgerRows.length,149,'the Gate 1 ledger must list every distinct Arcana exactly once');
assert.deepEqual(
  ledgerRows.map(row=>[Number(row[1]),row[2].trim(),row[3].trim(),row[4].trim()]),
  entries.map(entry=>[entry.order,entry.name,entry.element,entry.category]),
  'the published catalog must stay in lockstep with the Gate 1 ledger',
);
for(const row of ledgerRows){
  const entry=entries[Number(row[1])-1];
  const base=entry.showcaseSegments[0];
  assert.equal(Number(row[5]),base.start,`${entry.name} base start must match the ledger`);
  assert.equal(Number(row[6]),base.end,`${entry.name} base end must match the ledger`);
  const charged=entry.showcaseSegments[1];
  assert.equal(row[7].trim()==='—'?undefined:Number(row[7]),charged?.start,`${entry.name} charged start must match the ledger`);
  assert.equal(row[8].trim()==='—'?undefined:Number(row[8]),charged?.end,`${entry.name} charged end must match the ledger`);
}

const chargedCount=entries.filter(entry=>entry.showcaseSegments.length>1).length;
assert.deepEqual(data.video.inventory,{
  distinctArcana:149,
  timestampedDemonstrations:149+chargedCount,
  chargedDemonstrations:chargedCount,
  auditedAt:'2026-08-08',
  authority:'Uploader timestamps cross-checked against every on-screen title card',
},'the dataset must publish auditable Gate 1 inventory provenance');
assert.equal(chargedCount,48,'48 Arcana must record a separate charged demonstration');
assert.match(html,/Gate 1 complete-video inventory:/,'the checklist must explain the inventory-only records');
assert.match(html,/149 of 149 Arcana inventoried/,'progress reporting must separate inventory coverage from source-first stages');
assert.match(html,/inventoryOnly\?'disabled':''/,'inventory-only records must not offer source-first checkboxes yet');
assert.match(html,/sourceEntries=data\.entries\.filter\(entry=>entry\.status!=='inventory-only'\)/,'inventory-only records must stay out of the source-first metrics');

const requiredUi=[
  'playsinline preload="metadata"','wol.arcanaChecklist.v1','Export progress','Import progress','Reset progress',
  'Copy implementation brief','element-filter','category-filter','lineage-filter','status-filter','sort-order',
  'previous-clip','next-clip','full-showcase','playback-speed','video.addEventListener(\'timeupdate\'',
];
for(const marker of requiredUi)assert.ok(uiSource.includes(marker),`missing checklist UI behavior: ${marker}`);
assert.ok(uiSource.includes('<article class="arcana-card"'),'entries must render as semantic article elements');
assert.match(uiSource,/Documented online reference/,'cards must render the attached online reference layer');
assert.match(uiSource,/entry\.onlineReferenceMarkdown/,'online reference text must participate in the catalog UI');
assert.ok(uiSource.includes('about-large-files-on-github')&&uiSource.includes('github-pages-limits'),'page must retain GitHub media-limit references');

const indexHtml=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.ok(indexHtml.includes('href="archive/index.html"'),'the root launcher must route research tooling through Archive');
const archiveHtml=fs.readFileSync(path.join(root,'archive','index.html'),'utf8');
assert.ok(archiveHtml.includes('../tools/wizard-of-legend-arcana-checklist.html'),'Archive must link directly to the active Arcana research tool');

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
