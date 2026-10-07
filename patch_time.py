# -*- coding: utf-8 -*-
"""Adiciona a visao 'Por time' (linha de saldo acumulado por equipe) ao cartao de saldo."""
import io, re, sys, os, shutil

os.chdir('/home/user/cornerpro')

def rd(p):
    return io.open(p, encoding='utf-8').read()

def wr(p, t):
    io.open(p, 'w', encoding='utf-8', newline='\n').write(t)

def rep(s, old, new, tag):
    n = s.count(old)
    if n != 1:
        print('ANCORA FALHOU:', tag, '| ocorrencias =', n)
        print(repr(old[:140]))
        sys.exit(2)
    print('ok ancora:', tag)
    return s.replace(old, new, 1)

s = rd('index.html')
shutil.copyfile('index.html', 'index.html.bak6')
shutil.copyfile('t8.js', 't8.js.bak6')

# ---------- 1) CSS do seletor de visao ----------
s = rep(s,
  "  .bars{display:block;width:100%;margin-top:10px}",
  "  .bars{display:block;width:100%;margin-top:10px}\n  #saldoView{margin-bottom:6px}",
  'css #saldoView')

# ---------- 2) titulo do cartao com span id ----------
s = rep(s,
  '<div class="secttl" style="margin-top:14px">Saldo acumulado por tempo por liga<button class="icobtn sm csvbtn" id="exportSaldoCsv"',
  '<div class="secttl" style="margin-top:14px"><span id="saldoTitle">Saldo acumulado por tempo por liga</span><button class="icobtn sm csvbtn" id="exportSaldoCsv"',
  'titulo com span')

# ---------- 3) seletor Por liga / Por time ----------
s = rep(s,
'''        <div class="seg sm" id="saldoMetric">
          <button class="on" data-sm="sum">Saldo somado</button>''',
'''        <div class="seg sm" id="saldoView">
          <button class="on" data-sv="league">Por liga</button>
          <button data-sv="team">Por time</button>
        </div>
        <div class="seg sm" id="saldoMetric">
          <button class="on" data-sm="sum">Saldo somado</button>''',
  'seg saldoView')

# ---------- 4) CSV do grafico passa a respeitar a visao ----------
s = rep(s,
  "  const csv = saldoLeagueCsv();",
  "  const csv = saldoRowsCsv();",
  'export usa saldoRowsCsv')
s = rep(s,
  "  const fname = 'saldo-por-liga-' + dayOffset(0) + '.csv';",
  "  const fname = 'saldo-por-' + (saldoViewMode() === 'team' ? 'time' : 'liga') + '-' + dayOffset(0) + '.csv';",
  'nome do arquivo por visao')
s, n = re.subn(r"toast\('Nenhuma liga[^']*'\)",
  lambda m: "toast('Nenhuma ' + (saldoViewMode() === 'team' ? 'time' : 'liga') + ' com divis\\u00e3o por per\\u00edodo para exportar')",
  s)
print('ok toast por visao:', n)
if n != 1:
    sys.exit(3)

# ---------- 5) clique no seletor ----------
s = rep(s,
  "  if (t.closest('#exportSaldoCsv')){ exportSaldoCsv(); return; }",
  "  if (t.closest('#exportSaldoCsv')){ exportSaldoCsv(); return; }\n"
  "  const svb = t.closest('#saldoView button');\n"
  "  if (svb){ state.saldoView = svb.getAttribute('data-sv') || 'league'; renderSaldoChart(); return; }",
  'clique saldoView')

# ---------- 6) aviso de vazio por visao ----------
s, n = re.subn(r"empty\.textContent = '[^']*';",
  lambda m: ("empty.textContent = 'Sem jogos com divis\\u00e3o por per\\u00edodo nas ' + "
             "(saldoViewMode() === 'team' ? 'equipes' : 'ligas') + ' vis\\u00edveis \\u2014 a linha aparece quando houver dado.';"),
  s)
print('ok aviso de vazio por visao:', n)
if n != 1:
    sys.exit(4)

# ---------- 7) funcoes novas (time + despacho) ----------
TEAM_JS = r'''const SALDO_MAX_LINES = 6;
function saldoViewMode(){ return state.saldoView === 'team' ? 'team' : 'league'; }
/* uma linha por TIME: escanteios do proprio time menos os que ele sofreu */
function saldoTeamRows(){
  const arr = (typeof filtered === 'function') ? (filtered() || []) : [];
  const byAvg = (state.saldoMetric === 'avg');
  const g = {};
  const slot = (name, league) => {
    let r = g[name];
    if (!r){ r = g[name] = { name:name, leagues:{}, games:0, withP:0, pro:[0,0,0,0], con:[0,0,0,0] }; }
    if (league) r.leagues[league] = 1;
    return r;
  };
  arr.forEach(m => {
    const hn = m.home && m.home.name, an = m.away && m.away.name;
    if (hn) slot(hn, m.leagueName).games++;
    if (an) slot(an, m.leagueName).games++;
    const b = periodBuckets(m);
    if (!b) return;
    if (hn){ const r = g[hn]; r.withP++; [0,1,2,3].forEach(i => { r.pro[i] += b.h[i]; r.con[i] += b.a[i]; }); }
    if (an){ const r = g[an]; r.withP++; [0,1,2,3].forEach(i => { r.pro[i] += b.a[i]; r.con[i] += b.h[i]; }); }
  });
  const rows = [];
  Object.keys(g).forEach(name => {
    const r = g[name];
    if (!r.withP) return;
    const n = r.withP;
    const P = byAvg ? r.pro.map(v => v / n) : r.pro.slice();
    const C = byAvg ? r.con.map(v => v / n) : r.con.slice();
    const net = [0,1,2,3].map(i => round1(P[i] - C[i]));
    const cum = [0]; net.forEach(v => cum.push(round1(cum[cum.length - 1] + v)));
    rows.push({ name:name, games:r.games, withP:n, leagues:Object.keys(r.leagues),
      proP:P, conC:C, net:net, cum:cum, v1:cum[3], v2:round1(cum[4] - cum[3]) });
  });
  rows.sort((a, b) => b.cum[4] - a.cum[4]);
  rows.forEach((r, i) => { r.color = SALDO_COLORS[i % SALDO_COLORS.length]; r.order = i + 1; });
  return rows;
}
function saldoRows(){ return saldoViewMode() === 'team' ? saldoTeamRows() : saldoLeagueRows(); }
function saldoTeamCsv(){
  const rows = saldoTeamRows();
  if (!rows.length) return null;
  const sfx = (state.saldoMetric === 'avg') ? ' (m\u00e9dia/jogo)' : '';
  const head = ['Time', "Acum. 15'" + sfx, "Acum. 30'" + sfx, "Acum. 45' (intervalo)" + sfx,
    "Acum. 60'+ (saldo final)" + sfx, "Varia\u00e7\u00e3o 1\u00ba tempo" + sfx, "Varia\u00e7\u00e3o 2\u00ba tempo" + sfx,
    'Jogos com per\u00edodo', 'Jogos do time', 'Ordem no gr\u00e1fico'];
  const lines = [head.map(csvCell).join(';')];
  rows.forEach(r => lines.push([r.name,
    saldoCell(r.cum[1]), saldoCell(r.cum[2]), saldoCell(r.cum[3]), saldoCell(r.cum[4]),
    saldoCell(r.cum[3]), saldoCell(round1(r.cum[4] - r.cum[3])),
    r.withP + '/' + r.games, String(r.games), String(r.order)].map(csvCell).join(';')));
  const T = (i) => rows.reduce((x, r) => x + r.cum[i], 0);
  const Tp = rows.reduce((x, r) => x + r.withP, 0), Tg = rows.reduce((x, r) => x + r.games, 0);
  lines.push(['\u03a3 Times', saldoCell(round1(T(1))), saldoCell(round1(T(2))), saldoCell(round1(T(3))),
    saldoCell(round1(T(4))), saldoCell(round1(T(3))), saldoCell(round1(T(4) - T(3))),
    Tp + '/' + Tg, String(Tg), ''].map(csvCell).join(';'));
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}
function saldoRowsCsv(){ return saldoViewMode() === 'team' ? saldoTeamCsv() : saldoLeagueCsv(); }
'''
s = rep(s,
  "function saldoMetricLabel(){ return state.saldoMetric === 'avg' ? 'média por jogo' : 'saldo somado'; }",
  TEAM_JS + "function saldoMetricLabel(){ return state.saldoMetric === 'avg' ? 'média por jogo' : 'saldo somado'; }",
  'funcoes por time')

# ---------- 8) drawSaldoChart: usa a visao e limita linhas ----------
s = rep(s,
'''function drawSaldoChart(){
  const cv = $('#saldoChart'), empty = $('#saldoChartEmpty'), cap = $('#saldoCap');
  if (!cv) return;
  const rows = saldoLeagueRows();''',
'''function drawSaldoChart(){
  const cv = $('#saldoChart'), empty = $('#saldoChartEmpty'), cap = $('#saldoCap');
  if (!cv) return;
  const all = saldoRows();
  const rows = all.slice(0, SALDO_MAX_LINES);''',
  'drawSaldoChart usa a visao')
s = rep(s,
  "  if (cap) cap.textContent = saldoChartNote(rows);",
  "  if (cap) cap.textContent = saldoChartNote(rows, all.length);",
  'rodape recebe o total')

# ---------- 9) rodape (saldoChartNote) reescrito ----------
NOTE_NEW = r'''function saldoChartNote(rows, total){
  const base = rows.reduce((x, r) => x + r.withP, 0);
  const byAvg = (state.saldoMetric === 'avg');
  const team = (saldoViewMode() === 'team');
  const head = team
    ? 'Linha = saldo acumulado por TIME (escanteios do time \u2212 os sofridos) ponto a ponto nas quatro faixas de tempo '
    : 'Linha = saldo acumulado (escanteios do mandante \u2212 do visitante) ponto a ponto nas quatro faixas de tempo ';
  const tail = team
    ? 'vis\u00e3o por time: cada escanteio vale +1 para quem bate e \u22121 para quem sofre, ent\u00e3o numa mesma liga a soma dos times \u00e9 0 por constru\u00e7\u00e3o'
    : 'linha acima do zero = mandante na frente no acumulado, abaixo = visitante na frente';
  const shown = (total != null && total > rows.length)
    ? 'gr\u00e1fico mostra os ' + rows.length + ' times de maior saldo final (de ' + total + ' com per\u00edodo) \u00b7 ' : '';
  return head + '(0-15, 16-30, 31-45, 46-60) \u00b7 a linha tracejada marca o intervalo e a 4\u00aa faixa fecha o 2\u00ba tempo registrado \u00b7 ' +
    (byAvg ? 'em m\u00e9dia por jogo' : 'somado') + ' \u00b7 base ' + base + ' jogo(s) em ' + rows.length +
    (team ? ' time(s)' : ' liga(s)') + ' \u00b7 ' + shown + tail;
}
'''
i = s.index('function saldoChartNote(rows){')
j = s.index('\n}\n', i) + 3
print('rodape antigo:', j - i, 'chars')
s = s[:i] + NOTE_NEW + s[j:]

# ---------- 10) renderSaldoChart reescrito (seletor + titulo + legenda) ----------
REN_NEW = r'''function renderSaldoChart(){
  const seg = $('#saldoMetric');
  if (seg) Array.from(seg.querySelectorAll('button')).forEach(b => b.classList.toggle('on', b.getAttribute('data-sm') === state.saldoMetric));
  const vs = $('#saldoView');
  if (vs) Array.from(vs.querySelectorAll('button')).forEach(b => b.classList.toggle('on', b.getAttribute('data-sv') === saldoViewMode()));
  const ttl = $('#saldoTitle');
  if (ttl) ttl.textContent = 'Saldo acumulado por tempo ' + (saldoViewMode() === 'team' ? 'por time' : 'por liga');
  const lg = $('#saldoLegend');
  if (lg){
    const all = saldoRows();
    const rows = all.slice(0, SALDO_MAX_LINES);
    const unit = (saldoViewMode() === 'team') ? 'time(s)' : 'liga(s)';
    lg.innerHTML = rows.length
      ? rows.map(r => '<span><i style="background:' + r.color + '"></i>' + r.name + ' \u00b7 saldo final ' + saldoFmt(r.cum[r.cum.length - 1]) + '</span>').join('')
        + (all.length > rows.length ? '<span style="color:var(--mut2)">+ ' + (all.length - rows.length) + ' ' + unit + ' fora do gr\u00e1fico</span>' : '')
      : '<span style="color:var(--mut2)">sem ' + (saldoViewMode() === 'team' ? 'times' : 'ligas') + ' com divis\u00e3o por per\u00edodo na vis\u00e3o atual</span>';
  }
  try { drawSaldoChart(); } catch(e){ /* canvas indispon\u00edvel: o resto do app segue */ }
}
'''
i = s.index('function renderSaldoChart(){')
j = s.index('\n}\n', i) + 3
print('render antigo:', j - i, 'chars')
s = s[:i] + REN_NEW + s[j:]

wr('index.html', s)

# ---------- 11) extracao do JS do cliente para checagem ----------
blocks = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', s, re.S)
wr('app.js', '\n;\n'.join(blocks))
print('blocos de script extraidos:', len(blocks))

# ---------- 12) testes novos no harness ----------
t = rd('t8.js')
anchor = "  t('grafico/acum: volta ao estado normal (1 liga)', ev(\"saldoLeagueRows()\").length, 1);"
if t.count(anchor) != 1:
    print('ANCORA FALHOU: harness | ocorrencias =', t.count(anchor))
    sys.exit(5)

BLOCK = r'''
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
    t('grafico/time: pro dos times = 2x os escanteios das partidas',
      ev("(function(){var t=saldoTeamRows().reduce(function(x,r){return x+r.proP.reduce(function(a,b){return a+b},0)},0);var m=filtered().map(periodBuckets).filter(Boolean).reduce(function(x,b){return x+b.h.reduce(function(a,c){return a+c},0)+b.a.reduce(function(a,c){return a+c},0)},0);return Math.abs(t-2*m)<1e-9})()"), true);
    t('grafico/time: faixa a faixa o pro confere com as partidas',
      ev("(function(){var ok=true;for(var i=0;i<4;i++){var t=saldoTeamRows().reduce(function(x,r){return x+r.proP[i]},0);var m=filtered().map(periodBuckets).filter(Boolean).reduce(function(x,b){return x+b.h[i]+b.a[i]},0);ok=ok&&Math.abs(t-2*m)<1e-9}return ok})()"), true);
    t('grafico/time: time so entra com periodo', ev("saldoTeamRows().every(function(r){return r.withP>0})"), true);
    try { require('fs').writeFileSync('saldo-por-time-exemplo.csv', ev("saldoTeamCsv()"), 'utf8'); console.log('arquivo saldo-por-time-exemplo.csv gravado pelo app'); } catch(e){ console.log('nao gravou o CSV de times:', e.message); }
    calls.arc = 0; calls.lineTo = 0; calls.fillRect = 0; calls.strokeRect = 0; calls.fillText = 0;
    ev("drawSaldoChart(); true");
    t('grafico/time: nenhuma barra desenhada', [calls.fillRect, calls.strokeRect].join('/'), '0/0');
    t('grafico/time: um ponto por marco e por linha', calls.arc, Math.min(6, tExp) * 5);
    const tGeom = JSON.parse(ev("$('#saldoChart').getAttribute('data-geom')"));
    t('grafico/time: geometria de 5 pontos por linha', [tGeom.groups, tGeom.points].join('/'), Math.min(6, tExp) + '/5');
    t('grafico/time: legenda lista os times do grafico', ev("$$('.saldo-legend span').length"), Math.min(6, tExp) + (tExp > 6 ? 1 : 0));
    t('grafico/time: titulo do cartao muda para por time', ev("$('#saldoTitle').textContent").indexOf('por time') > 0, true);
    t('grafico/time: rodape explica o calculo por time', ev("$('#saldoCap').textContent").indexOf('saldo acumulado por TIME') >= 0, true);
    t('grafico/time: rodape avisa que a soma dos times e zero', ev("$('#saldoCap').textContent").indexOf('0 por constru') > 0, true);
    const tCsv = parseCsv(ev("saldoTeamCsv()"));
    t('grafico/time: CSV de times comeca pelo Time', tCsv[0][0], 'Time');
    t('grafico/time: CSV de times com 10 colunas', tCsv[0].length, 10);
    t('grafico/time: todas as linhas com 10 celulas', tCsv.every(r => r.length === 10), true);
    t('grafico/time: linhas = times + total', tCsv.length, tRows.length + 1);
    t('grafico/time: rodape do CSV fecha em zero', String(Math.round(tCsv.filter(r => r[0] === '\u03a3 Times').reduce((x, r) => x + num(r[4]), 0))), '0');
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
'''
t = t.replace(anchor, anchor + BLOCK, 1)
wr('t8.js', t)
print('harness atualizado')
print('FIM DO PATCH')
