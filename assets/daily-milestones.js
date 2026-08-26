(() => {
  'use strict';

  const cfg = window.REVISION_CONFIG || {};
  const slug = cfg.slug || 'course';
  const STORE_KEY = 'bits-sem1-daily-v1';
  const COOKIE_NAME = 'bits_sem1_streak_v1';
  const MILESTONE_SIZE = 10;

  function dayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function shiftDay(key, delta) {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + delta);
    return dayKey(date);
  }

  function readCookieSummary() {
    const prefix = `${COOKIE_NAME}=`;
    const raw = document.cookie.split('; ').find(v => v.startsWith(prefix));
    if (!raw) return null;
    try { return JSON.parse(decodeURIComponent(raw.slice(prefix.length))); }
    catch (_) { return null; }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}

    const cookie = readCookieSummary();
    const state = { version: 1, days: {}, longest: 0 };
    if (cookie && cookie.days) {
      Object.entries(cookie.days).forEach(([key, count]) => {
        state.days[key] = {
          count: Number(count) || 0,
          questions: {},
          milestones: Math.floor((Number(count) || 0) / MILESTONE_SIZE),
          qualified: (Number(count) || 0) >= MILESTONE_SIZE
        };
      });
      state.longest = Number(cookie.longest) || 0;
    }
    return state;
  }

  const state = loadState();
  state.version = 1;
  state.days ||= {};

  function normalizeDay(key) {
    const day = state.days[key] ||= { count: 0, questions: {}, milestones: 0, qualified: false };
    day.questions ||= {};
    day.count = Math.max(Number(day.count) || 0, Object.keys(day.questions).length);
    day.milestones = Math.floor(day.count / MILESTONE_SIZE);
    day.qualified = day.count >= MILESTONE_SIZE;
    return day;
  }

  function currentStreak(today = dayKey()) {
    let cursor = normalizeDay(today).qualified ? today : shiftDay(today, -1);
    let streak = 0;
    while (state.days[cursor] && normalizeDay(cursor).qualified) {
      streak += 1;
      cursor = shiftDay(cursor, -1);
    }
    return streak;
  }

  function recomputeLongest() {
    const keys = Object.keys(state.days).sort();
    let longest = Number(state.longest) || 0;
    let run = 0;
    let previous = null;
    keys.forEach(key => {
      if (!normalizeDay(key).qualified) {
        run = 0;
        previous = key;
        return;
      }
      run = previous && shiftDay(previous, 1) === key ? run + 1 : 1;
      longest = Math.max(longest, run);
      previous = key;
    });
    state.longest = longest;
  }

  function pruneDetailedIds(today = dayKey()) {
    const cutoff = shiftDay(today, -45);
    Object.keys(state.days).forEach(key => {
      if (key < cutoff && state.days[key]?.questions) delete state.days[key].questions;
    });
  }

  function writeCookieSummary() {
    const recent = Object.keys(state.days).sort().slice(-60);
    const summary = { days: {}, longest: Number(state.longest) || 0 };
    recent.forEach(key => { summary.days[key] = normalizeDay(key).count; });
    try {
      document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(summary))}; Max-Age=31536000; Path=/; SameSite=Lax`;
    } catch (_) {}
  }

  function save() {
    pruneDetailedIds();
    recomputeLongest();
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) {}
    writeCookieSummary();
  }

  function currentQuestionKey() {
    try {
      const courseState = JSON.parse(localStorage.getItem(`bits-revision-v2:${slug}`) || '{}');
      return courseState.last ? `${slug}|${courseState.last}` : '';
    } catch (_) { return ''; }
  }

  function injectStyles() {
    if (document.getElementById('dailyMilestoneStyles')) return;
    const style = document.createElement('style');
    style.id = 'dailyMilestoneStyles';
    style.textContent = `
      .daily-study{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}
      .daily-card{border:1px solid #333;background:#000;color:#fff;border-radius:14px;padding:10px;min-width:0}
      .daily-card b{display:block;color:#fff;font-size:19px;line-height:1.15}
      .daily-card span{display:block;color:#fff;font-size:11px;line-height:1.3;margin-top:3px}
      .daily-card.secured{border-color:#fff}
      .daily-toast{position:fixed;left:50%;bottom:92px;transform:translateX(-50%) translateY(16px);width:min(420px,calc(100% - 28px));background:#fff;color:#000;border:2px solid #fff;border-radius:16px;padding:13px 15px;font-weight:900;text-align:center;opacity:0;pointer-events:none;transition:.22s ease;z-index:100}
      .daily-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
      @media(max-width:640px){.daily-study{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensurePanel() {
    injectStyles();
    let panel = document.getElementById('dailyStudy');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'dailyStudy';
    panel.className = 'daily-study';
    const hero = document.querySelector('.hero');
    const bar = hero?.querySelector('.bar');
    if (bar) bar.insertAdjacentElement('afterend', panel);
    else hero?.appendChild(panel);
    return panel;
  }

  function render() {
    const today = dayKey();
    const day = normalizeDay(today);
    const streak = currentStreak(today);
    const nextIn = MILESTONE_SIZE - (day.count % MILESTONE_SIZE || 0);
    const toNext = day.count > 0 && day.count % MILESTONE_SIZE === 0 ? MILESTONE_SIZE : nextIn;
    const toSecure = Math.max(0, MILESTONE_SIZE - day.count);
    const panel = ensurePanel();
    if (!panel) return;
    panel.innerHTML = `
      <div class="daily-card"><b>${day.count}</b><span>questions attempted today</span></div>
      <div class="daily-card"><b>${day.milestones}</b><span>10-question milestones today</span></div>
      <div class="daily-card ${day.qualified ? 'secured' : ''}"><b>🔥 ${streak}</b><span>${day.qualified ? 'day streak · secured today' : streak ? `${toSecure} more to secure today` : `${toSecure} more to start today’s streak`}</span></div>
      <div class="daily-card"><b>${toNext}</b><span>questions to next milestone · best streak ${state.longest || streak}</span></div>`;
  }

  let toastTimer;
  function toast(message) {
    let el = document.getElementById('dailyToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'dailyToast';
      el.className = 'daily-toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function recordAttempt() {
    const questionKey = currentQuestionKey();
    if (!questionKey) return;
    const today = dayKey();
    const day = normalizeDay(today);
    if (day.questions[questionKey]) {
      render();
      return;
    }

    const beforeCount = day.count;
    const beforeQualified = day.qualified;
    day.questions[questionKey] = true;
    day.count += 1;
    day.milestones = Math.floor(day.count / MILESTONE_SIZE);
    day.qualified = day.count >= MILESTONE_SIZE;
    save();
    render();

    const crossedMilestone = Math.floor(day.count / MILESTONE_SIZE) > Math.floor(beforeCount / MILESTONE_SIZE);
    if (!beforeQualified && day.qualified) {
      toast(`🔥 Daily streak secured — ${day.count} questions attempted`);
    } else if (crossedMilestone) {
      toast(`🏁 Milestone ${day.milestones} reached — ${day.count} questions today`);
    }
  }

  document.addEventListener('click', event => {
    const target = event.target.closest('.choice, #complete');
    if (!target) return;
    recordAttempt();
  }, true);

  window.addEventListener('storage', event => {
    if (event.key === STORE_KEY) location.reload();
  });

  save();
  render();
})();
