/* Optional reader account. Syncs reading progress and display settings across devices.
   Nothing here loads until the reader opens the account menu or has signed in before. */
(function(){
  var d=document,root=d.documentElement;
  var btn=d.getElementById('acctBtn'),menu=d.getElementById('acctMenu');
  if(!btn||!menu)return;
  var sb=window.__sb;
  function get(k){return sb?sb.get(k):null}
  function raw(k,v){if(sb)sb.set(k,v)}
  function files(){var a=[];for(var i=0;i<30;i++)a.push('ch-'+(i<10?'0':'')+i+'.html');return a}
  function key(f){return f.replace(/\.html$/,'')}

  var fb=null,fbp=null,user=null,pending=null,timer=null,state='out',msg='',syncing=false;

  function loadFB(){
    if(fb)return Promise.resolve(fb);
    if(fbp)return fbp;
    fbp=new Promise(function(res,rej){
      var s=d.createElement('script');
      s.src='assets/fb.js';
      s.onload=function(){fb=window.SBFB;res(fb)};
      s.onerror=function(){fbp=null;rej(new Error('offline'))};
      d.head.appendChild(s);
    });
    return fbp;
  }

  // ---------- menu UI
  function esc(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function render(){
    var h='';
    if(user){
      var nm=user.displayName||user.email||'Reader';
      h+='<div class="acct-who"><span class="acct-av">'+esc(nm.charAt(0).toUpperCase())+'</span><span class="acct-id"><b>'+esc(nm)+'</b>'+(user.email&&user.displayName?'<small>'+esc(user.email)+'</small>':'')+'</span></div>';
      h+='<p class="acct-st">'+esc(msg||'Your progress, bookmarks and notes are synced across your devices.')+'</p>';
      h+='<button type="button" class="acct-btn ghost" data-act="out">Sign out</button>';
    }else if(state==='busy'){
      h+='<p class="acct-st">Connecting…</p>';
    }else{
      h+='<b class="acct-h">Log in or sign up</b>';
      h+='<p class="acct-p">One tap with Google. You get</p><ul class="acct-ul"><li>Your reading place on every device</li><li>Bookmarks and notes</li><li>Your theme and text size</li></ul><p class="acct-p">It is optional. The book stays free and open either way.</p>';
      if(msg)h+='<p class="acct-err">'+esc(msg)+'</p>';
      h+='<button type="button" class="acct-btn" data-act="in"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>Continue with Google</button>';
    }
    h+='<a class="acct-link" href="privacy.html">Privacy</a>';
    menu.innerHTML=h;
    btn.classList.toggle('on',!!user);
    var lab=btn.querySelector('.acct-ini');
    if(lab)lab.textContent=user?(user.displayName||user.email||'R').charAt(0).toUpperCase():'';
    btn.setAttribute('aria-label',user?'Account':'Log in or sign up');
    if(user)hideWelcome();
  }
  function open(o){
    menu.hidden=!o;btn.setAttribute('aria-expanded',String(o));
    if(o){render()}
  }
  btn.addEventListener('click',function(e){e.stopPropagation();open(menu.hidden)});
  d.addEventListener('click',function(e){if(!menu.hidden&&!e.target.closest('.acctwrap'))open(false)});
  d.addEventListener('keydown',function(e){if(e.key==='Escape'&&!menu.hidden)open(false)});
  menu.addEventListener('click',function(e){
    var b=e.target.closest('button[data-act]');if(!b)return;
    if(b.getAttribute('data-act')==='in')signIn();else signOutNow();
  });

  // ---------- auth
  function connect(){
    return loadFB().then(function(f){
      f.onAuth(function(u){
        user=u||null;
        if(u){raw('sb:acct','1');state='in';msg='Syncing…';render();pull()}
        else{
          if(get('sb:acct')==='1'&&state!=='busy')raw('sb:acct','0');
          if(state!=='busy')state='out';
          render();
        }
      });
    });
  }
  function signIn(){
    state='busy';msg='';render();
    loadFB().then(function(f){
      if(!window.__acctWatch){window.__acctWatch=true;return connect().then(function(){return f.signIn()})}
      return f.signIn();
    }).then(function(){/* onAuth handles the rest */}).catch(function(err){
      state='out';
      var c=err&&err.code||'';
      if(c==='auth/popup-closed-by-user'||c==='auth/cancelled-popup-request'){msg=''}
      else if(c==='auth/popup-blocked'){msg='The sign-in window was blocked. Please allow pop-ups for this site and try again.'}
      else if(err&&err.message==='offline'||c==='auth/network-request-failed'){msg='Could not connect. Please check your internet and try again.'}
      else{msg='Sign-in did not complete. Please try again.'}
      render();
    });
  }
  function signOutNow(){
    if(!fb)return;
    flush();
    fb.signOut().then(function(){raw('sb:acct','0');user=null;state='out';msg='';render()}).catch(function(){});
  }

  // ---------- sync
  function localPos(f){
    var p=parseFloat(get('sb:pos:'+f));
    if(isNaN(p))return null;
    return {p:p,t:parseInt(get('sb:pt:'+f)||'0',10)||0};
  }
  function applyRemote(r){
    var out={pos:{}};var any=false,changedLocal=false;
    r=r||{};
    var rp=r.pos||{};
    files().forEach(function(f){
      var rr=rp[key(f)],ll=localPos(f);
      if(rr&&typeof rr.p==='number'&&(!ll||(rr.t||0)>ll.t)){
        raw('sb:pos:'+f,Number(rr.p).toFixed(4));raw('sb:pt:'+f,String(rr.t||0));changedLocal=true;
      }else if(ll&&(!rr||ll.t>(rr.t||0))){
        out.pos[key(f)]={p:ll.p,t:ll.t};any=true;
      }
    });
    var lt=parseInt(get('sb:lastT')||'0',10)||0,last=get('sb:last');
    if(r.last&&(r.lastT||0)>lt){raw('sb:last',r.last);raw('sb:lastT',String(r.lastT||0));changedLocal=true}
    else if(last&&lt>(r.lastT||0)){out.last=last;out.lastT=lt;any=true}
    var pt=parseInt(get('sb:prefT')||'0',10)||0,rpf=r.prefs||{};
    if((rpf.t||0)>pt){
      if(rpf.theme)raw('sb:theme',rpf.theme);
      if(rpf.fs)raw('sb:fs',rpf.fs);
      raw('sb:prefT',String(rpf.t||0));changedLocal=true;
    }else if(pt>(rpf.t||0)){
      out.prefs={theme:get('sb:theme')||null,fs:get('sb:fs')||null,t:pt};any=true;
    }
    var lm={};try{lm=JSON.parse(get('sb:marks')||'{}')||{}}catch(e){lm={}}
    var rm=r.marks||{},mch=false,mout={};
    Object.keys(rm).forEach(function(k){var a=rm[k],b=lm[k];if(a&&(!b||(a.t||0)>(b.t||0))){lm[k]=a;mch=true}});
    Object.keys(lm).forEach(function(k){var a=rm[k],b=lm[k];if(b&&(!a||(b.t||0)>(a.t||0)))mout[k]=b});
    if(mch){raw('sb:marks',JSON.stringify(lm));changedLocal=true}
    if(Object.keys(mout).length){out.marks=mout;any=true}
    if(changedLocal){try{d.dispatchEvent(new CustomEvent('sbsynced'))}catch(e){}}
    return any?out:null;
  }
  function pull(){
    if(!user||!fb)return;
    syncing=true;
    fb.load(user.uid).then(function(remote){
      var up=applyRemote(remote);
      if(up)queue(up);
      msg='Your progress, bookmarks and notes are synced across your devices.';
      syncing=false;render();
    }).catch(function(){
      syncing=false;msg='Offline for now. Your progress will sync when you are back online.';render();
    });
  }
  function merge(a,b){
    a=a||{pos:{}};
    if(b.pos){a.pos=a.pos||{};for(var k in b.pos)a.pos[k]=b.pos[k]}
    if(b.last){a.last=b.last;a.lastT=b.lastT}
    if(b.prefs)a.prefs=b.prefs;
    if(b.marks){a.marks=a.marks||{};for(var m in b.marks)a.marks[m]=b.marks[m]}
    return a;
  }
  function queue(p){
    pending=merge(pending,p);
    clearTimeout(timer);
    timer=setTimeout(flush,5000);
  }
  function flush(){
    clearTimeout(timer);
    if(!pending||!user||!fb)return;
    var data=pending;pending=null;
    data.updatedAt=Date.now();
    fb.save(user.uid,data).then(function(){
      if(msg.indexOf('Offline')===0){msg='Your progress, bookmarks and notes are synced across your devices.';if(!menu.hidden)render()}
    }).catch(function(){
      pending=merge(data,pending||{});
      msg='Offline for now. Your progress will sync when you are back online.';
      if(!menu.hidden)render();
    });
  }
  d.addEventListener('sbchange',function(e){
    if(!user)return;
    var k=e.detail&&e.detail.key||'',o={};
    if(k.indexOf('sb:pos:')===0){
      var f=k.slice(7),l=localPos(f);
      if(l){o.pos={};o.pos[key(f)]={p:l.p,t:l.t}}
    }else if(k==='sb:last'){o.last=get('sb:last');o.lastT=parseInt(get('sb:lastT')||'0',10)||Date.now()}
    else if(k==='sb:theme'||k==='sb:fs'){o.prefs={theme:get('sb:theme')||null,fs:get('sb:fs')||null,t:parseInt(get('sb:prefT')||'0',10)||Date.now()}}
    else if(k==='sb:marks'){var lm={};try{lm=JSON.parse(get('sb:marks')||'{}')||{}}catch(x){}o.marks=lm}
    else return;
    queue(o);
  });
  d.addEventListener('visibilitychange',function(){if(d.visibilityState==='hidden')flush()});
  addEventListener('pagehide',flush);
  addEventListener('online',function(){if(user){if(pending)flush();else pull()}});

  // ---------- first-visit prompt
  var wel=null;
  function hideWelcome(){if(wel){wel.remove();wel=null}}
  function showWelcome(){
    if(wel||get('sb:welcome')||get('sb:acct')==='1'||user)return;
    if(!d.querySelector('.reader[data-file], .home'))return;
    wel=d.createElement('div');wel.className='welcome';wel.setAttribute('role','dialog');wel.setAttribute('aria-label','Log in to save your progress');
    wel.innerHTML='<button type="button" class="wx" data-w="skip" aria-label="Close">&times;</button><b>Save your progress</b><p>Log in with Google to keep your reading place, bookmarks and notes on all your devices. It takes one tap, and it is optional.</p><div class="wb"><button type="button" class="acct-btn pri" data-w="in">Log in or sign up</button><button type="button" class="acct-btn ghost" data-w="skip">Skip</button></div>';
    d.body.appendChild(wel);
    wel.addEventListener('click',function(e){
      var b=e.target.closest('button[data-w]');if(!b)return;
      raw('sb:welcome','1');
      var inn=b.getAttribute('data-w')==='in';
      hideWelcome();
      if(inn){open(true);signIn()}
    });
  }
  setTimeout(showWelcome,2500);

  render();
  // Returning readers who signed in before get their session restored quietly
  if(get('sb:acct')==='1'){
    window.__acctWatch=true;
    connect().catch(function(){msg='Offline for now. Your progress will sync when you are back online.'});
  }
})();
