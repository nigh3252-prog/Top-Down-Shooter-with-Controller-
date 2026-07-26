import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {observedMetrics,validateComparisonProbe} from '../scripts/capture-arcana.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'scripts','arcana-capture-manifest.json'),'utf8'));
const script=fs.readFileSync(path.join(root,'scripts','capture-arcana.mjs'),'utf8');
const gitignore=fs.readFileSync(path.join(root,'.gitignore'),'utf8').replace(/\\/g,'/');
const readme=fs.readFileSync(path.join(root,'README.md'),'utf8');

assert.equal(manifest.schemaVersion,1,'capture manifest must be versioned');
assert.equal(manifest.sourceVideo,'media/wizard-of-legend/wizard-of-legend-arcana-showcase-480p.mp4');
assert.equal(manifest.outputRoot,'artifacts/arcana-capture');
assert.match(gitignore,/^artifacts\/arcana-capture\/$/m,'generated capture reviews must stay out of git');
assert.ok(readme.includes('npm run capture:arcana -- --id DRAGON-ARC --stage motion'),'README must document the reproducible Gate 1 command');
assert.ok(readme.includes('FFPROBE_PATH')&&readme.includes('exactly 60 FPS'),'README must document the media validation dependency and guarantee');

const dragon=manifest.abilities['DRAGON-ARC'];
assert.ok(dragon,'Dragon Arc must be registered in the capture manifest');
assert.equal(dragon.route,'enemy-lab.html');
assert.deepEqual(dragon.query,{capture:'1',clean:'1',arcana:'DRAGON-ARC',aim:'right',layout:'source-line',stage:'motion',effects:'0'});
const motion=dragon.stages.motion;
assert.equal(motion.fixedDt,1/60,'capture clock must use an exact 60 Hz step');
assert.deepEqual(motion.checkpoints,[0.25,0.5,0.75,1,1.25],'motion review must use the approved checkpoints');
assert.ok(motion.checkpoints.every((time,index,list)=>time>0&&(index===0||time>list[index-1])),'checkpoints must be positive and increasing');
assert.ok(motion.sourceClip.start<motion.sourceClip.timelineStart&&motion.sourceClip.timelineStart+motion.checkpoints.at(-1)<=motion.sourceClip.end,'source comparison timeline must stay inside the bounded Dragon Arc clip');
assert.equal(motion.reset.rngSeed,4401,'capture effects must use a stable seed');
assert.equal(motion.reset.stage,'motion','Gate 1 capture must select the motion stage explicitly');
assert.equal(motion.reset.effects,false,'Gate 1 capture must explicitly suppress global impact polish');
assert.equal(motion.reset.dummy.layout,'source-line','capture dummy placement must be explicit');
assert.deepEqual(Object.keys(motion.acceptance).sort(),[
  'adjacentPhaseDegrees','emissionIntervalSeconds','everyOtherPhaseToleranceDegrees','fullReleaseSeconds',
  'peakToPeakPlayerFootprints','projectileCount','visibleYawDegrees','wavelengthPlayerFootprints',
].sort(),'manifest must retain the measurable Gate 1 contract');

for(const marker of [
  'window.__abilityCapture','Page.captureScreenshot','Runtime.evaluate','DevToolsActivePort',
  "['EBUSY','EACCES','EPERM','ENOENT']",
  'deterministic','acceptanceResult','captureDerived','specDerived','emissionTimesSeconds','timeline-60fps',
  'contact-sheet.png','comparison.mp4','metrics.json','FFMPEG_PATH','FFPROBE_PATH','ARCANA_CAPTURE_BROWSER',
  'nb_read_frames','validateComparisonProbe','media:{comparison:comparisonMedia}',
])assert.ok(script.includes(marker),`capture runner is missing required behavior: ${marker}`);
assert.doesNotMatch(script,/from ['"](?:playwright|puppeteer)/,'capture runner must remain dependency-free');
assert.doesNotMatch(script,/stop_duration=\./,'FFmpeg durations must retain their leading zero for FFmpeg 8.x');
assert.ok(script.includes('stop_duration=0.1')&&script.includes('stop_duration=0.2'),'comparison padding must use FFmpeg 8.x-compatible decimal syntax');
assert.ok(script.includes("'-frames:v',String(outputFrames)"),'comparison encoding must cap output at the exact expected frame count');
assert.ok(script.includes('frameCount=Math.round(duration/stage.fixedDt);'),'the capture timeline must contain exactly the encoded display frames, without an unused endpoint PNG');
assert.ok(script.includes('/^frame-\\d{4}\\.png$/i'),'timeline regeneration must remove only its own stale numbered PNGs');

const validProbe={
  streams:[{codec_name:'h264',pix_fmt:'yuv420p',width:1280,height:360,r_frame_rate:'60/1',avg_frame_rate:'60/1',duration:'1.250000',nb_frames:'75',nb_read_frames:'75'}],
  format:{format_name:'mov,mp4,m4a,3gp,3g2,mj2',duration:'1.250000'},
};
const validMedia=validateComparisonProbe(validProbe,{fps:60,frameCount:75,duration:1.25,width:1280,height:360});
assert.equal(validMedia.passed,true,'the exact 75-frame 60 FPS comparison contract must pass');
assert.equal(validMedia.actual.frameCount,75);
assert.equal(validMedia.actual.duration,1.25);
const badMedia=validateComparisonProbe({
  ...validProbe,streams:[{...validProbe.streams[0],avg_frame_rate:'30000/1001',nb_frames:'74',nb_read_frames:'74',duration:'1.234000'}],
},{fps:60,frameCount:75,duration:1.25,width:1280,height:360});
assert.equal(badMedia.passed,false,'wrong cadence, frame count, and duration must fail media validation');
assert.equal(badMedia.checks.averageFps.passed,false);
assert.equal(badMedia.checks.frameCount.passed,false);
assert.equal(badMedia.checks.duration.passed,false);

const emissionEffects=Array.from({length:8},(_,emissionIndex)=>({type:'dragonProjectile',emissionIndex,emittedAt:0.03+emissionIndex*0.1}));
const measured=observedMetrics([{
  snapshot:{
    playerFootprint:2,
    projectiles:emissionEffects.map((effect,index)=>({...effect,position:{x:index,z:index%2?-1:1},tangent:{x:1,z:index%2?0.4:-0.4}})),
    runtimes:[{id:'wizardRebuiltArcana',snapshot:{
      dragonArc:{cadence:99,baseReleaseSpan:99,wavelengthPlayerDiameters:9,adjacentPhaseDegrees:180,everyOtherPhaseDifferenceDegrees:0},
      effects:emissionEffects,
    }}],
  },
}]);
assert.equal(measured.captureDerived.emittedProjectiles,8);
assert.ok(Math.abs(measured.captureDerived.emissionIntervalSeconds-0.1)<1e-12,'cadence must be derived from captured emittedAt samples');
assert.ok(Math.abs(measured.captureDerived.fullReleaseSeconds-0.7)<1e-12,'release span must be derived from first/last emittedAt samples');
assert.notEqual(measured.captureDerived.emissionIntervalSeconds,99,'runtime calibration constants must not masquerade as captured cadence');
assert.equal(measured.specDerived.wavelengthPlayerFootprints,9,'sampler telemetry must remain explicitly spec-derived');

console.log('Arcana capture tooling validation passed.');
