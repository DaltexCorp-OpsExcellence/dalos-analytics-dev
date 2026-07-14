(function(){
  if(window.__dalosSwitcher) return; window.__dalosSwitcher=1;

  var SB_URL='https://sfyjvgjwvtwkrnqrvqyc.supabase.co';
  var SB_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeWp2Z2p3dnR3a3JucXJ2cXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NzIxNjYsImV4cCI6MjA5MDQ0ODE2Nn0.FjA75XZsp0Kx5Xam_rrnYoAHX4JHKey6vEFCH_zlMuQ';
  var SKEY='sb-sfyjvgjwvtwkrnqrvqyc-auth-token';

  function session(){
    try{
      var raw=localStorage.getItem(SKEY); if(!raw) return null;
      var s=JSON.parse(raw);
      return (s&&s.access_token)?s:((s&&s.currentSession)?s.currentSession:null);
    }catch(e){ return null; }
  }

  function build(){
    if(!document.body || document.getElementById('dalos-switcher')) return;
    var isDev = location.pathname.indexOf('/dalos-analytics-dev/')===0;
    var WS = isDev ? 'https://daltexcorp-opsexcellence.github.io/dalos-workspace-dev/' : 'https://daltexcorp-opsexcellence.github.io/dalos-workspace/workspace.html';
    var VISION = isDev ? 'https://daltexcorp-opsexcellence.github.io/dalos-vision-dev/' : 'https://daltexcorp-opsexcellence.github.io/dalos-vision/';

    var APPS = '<svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/><path d="M17 4v6M14 7h6"/></svg>';
    var APPS_S = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/><path d="M17 4v6M14 7h6"/></svg>';
    var GRAPE = '<svg viewBox="0 0 48 48" width="20" height="20" fill="none"><circle cx="24" cy="24" r="17" stroke="currentColor" stroke-width="1.4" opacity=".5"/><g fill="currentColor"><circle cx="24" cy="17" r="3.1"/><circle cx="19" cy="22" r="3.1"/><circle cx="29" cy="22" r="3.1"/><circle cx="21.5" cy="27" r="3.1"/><circle cx="26.5" cy="27" r="3.1"/><circle cx="24" cy="32" r="3.1"/></g><path d="M24 14 V11 Q27 10 29 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg>';
    var CHART = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="5" width="3" height="13"/></svg>';
    var CHEV = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>';

    var st = document.createElement('style');
    st.textContent = '.dsw{position:fixed;right:24px;bottom:24px;z-index:2147483000;display:flex;flex-direction:column;align-items:flex-end;gap:8px;font-family:inherit}'
      + '.dsw-menu{display:flex;flex-direction:column;align-items:flex-end;gap:8px;opacity:0;transform:translateY(8px);pointer-events:none;transition:opacity .18s ease,transform .18s ease}'
      + '.dsw:hover .dsw-menu,.dsw.open .dsw-menu,.dsw:focus-within .dsw-menu{opacity:1;transform:none;pointer-events:auto}'
      + '.dsw-anchor{width:46px;height:46px;border-radius:50%;border:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;background:#2e5d3a;color:#fff;box-shadow:0 2px 10px rgba(0,0,0,.22)}'
      + '.dsw-item{position:relative;display:inline-flex;align-items:center;gap:9px;height:38px;padding:0 10px 0 14px;border-radius:19px;font-size:13px;font-weight:500;cursor:pointer;text-decoration:none;box-shadow:0 2px 8px rgba(0,0,0,.14);flex-direction:row-reverse;white-space:nowrap;background:#fff;color:#2e5d3a;border:1px solid #d7e0d8}'
      + '.dsw-item .dsw-ic{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px}'
      + '.dsw-group{position:relative;display:flex;flex-direction:column;align-items:flex-end;gap:8px}'
      + '.dsw-sub{display:flex;flex-direction:column;align-items:flex-end;gap:6px;max-height:0;overflow:hidden;opacity:0;transition:max-height .2s ease,opacity .18s ease}'
      + '.dsw-group.subopen .dsw-sub{max-height:320px;opacity:1}'
      + '.dsw-chev{transition:transform .2s ease}'
      + '.dsw-group.subopen .dsw-chev{transform:rotate(-90deg)}'
      + '.dsw-sub .dsw-item{height:34px;font-size:12.5px;background:#f4f8f4;border:1px solid #e0e8e0}'
      + '.dsw-empty{font-size:11.5px;color:#8a95b0;padding:6px 12px;background:#fff;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,.1)}';
    document.head.appendChild(st);

    var wrap = document.createElement('div'); wrap.className='dsw'; wrap.id='dalos-switcher';
    wrap.innerHTML =
      '<div class="dsw-menu" role="menu">'
      + '<a class="dsw-item" role="menuitem" tabindex="0" href="'+VISION+'"><span class="dsw-ic">'+GRAPE+'</span><span>DalOS Vision</span></a>'
      + '<a class="dsw-item" role="menuitem" tabindex="0" href="'+WS+'"><span class="dsw-ic">'+APPS_S+'</span><span>Workspace</span></a>'
      + '<div class="dsw-group" id="dsw-dash-group">'
      +   '<button class="dsw-item" id="dsw-dash-btn" type="button"><span class="dsw-ic">'+CHART+'</span><span>Dashboards</span><span class="dsw-chev">'+CHEV+'</span></button>'
      +   '<div class="dsw-sub" id="dsw-dash-sub"></div>'
      + '</div>'
      + '</div>'
      + '<button class="dsw-anchor" aria-label="Open app switcher" aria-expanded="false">'+APPS+'</button>';
    document.body.appendChild(wrap);

    var anchor = wrap.querySelector('.dsw-anchor');
    anchor.addEventListener('click', function(e){ e.stopPropagation(); var o=wrap.classList.toggle('open'); anchor.setAttribute('aria-expanded', o?'true':'false'); });
    document.addEventListener('click', function(){ wrap.classList.remove('open'); anchor.setAttribute('aria-expanded','false'); });

    var group = wrap.querySelector('#dsw-dash-group');
    var dashBtn = wrap.querySelector('#dsw-dash-btn');
    var sub = wrap.querySelector('#dsw-dash-sub');
    // toggle submenu on click; also open on hover of the group
    dashBtn.addEventListener('click', function(e){ e.stopPropagation(); group.classList.toggle('subopen'); if(group.classList.contains('subopen')) loadDashboards(); });
    group.addEventListener('mouseenter', function(){ group.classList.add('subopen'); loadDashboards(); });

    var loaded=false;
    function loadDashboards(){
      if(loaded) return; loaded=true;
      sub.innerHTML='<div class="dsw-empty">Loading…</div>';
      resolveAccess().then(function(dbs){
        var DB=[
          {k:'shipments',name:'Shipments',href:'grapes_overview_branded.html'},
          {k:'qc',name:'Quality Control',href:'daltex_qc.html'},
          {k:'harvest',name:'Harvest Funnel',href:'daltex_harvest_funnel.html'}
        ];
        var allowed=DB.filter(function(d){ return dbs.indexOf(d.k)>=0; });
        if(!allowed.length){ sub.innerHTML='<div class="dsw-empty">No dashboard access</div>'; return; }
        sub.innerHTML = allowed.map(function(d){
          return '<a class="dsw-item" href="'+d.href+'"><span class="dsw-ic">'+CHART+'</span><span>'+d.name+'</span></a>';
        }).join('');
      }).catch(function(){
        loaded=false;
        sub.innerHTML='<div class="dsw-empty">Couldn\u2019t load access</div>';
      });
    }

    function resolveAccess(){
      var sess=session();
      var jwt=sess&&sess.access_token;
      var uid=sess&&sess.user&&sess.user.id;
      if(!jwt||!uid) return Promise.resolve([]);
      var authH={apikey:SB_ANON, Authorization:'Bearer '+jwt};
      // 1) admin sees all
      return fetch(SB_URL+'/rest/v1/users?id=eq.'+uid+'&select=role&limit=1',{headers:authH})
        .then(function(r){ return r.ok?r.json():[]; })
        .then(function(u){
          var role=(u&&u[0]&&u[0].role)||'';
          if(!role){ var m=(sess.user&&sess.user.user_metadata)||{}; role=m.role||m.user_role||''; }
          if(String(role).toLowerCase()==='admin') return ['shipments','qc','harvest'];
          // 2) otherwise read permissions
          return fetch(SB_URL+'/rest/v1/dal_analytics_permissions?user_id=eq.'+uid+'&select=config,expires_at&limit=1',{headers:authH})
            .then(function(r){ return r.ok?r.json():[]; })
            .then(function(p){
              var perm=Array.isArray(p)&&p[0];
              if(!perm) return [];
              if(perm.expires_at && new Date(perm.expires_at)<new Date()) return [];
              var cfg=perm.config||{};
              // This switcher lists GRAPES dashboards, so read grapes access specifically.
              if(cfg.access&&typeof cfg.access==='object'){ return cfg.access.grapes||[]; }
              var lp=cfg.products||[];
              var ok=lp.length===0||lp.indexOf('grapes')>-1;
              return ok?(cfg.dashboards||[]):[];
            });
        });
    }
  }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', build); } else { build(); }
})();
