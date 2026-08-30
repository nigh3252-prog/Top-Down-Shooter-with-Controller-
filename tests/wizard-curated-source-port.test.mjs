import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GUST_BURST_SOURCE_CFG,RAZOR_BURST_SOURCE_CFG,THUNDER_LINE_SOURCE_ARCANA} from '../src/wizard-curated-dash-source-port.js';
import {CURATED_FIRE_LARIAT,CURATED_FIRE_CHARGE,CURATED_FIRE_BURN} from '../src/wizard-curated-fire-source-port.js';
import {CURATED_AIR_SPEC} from '../src/wizard-curated-air-source-port.js';
import {CURATED_BUBBLE_FALCON_ARC} from '../src/wizard-curated-bubble-falcon-source-port.js';
import {ROCK_N_ROLL_TUNING,EARTH_STOMP_AGENT_TUNING} from '../src/wizard-curated-earth-agent-source-port.js';
import {KNOCKOUT_BOULDER_TUNING,TOXIC_BOLAS_TUNING} from '../src/wizard-curated-earth-projectile-source-port.js';
import {curatedPlayerCenteredRootOffset} from '../src/wizard-vfx-arcana-runtime.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>fs.readFileSync(path.join(root,'src',name),'utf8');

assert.deepEqual(GUST_BURST_SOURCE_CFG,{maxCharges:2,chargeCooldown:3.5,dash:{dist:4.4,time:.22},gather:{at:.05,dmg:5,radius:2.7,lead:1,compress:.3,moveTime:.16},draught:{at:.21,dmg:10,moveTime:.24,gap:1},endpoint:{at:.5,dmg:5,radius:2.4}});
assert.deepEqual(RAZOR_BURST_SOURCE_CFG,{cooldown:5.12,dash:{dist:4.4,time:.22},base:{life:1,hits:5},enhanced:{life:1.5,hits:7},dmg:4,radius:2.1,pull:3.4,minRadius:.35,slow:{mult:.42,time:.9}});
assert.deepEqual({thunder:THUNDER_LINE_SOURCE_ARCANA.thunder,circuit:THUNDER_LINE_SOURCE_ARCANA.circuit},{
  thunder:{id:'thunder',name:'THUNDER LINE',element:'Lightning',type:'Dash',subtype:'Movement',maxCharges:2,cooldown:5,coreDamage:10,burstDamage:10,coreRadius:.85,burstRadius:2.9,burstRadiusEnh:4.6,shockTicks:6,shockTicksEnh:10},
  circuit:{id:'circuit',name:'CIRCUIT LINE',element:'Lightning',type:'Dash',subtype:'Movement',maxCharges:3,cooldown:4,armDelay:1.5,linkRange:7,streamRadius:.62,tickDamage:2,baseHits:6,baseHitsEnh:8},
});
assert.deepEqual(CURATED_FIRE_LARIAT,{cooldown:5.5,slideDistance:2.4,slideTime:.17,damage:26,knockback:20,sweepTime:.34,sweepArc:330*Math.PI/180,sweep2Delay:.3,sweep2Offset:150*Math.PI/180,reach:5.2,reachEnhanced:6.6,lag:2.55,charged:{whips:3,revolutions:3,life:2,reach:6,reachEnhanced:7.4,lag:2.9,hitCooldown:.35}});
assert.deepEqual(CURATED_FIRE_CHARGE,{maxCharges:3,recharge:3.5,dashDistance:3.6,dashTime:.15,dashRadius:1.15,contactDamage:5,fuse:1,blastDamage:25,knockback:25,blastRadius:1.5});
assert.deepEqual(CURATED_FIRE_BURN,{tick:2,interval:.6,duration:3});
assert.deepEqual(CURATED_AIR_SPEC.stormDraft,{name:'Storm Draft',order:68,element:'Air',type:'Signature',subtypes:'Projectile',damage:20,wallDamage:30,wallStun:1.35,knockback:10,charges:2,cooldown:4.5,spawnGap:1.7,speed:9.6,life:1.3,halfWidth:1.35,chargeTime:.62,volleys:4,perVolley:7,volleyGap:.21,rankSpacing:1.6});
assert.deepEqual(CURATED_AIR_SPEC.windAgent,{name:'Whirling Wind Agent',order:75,element:'Air',type:'Standard',subtypes:'Melee, summon',count:2,damage:5,knockback:10,duration:10,cooldown:15,chargeEvery:1,chargeSpeed:15,chargeOvershoot:3,seekRange:11,followSpeed:4.6,leashRange:12,health:3});
assert.equal(CURATED_BUBBLE_FALCON_ARC.bubble.maxCharges,10);assert.equal(CURATED_BUBBLE_FALCON_ARC.bubble.gap,.034);assert.equal(CURATED_BUBBLE_FALCON_ARC.bubble.launch,16.5);assert.equal(CURATED_BUBBLE_FALCON_ARC.falcon.passes,6);assert.equal(CURATED_BUBBLE_FALCON_ARC.falcon.speed,19);
assert.deepEqual(ROCK_N_ROLL_TUNING.base,{count:2,spread:1.75,splay:.13,speed:13.2,range:12,radius:.78,damage:4,tick:.17,knock:4.5,cooldown:1.15});
assert.deepEqual(EARTH_STOMP_AGENT_TUNING,{lifetime:10,stompPeriod:1.1,damage:15,radius:3.3,knock:13,cooldown:15,leapUp:.4,leapDown:.17,windup:.13,follow:3,leash:11,seek:9.5});
assert.deepEqual(KNOCKOUT_BOULDER_TUNING,{name:'KNOCKOUT BOULDER',kind:'STANDARD',cooldown:5,windup:.13,launch:.2,speed:27,range:16,radius:.85,loft:.4,spin:7.5,damage:50,backDamage:25,knockback:9,stun:1,craterLife:3,enhRadius:3.4,enhDamage:25});
assert.deepEqual(TOXIC_BOLAS_TUNING,{name:'TOXIC BOLAS',kind:'SIGNATURE',cooldown:6,speed:13,range:12,damage:35,poisonTicks:5,poisonTick:5,poisonEvery:1,rootTime:5,chargeTime:1.5,charged:{count:7,arc:Math.PI,damage:55,pierce:true,poolRadius:1.55,poolLife:12,poolTick:5,poolEvery:.5}});

assert.deepEqual(curatedPlayerCenteredRootOffset({x:6,z:4},2),{x:-6,z:-4},'2x source roots must scale around the player instead of world zero');
assert.deepEqual(curatedPlayerCenteredRootOffset({x:-3,z:7},1),{x:0,z:0},'native-size source roots must retain the demo world frame');

const sourceFiles=['wizard-curated-basic-source-port.js','wizard-curated-dash-source-port.js','wizard-curated-fire-source-port.js','wizard-curated-air-source-port.js','wizard-curated-bubble-falcon-source-port.js','wizard-curated-earth-agent-source-port.js','wizard-curated-earth-projectile-source-port.js'];
for(const file of sourceFiles){const source=read(file);assert.match(source,/SHA-?256/i,`${file} must retain source lineage`);assert.match(source,/function (?:cast|update)\(/,`${file} must retain copied executable routines`);assert.match(source,/return \{[^}]*root[^}]*cast[^}]*update[^}]*reset[^}]*dispose[^}]*snapshot/s,`${file} must expose its source root and common port lifecycle`);}
const bubbleSource=read('wizard-curated-bubble-falcon-source-port.js');
assert.match(bubbleSource,/__wardenEngineBubbleCount/,'Bubble Barrage must read the Warden Flow bubble-count override');
assert.match(bubbleSource,/override > 0 \? override : charges\.bubble/,'Bubble Barrage must use the explicit count instead of the copied charge count');
assert.match(bubbleSource,/override <= 0 && n <= 0/,'only ordinary Bubble Barrage casts should fail when no source charges remain');
assert.match(bubbleSource,/__wardenEngineGeneratedJet===true/,'the generated third Jet must launch Blurring Falconry without consuming its ordinary source charge');
const earthAgentSource=read('wizard-curated-earth-agent-source-port.js');
assert.match(earthAgentSource,/finalSaw: i === config\.count - 1/,'Rock N Roll must identify its final saw');
assert.match(earthAgentSource,/finalHitTargets: new Set\(\)/,'Rock N Roll must keep a per-target final-hit ledger');
assert.match(earthAgentSource,/finalHit: detail\.finalHit === true/,'Rock N Roll must preserve final-hit metadata in its callback event');
assert.match(earthAgentSource,/charged: saw\.charged, finalHit \}/,'Rock N Roll must pass the final-hit marker through its damage event');
console.log('Curated demo source constants, lineage, and port lifecycle passed');
