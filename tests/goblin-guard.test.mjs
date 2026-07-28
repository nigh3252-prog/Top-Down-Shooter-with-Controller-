import assert from 'node:assert/strict';
import { classifyGuardAttack,computeGuardDamage,isGuardableGoblin } from '../src/goblin-guard.js';
import { duelGuardProfileForKind,guardBlockTransfersInitiative,scoreGuardCandidate } from '../src/goblin-duel-guard.js';

const horizontal=classifyGuardAttack({attackGroup:'horizontal',attackKey:'horizontal6',weaponId:'longsword'});
const chop=classifyGuardAttack({attackGroup:'vertical',attackKey:'vertical5',weaponId:'axe'});
const upward=classifyGuardAttack({attackGroup:'vertical',attackKey:'vertical2',weaponId:'longsword'});
assert.equal(horizontal.guardClass,'horizontal');
assert.equal(chop.guardClass,'chop');
assert.equal(upward.guardClass,'upward');
assert.ok(upward.guardMultiplier>chop.guardMultiplier);
assert.ok(chop.guardMultiplier>horizontal.guardMultiplier);
assert.equal(guardBlockTransfersInitiative(horizontal),true);
assert.equal(guardBlockTransfersInitiative(chop),false);
assert.equal(guardBlockTransfersInitiative(upward),false);

const lightDamage=computeGuardDamage({amount:10,knock:{x:1,z:0},attack:horizontal});
const heavyDamage=computeGuardDamage({amount:10,knock:{x:1,z:0},attack:upward});
assert.ok(heavyDamage>lightDamage);
assert.ok(duelGuardProfileForKind('captain').max>duelGuardProfileForKind('grunt').max);
assert.ok(duelGuardProfileForKind('dagger').raise<duelGuardProfileForKind('mace').raise);

const player={x:0,z:0};
const captain={id:2,kind:'captain',role:'goblin',fusion:false,hp:100,x:0,z:5};
const grunt={id:1,kind:'grunt',role:'goblin',fusion:false,hp:50,x:0,z:5};
assert.equal(isGuardableGoblin(grunt),true);
assert.equal(isGuardableGoblin({...grunt,role:'duelist'}),false);
assert.ok(scoreGuardCandidate(captain,player)>scoreGuardCandidate(grunt,player));

console.log('Goblin duel guard tests passed.');
