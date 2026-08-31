(() => {
  'use strict';

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const DAILY_STORE_KEY = 'bits-sem1-daily-v1';
  const MILESTONE_SIZE = 10;
  const CORRECT_AUDIO_URL = '/assets/correct-answer.mp3';
  let audio = null;
  let correctAudio = null;

  const patterns = {
    correctFallback: [
      [0.00, 523.25, 0.09, 'sine', 0.045],
      [0.08, 659.25, 0.13, 'sine', 0.050]
    ],
    wrong: [
      [0.00, 196.00, 0.11, 'triangle', 0.040],
      [0.10, 146.83, 0.16, 'triangle', 0.035]
    ],
    streak: [
      [0.00, 523.25, 0.08, 'sine', 0.045],
      [0.08, 659.25, 0.08, 'sine', 0.048],
      [0.16, 783.99, 0.10, 'sine', 0.052],
      [0.28, 1046.50, 0.20, 'sine', 0.055]
    ],
    milestone: [
      [0.00, 659.25, 0.08, 'sine', 0.045],
      [0.08, 783.99, 0.08, 'sine', 0.048],
      [0.16, 987.77, 0.16, 'sine', 0.052]
    ]
  };

  function context() {
    if (!audio) audio = new AudioCtx();
    return audio;
  }

  function primeCorrectAudio() {
    if (!correctAudio) {
      correctAudio = new Audio(CORRECT_AUDIO_URL);
      correctAudio.preload = 'auto';
      correctAudio.volume = 0.9;
    }
    try {
      correctAudio.load();
    } catch (_) {}
    return correctAudio;
  }

  function prime() {
    try {
      const ctx = context();
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      primeCorrectAudio();
      return ctx;
    } catch (_) {
      return null;
    }
  }

  function schedule(ctx, pattern) {
    const now = ctx.currentTime + 0.005;
    pattern.forEach(([delay, frequency, duration, type, volume]) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + delay;
      const stop = start + duration;

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.012, duration / 3));
      gain.gain.exponentialRampToValueAtTime(0.0001, stop);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(stop + 0.01);
    });
  }

  function playPattern(name) {
    const pattern = patterns[name];
    if (!pattern) return;
    try {
      const ctx = context();
      const start = () => schedule(ctx, pattern);
      if (ctx.state === 'suspended') {
        ctx.resume().then(start).catch(() => {});
      } else {
        start();
      }
    } catch (_) {}
  }

  function playCorrect() {
    try {
      const clip = primeCorrectAudio();
      clip.pause();
      clip.currentTime = 0;
      const started = clip.play();
      if (started && typeof started.catch === 'function') {
        started.catch(() => playPattern('correctFallback'));
      }
    } catch (_) {
      playPattern('correctFallback');
    }
  }

  function play(name) {
    if (name === 'correct') {
      playCorrect();
      return;
    }
    playPattern(name);
  }

  function dayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function dailyCount() {
    try {
      const state = JSON.parse(localStorage.getItem(DAILY_STORE_KEY) || '{}');
      return Number(state.days?.[dayKey()]?.count) || 0;
    } catch (_) {
      return 0;
    }
  }

  let lastDailyCount = dailyCount();

  window.BITS_QUIZ_SOUNDS = { play, prime };

  document.addEventListener('click', event => {
    const target = event.target.closest?.('.choice, #complete');
    if (!target) return;

    prime();

    if (target.classList.contains('choice')) {
      if (target.classList.contains('good')) {
        play('correct');
      } else if (target.classList.contains('bad')) {
        play('wrong');
      }
    }

    const count = dailyCount();
    if (count > lastDailyCount) {
      lastDailyCount = count;
      if (count % MILESTONE_SIZE === 0) {
        const achievement = count === MILESTONE_SIZE ? 'streak' : 'milestone';
        setTimeout(() => play(achievement), 240);
      }
    } else {
      lastDailyCount = Math.max(lastDailyCount, count);
    }
  });

  window.addEventListener('storage', event => {
    if (event.key === DAILY_STORE_KEY) lastDailyCount = dailyCount();
  });

  primeCorrectAudio();
})();
