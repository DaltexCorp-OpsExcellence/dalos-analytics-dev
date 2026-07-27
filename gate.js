/* DalOS session gate v2 — shared across all Analytics content pages.
   Guarantees a fresh, valid Supabase session before any Supabase request goes
   out, so the access-check RPC and every /rest read only ever run as an
   authenticated user with a live JWT. Anon never executes the RPC.

   Per-page access check (optional): set, BEFORE this script loads,
     window.__DALOS_ACCESS_CHECK = { fn:'has_dashboard_access',
                                     args:{ p_product:'grapes', p_dashboard:'qc' } };
   When unset it defaults to has_analytics_access() with no args.

   Workspace target (prod vs -dev) is derived from the URL path, matching the
   existing "-dev/" environment-detection convention — so this file is identical
   in dalos-analytics and dalos-analytics-dev. */
(function(){
  var SB_URL='https://sfyjvgjwvtwkrnqrvqyc.supabase.co';
  var SB_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeWp2Z2p3dnR3a3JucXJ2cXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NzIxNjYsImV4cCI6MjA5MDQ0ODE2Nn0.FjA75XZsp0Kx5Xam_rrnYoAHX4JHKey6vEFCH_zlMuQ';
  var SKEY='sb-sfyjvgjwvtwkrnqrvqyc-auth-token';
  /* Shared idle heartbeat. All DalOS apps sit on one GitHub Pages origin and so
     share localStorage; Vision's inactivity timer polls this key. Writing it here
     means "user is working in Analytics" keeps Vision's timer alive — before this,
     an idle background Vision tab signed the user out of every app after 60 min.
     Must stay byte-identical to DALOS_ACTIVITY_KEY in Vision and Workspace. */
  var DALOS_ACTIVITY_KEY='dalos_last_activity';
  /* supabase-js is pinned so auth behaviour can't change under us via the CDN.
     Asserted against the <script> tag, not a library property — window.supabase.version
     is not reliably exposed. */
  var DALOS_SB_PIN='2.110.8';

  (function(){
    var last=0;
    function mark(){
      var now=Date.now();
      if(now-last<30000) return;      /* one write per 30s is plenty for a 60-min window */
      last=now;
      try{ localStorage.setItem(DALOS_ACTIVITY_KEY,String(now)); }catch(e){}
    }
    ['mousemove','mousedown','keydown','scroll','touchstart','click'].forEach(function(e){
      window.addEventListener(e,mark,{passive:true});
    });
    mark();                            /* opening a dashboard is itself activity */
  })();

  (function(){
    try{
      var tag=document.querySelector('script[src*="supabase-js"]');
      var src=tag&&tag.getAttribute('src')||'';
      if(src.indexOf(DALOS_SB_PIN)<0){
        console.warn('[DalOS] supabase-js is NOT pinned to '+DALOS_SB_PIN+' on this page ('+(src||'no tag found')+
                     '). Auth behaviour may differ from the tested build. Run scripts/check-auth-invariants.sh.');
      }
    }catch(e){}
  })();

  function bounce(){
    var nx=encodeURIComponent(location.pathname.split('/').pop()+location.search+location.hash);
    var dev=location.pathname.indexOf('-dev/')>-1;
    location.replace('https://daltexcorp-opsexcellence.github.io/dalos-workspace'+(dev?'-dev':'')+'/?next='+nx);
  }

  // Supabase data requests are held on this promise until we have a
  // validated/refreshed token (see proceed()). Auth requests are never held.
  var _resolveReady;
  var _ready=new Promise(function(res){_resolveReady=res;});

  // Best-effort synchronous bootstrap token: gives the fetch override and the
  // refresh call *a* bearer to start with. It is deliberately NOT trusted for
  // data reads — those wait for proceed() to validate/refresh. So we do not
  // apply the (buggy) client-clock validity check here; an absent/expired
  // expires_at no longer lets a stale token through to the RPC.
  var boot=null;
  try{
    var raw=localStorage.getItem(SKEY);
    if(raw){
      var s=JSON.parse(raw);
      var sess=(s&&s.access_token)?s:((s&&s.currentSession)?s.currentSession:null);
      if(sess&&sess.access_token){boot=sess.access_token;}
    }
  }catch(e){}
  if(!boot){bounce();throw new Error('DalOS: no session');}
  window.__DALOS_TOKEN=boot;

  // Stamp the current user JWT on Supabase requests. Auth endpoints pass through
  // immediately (a held refresh would deadlock); all other Supabase requests
  // wait until the token is validated so no /rest read leaves with a stale JWT.
  var _f=window.fetch;
  window.fetch=function(u,o){
    o=o||{};
    var url=(typeof u==='string')?u:((u&&u.url)||'');
    if(url.indexOf(SB_URL)===0){
      var send=function(){
        var h=o.headers;
        if(h instanceof Headers){h.set('Authorization','Bearer '+window.__DALOS_TOKEN);}
        else{o.headers=Object.assign({},h||{},{'Authorization':'Bearer '+window.__DALOS_TOKEN});}
        return _f.call(window,u,o);
      };
      if(url.indexOf(SB_URL+'/auth/')===0){return send();}
      return _ready.then(send);
    }
    return _f.call(this,u,o);
  };

  function proceed(sb){
    window.__DALOS_SB=sb;
    // getSession() already refreshes an expired token internally, and does so under
    // supabase-js's cross-tab lock. The previous explicit refreshSession() here fired
    // on EVERY Analytics page load within 15s of expiry — and Analytics is multi-page,
    // so two tabs navigating near expiry raced each other. Let the library serialise it.
    sb.auth.getSession().then(function(r){
      var vs=r&&r.data&&r.data.session;
      if(!vs||!vs.access_token){bounce();return;}     // no valid session -> bounce, RPC never called
      window.__DALOS_TOKEN=vs.access_token;            // only a validated/refreshed token is trusted
      _resolveReady();                                 // release any held Supabase reads
      var chk=window.__DALOS_ACCESS_CHECK;
      var fn=(chk&&chk.fn)||'has_analytics_access';
      var call=(chk&&chk.args)?sb.rpc(fn,chk.args):sb.rpc(fn);
      return call.then(function(a){
        if(!(a&&!a.error&&a.data===true)){bounce();}
      });
    }).catch(function(){bounce();});

    sb.auth.onAuthStateChange(function(ev,s2){
      if(s2&&s2.access_token){window.__DALOS_TOKEN=s2.access_token;}
      /* SIGNED_OUT used to bounce() immediately, which is why Analytics ejected the
         user instantly on any transient sign-out while Vision (which retries) often
         survived. Supabase also fires SIGNED_OUT on refresh-token rotation conflicts
         between tabs, where a valid session is usually present moments later. Retry
         before giving up, and never bounce while offline. Mirrors Vision's handler. */
      if(ev==='SIGNED_OUT'){
        console.warn('[DalOS] SIGNED_OUT received — attempting session recovery before bouncing');
        var attempt=0, delays=[2000,4000,8000];
        function retryOrBounce(){
          if(attempt<delays.length-1){attempt++;setTimeout(recover,delays[attempt]);}
          else{console.warn('[DalOS] session not recoverable — bouncing to Workspace');bounce();}
        }
        function recover(){
          if(typeof navigator!=='undefined'&&!navigator.onLine){setTimeout(recover,10000);return;}
          sb.auth.getSession().then(function(res){
            var s3=res&&res.data&&res.data.session;
            if(s3&&s3.access_token){
              window.__DALOS_TOKEN=s3.access_token;
              console.log('[DalOS] session recovered after SIGNED_OUT — staying on the page');
              return;
            }
            retryOrBounce();
          }).catch(retryOrBounce);
        }
        setTimeout(recover,delays[0]);
      }
    });
  }

  var tries=0;
  function wire(){
    if(!window.supabase){
      if(tries++<100){setTimeout(wire,50);return;}
      bounce();return;
    }
    try{proceed(window.supabase.createClient(SB_URL,SB_ANON));}
    catch(e){bounce();}
  }
  if(document.readyState!=='loading'){wire();}else{document.addEventListener('DOMContentLoaded',wire);}
})();
