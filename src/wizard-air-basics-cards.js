import { arcanaEffectId } from './effect-registry.js';

const makeArcana=({id,name,icon,description,summary,rows,chain})=>Object.freeze({
  id:`WOL-${id}`,
  arcanaId:id,
  effectId:arcanaEffectId(id),
  sourceGame:'Wizard of Legend',
  type:'ability',
  name,
  icon,
  element:'Air',
  playEvent:'wizard-arcana:play',
  description,
  details:Object.freeze({summary,rows:Object.freeze(rows.map(row=>Object.freeze(row.slice())))}),
  chain:Object.freeze(chain),
  preferredWeapons:Object.freeze(['any']),
  styleTags:Object.freeze(['Wizard Arcana','Air']),
  uiColor:'#a7edf5',
  uiBorder:'rgba(133,221,233,.86)',
  uiBackground:'radial-gradient(circle,rgba(161,237,246,.28),rgba(5,31,40,.68))',
});

export const WIZARD_AIR_BASIC_CARDS=Object.freeze([
  makeArcana({
    id:'AIR-SPINNER',
    name:'Air Spinner',
    icon:'AS',
    description:'Launch two short-range crescent discs that orbit the caster, then finish with a complete air ring that throws nearby enemies outward.',
    summary:'A source-faithful three-beat air basic adapted into one card play. The first two beats create actual owner-centered orbiting discs for 6 damage each; the third substitutes a brief 360-degree ring for 10 damage and strong outward knockback.',
    rows:[
      ['RHYTHM','Orbiting disc → Orbiting disc → Full surrounding ring.'],
      ['DISCS','Each disc begins in the aim direction, follows the moving caster for one revolution, and can recontact a target near the start/end of its orbit.'],
      ['FINISHER','The third beat is a complete ring, not another disc; it deals 10 and strongly pushes enemies away.'],
      ['ENHANCED SOURCE','The enhanced source version adds an opposite-phase second disc to Beats 1 and 2; that duplicate is structured but not enabled yet.'],
    ],
    chain:['horizontal3','horizontal3','horizontal6'],
  }),
  makeArcana({
    id:'PERFORATING-JET',
    name:'Perforating Jet',
    icon:'PJ',
    description:'Fire three escalating micro-volleys of narrow piercing air jets: two shots, then three, then four.',
    summary:'A source-faithful nested volley. Each combo beat contains its own rapid sequence of independently moving 3-damage jets, with the base counts ramping from 2 to 3 to 4 while every jet pierces enemies along the same narrow lane.',
    rows:[
      ['VOLLEYS','Beat 1 emits 2 jets; Beat 2 emits 3; Beat 3 emits 4.'],
      ['CARRIER','Each jet is a separate pointed pale-air streak, not one continuous beam.'],
      ['CONTACT','Every jet deals 3 damage, pierces enemies, and can hit each enemy once.'],
      ['ENHANCED SOURCE','The source enhancement adds one jet to every volley for 3 → 4 → 5; the documented 11-versus-12 total discrepancy remains unresolved.'],
    ],
    chain:['stab3','stab3','stab3'],
  }),
]);
