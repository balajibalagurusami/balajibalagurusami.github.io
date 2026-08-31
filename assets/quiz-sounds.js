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
    if(name==='correct' || name==='wrong' || name==='streak') playClip(name);
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

    const count=dailyCount();
    const isNewAttempt=count>lastDailyCount;
    const isTenQuestionAchievement=isNewAttempt && count%MILESTONE_SIZE===0;

    if(isNewAttempt) lastDailyCount=count;
    else lastDailyCount=Math.max(lastDailyCount,count);

    if(isTenQuestionAchievement){
      play('streak');
      return;
    }

    if(target.classList.contains('choice')){
      if(target.classList.contains('good')) play('correct');
      else if(target.classList.contains('bad')) play('wrong');
    }
  });

  window.addEventListener('storage',event=>{ if(event.key===DAILY_STORE_KEY) lastDailyCount=dailyCount(); });
  prime();
})();
