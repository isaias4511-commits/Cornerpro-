const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');

// ---- respostas reais capturadas por curl (TheSportsDB) ----
const today = JSON.parse(fs.readFileSync('/home/user/e_today.json','utf8'));
const past  = JSON.parse(fs.readFileSync('/home/user/e_past.json','utf8'));
const live  = JSON.parse(fs.readFileSync('/home/user/tsdb_live.json','utf8'));
const afFix = { response:[{ fixture:{id:1111,date:'2026-09-21T18:30:00+00:00',status:{short:'2H',elapsed:63},venue:{name:'Arena'}}, league:{id:71,name:'Serie A',flag:'🇮🇹'}, teams:{home:{name:'Flamengo',logo:''},away:{name:'Palmeiras',logo:''}}, goals:{home:2,away:1} }], errors:{} };
const afStats = { response:[{ statistics:[
  {type:'Ball Possession',statistics:{home:'58%',away:'42%'}},
  {type:'Total Shots',statistics:{home:14,away:9}},
  {type:'Shots on Goal',statistics:{home:6,away:3}},
  {type:'Corner Kicks',statistics:{home:7,away:4}},
  {type:'Yellow Cards',statistics:{home:2,away:3}},
  {type:'Fouls',statistics:{home:11,away:13}}]}] };
const afErr401 = { errors:{ token:'Invalid API key' }, response:[] };

function run(cfg, fetchImpl, label){
  return new Promise(res => {
    const errors=[]; const vc = new VirtualConsole();
    vc.on('jsdomError', e => { const s = String(e.detail ? (e.detail.stack||e.detail.message||e.detail) : e.message); if(!/scrollTo|Not implemented/.test(s)) errors.push(s); });
    vc.on('error', (...a)=>errors.push('console.error: '+a.join(' ')));
    const dom = new JSDOM(html, { runScripts:'dangerously', pretendToBeVisual:true, url:'https://local.test/', virtualConsole: vc,
      beforeParse(w){
        w.localStorage.setItem('cp_cfg_v2', JSON.stringify(cfg));
        w.HTMLCanvasElement.prototype.getContext = function(){ return { scale(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},set strokeStyle(v){},set lineWidth(v){},set lineJoin(v){},set shadowColor(v){},set shadowBlur(v){} }; };
        w.fetch = (u, o) => fetchImpl(String(u), o);
      }});
    setTimeout(()=>{ 
      const d = dom.window.document;
      const out = {
        label,
        pill: d.querySelector('#statusPill').className,
        pillTxt: (d.querySelector('#statusTxt')||{}).textContent,
        notice: (d.querySelector('#list .notice') ? d.querySelector('#list .notice').textContent.replace(/\s+/g,' ').slice(0,150) : null),
        noticeClass: (d.querySelector('#list .notice')||{className:null}).className,
        chips: d.querySelectorAll('#leagues .chip').length,
        allRows: d.querySelectorAll('#list .matchrow').length,
        kpiLive: d.querySelector('#kpiLive').textContent, kpiGames: d.querySelector('#kpiGames').textContent, kpiCorners: d.querySelector('#kpiCorners').textContent,
        srcMeta: (d.querySelector('#srcMeta')||{}).textContent,
        realBadges: d.querySelectorAll('#list .badge img').length,
      };
      // abre o primeiro ao vivo / primeiro jogo
      const row = d.querySelector('#list .matchrow');
      if (row){ row.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true}));
        const pt = d.querySelector('#panelBody').textContent.replace(/\s+/g,' ');
        out.panel = /Posse de bola/.test(pt) && /Escanteios por período/.test(pt);
        out.statsTag = (pt.match(/(✅ Dados ao vivo da API-Football|≈ Escanteios estimados[^.]*\.|🧪 Valores estimados[^.]*\.)/)||[])[0] || null;
        out.cornerRow = (pt.match(/🚩 \d+ esc\./)||[])[0];
      }
      dom.window.close(); res({out, errors});
    }, 2500);
  });
}

const tsdbFetch = (u) => {
  if (u.includes('livescore')) return Promise.resolve({ok:true,json:()=>Promise.resolve(live)});
  if (u.includes('2026-09-21')) return Promise.resolve({ok:true,json:()=>Promise.resolve(today)});
  return Promise.resolve({ok:true,json:()=>Promise.resolve(past)});
};
const afFetch = (u) => {
  if (u.includes('/fixtures/statistics')) return Promise.resolve({ok:true,json:()=>Promise.resolve(afStats)});
  if (u.includes('live=all')) return Promise.resolve({ok:true,json:()=>Promise.resolve(afFix)});
  return Promise.resolve({ok:true,json:()=>Promise.resolve({response:[]})});
};
const badFetch = (u) => {
  if (u.includes('api-sports')) return Promise.resolve({ok:false,status:403,json:()=>Promise.resolve(afErr401)});
  return Promise.resolve({ok:false,status:503,json:()=>Promise.resolve({})});
};
const netFetch = () => Promise.reject(new TypeError('Failed to fetch'));

(async () => {
  const r1 = await run({provider:'demo',tsdb:'3',apiFootball:''}, ()=>Promise.reject(new Error('should not be called')), 'A) demo');
  const r2 = await run({provider:'tsdb',tsdb:'3',apiFootball:''}, tsdbFetch, 'B) TheSportsDB real');
  const r3 = await run({provider:'apifootball',tsdb:'3',apiFootball:'TESTKEY'}, afFetch, 'C) API-Football real');
  const r4 = await run({provider:'apifootball',tsdb:'3',apiFootball:'TESTKEY'}, badFetch, 'D) API 403 -> fallback');
  const r5 = await run({provider:'tsdb',tsdb:'3',apiFootball:''}, netFetch, 'E) rede caiu -> fallback');
  [r1,r2,r3,r4,r5].forEach(r => { console.log(JSON.stringify(r.out)); if (r.errors.length) console.log('  ERRORS('+r.out.label+'):', r.errors.slice(0,3)); });
  const hard = [r1,r2,r3,r4,r5].filter(r=>r.errors.length).length;
  console.log('CASES COM ERRO DE JS:', hard, '/5');
})();
