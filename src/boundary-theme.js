let installed = false;

export function installBoundaryTheme(){
  if(installed || typeof document === 'undefined') return false;
  installed = true;
  document.documentElement.classList.add('boundary-district-theme');

  const style = document.createElement('style');
  style.id = 'boundaryDistrictTheme';
  style.textContent = `
    :root{
      --bd-ink:#061014;
      --bd-panel:rgba(4,15,20,.88);
      --bd-panel-soft:rgba(5,22,28,.72);
      --bd-line:#6f9ca1;
      --bd-cyan:#45d6df;
      --bd-cyan-soft:#8ce8e8;
      --bd-red:#ef2f25;
      --bd-red-dark:#751d1c;
      --bd-lamp:#fff3c7;
      --bd-ground:#4e7e84;
    }
    html,body{background:var(--bd-ink)!important;color:#eef5ef!important}
    body::after{
      content:"";position:fixed;inset:0;z-index:44;pointer-events:none;opacity:.13;
      background:
        repeating-linear-gradient(0deg,rgba(255,255,255,.018) 0 1px,transparent 1px 4px),
        radial-gradient(circle at 50% 44%,transparent 46%,rgba(0,0,0,.42) 100%);
      mix-blend-mode:soft-light;
    }
    canvas{filter:saturate(1.08) contrast(1.06)}
    #topBar{gap:10px!important}
    .tbtn{
      color:#f4f2e8!important;background:rgba(3,13,18,.82)!important;
      border:1px solid rgba(125,183,190,.72)!important;border-radius:5px!important;
      box-shadow:0 0 0 1px rgba(0,0,0,.6),0 5px 18px rgba(0,0,0,.28)!important;
    }
    .tbtn:active{background:rgba(20,45,50,.9)!important;color:var(--bd-cyan-soft)!important}
    #hpWrap,#stWrap{background:rgba(2,11,15,.9)!important;border-color:#6d8e91!important;border-radius:2px!important}
    #hpFill{background:linear-gradient(90deg,#c91d1c 0%,var(--bd-red) 70%,#ff6250 100%)!important}
    #stFill{background:linear-gradient(90deg,#258f98,var(--bd-cyan) 72%,#adffff)!important}
    #stPending{background:rgba(230,246,240,.55)!important}
    #vig{background:radial-gradient(ellipse at center,transparent 52%,rgba(235,25,19,.62) 100%)!important}
    #msg,.rtTitle{color:var(--bd-lamp)!important;text-shadow:0 2px 12px #000,0 0 18px rgba(255,244,193,.28)!important}
    .pbtn{
      background:rgba(2,12,17,.78)!important;border-color:#527b80!important;color:#eef3e9!important;
      box-shadow:0 3px 0 #02070a,0 0 18px rgba(0,0,0,.22)!important;
    }
    #atkBtn{border-color:var(--bd-red)!important;color:#fff1df!important}
    #heavyBtn{border-color:var(--bd-cyan)!important;color:var(--bd-cyan-soft)!important}
    .pbtn .btnGlyph{color:#f5f2e5!important}
    .scard{
      background:linear-gradient(155deg,rgba(3,14,19,.95),rgba(9,27,32,.92))!important;
      border-color:#547c80!important;color:#e7f2ed!important;border-radius:5px!important;
    }
    .scard .ckey{color:#c8d9d5!important}
    .scard .cicon{border-color:rgba(78,210,218,.35)!important;background:rgba(8,22,27,.62)!important}
    .scard .crows{color:var(--bd-red)!important}
    .scard .crow b{color:var(--bd-cyan-soft)!important}
    .queuedCard,.queuedCard.filled{border-color:#527b80!important;background:rgba(3,15,20,.76)!important}
    #shuffleBtn{color:#f6f2e4!important;background:rgba(3,14,19,.85)!important;border-color:#527b80!important}
    #panel,#startCard{
      background:linear-gradient(180deg,rgba(3,13,18,.96),rgba(5,21,27,.94))!important;
      border-color:#557d82!important;box-shadow:0 12px 30px rgba(0,0,0,.42)!important;
    }
    #startGate{background:rgba(1,8,12,.9)!important}
    #startCard .sgTitle,.wide,.sval,#tabs button.on{color:var(--bd-red)!important}
    #startCard .sgHint,.slabel,.modeGrid button,.selectRow label{color:#c4dcda!important}
    #startBtn{background:var(--bd-red)!important;color:#fff7df!important;border-radius:4px!important}
    #sgFsBtn,.wide,.modeGrid button,.selectRow select{border-color:#527b80!important;background:rgba(5,23,29,.75)!important}
    #tabs button.on,.modeGrid button.on{border-color:var(--bd-red)!important;background:rgba(239,47,37,.09)!important}
    #panel input[type=range]::-webkit-slider-thumb{background:var(--bd-cyan)!important;border-color:#071318!important;box-shadow:0 0 0 1px #41858b!important}
    #panel input[type=range]::-moz-range-thumb{background:var(--bd-cyan)!important;border-color:#071318!important}
    #err{color:#fff0df!important;background:rgba(48,4,3,.94)!important;border-color:var(--bd-red)!important}
  `;
  document.head.appendChild(style);
  return true;
}
