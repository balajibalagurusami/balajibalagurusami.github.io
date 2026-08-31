(() => {
  'use strict';

  const STYLE_ID = 'bits-answer-leak-guard-style';

  function normalize(text = '') {
    return String(text)
      .replace(/\\\(|\\\)|\\\[|\\\]/g, '')
      .replace(/\s+/g, '')
      .toLowerCase();
  }

  function looksFormulaLike(text = '') {
    return /[=+\-*/^_\\]|(?:sqrt|frac|omega|sigma|theta|dot|ddot|sin|cos|tan|exp)/i.test(String(text));
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #modalBody > h2{display:none!important}
      #modalBody > .mathbox{display:none!important}
      .answer-leak-redacted{font-weight:800;letter-spacing:.08em}
    `;
    document.head.appendChild(style);
  }

  function redactFormulaTopicTitles() {
    document.querySelectorAll('.topic-head h3').forEach(title => {
      if (title.dataset.answerLeakChecked === '1') return;
      title.dataset.answerLeakChecked = '1';
      const text = (title.textContent || '').trim();
      const eq = text.indexOf('=');
      if (eq > 0) {
        title.dataset.fullTopicTitle = text;
        title.textContent = text.slice(0, eq).trim();
        title.title = 'Explicit formula omitted here so the quiz does not reveal its answer.';
      }
    });
  }

  function moveQuestionMathIntoExplanation(body) {
    const math = body.querySelector(':scope > .mathbox');
    const explanation = body.querySelector('#explanation');
    if (!math || !explanation) return;
    math.removeAttribute('style');
    math.classList.add('answer-leak-moved-math');
    explanation.appendChild(math);
  }

  function redactExactChoiceFromPrompt(body) {
    const prompt = body.querySelector('.prompt');
    if (!prompt || prompt.dataset.answerLeakChecked === '1') return;
    prompt.dataset.answerLeakChecked = '1';

    body.querySelectorAll('#choices .choice').forEach(choice => {
      const optionText = (choice.textContent || '').trim();
      const optionHtml = (choice.innerHTML || '').trim();
      const optionNorm = normalize(optionText);
      const promptNorm = normalize(prompt.textContent || '');

      if (!optionHtml || !optionNorm) return;
      if (optionNorm.length < 8 && !looksFormulaLike(optionText)) return;
      if (!promptNorm.includes(optionNorm)) return;

      if (prompt.innerHTML.includes(optionHtml)) {
        prompt.innerHTML = prompt.innerHTML.split(optionHtml).join(
          '<span class="answer-leak-redacted" aria-label="answer omitted">_____</span>'
        );
      }
    });
  }

  function protectOpenQuestion() {
    const body = document.getElementById('modalBody');
    if (!body) return;
    moveQuestionMathIntoExplanation(body);
    redactExactChoiceFromPrompt(body);
  }

  function init() {
    injectStyle();
    redactFormulaTopicTitles();
    protectOpenQuestion();

    const chapters = document.getElementById('chapters');
    if (chapters) {
      new MutationObserver(redactFormulaTopicTitles).observe(chapters, {
        childList: true,
        subtree: true
      });
    }

    const modalBody = document.getElementById('modalBody');
    if (modalBody) {
      new MutationObserver(protectOpenQuestion).observe(modalBody, {
        childList: true,
        subtree: true
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
