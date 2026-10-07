const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');

// payloads no formato que o proxy v2 devolve
const BOARD = { generated: Date.now(), days:1, count:2, live:1, totalCorners:8, estimated:true,
  matches:[
    { id:'a1001', league:'A71', leagueName:'Serie A', flag:'🇮🇹', country:'Brazil',
      home:{id:33,name:'Flamengo',abbr:'FLA',badge:null}, away:{id:34,name:'Palmeiras',abbr:'PAL',badge:null},
      status:'live', statusShort:'2H', minute:63, time:'15:30', date:'2026-09-23', score:[2,1], venue:'Arena A', round:'R24', est:true,
      stats:{ possession:[58,42], shots:[14,9], sot:[6,3], corners:[4,4], cards:[2,3], fouls:[11,13],
              cornersPeriod:{ home:[1,1,1,1], away:[1,1,1,1] }, real:false } },
    { id:'a1002', league:'A71', leagueName:'Serie A', flag:'🇮🇹', country:'Brazil',
      home:{id:35,name:'Grêmio',abbr:'GRE',badge:null}, away:{id:36,name:'Inter',abbr:'INT',badge:null},
      status:'scheduled', statusShort:'NS', minute:0, time:'20:00', date:'2026-09-23', score:[0,0], venue:'', round:'', est:true,
      stats:{ possession:[50,50], shots:[0,0], sot:[0,0], corners:[0,0], cards:[0,0], fouls:[0,0],
              cornersPeriod:{ home:[0,0,0,0], away:[0,0,0,0] }, real:false } }
  ],
  ranking:[ {id:'a1001', label:'Flamengo × Palmeiras', league:'Serie A', corners:8, live:true},
            {id:'a1002', label:'Grêmio × Inter', league:'Serie A', corners:0, live:false} ],
  quota:{ remaining:88, limit:100 } };

const DETAIL = { id:1001, status:'live', minute:63, score:[2,1], statusShort:'2H', venue:'Arena A', round:'R24',
  statsReal:true, statsNote:'', est:{}, quota:{remaining:86},
  stats:{ possession:[61,39], shots:[15,8], sot:[7,3], corners:[9,4], cards:[2,3], fouls:[12,14] },
  events:[ {min:22, ic:'⚽', tx:'Normal Goal', side:'home'}, {min:51, ic:'🟨', tx:'Yellow Card', side:'away'} ] };

const H2H = { meetings:2, home:1, draw:1, away:0, quota:{remaining:85},
  last:[ {date:'2026-05-01', league:'Serie A', home:'Flamengo', away:'Palmeiras', score:[3,1]},
         {date:'2025-11-02', league:'Serie A', home:'Palmeiras', away:'Flamengo', score:[2,2]} ] };

function run(cfg, label, mode){
  return new Promise(res => {
    const seen = []; const errors = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', e => { const s = String(e.detail ? (e.detail.stack||e.detail.message||e.detail) : e.message); if(!/scrollTo|Not implemented/.test(s)) errors.push(s); });
    vc.on('error', (...a)=>errors.push('console.error: '+a.join(' ')));
    const dom = new JSDOM(html, { runScripts:'dangerously', pretendToBeVisual:true, url:'https://local.test/', virtualConsole: vc,
      beforeParse(w){
        w.localStorage.setItem('cp_cfg_v2', JSON.stringify(cfg));
        w.HTMLCanvasElement.prototype.getContext = function(){ return { scale(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},set strokeStyle(v){},set lineWidth(v){},set lineJoin(v){},set shadowColor(v){},set shadowBlur(v){} }; };
        w.fetch = (u) => {
          const url = String(u); seen.push(url);
          if (url.includes('/derive/board')) return mode==='fail' ? Promise.resolve({ok:false,status:404,text:()=>Promise.resolve('{"error":"Rota não permitida pelo proxy"}'),json:()=>Promise.resolve({})}) : Promise.resolve({ ok:true, json:()=>Promise.resolve(BOARD) });
          if (url.includes('/derive/match')) return Promise.resolve({ ok:true, json:()=>Promise.resolve(DETAIL) });
          if (url.includes('/derive/h2h')) return Promise.resolve({ ok:true, json:()=>Promise.resolve(H2H) });
          return Promise.resolve({ ok:false, status:404, text:()=>Promise.resolve('nope'), json:()=>Promise.resolve({}) });
        };
      }});
    const step = (fn, t) => new Promise(r => setTimeout(r, t)).then(fn);
    const d = () => dom.window.document;
    step(() => {
      const row = d().querySelector('#list .matchrow');
      if (row) row.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true}));
      return null;
    }, 2000)
    .then(() => new Promise(r => setTimeout(r, 1400)))
    .then(() => {
      const pt = d().querySelector('#panelBody').textContent.replace(/\s+/g,' ');
      const out = { label,
        pill: d().querySelector('#statusPill').className,
        pillTxt: (d().querySelector('#statusTxt')||{}).textContent,
        rows: d().querySelectorAll('#list .matchrow').length,
        srcMeta: (d().querySelector('#srcMeta')||{}).textContent,
        statsTag: (pt.match(/(✅ Dados ao vivo da API-Football|≈ Escanteios estimados[^·]*)/)||[])[0] || null,
        panelCorners: (pt.match(/Total: \d+ escanteios/)||[])[0] || null,
        h2hNote: (pt.match(/✅ \d+ confrontos reais[^·]*· últimos: [^<]{0,60}/)||[])[0] || null,
        events: (pt.match(/Normal Goal/g)||[]).length + (pt.match(/Yellow Card/g)||[]).length,
        boardCalls: seen.filter(u=>u.includes('/derive/board')).length,
        matchCalls: seen.filter(u=>u.includes('/derive/match')).length,
        h2hCalls: seen.filter(u=>u.includes('/derive/h2h')).length,
        directUpstream: seen.filter(u=>/api-sports\.io/.test(u)).length,
        totalCalls: seen.length,
        notice: (d().querySelector('#list .notice')||{textContent:''}).textContent.replace(/\s+/g,' ').slice(0,110),
      };
      // reabre o mesmo jogo: NÃO deve refazer chamadas (sem laço)
      const row = d().querySelector('#list .matchrow');
      if (row) row.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true}));
      setTimeout(() => {
        out.matchCallsAfterReopen = seen.filter(u=>u.includes('/derive/match')).length;
        out.h2hCallsAfterReopen = seen.filter(u=>u.includes('/derive/h2h')).length;
        // ranking usa o do servidor?
        d().querySelectorAll('#nav button')[1].dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true}));
        out.rankItems = d().querySelectorAll('#rankCard [data-rank]').length;
        out.rankFooter = (d().querySelector('#rankCard').textContent.match(/Ranking calculado no servidor[^.]*\./)||[])[0] || null;
        out.rankFirst = (d().querySelector('#rankCard [data-rank]').textContent.replace(/\s+/g,' ')||'').slice(0,60);
        dom.window.close(); res({out, errors});
      }, 400);
    });
  });
}
(async () => {
  const a = await run({provider:'proxy', tsdb:'3', proxy:'https://px.test'}, 'H) proxy v2 (/derive/board)', 'ok');
  const b = await run({provider:'proxy', tsdb:'3', proxy:'https://px.test'}, 'I) proxy v1 antigo -> 404', 'fail');
  [a,b].forEach(r => { console.log(JSON.stringify(r.out,null,1)); if (r.errors.length) console.log('  ERRORS:', r.errors.slice(0,3)); });
  console.log('CASES COM ERRO DE JS:', [a,b].filter(r=>r.errors.length).length, '/2');
})();
