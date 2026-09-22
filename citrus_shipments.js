/* ============================================================
   Citrus Shipments — shared dashboard engine (DalOS Analytics)
   One engine drives every citrus tab. Each page sets
   window.CITRUS_PAGE = {active, type, title, dim, col, label, accent, icon}
   and includes this file + citrus_dash.css. All data-driven.
   ============================================================ */
(function(){
'use strict';
var CFG = window.CITRUS_PAGE || {active:'overview',type:'overview',title:'Overview'};

var SB_URL='https://sfyjvgjwvtwkrnqrvqyc.supabase.co';
var SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeWp2Z2p3dnR3a3JucXJ2cXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NzIxNjYsImV4cCI6MjA5MDQ0ODE2Nn0.FjA75XZsp0Kx5Xam_rrnYoAHX4JHKey6vEFCH_zlMuQ';
var PRODUCT='citrus';

var CAT_COLORS={'Valencia':'#DC6428','Soft Citrus':'#e08e1e','White Orange':'#c9a227','Navel':'#2563EB','Lemon':'#eab308','GrapeFruit':'#e0466b','Grapefruit':'#e0466b'};
var PAL=['#142850','#DC6428','#2563EB','#16a34a','#6d28d9','#0891b2','#e0466b','#d97706','#5a7cc2','#c9a227','#0e7490','#9333ea'];
var GRADE_COL={'1':'#16a34a','1.5':'#84cc16','2':'#d97706','Juicing':'#8a95b0'};
function palColor(name,i){return CAT_COLORS[name]||PAL[i%PAL.length];}

var TABS=[
  {id:'overview',label:'Overview',icon:'ti-layout-dashboard',href:'citrus_overview.html'},
  {id:'category',label:'By Category',icon:'ti-category-2',href:'citrus_bycategory.html'},
  {id:'markets',label:'Markets',icon:'ti-map-pin',href:'citrus_markets.html'},
  {id:'farms',label:'Farms',icon:'ti-building',href:'citrus_farms.html'},
  {id:'varieties',label:'Varieties',icon:'ti-palette',href:'citrus_varieties.html'},
  {id:'clients',label:'Clients',icon:'ti-users',href:'citrus_clients.html'},
  {id:'cartons',label:'Cartons',icon:'ti-box',href:'citrus_cartons.html'},
  {id:'extract',label:'Data Explorer',icon:'ti-database',href:'citrus_extract.html'}
];

var DIM_COL={category:'citrus_type',market:'receiving_country',farm:'farm_source',variety:'variety',source:'source_type',status:'shipping_status',grade:'daltex_class',client:'client',clientclass:'client_class',carton:'carton_type'};
var DIM_LABEL={category:'Category',market:'Market',farm:'Farm',variety:'Variety',source:'Source',status:'Status',grade:'Grade',client:'Client',clientclass:'Client Class',carton:'Carton Type'};

/* filter fields shown in the bar */
var FILTERS=[
  {f:'category',col:'citrus_type',label:'Category',accent:'cat'},
  {f:'week',col:'shipping_week',label:'Week',special:'wk'},
  {f:'status',col:'shipping_status',label:'Status'},
  {f:'source',col:'source_type',label:'Source'},
  {f:'farm',col:'farm_source',label:'Farm'},
  {f:'market',col:'receiving_country',label:'Market'},
  {f:'variety',col:'variety',label:'Variety'},
  {f:'clientclass',col:'client_class',label:'Client Class'}
];
var FIELD_COL={category:'citrus_type',week:'shipping_week',status:'shipping_status',source:'source_type',farm:'farm_source',market:'receiving_country',variety:'variety',clientclass:'client_class'};
var FIELDS=FILTERS.map(function(x){return x.f;});

/* ---- state ---- */
var ROWS=[], FULL_CT=0, FULL_NW=0, DEF_FROM='', DEF_TO='', SEASON='';
var F={from:'',to:''}; FIELDS.forEach(function(f){F[f]=[];});

/* ---- helpers ---- */
function esc(v){return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function ctWS(s){return (s||'').replace(/\s+/g,' ').trim();}
function num(v){return parseFloat(v)||0;}
function fmtT(v){return (Math.round(v*10)/10).toLocaleString('en-GB',{minimumFractionDigits:1,maximumFractionDigits:1});}
function fmtN(v){return Math.round(v).toLocaleString('en-GB');}
function fmtCartons(v){if(v>=1e6)return (v/1e6).toFixed(2)+'M';if(v>=1e3)return (v/1e3).toFixed(0)+'K';return fmtN(v);}
function nw(r){return num(r.net_weight);}
function ctn(r){return parseInt(r.carton_count)||0;}
function ctCount(rows){
  var g={};(rows||[]).forEach(function(r){var cn=ctWS(r.container_number);if(!cn)return;(g[cn]=g[cn]||[]).push(r.loading_date);});
  var t=0;for(var cn in g){var ds=g[cn].filter(Boolean).map(function(d){return +new Date(d+'T00:00:00');}).sort(function(a,b){return a-b;});if(!ds.length){t++;continue;}var c=1,prev=ds[0];for(var i=1;i<ds.length;i++){if((ds[i]-prev)/86400000>7)c++;prev=ds[i];}t+=c;}
  return t;
}
function aggNW(rows,col){var o={};rows.forEach(function(r){var v=ctWS(r[col]);if(v)o[v]=(o[v]||0)+nw(r);});return o;}
function top1(o){var t=Object.entries(o).sort(function(a,b){return b[1]-a[1];})[0];return t?t[0]:'—';}

/* ---- chrome (topbar / tabs / filter bar / content / drill) ---- */
function buildChrome(){
  var tabsHTML=TABS.map(function(t){return '<div class="tab'+(t.id===CFG.active?' on':'')+'"'+(t.id===CFG.active?'':' onclick="location.href=\''+t.href+'\'"')+'><i class="ti '+t.icon+'"></i>'+t.label+'</div>';}).join('');
  var msHTML=FILTERS.map(function(x){return '<div class="ms" data-f="'+x.f+'" data-col="'+x.col+'" data-label="'+x.label+'"'+(x.special?' data-special="'+x.special+'"':'')+(x.accent?' data-accent="'+x.accent+'"':'')+'></div>';}).join('');
  var app=document.getElementById('app');
  app.innerHTML=
  '<div class="shell">'
  +'<div class="topbar">'
    +'<div style="display:flex;align-items:center;gap:0">'
      +'<a href="index.html" style="display:flex;align-items:center;gap:8px;text-decoration:none"><div class="logo-icon">🍊</div><span style="font-size:16px;font-weight:700;letter-spacing:-.3px;margin-left:8px;white-space:nowrap;color:#fff">Dal<span style="color:#DC6428">OS</span> <span style="color:#fff">Analytics</span></span></a>'
      +'<div class="logo-divider"></div>'
      +'<a class="tb-link" href="citrus_hub.html"><i class="ti ti-arrow-left" style="font-size:12px"></i>Citrus</a>'
      +'<span style="color:rgba(255,255,255,.2);margin:0 8px;font-size:14px">/</span>'
      +'<span style="font-size:12px;font-weight:600;color:rgba(255,255,255,.9)">Citrus Shipments</span>'
    +'</div>'
    +'<div style="display:flex;align-items:center;gap:8px">'
      +'<div class="tbadge tbadge-warn" id="season-badge"><i class="ti ti-clock" style="font-size:11px"></i> <span>Season</span></div>'
      +'<div class="tbadge tbadge-live"><i class="ti ti-table" style="font-size:11px"></i> Excel Data</div>'
    +'</div>'
  +'</div>'
  +'<div class="tabs">'+tabsHTML+'</div>'
  +'<div class="main"><div class="page">'
    +'<div class="page-header"><div><div class="page-title">Citrus Shipments <span>— '+esc(CFG.title||'')+'</span></div><div class="page-subtitle" id="page-sub">Loading season data…</div></div></div>'
    +'<div class="fbar"><div class="fbar-top">'
      +'<span class="fbar-label"><i class="ti ti-sliders-horizontal"></i> Filters</span><div class="fbar-sep"></div>'
      +'<div class="date-grp"><span class="date-lbl">From</span><input type="date" class="finput" id="f-from" onchange="CIT.applyFilters()"></div>'
      +'<div class="date-grp"><span class="date-lbl">To</span><input type="date" class="finput" id="f-to" onchange="CIT.applyFilters()"></div>'
      +'<div class="fbar-sep"></div>'+msHTML
      +'<div class="factions"><button class="fbtn fbtn-reset" onclick="CIT.resetFilters()"><i class="ti ti-refresh" style="font-size:11px"></i> Reset</button></div>'
    +'</div><div class="fctx" id="fctx"></div></div>'
    +'<div id="content"></div>'
  +'</div></div>'
  +'</div>'
  +drillModalHTML();
  document.getElementById('content').innerHTML=contentSkeleton();
}
function drillModalHTML(){
  return '<div class="drill-ov" id="drill-ov" onclick="if(event.target===this)CIT.closeDrill()">'
    +'<div class="drill-modal">'
      +'<div class="drill-head"><div><div class="drill-title" id="drill-title"></div><div class="drill-sub" id="drill-sub"></div></div><button class="drill-x" onclick="CIT.closeDrill()">&times;</button></div>'
      +'<div class="drill-body" id="drill-body"></div>'
    +'</div></div>';
}
function contentSkeleton(){
  if(CFG.type==='overview') return ''
    +'<div class="kgrid" id="kpi-grid"></div><div class="wide-stats" id="wide-stats"></div>'
    +'<div class="grid2" style="margin-top:14px"><div class="chart-card"><div class="cc-title">Weekly net weight (tonnes)</div><div class="cc-sub" id="chart-period">By shipping week</div><div id="weekly-chart"></div></div>'
    +'<div class="chart-card"><div class="cc-title">Volume split</div><div class="cc-sub">Category mix, source & status</div>'
    +'<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text3);margin-bottom:10px">Category mix</div><div id="category-donut"></div>'
    +'<div class="section-divider"></div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text3);margin-bottom:8px">Source type</div><div class="src-grid" id="src-split"></div>'
    +'<div class="section-divider"></div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text3);margin-bottom:8px">Shipping status</div><div class="status-bar" id="status-bar"></div><div class="status-legend" id="status-legend"></div></div></div>'
    +'<div class="grid3"><div class="chart-card"><div class="cc-title">Top markets</div><div class="cc-sub">Net weight by receiving country</div><div class="bar-list" id="chart-markets"></div></div>'
    +'<div class="chart-card"><div class="cc-title">Farm contribution</div><div class="cc-sub">Net weight by farm source</div><div class="bar-list" id="chart-farms"></div></div>'
    +'<div class="chart-card"><div class="cc-title">Variety</div><div class="cc-sub">Net weight by variety</div><div class="bar-list" id="chart-varieties"></div></div></div>'
    +insightsHTML()+aiHTML();
  if(CFG.type==='category') return ''
    +'<div class="wide-stats" id="cat-stats"></div>'
    +'<div class="panel"><div class="p-title">Category ranking</div><div class="p-sub">Net weight by citrus category · click a row for the full deep-dive</div><div id="cat-leader"></div></div>'
    +'<div style="margin-bottom:14px"><div class="p-title" style="margin-bottom:12px">All categories <span style="font-weight:500;color:var(--text3);font-size:11px">— click any card for its analysis</span></div><div class="cat-grid" id="cat-cards"></div></div>'
    +'<div class="panel"><div class="p-title">Category comparison</div><div class="p-sub">All metrics side by side · click a row to drill</div><div class="dtbl-wrap"><table class="dtbl"><thead><tr><th>Category</th><th class="num">Net (T)</th><th class="num">Cartons</th><th class="num">Share</th><th class="num">Containers</th><th class="num">Class 1</th><th>Top market</th><th>Top variety</th></tr></thead><tbody id="cat-tbody"></tbody></table></div></div>'
    +insightsHTML();
  if(CFG.type==='dimension') return ''
    +'<div class="kgrid k4" id="kpi-grid"></div>'
    +'<div class="panel"><div class="p-title">'+esc(CFG.label)+' ranking</div><div class="p-sub">Net weight by '+esc(CFG.label.toLowerCase())+' · click a row for the full deep-dive</div><div id="dim-leader"></div></div>'
    +'<div class="panel"><div class="p-title">Weekly net weight (tonnes)</div><div class="p-sub" id="dim-weeksub">Top '+esc(CFG.label.toLowerCase())+' groups by shipping week</div><div id="dim-weekly"></div><div class="chart-legend" id="dim-weekly-legend"></div></div>'
    +'<div class="panel"><div class="p-title">'+esc(CFG.label)+' comparison</div><div class="p-sub">All metrics side by side · click a row to drill</div><div class="dtbl-wrap"><table class="dtbl"><thead><tr><th>'+esc(CFG.label)+'</th><th class="num">Net (T)</th><th class="num">Cartons</th><th class="num">Share</th><th class="num">Containers</th><th class="num">Class 1</th><th>Top category</th><th>Top market</th></tr></thead><tbody id="dim-tbody"></tbody></table></div></div>'
    +insightsHTML()+aiHTML();
  if(CFG.type==='extract') return ''
    +'<div class="panel"><div class="ex-toolbar"><input class="ex-search" id="ex-search" placeholder="Search across all columns…" oninput="CIT.exFilter(this.value)"><span class="ex-count" id="ex-count"></span><button class="fbtn fbtn-nv" onclick="CIT.exCopy(event)"><i class="ti ti-copy" style="font-size:12px"></i> Copy (TSV)</button></div>'
    +'<div class="dtbl-wrap" style="max-height:70vh;overflow:auto"><table class="dtbl" id="ex-tbl"><thead id="ex-thead"></thead><tbody id="ex-tbody"></tbody></table></div>'
    +'<div class="drill-note" id="ex-note"></div></div>';
  return '';
}
function insightsHTML(){return '<div class="insights-card"><div class="ins-header"><div class="ins-title"><i class="ti ti-bulb"></i>Auto Insights</div><span class="ins-badge" id="ins-count">insights</span></div><div id="ins-body"></div></div>';}
function aiHTML(){
  return '<div class="ai-card"><div class="ai-header"><div class="ai-title"><i class="ti ti-sparkles"></i>AI Insight Search</div><span class="ai-badge">Claude · '+esc(CFG.title||'')+' context</span></div>'
    +'<div class="ai-sugs">'
      +'<div class="ai-sug" onclick="CIT.aiQ(\'What are the biggest risks in this view?\')">Key risks</div>'
      +'<div class="ai-sug" onclick="CIT.aiQ(\'Where is our volume most concentrated and why is that a risk?\')">Concentration</div>'
      +'<div class="ai-sug" onclick="CIT.aiQ(\'What stands out in the category mix?\')">Category mix</div>'
      +'<div class="ai-sug" onclick="CIT.aiQ(\'Compare Daltex farms vs outsourced supply\')">Daltex vs outsource</div>'
      +'<div class="ai-sug" onclick="CIT.aiQ(\'What is driving the grade and juicing split?\')">Grade split</div>'
    +'</div>'
    +'<div class="ai-row"><input class="ai-input" id="ai-in" placeholder="Ask anything about this citrus view..."><button class="ai-btn" id="ai-btn" onclick="CIT.runAI()"><i class="ti ti-sparkles"></i> Generate</button></div>'
    +'<div class="ai-loading" id="ai-load"><div class="ai-spinner"></div>Analysing season data...</div>'
    +'<div class="ai-result" id="ai-res"><div class="ai-res-label"><i class="ti ti-sparkles"></i><span id="ai-q-label"></span></div><div id="ai-res-text"></div></div></div>';
}

/* ---- data load ---- */
function load(){
  fetch(SB_URL+'/rest/v1/grapes_shipments_view?product_id=eq.'+PRODUCT+'&select=*',{headers:{apikey:SB_KEY,Authorization:'Bearer '+SB_KEY,Range:'0-99999'}})
  .then(function(r){if(!r.ok)throw new Error('SB '+r.status);return r.json();})
  .then(function(rows){
    ROWS=rows; FULL_CT=ctCount(ROWS); FULL_NW=ROWS.reduce(function(a,r){return a+nw(r);},0);
    var lds=ROWS.map(function(x){return x.loading_date;}).filter(Boolean).sort();
    if(lds.length){DEF_FROM=lds[0];DEF_TO=lds[lds.length-1];F.from=DEF_FROM;F.to=DEF_TO;var ff=document.getElementById('f-from'),ft=document.getElementById('f-to');ff.value=DEF_FROM;ff.min=DEF_FROM;ff.max=DEF_TO;ft.value=DEF_TO;ft.min=DEF_FROM;ft.max=DEF_TO;}
    SEASON=(ROWS.find(function(x){return x.season_year;})||{}).season_year||'';
    var sb=document.getElementById('season-badge'); if(sb) sb.querySelector('span').textContent='Season '+SEASON;
    document.querySelectorAll('.tbadge-live').forEach(function(b){b.innerHTML='<span class="live-dot"></span> Live · '+ROWS.length+' shipments';b.style.background='rgba(22,163,74,.2)';b.style.color='#6ee7a0';b.style.border='1px solid rgba(22,163,74,.3)';});
    buildMS(); refreshFilterOptions(); renderAll();
  })
  .catch(function(e){console.warn('Citrus engine: data unavailable:',e.message);var s=document.getElementById('page-sub');if(s)s.textContent='Could not load season data — sign in and retry.';document.querySelectorAll('.tbadge-live').forEach(function(b){b.innerHTML='⚠ Offline';b.style.background='rgba(220,100,40,.2)';b.style.color='#ffb380';});});
}

/* ---- filters ---- */
function inSel(a,v){return !a||a.length===0||a.indexOf(v)>-1;}
function passField(r,f){if(f==='week')return inSel(F.week,String(parseInt(r.shipping_week)||0));return inSel(F[f],ctWS(r[FIELD_COL[f]]));}
function filteredRows(){return ROWS.filter(function(r){var d=r.loading_date||'';if(d<F.from||d>F.to)return false;for(var i=0;i<FIELDS.length;i++){if(F[FIELDS[i]].length&&!passField(r,FIELDS[i]))return false;}return true;});}
function rowsExcept(skip){return ROWS.filter(function(r){var d=r.loading_date||'';if(d<F.from||d>F.to)return false;for(var i=0;i<FIELDS.length;i++){var f=FIELDS[i];if(f!==skip&&F[f].length&&!passField(r,f))return false;}return true;});}
function msVal(r,f){if(f==='week')return String(parseInt(r.shipping_week)||0);return ctWS(r[FIELD_COL[f]]);}

function buildMS(){
  document.querySelectorAll('.ms[data-f]').forEach(function(el){
    var fld=el.dataset.f,col=el.dataset.col,special=el.dataset.special,accent=el.dataset.accent;
    var vals=special==='wk'
      ?Array.from(new Set(ROWS.map(function(r){return String(parseInt(r.shipping_week)||0);}).filter(function(v){return v!=='0';}))).sort(function(a,b){return +a-+b;})
      :Array.from(new Set(ROWS.map(function(r){return ctWS(r[col]);}).filter(function(x){return x!=null&&String(x).trim()!=='';}))).map(function(x){return String(x).trim();}).sort();
    el.innerHTML='<button class="ms-btn'+(accent==='cat'?' ms-cat':'')+'" onclick="CIT.toggleDD(event,this)"><span class="ms-lbl">'+(el.dataset.label||'All')+'</span><span class="cnt" style="display:none"></span><i class="ti ti-chevron-down" style="font-size:10px"></i></button>'
      +'<div class="ms-dd"><div style="padding:4px 6px;border-bottom:1px solid var(--border);position:sticky;top:0;background:#fff;z-index:2"><input type="text" placeholder="Search\u2026" style="width:100%;padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:11px;outline:none;font-family:inherit;box-sizing:border-box" oninput="CIT.filterMS(this,\''+fld+'\')" onclick="event.stopPropagation()"></div>'
      +'<label class="ms-opt ms-all"><input type="checkbox" checked onchange="CIT.msAll(\''+fld+'\',this)"> All</label>'
      +vals.map(function(v){return '<label class="ms-opt" data-val="'+esc(v).toLowerCase()+'"><input type="checkbox" data-v="'+esc(v)+'" onchange="CIT.msPick(\''+fld+'\')"> '+esc(special==='wk'?('Week '+v):v)+'</label>';}).join('')
      +'</div>';
  });
  document.addEventListener('click',function(e){if(!e.target.closest('.ms'))document.querySelectorAll('.ms-dd').forEach(function(d){d.classList.remove('open');});});
}
function syncMS(el,fld){var n=F[fld].length,lbl=el.querySelector('.ms-lbl'),cnt=el.querySelector('.cnt'),special=el.dataset.special,label=el.dataset.label||'All';if(n===0){lbl.textContent=label;cnt.style.display='none';}else if(n===1){lbl.textContent=special==='wk'?('Week '+F[fld][0]):F[fld][0];cnt.style.display='none';}else{lbl.textContent=label;cnt.style.display='';cnt.textContent=n;}}
function refreshFilterOptions(){
  document.querySelectorAll('.ms[data-f]').forEach(function(el){
    var fld=el.dataset.f;var avail=new Set(rowsExcept(fld).map(function(r){return msVal(r,fld);}).filter(Boolean));
    el.querySelectorAll('.ms-opt:not(.ms-all)').forEach(function(opt){var inp=opt.querySelector('input[data-v]');if(!inp)return;var ok=avail.has(inp.dataset.v)||inp.checked;if(ok){opt.classList.remove('ms-unavail');opt.style.display='';}else{opt.classList.add('ms-unavail');opt.style.display='none';}});
  });
}

/* ---- render dispatch ---- */
function renderAll(){
  var rows=filteredRows();
  renderContext(rows);
  if(CFG.type==='overview') renderOverview(rows);
  else if(CFG.type==='category') renderCategory(rows);
  else if(CFG.type==='dimension') renderDimension(rows);
  else if(CFG.type==='extract') renderExtract(rows);
}
function renderContext(rows){
  var el=document.getElementById('fctx');if(!el)return;
  var fmt=function(d){return new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short'});};
  var labels={category:'Category',week:'Week',status:'Status',source:'Source',farm:'Farm',market:'Market',variety:'Variety',clientclass:'Client Class'};
  var out=[];if(F.from!==DEF_FROM||F.to!==DEF_TO)out.push({label:fmt(F.from)+' – '+fmt(F.to),key:'date',val:''});
  FIELDS.forEach(function(k){(F[k]||[]).forEach(function(v){out.push({label:labels[k]+': '+(k==='week'?('Week '+v):v),key:k,val:v});});});
  var totNw=rows.reduce(function(a,r){return a+nw(r);},0), ct=ctCount(rows);
  if(!out.length){el.classList.remove('show');el.innerHTML='';return;}
  el.classList.add('show');
  el.innerHTML=out.map(function(c){return '<span class="fctx-chip">'+esc(c.label)+'<button onclick="CIT.removeChip(\''+c.key+'\',\''+String(c.val).replace(/'/g,"\\'")+'\')"><i class="ti ti-x" style="font-size:9px"></i></button></span>';}).join('')
    +'<span class="ctx-note"><b>'+fmtT(totNw)+'T</b> · '+ct+' containers</span>';
}

/* ---- shared sub-renderers ---- */
function barList(elId,entries,accent,dim){
  var sorted=entries.slice().sort(function(a,b){return b[1]-a[1];}).slice(0,6);
  var maxV=sorted[0]?sorted[0][1]:1, tot=entries.reduce(function(a,e){return a+e[1];},0);
  var el=document.getElementById(elId);if(!el)return;
  if(!sorted.length){el.innerHTML='<div class="d-empty">No data</div>';return;}
  el.innerHTML=sorted.map(function(e){var k=e[0],v=e[1];return '<div class="bar-item'+(dim?' clickable':'')+'"'+(dim?' data-dim="'+dim+'" data-val="'+esc(k)+'" title="Click for analysis"':'')+'><div class="bar-row"><span class="bar-name">'+esc(k)+'</span><span class="bar-vals">'+fmtT(v)+'T<span class="bar-contrib">'+(tot>0?'('+(v/tot*100).toFixed(1)+'%)':'')+'</span></span></div><div class="bar-track"><div class="bar-fill" style="width:'+(v/maxV*100)+'%;background:'+accent+'"></div></div></div>';}).join('');
}
function weeklyBars(host,byWeek,color){
  var weeks=Object.keys(byWeek).map(Number).filter(function(w){return w;}).sort(function(a,b){return a-b;});
  if(!weeks.length){host.innerHTML='<div class="d-empty">No data in range</div>';return;}
  var maxV=Math.max.apply(null,weeks.map(function(w){return byWeek[w];}).concat([1]));
  var H=140,bW=weeks.length>26?15:26,gap=weeks.length>26?6:12,left=40,top=18,totalW=left+weeks.length*(bW+gap)+18;
  var svg='';
  [0,.5,1].forEach(function(f){var y=top+(1-f)*(H-top);svg+='<line x1="'+left+'" y1="'+y+'" x2="'+totalW+'" y2="'+y+'" stroke="var(--border)" stroke-width="1"'+(f===0?'':' stroke-dasharray="4,3"')+'/><text x="'+(left-6)+'" y="'+(y+4)+'" font-size="9" fill="var(--text3)" text-anchor="end" font-family="var(--mono)">'+Math.round(maxV*f)+'</text>';});
  weeks.forEach(function(w,i){var v=byWeek[w],x=left+i*(bW+gap),bH=Math.max(3,v/maxV*(H-top)),y=H-bH;svg+='<rect x="'+x+'" y="'+y+'" width="'+bW+'" height="'+bH+'" rx="3" fill="'+color+'"><title>Week '+w+': '+fmtT(v)+'T</title></rect>';if(weeks.length<=30)svg+='<text x="'+(x+bW/2)+'" y="'+(y>14?y-4:y+11)+'" font-size="8" fill="'+(y>14?'var(--navy)':'#fff')+'" text-anchor="middle" font-weight="600" font-family="var(--mono)">'+Math.round(v)+'</text>';if(weeks.length<=40)svg+='<text x="'+(x+bW/2)+'" y="'+(H+14)+'" font-size="9" fill="var(--text3)" text-anchor="middle">'+w+'</text>';});
  host.innerHTML='<svg width="'+totalW+'" height="'+(H+20)+'" viewBox="0 0 '+totalW+' '+(H+20)+'" preserveAspectRatio="xMinYMid meet" style="overflow:visible;max-width:100%">'+svg+'</svg>';
}
function donut(host,entries,colorFn,centerTop,centerBot,dim){
  var data=entries.filter(function(e){return e[1]>0;}).sort(function(a,b){return b[1]-a[1];});
  var tot=data.reduce(function(t,e){return t+e[1];},0);
  if(!tot){host.innerHTML='<div class="d-empty">No data</div>';return;}
  var r=34,ri=20,cx=40,cy=40,angle=-Math.PI/2,paths='';
  data.forEach(function(e,i){var slice=e[1]/tot*2*Math.PI,a1=angle,a2=angle+slice;angle=a2;var large=slice>Math.PI?1:0;
    var ox1=cx+r*Math.cos(a1),oy1=cy+r*Math.sin(a1),ox2=cx+r*Math.cos(a2),oy2=cy+r*Math.sin(a2),ix2=cx+ri*Math.cos(a2),iy2=cy+ri*Math.sin(a2),ix1=cx+ri*Math.cos(a1),iy1=cy+ri*Math.sin(a1);
    paths+='<path d="M'+ox1+','+oy1+' A'+r+','+r+' 0 '+large+' 1 '+ox2+','+oy2+' L'+ix2+','+iy2+' A'+ri+','+ri+' 0 '+large+' 0 '+ix1+','+iy1+' Z" fill="'+colorFn(e[0],i)+'" stroke="white" stroke-width="1.5"/>';});
  paths+='<text x="'+cx+'" y="'+(cy-1)+'" text-anchor="middle" font-size="10" font-weight="700" fill="var(--navy)" font-family="var(--mono)">'+centerTop+'</text><text x="'+cx+'" y="'+(cy+9)+'" text-anchor="middle" font-size="7" fill="var(--text3)" font-family="var(--mono)">'+centerBot+'</text>';
  var rows=data.map(function(e,i){return '<div class="donut-row'+(dim?' clickable':'')+'"'+(dim?' data-dim="'+dim+'" data-val="'+esc(e[0])+'" title="Click for analysis"':'')+'><div class="donut-name"><div class="donut-swatch" style="background:'+colorFn(e[0],i)+'"></div>'+esc(e[0])+'</div><div class="donut-val">'+fmtT(e[1])+'T · '+(e[1]/tot*100).toFixed(1)+'%</div></div>';}).join('');
  host.innerHTML='<div class="donut-wrap"><svg width="80" height="80" viewBox="0 0 80 80">'+paths+'</svg><div class="donut-legend">'+rows+'</div></div>';
}

/* ---- OVERVIEW ---- */
function renderOverview(rows){
  var byWeek={};rows.forEach(function(r){var w=parseInt(r.shipping_week)||0;if(w)byWeek[w]=(byWeek[w]||0)+nw(r);});
  var totNw=rows.reduce(function(a,r){return a+nw(r);},0), cartons=rows.reduce(function(a,r){return a+ctn(r);},0), ct=ctCount(rows);
  var cats=aggNW(rows,'citrus_type'), mkts=aggNW(rows,'receiving_country'), farms=aggNW(rows,'farm_source'), vars_=aggNW(rows,'variety'), srcs=aggNW(rows,'source_type'), stats=aggNW(rows,'shipping_status'), grades=aggNW(rows,'daltex_class');
  var c1=grades['1']||0, juic=grades['Juicing']||0;
  var dal=srcs['Daltex Farms']||0, totSrc=Object.values(srcs).reduce(function(a,v){return a+v;},0), dalPct=totSrc>0?dal/totSrc*100:0;
  var cov=FULL_NW>0?totNw/FULL_NW*100:0;
  var topMkt=Object.entries(mkts).sort(function(a,b){return b[1]-a[1];})[0]||['—',0];
  var topCat=Object.entries(cats).sort(function(a,b){return b[1]-a[1];})[0]||['—',0];
  var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var lds=ROWS.map(function(x){return x.loading_date;}).filter(Boolean).sort();
  var sub=document.getElementById('page-sub');
  if(sub&&lds.length){var d0=new Date(lds[0]+'T00:00:00'),d1=new Date(lds[lds.length-1]+'T00:00:00');sub.textContent='Season '+SEASON+' · '+d0.getDate()+' '+MON[d0.getMonth()]+' – '+d1.getDate()+' '+MON[d1.getMonth()]+' '+d1.getFullYear()+' · '+FULL_CT+' containers · '+Object.keys(mkts).length+' markets';}
  document.getElementById('kpi-grid').innerHTML=[
    kcard('Total net weight',fmtT(totNw),'T',pill(fmtCartons(cartons)+' cartons','kp-nv'),pill(cov.toFixed(1)+'% of season','kp-nt'),ct+' containers · '+Object.keys(mkts).length+' markets','var(--navy)',cov,'var(--navy)'),
    kcard('Class 1 share',(totNw>0?c1/totNw*100:0).toFixed(1),'%',pill(fmtT(c1)+'T Class 1','kp-nt'),juic>0?pill((totNw>0?juic/totNw*100:0).toFixed(1)+'% Juicing','kp-or'):'','Grades: '+gradeStr(grades),'var(--navy)',totNw>0?c1/totNw*100:0,'var(--navy)'),
    kcard('Containers shipped',ct,'',pill(Object.keys(mkts).length+' markets','kp-nv'),pill(Object.keys(farms).length+' farms','kp-nt'),fmtCartons(cartons)+' cartons in scope','var(--blue)',FULL_CT?ct/FULL_CT*100:0,'var(--blue)'),
    kcard('Daltex farms share',dalPct.toFixed(1),'%',pill(fmtT(dal)+'T insource','kp-nv'),pill(fmtT(totSrc-dal)+'T outsource','kp-nt'),(100-dalPct).toFixed(1)+'% external grower farms','var(--navy)',dalPct,'var(--navy)'),
    kcard('Top market share',(totNw>0?topMkt[1]/totNw*100:0).toFixed(1),'%',pill(topMkt[0],'kp-or'),pill(fmtT(topMkt[1])+'T','kp-nt'),Object.keys(mkts).length+' receiving markets','var(--orange)',totNw>0?topMkt[1]/totNw*100:0,'var(--orange)',topMkt[0]!=='—'?{dim:'market',val:topMkt[0]}:null),
    kcard('Leading category',topCat[0],'',pill((totNw>0?topCat[1]/totNw*100:0).toFixed(1)+'% share','kp-or'),pill(fmtT(topCat[1])+'T','kp-nt'),Object.keys(cats).length+' categories in scope','var(--orange)',totNw>0?topCat[1]/totNw*100:0,'var(--orange)',topCat[0]!=='—'?{dim:'category',val:topCat[0]}:null)
  ].join('');
  // wide stats
  var byDate={};rows.forEach(function(r){if(r.loading_date)byDate[r.loading_date]=(byDate[r.loading_date]||0)+nw(r);});
  var wks=Object.keys(byWeek),days=Object.keys(byDate);
  var peakDay=Object.entries(byDate).sort(function(a,b){return b[1]-a[1];})[0]||['—',0];
  var peakWk=Object.entries(byWeek).sort(function(a,b){return b[1]-a[1];})[0]||['—',0];
  document.getElementById('wide-stats').innerHTML=[
    ws('Avg daily volume',fmtT(days.length?totNw/days.length:0),'T/day',days.length+' active loading days'),
    ws('Avg weekly volume',fmtT(wks.length?totNw/wks.length:0),'T/wk',wks.length+' active weeks'),
    ws('Peak loading day',fmtT(peakDay[1]),'T',peakDay[0]!=='—'?new Date(peakDay[0]).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'—',true),
    ws('Peak week',fmtT(peakWk[1]),'T','Week '+peakWk[0]+' · '+(totNw>0?(peakWk[1]/totNw*100).toFixed(1):0)+'% of volume',true)
  ].join('');
  weeklyBars(document.getElementById('weekly-chart'),byWeek,'var(--navy)');
  var fmt=function(d){return new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short'});};
  document.getElementById('chart-period').textContent=fmt(F.from)+' – '+fmt(F.to)+' · net weight by shipping week';
  donut(document.getElementById('category-donut'),Object.entries(cats),palColor,fmtCartons(cartons),'cartons','category');
  renderSrc(srcs); renderStatus(stats);
  barList('chart-markets',Object.entries(mkts),'var(--navy)','market');
  barList('chart-farms',Object.entries(farms),'var(--orange)','farm');
  barList('chart-varieties',Object.entries(vars_),'#5a7cc2','variety');
  renderInsights(rows,{totNw:totNw,cartons:cartons,ct:ct,cats:cats,mkts:mkts,farms:farms,grades:grades,c1:c1,juic:juic,dalPct:dalPct,dal:dal,outsrc:totSrc-dal,cov:cov});
}
function ws(label,val,unit,sub,hi){return '<div class="ws-item"><div class="ws-label">'+label+'</div><div class="ws-val'+(hi?' ws-highlight':'')+'">'+val+'<span class="ws-unit"> '+unit+'</span></div><div class="ws-sub">'+sub+'</div></div>';}
function gradeStr(grades){var e=Object.entries(grades).sort(function(a,b){return b[1]-a[1];});return e.length?e.map(function(g){return g[0]+' '+fmtT(g[1])+'T';}).join(' · '):'—';}
function kcard(label,val,unit,p1,p2,sub,stripe,barPct,barCol,drill){
  var da=drill?' clickable" data-dim="'+drill.dim+'" data-val="'+esc(drill.val)+'" title="Click for analysis':'';
  return '<div class="kcard'+da+'"><div class="kcard-stripe" style="background:'+stripe+'"></div><div class="kcard-label">'+label+'</div><div class="kcard-val">'+val+(unit?'<span class="kcard-unit"> '+unit+'</span>':'')+'</div><div class="kcard-meta">'+(p1||'')+(p2||'')+'</div><div class="kcard-sub">'+sub+'</div><div class="kcard-bar"><div class="kcard-bar-fill" style="width:'+Math.max(0,Math.min(barPct,100))+'%;background:'+barCol+'"></div></div></div>';
}
function pill(t,c){return '<span class="kpill '+c+'">'+t+'</span>';}
function renderSrc(srcs){
  var d=srcs['Daltex Farms']||0, o=Object.entries(srcs).filter(function(e){return e[0]!=='Daltex Farms';}).reduce(function(a,e){return a+e[1];},0), tot=d+o;
  var el=document.getElementById('src-split');if(!el)return;
  el.innerHTML='<div class="src-box clickable" data-dim="source" data-val="Daltex Farms" title="Click for analysis" style="background:#eff3fb;border-color:#cdd3e3"><div class="src-val" style="color:var(--navy)">'+(tot>0?(d/tot*100).toFixed(1):0)+'%</div><div class="src-lbl" style="color:var(--navy)">Daltex Farms</div><div class="src-sub">'+fmtT(d)+' T</div></div>'
    +'<div class="src-box clickable" data-dim="source" data-val="Out Source" title="Click for analysis" style="background:var(--orange-lt);border-color:#f4c9af"><div class="src-val" style="color:var(--orange)">'+(tot>0?(o/tot*100).toFixed(1):0)+'%</div><div class="src-lbl" style="color:var(--orange)">Out Source</div><div class="src-sub">'+fmtT(o)+' T</div></div>';
}
function renderStatus(stats){
  var STCOL={'Delivered':{bg:'var(--green-bg)',fg:'var(--green)',dot:'var(--green)'},'Shipped':{bg:'var(--blue-bg)',fg:'var(--blue)',dot:'var(--blue)'},'Returned':{bg:'var(--red-bg)',fg:'var(--red)',dot:'var(--red)'}};
  var data=Object.entries(stats).filter(function(e){return e[1]>0;}).sort(function(a,b){return b[1]-a[1];}), tot=data.reduce(function(t,e){return t+e[1];},0);
  var bar=document.getElementById('status-bar'),leg=document.getElementById('status-legend');if(!bar)return;
  if(!tot){bar.innerHTML='';leg.innerHTML='<div class="d-empty">No data</div>';return;}
  bar.innerHTML=data.map(function(e){var p=e[1]/tot*100,c=STCOL[e[0]]||{bg:'var(--bg2)',fg:'var(--text2)'};return '<div class="status-seg" style="flex:'+p+';background:'+c.bg+';color:'+c.fg+'">'+(p>=6?p.toFixed(0)+'%':'')+'</div>';}).join('');
  leg.innerHTML=data.map(function(e){var c=STCOL[e[0]]||{dot:'var(--text3)'};return '<div class="sl-item clickable" data-dim="status" data-val="'+esc(e[0])+'" title="Click for analysis"><div class="sl-dot" style="background:'+(c.dot||'var(--text3)')+'"></div>'+esc(e[0])+' · '+fmtT(e[1])+'T</div>';}).join('');
}
function renderInsights(rows,s){
  var body=document.getElementById('ins-body');if(!body)return;
  var ins=[];
  var topCat=Object.entries(s.cats).sort(function(a,b){return b[1]-a[1];})[0]||['—',0];
  var topMkt=Object.entries(s.mkts).sort(function(a,b){return b[1]-a[1];})[0]||['—',0];
  var topFarm=Object.entries(s.farms).sort(function(a,b){return b[1]-a[1];})[0]||['—',0];
  var topMktPct=s.totNw>0?topMkt[1]/s.totNw*100:0;
  if(topCat[0]!=='—')ins.push({t:'or',i:'ti-lemon-2',lbl:'Leading category',txt:'<b>'+esc(topCat[0])+' leads at '+(s.totNw>0?(topCat[1]/s.totNw*100).toFixed(1):0)+'% ('+fmtT(topCat[1])+'T).</b> '+Object.keys(s.cats).length+' citrus categories shipped in scope.'});
  if(topMkt[0]!=='—')ins.push({t:topMktPct>50?'wn':'nt',i:topMktPct>50?'ti-alert-triangle':'ti-map-pin',lbl:'Market concentration',txt:'<b>'+esc(topMkt[0])+' is the top market at '+topMktPct.toFixed(1)+'% ('+fmtT(topMkt[1])+'T).</b> '+(topMktPct>50?'Single-market dependency — a shock here has no ready replacement.':'Spread across '+Object.keys(s.mkts).length+' markets.')});
  ins.push({t:'nt',i:'ti-award',lbl:'Grade mix',txt:'<b>Class 1 at '+(s.totNw>0?s.c1/s.totNw*100:0).toFixed(1)+'% ('+fmtT(s.c1)+'T)'+(s.juic>0?', Juicing at '+(s.totNw>0?s.juic/s.totNw*100:0).toFixed(1)+'%':'')+'.</b> '+gradeStr(s.grades)+'.'});
  ins.push({t:'nt',i:'ti-plant-2',lbl:'Supply source',txt:'<b>'+s.dalPct.toFixed(1)+'% from Daltex-owned farms ('+fmtT(s.dal)+'T).</b> Outsource '+(100-s.dalPct).toFixed(1)+'% ('+fmtT(s.outsrc)+'T)'+(topFarm[0]!=='—'?'. Largest farm: '+esc(topFarm[0])+' '+(s.totNw>0?(topFarm[1]/s.totNw*100).toFixed(1):0)+'%':'')+'.'});
  ins.push({t:'up',i:'ti-package',lbl:'Volume',txt:'<b>'+fmtT(s.totNw)+'T across '+s.ct+' containers ('+fmtCartons(s.cartons)+' cartons).</b> '+s.cov.toFixed(1)+'% of the full citrus season in scope.'});
  document.getElementById('ins-count').textContent=ins.length+' insights';
  body.innerHTML=ins.map(function(x){return '<div class="ir"><div class="ir-icon '+x.t+'"><i class="ti '+x.i+'"></i></div><div class="ir-body"><div class="ir-label '+x.t+'">'+x.lbl+'</div><div class="ir-text">'+x.txt+'</div></div></div>';}).join('');
}

/* ---- CATEGORY page ---- */
function catAgg(rows){
  var map={};rows.forEach(function(r){var c=ctWS(r.citrus_type);if(!c)return;if(!map[c])map[c]={cat:c,nw:0,cartons:0,rows:[],markets:{},varieties:{},grades:{}};var m=map[c];m.nw+=nw(r);m.cartons+=ctn(r);m.rows.push(r);var mk=ctWS(r.receiving_country);if(mk)m.markets[mk]=(m.markets[mk]||0)+nw(r);var vv=ctWS(r.variety);if(vv)m.varieties[vv]=(m.varieties[vv]||0)+nw(r);var g=ctWS(r.daltex_class);if(g)m.grades[g]=(m.grades[g]||0)+nw(r);});
  return Object.values(map).sort(function(a,b){return b.nw-a.nw;});
}
function renderCategory(rows){
  var cats=catAgg(rows), totNw=rows.reduce(function(a,r){return a+nw(r);},0), totCt=rows.reduce(function(a,r){return a+ctn(r);},0), containers=ctCount(rows);
  var sub=document.getElementById('page-sub');if(sub)sub.textContent='Season '+SEASON+' · '+cats.length+' citrus categories · '+fmtN(rows.length)+' shipment lines · '+containers+' containers';
  var lead=cats[0];
  document.getElementById('cat-stats').innerHTML=[
    ws('Categories',cats.length,'','citrus categories in scope'),
    ws('Total net weight',fmtT(totNw),'T',fmtCartons(totCt)+' cartons'),
    ws('Containers',containers,'','distinct shipping containers'),
    '<div class="ws-item"><div class="ws-label">Leading category</div><div class="ws-val ws-highlight" style="font-size:18px">'+(lead?esc(lead.cat):'—')+'</div><div class="ws-sub">'+(lead&&totNw>0?(lead.nw/totNw*100).toFixed(1)+'% of volume':'—')+'</div></div>'
  ].join('');
  var max=cats[0]?cats[0].nw:1;
  document.getElementById('cat-leader').innerHTML=cats.map(function(c,i){return '<div class="lead-row" data-dim="category" data-val="'+esc(c.cat)+'" title="Click for analysis"><div class="lead-rank">'+(i+1)+'</div><div class="lead-name"><span class="sw" style="background:'+palColor(c.cat,i)+'"></span>'+esc(c.cat)+'</div><div class="lead-track"><div class="lead-fill" style="width:'+(c.nw/max*100)+'%;background:'+palColor(c.cat,i)+'"></div></div><div class="lead-val">'+fmtT(c.nw)+'T <span>· '+(totNw>0?(c.nw/totNw*100).toFixed(1):0)+'%</span></div></div>';}).join('')||'<div class="d-empty">No data in range</div>';
  document.getElementById('cat-cards').innerHTML=cats.map(function(c,i){
    var col=palColor(c.cat,i),nVar=Object.keys(c.varieties).length,cc=ctCount(c.rows),gtot=Object.values(c.grades).reduce(function(a,v){return a+v;},0)||1;
    var gkeys=['1','1.5','2','Juicing'].filter(function(g){return c.grades[g];}).concat(Object.keys(c.grades).filter(function(g){return ['1','1.5','2','Juicing'].indexOf(g)<0;}));
    var gbar=gkeys.map(function(g){return '<i style="width:'+(c.grades[g]/gtot*100)+'%;background:'+(GRADE_COL[g]||'#b0b8ca')+'" title="'+esc(g)+': '+fmtT(c.grades[g])+'T"></i>';}).join('');
    return '<div class="cat-card" data-dim="category" data-val="'+esc(c.cat)+'" title="Click for analysis"><div class="stripe" style="background:'+col+'"></div><div class="cat-body"><div class="cat-top"><div class="cat-name">'+esc(c.cat)+'</div><div class="cat-share">'+(totNw>0?(c.nw/totNw*100).toFixed(1):0)+'%</div></div><div class="cat-vars">'+nVar+' varieties · '+cc+' containers</div><div class="cat-metrics"><div class="cat-m"><div class="mv">'+fmtT(c.nw)+'<span style="font-size:11px;color:var(--text3)"> T</span></div><div class="ml">Net weight</div></div><div class="cat-m"><div class="mv">'+fmtCartons(c.cartons)+'</div><div class="ml">Cartons</div></div></div><div class="cat-grades">'+gbar+'</div><div class="cat-foot"><span>Top mkt: <b>'+esc(top1(c.markets))+'</b></span><span class="cat-open">Analysis <i class="ti ti-arrow-right"></i></span></div></div></div>';
  }).join('')||'<div class="d-empty">No data in range</div>';
  document.getElementById('cat-tbody').innerHTML=cats.map(function(c,i){var cc=ctCount(c.rows),c1=c.grades['1']||0;return '<tr data-dim="category" data-val="'+esc(c.cat)+'" title="Click for analysis"><td class="name"><span class="sw" style="background:'+palColor(c.cat,i)+'"></span>'+esc(c.cat)+'</td><td class="num">'+fmtT(c.nw)+'</td><td class="num">'+fmtN(c.cartons)+'</td><td class="num">'+(totNw>0?(c.nw/totNw*100).toFixed(1):0)+'%</td><td class="num">'+cc+'</td><td class="num">'+(c.nw>0?(c1/c.nw*100).toFixed(1):0)+'%</td><td>'+esc(top1(c.markets))+'</td><td>'+esc(top1(c.varieties))+'</td></tr>';}).join('')||'<tr><td colspan="8" class="d-empty">No data in range</td></tr>';
  // reuse overview insights on the filtered rows
  var catsNW=aggNW(rows,'citrus_type'),mkts=aggNW(rows,'receiving_country'),farms=aggNW(rows,'farm_source'),grades=aggNW(rows,'daltex_class'),srcs=aggNW(rows,'source_type');
  var dal=srcs['Daltex Farms']||0,totSrc=Object.values(srcs).reduce(function(a,v){return a+v;},0);
  renderInsights(rows,{totNw:totNw,cartons:totCt,ct:containers,cats:catsNW,mkts:mkts,farms:farms,grades:grades,c1:grades['1']||0,juic:grades['Juicing']||0,dalPct:totSrc>0?dal/totSrc*100:0,dal:dal,outsrc:totSrc-dal,cov:FULL_NW>0?totNw/FULL_NW*100:0});
}

/* ---- DIMENSION page (markets/farms/varieties/clients/cartons) ---- */
function renderDimension(rows){
  var col=CFG.col, dim=CFG.dim, accent=CFG.accent||'var(--navy)';
  var map={};rows.forEach(function(r){var k=ctWS(r[col]);if(!k)return;if(!map[k])map[k]={k:k,nw:0,cartons:0,rows:[]};map[k].nw+=nw(r);map[k].cartons+=ctn(r);map[k].rows.push(r);});
  var items=Object.values(map).sort(function(a,b){return b.nw-a.nw;});
  var totNw=rows.reduce(function(a,r){return a+nw(r);},0), totCt=rows.reduce(function(a,r){return a+ctn(r);},0), containers=ctCount(rows);
  var sub=document.getElementById('page-sub');if(sub)sub.textContent='Season '+SEASON+' · '+items.length+' '+CFG.label.toLowerCase()+' · '+fmtT(totNw)+'T · '+containers+' containers';
  var top=items[0]||{k:'—',nw:0,cartons:0,rows:[]};
  var avg=items.length?totNw/items.length:0;
  document.getElementById('kpi-grid').innerHTML=[
    kcard('Total net weight',fmtT(totNw),'T',pill(fmtCartons(totCt)+' cartons','kp-nv'),pill(items.length+' '+CFG.label.toLowerCase(),'kp-nt'),containers+' containers in scope','var(--navy)',FULL_NW>0?totNw/FULL_NW*100:0,'var(--navy)'),
    kcard('Top '+CFG.label.toLowerCase(),top.k,'',pill((totNw>0?top.nw/totNw*100:0).toFixed(1)+'% share','kp-or'),pill(fmtT(top.nw)+'T','kp-nt'),fmtCartons(top.cartons)+' cartons','var(--orange)',totNw>0?top.nw/totNw*100:0,'var(--orange)',top.k!=='—'?{dim:dim,val:top.k}:null),
    kcard('Distinct '+CFG.label.toLowerCase(),items.length,'',pill('avg '+fmtT(avg)+'T each','kp-nt'),'','across the current filter scope','var(--blue)',100,'var(--blue)'),
    kcard('Containers',containers,'',pill(fmtCartons(totCt)+' cartons','kp-nv'),'','distinct shipping containers','var(--navy)',FULL_CT?containers/FULL_CT*100:0,'var(--navy)')
  ].join('');
  var max=items[0]?items[0].nw:1;
  document.getElementById('dim-leader').innerHTML=items.slice(0,25).map(function(it,i){return '<div class="lead-row" data-dim="'+dim+'" data-val="'+esc(it.k)+'" title="Click for analysis"><div class="lead-rank">'+(i+1)+'</div><div class="lead-name"><span class="sw" style="background:'+palColor(it.k,i)+'"></span>'+esc(it.k)+'</div><div class="lead-track"><div class="lead-fill" style="width:'+(it.nw/max*100)+'%;background:'+accent+'"></div></div><div class="lead-val">'+fmtT(it.nw)+'T <span>· '+(totNw>0?(it.nw/totNw*100).toFixed(1):0)+'%</span></div></div>';}).join('')||'<div class="d-empty">No data in range</div>'
    +(items.length>25?'<div class="d-empty" style="text-align:center">+ '+(items.length-25)+' more '+esc(CFG.label.toLowerCase())+' — narrow with filters</div>':'');
  // weekly stacked (top 5 items) — simple grouped totals
  var byWeek={};rows.forEach(function(r){var w=parseInt(r.shipping_week)||0;if(w)byWeek[w]=(byWeek[w]||0)+nw(r);});
  weeklyBars(document.getElementById('dim-weekly'),byWeek,accent);
  document.getElementById('dim-weekly-legend').innerHTML='<div class="cl-item"><div class="cl-rect" style="background:'+accent+'"></div>All '+esc(CFG.label.toLowerCase())+' · net weight per week</div>';
  document.getElementById('dim-tbody').innerHTML=items.slice(0,60).map(function(it,i){
    var cc=ctCount(it.rows),c1=it.rows.reduce(function(a,r){return a+(ctWS(r.daltex_class)==='1'?nw(r):0);},0);
    var cats=aggNW(it.rows,'citrus_type'),mkts=aggNW(it.rows,'receiving_country');
    return '<tr data-dim="'+dim+'" data-val="'+esc(it.k)+'" title="Click for analysis"><td class="name"><span class="sw" style="background:'+palColor(it.k,i)+'"></span>'+esc(it.k)+'</td><td class="num">'+fmtT(it.nw)+'</td><td class="num">'+fmtN(it.cartons)+'</td><td class="num">'+(totNw>0?(it.nw/totNw*100).toFixed(1):0)+'%</td><td class="num">'+cc+'</td><td class="num">'+(it.nw>0?(c1/it.nw*100).toFixed(1):0)+'%</td><td>'+esc(top1(cats))+'</td><td>'+esc(top1(mkts))+'</td></tr>';
  }).join('')||'<tr><td colspan="8" class="d-empty">No data in range</td></tr>';
  var cats=aggNW(rows,'citrus_type'),mkts=aggNW(rows,'receiving_country'),farms=aggNW(rows,'farm_source'),grades=aggNW(rows,'daltex_class'),srcs=aggNW(rows,'source_type');
  var dal=srcs['Daltex Farms']||0,totSrc=Object.values(srcs).reduce(function(a,v){return a+v;},0);
  renderInsights(rows,{totNw:totNw,cartons:totCt,ct:containers,cats:cats,mkts:mkts,farms:farms,grades:grades,c1:grades['1']||0,juic:grades['Juicing']||0,dalPct:totSrc>0?dal/totSrc*100:0,dal:dal,outsrc:totSrc-dal,cov:FULL_NW>0?totNw/FULL_NW*100:0});
}

/* ---- EXTRACT page ---- */
var EX_COLS=[
  {k:'loading_date',l:'Loading date'},{k:'container_number',l:'Container'},{k:'citrus_type',l:'Category'},{k:'variety',l:'Variety'},
  {k:'receiving_country',l:'Market'},{k:'receiving_port',l:'Port'},{k:'farm_source',l:'Farm'},{k:'source_type',l:'Source'},
  {k:'daltex_class',l:'Grade'},{k:'client',l:'Client'},{k:'client_class',l:'Client class'},{k:'carton_type',l:'Carton type'},
  {k:'carton_count',l:'Cartons',num:true},{k:'net_weight',l:'Net (T)',num:true},{k:'shipping_status',l:'Status'},{k:'shipping_week',l:'Week',num:true}
];
var exSort={k:'loading_date',dir:-1}, exQuery='';
function exRows(){
  var rows=filteredRows();
  if(exQuery){var q=exQuery.toLowerCase();rows=rows.filter(function(r){return EX_COLS.some(function(c){return String(r[c.k]==null?'':r[c.k]).toLowerCase().indexOf(q)>-1;});});}
  rows=rows.slice().sort(function(a,b){var A=a[exSort.k],B=b[exSort.k];if(EX_COLS.find(function(c){return c.k===exSort.k;}).num){A=num(A);B=num(B);}else{A=String(A==null?'':A).toLowerCase();B=String(B==null?'':B).toLowerCase();}return A<B?-1*exSort.dir:A>B?1*exSort.dir:0;});
  return rows;
}
function renderExtract(rows){
  var sub=document.getElementById('page-sub');if(sub)sub.textContent='Season '+SEASON+' · raw shipment lines · search, sort and copy';
  document.getElementById('ex-thead').innerHTML='<tr>'+EX_COLS.map(function(c){return '<th class="'+(c.num?'num':'')+'" onclick="CIT.sortExtract(\''+c.k+'\')">'+c.l+(exSort.k===c.k?(exSort.dir<0?' ▾':' ▴'):'')+'</th>';}).join('')+'</tr>';
  var data=exRows(), cap=500, shown=data.slice(0,cap);
  var td=function(v){return v==null||v===''?'—':esc(String(v));};
  document.getElementById('ex-tbody').innerHTML=shown.map(function(r){return '<tr>'+EX_COLS.map(function(c){if(c.k==='net_weight')return '<td class="num">'+fmtT(num(r[c.k]))+'</td>';if(c.k==='carton_count')return '<td class="num">'+fmtN(num(r[c.k]))+'</td>';if(c.k==='shipping_week')return '<td class="num">'+(parseInt(r[c.k])||'—')+'</td>';return '<td class="'+(c.num?'num':'')+'">'+td(r[c.k])+'</td>';}).join('')+'</tr>';}).join('');
  document.getElementById('ex-count').textContent=fmtN(data.length)+' rows'+(data.length>cap?' (showing first '+cap+')':'');
  document.getElementById('ex-note').textContent=data.length>cap?'Showing first '+cap+' of '+fmtN(data.length)+' rows. Narrow with filters or search, or Copy (TSV) to export all matching rows.':fmtN(data.length)+' rows.';
}

/* ---- ANALYSIS DRILL (no raw table) ---- */
function openDrill(dim,val){
  var col=DIM_COL[dim];if(!col)return;
  var base=filteredRows(), rows=base.filter(function(r){return ctWS(r[col])===ctWS(val);});
  if(!rows.length)return;
  var totNw=rows.reduce(function(a,r){return a+nw(r);},0), cartons=rows.reduce(function(a,r){return a+ctn(r);},0), ct=ctCount(rows);
  var baseNw=base.reduce(function(a,r){return a+nw(r);},0), share=baseNw>0?totNw/baseNw*100:0;
  var c1=rows.reduce(function(a,r){return a+(ctWS(r.daltex_class)==='1'?nw(r):0);},0);
  var avgKg=cartons>0?totNw*1000/cartons:0;
  document.getElementById('drill-title').innerHTML=esc(val)+' <span class="pill">'+DIM_LABEL[dim]+'</span>';
  document.getElementById('drill-sub').textContent=fmtN(rows.length)+' shipment lines · deep-dive within the current filters';
  var kpis=[
    ['Net weight',fmtT(totNw)+' T',ct+' containers'],
    ['Cartons',fmtCartons(cartons),'~'+(avgKg?avgKg.toFixed(1):'—')+' kg/carton'],
    ['Share of scope',share.toFixed(1)+'%','of '+fmtT(baseNw)+'T shown'],
    ['Class 1 share',(totNw>0?c1/totNw*100:0).toFixed(1)+'%',fmtT(c1)+'T Class 1']
  ];
  // weekly
  var byWeek={};rows.forEach(function(r){var w=parseInt(r.shipping_week)||0;if(w)byWeek[w]=(byWeek[w]||0)+nw(r);});
  // breakdown panels: all dims except drilled
  var panelDims=[['category','Category','ti-category-2'],['market','Market','ti-map-pin'],['variety','Variety','ti-palette'],['farm','Farm','ti-building'],['grade','Grade','ti-award'],['source','Source','ti-plant-2']].filter(function(p){return p[0]!==dim;});
  var panelsHTML=panelDims.map(function(p){
    var agg=aggNW(rows,DIM_COL[p[0]]);var entries=Object.entries(agg).sort(function(a,b){return b[1]-a[1];}).slice(0,6);
    var mx=entries[0]?entries[0][1]:1, tot=Object.values(agg).reduce(function(a,v){return a+v;},0);
    if(!entries.length)return '';
    var col=(p[0]==='grade')?function(k){return GRADE_COL[k]||'#8a95b0';}:palColor;
    var bars=entries.map(function(e,i){return '<div class="bar-item"><div class="bar-row"><span class="bar-name">'+esc(e[0])+'</span><span class="bar-vals">'+fmtT(e[1])+'T<span class="bar-contrib">'+(tot>0?'('+(e[1]/tot*100).toFixed(0)+'%)':'')+'</span></span></div><div class="bar-track"><div class="bar-fill" style="width:'+(e[1]/mx*100)+'%;background:'+col(e[0],i)+'"></div></div></div>';}).join('');
    return '<div class="d-panel"><div class="dp-h"><i class="ti '+p[2]+'"></i>'+p[1]+' breakdown</div><div class="bar-list">'+bars+'</div></div>';
  }).filter(Boolean).join('');
  var body='<div class="dk-grid">'+kpis.map(function(k){return '<div class="dk"><div class="v">'+k[1]+'</div><div class="l">'+k[0]+'</div><div class="s">'+k[2]+'</div></div>';}).join('')+'</div>'
    +'<div class="d-weekly"><div class="d-sec-title"><i class="ti ti-chart-bar"></i>Weekly net weight (tonnes)</div><div id="drill-weekly"></div></div>'
    +'<div class="d-sec-title"><i class="ti ti-layout-grid"></i>Breakdowns within '+esc(val)+'</div><div class="d-cols">'+(panelsHTML||'<div class="d-empty">No sub-breakdowns.</div>')+'</div>';
  document.getElementById('drill-body').innerHTML=body;
  weeklyBars(document.getElementById('drill-weekly'),byWeek,dim==='grade'?'#16a34a':'var(--navy)');
  document.getElementById('drill-ov').classList.add('show');
}
function closeDrill(){document.getElementById('drill-ov').classList.remove('show');}

/* ---- AI ---- */
function buildCtx(rows){
  var totNw=rows.reduce(function(a,r){return a+nw(r);},0),cartons=rows.reduce(function(a,r){return a+ctn(r);},0),ct=ctCount(rows);
  var cats=aggNW(rows,'citrus_type'),mkts=aggNW(rows,'receiving_country'),farms=aggNW(rows,'farm_source'),vars_=aggNW(rows,'variety'),grades=aggNW(rows,'daltex_class'),srcs=aggNW(rows,'source_type');
  var dal=srcs['Daltex Farms']||0,totSrc=Object.values(srcs).reduce(function(a,v){return a+v;},0);
  var line=function(o,n){return Object.entries(o).sort(function(a,b){return b[1]-a[1];}).slice(0,n||8).map(function(e){return e[0]+' '+fmtT(e[1])+'T';}).join(', ')||'—';};
  return 'You are an analytical assistant for Daltex, an Egyptian citrus exporter. Answer concisely with specific numbers. Max 6 bullet points. Volumes are metric tonnes (T) net weight; cartons also given. Focus on actionable insights for directors.\n\n'
    +'VIEW: '+(CFG.title||'')+'\nFILTER: '+F.from+' to '+F.to+FIELDS.map(function(f){return F[f].length?' · '+f+' '+F[f].join('/'):'';}).join('')+'\n\n'
    +'SCOPE: '+fmtT(totNw)+'T · '+ct+' containers · '+fmtN(cartons)+' cartons\n'
    +'Categories: '+line(cats)+'\nMarkets: '+line(mkts)+'\nFarms: '+line(farms)+'\nVarieties: '+line(vars_)+'\nGrades: '+line(grades)+'\nSource: Daltex '+(totSrc>0?(dal/totSrc*100).toFixed(1):0)+'% / Out '+(totSrc>0?((totSrc-dal)/totSrc*100).toFixed(1):0)+'%\n'
    +'FULL SEASON ('+SEASON+'): '+fmtT(FULL_NW)+'T · '+FULL_CT+' containers';
}
function runAI(){
  var inp=document.getElementById('ai-in'),q=inp.value.trim();if(!q){inp.focus();return;}
  var btn=document.getElementById('ai-btn'),load=document.getElementById('ai-load'),res=document.getElementById('ai-res'),txt=document.getElementById('ai-res-text');
  btn.disabled=true;load.classList.add('show');res.classList.remove('show');document.getElementById('ai-q-label').textContent='"'+q+'"';
  var rows=filteredRows();
  fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system:buildCtx(rows),messages:[{role:'user',content:q}]})})
  .then(function(r){return r.json();}).then(function(d){
    var response=(d.content&&d.content[0]&&d.content[0].text)||'No response.';
    txt.innerHTML=response.replace(/\*\*(.*?)\*\*/g,'<b>$1</b>').replace(/\n-\s/g,'<br><br>• ').replace(/\n\n/g,'<br><br>').replace(/\n/g,'<br>')+'<div class="ai-src"><i class="ti ti-database"></i> Based on live Daltex citrus shipments · '+fmtT(rows.reduce(function(a,r){return a+nw(r);},0))+'T selected</div>';
    res.classList.add('show');
  }).catch(function(){txt.innerHTML='<span style="color:var(--red)">Connection error. Please try again.</span>';res.classList.add('show');}).then(function(){btn.disabled=false;load.classList.remove('show');});
}

/* ---- public handlers ---- */
window.CIT={
  toggleDD:function(e,btn){e.stopPropagation();var dd=btn.parentElement.querySelector('.ms-dd');var was=dd.classList.contains('open');document.querySelectorAll('.ms-dd').forEach(function(d){d.classList.remove('open');});if(!was)dd.classList.add('open');},
  filterMS:function(input,fld){var q=input.value.toLowerCase().trim();input.closest('.ms-dd').querySelectorAll('.ms-opt:not(.ms-all)').forEach(function(opt){var val=opt.dataset.val||'';opt.style.display=((!q||val.indexOf(q)>-1)&&!opt.classList.contains('ms-unavail'))?'':'none';});},
  msPick:function(fld){var el=document.querySelector('.ms[data-f="'+fld+'"]');F[fld]=Array.prototype.slice.call(el.querySelectorAll('input[data-v]:checked')).map(function(i){return i.dataset.v;});el.querySelector('.ms-all input').checked=F[fld].length===0;syncMS(el,fld);this.applyFilters();},
  msAll:function(fld,cb){var el=document.querySelector('.ms[data-f="'+fld+'"]');el.querySelectorAll('input[data-v]').forEach(function(i){i.checked=false;});cb.checked=true;F[fld]=[];syncMS(el,fld);this.applyFilters();},
  applyFilters:function(){F.from=document.getElementById('f-from').value;F.to=document.getElementById('f-to').value;refreshFilterOptions();renderAll();},
  resetFilters:function(){F.from=DEF_FROM;F.to=DEF_TO;FIELDS.forEach(function(f){F[f]=[];});document.getElementById('f-from').value=DEF_FROM;document.getElementById('f-to').value=DEF_TO;document.querySelectorAll('.ms[data-f]').forEach(function(el){el.querySelectorAll('input[data-v]').forEach(function(i){i.checked=false;});var all=el.querySelector('.ms-all input');if(all)all.checked=true;syncMS(el,el.dataset.f);});refreshFilterOptions();renderAll();},
  removeChip:function(key,val){if(key==='date'){F.from=DEF_FROM;F.to=DEF_TO;document.getElementById('f-from').value=DEF_FROM;document.getElementById('f-to').value=DEF_TO;refreshFilterOptions();renderAll();return;}F[key]=(F[key]||[]).filter(function(v){return v!==val;});var el=document.querySelector('.ms[data-f="'+key+'"]');if(el){var inp=Array.prototype.slice.call(el.querySelectorAll('input[data-v]')).find(function(i){return i.dataset.v===val;});if(inp)inp.checked=false;if(F[key].length===0){var all=el.querySelector('.ms-all input');if(all)all.checked=true;}syncMS(el,key);}refreshFilterOptions();renderAll();},
  openDrill:openDrill, closeDrill:closeDrill, runAI:runAI,
  aiQ:function(q){document.getElementById('ai-in').value=q;runAI();},
  sortExtract:function(k){if(exSort.k===k)exSort.dir*=-1;else{exSort.k=k;exSort.dir=(k==='net_weight'||k==='carton_count'||k==='shipping_week')?-1:1;}renderExtract();},
  exFilter:function(v){exQuery=v;renderExtract();},
  exCopy:function(ev){var data=exRows();var head=EX_COLS.map(function(c){return c.l;}).join('\t');var body=data.map(function(r){return EX_COLS.map(function(c){var v=r[c.k];if(c.k==='net_weight')return num(v);if(c.k==='carton_count')return parseInt(v)||0;return v==null?'':String(v);}).join('\t');}).join('\n');var txt=head+'\n'+body;var b=ev&&ev.target&&ev.target.closest?ev.target.closest('button'):null;function done(){if(b){var o=b.innerHTML;b.innerHTML='<i class="ti ti-check" style="font-size:12px"></i> Copied '+fmtN(data.length)+' rows';setTimeout(function(){b.innerHTML=o;},1800);}}if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(done).catch(function(){});}else{done();}}
};

/* ---- avatar + init ---- */
document.addEventListener('click',function(e){var el=e.target.closest('[data-dim][data-val]');if(el){openDrill(el.dataset.dim,el.dataset.val);}});
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeDrill();});
var _inited=false;
function init(){ if(_inited)return; _inited=true; buildChrome(); load(); }
if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded',init); }
else { init(); }
})();
