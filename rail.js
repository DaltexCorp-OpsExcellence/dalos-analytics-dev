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
  var SB_URL='https://sfyjvgjwvtwkrnqrvqyc.supabase.co';
  var SB_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeWp2Z2p3dnR3a3JucXJ2cXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NzIxNjYsImV4cCI6MjA5MDQ0ODE2Nn0.FjA75XZsp0Kx5Xam_rrnYoAHX4JHKey6vEFCH_zlMuQ';

  /* ---- inline SVG icons (no icon-font dependency) ---- */
  var P={
    home:'<path d="M4 11l8-6 8 6"/><path d="M6 10v9h12v-9"/>',
    star:'<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
    shield:'<path d="M12 3l7 3v5.5c0 4-3 6.6-7 8-4-1.4-7-4-7-8V6z"/><path d="M12 10.5v3"/>',
    logout:'<path d="M14 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2v-2"/><path d="M9 12h11M17 9l3 3-3 3"/>',
    x:'<path d="M6 6l12 12M18 6L6 18"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.2-4.2"/>'
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
   /* top-bar search pill (glass) */
   +'.dal-search-pill{display:inline-flex;align-items:center;gap:9px;height:34px;padding:0 12px;border-radius:9px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);color:#dce6f5;cursor:pointer;font-family:var(--font,\'Plus Jakarta Sans\',system-ui,sans-serif);font-size:12.5px;font-weight:600;transition:.15s;white-space:nowrap;flex-shrink:0}'
   +'.dal-search-pill:hover{background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.28)}'
   +'.dal-search-pill .dal-kbd2{font-family:var(--mono,monospace);font-size:10px;color:#9fb3d6;border:1px solid rgba(255,255,255,.2);border-radius:5px;padding:2px 6px;background:rgba(255,255,255,.08)}'
   +'@media(max-width:640px){.dal-search-pill .pill-lbl,.dal-search-pill .dal-kbd2{display:none}.dal-search-pill{padding:0;width:34px;justify-content:center}}'
   /* search command palette */
   +'.dal-sov{position:fixed;inset:0;background:rgba(14,31,61,.42);z-index:360;display:none;align-items:flex-start;justify-content:center;padding:12vh 16px 16px}'
   +'.dal-sov.on{display:flex}'
   +'.dal-spal{width:480px;max-width:100%;background:#fff;border-radius:14px;box-shadow:0 24px 60px rgba(20,40,80,.32);overflow:hidden;font-family:var(--font,\'Plus Jakarta Sans\',system-ui,sans-serif)}'
   +'.dal-sbar{display:flex;align-items:center;gap:11px;padding:15px 16px;border-bottom:1px solid #e2e6f0}'
   +'.dal-sin{flex:1;border:none;outline:none;font-family:inherit;font-size:15px;color:#142850;background:none;min-width:0}'
   +'.dal-kbd{font-family:var(--mono,monospace);font-size:10px;color:#8a95b0;border:1px solid #e2e6f0;border-radius:5px;padding:2px 6px;background:#f4f6fb}'
   +'.dal-slist{max-height:342px;overflow-y:auto;padding:8px}'
   +'.dal-srch-empty{font-size:12.5px;color:#8a95b0;padding:16px;text-align:center;line-height:1.6}'
   /* card star */
   +'.dal-fav-host{position:relative}'
   +'.dal-fav-host .dc-header{padding-right:30px}'
   +'.dal-star{position:absolute;top:14px;right:14px;width:28px;height:28px;border-radius:8px;border:1px solid #e2e6f0;background:#fff;color:#8a95b0;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:4;box-shadow:0 1px 4px rgba(20,40,80,.08);transition:.15s}'
   +'.dal-star:hover{border-color:#DC6428;color:#DC6428}'
   +'.dal-star.on{background:#fff7ed;border-color:#fed7aa;color:#DC6428}'
   +'@media(max-width:768px){.dal-ric .dal-tip{display:none}}';
  var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  /* ---- signed-in session (id + token for RLS-scoped calls) ---- */
  function getSession(){
    try{
      var raw=null;
      for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(/^sb-.*-auth-token$/.test(k)){raw=localStorage.getItem(k);break;}}
      if(!raw)return null;
      var s=JSON.parse(raw);
      var sess=(s&&s.access_token)?s:((s&&s.currentSession)?s.currentSession:s);
      var u=(sess&&sess.user)||s.user||null;
      var token=(sess&&sess.access_token)||s.access_token||null;
      if(!u||!token)return null;
      var meta=u.user_metadata||{};
      var name=meta.full_name||meta.name||meta.display_name||(u.email?u.email.split('@')[0]:'')||'User';
      return {id:u.id, token:token, name:name, email:u.email||''};
    }catch(e){return null;}
  }
  function sbHead(tok){return {apikey:SB_ANON,Authorization:'Bearer '+tok,'Content-Type':'application/json'};}

  /* ---- favorites store: localStorage cache + Supabase (per-user, dal_favorites) ---- */
  function getFavs(){try{return JSON.parse(localStorage.getItem(FAV_KEY)||'[]');}catch(e){return [];}}
  function setFavs(a){localStorage.setItem(FAV_KEY,JSON.stringify(a));}
  function isFav(href){return getFavs().some(function(f){return f.href===href;});}
  function toggleFav(item){
    var a=getFavs(), i=-1;
    for(var k=0;k<a.length;k++){if(a[k].href===item.href){i=k;break;}}
    if(i>=0)a.splice(i,1); else a.push(item);
    setFavs(a); renderFlyout(); decorate(); updateCount();
    pushFavs(); // persist to backend for this user (RLS-scoped)
  }
  // Upsert this user's full favorites list to Supabase.
  function pushFavs(){
    var s=getSession(); if(!s)return;
    fetch(SB_URL+'/rest/v1/dal_favorites?on_conflict=user_id',{
      method:'POST',
      headers:Object.assign({},sbHead(s.token),{'Prefer':'resolution=merge-duplicates,return=minimal'}),
      body:JSON.stringify({user_id:s.id,favorites:getFavs(),updated_at:new Date().toISOString()})
    }).catch(function(){});
  }
  // Pull this user's favorites from Supabase (source of truth); migrate local ones up on first use.
  function pullFavs(){
    var s=getSession(); if(!s)return;
    fetch(SB_URL+'/rest/v1/dal_favorites?user_id=eq.'+s.id+'&select=favorites&limit=1',{headers:sbHead(s.token)})
      .then(function(r){return r.ok?r.json():null;})
      .then(function(rows){
        if(!rows)return;
        if(rows.length && Array.isArray(rows[0].favorites)){
          setFavs(rows[0].favorites); renderFlyout(); updateCount(); decorate();
        } else if(getFavs().length){
          pushFavs(); // no backend row yet — seed it from existing local favorites (one-time)
        }
      }).catch(function(){});
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
    +'<button class="dal-ric dal-acct" id="dal-acct"><span class="dal-avatar" id="dal-avatar">–</span><span class="dal-tip" id="dal-acct-tip">Account</span></button>'
    +'<button class="dal-ric" id="dal-signout" title="Sign out">'+ic('logout',21)+'<span class="dal-tip">Sign out</span></button>';
  document.body.appendChild(rail);

  var acctPop=document.createElement('div'); acctPop.className='dal-acct-pop'; acctPop.id='dal-acct-pop';
  acctPop.innerHTML=''
    +'<div class="dal-acct-hd" style="border-bottom:none;padding-bottom:0;margin-bottom:0"><div class="dal-avatar lg" id="dal-acct-av">–</div><div style="min-width:0"><div class="dal-acct-nm" id="dal-acct-nm">—</div><div class="dal-acct-em" id="dal-acct-em"></div></div></div>';
  document.body.appendChild(acctPop);

  var ov=document.createElement('div'); ov.className='dal-fly-ov'; document.body.appendChild(ov);
  var fly=document.createElement('aside'); fly.className='dal-flyout';
  fly.innerHTML=''
    +'<div class="dal-fh"><b>'+ic('star',15,true).replace('style="display:block"','style="display:block;color:#DC6428"')+' Favorites</b><button class="dal-fx" id="dal-flyx">'+ic('x',15)+'</button></div>'
    +'<div class="dal-fb" id="dal-flybody"></div>'
    +'<div class="dal-ffoot">Pin dashboards with the ★ on any card</div>';
  document.body.appendChild(fly);

  // Search — centered command palette (opened by the top-bar pill or Ctrl/⌘K)
  var sov=document.createElement('div'); sov.className='dal-sov'; sov.id='dal-sov';
  sov.innerHTML=''
    +'<div class="dal-spal">'
    +'<div class="dal-sbar">'+ic('search',18).replace('style="display:block"','style="display:block;color:#8a95b0"')+'<input id="dal-srch-in" class="dal-sin" placeholder="Search dashboards…" autocomplete="off"><span class="dal-kbd">esc</span></div>'
    +'<div class="dal-slist" id="dal-srch-body"></div>'
    +'</div>';
  document.body.appendChild(sov);

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

  /* ---- dashboard search ---- */
  var CATALOG=[
    {group:'Grapes',emo:'🍇',items:[
      {n:'Shipments',href:'grapes_overview_branded.html'},
      {n:'Quality Control',href:'daltex_qc.html'},
      {n:'Harvest Funnel',href:'daltex_harvest_funnel.html'},
      {n:'Labor Budget',href:'labor_budget.html?product=Grapes'}
    ]},
    {group:'Mango',emo:'🥭',items:[
      {n:'Shipments',href:'mango_overview.html'},
      {n:'Labor Budget',href:'labor_budget.html?product=Mango'}
    ]},
    {group:'Pomegranate',emo:'🍎',items:[
      {n:'Shipments',href:'pom_overview.html'},
      {n:'Labor Budget',href:'labor_budget.html?product=Pomegranate'}
    ]},
    {group:'Finance',emo:'💰',items:[
      {n:'Labor Budget',href:'labor_budget.html'},
      {n:'Board Review 2026',href:'budget-2026-board-review.html'}
    ]},
    {group:'Project Management',emo:'📋',items:[
      {n:'Procurement',href:'procurement_hub.html'},
      {n:'Inventory',href:'inventory_tracking.html'}
    ]}
  ];
  function renderSearch(q){
    q=(q||'').trim().toLowerCase();
    var body=document.getElementById('dal-srch-body'), html='', hits=0;
    CATALOG.forEach(function(g){
      var matches=g.items.filter(function(it){return !q || it.n.toLowerCase().indexOf(q)>-1 || g.group.toLowerCase().indexOf(q)>-1;});
      if(!matches.length)return;
      hits+=matches.length;
      html+='<div class="dal-sect">'+g.emo+' '+g.group+'</div>'+matches.map(function(it){
        return '<a class="dal-frow" href="'+it.href+'"><span class="dal-femo">'+g.emo+'</span>'
          +'<div style="flex:1;min-width:0"><div class="dal-fnm">'+it.n+'</div><div class="dal-fcx">'+g.group+'</div></div></a>';
      }).join('');
    });
    body.innerHTML=hits?html:'<div class="dal-srch-empty">No dashboards match “'+(q||'')+'”.</div>';
  }
  var searchOpen=false;
  function toggleSearch(v){
    searchOpen=(v===undefined)?!searchOpen:v;
    if(searchOpen)toggleFly(false);
    sov.classList.toggle('on',searchOpen);
    if(searchOpen){ renderSearch(''); var inp=document.getElementById('dal-srch-in'); inp.value=''; setTimeout(function(){inp.focus();},60); }
  }
  sov.addEventListener('click',function(e){ if(e.target===sov)toggleSearch(false); });
  document.getElementById('dal-srch-in').addEventListener('input',function(){renderSearch(this.value);});
  document.addEventListener('keydown',function(e){
    if((e.metaKey||e.ctrlKey)&&String(e.key).toLowerCase()==='k'){e.preventDefault();toggleSearch(true);}
    else if(e.key==='Escape'&&searchOpen){toggleSearch(false);}
  });

  /* ---- top-bar "Search Dashboards" pill (injected into each page's topbar) ---- */
  function injectPill(){
    if(document.getElementById('dal-search-pill'))return;
    var bar=document.querySelector('.topbar'); if(!bar)return;
    var pill=document.createElement('button');
    pill.id='dal-search-pill'; pill.className='dal-search-pill'; pill.type='button';
    pill.innerHTML=ic('search',15)+'<span class="pill-lbl">Search Dashboards</span><span class="dal-kbd2">'+(navigator.platform&&/Mac/i.test(navigator.platform)?'⌘K':'Ctrl K')+'</span>';
    pill.addEventListener('click',function(){toggleSearch(true);});
    var host=bar.querySelector('.topbar-right')||bar.querySelector('.tb-right')||bar.lastElementChild;
    if(host&&host!==bar&&host.appendChild){ host.insertBefore(pill,host.firstChild); if(!host.style.gap)host.style.gap='12px'; }
    else { bar.appendChild(pill); }
  }
  injectPill(); setTimeout(injectPill,600); setTimeout(injectPill,2000);

  /* ---- rail actions ---- */
  document.getElementById('dal-home').addEventListener('click',function(){window.location='index.html';});

  /* ---- account identity + menu ---- */
  function initialsOf(n){var p=(n||'').trim().split(/\s+/);return (((p[0]||'')[0]||'')+((p[1]||'')[0]||'')).toUpperCase()||'?';}
  function renderAcct(){
    var u=getSession();
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
  document.getElementById('dal-signout').addEventListener('click',function(){
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
  // Sync favorites from Supabase for the signed-in user (retry once in case the session loads late).
  pullFavs(); setTimeout(pullFavs,1500);

  window.DalRail={toggleFav:toggleFav,showAccess:showAccess,refresh:function(){renderFlyout();updateCount();decorate();}};
})();
