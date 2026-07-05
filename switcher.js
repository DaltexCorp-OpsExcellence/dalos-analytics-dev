(function(){
  if(window.__dalosSwitcher) return; window.__dalosSwitcher=1;
  function build(){
    if(!document.body || document.getElementById('dalos-switcher')) return;
    var isDev = location.pathname.indexOf('/dalos-analytics-dev/')===0;
    var WS = isDev ? 'https://daltexcorp-opsexcellence.github.io/dalos-workspace-dev/' : 'https://daltexcorp-opsexcellence.github.io/dalos-workspace/workspace.html';
    var VISION = isDev ? 'https://daltexcorp-opsexcellence.github.io/dalos-vision-dev/' : 'https://daltexcorp-opsexcellence.github.io/dalos-vision/';
    var APPS = '<svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/><path d="M17 4v6M14 7h6"/></svg>';
    var APPS_S = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/><path d="M17 4v6M14 7h6"/></svg>';
    var GRAPE = '<svg viewBox="0 0 48 48" width="20" height="20" fill="none"><circle cx="24" cy="24" r="17" stroke="currentColor" stroke-width="1.4" opacity=".5"/><g fill="currentColor"><circle cx="24" cy="17" r="3.1"/><circle cx="19" cy="22" r="3.1"/><circle cx="29" cy="22" r="3.1"/><circle cx="21.5" cy="27" r="3.1"/><circle cx="26.5" cy="27" r="3.1"/><circle cx="24" cy="32" r="3.1"/></g><path d="M24 14 V11 Q27 10 29 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg>';
    var st = document.createElement('style');
    st.textContent = '.dsw{position:fixed;right:24px;bottom:24px;z-index:2147483000;display:flex;flex-direction:column;align-items:flex-end;gap:8px;font-family:inherit}'
      + '.dsw-menu{display:flex;flex-direction:column;align-items:flex-end;gap:8px;opacity:0;transform:translateY(8px);pointer-events:none;transition:opacity .18s ease,transform .18s ease}'
      + '.dsw:hover .dsw-menu,.dsw.open .dsw-menu,.dsw:focus-within .dsw-menu{opacity:1;transform:none;pointer-events:auto}'
      + '.dsw-anchor{width:46px;height:46px;border-radius:50%;border:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;background:#2e5d3a;color:#fff;box-shadow:0 2px 10px rgba(0,0,0,.22)}'
      + '.dsw-item{position:relative;display:inline-flex;align-items:center;gap:9px;height:38px;padding:0 10px 0 14px;border-radius:19px;font-size:13px;font-weight:500;cursor:pointer;text-decoration:none;box-shadow:0 2px 8px rgba(0,0,0,.14);flex-direction:row-reverse;white-space:nowrap;background:#fff;color:#2e5d3a;border:1px solid #d7e0d8}'
      + '.dsw-item .dsw-ic{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px}';
    document.head.appendChild(st);
    var wrap = document.createElement('div'); wrap.className='dsw'; wrap.id='dalos-switcher';
    wrap.innerHTML =
      '<div class="dsw-menu" role="menu">'
      + '<a class="dsw-item" role="menuitem" tabindex="0" href="'+VISION+'"><span class="dsw-ic">'+GRAPE+'</span><span>DalOS Vision</span></a>'
      + '<a class="dsw-item" role="menuitem" tabindex="0" href="'+WS+'"><span class="dsw-ic">'+APPS_S+'</span><span>Workspace</span></a>'
      + '</div>'
      + '<button class="dsw-anchor" aria-label="Open app switcher" aria-expanded="false">'+APPS+'</button>';
    document.body.appendChild(wrap);
    var anchor = wrap.querySelector('.dsw-anchor');
    anchor.addEventListener('click', function(e){ e.stopPropagation(); var o=wrap.classList.toggle('open'); anchor.setAttribute('aria-expanded', o?'true':'false'); });
    document.addEventListener('click', function(){ wrap.classList.remove('open'); anchor.setAttribute('aria-expanded','false'); });
  }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', build); } else { build(); }
})();
