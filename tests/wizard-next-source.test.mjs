import assert from 'node:assert/strict';
import { WIZARD_NEXT_SOURCE_CARDS } from '../src/wizard-next-source-cards.js';
import {
  EARTH_KNUCKLES_BEATS,
  BLADED_VINE_BEATS,
  STONE_SHOT_BEATS,
  SPARK_CONTACT_BEATS,
  earthKnucklesBeatSpec,
  bladedVineBeatSpec,
  stoneShotProjectileSpec,
  sparkContactBeatSpec,
  pointInForwardStrip,
  pointInForwardArc,
  safeAdvanceDistance,
} from '../src/wizard-next-source-runtime.js';
import { scaleWizardArcanaDamage } from '../src/wizard-arcana-damage-scaler.js';

assert.equal(WIZARD_NEXT_SOURCE_CARDS.length,4);
assert.deepEqual(WIZARD_NEXT_SOURCE_CARDS.map(card=>card.arcanaId),[
  'EARTH-KNUCKLES','BLADED-VINE','STONE-SHOT','SPARK-CONTACT',
]);
assert.ok(WIZARD_NEXT_SOURCE_CARDS.every(card=>card.sourceGame==='Wizard of Legend'&&card.type==='ability'));

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

console.log('wizard next source abilities tests passed');
