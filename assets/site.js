(function(){
  var d=document, root=d.documentElement;
  function $(s){return d.querySelector(s)}
  function get(k){return window.__sb?window.__sb.get(k):null}
  function raw(k,v){if(window.__sb)window.__sb.set(k,v)}
  // Every write also gets a timestamp so devices can tell which copy is newer when an account syncs them
  function set(k,v){
    raw(k,v);
    var t=String(Date.now());
    if(k==='sb:theme'||k==='sb:fs')raw('sb:prefT',t);
    else if(k==='sb:last')raw('sb:lastT',t);
    else if(k.indexOf('sb:pos:')===0)raw('sb:pt:'+k.slice(7),t);
    try{d.dispatchEvent(new CustomEvent('sbchange',{detail:{key:k}}))}catch(e){}
  }

  // quotes
  var QS=[["All models are wrong, but some are useful.", "George E. P. Box"], ["To consult the statistician after an experiment is finished is often merely to ask him to conduct a post mortem examination. He can perhaps say what the experiment died of.", "R. A. Fisher"], ["The null hypothesis is never proved or established, but is possibly disproved, in the course of experimentation.", "R. A. Fisher"], ["Far better an approximate answer to the right question, which is often vague, than an exact answer to the wrong question.", "John W. Tukey"], ["If you torture the data long enough, it will confess to anything.", "Ronald Coase"], ["Probability theory is nothing but common sense reduced to calculation.", "Pierre-Simon Laplace"]];
  var qe=$('#quote');
  if(qe){
    var qi0=Math.floor(Math.random()*QS.length);
    function showQ(i){
      qe.querySelector('q').textContent=QS[i][0];
      qe.querySelector('cite').textContent=QS[i][1];
    }
    showQ(qi0);
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
      setInterval(function(){
        qe.classList.add('fade');
        setTimeout(function(){qi0=(qi0+1)%QS.length;showQ(qi0);qe.classList.remove('fade')},400);
      },14000);
    }
  }

  // theme
  var tb=$('#themeBtn'),tm=$('#themeMenu');
  function mark(){
    var cur=get('sb:theme')==='auto'?'auto':(root.getAttribute('data-theme')||'auto');
    if(tm)tm.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-t')===cur))});
  }
  function applyTheme(t){
    if(t==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',t)}
    set('sb:theme',t);mark();
  }
  function menu(open){if(!tm)return;tm.hidden=!open;if(tb)tb.setAttribute('aria-expanded',String(open));if(open)mark()}
  if(tb)tb.addEventListener('click',function(e){e.stopPropagation();menu(tm.hidden)});
  if(tm){
    tm.addEventListener('click',function(e){
      var b=e.target.closest('button[data-t]');if(!b)return;
      applyTheme(b.getAttribute('data-t'));menu(false);
    });
    d.addEventListener('click',function(e){if(!tm.hidden&&!e.target.closest('.themewrap'))menu(false)});
    mark();
  }

  // font size
  function fs(delta){
    var v=parseInt(root.getAttribute('data-fs')||'2',10);
    v=Math.max(0,Math.min(4,v+delta));root.setAttribute('data-fs',String(v));set('sb:fs',String(v));
  }
  var fd=$('#fsDown'),fu=$('#fsUp');
  if(fd)fd.addEventListener('click',function(){fs(-1)});
  if(fu)fu.addEventListener('click',function(){fs(1)});

  // drawer
  var dr=$('#drawer'),sc=$('#scrim'),mb=$('#menuBtn');
  function drawer(open){
    if(!dr)return;
    dr.classList.toggle('open',open);
    if(sc)sc.classList.toggle('on',open);
    if(mb)mb.setAttribute('aria-expanded',String(open));
  }
  if(mb)mb.addEventListener('click',function(){drawer(!dr.classList.contains('open'))});
  if(sc)sc.addEventListener('click',function(){drawer(false)});
  if(dr){
    var cur=dr.querySelector('[aria-current]');
    if(cur&&cur.scrollIntoView){try{dr.scrollTop=cur.offsetTop-80}catch(e){}}
    dr.addEventListener('click',function(e){if(e.target.closest('.toc-sub a'))drawer(false)});
  }

  // reading progress + resume
  var rd=$('.reader'),pg=$('#progress');
  if(rd){
    var file=rd.getAttribute('data-file');
    set('sb:last',file);
    var saved=parseFloat(get('sb:pos:'+file)||'0');
    if(!location.hash&&saved>0.02&&saved<0.95){
      addEventListener('load',function(){
        var h=d.documentElement.scrollHeight-innerHeight;
        scrollTo(0,h*saved);
      });
    }
    var tick=false;
    addEventListener('scroll',function(){
      if(tick)return;tick=true;
      requestAnimationFrame(function(){
        tick=false;
        var h=d.documentElement.scrollHeight-innerHeight;
        var f=h>0?Math.min(1,Math.max(0,scrollY/h)):0;
        if(pg)pg.style.width=(f*100)+'%';
        set('sb:pos:'+file,f.toFixed(4));
      });
    },{passive:true});
  }
  // home: continue button
  var cb=$('#contBtn');
  function updateContinue(){
    if(!cb)return;
    var last=get('sb:last');
    var link=last&&d.querySelector('.cards a[href="'+last+'"]');
    if(link){cb.href=last;cb.textContent='Continue Reading · '+link.querySelector('.t').textContent;cb.hidden=false;var st=$('#startBtn');if(st)st.classList.remove('primary');cb.classList.add('primary')}
  }
  updateContinue();

  // after an account sync, bring the page in line with what the other device saved
  d.addEventListener('sbsynced',function(){
    updateContinue();
    var th=get('sb:theme');
    if(th){if(th==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',th)}mark()}
    var f=get('sb:fs');if(f)root.setAttribute('data-fs',f);
    if(rd&&!location.hash&&scrollY<80){
      var sv=parseFloat(get('sb:pos:'+rd.getAttribute('data-file'))||'0');
      if(sv>0.02&&sv<0.95){var h=d.documentElement.scrollHeight-innerHeight;scrollTo(0,h*sv)}
    }
  });

  // lightbox
  var lb=$('#lightbox');
  d.addEventListener('click',function(e){
    var im=e.target.closest&&e.target.closest('.prose img');
    if(im&&lb){lb.querySelector('img').src=im.src;lb.querySelector('img').alt=im.alt;lb.hidden=false}
    else if(lb&&e.target.closest&&e.target.closest('#lightbox')){lb.hidden=true}
  });

  // search
  var so=$('#search'),qi=$('#q'),res=$('#results'),data=null,loading=false,timer=null;
  function openSearch(){
    if(!so)return;
    so.hidden=false;qi.focus();
    if(!data&&!loading){
      loading=true;
      fetch('search-index.json').then(function(r){return r.json()}).then(function(j){data=j;run()}).catch(function(){res.innerHTML='';var p=d.createElement('p');p.className='hint';p.textContent='Could not load the search index.';res.appendChild(p)});
    }
  }
  function closeSearch(){if(so)so.hidden=true}
  function hint(t){res.innerHTML='';var p=d.createElement('p');p.className='hint';p.textContent=t;res.appendChild(p)}
  function run(){
    var q=qi.value.trim().normalize('NFC');
    if(q.length<2){hint('Type at least two characters. Works in Bengali and English.');return}
    if(!data){hint('Loading…');return}
    var ql=q.toLowerCase(),out=[],total=0;
    for(var i=0;i<data.length;i++){
      var c=data[i];
      for(var j=0;j<c.p.length;j++){
        var t=c.p[j],k=t.toLowerCase().indexOf(ql);
        if(k>=0){total++;if(out.length<40)out.push({f:c.f,t:c.t,id:j+1,s:t,k:k})}
      }
    }
    res.innerHTML='';
    if(!total){hint('No results for "'+q+'".');return}
    var h=d.createElement('p');h.className='hint';h.textContent=total+(total===1?' match':' matches')+(total>out.length?' (showing the first '+out.length+')':'');res.appendChild(h);
    out.forEach(function(o){
      var a=d.createElement('a');a.className='hit';a.href=o.f+'#p'+o.id;
      var b=d.createElement('b');b.textContent=o.t;a.appendChild(b);
      var sp=d.createElement('span');
      var st=Math.max(0,o.k-45),en=Math.min(o.s.length,o.k+q.length+80);
      sp.appendChild(d.createTextNode((st>0?'…':'')+o.s.slice(st,o.k)));
      var m=d.createElement('mark');m.textContent=o.s.slice(o.k,o.k+q.length);sp.appendChild(m);
      sp.appendChild(d.createTextNode(o.s.slice(o.k+q.length,en)+(en<o.s.length?'…':'')));
      a.appendChild(sp);res.appendChild(a);
    });
  }
  ['#searchBtn','#searchBtn2'].forEach(function(s){var b=$(s);if(b)b.addEventListener('click',openSearch)});
  var sx=$('#searchClose');if(sx)sx.addEventListener('click',closeSearch);
  if(so)so.addEventListener('click',function(e){if(e.target===so)closeSearch()});
  if(qi)qi.addEventListener('input',function(){clearTimeout(timer);timer=setTimeout(run,120)});
  d.addEventListener('keydown',function(e){
    if(e.key==='Escape'){menu(false);closeSearch();drawer(false);if(lb)lb.hidden=true}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}
  });
})();
/* Copy attribution: long copied passages get the book name, author and page link appended */
(function(){
  var d=document;
  d.addEventListener('copy',function(e){
    try{
      var a=d.activeElement;
      if(a&&/^(INPUT|TEXTAREA)$/.test(a.tagName))return;
      var sel=window.getSelection();
      if(!sel||sel.isCollapsed||!e.clipboardData)return;
      var txt=sel.toString();
      if(txt.replace(/\s+/g,' ').trim().length<100)return;
      var url=location.origin+location.pathname.replace(/index\.html$/,'');
      var line1='দিস ইজ নট এ স্ট্যাটিস্টিক্স বুক, আব্দুল্লাহ্-আল-জাবির';
      e.clipboardData.setData('text/plain',txt+'\n\n'+line1+'\n'+url);
      var box=d.createElement('div');
      for(var i=0;i<sel.rangeCount;i++)box.appendChild(sel.getRangeAt(i).cloneContents());
      var p=d.createElement('p');p.appendChild(d.createTextNode(line1));p.appendChild(d.createElement('br'));
      var l=d.createElement('a');l.href=url;l.textContent=url;p.appendChild(l);
      box.appendChild(p);
      e.clipboardData.setData('text/html',box.innerHTML);
      e.preventDefault();
    }catch(_){}
  });
})();

/* Footer email is assembled here so it is not sitting in the page source as plain text */
(function(){
  var a=document.querySelectorAll('a.mail');
  for(var i=0;i<a.length;i++){var m=a[i].getAttribute('data-u')+'@'+a[i].getAttribute('data-d');a[i].textContent=m;a[i].href='mailto:'+m}
})();

/* Chapter update notice, visible for 7 days from its date */
(function(){
  var n=document.querySelectorAll('.updated[data-date]');
  for(var i=0;i<n.length;i++){
    var p=n[i].getAttribute('data-date').split('-');
    var t=new Date(+p[0],+p[1]-1,+p[2]).getTime(),now=Date.now();
    if(now>=t&&now<t+7*86400000)n[i].hidden=false;
  }
})();

(function(){
  if(!('serviceWorker' in navigator)||!/^https?:$/.test(location.protocol))return;
  addEventListener('load',function(){
    navigator.serviceWorker.register('sw.js').catch(function(){});
  });
  var note=document.getElementById('offlineNote');
  if(note&&window.caches){
    var check=function(){caches.match('ch-29.html').then(function(r){if(r)note.hidden=false})};
    check();
    navigator.serviceWorker.ready.then(function(){setTimeout(check,1500)}).catch(function(){});
  }
})();
