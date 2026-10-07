import { pathToFileURL } from 'url';
globalThis.caches = { default: { async match(){ return undefined; }, async put(){} } };
const SECRET='S3CRET-KEY';
const fx = (id,date,st,hid,hn,aid,an,gh,ga) => ({ fixture:{id,date,status:{short:st}}, league:{id:71,name:'Serie A',flag:'🇮🇹'},
  teams:{home:{id:hid,name:hn,logo:''},away:{id:aid,name:an,logo:''}}, goals:{home:gh,away:ga} });
const byDate = {
  '2026-09-17':[ fx(501,'2026-09-17T20:00:00+00:00','FT',33,'Flamengo',34,'Palmeiras',3,1) ],
  '2026-09-19':[ fx(502,'2026-09-19T20:00:00+00:00','FT',35,'Grêmio',33,'Flamengo',0,2) ],
  '2026-09-21':[ fx(503,'2026-09-21T20:00:00+00:00','FT',33,'Flamengo',35,'Grêmio',1,1),
                 fx(504,'2026-09-21T22:00:00+00:00','NS',34,'Palmeiras',35,'Grêmio',null,null) ]
};
globalThis.fetch = async (u) => { const m=String(u).match(/date=([\d-]+)/); const arr=(m&&byDate[m[1]])||[];
  return new Response(JSON.stringify({response:arr}),{status:200,headers:{'x-ratelimit-requests-remaining':'70'}}); };
const mod = (await import(pathToFileURL('/home/user/cornerpro/cornerpro-proxy.mjs').href)).default;
const env = { APIFOOTBALL_KEY:SECRET, ALLOWED_ORIGINS:'https://meuapp.com' };
const r = await mod.fetch(new Request('https://w.test/derive/teamavg?days=7',{headers:{Origin:'https://meuapp.com','CF-Connecting-IP':'5.5.5.5'}}), env, {waitUntil(){}});
const d = await r.json();
const R = { status:r.status, days:d.days, labels:d.labels, labelsLen:d.labels.length, sampled:d.sampled,
  teams:d.teams.length, series:d.series.length, seriesTeams:d.seriesTeams, cache:r.headers.get('X-Proxy-Cache'),
  cacheControl:r.headers.get('cache-control'), leaks:JSON.stringify(d).includes(SECRET),
  series:[], consistency:[] };
d.series.forEach(s => { const pts = s.points.map(p => p ? p.n : null);
  R.series.push({ abbr:s.abbr, n:pts, cf:s.points.map(p=>p?p.cf:null), nullsAtZeroN: s.points.every(p => (p===null) === (p===null)) });
});
R.consistency = d.teams.map(t => { const s = d.series.find(x => x.id === t.id); if (!s) return { name:t.name, inSeries:false };
  const last = s.points[s.points.length-1];
  const nMonotone = s.points.every((p,i,a) => i===0 || (p?p.n:0) >= (a[i-1]?a[i-1].n:0));
  const nullIffZero = s.points.every(p => (p === null) || p.n > 0);
  return { name:t.name, games:t.games, lastN:last?last.n:null, lastCf:last?last.cf:null, cornersFor:t.cornersFor,
    lastGf:last?last.gf:null, goalsFor:t.goalsFor, nMonotone, nullIffZero,
    ok: !!last && last.n===t.games && last.cf===t.cornersFor && last.gf===t.goalsFor && nMonotone && nullIffZero }; });
R.allConsistent = R.consistency.every(x => x.ok);
R.seriesFollowsRanking = d.series.map(s => s.abbr).join(',');
console.log(JSON.stringify(R,null,1));
