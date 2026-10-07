const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');

const BOARD = { generated:Date.now(), days:1, count:2, live:1, totalCorners:8, estimated:true,
  matches:[
    { id:'a1001', league:'A71', leagueName:'Serie A', flag:'🇮🇹', home:{id:33,name:'Flamengo',abbr:'FLA',badge:null}, away:{id:34,name:'Palmeiras',abbr:'PAL',badge:null},
      status:'live', statusShort:'2H', minute:63, time:'15:30', date:'2026-09-23', score:[2,1],
      stats:{ possession:[58,42], shots:[14,9], sot:[6,3], corners:[4,4], cards:[2,3], fouls:[11,13], cornersPeriod:{home:[1,1,1,1],away:[1,1,1,1]}, real:false } },
    { id:'a1002', league:'A71', leagueName:'Serie A', flag:'🇮🇹', home:{id:35,name:'Grêmio',abbr:'GRE',badge:null}, away:{id:36,name:'Inter',abbr:'INT',badge:null},
      status:'scheduled', statusShort:'NS', minute:0, time:'20:00', date:'2026-09-23', score:[0,0],
      stats:{ possession:[50,50], shots:[0,0], sot:[0,0], corners:[0,0], cards:[0,0], fouls:[0,0], cornersPeriod:{home:[0,0,0,0],away:[0,0,0,0]}, real:false } }
  ], ranking:[{id:'a1001',label:'Flamengo × Palmeiras',league:'Serie A',corners:8,live:true}], quota:{remaining:88} };

// EXATAMENTE o payload que o proxy v2 devolveu no teste do servidor (números reais, não aleatórios)
const TEAMAVG = { generated:Date.now(), days:7,
  labels:['2026-09-17','2026-09-18','2026-09-19','2026-09-20','2026-09-21','2026-09-22','2026-09-23'],
  sampled:3, estimatedCorners:true, realGoals:true, quota:{remaining:70}, seriesTeams:3,
  teams:[
    { id:35, name:'Grêmio', abbr:'GRÊ', badge:null, league:'Serie A', games:2, cornersFor:6, cornersAgainst:5, homeFor:4, awayFor:null, goalsFor:0.5, goalsAgainst:2 },
    { id:34, name:'Palmeiras', abbr:'PAL', badge:null, league:'Serie A', games:1, cornersFor:5, cornersAgainst:4, homeFor:null, awayFor:4, goalsFor:1, goalsAgainst:3 },
    { id:33, name:'Flamengo', abbr:'FLA', badge:null, league:'Serie A', games:3, cornersFor:4.7, cornersAgainst:4.7, homeFor:6, awayFor:5, goalsFor:2, goalsAgainst:0.7 }
  ],
  series:[
    { id:35, name:'Grêmio', abbr:'GRÊ', points:[null,null,{cf:7,ca:5,gf:0,ga:2,n:1},{cf:7,ca:5,gf:0,ga:2,n:1},{cf:6,ca:5,gf:0.5,ga:2,n:2},{cf:6,ca:5,gf:0.5,ga:2,n:2},{cf:6,ca:5,gf:0.5,ga:2,n:2}] },
    { id:34, name:'Palmeiras', abbr:'PAL', points:[{cf:5,ca:4,gf:1,ga:3,n:1},{cf:5,ca:4,gf:1,ga:3,n:1},{cf:5,ca:4,gf:1,ga:3,n:1},{cf:5,ca:4,gf:1,ga:3,n:1},{cf:5,ca:4,gf:1,ga:3,n:1},{cf:5,ca:4,gf:1,ga:3,n:1},{cf:5,ca:4,gf:1,ga:3,n:1}] },
    { id:33, name:'Flamengo', abbr:'FLA', points:[{cf:4,ca:4,gf:3,ga:1,n:1},{cf:4,ca:4,gf:3,ga:1,n:1},{cf:4.5,ca:4.5,gf:2.5,ga:1.5,n:2},{cf:4.5,ca:4.5,gf:2.5,ga:1.5,n:2},{cf:4.7,ca:4.7,gf:2,ga:0.7,n:3},{cf:4.7,ca:4.7,gf:2,ga:0.7,n:3},{cf:4.7,ca:4.7,gf:2,ga:0.7,n:3}] }
  ] };

function run(cfg, label, mode){
  return new Promise(res => {
    const seen=[], errors=[];
    const vc = new VirtualConsole();
    vc.on('jsdomError', e => { const s=String(e.detail?(e.detail.stack||e.detail.message||e.detail):e.message); if(!/scrollTo|Not implemented/.test(s)) errors.push(s); });
    vc.on('error', (...a)=>errors.push('console.error: '+a.join(' ')));
    const dom = new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://local.test/',virtualConsole:vc,
      beforeParse(w){
        w.localStorage.setItem('cp_cfg_v2', JSON.stringify(cfg));
        w.__ops = [];
        w.HTMLCanvasElement.prototype.getContext = function(){
          const ops = w.__ops;
          const rec = n => (...a) => { ops.push({ op:n, args:a }); };
          return { scale:rec('scale'), clearRect:rec('clearRect'), beginPath:rec('beginPath'), moveTo:rec('moveTo'),
                   lineTo:rec('lineTo'), stroke:rec('stroke'), fill:rec('fill'), arc:rec('arc'), fillText:rec('fillText') };
        };
        w.fetch=(u)=>{ const url=String(u); seen.push(url);
          if(url.includes('/derive/board')) return Promise.resolve({ok:true,json:()=>Promise.resolve(BOARD)});
          if(url.includes('/derive/teamavg')) return mode==='404'
            ? Promise.resolve({ok:false,status:404,text:()=>Promise.resolve('{"error":"Rota não permitida pelo proxy"}'),json:()=>Promise.resolve({})})
            : Promise.resolve({ok:true,json:()=>Promise.resolve(TEAMAVG)});
          return Promise.resolve({ok:false,status:404,text:()=>Promise.resolve('x'),json:()=>Promise.resolve({})}); };
      }});
    const d=()=>dom.window.document, wait=t=>new Promise(r=>setTimeout(r,t));
    const finite = ops => ops.filter(o=>['moveTo','lineTo','arc','fillText','scale','clearRect'].includes(o.op))
      .every(o=>o.args.every(a=>typeof a!=='number' || Number.isFinite(a)));
    (async()=>{
      await wait(1700);
      d().querySelectorAll('#nav button')[1].dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})); await wait(120);
      d().querySelectorAll('#rankSeg button')[1].dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})); await wait(900);
      const out={label};
      const cv=d().querySelector('#teamChart');
      out.canvas = { width:cv.width, height:cv.height, visible:cv.style.display!=='none' };
      out.chips = Array.from(d().querySelectorAll('#chartChips .cchip')).map(c=>({ t:c.textContent.trim(), on:c.className.includes('on') }));
      out.cap = (d().querySelector('#chartCap')||{}).textContent;
      out.labelsDrawn = dom.window.__ops.filter(o=>o.op==='fillText').map(o=>String(o.args[0])).filter(x=>/^\d\d\/\d\d$/.test(x));
      out.initialPolylines = dom.window.__ops.filter(o=>o.op==='moveTo').length;
      out.initialOpsFinite = finite(dom.window.__ops);
      // métricas desenhadas (nº de pontos por linha)
      out.lineToCount = dom.window.__ops.filter(o=>o.op==='lineTo').length;
      out.arcCount = dom.window.__ops.filter(o=>o.op==='arc').length;
      // clicar num chip desliga o time -> menos polilinhas
      const chipFla = Array.from(d().querySelectorAll('#chartChips .cchip')).find(c=>/FLA/.test(c.textContent));
      dom.window.__ops.length=0;
      chipFla.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})); await wait(150);
      out.afterChipOff = { polylines:dom.window.__ops.filter(o=>o.op==='moveTo').length, finite:finite(dom.window.__ops),
        flaChipOn:Array.from(d().querySelectorAll('#chartChips .cchip')).find(c=>/FLA/.test(c.textContent)).className.includes('on') };
      // religar pela linha da tabela
      const rowFla = Array.from(d().querySelectorAll('#teamCard [data-team]')).find(tr=>/Flamengo/.test(tr.textContent));
      dom.window.__ops.length=0;
      rowFla.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})); await wait(150);
      out.afterRowToggle = { polylines:dom.window.__ops.filter(o=>o.op==='moveTo').length, finite:finite(dom.window.__ops),
        rowMarked:rowFla.className.includes('inchart') };
      // trocar métrica
      const btnGf = d().querySelector('#chartMetric button[data-metric="gf"]');
      dom.window.__ops.length=0;
      btnGf.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})); await wait(150);
      out.afterMetricGf = { cap:(d().querySelector('#chartCap')||{}).textContent, polylines:dom.window.__ops.filter(o=>o.op==='moveTo').length, finite:finite(dom.window.__ops) };
      out.teamavgCalls=seen.filter(u=>u.includes('/derive/teamavg')).length;
      out.directUpstream=seen.filter(u=>/api-sports\.io/.test(u)).length;
      dom.window.close(); res({out,errors});
    })();
  });
}
(async()=>{
  const a = await run({provider:'proxy',tsdb:'3',proxy:'https://px.test'},'GRÁFICO (proxy v2, série real)','ok');
  const b = await run({provider:'demo',tsdb:'3',proxy:''},'GRÁFICO (fonte simulada)','ok');
  const c = await run({provider:'proxy',tsdb:'3',proxy:'https://px.test'},'GRÁFICO (proxy sem rota 404)','404');
  [a,b,c].forEach(r=>{ console.log(JSON.stringify(r.out,null,1)); if(r.errors.length) console.log('  ERRORS:',r.errors.slice(0,3)); });
  console.log('CASES COM ERRO DE JS:',[a,b,c].filter(r=>r.errors.length).length,'/3');
})();
