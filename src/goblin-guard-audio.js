const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function metalGuardEventForClass(guardClass='standard',broken=false){
  if(broken)return 'guardBreak';
  if(guardClass==='upward'||guardClass==='chop')return 'guardClang';
  return 'guardCling';
}

export function createMetalGuardAudio(){
  let context=null;
  let master=null;
  let metalBus=null;
  let noiseBuffer=null;
  let lastAt=0;

  function init(){
    if(context)return true;
    const AudioContextCtor=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!AudioContextCtor)return false;
    context=new AudioContextCtor();
    master=context.createGain();
    master.gain.value=.82;
    metalBus=context.createGain();
    metalBus.gain.value=.9;
    const compressor=context.createDynamicsCompressor();
    compressor.threshold.value=-15;
    compressor.knee.value=9;
    compressor.ratio.value=6;
    compressor.attack.value=.002;
    compressor.release.value=.16;
    metalBus.connect(master);
    master.connect(compressor).connect(context.destination);
    noiseBuffer=context.createBuffer(1,Math.ceil(context.sampleRate*.8),context.sampleRate);
    const data=noiseBuffer.getChannelData(0);
    let seed=93187;
    for(let index=0;index<data.length;index++){
      seed=(seed*16807)%2147483647;
      data[index]=seed/1073741823-1;
    }
    return true;
  }

  function resume(){
    if(!init())return false;
    if(context.state==='suspended')context.resume();
    return true;
  }

  function envelope(gain,start,peak,duration,attack=.002){
    gain.gain.cancelScheduledValues(start);
    gain.gain.setValueAtTime(.0001,start);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0001,peak),start+attack);
    gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  }

  function partial(frequency,duration,gainValue,delay=0,detune=0){
    const start=context.currentTime+delay;
    const oscillator=context.createOscillator();
    const gain=context.createGain();
    oscillator.type='sine';
    oscillator.frequency.setValueAtTime(Math.max(40,frequency),start);
    oscillator.detune.value=detune;
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(35,frequency*.82),start+duration);
    envelope(gain,start,gainValue,duration,.0015);
    oscillator.connect(gain).connect(metalBus);
    oscillator.start(start);
    oscillator.stop(start+duration+.03);
  }

  function scrape({high=5200,low=1700,duration=.055,gainValue=.12,delay=0,q=3.5}={}){
    const start=context.currentTime+delay;
    const source=context.createBufferSource();
    const filter=context.createBiquadFilter();
    const gain=context.createGain();
    source.buffer=noiseBuffer;
    source.playbackRate.value=.82+Math.random()*.38;
    filter.type='bandpass';
    filter.Q.value=q;
    filter.frequency.setValueAtTime(high,start);
    filter.frequency.exponentialRampToValueAtTime(low,start+duration);
    envelope(gain,start,gainValue,duration,.001);
    source.connect(filter).connect(gain).connect(metalBus);
    source.start(start,Math.random()*.35);
    source.stop(start+duration+.025);
  }

  function tick(frequency,gainValue,delay){
    partial(frequency,.055,gainValue,delay,(Math.random()-.5)*20);
    scrape({high:frequency*3.5,low:frequency*1.8,duration:.032,gainValue:gainValue*.42,delay,q:5});
  }

  function play(event,{power=1}={}){
    if(!resume())return;
    const now=performance.now();
    if(now-lastAt<20)return;
    lastAt=now;
    const strength=clamp(Number(power)||1,.45,2.4);
    const variation=.92+Math.random()*.17;

    if(event==='guardCling'){
      partial(1160*variation,.15,.13*strength);
      partial(1735*variation,.11,.08*strength,.003,7);
      partial(2470*variation,.075,.045*strength,.006,-10);
      scrape({high:6200,low:2350,duration:.05,gainValue:.12*strength,q:4.5});
      return;
    }
    if(event==='guardClang'){
      partial(520*variation,.26,.19*strength);
      partial(845*variation,.21,.15*strength,.003,-8);
      partial(1375*variation,.15,.09*strength,.006,11);
      scrape({high:4700,low:980,duration:.085,gainValue:.18*strength,q:2.8});
      tick(1280*variation,.055*strength,.075);
      return;
    }
    if(event==='guardBreak'){
      partial(245*variation,.42,.30*strength);
      partial(392*variation,.34,.23*strength,.003,-12);
      partial(715*variation,.28,.16*strength,.008,9);
      partial(1280*variation,.17,.10*strength,.014,-6);
      scrape({high:5600,low:520,duration:.17,gainValue:.28*strength,q:1.8});
      tick(940*variation,.095*strength,.065);
      tick(1370*variation,.07*strength,.13);
      tick(1880*variation,.045*strength,.20);
    }
  }

  return {
    play,
    playBlock({guardClass='standard',power=1}={}){
      play(metalGuardEventForClass(guardClass,false),{power});
    },
    playBreak({power=1.5}={}){
      play('guardBreak',{power});
    },
  };
}
