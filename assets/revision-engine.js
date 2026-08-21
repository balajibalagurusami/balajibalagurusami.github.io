(() => {
  'use strict';

  const cfg = window.REVISION_CONFIG || {};
  const bank = window.REVISION_BANK || {};
  const course = window[cfg.courseVar] || [];
  const legacy = window[cfg.legacyVar] || {};
  const storageKey = `bits-revision-v2:${cfg.slug || cfg.courseVar || 'course'}`;
  const state = JSON.parse(localStorage.getItem(storageKey) || '{"done":{},"last":""}');

  const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const keyFor = (c,t) => `${c.n}:${t}`;
  const qid = (topicKey, q, i) => `${topicKey}:${q.id || i+1}`;

  function normalizeLegacy(topicKey) {
    const l = legacy[topicKey];
    if (!l || !l.q) return [];
    return [{
      id: 'legacy-1',
      title: l.step || 'Existing lesson check',
      level: l.grounded === false ? 'bridge' : 'foundation',
      kind: 'mcq',
      q: l.q,
      choices: l.o || [],
      answer: l.a,
      explanation: l.e || '',
      source: l.source || 'Existing course lesson'
    }];
  }

  function questionsFor(topicKey) {
    const merged = [...normalizeLegacy(topicKey), ...(bank[topicKey] || [])];
    const seen = new Set();
    return merged.filter(q => {
      const sig = (q.q || q.title || '').trim();
      if (!sig || seen.has(sig)) return false;
      seen.add(sig);
      return true;
    });
  }

  function allRows() {
    return course.flatMap(c => c.topics.flatMap(t => {
      const tk = keyFor(c,t);
      return questionsFor(tk).map((q,i) => ({c,t,tk,q,i,id:qid(tk,q,i)}));
    }));
  }

  function save() {
    localStorage.setItem(storageKey, JSON.stringify(state));
    renderStats();
  }

  function renderStats() {
    const rows = allRows();
    const done = rows.filter(r => state.done[r.id]).length;
    const pct = rows.length ? Math.round(done / rows.length * 100) : 0;
    const qEl = document.getElementById('questionTotal');
    const dEl = document.getElementById('questionDone');
    const pEl = document.getElementById('progressPct');
    const bEl = document.getElementById('progressBar');
    if(qEl) qEl.textContent = rows.length;
    if(dEl) dEl.textContent = done;
    if(pEl) pEl.textContent = pct + '%';
    if(bEl) bEl.style.width = pct + '%';
  }

  function render() {
    const host = document.getElementById('chapters');
    const search = (document.getElementById('search')?.value || '').trim().toLowerCase();
    host.innerHTML = '';

    course.forEach(c => {
      const topicModels = c.topics.map(t => {
        const tk = keyFor(c,t);
        const qs = questionsFor(tk);
        return {t,tk,qs};
      }).filter(m => !search || c.title.toLowerCase().includes(search) || m.t.toLowerCase().includes(search) || m.qs.some(q => `${q.title||''} ${q.q||''}`.toLowerCase().includes(search)));
      if (!topicModels.length) return;

      const totalQs = topicModels.reduce((n,m)=>n+m.qs.length,0);
      const doneQs = topicModels.reduce((n,m)=>n+m.qs.filter((q,i)=>state.done[qid(m.tk,q,i)]).length,0);
      const section = document.createElement('section');
      section.className = 'chapter' + (search ? ' open' : '');
      section.innerHTML = `<button class="chapter-head" type="button"><div><div class="chapter-kicker">${esc(cfg.sectionLabel || 'Chapter')} ${esc(c.n)}</div><h2>${esc(c.title)}</h2><p>${esc(c.sub || '')}</p></div><div class="chapter-count"><b>${doneQs}/${totalQs}</b><span>questions</span></div></button><div class="topic-list"></div>`;
      section.querySelector('.chapter-head').onclick = () => section.classList.toggle('open');
      const list = section.querySelector('.topic-list');

      topicModels.forEach(m => {
        const topic = document.createElement('div');
        topic.className = 'topic';
        const done = m.qs.filter((q,i)=>state.done[qid(m.tk,q,i)]).length;
        topic.innerHTML = `<button class="topic-head" type="button"><div><h3>${esc(m.t)}</h3><p>${m.qs.length ? `${done}/${m.qs.length} question steps completed` : 'Question expansion queued'}</p></div><span class="chev">⌄</span></button><div class="question-list"></div>`;
        topic.querySelector('.topic-head').onclick = () => topic.classList.toggle('open');
        const qList = topic.querySelector('.question-list');

        if (!m.qs.length) {
          qList.innerHTML = `<div class="queued">This topic is tracked in the syllabus. Detailed sequential questions will be inserted here as the bank expands.</div>`;
        } else {
          m.qs.forEach((q,i) => {
            const id = qid(m.tk,q,i);
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'question-item' + (state.done[id] ? ' done' : '');
            item.innerHTML = `<span class="qnum">${state.done[id] ? '✓' : i+1}</span><span class="qtext"><b>${esc(q.title || `Question ${i+1}`)}</b><small>${esc(q.level || 'practice')} · ${esc(q.kind || 'mcq')}</small></span><span class="arrow">›</span>`;
            item.onclick = () => openQuestion(c,m.t,m.tk,q,i);
            qList.appendChild(item);
          });
        }
        list.appendChild(topic);
      });
      host.appendChild(section);
    });
    renderStats();
  }

  function openQuestion(c, topic, topicKey, q, index) {
    const id = qid(topicKey,q,index);
    const modal = document.getElementById('modal');
    const body = document.getElementById('modalBody');
    const choices = (q.choices || []).map((o,i)=>`<button class="choice" data-i="${i}" type="button">${renderRich(o)}</button>`).join('');
    body.innerHTML = `
      <div class="crumb">${esc(cfg.sectionLabel || 'Chapter')} ${esc(c.n)} · ${esc(c.title)}</div>
      <div class="level">${esc(q.level || 'practice')} · ${esc(q.kind || 'mcq')}</div>
      <h2>${esc(topic)}</h2>
      <h3 class="prompt">${renderRich(q.q || q.prompt || '')}</h3>
      ${q.math ? `<div class="mathbox">\\[${q.math}\\]</div>` : ''}
      ${q.image ? `<figure><img class="question-image" src="${esc(q.image)}" alt="${esc(q.imageAlt || 'Question diagram')}">${q.caption ? `<figcaption>${esc(q.caption)}</figcaption>`:''}</figure>` : ''}
      ${q.graph ? renderGraph(q.graph) : ''}
      <div id="choices">${choices}</div>
      <div id="feedback" class="feedback"></div>
      <button id="reveal" class="reveal" type="button">Reveal explanation</button>
      <div id="explanation" class="explanation">${renderRich(q.explanation || '')}${q.derivation ? `<div class="derivation">${renderRich(q.derivation)}</div>`:''}${q.source ? `<div class="source">Source: ${esc(q.source)}</div>`:''}</div>
      <button id="complete" class="complete" type="button">Mark complete & continue</button>`;

    modal.classList.add('show');
    state.last = id;
    save();

    const feedback = body.querySelector('#feedback');
    const reveal = body.querySelector('#reveal');
    const explanation = body.querySelector('#explanation');
    const complete = body.querySelector('#complete');
    reveal.onclick = () => {
      const isOpen = explanation.classList.toggle('show');
      reveal.textContent = isOpen ? 'Hide explanation' : 'Reveal explanation';
      typeset();
    };
    body.querySelectorAll('.choice').forEach(btn => btn.onclick = () => {
      const i = Number(btn.dataset.i);
      if (q.answer === undefined || q.answer === null) return;
      if (i === q.answer) {
        btn.classList.add('good');
        feedback.textContent = 'Correct.';
        body.querySelectorAll('.choice').forEach(x=>x.disabled=true);
        complete.style.display='block';
      } else {
        btn.classList.add('bad');
        btn.disabled=true;
        feedback.textContent = 'Not quite. Try another choice or reveal the explanation.';
      }
      reveal.style.display='block';
    });
    if (!(q.choices || []).length) {
      reveal.style.display='block';
      complete.style.display='block';
    }
    complete.onclick = () => {
      state.done[id] = true;
      save();
      closeModal();
      render();
    };
    typeset();
  }

  function renderRich(text) {
    return esc(text).replace(/\n/g,'<br>');
  }

  function renderGraph(g) {
    const w=520,h=240,p=36;
    const series=g.series||[];
    const pts=series.flatMap(s=>s.points||[]);
    if(!pts.length) return '';
    const xs=pts.map(p=>p[0]), ys=pts.map(p=>p[1]);
    const xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);
    const sx=x=>p+(x-xmin)/(xmax-xmin||1)*(w-2*p);
    const sy=y=>h-p-(y-ymin)/(ymax-ymin||1)*(h-2*p);
    const lines=series.map((s,idx)=>{
      const d=(s.points||[]).map((pt,i)=>`${i?'L':'M'} ${sx(pt[0]).toFixed(1)} ${sy(pt[1]).toFixed(1)}`).join(' ');
      return `<path d="${d}" fill="none" stroke="currentColor" stroke-width="2" opacity="${1-idx*0.2}"/>`;
    }).join('');
    return `<figure class="graph"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(g.alt||'Question graph')}"><line x1="${p}" y1="${h-p}" x2="${w-p}" y2="${h-p}"/><line x1="${p}" y1="${p}" x2="${p}" y2="${h-p}"/>${lines}<text x="${w/2}" y="${h-5}" text-anchor="middle">${esc(g.xLabel||'x')}</text><text x="12" y="${h/2}" transform="rotate(-90 12 ${h/2})" text-anchor="middle">${esc(g.yLabel||'y')}</text></svg>${g.caption?`<figcaption>${esc(g.caption)}</figcaption>`:''}</figure>`;
  }

  function closeModal(){ document.getElementById('modal').classList.remove('show'); }
  function typeset(){ if(window.MathJax?.typesetPromise) window.MathJax.typesetPromise().catch(()=>{}); }

  document.getElementById('closeModal').onclick = closeModal;
  document.getElementById('modal').addEventListener('click', e=>{ if(e.target.id==='modal') closeModal(); });
  document.getElementById('search').addEventListener('input',render);
  document.getElementById('expandAll').onclick=()=>document.querySelectorAll('.chapter,.topic').forEach(x=>x.classList.add('open'));
  document.getElementById('collapseAll').onclick=()=>document.querySelectorAll('.chapter,.topic').forEach(x=>x.classList.remove('open'));
  render();
})();