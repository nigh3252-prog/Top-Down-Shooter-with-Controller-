const STYLE_ID = 'akai-compact-interface';

/**
 * Keep the Akai courtyard colors and materials while restoring the combat HUD
 * to the dimensions and placement used by combat-arena.html on main.
 */
export function installAkaiCompactInterface(){
  if(typeof document === 'undefined') return;

  document.getElementById('akaiRoomPlaque')?.remove();
  if(document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #akaiRoomPlaque{display:none!important}

    #topBar{gap:8px!important}
    .tbtn{min-height:36px!important;padding:0 12px!important;font-size:11px!important}
    .tbtn.icon{width:42px!important;padding:0!important;font-size:21px!important}

    #hud{top:52px!important}
    #hpWrap,#stWrap{width:150px!important}
    #hpWrap{height:9px!important}
    #stWrap{height:6px!important;margin-top:3px!important}

    .btnrow{gap:8px!important;bottom:max(16px,env(safe-area-inset-bottom))!important}
    .pbtn{width:58px!important;height:58px!important;border-width:2px!important;font-size:11px!important}
    .pbtn .btnGlyph{font-size:10px!important}
    .pbtn .btnArrow{font-size:25px!important}
    #atkArrow{font-size:18px!important}

    #cardRow{bottom:-6px!important;gap:7px!important}
    #handCards{gap:7px!important}
    .scard{width:58px!important;height:78px!important;padding:5px!important;border-radius:7px!important}
    .scard .ckey{font-size:8px!important;padding-bottom:0!important}
    .scard .crows{font-size:11px!important}
    .scard .crow b{font-size:8px!important}
    #deckSide{margin-bottom:13px!important}
    .queuedCard{width:27px!important;height:27px!important;border-radius:4px!important}
    #shuffleBtn{width:30px!important;height:30px!important;border-radius:5px!important}

    #panel{top:52px!important;width:min(78vw,300px)!important}

    @media(max-width:560px){
      #cardRow{left:max(8px,env(safe-area-inset-left))!important}
      .scard{width:54px!important;height:74px!important}
    }
  `;
  document.head.appendChild(style);
}
