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
    sb.auth.getSession().then(function(r){
      var sx=r&&r.data&&r.data.session;
      var now=Date.now();
      // Refresh unless we already hold a session whose expiry is comfortably in
      // the future. Missing session, missing expires_at, or <15s to expiry all
      // force a refresh.
      var ok=sx&&sx.access_token&&sx.expires_at&&((sx.expires_at*1000-now)>15000);
      var step=ok?Promise.resolve({data:{session:sx}}):sb.auth.refreshSession();
      return step.then(function(rr){
        var vs=rr&&rr.data&&rr.data.session;
        if(!vs||!vs.access_token){bounce();return;}   // no valid session -> bounce, RPC never called
        window.__DALOS_TOKEN=vs.access_token;          // only a validated/refreshed token is trusted
        _resolveReady();                               // release any held Supabase reads
        var chk=window.__DALOS_ACCESS_CHECK;
        var fn=(chk&&chk.fn)||'has_analytics_access';
        var call=(chk&&chk.args)?sb.rpc(fn,chk.args):sb.rpc(fn);
        return call.then(function(a){
          if(!(a&&!a.error&&a.data===true)){bounce();}
        });
      });
    }).catch(function(){bounce();});

    sb.auth.onAuthStateChange(function(ev,s2){
      if(s2&&s2.access_token){window.__DALOS_TOKEN=s2.access_token;}
      if(ev==='SIGNED_OUT'){bounce();}
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
