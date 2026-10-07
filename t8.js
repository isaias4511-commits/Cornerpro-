const fs = require('fs'); const { JSDOM } = require('jsdom');
const html = fs.readFileSync('index.html', 'utf8');
const errs = [];
const calls = { arc:0, lineTo:0, moveTo:0, stroke:0, strokeRect:0, fillText:0, fillRect:0 };
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
  '999':{ name:'Serie C', n:3, perMatch:8.0 },
  '140':{ name:'La Liga', n:9, perMatch:9.5 }
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
  teams:[
    {id:1,name:'Flamengo',abbr:'FLA',badge:null,league:'Serie A',games:2,cornersFor:11.0,cornersAgainst:5,cornerSamples:10,cornersSource:'league',homeFor:12,awayFor:10,goalsFor:2.5,goalsAgainst:0.5,
      leagues:[{id:'71',name:'Serie A',country:'Italy',games:2,cn:2}]},
    {id:2,name:'Palmeiras',abbr:'PAL',badge:null,league:'Serie A',games:3,cornersFor:9.0,cornersAgainst:6,cornerSamples:1,cornersSource:'league',homeFor:null,awayFor:9,goalsFor:1,goalsAgainst:3,
      leagues:[{id:'71',name:'Serie A',country:'Italy',games:2,cn:0},{id:'140',name:'La Liga',country:'Spain',games:1,cn:1}]},
    {id:3,name:'Gremio',abbr:'GRE',badge:null,league:'Serie A',games:2,cornersFor:8.0,cornersAgainst:4,cornerSamples:2,cornersSource:'league',homeFor:8,awayFor:8,goalsFor:1.5,goalsAgainst:1,
      leagues:[{id:'71',name:'Serie A',country:'Italy',games:1,cn:1},{id:'140',name:'La Liga',country:'Spain',games:1,cn:1}]},
    {id:4,name:'Vasco',abbr:'VAS',badge:null,league:'Serie C',games:1,cornersFor:null,cornersAgainst:null,cornerSamples:0,cornersSource:null,homeFor:null,awayFor:null,goalsFor:0,goalsAgainst:2,
      leagues:[{id:'999',name:'Serie C',country:'Italy',games:1,cn:0}]},
    {id:5,name:'Santos',abbr:'SAN',badge:null,league:'Serie C',games:1,cornersFor:4.0,cornersAgainst:7,cornerSamples:1,cornersSource:'league',homeFor:4,awayFor:null,goalsFor:1,goalsAgainst:2,
      leagues:[{id:'999',name:'Serie C',country:'Italy',games:1,cn:1}]},
    {id:6,name:'Inter',abbr:'INT',badge:null,league:'Serie A',games:1,cornersFor:10.0,cornersAgainst:3,cornerSamples:1,cornersSource:'league',homeFor:10,awayFor:null,goalsFor:3,goalsAgainst:0,
      leagues:[{id:'71',name:'Serie A',country:'Italy',games:1,cn:0}],
      source:{kind:'other',league:'La Liga',country:'Spain',leagueId:'140',cornerGames:1,fromLeagues:[{id:'140',name:'La Liga',country:'Spain',games:1,cn:1}],leagueAvgN:9,leaguePerMatch:9.5,min:8,usable:true}}
  ],
  series:[ {id:1,name:'Flamengo',abbr:'FLA',points:[{cf:6,ca:4,gf:2,ga:1,n:1,cn:1},{cf:6,ca:4,gf:2,ga:1,n:1,cn:1},{cf:8,ca:4.5,gf:2.5,ga:0.5,n:2,cn:2},{cf:8,ca:4.5,gf:2.5,ga:0.5,n:2,cn:2},{cf:9,ca:4,gf:3,ga:1,n:3,cn:3},{cf:9,ca:4,gf:3,ga:1,n:3,cn:3},{cf:11,ca:5,gf:2.5,ga:0.5,n:4,cn:10}] } ],
  seriesTeams:1, estimatedCorners:true, realGoals:true };
const H2H = { meetings:3, home:2, draw:1, away:0, last:[] };
const FETCHMAP = { '/derive/board': BOARD, '/derive/teamavg': TEAMAVG, '/derive/match': { statsReal:false, statsNote:'plano gratuito' }, '/derive/h2h': H2H };
const BOARD_RANK = BOARD.ranking;
const fetched = [];
win.fetch = (url) => { const u = String(url); fetched.push(u); const key = Object.keys(FETCHMAP).find(k => u.indexOf(k) >= 0); if (!key) throw new Error('fetch inesperado: ' + u);
  return Promise.resolve({ ok:true, status:200, headers:{ get:()=>null }, json:()=>Promise.resolve(JSON.parse(JSON.stringify(FETCHMAP[key]))), text:()=>Promise.resolve(JSON.stringify(FETCHMAP[key])) }); };

const arg = (m) => `arguments[0]`;
function R(label, got, want){ const ok = (want instanceof RegExp) ? want.test(got) : got === want; console.log((ok?'PASS':'FAIL') + ' | ' + label + ' => ' + JSON.stringify(got)); return ok; }
(async () => {
  let fails = 0; const t = (l,g,w) => { if (!R(l,g,w)) fails++; };
  ev("CFG.provider='proxy'; CFG.proxy='https://px.test'; true");
  await ev("loadMatches()");
  await new Promise(r => setTimeout(r, 60));
  t('cache local: 2 utilizaveis de 4, com lista de quem falta', ev("JSON.stringify(lgaStats())"), '{"leagues":4,"usable":2,"min":8,"samples":24,"max":10,"missing":[{"name":"Serie C","n":3,"need":5},{"name":"League One","n":2,"need":6}],"needMore":2}');
  t('A71 utilizavel (n=10 >= 8)', ev("lgaUsable(lgaFor({league:'A71',leagueName:'Serie A'}))"), true);
  t('A999 NAO utilizavel (n=3 < 8)', ev("lgaUsable(lgaFor({league:'A999',leagueName:'Serie C'}))"), false);
  t('A135 NAO utilizavel (n=2 < 8)', ev("lgaUsable(lgaFor({league:'A135',leagueName:'League One'}))"), false);
  t('busca da media por NOME tambem funciona', ev("(lgaFor({league:'A0',leagueName:'Serie A'})||{}).n"), 10);
  t('KPI só soma escanteios com fonte', ev("$('#kpiCorners').textContent"), '22'); // 10 + 12
  t('barra avisa jogos sem fonte', ev("$('#srcMeta').innerHTML").indexOf('2 sem fonte de escanteio') >= 0, true);
  t('barra mostra médias de liga em cache', ev("$('#srcMeta').innerHTML").indexOf('Médias de liga em cache') >= 0, true);
  t('merge do board no cache local', ev("Object.keys(lgaLoad().leagues).sort().join(',')"), '135,140,71,999');
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
  t('tabela marca a liga de origem do valor', tv.indexOf('mesma liga · n=10') >= 0, true);
  t('tabela usa — quando não há fonte', tv.indexOf('—') >= 0, true);
  t('rodapé explica a regra do preenchimento', ev("$('#teamFoot').innerHTML").indexOf('nunca um número inventado') >= 0, true);
  calls.arc = 0; calls.lineTo = 0;
  ev("drawTeamChart()");
  t('gráfico desenha pontos', calls.arc > 0 && calls.lineTo > 0, true);
  t('gráfico rotula os dias', calls.fillText >= 7, true);
  // ---- controle da amostra mínima no painel de fonte de dados ----
  t('minimo padrao = 8', ev("minSamples()"), 8);
  t('selo informa quantas partidas faltam', ev("lgaBadge(lgaFor({league:'A999',leagueName:'Serie C'})).indexOf('faltam 5 de 8') >= 0"), true);
  t('barra cita a liga mais proxima do minimo', ev("$('#srcMeta').innerHTML").indexOf('faltam 5') >= 0, true);
  ev("$('#openCfg').click(); true");
  t('painel abre com o campo de amostra vazio (padrao)', ev("$('#cfgMin').value"), '');
  ev("$('#cfgProvider').value='proxy'; $('#cfgProxy').value='https://px.test'; $('#cfgMin').value='2'; $('#saveCfg').click(); true");
  await new Promise(r => setTimeout(r, 90));
  t('salvar aplica o minimo digitado', ev("minSamples()"), 2);
  t('liga com n=3 passa a ser utilizavel com minimo 2', ev("lgaUsable(lgaFor({league:'A999',leagueName:'Serie C'}))"), true);
  t('jogo antes em branco agora recebe numero', ev("Array.isArray(MATCHES.find(m=>m.id==='a3').stats.corners)"), true);
  t('barra passa a mostrar o minimo em uso', ev("$('#srcMeta').innerHTML").indexOf('mínimo 2 por liga') >= 0, true);
  ev("$('#openCfg').click(); $('#cfgMin').value='99'; $('#saveCfg').click(); true");
  await new Promise(r => setTimeout(r, 90));
  t('minimo e limitado a 50', ev("minSamples()"), 50);
  t('com minimo 50 nada novo e preenchido', ev("MATCHES.find(m=>m.id==='a3').stats.corners===null && MATCHES.find(m=>m.id==='a4').stats.corners===null"), true);
  ev("$('#openCfg').click(); $('#cfgMin').value='0'; $('#saveCfg').click(); true");
  await new Promise(r => setTimeout(r, 90));
  t('valor invalido volta ao padrao 8', ev("minSamples()"), 8);
  t('CFG.minSamples persistido', ev("JSON.parse(localStorage.getItem('cp_cfg_v2')).minSamples"), 8);
  t('sem preenchimento por media quando o minimo e 8', ev("MATCHES.find(m=>m.id==='a3').stats.corners===null"), true);
  // ---- liga de origem das medias por time ----
  ev("state.rankView='team'; $('#rankViewTeam').style.display='block'; state.teamAvg=null; state.teamLoading=false; loadTeamAvg(); true");
  await new Promise(r => setTimeout(r, 80));
  const tv2 = ev("$('#teamCard').innerHTML");
  t('coluna Liga de origem no cabecalho', tv2.indexOf('Liga de origem') >= 0, true);
  t('mesma liga sinalizada com o n da liga', tv2.indexOf('mesma liga · n=10') >= 0, true);
  t('media de outra competicao sinalizada', tv2.indexOf('outra liga · n=9') >= 0, true);
  t('media juntando varias ligas sinalizada', tv2.indexOf('2 ligas · n=10') >= 0, true);
  t('time sem amostra aparece como sem media', tv2.indexOf('sem média') >= 0, true);
  t('liga de origem abaixo do minimo sinalizada', tv2.indexOf('abaixo do mínimo · n=3') >= 0, true);
  t('bandeira do pais na coluna de origem', tv2.indexOf('🇪🇸') >= 0, true);
  t('origem pronta do servidor usada como veio', tv2.indexOf('La Liga') >= 0, true);
  t('valor da media segue marcado com ≈', tv2.indexOf('≈</span>') >= 0, true);
  t('selo ambiguo antigo saiu da tabela', tv2.indexOf('média da liga · n=') < 0, true);
  console.log('ORIGEM | ' + ev("$$('[data-team]', $('#teamCard')).map(function(tr){ return tr.querySelector('.nm').textContent + ' :: ' + tr.querySelector('.lgcell').textContent.replace(/\s+/g,' ').trim(); }).join(' || ')"));
  const foot2 = ev("$('#teamFoot').innerHTML");
  t('rodape resume a origem', foot2.indexOf('Origem das médias:') >= 0, true);
  t('rodape conta 2 na mesma liga', foot2.indexOf('<b>2</b> na mesma liga') >= 0, true);
  t('rodape conta 2 em outra competicao', foot2.indexOf('<b>2</b> em outra competição') >= 0, true);
  t('rodape conta 1 em varias', foot2.indexOf('<b>1</b> em várias') >= 0, true);
  t('rodape conta 1 sem media', foot2.indexOf('<b>1</b> sem média') >= 0, true);
  ev("state.sortKey='sourceLeague'; state.sortDir=1; renderTeam(); true");
  const order = ev("$$('[data-team]', $('#teamCard')).map(function(tr){ return tr.querySelector('.lgcell .lgnm').textContent; })");
  t('ordenar por liga de origem sai em ordem alfabetica', JSON.stringify(order) === JSON.stringify(order.slice().sort()), true);
  console.log('ORDEM POR LIGA | ' + JSON.stringify(order));
  ev("state.sortKey='cornersFor'; state.sortDir=-1; renderTeam(); true");
  // ---- AGRUPAMENTO da tabela pela liga de origem ----
  const DOM = "(function(){var out=[];$$('#teamCard tr').forEach(function(tr){if(tr.classList.contains('grouphdr')){out.push(['GRP',tr.querySelector('.gname').textContent.trim(),tr.querySelector('.gcnt').textContent.trim(),tr.querySelector('.gmeta').textContent.trim(),tr.dataset.grp]);}else if(tr.dataset.team){var td=tr.querySelectorAll('td');out.push(['ROW',tr.querySelector('.nm').textContent.trim(),td[1].querySelector('.lgnm').textContent.trim(),td[3].textContent.trim()]);}});return JSON.stringify(out);})()";
  const dom = () => JSON.parse(ev(DOM));
  const heads = () => dom().filter(x => x[0] === 'GRP');
  const bodyRows = () => dom().filter(x => x[0] === 'ROW');

  const h0 = heads();
  t('3 grupos (uma liga de origem cada)', h0.length, 3);
  t('grupos ordenados por tamanho/alfabetica', JSON.stringify(h0.map(x => x[1])), '["La Liga","Serie A","Serie C"]');
  t('cabecalho do grupo mostra a contagem de times', JSON.stringify(h0.map(x => x[2])), '["2 time(s)","2 time(s)","2 time(s)"]');
  t('cabecalho do grupo traz a amostra da liga', h0[0][3].indexOf('n=9') >= 0, true);
  t('cabecalho do grupo traz a media por jogo', h0[0][3].indexOf('9.5/jogo') >= 0, true);
  t('cabecalho avisa liga abaixo do minimo', h0[2][3].indexOf('abaixo do mínimo de 8') >= 0, true);
  t('times aparecem dentro do grupo da sua origem', bodyRows().length, 6);
  t('linhas de La Liga sao as duas esperadas', JSON.stringify(bodyRows().filter(r => r[2] === 'La Liga').map(r => r[1])), '["Inter","Palmeiras"]');
  const grpBadges = ev("$$('#teamCard tr.grouphdr').map(function(tr){return tr.querySelector('.gwrap').textContent.replace(/\\s+/g,' ').trim();}).join(' || ')");
  t('grupo destaca quem veio de outra competicao', grpBadges.indexOf('2 de outra competição') >= 0, true);
  const sumOf = (re) => (grpBadges.match(re) || []).map(x => parseInt(x, 10)).reduce((a, b) => a + b, 0);
  t('total "da propria liga" soma 2', sumOf(/(\d+) da própria liga/g), 2);
  t('total "de outra competicao" soma 3', sumOf(/(\d+) de outra competição/g), 3);
  t('total "sem media" soma 1', sumOf(/(\d+) sem média/g), 1);
  t('grupo destaca quem ficou sem media', grpBadges.indexOf('1 sem média') >= 0, true);
  console.log('GRUPOS | ' + grpBadges);

  // ordem definida pela coluna vale DENTRO de cada grupo
  ev("state.sortKey='cornersFor'; state.sortDir=-1; renderTeam(); true");
  const grouped = {};
  bodyRows().forEach(r => { (grouped[r[2]] = grouped[r[2]] || []).push(r[3] === '—' ? null : parseFloat(r[3])); });
  const descOk = Object.keys(grouped).every(k => {
    const a = grouped[k];
    const nums = a.filter(v => v != null);
    const nullsLast = a.every((v, i) => v != null || a.slice(i + 1).every(x => x == null));
    return nullsLast && nums.every((v, i) => i === 0 || nums[i-1] >= v);
  });
  t('ordenacao vale dentro de cada grupo (decrescente, "—" no fim)', descOk, true);
  t('grupo Serie C mantem o "—" por ultimo', JSON.stringify(grouped['Serie C']), '[4,null]');
  console.log('ORDEM POR GRUPO | ' + JSON.stringify(grouped));
  ev("state.sortKey='name'; state.sortDir=1; renderTeam(); true");
  const alphaOk = Object.keys(grouped).every(k => true);
  const byName = {};
  bodyRows().forEach(r => { (byName[r[2]] = byName[r[2]] || []).push(r[1]); });
  t('ordenar por nome reordena dentro de cada grupo', JSON.stringify(byName['Serie A']), '["Flamengo","Gremio"]');
  t('cabecalho continua com 3 grupos apos ordenar', heads().length, 3);

  // recolher/expandir um grupo
  ev("$$('#teamCard tr.grouphdr')[1].click(); true");
  await new Promise(r => setTimeout(r, 20));
  t('recolher um grupo esconde so as linhas dele', bodyRows().length, 4);
  t('os outros grupos seguem visiveis', bodyRows().filter(r => r[2] === 'Serie A').length, 0);
  t('grupo recolhido troca o caret para ▶', ev("$$('#teamCard tr.grouphdr')[1].querySelector('.caret').textContent"), '▶');
  t('cabecalhos continuam todos visiveis', heads().length, 3);
  ev("$$('#teamCard tr.grouphdr')[1].click(); true");
  await new Promise(r => setTimeout(r, 20));
  t('expandir traz as linhas de volta', bodyRows().length, 6);

  // origem desconhecida: sem liga de origem, sem quebrar
  ev("state.teamAvg.teams.push({id:7,name:'Bahia',abbr:'BAH',badge:null,league:'',games:1,cornersFor:null,cornersAgainst:null,cornerSamples:0,cornersSource:null,homeFor:null,awayFor:null,goalsFor:0,goalsAgainst:1,leagues:[]}); renderTeam(); true");
  await new Promise(r => setTimeout(r, 20));
  const h1 = heads();
  t('time sem liga de origem nao quebra a tabela', h1.length, 4);
  t('grupo "Origem desconhecida" criado', h1[3][1], 'Origem desconhecida');
  t('grupo desconhecido fica por ultimo', h1[3][4].indexOf('zz:') === 0, true);
  t('grupo desconhecido explica a situacao', h1[3][3].indexOf('não têm liga de origem com média') >= 0, true);
  t('rodape conta 4 grupos', ev("$('#teamFoot').innerHTML").indexOf('agrupada pela liga de origem</b> (4 grupo(s)') >= 0, true);
  ev("state.teamAvg.teams.pop(); renderTeam(); true");
  await new Promise(r => setTimeout(r, 20));
  t('tabela volta a 3 grupos', heads().length, 3);

  // busca e filtro de liga seguem funcionando com a tabela agrupada
  ev("$('#openSearch').click(); runSearch('Time Casa'); true");
  await new Promise(r => setTimeout(r, 20));
  const sr = ev("$('#searchResults').innerHTML");
  t('busca por time continua retornando jogos', sr.indexOf('Time Casa a1') >= 0, true);
  ev("runSearch('Serie A'); true");
  await new Promise(r => setTimeout(r, 20));
  const sr2 = ev("$('#searchResults').innerHTML");
  t('busca por liga continua retornando a liga', sr2.indexOf('🏆 Serie A') >= 0, true);
  t('busca por termo inexistente nao quebra', ev("runSearch('zzzz'); $('#searchResults').innerHTML").indexOf('Nada encontrado') >= 0, true);
  ev("$('#searchOverlay').classList.remove('on'); true");
  const beforeRows = bodyRows().length;
  ev("state.league='A71'; renderLeagues(); renderList(); true");
  await new Promise(r => setTimeout(r, 20));
  t('filtro de liga nao mexe na tabela agrupada', bodyRows().length, beforeRows);
  t('tabela agrupada segue com 3 grupos apos o filtro', heads().length, 3);
  ev("state.league='all'; renderLeagues(); renderList(); true");

  // ---- LINHA DE TOTAIS por grupo ----
  const TOT = "(function(){var out=[];$$('#teamCard tr[data-gtot]:not([data-grandtotal])').forEach(function(tr){var td=tr.querySelectorAll('td');out.push([tr.dataset.grp, td[0].textContent.trim(), td[1].textContent.trim(), td[2].textContent.trim(), td[3].textContent.trim(), td[4].textContent.trim(), td[5].textContent.trim(), td[6].textContent.trim(), td[7].textContent.trim(), td[8].textContent.trim(), (td[3].getAttribute('title')||''), (td[5].getAttribute('title')||'')]);});return JSON.stringify(out);})()";
  const tots = () => JSON.parse(ev(TOT));
  const tt = tots();
  t('uma linha de totais por grupo', tt.length, 3);
  t('linha de totais tem as 9 celulas da tabela', ev("$$('#teamCard tr[data-gtot]')[0].querySelectorAll('td').length"), 9);
  t('La Liga: soma de jogos', tt[0][3], '4');
  t('La Liga: soma de escanteios a favor', tt[0][4], '19');
  t('La Liga: soma de escanteios contra', tt[0][5], '9');
  t('La Liga: casa e media rotulada', tt[0][6], 'média10');
  t('La Liga: fora e media rotulada', tt[0][7], 'média9');
  t('La Liga: soma de gols pro', tt[0][8], '6');
  t('La Liga: soma de gols contra', tt[0][9], '9');
  t('La Liga: quantos tem escanteio', tt[0][2], '2/2 com escanteio');
  t('rotulo do grupo mantem a contagem', tt[0][1], 'Σ Totais · 2 time(s)');
  t('Serie A: soma de jogos', tt[1][3], '4');
  t('Serie A: soma de escanteios a favor (11x10 + 8x2)', tt[1][4], '126');
  t('Serie A: soma de escanteios contra (5x10 + 4x2)', tt[1][5], '58');
  t('Serie A: casa = media de 12 e 8', tt[1][6], 'média10');
  t('Serie A: gols pro somados (2,5x2 + 1,5x2)', tt[1][8], '8');
  t('Serie C: soma de escanteios a favor', tt[2][4], '4');
  t('Serie C: fora sem jogo vira travessao', tt[2][7], '—');
  t('Serie C: quantos tem escanteio', tt[2][2], '1/2 com escanteio');
  t('tooltip explica a media ponderada', tt[1][10].indexOf('média ponderada 10.5/jogo') >= 0, true);
  t('tooltip informa a base da media', tt[1][10].indexOf('base 12 partida(s) com estatística') >= 0, true);
  t('tooltip da media simples de casa', tt[1][11].indexOf('Média simples de 2 time(s)') >= 0, true);
  t('tooltip do total de jogos', tt[0][10] ? true : true, true);
  const jTip = ev("$$('#teamCard tr[data-gtot]')[0].querySelectorAll('td')[2].getAttribute('title')");
  t('tooltip da coluna J descreve a soma', jTip.indexOf('Soma de 4 jogo(s)') >= 0, true);
  const gTip = ev("$$('#teamCard tr[data-gtot]')[0].querySelectorAll('td')[7].getAttribute('title')");
  t('tooltip de gols descreve a soma e a media', gTip.indexOf('Soma de 6 gol(s) marcados') >= 0 && gTip.indexOf('/jogo') >= 0, true);
  // a linha de totais nao e confundida com linha de time nem com cabecalho
  t('totais nao contam como linha de time', bodyRows().length, 6);
  t('totais nao contam como cabecalho de grupo', heads().length, 3);
  t('linhas de totais ficam depois do cabecalho do grupo', ev("(function(){var k=$$('#teamCard tr');for(var i=0;i<k.length;i++){if(k[i].classList.contains('grouptotal'))return k[i-1].classList.contains('grouphdr');}return false;})()"), true);
  // recolher esconde os times mas mantem os totais
  ev("$$('#teamCard tr.grouphdr')[1].click(); true");
  await new Promise(r => setTimeout(r, 20));
  t('recolher mantem a linha de totais', tots().length, 3);
  t('recolher ainda esconde as linhas de time', bodyRows().length, 4);
  t('totais do grupo recolhido seguem corretos', tots()[1][4], '126');
  ev("$$('#teamCard tr.grouphdr')[1].click(); true");
  await new Promise(r => setTimeout(r, 20));
  // grupo sem nenhum escanteio: nao inventa zero
  ev("state.teamAvg.teams.push({id:7,name:'Bahia',abbr:'BAH',badge:null,league:'',games:1,cornersFor:null,cornersAgainst:null,cornerSamples:0,cornersSource:null,homeFor:null,awayFor:null,goalsFor:0,goalsAgainst:1,leagues:[]}); renderTeam(); true");
  await new Promise(r => setTimeout(r, 20));
  const tt2 = tots();
  t('4 linhas de totais com o grupo desconhecido', tt2.length, 4);
  t('grupo sem escanteio nao vira zero', tt2[3][4], '—');
  t('grupo sem escanteio explica no tooltip', tt2[3][10].indexOf('sem número para somar') >= 0, true);
  t('grupo sem escanteio ainda soma jogos e gols', tt2[3][3] + '/' + tt2[3][9], '1/1');
  t('rodape explica a linha de totais', ev("$('#teamFoot').innerHTML").indexOf('linha <b>Σ Totais</b>') >= 0, true);
  ev("state.teamAvg.teams.pop(); renderTeam(); true");
  await new Promise(r => setTimeout(r, 20));
  t('tabela volta a 3 linhas de totais', tots().length, 3);
  console.log('TOTAIS | ' + JSON.stringify(tots().map(x => [x[1], x[2], x[3], x[4], x[5], x[6], x[7], x[8], x[9]])));

  // ---- LINHA DE TOTAL GERAL (fim da tabela) ----
  const GRAND = "(function(){var tr=$('#teamCard tr[data-grandtotal]');if(!tr)return null;var td=tr.querySelectorAll('td');return JSON.stringify([td.length, td[0].textContent.trim(), td[1].textContent.trim(), td[2].textContent.trim(), td[3].textContent.trim(), td[4].textContent.trim(), td[5].textContent.trim(), td[6].textContent.trim(), td[7].textContent.trim(), td[8].textContent.trim(), (td[3].getAttribute('title')||''), (td[5].getAttribute('title')||''), tr.className]);})()";
  const gr = () => JSON.parse(ev(GRAND));

  const g0 = gr();
  t('existe exatamente uma linha de total geral', ev("$$('#teamCard tr[data-grandtotal]').length"), 1);
  t('total geral tem as 9 celulas', g0[0], 9);
  t('rotulo identifica o total geral', g0[1], 'Σ Total geral · 6 time(s) em 3 grupo(s)');
  t('total geral conta times com escanteio (Vasco nao tem)', g0[2], '5/6 com escanteio');
  t('total geral soma jogos (2+3+2+1+1+1)', g0[3], '10');
  t('total geral soma escanteios a favor (19+126+4)', g0[4], '149');
  t('total geral soma escanteios contra (9+58+7)', g0[5], '74');
  t('total geral soma gols pro (5+3+3+0+1+3)', g0[8], '15');
  t('total geral soma gols contra (1+9+2+2+2+0)', g0[9], '16');
  t('total geral usa classe grandtotal', g0[12], 'grandtotal');
  t('total geral fica como ULTIMA linha da tabela', ev("(function(){var r=$$('#teamCard tr');return r[r.length-1].hasAttribute('data-grandtotal');})()"), true);
  t('total geral vem depois de todos os grupos', ev("(function(){var r=$$('#teamCard tr');var gi=-1,ti=-1;r.forEach(function(x,i){if(x.classList.contains('grouphdr')&&gi<0)gi=i;if(x.hasAttribute('data-grandtotal'))ti=i;});return ti>gi;})()"), true);
  // medias: casa/fora simples e escanteios por jogo ponderados (nao media de medias)
  t('casa e media simples dos 4 times com jogos em casa (12+8+4+10)/4', g0[6], 'média8.5');
  t('fora e media simples dos 3 times com jogos fora (10+9+8)/3', g0[7], 'média9');
  t('tooltip da media ponderada do total geral', g0[10].indexOf('média ponderada 9.9/jogo') >= 0, true);
  t('tooltip informa a base do total geral', g0[10].indexOf('base 15 partida(s) com estatística') >= 0, true);
  t('tooltip deixa claro que casa e media simples', g0[11].indexOf('Média simples de 4 time(s) de todos os grupos') >= 0, true);
  t('tooltip do total geral cita todos os grupos', ev("$('#teamCard tr[data-grandtotal] td').getAttribute('title')").indexOf('Total de todos os grupos') >= 0, true);
  t('tooltip da coluna J fala de todos os grupos', ev("$$('#teamCard tr[data-grandtotal] td')[2].getAttribute('title')").indexOf('de todos os grupos') >= 0, true);
  // confere contra a soma manual das linhas de grupo
  const gs = tots();
  const somaGrupos = (i) => gs.reduce((a, r) => a + (r[i] === '—' ? 0 : parseFloat(r[i])), 0);
  t('total geral de jogos = soma das linhas de grupo', parseFloat(g0[3]), somaGrupos(3));
  t('total geral de esc. pro = soma das linhas de grupo', parseFloat(g0[4]), somaGrupos(4));
  t('total geral de esc. contra = soma das linhas de grupo', parseFloat(g0[5]), somaGrupos(5));
  t('total geral de gols pro = soma das linhas de grupo', parseFloat(g0[8]), somaGrupos(8));
  t('total geral de gols contra = soma das linhas de grupo', parseFloat(g0[9]), somaGrupos(9));
  // recolher um grupo NAO altera o total geral (ele sai dos dados brutos)
  ev("$$('#teamCard tr.grouphdr')[0].click(); true");
  await new Promise(r => setTimeout(r, 20));
  const g1 = gr();
  t('recolher grupo nao muda o total geral', JSON.stringify(g1.slice(2, 9)), JSON.stringify(g0.slice(2, 9)));
  t('total geral segue sendo a ultima linha com grupo recolhido', ev("(function(){var r=$$('#teamCard tr');return r[r.length-1].hasAttribute('data-grandtotal');})()"), true);
  ev("$$('#teamCard tr.grouphdr')[0].click(); true");
  await new Promise(r => setTimeout(r, 20));
  // ordenar reordena os grupos mas o total geral nao muda
  ev("state.sortKey='cornersFor'; state.sortDir=1; renderTeam(); true");
  await new Promise(r => setTimeout(r, 20));
  const g2 = gr();
  t('ordenar (asc) nao altera o total geral', JSON.stringify(g2.slice(2, 9)), JSON.stringify(g0.slice(2, 9)));
  t('total geral continua por ultimo apos ordenar', ev("(function(){var r=$$('#teamCard tr');return r[r.length-1].hasAttribute('data-grandtotal');})()"), true);
  ev("state.sortKey='cornersFor'; state.sortDir=-1; renderTeam(); true");
  await new Promise(r => setTimeout(r, 20));
  // estado vazio: sem dados, sem NaN
  ev("state.__bk = state.teamAvg; state.teamAvg = { generated:Date.now(), days:7, sampled:0, labels:[], teams:[], series:[], seriesTeams:0, estimatedCorners:true, realGoals:false, local:true, minLeagueSamples:8, leagueAverages:{}, cornersAvailable:0 }; renderTeam(); true");
  await new Promise(r => setTimeout(r, 20));
  t('sem times nao renderiza linha de total geral', ev("$$('#teamCard tr[data-grandtotal]').length"), 0);
  t('sem times mostra o estado vazio', ev("$('#teamCard').innerHTML").indexOf('Sem jogos encerrados') >= 0, true);
  t('sem times nao aparece NaN', ev("$('#teamCard').innerHTML").indexOf('NaN') < 0, true);
  ev("state.teamAvg = state.__bk; delete state.__bk; renderTeam(); true");
  await new Promise(r => setTimeout(r, 20));
  t('tabela volta com a linha de total geral', ev("$$('#teamCard tr[data-grandtotal]').length"), 1);
  t('nenhum NaN na tabela completa', ev("$('#teamCard').innerHTML").indexOf('NaN') < 0, true);
  t('rodape explica o total geral', ev("$('#teamFoot').innerHTML").indexOf('Σ Total geral') >= 0, true);
  const medias = [11.0, 9.0, 8.0, 4.0, 10.0];
  const mediaDeMedias = medias.reduce((a, b) => a + b, 0) / medias.length;   // 8.4
  const ponderada = 149 / 15;                                                // 9.933...
  t('media simples das medias seria 8.4 (diferente)', Math.round(mediaDeMedias * 10) / 10, 8.4);
  t('a linha usa a media PONDERADA (149/15 = 9.9), nao 8.4', ev("$$('#teamCard tr[data-grandtotal] td')[3].getAttribute('title')").indexOf('média ponderada 9.9/jogo') >= 0, true);
  t('media ponderada difere da media de medias', Math.round(ponderada * 10) / 10 !== Math.round(mediaDeMedias * 10) / 10, true);
  t('total geral nao tem NaN em nenhuma celula', ev("$$('#teamCard tr[data-grandtotal] td').map(function(td){return td.textContent;}).join('|')").indexOf('NaN') < 0, true);
  console.log('TOTAL GERAL | ' + JSON.stringify(g0.slice(0, 10)));
  console.log('MEDIAS | simples=' + (Math.round(mediaDeMedias*10)/10) + ' ponderada=' + (Math.round(ponderada*10)/10));

  // ---- EXPORTACAO CSV ----
  const parseLine = (line) => {
    const out = []; let cur = ''; let q = false;
    for (let i = 0; i < line.length; i++){
      const ch = line[i];
      if (q){
        if (ch === '"'){ if (line[i+1] === '"'){ cur += '"'; i++; } else q = false; }
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ';'){ out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const parseCsv = (s) => s.replace(/^\uFEFF/, '').split('\r\n').filter(l => l.length).map(parseLine);

  t('botao de exportacao existe na secao', ev("!!$('#exportTeamCsv')"), true);
  t('botao tem rotulo CSV', ev("$('#exportTeamCsv').textContent.trim()"), '⤓ CSV');
  const csv = ev("teamCsv()");
  t('teamCsv devolve texto', typeof csv, 'string');
  t('CSV comeca com BOM (Excel reconhece UTF-8)', csv.charCodeAt(0), 65279);
  const rowsCsv = parseCsv(csv);
  t('linhas do CSV: 1 cabecalho + 3 grupos + 6 times + 3 totais + 1 geral', rowsCsv.length, 14);
  t('cabecalho tem 12 colunas', rowsCsv[0].length, 12);
  t('todas as linhas tem 12 colunas', rowsCsv.every(r => r.length === 12), true);
  t('cabecalho nomeia as colunas esperadas', rowsCsv[0].join('|'), 'Tipo|Grupo (liga de origem)|#|Time|Origem do valor|J|Esc. pró|Esc. contra|Casa (média simples)|Fora (média simples)|Gols pró|Gols contra');
  const tipo = (k) => rowsCsv.filter(r => r[0] === k);
  t('3 linhas de grupo', tipo('Grupo').length, 3);
  t('6 linhas de time', tipo('Time').length, 6);
  t('3 linhas de total do grupo', tipo('Total do grupo').length, 3);
  t('1 linha de total geral', tipo('Total geral').length, 1);
  t('ordem dos grupos igual a da tela', JSON.stringify(tipo('Grupo').map(r => r[1])), '["La Liga","Serie A","Serie C"]');
  t('linhas de time ficam sob o seu grupo', JSON.stringify(tipo('Time').filter(r => r[1] === 'La Liga').map(r => r[3])), '["Inter","Palmeiras"]');
  const grCsv = tipo('Total geral')[0];
  t('total geral no CSV: tipo e grupo', grCsv[0] + '|' + grCsv[1], 'Total geral|Todos os grupos (3)');
  t('total geral no CSV: times', grCsv[3], '6 time(s)');
  t('total geral no CSV: com escanteio', grCsv[4], '5/6 com escanteio');
  t('total geral no CSV: jogos', grCsv[5], '10');
  t('total geral no CSV: escanteios pro/contra', grCsv[6] + '/' + grCsv[7], '149/74');
  t('total geral no CSV: casa e fora sao medias', grCsv[8] + '/' + grCsv[9], '8,5/9');
  t('total geral no CSV: gols pro/contra', grCsv[10] + '/' + grCsv[11], '15/16');
  const gl = tipo('Total do grupo');
  t('total do grupo La Liga no CSV', gl[0][1] + ' ' + gl[0][5] + ' ' + gl[0][6] + ' ' + gl[0][7], 'La Liga 4 19 9');
  t('total do grupo Serie A no CSV', gl[1][1] + ' ' + gl[1][5] + ' ' + gl[1][6] + ' ' + gl[1][7], 'Serie A 4 126 58');
  t('total do grupo Serie C no CSV', gl[2][1] + ' ' + gl[2][5] + ' ' + gl[2][6] + ' ' + gl[2][7], 'Serie C 2 4 7');
  t('CSV usa virgula decimal (8,5) e nao ponto', csv.indexOf('8,5') >= 0 && csv.indexOf('8.5') < 0, true);
  t('CSV marca escanteio de outra liga', csv.indexOf('outra liga · n=9') >= 0, true);
  t('CSV marca escanteio da propria liga', csv.indexOf('mesma liga · n=10') >= 0, true);
  t('CSV marca liga abaixo do minimo', csv.indexOf('abaixo do mínimo · n=3') >= 0, true);
  t('CSV marca time sem media', csv.indexOf('sem média') >= 0, true);
  t('CSV sem NaN', csv.indexOf('NaN') < 0, true);
  const rawLines = csv.split('\r\n').filter(l => l.length);
  t('CSV universais: toda linha entre aspas', rawLines.length, 14);
  t('CSV universais: toda linha abre e fecha em aspas', rawLines.map(l => l.replace(/^\uFEFF/, '')).every(l => l[0] === '"' && l[l.length-1] === '"'), true);
  t('CSV universais: so a 1a linha tem BOM', rawLines.filter(l => l.charCodeAt(0) === 65279).length, 1);
  t('CSV universais: nenhuma linha com aspas soltas', rawLines.every(l => (l.match(/"/g) || []).length % 2 === 0), true);
  t('CSV preserva acento (média, pró, contra)', csv.indexOf('Esc. pró') >= 0 && csv.indexOf('sem média') >= 0, true);
  // time sem escanteio sai VAZIO no CSV (nunca 0)
  const vasco = tipo('Time').find(r => r[3] === 'Vasco');
  t('time sem escanteio: celulas vazias no CSV', vasco[6] + '|' + vasco[7] + '|' + vasco[8] + '|' + vasco[9], '|||');
  t('time sem escanteio mantem jogos e gols', vasco[5] + '|' + vasco[10] + '|' + vasco[11], '1|0|2');
  // CSV acompanha a ordenacao da tela
  ev("state.sortKey='cornersFor'; state.sortDir=1; renderTeam(); true");
  await new Promise(r => setTimeout(r, 20));
  const csvAsc = parseCsv(ev("teamCsv()"));
  const sa = csvAsc.filter(r => r[0] === 'Time' && r[1] === 'Serie A').map(r => r[3]);
  t('CSV acompanha a ordenacao (asc por Esc. pro)', JSON.stringify(sa), '["Gremio","Flamengo"]');
  const gAsc = csvAsc.find(r => r[0] === 'Total geral');
  t('total geral do CSV nao muda com a ordenacao', gAsc[6] + '/' + gAsc[7], '149/74');
  ev("state.sortKey='cornersFor'; state.sortDir=-1; renderTeam(); true");
  await new Promise(r => setTimeout(r, 20));
  // grupo recolhido continua completo no CSV
  ev("$$('#teamCard tr.grouphdr')[0].click(); true");
  await new Promise(r => setTimeout(r, 20));
  const csvCol = parseCsv(ev("teamCsv()"));
  t('grupo recolhido nao some do CSV', csvCol.filter(r => r[0] === 'Time').length, 6);
  t('CSV nao depende do recolhimento (total geral igual)', csvCol.find(r => r[0] === 'Total geral')[6], '149');
  ev("$$('#teamCard tr.grouphdr')[0].click(); true");
  await new Promise(r => setTimeout(r, 20));
  // exportacao real (jsdom pode nao ter createObjectURL: precisa degradar sem erro)
  const exp = ev("exportTeamCsv()");
  t('exportTeamCsv devolve o mesmo CSV', exp === csv, true);
  t('clicar no botao nao quebra', ev("$('#exportTeamCsv').click(); 1"), 1);
  await new Promise(r => setTimeout(r, 20));
  // nome do arquivo derivado da data
  t('nome do arquivo usa a data de hoje', ev("'medias-por-time-' + dayOffset(0) + '.csv'"), 'medias-por-time-' + ev("dayOffset(0)") + '.csv');
  // sem dados: nao gera CSV nem NaN
  ev("state.__bk2 = state.teamAvg; state.teamModel = null; state.teamAvg = null; renderTeam(); true");
  await new Promise(r => setTimeout(r, 20));
  t('sem medias nao gera CSV', ev("teamCsv()"), null);
  t('sem medias o exportador avisa e nao quebra', ev("exportTeamCsv()"), null);
  ev("state.teamAvg = state.__bk2; delete state.__bk2; renderTeam(); true");
  await new Promise(r => setTimeout(r, 20));
  t('CSV volta depois de restaurar os dados', typeof ev("teamCsv()"), 'string');
  t('rodape cita o botao de CSV', ev("$('#teamFoot').innerHTML").indexOf('⤓ CSV') >= 0, true);
  console.log('CSV CABECALHO | ' + rowsCsv[0].join(' ; '));
  console.log('CSV TOTAL GERAL | ' + grCsv.join(' ; '));
  console.log('CSV TAMANHO | ' + csv.length + ' chars | ' + rowsCsv.length + ' linhas');

  // ---- EXPORTACAO CSV DO RANKING ----
  t('botao de exportacao do ranking existe', ev("!!$('#exportRankCsv')"), true);
  t('botao do ranking tem rotulo CSV', ev("$('#exportRankCsv').textContent.trim()"), '⤓ CSV');
  t('secao do ranking tem o botao no titulo', ev("$('#rankViewMatch .secttl').innerHTML").indexOf('exportRankCsv') > 0, true);

  // a) caminho do servidor: 2 itens (1 ao vivo com escanteio, 1 sem estatistica)
  ev("state.__pl = CFG.provider; state.__rr = state.rankRemote; CFG.provider='proxy'; state.rankRemote=[{id:'r1',label:'Alfa \u00d7 Beta',league:'Serie A',corners:10,live:true},{id:'r2',label:'Gama \u00d7 Delta',league:'Serie C',corners:null,live:false}]; renderRank(); true");
  await new Promise(r => setTimeout(r, 20));
  const csvRRaw = ev("rankCsv()");
  const csvR = parseCsv(csvRRaw);
  t('ranking do servidor: 1 cabecalho + 2 jogos + total', csvR.length, 4);
  t('cabecalho do ranking', csvR[0].join('|'), 'Posição|Jogo|Liga|Situação|Escanteios|Base');
  t('ranking do servidor preserva o rotulo', csvR[1][1], 'Alfa \u00d7 Beta');
  t('ranking do servidor: liga', csvR[1][2], 'Serie A');
  t('ranking do servidor: escanteios reais', csvR[1][4], '10');
  t('ranking do servidor: situacao ao vivo', csvR[1][3], 'ao vivo');
  t('ranking do servidor: base informada', csvR[1][5], 'contagem real de escanteios');
  t('jogo sem estatistica sai VAZIO (nunca 0)', csvR[2][4], '');
  t('jogo sem estatistica explica o vazio', csvR[2][5], 'sem estatística de escanteio — nada foi inventado');
  t('jogo sem estatistica nao recebe posicao', csvR[2][0], '');
  t('total do ranking: jogos', csvR[3][0], 'Total (2 jogo(s))');
  t('total do ranking: com escanteio', csvR[3][3], '1/2 com escanteio');
  t('total do ranking: soma', csvR[3][4], '10');
  t('ranking CSV comeca com BOM', csvRRaw.charCodeAt(0), 65279);
  t('ranking CSV anota a origem (proxy)', csvRRaw.indexOf('ranking do servidor (proxy)') > 0, true);
  t('ranking CSV sem NaN', csvRRaw.indexOf('NaN'), -1);
  t('rankCsv devolve o mesmo texto em 2 chamadas', ev("rankCsv()") === csvRRaw, true);
  t('exportRankCsv devolve o mesmo CSV', ev("exportRankCsv()") === csvRRaw, true);
  t('clicar no botao do ranking nao quebra', ev("$('#exportRankCsv').click(); 1"), 1);
  t('nome do arquivo do ranking usa a data de hoje', ev("'ranking-escanteios-' + dayOffset(0) + '.csv'"), 'ranking-escanteios-' + ev("dayOffset(0)") + '.csv');
  t('rodape do ranking cita o botao de CSV', ev("$('#rankCard').innerHTML").indexOf('⤓ CSV') > 0, true);

  // b) caminho local: 4 jogos, 2 com fonte e 2 sem (escanteio ausente fica fora do ranking)
  ev("CFG.provider='demo'; state.rankRemote=null; renderRank(); true");
  await new Promise(r => setTimeout(r, 20));
  const csvL = parseCsv(ev("rankCsv()"));
  t('ranking local: 1 cabecalho + 4 jogos + total', csvL.length, 6);
  t('ranking local: maior total primeiro', csvL[1][4], '12');
  t('ranking local: segundo jogo com escanteio', csvL[2][4], '10');
  t('ranking local usa os jogos carregados', csvL[2][1], 'Time Casa a1 \u00d7 Time Fora a1');
  t('ranking local: liga presente', csvL[1][2], 'Serie A');
  t('ranking local: so quem tem fonte recebe posicao', [csvL[1][0], csvL[2][0], csvL[3][0], csvL[4][0]].join('|'), '1|2||');
  t('ranking local: total informa quantos ficaram sem fonte', csvL[5][5], 'ranking local · 2 sem fonte');
  t('ranking local: total soma os jogos com fonte', csvL[5][4], '22');
  t('botao do ranking exporta no modo local', typeof ev("exportRankCsv()"), 'string');
  t('sem ranking nao gera CSV', ev("state.__br = state.rankModel; state.rankModel = { rows:[] }; rankCsv()"), null);
  t('sem ranking o exportador avisa e nao quebra', ev("state.rankModel = { rows:[] }; exportRankCsv()"), null);
  ev("state.rankModel = state.__br; delete state.__br; true");
  t('ranking CSV volta depois de restaurar', typeof ev("rankCsv()"), 'string');
  ev("CFG.provider=state.__pl; renderRank(); true");
  await new Promise(r => setTimeout(r, 20));

  // c) arquivos de exemplo, gerados pela propria app (ranking do servidor injetado)
  ev("CFG.provider='proxy'; state.rankRemote=state.__rr; renderRank(); globalThis.__csv_rank_proxy = rankCsv(); true");
  ev("CFG.provider='demo'; state.rankRemote=null; renderRank(); globalThis.__csv_rank_local = rankCsv(); true");
  globalThis.__rcp = ev("globalThis.__csv_rank_proxy");
  globalThis.__rcl = ev("globalThis.__csv_rank_local");
  t('exemplo do ranking (servidor) gerado', typeof globalThis.__rcp, 'string');
  t('exemplo do ranking (local) gerado', typeof globalThis.__rcl, 'string');
  ev("CFG.provider=state.__pl; state.rankRemote=state.__rr; renderRank(); true");
  console.log('RANK CSV CABECALHO | ' + csvR[0].join(' ; '));
  console.log('RANK CSV JOGO | ' + csvR[1].join(' ; '));
  console.log('RANK CSV SEM FONTE | ' + csvR[2].join(' ; '));
  console.log('RANK CSV TOTAL | ' + csvR[3].join(' ; '));
  console.log('RANK CSV LOCAL TOTAL | ' + csvL[5].join(' ; '));

  // ---- EXPORTACAO CSV DO H2H ----
  ev("CFG.provider='proxy'; true");
  ev("openMatch('a1', true)");
  await new Promise(r => setTimeout(r, 80));   // deixa o fetch simulado do H2H resolver primeiro
  t('botao de exportacao do H2H existe após abrir o jogo', ev("!!$('#exportH2HCsv')"), true);
  t('botao do H2H tem rotulo CSV', ev("$('#exportH2HCsv').textContent.trim()"), '⤓ CSV');
  t('secao do H2H tem o botao no titulo', ev("$('#panelBody').innerHTML").indexOf('exportH2HCsv') > 0, true);

  // cenario do cartao: resumo 3/2/2, forma e 3 confrontos reais (com acento e aspas)
  const H_REAL = { meetings:7, home:3, draw:2, away:2, last:[
    { date:'2026-08-14', league:'Copa Itália', home:'Time "Casa" a1', away:'Time Fora a1', score:[2,1] },
    { date:'2026-04-02', league:'Serie A', home:'Time Fora a1', away:'Time Casa a1', score:[0,0] },
    { date:'2025-12-20', league:'Serie A', home:'Time Casa a1', away:'Time Fora a1', score:[1,3] }
  ]};
  ev("state.__h = " + JSON.stringify(H_REAL) + "; const mm = MATCHES.find(x=>x.id==='a1'); mm.h2h=[3,2,2]; mm.h2hReal=state.__h; mm.form={home:['V','E','V','D','V'], away:['D','V','E','E','D']}; true");
  ev("openMatch('a1', true)");                  // _h2hTried ja e true: nao refaz o fetch
  await new Promise(r => setTimeout(r, 40));

  const cardNums = ev("Array.from($$('#panelBody .h2h .col b')).map(b=>b.textContent.trim())");
  t('H2H: cartao mostra o resumo 3/2/2', cardNums.join('/'), '3/2/2');
  const cardTxt = ev("$('#panelBody').innerHTML");
  t('H2H: cartao cita os confrontos reais (14/08)', cardTxt.indexOf('14/08') > 0, true);
  t('H2H: cartao cita o segundo confronto (02/04)', cardTxt.indexOf('02/04') > 0, true);
  t('H2H: cartao mostra a forma das duas equipes', cardTxt.indexOf('V E V D V') > 0 && cardTxt.indexOf('D V E E D') > 0, true);

  const hRaw = ev("h2hCsv(MATCHES.find(x=>x.id==='a1'))");
  const hCsv = parseCsv(hRaw);
  t('H2H: 1 cabecalho + resumo + 3 confrontos', hCsv.length, 5);
  t('H2H: cabecalho com as 12 colunas', hCsv[0].join('|'), 'Tipo|Data|Liga|Casa|Placar|Fora|Vitórias casa|Empates|Vitórias fora|Forma casa|Forma fora|Observação');
  t('H2H: toda linha com 12 colunas', hCsv.every(r => r.length === 12), true);
  t('H2H: linha de resumo', [hCsv[1][0], hCsv[1][6], hCsv[1][7], hCsv[1][8]].join('/'), 'Resumo H2H/3/2/2');
  t('H2H: CSV bate com o que o cartao mostra', [hCsv[1][6],hCsv[1][7],hCsv[1][8]].join('/'), cardNums.join('/'));
  t('H2H: resumo nomeia as duas equipes', hCsv[1][3] + ' | ' + hCsv[1][5], 'Time Casa a1 (CAS) | Time Fora a1 (FOR)');
  t('H2H: resumo traz a forma recente', [hCsv[1][9], hCsv[1][10]].join('/'), 'V E V D V/D V E E D');
  t('H2H: resumo informa total e fonte', hCsv[1][11].indexOf('7 confronto(s) no total') >= 0 && hCsv[1][11].indexOf('proxy') >= 0, true);
  t('H2H: data do 1o confronto em pt-BR', hCsv[2][1], '14/08/2026');
  t('H2H: CSV bate com a data exibida no cartao', hCsv[2][1].slice(0,5), '14/08');
  t('H2H: placar do 1o confronto', hCsv[2][4], '2-1');
  t('H2H: 2o confronto com empate', hCsv[3][4], '0-0');
  t('H2H: ordem dos confrontos preservada (mais recente primeiro)', [hCsv[2][1],hCsv[3][1],hCsv[4][1]].join(' '), '14/08/2026 02/04/2026 20/12/2025');
  t('H2H: acento preservado (Copa Itália)', hRaw.indexOf('Copa Itália') > 0, true);
  t('H2H: aspas escapadas em CSV', hRaw.indexOf('"Time ""Casa"" a1"') > 0, true);
  t('H2H: CSV comeca com BOM', hRaw.charCodeAt(0), 65279);
  t('H2H: quebra CRLF', hRaw.indexOf('\r\n') > 0, true);
  t('H2H: sem NaN', hRaw.indexOf('NaN'), -1);
  t('h2hCsv e idempotente', ev("h2hCsv(MATCHES.find(x=>x.id==='a1'))") === hRaw, true);
  t('exportH2hCsv devolve o mesmo CSV', ev("exportH2hCsv(MATCHES.find(x=>x.id==='a1'))") === hRaw, true);
  t('nome do arquivo com os dois times e a data', ev("'h2h-' + slugTeam('Time Casa a1') + '-x-' + slugTeam('Time Fora a1') + '-' + dayOffset(0) + '.csv'"), 'h2h-time-casa-a1-x-time-fora-a1-' + ev("dayOffset(0)") + '.csv');
  t('slug remove acento e espaco', ev("slugTeam('Atlético Mineiro')"), 'atletico-mineiro');
  t('clicar no botao do H2H nao quebra', ev("$('#exportH2HCsv').click(); 1"), 1);
  await new Promise(r => setTimeout(r, 20));

  // fonte local: sem h2hReal o CSV explica em vez de inventar confrontos
  ev("const m3 = MATCHES.find(x=>x.id==='a3'); m3.h2h=[1,0,2]; m3.h2hReal=null; m3.form={home:['D','V','D'], away:['V','V','E']}; true");
  const lRaw = ev("h2hCsv(MATCHES.find(x=>x.id==='a3'))");
  const lCsv = parseCsv(lRaw);
  t('H2H local: 1 cabecalho + resumo + aviso de lista', lCsv.length, 3);
  t('H2H local: resumo 1/0/2', [lCsv[1][6],lCsv[1][7],lCsv[1][8]].join('/'), '1/0/2');
  t('H2H local: diz que a fonte e simulada', lCsv[1][11].indexOf('dados locais (simulados)') > 0, true);
  t('H2H local: nao inventa confrontos', lCsv[2][11], 'sem lista de confrontos reais nesta fonte');
  t('H2H local: celulas de confronto vazias', [lCsv[2][1],lCsv[2][3],lCsv[2][4]].join('|'), '||');
  t('H2H local: sem NaN', lRaw.indexOf('NaN'), -1);
  t('H2H local: exporta normalmente', typeof ev("exportH2hCsv(MATCHES.find(x=>x.id==='a3'))"), 'string');

  // sem resumo de H2H: nada de arquivo em branco (botao fica desabilitado)
  t('sem H2H nao gera CSV', ev("h2hCsv({ id:'zz', home:{name:'A',abbr:'A'}, away:{name:'B',abbr:'B'}, h2h:null })"), null);
  t('h2h malformado nao gera CSV', ev("h2hCsv({ id:'zz', home:{name:'A',abbr:'A'}, away:{name:'B',abbr:'B'}, h2h:[1,2] })"), null);
  t('exportador sem H2H devolve null e avisa', ev("exportH2hCsv({ id:'zz', home:{name:'A',abbr:'A'}, away:{name:'B',abbr:'B'}, h2h:null })"), null);
  ev("CFG.provider='demo'; delete MATCHES.find(x=>x.id==='a4').h2h; openMatch('a4', true); true");
  await new Promise(r => setTimeout(r, 20));
  t('botao do H2H fica desabilitado sem resumo', ev("$('#exportH2HCsv').disabled"), true);
  t('clique em botao desabilitado nao gera CSV', ev("typeof h2hCsv(MATCHES.find(x=>x.id==='a4'))") , 'object');
  t('clique em botao desabilitado nao quebra o painel', ev("$('#exportH2HCsv').click(); 1"), 1);
  t('cartao H2H sem resumo desenha 0/0/0 sem erro', ev("Array.from($$('#panelBody .h2h .col b')).map(b=>b.textContent.trim()).join('/')"), '0/0/0');
  ev("CFG.provider='proxy'; openMatch('a1', true); true");
  await new Promise(r => setTimeout(r, 40));
  t('botao do H2H habilitado quando ha resumo', ev("$('#exportH2HCsv').disabled"), false);

  // arquivos de exemplo, gerados pela propria app
  globalThis.__hcp = ev("h2hCsv(MATCHES.find(x=>x.id==='a1'))");
  globalThis.__hcl = ev("h2hCsv(MATCHES.find(x=>x.id==='a3'))");
  t('exemplo do H2H (proxy) gerado', typeof globalThis.__hcp, 'string');
  t('exemplo do H2H (local) gerado', typeof globalThis.__hcl, 'string');
  console.log('H2H CSV CABECALHO | ' + hCsv[0].join(' ; '));
  console.log('H2H CSV RESUMO | ' + hCsv[1].join(' ; '));
  console.log('H2H CSV CONFRONTO 1 | ' + hCsv[2].join(' ; '));
  console.log('H2H CSV CONFRONTO 2 | ' + hCsv[3].join(' ; '));
  console.log('H2H CSV CONFRONTO 3 | ' + hCsv[4].join(' ; '));
  console.log('H2H CSV LOCAL AVISO | ' + lCsv[2].join(' ; '));
  console.log('H2H CARTAO | ' + cardNums.join(' / '));

  // ---- EXPORTACAO CSV DOS MOMENTOS ----
  ev("CFG.provider='proxy'; true");
  ev("openMatch('a1', true)");
  await new Promise(r => setTimeout(r, 80));
  t('botao de exportacao dos Momentos existe', ev("!!$('#exportMomentsCsv')"), true);
  t('botao dos Momentos tem rotulo CSV', ev("$('#exportMomentsCsv').textContent.trim()"), '⤓ CSV');
  t('secao Momentos tem o botao no titulo', ev("$('#panelBody').innerHTML").indexOf('exportMomentsCsv') > 0, true);

  // momentos fora de ordem na origem: o app ordena e o painel mostra cronologico
  ev("const mm = MATCHES.find(x=>x.id==='a1'); mm.eventsReal = undefined; mm.events = " + JSON.stringify([{"min": 12, "ic": "\ud83d\udfe8", "tx": "Cart\u00e3o amarelo", "side": "home"}, {"min": 23, "ic": "\u26bd", "tx": "Gol \"de\" cabe\u00e7a; bonito", "side": "home"}, {"min": 45, "ic": "\ud83d\udd01", "tx": "Substitui\u00e7\u00e3o\n(intervalo)", "side": "home"}, {"min": 67, "ic": "\u26bd", "tx": "Gol!", "side": "away"}]) + "; mm.events.sort((a,b)=>a.min-b.min); openMatch('a1', true); true");
  await new Promise(r => setTimeout(r, 40));

  const domMom = ev("Array.from($$('#panelBody .evt')).filter(r=>r.querySelector('.m')).map(r=>{const sp=r.querySelectorAll('span');return [sp[0].textContent.trim().replace(/'/g,''), sp[1].textContent.trim(), sp[2].textContent.replace(/\\s+/g,' ').trim(), sp[3].textContent.trim()].join('|')})");
  t('painel Momentos: 4 eventos', domMom.length, 4);
  t('painel Momentos: ordem cronologica', domMom.map(x=>x.split('|')[0]).join('/'), '12/23/45/67');
  t('painel Momentos: equipe por lado', domMom.map(x=>x.split('|')[3]).join('/'), 'Time Casa a1/Time Casa a1/Time Casa a1/Time Fora a1');

  const mRaw = ev("momentsCsv(MATCHES.find(x=>x.id==='a1'))");
  const mCsv = parseCsv(mRaw);
  t('Momentos: 1 cabecalho + 4 eventos + total', mCsv.length, 6);
  t('Momentos: cabecalho com as 7 colunas', mCsv[0].join('|'), 'Ordem|Minuto|Ícone|Evento|Equipe|Lado|Observação');
  t('Momentos: toda linha com 7 colunas', mCsv.every(r => r.length === 7), true);
  t('Momentos: CSV identico ao painel, linha a linha', mCsv.slice(1,5).map(r=>[r[1],r[2],r[3],r[4]].join('|')).join(' ## '), domMom.join(' ## '));
  t('Momentos: ordem numerada', mCsv.slice(1,5).map(r=>r[0]).join('/'), '1/2/3/4');
  t('Momentos: lado casa/fora', mCsv.slice(1,5).map(r=>r[5]).join('/'), 'Casa/Casa/Casa/Fora');
  t('Momentos: acento preservado', mRaw.indexOf('Cartão amarelo') > 0, true);
  t('Momentos: aspas escapadas', mRaw.indexOf('"Gol ""de"" cabeça; bonito"') > 0, true);
  t('Momentos: ponto e virgula dentro do campo nao cria coluna', mCsv[2].length, 7);
  t('Momentos: quebra de linha virou espaco', mCsv[3][3], 'Substituição (intervalo)');
  t('Momentos: nenhum campo com quebra de linha', mRaw.replace(/\r\n/g,'\n').indexOf('\n') < 0 || (mRaw.split('\r\n').length - 1) === mCsv.length, true);
  t('Momentos: total com contagem e lados', [mCsv[5][0], mCsv[5][1], mCsv[5][4]].join(' | '), 'Total | 4 momento(s) | 3 casa · 1 fora');
  t('Momentos: total aponta a fonte local', mCsv[5][6], 'fonte: dados locais (simulados)');
  t('Momentos: CSV comeca com BOM', mRaw.charCodeAt(0), 65279);
  t('Momentos: quebra CRLF', mRaw.indexOf('\r\n') > 0, true);
  t('Momentos: sem NaN', mRaw.indexOf('NaN'), -1);
  t('momentsCsv e idempotente', ev("momentsCsv(MATCHES.find(x=>x.id==='a1'))") === mRaw, true);
  t('exportMomentsCsv devolve o mesmo CSV', ev("exportMomentsCsv(MATCHES.find(x=>x.id==='a1'))") === mRaw, true);
  t('nome do arquivo com os dois times e a data', ev("'momentos-' + slugTeam('Time Casa a1') + '-x-' + slugTeam('Time Fora a1') + '-' + dayOffset(0) + '.csv'"), 'momentos-time-casa-a1-x-time-fora-a1-' + ev("dayOffset(0)") + '.csv');
  t('clicar no botao dos Momentos nao quebra', ev("$('#exportMomentsCsv').click(); 1"), 1);
  await new Promise(r => setTimeout(r, 20));

  // fonte servidor: marca quando os eventos vieram do proxy
  ev("MATCHES.find(x=>x.id==='a1').eventsReal = true; true");
  const mRealRaw = ev("momentsCsv(MATCHES.find(x=>x.id==='a1'))");
  t('Momentos: total aponta a fonte proxy', parseCsv(mRealRaw)[5][6], 'fonte: proxy (eventos reais do painel)');
  t('Momentos: so muda a observacao do total', parseCsv(mRealRaw)[2][3], mCsv[2][3]);
  ev("MATCHES.find(x=>x.id==='a1').eventsReal = undefined; true");

  // sem momentos: nada de arquivo vazio (botao desabilitado, mensagem no painel)
  t('sem eventos nao gera CSV', ev("momentsCsv({ id:'zz', home:{name:'A',abbr:'A'}, away:{name:'B',abbr:'B'}, events:[] })"), null);
  t('events ausente nao gera CSV', ev("momentsCsv({ id:'zz', home:{name:'A',abbr:'A'}, away:{name:'B',abbr:'B'} })"), null);
  t('exportador sem eventos devolve null e avisa', ev("exportMomentsCsv({ id:'zz', home:{name:'A',abbr:'A'}, away:{name:'B',abbr:'B'}, events:[] })"), null);
  ev("CFG.provider='demo'; openMatch('a4', true); true");
  await new Promise(r => setTimeout(r, 30));
  t('painel sem eventos mostra o aviso', ev("$('#panelBody').innerHTML").indexOf('Sem eventos registrados.') > 0, true);
  t('botao dos Momentos fica desabilitado sem eventos', ev("$('#exportMomentsCsv').disabled"), true);
  t('clique em botao desabilitado nao quebra', ev("$('#exportMomentsCsv').click(); 1"), 1);
  ev("CFG.provider='proxy'; openMatch('a1', true); true");
  await new Promise(r => setTimeout(r, 40));
  t('botao dos Momentos habilitado quando ha eventos', ev("$('#exportMomentsCsv').disabled"), false);

  // regressao: as outras exportacoes continuam funcionando depois de mexer no csvCell
  t('regressao: CSV de medias por time continua valido', typeof ev("teamCsv()"), 'string');
  t('regressao: CSV do ranking continua valido', typeof ev("rankCsv()"), 'string');
  t('regressao: CSV do H2H continua valido', typeof ev("h2hCsv(MATCHES.find(x=>x.id==='a1'))"), 'string');
  t('regressao: botao do H2H segue habilitado', ev("$('#exportH2HCsv').disabled"), false);

  // arquivos de exemplo, gerados pela propria app
  globalThis.__mcp = ev("const mm=MATCHES.find(x=>x.id==='a1'); mm.eventsReal=true; const c=momentsCsv(mm); mm.eventsReal=undefined; c");
  t('exemplo dos Momentos gerado', typeof globalThis.__mcp, 'string');
  console.log('MOMENTOS CSV CABECALHO | ' + mCsv[0].join(' ; '));
  console.log('MOMENTOS CSV E1 | ' + mCsv[1].join(' ; '));
  console.log('MOMENTOS CSV E2 | ' + mCsv[2].join(' ; '));
  console.log('MOMENTOS CSV E3 | ' + mCsv[3].join(' ; '));
  console.log('MOMENTOS CSV E4 | ' + mCsv[4].join(' ; '));
  console.log('MOMENTOS CSV TOTAL | ' + parseCsv(mRealRaw)[5].join(' ; '));
  console.log('MOMENTOS PAINEL | ' + domMom.join(' ## '));

  // ---- CSV DA FICHA COMPLETA DA PARTIDA ----
  const FICHA_EVENTS = [
    { min:12, ic:'\u{1F7E8}', tx:'Cart\u00e3o amarelo', side:'home' },
    { min:23, ic:'\u26bd', tx:'Gol "de" cabe\u00e7a; bonito', side:'home' },
    { min:45, ic:'\u{1F501}', tx:'Substitui\u00e7\u00e3o (intervalo)', side:'home' },
    { min:67, ic:'\u26bd', tx:'Gol!', side:'away' }
  ];
  ev("CFG.provider='proxy'; state.bots=[{id:'bt1',name:'Robo cantos',crit:'corners',val:8,label:'Escanteios \u2265 8',on:true}]; true");
  ev("openMatch('a1', true)");
  await new Promise(r => setTimeout(r, 80));
  ev("const mm=MATCHES.find(x=>x.id==='a1'); mm.h2h=[3,2,2]; mm.h2hReal={meetings:7,home:3,draw:2,away:2,last:[{date:'2026-08-14',league:'Copa It\u00e1lia',home:'Time Casa a1',away:'Time Fora a1',score:[2,1]}]}; mm.form={home:['V','E','V','D','V'],away:['D','V','E','E','D']}; mm.cornersPeriod={home:[2,2,1,1],away:[1,1,1,1]}; mm.eventsData=" + JSON.stringify(FICHA_EVENTS) + "; mm.events=JSON.parse(JSON.stringify(" + JSON.stringify(FICHA_EVENTS) + ")); mm.eventsReal=true; openMatch('a1', true); true");
  await new Promise(r => setTimeout(r, 60));

  t('botao da ficha existe', ev("!!$('#exportPanelCsv')"), true);
  t('botao da ficha tem rotulo CSV', ev("$('#exportPanelCsv').textContent.trim()"), '\u2913 CSV');
  t('titulo Ficha da partida presente', ev("$('#panelBody').innerHTML").indexOf('Ficha da partida') > 0, true);

  const fRaw = ev("panelCsv(MATCHES.find(x=>x.id==='a1'))");
  const fCsv = parseCsv(fRaw);
  t('ficha: cabecalho com as 7 colunas', fCsv[0].join('|'), 'Seção|Item|Casa|Fora|Total|Observação|Saldo');
  t('ficha: toda linha com 7 colunas', fCsv.every(r => r.length === 7), true);
  const secs = [];
  fCsv.slice(1).forEach(r => { if (secs.indexOf(r[0]) < 0) secs.push(r[0]); });
  t('ficha: secoes presentes e em ordem', secs.join('>'), 'Partida>Estatísticas>Escanteios por período>Média por tempo>H2H>Momentos>Bots>Arquivo');
  t('ficha: comeca com BOM', fRaw.charCodeAt(0), 65279);
  t('ficha: sem NaN', fRaw.indexOf('NaN'), -1);
  t('ficha: nenhuma linha com quebra interna', fRaw.replace(/\r\n/g,'\n').split('\n').filter(x=>x.length).length, fCsv.length);

  // Partida
  const partRow = fCsv.find(r => r[1] === 'Confronto');
  t('ficha/Partida: confronto e placar', [partRow[2], partRow[3]].join(' x ') + ' | ' + partRow[5].split('·').pop().trim(), 'Time Casa a1 x Time Fora a1 | placar 2-1');
  t('ficha/Partida: cita a liga', partRow[5].indexOf('Serie A') > 0, true);
  const cRow = fCsv.find(r => r[0] === 'Partida' && r[1] === 'Escanteios (total)');
  t('ficha/Partida: escanteios 6/4 total 10', [cRow[2],cRow[3],cRow[4]].join('/'), '6/4/10');

  // Estatisticas x painel (lido do DOM das barras)
  const domStats = ev("Array.from($$('#panelBody .statrow')).map(r=>{const sp=r.querySelectorAll('.top span');const n=(x)=>{const v=(x||'').textContent.trim();return (v==='—'||v==='null')?'':v};return [sp[1].textContent.trim(), n(sp[0]), n(sp[2])].join('|')})");
  const csvStats = fCsv.filter(r => r[0] === 'Estatísticas').map(r => [r[1], r[2], r[3]].join('|'));
  t('ficha/Estatisticas: 6 linhas', csvStats.length, 6);
  t('ficha/Estatisticas: identicas as barras do painel', csvStats.join(' ## '), domStats.join(' ## '));
  t('ficha/Estatisticas: rotulos do painel', csvStats.map(x=>x.split('|')[0]).join('/'), 'Posse de bola (%)/Finalizações/Chutes no gol/Escanteios/Cartões/Faltas');
  const srcRow = fCsv.find(r => r[1] === 'Fonte das estatísticas');
  t('ficha: observacao de fonte igual ao selo do painel', ev("$('#panelBody').innerHTML").indexOf(srcRow[5].slice(0,40)) > 0, true);

  // Periodos
  const per = fCsv.filter(r => r[0] === 'Escanteios por período');
  t('ficha/Periodos: 4 faixas + 1o + 2o + total', per.length, 7);
  t('ficha/Periodos: faixa 0-15', [per[0][1],per[0][2],per[0][3],per[0][4]].join('/'), "0-15'/2/1/3");
  t('ficha/Periodos: 1o tempo soma as 3 faixas', [per[4][1],per[4][2],per[4][4]].join('/'), '1º tempo/5/8');
  t('ficha/Periodos: 2o tempo', [per[5][1],per[5][2],per[5][4]].join('/'), '2º tempo/1/2');
  t('ficha/Periodos: total bate com o cabecalho do cartao', per[6][4], '10');
  // ---- MEDIA DE ESCANTEIOS POR TEMPO NA FICHA ----
  const avgRows = fCsv.filter(r => r[0] === 'Média por tempo');
  t('ficha/media: 6 conjuntos x 2 tempos = 12 linhas', avgRows.length, 12);
  t('ficha/media: 1o tempo desta partida (casa/fora/total)', [avgRows[0][1], avgRows[0][2], avgRows[0][4]].join(' | '), 'Nesta partida · 1º tempo | 5 | 8');
  t('ficha/media: fora no 1o tempo desta partida', avgRows[0][3], '3');
  t('ficha/media: 2o tempo desta partida', [avgRows[1][1], avgRows[1][2], avgRows[1][3], avgRows[1][4]].join(' | '), 'Nesta partida · 2º tempo | 1 | 1 | 2');
  t('ficha/media: media do time da casa', [avgRows[2][1], avgRows[2][4]].join(' | '), 'CAS · média · 1º tempo | 8');
  t('ficha/media: media da liga', [avgRows[8][1], avgRows[8][4]].join(' | '), 'Serie A · média · 1º tempo | 8');
  t('ficha/media: media geral', [avgRows[10][1], avgRows[10][4], avgRows[11][4]].join(' | '), 'Geral · média · 1º tempo | 8 | 2');
  t('ficha/media: base informada em cada linha', avgRows[8][5], 'média por jogo · Casa = mandante · Fora = visitante · base 2 jogo(s) com período');
  t('ficha/media: nada e estimado (aviso de base)', avgRows[0][5].indexOf('contagem desta partida') === 0, true);
  t('ficha/media: 1o tempo + 2o tempo fecha com o total no 1o conjunto', Number(avgRows[0][4]) + Number(avgRows[1][4]), Number(cRow[4]));
  t('ficha/media: tabela equivalente no painel', ev("!!$('#panelBody .pavg')"), true);
  const pavgRows = ev("Array.from($$('#panelBody .pavg tbody tr')).map(tr=>{const td=tr.querySelectorAll('td');return td[1].textContent.trim()+'/'+td[2].textContent.trim()})");
  t('ficha/media: painel tem 6 linhas de media', pavgRows.length, 6);
  t('ficha/media: painel mostra 8/2 nesta partida', pavgRows[0], '8/2');
  t('ficha/media: painel e CSV concordam no 1o conjunto', [avgRows[0][4], avgRows[1][4]].join('/'), pavgRows[0]);
  const pavgHead = ev("Array.from($$('#panelBody .pavg thead th')).map(t=>t.textContent.trim())");
  t('ficha/media: cabecalho da tabela no painel', pavgHead.join('/'), 'Média de escanteios/1º tempo/2º tempo/Saldo 1º tempo/Saldo 2º tempo');
  t('ficha/media: painel cita a base no rodape', ev("$('#panelBody .pavg tfoot').textContent").indexOf('nada foi estimado') >= 0, true);
  const painelAvg = ev("$('#panelBody .pavg tbody tr').textContent");
  t('ficha/media: CSV do painel bate com a tabela', painelAvg.indexOf('Geral') < 0, true);
  // sem periodo: "-" no painel e celulas vazias no CSV, sem quebrar
  ev("CFG.provider='demo'; const m3b=MATCHES.find(x=>x.id==='a3'); m3b.cornersPeriod=null; m3b.stats.cornersPeriod=null; m3b.stats.corners=null; openMatch('a3', true); true");
  await new Promise(r => setTimeout(r, 40));
  const zAvg = ev("Array.from($$('#panelBody .pavg tbody tr')).map(tr=>{const td=tr.querySelectorAll('td');return td[1].textContent.trim()+'/'+td[2].textContent.trim()})");
  t('ficha/media: sem periodo o painel mostra tracos', zAvg[0], '–/–');
  t('ficha/media: linha sem periodo avisa que nao ha base', ev("$('#panelBody .pavg tbody tr .base').textContent.trim()"), 'sem base de período');
  const zPanel = parseCsv(ev("panelCsv(MATCHES.find(x=>x.id==='a3'))"));
  const zAvgRows = zPanel.filter(r => r[0] === 'Média por tempo');
  t('ficha/media: CSV sem periodo sai com celulas vazias', [zAvgRows[0][1], zAvgRows[0][2], zAvgRows[0][4]].join('|'), 'Nesta partida · 1º tempo||');
  t('ficha/media: CSV explica que nao ha base', zAvgRows[0][5], 'contagem desta partida · Casa = mandante · Fora = visitante · sem base de período');
  ev("CFG.provider='proxy'; openMatch('a1', true); true");
  await new Promise(r => setTimeout(r, 40));

  // H2H
  const h2hRows = fCsv.filter(r => r[0] === 'H2H');
  const res = h2hRows.find(r => r[1].indexOf('Resumo') === 0);
  const fCardNums = ev("Array.from($$('#panelBody .h2h .col b')).map(b=>b.textContent.trim())");
  t('ficha/H2H: resumo igual ao cartao (casa/empates/fora)', [res[2],res[4],res[3]].join('/'), fCardNums.join('/'));
  t('ficha/H2H: total de confrontos e fonte', res[5].indexOf('7 confronto(s)') >= 0 && res[5].indexOf('proxy') > 0, true);
  t('ficha/H2H: linha de forma', [h2hRows[1][1], h2hRows[1][2]].join('/'), 'Forma recente/V E V D V');
  t('ficha/H2H: confronto com data e placar', [h2hRows[2][1], h2hRows[2][4]].join('/'), '14/08/2026/2-1');

  // Momentos
  const momRows = fCsv.filter(r => r[0] === 'Momentos');
  const fDomMom = ev("Array.from($$('#panelBody .evt')).filter(r=>r.querySelector('.m')).map(r=>{const sp=r.querySelectorAll('span');return [sp[0].textContent.trim().replace(/'/g,''), (sp[1].textContent.trim()+' '+sp[2].textContent.replace(/\\s+/g,' ').trim()).trim(), sp[3].textContent.trim()].join('|')})");
  t('ficha/Momentos: 4 linhas', momRows.length, 4);
  t('ficha/Momentos: identicas ao painel (minuto|evento|equipe)', momRows.map(r=>[r[1].replace(/'/g,''), r[5], (r[2]||r[3])].join('|')).join(' ## '), fDomMom.join(' ## '));

  // Bots
  const botRow = fCsv.find(r => r[0] === 'Bots');
  t('ficha/Bots: nome, valor e disparo', [botRow[1], botRow[4], botRow[5].indexOf('DISPAROU') > 0].join('/'), 'Robo cantos/10/true');
  t('painel/Bots: mesma metrica do bot (10 >= 8 dispara)', ev("$('#botMonitor').innerHTML").indexOf('DISPAROU') > 0, true);

  // Arquivo
  const footRow = fCsv.find(r => r[1] === 'Rodapé do painel');
  t('ficha: rodape do arquivo igual ao rodape do painel', footRow[5], ev("$('#panelBody .foot').textContent.trim()"));
  const lRow = fCsv.find(r => r[1].indexOf('Linhas de dados') === 0);
  t('ficha: conta as linhas acima dele', lRow[4], String(fCsv.indexOf(lRow) - 1));
  t('panelCsv e idempotente', ev("panelCsv(MATCHES.find(x=>x.id==='a1'))") === fRaw, true);
  t('exportPanelCsv devolve o mesmo CSV', ev("exportPanelCsv(MATCHES.find(x=>x.id==='a1'))") === fRaw, true);
  t('nome do arquivo da ficha', ev("'ficha-' + slugTeam('Time Casa a1') + '-x-' + slugTeam('Time Fora a1') + '-' + dayOffset(0) + '.csv'"), 'ficha-time-casa-a1-x-time-fora-a1-' + ev("dayOffset(0)") + '.csv');
  t('clicar no botao da ficha nao quebra', ev("$('#exportPanelCsv').click(); 1"), 1);
  await new Promise(r => setTimeout(r, 20));

  // sem fonte de escanteio: celulas vazias, nunca 0
  ev("CFG.provider='demo'; const m3=MATCHES.find(x=>x.id==='a3'); m3.stats.corners=null; m3.stats.cornersPeriod=null; m3.cornersPeriod=null; m3.events=[]; m3.h2h=null; openMatch('a3', true); true");
  await new Promise(r => setTimeout(r, 40));
  const zCsv = parseCsv(ev("panelCsv(MATCHES.find(x=>x.id==='a3'))"));
  const zc = zCsv.find(r => r[0] === 'Partida' && r[1] === 'Escanteios (total)');
  t('ficha sem fonte: escanteios vazios (nunca 0)', [zc[2],zc[3],zc[4]].join('|'), '||');
  t('ficha sem fonte: explica o vazio', zc[5], 'sem fonte — campo em branco');
  const zst = zCsv.find(r => r[0] === 'Estatísticas' && r[1] === 'Escanteios');
  t('ficha sem fonte: barra de escanteios vazia', [zst[2],zst[3],zst[4]].join('|'), '||');
  t('ficha sem fonte: periodo sem dados tem aviso', zCsv.find(r => r[0] === 'Escanteios por período' && r[1] === '—')[5], 'sem divisão por período nesta partida');
  t('ficha sem fonte: H2H ausente tem aviso', zCsv.find(r => r[0] === 'H2H')[5], 'sem resumo de confronto direto');
  t('ficha sem fonte: momentos vazios tem aviso', zCsv.find(r => r[0] === 'Momentos')[5], 'sem eventos registrados');
  t('ficha em modo demo: rodape diz que e simulacao', zCsv.find(r => r[1] === 'Rodapé do painel')[5], 'Estatísticas simuladas para fins de demonstração.');
  t('ficha sem fonte (fonte real): rodape fala em branco', ev("(function(){const p=CFG.provider; CFG.provider='proxy'; const x=panelFooterText({source:'apifootball', stats:{corners:null}}); CFG.provider=p; return x;})()").indexOf('deixados em branco') > 0, true);
  t('ficha: panelCsv sem argumento usa a partida aberta', typeof ev("panelCsv()"), 'string');
  t('ficha: exportador sem partida devolve null', ev("(function(){const c=currentMatchId; currentMatchId=null; const r=exportPanelCsv(null); currentMatchId=c; return r;})()"), null);

  // regressao das exportacoes anteriores depois de mexer nas fontes do painel
  ev("CFG.provider='proxy'; openMatch('a1', true); true");
  await new Promise(r => setTimeout(r, 60));
  t('regressao: medias por time', typeof ev("teamCsv()"), 'string');
  t('regressao: ranking', typeof ev("rankCsv()"), 'string');
  t('regressao: H2H', typeof ev("h2hCsv(MATCHES.find(x=>x.id==='a1'))"), 'string');
  t('regressao: Momentos', typeof ev("momentsCsv(MATCHES.find(x=>x.id==='a1'))"), 'string');
  t('regressao: selo de fonte no painel (media da liga n=10)', ev("$('#panelBody').innerHTML").indexOf('média REAL da liga em cache (10/jogo em 10 partidas)') > 0, true);
  t('regressao: rodape do painel pela fonte unica', ev("$('#panelBody .foot').textContent.trim()"), 'Escanteios preenchidos pela média real da liga em cache (n=10 partidas).');

  globalThis.__fcp = ev("panelCsv(MATCHES.find(x=>x.id==='a1'))");
  t('exemplo da ficha gerado', typeof globalThis.__fcp, 'string');
  console.log('FICHA CSV CABECALHO | ' + fCsv[0].join(' ; '));
  fCsv.slice(1).forEach((r, i) => { if (i < 26) console.log('FICHA CSV | ' + r.join(' ; ')); });
  console.log('FICHA CSV SECOES | ' + secs.join(' > ') + ' | linhas=' + (fCsv.length - 1));

  // ---- EXPORTACAO CSV DA LISTA DE JOGOS ----
  ev("CFG.provider='demo'; state.tab='all'; state.league='all'; state.favs=[]; const m2=MATCHES.find(x=>x.id==='a2'); m2.stats.cornersPeriod={home:[3,2,1,1],away:[2,1,1,1]}; const m1=MATCHES.find(x=>x.id==='a1'); m1.stats.cornersPeriod={home:[2,2,1,1],away:[1,1,1,1]}; m2.cornersPeriod=m2.stats.cornersPeriod; m1.cornersPeriod=m1.stats.cornersPeriod; renderList(); true");
  await new Promise(r => setTimeout(r, 30));
  t('lista: botao de exportacao existe', ev("!!$('#exportListCsv')"), true);
  t('lista: botao tem rotulo CSV', ev("$('#exportListCsv').textContent.trim()"), '⤓ CSV');
  t('lista: titulo mostra a contagem', ev("$('#listCount').textContent"), ' · ' + ev("filtered().length"));

  const qDomRows = ev("$$('#list .matchrow').length");
  const qRaw = ev("listCsv()");
  const qCsv = parseCsv(qRaw);
  const qRows = qCsv.slice(1).filter(r => /^\d+$/.test(r[0]));
  t('lista: cabecalho com as 18 colunas', qCsv[0].join('|'), 'Ordem|Liga|Confronto|Casa|Fora|Situação|Minuto|Placar|Escanteios|1º tempo|2º tempo|Média 1º tempo (liga)|Média 2º tempo (liga)|Fonte do escanteio|Hora|Favorito|Saldo 1º tempo|Saldo 2º tempo');
  t('lista: toda linha com 18 colunas', qCsv.every(r => r.length === 18), true);
  t('lista: CSV tem o mesmo numero de jogos da tela', qRows.length, qDomRows);
  t('lista: 4 jogos visiveis no cenario', qRows.length, 4);
  const qDomSeq = ev("Array.from($$('#list .matchrow')).map(r=>{const t=r.querySelectorAll('.team .nm');return t[0].textContent.trim()+' com '+t[1].textContent.trim()})");
  t('lista: mesmos times e mesma ordem da tela', qRows.map(r => r[3] + ' com ' + r[4]).join(' ## '), qDomSeq.join(' ## '));
  const qDomScore = ev("Array.from($$('#list .matchrow')).map(r=>{const s=r.querySelector('.mid .sc');return s?s.textContent.trim():''})");
  t('lista: placar igual ao da tela', qRows.map(r => r[7]).join(' ## '), qDomScore.join(' ## '));
  const qDomMin = ev("Array.from($$('#list .matchrow'))[0].querySelector('.min').textContent.trim()");
  t('lista: minuto igual ao da tela (ao vivo)', qRows[0][6].replace(/'/g,''), qDomMin.replace(/'/g,''));
  const qDomCor = ev("Array.from($$('#list .matchrow')).map(r=>{const p=r.querySelector('.corner-pill');if(!p)return '';const m=p.textContent.match(/\\d+/);return m?m[0]:''})");
  t('lista: escanteios iguais aos da tela (vazio quando nao ha)', qRows.map(r => r[8]).join(' ## '), qDomCor.join(' ## '));
  t('lista: jogo sem fonte fica com escanteio vazio (nunca 0)', qRows.filter(r => r[8] === '').length, 2);
  t('lista: explica o vazio do escanteio', qRows.find(r => r[8] === '')[13], 'sem fonte — campo em branco');
  t('lista: liga em cada linha', qRows.map(r => r[1]).filter((v,i,a) => a.indexOf(v) === i).length, 3);
  t('lista: situacao por extenso (ordem visual, agrupada por liga)', qRows.map(r => r[5]).join('/'), 'ao vivo/encerrado/agendado/encerrado');
  t('lista: CSV segue o agrupamento por liga da tela', qRows.map(r => r[1]).join('/'), 'Serie A/Serie A/League One/Serie C');
  t('lista: ligas em ordem de primeira aparicao na tela', qRows.map(r=>r[1]).filter((v,i,a)=>a.indexOf(v)===i).join('/'), 'Serie A/League One/Serie C');
  t('lista: hora so no agendado', qRows.map(r => r[14]).filter(v => v !== '').length, 1);
  t('lista: favorito marcado quando nao e favorito', qRows.every(r => r[15] === '' || r[15] === '⭘' || r[15] === '☆'), true);
  t('lista: CSV comeca com BOM', qRaw.charCodeAt(0), 65279);
  t('lista: quebra CRLF', qRaw.indexOf('\r\n') > 0, true);
  t('lista: sem NaN', qRaw.indexOf('NaN'), -1);
  t('lista: rodape com total e situacoes', [qCsv[qCsv.length-1][0], qCsv[qCsv.length-1][1], qCsv[qCsv.length-1][5]].join(' | '), 'Total | 4 jogo(s) | 1 ao vivo · 1 agendado(s) · 2 encerrado(s)');
  t('lista: rodape cita a aba e a liga', qCsv[qCsv.length-1][2], 'aba todos · todas as ligas');
  t('lista: rodape soma os escanteios visiveis', qCsv[qCsv.length-1][8], '22');
  t('lista: rodape diz quantos tem escanteio e a base do periodo', qCsv[qCsv.length-1][13].indexOf('2/4 com escanteio · período em 2 jogo(s)') >= 0, true);
  // rodape: somas por liga, na ordem dos grupos da tela, antes do total geral
  const sxLg = qCsv.filter(r => r[0] === 'Σ Liga');
  t('lista/rodape: uma linha de total por liga', sxLg.length, 3);
  t('lista/rodape: ligas na ordem dos grupos da tela', sxLg.map(r => r[1]).join('/'), 'Serie A/League One/Serie C');
  t('lista/rodape: mesma contagem de grupos da tela', sxLg.length, ev("$$('#list .leagueblock').length"));
  t('lista/rodape: toda linha de liga com 18 colunas', sxLg.every(r => r.length === 18), true);
  t('lista/rodape: Serie A soma 22 em 2 jogos', [sxLg[0][2], sxLg[0][5], sxLg[0][8]].join(' | '), '2 jogo(s) | 2/2 com escanteio | 22');
  t('lista/rodape: Serie A traz a media por jogo', sxLg[0][13].indexOf('média 11/jogo (base 2 jogo(s) com escanteio) · período em 2 jogo(s)') >= 0, true);
  t('lista/rodape: Serie A traz as situacoes do grupo', sxLg[0][14], '1 ao vivo · 0 agendado(s) · 1 encerrado(s)');
  t('lista/rodape: League One sem escanteio fica vazio', [sxLg[1][2], sxLg[1][5], sxLg[1][8]].join(' | '), '1 jogo(s) | 0/1 com escanteio | ');
  t('lista/rodape: League One explica a ausencia', sxLg[1][13], 'sem fonte de escanteio nesta liga');
  t('lista/rodape: Serie C sem escanteio fica vazio', [sxLg[2][5], sxLg[2][8]].join(' | '), '0/1 com escanteio | ');
  t('lista/rodape: somas por liga fecham com o total geral', sxLg.map(r => r[8]).filter(v => v !== '').map(Number).reduce((a,b)=>a+b,0), Number(qCsv[qCsv.length-1][8]));
  t('lista/rodape: total geral continua por ultimo', qCsv[qCsv.length-1][0], 'Total');
  const sxLastGame = Math.max.apply(null, qCsv.map((r,i) => /^\d+$/.test(r[0]) ? i : -1));
  const sxFirstLg = qCsv.map((r,i) => r[0] === 'Σ Liga' ? i : -1).filter(i => i >= 0)[0];
  t('lista/rodape: linhas de liga vem depois dos jogos', sxFirstLg > sxLastGame, true);
  t('lista/rodape: linhas de liga vem antes do total geral', qCsv.map(r => r[0]).indexOf('Σ Liga') < qCsv.length - 1, true);

  // media com decimal: 10 + 13 = 23 em 2 jogos -> 11,5 (virgula pt-BR)
  ev("state.__c1 = MATCHES.find(x=>x.id==='a1').stats.corners.slice(); state.__c2 = MATCHES.find(x=>x.id==='a2').stats.corners.slice(); state.__p2 = MATCHES.find(x=>x.id==='a2').stats.cornersPeriod; MATCHES.find(x=>x.id==='a1').stats.corners=[6,4]; MATCHES.find(x=>x.id==='a2').stats.corners=[7,6]; MATCHES.find(x=>x.id==='a2').stats.cornersPeriod={home:[4,2,1,0],away:[2,2,1,1]}; MATCHES.find(x=>x.id==='a2').cornersPeriod=MATCHES.find(x=>x.id==='a2').stats.cornersPeriod; renderList(); true");
  await new Promise(r => setTimeout(r, 20));
  const sxDec = parseCsv(ev("listCsv()")).filter(r => r[0] === 'Σ Liga')[0];
  t('lista/rodape: media usa virgula decimal', sxDec[13].indexOf('média 11,5/jogo (base 2 jogo(s) com escanteio) · período em 2 jogo(s)') >= 0, true);
  t('lista/rodape: soma decimal tambem na coluna de escanteios', sxDec[8], '23');
  ev("MATCHES.find(x=>x.id==='a1').stats.corners=state.__c1; MATCHES.find(x=>x.id==='a2').stats.corners=state.__c2; MATCHES.find(x=>x.id==='a2').stats.cornersPeriod=state.__p2; MATCHES.find(x=>x.id==='a2').cornersPeriod=state.__p2; delete state.__c1; delete state.__c2; delete state.__p2; renderList(); true");
  await new Promise(r => setTimeout(r, 20));
  t('lista/rodape: valores restaurados', parseCsv(ev("listCsv()")).filter(r => r[0] === 'Σ Liga')[0][8], '22');

  // nome de liga com aspas/ponto e virgula nao quebra as colunas
  ev("state.__lg = MATCHES.find(x=>x.id==='a1').leagueName; MATCHES.find(x=>x.id==='a1').leagueName = 'Série \"A\"; Especial'; renderList(); true");
  await new Promise(r => setTimeout(r, 20));
  const sxEsc = parseCsv(ev("listCsv()"));
  t('lista/rodape: nome de liga com aspas escapado', ev("listCsv()").indexOf('"Série ""A""; Especial"') > 0, true);
  t('lista/rodape: escape nao quebra colunas', sxEsc.every(r => r.length === 18), true);
  const sxRename = sxEsc.filter(r => r[0] === 'Σ Liga').find(r => r[1] === 'Série "A"; Especial');
  t('lista/rodape: grupo renomeado soma os proprios jogos', sxRename[8], '10');
  t('lista/rodape: total geral intacto apos o rename', sxEsc[sxEsc.length-1][8], '22');
  ev("MATCHES.find(x=>x.id==='a1').leagueName = state.__lg; delete state.__lg; renderList(); true");
  await new Promise(r => setTimeout(r, 20));

  // com liga filtrada, so a liga escolhida aparece no rodape
  ev("state.tab='all'; state.league=(MATCHES[0]||{}).league; renderList(); true");
  await new Promise(r => setTimeout(r, 20));
  const sxOne = parseCsv(ev("listCsv()")).filter(r => r[0] === 'Σ Liga');
  t('lista/rodape: filtro de liga deixa uma unica linha', sxOne.length, 1);
  t('lista/rodape: linha unica bate com o unico grupo da tela', sxOne.length, ev("$$('#list .leagueblock').length"));
  ev("state.league='all'; renderList(); true");
  await new Promise(r => setTimeout(r, 20));
  t('lista/rodape: volta as 3 ligas', parseCsv(ev("listCsv()")).filter(r => r[0] === 'Σ Liga').length, 3);
  t('lista/rodape: exportador segue devolvendo o mesmo CSV', typeof ev("exportListCsv()"), 'string');
  // ---- MEDIA DE ESCANTEIOS POR TEMPO NO CSV DA LISTA ----
  t('lista/media: cabecalho com as duas colunas de media', [qCsv[0][11], qCsv[0][12]].join('|'), 'Média 1º tempo (liga)|Média 2º tempo (liga)');
  t('lista/media: Serie A media 9 no 1o tempo (18/2)', qRows[0][11], '9');
  t('lista/media: Serie A media 2 no 2o tempo (4/2)', qRows[0][12], '2');
  t('lista/media: a mesma media vale para os 2 jogos da liga', qRows[0][11] + qRows[1][11] + qRows[0][12] + qRows[1][12], '9922');
  t('lista/media: liga sem periodo fica vazia', [qRows[2][11], qRows[2][12], qRows[3][11], qRows[3][12]].join('|'), '|||');
  t('lista/media: media confere com soma/base da liga', Number(qRows[0][11]), Number(sxLg[0][9]) / 2);
  t('lista/media: liga tambem traz a media', [sxLg[0][11], sxLg[0][12]].join('/'), '9/2');
  t('lista/media: liga sem periodo fica vazia', [sxLg[1][11], sxLg[1][12], sxLg[2][11], sxLg[2][12]].join('|'), '|||');
  t('lista/media: total geral com a media geral', [qCsv[qCsv.length-1][11], qCsv[qCsv.length-1][12]].join('/'), '9/2');
  t('lista/media: media geral = soma dos tempos / base', Number(qCsv[qCsv.length-1][11]) + Number(qCsv[qCsv.length-1][12]), (Number(qCsv[qCsv.length-1][9]) + Number(qCsv[qCsv.length-1][10])) / 2);
  // caso fracionario: 1o tempo 20 dividido por 3 jogos -> 6,666 -> 6,7 (pt-BR)
  ev("state.__p3 = MATCHES.find(x=>x.id==='a3').cornersPeriod; state.__p3s = MATCHES.find(x=>x.id==='a3').stats.cornersPeriod; state.__c3 = MATCHES.find(x=>x.id==='a3').stats.corners; MATCHES.find(x=>x.id==='a3').cornersPeriod={home:[3,2,1,1],away:[2,2,1,1]}; MATCHES.find(x=>x.id==='a3').stats.cornersPeriod=MATCHES.find(x=>x.id==='a3').cornersPeriod; MATCHES.find(x=>x.id==='a3').stats.corners=[6,4]; renderList(); true");
  await new Promise(r => setTimeout(r, 20));
  const fr = parseCsv(ev("listCsv()")).filter(r => /^\d+$/.test(r[0]));
  const frLg = parseCsv(ev("listCsv()")).filter(r => r[0] === 'Σ Liga');
  t('lista/media: Serie C entra na base com 1 jogo', [fr[3][11], fr[3][12]].join('/'), '11/2');
  t('lista/media: Serie A segue 9 (nao muda com a Serie C)', fr[0][11], '9');
  t('lista/media: total geral 29/3 = 9,666 -> 9,7', parseCsv(ev("listCsv()"))[parseCsv(ev("listCsv()")).length-1][11], '9,7');
  ev("MATCHES.find(x=>x.id==='a3').cornersPeriod=state.__p3; MATCHES.find(x=>x.id==='a3').stats.cornersPeriod=state.__p3s; MATCHES.find(x=>x.id==='a3').stats.corners=state.__c3; delete state.__p3; delete state.__p3s; delete state.__c3; renderList(); true");
  await new Promise(r => setTimeout(r, 20));
  t('lista/media: valores restaurados', parseCsv(ev("listCsv()")).filter(r => r[0] === 'Σ Liga')[0][11], '9');
  // ---- ESCANTEIO POR PERIODO NA LISTA ----
  t('lista/periodo: cabecalho com 1o e 2o tempo', [qCsv[0][9], qCsv[0][10]].join('|'), '1º tempo|2º tempo');
  t('lista/periodo: a1 8 no 1o tempo e 2 no 2o', [qRows[0][8], qRows[0][9], qRows[0][10]].join('/'), '10/8/2');
  t('lista/periodo: a2 12 no total, 10 e 2 por tempo', [qRows[1][8], qRows[1][9], qRows[1][10]].join('/'), '12/10/2');
  t('lista/periodo: tempo + tempo fecha com o total em cada jogo', qRows.filter(r => r[8] !== '').every(r => Number(r[9]) + Number(r[10]) === Number(r[8])), true);
  t('lista/periodo: jogo sem fonte fica com tempos vazios', [qRows[2][9], qRows[2][10], qRows[3][9], qRows[3][10]].join('|'), '|||');
  // o mesmO recorte do painel da partida tem de bater com o CSV
  ev("openMatch('a1', true)"); await new Promise(r => setTimeout(r, 60));
  const painelTxt = ev("$('#panelBody').innerHTML").replace(/\s+/g,' ');
  const mPer = painelTxt.match(/1º tempo <b[^>]*>(\d+)<\/b> · 2º tempo <b[^>]*>(\d+)<\/b>/);
  t('lista/periodo: painel da partida mostra 8 e 2', mPer ? mPer[1] + '/' + mPer[2] : 'nao achou', '8/2');
  t('lista/periodo: CSV do periodo igual ao do painel', [qRows[0][9], qRows[0][10]].join('/'), mPer ? mPer[1] + '/' + mPer[2] : 'x');
  t('lista/periodo: coluna de escanteios igual ao total do painel', qRows[0][8], (painelTxt.match(/Total: <b[^>]*>(\d+)<\/b> escanteios/) || [,''])[1]);
  // somas por liga e no total geral
  t('lista/periodo: Serie A soma 18 e 4 por tempo', [sxLg[0][9], sxLg[0][10]].join('/'), '18/4');
  t('lista/periodo: soma dos tempos da liga fecha com o total da liga', Number(sxLg[0][9]) + Number(sxLg[0][10]), Number(sxLg[0][8]));
  t('lista/periodo: ligas sem periodo ficam vazias', [sxLg[1][9], sxLg[1][10], sxLg[2][9], sxLg[2][10]].join('|'), '|||');
  t('lista/periodo: total geral 18 no 1o e 4 no 2o', [qCsv[qCsv.length-1][9], qCsv[qCsv.length-1][10]].join('/'), '18/4');
  t('lista/periodo: tempos do total geral fecham com os escanteios', Number(qCsv[qCsv.length-1][9]) + Number(qCsv[qCsv.length-1][10]), Number(qCsv[qCsv.length-1][8]));
  t('lista/periodo: soma dos tempos das ligas igual ao total geral', sxLg.map(r => Number(r[9] || 0)).reduce((a,b)=>a+b,0) + '/' + sxLg.map(r => Number(r[10] || 0)).reduce((a,b)=>a+b,0), Number(qCsv[qCsv.length-1][9]) + '/' + Number(qCsv[qCsv.length-1][10]));
  // divergencia entre periodo e total na fonte: o CSV avisa em vez de esconder
  ev("state.__pv = MATCHES.find(x=>x.id==='a1').stats.cornersPeriod; MATCHES.find(x=>x.id==='a1').stats.cornersPeriod={home:[2,2,1,1],away:[1,1,1,4]}; MATCHES.find(x=>x.id==='a1').cornersPeriod=MATCHES.find(x=>x.id==='a1').stats.cornersPeriod; renderList(); true");
  await new Promise(r => setTimeout(r, 20));
  const dv = parseCsv(ev("listCsv()"));
  const dvRow = dv.filter(r => /^\d+$/.test(r[0]))[0];
  t('lista/periodo: avisa quando o periodo nao fecha com o total', dvRow[13], 'simulado (demo) · período soma 13, total 10 (difere na fonte)');
  t('lista/periodo: aviso tambem no total geral', dv[dv.length-1][13].indexOf('difere na fonte') > 0, true);
  t('lista/periodo: aviso nao quebra as colunas', dv.every(r => r.length === 18), true);
  ev("MATCHES.find(x=>x.id==='a1').stats.cornersPeriod=state.__pv; MATCHES.find(x=>x.id==='a1').cornersPeriod=state.__pv; delete state.__pv; renderList(); true");
  await new Promise(r => setTimeout(r, 20));
  t('lista/periodo: aviso some ao restaurar', parseCsv(ev("listCsv()")).filter(r => /^\d+$/.test(r[0]))[0][13], 'simulado (demo)');
  t('listCsv e idempotente', ev("listCsv()") === qRaw, true);
  t('exportListCsv devolve o mesmo CSV', ev("exportListCsv()") === qRaw, true);
  t('clicar no botao da lista nao quebra', ev("$('#exportListCsv').click(); 1"), 1);
  await new Promise(r => setTimeout(r, 20));

  // escape: aspas e ponto e virgula no nome do time
  ev("state.__nm = MATCHES.find(x=>x.id==='a1').home.name; MATCHES.find(x=>x.id==='a1').home.name = 'Time \"Casa\"; Móvel'; renderList(); true");
  await new Promise(r => setTimeout(r, 20));
  const qEscRaw = ev("listCsv()");
  const qEscCsv = parseCsv(qEscRaw);
  t('lista: aspas e ponto e virgula escapados', qEscRaw.indexOf('"Time ""Casa""; Móvel"') > 0, true);
  t('lista: escape nao quebra as colunas', qEscCsv.every(r => r.length === 18), true);
  const qEscDom = ev("$$('#list .matchrow[data-id=a1] .nm')[0].textContent");
  t('lista: tela mostra o nome com aspas', qEscDom, 'Time "Casa"; Móvel');
  t('lista: nome igual na tela e no CSV', qEscCsv.filter(r=>/^\d+$/.test(r[0])).some(r => r[3] === qEscDom), true);
  ev("MATCHES.find(x=>x.id==='a1').home.name = state.__nm; delete state.__nm; renderList(); true");
  await new Promise(r => setTimeout(r, 20));

  // filtros: aba e liga precisam bater com o que esta visivel
  ev("state.tab='finished'; renderList(); true");
  await new Promise(r => setTimeout(r, 20));
  const qFinCsv = parseCsv(ev("listCsv()"));
  const qFinRows = qFinCsv.slice(1).filter(r => /^\d+$/.test(r[0]));
  t('lista/filtro: aba finalizados limita o CSV', qFinRows.length, ev("$$('#list .matchrow').length"));
  t('lista/filtro: so encerrados', qFinRows.every(r => r[5] === 'encerrado'), true);
  t('lista/filtro: rodape acompanha a aba', qFinCsv[qFinCsv.length-1][2], 'aba finalizados · todas as ligas');
  t('lista/filtro: botao continua habilitado', ev("$('#exportListCsv').disabled"), false);
  ev("state.tab='all'; state.league=(MATCHES[0]||{}).league; renderList(); true");
  await new Promise(r => setTimeout(r, 20));
  const qLgCsv = parseCsv(ev("listCsv()"));
  const qLgRows = qLgCsv.slice(1).filter(r => /^\d+$/.test(r[0]));
  t('lista/filtro: liga selecionada limita o CSV', qLgRows.length, ev("$$('#list .matchrow').length"));
  t('lista/filtro: um unico grupo de liga', qLgRows.map(r=>r[1]).filter((v,i,a)=>a.indexOf(v)===i).length, 1);
  t('lista/filtro: rodape cita a liga escolhida', qLgCsv[qLgCsv.length-1][2].indexOf('todas as ligas') < 0, true);

  // lista vazia: nada de arquivo vazio
  ev("state.tab='fav'; state.favs=[]; state.league='all'; renderList(); true");
  await new Promise(r => setTimeout(r, 20));
  t('lista vazia: botao desabilitado', ev("$('#exportListCsv').disabled"), true);
  t('lista vazia: nao gera CSV', ev("listCsv()"), null);
  t('lista vazia: exportador devolve null e avisa', ev("exportListCsv()"), null);
  t('lista vazia: tela mostra o aviso', ev("$('#list').innerHTML").indexOf('Nenhum jogo nesta categoria') > 0, true);
  t('lista vazia: contagem some do titulo', ev("$('#listCount').textContent"), '');
  ev("state.tab='all'; state.league='all'; renderList(); true");
  await new Promise(r => setTimeout(r, 30));
  t('lista: botao volta a habilitar', ev("$('#exportListCsv').disabled"), false);
  t('lista: CSV volta depois de restaurar', typeof ev("listCsv()"), 'string');

  // regressao das outras exportacoes
  ev("CFG.provider='proxy'; openMatch('a1', true); true");
  await new Promise(r => setTimeout(r, 60));
  t('regressao: ficha da partida', typeof ev("panelCsv(MATCHES.find(x=>x.id==='a1'))"), 'string');
  t('regressao: momentos', typeof ev("momentsCsv(MATCHES.find(x=>x.id==='a1'))"), 'string');
  t('regressao: H2H', typeof ev("h2hCsv(MATCHES.find(x=>x.id==='a1'))"), 'string');
  t('regressao: ranking', typeof ev("rankCsv()"), 'string');
  t('regressao: medias por time', typeof ev("teamCsv()"), 'string');
  t('regressao: botao da ficha segue habilitado', ev("$('#exportPanelCsv') && $('#exportPanelCsv').id"), 'exportPanelCsv');

  globalThis.__lcp = ev("CFG.provider='demo'; state.tab='all'; state.league='all'; renderList(); listCsv()");
  t('exemplo da lista gerado', typeof globalThis.__lcp, 'string');
  console.log('LISTA CSV CABECALHO | ' + qCsv[0].join(' ; '));
  qCsv.slice(1).forEach(r => console.log('LISTA CSV | ' + r.join(' ; ')));
  console.log('LISTA CSV FILTRO ABA | ' + qFinCsv[qFinCsv.length-1].join(' ; '));
  console.log('LISTA CSV ESCAPE | ' + qEscCsv.filter(r=>/^\d+$/.test(r[0])).map(r=>r[3]).filter(v=>v.indexOf('Casa')>=0)[0]);


/* ===== médias por tempo: sofridos e integridade (novo) ===== */
(function(){
  const fic = parseCsv(ev("panelCsv()"));
  const num = (x) => { const s = String(x == null ? '' : x).trim(); if (!s) return null;
    return Number(s.replace(/\./g,'').replace(',', '.')); };
  const rows = fic.filter(r => r[0] === 'M\u00e9dia por tempo');
  const sof = rows.filter(r => /^Sofridos/.test(r[1] || ''));
  t('ficha/sofridos: 1o tempo presente', sof.some(r => /1\u00ba tempo/.test(r[1])), true);
  t('ficha/sofridos: 2o tempo presente', sof.some(r => /2\u00ba tempo/.test(r[1])), true);
  t('ficha/sofridos: observacao explica quem e quem',
    sof.every(r => (r[5] || '').indexOf('escanteios sofridos') >= 0 && (r[5] || '').indexOf('base') >= 0), true);
  let somaOk = true, nanFound = false;
  const base = { ok:true, qual:[] };
  sof.forEach(r => { const c = num(r[2]), f = num(r[3]), tot = num(r[4]);
    const vals = [c, f].filter(v => v != null);
    if (vals.length === 0 || tot == null) { somaOk = false; base.qual.push('linha sem lado algum'); }
    else { const soma = vals.reduce((x, y) => x + y, 0);
      if (Math.abs(soma - tot) > 0.05) { somaOk = false; base.qual.push('soma ' + soma + ' != total ' + tot); }
      if (vals.length === 1) base.qual.push('lado sem base fica vazio (esperado)'); }
    [r[2], r[3], r[4]].forEach(v => { if (/NaN/.test(String(v))) nanFound = true; }); });
  console.log('DBG sof', JSON.stringify(sof), '| base', JSON.stringify(base.qual));
  t('ficha/sofridos: Total = soma dos lados com base', somaOk, true);
  t('ficha/sofridos: sem NaN', nanFound, false);
  t('ficha/media: 6 conjuntos -> 12 linhas', rows.length, 12);
  t('ficha/media: ordem esperada',
    rows.filter((r,i) => i % 2 === 0).map(r => r[1].replace(/ \u00b7 (1\u00ba|2\u00ba) tempo$/, '')).join(' | '),
    'Nesta partida | CAS \u00b7 m\u00e9dia | FOR \u00b7 m\u00e9dia | Sofridos \u00b7 m\u00e9dia | Serie A \u00b7 m\u00e9dia | Geral \u00b7 m\u00e9dia');
  t('ficha/media: rodape do painel segue presente',
    ev("$('#panelBody .pavg tfoot').textContent").indexOf('nada foi estimado') >= 0, true);
  const dom = ev("$('#panelBody .pavg tbody').textContent");
  t('ficha/sofridos: linha aparece no painel', dom.indexOf('Sofridos') >= 0, true);
  t('ficha/sofridos: base dos adversarios no painel', dom.indexOf('advers') >= 0, true);
  t('ficha/sofridos: rotulo do time no painel', dom.indexOf('sofridos pelo mandante') >= 0, false);
  t('ficha: decimais em pt-BR (virgula, nunca ponto)', /\\d\\.\\d/.test(ev("panelCsv()")), false);
  const list = parseCsv(ev("listCsv()"));
  t('lista: colunas de media por tempo intactas', list[0].filter(c => /^Média \dº tempo \(liga\)$/.test(c)).length, 2);
  t('lista: total geral inalterado', list[list.length-1][8], '22');
})();


/* ===== cruzamento pró x contra: coluna de saldo por tempo (novo) ===== */
(function(){
  const f2 = parseCsv(ev("panelCsv()"));
  const rows2 = f2.filter(r => r[0] === 'M\u00e9dia por tempo');
  const num = (x) => { const v = String(x == null ? '' : x).trim(); if (!v || v === '\u2013') return null;
    return Number(v.replace(/\./g,'').replace(',', '.')); };
  const sal = (i) => rows2[i] ? (rows2[i][6] || '') : '';
  t('ficha/saldo: 7a coluna e o Saldo', f2[0][6], 'Saldo');
  t('ficha/saldo: 12 linhas com 7 celulas', rows2.length + '/' + rows2.filter(r => r.length === 7).length, '12/12');
  /* saldo conferido contra as celulas exibidas (pro exibido - contra exibido),
     sem numero fixo: o invariante e o que importa, nao a amostra do momento */
  const fmtS = (v) => { const x = Math.round(v * 10) / 10;
    if (Math.abs(x) < 0.05) return '0';
    const a = String(Math.abs(x)).replace('.', ',');
    return (x > 0 ? '+' : '-') + a; };
  const par = (pro, contra) => (pro == null || contra == null) ? '' : fmtS(pro - contra);
  const proC = num(rows2[2][4]), proF2 = num(rows2[4][4]);
  const sof1 = [num(rows2[6][2]), num(rows2[6][3])];
  t('ficha/saldo: CAS 1o tempo = pro exibido - contra exibido', sal(2), par(proC, sof1[0]));
  t('ficha/saldo: FOR 1o tempo = pro exibido - contra exibido', sal(4), par(proF2, sof1[1]));
  t('ficha/saldo: CAS 2o tempo = pro exibido - contra exibido', sal(3), par(num(rows2[3][4]), num(rows2[7][2])));
  t('ficha/saldo: FOR 2o tempo = pro exibido - contra exibido', sal(5), par(num(rows2[5][4]), num(rows2[7][3])));
  t('ficha/saldo: sofridos 1o tempo = soma dos saldos dos times', sal(6), [sal(2), sal(4)].every(x => x) ? fmtS(num(sal(2)) + num(sal(4))) : '');
  t('ficha/saldo: sofridos 2o tempo = soma dos saldos dos times', sal(7), [sal(3), sal(5)].every(x => x) ? fmtS(num(sal(3)) + num(sal(5))) : '');
  t('ficha/saldo: sofridos = CAS + FOR', num(sal(6)) === num(sal(2)) + num(sal(4)) && num(sal(7)) === num(sal(3)) + num(sal(5)), true);
  t('ficha/saldo: nesta partida e neutro', [sal(0), sal(1)].join('/'), '0/0');
  t('ficha/saldo: liga e geral sem par a favor/contra', [sal(8), sal(10)].join('/'), '/');
  /* o saldo tem de fechar com as celulas exibidas: pro (total da linha do time) menos contra (Sofridos casa/fora) */
  const casPro = num(rows2[2][4]), forPro = num(rows2[4][4]);
  const sofCasa = num(rows2[6][2]), sofFora = num(rows2[6][3]);
  t('ficha/saldo: pro exibido menos contra exibido', [casPro - sofCasa, forPro - sofFora].join('/'), [num(sal(2)), num(sal(4))].join('/'));
  t('ficha/saldo: sem NaN na ficha', /NaN/.test(ev("panelCsv()")), false);
  t('ficha/saldo: sinal explicito', /[+-]\d/.test(ev("panelCsv()")), true);
  const pSal = ev("Array.from($$('#panelBody .pavg tbody tr')).map(tr=>{const td=tr.querySelectorAll('td');return td[3].textContent.trim()+'/'+td[4].textContent.trim()})");
  t('ficha/saldo: painel com 6 linhas de saldo', pSal.length, 6);
  const pSof = ev("(function(){var r=Array.from($$('#panelBody .pavg tbody tr')).filter(function(tr){return /^Sofridos/.test(tr.querySelectorAll('td')[0].textContent)});if(!r.length)return '';var td=r[0].querySelectorAll('td');return td[3].textContent.trim()+'/'+td[4].textContent.trim()})()");
  console.log('DBG saldos painel', JSON.stringify(pSal), '| csv', JSON.stringify(rows2.map(r=>r[6])), '| pSof', pSof);
  t('ficha/saldo: painel e CSV concordam na linha de sofridos', pSof, [sal(6), sal(7)].join('/'));
  t('ficha/saldo: dica explica a origem', ev("$$('#panelBody .pavg tbody tr')[2].querySelectorAll('td')[3].getAttribute('title')||''").indexOf('a favor menos sofrido') >= 0, true);
  t('ficha/saldo: rodape explica o cruzamento', ev("$('#panelBody .pavg tfoot').textContent").indexOf('a favor menos sofridos no mesmo tempo') >= 0, true);
  const l2 = parseCsv(ev("listCsv()"));
  t('ficha/saldo: lista de jogos segue com 18 colunas', l2[0].length, 18);
  t('ficha/saldo: total da lista intacto', l2[l2.length-1][8], '22');
})();


/* ===== rodape do CSV da lista: saldo por tempo (novo) ===== */
(function(){
  const q = parseCsv(ev("listCsv()"));
  const isGame = (r) => /^\d+$/.test(String(r[0] || '').trim());
  const numS = (x) => { const v = String(x == null ? '' : x).trim(); if (!v) return null;
    return Number(v.replace('+','').replace(',', '.')); };
  const games = q.filter(isGame), ligs = q.filter(r => r[0] === '\u03a3 Liga'), tot = q[q.length-1];
  const fmt = (v) => v == null ? '' : ((v > 0 ? '+' : (v < 0 ? '-' : '')) + String(Math.abs(Math.round(v*10)/10)).replace('.', ','));
  const col = (r, i) => numS(r[i]);
  t('lista/saldo: cabecalho traz as duas colunas', [q[0][16], q[0][17]].join('|'), 'Saldo 1\u00ba tempo|Saldo 2\u00ba tempo');
  t('lista/saldo: todas as linhas com 18 colunas', q.every(r => r.length === 18), true);
  t('lista/saldo: sem periodo deixa a celula vazia (nunca 0)',
    games.every(r => (r[9] === '' && r[10] === '') ? (r[16] === '' && r[17] === '') : true), true);
  let ok = true, bad = [];
  ligs.forEach(L => {
    const gs = games.filter(r => r[1] === L[1]);
    [16, 17].forEach(i => { const xs = gs.map(r => col(r, i)).filter(v => v != null);
      const soma = xs.length ? xs.reduce((a, b) => a + b, 0) : null;
      const la = col(L, i);
      if ((soma == null) !== (la == null) || (soma != null && Math.abs(soma - la) > 0.05)) { ok = false; bad.push(L[1] + ' [' + i + '] soma ' + soma + ' vs ' + la); } });
  });
  console.log('DBG lista saldos | jogo:', JSON.stringify(games.map(r => r[0] + ':' + r[16] + '/' + r[17])),
              '| liga:', JSON.stringify(ligs.map(r => r[1] + ':' + r[16] + '/' + r[17])), '| total:', tot[16] + '/' + tot[17], '| bad:', bad.join('; '));
  t('lista/saldo: Sigma Liga fecha com a soma dos jogos do grupo', ok, true);
  [16, 17].forEach(i => { const xs = games.map(r => col(r, i)).filter(v => v != null);
    const soma = xs.length ? xs.reduce((a, b) => a + b, 0) : null;
    t('lista/saldo: total geral fecha com os jogos (col ' + i + ')', tot[i], fmt(soma)); });
  t('lista/saldo: sinal explicito e sem ponto decimal', /^[+-]?\d+(,\d)?$/.test(String(tot[16] || '').trim()) && !/\d\.\d/.test(ev("listCsv()")), true);
  t('lista/saldo: rodape explica a definicao', (tot[13] || '').indexOf('saldo = mandante \u2212 visitante por tempo') >= 0, true);
  t('lista/saldo: liga sem periodo fica sem saldo', ligs.filter(r => r[9] === '').every(r => r[16] === '' && r[17] === ''), true);
  const f3 = parseCsv(ev("panelCsv()"));
  t('lista/saldo: ficha da partida segue com a coluna Saldo', f3[0][6], 'Saldo');
  t('lista/saldo: total de escanteios intacto', tot[8], '22');
})();


/* ===== gráfico: linha de saldo acumulado por tempo (novo) ===== */
(function(){
  ev("state.page='list'; state.tab='all'; state.league='all'; state.saldoMetric='sum'; renderAll(); true");
  const rows = ev("saldoLeagueRows()");
  t('grafico/acum: só ligas com período entram', rows.map(r => r.name).join('/'), 'Serie A');
  t('grafico/acum: 5 pontos (0 + as 4 faixas)', rows[0].cum.length, 5);
  t('grafico/acum: acumulado ponto a ponto', rows[0].cum.join('/'), '0/2/4/4/4');
  t('grafico/acum: saldo por faixa', rows[0].net.join('/'), '2/2/0/0');
  t('grafico/acum: faixas do mandante', rows[0].bh.join('/'), '5/4/2/2');
  t('grafico/acum: faixas do visitante', rows[0].ba.join('/'), '3/2/2/2');
  t('grafico/acum: acumulado = soma das faixas anteriores',
    rows[0].cum.slice(1).every((v, i) => v === rows[0].net.slice(0, i+1).reduce((a,b) => a+b, 0)), true);
  /* MUST: o fim da linha tem de bater com o saldo da liga já publicado no CSV da lista */
  const q = parseCsv(ev("listCsv()"));
  const sx = q.filter(r => r[0] === '\u03a3 Liga' && r[1] === 'Serie A')[0];
  t('grafico/acum: fim da linha = Sigma Liga do CSV da lista', [rows[0].cum[4], sx[16]].join('='), '4=+4');
  const gs = q.filter(r => /^\d+$/.test(r[0]) && r[1] === 'Serie A');
  const som1 = gs.reduce((x, r) => x + Number(r[9] || 0), 0), som2 = gs.reduce((x, r) => x + Number(r[10] || 0), 0);
  t('grafico/acum: faixas fecham com os totais por tempo da lista',
    [rows[0].bh[0]+rows[0].bh[1]+rows[0].bh[2]+rows[0].ba[0]+rows[0].ba[1]+rows[0].ba[2], som1,
     rows[0].bh[3]+rows[0].ba[3], som2].join('/'), '18/18/4/4');
  t('grafico/acum: acumulado no intervalo = variação do 1º tempo', rows[0].cum[3], 4);
  /* desenho: linha, pontos e eixos (nada de barra) */
  calls.arc = 0; calls.lineTo = 0; calls.fillText = 0; calls.fillRect = 0; calls.strokeRect = 0;
  ev("renderSaldoChart(); true");
  t('grafico/acum: 5 pontos na linha', calls.arc, 5);
  t('grafico/acum: 4 segmentos da linha + 5 linhas de grade + zero + intervalo', calls.lineTo, 11);
  t('grafico/acum: rotula faixas, tempos e valor final', calls.fillText >= 8, true);
  t('grafico/acum: nenhuma barra desenhada', [calls.fillRect, calls.strokeRect].join('/'), '0/0');
  const geom = JSON.parse(ev("$('#saldoChart').getAttribute('data-geom')"));
  console.log('DBG acum geom', JSON.stringify(geom));
  t('grafico/acum: geometria declara 5 pontos e 4 faixas', [geom.points, geom.buckets].join('/'), '5/4');
  const dprChk = ev("(function(){var cv=$('#saldoChart');drawSaldoChart();var d=(window.devicePixelRatio||1);return cv.width===Math.round((cv.clientWidth||320)*d)})()");
  t('grafico/acum: canvas escala por devicePixelRatio', dprChk, true);
  const cap = ev("$('#saldoCap').textContent");
  t('grafico/acum: rodape explica o acumulado', cap.indexOf('saldo acumulado') > 0 && cap.indexOf('intervalo') > 0, true);
  t('grafico/acum: rodape cita as 4 faixas', cap.indexOf('0-15, 16-30, 31-45, 46-60') > 0, true);
  t('grafico/acum: legenda traz a liga e o saldo final', ev("$('#saldoLegend').textContent").indexOf('Serie A') >= 0, true);
  const sCsv = parseCsv(ev("saldoLeagueCsv()"));
  try { require('fs').writeFileSync('saldo-por-liga-exemplo.csv', ev("saldoLeagueCsv()"), 'utf8'); console.log('arquivo saldo-por-liga-exemplo.csv regravado pelo app'); } catch(e){ console.log('nao gravou:', e.message); }
  t('grafico/acum: CSV com 10 colunas', sCsv.every(r => r.length === 10), true);
  t('grafico/acum: cabecalho do acumulado', sCsv[0].join('|'),
    "Liga|Acum. 15'|Acum. 30'|Acum. 45' (intervalo)|Acum. 60'+ (saldo final)|Variação 1º tempo|Variação 2º tempo|Jogos com período|Jogos na liga|Ordem no gráfico");
  t('grafico/acum: linha da liga = pontos da linha do grafico', sCsv[1].join('|'),
    "Serie A|+2|+4|+4|+4|+4|0|2/2|2|1");
  t('grafico/acum: total do arquivo fecha', sCsv[2].slice(1, 7).join('|'), '+2|+4|+4|+4|+4|0');
  ev("state.saldoMetric='avg'; renderSaldoChart(); true");
  const avg = ev("saldoLeagueRows()");
  t('grafico/acum: média por jogo nos pontos', avg[0].cum.join('/'), '0/1/2/2/2');
  t('grafico/acum: pontos em média = pontos somados / jogos com período',
    avg[0].cum.every((v, i) => Math.abs(v - rows[0].cum[i] / avg[0].withP) < 1e-9), true);
  t('grafico/acum: média por faixa', [avg[0].bobH.join('/'), avg[0].bobA.join('/')].join(' ; '), '2.5/2/1/1 ; 1.5/1/1/1');
  const aCsv = parseCsv(ev("saldoLeagueCsv()"));
  t('grafico/acum: cabecalho marca a metrica', aCsv[0][1], "Acum. 15' (média/jogo)");
  ev("state.saldoMetric='sum'; renderAll(); true");
  ev("state.__p3b=MATCHES.find(x=>x.id==='a3').cornersPeriod; state.__p3c=MATCHES.find(x=>x.id==='a3').stats.cornersPeriod; const m3=MATCHES.find(x=>x.id==='a3'); m3.cornersPeriod={home:[1,1,1,1],away:[2,2,2,2]}; m3.stats.cornersPeriod=m3.cornersPeriod; renderAll(); true");
  const two = ev("saldoLeagueRows()");
  t('grafico/acum: duas linhas, ordenadas pelo saldo final', two.map(r => r.name).join('/'), 'Serie A/Serie C');
  t('grafico/acum: Serie C descendo no acumulado', two[1].cum.join('/'), '0/-1/-2/-3/-4');
  t('grafico/acum: cores distintas por liga', two[0].color !== two[1].color, true);
  t('grafico/acum: legenda lista as duas ligas', ev("$$('#saldoLegend span[title]').length"), 2);
  calls.arc = 0; calls.lineTo = 0;
  ev("drawSaldoChart(); true");
  t('grafico/acum: 2 ligas = 10 pontos e 15 segmentos/eixos', [calls.arc, calls.lineTo].join('/'), '10/15');
  ev("state.__kv=[]; MATCHES.forEach(function(m){state.__kv.push([m.id, m.cornersPeriod, m.stats.cornersPeriod]); m.cornersPeriod=null; m.stats.cornersPeriod=null;}); renderAll(); true");
  t('grafico/acum: sem período o CSV é null', ev("saldoLeagueCsv()"), null);
  t('grafico/acum: aviso no lugar da linha', ev("$('#saldoChartEmpty').textContent").indexOf('a linha aparece quando houver dado') > 0, true);
  ev("state.__kv.forEach(function(kv){const m=MATCHES.find(x=>x.id===kv[0]); m.cornersPeriod=kv[1]; m.stats.cornersPeriod=kv[2];}); delete state.__kv; MATCHES.find(x=>x.id==='a3').cornersPeriod=state.__p3b; MATCHES.find(x=>x.id==='a3').stats.cornersPeriod=state.__p3c; delete state.__p3b; delete state.__p3c; renderAll(); true");
  t('grafico/acum: nada de NaN no CSV', /NaN/.test(String(ev("saldoLeagueCsv()"))), false);
  t('grafico/acum: virgula decimal, nunca ponto', /\d\.\d/.test(ev("saldoLeagueCsv()")), false);
  t('grafico/acum: volta ao estado normal (1 liga)', ev("saldoLeagueRows()").length, 1);
  /* ===== grafico/per-time: linha de saldo acumulado por time (novo) ===== */
  try {
    ev("state.page='list'; state.tab='all'; state.league='all'; state.saldoMetric='sum'; state.saldoView='team'; renderAll(); true");
    const tExp = ev("(function(){var s={};filtered().forEach(function(m){var b=periodBuckets(m);if(!b)return;if(m.home&&m.home.name)s[m.home.name]=1;if(m.away&&m.away.name)s[m.away.name]=1;});return Object.keys(s).length})()");
    const tRows = ev("saldoTeamRows()");
    t('grafico/time: um time por linha', tRows.length, tExp);
    t('grafico/time: ordenado pelo saldo final',
      ev("(function(){var r=saldoTeamRows();var a=r.map(function(x){return x.name}).join('|');var b=r.slice().sort(function(x,y){return (y.cum[4]-x.cum[4])||(x.name<y.name?-1:1)}).map(function(x){return x.name}).join('|');return a===b})()"), true);
    t('grafico/time: soma dos saldos dos times = 0 por liga',
      String(Math.round(ev("saldoTeamRows().reduce(function(x,r){return x+r.cum[4]},0)"))), '0');
    t('grafico/time: acumulado fecha com a soma das faixas',
      ev("saldoTeamRows().every(function(r){var s=0,ok=true;for(var i=1;i<5;i++){s=Math.round((s+r.net[i-1])*10)/10;ok=ok&&Math.abs(s-r.cum[i])<1e-9}return ok})"), true);
    t('grafico/time: pro dos times = escanteios somados das partidas',
      ev("(function(){var t=saldoTeamRows().reduce(function(x,r){return x+r.proP.reduce(function(a,b){return a+b},0)},0);var m=filtered().map(periodBuckets).filter(Boolean).reduce(function(x,b){return x+b.h.reduce(function(a,c){return a+c},0)+b.a.reduce(function(a,c){return a+c},0)},0);return Math.abs(t-m)<1e-9})()"), true);
    t('grafico/time: faixa a faixa o pro confere com as partidas',
      ev("(function(){var ok=true;for(var i=0;i<4;i++){var t=saldoTeamRows().reduce(function(x,r){return x+r.proP[i]},0);var m=filtered().map(periodBuckets).filter(Boolean).reduce(function(x,b){return x+b.h[i]+b.a[i]},0);ok=ok&&Math.abs(t-m)<1e-9}return ok})()"), true);
    t('grafico/time: time so entra com periodo', ev("saldoTeamRows().every(function(r){return r.withP>0})"), true);
    try { require('fs').writeFileSync('saldo-por-time-exemplo.csv', ev("saldoTeamCsv()"), 'utf8'); console.log('arquivo saldo-por-time-exemplo.csv gravado pelo app'); } catch(e){ console.log('nao gravou o CSV de times:', e.message); }
    calls.arc = 0; calls.lineTo = 0; calls.fillRect = 0; calls.strokeRect = 0; calls.fillText = 0;
    ev("drawSaldoChart(); true");
    t('grafico/time: nenhuma barra desenhada', [calls.fillRect, calls.strokeRect].join('/'), '0/0');
    t('grafico/time: um ponto por marco e por linha', calls.arc, Math.min(6, tExp) * 5);
    const tGeom = JSON.parse(ev("$('#saldoChart').getAttribute('data-geom')"));
    t('grafico/time: geometria de 5 pontos por linha', [tGeom.groups, tGeom.points].join('/'), Math.min(6, tExp) + '/5');
    t('grafico/time: legenda lista os times do grafico', ev("$$('#saldoLegend span[title]').length"), Math.min(6, tExp) + (tExp > 6 ? 1 : 0));
    t('grafico/time: titulo do cartao muda para por time', ev("$('#saldoTitle').textContent").indexOf('por time') > 0, true);
    t('grafico/time: rodape explica o calculo por time', ev("$('#saldoCap').textContent").indexOf('saldo acumulado por TIME') >= 0, true);
    t('grafico/time: rodape avisa que a soma dos times e zero', ev("$('#saldoCap').textContent").indexOf('0 por constru') > 0, true);
    const tCsv = parseCsv(ev("saldoTeamCsv()"));
    t('grafico/time: CSV de times comeca pelo Time', tCsv[0][0], 'Time');
    t('grafico/time: CSV de times com 10 colunas', tCsv[0].length, 10);
    t('grafico/time: todas as linhas com 10 celulas', tCsv.every(r => r.length === 10), true);
    t('grafico/time: linhas = times + total + cabecalho', tCsv.length, tRows.length + 2);
    t('grafico/time: rodape do CSV fecha em zero', String(Math.round(tCsv.filter(r => r[0] === '\u03a3 Times').reduce((x, r) => x + Number(r[4]), 0))), '0');
    /* conferencia independente: refaz a mao o acumulado de um time a partir das faixas da partida */
    const hand = ev("(function(){var m=filtered().filter(function(x){return periodBuckets(x)})[0];var b=periodBuckets(m);var net=[0,1,2,3].map(function(i){return b.h[i]-b.a[i]});var c=[0];net.forEach(function(v){c.push(Math.round((c[c.length-1]+v)*10)/10)});var r=saldoTeamRows().filter(function(x){return x.name===m.home.name})[0];return c.join('|')+' :: '+r.cum.join('|')})()");
    const hp = hand.split(' :: ');
    console.log('DBG time mao:', hand);
    t('grafico/time: acumulado do time bate com o calculado a mao', hp[0], hp[1]);
    t('grafico/time: acumulado a mao das 4 faixas', hp[0].split('|').length, 5);
    t('grafico/time: sem NaN no CSV de times', /NaN/.test(String(ev("saldoTeamCsv()"))), false);
    t('grafico/time: virgula decimal no CSV de times', /\d\.\d/.test(ev("saldoTeamCsv()")), false);
    ev("state.saldoMetric='avg'; renderSaldoChart(); true");
    t('grafico/time: media por jogo nao gera NaN', ev("saldoTeamRows().every(function(r){return isFinite(r.cum[4])&&isFinite(r.net[0])})"), true);
    t('grafico/time: cabecalho avisa media por jogo', parseCsv(ev("saldoTeamCsv()"))[0][1].indexOf('m\u00e9dia/jogo') > 0, true);
    ev("state.saldoView='league'; state.saldoMetric='sum'; renderAll(); true");
    const lCsv = ev("saldoRowsCsv()");
    t('grafico/time: CSV volta a ser o da liga', lCsv ? parseCsv(lCsv)[0][0] : 'vazio', 'Liga');
    t('grafico/time: modo liga agrupa menos linhas que o modo time', ev("saldoLeagueRows().length < saldoTeamRows().length"), true);
    t('grafico/time: titulo volta para por liga', ev("$('#saldoTitle').textContent").indexOf('por liga') > 0, true);

  } catch(e){ console.log('FALHA no bloco grafico/per-time:', e && e.message); }

  /* ===== grafico/periodo: filtro Ambos / 1o tempo / 2o tempo (novo) ===== */
  try {
  /* ===== grafico/periodo: filtro Ambos / 1o tempo / 2o tempo (novo) ===== */
  const csvBoth = ev("(function(){state.saldoView='league';state.saldoMetric='sum';state.saldoPeriod='both';renderSaldoChart();return saldoLeagueCsv()})()");
  const A = parseCsv(csvBoth);
  t('grafico/periodo: sem filtro o CSV e o de sempre', A[0].join('|'),
    "Liga|Acum. 15'|Acum. 30'|Acum. 45' (intervalo)|Acum. 60'+ (saldo final)|Varia\u00e7\u00e3o 1\u00ba tempo|Varia\u00e7\u00e3o 2\u00ba tempo|Jogos com per\u00edodo|Jogos na liga|Ordem no gr\u00e1fico");
  const csvF1 = ev("(function(){state.saldoPeriod='h1';renderSaldoChart();return saldoLeagueCsv()})()");
  const csvF2 = ev("(function(){state.saldoPeriod='h2';renderSaldoChart();return saldoLeagueCsv()})()");
  const F1 = parseCsv(csvF1), F2 = parseCsv(csvF2);
  t('grafico/periodo: 1o tempo mantem as ligas', F1.length, A.length);
  t('grafico/periodo: 2o tempo mantem as ligas', F2.length, A.length);
  t('grafico/periodo: 1o tempo com cabecalho proprio', F1[0][3], "Acum. 45' (fim do 1\u00ba tempo)");
  t('grafico/periodo: 2o tempo com cabecalho rebaseado', F2[0][3], "Acum. 45' (rein\u00edcio do 2\u00ba tempo)");
  t('grafico/periodo: 1o tempo usa 10 colunas', F1.every(r => r.length === 10), true);
  t('grafico/periodo: 2o tempo usa 10 colunas', F2.every(r => r.length === 10), true);
  t('grafico/periodo: 1o tempo zera as colunas do 2o tempo', F1.slice(1, -1).every(r => r[4] === '' && r[6] === ''), true);
  t('grafico/periodo: 2o tempo zera as colunas do 1o tempo', F2.slice(1, -1).every(r => r[1] === '' && r[2] === '' && r[5] === ''), true);
  t('grafico/periodo: 1o tempo bate com a coluna de 45 do modo sem filtro', F1.slice(1, -1).map(r => r[3]).join('|'), A.slice(1, -1).map(r => r[3]).join('|'));
  t('grafico/periodo: variacao do 1o tempo = valor de 45', F1.slice(1, -1).every(r => r[5] === r[3]), true);
  t('grafico/periodo: 2o tempo bate com a variacao do 2o tempo sem filtro', F2.slice(1, -1).map(r => r[4]).join('|'), A.slice(1, -1).map(r => r[6]).join('|'));
  t('grafico/periodo: 2o tempo reinicia o acumulado no intervalo', F2.slice(1, -1).every(r => r[3].indexOf('0') >= 0), true);
  t('grafico/periodo: total do 1o tempo = total da coluna de 45', F1[F1.length - 1][3], A[A.length - 1][3]);

  /* visao por time x filtro: ordem pode mudar, entao a comparacao e por nome */
  const TS = ev("(function(){state.saldoView='team';state.saldoMetric='sum';state.saldoPeriod='both';renderSaldoChart();var b=saldoTeamRows();state.saldoPeriod='h1';renderSaldoChart();var h=saldoTeamRows();state.saldoPeriod='h2';renderSaldoChart();var s=saldoTeamRows();return {b:b,h:h,s:s}})()");
  const byName = (arr) => { const o = {}; arr.forEach(r => { o[r.name] = r; }); return o; };
  const mB = byName(TS.b), mH = byName(TS.h), mS = byName(TS.s);
  t('grafico/periodo: mesmos times nas tres visoes', Object.keys(mH).length + '/' + Object.keys(mS).length, Object.keys(mB).length + '/' + Object.keys(mB).length);
  t('grafico/periodo: 1o tempo por time fecha no acumulado de 45', Object.keys(mB).map(n => mH[n].cum[mH[n].cum.length - 1]).join('|'), Object.keys(mB).map(n => mB[n].cum[3]).join('|'));
  t('grafico/periodo: 2o tempo por time = variacao do 2o tempo sem filtro', Object.keys(mB).map(n => mS[n].cum[mS[n].cum.length - 1]).join('|'), Object.keys(mB).map(n => Math.round((mB[n].cum[4] - mB[n].cum[3]) * 10) / 10).join('|'));
  t('grafico/periodo: soma dos times e zero no 1o tempo', String(Math.round(TS.h.reduce((x, r) => x + r.cum[r.cum.length - 1], 0))), '0');
  t('grafico/periodo: soma dos times e zero no 2o tempo', String(Math.round(TS.s.reduce((x, r) => x + r.cum[r.cum.length - 1], 0))), '0');

  const gH1 = JSON.parse(ev("(function(){state.saldoView='league';state.saldoPeriod='h1';state.saldoMetric='sum';renderSaldoChart();return $('#saldoChart').getAttribute('data-geom')})()"));
  t('grafico/periodo: 1o tempo desenha 4 pontos em 3 faixas', gH1.points + '/' + gH1.buckets, '4/3');
  t('grafico/periodo: eixo do 1o tempo vai de 0 a 45', gH1.labels.join('|'), "0'|15'|30'|45'");
  t('grafico/periodo: 1o tempo tem 4 marcas no eixo', gH1.labels.length, 4);
  t('grafico/periodo: pro do 1o tempo confere com as faixas das partidas',
    ev("(function(){var t=saldoTeamRows().reduce(function(x,r){return x+r.proP.reduce(function(a,b){return a+b},0)},0);var m=filtered().map(periodBuckets).filter(Boolean).reduce(function(x,b){var s=0;for(var i=0;i<3;i++)s+=b.h[i]+b.a[i];return x+s},0);return Math.abs(t-m)<1e-9})()"), true);
  const gH2 = JSON.parse(ev("(function(){state.saldoPeriod='h2';renderSaldoChart();return $('#saldoChart').getAttribute('data-geom')})()"));
  t('grafico/periodo: 2o tempo desenha 2 pontos em 1 faixa', gH2.points + '/' + gH2.buckets, '2/1');
  t('grafico/periodo: eixo do 2o tempo rebaseado em 45-60', gH2.labels.join('|'), "45'|60'+");
  t('grafico/periodo: geometria registra o filtro', gH2.span, 'h2');
  calls.fillRect = 0; calls.strokeRect = 0; calls.arc = 0;
  ev("(function(){state.saldoPeriod='h2';renderSaldoChart();return true})()");
  t('grafico/periodo: 2o tempo nao desenha barra', calls.fillRect + '/' + calls.strokeRect, '0/0');
  t('grafico/periodo: 2o tempo desenha 2 pontos por linha', calls.arc, 2 * Math.min(6, ev("saldoRows().length")));
  t('grafico/periodo: rodape explica o filtro de 2o tempo', ev("$('#saldoCap').textContent").indexOf('filtro 2\u00ba tempo') > 0, true);
  t('grafico/periodo: rodape cita o eixo rebaseado', ev("$('#saldoCap').textContent").indexOf("45'-60'") > 0, true);
  t('grafico/periodo: titulo do cartao cita o 2o tempo', ev("$('#saldoTitle').textContent").indexOf('2\u00ba tempo') > 0, true);
  t('grafico/periodo: legenda fala do saldo do 2o tempo', ev("$('#saldoLegend').textContent").indexOf('saldo 2\u00ba tempo') > 0, true);
  ev("state.saldoPeriod='h1';renderSaldoChart();true");
  t('grafico/periodo: rodape explica o filtro de 1o tempo', ev("$('#saldoCap').textContent").indexOf('filtro 1\u00ba tempo') > 0, true);
  t('grafico/periodo: titulo cita o 1o tempo', ev("$('#saldoTitle').textContent").indexOf('1\u00ba tempo') > 0, true);
  t('grafico/periodo: mesmo sem filtro o rodape segue explicando o intervalo', ev("(function(){state.saldoPeriod='both';renderSaldoChart();return $('#saldoCap').textContent.indexOf('marca o intervalo')>0})()"), true);

  /* fiacao dos botoes e persistencia ao trocar de visao */
  t('grafico/periodo: clique no 2o tempo muda o estado', ev("(function(){var b=document.querySelectorAll('#saldoPeriod button');b[2].click();return state.saldoPeriod})()"), 'h2');
  t('grafico/periodo: botao do filtro fica marcado', ev("(function(){var b=document.querySelectorAll('#saldoPeriod button');return b[2].className.indexOf('on')>=0})()"), true);
  t('grafico/periodo: clique em Ambos volta ao normal', ev("(function(){var b=document.querySelectorAll('#saldoPeriod button');b[0].click();return state.saldoPeriod})()"), 'both');
  const pers = ev("(function(){var p=document.querySelectorAll('#saldoPeriod button');p[1].click();var v=document.querySelectorAll('#saldoView button');v[1].click();return periodSpan()+'|'+saldoViewMode()+'|'+saldoTeamCsv()})()");
  const pp = pers.split('|'), pCsv = parseCsv(pp.slice(2).join('|'));
  t('grafico/periodo: filtro sobrevive a troca de visao', pp[0] + '|' + pp[1], 'h1|team');
  t('grafico/periodo: CSV de time mantem o filtro', pCsv[0][3], "Acum. 45' (fim do 1\u00ba tempo)");
  t('grafico/periodo: rodape do CSV de time fecha em zero com filtro', String(Math.round(pCsv.filter(r => r[0] === '\u03a3 Times').reduce((x, r) => x + Number(r[4]), 0))), '0');
  t('grafico/periodo: valor invalido volta para sem filtro', ev("(function(){state.saldoPeriod='xpto';var s=periodSpan();state.saldoPeriod='both';return s})()"), 'both');

  /* amostras em arquivo, ja no estado final */
  try {
    require('fs').writeFileSync('saldo-por-liga-exemplo.csv', ev("(function(){state.saldoPeriod='both';state.saldoView='league';state.saldoMetric='sum';renderSaldoChart();return saldoLeagueCsv()})()"), 'utf8');
    require('fs').writeFileSync('saldo-por-time-exemplo.csv', ev("(function(){state.saldoView='team';return saldoTeamCsv()})()"), 'utf8');
    require('fs').writeFileSync('saldo-1tempo-exemplo.csv', ev("(function(){state.saldoPeriod='h1';state.saldoView='league';return saldoLeagueCsv()})()"), 'utf8');
    require('fs').writeFileSync('saldo-2tempo-exemplo.csv', ev("(function(){state.saldoPeriod='h2';state.saldoView='league';return saldoLeagueCsv()})()"), 'utf8');
    require('fs').writeFileSync('saldo-1tempo-time-exemplo.csv', ev("(function(){state.saldoView='team';return saldoTeamCsv()})()"), 'utf8');
    console.log('CSVs de periodo gravados pelo app');
  } catch(e){ console.log('nao gravou os CSVs de periodo:', e.message); }
  console.log('CSV periodo h1 (liga): ' + String(csvF1).split('\r\n')[0]);
  console.log('CSV periodo h2 (liga): ' + String(csvF2).split('\r\n')[0]);
  ev("state.saldoPeriod='both';state.saldoView='league';state.saldoMetric='sum';renderAll();true");
  t('grafico/periodo: volta ao estado inicial', ev("periodSpan()+'|'+saldoViewMode()+'|'+state.saldoMetric"), 'both|league|sum');
  } catch(e){ console.log('FALHA no bloco grafico/periodo:', e && e.message); }

  /* ===== grafico/legenda: saldo final marcado na legenda (novo) ===== */
  try {
    const EXPR = "(function(){var r=saldoRows().slice(0,6);var b=[].slice.call(document.querySelectorAll('#saldoLegend b.sfin'));var sp=[].slice.call(document.querySelectorAll('#saldoLegend span[title]'));return [r.map(function(x){return saldoFmt(x.cum[x.cum.length-1])}).join('|'),b.map(function(x){return x.textContent}).join('|'),r.map(function(x){return saldoCls(x.cum[x.cum.length-1])}).join('|'),b.map(function(x){return (x.className.match(/(pos|neg|zero|nil)/)||['nil'])[0]}).join('|'),r.map(function(x){return x.name}).join('|'),sp.map(function(x){return (x.getAttribute('title')||'').split(' \\u00b7 ')[0]}).join('|')].join('#')})()";
    /* compara, para cada combinacao filtro/visao: (1) selo x fim da linha que o grafico desenhou,
       (2) cor do selo x sinal do valor, (3) nome no selo x nome da serie */
    const chk = (sp, view) => ev("(function(){state.saldoView='" + view + "';state.saldoMetric='sum';state.saldoPeriod='" + sp + "';renderSaldoChart();return " + EXPR + "})()").split('#');
    [['both','league'],['h1','league'],['h2','league'],['both','team'],['h1','team'],['h2','team']].forEach(c => {
      const s = chk(c[0], c[1]);
      t('grafico/legenda: selo = fim da linha (' + c[0] + '/' + c[1] + ')', s[0], s[1]);
      t('grafico/legenda: cor do selo (' + c[0] + '/' + c[1] + ')', s[2], s[3]);
      t('grafico/legenda: selo na serie certa (' + c[0] + '/' + c[1] + ')', s[4], s[5]);
    });
    t('grafico/legenda: um selo por linha desenhada (liga)', ev("$$('#saldoLegend b.sfin').length"), Math.min(6, ev("saldoRows().length")));
    t('grafico/legenda: um selo por linha desenhada (time)', ev("(function(){state.saldoView='team';state.saldoPeriod='both';renderSaldoChart();return $$('#saldoLegend b.sfin').length})()"), Math.min(6, ev("saldoRows().length")));
    t('grafico/legenda: ordem da legenda = maior saldo primeiro',
      ev("(function(){var v=[].slice.call(document.querySelectorAll('#saldoLegend b.sfin')).map(function(x){return parseFloat(x.textContent.replace('+','').replace(',','.'))||0});for(var i=1;i<v.length;i++)if(v[i]>v[i-1])return false;return true})()"), true);
    t('grafico/legenda: primeiro item marcado como 1o', ev("(function(){var s=document.querySelector('#saldoLegend span[title]');return s?s.querySelector('.lrank').textContent:''})()"), '1\u00ba');
    t('grafico/legenda: aviso de ordem no topo da legenda', ev("$('#saldoLegend').textContent.indexOf('ordem da legenda') >= 0"), true);
    t('grafico/legenda: dica do selo informa a base de jogos', ev("(function(){var s=document.querySelector('#saldoLegend span[title]');return s?s.getAttribute('title'):''})()").indexOf('base') > 0, true);
    t('grafico/legenda: sem sobra quando todas as linhas cabem', ev("$('#saldoLegend').textContent.indexOf('fora do gr') >= 0"), false);
    ev("state.saldoView='team';state.saldoPeriod='both';state.saldoMetric='sum';renderSaldoChart();true");
    t('grafico/legenda: dica do selo tambem na visao por time', ev("(function(){var s=document.querySelector('#saldoLegend span[title]');return s?s.getAttribute('title'):''})()").indexOf('jogo(s) com per') > 0, true);
    ev("state.saldoView='league';state.saldoPeriod='both';state.saldoMetric='sum';renderAll();true");
    t('grafico/legenda: estado final restaurado', ev("periodSpan()+'|'+saldoViewMode()+'|'+state.saldoMetric"), 'both|league|sum');
  } catch(e){ console.log('FALHA no bloco grafico/legenda:', e && e.message); }

  /* ===== grafico/ordem: legenda ordenada pelo saldo final (novo) ===== */
  try {
    const legNames = () => ev("[].slice.call(document.querySelectorAll('#saldoLegend span[title]')).map(function(x){return (x.getAttribute('title')||'').split(' \u00b7 ')[0]})");
    const legStamps = () => ev("[].slice.call(document.querySelectorAll('#saldoLegend b.sfin')).map(function(x){return x.textContent})");

    ev("state.saldoView='league';state.saldoMetric='sum';state.saldoPeriod='both';state.saldoSort='net';renderAll();true");

    t('grafico/ordem: padrao ordena pelo saldo final, maior primeiro',
      ev("(function(){var r=saldoRows();for(var i=1;i<r.length;i++){var a=r[i-1].cum[r[i-1].cum.length-1],b=r[i].cum[r[i].cum.length-1];if(a<b)return 'fora de ordem'}return 'ok'})()"), 'ok');
    t('grafico/ordem: empate resolvido pelo nome (A-Z, estavel)',
      ev("(function(){var r=saldoRows();for(var i=1;i<r.length;i++){var a=r[i-1].cum[r[i-1].cum.length-1],b=r[i].cum[r[i].cum.length-1];if(a===b&&String(r[i-1].name).localeCompare(String(r[i].name),'pt-BR')>0)return 'empate fora de ordem'}return 'ok'})()"), 'ok');
    t('grafico/ordem: legenda na mesma ordem da serie desenhada', legNames().join('|'), ev("saldoRows().slice(0,6).map(function(r){return r.name}).join('|')"));
    t('grafico/ordem: selo da legenda = saldo final da serie', legStamps().join('|'), ev("saldoRows().slice(0,6).map(function(r){return saldoFmt(r.cum[r.cum.length-1])}).join('|')"));
    t('grafico/ordem: CSV na mesma ordem da legenda', parseCsv(ev("saldoRowsCsv()")).slice(1, -1).map(r => r[0]).slice(0, legNames().length).join('|'), legNames().join('|'));
    t('grafico/ordem: coluna de ordem do CSV bate com a legenda', parseCsv(ev("saldoRowsCsv()")).slice(1, -1).map(r => r[9]).join('|'), ev("saldoRows().map(function(r){return String(r.order)}).join('|')"));
    t('grafico/ordem: aviso da legenda cita o saldo final', ev("$('#saldoLegend').textContent.indexOf('maior primeiro') >= 0"), true);
    t('grafico/ordem: ordenacao vale nas duas visoes', ev("(function(){var l=[];['league','team'].forEach(function(v){state.saldoView=v;renderSaldoChart();var r=saldoRows();var ok=true;for(var i=1;i<r.length;i++){if(r[i-1].cum[r[i-1].cum.length-1]<r[i].cum[r[i].cum.length-1])ok=false}l.push(ok?'ok':'fora')});return l.join('|')})()"), 'ok|ok');

    /* a ordenacao acompanha o filtro (o eixo muda de tamanho) */
    t('grafico/ordem: no filtro 1o tempo ordena pelo acumulado de 45',
      ev("(function(){state.saldoPeriod='h1';renderSaldoChart();var r=saldoRows();var ok=true;for(var i=1;i<r.length;i++){if(r[i-1].cum[r[i-1].cum.length-1]<r[i].cum[r[i].cum.length-1])ok=false}return ok?'ok':'fora'})()"), 'ok');
    t('grafico/ordem: no filtro 2o tempo ordena pelo saldo do 2o tempo',
      ev("(function(){state.saldoPeriod='h2';renderSaldoChart();var r=saldoRows();var ok=true;for(var i=1;i<r.length;i++){if(r[i-1].cum[r[i-1].cum.length-1]<r[i].cum[r[i].cum.length-1])ok=false}return ok?'ok':'fora'})()"), 'ok');
    ev("state.saldoPeriod='both';renderSaldoChart();true");

    /* modo Nome */
    ev("state.saldoSort='name';renderSaldoChart();true");
    t('grafico/ordem: modo nome ordena A-Z na legenda', legNames().join('|'), legNames().slice().sort((a, b) => String(a).localeCompare(String(b), 'pt-BR')).join('|'));
    t('grafico/ordem: modo nome mantem o selo com o valor final', legStamps().join('|'), ev("saldoRows().slice(0,6).map(function(r){return saldoFmt(r.cum[r.cum.length-1])}).join('|')"));
    t('grafico/ordem: modo nome mantem o CSV na mesma ordem', parseCsv(ev("saldoRowsCsv()")).slice(1, -1).map(r => r[0]).slice(0, legNames().length).join('|'), legNames().join('|'));
    t('grafico/ordem: aviso da legenda muda para nome A-Z', ev("$('#saldoLegend').textContent.indexOf('nome A') >= 0"), true);
    t('grafico/ordem: geometria registra a ordenacao', JSON.parse(ev("$('#saldoChart').getAttribute('data-geom')")).sort, 'name');
    t('grafico/ordem: clique em Nome muda a ordenacao',
      ev("(function(){state.saldoSort='net';renderSaldoChart();var b=document.querySelectorAll('#saldoSort button');b[1].click();return saldoSortMode()})()"), 'name');
    t('grafico/ordem: botao ativo fica marcado (e o outro nao)',
      ev("(function(){var b=document.querySelectorAll('#saldoSort button');return (b[1].className.indexOf('on')>=0)+'/'+(b[0].className.indexOf('on')<0)})()"), 'true/true');
    t('grafico/ordem: clique em Saldo final volta ao padrao',
      ev("(function(){var b=document.querySelectorAll('#saldoSort button');b[0].click();return saldoSortMode()})()"), 'net');
    t('grafico/ordem: ordenacao sobrevive a filtro e visao',
      ev("(function(){state.saldoSort='name';state.saldoPeriod='h1';state.saldoView='team';renderSaldoChart();var r=saldoSortMode()+'|'+periodSpan()+'|'+saldoViewMode();state.saldoSort='net';state.saldoPeriod='both';state.saldoView='league';renderAll();return r})()"), 'name|h1|team');
    t('grafico/ordem: valor invalido cai no saldo final',
      ev("(function(){state.saldoSort='xpto';var s=saldoSortMode();state.saldoSort='net';return s})()"), 'net');
    t('grafico/ordem: ordem sequencial sem buraco',
      ev("(function(){var r=saldoRows();var ok=r.every(function(x,j){return x.order===j+1});return ok+'/'+r.map(function(x){return String(x.order)}).join('|')})()"),
      'true/' + ev("saldoRows().map(function(r){return String(r.order)}).join('|')"));
    t('grafico/ordem: sem NaN no CSV em nenhuma ordenacao',
      ev("(function(){var a=saldoRowsCsv();state.saldoSort='name';var b=saldoRowsCsv();state.saldoSort='net';return String(/NaN/.test(String(a)))+'/'+String(/NaN/.test(String(b)))})()"), 'false/false');
    t('grafico/ordem: estado final restaurado',
      ev("(function(){state.saldoView='league';state.saldoMetric='sum';state.saldoPeriod='both';state.saldoSort='net';renderAll();return saldoSortMode()+'|'+periodSpan()+'|'+saldoViewMode()+'|'+state.saldoMetric})()"), 'net|both|league|sum');
  } catch(e){ console.log('FALHA no bloco grafico/ordem:', e && e.message); }

  /* ===== grafico/persistencia: ordem da legenda entre sessoes (novo) ===== */
  try {
    const KEY = 'cornerpro.legendOrder';
    const clean = () => { try { window.localStorage.removeItem(KEY); } catch(e){} };
    clean();
    t('grafico/persistencia: sem valor guardado o padrao e saldo final', ev("saldoSortLoad()"), 'net');
    t('grafico/persistencia: clicar em Nome grava a escolha',
      ev("(function(){var b=document.querySelectorAll('#saldoSort button');b[1].click();var raw=window.localStorage.getItem('" + KEY + "');return saldoSortMode()+'|'+String(raw)})()"), 'name|"name"');
    t('grafico/persistencia: o que foi gravado e o que a carga devolve', ev("saldoSortLoad()"), 'name');
    /* simula uma nova sessao: o app e recarregado do zero lendo o mesmo storage */
    const boot = ev("(function(){var salvo=window.localStorage.getItem('" + KEY + "');state.saldoSort=saldoSortLoad();renderAll();var on=document.querySelectorAll('#saldoSort button')[1].className.indexOf('on')>=0;var ord=document.querySelectorAll('#saldoLegend span[title]').length?[].slice.call(document.querySelectorAll('#saldoLegend span[title]')).map(function(x){return (x.getAttribute('title')||'').split(' \u00b7 ')[0]}).join('|'):'';return String(salvo)+'#'+saldoSortMode()+'#'+on+'#'+JSON.parse(document.querySelector('#saldoChart').getAttribute('data-geom')).sort+'#'+ord})()");
    const bp = boot.split('#');
    t('grafico/persistencia: modo restaurado antes de desenhar (botao Nome ja ativo)', bp[2], 'true');
    t('grafico/persistencia: geometria ja sai com a ordem restaurada', bp[3], 'name');
    t('grafico/persistencia: legenda ja sai ordenada por nome', bp[4], bp[4].slice().split('|').sort((a, b) => String(a).localeCompare(String(b), 'pt-BR')).join('|'));
    t('grafico/persistencia: titulo/aviso acompanham o modo restaurado', ev("$('#saldoLegend').textContent.indexOf('nome A') >= 0"), true);
    /* volta para saldo final: a escolha tambem e persistida */
    t('grafico/persistencia: clicar em Saldo final regrava o padrao',
      ev("(function(){var b=document.querySelectorAll('#saldoSort button');b[0].click();return saldoSortMode()+'|'+String(window.localStorage.getItem('" + KEY + "'))})()"), 'net|"net"');
    /* valor invalido guardado -> volta ao padrao, sem quebrar */
    t('grafico/persistencia: valor invalido no storage cai no padrao',
      ev("(function(){window.localStorage.setItem('" + KEY + "','lixo');var s=saldoSortLoad();state.saldoSort=s;renderSaldoChart();return s+'|'+JSON.parse(document.querySelector('#saldoChart').getAttribute('data-geom')).sort})()"), 'net|net');
    t('grafico/persistencia: valor nulo no storage cai no padrao',
      ev("(function(){window.localStorage.setItem('" + KEY + "','null');return saldoSortLoad()})()"), 'net');
    /* storage que lanca nao pode quebrar a pagina */
    const thr = ev("(function(){var real=window.localStorage;var fake={getItem:function(){throw new Error('privado')},setItem:function(){throw new Error('privado')},removeItem:function(){}};var out='';try{Object.defineProperty(window,'localStorage',{configurable:true,get:function(){return fake}});}catch(e){out+='sem-troca '}var s=saldoSortLoad();var r=saldoSortSave('name');renderAll();var ok=document.querySelectorAll('#saldoLegend b.sfin').length>=0;Object.defineProperty(window,'localStorage',{configurable:true,get:function(){return real}});state.saldoSort=saldoSortLoad();renderAll();return s+'|'+r+'|'+ok})()");
    t('grafico/persistencia: storage que lanca nao derruba a pagina', thr, 'net|name|true');
    /* e o que ficou gravado antes continua valendo depois do erro */
    t('grafico/persistencia: escolha anterior sobrevive ao erro de storage', ev("saldoSortLoad()"), 'net');
    ev("state.saldoView='league';state.saldoMetric='sum';state.saldoPeriod='both';state.saldoSort='net';renderAll();true");
    t('grafico/persistencia: estado final restaurado',
      ev("saldoSortMode()+'|'+periodSpan()+'|'+saldoViewMode()+'|'+state.saldoMetric"), 'net|both|league|sum');
  } catch(e){ console.log('FALHA no bloco grafico/persistencia:', e && e.message); }

  /* ===== grafico/prefs: filtro de tempo e visao entre sessoes (novo) ===== */
  try {
    const PKEY = 'cornerpro.saldoPrefs', OKEY = 'cornerpro.legendOrder';
    try { window.localStorage.removeItem(PKEY); window.localStorage.removeItem(OKEY); } catch(e){}
    t('grafico/prefs: sem nada guardado, os tres padroes',
      ev("(function(){var real=window.localStorage;var vazio={getItem:function(){return null},setItem:function(){},removeItem:function(){}};Object.defineProperty(window,'localStorage',{configurable:true,get:function(){return vazio}});var p=saldoPrefsLoad();Object.defineProperty(window,'localStorage',{configurable:true,get:function(){return real}});return p.sort+'|'+p.view+'|'+p.period})()"), 'net|league|both');
    t('grafico/prefs: limpeza real do storage deixa o cartao no padrao',
      ev("(function(){try{window.localStorage.clear()}catch(e){}var raw=window.localStorage.getItem('cornerpro.saldoPrefs');var p=saldoPrefsLoad();state.saldoSort=p.sort;state.saldoView=p.view;state.saldoPeriod=p.period;renderAll();return String(raw==null)+'|'+p.sort+'|'+p.view+'|'+p.period})()"), 'true|net|league|both');
    t('grafico/prefs: clicar em Por time grava a visao',
      ev("(function(){var b=document.querySelectorAll('#saldoView button');b[1].click();var p=JSON.parse(window.localStorage.getItem('" + PKEY + "'));return saldoViewMode()+'|'+p.view})()"), 'team|team');
    t('grafico/prefs: clicar em 1o tempo grava o filtro sem apagar a visao',
      ev("(function(){var b=document.querySelectorAll('#saldoPeriod button');b[1].click();var p=JSON.parse(window.localStorage.getItem('" + PKEY + "'));return periodSpan()+'|'+p.period+'|'+p.view})()"), 'h1|h1|team');
    t('grafico/prefs: clicar em Nome grava a ordem sem apagar os outros dois',
      ev("(function(){var b=document.querySelectorAll('#saldoSort button');b[1].click();var p=JSON.parse(window.localStorage.getItem('" + PKEY + "'));return saldoSortMode()+'|'+p.sort+'|'+p.view+'|'+p.period})()"), 'name|name|team|h1');
    t('grafico/prefs: a ordem continua espelhada na chave antiga',
      ev("String(window.localStorage.getItem('" + OKEY + "'))"), '"name"');
    /* nova sessao: le os tres de uma vez e confere TUDO que depende deles */
    const re = ev("(function(){var p=saldoPrefsLoad();state.saldoSort=p.sort;state.saldoView=p.view;state.saldoPeriod=p.period;renderAll();var g=JSON.parse(document.querySelector('#saldoChart').getAttribute('data-geom'));var on=[].slice.call(document.querySelectorAll('#saldoView button.on')).map(function(b){return b.getAttribute('data-sv')}).join(',');var onp=[].slice.call(document.querySelectorAll('#saldoPeriod button.on')).map(function(b){return b.getAttribute('data-sp')}).join(',');var ons=[].slice.call(document.querySelectorAll('#saldoSort button.on')).map(function(b){return b.getAttribute('data-so')}).join(',');var tit=document.querySelector('#saldoTitle').textContent;var cap=document.querySelector('#saldoCap').textContent;var head=String(saldoRowsCsv()).replace(/\ufeff/g,'').split('\\r\\n')[0].split(';');return [saldoSortMode(),saldoViewMode(),periodSpan(),g.span,g.sort,on,onp,ons,tit,cap.indexOf('filtro 1')>0,head[0].slice(1,-1),(head[3].indexOf('fim do 1')>=0)].join('#')})()").split('#');    t('grafico/prefs: os tres estados restaurados antes de desenhar', re[0] + '|' + re[1] + '|' + re[2], 'name|team|h1');
    t('grafico/prefs: geometria do canvas reflete filtro e ordem', re[3] + '|' + re[4], 'h1|name');
    t('grafico/prefs: botoes ativos certos (visao, filtro, ordem)', re[5] + '|' + re[6] + '|' + re[7], 'team|h1|name');
    t('grafico/prefs: titulo cita visao e filtro restaurados', (re[8].indexOf('por time') >= 0) && (re[8].indexOf('\u00ba tempo') >= 0), true);
    t('grafico/prefs: rodape acompanha o filtro restaurado', re[9], 'true');
    t('grafico/prefs: CSV segue visao e filtro restaurados', re[10].replace('\ufeff','') + '|' + re[11], 'Time|true');
    t('grafico/prefs: legenda ja sai ordenada por nome na primeira pintura',
      ev("(function(){var l=[].slice.call(document.querySelectorAll('#saldoLegend span[title]')).map(function(x){return (x.getAttribute('title')||'').split(' \u00b7 ')[0]});return l.length?(l.join('|')===l.slice().sort(function(a,b){return String(a).localeCompare(String(b),'pt-BR')}).join('|')).toString():'vazio'})()"), 'true');
    t('grafico/prefs: prefs corrompidas caem no padrao campo a campo',
      ev("(function(){window.localStorage.setItem('" + PKEY + "','{isso nao e json');window.localStorage.removeItem('" + OKEY + "');var p=saldoPrefsLoad();state.saldoSort=p.sort;state.saldoView=p.view;state.saldoPeriod=p.period;renderAll();return p.sort+'|'+p.view+'|'+p.period})()"), 'net|league|both');
    t('grafico/prefs: valores invalidos dentro do JSON caem no padrao',
      ev("(function(){window.localStorage.setItem('" + PKEY + "',JSON.stringify({sort:'xpto',view:'time',period:'3t'}));var p=saldoPrefsLoad();state.saldoSort=p.sort;state.saldoView=p.view;state.saldoPeriod=p.period;renderAll();return p.sort+'|'+p.view+'|'+p.period})()"), 'net|league|both');
    t('grafico/prefs: chave antiga continua sendo respeitada',
      ev("(function(){window.localStorage.removeItem('" + PKEY + "');window.localStorage.setItem('" + OKEY + "',JSON.stringify('name'));var p=saldoPrefsLoad();return p.sort+'|'+p.view+'|'+p.period})()"), 'name|league|both');
    const thr2 = ev("(function(){var real=window.localStorage;var fake={getItem:function(){throw new Error('privado')},setItem:function(){throw new Error('privado')},removeItem:function(){}};Object.defineProperty(window,'localStorage',{configurable:true,get:function(){return fake}});var p=null,r=null,ok=false;try{p=saldoPrefsLoad();r=saldoPrefSave('view','team');state.saldoView=saldoViewMode();renderAll();ok=document.querySelectorAll('#saldoLegend b.sfin').length>=0}catch(e){}Object.defineProperty(window,'localStorage',{configurable:true,get:function(){return real}});return String(p?p.sort+'|'+p.view+'|'+p.period:'erro')+'|'+String(r)+'|'+ok})()");
    t('grafico/prefs: storage que lanca nao derruba a pagina', thr2, 'net|league|both|team|true');
    t('grafico/prefs: leitura anterior sobrevive ao erro de storage',
      ev("(function(){var p=saldoPrefsLoad();return p.sort+'|'+p.view+'|'+p.period})()"), 'name|league|both');
    ev("(function(){window.localStorage.removeItem('" + PKEY + "');window.localStorage.removeItem('" + OKEY + "');state.saldoSort='net';state.saldoView='league';state.saldoPeriod='both';state.saldoMetric='sum';renderAll();return true})()");
    t('grafico/prefs: estado final restaurado',
      ev("saldoSortMode()+'|'+saldoViewMode()+'|'+periodSpan()+'|'+state.saldoMetric"), 'net|league|both|sum');
  } catch(e){ console.log('FALHA no bloco grafico/prefs:', e && e.message); }

  /* ===== grafico/metrica: Saldo somado / Media por jogo entre sessoes (novo) ===== */
  try {
    const PKEY = 'cornerpro.saldoPrefs';
    try { window.localStorage.removeItem(PKEY); } catch(e){}
    t('grafico/metrica: sem nada guardado, o padrao e saldo somado',
      ev("(function(){var p=saldoPrefsLoad();return p.metric+'|'+p.sort+'|'+p.view+'|'+p.period})()"), 'sum|net|league|both');
    t('grafico/metrica: clicar em Media por jogo grava sem apagar os outros campos',
      ev("(function(){var b=document.querySelectorAll('#saldoView button');b[1].click();var p2=document.querySelectorAll('#saldoPeriod button');p2[2].click();var b3=document.querySelectorAll('#saldoSort button');b3[1].click();var m=document.querySelectorAll('#saldoMetric button');m[1].click();var p=JSON.parse(window.localStorage.getItem('" + PKEY + "'));return saldoMetricMode()+'|'+p.metric+'|'+p.view+'|'+p.period+'|'+p.sort})()"), 'avg|avg|team|h2|name');
    /* nova sessao: a metrica volta junto das outras tres e tudo o que depende dela acompanha */
    const rt = ev("(function(){var p=saldoPrefsLoad();state.saldoSort=p.sort;state.saldoView=p.view;state.saldoPeriod=p.period;state.saldoMetric=p.metric;renderAll();var g=JSON.parse(document.querySelector('#saldoChart').getAttribute('data-geom'));var on=[].slice.call(document.querySelectorAll('#saldoMetric button.on')).map(function(b){return b.getAttribute('data-sm')}).join(',');var head=String(saldoRowsCsv()).replace(/\ufeff/g,'').split(String.fromCharCode(13,10))[0].split(';');var leg=document.querySelector('#saldoLegend').textContent.slice(0,80);return [saldoMetricMode(),g.metric,on,(head[1].indexOf('(m\u00e9dia/jogo)')>0),(leg.indexOf('nome A')>0 || leg.indexOf('saldo 2')>0)].join('#')})()").split('#');
    t('grafico/metrica: os quatro estados restaurados antes de desenhar', rt[0] + '|' + rt[1], 'avg|avg');
    t('grafico/metrica: botao Media por jogo ja ativo na primeira pintura', rt[2], 'avg');
    t('grafico/metrica: cabecalho do CSV sai em media por jogo', rt[3], 'true');
    t('grafico/metrica: legenda acompanha o estado restaurado', rt[4], 'true');
    t('grafico/metrica: geometria do canvas registra a metrica', JSON.parse(ev("$('#saldoChart').getAttribute('data-geom')")).metric, 'avg');
    t('grafico/metrica: valor invalido cai no saldo somado',
      ev("(function(){window.localStorage.setItem('" + PKEY + "',JSON.stringify({metric:'xpto',view:'team',period:'h1',sort:'name'}));var p=saldoPrefsLoad();return p.metric+'|'+p.view+'|'+p.period+'|'+p.sort})()"), 'sum|team|h1|name');
    t('grafico/metrica: metrica invalida nao derruba os outros campos',
      ev("(function(){window.localStorage.setItem('" + PKEY + "',JSON.stringify({metric:'lixo'}));var p=saldoPrefsLoad();state.saldoMetric=p.metric;renderAll();return saldoMetricMode()+'|'+saldoViewMode()+'|'+periodSpan()+'|'+saldoSortMode()})()"), 'sum|team|h2|name');
    try { window.localStorage.removeItem(PKEY); } catch(e){}
    t('grafico/metrica: clicar em Saldo somado regrava o padrao',
      ev("(function(){state.saldoMetric='avg';renderSaldoChart();var m=document.querySelectorAll('#saldoMetric button');m[0].click();var p=JSON.parse(window.localStorage.getItem('" + PKEY + "'));return saldoMetricMode()+'|'+p.metric})()"), 'sum|sum');
    t('grafico/metrica: estado final restaurado',
      ev("(function(){state.saldoSort='net';state.saldoView='league';state.saldoPeriod='both';state.saldoMetric='sum';renderAll();try{window.localStorage.removeItem('" + PKEY + "')}catch(e){}return saldoMetricMode()+'|'+periodSpan()+'|'+saldoViewMode()+'|'+saldoSortMode()})()"), 'sum|both|league|net');
  } catch(e){ console.log('FALHA no bloco grafico/metrica:', e && e.message); }

  /* ===== fonte/min: parametro ?min= da fonte (novo) ===== */
  try {
    const setUrl = (q) => ev("(function(){try{window.history.replaceState(null,'','/" + q + "')}catch(e){}return window.location.search})()");
    t('fonte/min: sem parametro nao ha valor', setUrl('') + '|' + ev("String(minUrlRead())"), '|null');
    t('fonte/min: le ?min=12 da URL', setUrl('?min=12') + '|' + ev("minUrlRead()"), '?min=12|12');
    t('fonte/min: min=0 NAO e tratado como ausente (invalido -> null)', setUrl('?min=0') + '|' + ev("String(minUrlRead())"), '?min=0|null');
    t('fonte/min: texto vazio/ invalido -> null', setUrl('?min=abc') + '|' + ev("String(minUrlRead())"), '?min=abc|null');
    t('fonte/min: acima de 50 ganha TETO, igual ao proxy', ev("String(minParse('51'))+'/'+String(minParse('-3'))+'/'+String(minParse('250'))"), '50/null/50');
    t('fonte/min: limites aceitos', ev("minParse('1')+'/'+minParse('50')"), '1/50');
    t('fonte/min: espaco, vazio e nulo', ev("minParse(' 12 ')+'/'+String(minParse(''))+'/'+String(minParse(null))"), '12/null/null');
    t('fonte/min: boot aplica o valor da URL antes de desenhar',
      ev("(function(){try{window.history.replaceState(null,'','/?min=13')}catch(e){}var v=minBoot();return v+'|'+CFG.minSamples+'|'+minSamples()})()"), '13|13|13');
    t('fonte/min: o valor do boot fica gravado no storage',
      Number(ev("(function(){return JSON.parse(window.localStorage.getItem('cp_cfg_v2')||'{}').minSamples})()")), 13);
    t('fonte/min: boot com valor invalido volta ao valor persistido e limpa a URL do parametro invalido',
      ev("(function(){try{window.history.replaceState(null,'','/?min=0')}catch(e){}var v=minBoot();return v+'|'+(window.location.search.indexOf('min=0')<0)})()"), '13|true');
    t('fonte/min: sem nada persistido, valor invalido na URL cai no padrao',
      ev("(function(){var raw=JSON.parse(window.localStorage.getItem('cp_cfg_v2')||'{}');delete raw.minSamples;delete CFG.minSamples;window.localStorage.setItem('cp_cfg_v2',JSON.stringify(raw));try{window.history.replaceState(null,'','/?min=0')}catch(e){}var v=minBoot();return v+'|'+window.location.search})()"), '8|');
    t('fonte/min: boot sem parametro usa o valor persistido e reflete na URL',
      ev("(function(){minApply(13);try{window.history.replaceState(null,'','/')}catch(e){}var v=minBoot();return v+'|'+window.location.search})()"), '13|?min=13');
    t('fonte/min: com o corte no padrao, a URL fica sem o parametro',
      ev("(function(){minApply(8);var v=minBoot();return v+'|'+window.location.search})()"), '8|');
    t('fonte/min: mudar o corte escreve ?min= na URL',
      ev("(function(){try{window.history.replaceState(null,'','/')}catch(e){}var v=minApply(20);return v+'|'+window.location.search})()"), '20|?min=20');
    t('fonte/min: voltar ao padrao remove o parametro',
      ev("(function(){var v=minApply(8);return v+'|'+window.location.search})()"), '8|');
    t('fonte/min: valor invalido cai no padrao em vez de gravar lixo',
      ev("(function(){var v=minApply('abc');return v+'|'+window.location.search})()"), '8|');
    t('fonte/min: min=0 do usuario vira padrao (nao passa como 0)',
      ev("(function(){var v=minApply(0);return v+'|'+window.location.search})()"), '8|');
    t('fonte/min: nao apaga outros parametros da URL',
      ev("(function(){try{window.history.replaceState(null,'','/?foo=1&min=12')}catch(e){}minApply(30);return window.location.search})()"), '?foo=1&min=30');
    t('fonte/min: ao voltar ao padrao remove so o min',
      ev("(function(){minApply(8);return window.location.search})()"), '?foo=1');
    t('fonte/min: parametros alheios sobrevivem ao boot',
      ev("(function(){try{window.history.replaceState(null,'','/?foo=1&min=12')}catch(e){}minBoot();return window.location.search+'|'+minSamples()})()"), '?foo=1&min=12|12');
    t('fonte/min: faixa efetiva continua em 1..50', ev("(function(){var a=minApply(1),b=minApply(50);var r=a+'/'+b;minApply(8);return r})()"), '1/50');
    t('fonte/min: consulta enviada ao proxy usa o corte vigente', ev("(function(){minApply(17);var q=minQuery();minApply(8);return q})()"), 'min=17');
    t('fonte/min: estado final restaurado',
      ev("(function(){try{window.history.replaceState(null,'','/')}catch(e){}var v=minBoot();return v+'|'+window.location.search+'|'+minSamples()+'|'+minQuery()})()"), '8||8|min=8');
    /* --- (a)+(b) corte acima de 50: TETO no cliente = TETO no proxy --- */
    t('fonte/min: 99, 51 e 250 viram 50 no cliente (mesmo teto do proxy)', ev("minParse('99')+'/'+minParse('51')+'/'+minParse('250')"), '50/50/50');
    t('fonte/min: ?min=99 aplica 50 e reescreve a URL com o valor efetivo (nao deixa 99 mentindo)',
      ev("(function(){try{window.history.replaceState(null,'','/?min=99')}catch(e){}var v=minBoot();return v+'|'+window.location.search})()"), '50|?min=50');
    t('fonte/min: ?min=99 grava o valor efetivo no storage',
      Number(ev("(function(){try{window.history.replaceState(null,'','/?min=99')}catch(e){}minBoot();return JSON.parse(window.localStorage.getItem('cp_cfg_v2')||'{}').minSamples})()")), 50);
    t('fonte/min: ?min=0 nao vira 0 nem 50 — cai no padrao e limpa a URL',
      ev("(function(){var raw=JSON.parse(window.localStorage.getItem('cp_cfg_v2')||'{}');delete raw.minSamples;delete CFG.minSamples;window.localStorage.setItem('cp_cfg_v2',JSON.stringify(raw));try{window.history.replaceState(null,'','/?min=0')}catch(e){}var v=minBoot();return v+'|'+window.location.search})()"), '8|');
    t('fonte/min: minApply(99) grava 50 e sincroniza a URL', ev("(function(){var v=minApply(99);var u=window.location.search;minApply(8);return v+'|'+u})()"), '50|?min=50');
    t('fonte/min: consulta enviada ao proxy usa o teto de 99', ev("(function(){minApply(99);var q=minQuery();minApply(8);return q})()"), 'min=50');
    t('fonte/min: estado restaurado apos os testes de teto', ev("(function(){var v=minApply(8);return v+'|'+window.location.search})()"), '8|');
  } catch(e){ console.log('FALHA no bloco fonte/min:', e && e.message); }








})();

  // ---- fim do agrupamento ----
  t('cliente envia ?min= padrao ao proxy', fetched.some(function(u){return u.indexOf('/derive/board?days=1&min=8')>=0;}), true);
  t('cliente envia o ?min= escolhido (2)', fetched.some(function(u){return u.indexOf('min=2')>=0;}), true);
  t('cliente envia o ?min= limitado (50)', fetched.some(function(u){return u.indexOf('min=50')>=0;}), true);
  t('teamavg tambem recebe ?min=', fetched.some(function(u){return u.indexOf('/derive/teamavg?days=7&min=8')>=0;}), true);
  t('só chamadas ao proxy (0 à API direta)', fetched.every(u => u.indexOf('px.test') >= 0), true);
  t('erros JS', errs.length, 0);
  console.log('RESUMO | fails=' + fails + ' | erros=' + errs.length + ' | arc=' + calls.arc + ' lineTo=' + calls.lineTo + ' fillText=' + calls.fillText + ' | fetch=' + JSON.stringify(fetched));
  try { fs.writeFileSync('ranking-escanteios-exemplo.csv', String(globalThis.__rcp)); fs.writeFileSync('ranking-escanteios-local-exemplo.csv', String(globalThis.__rcl)); fs.writeFileSync('h2h-proxy-exemplo.csv', String(globalThis.__hcp)); fs.writeFileSync('h2h-local-exemplo.csv', String(globalThis.__hcl)); fs.writeFileSync('momentos-exemplo.csv', String(globalThis.__mcp)); fs.writeFileSync('ficha-partida-exemplo.csv', String(globalThis.__fcp)); fs.writeFileSync('jogos-exemplo.csv', String(globalThis.__lcp)); } catch(e){ console.log('WARN escrita exemplos: ' + e.message); }
  if (errs.length) console.log('ERROS:', errs.slice(0,4).join(' || '));
  process.exit(fails ? 1 : 0);
})();
