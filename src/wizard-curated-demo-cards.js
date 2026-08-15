import { readonlyMap } from './card-definition.js';
import { arcanaEffectId } from './effect-registry.js';

const PALETTE=Object.freeze({
  Fire:Object.freeze({color:'#ff9a47',border:'rgba(255,137,64,.88)',background:'radial-gradient(circle,rgba(255,146,54,.31),rgba(55,14,4,.70))'}),
  Air:Object.freeze({color:'#a7edf5',border:'rgba(133,221,233,.88)',background:'radial-gradient(circle,rgba(161,237,246,.28),rgba(5,31,40,.70))'}),
  Earth:Object.freeze({color:'#cdb177',border:'rgba(185,145,82,.88)',background:'radial-gradient(circle,rgba(190,151,87,.29),rgba(39,29,16,.70))'}),
  Water:Object.freeze({color:'#78cfff',border:'rgba(79,178,239,.88)',background:'radial-gradient(circle,rgba(74,181,244,.28),rgba(4,22,46,.70))'}),
});

const makeCard=({id,name,icon,element,category,sourceOrder,clip,description,summary,rows,chain})=>{
  const colors=PALETTE[element];
  return Object.freeze({
    id:`WOL-${id}`,arcanaId:id,effectId:arcanaEffectId(id),sourceGame:'Wizard of Legend',
    sourceOrder,analysisOrder:sourceOrder,sourceCategory:category,category,
    sourceClip:Object.freeze({start:clip[0],end:clip[1]}),showcaseStart:clip[0],
    baseFormOnly:true,enhancedVariantEnabled:false,chargedVariantEnabled:false,
    type:'ability',name,icon,element,playEvent:'wizard-arcana:play',description,
    details:Object.freeze({summary,rows:Object.freeze(rows.map(row=>Object.freeze(row.slice())))}),
    chain:Object.freeze(chain),preferredWeapons:Object.freeze(['any']),
    styleTags:Object.freeze(['Wizard Arcana','Curated Demo Port',element,category]),
    uiColor:colors.color,uiBorder:colors.border,uiBackground:colors.background,
  });
};

export const WIZARD_CURATED_DEMO_CARDS=Object.freeze([
  makeCard({
    id:'BLAZING-LARIAT',name:'Blazing Lariat',icon:'BL',element:'Fire',category:'Signature',sourceOrder:37,clip:[244,255],
    description:'Slide forward beneath two enormous rotating fire-whip sweeps that burn and throw every target they cross.',
    summary:'The curated phone demo is the source of truth: a 2.4-unit slide leads two 26-damage whip sweeps through the authored 330-degree arc, with the second sweep starting 0.30 seconds later at its 150-degree offset.',
    rows:[['MOTION','2.4-unit slide over 0.17 seconds.'],['SWEEPS','Two 330-degree fire-whip sweeps; second begins 0.30 seconds after the first.'],['CONTACT','26 damage, burn, and 20 knockback per sweep.'],['REACH','5.2 source units in the base form.'],['BASE LIMIT','Enhanced reach and the three-whip charged Signature remain disabled.']],
    chain:['horizontal6','vertical6','horizontal9'],
  }),
  makeCard({
    id:'EXPLOSIVE-CHARGE',name:'Explosive Charge',icon:'EC',element:'Fire',category:'Standard',sourceOrder:39,clip:[259,265],
    description:'Dash through enemies to attach one-second fuses, then detonate every marked target in a directional fire blast.',
    summary:'The curated phone demo owns the exact three-charge dash, contact marker, fuse, and detonation choreography. Each cast travels 3.6 units over 0.15 seconds, deals 5 on contact, then deals 25 when its one-second marker explodes.',
    rows:[['AMMO','Three independently recovering charges; 3.5 seconds per charge.'],['DASH','3.6 units over 0.15 seconds with a 1.15-unit contact radius.'],['CONTACT','5 immediate damage and one independent timed marker.'],['DETONATION','25 damage, 25 knockback, 1.5-unit blast radius after 1.0 second.'],['BASE LIMIT','Enhanced burn remains documented but disabled.']],
    chain:['horizontal6','stab6','horizontal6'],
  }),
  makeCard({
    id:'STORM-DRAFT',name:'Storm Draft',icon:'SD',element:'Air',category:'Signature',sourceOrder:68,clip:[485,496],
    description:'Release a broad advancing air curtain that carries enemies into walls for a second impact and stun.',
    summary:'The curated Air Field demo owns the exact source curtain: it appears beyond a deliberate point-blank gap, travels at 9.6 units per second for 1.30 seconds, deals 20, and adds the documented 30-damage wall slam.',
    rows:[['AMMO','Two charges; 4.5-second recovery per charge.'],['CURTAIN','1.7-unit spawn gap, 1.35 half-width, speed 9.6, life 1.30.'],['CONTACT','20 damage and source carry/knockback.'],['WALL','30 additional damage and 1.35-second stun on wall impact.'],['BASE LIMIT','Projectile clearing and the four-by-seven charged volley remain disabled.']],
    chain:['horizontal6','vertical8','horizontal9'],
  }),
  makeCard({
    id:'BLURRING-FALCONRY',name:'Blurring Falconry',icon:'BF',element:'Air',category:'Signature',sourceOrder:72,clip:[522,540],
    description:'Launch a pale wind falcon that marks its first target and carves six fast orbiting passes through it.',
    summary:'The curated phone demo owns the exact falcon sprite, seek, mark, orbit, six-pass route, trail, contact flash, and cleanup. The base bird deals 4 per pass with 10 knockback at speed 19.',
    rows:[['AMMO','Three charges; 4.0 seconds per charge.'],['SEEK','Speed 19 until first valid mark.'],['PASSES','Six authored 0.20-second passes around a 2.9-unit orbit.'],['CONTACT','4 damage and 10 knockback per pass.'],['BASE LIMIT','The eight-pass enhanced branch and charged split falcon remain disabled.']],
    chain:['horizontal6','vertical6','horizontal9'],
  }),
  makeCard({
    id:'WHIRLING-WIND-AGENT',name:'Whirling Wind Agent',icon:'WWA',element:'Air',category:'Standard',sourceOrder:75,clip:[552,563],
    description:'Conjure two wind agents that hover near you and repeatedly charge through nearby enemies.',
    summary:'The curated Air Field demo owns both agents, their two-part bars, follow/leash behavior, one-second charge cadence, piercing route, and wall-slam reaction. The demo uses the on-screen 5-damage value.',
    rows:[['COUNT','Two agents with three source health points each.'],['LIFETIME','10 seconds; 15-second card cooldown.'],['ATTACK','Charge about once per second at speed 15, overshooting by 3 units.'],['CONTACT','5 on-screen damage and 10 knockback per agent.'],['BASE LIMIT','The enhanced movement/attack-speed branch remains disabled.']],
    chain:['vertical6','horizontal4','vertical6'],
  }),
  makeCard({
    id:'KNOCKOUT-BOULDER',name:'Knockout Boulder',icon:'KB',element:'Earth',category:'Standard',sourceOrder:89,clip:[686,690],
    description:'Rip a huge spinning boulder from the ground and hurl it downrange with a crater and violent impact burst.',
    summary:'The curated Earth demo owns the boulder mesh, 0.13-second windup, 27-unit speed, loft, spin, dust arc, contact burst, source crater, and cleanup. Base contact deals 50 with 9 knockback and one-second stun.',
    rows:[['LAUNCH','0.13-second windup; speed 27; range 16.'],['FORM','0.85 radius, 0.40 loft, 7.5 spin.'],['CONTACT','50 damage, 9 knockback, and 1.0-second stun.'],['AFTERMATH','Three-second cast-origin crater and source debris/dust.'],['BASE LIMIT','Enhanced back-blast radius and damage remain disabled.']],
    chain:['vertical8','horizontal6','vertical9'],
  }),
  makeCard({
    id:'TOXIC-BOLAS',name:'Toxic Bolas',icon:'TB',element:'Earth',category:'Signature',sourceOrder:90,clip:[690,716],
    description:'Throw a fast vine-linked stone bola that roots its target and layers a five-tick poison.',
    summary:'The curated Earth demo owns the twin-stone bola, connecting cord, flight, impact vines, poison pools, particles, and cleanup. The base carrier travels at speed 13 for range 12 and deals 35 before its root and poison sequence.',
    rows:[['FLIGHT','Speed 13; range 12.'],['IMPACT','35 immediate damage.'],['CONTROL','Five-second root.'],['POISON','Five ticks of 5 at one-second intervals.'],['BASE LIMIT','The seven-projectile charged fan and persistent poison pools remain disabled.']],
    chain:['horizontal6','vertical8','horizontal9'],
  }),
  makeCard({
    id:'ROCK-N-ROLL',name:"Rock N' Roll",icon:'RR',element:'Earth',category:'Signature',sourceOrder:92,clip:[725,737],
    description:'Tear two parallel stone buzzsaws through the floor, leaving dark furrows and repeated four-damage contacts.',
    summary:'The curated arena demo owns the exact two-lane source saws: rock teeth and axle silhouette, staggered lane placement, 13.2 speed, 12-unit range, ground churn, furrows, debris, impact stars, and 0.17-second contact cadence.',
    rows:[['WINDUP','0.16-second crouch and ground opening.'],['LANES','Two lanes with 1.75 spread and 0.13 splay.'],['TRAVEL','Speed 13.2; range 12; radius 0.78.'],['CONTACT','4 damage every 0.17 seconds with 4.5 knockback.'],['BASE LIMIT','The held five-saw charged fan remains disabled.']],
    chain:['horizontal6','vertical6','horizontal9'],
  }),
  makeCard({
    id:'EARTH-STOMP-AGENT',name:'Earth Stomp Agent',icon:'ESA',element:'Earth',category:'Standard',sourceOrder:97,clip:[761,773],
    description:'Summon a hovering stone agent that leaps at nearby targets and lands in repeated wide radial stomps.',
    summary:'The curated arena demo owns the olive core, ten-shard ring, summon burst, bob/follow/leash motion, target leap, shrinking shadow, radial cracks, dust rings, debris, and hard impact. Each stomp deals 15 in a 3.3-unit radius.',
    rows:[['LIFETIME','10 seconds; 15-second card cooldown.'],['CADENCE','One stomp about every 1.1 seconds.'],['LEAP','0.13 windup, 0.40 rise, and 0.17 descent.'],['CONTACT','15 damage in a 3.3 radius with 13 knockback.'],['FOLLOW','3-unit follow distance, 11-unit leash, and 9.5-unit seek radius.']],
    chain:['vertical6','horizontal4','vertical6'],
  }),
  makeCard({
    id:'BUBBLE-BARRAGE',name:'Bubble Barrage',icon:'BB',element:'Water',category:'Standard',sourceOrder:132,clip:[1091,1097],
    description:'Empty the stored bubble stock in one tight stream of drifting, wobbling projectiles with strong knockback.',
    summary:'The curated phone demo owns the exact bubble canvas texture, ten-charge release, 0.034-second emission gap, random spread and launch speed, exponential slowdown, drift, wobble, light wall bounce, contact flash, and five-second expiry.',
    rows:[['STOCK','Up to ten bubbles; one charge returns every 0.5 seconds.'],['BARRAGE','All stored charges emit 0.034 seconds apart.'],['FLIGHT','Launch 16.5 with source spread/drag; drift floor 1.6; life 5.0.'],['CONTACT','10 damage and 15 knockback per bubble.'],['BASE LIMIT','Enhanced 12 damage and larger radius remain disabled.']],
    chain:['horizontal6','horizontal4','horizontal9'],
  }),
]);

export const WIZARD_CURATED_DEMO_BY_ID=readonlyMap(WIZARD_CURATED_DEMO_CARDS.map(card=>[card.arcanaId,card]));
