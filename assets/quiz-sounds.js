(() => {
  'use strict';

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const DAILY_STORE_KEY = 'bits-sem1-daily-v1';
  const MILESTONE_SIZE = 10;
  const CLIPS = {
    correct: { binary: '/assets/k7m2v9.mp3', text: '/assets/k7m2v9.aud' },
    wrong: { binary: '/assets/r4x8q1.mp3', text: '/assets/r4x8q1.aud' }
  };

  let audio = null;
  const clipCache = {};
  const sourceCache = {};

  const patterns = {
    correctFallback: [[0,523.25,.09,'sine',.045],[.08,659.25,.13,'sine',.05]],
    wrongFallback: [[0,196,.11,'triangle',.04],[.1,146.83,.16,'triangle',.035]],
    streak: [[0,523.25,.08,'sine',.045],[.08,659.25,.08,'sine',.048],[.16,783.99,.1,'sine',.052],[.28,1046.5,.2,'sine',.055]],
    milestone: [[0,659.25,.08,'sine',.045],[.08,783.99,.08,'sine',.048],[.16,987.77,.16,'sine',.052]]
  };

  function context(){ if(!audio) audio=new AudioCtx(); return audio; }
  function normalizeBase64(text){ const value=String(text||'').replace(/\s+/g,''); return /^[A-Za-z0-9+/]+={0,2}$/.test(value)?value:''; }

  async function resolveSource(name){
    if(sourceCache[name]) return sourceCache[name];
    const spec=CLIPS[name];
    if(!spec) return '';
    sourceCache[name]=(async()=>{
      try{ const head=await fetch(spec.binary,{method:'HEAD',cache:'force-cache'}); if(head.ok) return spec.binary; }catch(_){}
      try{
        const response=await fetch(spec.text,{cache:'force-cache'});
        if(!response.ok) return '';
        const encoded=normalizeBase64(await response.text());
        return encoded?`data:audio/mpeg;base64,${encoded}`:'';
      }catch(_){ return ''; }
    })();
    return sourceCache[name];
  }

  async function getClip(name){
    if(clipCache[name]) return clipCache[name];
    const src=await resolveSource(name);
    if(!src) return null;
    const clip=new Audio(src);
    clip.preload='auto';
    clip.volume=.9;
    clipCache[name]=clip;
    return clip;
  }

  function prime(){
    try{
      const ctx=context();
      if(ctx.state==='suspended') ctx.resume().catch(()=>{});
      getClip('correct').catch(()=>{});
      getClip('wrong').catch(()=>{});
      return ctx;
    }catch(_){ return null; }
  }

  function schedule(ctx,pattern){
    const now=ctx.currentTime+.005;
    pattern.forEach(([delay,frequency,duration,type,volume])=>{
      const oscillator=ctx.createOscillator(), gain=ctx.createGain();
      const start=now+delay, stop=start+duration;
      oscillator.type=type;
      oscillator.frequency.setValueAtTime(frequency,start);
      gain.gain.setValueAtTime(.0001,start);
      gain.gain.exponentialRampToValueAtTime(volume,start+Math.min(.012,duration/3));
      gain.gain.exponentialRampToValueAtTime(.0001,stop);
      oscillator.connect(gain); gain.connect(ctx.destination);
      oscillator.start(start); oscillator.stop(stop+.01);
    });
  }

  function playPattern(name){
    const pattern=patterns[name];
    if(!pattern) return;
    try{
      const ctx=context(), start=()=>schedule(ctx,pattern);
      if(ctx.state==='suspended') ctx.resume().then(start).catch(()=>{}); else start();
    }catch(_){}
  }

  async function playClip(name,fallbackName){
    try{
      const clip=await getClip(name);
      if(!clip){ playPattern(fallbackName); return; }
      clip.pause(); clip.currentTime=0; await clip.play();
    }catch(_){ playPattern(fallbackName); }
  }

  function play(name){
    if(name==='correct'){ void playClip('correct','correctFallback'); return; }
    if(name==='wrong'){ void playClip('wrong','wrongFallback'); return; }
    playPattern(name);
  }

  function dayKey(date=new Date()){
    const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }

  function dailyCount(){
    try{ const state=JSON.parse(localStorage.getItem(DAILY_STORE_KEY)||'{}'); return Number(state.days?.[dayKey()]?.count)||0; }
    catch(_){ return 0; }
  }

  let lastDailyCount=dailyCount();
  window.BITS_QUIZ_SOUNDS={play,prime};

  document.addEventListener('click',event=>{
    const target=event.target.closest?.('.choice, #complete');
    if(!target) return;
    prime();
    if(target.classList.contains('choice')){
      if(target.classList.contains('good')) play('correct');
      else if(target.classList.contains('bad')) play('wrong');
    }
    const count=dailyCount();
    if(count>lastDailyCount){
      lastDailyCount=count;
      if(count%MILESTONE_SIZE===0){
        const achievement=count===MILESTONE_SIZE?'streak':'milestone';
        setTimeout(()=>play(achievement),240);
      }
    }else lastDailyCount=Math.max(lastDailyCount,count);
  });

  window.addEventListener('storage',event=>{ if(event.key===DAILY_STORE_KEY) lastDailyCount=dailyCount(); });
  prime();
})();
