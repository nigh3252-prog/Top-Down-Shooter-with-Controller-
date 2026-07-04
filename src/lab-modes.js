// Stone Wanderer lab modes.
//
// This module pulls the useful behavior from the old individual move-test wrapper
// into the official Red Toll / Weapon Lab entry point. It is still a transition
// layer that patches the big Stone Lab core at load time, but the lab-mode logic
// now has one source-module home instead of living only in a separate wrapper page.

const MODE_KEY = 'stoneWandererMoveTestMode.v1';
const VERTICAL_POOL_KEY = 'stoneWandererMoveVerticalPool.v1';

function replaceRequired(html, needle, replacement, label) {
  if (!html.includes(needle)) throw new Error('Lab mode patch target not found: ' + label);
  return html.replace(needle, replacement);
}

function replaceOptional(html, needle, replacement, label) {
  if (!html.includes(needle)) {
    console.warn('Optional lab mode patch target not found:', label);
    return html;
  }
  return html.replace(needle, replacement);
}

function coreLabModePatch() {
  return String.raw`
const MOVE_MODE_KEY='stoneWandererMoveTestMode.v1';
const MOVE_RATINGS_KEY='stoneWandererIndividualMoveRatings.v1';
const MOVE_VERTICAL_POOL_KEY='stoneWandererMoveVerticalPool.v1';
const LOCKED_VERTICAL_RATINGS={vertical:'down',vertical2:'up',vertical3:'up',vertical4:'up',vertical5:'up',vertical6:'down',vertical7:'up',vertical8:'up',vertical9:'up',vertical10:'up',vertical11:'up',vertical12:'down',vertical13:'down',vertical14:'down',vertical15:'up',vertical16:'up'};
const moveTestState={selectedGroup:'vertical',selected:{vertical:0,horizontal:0,stab:0},ratings:{}};
function loadMoveRatings(){try{moveTestState.ratings=JSON.parse(localStorage.getItem(MOVE_RATINGS_KEY)||'{}')||{};}catch(err){moveTestState.ratings={};}}
function saveMoveRatings(){try{localStorage.setItem(MOVE_RATINGS_KEY,JSON.stringify(moveTestState.ratings));}catch(err){}}
loadMoveRatings();
function moveTestFullIndex(group,key){const full=ATTACK_GROUPS[group]||[]; const idx=full.indexOf(key); return idx>=0?idx:0;}
function seedLockedMoveRatings(){for(const key of Object.keys(LOCKED_VERTICAL_RATINGS)){const idx=moveTestFullIndex('vertical',key); const id='vertical:'+(idx+1); moveTestState.ratings[id]={id,group:'vertical',index:idx+1,total:(ATTACK_GROUPS.vertical||[]).length,key,label:attackDisplayLabel(key),weapon:'locked',rating:LOCKED_VERTICAL_RATINGS[key],locked:true,updatedAt:'locked-in-file'};} saveMoveRatings();}
seedLockedMoveRatings();
function isMoveTestMode(){return localStorage.getItem(MOVE_MODE_KEY)==='moves';}
function moveVerticalPoolMode(){return localStorage.getItem(MOVE_VERTICAL_POOL_KEY)||'approved';}
function moveTestSetMode(mode){localStorage.setItem(MOVE_MODE_KEY,mode==='moves'?'moves':'stance'); updateVariantReadout(); updateLabUI(); updateMainStatusLine(); window.dispatchEvent(new CustomEvent('stoneMoveTestUpdate'));}
function moveTestSetVerticalPool(mode){localStorage.setItem(MOVE_VERTICAL_POOL_KEY,mode||'approved'); moveTestState.selected.vertical=0; updateMoveTestSurfaces();}
function moveTestGroups(){return {vertical:{label:'Slice',family:'Vertical',pad:'□'},horizontal:{label:'Sweep',family:'Horizontal',pad:'△'},stab:{label:'Thrust',family:'Thrust',pad:'○'}};}
function moveTestPool(group){if(group==='vertical'){const mode=moveVerticalPoolMode(); if(mode==='bad')return BAD_VERTICAL_ATTACKS; if(mode==='all')return ALL_VERTICAL_ATTACKS; return APPROVED_VERTICAL_ATTACKS;} return ATTACK_GROUPS[group]||[];}
function moveTestIndex(group){const list=moveTestPool(group); const n=list.length||1; moveTestState.selected[group]=((moveTestState.selected[group]||0)%n+n)%n; return moveTestState.selected[group];}
function moveTestId(group,actualIndex){return group+':'+((actualIndex||0)+1);}
function moveGlyph(v){return v==='up'?'👍':(v==='down'?'👎':'—');}
function moveTestSlot(group,poolIndex){const list=moveTestPool(group); const n=list.length||1; const i=((poolIndex%n)+n)%n; const key=list[i]; const actual=moveTestFullIndex(group,key); const row=moveTestState.ratings[moveTestId(group,actual)]; const full=ATTACK_GROUPS[group]||list; return {group,index:actual,poolIndex:i,total:full.length,poolTotal:n,key,label:row?.label||attackDisplayLabel(key),rating:row?.rating||''};}
function moveTestReviewModel(){const group=moveTestState.selectedGroup||'vertical'; const info=moveTestGroups()[group]||moveTestGroups().vertical; const i=moveTestIndex(group); return {mode:isMoveTestMode(),group,info,verticalPool:moveVerticalPoolMode(),prev:moveTestSlot(group,i-1),selected:moveTestSlot(group,i),next:moveTestSlot(group,i+1),then:moveTestSlot(group,i+2),counts:Object.values(moveTestState.ratings).reduce((a,r)=>{a.count++; if(r.rating==='up')a.up++; if(r.rating==='down')a.down++; return a;},{count:0,up:0,down:0})};}
function updateMoveTestSurfaces(){updateVariantReadout(); updateMainStatusLine(); window.dispatchEvent(new CustomEvent('stoneMoveTestUpdate'));}
function selectMoveGroup(group){if(!ATTACK_GROUPS[group])return; moveTestState.selectedGroup=group; updateMoveTestSurfaces();}
function nudgeMoveSelection(delta){if(!isMoveTestMode())return false; const group=moveTestState.selectedGroup||'vertical'; const list=moveTestPool(group); moveTestState.selected[group]=((moveTestIndex(group)+delta)%list.length+list.length)%list.length; updateMoveTestSurfaces(); return true;}
function moveTestPlay(group){selectMoveGroup(group); const slot=moveTestSlot(group,moveTestIndex(group)); const event=makeLabEvent(slot.key,slot.index); event.moveTest=true; flashCombatButton(group); if(!combatState.attack) startCombatAttack(slot.key,group,event); else {combatState.pending=slot.key; combatState.pendingGroup=group; combatState.pendingLabEvent=event; if(combatState.t>combatState.attack.comboAt){labOnAttackComplete(); startCombatAttack(slot.key,group,event); combatState.pending=null; combatState.pendingGroup=null; combatState.pendingLabEvent=null;}} updateLabUI(); updateMoveTestSurfaces(); return true;}
function moveTestRate(value){const group=moveTestState.selectedGroup||'vertical'; const slot=moveTestSlot(group,moveTestIndex(group)); const id=moveTestId(group,slot.index); if(value){moveTestState.ratings[id]={id,group,index:slot.index+1,total:slot.total,key:slot.key,label:attackDisplayLabel(slot.key),weapon:combatState.weapon,rating:value,updatedAt:new Date().toISOString()};}else delete moveTestState.ratings[id]; saveMoveRatings(); updateMoveTestSurfaces();}
function moveTestLabAction(action){if(action==='attack')return moveTestPlay('vertical'); if(action==='nextStance')return moveTestPlay('horizontal'); if(action==='randomStance')return moveTestPlay('stab'); if(action==='rateDown'){moveTestRate('down'); return true;} if(action==='rateUp'){moveTestRate('up'); return true;} if(action==='clearRating'){moveTestRate(''); return true;} return false;}
window.__stoneMoveTestGetReview=moveTestReviewModel;
window.__stoneMoveTestSetMode=moveTestSetMode;
window.__stoneMoveTestSetVerticalPool=moveTestSetVerticalPool;
`;
}

export function applyLabModeCorePatch(html) {
  html = replaceRequired(
    html,
    "const EXACT_ATTACK_POOL = [...ATTACK_GROUPS.vertical, ...ATTACK_GROUPS.horizontal, ...ATTACK_GROUPS.stab];",
    "const APPROVED_VERTICAL_ATTACKS=['vertical2','vertical3','vertical4','vertical5','vertical7','vertical8','vertical9','vertical10','vertical11','vertical15','vertical16'];\nconst BAD_VERTICAL_ATTACKS=['vertical','vertical6','vertical12','vertical13','vertical14'];\nconst ALL_VERTICAL_ATTACKS=[...ATTACK_GROUPS.vertical];\nconst EXACT_ATTACK_POOL=[...APPROVED_VERTICAL_ATTACKS, ...ATTACK_GROUPS.horizontal, ...ATTACK_GROUPS.stab];",
    'approved attack pool'
  );

  const labStateNeedle = `const labState = {
  sessionId:'S-'+Date.now().toString(36), authoredIndex:0, randomCounter:0,
  currentStance:null, source:'authored', comboIndex:0, comboWindow:.82, comboDeadline:0,
  trialSeq:0, trials:[], currentTrial:null, activeEvent:null
};`;
  html = replaceRequired(html, labStateNeedle, labStateNeedle + '\n' + coreLabModePatch(), 'move state insert');

  html = replaceRequired(
    html,
    `function labAction(action){
  if(action==='attack') labAttack();
  else if(action==='nextStance') nextAuthoredStance();
  else if(action==='randomStance') randomStance();
  else if(action==='nextWeapon') nextWeaponForLab();
  else if(action==='rateDown') setLabRating('down');
  else if(action==='rateUp') setLabRating('up');
  else if(action==='clearRating') setLabRating('');
  else if(action==='downloadCsv') downloadLabCsv();
  else if(action==='downloadJson') downloadLabJson();
  else if(action==='clearSession'){ labState.trials=[]; labState.currentTrial=null; labState.trialSeq=0; selectAuthoredStance(labState.authoredIndex||0); saveLabData(); }
}`,
    `function labAction(action){
  if(isMoveTestMode() && moveTestLabAction(action)) return;
  if(action==='attack') labAttack();
  else if(action==='nextStance') nextAuthoredStance();
  else if(action==='randomStance') randomStance();
  else if(action==='nextWeapon') nextWeaponForLab();
  else if(action==='rateDown') setLabRating('down');
  else if(action==='rateUp') setLabRating('up');
  else if(action==='clearRating') setLabRating('');
  else if(action==='downloadCsv') downloadLabCsv();
  else if(action==='downloadJson') downloadLabJson();
  else if(action==='clearSession'){ labState.trials=[]; labState.currentTrial=null; labState.trialSeq=0; selectAuthoredStance(labState.authoredIndex||0); saveLabData(); }
}`,
    'labAction moves mode'
  );

  html = replaceRequired(
    html,
    `function updateVariantReadout(){
  const map={vertical:'varV',horizontal:'varH',stab:'varS'};
  Object.keys(map).forEach(group=>{const el=document.getElementById(map[group]); if(el) el.textContent='next '+(((combatState.variantIndex[group]||0)+1))+'/'+ATTACK_GROUPS[group].length;});
}`,
    `function updateVariantReadout(){
  const map={vertical:'varV',horizontal:'varH',stab:'varS'};
  Object.keys(map).forEach(group=>{const el=document.getElementById(map[group]); if(!el) return; if(isMoveTestMode()){const s=moveTestSlot(group,moveTestIndex(group)); el.textContent='selected '+(s.poolIndex+1)+'/'+s.poolTotal;} else el.textContent='next '+(((combatState.variantIndex[group]||0)+1))+'/'+ATTACK_GROUPS[group].length;});
}`,
    'variant readout'
  );

  html = replaceRequired(
    html,
    `function updateMainStatusLine(){
  const el=document.getElementById('miniStatus'); if(!el) return;
  const swing=combatState.attack ? attackDisplayLabel(combatState.attackKey||'') : (aimState.lastSwing || 'none');
  const damage=aimState.lastDamage ? \` · Hit: \${aimState.lastDamage}\` : '';
  const gp=aimState.connected ? ' · Controller ready' : '';
  const st=labState.currentStance; const tr=labState.currentTrial;
  const stance=st ? \` · Stance: \${st.name} \${ratingGlyph(tr?.rating||'')}\` : '';
  el.textContent=\`□ Attack · △ Stance · ○ Random · ✕ Weapon · Aim: \${aimState.source || 'Idle'} · Last: \${swing}\${stance}\${damage}\${gp}\`;
}`,
    `function updateMainStatusLine(){
  const el=document.getElementById('miniStatus'); if(!el) return;
  if(isMoveTestMode()){const m=moveTestReviewModel(); const gp=aimState.connected?' · Controller ready':''; el.textContent=\`\${m.info.pad} \${m.info.label} test · Selected: \${m.selected.label} \${moveGlyph(m.selected.rating)} · D-pad ↑/↓ selects · LB/RB rates\${gp}\`; return;}
  const swing=combatState.attack ? attackDisplayLabel(combatState.attackKey||'') : (aimState.lastSwing || 'none');
  const damage=aimState.lastDamage ? \` · Hit: \${aimState.lastDamage}\` : '';
  const gp=aimState.connected ? ' · Controller ready' : '';
  const st=labState.currentStance; const tr=labState.currentTrial;
  const stance=st ? \` · Stance: \${st.name} \${ratingGlyph(tr?.rating||'')}\` : '';
  el.textContent=\`□ Attack · △ Stance · ○ Random · ✕ Weapon · Aim: \${aimState.source || 'Idle'} · Last: \${swing}\${stance}\${damage}\${gp}\`;
}`,
    'main status line'
  );

  html = replaceRequired(
    html,
    `function setDir(dir, on) { keyState[dir] = on; updatePadVisuals(); }`,
    `function setDir(dir, on) { if(isMoveTestMode() && (dir==='up'||dir==='down')){ if(on) nudgeMoveSelection(dir==='up'?-1:1); keyState[dir]=false; updatePadVisuals(); return; } keyState[dir] = on; updatePadVisuals(); }`,
    'touch dpad setDir'
  );

  html = replaceRequired(
    html,
    `const dpy=(gp.buttons[13]?.pressed?1:0)-(gp.buttons[12]?.pressed?1:0);`,
    `const dpy=isMoveTestMode()?0:((gp.buttons[13]?.pressed?1:0)-(gp.buttons[12]?.pressed?1:0));`,
    'controller dpad movement'
  );

  html = replaceRequired(
    html,
    `if(gpPressed(gp,2)) labAction('attack');        // Square / X button`,
    `if(isMoveTestMode() && gpPressed(gp,12)) nudgeMoveSelection(-1);
    if(isMoveTestMode() && gpPressed(gp,13)) nudgeMoveSelection(1);
    if(gpPressed(gp,2)) labAction('attack');        // Square / X button`,
    'controller dpad select'
  );

  html = replaceOptional(
    html,
    `const hideArms=document.getElementById('hideCombatArms'); if(hideArms) hideArms.addEventListener('change',e=>{combatState.hideArms=e.target.checked; updateCombatArmVisibility();});`,
    `const hideArms=document.getElementById('hideCombatArms'); if(hideArms){ hideArms.checked=true; combatState.hideArms=true; hideArms.addEventListener('change',e=>{combatState.hideArms=e.target.checked; updateCombatArmVisibility();}); updateCombatArmVisibility(); }`,
    'hide arms default'
  );

  return html;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>\"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[ch]));
}

function row(label, data) {
  return `<div class="move-review-row"><span>${esc(label)}</span><strong>${esc(data.label)}</strong><b class="move-review-rate">${data.rating === 'up' ? '👍' : data.rating === 'down' ? '👎' : '—'}</b></div>`;
}

export function installLabModeChrome({ frame }) {
  function installWrapperChrome() {
    const d = frame.contentDocument;
    const w = frame.contentWindow;
    if (!d || !w) return;

    if (!d.getElementById('moveReviewStyle')) {
      const style = d.createElement('style');
      style.id = 'moveReviewStyle';
      style.textContent = `#moveReviewPanel{display:none}body.move-test-review #panel{width:min(760px, calc(100vw - 24px))}body.move-test-review #panel header{align-items:flex-start;gap:12px;padding:12px 14px}body.move-test-review #panel header>div:first-child{min-width:0;flex:1}body.move-test-review #panel header>div:first-child>h1,body.move-test-review #panel header>div:first-child>p{display:none!important}body.move-test-review #panel header .header-actions{flex:0 0 auto;align-self:flex-start}body.move-test-review #moveReviewPanel{display:grid;gap:5px;font-size:12px;line-height:1.22;color:var(--muted)}body.move-test-review .move-review-title{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--text);font-weight:900;margin-bottom:2px}body.move-test-review .move-review-row{display:grid;grid-template-columns:72px minmax(0,1fr) 28px;gap:8px;align-items:baseline}body.move-test-review .move-review-row span:first-child{color:rgba(238,246,255,.64);font-weight:850}body.move-test-review .move-review-row strong{color:var(--text);font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}body.move-test-review .move-review-rate{text-align:right;font-weight:900;color:var(--text)}body.move-test-review #miniStatus{display:none!important}@media(max-width:700px){body.move-test-review #panel{left:max(8px, env(safe-area-inset-left));top:max(8px, env(safe-area-inset-top));width:calc(100vw - 16px)}body.move-test-review #panel header{padding:10px 12px}body.move-test-review .move-review-row{grid-template-columns:60px minmax(0,1fr) 24px;gap:6px;font-size:11px}body.move-test-review .move-review-title{font-size:11px}}`;
      d.head.appendChild(style);
    }

    const headerInfo = d.querySelector('#panel header > div:first-child');
    if (headerInfo && !d.getElementById('moveReviewPanel')) {
      const p = d.createElement('div');
      p.id = 'moveReviewPanel';
      headerInfo.appendChild(p);
    }

    if (!d.getElementById('moveTestModeSelect')) {
      const combatMeta = d.getElementById('combatMeta');
      if (combatMeta) {
        combatMeta.insertAdjacentHTML('afterend', `<div class="section">Lab Mode</div><label class="row short"><span>Mode</span><select id="moveTestModeSelect" aria-label="Lab mode"><option value="stance">Stance Cards</option><option value="moves">Individual Moves</option></select></label><label class="row short" id="moveVerticalPoolRow"><span>Vertical Pool</span><select id="moveVerticalPoolSelect" aria-label="Vertical move pool"><option value="approved">Approved Vertical Slices</option><option value="bad">Bad Vertical Slices</option><option value="all">All Vertical Slices</option></select></label><div class="combat-meta lab-meta" id="moveTestModeMeta"></div>`);
        const sel = d.getElementById('moveTestModeSelect');
        sel.value = localStorage.getItem(MODE_KEY) === 'moves' ? 'moves' : 'stance';
        sel.addEventListener('change', e => {
          localStorage.setItem(MODE_KEY, e.target.value);
          w.__stoneMoveTestSetMode?.(e.target.value);
          renderWrapperChrome();
        });
        const pool = d.getElementById('moveVerticalPoolSelect');
        pool.value = localStorage.getItem(VERTICAL_POOL_KEY) || 'approved';
        pool.addEventListener('change', e => {
          localStorage.setItem(VERTICAL_POOL_KEY, e.target.value);
          w.__stoneMoveTestSetVerticalPool?.(e.target.value);
          renderWrapperChrome();
        });
      }
    }
  }

  function renderWrapperChrome() {
    const d = frame.contentDocument;
    const w = frame.contentWindow;
    if (!d || !w) return;
    const model = w.__stoneMoveTestGetReview?.();
    const moves = !!model?.mode;
    d.body?.classList.toggle('move-test-review', moves);

    const sel = d.getElementById('moveTestModeSelect');
    if (sel) sel.value = moves ? 'moves' : 'stance';

    const pool = d.getElementById('moveVerticalPoolSelect');
    if (pool) pool.value = model?.verticalPool || localStorage.getItem(VERTICAL_POOL_KEY) || 'approved';

    const poolRow = d.getElementById('moveVerticalPoolRow');
    if (poolRow) poolRow.style.display = moves ? 'flex' : 'none';

    const panel = d.getElementById('moveReviewPanel');
    if (panel) {
      panel.innerHTML = moves
        ? `<div class="move-review-title">${esc(model.info.pad)} ${esc(model.info.label)} / ${esc(model.info.family)} test</div>` + row('Previous', model.prev) + row('Selected', model.selected) + row('Next', model.next) + row('Then', model.then)
        : '';
    }

    const meta = d.getElementById('moveTestModeMeta');
    if (meta) {
      if (moves) meta.innerHTML = `<strong>Individual Moves</strong><br>□ Slice · △ Sweep · ○ Thrust repeat selected move. D-pad ↑/↓ changes selected move.<br><span class="rating-badge">${model.counts.up} 👍</span><span class="rating-badge">${model.counts.down} 👎</span><span class="rating-badge">${model.counts.count} rated</span>`;
      else meta.innerHTML = '<strong>Stance Cards</strong><br>□ Attack plays the next chain hit. △ cycles authored stances. ○ creates a random stance. Random verticals use approved slices only.';
    }
  }

  frame.addEventListener('load', () => {
    setInterval(() => {
      installWrapperChrome();
      renderWrapperChrome();
    }, 250);
    try {
      frame.contentWindow.addEventListener('stoneMoveTestUpdate', renderWrapperChrome);
    } catch (e) {}
  });
}
