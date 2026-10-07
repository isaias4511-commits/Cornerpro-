import { pathToFileURL } from 'url';
const SECRET = 'SUPER-SECRET-KEY-12345';
const UPSTREAM_BODY = JSON.stringify({ response:[{ fixture:{id:9} }], errors:{} });

// --- stubs de ambiente Cloudflare Workers ---
const store = new Map();
globalThis.caches = { default: {
  async match(req){ return store.get(req.url); },
  async put(req, res){ store.set(req.url, res); }
}};
let upstream = [];
globalThis.fetch = async (url, opts) => {
  upstream.push({ url, headers: opts && opts.headers });
  return new Response(UPSTREAM_BODY, { status:200, headers:{ 'content-type':'application/json' } });
};

const mod = (await import(pathToFileURL('/home/user/cornerpro/cornerpro-proxy.mjs').href)).default;
const call = (path, method='GET', origin='https://meuapp.com') =>
  mod.fetch(new Request('https://w.test' + path, { method, headers: origin ? { Origin: origin } : {} }),
            { APIFOOTBALL_KEY: SECRET, ALLOWED_ORIGINS: 'https://meuapp.com' },
            { waitUntil(p){ return p; } });

const R = {};
// 1 health
let r = await call('/health'); R.health = { status:r.status, body: await r.text() };
R.health.leaksKey = R.health.body.includes(SECRET);
// 2 rota fora da lista branca
r = await call('/players?id=1'); R.blocked = { status:r.status, body:(await r.text()).slice(0,80) };
// 3 rota permitida + repasse do segredo
upstream = [];
r = await call('/fixtures?live=all');
const body3 = await r.text();
R.allowed = { status:r.status, acao:r.headers.get('access-control-allow-origin'), cache:r.headers.get('X-Proxy-Cache'),
  upstreamUrl:upstream[0]?.url, upstreamKeySent:upstream[0]?.headers?.['x-apisports-key'], bodyLeaksKey: body3.includes(SECRET) };
// 4 origem nao autorizada
r = await call('/fixtures?live=all', 'GET', 'https://invasor.com'); R.badOrigin = { acao:r.headers.get('access-control-allow-origin') };
// 5 preflight
r = await call('/fixtures?live=all', 'OPTIONS'); R.preflight = { status:r.status, acao:r.headers.get('access-control-allow-origin') };
// 6 cache HIT
r = await call('/fixtures?live=all'); const before = upstream.length;
r = await call('/fixtures?live=all'); R.cacheHit = { header:r.headers.get('X-Proxy-Cache'), extraUpstreamCalls:(upstream.length-before) };
// 7 metodo errado
r = await call('/fixtures', 'POST'); R.badMethod = { status:r.status };
// 8 limite de requisicoes (61 de um IP)
let last; for (let i=0;i<62;i++) last = await call('/fixtures?date=2026-01-01','GET','https://meuapp.com');
r = await mod.fetch(new Request('https://w.test/fixtures?date=2030-01-01',{headers:{Origin:'https://meuapp.com','CF-Connecting-IP':'9.9.9.9'}}),
  { APIFOOTBALL_KEY:SECRET, ALLOWED_ORIGINS:'https://meuapp.com' }, { waitUntil(){} });
let x; for (let i=0;i<61;i++) x = await mod.fetch(new Request('https://w.test/fixtures?date=2030-01-0'+((i%9)+1),{headers:{Origin:'https://meuapp.com','CF-Connecting-IP':'10.0.0.1'}}),
  { APIFOOTBALL_KEY:SECRET, ALLOWED_ORIGINS:'https://meuapp.com' }, { waitUntil(){} });
R.rateLimit = { status:x.status, body:(await x.text()).slice(0,70) };
// 9 sem chave no servidor
upstream = [];
r = await mod.fetch(new Request('https://w.test/fixtures?live=all'), { ALLOWED_ORIGINS:'*' }, { waitUntil(){} });
R.noKey = { status:r.status, upstreamCalls:upstream.length, body:(await r.text()).slice(0,90) };
// 10 nenhuma resposta/health contem o segredo
R.keyNeverInAnyPayload = !JSON.stringify(R).includes(SECRET);
console.log(JSON.stringify(R, null, 1));
