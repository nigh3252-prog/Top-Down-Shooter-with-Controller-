import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  buildReviewIndex,
  captureRevision,
  evaluateAcceptance,
  expandCaptureStages,
  observedMetrics,
  renderReviewIndexHtml,
  resolveCaptureOutputDirectory,
  resolveCaptureJob,
  validateCaptureManifest,
  validateComparisonProbe,
} from '../scripts/capture-arcana.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'scripts','arcana-capture-manifest.json'),'utf8'));
const script=fs.readFileSync(path.join(root,'scripts','capture-arcana.mjs'),'utf8');
const gitignore=fs.readFileSync(path.join(root,'.gitignore'),'utf8').replace(/\\/g,'/');

assert.equal(manifest.schemaVersion,2,'capture manifest must use the scenario/action schema');
assert.equal(validateCaptureManifest(manifest),true);
assert.equal(manifest.sourceVideo,'media/wizard-of-legend/wizard-of-legend-arcana-showcase-480p.mp4');
assert.match(gitignore,/^artifacts\/arcana-capture\/$/m,'generated review artifacts must remain ignored');
assert.match(captureRevision().commit||'',/^[0-9a-f]{40}$/,'capture artifacts must record the checked-out commit even when child git processes are sandboxed');
assert.deepEqual(manifest.batches['session-five'],[
  {abilityId:'WHIRLING-TORNADO',scenario:'source-base'},
  {abilityId:'WATER-PRISON',scenario:'source-base'},
  {abilityId:'WATER-PRISON',scenario:'stacked'},
  {abilityId:'WATER-PRISON',scenario:'miss-wall-recharge'},
  {abilityId:'WATER-PRISON',scenario:'target-death'},
  {abilityId:'HOMING-FLARES',scenario:'source-base'},
  {abilityId:'HOMING-FLARES',scenario:'projectile-intercept'},
  {abilityId:'HOMING-FLARES',scenario:'empty-expiry'},
  {abilityId:'HOMING-FLARES',scenario:'multi-target'},
  {abilityId:'BOLT-RAIL',scenario:'source-base'},
  {abilityId:'BOLT-RAIL',scenario:'through-wall'},
  {abilityId:'BOLT-RAIL',scenario:'fifth-beat-miss'},
  {abilityId:'BOLT-RAIL',scenario:'multi-target'},
  {abilityId:'VOLT-DISC',scenario:'source-base'},
  {abilityId:'VOLT-DISC',scenario:'live-aim'},
  {abilityId:'VOLT-DISC',scenario:'combo-timeout'},
  {abilityId:'VOLT-DISC',scenario:'wall-contact'},
  {abilityId:'VOLT-DISC',scenario:'range-expiration'},
  {abilityId:'VOLT-DISC',scenario:'slot-lock'},
],'session-five must be risk ordered and include every declared acceptance scenario');
const nextTwentyIds=['ICE-DAGGER','RIP-TIDE','AQUA-ARC','CHAOS-CRUSHER','SEARING-RUSH','FLARE-RUSH','IGNITION-RUSH','AIR-BURST','GUST-BURST','RAZOR-BURST','SPIKE-TRACK','TOXIC-TRAP','SNARE-TRACK','THUNDER-LINE','CIRCUIT-LINE','SHOCK-LINE','WAVE-FRONT','FROST-FEINT','FROST-WING','CHAOTIC-RIFT'];
assert.deepEqual(manifest.batches['next-twenty'].map(job=>job.abilityId),nextTwentyIds,'aggregate next-twenty capture must retain source order');
assert.deepEqual(manifest.batchCoverage['next-twenty'].abilities,nextTwentyIds,'declarative coverage must guard the complete review batch');
assert.deepEqual(Object.keys(manifest.acceptanceProfiles).filter(id=>nextTwentyIds.includes(id)),nextTwentyIds,'all next-twenty abilities must declare required semantic acceptance profiles');
for(const abilityId of nextTwentyIds){const profile=manifest.acceptanceProfiles[abilityId];assert.equal(profile.mode,'required');assert.ok(profile.checks.length>=2);assert.ok(profile.checks.every(check=>check.metric.startsWith('captureDerived.')));assert.ok(profile.checks.some(check=>check.metric==='captureDerived.cleanedUp'),`${abilityId} capture must gate final cleanup`);}
for(const abilityId of nextTwentyIds.slice(4,19).filter(id=>id!=='CIRCUIT-LINE'))assert.ok(manifest.acceptanceProfiles[abilityId].checks.some(check=>check.metric==='captureDerived.dashDistancePlayerFootprints'),`${abilityId} must capture actor-relative shared-dash travel`);
assert.ok(manifest.acceptanceProfiles['FLARE-RUSH'].checks.some(check=>check.metric==='captureDerived.eventDeclaredCounts.payload-emitted'&&check.value===3));
assert.ok(manifest.acceptanceProfiles['FROST-WING'].checks.some(check=>check.metric==='captureDerived.resolvedProjectiles'&&check.value===4));
assert.ok(manifest.acceptanceProfiles['TOXIC-TRAP'].checks.some(check=>check.metric==='captureDerived.eventCounts.status-tick'&&check.value===5));
assert.equal(manifest.abilities['SNARE-TRACK'].scenarios['source-base'].reset.fixtures.targets[0].forward,-6,'Snare capture must measure one center-lane contact after the outer vines have visibly diverged');
const archetypeSamplerIds=['FLAME-FUSION','RAPID-FIRE-AGENT','WARD-OF-FLAMES','MENTIS-IMPERIUM','HEROIC-LEAP','CYCLONE-BOOMERANG','EARTHEN-AEGIS','BALL-LIGHTNING','AQUA-BEAM','ARCANE-INTERVENTION'];
assert.deepEqual(manifest.batches['archetype-sampler'].map(job=>job.abilityId),archetypeSamplerIds,'archetype sampler capture must retain showcase source order');
assert.deepEqual(manifest.batchCoverage['archetype-sampler'].abilities,archetypeSamplerIds,'declarative coverage must guard the complete archetype sampler');
assert.deepEqual(Object.keys(manifest.acceptanceProfiles).filter(id=>archetypeSamplerIds.includes(id)),archetypeSamplerIds,'all archetype sampler abilities must declare required semantic acceptance profiles');
for(const abilityId of archetypeSamplerIds){
  const profile=manifest.acceptanceProfiles[abilityId];
  assert.equal(profile.mode,'required');
  assert.ok(profile.checks.length>=3,`${abilityId} must gate its defining source contract`);
  assert.ok(profile.checks.every(check=>check.metric.startsWith('captureDerived.')));
  assert.ok(profile.checks.some(check=>check.metric==='captureDerived.cleanedUp'),`${abilityId} capture must gate final cleanup`);
}
assert.ok(manifest.acceptanceProfiles['FLAME-FUSION'].checks.some(check=>check.metric==='captureDerived.eventDeclaredCounts.flame-fusion-transformed'&&check.value===5),'Flame Fusion must gate the five-child transformation');
assert.ok(manifest.acceptanceProfiles['EARTHEN-AEGIS'].checks.some(check=>check.metric==='captureDerived.eventDeclaredCounts.aegis-created'&&check.value===8),'Earthen Aegis must gate the eight-shield base formation');
assert.ok(manifest.acceptanceProfiles['BALL-LIGHTNING'].checks.some(check=>check.metric==='captureDerived.eventCounts.ball-hit'&&check.value===10),'Ball Lightning source capture must use a full ten-pulse release');
assert.ok(manifest.acceptanceProfiles['AQUA-BEAM'].checks.some(check=>check.metric==='captureDerived.eventCounts.aqua-beam-tick'&&check.value===10),'Aqua Beam source capture must consume all ten stored charges');
assert.deepEqual(expandCaptureStages('all'),['contract','source','style']);
assert.deepEqual(expandCaptureStages('motion,style,motion'),['motion','style']);

const auditedStarts={
  'HOMING-FLARES':[280.4,282.5],
  'WHIRLING-TORNADO':[420.8,421.7],
  'WATER-PRISON':[1051.83,1060],
  'BOLT-RAIL':[53.3,53.95],
  'VOLT-DISC':[58.2,59.1],
  'ICE-DAGGER':[64,65.2],'RIP-TIDE':[70.2,71.7],'AQUA-ARC':[75,76.2],'CHAOS-CRUSHER':[80,81.5],
  'SEARING-RUSH':[91,92.5],'FLARE-RUSH':[99.5,101.5],'IGNITION-RUSH':[104,107.3333333333],'AIR-BURST':[110,111.5],
  'GUST-BURST':[114.7,116.7],'RAZOR-BURST':[124.8,126.3],'SPIKE-TRACK':[132.3,133.8],'TOXIC-TRAP':[139.4,143.7333333333],
  'SNARE-TRACK':[147.4,149.9],'THUNDER-LINE':[151.4,153.4],'CIRCUIT-LINE':[157.9,163.5666666667],'SHOCK-LINE':[165.9,167.4],
  'WAVE-FRONT':[168.4,170.4],'FROST-FEINT':[180,182.25],'FROST-WING':[183,185],'CHAOTIC-RIFT':[195.2,196.2],
  'FLAME-FUSION':[338.55,339.65],'RAPID-FIRE-AGENT':[378.35,389.10],'WARD-OF-FLAMES':[392.45,400.45],
  'MENTIS-IMPERIUM':[434.15,436.90],'HEROIC-LEAP':[442.85,444.25],'CYCLONE-BOOMERANG':[496.40,497.90],
  'EARTHEN-AEGIS':[600.95,605.55],'BALL-LIGHTNING':[896.40,901.00],'AQUA-BEAM':[1120.70,1122.70],
  'ARCANE-INTERVENTION':[1206.60,1211.35],
};
for(const [abilityId,ability] of Object.entries(manifest.abilities)){
  for(const [scenarioName,scenario] of Object.entries(ability.scenarios)){
    const stages=Object.keys(scenario.stages).sort();
    if(abilityId==='DRAGON-ARC')assert.deepEqual(stages,['contract','motion','source','style']);
    else assert.deepEqual(stages,['contract','source','style'],`${abilityId}/${scenarioName} must use the common three-gate workflow`);
    assert.ok(scenario.actions.every((action,index)=>Number.isInteger(action.frame)&&(!index||action.frame>=scenario.actions[index-1].frame)));
    assert.ok(scenario.checkpointFrames.every(frame=>Number.isInteger(frame)&&frame>0&&frame<=scenario.durationFrames));
  }
  if(abilityId!=='DRAGON-ARC')assert.deepEqual([ability.scenarios['source-base'].sourceClip.timelineStart,ability.scenarios['source-base'].sourceClip.timelineEnd],auditedStarts[abilityId],`${abilityId} must retain its frame-audited base window separately from broad bounds`);
}

const dragon=resolveCaptureJob(manifest,{id:'DRAGON-ARC',stage:'motion'});
assert.equal(dragon.scenarioName,'source-base');assert.equal(dragon.stage.stage,'motion');assert.equal(dragon.stage.renderMode,'proxy');
assert.deepEqual(dragon.stage.checkpoints,[.25,.5,.75,1,1.25]);assert.equal(dragon.query.layout,'source-line');
const stacked=resolveCaptureJob(manifest,{id:'WATER-PRISON',scenario:'stacked',stage:'contract'});
assert.deepEqual(stacked.stage.actions.map(action=>action.frame),[0,6]);assert.equal(stacked.stage.reset.fixtures.targets[0].id,'prison-stack-target');
const wall=resolveCaptureJob(manifest,{id:'BOLT-RAIL',scenario:'through-wall',stage:'source'});
assert.equal(wall.stage.reset.fixtures.walls.length,1);assert.equal(wall.stage.sourceClip.compare,false);
const resource=resolveCaptureJob(manifest,{id:'WATER-PRISON',scenario:'miss-wall-recharge',stage:'contract'});
assert.equal(resource.stage.reset.fixtures.resources[0].key,'waterAmmo');assert.ok(resource.stage.actions.some(action=>action.op==='setAim'));
const delayed=resolveCaptureJob(manifest,{id:'HOMING-FLARES',scenario:'source-base',stage:'contract'});
assert.equal(delayed.stage.reset.fixtures.targets[0].spawnFrame,60,'delayed target fixtures must be expressed in deterministic simulation frames');
const deck=resolveCaptureJob(manifest,{id:'VOLT-DISC',scenario:'slot-lock',stage:'contract'});
assert.equal(deck.stage.reset.fixtures.deck.primaryArcanaId,'VOLT-DISC');assert.deepEqual(deck.stage.actions.map(action=>action.op),['deckPlay','deckPlay','deckPlay','deckPlay']);
assert.ok(resolveCaptureJob(manifest,{id:'BOLT-RAIL',scenario:'fifth-beat-miss',stage:'contract'}).stage.actions.some(action=>action.op==='release'));
const iceContract=resolveCaptureJob(manifest,{id:'ICE-DAGGER',stage:'contract'}).stage.acceptance;
assert.equal(iceContract.mode,'required');assert.ok(iceContract.checks.some(check=>check.metric==='captureDerived.cleanedUp'),'ability-level profile must override stale/weaker inline checks');
assert.equal(resolveCaptureJob(manifest,{id:'CHAOTIC-RIFT',stage:'style'}).stage.acceptance.checks[0].metric,'captureDerived.eventCounts.rift-entered');
const ballSampler=resolveCaptureJob(manifest,{id:'BALL-LIGHTNING',stage:'contract'});
assert.equal(ballSampler.runtimeId,'wizardArcaneTypes');assert.deepEqual(ballSampler.stage.actions.map(action=>action.op),['hold','release']);assert.equal(ballSampler.stage.actions[1].frame,90);
const aquaSampler=resolveCaptureJob(manifest,{id:'AQUA-BEAM',stage:'source'});
assert.equal(aquaSampler.stage.reset.fixtures.resources[0].key,'aquaCharges');assert.equal(aquaSampler.stage.reset.fixtures.resources[0].value,10);assert.ok(aquaSampler.stage.actions.some(action=>action.op==='setAim'));
const interventionSampler=resolveCaptureJob(manifest,{id:'ARCANE-INTERVENTION',stage:'style'});
assert.equal(interventionSampler.stage.actions.find(action=>action.op==='activateIntervention')?.frame,114,'Arcane Intervention manual trigger must match the demonstrated roughly 1.9-second field hold');
assert.equal(resolveCaptureJob(manifest,{id:'RAPID-FIRE-AGENT',stage:'style'}).stage.durationFrames,645,'Rapid Fire Agent capture must include its full ten-second lifetime and last projectile cleanup');
assert.equal(resolveCaptureJob(manifest,{id:'WARD-OF-FLAMES',stage:'style'}).stage.durationFrames,480,'Ward capture must include all eight pulses and expiry cleanup');
assert.throws(()=>resolveCaptureJob(manifest,{id:'VOLT-DISC',stage:'motion'}),/Unknown .* stage motion/,'motion alias must remain Dragon-only');

for(const marker of [
  '--batch session-five','--batch next-twenty','--batch archetype-sampler','--scenario <id>','--stage all','traceSnapshotsEqual','review-index.json','review-index.html','batchCoverage',
  'screenshotExactPassed','Exact checkpoint pixels:',
  'api.act||api.perform','durationFrames','checkpointFrames','telemetryAdapter','semanticEvents','abilityContracts',
  'telemetryRun1','telemetryRun2','captureRevision','manifestSha256','runnerSha256',
  'contact-sheet.png','comparison.mp4','metrics.json','FFMPEG_PATH','FFPROBE_PATH','ARCANA_CAPTURE_BROWSER',
])assert.ok(script.includes(marker),`capture runner is missing v2 behavior: ${marker}`);
assert.doesNotMatch(script,/from ['"](?:playwright|puppeteer)/,'capture runner must remain dependency-free');
assert.match(script,/const deterministicPassed=run1\.traceHashes\.length===run2\.traceHashes\.length&&traceSnapshotsEqual\.every\(Boolean\);/,'identical semantic traces, not fragile cross-machine pixel equality, must gate determinism');

const captureArtifactRoot=path.resolve(root,manifest.outputRoot);
assert.equal(
  resolveCaptureOutputDirectory({manifestOutputRoot:manifest.outputRoot,requestedOutput:'artifacts/arcana-capture/manual/ice-dagger'}),
  path.join(captureArtifactRoot,'manual','ice-dagger'),
  'custom single-capture output may target only a concrete descendant of the capture artifact root',
);
for(const unsafeOutput of ['src','media','artifacts/arcana-capture','../outside']){
  assert.throws(
    ()=>resolveCaptureOutputDirectory({manifestOutputRoot:manifest.outputRoot,requestedOutput:unsafeOutput}),
    /Refusing to replace files outside a concrete capture-artifact subdirectory/,
    `capture cleanup must refuse unsafe --output ${unsafeOutput}`,
  );
}

const genericDash=observedMetrics([
  {frame:0,time:0,snapshot:{playerFootprint:2.1,player:{hp:100,targetable:true},captureDummies:[{id:'dash-target',hp:100}],runtimes:[{id:'wizardNextTwentyDash',snapshot:{semanticEvents:[{serial:1,time:0,kind:'dash-started',arcanaId:'FLARE-RUSH',stableId:'flare-1',origin:{x:0,z:0}}],effects:[{type:'dashMotion',arcanaId:'FLARE-RUSH',stableId:'flare-1'}]}}]}},
  {frame:30,time:.5,snapshot:{playerFootprint:2.1,player:{hp:98,targetable:false},captureDummies:[{id:'dash-target',hp:90}],runtimes:[{id:'wizardNextTwentyDash',snapshot:{semanticEvents:[{serial:1,time:0,kind:'dash-started',arcanaId:'FLARE-RUSH',stableId:'flare-1',origin:{x:0,z:0}},{serial:2,time:.25,kind:'payload-emitted',arcanaId:'FLARE-RUSH',stableId:'flare-1',count:3},{serial:3,time:.25,kind:'payload-finalized',arcanaId:'FLARE-RUSH',stableId:'flare-1',endpoint:{x:8.4,z:0}},{serial:4,time:.48,kind:'dash-complete',arcanaId:'FLARE-RUSH',stableId:'flare-1',distance:8.4,blocked:false,endpoint:{x:8.4,z:0}},{serial:5,time:.49,kind:'projectile-hit',arcanaId:'FLARE-RUSH',stableId:'flare-1:01',damage:10}],effects:[]}}]}},
],{telemetryAdapter:'generic',runtimeId:'wizardNextTwentyDash',abilityId:'FLARE-RUSH'}).captureDerived;
assert.deepEqual({declared:genericDash.eventDeclaredCounts['payload-emitted'],damage:genericDash.eventDamage['projectile-hit'],target:genericDash.targetDamage['dash-target'],resolved:genericDash.resolvedProjectiles},{declared:3,damage:10,target:10,resolved:1});
assert.equal(genericDash.dashDistancePlayerFootprints,4);assert.equal(genericDash.payloadEndpointError,0);assert.equal(genericDash.playerHpLoss,2);assert.equal(genericDash.untargetableFrames,1);assert.equal(genericDash.cleanedUp,true);

const validProbe={streams:[{codec_name:'h264',pix_fmt:'yuv420p',width:1280,height:360,r_frame_rate:'60/1',avg_frame_rate:'60/1',duration:'0.900000',nb_frames:'54',nb_read_frames:'54'}],format:{format_name:'mov,mp4,m4a,3gp,3g2,mj2',duration:'0.900000'}};
assert.equal(validateComparisonProbe(validProbe,{fps:60,frameCount:54,duration:.9,width:1280,height:360}).passed,true);

const dragonEffects=Array.from({length:8},(_,emissionIndex)=>({type:'dragonProjectile',emissionIndex,emittedAt:.03+emissionIndex*.1}));
const dragonMeasured=observedMetrics([{snapshot:{playerFootprint:2,projectiles:dragonEffects.map((effect,index)=>({...effect,position:{x:index,z:index%2?-1:1},tangent:{x:1,z:index%2?.4:-.4}})),runtimes:[{id:'wizardRebuiltArcana',snapshot:{dragonArc:{wavelengthPlayerDiameters:9,adjacentPhaseDegrees:180,everyOtherPhaseDifferenceDegrees:0},effects:dragonEffects}}]}}]);
assert.equal(dragonMeasured.captureDerived.emittedProjectiles,8);assert.ok(Math.abs(dragonMeasured.captureDerived.emissionIntervalSeconds-.1)<1e-12);

const homingTrace=[{frame:0,snapshot:{runtimes:[{id:'wizardRebuiltArcana',snapshot:{abilityContracts:{homingFlares:{count:7,storageDuration:4,orbitDirection:'clockwise'}},semanticEvents:[{seq:1,time:0,arcanaId:'HOMING-FLARES',event:'cast',stableId:'cast-1'}],effects:[{type:'homingFlares',arcanaId:'HOMING-FLARES',stableId:'cast-1',flares:Array.from({length:7},(_,index)=>({id:`flare-${index}`,state:'stored'}))}]}}]}} ,{frame:1,snapshot:{runtimes:[{id:'wizardRebuiltArcana',snapshot:{abilityContracts:{homingFlares:{count:7,storageDuration:4,orbitDirection:'clockwise'}},semanticEvents:[{seq:1,time:0,arcanaId:'HOMING-FLARES',event:'cast',stableId:'cast-1'},{seq:2,time:.1,arcanaId:'HOMING-FLARES',event:'flare-hit',stableId:'flare-0',damage:7}],effects:[]}}]}}];
const homing=observedMetrics(homingTrace,{telemetryAdapter:'homing-flares',runtimeId:'wizardRebuiltArcana',abilityId:'HOMING-FLARES'});
assert.deepEqual({created:homing.captureDerived.createdFlares,stored:homing.captureDerived.maximumStoredFlares,clockwise:homing.captureDerived.clockwiseOrbit},{created:7,stored:7,clockwise:true});
const expiryEvents=[{seq:1,time:0,arcanaId:'HOMING-FLARES',event:'cast',stableId:'cast-expiry'},...Array.from({length:7},(_,index)=>({seq:index+2,time:4,arcanaId:'HOMING-FLARES',event:'flare-expired',stableId:`cast-expiry:flare:${index+1}`,reason:'storage-duration',storageAge:4}))];
const expiry=observedMetrics([{frame:240,time:4,snapshot:{runtimes:[{id:'wizardRebuiltArcana',snapshot:{abilityContracts:{homingFlares:{count:7,storageDuration:4,orbitDirection:'clockwise'}},semanticEvents:expiryEvents,effects:[]}}]}}],{telemetryAdapter:'homing-flares',runtimeId:'wizardRebuiltArcana',abilityId:'HOMING-FLARES'}).captureDerived;
assert.equal(expiry.storageLifetimeSeconds,4,'Homing storage lifetime must be measured from cast-to-expiry event times');assert.equal(expiry.reportedStorageAgeSeconds,4);

const voltEvents=[
  {serial:1,time:0,kind:'volt-disc-press',arcanaId:'VOLT-DISC',stableId:'VOLT-DISC:0001:disc:01',press:1,comboSerial:1,direction:{x:1,z:0}},
  {serial:2,time:.2,kind:'volt-disc-carrier-hit',arcanaId:'VOLT-DISC',stableId:'VOLT-DISC:0001:disc:01',press:1,comboSerial:1,damage:9},
  {serial:3,time:.2,kind:'volt-disc-contact-event',arcanaId:'VOLT-DISC',stableId:'VOLT-DISC:0001:disc:01:contact',press:1,comboSerial:1,damage:0},
];
const volt=observedMetrics([{frame:12,snapshot:{runtimes:[{id:'wizardNextSource',snapshot:{semanticEvents:voltEvents,effects:[]}}]}}],{telemetryAdapter:'volt-disc',runtimeId:'wizardNextSource',abilityId:'VOLT-DISC'});
assert.deepEqual({count:volt.captureDerived.discCount,direct:volt.captureDerived.directDamageEvents,zero:volt.captureDerived.zeroDamageBurstEvents,owned:volt.captureDerived.exactlyOnePayload},{count:1,direct:1,zero:1,owned:true});
const acceptance=evaluateAcceptance({mode:'required',checks:[{id:'discCount',metric:'captureDerived.discCount',op:'exact',value:1},{id:'owned',metric:'captureDerived.exactlyOnePayload',op:'truthy'}]},volt);
assert.equal(acceptance.passed,true);

const tornadoEvents=[
  {seq:1,time:0,arcanaId:'WHIRLING-TORNADO',event:'cast',stableId:'tornado-1'},
  ...[.12,.30,.48,.66].map((time,index)=>({seq:index+2,time,arcanaId:'WHIRLING-TORNADO',event:'tick',stableId:'tornado-1',tick:index+1,damage:8,targetIds:['tornado-inside']})),
  {seq:6,time:.8,arcanaId:'WHIRLING-TORNADO',event:'finisher',stableId:'tornado-1',damage:10,targetIds:['tornado-inside']},
];
const tornadoTrace=[
  {frame:0,time:0,snapshot:{captureDummies:[{id:'tornado-inside',x:1.2,z:0,hp:1000,knockX:0,knockZ:0},{id:'tornado-outside',x:4.2,z:0,hp:1000,knockX:0,knockZ:0}],runtimes:[{id:'wizardRebuiltArcana',snapshot:{semanticEvents:[tornadoEvents[0]],effects:[{type:'whirlingTornado',arcanaId:'WHIRLING-TORNADO',position:{x:0,z:0}}]}}]}},
  {frame:54,time:.9,snapshot:{captureDummies:[{id:'tornado-inside',x:1.2,z:0,hp:958,knockX:1,knockZ:0},{id:'tornado-outside',x:4.2,z:0,hp:1000,knockX:0,knockZ:0}],runtimes:[{id:'wizardRebuiltArcana',snapshot:{semanticEvents:tornadoEvents,effects:[{type:'whirlingTornadoTransient',arcanaId:'WHIRLING-TORNADO',visualKind:'finisher'}]}}]}},
];
const tornado=observedMetrics(tornadoTrace,{telemetryAdapter:'whirling-tornado',runtimeId:'wizardRebuiltArcana',abilityId:'WHIRLING-TORNADO'}).captureDerived;
assert.deepEqual({ticks:tornado.tickCount,timing:tornado.maximumTickTimingErrorSeconds,damage:tornado.insideTargetDamage,outside:tornado.outsideTargetDamage,primaryClean:tornado.primaryCleanedUp,transients:tornado.permittedFinisherTransients},{ticks:4,timing:0,damage:42,outside:0,primaryClean:true,transients:1});

const waterEvents=[
  {seq:1,time:0,arcanaId:'WATER-PRISON',event:'cast',stableId:'water-1'},
  {seq:2,time:.2,arcanaId:'WATER-PRISON',event:'attached',stableId:'water-1',targetId:'water-target',stackCount:1,anchor:{x:3,z:0}},
  {seq:3,time:5.6,arcanaId:'WATER-PRISON',event:'released',stableId:'water-1',targetId:'water-target',reason:'duration'},
];
const waterTrace=[
  {frame:12,time:.2,snapshot:{captureDummies:[{id:'water-target',x:3,z:0,hp:985}],runtimes:[{id:'wizardRebuiltArcana',snapshot:{waterAmmo:1,semanticEvents:waterEvents.slice(0,2),effects:[{type:'waterPrison',arcanaId:'WATER-PRISON',stableId:'water-1',capturedId:'water-target',lock:{x:3,z:0},position:{x:3,z:0}}]}}]}},
  {frame:336,time:5.6,snapshot:{captureDummies:[{id:'water-target',x:3,z:0,hp:960}],runtimes:[{id:'wizardRebuiltArcana',snapshot:{waterAmmo:1,semanticEvents:waterEvents,effects:[]}}]}},
];
const water=observedMetrics(waterTrace,{telemetryAdapter:'water-prison',runtimeId:'wizardRebuiltArcana',abilityId:'WATER-PRISON'}).captureDerived;
assert.ok(Math.abs(water.captureLifetimeSeconds-5.4)<1e-12,'Water lifetime must come from attached/released event times');assert.equal(water.maximumLockDrift,0,'Water lock drift must compare captured target position to its anchor');

const reviewRoot=fs.mkdtempSync(path.join(os.tmpdir(),'arcana-review-index-'));
try{
  const directory=path.join(reviewRoot,'volt-disc','source-base','style');fs.mkdirSync(directory,{recursive:true});
  fs.writeFileSync(path.join(directory,'metrics.json'),JSON.stringify({abilityId:'VOLT-DISC',scenario:'source-base',stage:'style',generatedAt:'2026-07-26T00:00:00Z',revision:{commit:'1234567890abcdef',dirty:false},sourceClip:{start:58,end:63,timelineStart:58.2,timelineEnd:59.1},deterministic:{passed:true},acceptance:{contractPassed:true},media:{comparison:{passed:true}},artifacts:{contactSheet:'contact-sheet.png',comparisonVideo:'comparison.mp4',telemetryRun1:'telemetry/run-1.json',telemetryRun2:'telemetry/run-2.json'}}));
  const index=buildReviewIndex(reviewRoot);assert.equal(index.entries.length,1);assert.equal(index.entries[0].comparisonVideo,'volt-disc/source-base/style/comparison.mp4');assert.equal(index.entries[0].telemetryRun1,'volt-disc/source-base/style/telemetry/run-1.json');assert.equal(index.abilities[0].scenarios[0].stages.style.stage,'style');
  const html=renderReviewIndexHtml(index);assert.match(html,/VOLT-DISC/);assert.match(html,/Source render/);assert.match(html,/trace 1/);assert.match(html,/<img class="preview"/);assert.match(html,/1234567890ab/);assert.doesNotMatch(html,/Â/);
}finally{fs.rmSync(reviewRoot,{recursive:true,force:true});}

console.log('Arcana capture tooling v2 validation passed.');
