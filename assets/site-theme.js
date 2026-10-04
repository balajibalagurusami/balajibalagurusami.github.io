(()=>{
  const KEY='wilp-site-theme-v1';
  const THEMES=['dark','light','sepia'];
  const LABELS={dark:'🌙 Dark',light:'☀️ Light',sepia:'📖 Sepia'};
  const META={dark:'#000000',light:'#f5f6f8',sepia:'#f4ecd8'};

  const css=`
:root[data-site-theme="dark"]{--site-bg:#000000;--site-surface:#080808;--site-surface-2:#121212;--site-ink:#ffffff;--site-muted:#b8b8b8;--site-line:#333333;--site-accent:#8ab4ff;--site-shadow:rgba(0,0,0,.35);color-scheme:dark}
:root[data-site-theme="light"]{--site-bg:#f5f6f8;--site-surface:#ffffff;--site-surface-2:#eef1f4;--site-ink:#15171a;--site-muted:#5f6368;--site-line:#d6d9de;--site-accent:#0b57d0;--site-shadow:rgba(20,24,30,.10);color-scheme:light}
:root[data-site-theme="sepia"]{--site-bg:#f4ecd8;--site-surface:#fbf4e3;--site-surface-2:#eee2c5;--site-ink:#3b3024;--site-muted:#706252;--site-line:#d5c5a3;--site-accent:#6b4f2a;--site-shadow:rgba(77,56,32,.12);color-scheme:light}

html[data-site-theme] body{background:var(--site-bg)!important;color:var(--site-ink)!important;transition:background-color .18s ease,color .18s ease}
html[data-site-theme] a{color:var(--site-accent)}
html[data-site-theme] :where(.muted,.hint,.source,.privacy,footer,.count,.status:not(.ok):not(.error)){color:var(--site-muted)!important}
html[data-site-theme] :where(input,select,textarea){background:var(--site-surface)!important;color:var(--site-ink)!important;border-color:var(--site-line)!important}
html[data-site-theme] :where(input,textarea)::placeholder{color:var(--site-muted)!important;opacity:.85}

html[data-site-theme="light"] :where(.hero,.info,.note,.quiz,.quick-link,.card,.chapter,.chapter-head,.topic-list,.topic,.topic-head,.question-list,.question-item,.qnum,.queued,.sheet,.modalbar,.close,.level,.mathbox,.choice,.reveal,.explanation,.metric,.face,.backface,.chip,.control,.footer-note,.empty,.units,.table-panel,.table-head,.table-tools,.missing-panel,.missing-person,.question-text,.equation,.check),
html[data-site-theme="sepia"] :where(.hero,.info,.note,.quiz,.quick-link,.card,.chapter,.chapter-head,.topic-list,.topic,.topic-head,.question-list,.question-item,.qnum,.queued,.sheet,.modalbar,.close,.level,.mathbox,.choice,.reveal,.explanation,.metric,.face,.backface,.chip,.control,.footer-note,.empty,.units,.table-panel,.table-head,.table-tools,.missing-panel,.missing-person,.question-text,.equation,.check){
  background:var(--site-surface)!important;color:var(--site-ink)!important;border-color:var(--site-line)!important;box-shadow:none
}
html[data-site-theme="light"] :where(.hero p,.hero h1,.hero h2,.hero h3,.card p,.card li,.chapter p,.chapter h2,.chapter h3,.topic p,.topic h3,.question-item,.qtext b,.qtext small,.metric b,.metric span,.face,.formula,.meaning,.units,.sheet h2,.prompt,.crumb,.source,.feedback,.derivation,.modalbar,.top>*),
html[data-site-theme="sepia"] :where(.hero p,.hero h1,.hero h2,.hero h3,.card p,.card li,.chapter p,.chapter h2,.chapter h3,.topic p,.topic h3,.question-item,.qtext b,.qtext small,.metric b,.metric span,.face,.formula,.meaning,.units,.sheet h2,.prompt,.crumb,.source,.feedback,.derivation,.modalbar,.top>*){
  color:var(--site-ink)!important
}
html[data-site-theme="light"] :where(.wrap,.topic-list,.question-list),
html[data-site-theme="sepia"] :where(.wrap,.topic-list,.question-list){background:transparent!important}
html[data-site-theme="light"] :where(.bar),
html[data-site-theme="sepia"] :where(.bar){background:var(--site-surface-2)!important;border-color:var(--site-line)!important}
html[data-site-theme="light"] :where(.bar i),
html[data-site-theme="sepia"] :where(.bar i){background:var(--site-ink)!important}
html[data-site-theme="light"] :where(.modal),
html[data-site-theme="sepia"] :where(.modal){background:#0007!important}
html[data-site-theme] :where(.graph svg){background:var(--site-surface)!important;border-color:var(--site-line)!important}
html[data-site-theme="light"] .graph text,html[data-site-theme="sepia"] .graph text{fill:var(--site-ink)!important}
html[data-site-theme="light"] .graph line,html[data-site-theme="sepia"] .graph line{stroke:var(--site-muted)!important}

.site-theme-shuffle{
  position:fixed;top:max(10px,env(safe-area-inset-top));right:10px;z-index:2147483000;
  min-width:92px;height:40px;padding:0 12px;border-radius:999px;
  border:1px solid var(--site-line)!important;background:color-mix(in srgb,var(--site-surface) 94%,transparent)!important;
  color:var(--site-ink)!important;font:700 13px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  box-shadow:0 6px 22px var(--site-shadow);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  cursor:pointer;touch-action:manipulation
}
.site-theme-shuffle:hover,.site-theme-shuffle:focus-visible{outline:2px solid var(--site-accent);outline-offset:2px}
@media(max-width:560px){.site-theme-shuffle{top:max(7px,env(safe-area-inset-top));right:7px;min-width:84px;height:38px;padding:0 10px;font-size:12px}}
@media(prefers-reduced-motion:reduce){html[data-site-theme] body{transition:none}}
`;

  const style=document.createElement('style');
  style.id='site-theme-styles';
  style.textContent=css;
  (document.head||document.documentElement).appendChild(style);

  function read(){
    try{const v=localStorage.getItem(KEY);return THEMES.includes(v)?v:'dark'}catch(_){return 'dark'}
  }
  function apply(theme,persist=true){
    if(!THEMES.includes(theme)) theme='dark';
    document.documentElement.setAttribute('data-site-theme',theme);
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute('content',META[theme]);
    if(persist){try{localStorage.setItem(KEY,theme)}catch(_){}}
    const b=document.getElementById('siteThemeShuffle');
    if(b){
      const next=THEMES[(THEMES.indexOf(theme)+1)%THEMES.length];
      b.textContent=LABELS[theme];
      b.setAttribute('aria-label',`Theme: ${theme}. Switch to ${next}.`);
      b.title=`Theme: ${theme}. Tap for ${next}.`;
    }
  }
  function next(){
    const current=document.documentElement.getAttribute('data-site-theme')||read();
    apply(THEMES[(THEMES.indexOf(current)+1)%THEMES.length]);
  }
  function mount(){
    document.querySelectorAll('#themeToggle,.theme-toggle').forEach(el=>{if(el.id!=='siteThemeShuffle')el.hidden=true});
    if(document.getElementById('siteThemeShuffle')) return;
    const b=document.createElement('button');
    b.id='siteThemeShuffle';
    b.className='site-theme-shuffle';
    b.type='button';
    b.addEventListener('click',next);
    document.body.appendChild(b);
    apply(document.documentElement.getAttribute('data-site-theme')||read(),false);
  }

  apply(read(),false);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount,{once:true}); else mount();
  window.WILPTheme={apply,next,get:()=>document.documentElement.getAttribute('data-site-theme')||read()};
})();