import { readonlyMap } from './card-definition.js';
import { arcanaEffectId } from './effect-registry.js';

const palette=Object.freeze({
  Fire:Object.freeze({color:'#ff9a47',border:'rgba(255,137,64,.88)',background:'radial-gradient(circle,rgba(255,146,54,.31),rgba(55,14,4,.70))'}),
  Air:Object.freeze({color:'#a7edf5',border:'rgba(133,221,233,.88)',background:'radial-gradient(circle,rgba(161,237,246,.28),rgba(5,31,40,.70))'}),
  Earth:Object.freeze({color:'#cdb177',border:'rgba(185,145,82,.88)',background:'radial-gradient(circle,rgba(190,151,87,.29),rgba(39,29,16,.70))'}),
  Water:Object.freeze({color:'#78cfff',border:'rgba(79,178,239,.88)',background:'radial-gradient(circle,rgba(74,181,244,.28),rgba(4,22,46,.70))'}),
});

const makeCard=({id,name,icon,element,category,sourceOrder,sourceClip,styleTags,description,summary,rows,chain})=>{
  const colors=palette[element];
  return Object.freeze({
    id:`WOL-${id}`,
    arcanaId:id,
    effectId:arcanaEffectId(id),
    sourceGame:'Wizard of Legend',
    sourceOrder,
    analysisOrder:sourceOrder,
    sourceCategory:category,
    category,
    sourceClip:Object.freeze({...sourceClip}),
    showcaseStart:sourceClip.start,
    baseFormOnly:true,
    enhancedVariantEnabled:false,
    chargedVariantEnabled:false,
    type:'ability',
    name,
    icon,
    element,
    playEvent:'wizard-arcana:play',
    description,
    details:Object.freeze({
      summary,
      rows:Object.freeze(rows.map(row=>Object.freeze(row.slice()))),
    }),
    chain:Object.freeze(chain),
    preferredWeapons:Object.freeze(['any']),
    styleTags:Object.freeze(['Wizard Arcana',element,category,...styleTags]),
    uiColor:colors.color,
    uiBorder:colors.border,
    uiBackground:colors.background,
  });
};

export const WIZARD_VFX_ARCANA_CARDS=Object.freeze([
  makeCard({
    id:'FLAME-BREATH',name:'Flame Breath',icon:'FB',element:'Fire',category:'Signature',sourceOrder:34,sourceClip:{start:217,end:227},
    styleTags:['rounded-cone volume','three-hit channel','projectile interception'],
    description:'Plant your feet and project a broad close flame cone for three discrete hits before it collapses into smoke.',
    summary:'The first playable base-form pass uses the attached VFX lab’s rounded cone, ignition flash, three 18-damage contacts, projectile clearing, and scorched aftermath. The separate charged steerable Signature remains documented but disabled.',
    rows:[
      ['FORM','Caster-anchored rounded cone; it is not a traveling fireball or beam.'],
      ['RHYTHM','Ignition flash → sustained plume → smoke collapse.'],
      ['DAMAGE','Three discrete 18-damage hits while a target remains inside.'],
      ['DEFENSE','The active flame volume destroys eligible hostile projectiles.'],
      ['BASE LIMIT','The charged continuously aimable channel is not enabled in this first card pass.'],
    ],
    chain:['vertical8','horizontal4','vertical6'],
  }),
  makeCard({
    id:'SEARING-CROWN',name:'Searing Crown',icon:'SC',element:'Fire',category:'Standard',sourceOrder:35,sourceClip:{start:227,end:233},
    styleTags:['radial tick sequence','finisher handoff','caster anchored'],
    description:'Raise a fiery crown around yourself for five low-force ticks, then finish with one heavy outward blast.',
    summary:'A two-stage radial card. Five 5-damage ticks keep nearby enemies close while the painterly crown builds, then one 20-damage finisher supplies the meaningful knockback and leaves a fading smoke column.',
    rows:[
      ['RHYTHM','Crown ignition → five timed ticks → one finisher blast.'],
      ['DAMAGE','Exactly five 5-damage ticks followed by one 20-damage finisher.'],
      ['CONTROL','Ticks use low inward force; only the finisher pushes strongly outward.'],
      ['FOOTPRINT','A growing caster-centered ring with scorch and ember buildup.'],
      ['BASE LIMIT','The enhanced seven-tick/burn branch remains documented but disabled.'],
    ],
    chain:['vertical8','horizontal4','vertical9'],
  }),
  makeCard({
    id:'IGNITION-DRIVE',name:'Ignition Drive',icon:'ID',element:'Fire',category:'Standard',sourceOrder:49,sourceClip:{start:353,end:357},
    styleTags:['five-beat ground line','forward carry','endpoint finisher'],
    description:'Send five ordered explosions down your aim line, carrying enemies into the final burning blast.',
    summary:'A five-beat route effect adapted from the VFX lab. Four compact 10-damage explosions walk forward in a straight authored line, carrying targets toward the next beat; a larger 30-damage finisher closes the route.',
    rows:[
      ['RHYTHM','Four compact carry beats followed by one larger finisher.'],
      ['DAMAGE','10 → 10 → 10 → 10 → 30.'],
      ['CONTROL','Early explosions push targets toward the next route point instead of scattering them sideways.'],
      ['PAINT','Flat orange flame chunks, white-hot cores, smoke, embers, and a fading scorch strip.'],
      ['BASE LIMIT','The enhanced lingering fire pool remains documented but disabled.'],
    ],
    chain:['horizontal4','horizontal4','horizontal6'],
  }),
  makeCard({
    id:'ENGULFING-FISSURE',name:'Engulfing Fissure',icon:'EF',element:'Fire',category:'Standard',sourceOrder:52,sourceClip:{start:369,end:378},
    styleTags:['three independent traps','trigger pull','five-hit capture'],
    description:'Place three dormant fire fissures that pull in the first enemy to trigger each trap and consume it with five hits.',
    summary:'A persistent trap card. Three independent fissures arm around the caster for up to eight seconds; each first valid trigger is pulled to the center, takes five 5-damage hits, and consumes only that trap.',
    rows:[
      ['PLACEMENT','Three separate authored traps, not one circular field.'],
      ['DORMANT','Unused traps remain visible, harmless, and armed for eight seconds.'],
      ['TRIGGER','First valid enemy enters a trap radius; that trap owns the target.'],
      ['DAMAGE','Exactly five 5-damage hits per activated trap.'],
      ['BASE LIMIT','The enhanced five-trap X pattern remains documented but disabled.'],
    ],
    chain:['vertical6','horizontal4','vertical6'],
  }),
  makeCard({
    id:'DRAGON-BLAST',name:'Dragon Blast',icon:'DB',element:'Air',category:'Standard',sourceOrder:57,sourceClip:{start:418,end:420},
    styleTags:['stationary dragon head','pull sequence','projectile erasure'],
    description:'Conjure a stationary wind dragon that pulls enemies through five hits before blasting them away.',
    summary:'A stationary pull-and-blast card. One painterly dragon head in front of the caster resolves five 8-damage pull hits, then one 24-damage outward blast with slow and projectile erasure inside the visible area.',
    rows:[
      ['FORM','One stationary wind-dragon mouth built from curling pale streamers.'],
      ['RHYTHM','Open → five 8-damage pulls → one 24-damage blast.'],
      ['CONTROL','Targets are drawn toward the mouth between pull beats, then thrown outward by the finisher.'],
      ['DEFENSE','Hostile projectiles entering the visible mouth volume are destroyed.'],
      ['BASE LIMIT','The enhanced adjacent second head remains documented but disabled.'],
    ],
    chain:['horizontal6','vertical4','horizontal9'],
  }),
  makeCard({
    id:'SHEARING-CHAIN',name:'Shearing Chain',icon:'SHC',element:'Air',category:'Signature',sourceOrder:64,sourceClip:{start:461,end:472},
    styleTags:['movement synchronized','six slash conveyor','finisher push'],
    description:'Advance through six moving air slashes and end the chain with one larger 15-damage finisher.',
    summary:'A movement Signature card using the VFX lab’s alternating crescents. The caster advances along the aim route while six 7-damage slashes push enemies, then a larger 15-damage final slash resolves the sequence.',
    rows:[
      ['RHYTHM','Six 7-damage crescents followed by one 15-damage finisher.'],
      ['MOTION','The caster advances along the committed aim route as the slashes are emitted.'],
      ['VARIATION','Crescents alternate side and angle so the chain reads as authored motion, not repeated identical hitboxes.'],
      ['CONTROL','Every slash pushes along the route; the finisher pushes hardest.'],
      ['BASE LIMIT','The enhanced nine-slash and charged thirteen-slash variants remain disabled.'],
    ],
    chain:['horizontal4','horizontal4','horizontal6'],
  }),
  makeCard({
    id:'TECTONIC-DRILL',name:'Tectonic Drill',icon:'TD',element:'Earth',category:'Signature',sourceOrder:86,sourceClip:{start:664,end:674},
    styleTags:['moving earth carrier','contact conveyor','bore track'],
    description:'Charge forward behind a rotating earthen drill that pins enemies along the route and leaves a churned bore track.',
    summary:'A moving Signature card adapted from the VFX lab’s conical auger. The drill advances point-first, deals 10 on contact with an explicit per-target cadence, throws rubble and dust, and leaves a visible ground track.',
    rows:[
      ['FORM','One conical auger made from a tapered body and helical crescent fins.'],
      ['MOTION','The carrier travels point-first along the aim route at roughly nine tiles per second.'],
      ['CONTACT','Targets in the drill body are pinned to the forward route and receive 10-damage contact events.'],
      ['FEEDBACK','White contact stars, flying slabs, dust, and a fading churned track.'],
      ['BASE LIMIT','The enhanced second charge and charged four-drill branch remain disabled.'],
    ],
    chain:['stab6','horizontal4','stab6'],
  }),
  makeCard({
    id:'ROCK-SOLID-TOMAHAWK',name:'Rock-Solid Tomahawk',icon:'RST',element:'Earth',category:'Standard',sourceOrder:88,sourceClip:{start:678,end:686},
    styleTags:['returning projectile','stone silhouette','single impact'],
    description:'Raise and throw a double-bitted stone axe that flies outward, strikes once, and arcs back to you.',
    summary:'A returning projectile card. The attached VFX lab silhouette raises overhead, flies flat while spinning, deals 15 on a valid strike with a white impact flash and stone chips, then follows a curved return to the caster.',
    rows:[
      ['FORM','Double-bitted stone blades on a short brown haft with an olive binding.'],
      ['FLIGHT','Brief overhead raise → outward throw → curved return to the cast anchor.'],
      ['DAMAGE','15 once per target on contact.'],
      ['FEEDBACK','Small ground shadow, white star flash, stone chips, and faint flight dust.'],
      ['BASE LIMIT','The enhanced double-throw branch remains documented but disabled.'],
    ],
    chain:['vertical6','stab6','horizontal6'],
  }),
  makeCard({
    id:'AQUA-VORTEX',name:'Aqua Vortex',icon:'AV',element:'Water',category:'Standard',sourceOrder:123,sourceClip:{start:1007,end:1013},
    styleTags:['caster-centered water spiral','three pull ticks','painterly splash'],
    description:'Open a six-arm water vortex around yourself that pulls enemies inward through three timed hits.',
    summary:'A caster-centered water Standard card ported from the VFX lab’s six-arm spiral. The vortex expands to roughly six tiles across, pulls targets inward, resolves three 8-damage ticks, then collapses into a low sheet and ripple.',
    rows:[
      ['FORM','Six tapered hooked arms on a rotating log spiral, with a bright inner wash.'],
      ['RHYTHM','Bloom → three inward 8-damage ticks → collapse sheet and ripple.'],
      ['CONTROL','Targets are pulled toward the caster during the active vortex.'],
      ['DEFENSE','The active water volume destroys eligible hostile projectiles.'],
      ['BASE LIMIT','The second charge and enhanced ice burst remain documented but disabled.'],
    ],
    chain:['vertical8','horizontal4','vertical6'],
  }),
  makeCard({
    id:'AQUA-BREAKER',name:'Aqua Breaker',icon:'AB',element:'Water',category:'Standard',sourceOrder:131,sourceClip:{start:1083,end:1091},
    styleTags:['charge-and-release','rolling water coil','deluge finisher'],
    description:'Charge a coiled water breaker, roll it through enemies for stacked hits, and finish with a crashing fan.',
    summary:'A charge-and-release water projectile. The painterly coiled cone grows in front of the caster for roughly 1.9 seconds, rolls forward through the group for a 15 entry hit plus stacked 10s, then breaks into a wide crashing fan.',
    rows:[
      ['CHARGE','The coil grows in place while an explicit charge bar fills blue, then green.'],
      ['TRAVEL','On release it detaches and rolls forward at roughly eleven tiles per second.'],
      ['DAMAGE','15 on first entry, followed by 10-damage pass events while the coil works through the group.'],
      ['FINISHER','The coil shears into a broad white-foam deluge with tall spray spikes.'],
      ['BASE LIMIT','The enhanced faster charge and charged enormous ball remain documented but disabled.'],
    ],
    chain:['horizontal6','vertical6','horizontal9'],
  }),
]);

export const WIZARD_VFX_ARCANA_BY_ID=readonlyMap(WIZARD_VFX_ARCANA_CARDS.map(card=>[card.arcanaId,card]));
