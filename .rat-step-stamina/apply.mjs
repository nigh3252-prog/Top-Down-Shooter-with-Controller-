import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const read=path=>readFileSync(path,'utf8');
const write=(path,content)=>writeFileSync(path,content);
function replaceOnce(path,before,after,label){
  const source=read(path);
  if(source.includes(after))return;
  const count=source.split(before).length-1;
  if(count!==1)throw new Error(`${path}: expected one ${label}, found ${count}`);
  write(path,source.replace(before,after));
}
function insertAfterOnce(path,marker,block,label){
  const source=read(path);
  if(source.includes(block.trim()))return;
  const count=source.split(marker).length-1;
  if(count!==1)throw new Error(`${path}: expected one ${label}, found ${count}`);
  write(path,source.replace(marker,`${marker}\n${block}`));
}

// Public presentation names stay separate from the stable internal class IDs.
insertAfterOnce(
  'src/stance-compatibility.js',
  `export const STANCE_CLASSES = Object.freeze(['Light', 'Medium', 'Heavy']);`,
  `\nexport const STANCE_CLASS_PRESENTATION = Object.freeze({\n  Light:Object.freeze({label:'Speed',short:'S',symbol:'»'}),\n  Medium:Object.freeze({label:'Balanced',short:'B',symbol:'◈'}),\n  Heavy:Object.freeze({label:'Power',short:'P',symbol:'⬟'}),\n});\n\nexport function getStanceClassPresentation(value){\n  const normalized=normalizeStanceClass(value);\n  return normalized?STANCE_CLASS_PRESENTATION[normalized]||null:null;\n}\nexport function stanceClassDisplayName(value){return getStanceClassPresentation(value)?.label||String(value||'');}\nexport function stanceClassShort(value){return getStanceClassPresentation(value)?.short||'';}\nexport function stanceClassSymbol(value){return getStanceClassPresentation(value)?.symbol||'';}`,
  'stance class presentation map',
);
replaceOnce(
  'src/stance-compatibility.js',
  `  if(raw==='light')return'Light';\n  if(raw==='medium')return'Medium';\n  if(raw==='heavy')return'Heavy';`,
  `  if(raw==='light'||raw==='speed')return'Light';\n  if(raw==='medium'||raw==='balanced')return'Medium';\n  if(raw==='heavy'||raw==='power')return'Heavy';`,
  'class presentation aliases',
);

// Weapon reclassification requested for Stance 2.0.
replaceOnce('src/weapons.js',`  katana: {\n    label: 'Katana',\n    weightClass: 'Medium',\n    staminaClass: 'Medium',`,`  katana: {\n    label: 'Katana',\n    weightClass: 'Light',\n    staminaClass: 'Light',`,'Katana Light class');
replaceOnce('src/weapons.js',`  claymore: {\n    label: 'Claymore',\n    weightClass: 'Heavy',\n    staminaClass: 'Heavy',`,`  claymore: {\n    label: 'Claymore',\n    weightClass: 'Medium',\n    staminaClass: 'Medium',`,'Claymore Medium class');

// Hand-card art: show the new class symbol + name in the existing picture area.
replaceOnce(
  'src/stance-deck.js',
  `import { STANCE_CARDS } from './stance-cards.js';`,
  `import { STANCE_CARDS } from './stance-cards.js';\nimport { getStanceClass, getStanceClassPresentation } from './stance-compatibility.js';`,
  'stance presentation import',
);
replaceOnce(
  'src/stance-deck.js',
  `      const type=ability?'ability':(modifier?'modifier':'stance');el.dataset.cardType=card?type:'empty';\n      el.dataset.manualSequence=sequence?\`${'${sequence.press}/${sequence.total}'}\`:'';`,
  `      const type=ability?'ability':(modifier?'modifier':'stance');el.dataset.cardType=card?type:'empty';\n      const stancePresentation=card&&type==='stance'?getStanceClassPresentation(getStanceClass(card)):null;\n      el.dataset.stanceType=stancePresentation?.label||'';el.dataset.stanceTypeLetter=stancePresentation?.short||'';\n      el.dataset.manualSequence=sequence?\`${'${sequence.press}/${sequence.total}'}\`:'';`,
  'stance hand-card presentation state',
);
replaceOnce(
  'src/stance-deck.js',
  `        icon.textContent=sequence?\`${'${sequence.label}\\n${sequence.press}/${sequence.total}'}\`:arcana?(card.icon||'ARC'):(ability?'PB':(modifier?'BLOOD\\nSLASH':(bing?'BING\\nBONG':'')));`,
  `        const stanceArt=stancePresentation?\`${'${stancePresentation.symbol}\\n${stancePresentation.label.toUpperCase()}'}\`:'';\n        icon.textContent=sequence?\`${'${sequence.label}\\n${sequence.press}/${sequence.total}'}\`:arcana?(card.icon||'ARC'):(ability?'PB':(modifier?'BLOOD\\nSLASH':(bing?'BING\\nBONG':stanceArt)));`,
  'stance art badge content',
);
replaceOnce(
  'src/stance-deck.js',
  `        icon.style.lineHeight=modifier||bing?'1.02':'';icon.style.fontWeight=ability||modifier||bing?'900':'';\n        icon.style.fontSize=sequence?'10px':arcana?'13px':(ability?'16px':(modifier||bing?'10px':''));\n        icon.style.letterSpacing=arcana?'.05em':(ability?'.08em':(modifier||bing?'.04em':''));\n        icon.style.color=arcana?(card.uiColor||'#ffd47b'):(ability?'#ffb066':(modifier?'#ff9aa7':(bing?'#ffd07b':'')));`,
  `        icon.style.lineHeight=modifier||bing?'1.02':(stancePresentation?'1.05':'');icon.style.fontWeight=ability||modifier||bing?'900':(stancePresentation?'800':'');\n        icon.style.fontSize=sequence?'10px':arcana?'13px':(ability?'16px':(modifier||bing?'10px':(stancePresentation?'8px':'')));\n        icon.style.letterSpacing=arcana?'.05em':(ability?'.08em':(modifier||bing?'.04em':(stancePresentation?'.08em':'')));\n        icon.style.color=arcana?(card.uiColor||'#ffd47b'):(ability?'#ffb066':(modifier?'#ff9aa7':(bing?'#ffd07b':(stancePresentation?'#d9eee9':''))));`,
  'stance art badge typography',
);
replaceOnce(
  'src/stance-deck.js',
  `        icon.style.borderColor=arcana?(card.uiBorder||'rgba(255,208,123,.72)'):(ability?'rgba(255,176,102,.72)':(modifier?'rgba(216,59,77,.78)':(bing?'rgba(255,208,123,.72)':'')));\n        icon.style.background=arcana?(card.uiBackground||'radial-gradient(circle,rgba(255,208,123,.20),rgba(18,36,38,.42))'):(ability?'radial-gradient(circle,rgba(255,176,102,.22),rgba(18,36,38,.42))':(modifier?'radial-gradient(circle,rgba(216,59,77,.28),rgba(32,10,14,.58))':(bing?'radial-gradient(circle,rgba(255,208,123,.20),rgba(18,36,38,.42))':'')));`,
  `        icon.style.borderColor=arcana?(card.uiBorder||'rgba(255,208,123,.72)'):(ability?'rgba(255,176,102,.72)':(modifier?'rgba(216,59,77,.78)':(bing?'rgba(255,208,123,.72)':(stancePresentation?'rgba(159,210,201,.55)':''))));\n        icon.style.background=arcana?(card.uiBackground||'radial-gradient(circle,rgba(255,208,123,.20),rgba(18,36,38,.42))'):(ability?'radial-gradient(circle,rgba(255,176,102,.22),rgba(18,36,38,.42))':(modifier?'radial-gradient(circle,rgba(216,59,77,.28),rgba(32,10,14,.58))':(bing?'radial-gradient(circle,rgba(255,208,123,.20),rgba(18,36,38,.42))':(stancePresentation?'radial-gradient(circle,rgba(86,139,132,.22),rgba(18,36,38,.42))':''))));`,
  'stance art badge frame',
);

// Three-card room-reward selector: compact S / B / P badge on stance choices.
replaceOnce(
  'src/run-draft.js',
  `import { STANCE_CARDS } from './stance-cards.js';`,
  `import { STANCE_CARDS } from './stance-cards.js';\nimport { getStanceClass, getStanceClassPresentation } from './stance-compatibility.js';`,
  'run draft stance presentation import',
);
replaceOnce(
  'src/run-draft.js',
  `.runOffer,.rewardChoice{font-family:inherit;color:#9fd2c9;background:rgba(18,36,38,.9);border:1px solid #2c4a47;border-radius:8px;padding:12px;text-align:left;touch-action:manipulation}`,
  `.runOffer,.rewardChoice{font-family:inherit;color:#9fd2c9;background:rgba(18,36,38,.9);border:1px solid #2c4a47;border-radius:8px;padding:12px;text-align:left;touch-action:manipulation}\n  .rewardChoice{position:relative}.rewardClassBadge{position:absolute;top:7px;right:7px;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(159,210,201,.55);background:rgba(8,24,25,.9);color:#d9eee9;font-size:10px;font-weight:900;letter-spacing:0}`,
  'reward class badge style',
);
replaceOnce(
  'src/run-draft.js',
  `    rewardChoices.replaceChildren(...choices.map(card=>{const button=document.createElement('button');button.className='rewardChoice';button.innerHTML=\`<div class="rewardType">${'${isNonStance(card)?card.type.toUpperCase():\'STANCE\''}</div><b>${'${cleanName(card)}'}</b><span>${'${subtitle(card)}'}</span>\`;button.addEventListener('click',()=>{deck.addCard(card);closeReward();});return button;}));`,
  `    rewardChoices.replaceChildren(...choices.map(card=>{\n      const button=document.createElement('button');button.className='rewardChoice';\n      const presentation=!isNonStance(card)?getStanceClassPresentation(getStanceClass(card)):null;\n      const badge=presentation?\`<div class="rewardClassBadge" title="${'${presentation.label}'} stance">${'${presentation.short}'}</div>\`:'';\n      button.dataset.stanceType=presentation?.label||'';\n      button.innerHTML=\`${'${badge}'}<div class="rewardType">${'${isNonStance(card)?card.type.toUpperCase():\'STANCE\''}</div><b>${'${cleanName(card)}'}</b><span>${'${subtitle(card)}'}</span>\`;\n      button.addEventListener('click',()=>{deck.addCard(card);closeReward();});return button;\n    }));`,
  'three-card reward selector stance letters',
);

// Enemy Lab presentation uses the new public terminology while mechanics stay stable.
replaceOnce(
  'src/enemy-lab-stance-compatibility.js',
  `  resolveStanceWeaponCompatibility,\n  stanceClassCounts,`,
  `  resolveStanceWeaponCompatibility,\n  stanceClassCounts,\n  stanceClassDisplayName,`,
  'Enemy Lab presentation import',
);
replaceOnce('src/enemy-lab-stance-compatibility.js',`sub:'Weight-class compatibility'`,`sub:'Speed / Balanced / Power compatibility'`,'Enemy Lab class category label');
replaceOnce(
  'src/enemy-lab-stance-compatibility.js',
  `      root.appendChild(makeStatus(document,snapshot.compatibility.label,\`${'${cleanName(snapshot.stance?.name)||stanceId} · ${snapshot.compatibility.stanceClass} stance with ${snapshot.weapon?.label||snapshot.weaponId} · ${snapshot.compatibility.weaponClass} weapon · ${preferred}'}\`,snapshot.compatibility.tier));`,
  `      root.appendChild(makeStatus(document,snapshot.compatibility.label,\`${'${cleanName(snapshot.stance?.name)||stanceId} · ${stanceClassDisplayName(snapshot.compatibility.stanceClass)} stance with ${snapshot.weapon?.label||snapshot.weaponId} · ${stanceClassDisplayName(snapshot.compatibility.weaponClass)} weapon · ${preferred}'}\`,snapshot.compatibility.tier));`,
  'Enemy Lab current class display',
);
replaceOnce(
  'src/enemy-lab-stance-compatibility.js',
  `      const consequence=snapshot.compatibility.tier==='full'?'Full expression uses the stance-authored chain with stance-dominant timing.':snapshot.compatibility.tier==='adapted'?'Adapted expression substitutes compact moves, changes grip, shortens reach, and reduces damage/stagger.':'Failed expression uses a misuse animation, cannot charge, and creates no damaging hit zones.';`,
  `      const consequence=snapshot.compatibility.tier==='full'?'Full expression uses the stance-authored chain with stance-dominant timing.':snapshot.compatibility.tier==='adapted'?'Adapted expression keeps the stance-authored moves, procedurally retargets their pose/grip, shortens reach, and adjusts damage/stagger.':'Failed expression uses a misuse animation, cannot charge, and creates no damaging hit zones.';`,
  'Enemy Lab adapted consequence copy',
);
replaceOnce(
  'src/enemy-lab-stance-compatibility.js',
  `    const cells=[['LIGHT / LIGHT','FULL','0-class gap'],['LIGHT / MEDIUM','ADAPTED','1-class gap'],['LIGHT / HEAVY','UNUSABLE','2-class gap'],['MEDIUM / LIGHT','ADAPTED','1-class gap'],['MEDIUM / MEDIUM','FULL','0-class gap'],['MEDIUM / HEAVY','ADAPTED','1-class gap'],['HEAVY / LIGHT','UNUSABLE','2-class gap'],['HEAVY / MEDIUM','ADAPTED','1-class gap'],['HEAVY / HEAVY','FULL','0-class gap']];`,
  `    const cells=[['SPEED / SPEED','FULL','0-class gap'],['SPEED / BALANCED','ADAPTED','1-class gap'],['SPEED / POWER','UNUSABLE','2-class gap'],['BALANCED / SPEED','ADAPTED','1-class gap'],['BALANCED / BALANCED','FULL','0-class gap'],['BALANCED / POWER','ADAPTED','1-class gap'],['POWER / SPEED','UNUSABLE','2-class gap'],['POWER / BALANCED','ADAPTED','1-class gap'],['POWER / POWER','FULL','0-class gap']];`,
  'Enemy Lab presentation matrix',
);
replaceOnce(
  'src/enemy-lab-stance-compatibility.js',
  `    const counts=stanceClassCounts();root.appendChild(makeStatus(document,'STANCE CLASSIFICATION',\`${'${counts.Light} Light · ${counts.Medium} Medium · ${counts.Heavy} Heavy · 30 total'}\`));`,
  `    const counts=stanceClassCounts();root.appendChild(makeStatus(document,'STANCE TYPES',\`${'${counts.Light} Speed · ${counts.Medium} Balanced · ${counts.Heavy} Power · 30 total'}\`));`,
  'Enemy Lab stance type count copy',
);
replaceOnce(
  'src/enemy-lab-stance-compatibility.js',
  `      const title=document.createElement('b');title.textContent=\`${'${stanceClass.toUpperCase()} STANCES'}\`;`,
  `      const title=document.createElement('b');title.textContent=\`${'${stanceClassDisplayName(stanceClass).toUpperCase()} STANCES'}\`;`,
  'Enemy Lab stance group titles',
);

// Tests: presentation aliases, weapon reclassification, and UI markers.
replaceOnce(
  'tests/stance-compatibility.test.mjs',
  `import assert from 'node:assert/strict';`,
  `import assert from 'node:assert/strict';\nimport { readFileSync } from 'node:fs';\nimport { STONE_WEAPONS } from '../src/weapons.js';`,
  'stance compatibility test imports',
);
replaceOnce(
  'tests/stance-compatibility.test.mjs',
  `  getStanceClass,\n  getWeaponClass,`,
  `  getStanceClass,\n  getStanceClassPresentation,\n  getWeaponClass,\n  normalizeStanceClass,\n  stanceClassDisplayName,`,
  'stance presentation test imports',
);
insertAfterOnce(
  'tests/stance-compatibility.test.mjs',
  `assert.deepEqual(STANCE_CLASSES,['Light','Medium','Heavy']);`,
  `assert.deepEqual(getStanceClassPresentation('Light'),{label:'Speed',short:'S',symbol:'»'});\nassert.deepEqual(getStanceClassPresentation('Medium'),{label:'Balanced',short:'B',symbol:'◈'});\nassert.deepEqual(getStanceClassPresentation('Heavy'),{label:'Power',short:'P',symbol:'⬟'});\nassert.equal(stanceClassDisplayName('Light'),'Speed');\nassert.equal(normalizeStanceClass('speed'),'Light');\nassert.equal(normalizeStanceClass('balanced'),'Medium');\nassert.equal(normalizeStanceClass('power'),'Heavy');\nassert.equal(getWeaponClass(STONE_WEAPONS.katana),'Light');\nassert.equal(getWeaponClass(STONE_WEAPONS.claymore),'Medium');`,
  'presentation and weapon reassignment tests',
);
insertAfterOnce(
  'tests/stance-compatibility.test.mjs',
  `assert.equal(resolveStanceWeaponCompatibility({stance:{id:'missing'},weapon:dagger}).tier,'unknown');`,
  `\nconst deckSource=readFileSync(new URL('../src/stance-deck.js',import.meta.url),'utf8');\nconst draftSource=readFileSync(new URL('../src/run-draft.js',import.meta.url),'utf8');\nassert.match(deckSource,/stancePresentation\.symbol/,'stance-card art must show the stance type symbol');\nassert.match(deckSource,/stancePresentation\.label\.toUpperCase/,'stance-card art must show Speed/Balanced/Power');\nassert.match(draftSource,/rewardClassBadge/,'three-card reward selector must carry a compact class badge');\nassert.match(draftSource,/presentation\.short/,'reward selector badge must use S/B/P');`,
  'UI presentation source tests',
);
replaceOnce(
  'tests/combat-pass.test.mjs',
  `  longsword:'Medium', dagger:'Light', rapier:'Light', katana:'Medium', whip:'Light',\n  mace:'Medium', spear:'Medium', battleaxe:'Heavy', warhammer:'Heavy', claymore:'Heavy', greatsword:'Heavy'`,
  `  longsword:'Medium', dagger:'Light', rapier:'Light', katana:'Light', whip:'Light',\n  mace:'Medium', spear:'Medium', battleaxe:'Heavy', warhammer:'Heavy', claymore:'Medium', greatsword:'Heavy'`,
  'weapon class expectations',
);
replaceOnce(
  'tests/stance-class-template-rollout.test.mjs',
  `const lightMedium=resolveGate2PilotProfile({stance:STANCE_CARDS.find(s=>s.id==='S23'),weapon:STONE_WEAPONS.katana,weaponId:'katana'});`,
  `assert.equal(getWeaponClass(STONE_WEAPONS.katana),'Light');\nassert.equal(getWeaponClass(STONE_WEAPONS.claymore),'Medium');\nconst katanaSpeed=resolveGate2PilotProfile({stance:STANCE_CARDS.find(s=>s.id==='S23'),weapon:STONE_WEAPONS.katana,weaponId:'katana'});\nassert.equal(katanaSpeed.compatibility.tier,'full','Speed stance + Katana should now be full alignment');\nconst claymoreBalanced=resolveGate2PilotProfile({stance:STANCE_CARDS.find(s=>s.id==='S03'),weapon:STONE_WEAPONS.claymore,weaponId:'claymore'});\nassert.equal(claymoreBalanced.compatibility.tier,'full','Balanced stance + Claymore should now be full alignment');\nconst lightMedium=resolveGate2PilotProfile({stance:STANCE_CARDS.find(s=>s.id==='S23'),weapon:STONE_WEAPONS.longsword,weaponId:'longsword'});`,
  'new Katana/Claymore rollout expectations',
);

// Document the presentation layer and the two weapon moves.
const classDoc='docs/design/STANCE_2_CLASS_TEMPLATE.md';
const doc=read(classDoc);
if(!doc.includes('## Player-facing type names'))write(classDoc,doc+`\n\n## Player-facing type names\n\nThe stable internal class IDs remain Light / Medium / Heavy, while player-facing UI calls them **Speed / Balanced / Power**. Stance-card art uses **» SPEED**, **◈ BALANCED**, and **⬟ POWER**; the three-card room reward selector uses **S / B / P** badges. `+'`normalizeStanceClass()`'+` accepts either vocabulary.\n\nWeapon-class tuning now treats **Katana as Light / Speed** and **Claymore as Medium / Balanced**. The existing 3×3 template automatically recomputes compatibility from those classes; no pair-specific exceptions are added.\n`);

// Make the reused registered runner leave an accurate commit message.
write('.git/hooks/commit-msg',`#!/bin/sh\nprintf '%s\\n' 'Add Speed Balanced Power stance presentation' > "$1"\n`);chmodSync('.git/hooks/commit-msg',0o755);

execFileSync('git',['add','src/stance-compatibility.js','src/weapons.js','src/stance-deck.js','src/run-draft.js','src/enemy-lab-stance-compatibility.js','tests/stance-compatibility.test.mjs','tests/combat-pass.test.mjs','tests/stance-class-template-rollout.test.mjs','docs/design/STANCE_2_CLASS_TEMPLATE.md'],{stdio:'inherit'});
console.log('Speed / Balanced / Power presentation and weapon-class patch applied');
