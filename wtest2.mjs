import { pathToFileURL } from 'url';
globalThis.caches = { default: { async match(){ return undefined; }, async put(){} } };
let upstream = [];
globalThis.fetch = async (u,o) => { upstream.push(u); return new Response('{"response":[]}',{status:200}); };
const mod = (await import(pathToFileURL('/home/user/cornerpro/cornerpro-proxy.mjs').href)).default;

// (A) proxy SEM chave, IP novo, rota valida -> deve ser 503 e NAO chamar a API
let r = await mod.fetch(new Request('https://w.test/fixtures?live=all',{headers:{Origin:'https://meuapp.com','CF-Connecting-IP':'7.7.7.7'}}),
  { ALLOWED_ORIGINS:'https://meuapp.com' }, { waitUntil(){} });
const A = { status:r.status, upstreamCalls:upstream.length, body:(await r.text()).slice(0,110) };

// (B) IP novo + chave presente -> 200
upstream = [];
r = await mod.fetch(new Request('https://w.test/fixtures?live=all',{headers:{Origin:'https://meuapp.com','CF-Connecting-IP':'8.8.8.8'}}),
  { APIFOOTBALL_KEY:'K', ALLOWED_ORIGINS:'https://meuapp.com' }, { waitUntil(){} });
const B = { status:r.status, upstreamCalls:upstream.length };

// (C) origens multiplas configuradas
r = await mod.fetch(new Request('https://w.test/health',{headers:{Origin:'http://localhost:8000'}}),
  { APIFOOTBALL_KEY:'K', ALLOWED_ORIGINS:'https://meuapp.com, http://localhost:8000' }, { waitUntil(){} });
const C = { status:r.status, acao:r.headers.get('access-control-allow-origin') };

// (D) curinga curinga literal 'null' (arquivo local) permitido quando listado
r = await mod.fetch(new Request('https://w.test/health',{headers:{Origin:'null'}}),
  { APIFOOTBALL_KEY:'K', ALLOWED_ORIGINS:'null' }, { waitUntil(){} });
const D = { status:r.status, acao:r.headers.get('access-control-allow-origin') };

console.log(JSON.stringify({A,B,C,D},null,1));
