(() => {
  'use strict';

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const DAILY_STORE_KEY = 'bits-sem1-daily-v1';
  const MILESTONE_SIZE = 10;
  const CLIPS = {
    correct: '/assets/k7m2v9.mp3',
    wrong: '/assets/r4x8q1.mp3',
    streak: '/assets/streak.mp3'
  };

  let audio = null;
  const clipCache = {};

  const patterns = {
    milestone: [[0,659.25,.08,'sine',.045],[.08,783.99,.08,'sine',.048],[.16,987.77,.16,'sine',.052]]
  };

  function context(){ if(!audio) audio=new AudioCtx(); return audio; }

  function getClip(name){
    const src=CLIPS[name];
    if(!src) return null;
    if(!clipCache[name]){
      const clip=new Audio(src);
      clip.preload='auto';
      clip.volume=.9;
      clipCache[name]=clip;
    }
    return clipCache[name];
  }

  function prime(){
    try{
      const ctx=context();
      if(ctx.state==='suspended') ctx.resume().catch(()=>{});
      ['correct','wrong','streak'].forEach(name=>{ try{ getClip(name)?.load(); }catch(_){} });
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

  function playClip(name){
    try{
      const clip=getClip(name);
      if(!clip) return;
      clip.pause();
      clip.currentTime=0;
      const started=clip.play();
      if(started && typeof started.catch==='function') started.catch(()=>{});
    }catch(_){}
  }

  function play(name){
    if(name==='correct' || name==='wrong' || name==='streak'){
      playClip(name);
      return;
    }
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
