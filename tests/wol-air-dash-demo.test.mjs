// The source-faithful acceptance tests published in
// archive/wizard-of-legend/source-notes/02-gust-razor.md, run against the
// phone-first demo simulation.
import assert from 'node:assert/strict';
import {
  AIR_DASH_DEMO_IDS,AIR_DASH_DEMO_SPECS,AIR_DASH_MOTION,GUST_BURST_SOURCE,RAZOR_BURST_SOURCE,
  createAirDashDemo,defaultDummyLayout,razorTickSchedule,
} from '../src/wol-air-dash-demo.js';

const advance=(demo,seconds,dt=1/120)=>{for(let elapsed=0;elapsed<seconds-1e-9;elapsed+=dt)demo.step(Math.min(dt,seconds-elapsed));};
const eventsOfType=(demo,type)=>demo.events.filter(event=>event.type===type);

// A single dummy parked right on top of the caster so every phase connects.
const soloDemo=(overrides={})=>createAirDashDemo({startX:0,startZ:0,dummies:[{x:.6,z:.4}],...overrides});

// --- Showcase windows -------------------------------------------------------

assert.deepEqual([...GUST_BURST_SOURCE.clip],[114.7,124.7],'Gust Burst keeps its showcase window');
assert.deepEqual([...RAZOR_BURST_SOURCE.clip],[124.8,132.3],'Razor Burst keeps its showcase window');
assert.deepEqual([...AIR_DASH_DEMO_IDS],['GUST-BURST','RAZOR-BURST'],'the demo covers exactly the two requested Arcana');
assert.equal(Object.keys(AIR_DASH_DEMO_SPECS).length,2,'no extra Arcana leak into the demo catalog');
assert.ok(defaultDummyLayout().length>=6,'the demo practises on a field of dummies like the showcase');

// --- Gust Burst -------------------------------------------------------------

// 1. Gust Burst stores a maximum of two magical charges.
{
  const demo=soloDemo();
  assert.equal(demo.state.gustCharges,2,'Gust Burst starts with two charges');
  advance(demo,10);
  assert.equal(demo.state.gustCharges,2,'charges never overfill past two');
}

// 2. Each magical use spends one charge, and the recharge is 3.5s per charge.
{
  const demo=soloDemo();
  demo.select('GUST-BURST');
  assert.equal(demo.cast().ok,true);
  assert.equal(demo.state.gustCharges,1,'one charge is spent per use');
  advance(demo,AIR_DASH_MOTION.duration+.01);
  assert.equal(demo.cast().ok,true,'the second stored charge is immediately usable');
  assert.equal(demo.state.gustCharges,0);
  advance(demo,AIR_DASH_MOTION.duration+.01);
  assert.deepEqual(demo.cast(),{ok:false,reason:'no-charge'},'a third cast has no charge to spend');
  advance(demo,GUST_BURST_SOURCE.rechargeSeconds-AIR_DASH_MOTION.duration);
  assert.equal(demo.state.gustCharges,1,'a charge returns after 3.5 seconds');
  advance(demo,GUST_BURST_SOURCE.rechargeSeconds);
  assert.equal(demo.state.gustCharges,2,'both charges return');
}

// 3. Activating it performs a forward dash.
{
  const demo=soloDemo();
  demo.select('GUST-BURST');
  demo.setMove(1,0);
  demo.cast();
  advance(demo,AIR_DASH_MOTION.duration+.01);
  assert.ok(Math.abs(demo.state.player.x-AIR_DASH_MOTION.distance)<.05,'the caster travels the dash distance');
  assert.equal(demo.state.player.z,0,'the dash follows the input direction');
  assert.equal(demo.state.player.dashing,false,'the dash completes');
}

// 4-9. Two cooperating control events, in order, with the documented damage.
{
  const demo=soloDemo();
  demo.select('GUST-BURST');
  demo.setMove(1,0);
  demo.cast();
  const gather=eventsOfType(demo,'gather');
  assert.equal(gather.length,1,'one gathering burst happens near the beginning of the dash');
  assert.equal(gather[0].damage,5,'the gathering burst deals 5 damage');
  assert.ok(gather[0].targetIds.length>0,'the gathering burst catches the nearby dummy');
  const gathered={...demo.state.enemies[0]};
  assert.ok(Math.hypot(gathered.x,gathered.z)<Math.hypot(.6,.4),'5. the burst pulls the target toward a shared center, it does not eject it');

  advance(demo,AIR_DASH_MOTION.duration+.01);
  const draught=eventsOfType(demo,'draught');
  assert.equal(draught.length,1,'6. a separate draught follows the gathering burst');
  assert.equal(draught[0].damage,10,'the draught deals 10 damage');
  const order=demo.events.filter(event=>['gather','draught'].includes(event.type)).map(event=>event.type);
  assert.deepEqual(order,['gather','draught'],'control ordering is gather first, then transport');

  const endpoint=demo.state.player;
  const carried=demo.state.enemies[0];
  assert.ok(Math.hypot(carried.x-endpoint.x,carried.z-endpoint.z)<1.6,'7. the target ends close enough for a short-range follow-up');
  assert.ok(carried.x>gathered.x,'8. the target is transported along the dash vector rather than knocked away radially');
  assert.equal(carried.damageTaken,15,'9. base Gust Burst lands exactly its two damage events');
  assert.equal(eventsOfType(demo,'endpoint').length,0,'the base form has no endpoint burst');
}

// 10-11. Enhanced preserves both base events and adds one 5-damage endpoint burst.
{
  const demo=soloDemo();
  demo.select('GUST-BURST');
  demo.setEnhanced(true);
  demo.setMove(1,0);
  demo.cast();
  advance(demo,AIR_DASH_MOTION.duration+.01);
  assert.equal(eventsOfType(demo,'gather').length,1,'10. enhanced keeps the gathering burst');
  assert.equal(eventsOfType(demo,'draught').length,1,'10. enhanced keeps the draught');
  const endpoint=eventsOfType(demo,'endpoint');
  assert.equal(endpoint.length,1,'11. enhanced adds exactly one endpoint burst');
  assert.equal(endpoint[0].damage,5,'the endpoint burst deals 5 damage');
  const dashEnd=eventsOfType(demo,'dash-end')[0];
  assert.ok(Math.hypot(endpoint[0].x-dashEnd.x,endpoint[0].z-dashEnd.z)<1e-6,'the extra burst sits at the dash destination');
  assert.equal(demo.state.enemies[0].damageTaken,20,'enhanced totals the base 15 plus the additive 5');
}

// 12. The implementation follows Gust Burst, not its Wind Salvo replacement.
{
  const demo=soloDemo();
  demo.select('GUST-BURST');
  demo.setMove(1,0);
  demo.cast();
  advance(demo,1.5);
  const kinds=new Set(demo.events.filter(event=>event.arcanaId==='GUST-BURST').map(event=>event.type));
  assert.deepEqual([...kinds].sort(),['dash-end','dash-start','draught','gather'],'no projectile volley events appear');
}

// --- Razor Burst ------------------------------------------------------------

assert.deepEqual(razorTickSchedule(false),[.2,.4,.6,.8,1],'base ticks are five evenly spaced hits inside one second');
assert.equal(razorTickSchedule(true).length,7,'enhanced schedules seven hits');
assert.equal(razorTickSchedule(true).at(-1),1.5,'the enhanced schedule fills the longer 1.5 second lifetime');

// 1-10. Dash, one stationary vortex, five 4-damage ticks, pull and slow.
{
  const demo=soloDemo();
  demo.select('RAZOR-BURST');
  demo.setMove(1,0);
  const originX=demo.state.player.x,originZ=demo.state.player.z;
  demo.cast();
  const spawn=eventsOfType(demo,'vortex-spawn');
  assert.equal(spawn.length,1,'2. exactly one vortex is created');
  assert.equal(spawn[0].x,originX,'3. the vortex is placed at the dash origin');
  assert.equal(spawn[0].z,originZ);
  assert.equal(spawn[0].ticks,5,'6. the base vortex schedules five hits');
  assert.equal(spawn[0].duration,1,'10. the base vortex lasts about one second');

  advance(demo,AIR_DASH_MOTION.duration+.01);
  assert.ok(Math.abs(demo.state.player.x-(originX+AIR_DASH_MOTION.distance))<.05,'1. the caster dashes forward');
  const vortex=demo.state.effects.find(effect=>effect.type==='razor-vortex');
  assert.ok(vortex,'the vortex outlives the dash');
  assert.equal(vortex.x,originX,'4. the vortex does not follow the player');
  assert.equal(vortex.z,originZ,'5. the vortex does not travel after creation');

  advance(demo,1.1);
  const ticks=eventsOfType(demo,'vortex-tick');
  assert.equal(ticks.length,5,'6. base Razor Burst produces five periodic hits');
  assert.ok(ticks.every(tick=>tick.damage===4),'every hit is 4 damage');
  assert.equal(demo.state.enemies[0].hits,5,'the caught dummy takes all five');
  assert.equal(demo.state.enemies[0].damageTaken,20,'five 4-damage hits total 20');
  assert.equal(demo.state.effects.some(effect=>effect.type==='razor-vortex'),false,'the vortex expires after its lifetime');
}

// 7-9. The pull keeps targets inside the repeated-hit footprint, and slows them.
{
  const demo=createAirDashDemo({startX:0,startZ:0,dummies:[{x:1.45,z:0}]});
  demo.select('RAZOR-BURST');
  demo.setMove(0,1);
  demo.cast();
  advance(demo,.25);
  const dummy=demo.state.enemies[0];
  assert.ok(dummy.x<1.45,'7. the vortex pulls enemies inward');
  assert.ok(dummy.slowRemaining>0,'8. the vortex applies slow');
  assert.ok(demo.movementScale(dummy)<1,'the slow really scales movement');
  advance(demo,1.1);
  assert.equal(dummy.hits,5,'9. the pull keeps the target inside the footprint for every tick');
}

// 11-14. Pure duration enhancement.
{
  const demo=soloDemo();
  demo.select('RAZOR-BURST');
  demo.setEnhanced(true);
  demo.setMove(1,0);
  demo.cast();
  const spawn=eventsOfType(demo,'vortex-spawn');
  assert.equal(spawn.length,1,'11. enhanced still creates exactly one vortex');
  assert.equal(spawn[0].duration,1.5,'12. the enhanced vortex lasts about 1.5 seconds');
  advance(demo,1.6);
  const ticks=eventsOfType(demo,'vortex-tick');
  assert.equal(ticks.length,7,'13. the enhanced vortex produces seven hits');
  assert.ok(ticks.every(tick=>tick.damage===4),'13. per-hit damage stays at 4');
  assert.equal(demo.state.enemies[0].damageTaken,28,'seven 4-damage hits total 28');
  assert.equal(eventsOfType(demo,'endpoint').length,0,'14. enhancement invents no new endpoint event');
  const base=RAZOR_BURST_SOURCE;
  assert.equal(base.baseTint,base.enhancedTint,'the enhanced vortex keeps the same presentation');
}

// The listed cooldown is 5.12 seconds and gates repeat casts.
{
  const demo=soloDemo();
  demo.select('RAZOR-BURST');
  demo.cast();
  assert.equal(demo.state.razorCooldown,RAZOR_BURST_SOURCE.cooldownSeconds);
  advance(demo,AIR_DASH_MOTION.duration+.01);
  assert.deepEqual(demo.cast(),{ok:false,reason:'cooling-down'},'Razor Burst cannot be recast while cooling down');
  advance(demo,RAZOR_BURST_SOURCE.cooldownSeconds);
  assert.equal(demo.ready('RAZOR-BURST'),true,'it comes back after 5.12 seconds');
}

// The two Arcana keep independent payload availability.
{
  const demo=soloDemo();
  demo.select('RAZOR-BURST');
  demo.cast();
  advance(demo,AIR_DASH_MOTION.duration+.01);
  assert.equal(demo.ready('RAZOR-BURST'),false);
  assert.equal(demo.ready('GUST-BURST'),true,'a spent Razor Burst does not consume Gust Burst charges');
}

console.log('wol-air-dash-demo: source-faithful acceptance tests passed');
