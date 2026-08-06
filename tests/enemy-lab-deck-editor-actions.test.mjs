import assert from 'node:assert/strict';
import fs from 'node:fs';

const editor=fs.readFileSync(new URL('../src/enemy-lab-deck-editor.js',import.meta.url),'utf8');
const refinements=fs.readFileSync(new URL('../src/enemy-lab-deck-editor-refinements.js',import.meta.url),'utf8');

assert.match(editor,/const required=inDeck&&!isNonStance\(card\)&&stanceCount<=1/);
assert.match(editor,/required\?'REQUIRED':inDeck\?'REMOVE':'ADD'/,'Browse owns all three stable action labels');
assert.match(editor,/add\.dataset\.browseDeckAction=required\?'required':inDeck\?'remove':'add'/);
assert.match(editor,/lastStance\?'REQUIRED':'REMOVE'/,'Current Deck explains why its final stance cannot be removed');
assert.match(editor,/remove\.dataset\.currentDeckAction=lastStance\?'required':'remove'/);
assert.match(editor,/id:'deck-editor'.*slot:'middle'/);
assert.match(editor,/id:'deck-editor-current'.*slot:'middle'/);
assert.match(editor,/render:\(\)=>renderRegistryEditor\('browse'\)/,'Browse registry callback owns its view directly');
assert.match(editor,/render:\(\)=>renderRegistryEditor\('deck'\)/,'Current Deck registry callback owns its view directly');
assert.doesNotMatch(editor,/activeView==='browse'\?renderRegistryEditor/,'Browse callback must not depend on a previous selection');
assert.doesNotMatch(editor,/activeView==='deck'\?renderRegistryEditor/,'Current Deck callback must not depend on a previous selection');
assert.doesNotMatch(editor,/deckEditorTabs/,'registry mode must not add a redundant internal tab rail');
assert.match(editor,/deckEditorRoot deckEditorRegistryFlow/,'registry mode uses its single-column flow');
assert.match(editor,/#labDock\.deckEditorLegacyMode #valueScrollGutter\{display:none\}/,'only the legacy nested-pane path hides the gutter');
assert.doesNotMatch(editor,/#labDock\.deckEditorMode #valueScrollGutter/,'registry mode leaves the outer value gutter available');
assert.match(editor,/renderBrowse\(root,null,null,\{registry:true\}\)/);
assert.match(editor,/renderCurrentDeck\(root,null,null,\{registry:true\}\)/);
assert.match(editor,/if\(registry\)root\.append\(controls,cardsPane\);else root\.append\(cardsPane,controls\)/,'registry flow places controls before cards while legacy flow stays two-pane');
assert.match(editor,/menu\.selectView\('loadout',selectedView\)/,'show(view) selects the corresponding registered view when supported');
assert.doesNotMatch(refinements,/data-browse-deck-action="remove"/,'refinements must not intercept core deck removal');
assert.doesNotMatch(refinements,/button\.textContent!==label/,'refinements must not rewrite core action labels after render');

for(const contract of ['ADD SHOWN','beginRun','startDeckShuffle','enemyLab.deck.v1','enemyLab.deck.ui.v1','deckCardDetails','CURRENT DECK']){
  assert.match(editor,new RegExp(contract.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),`deck editor contract remains: ${contract}`);
}

console.log('Enemy Lab deck editor action ownership: ok');
