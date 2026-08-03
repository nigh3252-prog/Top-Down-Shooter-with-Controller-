import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isHammerfallDefenseStance, resolveStanceDefenseProfile } from '../src/stance-defense-profiles.js';

assert.equal(isHammerfallDefenseStance({id:'S01'}),true);
assert.equal(isHammerfallDefenseStance({id:'enemy-lab-selection',name:'Hammerfall'}),true);
assert.equal(isHammerfallDefenseStance({id:'enemy-lab-selection',label:'S01 Hammerfall Guard'}),true);
assert.equal(isHammerfallDefenseStance({id:'S24',name:'Rat Step'}),false);
assert.equal(resolveStanceDefenseProfile({id:'enemy-lab-selection',name:'Hammerfall'})?.kind,'shield');

const arena=readFileSync(new URL('../combat-arena.html',import.meta.url),'utf8');
assert.match(arena,/import \{ isHammerfallDefenseStance \} from '\.\/src\/stance-defense-profiles\.js';/);
const start=arena.indexOf('function triggerDodge(){');
const end=arena.indexOf('/* ---------- hits:',start);
assert.ok(start>=0&&end>start,'triggerDodge should be present');
const dodge=arena.slice(start,end);
assert.match(dodge,/if\(isHammerfallDefenseStance\(arena\.stance\)\)return;/);
assert.ok(
  dodge.indexOf('if(isHammerfallDefenseStance(arena.stance))return;')<dodge.indexOf('const d = arena.dodge;'),
  'Hammerfall must be consumed before the built-in dodge mutates state',
);

console.log('Hammerfall defense-button regression test passed');
