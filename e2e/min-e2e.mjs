#!/usr/bin/env node
/* e2e/min-e2e.mjs — matriz de ?min= em Chromium headless.
   Servidor estatico proprio + provider 'demo' => NAO usa proxy, NAO usa APIFOOTBALL_KEY e
   NAO depende de internet. So afirma o que e estavel (URL final, cfgMin persistido, linhas
   renderizadas > 0 e ausencia de erro de JS) — os totais do modo demo variam entre cargas. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG = path.join(ROOT, 'e2e', 'min-e2e.log');
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.mjs':'text/javascript',
  '.css':'text/css', '.csv':'text/csv', '.png':'image/png', '.json':'application/json', '.ico':'image/x-icon' };

const lines = [];
const log = s => { lines.push(s); console.log(s); };
let pass = 0, fail = 0;
const ok = (name, cond, got) => {
  if (cond) { pass++; log('PASS | ' + name + (got !== undefined ? ' => ' + JSON.stringify(got) : '')); }
  else { fail++; log('FAIL | ' + name + ' => ' + JSON.stringify(got)); }
};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:' + server.address().port + '/index.html';

const SNAP = () => {
  const list = document.querySelector('#list');
  let cfg = null; try { cfg = JSON.parse(localStorage.getItem('cp_cfg_v2') || '{}'); } catch (e) {}
  return {
    path: location.pathname + location.search,
    rows: list ? list.children.length : null,
    cfgMin: (cfg && ('minSamples' in cfg)) ? cfg.minSamples : '<ausente>'
  };
};

const cases = [
  { label: 'sem ?min=',   url: BASE,            expUrl: '/index.html',        expCfg: '<ausente>' },
  { label: '?min=5',      url: BASE + '?min=5', expUrl: '/index.html?min=5',  expCfg: 5 },
  { label: '?min=20',     url: BASE + '?min=20',expUrl: '/index.html?min=20', expCfg: 20 },
  { label: '?min=abc',    url: BASE + '?min=abc', expUrl: '/index.html',      expCfg: '<ausente>' },
  { label: '?min=0',      url: BASE + '?min=0', expUrl: '/index.html',        expCfg: '<ausente>' },
  { label: '?min=99',     url: BASE + '?min=99',expUrl: '/index.html?min=50', expCfg: 50 },
  { label: '?min=51',     url: BASE + '?min=51',expUrl: '/index.html?min=50', expCfg: 50 }
];

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
log('== e2e: matriz ?min= em Chromium ' + browser.version() + ' — provider demo, sem rede ==');
const results = [];
for (const c of cases) {
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => localStorage.setItem('cp_cfg_v2', JSON.stringify({ provider: 'demo', tsdb: '3' })));
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 90)));
  await page.goto(c.url, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const s = await page.evaluate(SNAP);
  const good = s.path === c.expUrl && String(s.cfgMin) === String(c.expCfg) && s.rows >= 1 && errs.length === 0;
  results.push(good);
  ok(c.label + ': url=' + s.path + ' cfgMin=' + s.cfgMin + ' linhas=' + s.rows + ' errosJS=' + errs.length, good,
     { esperado: { url: c.expUrl, cfgMin: c.expCfg }, obtido: { url: s.path, cfgMin: s.cfgMin, rows: s.rows }, pageerrors: errs });
  await ctx.close();
}

log('');
log('== e2e: fluxo do configurador (com reload real) ==');
{
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => localStorage.setItem('cp_cfg_v2', JSON.stringify({ provider: 'demo', tsdb: '3' })));
  const page = await ctx.newPage();
  const read = () => page.evaluate(SNAP);
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(2500);
  ok('fluxo: abertura sem param', (await read()).path === '/index.html');
  await page.click('#openCfg'); await page.fill('#cfgMin', '35'); await page.click('#saveCfg'); await page.waitForTimeout(1500);
  let s = await read(); ok('fluxo: salvar 35 reescreve a URL e persiste', s.path === '/index.html?min=35' && String(s.cfgMin) === '35', s);
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1800);
  s = await read(); ok('fluxo: reload mantem 35', s.path === '/index.html?min=35' && String(s.cfgMin) === '35', s);
  await page.click('#openCfg'); await page.fill('#cfgMin', '99'); await page.click('#saveCfg'); await page.waitForTimeout(1500);
  s = await read(); ok('fluxo: salvar 99 aplica o teto 50', s.path === '/index.html?min=50' && String(s.cfgMin) === '50', s);
  await page.click('#openCfg'); await page.fill('#cfgMin', '8'); await page.click('#saveCfg'); await page.waitForTimeout(1500);
  s = await read(); ok('fluxo: reset para 8 remove o param', s.path === '/index.html', s);
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1800);
  s = await read(); ok('fluxo: reload apos reset segue sem param', s.path === '/index.html' && String(s.cfgMin) === '<ausente>', s);
  await ctx.close();
}

await browser.close();
server.close();
log('');
log('RESUMO | pass=' + pass + ' | fail=' + fail + ' | casos=' + cases.length);
try { fs.writeFileSync(LOG, lines.join('\n') + '\n'); } catch (e) {}
process.exit(fail ? 1 : 0);
