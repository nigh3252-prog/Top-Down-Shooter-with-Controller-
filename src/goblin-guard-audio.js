export function createMetalGuardAudio(){
  let context=null;

  function ensureContext(){
    const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!AudioContext)return null;
    try{
      context=context||new AudioContext();
      if(context.state==='suspended')context.resume?.();
      return context;
    }catch{return null;}
  }

  function strike({strong=false,breakHit=false,power=1}={}){
    const audio=ensureContext();
    if(!audio)return;
    const t=audio.currentTime;
    const master=audio.createGain();
    const duration=breakHit?.48:strong?.34:.24;
    const volume=Math.min(.32,(breakHit?.22:strong?.17:.12)*Math.max(.55,power));
    master.gain.setValueAtTime(volume,t);
    master.gain.exponentialRampToValueAtTime(.0001,t+duration);
    master.connect(audio.destination);

    const frequencies=breakHit?[330,620,1110,2380]:strong?[470,930,1810]:[760,1430,2640];
    frequencies.forEach((frequency,index)=>{
      const oscillator=audio.createOscillator();
      const gain=audio.createGain();
      oscillator.type=index===0?'triangle':'sine';
      oscillator.frequency.setValueAtTime(frequency*(.96+Math.random()*.08),t);
      oscillator.frequency.exponentialRampToValueAtTime(frequency*(breakHit?.52:.70),t+duration*.82);
      gain.gain.setValueAtTime(index===0?.72:.38,t);
      gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
      oscillator.connect(gain).connect(master);
      oscillator.start(t);
      oscillator.stop(t+duration+.03);
    });
  }

  return {
    playBlock({guardClass='standard',power=1}={}){
      strike({strong:guardClass==='chop'||guardClass==='upward',power});
    },
    playBreak({power=1}={}){
      strike({strong:true,breakHit:true,power});
      setTimeout(()=>strike({strong:true,power:.7}),45);
    },
  };
}
