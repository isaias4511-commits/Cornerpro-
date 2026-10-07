const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');
const afFix = { response:[{ fixture:{id:2222,date:'2026-09-21T18:30:00+00:00',status:{short:'2H',elapsed:63}}, league:{id:71,name:'Serie A',flag:'🇮🇹'}, teams:{home:{name:'Flamengo',logo:''},away:{name:'Palmeiras',logo:''}}, goals:{home:2,away:1} }], errors:{} };
const afStats = { response:[{ statistics:[
  {type:'Ball Possession',statistics:{home:'58%',away:'42%'}},{type:'Total Shots',statistics:{home:14,away:9}},
  {type:'Shots on Goal',statistics:{home:6,away:3}},{type:'Corner Kicks',statistics:{home:7,away:4}},
  {type:'Yellow Cards',statistics:{home:2,away:3}},{type:'Fouls',statistics:{home:11,away:13}}]}] };

function run(cfg, label){
  return new Promise(res => {
    const seen = []; const errors = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', e => { const s = String(e.detail ? (e.detail.stack||e.detail.message||e.detail) : e.message); if(!/scrollTo|Not implemented/.test(s)) errors.push(s); });
    vc.on('error', (...a)=>errors.push('console.error: '+a.join(' ')));
    const dom = new JSDOM(html, { runScripts:'dangerously', pretendToBeVisual:true, url:'https://local.test/', virtualConsole: vc,
      beforeParse(w){
        w.localStorage.setItem('cp_cfg_v2', JSON.stringify(cfg));
        w.HTMLCanvasElement.prototype.getContext = function(){ return { scale(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},set strokeStyle(v){},set lineWidth(v){},set lineJoin(v){},set shadowColor(v){},set shadowBlur(v){} }; };
        w.fetch = (u, o) => {
          const url = String(u); seen.push({ url, headers: (o && o.headers) || {} });
          if (url.includes('/fixtures/statistics')) return Promise.resolve({ ok:true, json:()=>Promise.resolve(afStats) });
          if (url.includes('live=all')) return Promise.resolve({ ok:true, json:()=>Promise.resolve(afFix) });
          return Promise.resolve({ ok:true, json:()=>Promise.resolve({ response:[], errors:{} }) });
        };
      }});
    setTimeout(()=>{
      const d = dom.window.document;
      const row = d.querySelector('#list .matchrow');
      if (row) row.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true}));
      const pt = d.querySelector('#panelBody').textContent.replace(/\s+/g,' ');
      const out = {
        label,
        pill: d.querySelector('#statusPill').className,
        pillTxt: (d.querySelector('#statusTxt')||{}).textContent,
        rows: d.querySelectorAll('#list .matchrow').length,
        panel: /Posse de bola/.test(pt),
        statsTag: (pt.match(/(✅ Dados ao vivo da API-Football|≈ Escanteios estimados[^.]*\.|🧪 Valores estimados[^.]*\.)/)||[])[0] || null,
        cornerRow: (pt.match(/🚩 \d+ esc\./)||[])[0] || null,
        notice: (d.querySelector('#list .notice')||{textContent:''}).textContent.replace(/\s+/g,' ').slice(0,120),
        lsRaw: dom.window.localStorage.getItem('cp_cfg_v2'),
        calls: seen.map(s => s.url.replace('https://px.test','PROXY')),
        keysSentToUpstream: seen.map(s => Object.keys(s.headers).map(k=>k.toLowerCase())).flat(),
        hitUpstreamDirect: seen.some(s => /api-sports\.io/.test(s.url)),
      };
      dom.window.close(); res({out, errors});
    }, 2500);
  });
}
(async () => {
  const a = await run({provider:'proxy', tsdb:'3', proxy:'https://px.test/'}, 'F) proxy configurado (com chave antiga salva)');
  a.out.oldKeyStillInLS = /SECRET123|apiFootball/.test(a.out.lsRaw || '');
  const b = await run({provider:'proxy', tsdb:'3', proxy:''}, 'G) proxy NAO configurado');
  [a,b].forEach(r => { console.log(JSON.stringify(r.out,null,1)); if (r.errors.length) console.log(' ERRORS:', r.errors.slice(0,3)); });
  console.log('CASES COM ERRO DE JS:', [a,b].filter(r=>r.errors.length).length, '/2');
})();
