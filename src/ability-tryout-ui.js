function stopPointer(event){
  event.preventDefault();
  event.stopImmediatePropagation();
}

function cardGlyph(card){
  if(!card)return '';
  if(card.glyph)return card.glyph;
  if(card.kind==='stance')return '↔ ↔ ↓';
  if(card.kind==='eden')return '✧';
  if(card.kind==='warden')return '⚔';
  return '✦';
}

export function installAbilityTryoutUi({
  onTestPrev,onTestNext,onTestDown,onTestUp,onToggleDetails,onRegularRelease,
}={}){
  const style=document.createElement('style');
  style.id='abilityTryoutStyle';
  style.textContent=`
body.enemy-lab-card-controller #edenAbilityHud{display:none!important}
body.enemy-lab-card-controller #cardRow{display:flex!important}
body.enemy-lab-card-controller.card-mode-test #cardRow{display:none!important}
body.enemy-lab-card-controller #cardRow .scard{isolation:isolate}
body.enemy-lab-card-controller #cardRow .scard:not(:disabled){opacity:1!important}
body.enemy-lab-card-controller #cardRow .scard .cicon,
body.enemy-lab-card-controller #cardRow .scard .crows{visibility:hidden}
body.enemy-lab-card-controller #cardRow .scard .ckey{position:relative;z-index:4}
.abilityCardFace{position:absolute;inset:18px 4px 4px;z-index:3;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;text-align:center;pointer-events:none}
.abilityCardGlyph{font-size:13px;line-height:1;color:#e8a04c;white-space:nowrap}
.abilityCardName{max-width:100%;font-size:7px;line-height:1.06;font-weight:900;color:#d8eee9;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2}
.abilityCardFamily{max-width:100%;font-size:5.5px;line-height:1;color:#7ea39d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.abilityDeckCount{font-size:6px;color:#82aaa3;text-align:center;max-width:38px;line-height:1.15}
#abilityTestHud{display:none;position:fixed;left:50%;bottom:max(8px,env(safe-area-inset-bottom));z-index:27;transform:translateX(-50%);align-items:flex-end;gap:6px;font-family:ui-monospace,Menlo,Consolas,monospace;pointer-events:none}
body.card-mode-test #abilityTestHud{display:flex}
.abilityTestButton{pointer-events:auto;touch-action:none;border:1px solid #31504d;border-radius:8px;background:rgba(13,24,28,.94);color:#d8eee9;box-shadow:0 3px 0 #071011}
.abilityTestNav{width:42px;height:70px;font-size:25px}
#abilityTestCard{position:relative;width:min(290px,49vw);min-height:70px;padding:7px 10px;text-align:left}
#abilityTestCard.held{transform:translateY(2px);box-shadow:0 1px 0 #071011}
#abilityTestFamily{font-size:8px;color:#aa91c7;text-transform:uppercase}
#abilityTestName{display:block;margin-top:2px;padding-right:44px;font-size:13px;color:#ffe0a2}
#abilityTestSummary,#abilityTestStatus{display:block;margin-top:3px;font-size:8.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#abilityTestSummary{color:#c9ded9}#abilityTestStatus{color:#9ed6ca}
#abilityTestPosition{position:absolute;right:8px;top:8px;font-size:8px;color:#817998}
#abilityTestDetailsButton{width:42px;height:70px;font-size:20px}
#abilityTestDetailsButton.on{border-color:#e8a04c;color:#ffe0a2}
#abilityTryoutInfo{position:fixed;left:50%;bottom:max(90px,calc(env(safe-area-inset-bottom) + 90px));transform:translateX(-50%);z-index:26;width:min(470px,72vw);padding:11px 14px;border:1px solid #6e4c8e;border-radius:10px;background:rgba(8,17,20,.94);color:#d8eee9;box-shadow:0 8px 28px #0007;pointer-events:auto;font-family:ui-monospace,Menlo,Consolas,monospace}
#abilityTryoutInfo.hidden{display:none}.atInfoHead{display:flex;gap:8px}.atInfoTitles{flex:1}.atInfoFamily{font-size:8px;color:#aa91c7;text-transform:uppercase}.atInfoName{font-size:16px;color:#ffe0a2;font-weight:900}.atCollapse{width:34px;height:30px;border:1px solid #6e4c8e;border-radius:7px;background:#102426;color:#d9eee9}.atDescription{margin-top:7px;font-size:9.5px;line-height:1.45}.atChain,.atInfoControl{margin-top:7px;font-size:8.5px;color:#9ed6ca}.atChain{padding:6px;border:1px solid #31504d;border-radius:6px;color:#f2c982}
#abilityTryoutNotice{position:fixed;left:0;right:0;top:14%;z-index:31;text-align:center;color:#f0d8b0;font:900 13px ui-monospace;letter-spacing:.12em;text-shadow:0 2px 7px #000;opacity:0;pointer-events:none}
#abilityTryoutNotice.on{opacity:1}#abilityTryoutNotice.error{color:#ff9b86}
@media(max-width:700px) and (orientation:landscape){
  #abilityTestHud{left:max(112px,calc(env(safe-area-inset-left) + 112px));right:max(112px,calc(env(safe-area-inset-right) + 112px));transform:none;justify-content:center}
  #abilityTestCard{width:min(245px,42vw);min-height:62px}.abilityTestNav,#abilityTestDetailsButton{height:62px}
  #abilityTryoutInfo{bottom:max(76px,calc(env(safe-area-inset-bottom) + 76px));width:min(430px,60vw);padding:8px 11px}
}`;
  document.head.appendChild(style);

  const cardRow=document.getElementById('cardRow');
  const handButtons=[document.getElementById('card0'),document.getElementById('card1')];
  const drawQueue=document.getElementById('drawQueue');
  const queueDots=[...(drawQueue?.querySelectorAll('.queuedCard')||[])];
  const shuffleButton=document.getElementById('shuffleBtn');
  const deckSide=document.getElementById('deckSide');
  if(!cardRow||handButtons.some(button=>!button)||!shuffleButton)throw new Error('Combat Arena card HUD was not found.');

  const deckCount=document.createElement('span');
  deckCount.className='abilityDeckCount';
  deckSide?.prepend(deckCount);

  const faces=handButtons.map(button=>{
    const face=document.createElement('span');
    face.className='abilityCardFace';
    face.innerHTML='<span class="abilityCardGlyph"></span><span class="abilityCardName"></span><span class="abilityCardFamily"></span>';
    button.append(face);
    return {button,face};
  });

  // The arena owns pointerdown and therefore owns every play/consume/draw.
  // Enemy Lab listens only for release so aimed cards can complete their cast.
  const cleanup=[];
  faces.forEach(({button},slot)=>{
    const release=()=>onRegularRelease?.(slot);
    for(const type of ['pointerup','pointercancel'])button.addEventListener(type,release);
    cleanup.push(()=>{for(const type of ['pointerup','pointercancel'])button.removeEventListener(type,release);});
  });

  const testHud=document.createElement('div');
  testHud.id='abilityTestHud';
  testHud.innerHTML=`<button class="abilityTestButton abilityTestNav" id="abilityTestPrev">‹</button><button class="abilityTestButton" id="abilityTestCard"><span id="abilityTestFamily"></span><b id="abilityTestName"></b><span id="abilityTestSummary"></span><span id="abilityTestStatus"></span><span id="abilityTestPosition"></span></button><button class="abilityTestButton" id="abilityTestDetailsButton">ⓘ</button><button class="abilityTestButton abilityTestNav" id="abilityTestNext">›</button>`;
  const info=document.createElement('div');
  info.id='abilityTryoutInfo';info.className='hidden';
  info.innerHTML='<div class="atInfoHead"><div class="atInfoTitles"><div class="atInfoFamily"></div><div class="atInfoName"></div></div><button class="atCollapse">×</button></div><div class="atDescription"></div><div class="atChain"></div><div class="atInfoControl"></div>';
  const notice=document.createElement('div');notice.id='abilityTryoutNotice';
  document.body.append(testHud,info,notice);

  const $=id=>document.getElementById(id);
  $('abilityTestPrev').addEventListener('pointerdown',event=>{stopPointer(event);onTestPrev?.();});
  $('abilityTestNext').addEventListener('pointerdown',event=>{stopPointer(event);onTestNext?.();});
  $('abilityTestDetailsButton').addEventListener('click',()=>onToggleDetails?.());
  info.querySelector('.atCollapse').addEventListener('click',()=>onToggleDetails?.(false));
  const testCard=$('abilityTestCard');
  testCard.addEventListener('pointerdown',event=>{stopPointer(event);testCard.setPointerCapture?.(event.pointerId);testCard.classList.add('held');onTestDown?.();});
  for(const type of ['pointerup','pointercancel'])testCard.addEventListener(type,event=>{stopPointer(event);testCard.classList.remove('held');onTestUp?.();});

  return {
    notice(text,error=false){
      notice.textContent=text;notice.classList.toggle('error',error);notice.classList.add('on');
      clearTimeout(this.timer);this.timer=setTimeout(()=>notice.classList.remove('on'),900);
    },
    render(v){
      document.body.classList.add('enemy-lab-card-controller');
      document.body.classList.toggle('card-mode-regular',v.mode==='regular');
      document.body.classList.toggle('card-mode-test',v.mode==='test');
      deckCount.textContent=v.deckCounts||'';
      faces.forEach(({button,face},slot)=>{
        const card=v.hand?.[slot]||null;
        button.classList.toggle('empty',!card);
        button.disabled=!card;
        face.querySelector('.abilityCardGlyph').textContent=cardGlyph(card);
        face.querySelector('.abilityCardName').textContent=card?.name||'EMPTY';
        face.querySelector('.abilityCardFamily').textContent=card?.family||'';
      });
      queueDots.forEach((dot,index)=>{
        const queued=v.queue?.[index]||null;
        dot.classList.toggle('filled',!!queued);
        dot.dataset.cardId=queued?.id||'';
        dot.setAttribute('aria-label',queued?`Upcoming ${queued.name}`:'Empty draw slot');
      });
      const entry=v.test;
      $('abilityTestFamily').textContent=entry.family;
      $('abilityTestName').textContent=entry.name;
      $('abilityTestSummary').textContent=entry.summary;
      $('abilityTestStatus').textContent=entry.status;
      $('abilityTestPosition').textContent=entry.position;
      info.querySelector('.atInfoFamily').textContent=entry.family;
      info.querySelector('.atInfoName').textContent=entry.name;
      info.querySelector('.atDescription').textContent=entry.description;
      const chain=info.querySelector('.atChain');chain.textContent=entry.chain;chain.style.display=entry.chain?'block':'none';
      info.querySelector('.atInfoControl').textContent=entry.control;
      info.classList.toggle('hidden',!v.detailsVisible);
      $('abilityTestDetailsButton').classList.toggle('on',v.detailsOpen);
    },
    dispose(){
      cleanup.forEach(fn=>fn());
      for(const {face} of faces)face.remove();
      deckCount.remove();testHud.remove();info.remove();notice.remove();style.remove();
      document.body.classList.remove('enemy-lab-card-controller','card-mode-regular','card-mode-test');
    },
  };
}
