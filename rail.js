/* ============================================================================
   DalOS Analytics — Favorites Rail  (Option A)
   Shared, self-injecting left icon rail + Favorites flyout.
   - Injects its own styles + DOM; only needs <script src="rail.js" defer> per page.
   - Favorites are stored per-browser in localStorage ('dalos_favorites').
   - Decorates every live dashboard card (a.dash-card[href]) with a ★ pin.
   - Manage access (admin) reuses the page's existing openPanel(); shown only
     where that panel exists. Sign out reuses dalSignOut()/signOut() if present.
   ========================================================================== */
(function(){
  if(window.__dalRailLoaded) return; window.__dalRailLoaded=true;

  var RAIL_W=60, FAV_KEY='dalos_favorites';

  /* ---- inline SVG icons (no icon-font dependency) ---- */
  var P={
    home:'<path d="M4 11l8-6 8 6"/><path d="M6 10v9h12v-9"/>',
    star:'<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
    shield:'<path d="M12 3l7 3v5.5c0 4-3 6.6-7 8-4-1.4-7-4-7-8V6z"/><path d="M12 10.5v3"/>',
    logout:'<path d="M14 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2v-2"/><path d="M9 12h11M17 9l3 3-3 3"/>',
    x:'<path d="M6 6l12 12M18 6L6 18"/>'
  };
  function ic(n,s,f){s=s||16;return '<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="'+(f?'currentColor':'none')+'" stroke="'+(f?'none':'currentColor')+'" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="display:block">'+P[n]+'</svg>';}

  /* ---- styles ---- */
  var css=''
   +'body{padding-left:'+RAIL_W+'px}'
   +'.dal-rail{position:fixed;left:0;top:0;bottom:0;width:'+RAIL_W+'px;background:#142850;z-index:330;display:flex;flex-direction:column;align-items:center;padding:11px 0 13px;gap:4px;font-family:var(--font,\'Plus Jakarta Sans\',system-ui,sans-serif)}'
   +'.dal-rlogo{width:36px;height:36px;border-radius:9px;overflow:hidden;margin-bottom:9px;flex-shrink:0}'
   +'.dal-rlogo svg{width:100%;height:100%;display:block}'
   +'.dal-ric{width:42px;height:42px;border-radius:11px;display:flex;align-items:center;justify-content:center;color:#9fb3d6;cursor:pointer;transition:.15s;position:relative;border:none;background:none}'
   +'.dal-ric:hover{background:rgba(255,255,255,.1);color:#fff}'
   +'.dal-ric.on{background:#2563EB;color:#fff}'
   +'.dal-ric .dal-cnt{position:absolute;top:3px;right:3px;min-width:15px;height:15px;padding:0 3px;border-radius:8px;background:#dc2626;color:#fff;font-size:9px;font-weight:700;line-height:15px;text-align:center;box-shadow:0 0 0 2px #142850}'
   +'.dal-ric .dal-tip{position:absolute;left:52px;top:50%;transform:translateY(-50%);background:#1a3668;color:#fff;font-size:11px;font-weight:600;padding:5px 9px;border-radius:7px;white-space:nowrap;opacity:0;pointer-events:none;transition:.14s;box-shadow:0 6px 20px rgba(20,40,80,.3);z-index:2}'
   +'.dal-ric:hover .dal-tip{opacity:1}'
   +'.dal-rsp{flex:1}'
   +'.dal-fly-ov{position:fixed;inset:0 0 0 '+RAIL_W+'px;background:rgba(14,31,61,.12);z-index:300;opacity:0;pointer-events:none;transition:.2s}'
   +'.dal-fly-ov.on{opacity:1;pointer-events:auto}'
   +'.dal-flyout{position:fixed;left:'+RAIL_W+'px;top:0;bottom:0;width:256px;max-width:80vw;background:#fff;border-right:1px solid #e2e6f0;box-shadow:6px 0 26px rgba(20,40,80,.12);z-index:320;transform:translateX(-112%);transition:transform .28s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;font-family:var(--font,\'Plus Jakarta Sans\',system-ui,sans-serif)}'
   +'.dal-flyout.on{transform:none}'
   +'.dal-fh{padding:16px 15px 13px;border-bottom:1px solid #e2e6f0;display:flex;align-items:center;justify-content:space-between}'
   +'.dal-fh b{font-size:14px;font-weight:700;color:#142850;display:flex;align-items:center;gap:7px}'
   +'.dal-fx{width:28px;height:28px;border-radius:7px;border:1px solid #e2e6f0;background:#fff;color:#4a5778;cursor:pointer;display:flex;align-items:center;justify-content:center}'
   +'.dal-fx:hover{border-color:#DC6428;color:#DC6428}'
   +'.dal-fb{flex:1;overflow-y:auto;padding:9px}'
   +'.dal-empty{font-size:12.5px;color:#8a95b0;padding:16px 12px;line-height:1.6;text-align:center}'
   +'.dal-frow{display:flex;align-items:center;gap:9px;padding:8px 9px;border-radius:8px;color:#4a5778;cursor:pointer;transition:.12s;text-decoration:none}'
   +'.dal-frow:hover{background:#f4f6fb}'
   +'.dal-femo{font-size:15px;width:22px;text-align:center;flex-shrink:0}'
   +'.dal-fnm{font-size:13px;font-weight:600;color:#142850;line-height:1.25}'
   +'.dal-fcx{font-size:10.5px;color:#8a95b0}'
   +'.dal-fun{width:26px;height:26px;border-radius:6px;border:none;background:none;color:#DC6428;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}'
   +'.dal-fun:hover{background:#fff2e8}'
   +'.dal-ffoot{border-top:1px solid #e2e6f0;padding:11px;font-size:11px;color:#8a95b0;text-align:center}'
   /* account button + menu */
   +'.dal-avatar{width:34px;height:34px;border-radius:50%;background:#DC6428;color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;letter-spacing:.3px;border:1px solid rgba(255,255,255,.28)}'
   +'.dal-ric.dal-acct{padding:0}'
   +'.dal-acct-pop{position:fixed;left:64px;bottom:12px;width:232px;background:#fff;border:1px solid #e2e6f0;border-radius:12px;box-shadow:0 12px 36px rgba(20,40,80,.24);z-index:340;padding:12px;opacity:0;transform:translateY(8px);pointer-events:none;transition:.16s;font-family:var(--font,\'Plus Jakarta Sans\',system-ui,sans-serif)}'
   +'.dal-acct-pop.on{opacity:1;transform:none;pointer-events:auto}'
   +'.dal-acct-hd{display:flex;align-items:center;gap:10px;padding-bottom:11px;border-bottom:1px solid #e2e6f0;margin-bottom:10px}'
   +'.dal-avatar.lg{width:40px;height:40px;font-size:14px;flex-shrink:0}'
   +'.dal-acct-nm{font-size:13.5px;font-weight:700;color:#142850;line-height:1.2}'
   +'.dal-acct-em{font-size:11px;color:#8a95b0;word-break:break-all;margin-top:1px}'
   +'.dal-acct-out{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;padding:9px;border-radius:8px;border:1px solid #fecaca;background:#fef2f2;color:#dc2626;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;transition:.15s}'
   +'.dal-acct-out:hover{background:#dc2626;color:#fff;border-color:#dc2626}'
   /* card star */
   +'.dal-fav-host{position:relative}'
   +'.dal-fav-host .dc-header{padding-right:30px}'
   +'.dal-star{position:absolute;top:14px;right:14px;width:28px;height:28px;border-radius:8px;border:1px solid #e2e6f0;background:#fff;color:#8a95b0;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:4;box-shadow:0 1px 4px rgba(20,40,80,.08);transition:.15s}'
   +'.dal-star:hover{border-color:#DC6428;color:#DC6428}'
   +'.dal-star.on{background:#fff7ed;border-color:#fed7aa;color:#DC6428}'
   +'@media(max-width:768px){.dal-ric .dal-tip{display:none}}';
  var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  /* ---- favorites store ---- */
  function getFavs(){try{return JSON.parse(localStorage.getItem(FAV_KEY)||'[]');}catch(e){return [];}}
  function setFavs(a){localStorage.setItem(FAV_KEY,JSON.stringify(a));}
  function isFav(href){return getFavs().some(function(f){return f.href===href;});}
  function toggleFav(item){
    var a=getFavs(), i=-1;
    for(var k=0;k<a.length;k++){if(a[k].href===item.href){i=k;break;}}
    if(i>=0)a.splice(i,1); else a.push(item);
    setFavs(a); renderFlyout(); decorate(); updateCount();
  }

  /* ---- page context (product / department name) for labelling favorites ---- */
  function pageCtx(){
    var t=(document.title||'').split('·')[0].split('—')[0].trim();
    return t||'Dashboard';
  }

  /* ---- build rail + flyout ---- */
  var rail=document.createElement('div'); rail.className='dal-rail';
  rail.innerHTML=''
    +'<div class="dal-rlogo"><svg viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1a3668"/><rect x="14" y="32" width="8.5" height="18" rx="4" fill="#f08a4b"/><rect x="27.75" y="24" width="8.5" height="26" rx="4" fill="#DC6428"/><rect x="41.5" y="15" width="8.5" height="35" rx="4" fill="#DC6428"/><circle cx="45.75" cy="15" r="4.3" fill="#f7c948"/></svg></div>'
    +'<button class="dal-ric" id="dal-home" title="Home">'+ic('home',21)+'<span class="dal-tip">Home</span></button>'
    +'<button class="dal-ric" id="dal-fav">'+ic('star',21)+'<span class="dal-cnt" id="dal-favcnt" style="display:none">0</span><span class="dal-tip">Favorites</span></button>'
    +'<button class="dal-ric" id="dal-access" style="display:none">'+ic('shield',21)+'<span class="dal-tip">Manage access</span></button>'
    +'<div class="dal-rsp"></div>'
    +'<button class="dal-ric dal-acct" id="dal-acct"><span class="dal-avatar" id="dal-avatar">–</span><span class="dal-tip" id="dal-acct-tip">Account</span></button>';
  document.body.appendChild(rail);

  var acctPop=document.createElement('div'); acctPop.className='dal-acct-pop'; acctPop.id='dal-acct-pop';
  acctPop.innerHTML=''
    +'<div class="dal-acct-hd"><div class="dal-avatar lg" id="dal-acct-av">–</div><div style="min-width:0"><div class="dal-acct-nm" id="dal-acct-nm">—</div><div class="dal-acct-em" id="dal-acct-em"></div></div></div>'
    +'<button class="dal-acct-out" id="dal-acct-out">'+ic('logout',15)+' Sign out</button>';
  document.body.appendChild(acctPop);

  var ov=document.createElement('div'); ov.className='dal-fly-ov'; document.body.appendChild(ov);
  var fly=document.createElement('aside'); fly.className='dal-flyout';
  fly.innerHTML=''
    +'<div class="dal-fh"><b>'+ic('star',15,true).replace('style="display:block"','style="display:block;color:#DC6428"')+' Favorites</b><button class="dal-fx" id="dal-flyx">'+ic('x',15)+'</button></div>'
    +'<div class="dal-fb" id="dal-flybody"></div>'
    +'<div class="dal-ffoot">Pin dashboards with the ★ on any card</div>';
  document.body.appendChild(fly);

  /* ---- flyout render / toggle ---- */
  function renderFlyout(){
    var favs=getFavs(), body=document.getElementById('dal-flybody');
    if(!favs.length){body.innerHTML='<div class="dal-empty">No favorites yet.<br>Tap the ★ on any dashboard card to pin it here.</div>';return;}
    body.innerHTML=favs.map(function(f){
      return '<a class="dal-frow" href="'+f.href+'"><span class="dal-femo">'+(f.emo||'📊')+'</span>'
        +'<div style="flex:1;min-width:0"><div class="dal-fnm">'+f.name+'</div>'+(f.ctx?'<div class="dal-fcx">'+f.ctx+'</div>':'')+'</div>'
        +'<button class="dal-fun" title="Unpin" data-href="'+encodeURIComponent(f.href)+'">'+ic('star',17,true)+'</button></a>';
    }).join('');
    body.querySelectorAll('.dal-fun').forEach(function(btn){
      btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();toggleFav({href:decodeURIComponent(btn.dataset.href)});});
    });
  }
  function updateCount(){
    var n=getFavs().length, c=document.getElementById('dal-favcnt');
    if(n){c.style.display='';c.textContent=n;} else c.style.display='none';
  }
  var flyOpen=false;
  function toggleFly(v){
    flyOpen=(v===undefined)?!flyOpen:v;
    fly.classList.toggle('on',flyOpen); ov.classList.toggle('on',flyOpen);
    document.getElementById('dal-fav').classList.toggle('on',flyOpen);
  }
  document.getElementById('dal-fav').addEventListener('click',function(){toggleFly();});
  document.getElementById('dal-flyx').addEventListener('click',function(){toggleFly(false);});
  ov.addEventListener('click',function(){toggleFly(false);});

  /* ---- rail actions ---- */
  document.getElementById('dal-home').addEventListener('click',function(){window.location='index.html';});

  /* ---- account identity + menu ---- */
  function getUser(){
    try{
      var raw=null;
      for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(/^sb-.*-auth-token$/.test(k)){raw=localStorage.getItem(k);break;}}
      if(!raw)return null;
      var s=JSON.parse(raw);
      var sess=(s&&s.access_token)?s:((s&&s.currentSession)?s.currentSession:s);
      var u=(sess&&sess.user)||s.user||null; if(!u)return null;
      var meta=u.user_metadata||{};
      var name=meta.full_name||meta.name||meta.display_name||(u.email?u.email.split('@')[0]:'')||'User';
      return {name:name, email:u.email||''};
    }catch(e){return null;}
  }
  function initialsOf(n){var p=(n||'').trim().split(/\s+/);return (((p[0]||'')[0]||'')+((p[1]||'')[0]||'')).toUpperCase()||'?';}
  function renderAcct(){
    var u=getUser();
    var name=(u&&u.name)||'Account', email=(u&&u.email)||'', ini=initialsOf(name);
    var av=document.getElementById('dal-avatar'); if(av)av.textContent=ini;
    var av2=document.getElementById('dal-acct-av'); if(av2)av2.textContent=ini;
    var nm=document.getElementById('dal-acct-nm'); if(nm)nm.textContent=name;
    var em=document.getElementById('dal-acct-em'); if(em)em.textContent=email;
    var tip=document.getElementById('dal-acct-tip'); if(tip)tip.textContent=name;
  }
  renderAcct(); setTimeout(renderAcct,1200); setTimeout(renderAcct,3500);
  var acctOpen=false;
  function toggleAcct(v){acctOpen=(v===undefined)?!acctOpen:v;acctPop.classList.toggle('on',acctOpen);document.getElementById('dal-acct').classList.toggle('on',acctOpen);}
  document.getElementById('dal-acct').addEventListener('click',function(e){e.stopPropagation();toggleAcct();});
  acctPop.addEventListener('click',function(e){e.stopPropagation();});
  document.addEventListener('click',function(){if(acctOpen)toggleAcct(false);});
  document.getElementById('dal-acct-out').addEventListener('click',function(){
    if(typeof window.dalSignOut==='function')return window.dalSignOut();
    if(typeof window.signOut==='function')return window.signOut();
    window.location='daltex_login.html';
  });
  var accessBtn=document.getElementById('dal-access');
  accessBtn.addEventListener('click',function(){ if(typeof window.openPanel==='function')window.openPanel('all'); });
  // Mirror the legacy pending-request count onto the rail shield.
  function mirrorCount(){
    var badge=document.getElementById('ma-badge');
    var has = badge && badge.textContent && getComputedStyle(badge).display!=='none';
    var d=accessBtn.querySelector('.dal-cnt');
    if(has){ if(!d){d=document.createElement('span');d.className='dal-cnt';accessBtn.appendChild(d);} d.textContent=badge.textContent; }
    else if(d){ d.remove(); }
  }
  // Reveal the rail's Manage-access. Called by the page's admin branch, or auto-detected
  // if the legacy admin button is present and shown (belt-and-suspenders).
  function showAccess(){ accessBtn.style.display=''; mirrorCount(); }
  function autoDetect(){
    var legacy=document.getElementById('manage-access-btn');
    if(window.__dalIsAdmin===true || (legacy && getComputedStyle(legacy).display!=='none')) showAccess();
    mirrorCount();
  }
  autoDetect(); setTimeout(autoDetect,800); setTimeout(autoDetect,2000); setTimeout(autoDetect,4500);
  var mb=document.getElementById('ma-badge'); if(mb)new MutationObserver(mirrorCount).observe(mb,{attributes:true,childList:true,subtree:true});

  /* ---- decorate dashboard cards with a ★ pin ---- */
  function decorate(){
    var ctx=pageCtx();
    document.querySelectorAll('a.dash-card[href]').forEach(function(card){
      if(card.classList.contains('locked')||card.classList.contains('coming'))return;
      var href=card.getAttribute('href'); if(!href||href==='#')return;
      var nameEl=card.querySelector('.dc-name'); if(!nameEl)return;
      var name=nameEl.textContent.trim();
      var iconEl=card.querySelector('.dc-icon');
      var emo=iconEl?iconEl.textContent.trim():''; if(!emo||emo.length>3)emo='📊';
      var item={href:href,name:name,emo:emo,ctx:ctx};
      var on=isFav(href);
      var star=card.querySelector('.dal-star');
      if(!star){
        card.classList.add('dal-fav-host');
        star=document.createElement('button'); star.className='dal-star'; star.type='button';
        star.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();
          var it={href:card.getAttribute('href'),name:name,emo:emo,ctx:ctx};
          toggleFav(it);});
        card.appendChild(star);
      }
      star.classList.toggle('on',on);
      star.title=on?'Unpin from favorites':'Pin to favorites';
      star.innerHTML=ic('star',16,on);
    });
  }

  /* ---- init ---- */
  // Observe DOM for cards that gate/switcher inject or unlock later. Disconnect
  // while we mutate (decorate adds/updates stars) so we never loop on our own edits.
  var mo=new MutationObserver(function(){schedule();});
  var schedTimer=null;
  function schedule(){ if(schedTimer)return; schedTimer=setTimeout(function(){schedTimer=null;decorate();},150); }
  var _decorate=decorate;
  decorate=function(){ mo.disconnect(); try{ _decorate(); }catch(e){} mo.observe(document.body,{childList:true,subtree:true}); };

  renderFlyout(); updateCount(); decorate();
  setTimeout(decorate,800); setTimeout(decorate,2500);

  window.DalRail={toggleFav:toggleFav,showAccess:showAccess,refresh:function(){renderFlyout();updateCount();decorate();}};
})();
