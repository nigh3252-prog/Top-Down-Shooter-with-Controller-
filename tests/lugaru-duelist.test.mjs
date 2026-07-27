import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  LUGARU_DUELIST_ID,
  attackAimedAtDuelist,
  buildLugaruCounterAttack,
  chooseLugaruDuelistResponse,
} from '../src/lugaru-duelist.js';

assert.equal(LUGARU_DUELIST_ID,'Lugaru Duelist');

const enemy={x:0,z:5};
const player={x:0,z:0};
assert.equal(attackAimedAtDuelist({enemy,player,commitYaw:0}),true,'forward player attack should threaten the duelist');
assert.equal(attackAimedAtDuelist({enemy,player,commitYaw:Math.PI}),false,'backward player attack should not trigger a defense');

const baseSnapshot={active:true,attackGroup:'horizontal',attackKey:'horizontal6',contactAt:.42,t:.08,commitYaw:0};
assert.equal(chooseLugaruDuelistResponse({snapshot:baseSnapshot,distance:5,guardRatio:1,aimed:true,timeToContact:.34}),'guard');
assert.equal(chooseLugaruDuelistResponse({snapshot:{...baseSnapshot,attackGroup:'vertical',attackKey:'vertical2'},distance:5,guardRatio:1,aimed:true,timeToContact:.34}),'evade','rising attacks should be evaded');
assert.equal(chooseLugaruDuelistResponse({snapshot:{...baseSnapshot,charged:true,chargeTier:.7},distance:5,guardRatio:1,aimed:true,timeToContact:.34}),'evade','charged commitments should be evaded');
assert.equal(chooseLugaruDuelistResponse({snapshot:baseSnapshot,distance:5,guardRatio:.2,aimed:true,timeToContact:.34}),'evade','low guard should force an evasive answer');
assert.equal(chooseLugaruDuelistResponse({snapshot:baseSnapshot,distance:5,guardRatio:1,aimed:false,timeToContact:.34}),'ignore');
assert.equal(chooseLugaruDuelistResponse({snapshot:baseSnapshot,distance:5,guardRatio:1,aimed:true,timeToContact:.04}),'ignore','late reads should fail instead of becoming perfect reactions');

const source={name:'Slash',windup:.5,active:.12,recovery:.5,cooldown:1.4,tokenCost:1};
const normal=buildLugaruCounterAttack(source);
const perfect=buildLugaruCounterAttack(source,{perfect:true});
const punish=buildLugaruCounterAttack(source,{punish:true});
assert.ok(normal.windup<source.windup);
assert.ok(perfect.windup<normal.windup);
assert.ok(punish.windup>normal.windup);
assert.equal(normal.tokenCost,.1);
assert.equal(normal.wantsSolo,true);

const core=fs.readFileSync(new URL('../src/arena-enemies-core.js',import.meta.url),'utf8');
const wrapper=fs.readFileSync(new URL('../src/arena-enemies-guard.js',import.meta.url),'utf8');
assert.match(core,/groupPlan\.spawnKind===LUGARU_DUELIST_ID/);
assert.match(core,/configureLugaruDuelists/);
assert.match(wrapper,/\[LUGARU_DUELIST_ID\]:LUGARU_DUELIST_ARCHETYPE/);
assert.match(wrapper,/installLugaruDuelist/);

console.log('Lugaru duelist decision and Enemy Lab routing tests passed.');
