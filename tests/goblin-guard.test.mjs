import assert from 'node:assert/strict';
import {
  classifyGuardAttack,
  computeGuardDamage,
  isGuardableGoblin,
} from '../src/goblin-guard.js';
import {
  duelGuardProfileForKind,
  guardBlockTransfersInitiative,
  scoreGuardCandidate,
} from '../src/goblin-duel-guard.js';
import { metalGuardEventForClass } from '../src/goblin-guard-audio.js';

const horizontal=classifyGuardAttack({attackGroup:'horizontal',attackKey:'horizontal6',weaponId:'longsword'});
const stab=classifyGuardAttack({attackGroup:'stab',attackKey:'stab2',weaponId:'dagger'});
const chop=classifyGuardAttack({attackGroup:'vertical',attackKey:'vertical5',weaponId:'longsword'});
const upward=classifyGuardAttack({attackGroup:'vertical',attackKey:'vertical9',attackLabel:'Rising Splitter — Deep Launch',weaponId:'longsword'});
const chargedHammer=classifyGuardAttack({attackGroup:'vertical',attackKey:'vertical6',weaponId:'hammer',charged:true,chargeTier:2});

assert.equal(horizontal.guardClass,'horizontal');
assert.equal(chop.guardClass,'chop');
assert.equal(upward.guardClass,'upward');
assert(upward.guardMultiplier>chop.guardMultiplier);
assert(chop.guardMultiplier>horizontal.guardMultiplier);
assert(chargedHammer.guardMultiplier>chop.guardMultiplier);
assert(guardBlockTransfersInitiative(horizontal));
assert(guardBlockTransfersInitiative(stab));
assert(!guardBlockTransfersInitiative(chop));
assert(!guardBlockTransfersInitiative(upward));

const sharedHit={amount:28,knock:{x:2,z:1}};
const horizontalDamage=computeGuardDamage({...sharedHit,attack:horizontal});
const chopDamage=computeGuardDamage({...sharedHit,attack:chop});
const upwardDamage=computeGuardDamage({...sharedHit,attack:upward});
assert(upwardDamage>chopDamage);
assert(chopDamage>horizontalDamage);
assert(upwardDamage>=horizontalDamage*3);

assert.equal(metalGuardEventForClass('horizontal'),'guardCling');
assert.equal(metalGuardEventForClass('chop'),'guardClang');
assert.equal(metalGuardEventForClass('upward'),'guardClang');
assert.equal(metalGuardEventForClass('horizontal',true),'guardBreak');

assert(duelGuardProfileForKind('captain').max>duelGuardProfileForKind('mace').max);
assert(duelGuardProfileForKind('mace').max>duelGuardProfileForKind('dagger').max);
assert(!('chance' in duelGuardProfileForKind('grunt')));
assert(isGuardableGoblin({hp:1,role:'goblin',fusion:false}));
assert(!isGuardableGoblin({hp:1,role:'goblin',fusion:true}));
assert(!isGuardableGoblin({hp:0,role:'goblin',fusion:false}));

const player={x:0,z:0};
const captain={id:2,kind:'captain',x:4.8,z:0};
const grunt={id:1,kind:'grunt',x:4.8,z:0};
const distant={id:3,kind:'captain',x:10,z:0};
assert(scoreGuardCandidate(captain,player)>scoreGuardCandidate(grunt,player));
assert(scoreGuardCandidate(grunt,player)>scoreGuardCandidate(distant,player));

console.log('goblin duel guard, initiative, audio routing, and balance tests passed');
