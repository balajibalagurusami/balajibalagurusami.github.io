(() => {
  'use strict';

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  let audio = null;

  const patterns = {
    correct: [
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

  function prime() {
    try {
      const ctx = context();
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
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

  function play(name) {
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

  window.BITS_QUIZ_SOUNDS = { play, prime };

  document.addEventListener('click', event => {
    const choice = event.target.closest?.('.choice');
    if (!choice) return;

    if (choice.classList.contains('good')) {
      play('correct');
    } else if (choice.classList.contains('bad')) {
      play('wrong');
    }
  });
})();
