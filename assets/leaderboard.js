(() => {
  "use strict";

  const API = "https://wilptest.aecbim.work";
  const SUBJECTS = [
    ["asms", "ASMS"],
    ["dynamics", "Dynamics"],
    ["fea", "FEA"],
    ["steel", "Steel"]
  ];

  let mode = "overall";
  let subject = localStorage.getItem("bits-leaderboard-subject") || "asms";
  if (!SUBJECTS.some(([key]) => key === subject)) subject = "asms";
  let loading = false;
  let refreshTimer = null;

  function dayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function prettyDay(date = new Date()) {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short"
    }).format(date);
  }

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, ch => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[ch]);
  }

  function injectStyles() {
    if (document.getElementById("bitsLeaderboardStyles")) return;
    const style = document.createElement("style");
    style.id = "bitsLeaderboardStyles";
    style.textContent = `
      .bits-leaderboard{margin-top:14px;border:1px solid #333;border-radius:20px;background:#000;color:#fff;padding:18px}
      .bits-lb-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
      .bits-lb-head h2{margin:0;font-size:21px;color:#fff}.bits-lb-head p{margin:5px 0 0;font-size:12px;line-height:1.4;color:#fff;opacity:.78}
      .bits-lb-toggle{display:grid;grid-template-columns:1fr 1fr;gap:3px;padding:3px;border:1px solid #444;border-radius:999px;background:#111;min-width:250px}
      .bits-lb-toggle button{appearance:none;border:0;border-radius:999px;background:transparent;color:#fff;padding:9px 14px;font-weight:850;cursor:pointer;white-space:nowrap}
      .bits-lb-toggle button.active{background:#fff;color:#000}
      .bits-lb-subjects{display:flex;gap:7px;flex-wrap:wrap;margin-top:14px}.bits-lb-subjects[hidden]{display:none}
      .bits-lb-subjects button{appearance:none;border:1px solid #444;border-radius:999px;background:#000;color:#fff;padding:7px 11px;font-weight:800;cursor:pointer}
      .bits-lb-subjects button.active{border-color:#fff;background:#fff;color:#000}
      .bits-lb-body{margin-top:14px;border-top:1px solid #282828}
      .bits-lb-row{display:grid;grid-template-columns:48px minmax(0,1fr) 92px;gap:10px;align-items:center;padding:12px 4px;border-bottom:1px solid #222}
      .bits-lb-row.me{background:#0b0b0b;border-radius:12px;padding-left:10px;padding-right:10px;border:1px solid #444;margin:7px 0}
      .bits-lb-rank{font-size:17px;font-weight:900;text-align:center}.bits-lb-name{min-width:0}.bits-lb-name b{display:block;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bits-lb-name span{display:block;margin-top:2px;font-size:11px;opacity:.7}
      .bits-lb-score{text-align:right}.bits-lb-score b{display:block;font-size:19px;color:#fff}.bits-lb-score span{display:block;font-size:10px;opacity:.7}
      .bits-lb-empty{padding:20px 4px 4px;text-align:center;color:#fff;opacity:.78;line-height:1.5}
      @media(max-width:680px){.bits-lb-head{flex-direction:column}.bits-lb-toggle{width:100%;min-width:0}.bits-lb-row{grid-template-columns:42px minmax(0,1fr) 78px}.bits-leaderboard{padding:15px}}
    `;
    document.head.appendChild(style);
  }

  function ensurePanel() {
    injectStyles();
    let panel = document.getElementById("bitsLeaderboard");
    if (panel) return panel;

    panel = document.createElement("section");
    panel.id = "bitsLeaderboard";
    panel.className = "bits-leaderboard";

    const cloud = document.getElementById("bitsCloud");
    const hero = document.querySelector(".hero");
    if (cloud) cloud.insertAdjacentElement("afterend", panel);
    else if (hero) hero.insertAdjacentElement("afterend", panel);
    else document.body.prepend(panel);

    panel.addEventListener("click", event => {
      const modeButton = event.target.closest("[data-lb-mode]");
      if (modeButton) {
        mode = modeButton.dataset.lbMode;
        renderShell();
        load();
        return;
      }

      const subjectButton = event.target.closest("[data-lb-subject]");
      if (subjectButton) {
        subject = subjectButton.dataset.lbSubject;
        localStorage.setItem("bits-leaderboard-subject", subject);
        renderShell();
        load();
      }
    });

    renderShell();
    return panel;
  }

  function renderShell() {
    const panel = document.getElementById("bitsLeaderboard") || ensurePanel();
    panel.innerHTML = `
      <div class="bits-lb-head">
        <div>
          <h2>🏆 Today’s leaderboard</h2>
          <p>${escapeHtml(prettyDay())} · unique questions attempted today</p>
        </div>
        <div class="bits-lb-toggle" role="tablist" aria-label="Leaderboard view">
          <button type="button" data-lb-mode="overall" class="${mode === "overall" ? "active" : ""}">Overall</button>
          <button type="button" data-lb-mode="subject" class="${mode === "subject" ? "active" : ""}">Subject-wise</button>
        </div>
      </div>
      <div class="bits-lb-subjects" ${mode === "subject" ? "" : "hidden"}>
        ${SUBJECTS.map(([key, label]) => `<button type="button" data-lb-subject="${key}" class="${subject === key ? "active" : ""}">${label}</button>`).join("")}
      </div>
      <div id="bitsLeaderboardBody" class="bits-lb-body">
        <div class="bits-lb-empty">Loading leaderboard…</div>
      </div>
    `;
  }

  function rankLabel(rank) {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  }

  function renderEntries(entries) {
    const body = document.getElementById("bitsLeaderboardBody");
    if (!body) return;

    if (!entries.length) {
      body.innerHTML = '<div class="bits-lb-empty">No attempts recorded yet today. Be the first on the board.</div>';
      return;
    }

    body.innerHTML = entries.map(entry => `
      <div class="bits-lb-row ${entry.me ? "me" : ""}">
        <div class="bits-lb-rank">${rankLabel(Number(entry.rank) || 0)}</div>
        <div class="bits-lb-name">
          <b>${escapeHtml(entry.name || "Student")}</b>
          <span>${entry.me ? "You" : "BITS WILP"}</span>
        </div>
        <div class="bits-lb-score">
          <b>${Number(entry.attempts) || 0}</b>
          <span>questions</span>
        </div>
      </div>
    `).join("");
  }

  async function load() {
    if (loading) return;
    loading = true;

    const body = document.getElementById("bitsLeaderboardBody");
    if (body) body.innerHTML = '<div class="bits-lb-empty">Loading leaderboard…</div>';

    const scope = mode === "overall" ? "overall" : subject;

    try {
      const response = await fetch(
        `${API}/api/leaderboard?day=${encodeURIComponent(dayKey())}&subject=${encodeURIComponent(scope)}`,
        {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" }
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        if (body) body.innerHTML = '<div class="bits-lb-empty">Sign in with your BITS account above to view today’s leaderboard.</div>';
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      renderEntries(Array.isArray(data.entries) ? data.entries : []);
    } catch (error) {
      if (body) body.innerHTML = `<div class="bits-lb-empty">Leaderboard temporarily unavailable.<br><small>${escapeHtml(error.message)}</small></div>`;
    } finally {
      loading = false;
    }
  }

  function scheduleLoad(delay = 250) {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(load, delay);
  }

  function watchCloudPanel() {
    const cloud = document.getElementById("bitsCloud");
    if (!cloud) {
      setTimeout(watchCloudPanel, 300);
      return;
    }

    new MutationObserver(() => scheduleLoad(350))
      .observe(cloud, {
        childList: true,
        subtree: true,
        characterData: true
      });
  }

  ensurePanel();
  load();
  watchCloudPanel();

  setInterval(() => {
    if (document.visibilityState === "visible") load();
  }, 45000);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") scheduleLoad(100);
  });
})();
