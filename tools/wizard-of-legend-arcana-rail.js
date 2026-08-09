(()=>{
  'use strict';

  const data=JSON.parse(document.getElementById('wol-data').textContent);
  const assetPrefix='../';
  data.video.src=assetPrefix+data.video.src;
  data.entries.forEach(entry=>{entry.poster=assetPrefix+entry.poster;});

  const STORAGE_KEY='wol.arcanaChecklist.v1';
  const CATALOG_REVISION=5;
  const NEXT_TWENTY_IMPLEMENTED=['ice-dagger','rip-tide','aqua-arc','chaos-crusher','searing-rush','flare-rush','ignition-rush','air-burst','gust-burst','razor-burst','spike-track','toxic-trap','snare-track','thunder-line','circuit-line','shock-line','wave-front','frost-feint','frost-wing','chaotic-rift'];
  const ARCHETYPE_SAMPLER_IMPLEMENTED=['rapid-fire-agent','ward-of-flames','mentis-imperium','flame-fusion','heroic-leap','cyclone-boomerang','earthen-aegis','ball-lightning','aqua-beam','arcane-intervention'];
  const CATALOG_MIGRATIONS={2:{'dragon-arc':{analysis:true,implementation:true}},3:Object.fromEntries(NEXT_TWENTY_IMPLEMENTED.map(id=>[id,{analysis:true,implementation:true}])),4:Object.fromEntries(ARCHETYPE_SAMPLER_IMPLEMENTED.map(id=>[id,{analysis:true,implementation:true}]))};
  const elements={Fire:'var(--fire)',Air:'var(--air)',Earth:'var(--earth)',Lightning:'var(--lightning)',Water:'var(--water)',Ice:'var(--ice)',Chaos:'var(--chaos)'};
  const lineageLabels={
    'source-first':'Source-first from outset',
    rebuilt:'Initial pass → source-first rebuild',
    inventory:'Video inventory only · analysis pending',
    'replacement-analyzed':'Legacy → source-first analysis · replace',
    legacy:'Legacy first-pass · reanalyze and replace',
    analyzed:'Analyzed · not implemented'
  };
  const statusLabels={
    'inventory-only':'Inventoried · analysis pending',
    'source-first-implemented':'Source-first implemented',
    'replacement-in-progress':'Reference-lock rebuild',
    'not-implemented':'Not implemented',
    'legacy-replace':'Legacy replacement required'
  };
  const lineageOptions=[
    ['all','All lineages'],
    ['inventory','Video inventory only'],
    ['source-first','Source-first from outset'],
    ['rebuilt','Initial pass → source-first rebuild'],
    ['replacement-analyzed','Legacy → reanalyzed; replacement pending'],
    ['legacy','Legacy analysis and replacement required'],
    ['analyzed','Analyzed, not implemented']
  ];
  const statusOptions=[
    ['all','All statuses'],
    ['inventory-only','Inventoried · analysis pending'],
    ['source-first-implemented','Source-first implemented'],
    ['replacement-in-progress','Reference-lock rebuild'],
    ['not-implemented','Not implemented'],
    ['legacy-replace','Legacy: replace']
  ];
  const elementOrder=['Fire','Air','Earth','Lightning','Water','Ice','Chaos'];
  const categoryOrder=['Basic','Dash','Standard','Signature'];
  const uniqueValues=(key,order)=>{
    const values=[...new Set(data.entries.map(entry=>entry[key]).filter(Boolean))];
    return [...order.filter(value=>values.includes(value)),...values.filter(value=>!order.includes(value)).sort((a,b)=>a.localeCompare(b))];
  };
  const elementOptions=[['all','All elements'],...uniqueValues('element',elementOrder).map(value=>[value,value])];
  const categoryOptions=[['all','All categories'],...uniqueValues('category',categoryOrder).map(value=>[value,value])];

  const modes=[
    {id:'playback',label:'Play',kind:'playback'},
    {id:'arcana',label:'Arcana',kind:'entries'},
    {id:'element',label:'Element',kind:'filter',key:'element',options:elementOptions},
    {id:'category',label:'Category',kind:'filter',key:'category',options:categoryOptions},
    {id:'lineage',label:'Lineage',kind:'filter',key:'lineage',options:lineageOptions},
    {id:'status',label:'Status',kind:'filter',key:'status',options:statusOptions},
    {id:'tools',label:'Tools',kind:'tools'},
    {id:'research',label:'Research',kind:'research'}
  ];
  const filterState={search:'',element:'all',category:'all',lineage:'all',status:'all',sort:'source'};
  const modeState=Object.fromEntries(modes.map(mode=>[mode.id,{selected:mode.kind==='filter'?'all':mode.kind==='research'?'gate1':mode.kind==='tools'?'source':'',scrollLeft:0,visited:false}]));

  const catalog=document.getElementById('catalog');
  const video=document.getElementById('showcase-video');
  video.src=data.video.src;
  video.controls=false;
  video.loop=true;
  const modeRail=document.getElementById('mode-rail');
  const contextRail=document.getElementById('context-rail');
  const contextLabel=document.getElementById('context-label');
  const searchInput=document.getElementById('search');
  const clipBadge=document.getElementById('clip-badge');
  const playToggle=document.getElementById('video-play-toggle');
  const seekControl=document.getElementById('video-seek');
  const videoTime=document.getElementById('video-time');
  const muteToggle=document.getElementById('video-mute-toggle');
  const fullscreenToggle=document.getElementById('video-fullscreen');
  let activeMode='arcana';
  let selectedEntryId=data.entries[0]?.id??null;
  let visibleEntries=[...data.entries];
  let activeEntry=null;
  let activeStart=0;
  let activeEnd=null;
  let activeClipMode='showcase';
  let activeSegmentIndex=0;
  let progress=loadProgress();

  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function inlineMarkdown(value){
    let html=escapeHtml(value);
    html=html.replace(/`([^`]+)`/g,'<code>$1</code>');
    html=html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,'<a href="$2" target="_blank" rel="noreferrer">$1</a>');
    html=html.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
    html=html.replace(/\*([^*]+)\*/g,'<em>$1</em>');
    return html;
  }
  function markdownToHtml(markdown){
    if(!markdown)return'<p>No additional notes recorded.</p>';
    const lines=String(markdown).replace(/\r/g,'').split('\n');
    let html='',paragraph=[],listType=null,listItems=[],inCode=false,code=[];
    const flushParagraph=()=>{if(paragraph.length){html+=`<p>${inlineMarkdown(paragraph.join(' '))}</p>`;paragraph=[];}};
    const flushList=()=>{if(listType){html+=`<${listType}>${listItems.map(item=>`<li>${inlineMarkdown(item)}</li>`).join('')}</${listType}>`;listType=null;listItems=[];}};
    for(let index=0;index<lines.length;index+=1){
      const line=lines[index];
      if(line.startsWith('```')){flushParagraph();flushList();if(inCode){html+=`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`;code=[];}inCode=!inCode;continue;}
      if(inCode){code.push(line);continue;}
      const heading=line.match(/^(#{1,6})\s+(.+)$/);
      if(heading){flushParagraph();flushList();const level=Math.min(4,heading[1].length+1);html+=`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`;continue;}
      if(/^\|.+\|$/.test(line)&&index+1<lines.length&&/^\|?[\s:|-]+\|?$/.test(lines[index+1])){
        flushParagraph();flushList();const rows=[];while(index<lines.length&&/^\|.+\|$/.test(lines[index])){rows.push(lines[index].slice(1,-1).split('|').map(cell=>cell.trim()));index+=1;}index-=1;const body=rows.filter((_,row)=>row!==1);if(body.length){html+='<table><thead><tr>'+body[0].map(cell=>`<th>${inlineMarkdown(cell)}</th>`).join('')+'</tr></thead><tbody>'+body.slice(1).map(row=>'<tr>'+row.map(cell=>`<td>${inlineMarkdown(cell)}</td>`).join('')+'</tr>').join('')+'</tbody></table>';}continue;
      }
      const bullet=line.match(/^[-*]\s+(.+)$/);const ordered=line.match(/^\d+\.\s+(.+)$/);
      if(bullet||ordered){flushParagraph();const wanted=bullet?'ul':'ol';if(listType&&listType!==wanted)flushList();listType=wanted;listItems.push((bullet||ordered)[1]);continue;}
      if(line.startsWith('> ')){flushParagraph();flushList();html+=`<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`;continue;}
      if(!line.trim()){flushParagraph();flushList();continue;}
      paragraph.push(line.trim());
    }
    flushParagraph();flushList();if(inCode&&code.length)html+=`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`;
    return html;
  }
  function formatTime(seconds){const value=Number(seconds)||0;const minutes=Math.floor(value/60);const remainder=value-minutes*60;const whole=Math.floor(remainder);const digits=String(Math.round((remainder-whole)*1000)).padStart(3,'0').replace(/0+$/,'');return `${minutes}:${String(whole).padStart(2,'0')}${digits?`.${digits}`:''}`;}
  function defaultProgress(){return Object.fromEntries(data.entries.map(entry=>[entry.id,{...(entry.defaults??{analysis:false,implementation:false,comparison:false})}]));}
  function progressFromPayload(payload){
    const defaults=defaultProgress();
    const merged=Object.fromEntries(data.entries.map(entry=>[entry.id,{...defaults[entry.id],...(payload.entries?.[entry.id]??{})}]));
    const currentRevision=payload.catalogRevision??1;
    for(const [revision,changes] of Object.entries(CATALOG_MIGRATIONS)){
      if(Number(revision)<=currentRevision)continue;
      for(const [id,patch] of Object.entries(changes))if(merged[id])merged[id]={...merged[id],...patch};
    }
    return merged;
  }
  function loadProgress(){try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(saved?.schemaVersion===1&&saved.entries)return progressFromPayload(saved);}catch{}return defaultProgress();}
  function saveProgress(){localStorage.setItem(STORAGE_KEY,JSON.stringify({schemaVersion:1,catalogRevision:CATALOG_REVISION,entries:progress,updatedAt:new Date().toISOString()}));updateMetrics();}
  function lineageClass(entry){return entry.lineage==='legacy'||entry.lineage==='replacement-analyzed'?'legacy':entry.lineage==='rebuilt'?'rebuilt':'';}
  function showcaseClip(entry){return entry.showcaseWindow??entry;}
  function segmentSummary(entry){return (entry.showcaseSegments??[]).map(segment=>`${segment.kind==='charged'?'Charged':'Base'} ${formatTime(segment.start)}–${formatTime(segment.end)}`).join(' · ');}
  function searchBlob(entry){return JSON.stringify([entry.name,entry.summary,entry.recipe,entry.units,entry.analysisMarkdown,entry.supplementMarkdown]).toLowerCase();}
  function matches(entry,filters=filterState){
    if(filters.element!=='all'&&entry.element!==filters.element)return false;
    if(filters.category!=='all'&&entry.category!==filters.category)return false;
    if(filters.lineage!=='all'&&entry.lineage!==filters.lineage)return false;
    if(filters.status!=='all'&&entry.status!==filters.status)return false;
    return !filters.search||searchBlob(entry).includes(filters.search.toLowerCase());
  }
  function sortEntries(entries){return entries.sort((left,right)=>filterState.sort==='name'?left.name.localeCompare(right.name):filterState.sort==='element'?left.element.localeCompare(right.element)||left.order-right.order:left.order-right.order);}
  function calculateVisible(){visibleEntries=sortEntries(data.entries.filter(entry=>matches(entry)));}
  function countForFilter(key,value){return data.entries.filter(entry=>matches(entry,{...filterState,[key]:value})).length;}
  function modeDef(id=activeMode){return modes.find(mode=>mode.id===id)??modes[0];}
  function currentEntry(){return visibleEntries.find(entry=>entry.id===selectedEntryId)??visibleEntries[0]??null;}
  function updateMetrics(){
    const sourceEntries=data.entries.filter(entry=>entry.status!=='inventory-only');
    const values=sourceEntries.map(entry=>progress[entry.id]??entry.defaults??{});
    const analysis=values.filter(item=>item.analysis).length;
    const implementation=values.filter(item=>item.implementation).length;
    const compared=values.filter(item=>item.comparison).length;
    document.getElementById('metric-analysis').textContent=analysis;
    document.getElementById('metric-implemented').textContent=implementation;
    document.getElementById('metric-legacy').textContent=data.entries.filter(entry=>entry.currentImplementation).length;
    document.getElementById('metric-compared').textContent=compared;
    const total=sourceEntries.length*3;
    const complete=values.reduce((sum,item)=>sum+Number(Boolean(item.analysis))+Number(Boolean(item.implementation))+Number(Boolean(item.comparison)),0);
    document.getElementById('progress-fill').style.width=`${total?complete/total*100:0}%`;
    document.getElementById('progress-label').textContent=`${complete} of ${total} source-first stages complete · ${data.entries.length} of ${data.entries.length} Arcana inventoried · saved on this device.`;
  }
  function updateSelectionHeader(){
    const title=document.getElementById('current-title');
    const meta=document.getElementById('current-meta');
    const entry=currentEntry();
    const mode=modeDef();
    if(mode.kind==='entries'||mode.kind==='filter'){
      if(entry){title.textContent=entry.name;meta.textContent=`#${entry.order} · ${entry.element} · ${entry.category} · ${lineageLabels[entry.lineage]??entry.lineage} · ${statusLabels[entry.status]??entry.status}`;}
      else{title.textContent='No Arcana match';meta.textContent='Adjust the upper rail or search field to continue.';}
    }else if(mode.kind==='tools'){
      title.textContent='Checklist tools';meta.textContent='Sorting, progress transfer, detail expansion, and reset controls.';
    }else{title.textContent='Research notes';meta.textContent='Gate 1 inventory, construction language, and source/legal notes.';}
    document.getElementById('shown-count').textContent=`${visibleEntries.length} of ${data.entries.length} shown`;
  }
  function renderModeRail(){modeRail.innerHTML=modes.map(mode=>`<button class="rail-chip" type="button" data-mode="${mode.id}" aria-pressed="${mode.id===activeMode}">${mode.label}</button>`).join('');}
  function contextItems(mode){
    if(mode.kind==='entries')return visibleEntries.map(entry=>({id:entry.id,label:entry.name,sub:`#${entry.order} · ${entry.element} · ${entry.category}`}));
    if(mode.kind==='filter')return mode.options.map(([value,label])=>({id:value,label,sub:`${value==='all'?visibleEntries.length:countForFilter(mode.key,value)} shown`}));
    if(mode.kind==='tools')return [
      {id:'source',label:'Source order',sub:'Sort Arcana'},
      {id:'name',label:'Name A–Z',sub:'Sort Arcana'},
      {id:'element-sort',label:'Element, then source',sub:'Sort Arcana'},
      {id:'expand',label:'Expand all',sub:'Current details'},
      {id:'collapse',label:'Collapse all',sub:'Current details'},
      {id:'export',label:'Export progress',sub:'Download JSON'},
      {id:'import',label:'Import progress',sub:'Load JSON'},
      {id:'reset',label:'Reset progress',sub:'Restore defaults'}
    ];
    return [
      {id:'gate1',label:'Gate 1 inventory',sub:'149 Arcana · 197 demos'},
      {id:'construction',label:'Construction language',sub:'Preserved notebook'},
      {id:'sources',label:'Sources & limits',sub:'Video, wiki, legal note'}
    ];
  }
  function selectedContextId(mode){return mode.kind==='entries'?selectedEntryId:modeState[mode.id].selected;}
  function renderPlaybackContext(){
    const name=document.getElementById('video-name')?.textContent??'Full showcase';
    const range=document.getElementById('video-range')?.textContent??'Choose an Arcana to play its bounded clip.';
    const speed=String(video.playbackRate||1);
    const speedOptions=[['0.5','0.5×'],['0.75','0.75×'],['1','1×'],['1.25','1.25×'],['1.5','1.5×']].map(([value,label])=>'<option value="'+value+'"'+(speed===value?' selected':'')+'>'+label+'</option>').join('');
    contextLabel.textContent='Playback';
    contextRail.innerHTML=[
      '<span class="playback-status" aria-live="polite"><strong>'+escapeHtml(name)+'</strong><small>'+escapeHtml(range)+'</small></span>',
      '<button class="rail-chip playback-chip" type="button" data-playback-action="video-play-toggle" aria-label="Play or pause video">▶ Play</button>',
      '<button class="rail-chip playback-chip" type="button" data-playback-action="previous-clip" aria-label="Previous Arcana">← Previous</button>',
      '<button class="rail-chip playback-chip" type="button" data-playback-action="next-clip" aria-label="Next Arcana">Next →</button>',
      '<button class="rail-chip playback-chip" type="button" data-playback-action="full-showcase">Full video</button>',
      '<button class="rail-chip playback-chip" type="button" data-playback-action="replay-clip" aria-label="Replay current clip">↻ Replay</button>',
      '<label class="rail-chip playback-speed-chip"><span>Speed</span><select data-playback-speed aria-label="Playback speed">'+speedOptions+'</select></label>'
    ].join('');
    updatePlayControl();
    requestAnimationFrame(()=>{contextRail.scrollLeft=modeState.playback.visited?modeState.playback.scrollLeft:0;modeState.playback.visited=true;});
  }
  function renderContext(){
    const mode=modeDef();
    if(mode.kind==='playback'){renderPlaybackContext();return;}
    const items=contextItems(mode);
    contextLabel.textContent=mode.kind==='entries'?`${mode.label} · ${visibleEntries.length} shown`:mode.label;
    const selected=selectedContextId(mode);
    contextRail.innerHTML=items.length?items.map(item=>`<button class="rail-chip" type="button" data-item="${escapeHtml(item.id)}" aria-pressed="${item.id===selected}">${escapeHtml(item.label)}${item.sub?`<small>${escapeHtml(item.sub)}</small>`:''}</button>`).join(''):'<span class="rail-empty">No matching detail options.</span>';
    requestAnimationFrame(()=>{contextRail.scrollLeft=modeState[mode.id].visited?modeState[mode.id].scrollLeft:0;modeState[mode.id].visited=true;});
  }

  function activeClipBounds(){
    const fallback=Number(data.video.duration)||0;
    const mediaDuration=Number.isFinite(video.duration)&&video.duration>0?video.duration:fallback;
    const start=Math.max(0,Number(activeStart)||0);
    const requestedEnd=activeEnd===null?mediaDuration:Number(activeEnd);
    const end=Math.max(start+0.001,Number.isFinite(requestedEnd)&&requestedEnd>start?requestedEnd:mediaDuration);
    return{start,end};
  }
  function updatePlayControl(){
    const playing=!video.paused&&!video.ended;
    if(playToggle){
      const icon=playToggle.querySelector('span[aria-hidden]');
      const label=playToggle.querySelector('.video-control-label');
      if(icon)icon.textContent=playing?'❚❚':'▶';
      if(label)label.textContent=playing?'Pause':'Play';
      playToggle.setAttribute('aria-label',playing?'Pause video':'Play video');
      playToggle.title=playing?'Pause video':'Play video';
    }
    const railToggle=contextRail.querySelector('[data-playback-action="video-play-toggle"]');
    if(railToggle){
      railToggle.textContent=playing?'❚❚ Pause':'▶ Play';
      railToggle.setAttribute('aria-label',playing?'Pause video':'Play video');
    }
  }
  function updateMuteControl(){
    if(!muteToggle)return;
    const muted=video.muted||video.volume===0;
    const icon=muteToggle.querySelector('span[aria-hidden]');
    const label=muteToggle.querySelector('.video-control-label');
    if(icon)icon.textContent=muted?'🔇':'🔊';
    if(label)label.textContent=muted?'Unmute':'Mute';
    muteToggle.setAttribute('aria-label',muted?'Unmute video':'Mute video');
    muteToggle.title=muted?'Unmute video':'Mute video';
  }
  function updateCustomControls(){
    const bounds=activeClipBounds();
    const currentValue=Number(video.currentTime);
    const current=Number.isFinite(currentValue)?Math.min(bounds.end,Math.max(bounds.start,currentValue)):bounds.start;
    if(seekControl){
      seekControl.min=String(bounds.start);
      seekControl.max=String(bounds.end);
      seekControl.value=String(current);
      seekControl.setAttribute('aria-valuetext',formatTime(Math.max(0,current-bounds.start))+' of '+formatTime(Math.max(0,bounds.end-bounds.start)));
    }
    if(videoTime)videoTime.textContent=formatTime(Math.max(0,current-bounds.start))+' / '+formatTime(Math.max(0,bounds.end-bounds.start));
    updatePlayControl();
    updateMuteControl();
  }

  function updateClipLabels(entry,clip,label){
    document.getElementById('video-name').textContent=entry?.name??'Full showcase';
    document.getElementById('video-range').textContent=entry?`${label} · ${formatTime(clip.start)}–${formatTime(clip.end)}${segmentSummary(entry)?` · ${segmentSummary(entry)}`:''}`:'22:09 complete source video';
    clipBadge.textContent=entry?`${label} · ${formatTime(clip.start)}–${formatTime(clip.end)}`:'Full showcase video';
  }
  function attemptPlay(showFallback=false){
    // Do not call play() again while media is already running: Android treats
    // redundant play requests as a new native-control interaction.
    if(!video.paused&&!video.ended)return;
    const request=video.play();
    if(request?.catch)request.catch(()=>{if(showFallback)toast('Tap the video to start playback.');});
  }

  function setClip(entry,autoplay=true,mode='showcase',segmentIndex=0){
    if(!entry)return;
    const useReference=mode==='reference'&&entry.referenceWindow;
    const segment=mode==='segment'?entry.showcaseSegments?.[segmentIndex]:null;
    const clip=useReference?entry.referenceWindow:segment??showcaseClip(entry);
    activeEntry=entry;activeClipMode=useReference?'reference':segment?'segment':'showcase';activeSegmentIndex=segment?segmentIndex:0;activeStart=clip.start;activeEnd=clip.end;video.loop=true;
    const label=useReference?'Base reference lock':segment?`${segment.kind==='charged'?'Charged':'Base'} segment`:'Full showcase';
    updateClipLabels(entry,clip,label);video.poster=entry.poster;updateCustomControls();
    const seek=()=>{video.currentTime=clip.start;updateCustomControls();if(autoplay)attemptPlay(true);};
    if(video.readyState>=1)seek();else video.addEventListener('loadedmetadata',seek,{once:true});
  }
  function renderEntry(entry){
    if(!entry){catalog.innerHTML='<div class="rail-empty">No Arcana match these filters.</div>';return;}
    const checked=progress[entry.id]??entry.defaults??{};
    const inventoryOnly=entry.status==='inventory-only';
    const replacement=Boolean(entry.currentImplementation);
    const legacy=entry.lineage==='legacy';
    const segments=entry.showcaseSegments??[];
    const segmentButtons=segments.length>1?segments.map((segment,index)=>`<button type="button" data-action="watch-segment" data-segment-index="${index}">▶ ${segment.kind==='charged'?'Charged only':'Base only'}</button>`).join(''):'';
    const citations=(entry.citations??[]).length?`<ul>${entry.citations.map((url,index)=>`<li><a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">Source ${index+1}</a></li>`).join('')}</ul>`:'<p>The supplied showcase is the primary source for this entry.</p>';
    catalog.innerHTML=`<article class="arcana-card" id="arcana-${escapeHtml(entry.id)}" data-id="${escapeHtml(entry.id)}" data-lineage="${escapeHtml(entry.lineage)}" style="--accent:${elements[entry.element]??'var(--rail-accent)'}"><div class="entry-body"><div class="entry-topline"><div><div class="badges"><span class="badge">${escapeHtml(entry.element)}</span><span class="badge">${escapeHtml(entry.category)}</span></div><h2>${escapeHtml(entry.name)}</h2></div><div class="entry-order">Source #${entry.order}<br>${formatTime(showcaseClip(entry).start)}–${formatTime(showcaseClip(entry).end)}</div></div><div class="badges"><span class="badge ${lineageClass(entry)}">${escapeHtml(lineageLabels[entry.lineage]??entry.lineage)}</span><span class="badge ${entry.status==='source-first-implemented'?'implemented':entry.status==='legacy-replace'||entry.status==='replacement-in-progress'?'legacy':''}">${escapeHtml(statusLabels[entry.status]??entry.status)}</span></div>${replacement?`<div class="rail-notice danger"><strong>Replace, do not polish.</strong> ${legacy?'Source-first reanalysis is still required.':entry.status==='replacement-in-progress'?'The verified gameplay rules remain, but the rejected trajectory and carrier visuals do not count as source-faithful implementation.':'Source-first analysis is complete, but the first-pass game prototype still does not count as a correct implementation.'}</div>`:''}${entry.revisionHistory?`<div class="rail-notice"><strong>Revision history:</strong> ${escapeHtml(entry.revisionHistory)}</div>`:''}<p class="summary">${escapeHtml(entry.summary)}</p><div class="stages" aria-label="${escapeHtml(entry.name)} progress"><label class="stage"><input type="checkbox" data-stage="analysis" ${checked.analysis?'checked':''} ${inventoryOnly?'disabled':''}> Source-first analysis complete</label><label class="stage"><input type="checkbox" data-stage="implementation" ${checked.implementation?'checked':''} ${inventoryOnly?'disabled':''}> Source-first implementation complete</label><label class="stage"><input type="checkbox" data-stage="comparison" ${checked.comparison?'checked':''} ${inventoryOnly?'disabled':''}> Source comparison passed</label></div><div class="card-actions"><button class="watch" type="button" data-action="watch">▶ Full showcase clip</button>${segmentButtons}${entry.referenceWindow?'<button type="button" data-action="watch-reference">▶ Base reference lock</button>':''}<button type="button" data-action="copy">Copy implementation brief</button></div><div class="details-stack"><details><summary>${inventoryOnly?'Gate 1 video inventory':legacy?'Initial-pass research (historical)':'Source-first analysis notebook'}</summary><div class="detail-content">${markdownToHtml(entry.analysisMarkdown)}</div></details>${replacement?`<details open><summary>Current game prototype & replacement plan</summary><div class="detail-content"><h3>What currently exists</h3><p>${escapeHtml(entry.currentImplementation)}</p><h3>Future source-first replacement checklist</h3>${markdownToHtml(entry.replacementChecklist)}</div></details>`:''}${entry.supplementMarkdown?`<details><summary>Detailed implementation supplement</summary><div class="detail-content">${markdownToHtml(entry.supplementMarkdown)}</div></details>`:''}<details><summary>Recipe, acceptance, and issues</summary><div class="detail-content">${markdownToHtml([entry.recipe,entry.acceptance,entry.issues].filter(Boolean).join('\n\n'))}</div></details><details><summary>Sources & stable reference</summary><div class="detail-content"><p><code>#arcana-${escapeHtml(entry.id)}</code></p><p><strong>Full showcase:</strong> ${formatTime(showcaseClip(entry).start)}–${formatTime(showcaseClip(entry).end)}${segmentSummary(entry)?`<br>${escapeHtml(segmentSummary(entry))}`:''}${entry.referenceWindow?`<br><strong>Audited base lock:</strong> ${formatTime(entry.referenceWindow.start)}–${formatTime(entry.referenceWindow.end)}`:''}</p>${citations}</div></details></div></div></article>`;
  }
  function renderTools(){
    const sortLabel={source:'Source order',name:'Name A–Z',element:'Element, then source'}[filterState.sort];
    catalog.innerHTML=`<article class="tools-card"><div class="tools-body"><div class="rail-eyebrow">Checklist controls</div><h2>Sort, expand, and transfer progress</h2><p class="summary">The same controls from the original checklist now live behind the Tools detail rail. Current sort: <strong>${sortLabel}</strong>.</p><div class="tools-grid"><button type="button" data-tool="expand">Expand all</button><button type="button" data-tool="collapse">Collapse all</button><button type="button" data-tool="export">Export progress</button><button type="button" data-tool="import">Import progress</button><button type="button" data-tool="reset">Reset progress</button></div><details open><summary>What the counters mean</summary><div class="detail-content"><p>Inventory-only Arcana remain in the 149-card catalog but are excluded from source-first completion totals until their later analysis gate. A legacy prototype does not count as a completed source-first implementation.</p><p>${visibleEntries.length} of ${data.entries.length} Arcana are currently shown by the active filters.</p></div></details></div></article>`;
  }
  function renderResearch(kind){
    const gate1='<div class="rail-notice"><strong>Gate 1 complete-video inventory:</strong> The source-first ledger contains 149 distinct on-screen Arcana, 197 timestamped demonstrations, and 48 separate charged demonstrations. Every entry has a full showcase window; inventory-only entries wait for later behavior alignment.</div><div class="rail-notice"><strong>Authority:</strong> Whole-second boundaries came from the uploader timestamp ledger and were cross-checked against every on-screen title card. Tighter frame-audited reference locks remain separate.</div><p>Use the Arcana mode to browse each source item, then use Element, Category, Lineage, and Status to narrow the upper detail rail without losing the selected entry\'s full notes.</p>';
    const sources='<div class="rail-notice"><strong>Unofficial educational reference.</strong> Wizard of Legend and its assets belong to their respective owners. This page analyzes publicly demonstrated behavior for prototype study; it does not contain original game code and does not claim ownership of the footage.</div><p>The local 480p reference video is 69 MiB, below GitHub\'s 100 MiB per-file ceiling and within the current Pages site budget. The source video is 22:09 at 60 FPS. The full showcase and individual clip windows are available above.</p><p><a href="https://wizardoflegend.fandom.com/wiki/Arcana" target="_blank" rel="noreferrer">Wizard of Legend community Arcana index ↗</a></p><p>Generated from the archived project research on 2026-07-27T04:40:53.046Z.</p>';
    catalog.innerHTML=`<article class="research-card"><div class="research-body"><div class="rail-eyebrow">Preserved research</div><h2>${kind==='gate1'?'Gate 1 complete-video inventory':kind==='construction'?'Construction Language & First-Pass Notebook':'Sources, limits, and provenance'}</h2>${kind==='gate1'?gate1:kind==='construction'?`<div class="rail-notice">This notebook is historical input, not the final authority. When it conflicts with a source-first entry above, the source-first entry wins.</div><details open><summary>Open the complete construction-language notebook</summary><div class="detail-content">${markdownToHtml(data.frameworkMarkdown)}</div></details>`:sources}</div></article>`;
  }
  function renderCurrentView(){
    const mode=modeDef();
    if(mode.kind==='tools'){renderTools();updateSelectionHeader();return;}
    if(mode.kind==='research'){renderResearch(modeState.research.selected);updateSelectionHeader();return;}
    const entry=currentEntry();
    if(entry&&(!activeEntry||activeEntry.id!==entry.id))setClip(entry,false);
    renderEntry(entry);updateSelectionHeader();
  }
  function refresh(){
    calculateVisible();
    if(!visibleEntries.some(entry=>entry.id===selectedEntryId))selectedEntryId=visibleEntries[0]?.id??null;
    renderContext();renderCurrentView();updateMetrics();
  }
  function setSelectedEntry(entry,autoplay=true,mode='showcase',segmentIndex=0){
    if(!entry)return;
    selectedEntryId=entry.id;modeState.arcana.selected=entry.id;setClip(entry,autoplay,mode,segmentIndex);renderCurrentView();contextRail.querySelectorAll('[data-item]').forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.item===entry.id)));updateSelectionHeader();
  }
  function saveContextPosition(){modeState[activeMode].scrollLeft=contextRail.scrollLeft;}
  function setMode(next){
    if(next===activeMode)return;
    saveContextPosition();activeMode=next;modeRail.querySelectorAll('[data-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===activeMode)));renderContext();renderCurrentView();updateSelectionHeader();
  }
  function setFilter(mode,value){filterState[mode.key]=value;modeState[mode.id].selected=value;refresh();}
  function performTool(id){
    if(['source','name','element-sort'].includes(id)){filterState.sort=id==='element-sort'?'element':id;modeState.tools.selected=id;refresh();return;}
    if(id==='expand'||id==='collapse'){catalog.querySelectorAll('details').forEach(detail=>detail.open=id==='expand');modeState.tools.selected=id;return;}
    if(id==='export'){const blob=new Blob([JSON.stringify({schemaVersion:1,catalogRevision:CATALOG_REVISION,entries:progress,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='wizard-of-legend-checklist-progress.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);toast('Progress exported.');return;}
    if(id==='import'){document.getElementById('import-file').click();return;}
    if(id==='reset'){if(!confirm('Reset all checklist progress to the project defaults?'))return;progress=defaultProgress();saveProgress();renderCurrentView();toast('Progress reset.');}
  }
  function stepClip(direction){const list=visibleEntries.length?visibleEntries:data.entries;let index=activeEntry?list.findIndex(entry=>entry.id===activeEntry.id):-1;index=index<0?0:(index+direction+list.length)%list.length;setSelectedEntry(list[index],true);}
  async function copyBrief(entry){
    const stage=progress[entry.id]??entry.defaults??{};const clip=showcaseClip(entry);
    const text=[`${entry.name} — Wizard of Legend source reference`,`${location.href.split('#')[0]}#arcana-${entry.id}`,`Full showcase clip: ${formatTime(clip.start)}–${formatTime(clip.end)}`,segmentSummary(entry),entry.referenceWindow?`Base reference lock: ${formatTime(entry.referenceWindow.start)}–${formatTime(entry.referenceWindow.end)}`:'',`Lineage: ${lineageLabels[entry.lineage]??entry.lineage}`,`Status: ${statusLabels[entry.status]??entry.status}`,`Stages: analysis ${stage.analysis?'complete':'pending'}; implementation ${stage.implementation?'complete':'pending'}; comparison ${stage.comparison?'passed':'pending'}`,'',entry.summary,'',plainForCopy(entry.recipe),'',plainForCopy(entry.acceptance),'',plainForCopy(entry.issues)].filter(Boolean).join('\n');
    try{await navigator.clipboard.writeText(text);toast('Implementation brief copied.');}catch{const area=document.createElement('textarea');area.value=text;document.body.append(area);area.select();document.execCommand('copy');area.remove();toast('Implementation brief copied.');}
  }
  function plainForCopy(markdown){return String(markdown??'').replace(/[#*`>|]/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').trim();}
  function toast(message){const node=document.getElementById('toast');node.textContent=message;node.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.classList.remove('show'),1800);}
  function handleContextClick(event){
    const playbackButton=event.target.closest('[data-playback-action]');
    if(playbackButton&&modeDef().kind==='playback'){
      document.getElementById(playbackButton.dataset.playbackAction)?.click();
      return;
    }
    const button=event.target.closest('[data-item]');if(!button)return;
    const mode=modeDef();const id=button.dataset.item;modeState[mode.id].selected=id;
    if(mode.kind==='entries'){setSelectedEntry(data.entries.find(item=>item.id===id),true);return;}
    if(mode.kind==='filter'){setFilter(mode,id);return;}
    if(mode.kind==='tools'){performTool(id);return;}
    modeState.research.selected=id;renderCurrentView();renderContext();
  }
  function attachRailDrag(rail){
    let dragging=false,moved=false,startX=0,startScroll=0;
    rail.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')return;dragging=true;moved=false;startX=event.clientX;startScroll=rail.scrollLeft;rail.setPointerCapture?.(event.pointerId);});
    rail.addEventListener('pointermove',event=>{if(!dragging)return;const dx=event.clientX-startX;if(Math.abs(dx)>4)moved=true;rail.scrollLeft=startScroll-dx;});
    rail.addEventListener('pointerup',event=>{dragging=false;rail.releasePointerCapture?.(event.pointerId);});
    rail.addEventListener('click',event=>{if(moved){event.preventDefault();event.stopPropagation();moved=false;}},true);
  }

  playToggle?.addEventListener('click',()=>{if(video.paused||video.ended)attemptPlay(true);else video.pause();});
  seekControl?.addEventListener('input',event=>{video.currentTime=Number(event.target.value);updateCustomControls();});
  muteToggle?.addEventListener('click',()=>{video.muted=!video.muted;updateMuteControl();});
  fullscreenToggle?.addEventListener('click',()=>{
    if(document.fullscreenElement){document.exitFullscreen?.();return;}
    const target=document.querySelector('.rail-video-player');
    if(target?.requestFullscreen)target.requestFullscreen().catch(()=>{});
    else if(video.webkitEnterFullscreen)video.webkitEnterFullscreen();
  });
  video.addEventListener('click',()=>{if(video.paused||video.ended)attemptPlay(true);else video.pause();});
  video.addEventListener('play',updateCustomControls);
  video.addEventListener('pause',updateCustomControls);
  video.addEventListener('ended',updateCustomControls);
  video.addEventListener('loadedmetadata',updateCustomControls);
  video.addEventListener('durationchange',updateCustomControls);
  video.addEventListener('volumechange',updateMuteControl);
  document.addEventListener('fullscreenchange',()=>{
    if(fullscreenToggle){
      const active=Boolean(document.fullscreenElement);
      fullscreenToggle.setAttribute('aria-label',active?'Exit fullscreen':'Enter fullscreen');
      fullscreenToggle.title=active?'Exit fullscreen':'Enter fullscreen';
    }
  });
  updateCustomControls();

  renderModeRail();
  modeRail.addEventListener('click',event=>{const button=event.target.closest('[data-mode]');if(button)setMode(button.dataset.mode);});
  contextRail.addEventListener('click',handleContextClick);
  contextRail.addEventListener('change',event=>{
    const select=event.target.closest('[data-playback-speed]');
    if(!select)return;
    video.playbackRate=Number(select.value);
    const legacy=document.getElementById('playback-speed');
    if(legacy)legacy.value=select.value;
  });
  contextRail.addEventListener('scroll',saveContextPosition,{passive:true});
  attachRailDrag(modeRail);attachRailDrag(contextRail);
  searchInput.addEventListener('input',event=>{filterState.search=event.target.value.trim();refresh();});
  catalog.addEventListener('change',event=>{const input=event.target.closest('input[data-stage]');if(!input)return;const card=input.closest('.arcana-card');if(!card)return;progress[card.dataset.id]={...(progress[card.dataset.id]??{}),[input.dataset.stage]:input.checked};saveProgress();});
  catalog.addEventListener('click',event=>{
    const tool=event.target.closest('[data-tool]');if(tool){performTool(tool.dataset.tool);return;}
    const button=event.target.closest('button[data-action]');if(!button)return;
    const card=button.closest('.arcana-card');const entry=card?data.entries.find(item=>item.id===card.dataset.id):null;if(!entry)return;
    if(button.dataset.action==='watch')setClip(entry,true);
    if(button.dataset.action==='watch-segment')setClip(entry,true,'segment',Number(button.dataset.segmentIndex));
    if(button.dataset.action==='watch-reference')setClip(entry,true,'reference');
    if(button.dataset.action==='copy')copyBrief(entry);
  });
  document.getElementById('previous-clip').addEventListener('click',()=>stepClip(-1));
  document.getElementById('next-clip').addEventListener('click',()=>stepClip(1));
  document.getElementById('replay-clip').addEventListener('click',()=>activeEntry?setClip(activeEntry,true,activeClipMode,activeSegmentIndex):attemptPlay(true));
  document.getElementById('full-showcase').addEventListener('click',()=>{activeEntry=null;activeStart=0;activeEnd=null;activeClipMode='showcase';video.loop=true;video.poster='';updateClipLabels(null,null,'Full showcase');video.currentTime=0;updateCustomControls();attemptPlay(true);});
  document.getElementById('playback-speed').addEventListener('change',event=>video.playbackRate=Number(event.target.value));
  document.getElementById('research-link').addEventListener('click',()=>{modeState.research.selected='construction';if(activeMode==='research'){renderContext();renderCurrentView();}else setMode('research');});
  document.getElementById('import-file').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{const incoming=JSON.parse(await file.text());if(incoming.schemaVersion!==1||!incoming.entries)throw new Error();progress=progressFromPayload(incoming);saveProgress();renderCurrentView();toast('Progress imported.');}catch{toast('That progress file is not valid.');}event.target.value='';});
  // Seek inside the already-playing media instead of calling play() again; repeated play() calls reopen Android's native overlay.
  video.addEventListener('timeupdate',()=>{if(activeEnd!==null&&video.currentTime>=activeEnd)video.currentTime=activeStart;updateCustomControls();});
  window.addEventListener('hashchange',()=>{const entry=data.entries.find(item=>`#arcana-${item.id}`===location.hash);if(entry){activeMode='arcana';modeRail.querySelectorAll('[data-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode==='arcana')));selectedEntryId=entry.id;filterState.search='';searchInput.value='';filterState.element='all';filterState.category='all';filterState.lineage='all';filterState.status='all';filterState.sort='source';refresh();setClip(entry,false);}});

  document.getElementById('tracked-count').textContent=data.entries.length;
  searchInput.value=filterState.search;
  const hashEntry=data.entries.find(item=>`#arcana-${item.id}`===location.hash);
  if(hashEntry)selectedEntryId=hashEntry.id;
  refresh();
  if(hashEntry)setClip(hashEntry,false);
})();
