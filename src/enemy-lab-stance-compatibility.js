import { listCards } from './card-registry.js';
import { STONE_WEAPONS } from './weapons.js';
import {
  STANCE_CLASSES,
  STANCE_CLASS_BY_ID,
  resolveStanceWeaponCompatibility,
  stanceClassCounts,
} from './stance-compatibility.js';
import {
  GATE2_STANCE_IDS,
  GATE2_WEAPON_IDS,
  resolveGate2PilotProfile,
} from './stance-gate2-runtime.js';
import { resolveGate3FullPayoff } from './stance-gate3-payoffs.js';
import { resolveStanceMovementProfile } from './stance-movement-profiles.js';

const STANCE_CARDS = listCards({family:'stance'});

const cleanName=value=>String(value||'').replace(/^S\d+\s*/,'').trim();

function makeChoice(document,{label,sub='',meta='',active=false,className='',onClick}){
  const button=document.createElement('button');
  button.className=`choice${active?' on':''}${className?` ${className}`:''}`;
  const title=document.createElement('b');title.textContent=label;button.appendChild(title);
  if(sub){const detail=document.createElement('span');detail.textContent=sub;button.appendChild(detail);}
  if(meta){const footer=document.createElement('em');footer.textContent=meta;button.appendChild(footer);}
  if(onClick)button.addEventListener('click',onClick);else button.disabled=true;
  return button;
}

function makeStatus(document,title,body,tone=''){
  const card=document.createElement('div');
  card.className='statusCard';
  card.dataset.stanceCompatibilityStatus='1';
  if(tone)card.dataset.tone=tone;
  const heading=document.createElement('b');heading.textContent=title;
  const detail=document.createElement('span');detail.textContent=body;
  card.append(heading,detail);
  return card;
}

function currentSnapshot(runtime){
  const stance=runtime?.arena?.stance||null;
  const weaponId=String(runtime?.combatState?.weapon||'');
  const weapon=STONE_WEAPONS[weaponId]||null;
  const compatibility=resolveStanceWeaponCompatibility({stance,weapon,weaponId});
  const gate2=resolveGate2PilotProfile({stance,weapon,weaponId});
  const gate3=resolveGate3FullPayoff({stance,weapon,weaponId});
  const movement=resolveStanceMovementProfile({stance,weapon,weaponId});
  const liveGate2=runtime?.combatState?.stance2Gate2||null;
  const liveGate3=runtime?.combatState?.stance2Gate3||null;
  const effectiveChain=liveGate2?.effectiveChain||gate2.effectiveChain||[];
  const attackLabels=effectiveChain.map(key=>runtime?.PC?.ATTACKS?.[key]?.label||key);
  return{runtime,stance,weaponId,weapon,compatibility,gate2,gate3,movement,liveGate2,liveGate3,effectiveChain,attackLabels};
}

export function installEnemyLabStanceCompatibility({document=globalThis.document,runtime=null}={}){
  if(!document)return{installed:false,reason:'missing-document'};
  const page=new URL(document.location?.href||globalThis.location?.href||'http://localhost/enemy-lab.html');
  if(page.searchParams.get('capture')==='1')return{installed:false,reason:'capture-mode'};
  const categories=document.getElementById('labCategories');
  const values=document.getElementById('labValues');
  const hint=document.getElementById('categoryHint');
  if(!categories||!values)return{installed:false,reason:'missing-controls'};
  if(document.documentElement.dataset.enemyLabStanceCompatibility==='1')return globalThis.__enemyLabStanceCompatibility||{installed:true};
  document.documentElement.dataset.enemyLabStanceCompatibility='1';

  const style=document.createElement('style');
  style.textContent=`
    #labCategories .choice.stanceCompatibilityCategory{border-color:#9f77d6;color:#e4d0ff;background:rgba(91,55,137,.25)}
    #labCategories .choice.stanceCompatibilityCategory.on{border-color:#d7b7ff;color:#fff5ff;background:rgba(122,76,181,.42);box-shadow:inset 0 0 0 1px rgba(215,183,255,.28)}
    [data-stance-compatibility-root] .statusCard[data-tone="full"]{border-color:#75d3ad;background:rgba(43,124,93,.18)}
    [data-stance-compatibility-root] .statusCard[data-tone="adapted"]{border-color:#e0bb6d;background:rgba(134,100,41,.18)}
    [data-stance-compatibility-root] .statusCard[data-tone="unusable"]{border-color:#e27777;background:rgba(142,54,54,.2)}
    [data-stance-compatibility-root] .statusCard[data-tone="pilot"]{border-color:#ba8cff;background:rgba(102,62,156,.24)}
    [data-stance-compatibility-root] .statusCard[data-tone="payoff"]{border-color:#71d8ef;background:rgba(43,117,139,.22)}
    [data-stance-compatibility-root] .statusCard[data-tone="movement"]{border-color:#9ad487;background:rgba(72,125,59,.22)}
    [data-stance-compatibility-root] .stanceMatrix{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
    [data-stance-compatibility-root] .stanceClassGroup{border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:8px;background:rgba(0,0,0,.13)}
    [data-stance-compatibility-root] .stanceClassGroup b{display:block;margin-bottom:5px;font-size:9px;letter-spacing:.08em}
    [data-stance-compatibility-root] .stanceClassGroup span{display:block;color:var(--muted);font-size:8px;line-height:1.35}
  `;
  document.head.appendChild(style);

  let open=false;
  let refreshTimer=0;
  let lastKey='';

  const categoryButton=()=>categories.querySelector('[data-stance-compatibility-category="1"]');
  function syncCategoryLabel(){
    const button=categoryButton();if(!button)return;
    const snapshot=currentSnapshot(runtime);
    const title=button.querySelector('b');
    if(!title)return;
    if(snapshot.compatibility.tier==='unknown')title.textContent='STANCE 2.0';
    else title.textContent=`STANCE 2.0 · ${snapshot.compatibility.label}${snapshot.gate3.active?' · G3':snapshot.gate2.active?' · G2':''}`;
  }
  function ensureCategory(){
    if(categoryButton()){syncCategoryLabel();return;}
    const button=makeChoice(document,{
      label:'STANCE 2.0',sub:'Weight-class compatibility',className:'stanceCompatibilityCategory',
      onClick:event=>{event.preventDefault();event.stopPropagation();activate();},
    });
    button.disabled=false;
    button.dataset.stanceCompatibilityCategory='1';
    categories.appendChild(button);
  }
  function activate(){
    open=true;
    for(const button of categories.querySelectorAll('.choice'))button.classList.toggle('on',button.dataset.stanceCompatibilityCategory==='1');
    render(true);
  }
  function render(force=false){
    if(!open)return;
    const snapshot=currentSnapshot(runtime);
    const stanceId=String(snapshot.stance?.id||'');
    const live2=String(snapshot.liveGate2?.profileId||'');
    const live3=String(snapshot.liveGate3?.payoffId||'');
    const movementId=String(snapshot.liveGate3?.movementProfileId||snapshot.movement.profile?.id||'');
    const recoveryKey=Number(snapshot.liveGate3?.recoveryRemaining||0).toFixed(1);
    const key=[stanceId,snapshot.weaponId,snapshot.compatibility.tier,live2,live3,movementId,recoveryKey].join('|');
    if(!force&&key===lastKey)return;
    lastKey=key;
    syncCategoryLabel();
    if(hint)hint.textContent=snapshot.gate3.active
      ?'Gate 3 full-expression payoff and movement commitment are live for this matched pilot pairing.'
      :snapshot.gate2.active
        ?'Gate 2 expression and its stance/weapon movement profile are live. Adapted and unusable pairs do not receive the matched-class Gate 3 payoff.'
        :'This pairing remains a Gate 1 diagnostic outside the current pilot.';
    const oldTop=values.scrollTop;
    const root=document.createElement('div');
    root.className='valueList';
    root.dataset.stanceCompatibilityRoot='1';

    if(snapshot.compatibility.tier==='unknown'){
      root.appendChild(makeStatus(document,'WAITING FOR COMBAT ARENA','Start the arena so the active stance and weapon can be inspected.'));
    }else{
      const preferred=snapshot.compatibility.preferredWeapon?'PREFERRED WEAPON':'OFF-STYLE WEAPON';
      root.appendChild(makeStatus(
        document,snapshot.compatibility.label,
        `${cleanName(snapshot.stance?.name)||stanceId} · ${snapshot.compatibility.stanceClass} stance with ${snapshot.weapon?.label||snapshot.weaponId} · ${snapshot.compatibility.weaponClass} weapon · ${preferred}`,
        snapshot.compatibility.tier,
      ));
    }

    if(snapshot.gate2.active){
      const live=snapshot.liveGate2;
      root.appendChild(makeStatus(
        document,
        live?.label||snapshot.gate2.profile?.label||'GATE 2 PILOT ACTIVE',
        `${snapshot.attackLabels.join(' → ')} · grip ${live?.gripMode||snapshot.gate2.profile?.gripMode||'normal'}${live?.failed?' · damaging hit zones disabled':''}`,
        'pilot',
      ));
      const consequence=snapshot.compatibility.tier==='full'
        ?'Full expression uses the stance-authored chain with stance-dominant timing.'
        :snapshot.compatibility.tier==='adapted'
          ?'Adapted expression substitutes compact moves, changes grip, shortens effective reach, and reduces damage and stagger.'
          :'Failed expression uses an authored misuse animation, cannot charge, and creates no damaging weapon hit zones.';
      root.appendChild(makeStatus(document,'GATE 2 CONSEQUENCE',consequence,snapshot.compatibility.tier));

      const movement=snapshot.movement.profile;
      const recovery=Number(snapshot.liveGate3?.recoveryRemaining||0);
      const recoveryText=movement?.recoveryDuration>0
        ?` · recovery ${Number(movement.recoveryDuration).toFixed(2)} sec${recovery>0?` · ${recovery.toFixed(2)} sec remaining`:''}`
        :'';
      root.appendChild(makeStatus(
        document,
        `MOVEMENT · ${snapshot.liveGate3?.movementLabel||movement?.label||'PENDING'}`,
        `${snapshot.liveGate3?.movementSummary||movement?.summary||'Movement profile is waiting for the runtime.'}${recoveryText}`,
        'movement',
      ));
    }else{
      root.appendChild(makeStatus(
        document,'OUTSIDE GATE 2 PILOT',
        `Gate 2 currently covers ${GATE2_STANCE_IDS.join(', ')} crossed with ${GATE2_WEAPON_IDS.join(', ')}. This combination still uses existing combat behavior.`,
      ));
    }

    if(snapshot.gate3.active){
      const live=snapshot.liveGate3;
      root.appendChild(makeStatus(
        document,
        live?.label||snapshot.gate3.payoff?.label||'GATE 3 PAYOFF ACTIVE',
        live?.summary||snapshot.gate3.payoff?.summary||'',
        'payoff',
      ));
    }else if(snapshot.gate2.active){
      root.appendChild(makeStatus(
        document,'NO FULL-EXPRESSION PAYOFF',
        `This ${snapshot.compatibility.label.toLowerCase()} pairing keeps its Gate 2 behavior and movement profile, but matched-class confirmation and breaking privileges remain locked. Cleave mode: ${snapshot.liveGate3?.cleaveMode||'pending runtime'}.`,
      ));
    }

    root.appendChild(makeStatus(document,'GATE 3 PILOT PAYOFFS','Rat Step + dagger: movement freedom. Long Blade Form + longsword: larger confirmed follow-up window. Hammerfall + greatsword: doubled stagger, minimum stun, and unrestricted cleave.'));

    const matrix=document.createElement('div');matrix.className='stanceMatrix';
    const cells=[
      ['LIGHT / LIGHT','FULL','0-class gap'],['LIGHT / MEDIUM','ADAPTED','1-class gap'],['LIGHT / HEAVY','UNUSABLE','2-class gap'],
      ['MEDIUM / LIGHT','ADAPTED','1-class gap'],['MEDIUM / MEDIUM','FULL','0-class gap'],['MEDIUM / HEAVY','ADAPTED','1-class gap'],
      ['HEAVY / LIGHT','UNUSABLE','2-class gap'],['HEAVY / MEDIUM','ADAPTED','1-class gap'],['HEAVY / HEAVY','FULL','0-class gap'],
    ];
    for(const [label,result,gap] of cells)matrix.appendChild(makeStatus(document,label,`${result} · ${gap}`,result.toLowerCase()));
    root.appendChild(matrix);

    const counts=stanceClassCounts();
    root.appendChild(makeStatus(document,'STANCE CLASSIFICATION',`${counts.Light} Light · ${counts.Medium} Medium · ${counts.Heavy} Heavy · 30 total`));
    for(const stanceClass of STANCE_CLASSES){
      const group=document.createElement('div');group.className='stanceClassGroup';
      const title=document.createElement('b');title.textContent=`${stanceClass.toUpperCase()} STANCES`;
      const names=STANCE_CARDS.filter(stance=>STANCE_CLASS_BY_ID[stance.id]===stanceClass).map(stance=>cleanName(stance.name));
      const detail=document.createElement('span');detail.textContent=names.join(' · ');
      group.append(title,detail);root.appendChild(group);
    }

    values.replaceChildren(root);
    requestAnimationFrame(()=>{values.scrollTop=oldTop;});
  }

  categories.addEventListener('click',event=>{
    const button=event.target.closest?.('.choice');
    if(!button||button.dataset.stanceCompatibilityCategory==='1')return;
    open=false;
  },true);
  new MutationObserver(()=>ensureCategory()).observe(categories,{childList:true});
  ensureCategory();
  refreshTimer=globalThis.setInterval?.(()=>{syncCategoryLabel();render(false);},250)||0;

  const api={installed:true,open:activate,snapshot:()=>currentSnapshot(runtime),destroy(){if(refreshTimer)globalThis.clearInterval?.(refreshTimer);}};
  globalThis.__enemyLabStanceCompatibility=api;
  return api;
}
