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
  ],
  ranking:[{id:'a1001',label:'Flamengo × Palmeiras',league:'Serie A',corners:8,live:true}], quota:{remaining:88} };
const TEAMAVG = { generated:Date.now(), days:7, sampled:12, estimatedCorners:true, realGoals:true, quota:{remaining:77},
  teams:[
    { id:33, name:'Flamengo', abbr:'FLA', badge:null, league:'Serie A', games:2, cornersFor:6, cornersAgainst:4, homeFor:7, awayFor:5, goalsFor:2.5, goalsAgainst:0.5 },
    { id:34, name:'Palmeiras', abbr:'PAL', badge:null, league:'Serie A', games:1, cornersFor:4, cornersAgainst:7, homeFor:null, awayFor:4, goalsFor:1, goalsAgainst:3 },
    { id:35, name:'Grêmio', abbr:'GRE', badge:null, league:'Serie A', games:1, cornersFor:4, cornersAgainst:5, homeFor:4, awayFor:null, goalsFor:0, goalsAgainst:2 }
  ] };
function run(cfg,label){
  return new Promise(res=>{
    const seen=[],errors=[];
    const vc=new VirtualConsole();
    vc.on('jsdomError',e=>{const s=String(e.detail?(e.detail.stack||e.detail.message||e.detail):e.message); if(!/scrollTo|Not implemented/.test(s)) errors.push(s);});
    vc.on('error',(...a)=>errors.push('console.error: '+a.join(' ')));
    const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://local.test/',virtualConsole:vc,
      beforeParse(w){ w.localStorage.setItem('cp_cfg_v2',JSON.stringify(cfg));
        w.HTMLCanvasElement.prototype.getContext=function(){return{scale(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},set strokeStyle(v){},set lineWidth(v){},set lineJoin(v){},set shadowColor(v){},set shadowBlur(v){}};};
        w.fetch=(u)=>{const url=String(u);seen.push(url);
          if(url.includes('/derive/board')) return Promise.resolve({ok:true,json:()=>Promise.resolve(BOARD)});
          if(url.includes('/derive/teamavg')) return Promise.resolve({ok:true,json:()=>Promise.resolve(TEAMAVG)});
          return Promise.resolve({ok:false,status:404,text:()=>Promise.resolve('x'),json:()=>Promise.resolve({})});};}});
    const d=()=>dom.window.document; const wait=t=>new Promise(r=>setTimeout(r,t));
    (async()=>{ await wait(1700);
      d().querySelectorAll('#nav button')[1].dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})); await wait(120);
      d().querySelectorAll('#rankSeg button')[1].dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})); await wait(900);
      const tbl=()=>d().querySelector('table.tavg');
      const order=()=>Array.from(tbl().querySelectorAll('tbody tr')).map(tr=>tr.querySelector('td').textContent.replace(/^[0-9]+/,'').trim());
      const out={label, defaultOrder:order(), defaultFirst:Array.from(tbl().querySelectorAll('tbody tr'))[0].textContent.replace(/\s+/g,' ').trim()};
      const click=async(name)=>{ const th=Array.from(tbl().querySelectorAll('thead th')).find(t=>t.textContent.includes(name));
        th.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})); await wait(120);
        return { on:th.className.includes('on'), arrow:th.textContent.replace(/[^▼▲]/g,''), order:order(), first:Array.from(tbl().querySelectorAll('tbody tr'))[0].textContent.replace(/\s+/g,' ').trim() }; };
      out.sortCornersForDesc = await click('Esc. pró');
      out.sortCornersForAsc  = await click('Esc. pró');
      out.sortAgainstDesc    = await click('Esc. contra');
      out.sortGoalsForDesc   = await click('Gols pró');
      out.sortGamesDesc      = await click('J');
      out.sortByNameAsc      = await click('Time');
      out.foot=(d().querySelector('#teamFoot')||{}).textContent;
      out.teamavgCalls=seen.filter(u=>u.includes('/derive/teamavg')).length;
      out.boardCalls=seen.filter(u=>u.includes('/derive/board')).length;
      out.directUpstream=seen.filter(u=>/api-sports\.io/.test(u)).length;
      dom.window.close(); res({out,errors}); })();
  });
}
(async()=>{ const a=await run({provider:'proxy',tsdb:'3',proxy:'https://px.test'},'ORDENAÇÃO (proxy v2)');
  console.log(JSON.stringify(a.out,null,1)); if(a.errors.length) console.log('ERRORS:',a.errors.slice(0,3));
  console.log('CASES COM ERRO DE JS:', a.errors.length?1:0, '/1'); })();
