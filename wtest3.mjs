import { pathToFileURL } from 'url';
globalThis.caches = { default: { async match(){ return undefined; }, async put(){} } };
const SECRET = 'SUPER-SECRET-12345';
const calls = [];
const FIX = { response: [
  { fixture:{id:1001,date:'2026-09-23T18:30:00+00:00',status:{short:'2H',elapsed:63},venue:{name:'Arena A'}},
    league:{id:71,name:'Serie A',country:'Brazil',flag:'🇧🇷',round:'Round 24'},
    teams:{home:{id:33,name:'Flamengo',logo:'x'},away:{id:34,name:'Palmeiras',logo:'y'}}, goals:{home:2,away:1},
    events:[{time:{elapsed:22},type:'Goal',detail:'Normal Goal',team:{id:33}},{time:{elapsed:51},type:'Card',detail:'Yellow Card',team:{id:34}}] },
  { fixture:{id:1002,date:'2026-09-23T20:00:00+00:00',status:{short:'NS'}},
    league:{id:71,name:'Serie A',country:'Brazil',flag:'🇧🇷'}, teams:{home:{id:35,name:'Grêmio',logo:''},away:{id:36,name:'Inter',logo:''}}, goals:{home:null,away:null} }
]};
const H2H = { response: [
  { fixture:{id:9,date:'2026-05-01T20:00:00+00:00',status:{short:'FT'}}, teams:{home:{id:33,name:'Flamengo'},away:{id:34,name:'Palmeiras'}}, goals:{home:3,away:1}, league:{name:'Serie A'} },
  { fixture:{id:8,date:'2025-11-02T20:00:00+00:00',status:{short:'FT'}}, teams:{home:{id:34,name:'Palmeiras'},away:{id:33,name:'Flamengo'}}, goals:{home:2,away:2}, league:{name:'Serie A'} }
]};
const STATS = { response:[{ statistics:[
  {type:'Ball Possession',statistics:{home:'61%',away:'39%'}},{type:'Total Shots',statistics:{home:15,away:8}},
  {type:'Shots on Goal',statistics:{home:7,away:3}},{type:'Corner Kicks',statistics:{home:9,away:4}},
  {type:'Yellow Cards',statistics:{home:2,away:3}},{type:'Fouls',statistics:{home:12,away:14}}]}] };
globalThis.fetch = async (u) => {
  calls.push(String(u).replace('https://v3.football.api-sports.io','UP'));
  if (u.includes('h2h=')) return new Response(JSON.stringify(H2H), {status:200, headers:{'x-ratelimit-requests-remaining':'88'}});
  if (u.includes('statistics')) return new Response(JSON.stringify(STATS), {status:200});
  if (u.includes('id=1001')) return new Response(JSON.stringify(FIX), {status:200});
  return new Response(JSON.stringify(FIX), {status:200, headers:{'x-ratelimit-requests-remaining':'90'}});
};
const mod = (await import(pathToFileURL('/home/user/cornerpro/cornerpro-proxy.mjs').href)).default;
const env = { APIFOOTBALL_KEY:SECRET, ALLOWED_ORIGINS:'https://meuapp.com' };
const go = (p) => mod.fetch(new Request('https://w.test'+p,{headers:{Origin:'https://meuapp.com','CF-Connecting-IP':'1.1.1.1'}}), env, { waitUntil(){} });
const R = {};

let r = await go('/health'); const hb = await r.json();
R.health = { status:r.status, version:hb.version, routes:hb.routes.length, leaks:hb.service.includes(SECRET) };

calls.length = 0;
r = await go('/derive/board?days=1'); const board = await r.json();
R.board = { status:r.status, upstreamCalls:calls.length, count:board.count, live:board.live, totalCorners:board.totalCorners,
  first:{ id:board.matches[0].id, status:board.matches[0].status, minute:board.matches[0].minute, time:board.matches[0].time,
          home:board.matches[0].home, away:board.matches[0].away, corners:board.matches[0].stats.corners,
          per:board.matches[0].stats.cornersPeriod.home, est:board.matches[0].est },
  second:{ status:board.matches[1].status, corners:board.matches[1].stats.corners, shots:board.matches[1].stats.shots },
  rankingTop:board.ranking[0], quota:board.quota, cache:r.headers.get('X-Proxy-Cache'), quotaHeader:r.headers.get('X-Quota-Remaining'),
  leaks:JSON.stringify(board).includes(SECRET) };

calls.length = 0;
r = await go('/derive/match?id=1001'); const det = await r.json();
R.match = { status:r.status, upstreamCalls:calls.length, statsReal:det.statsReal, corners:det.stats && det.stats.corners,
  events:det.events.length, ev0:det.events[0], score:det.score, minute:det.minute, leaks:JSON.stringify(det).includes(SECRET) };

calls.length = 0;
r = await go('/derive/h2h?home=33&away=34'); const h2h = await r.json();
R.h2h = { status:r.status, upstreamCalls:calls.length, meetings:h2h.meetings, home:h2h.home, draw:h2h.draw, away:h2h.away,
  last0:h2h.last[0], leaks:JSON.stringify(h2h).includes(SECRET) };

// rota /derive desconhecida deve ser 403 (não é encaminhador aberto)
r = await go('/derive/anything'); R.bogusDerive = { status:r.status };
r = await go('/players?id=1'); R.blocked = { status:r.status };
r = await go('/derive/h2h?home=33'); R.badH2H = { status:r.status, body:(await r.text()).slice(0,60) };
r = await go('/fixtures?live=all'); R.passthrough = { status:r.status, quota:r.headers.get('X-Quota-Remaining') };
r = await mod.fetch(new Request('https://w.test/derive/board',{headers:{Origin:'https://invasor.com'}}), env, {waitUntil(){}});
R.badOrigin = { acao:r.headers.get('access-control-allow-origin') };
r = await go('/derive/board?days=99'); R.daysClamp = { status:r.status, cache:r.headers.get('X-Proxy-Cache') };

console.log(JSON.stringify(R, null, 1));
