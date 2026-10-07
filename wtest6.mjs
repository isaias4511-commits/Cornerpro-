/* wtest6.mjs — contrato de ?min= : cliente x proxy + chave de cache do proxy.
   Roda com: node wtest6.mjs   (exit 0 = tudo PASS, exit 1 = alguma FAIL)

   A asserção agregada que antes misturava ?days=1 no mesmo grupo está
   reescrita em DUAS dimensões independentes:
     A) MESMOS outros params  + grafias diferentes do MESMO min efetivo -> 1 chave
     B) outros params DIFERENTES                                          -> chaves distintas
   days=1 deixou de ser "ruído" e passou a ser um eixo explícito do teste. */
import fs from 'fs';

let pass = 0, fail = 0;
const ok = (name, cond, got) => {
  if (cond) { pass++; console.log('PASS | ' + name + (got !== undefined ? ' => ' + JSON.stringify(got) : '')); }
  else { fail++; console.log('FAIL | ' + name + ' => ' + JSON.stringify(got)); }
};

/* o proxy é ESM sem package.json; importa via cópia .mjs para o Node tratá-lo como módulo */
const src = fs.readFileSync(new URL('./cornerpro-proxy.js', import.meta.url), 'utf8');
const tmp = '/tmp/cp-proxy-' + process.pid + '.mjs';
fs.writeFileSync(tmp, src);
const { default: prox } = await import(tmp);
const { __minFrom, __cacheKeyFor } = prox;

/* minParse do cliente, lido direto do index.html publicado */
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const clientSrc = /function minParse\(v\)\{[\s\S]*?\n\}/.exec(html)[0];
/* constantes LIDAS do index.html publicado, nao chutadas: se mudarem la, o teste quebra aqui */
const cliLg = Number((/const MIN_LG_SAMPLES = (\d+);/.exec(html) || [0, 8])[1]);
const cliRg = /const MIN_MIN = (\d+), MIN_MAX = (\d+)/.exec(html) || [0, 1, 50];
const CLI_MIN_MIN = Number(cliRg[1]), CLI_MIN_MAX = Number(cliRg[2]), CLI_MIN_DEF = cliLg;
/* minParse depende de MIN_MIN/MIN_MAX/MIN_DEF/MIN_LG_SAMPLES do modulo: injeta o mesmo escopo */
const clientParse = eval('(function(){ var MIN_LG_SAMPLES=' + cliLg + ', MIN_MIN=' + CLI_MIN_MIN +
  ', MIN_MAX=' + CLI_MIN_MAX + ', MIN_DEF=MIN_LG_SAMPLES; return ' + clientSrc + '; })()');

const ORIGIN = 'http://localhost:8080';
const minFromRaw = raw => __minFrom(new URLSearchParams(raw === undefined ? '' : 'min=' + encodeURIComponent(raw)));
const key = (search, min) => __cacheKeyFor('/derive/board', search, min, ORIGIN);

/* monta ?<outros>&min=<cru> preservando os outros params */
const build = (others, raw) => {
  const q = new URLSearchParams((others || '').replace(/^\?/, ''));
  if (raw !== undefined) q.set('min', raw);
  const s = q.toString();
  return s ? '?' + s : '';
};

console.log('== (b) CONTRATO cliente x proxy: valor efetivo por entrada ==');
const inputs = ['1','5','8','50','51','99','250','0','-3','abc','12abc','',' 12 ','0.9','1e3','9999','-0'];
let div = 0;
for (const raw of inputs) {
  const c = clientParse(raw) ?? CLI_MIN_DEF;
  const p = minFromRaw(raw);
  if (c !== p) div++;
  ok(`mesmo efetivo para ${JSON.stringify(raw)}`, c === p, { cliente: c, proxy: p });
}
ok('mesmo efetivo quando o param esta ausente', CLI_MIN_DEF === minFromRaw(undefined), { cliente: CLI_MIN_DEF, proxy: minFromRaw(undefined) });
ok('16+1 entradas sem divergencia cliente x proxy', div === 0, { divergencias: div });

console.log('\n== (c-A) AGRUPADO POR "OUTROS PARAMS": grafias do mesmo min efetivo = 1 chave ==');
const otherGroups = ['', '?days=1', '?days=7', '?days=1&foo=2'];
const sameMinSpellings = [undefined, '0', 'abc', '08'];   // todas -> efetivo 8
const groupKeys = [];
for (const others of otherGroups) {
  const rows = sameMinSpellings.map(raw => {
    const search = build(others, raw);
    const eff = minFromRaw(raw);
    return { search, eff, key: key(search, eff) };
  });
  const distinct = new Set(rows.map(r => r.key));
  const effs = new Set(rows.map(r => r.eff));
  ok(`outros="${others || '(nenhum)'}" · efetivos iguais`, effs.size === 1, { efetivos: [...effs] });
  ok(`outros="${others || '(nenhum)'}" · 4 grafias de min -> 1 unica chave de cache`, distinct.size === 1, { distintas: distinct.size, chave: [...distinct][0] });
  groupKeys.push(rows[0].key);
  rows.forEach(r => console.log('       ' + (r.search || '(sem query)').padEnd(22) + ' efetivo=' + String(r.eff).padEnd(3) + ' key=' + r.key));
}

console.log('\n== (c-B) EIXO DOS OUTROS PARAMS: requisições diferentes = chaves diferentes ==');
ok('4 grupos de outros params -> 4 chaves distintas', new Set(groupKeys).size === 4, { distintas: new Set(groupKeys).size });
const kBase = key('', 8), kDelta = key('?days=1', 8);
for (const others of ['?days=1', '?days=7', '?dys=1', '?days=12']) {
  const other = key(others, 8);
  ok(`outros="${others}" NAO colide com a requisicao sem days`, other !== kBase || others === '', { iguais: other === kBase });
}
ok('days=1 e days=2 ficam separados', key('?days=1', 8) !== key('?days=2', 8));
ok('days=1 e days=3 ficam separados', key('?days=1', 8) !== key('?days=3', 8));
ok('dias ausente e days=3 ficam separados', kBase !== key('?days=3', 8));

console.log('\n== (c-C) COERENCIA CRUZADA: efetivo diferente = chave diferente; efetivo igual = chave igual ==');
ok('min=5 e min=20 (efetivos diferentes) nao compartilham chave', key('?min=5', 5) !== key('?min=20', 20));
ok('min=51 e min=99 (ambos -> 50) compartilham chave', key('?min=51', 50) === key('?min=99', 50));
ok('ausente e min=8 (ambos -> 8) compartilham chave', key('', 8) === key('?min=8', 8));
ok('days=1&min=0 e days=1&min=abc compartilham chave', key('?days=1&min=0', 8) === key('?days=1&min=abc', 8));
ok('days=1&min=0 e days=2&min=0 NAO compartilham chave', key('?days=1&min=0', 8) !== key('?days=2&min=0', 8));

console.log('\n== (c-D) HIGIENE DA CHAVE: nenhum "min=" cru sobrevive, outros params permanecem ==');
const allKeys = otherGroups.flatMap(o => sameMinSpellings.map(r => key(build(o, r), minFromRaw(r))));
ok('nenhuma chave contem "min="', allKeys.every(k => !k.includes('min=')), { total: allKeys.length });
ok('toda chave carrega o efetivo como #m=<n>', allKeys.every(k => /#m=\d+&o=/.test(k)));
ok('toda chave preserva a origem', allKeys.every(k => k.endsWith('&o=' + ORIGIN)));
const kMix = key('?days=1&foo=2&min=99', 50);
ok('parametros alheios preservados (days=1, foo=2)', kMix.includes('days=1') && kMix.includes('foo=2'), { chave: kMix });
ok('o min cru de ?min=99 foi removido da chave', !kMix.includes('min=99'), { chave: kMix });

console.log('\n== CONTROLE NEGATIVO: a assercao agregada tem dentes? (formula ANTIGA deve acusar) ==');
const oldKey = (search, min) => 'https://proxy.internal/derive/board' + search + '#m=' + min + '&o=' + ORIGIN;
const oldDistinct = new Set(sameMinSpellings.map(r => oldKey(build('?days=1', r), minFromRaw(r))));
ok('com a formula ANTIGA, as 4 grafias de min gerariam >1 chave (bug reproduzido)', oldDistinct.size > 1, { distintas: oldDistinct.size });
ok('com a formula NOVA, as mesmas 4 grafias geram 1 chave', new Set(sameMinSpellings.map(r => key(build('?days=1', r), minFromRaw(r)))).size === 1);

console.log('\nRESUMO | pass=' + pass + ' | fail=' + fail);
fs.unlinkSync(tmp);
process.exit(fail ? 1 : 0);
