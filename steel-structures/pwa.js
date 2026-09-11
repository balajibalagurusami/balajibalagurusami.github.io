(() => {
  'use strict';
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js', {scope:'/'}).catch(()=>{}));
  }

  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (standalone) document.documentElement.classList.add('pwa-standalone');

  let deferredPrompt = null;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  function addButton(label, handler) {
    if (standalone || document.getElementById('installSteelApp')) return;
    const top = document.querySelector('.top');
    if (!top) return;
    const btn = document.createElement('button');
    btn.id = 'installSteelApp';
    btn.type = 'button';
    btn.textContent = label;
    btn.style.cssText = 'border:1px solid #555;background:#111;color:#fff;border-radius:999px;padding:8px 12px;font:inherit;font-weight:700;white-space:nowrap';
    btn.addEventListener('click', handler);
    top.appendChild(btn);
  }

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    addButton('Install WILP app', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      try { await deferredPrompt.userChoice; } catch (_) {}
      deferredPrompt = null;
      document.getElementById('installSteelApp')?.remove();
    });
  });

  window.addEventListener('appinstalled', () => document.getElementById('installSteelApp')?.remove());

  window.addEventListener('DOMContentLoaded', () => {
    if (isIOS && !standalone) {
      addButton('Add WILP to Home', () => alert('On iPhone/iPad: tap Share, then “Add to Home Screen”.'));
    }
  });
})();
