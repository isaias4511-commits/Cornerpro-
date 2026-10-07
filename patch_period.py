# -*- coding: utf-8 -*-
"""Filtro de tempo (Ambos / 1o tempo / 2o tempo) no cartao de saldo acumulado.
Incrementa index.html e t8.js; a base de dados segue a MESMA (periodBuckets -> faixas)."""
import io, re, sys, os, shutil

os.chdir('/home/user/cornerpro')
def rd(p): return io.open(p, encoding='utf-8').read()
def wr(p, t): io.open(p, 'w', encoding='utf-8', newline='\n').write(t)
def rep(s, old, new, tag):
    n = s.count(old)
    if n != 1:
        print('ANCORA FALHOU:', tag, '| ocorrencias =', n); print(repr(old[:160])); sys.exit(2)
    print('ok:', tag); return s.replace(old, new, 1)
def reple(s, start, new, tag):
    """troca a funcao inteira a partir do cabecalho 'start' ate o primeiro '\\n}\\n'"""
    i = s.index(start); j = s.index('\n}\n', i) + 3
    print('ok func:', tag, (j - i), 'chars'); return s[:i] + new + s[j:]

s = rd('index.html'); shutil.copyfile('index.html', 'index.html.bak8')
shutil.copyfile('t8.js', 't8.js.bak8')

# ---------------- 1) HTML: seletor de tempo ao lado de Por liga / Por time ----------------
s = rep(s,
'''        <div class="seg sm" id="saldoMetric">''',
'''        <div class="seg sm" id="saldoPeriod">
          <button class="on" data-sp="both">Ambos</button>
          <button data-sp="h1">1\u00ba tempo</button>
          <button data-sp="h2">2\u00ba tempo</button>
        </div>
        <div class="seg sm" id="saldoMetric">''',
  'html seg saldoPeriod')

# ---------------- 2) JS: helpers do filtro (depois de periodBuckets) ----------------
SPAN_JS = r'''
/* ---------- Filtro de tempo do cartao de saldo: Ambos / 1o tempo / 2o tempo ----------
   A base e a MESMA do CSV por periodo: periodBuckets() extrai as quatro faixas da fonte
   (0-15, 16-30, 31-45, 46-60) e o filtro apenas recorta as faixas que entram na conta. */
function periodSpan(){ const s = state.saldoPeriod; return s === 'h1' ? 'h1' : (s === 'h2' ? 'h2' : 'both'); }
function spanLabelShort(){ const sp = periodSpan(); return sp === 'h1' ? '1\u00ba tempo' : (sp === 'h2' ? '2\u00ba tempo' : 'os dois tempos'); }
/* indices das faixas na fonte: 1o tempo = 0,1,2 (0-15, 16-30, 31-45) e 2o tempo = 3 (46-60) */
function spanBucketIndexes(){ const sp = periodSpan(); return sp === 'h1' ? [0,1,2] : (sp === 'h2' ? [3] : [0,1,2,3]); }
function spanBuckets(m){
  const b = periodBuckets(m);
  if (!b) return null;
  const ix = spanBucketIndexes();
  return { h:ix.map(i => b.h[i]), a:ix.map(i => b.a[i]), ix:ix };
}
/* rotulos do eixo conforme o filtro; no 2o tempo o eixo e rebaseado para 45'-60'
   (a fonte publica uma unica faixa de 2o tempo, 46-60) e o acumulado reinicia no intervalo */
function spanAxis(){
  const sp = periodSpan();
  if (sp === 'h1') return ["0'", "15'", "30'", "45'"];
  if (sp === 'h2') return ["45'", "60'+"];
  return ["0'", "15'", "30'", "45'", "60'+"];
}
function spanAxisNote(){
  const sp = periodSpan();
  if (sp === 'h1') return "filtro 1\u00ba tempo: eixo 0'-45' com as faixas 0-15, 16-30 e 31-45";
  if (sp === 'h2') return "filtro 2\u00ba tempo: eixo rebaseado 45'-60' (a fonte publica a faixa 46-60) com o acumulado reiniciado no intervalo";
  return "sem filtro: eixo 0'-60'+ com as quatro faixas 0-15, 16-30, 31-45, 46-60";
}
/* colunas do CSV: as de um tempo ficam vazias quando o filtro exclui aquele tempo */
function spanCsvCols(){
  const sp = periodSpan();
  const sfx = (state.saldoMetric === 'avg') ? ' (m\u00e9dia/jogo)' : '';
  if (sp === 'h1') return { sfx:sfx,
    c:["Acum. 15'", "Acum. 30'", "Acum. 45' (fim do 1\u00ba tempo)", "Acum. 60'+ (fora do filtro: 1\u00ba tempo)"],
    v:["Varia\u00e7\u00e3o 1\u00ba tempo", "Varia\u00e7\u00e3o 2\u00ba tempo (fora do filtro)"] };
  if (sp === 'h2') return { sfx:sfx,
    c:["Acum. 15' (fora do filtro: 2\u00ba tempo)", "Acum. 30' (fora do filtro: 2\u00ba tempo)",
       "Acum. 45' (rein\u00edcio do 2\u00ba tempo)", "Acum. 60'+ (saldo final)"],
    v:["Varia\u00e7\u00e3o 1\u00ba tempo (fora do filtro)", "Varia\u00e7\u00e3o 2\u00ba tempo"] };
  return { sfx:sfx,
    c:["Acum. 15'", "Acum. 30'", "Acum. 45' (intervalo)", "Acum. 60'+ (saldo final)"],
    v:["Varia\u00e7\u00e3o 1\u00ba tempo", "Varia\u00e7\u00e3o 2\u00ba tempo"] };
}
function spanCsvCells(r){
  const sp = periodSpan();
  const last = r.cum[r.cum.length - 1];
  if (sp === 'h1') return [saldoCell(r.cum[1]), saldoCell(r.cum[2]), saldoCell(r.cum[3]), '', saldoCell(r.cum[3]), ''];
  if (sp === 'h2') return ['', '', saldoCell(0), saldoCell(last), '', saldoCell(last)];
  return [saldoCell(r.cum[1]), saldoCell(r.cum[2]), saldoCell(r.cum[3]), saldoCell(last), saldoCell(r.cum[3]), saldoCell(round1(last - r.cum[3]))];
}
function spanTotalCum(rows){
  const K = rows[0].cum.length, tot = [0];
  for (let i = 1; i < K; i++) tot.push(round1(rows.reduce((x, r) => x + r.cum[i], 0)));
  return tot;
}
'''
s = rep(s,
'''  return { h:[g(cp.home,0), g(cp.home,1), g(cp.home,2), g(cp.home,3)],
           a:[g(cp.away,0), g(cp.away,1), g(cp.away,2), g(cp.away,3)] };
}''',
'''  return { h:[g(cp.home,0), g(cp.home,1), g(cp.home,2), g(cp.home,3)],
           a:[g(cp.away,0), g(cp.away,1), g(cp.away,2), g(cp.away,3)] };
}
''' + SPAN_JS, 'helpers de periodo')

# ---------------- 3) saldoLeagueRows: faixas do filtro ----------------
s = rep(s,
'''    const bs = g.map(periodBuckets).filter(Boolean);
    if (!bs.length) return;
    const n = bs.length, byAvg = (state.saldoMetric === 'avg');''',
'''    const ix = spanBucketIndexes(), K = ix.length;
    const bs = g.map(spanBuckets).filter(Boolean);
    if (!bs.length) return;
    const n = bs.length, byAvg = (state.saldoMetric === 'avg');''',
  'ligas: faixas do filtro')
s = rep(s,
'''    const bh = [0,1,2,3].map(i => bs.reduce((x, b) => x + b.h[i], 0));
    const ba = [0,1,2,3].map(i => bs.reduce((x, b) => x + b.a[i], 0));''',
'''    const bh = Array.from({length:K}, (_, i) => bs.reduce((x, b) => x + b.h[i], 0));
    const ba = Array.from({length:K}, (_, i) => bs.reduce((x, b) => x + b.a[i], 0));''',
  'ligas: somas por faixa')
s = rep(s,
'    const net = [0,1,2,3].map(i => sh[i] - sa[i]);',
'    const net = Array.from({length:K}, (_, i) => sh[i] - sa[i]);',
  'ligas: net por faixa')
s = rep(s,
'    const H1 = bh[0] + bh[1] + bh[2], A1 = ba[0] + ba[1] + ba[2], H2 = bh[3], A2 = ba[3];',
'''    /* o 1o tempo soma as faixas 0..2 e o 2o tempo a faixa 3, dando no mesmo com filtro */
    const H1 = ix.reduce((x, bi, k) => x + (bi < 3 ? bh[k] : 0), 0);
    const A1 = ix.reduce((x, bi, k) => x + (bi < 3 ? ba[k] : 0), 0);
    const H2 = ix.reduce((x, bi, k) => x + (bi === 3 ? bh[k] : 0), 0);
    const A2 = ix.reduce((x, bi, k) => x + (bi === 3 ? ba[k] : 0), 0);''',
  'ligas: tempos por indice')

# ---------------- 4) saldoTeamRows: faixas do filtro ----------------
s = rep(s,
'    if (!r){ r = g[name] = { name:name, leagues:{}, games:0, withP:0, pro:[0,0,0,0], con:[0,0,0,0] }; }',
'''    const K = spanBucketIndexes().length;
    if (!r){ r = g[name] = { name:name, leagues:{}, games:0, withP:0, pro:new Array(K).fill(0), con:new Array(K).fill(0) }; }''',
  'times: vetores do tamanho do filtro')
s = rep(s,
'''    const b = periodBuckets(m);
    if (!b) return;
    if (hn){ const r = g[hn]; r.withP++; [0,1,2,3].forEach(i => { r.pro[i] += b.h[i]; r.con[i] += b.a[i]; }); }
    if (an){ const r = g[an]; r.withP++; [0,1,2,3].forEach(i => { r.pro[i] += b.a[i]; r.con[i] += b.h[i]; }); }''',
'''    const b = spanBuckets(m);
    if (!b) return;
    const K2 = b.h.length;
    if (hn){ const r = g[hn]; r.withP++; for (let i = 0; i < K2; i++){ r.pro[i] += b.h[i]; r.con[i] += b.a[i]; } }
    if (an){ const r = g[an]; r.withP++; for (let i = 0; i < K2; i++){ r.pro[i] += b.a[i]; r.con[i] += b.h[i]; } }''',
  'times: acumulo por faixa do filtro')
s = rep(s,
'''    const net = [0,1,2,3].map(i => round1(P[i] - C[i]));
    const cum = [0]; net.forEach(v => cum.push(round1(cum[cum.length - 1] + v)));
    rows.push({ name:name, games:r.games, withP:n, leagues:Object.keys(r.leagues),
      proP:P, conC:C, net:net, cum:cum, v1:cum[3], v2:round1(cum[4] - cum[3]) });''',
'''    const net = P.map((v, i) => round1(v - C[i]));
    const cum = [0]; net.forEach(v => cum.push(round1(cum[cum.length - 1] + v)));
    const sp = periodSpan();
    const half1 = (sp === 'h1' || sp === 'both') ? cum[3] : 0;
    const half2 = (sp === 'h2') ? round1(cum[cum.length - 1]) : (cum.length >= 5 ? round1(cum[4] - cum[3]) : 0);
    rows.push({ name:name, games:r.games, withP:n, leagues:Object.keys(r.leagues),
      proP:P, conC:C, net:net, cum:cum, v1:half1, v2:half2 });''',
  'times: acumulado do filtro')
s = rep(s,
"  rows.sort((a, b) => b.cum[4] - a.cum[4]);\n  rows.forEach((r, i) => { r.color = SALDO_COLORS[i % SALDO_COLORS.length]; r.order = i + 1; });\n  return rows;\n}\nfunction saldoRows(){",
"  rows.sort((a, b) => b.cum[b.cum.length - 1] - a.cum[a.cum.length - 1]);\n  rows.forEach((r, i) => { r.color = SALDO_COLORS[i % SALDO_COLORS.length]; r.order = i + 1; });\n  return rows;\n}\nfunction saldoRows(){",
  'times: ordena pelo fim da linha')

# ---------------- 4b) ordenacao: o eixo muda de tamanho, entao ordena pelo ultimo ponto ----------------
s = rep(s,
'  rows.sort((a, b) => b.cum[4] - a.cum[4]);',
'  rows.sort((a, b) => b.cum[b.cum.length - 1] - a.cum[a.cum.length - 1]);',
  'ligas: ordena pelo fim da linha')

# ---------------- 5) CSV por time ----------------
s = reple(s, 'function saldoTeamCsv(){', r'''function saldoTeamCsv(){
  const rows = saldoTeamRows();
  if (!rows.length) return null;
  const C = spanCsvCols();
  const head = ['Time'].concat(C.c.map(x => x + C.sfx)).concat(C.v.map(x => x + C.sfx))
    .concat(['Jogos com per\u00edodo', 'Jogos do time', 'Ordem no gr\u00e1fico']);
  const lines = [head.map(csvCell).join(';')];
  rows.forEach(r => lines.push([r.name].concat(spanCsvCells(r))
    .concat([r.withP + '/' + r.games, String(r.games), String(r.order)]).map(csvCell).join(';')));
  const tot = spanTotalCum(rows);
  const Tp = rows.reduce((x, r) => x + r.withP, 0), Tg = rows.reduce((x, r) => x + r.games, 0);
  lines.push(['\u03a3 Times'].concat(spanCsvCells({ cum:tot }))
    .concat([Tp + '/' + Tg, String(Tg), '']).map(csvCell).join(';'));
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}
''', 'saldoTeamCsv')

# ---------------- 6) CSV por liga ----------------
s = reple(s, 'function saldoLeagueCsv(){', r'''function saldoLeagueCsv(){
  const rows = saldoLeagueRows();
  if (!rows.length) return null;
  const C = spanCsvCols();
  const head = ['Liga'].concat(C.c.map(x => x + C.sfx)).concat(C.v.map(x => x + C.sfx))
    .concat(['Jogos com per\u00edodo', 'Jogos na liga', 'Ordem no gr\u00e1fico']);
  const lines = [head.map(csvCell).join(';')];
  rows.forEach(r => lines.push([r.name].concat(spanCsvCells(r))
    .concat([r.withP + '/' + r.games, String(r.games), String(r.order)]).map(csvCell).join(';')));
  const tot = spanTotalCum(rows);
  const Tp = rows.reduce((x, r) => x + r.withP, 0), Tg = rows.reduce((x, r) => x + r.games, 0);
  lines.push(['Total'].concat(spanCsvCells({ cum:tot }))
    .concat([Tp + '/' + Tg, String(Tg), '']).map(csvCell).join(';'));
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}
''', 'saldoLeagueCsv')

# ---------------- 7) nome do arquivo exportado ----------------
s = rep(s,
"  const fname = 'saldo-por-' + (saldoViewMode() === 'team' ? 'time' : 'liga') + '-' + dayOffset(0) + '.csv';",
'''  const sp = periodSpan();
  const fname = 'saldo-por-' + (saldoViewMode() === 'team' ? 'time' : 'liga')
    + (sp === 'both' ? '' : '-' + sp) + '-' + dayOffset(0) + '.csv';''',
  'nome do arquivo por filtro')

# ---------------- 8) clique no filtro ----------------
s = rep(s,
"  if (t.closest('#exportSaldoCsv')){ exportSaldoCsv(); return; }",
'''  if (t.closest('#exportSaldoCsv')){ exportSaldoCsv(); return; }
  const spb = t.closest('#saldoPeriod button');
  if (spb){ state.saldoPeriod = spb.getAttribute('data-sp') || 'both'; renderSaldoChart(); return; }''',
  'clique do filtro')

# ---------------- 9) rodape ----------------
s = reple(s, 'function saldoChartNote(rows, total){', r'''function saldoChartNote(rows, total){
  const base = rows.reduce((x, r) => x + r.withP, 0);
  const byAvg = (state.saldoMetric === 'avg');
  const team = (saldoViewMode() === 'team');
  const sp = periodSpan();
  const old = (sp === 'both');
  const fx = old ? 'quatro faixas de tempo ' : ('as faixas do ' + (sp === 'h1' ? '1\u00ba tempo ' : '2\u00ba tempo '));
  const head = team
    ? 'Linha = saldo acumulado por TIME (escanteios do time \u2212 os sofridos) ponto a ponto nas ' + fx
    : 'Linha = saldo acumulado (escanteios do mandante \u2212 do visitante) ponto a ponto nas ' + fx;
  const tail = team
    ? 'vis\u00e3o por time: cada escanteio vale +1 para quem bate e \u22121 para quem sofre, ent\u00e3o numa mesma liga a soma dos times \u00e9 0 por constru\u00e7\u00e3o'
    : 'linha acima do zero = mandante na frente no acumulado, abaixo = visitante na frente';
  const shown = (total != null && total > rows.length)
    ? 'gr\u00e1fico mostra os ' + rows.length + ' ' + (team ? 'times' : 'ligas') + ' de maior saldo final (de ' + total + ') \u00b7 ' : '';
  const bands = old ? '(0-15, 16-30, 31-45, 46-60) \u00b7 a linha tracejada marca o intervalo e a 4\u00aa faixa fecha o 2\u00ba tempo registrado'
    : (sp === 'h1' ? "(0-15, 16-30, 31-45) \u00b7 o 1\u00ba tempo fecha no ponto 45' e o acumulado come\u00e7a em 0"
                   : "(46-60) \u00b7 eixo rebaseado para 45'-60' e acumulado reiniciado no intervalo");
  const filt = old ? 'sem filtro de tempo' : ('filtro ' + (sp === 'h1' ? '1\u00ba tempo' : '2\u00ba tempo'));
  return head + bands + ' \u00b7 ' + (byAvg ? 'em m\u00e9dia por jogo' : 'somado') + ' \u00b7 base ' + base +
    ' jogo(s) em ' + rows.length + (team ? ' time(s)' : ' liga(s)') + ' \u00b7 ' + shown + filt + ' \u00b7 ' +
    spanAxisNote() + ' \u00b7 ' + tail;
}
''', 'saldoChartNote')

# ---------------- 10) desenho ----------------
s = reple(s, 'function drawSaldoChart(){', r'''function drawSaldoChart(){
  const cv = $('#saldoChart'), empty = $('#saldoChartEmpty'), cap = $('#saldoCap');
  if (!cv) return;
  const sp = periodSpan();
  const all = saldoRows();
  const rows = all.slice(0, SALDO_MAX_LINES);
  if (!rows.length){
    cv.style.display = 'none';
    if (empty){ empty.style.display = 'block';
      empty.textContent = 'Sem jogos com divis\u00e3o por per\u00edodo nas ' + (saldoViewMode() === 'team' ? 'equipes' : 'ligas') + ' vis\u00edveis \u2014 a linha aparece quando houver dado.'; }
    if (cap) cap.textContent = '';
    return;
  }
  cv.style.display = 'block';
  if (empty) empty.style.display = 'none';

  const labels = spanAxis(), K = labels.length - 1;
  const dpr = window.devicePixelRatio || 1;
  const w = cv.clientWidth || 320, h = 214;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const ctx = cv.getContext('2d');
  if (ctx.setLineDash) ctx.setLineDash([]);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const vals = [0];
  rows.forEach(r => r.cum.forEach(v => vals.push(v)));
  let max = Math.max.apply(null, vals), min = Math.min.apply(null, vals);
  if (!isFinite(max)) max = 1;
  if (!isFinite(min)) min = 0;
  if (max === min) max = min + 1;
  const rng0 = (max - min) || 1;
  max = round1(max + rng0 * 0.20); min = round1(min - rng0 * 0.20);
  const padL = 34, padR = 36, padT = 16, padB = 46;
  const iw = w - padL - padR, ih = h - padT - padB;
  const X = i => padL + (iw / K) * i;
  const Y = v => padT + ih - ((v - min) / ((max - min) || 1)) * ih;
  const zeroY = Math.max(padT, Math.min(padT + ih, Y(0)));

  ctx.strokeStyle = 'rgba(47,67,96,.55)'; ctx.lineWidth = 1;
  ctx.fillStyle = '#8ba0be'; ctx.font = '9px -apple-system,BlinkMacSystemFont,sans-serif';
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++){
    const v = min + (max - min) * (i / 4), y = Y(v);
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
    ctx.fillText(brNum(round1(v)), padL - 5, y);
  }
  ctx.strokeStyle = 'rgba(139,160,190,.95)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(padL, zeroY); ctx.lineTo(w - padR, zeroY); ctx.stroke();
  /* divisor do intervalo: cai no ponto 45' quando as quatro faixas estao na tela */
  if (sp === 'both'){
    if (ctx.setLineDash) ctx.setLineDash([4, 3]);
    ctx.strokeStyle = 'rgba(139,160,190,.55)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X(3), padT); ctx.lineTo(X(3), padT + ih); ctx.stroke();
    if (ctx.setLineDash) ctx.setLineDash([]);
  }

  rows.forEach(r => {
    ctx.strokeStyle = r.color; ctx.lineWidth = 2;
    ctx.beginPath();
    r.cum.forEach((v, i) => { const x = X(i), y = Y(v); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.stroke();
    r.cum.forEach((v, i) => {
      ctx.beginPath(); ctx.arc(X(i), Y(v), 2.6, 0, Math.PI * 2);
      ctx.fillStyle = r.color; ctx.fill();
    });
    const last = r.cum[r.cum.length - 1];
    ctx.fillStyle = r.color; ctx.font = 'bold 9.5px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(saldoFmt(last), Math.min(X(K) + 5, w - 24), Y(last));
  });

  ctx.fillStyle = '#8ba0be'; ctx.font = '9px -apple-system,BlinkMacSystemFont,sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  labels.forEach((lb, i) => ctx.fillText(lb, X(i), padT + ih + 6));
  ctx.font = '8.5px -apple-system,BlinkMacSystemFont,sans-serif';
  ctx.fillStyle = '#5f7699';
  if (sp === 'both'){
    ctx.fillText('1\u00ba tempo', (X(0) + X(3)) / 2, padT + ih + 20);
    ctx.fillText('2\u00ba tempo', (X(3) + X(K)) / 2, padT + ih + 20);
  } else {
    ctx.fillText(spanLabelShort(), (X(0) + X(K)) / 2, padT + ih + 20);
  }

  cv.setAttribute('data-geom', JSON.stringify({ groups:rows.length, points:labels.length, buckets:K, span:sp,
    labels:labels, xstep:round1(iw / K), zeroY:round1(zeroY) }));
  if (cap) cap.textContent = saldoChartNote(rows, all.length);
}
''', 'drawSaldoChart')

# ---------------- 11) render ----------------
s = reple(s, 'function renderSaldoChart(){', r'''function renderSaldoChart(){
  const seg = $('#saldoMetric');
  if (seg) Array.from(seg.querySelectorAll('button')).forEach(b => b.classList.toggle('on', b.getAttribute('data-sm') === state.saldoMetric));
  const vs = $('#saldoView');
  if (vs) Array.from(vs.querySelectorAll('button')).forEach(b => b.classList.toggle('on', b.getAttribute('data-sv') === saldoViewMode()));
  const pseg = $('#saldoPeriod');
  if (pseg) Array.from(pseg.querySelectorAll('button')).forEach(b => b.classList.toggle('on', (b.getAttribute('data-sp') || 'both') === periodSpan()));
  const ttl = $('#saldoTitle');
  if (ttl) ttl.textContent = 'Saldo acumulado por tempo ' + (saldoViewMode() === 'team' ? 'por time' : 'por liga')
    + (periodSpan() === 'both' ? '' : ' \u00b7 ' + spanLabelShort());
  const lg = $('#saldoLegend');
  if (lg){
    const all = saldoRows();
    const rows = all.slice(0, SALDO_MAX_LINES);
    const unit = (saldoViewMode() === 'team') ? 'time(s)' : 'liga(s)';
    const sp = periodSpan();
    const finTxt = sp === 'h1' ? 'saldo 1\u00ba tempo' : (sp === 'h2' ? 'saldo 2\u00ba tempo' : 'saldo final');
    lg.innerHTML = rows.length
      ? rows.map(r => '<span><i style="background:' + r.color + '"></i>' + r.name + ' \u00b7 ' + finTxt + ' ' + saldoFmt(r.cum[r.cum.length - 1]) + '</span>').join('')
        + (all.length > rows.length ? '<span style="color:var(--mut2)">+ ' + (all.length - rows.length) + ' ' + unit + ' fora do gr\u00e1fico</span>' : '')
      : '<span style="color:var(--mut2)">sem ' + (saldoViewMode() === 'team' ? 'times' : 'ligas') + ' com divis\u00e3o por per\u00edodo na vis\u00e3o atual</span>';
  }
  try { drawSaldoChart(); } catch(e){ /* canvas indispon\u00edvel: o resto do app segue */ }
}
''', 'renderSaldoChart')

wr('index.html', s)
blocks = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', s, re.S)
wr('app.js', '\n;\n'.join(blocks))
print('blocos de script extraidos:', len(blocks))

# ---------------- 12) testes ----------------
t = rd('t8.js')
anchor = "    t('grafico/time: titulo volta para por liga', ev(\"$('#saldoTitle').textContent\").indexOf('por liga') > 0, true);"
if t.count(anchor) != 1:
    print('ANCORA FALHOU: harness |', t.count(anchor)); sys.exit(5)

BLOCK = r'''
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
    t('grafico/periodo: 2o tempo nao desenha barra', ev("(function(){calls.fillRect=0;calls.strokeRect=0;drawSaldoChart();return String(calls.fillRect)+'/'+String(calls.strokeRect)})()"), '0/0');
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
'''
t = t.replace(anchor, anchor + BLOCK, 1)
wr('t8.js', t)
print('harness atualizado')
print('FIM DO PATCH')
