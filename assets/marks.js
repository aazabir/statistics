/* Bookmarks and notes. Stored on the device, and synced when the reader is signed in. */
(function(){
  var d=document,sb=window.__sb;
  if(!sb)return;
  var KEY='sb:marks';
  var rd=d.querySelector('.reader[data-file]');
  var file=rd&&rd.getAttribute('data-file');
  var prose=rd&&rd.querySelector('.prose');
  var ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-4-6 4V5.5a1 1 0 0 1 1-1z"/></svg>';

  function esc(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function load(){try{var m=JSON.parse(sb.get(KEY)||'{}');return m&&typeof m==='object'?m:{}}catch(e){return {}}}
  function save(m){
    sb.set(KEY,JSON.stringify(m));
    try{d.dispatchEvent(new CustomEvent('sbchange',{detail:{key:KEY}}))}catch(e){}
    refresh();
  }
  function mkey(f,id){return f.replace(/\.html$/,'')+'_'+id}
  function live(m){return Object.keys(m).filter(function(k){return m[k]&&!m[k].d}).map(function(k){return [k,m[k]]})}

  // ---------- which paragraph does a selection belong to
  function blockOf(node){
    var el=node&&(node.nodeType===1?node:node.parentElement);
    if(!el||!prose||!prose.contains(el)||el.closest('.mnote'))return null;
    var b=el.closest('p[id],h3[id]');
    if(b&&prose.contains(b))return b;
    var top=el;
    while(top&&top.parentElement!==prose)top=top.parentElement;
    if(!top)return null;
    var p=top.previousElementSibling;
    while(p&&!(p.id&&/^(P|H3)$/.test(p.tagName)))p=p.previousElementSibling;
    return p||null;
  }
  function chapterTitle(){var h=d.querySelector('.chapter-title');return h?h.textContent.trim():''}
  function excerptOf(sel,blk){
    var t=(sel||blk.textContent||'').replace(/\s+/g,' ').trim();
    return t.length>160?t.slice(0,157).replace(/\s+\S*$/,'')+'…':t;
  }

  // ---------- marks inside the chapter
  function render(){
    if(!prose)return;
    prose.querySelectorAll('.mnote').forEach(function(n){n.remove()});
    prose.querySelectorAll('.marked').forEach(function(n){n.classList.remove('marked')});
    var m=load();
    live(m).forEach(function(kv){
      var v=kv[1];if(v.f!==file)return;
      var el=d.getElementById(v.id);if(!el||!prose.contains(el))return;
      el.classList.add('marked');
      var a=d.createElement('aside');a.className='mnote';a.setAttribute('data-k',kv[0]);
      el.parentNode.insertBefore(a,el.nextSibling);
      fill(a,v,false);
    });
  }
  function fill(a,v,editing){
    if(editing){
      a.innerHTML=ICON+'<div class="mn-body"><textarea class="mn-ta" rows="3" maxlength="1000" placeholder="Write a note…" aria-label="Note">'+esc(v.n||'')+'</textarea><div class="mn-act"><button type="button" class="pri" data-a="ok">Save</button><button type="button" data-a="no">Cancel</button></div></div>';
      var ta=a.querySelector('textarea');ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length);
      return;
    }
    a.innerHTML=ICON+'<div class="mn-body">'+(v.n?'<p class="mn-t">'+esc(v.n)+'</p>':'<p class="mn-t mn-dim">Bookmarked</p>')+'<div class="mn-act"><button type="button" data-a="note">'+(v.n?'Edit note':'Add note')+'</button><button type="button" data-a="del">Remove</button></div></div>';
  }
  if(prose){
    prose.addEventListener('click',function(e){
      var b=e.target.closest('.mnote button[data-a]');if(!b)return;
      var a=b.closest('.mnote'),k=a.getAttribute('data-k'),m=load(),v=m[k];if(!v)return;
      var act=b.getAttribute('data-a');
      if(act==='note')fill(a,v,true);
      else if(act==='no')fill(a,v,false);
      else if(act==='ok'){v.n=a.querySelector('textarea').value.trim().slice(0,1000);v.t=Date.now();save(m)}
      else if(act==='del'){m[k]={d:1,t:Date.now()};save(m)}
    });
  }

  // ---------- selection popover
  var pop=d.createElement('div');pop.className='mpop';pop.hidden=true;
  pop.innerHTML='<button type="button" data-a="bm">'+ICON+'Bookmark</button><button type="button" data-a="nt">Note</button>';
  d.body.appendChild(pop);
  var cur=null,tmr=null;
  function check(){
    if(!prose){return}
    var s=getSelection();
    if(!s||s.isCollapsed||!s.rangeCount){pop.hidden=true;cur=null;return}
    var r=s.getRangeAt(0),blk=blockOf(r.commonAncestorContainer)||blockOf(r.startContainer);
    var txt=s.toString().trim();
    if(!blk||txt.length<2){pop.hidden=true;cur=null;return}
    cur={blk:blk,ex:excerptOf(txt,blk)};
    var has=!!(load()[mkey(file,blk.id)]||{}).t&&!load()[mkey(file,blk.id)].d;
    pop.querySelector('[data-a=bm]').hidden=has;
    pop.hidden=false;
    var rc=r.getBoundingClientRect(),w=pop.offsetWidth,x=rc.left+rc.width/2-w/2;
    x=Math.max(8,Math.min(x,innerWidth-w-8));
    var y=rc.bottom+10;if(y>innerHeight-60)y=Math.max(8,rc.top-52);
    pop.style.left=x+'px';pop.style.top=y+'px';
  }
  function later(){clearTimeout(tmr);tmr=setTimeout(check,180)}
  d.addEventListener('selectionchange',later);
  addEventListener('scroll',function(){if(!pop.hidden)later()},{passive:true});
  pop.addEventListener('mousedown',function(e){e.preventDefault()});
  pop.addEventListener('touchstart',function(e){e.preventDefault()},{passive:false});
  pop.addEventListener('click',function(e){
    var b=e.target.closest('button[data-a]');if(!b||!cur)return;
    var blk=cur.blk,m=load(),k=mkey(file,blk.id),v=m[k];
    if(!v||v.d){v=m[k]={f:file,id:blk.id,c:chapterTitle(),ex:cur.ex,n:'',t:Date.now()}}
    var wantNote=b.getAttribute('data-a')==='nt';
    pop.hidden=true;cur=null;
    try{getSelection().removeAllRanges()}catch(x){}
    save(m);
    if(wantNote){var a=prose.querySelector('.mnote[data-k="'+k+'"]');if(a){fill(a,m[k],true);a.scrollIntoView({block:'center',behavior:'smooth'})}}
  });

  // ---------- saved list (drawer tab and home page)
  function listHTML(){
    var items=live(load()).sort(function(a,b){return (b[1].t||0)-(a[1].t||0)});
    if(!items.length)return '<p class="sv-empty">Nothing saved yet. While reading, select any text, then choose Bookmark or Note.</p>';
    return '<ul class="sv-list">'+items.map(function(kv){var v=kv[1];
      return '<li><a href="'+esc(v.f)+'#'+esc(v.id)+'"><small>'+esc(v.c||'')+'</small><q>'+esc(v.ex||'')+'</q>'+(v.n?'<em>'+esc(v.n)+'</em>':'')+'</a><button type="button" class="sv-x" data-k="'+esc(kv[0])+'" aria-label="Remove">&times;</button></li>'}).join('')+'</ul>';
  }
  var dr=d.getElementById('drawer'),tabs=null,panel=null,count=null;
  if(dr){
    var head=dr.querySelector('.drawer-head'),toc=dr.querySelector('.toc');
    tabs=d.createElement('div');tabs.className='dtabs';
    tabs.innerHTML='<button type="button" class="on" data-t="toc">Contents</button><button type="button" data-t="sv">Saved <span class="cnt"></span></button>';
    head.parentNode.insertBefore(tabs,head.nextSibling);
    panel=d.createElement('div');panel.className='sv-panel';panel.hidden=true;
    toc.parentNode.insertBefore(panel,toc.nextSibling);
    count=tabs.querySelector('.cnt');
    tabs.addEventListener('click',function(e){
      var b=e.target.closest('button[data-t]');if(!b)return;
      var sv=b.getAttribute('data-t')==='sv';
      tabs.querySelectorAll('button').forEach(function(x){x.classList.toggle('on',x===b)});
      toc.hidden=sv;panel.hidden=!sv;
    });
    panel.addEventListener('click',function(e){
      if(e.target.closest('a')){var sc=d.getElementById('scrim');if(sc&&sc.classList.contains('on'))sc.click()}
    });
  }
  var home=d.querySelector('main.home .contents'),hs=null;
  if(home){
    hs=d.createElement('section');hs.className='saved-home';hs.hidden=true;
    hs.innerHTML='<h2>Your saved passages</h2><div class="sv-body"></div>';
    home.parentNode.insertBefore(hs,home);
  }
  function removeFrom(e){
    var x=e.target.closest('.sv-x');if(!x)return;
    var m=load(),k=x.getAttribute('data-k');
    if(m[k]){m[k]={d:1,t:Date.now()};save(m)}
  }
  if(panel)panel.addEventListener('click',removeFrom);
  if(hs)hs.addEventListener('click',removeFrom);
  function refresh(){
    var n=live(load()).length;
    if(count)count.textContent=n?'('+n+')':'';
    if(panel)panel.innerHTML=listHTML();
    if(hs){hs.hidden=!n;hs.querySelector('.sv-body').innerHTML=listHTML()}
    render();
  }
  d.addEventListener('sbsynced',refresh);
  refresh();
})();
