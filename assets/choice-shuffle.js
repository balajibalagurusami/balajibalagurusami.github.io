(() => {
  'use strict';

  function shuffleChoices() {
    const host = document.getElementById('choices');
    if (!host || host.dataset.shuffled === 'true') return;

    const choices = Array.from(host.querySelectorAll('.choice'));
    if (choices.length < 2) return;

    host.dataset.shuffled = 'true';
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    choices.forEach(choice => host.appendChild(choice));
  }

  const modalBody = document.getElementById('modalBody');
  if (!modalBody) return;

  const observer = new MutationObserver(shuffleChoices);
  observer.observe(modalBody, { childList: true, subtree: true });
  shuffleChoices();
})();
