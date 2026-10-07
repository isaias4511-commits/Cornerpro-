const fs = require('fs'); const { JSDOM } = require('jsdom');
const html = fs.readFileSync('index.html', 'utf8');
const errs = [];
const calls = { arc:0, lineTo:0, moveTo:0, stroke:0, fillText:0 };
const dom = new JSDOM(html, { runScripts:'dangerously', url:'https://app.test/', pretendToBeVisual:true });
const win = dom.window, doc = win.document;
win.scrollTo = () => {};
win.addEventListener('error', e => errs.push('window: ' + (e.message || e.error)));
const origErr = console.error; console.error = (...a) => { const s = a.join(' '); if (/Not implemented/.test(s)) errs.push('jsdom: ' + s.split('\n')[0]); else origErr(...a); };
function fakeCtx(){ return new Proxy({}, { get:(t,k)=>{ if (k==='canvas') return null; return (...a)=>{ if (calls[k]!==undefined) calls[k]++; return undefined; }; }, set:()=>true }); }
Object.defineProperty(win.HTMLCanvasElement.prototype, 'getContext', { value: fakeCtx, writable:true });
Object.defineProperty(win.HTMLElement.prototype, 'clientWidth', { get(){ return 340; }, configurable:true });

const ev = (code) => win.eval(code);
// --- cache de médias de liga: A71 com amostra suficiente, A999 sem amostra ---
const LGA = { updated: Date.now(), leagues: {
  '71': { name:'Serie A', n:10, perMatch:10.0 },
  '999':{ name:'Serie C', n:3, perMatch:8.0 }
}};
ev(`localStorage.setItem('cp_lgavg_v1', ${JSON.stringify(JSON.stringify(LGA))}); true`);

function mk(id, lg, lgName, status, corners, extra){
  const st = { possession:[55,45], shots:[11,7], sot:[4,3], corners, cards:[1,2], fouls:[10,12], real:false };
  if (corners) { st.cornersSource='league'; st.leagueN=10; st.leaguePerMatch=10.0; }
  else { st.cornersSource='none'; }
  st.cornersPeriod = corners ? { home:[2,2,1,1], away:[1,1,1,1] } : null;
  return Object.assign({ id, source:'apifootball', league:lg, leagueName:lgName, flag:'🇮🇹',
    home:{ id:3, name:'Time Casa '+id, abbr:'CAS', badge:null }, away:{ id:4, name:'Time Fora '+id, abbr:'FOR', badge:null },
    status, minute: status==='live'?63:(status==='finished'?90:0), time:'16:00', date:'2026-09-23',
    score:[2,1], stats:st, events:[], pressure:{home:[],away:[]}, h2h:[1,1,0], form:{home:[],away:[]} }, extra||{});
}
const BOARD = { matches: [
  mk('a1','A71','Serie A','live',[6,4]),
  mk('a2','A71','Serie A','finished',[7,5]),
  mk('a3','A999','Serie C','finished',null),
  mk('a4','A135','League One','scheduled',null)
], ranking:[{id:'a1',label:'Time Casa a1 × Time Fora a1',league:'Serie A',corners:10,live:true}],
   leagueAverages:{ '71':{name:'Serie A',n:10,perMatch:10.0}, '135':{name:'League One',n:2,perMatch:7.5} }, quota:{remaining:88} };

const TEAMAVG = { generated:Date.now(), days:7, sampled:12, labels:['2026-09-17','2026-09-18','2026-09-19','2026-09-20','2026-09-21','2026-09-22','2026-09-23'],
  minLeagueSamples:8, cornersAvailable:1, leagueAverages:BOARD.leagueAverages,
  teams:[ {id:1,name:'Flamengo',abbr:'FLA',badge:null,league:'Serie A',games:2,cornersFor:11.0,cornersAgainst:5,cornerSamples:10,cornersSource:'league',homeFor:12,awayFor:10,goalsFor:2.5,goalsAgainst:0.5},
          {id:2,name:'Palmeiras',abbr:'PAL',badge:null,league:'Serie A',games:1,cornersFor:null,cornersAgainst:null,cornerSamples:0,cornersSource:null,homeFor:null,awayFor:null,goalsFor:1,goalsAgainst:3} ],
  series:[ {id:1,name:'Flamengo',abbr:'FLA',points:[{cf:6,ca:4,gf:2,ga:1,n:1,cn:1},{cf:6,ca:4,gf:2,ga:1,n:1,cn:1},{cf:8,ca:4.5,gf:2.5,ga:0.5,n:2,cn:2},{cf:8,ca:4.5,gf:2.5,ga:0.5,n:2,cn:2},{cf:9,ca:4,gf:3,ga:1,n:3,cn:3},{cf:9,ca:4,gf:3,ga:1,n:3,cn:3},{cf:11,ca:5,gf:2.5,ga:0.5,n:4,cn:10}] } ],
  seriesTeams:1, estimatedCorners:true, realGoals:true };
const H2H = { meetings:3, home:2, draw:1, away:0, last:[] };
const FETCHMAP = { '/derive/board': BOARD, '/derive/teamavg': TEAMAVG, '/derive/match': { statsReal:false, statsNote:'plano gratuito' }, '/derive/h2h': H2H };
const BOARD_RANK = BOARD.ranking;
const fetched = [];
win.fetch = (url) => { const u = String(url); fetched.push(u); const key = Object.keys(FETCHMAP).find(k => u.indexOf(k) >= 0); if (!key) throw new Error('fetch inesperado: ' + u);
  return Promise.resolve({ ok:true, status:200, headers:{ get:()=>null }, json:()=>Promise.resolve(FETCHMAP[key]), text:()=>Promise.resolve(JSON.stringify(FETCHMAP[key])) }); };

const arg = (m) => `arguments[0]`;
function R(label, got, want){ const ok = (want instanceof RegExp) ? want.test(got) : got === want; console.log((ok?'PASS':'FAIL') + ' | ' + label + ' => ' + JSON.stringify(got)); return ok; }
(async () => {
  let fails = 0; const t = (l,g,w) => { if (!R(l,g,w)) fails++; };
  ev("CFG.provider='proxy'; CFG.proxy='https://px.test'; true");
  await ev("loadMatches()");
  await new Promise(r => setTimeout(r, 60));
  t('cache local: 1 liga utilizavel, 1 sem amostra', ev("JSON.stringify(lgaStats())"), '{"leagues":3,"usable":1,"samples":15,"max":10}');
  t('A71 utilizavel (n=10 >= 8)', ev("lgaUsable(lgaFor({league:'A71',leagueName:'Serie A'}))"), true);
  t('A999 NAO utilizavel (n=3 < 8)', ev("lgaUsable(lgaFor({league:'A999',leagueName:'Serie C'}))"), false);
  t('A135 NAO utilizavel (n=2 < 8)', ev("lgaUsable(lgaFor({league:'A135',leagueName:'League One'}))"), false);
  t('busca da media por NOME tambem funciona', ev("(lgaFor({league:'A0',leagueName:'Serie A'})||{}).n"), 10);
  t('KPI só soma escanteios com fonte', ev("$('#kpiCorners').textContent"), '22'); // 10 + 12
  t('barra avisa jogos sem fonte', ev("$('#srcMeta').innerHTML").indexOf('2 sem fonte de escanteio') >= 0, true);
  t('barra mostra médias de liga em cache', ev("$('#srcMeta').innerHTML").indexOf('Médias de liga em cache') >= 0, true);
  t('merge do board no cache local', ev("Object.keys(lgaLoad().leagues).sort().join(',')"), '135,71,999');
  // detalhe: liga com amostra => números + selo
  ev("openMatch('a1')"); await new Promise(r => setTimeout(r, 40));
  const d1 = ev("$('#panelBody').innerHTML");
  t('detalhe A71 marcado como média da liga (selo n=10)', d1.indexOf('média da liga · n=10') >= 0, true);
  t('detalhe A71 tem números de escanteio', ev("JSON.stringify(MATCHES.find(m=>m.id==='a1').stats.corners)"), '[6,4]');
  // detalhe: liga sem amostra => nada inventado
  ev("openMatch('a3')"); await new Promise(r => setTimeout(r, 40));
  const d3 = ev("$('#panelBody').innerHTML");
  t('A999 (n=3) NÃO recebe número', ev("MATCHES.find(m=>m.id==='a3').stats.corners === null"), true);
  t('A999 explica que nada foi inventado', d3.indexOf('Nada foi inventado') >= 0, true);
  t('A999 mostra — nos escanteios', d3.indexOf('<div class="top"><span>—</span><span class="lab">Escanteios</span><span>—</span>') >= 0, true);
  ev("openMatch('a4')"); await new Promise(r => setTimeout(r, 40));
  t('A135 sem média utilizável (n=2) não recebe número', ev("MATCHES.find(m=>m.id==='a4').stats.corners === null"), true);
  // lista
  t('linha ao vivo usa — quando não há escanteio', ev("Math.round(matchRowHTML(MATCHES.find(m=>m.id==='a3')).indexOf('🚩 — esc.') >= 0)") === 1, true);
  t('linha A71 mostra total real', ev("matchRowHTML(MATCHES.find(m=>m.id==='a1')).indexOf('🚩 10 esc.') >= 0"), true);
  // ranking
  ev("showPage('rank')"); await new Promise(r => setTimeout(r, 30));
  const rc = ev("$('#rankCard').innerHTML");
  t('ranking do servidor usa os totais recebidos', rc.indexOf('Ranking calculado no servidor') >= 0, true);
  t('ranking do servidor mostra o total do jogo', rc.indexOf('>10<') >= 0, true);
  // sem ranking remoto: o calculo local precisa excluir quem nao tem fonte
  ev("state.rankRemote=null; renderRank(); true");
  const rc2 = ev("$('#rankCard').innerHTML");
  t('ranking local conta jogos sem fonte', rc2.indexOf('2 jogo(s) sem fonte de escanteio') >= 0, true);
  t('ranking local nao inventa barra para quem nao tem fonte', rc2.indexOf('sem fonte</div>') >= 0, true);
  ev("state.rankRemote=[{id:'a1',label:'Time Casa a1 × Time Fora a1',league:'Serie A',corners:10,live:true}]; renderRank(); true");
  // médias por time (servidor) + gráfico
  ev("state.rankView='team'; $('#rankViewTeam').style.display='block'; loadTeamAvg()");
  await new Promise(r => setTimeout(r, 60));
  const tv = ev("$('#teamCard').innerHTML");
  t('tabela marca valor vindo da média da liga', tv.indexOf('≈média da liga · n=10') >= 0, true);
  t('tabela usa — quando não há fonte', tv.indexOf('—') >= 0, true);
  t('rodapé explica a regra do preenchimento', ev("$('#teamFoot').innerHTML").indexOf('nunca um número inventado') >= 0, true);
  calls.arc = 0; calls.lineTo = 0;
  ev("drawTeamChart()");
  t('gráfico desenha pontos', calls.arc > 0 && calls.lineTo > 0, true);
  t('gráfico rotula os dias', calls.fillText >= 7, true);
  t('só chamadas ao proxy (0 à API direta)', fetched.every(u => u.indexOf('px.test') >= 0), true);
  t('erros JS', errs.length, 0);
  console.log('RESUMO | fails=' + fails + ' | erros=' + errs.length + ' | arc=' + calls.arc + ' lineTo=' + calls.lineTo + ' fillText=' + calls.fillText + ' | fetch=' + JSON.stringify(fetched));
  if (errs.length) console.log('ERROS:', errs.slice(0,4).join(' || '));
  process.exit(fails ? 1 : 0);
})();
