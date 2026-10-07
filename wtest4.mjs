import { pathToFileURL } from 'url';
globalThis.caches = { default: { async match(){ return undefined; }, async put(){} } };
const SECRET='S3CRET-KEY';
const calls=[];
// 2 jogos encerrados (Flamengo/Palmeiras e Flamengo/Grêmio) + 1 agendado
const FIX = { response: [
 { fixture:{id:1,date:'2026-09-20T20:00:00+00:00',status:{short:'FT'}},
   league:{id:71,name:'Serie A',flag:'🇮🇹'}, teams:{home:{id:33,name:'Flamengo',logo:'f'},away:{id:34,name:'Palmeiras',logo:'p'}}, goals:{home:3,away:1} },
 { fixture:{id:2,date:'2026-09-21T20:00:00+00:00',status:{short:'FT'}},
   league:{id:71,name:'Serie A',flag:'🇮🇹'}, teams:{home:{id:35,name:'Grêmio',logo:'g'},away:{id:33,name:'Flamengo',logo:'f'}}, goals:{home:0,away:2} },
 { fixture:{id:3,date:'2026-09-23T20:00:00+00:00',status:{short:'NS'}},
   league:{id:71,name:'Serie A',flag:'🇮🇹'}, teams:{home:{id:34,name:'Palmeiras',logo:'p'},away:{id:35,name:'Grêmio',logo:'g'}}, goals:{home:null,away:null} }
]};
globalThis.fetch = async (u) => { calls.push(String(u).replace('https://v3.football.api-sports.io','UP')); return new Response(JSON.stringify(FIX),{status:200,headers:{'x-ratelimit-requests-remaining':'77'}}); };
const mod = (await import(pathToFileURL('/home/user/cornerpro/cornerpro-proxy.mjs').href)).default;
const env = { APIFOOTBALL_KEY:SECRET, ALLOWED_ORIGINS:'https://meuapp.com' };
const go = p => mod.fetch(new Request('https://w.test'+p,{headers:{Origin:'https://meuapp.com','CF-Connecting-IP':'2.2.2.2'}}), env, {waitUntil(){}});
const R={};
let r = await go('/health'); const hb = await r.json();
R.health = { routes:hb.routes, hasTeamavg:hb.routes.includes('/derive/teamavg') };

calls.length=0;
r = await go('/derive/board?days=0'); const board = await r.json();
const est = {}; board.matches.filter(m=>m.status==='finished').forEach(m=>{
  est[m.home.name] = est[m.home.name]||[]; est[m.home.name].push({c:m.stats.corners[0],gf:m.score[0],ga:m.score[1],home:true});
  est[m.away.name] = est[m.away.name]||[]; est[m.away.name].push({c:m.stats.corners[1],gf:m.score[1],ga:m.score[0],home:false});
});
R.boardEst = { matches: board.matches.map(m=>({t:m.home.name+' x '+m.away.name, st:m.status, corners:m.stats.corners})) };

calls.length=0;
r = await go('/derive/teamavg?days=7'); const ta = await r.json();
const mean = a => Math.round((a.reduce((x,y)=>x+y,0)/a.length)*10)/10;
const expected = Object.keys(est).map(n=>({ name:n, games:est[n].length,
  cornersFor: mean(est[n].map(x=>x.c)),
  goalsFor: mean(est[n].map(x=>x.gf)),
  homeFor: est[n].some(x=>x.home)? mean(est[n].filter(x=>x.home).map(x=>x.c)) : null,
  awayFor: est[n].some(x=>!x.home)? mean(est[n].filter(x=>!x.home).map(x=>x.c)) : null })).sort((a,b)=>b.cornersFor-a.cornersFor);
R.teamavg = { status:r.status, upstreamCalls:calls.length, days:ta.days, sampled:ta.sampled, count:ta.teams.length,
  estimatedCorners:ta.estimatedCorners, realGoals:ta.realGoals, quota:ta.quota, cacheControl:r.headers.get('cache-control'),
  cache:r.headers.get('X-Proxy-Cache'), leaks:JSON.stringify(ta).includes(SECRET),
  teams: ta.teams.map(t=>({ name:t.name, abbr:t.abbr, games:t.games, cornersFor:t.cornersFor, cornersAgainst:t.cornersAgainst, homeFor:t.homeFor, awayFor:t.awayFor, goalsFor:t.goalsFor, goalsAgainst:t.goalsAgainst })),
  sortedDesc: ta.teams.every((t,i,a)=> i===0 || a[i-1].cornersFor>=t.cornersFor) };
// cruzamento: valores da tabela == médias calculadas a partir do /derive/board
R.crossCheck = expected.map(e=>{ const got = ta.teams.find(t=>t.name===e.name)||{};
  return { name:e.name, games:[e.games,got.games], cornersFor:[e.cornersFor,got.cornersFor], goalsFor:[e.goalsFor,got.goalsFor],
    homeFor:[e.homeFor,got.homeFor], awayFor:[e.awayFor,got.awayFor],
    ok: e.games===got.games && e.cornersFor===got.cornersFor && e.goalsFor===got.goalsFor && e.homeFor===got.homeFor && e.awayFor===got.awayFor }; });
R.crossCheckAllOk = R.crossCheck.every(x=>x.ok);
r = await go('/derive/teamavg?days=99'); R.clamp = { status:r.status, days:(await r.json()).days };
console.log(JSON.stringify(R,null,1));
