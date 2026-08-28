(() => {
  'use strict';

  const API = 'https://wilptest.aecbim.work';
  const CLIENT_ID = '810186188567-7a1mrhng391pmdjjtuemjefekoi9cg48.apps.googleusercontent.com';
  const LIVE_ORIGIN = 'https://wilp.aecbim.work';
  const COURSE_KEYS = [
    'bits-revision-v2:asms',
    'bits-revision-v2:dynamics',
    'bits-revision-v2:fea',
    'bits-revision-v2:steel'
  ];
  const DAILY_KEY = 'bits-sem1-daily-v1';
  const KEYS = [...COURSE_KEYS, DAILY_KEY];
  const ACTIVE = location.origin === LIVE_ORIGIN;

  let authenticated = false;
  let syncing = false;
  let syncTimer = null;

  const parse = raw => {
    try { return raw ? JSON.parse(raw) : {}; }
    catch (_) { return {}; }
  };

  function collect() {
    const bundle = {};
    KEYS.forEach(key => {
      const raw = localStorage.getItem(key);
      if (raw) bundle[key] = parse(raw);
    });
    return bundle;
  }

  function mergeCourse(remote = {}, local = {}) {
    const done = {...(remote.done || {})};
    Object.entries(local.done || {}).forEach(([id, value]) => {
      if (value) done[id] = true;
    });
    return {...remote, ...local, done, last: local.last || remote.last || ''};
  }

  function mergeDay(remote = {}, local = {}) {
    const questions = {...(remote.questions || {})};
    Object.entries(local.questions || {}).forEach(([id, value]) => {
      if (value) questions[id] = true;
    });
    const count = Math.max(
      Number(remote.count) || 0,
      Number(local.count) || 0,
      Object.keys(questions).length
    );
    return {
      ...remote,
      ...local,
      questions,
      count,
      milestones: Math.floor(count / 10),
      qualified: count >= 10
    };
  }

  function mergeDaily(remote = {}, local = {}) {
    const days = {};
    const all = new Set([
      ...Object.keys(remote.days || {}),
      ...Object.keys(local.days || {})
    ]);
    all.forEach(day => {
      days[day] = mergeDay(remote.days?.[day], local.days?.[day]);
    });
    return {
      ...remote,
      ...local,
      version: Math.max(Number(remote.version) || 1, Number(local.version) || 1),
      days,
      longest: Math.max(Number(remote.longest) || 0, Number(local.longest) || 0)
    };
  }

  function mergeBundles(remote = {}, local = {}) {
    const merged = {};
    COURSE_KEYS.forEach(key => {
      if (remote[key] || local[key]) merged[key] = mergeCourse(remote[key], local[key]);
    });
    if (remote[DAILY_KEY] || local[DAILY_KEY]) {
      merged[DAILY_KEY] = mergeDaily(remote[DAILY_KEY], local[DAILY_KEY]);
    }
    return merged;
  }

  function apply(bundle) {
    let changed = false;
    Object.entries(bundle || {}).forEach(([key, value]) => {
      if (!KEYS.includes(key)) return;
      const next = JSON.stringify(value);
      if (localStorage.getItem(key) !== next) {
        localStorage.setItem(key, next);
        changed = true;
      }
    });
    return changed;
  }

  function injectStyles() {
    if (document.getElementById('bitsCloudStyles')) return;
    const style = document.createElement('style');
    style.id = 'bitsCloudStyles';
    style.textContent = `
      .bits-cloud{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px 0;padding:12px 14px;border:1px solid #333;border-radius:14px;background:#000;color:#fff}
      .bits-cloud strong,.bits-cloud small{display:block;color:#fff}
      .bits-cloud small{margin-top:3px;opacity:.82}
      .bits-cloud button{border:1px solid #555;border-radius:10px;padding:9px 12px;background:#000;color:#fff;font-weight:800;cursor:pointer}
      .bits-cloud .ok{border-color:#2f9e44}
      .bits-cloud .google-host{min-height:40px}
      @media(max-width:640px){.bits-cloud{align-items:flex-start;flex-direction:column}.bits-cloud button,.bits-cloud .google-host{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function ensurePanel() {
    injectStyles();
    let panel = document.getElementById('bitsCloud');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'bitsCloud';
    panel.className = 'bits-cloud';
    const hero = document.querySelector('.hero');
    if (hero) hero.insertAdjacentElement('afterend', panel);
    else document.body.prepend(panel);
    return panel;
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, c => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    })[c]);
  }

  function renderLocalOnly() {
    ensurePanel().innerHTML = '<div><strong>Progress saved locally</strong><small>Cloud sync is available on wilp.aecbim.work.</small></div>';
  }

  function renderChecking() {
    ensurePanel().innerHTML = '<div><strong>Cloud progress</strong><small>Checking Google sign-in…</small></div>';
  }

  function renderSigned(user, detail = 'Synced across devices') {
    const panel = ensurePanel();
    panel.innerHTML = `
      <div>
        <strong>☁️ Progress sync on</strong>
        <small>${escapeHtml(user?.email || '')} · ${escapeHtml(detail)}</small>
      </div>
      <button id="bitsLogout" class="ok">Sign out</button>`;
    panel.querySelector('#bitsLogout')?.addEventListener('click', logout);
  }

  function renderUnsigned(message = 'Sign in with any Google account to sync progress across devices.') {
    const panel = ensurePanel();
    panel.innerHTML = `
      <div>
        <strong>Progress saved locally</strong>
        <small>${escapeHtml(message)}</small>
      </div>
      <div id="bitsGoogleButton" class="google-host"></div>`;
    loadGoogleButton();
  }

  async function api(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      credentials: 'include',
      cache: 'no-store',
      ...options,
      headers: {Accept:'application/json', ...(options.headers || {})}
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || `HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function apiSimplePost(path, payload) {
    return api(path, {
      method: 'POST',
      headers: {'Content-Type':'text/plain;charset=UTF-8'},
      body: JSON.stringify(payload || {})
    });
  }

  async function syncNow({allowReload = true} = {}) {
    if (!ACTIVE || !authenticated || syncing) return;
    syncing = true;
    try {
      const remote = await api('/api/progress');
      const merged = mergeBundles(remote.bundle || {}, collect());
      const saved = await apiSimplePost('/api/progress', {bundle: merged});
      const changed = apply(saved.bundle || merged);
      renderSigned(window.BITS_CLOUD_USER, `synced · revision ${saved.revision || 0}`);
      if (changed && allowReload && !sessionStorage.getItem('bits-cloud-reloaded')) {
        sessionStorage.setItem('bits-cloud-reloaded', '1');
        location.reload();
      }
    } catch (error) {
      console.error('Cloud sync failed:', error);
      renderSigned(window.BITS_CLOUD_USER, 'local changes queued');
    } finally {
      syncing = false;
    }
  }

  function scheduleSync() {
    if (!authenticated) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncNow({allowReload:false}), 900);
  }

  function loadGoogleButton() {
    if (!ACTIVE) return;
    const render = () => {
      const host = document.getElementById('bitsGoogleButton');
      if (!host || !window.google?.accounts?.id) return;
      google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleGoogleCredential
      });
      google.accounts.id.renderButton(host, {
        theme: 'filled_black',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular'
      });
    };
    if (window.google?.accounts?.id) {
      render();
      return;
    }
    let script = document.getElementById('googleIdentityScript');
    if (!script) {
      script = document.createElement('script');
      script.id = 'googleIdentityScript';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', render, {once:true});
  }

  async function handleGoogleCredential(response) {
    const panel = ensurePanel();
    panel.innerHTML = '<div><strong>Signing in…</strong><small>Verifying your Google account.</small></div>';
    try {
      const result = await apiSimplePost('/api/auth/google', {credential:response.credential});
      authenticated = !!result.authenticated;
      window.BITS_CLOUD_USER = result.user || {};
      renderSigned(window.BITS_CLOUD_USER, 'merging this device');
      await syncNow();
    } catch (error) {
      authenticated = false;
      renderUnsigned(`Sign-in failed: ${error.message}`);
    }
  }

  async function logout() {
    try { await api('/api/logout', {method:'POST'}); }
    catch (_) {}
    authenticated = false;
    window.BITS_CLOUD_USER = null;
    renderUnsigned();
  }

  async function init() {
    if (!ACTIVE) {
      renderLocalOnly();
      return;
    }
    renderChecking();
    try {
      const me = await api('/api/me');
      authenticated = !!me.authenticated;
      window.BITS_CLOUD_USER = me.user || {};
      if (!authenticated) {
        renderUnsigned();
        return;
      }
      renderSigned(window.BITS_CLOUD_USER, 'merging this device');
      await syncNow();
    } catch (error) {
      if (error.status === 401 || error.status === 403) renderUnsigned();
      else renderUnsigned('Cloud sync is temporarily unavailable; local progress is safe.');
    }
  }

  document.addEventListener('click', event => {
    if (event.target.closest('.choice, #complete')) setTimeout(scheduleSync, 50);
  }, true);
  window.addEventListener('storage', scheduleSync);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') scheduleSync();
  });

  window.BITS_CLOUD_SYNC = {syncNow, scheduleSync, collect};

  if (ACTIVE && (location.pathname === '/' || location.pathname.endsWith('/index.html'))) {
    const leaderboardScript = document.createElement('script');
    leaderboardScript.src = '/assets/leaderboard.js?v=20260827-daily';
    leaderboardScript.defer = true;
    document.body.appendChild(leaderboardScript);
  }

  init();
})();
