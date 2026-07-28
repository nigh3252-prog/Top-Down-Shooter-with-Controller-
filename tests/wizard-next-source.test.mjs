import assert from 'node:assert/strict';
import { WIZARD_NEXT_SOURCE_CARDS } from '../src/wizard-next-source-cards.js';
import {
  EARTH_KNUCKLES_BEATS,
  BLADED_VINE_BEATS,
  STONE_SHOT_BEATS,
  SPARK_CONTACT_BEATS,
  BOLT_RAIL_BEATS,
  VOLT_DISC_BEATS,
  VOLT_DISC_COMBO,
  earthKnucklesBeatSpec,
  bladedVineBeatSpec,
  stoneShotProjectileSpec,
  sparkContactBeatSpec,
  boltRailStreamSpec,
  voltDiscProjectileSpec,
  sampleBoltRailStream,
  normalizeWizardVisualMode,
  pointInForwardStrip,
  pointInForwardArc,
  safeAdvanceDistance,
} from '../src/wizard-next-source-runtime.js';
import { scaleWizardArcanaDamage } from '../src/wizard-arcana-damage-scaler.js';

assert.equal(WIZARD_NEXT_SOURCE_CARDS.length,6);
assert.deepEqual(WIZARD_NEXT_SOURCE_CARDS.map(card=>card.arcanaId),[
  'EARTH-KNUCKLES','BLADED-VINE','STONE-SHOT','SPARK-CONTACT','BOLT-RAIL','VOLT-DISC',
]);
assert.ok(WIZARD_NEXT_SOURCE_CARDS.every(card=>card.sourceGame==='Wizard of Legend'&&card.type==='ability'));
const voltCard=WIZARD_NEXT_SOURCE_CARDS.find(card=>card.arcanaId==='VOLT-DISC');
assert.deepEqual(voltCard.manualSequence,{presses:3,timeout:.9,label:'DISC'});

assert.equal(EARTH_KNUCKLES_BEATS.length,2);
assert.deepEqual(EARTH_KNUCKLES_BEATS.map(beat=>beat.damage),[16,18]);
const earthOne=earthKnucklesBeatSpec({beat:1});
const earthTwo=earthKnucklesBeatSpec({beat:2});
const earthEnhanced=earthKnucklesBeatSpec({enhanced:true});
assert.ok(earthTwo.damage>earthOne.damage&&earthTwo.push>earthOne.push);
assert.equal(earthEnhanced.damage,28);
assert.ok(earthEnhanced.reach>earthTwo.reach&&earthEnhanced.scale>earthTwo.scale);

assert.deepEqual(BLADED_VINE_BEATS.map(beat=>beat.damage),[7,7,15]);
const vineOne=bladedVineBeatSpec({beat:1});
const vineFinisher=bladedVineBeatSpec({beat:3});
const vineEnhanced=bladedVineBeatSpec({beat:3,enhanced:true});
assert.equal(vineOne.strands,1);
assert.equal(vineFinisher.strands,3);
assert.equal(vineFinisher.damage,15,'three visible strands remain one logical 15-damage hit');
assert.equal(vineEnhanced.enhancedEmissions,3);
assert.equal(vineEnhanced.enhancedDamage,9);
assert.ok(vineFinisher.range>vineOne.range&&vineFinisher.halfWidth>vineOne.halfWidth);

assert.deepEqual(STONE_SHOT_BEATS.map(beat=>beat.damage),[12,12,15]);
const stoneOne=stoneShotProjectileSpec({beat:1});
const stoneThree=stoneShotProjectileSpec({beat:3});
const stoneEnhancedOne=stoneShotProjectileSpec({beat:1,enhanced:true});
const stoneEnhancedThree=stoneShotProjectileSpec({beat:3,enhanced:true});
assert.equal(stoneOne.boulder,false);
assert.equal(stoneThree.boulder,true);
assert.ok(stoneThree.radius>stoneOne.radius&&stoneThree.push>stoneOne.push);
assert.equal(stoneEnhancedOne.enhancedShotCount,2);
assert.equal(stoneEnhancedOne.enhancedDamage,8);
assert.equal(stoneEnhancedThree.enhancedShotCount,1);
assert.equal(stoneEnhancedThree.damage,15);

assert.deepEqual(SPARK_CONTACT_BEATS.map(beat=>beat.damage),[6,7,8,9]);
const sparkOne=sparkContactBeatSpec({beat:1});
const sparkFour=sparkContactBeatSpec({beat:4});
const sparkEnhanced=sparkContactBeatSpec({beat:4,enhanced:true});
assert.equal(sparkOne.overlay,null);
assert.equal(sparkFour.overlay.damage,10);
assert.equal(sparkFour.overlay.shock,false);
assert.equal(sparkEnhanced.overlay.shock,true);
assert.ok(sparkFour.range>sparkOne.range);
assert.equal(SPARK_CONTACT_BEATS.length+1,5,'four motions create five potential damage events');

assert.equal(BOLT_RAIL_BEATS.length,5);
assert.deepEqual(BOLT_RAIL_BEATS.map(beat=>beat.damage),[5,5,5,5,5]);
const boltOne=boltRailStreamSpec({beat:1});
const boltFive=boltRailStreamSpec({beat:5});
const boltEnhanced=boltRailStreamSpec({beat:5,enhanced:true});
assert.equal(boltOne.finisher,false);
assert.equal(boltFive.finisher,true);
assert.equal(boltFive.burst.damage,10);
assert.equal(boltFive.ignoresWorldCollision,true);
assert.equal(boltEnhanced.burst.chains,true);
const sampledBolt=sampleBoltRailStream({beat:3,length:2.5});
assert.equal(sampledBolt.main.length,10);assert.equal(sampledBolt.branches.length,4);
assert.equal(sampledBolt.main[0].z,0);assert.equal(sampledBolt.main.at(-1).z,2.5);
assert.ok(sampledBolt.branches.every(branch=>branch.length===3&&branch[0].z<branch.at(-1).z),'Bolt Rail branches must fork forward from one deterministic main carrier');

assert.equal(VOLT_DISC_BEATS.length,3);
assert.deepEqual(VOLT_DISC_BEATS.map(beat=>beat.damage),[9,9,9]);
assert.deepEqual(VOLT_DISC_BEATS.map(beat=>beat.press),[1,2,3],'Volt Disc is one projectile per physical press, not an automatic timed string');
assert.deepEqual(VOLT_DISC_COMBO,{presses:3,rollingTimeout:.9});
const volt=voltDiscProjectileSpec();
const voltEnhanced=voltDiscProjectileSpec({enhanced:true});
assert.equal(volt.damage,9);
assert.equal(volt.missBurstDamage,9);
assert.equal(volt.directBurstDamage,0);
assert.equal(volt.wallFizzleDamage,0);
assert.equal(volt.rollingTimeout,.9);
assert.equal(volt.redirects,false);
assert.equal(voltEnhanced.redirects,true);
assert.ok(volt.range<10&&volt.radius>0,'Volt Disc must remain a short-range hollow carrier');
assert.equal(normalizeWizardVisualMode('motion'),'contract');
assert.equal(normalizeWizardVisualMode('reference'),'source');
assert.equal(normalizeWizardVisualMode('style'),'style');

assert.equal(pointInForwardStrip({originX:0,originZ:0,forwardX:0,forwardZ:1,targetX:0,targetZ:4,range:5,halfWidth:.5}),true);
assert.equal(pointInForwardStrip({originX:0,originZ:0,forwardX:0,forwardZ:1,targetX:1.2,targetZ:4,range:5,halfWidth:.5}),false);
assert.equal(pointInForwardStrip({originX:0,originZ:0,forwardX:0,forwardZ:1,targetX:0,targetZ:-1,range:5,halfWidth:.5}),false);
assert.equal(pointInForwardArc({originX:0,originZ:0,forwardX:0,forwardZ:1,targetX:1,targetZ:2,radius:3,halfAngle:1}),true);
assert.equal(pointInForwardArc({originX:0,originZ:0,forwardX:0,forwardZ:1,targetX:0,targetZ:-2,radius:3,halfAngle:1}),false);

const frame={x:0,z:0,forward:{x:0,z:1}};
assert.equal(safeAdvanceDistance(frame,.5,[]),.5);
const blocked=safeAdvanceDistance(frame,2,[{a:{x:-2,z:1},b:{x:2,z:1}}],.2);
assert.ok(blocked>0&&blocked<1,'self-advance stops before a wall');

assert.equal(scaleWizardArcanaDamage(earthEnhanced.damage,5),140);
assert.equal(scaleWizardArcanaDamage(vineFinisher.damage,2),30);
assert.equal(scaleWizardArcanaDamage(stoneThree.damage,3),45);
assert.equal(scaleWizardArcanaDamage(sparkFour.overlay.damage,4),40);
assert.equal(scaleWizardArcanaDamage(boltFive.burst.damage,3),30);
assert.equal(scaleWizardArcanaDamage(volt.damage,5),45);

console.log('wizard next source abilities tests passed');
