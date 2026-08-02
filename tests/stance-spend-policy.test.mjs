import assert from 'node:assert/strict';
import { evaluateStanceSpend, STANCE_SPEND_SOURCES } from '../src/stance-spend-policy.js';

let spend=evaluateStanceSpend({available:60,cost:50,source:STANCE_SPEND_SOURCES.attack});
assert.equal(spend.allowed,true);
assert.equal(spend.actualSpent,50);
assert.equal(spend.overdraw,false);
assert.equal(spend.opensCatch,false);

spend=evaluateStanceSpend({available:50,cost:50,source:STANCE_SPEND_SOURCES.attack});
assert.equal(spend.allowed,true);
assert.equal(spend.actualSpent,50);
assert.equal(spend.opensCatch,true);
assert.equal(spend.overdrawAmount,0);

spend=evaluateStanceSpend({available:20,cost:50,source:STANCE_SPEND_SOURCES.attack});
assert.equal(spend.allowed,true);
assert.equal(spend.actualSpent,20);
assert.equal(spend.overdraw,true);
assert.equal(spend.overdrawAmount,30);
assert.equal(spend.opensCatch,true);

spend=evaluateStanceSpend({available:1,cost:50,source:STANCE_SPEND_SOURCES.defense});
assert.equal(spend.allowed,true,'any positive reserve may fund one final stance-derived action');
assert.equal(spend.actualSpent,1);
assert.equal(spend.overdrawAmount,49);

spend=evaluateStanceSpend({available:0,cost:50,source:STANCE_SPEND_SOURCES.attack});
assert.equal(spend.allowed,false,'zero stamina does not grant repeated free actions');
assert.equal(spend.reason,'empty-reserve');

spend=evaluateStanceSpend({available:20,cost:50,source:'ability-card'});
assert.equal(spend.allowed,false,'ability-card costs do not receive Stance Overdraw');
assert.equal(spend.reason,'ineligible-source');

spend=evaluateStanceSpend({available:20,cost:50,source:STANCE_SPEND_SOURCES.attack,catchPhase:'open'});
assert.equal(spend.allowed,false,'a second Overdraw cannot start while Stance Catch is already open');
assert.equal(spend.reason,'catch-already-active');

console.log('stance spend policy tests passed');
