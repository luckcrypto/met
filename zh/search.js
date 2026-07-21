(function(){
  "use strict";
  // Bail if index missing
  if(!window.SEARCH_INDEX || !Array.isArray(window.SEARCH_INDEX)) return;
  var INDEX = window.SEARCH_INDEX;

  // ---- escape for XSS-safe innerHTML ----
  function esc(s){ return String(s).replace(/[&<>"']/g, function(ch){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]; }); }

  // ---- tiered scoring ----
  function score(item, query){
    var t = item.t.toLowerCase();
    var q = query;
    var w = item.w||0;
    if(t===q) return 100+w;
    if(t.indexOf(q)===0) return 80+w;
    if(t.indexOf(q)>-1) return 60+w;
    if((item.q||'').indexOf(q)>-1) return 40+w;
    // multi-word: every word appears somewhere
    var words = q.split(/\s+/).filter(Boolean);
    if(words.length>1){
      var hay = t+' '+(item.q||'');
      if(words.every(function(word){return hay.indexOf(word)>-1;})) return 30;
    }
    return 0;
  }
  function search(query){
    query = (query||'').trim().toLowerCase();
    if(!query) return [];
    var scored = INDEX.map(function(it){ return {it:it, s:score(it, query)}; })
      .filter(function(x){ return x.s>0; })
      .sort(function(a,b){ return b.s-a.s || a.it.t.length-b.it.t.length; });
    return scored.slice(0,8).map(function(x){ return x.it; });
  }

  // ---- build overlay DOM ----
  var overlay, input, list, active=-1, results=[];
  function build(){
    overlay = document.createElement('div');
    overlay.className = 'msearch';
    overlay.id = 'msearch';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','搜索 Met Road');
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="msearch-scrim" data-close="1"></div>'+
      '<div class="msearch-card" role="document">'+
        '<div class="msearch-head">'+
          '<svg class="msearch-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'+
          '<input type="text" class="msearch-input" id="msearchInput" placeholder="搜索城市、线路、国家…" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Search" aria-controls="msearchList" role="combobox" aria-expanded="true">'+
          '<button type="button" class="msearch-esc" data-close="1" aria-label="Close search">Esc</button>'+
        '</div>'+
        '<ul class="msearch-list" id="msearchList" role="listbox" aria-label="Search results" aria-live="polite"></ul>'+
        '<div class="msearch-foot"><span><kbd>/</kbd> 搜索 &middot; <kbd>Esc</kbd> 关闭 &middot; <kbd>&uarr;</kbd><kbd>&darr;</kbd> 导航 &middot; <kbd>&crarr;</kbd> 打开</span></div>'+
      '</div>';
    document.body.appendChild(overlay);
    input = overlay.querySelector('#msearchInput');
    list = overlay.querySelector('#msearchList');

    overlay.addEventListener('click', function(e){ if(e.target.getAttribute('data-close')) close(); });
    input.addEventListener('input', function(){ render(input.value); });
    input.addEventListener('keydown', onKey);
    list.addEventListener('mousemove', function(e){
      var li = e.target.closest('.msearch-item'); if(!li) return;
      var i = parseInt(li.dataset.i,10); if(i!==active){ setActive(i); }
    });
  }

  function render(query){
    results = search(query);
    active = results.length ? 0 : -1;
    if(!query.trim()){
      list.innerHTML = '<li class="msearch-hint-row" role="presentation">开始输入城市、线路或国家…</li>';
      return;
    }
    if(!results.length){
      list.innerHTML = '<li class="msearch-empty" role="presentation">Nothing matches \u201c'+esc(query)+'\u201d</li>';
      return;
    }
    list.innerHTML = results.map(function(it,i){
      return '<li class="msearch-item'+(i===active?' active':'')+'" role="option" aria-selected="'+(i===active?'true':'false')+'" data-i="'+i+'">'+
        '<a href="'+esc(it.u)+'" class="msearch-link" tabindex="-1">'+
          '<span class="msearch-pill">'+esc(it.k)+'</span>'+
          '<span class="msearch-body"><span class="msearch-title">'+esc(it.t)+'</span><span class="msearch-desc">'+esc(it.d)+'</span></span>'+
        '</a></li>';
    }).join('');
  }

  function setActive(n){
    var items = list.querySelectorAll('.msearch-item');
    if(!items.length) return;
    active = (n+items.length)%items.length;
    items.forEach(function(el,i){
      var on = i===active;
      el.classList.toggle('active', on);
      el.setAttribute('aria-selected', on?'true':'false');
      if(on){ el.id = el.id || ('msres-'+i); var inp=document.getElementById('msearchInput'); if(inp) inp.setAttribute('aria-activedescendant', el.id); }
    });
    items[active].scrollIntoView({block:'nearest'});
  }

  function onKey(e){
    if(e.key==='ArrowDown'){ e.preventDefault(); setActive(active+1); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); setActive(active-1); }
    else if(e.key==='Enter'){
      e.preventDefault();
      var items = list.querySelectorAll('.msearch-item');
      if(active>-1 && items[active]){ window.location.href = items[active].querySelector('a').getAttribute('href'); }
    }
    else if(e.key==='Escape'){ close(); }
  }

  var scrollY=0;
  function open(prefill){
    if(!overlay) build();
    overlay.hidden = false;
    document.documentElement.classList.add('msearch-open');
    scrollY = window.scrollY;
    document.body.style.position='fixed';
    document.body.style.top = (-scrollY)+'px';
    document.body.style.width='100%';
    input.value = prefill||'';
    render(input.value);
    requestAnimationFrame(function(){ input.focus(); });
  }
  function close(){
    if(!overlay||overlay.hidden) return;
    overlay.hidden = true;
    document.documentElement.classList.remove('msearch-open');
    document.body.style.position='';
    document.body.style.top='';
    document.body.style.width='';
    window.scrollTo(0, scrollY);
  }

  // ---- global triggers ----
  document.addEventListener('keydown', function(e){
    var tag = (e.target.tagName||'').toLowerCase();
    var typing = tag==='input'||tag==='textarea'||tag==='select'||e.target.isContentEditable;
    if((e.key==='k'||e.key==='K') && (e.metaKey||e.ctrlKey)){ e.preventDefault(); open(); return; }
    if(e.key==='/' && !typing){ e.preventDefault(); open(); return; }
  });

  // nav buttons / any element with data-search-open
  document.addEventListener('click', function(e){
    var trigger = e.target.closest('[data-search-open]');
    if(trigger){ e.preventDefault(); open(); }
  });

  // ---- /?q=term auto-open (pairs with SearchAction) ----
  function checkQueryParam(){
    var m = location.search.match(/[?&]q=([^&]+)/);
    if(m){ try{ open(decodeURIComponent(m[1].replace(/\+/g,' '))); }catch(_){ open(); } }
  }

  // expose for hero search box
  // expose the ranked query so other UI (hero dropdown) reuses this exact engine
  function query(q, limit){
    q = String(q||'').trim().toLowerCase();
    if(q.length < 1) return [];
    var out = [];
    for(var i=0;i<INDEX.length;i++){
      var sc = score(INDEX[i], q);
      if(sc>0) out.push({item:INDEX[i], score:sc});
    }
    out.sort(function(a,b){ return b.score-a.score; });
    return out.slice(0, limit||8).map(function(r){ return r.item; });
  }
  window.MetRoadSearch = { open:open, close:close, query:query };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', checkQueryParam);
  } else { checkQueryParam(); }
})();
