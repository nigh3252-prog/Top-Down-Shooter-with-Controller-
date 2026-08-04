export const ENEMY_LAB_INSPECTOR_HEADER_HEIGHT=30;
export const ENEMY_LAB_INSPECTOR_CLOSE_TARGET=44;

// These are the only normal shell-level scrollers. Compound editor panes are
// deliberately recorded below instead of being hidden by a broad CSS rule.
export const ENEMY_LAB_INSPECTOR_SCROLL_OWNERS=Object.freeze(['#labCategories','#labSubcategories','#labValues']);
export const ENEMY_LAB_INSPECTOR_SCROLL_CONTROLLERS=Object.freeze(['#valueScrollGutter']);

// Gate 1B flattens the registry-backed deck and Arcana editors into #labValues.
// Hit Feel remains the one pre-existing standalone diagnostic exception.
export const ENEMY_LAB_RETAINED_COMPOUND_SCROLLERS=Object.freeze([
  Object.freeze({
    selector:'#hitFeelPanel',
    reason:'Hit Feel is an existing standalone diagnostic tool whose internal scroll behavior is coupled to its visual tuning controls.',
    migration:'Gate 3 — compound Hit Feel tool migration',
  }),
]);

const asSectionId=value=>String(value||'').trim().toLowerCase();
const asScrollTop=value=>Math.max(0,Number(value)||0);

const asPositive=value=>Math.max(0,Number(value)||0);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const noop=()=>{};

/**
 * Derive the visual state for the detail-pane gutter without giving the
 * gutter an independent scrolling surface.  `values` is deliberately the
 * only source of scroll position and range.
 */
export function getEnemyLabValueScrollGutterMetrics({values,gutter,axis='vertical',minThumb}={}){
  if(!values||!gutter)throw new TypeError('Enemy Lab gutter metrics require values and gutter elements.');
  const vertical=axis!=='horizontal';
  const viewport=asPositive(vertical?values.clientHeight:values.clientWidth);
  const content=asPositive(vertical?values.scrollHeight:values.scrollWidth);
  const track=asPositive(vertical?gutter.clientHeight:gutter.clientWidth);
  const scroll=asPositive(vertical?values.scrollTop:values.scrollLeft);
  const maxScroll=Math.max(0,content-viewport);
  const minimum=Math.min(track,Math.max(0,Number(minThumb??(vertical?38:42))||0));
  const thumbSize=track<=0?0:Math.min(track,Math.max(minimum,content>0?track*(viewport/content):track));
  const thumbRange=Math.max(0,track-thumbSize);
  const ratio=maxScroll>0?clamp(scroll/maxScroll,0,1):0;
  return Object.freeze({
    axis:vertical?'vertical':'horizontal',
    vertical,
    viewport,
    content,
    track,
    scroll,
    maxScroll,
    thumbSize,
    thumbRange,
    thumbPosition:thumbRange*ratio,
    valueNow:Math.round(ratio*100),
  });
}

/**
 * Attach the compact gutter as a controller for #labValues.  All browser
 * services are injected so this stays deterministic in unit tests and does
 * not install global listeners by itself.  Call the named lifecycle sync
 * methods after section restoration and after opening the drawer.
 */
export function createEnemyLabValueScrollGutter({
  values,
  gutter,
  thumb,
  axis='vertical',
  minThumb,
  onDetailScroll=noop,
  schedule=callback=>callback(),
  observeResize,
  listenForResize,
}={}){
  if(!values||!gutter||!thumb)throw new TypeError('Enemy Lab gutter requires values, gutter, and thumb elements.');
  const getAxis=typeof axis==='function'?axis:()=>axis;
  const listeners=[];
  let lastReported='';
  let syncQueued=false;
  let disposed=false;

  const metrics=()=>getEnemyLabValueScrollGutterMetrics({
    values,
    gutter,
    axis:getAxis()==='horizontal'?'horizontal':'vertical',
    minThumb,
  });
  const report=next=>{
    const key=`${next.axis}:${next.scroll}`;
    if(key===lastReported)return;
    lastReported=key;
    onDetailScroll(next.scroll,next);
  };
  const sync=()=>{
    if(disposed)return null;
    const next=metrics();
    gutter.classList?.toggle?.('disabled',next.maxScroll<=0);
    gutter.setAttribute?.('aria-valuemin','0');
    gutter.setAttribute?.('aria-valuemax','100');
    gutter.setAttribute?.('aria-valuenow',String(next.valueNow));
    gutter.setAttribute?.('aria-orientation',next.axis);
    gutter.setAttribute?.('aria-disabled',String(next.maxScroll<=0));
    if(next.vertical){
      thumb.style.height=`${next.thumbSize}px`;
      thumb.style.width='';
      thumb.style.transform=`translateY(${next.thumbPosition}px)`;
    }else{
      thumb.style.width=`${next.thumbSize}px`;
      thumb.style.height='';
      thumb.style.transform=`translateX(${next.thumbPosition}px)`;
    }
    return next;
  };
  const scheduleSync=()=>{
    if(disposed||syncQueued)return;
    syncQueued=true;
    schedule(()=>{
      syncQueued=false;
      sync();
    });
  };
  const setScroll=value=>{
    const next=metrics();
    const position=clamp(asPositive(value),0,next.maxScroll);
    if(next.vertical)values.scrollTop=position;
    else values.scrollLeft=position;
    const updated=sync();
    if(updated)report(updated);
    return updated;
  };
  const scrollFromGutterPointer=event=>{
    const next=metrics();
    if(next.maxScroll<=0||next.thumbRange<=0)return next;
    const rect=gutter.getBoundingClientRect?.()||{top:0,left:0};
    const pointer=next.vertical
      ?asPositive(event?.clientY)-asPositive(rect.top)
      :asPositive(event?.clientX)-asPositive(rect.left);
    const ratio=clamp((pointer-next.thumbSize/2)/next.thumbRange,0,1);
    return setScroll(ratio*next.maxScroll);
  };
  const onValuesScroll=()=>{
    const next=sync();
    if(next)report(next);
  };
  const onPointerDown=event=>{
    event?.preventDefault?.();
    if(event?.pointerId!=null)gutter.setPointerCapture?.(event.pointerId);
    scrollFromGutterPointer(event);
  };
  const releasePointer=event=>{
    if(event?.pointerId==null||!gutter.hasPointerCapture?.(event.pointerId))return;
    gutter.releasePointerCapture?.(event.pointerId);
  };
  const onPointerMove=event=>{
    if(event?.pointerId==null||gutter.hasPointerCapture?.(event.pointerId))scrollFromGutterPointer(event);
  };
  const listen=(target,type,listener,options)=>{
    target.addEventListener?.(type,listener,options);
    listeners.push(()=>target.removeEventListener?.(type,listener,options));
  };

  listen(values,'scroll',onValuesScroll,{passive:true});
  listen(gutter,'pointerdown',onPointerDown);
  listen(gutter,'pointermove',onPointerMove);
  listen(gutter,'pointerup',releasePointer);
  listen(gutter,'pointercancel',releasePointer);
  const stopObserving=typeof observeResize==='function'
    ?observeResize(values,scheduleSync)||noop
    :noop;
  const stopListening=typeof listenForResize==='function'
    ?listenForResize(scheduleSync)||noop
    :noop;
  sync();

  return Object.freeze({
    sync,
    scheduleSync,
    syncAfterSectionRestore:sync,
    syncAfterDockOpen:sync,
    scrollFromGutterPointer,
    getMetrics:metrics,
    destroy(){
      if(disposed)return;
      disposed=true;
      for(const remove of listeners.splice(0))remove();
      stopObserving();
      stopListening();
    },
  });
}

export function createEnemyLabSectionScrollMemory({sectionIds=[]}={}){
  const allowed=new Set((sectionIds||[]).map(asSectionId).filter(Boolean));
  const positions=new Map();
  let activeSection='';
  const known=id=>!allowed.size||allowed.has(asSectionId(id));

  return Object.freeze({
    activate(sectionId){
      const id=asSectionId(sectionId);
      if(!id||!known(id))return false;
      activeSection=id;
      return true;
    },
    get activeSection(){return activeSection;},
    remember(sectionId,scrollTop){
      const id=asSectionId(sectionId);
      if(!id||!known(id))return false;
      positions.set(id,asScrollTop(scrollTop));
      return true;
    },
    restore(sectionId){
      const id=asSectionId(sectionId);
      return id&&known(id)?positions.get(id)||0:0;
    },
    clear(sectionId){
      const id=asSectionId(sectionId);
      return id?positions.delete(id):false;
    },
    snapshot(){return Object.freeze(Object.fromEntries(positions));},
  });
}
