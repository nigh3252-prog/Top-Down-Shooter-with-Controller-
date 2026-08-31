from pathlib import Path

src=Path('tools/realtime-deckbuilder-microgame-arcade-v2.html')
out=Path('tools/realtime-deckbuilder-microgame-arcade-v3.html')
text=src.read_text(encoding='utf-8')

def rep(old,new):
    global text
    if old not in text:
        raise SystemExit('missing fragment: '+old[:140])
    text=text.replace(old,new,1)

rep('<title>Real-Time Deckbuilder Microgame Arcade v2</title>','<title>Real-Time Deckbuilder Microgame Arcade v3</title>')
rep('.result-score{font-size:38px;font-weight:1000;letter-spacing:-.05em;margin:10px 0 0;color:#fff}', '''.result-score{font-size:38px;font-weight:1000;letter-spacing:-.05em;margin:10px 0 0;color:#fff}
#rewardFly{position:fixed;z-index:50;left:50%;top:47%;width:112px;height:142px;display:none;place-items:center;transform:translate(-50%,-50%);border-radius:18px;border:2px solid rgba(255,255,255,.75);background:linear-gradient(155deg,#34405a,#151b27);box-shadow:0 18px 65px rgba(0,0,0,.6);pointer-events:none;text-align:center;padding:10px;font-weight:1000}
#rewardFly.show{display:grid;animation:rewardJoin .72s cubic-bezier(.2,.75,.24,1) forwards}
#rewardFly .fly-glyph{font-size:38px;line-height:1}
#rewardFly .fly-name{font-size:12px;line-height:1.05}
@keyframes rewardJoin{0%{opacity:0;transform:translate(-50%,-42%) scale(.7) rotate(-5deg)}18%{opacity:1;transform:translate(-50%,-50%) scale(1.08) rotate(2deg)}55%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;left:76%;top:88%;transform:translate(-50%,-50%) scale(.22) rotate(7deg)}}''')
rep('</div>\n\n<script>', '</div>\n<div id="rewardFly"></div>\n\n<script>')
rep('const soundBtn=$("#soundBtn");','const soundBtn=$("#soundBtn"),rewardFly=$("#rewardFly");')
rep('return {elapsed:0,duration:52,score:0,cardsPlayed:0,paused:false,over:false,won:false,rewardIndex:0,rewardTimes:[18,36],player:', 'return {elapsed:0,duration:52,score:0,cardsPlayed:0,paused:false,over:false,won:false,rewardIndex:0,rewardTimes:[18,36],rewardPending:false,rewardPedestal:null,rewardChoosing:false,wave:1,player:')
rep('''function showReward(){if(!S||S.over)return;S.paused=true;const picks=pickRewardKeys();presentModal({eyebrow:"Live draft",title:"Add one card",html:`<p>The chosen card enters this game’s real circulation rule immediately.</p><div class="reward-grid">${picks.map(k=>{const c=CARD_DEFS[k];return `<button class="reward-card" data-reward="${k}" style="--accent:${c.color}"><span class="card-glyph">${c.glyph}</span><b>${c.name}</b><small>${c.desc}</small></button>`;}).join("")}</div>`,handlers:{}});}
function chooseReward(key){if(!S||!currentMode)return;currentMode.addReward(makeCard(key));hideModal();S.paused=false;toast(`${CARD_DEFS[key].name} added`);sfx("reward");renderUI(true);}
function maybeReward(){if(S.rewardIndex<S.rewardTimes.length&&S.elapsed>=S.rewardTimes[S.rewardIndex]){S.rewardIndex++;showReward();}}''', '''function showReward(){
  if(!S||S.over||!S.rewardPedestal||S.rewardChoosing)return;
  S.rewardChoosing=true;S.paused=true;resetStick();
  const picks=pickRewardKeys();
  presentModal({eyebrow:`Wave ${S.wave} reward`,title:"Choose one card",html:`<p>You cleared the encounter and deliberately opened the reward shrine. Pick one card for the deck.</p><div class="reward-grid">${picks.map(k=>{const c=CARD_DEFS[k];return `<button class="reward-card" data-reward="${k}" style="--accent:${c.color}"><span class="card-glyph">${c.glyph}</span><b>${c.name}</b><small>${c.desc}</small></button>`;}).join("")}</div>`,handlers:{}});
}
function finishRewardSequence(){
  if(!S)return;
  S.rewardPending=false;S.rewardPedestal=null;S.rewardChoosing=false;S.wave++;S.spawnTimer=.45;S.paused=false;
  toast(`Wave ${S.wave} begins`);sfx("start");renderUI(true);
}
function chooseReward(key){
  if(!S||!currentMode||!S.rewardChoosing)return;
  const card=makeCard(key);currentMode.addReward(card);hideModal();
  const def=CARD_DEFS[key];rewardFly.style.setProperty("--accent",def.color);rewardFly.style.borderColor=def.color;rewardFly.innerHTML=`<div class="fly-glyph" style="color:${def.color}">${def.glyph}</div><div class="fly-name">${def.name}<br><small>joins deck</small></div>`;
  rewardFly.classList.remove("show");void rewardFly.offsetWidth;rewardFly.classList.add("show");sfx("reward");vibrate(24);
  setTimeout(()=>{rewardFly.classList.remove("show");finishRewardSequence();},720);
}
function maybeReward(){
  if(!S||S.rewardPending||S.rewardPedestal||S.rewardChoosing)return;
  if(S.rewardIndex<S.rewardTimes.length&&S.elapsed>=S.rewardTimes[S.rewardIndex]){
    S.rewardIndex++;S.rewardPending=true;toast("Wave ending — clear remaining threats");sfx("good");
  }
}
function rewardThreatCount(){
  if(!S)return 0;
  if(currentMode&&currentMode.kind==="lanes")return S.mode.enemies?S.mode.enemies.filter(e=>!e.dead).length:0;
  if(currentMode&&currentMode.kind==="topdown")return S.enemies.filter(e=>!e.dead&&!e.boss).length;
  return 0;
}
function spawnRewardPedestal(){
  if(!S||S.rewardPedestal)return;
  const auto=!!(currentMode.hideJoystick||currentMode.kind==="breakout");
  let x=W/2,y=H*.56;
  if(!auto){
    const candidates=[{x:58,y:72},{x:W-58,y:72},{x:58,y:H-72},{x:W-58,y:H-72},{x:W/2,y:72}];
    const p=S.player;candidates.sort((a,b)=>Math.hypot(b.x-p.x,b.y-p.y)-Math.hypot(a.x-p.x,a.y-p.y));x=candidates[0].x;y=candidates[0].y;
  }
  S.rewardPedestal={x,y,r:48,auto,pulse:0};S.enemyProjectiles.length=0;
  particleBurst(x,y,"#ffe08a",24,125);toast(auto?"Wave clear — choose your reward":"Wave clear — reward shrine opened");sfx("reward");vibrate(30);
}
function updateRewardFlow(dt){
  if(!S)return;
  if(S.rewardPedestal){S.rewardPedestal.pulse+=dt;return;}
  if(!S.rewardPending||S.rewardChoosing)return;
  if(rewardThreatCount()===0)spawnRewardPedestal();
}
function rewardCanInteract(){
  if(!S||!S.rewardPedestal)return false;
  const r=S.rewardPedestal;if(r.auto)return true;
  return Math.hypot(S.player.x-r.x,S.player.y-r.y)<r.r+24;
}
function drawRewardOverlay(){
  if(!S||!S.rewardPedestal)return;
  const r=S.rewardPedestal,t=S.elapsed+(r.pulse||0),near=rewardCanInteract();
  ctx.save();
  const beam=ctx.createLinearGradient(r.x,r.y-92,r.x,r.y+28);beam.addColorStop(0,"rgba(255,224,138,0)");beam.addColorStop(1,near?"rgba(255,224,138,.24)":"rgba(255,224,138,.12)");ctx.fillStyle=beam;ctx.beginPath();ctx.moveTo(r.x-35,r.y+8);ctx.lineTo(r.x-13,r.y-90);ctx.lineTo(r.x+13,r.y-90);ctx.lineTo(r.x+35,r.y+8);ctx.closePath();ctx.fill();
  drawCircle(r.x,r.y+9,30,"#272231","#ffe08a",3);ctx.fillStyle="#786236";ctx.fillRect(r.x-23,r.y+9,46,15);ctx.fillStyle="#ffe08a";ctx.fillRect(r.x-17,r.y+2,34,10);
  const bob=Math.sin(t*4)*5;drawCircle(r.x,r.y-28+bob,17,"#ffe08a","#fff4c8",2);ctx.fillStyle="#292015";ctx.font="1000 20px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("✦",r.x,r.y-28+bob);
  drawCircle(r.x,r.y,48+Math.sin(t*3)*3,null,near?"#fff4bd":"rgba(255,224,138,.55)",near?4:2);
  ctx.fillStyle=near?"#fff6ce":"#ffe08a";ctx.font="1000 11px system-ui";ctx.textAlign="center";ctx.fillText(near?"REWARD READY":"REWARD",r.x,r.y+49);
  ctx.restore();
}''')
rep('''function renderActions(){const actions=currentMode&&currentMode.actions?currentMode.actions():[];actionTray.innerHTML=actions.map(a=>`<button class="action-btn ${a.primary?"primary":""} ${a.danger?"danger":""}" data-action="${a.id}" ${a.disabled?"disabled":""}>${a.label}</button>`).join("");actionTray.classList.toggle("hidden",!actions.length);}''', '''function renderActions(){let actions=currentMode&&currentMode.actions?currentMode.actions():[];if(S&&S.rewardPedestal&&rewardCanInteract())actions=[...actions,{id:"__reward",label:"CHOOSE REWARD",primary:true}];actionTray.innerHTML=actions.map(a=>`<button class="action-btn ${a.primary?"primary":""} ${a.danger?"danger":""}" data-action="${a.id}" ${a.disabled?"disabled":""}>${a.label}</button>`).join("");actionTray.classList.toggle("hidden",!actions.length);}''')
rep('''actionTray.addEventListener("pointerdown",e=>{const b=e.target.closest("[data-action]");if(!b||b.disabled||!S||S.paused||S.over)return;e.preventDefault();currentMode.action&&currentMode.action(b.dataset.action);renderUI(true);});''', '''actionTray.addEventListener("pointerdown",e=>{const b=e.target.closest("[data-action]");if(!b||b.disabled||!S||S.paused||S.over)return;e.preventDefault();if(b.dataset.action==="__reward"){showReward();return;}currentMode.action&&currentMode.action(b.dataset.action);renderUI(true);});''')
rep('if(opts.spawn!==false){S.spawnTimer-=dt;', 'if(opts.spawn!==false&&!S.rewardPending&&!S.rewardPedestal){S.spawnTimer-=dt;')
rep('if(m.spawn<=0){m.enemies.push({lane:', 'if(m.spawn<=0&&!S.rewardPending&&!S.rewardPedestal){m.enemies.push({lane:')
rep('''  update(dt){const m=S.mode,v=moveVector();m.paddle.x=clamp''', '''  update(dt){const m=S.mode;if(S.rewardPedestal)return;const v=moveVector();m.paddle.x=clamp''')
rep('''  update(dt){const m=S.mode,p=m.player,ai=m.ai,q=m.puck;movePlayer(dt,175);m.strikeCd''', '''  update(dt){const m=S.mode,p=m.player,ai=m.ai,q=m.puck;movePlayer(dt,175);if(S.rewardPedestal)return;m.strikeCd''')
rep('''  update(dt){const m=S.mode;updateTopdown(dt,{spawn:false});m.attackTimer-=dt;''', '''  update(dt){const m=S.mode;if(S.rewardPending||S.rewardPedestal){movePlayer(dt);return;}updateTopdown(dt,{spawn:false});m.attackTimer-=dt;''')
rep('''  update(dt){const m=S.mode;m.spawn-=dt;m.freeze=Math.max''', '''  update(dt){const m=S.mode;if(S.rewardPedestal)return;m.spawn-=dt;m.freeze=Math.max''')
rep('''  if(!S.paused&&!S.over){if(S.mode.freezeShots>0)S.mode.freezeShots=Math.max(0,S.mode.freezeShots-dt);S.elapsed+=dt;updateGlobal(dt);currentMode.update(dt);maybeReward();if(S.elapsed>=S.duration&&!S.over){if(currentMode.timeUp)currentMode.timeUp();else finish(true,"Time survived");}}
  if(currentMode.draw)currentMode.draw();else drawTopdown();uiClock-=dt;if(uiClock<=0){renderUI();uiClock=.11;}''', '''  if(!S.paused&&!S.over){if(S.mode.freezeShots>0)S.mode.freezeShots=Math.max(0,S.mode.freezeShots-dt);if(!S.rewardPedestal)S.elapsed+=dt;maybeReward();updateGlobal(dt);currentMode.update(dt);updateRewardFlow(dt);if(S.elapsed>=S.duration&&!S.over&&!S.rewardPending&&!S.rewardPedestal&&!S.rewardChoosing){if(currentMode.timeUp)currentMode.timeUp();else finish(true,"Time survived");}}
  if(currentMode.draw)currentMode.draw();else drawTopdown();drawRewardOverlay();uiClock-=dt;if(uiClock<=0){renderUI();uiClock=.11;}''')
rep('hudLine.textContent=`${sec}s · score ${Math.round(S.score)} ·', 'hudLine.textContent=`Wave ${S.wave} · ${sec}s · score ${Math.round(S.score)} ·')
rep('modePanel.innerHTML=currentMode.panel?currentMode.panel():', 'modePanel.innerHTML=S.rewardPedestal?`<div class="panel-row"><div class="panel-copy"><strong>Reward shrine</strong> · ${rewardCanInteract()?"tap CHOOSE REWARD":"move into the gold ring"}</div><span>WAVE CLEAR</span></div>`:currentMode.panel?currentMode.panel():')

out.write_text(text,encoding='utf-8')
print(out)
