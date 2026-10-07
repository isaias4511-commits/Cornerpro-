# -*- coding: utf-8 -*-
"""Ordem da legenda (e das linhas do grafico, e do CSV) pelo saldo final.
- passa a existir UM ponto de ordenacao: saldoOrder(rows), usado pelas duas visoes;
- padrao = saldo final, maior primeiro, com empate resolvido pelo nome (pt-BR), o que
  torna a ordem estavel e reproduzivel (antes o empate herdava a ordem de insercao);
- a legenda ganha um controle explicito: 'Saldo final' (padrao) / 'Nome'."""
import io, re, sys, os, shutil

os.chdir('/home/user/cornerpro')
def rd(p): return io.open(p, encoding='utf-8').read()
def wr(p, t): io.open(p, 'w', encoding='utf-8', newline='\n').write(t)
def rep(s, old, new, tag, count=1):
    n = s.count(old)
    if n != count:
        print('ANCORA FALHOU:', tag, '| ocorrencias =', n, '(esperado', count, ')'); print(repr(old[:150])); sys.exit(2)
    print('ok:', tag); return s.replace(old, new)

s = rd('index.html'); shutil.copyfile('index.html', 'index.html.bak10')
shutil.copyfile('t8.js', 't8.js.bak10')

# ---------- 1) estado ----------
s = rep(s, "  rankView: 'match',", "  rankView: 'match',\n  saldoSort: 'net',", 'estado saldoSort')

# ---------- 2) HTML: controle de ordenacao ----------
s = rep(s,
'''        <div class="seg sm" id="saldoMetric">''',
'''        <div class="seg sm" id="saldoSort">
          <button class="on" data-so="net">Saldo final</button>
          <button data-so="name">Nome</button>
        </div>
        <div class="seg sm" id="saldoMetric">''',
  'html seg saldoSort')

# ---------- 3) uma unica ordenacao, usada pelas duas visoes ----------
s = rep(s,
"  rows.sort((a, b) => b.cum[b.cum.length - 1] - a.cum[a.cum.length - 1]);",
"  saldoOrder(rows);", 'ordena por saldo final (liga)', count=2)

s = rep(s,
"function saldoRows(){ return saldoViewMode() === 'team' ? saldoTeamRows() : saldoLeagueRows(); }",
'''/* ---------- Ordem da legenda, das linhas do grafico e do CSV ----------
   Padrao: saldo final, maior primeiro. Empate resolvido pelo nome (A-Z, pt-BR) para a
   ordem ser estavel. Legenda, canvas e CSV leem sempre esta mesma ordem, entao nunca
   divergem entre si; o botao 'Nome' troca a ordenacao para A-Z. */
function saldoSortMode(){ return state.saldoSort === 'name' ? 'name' : 'net'; }
function saldoOrder(rows){
  const cmpName = (a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR');
  if (saldoSortMode() === 'name') return rows.sort(cmpName);
  return rows.sort((a, b) => (b.cum[b.cum.length - 1] - a.cum[a.cum.length - 1]) || cmpName(a, b));
}
function saldoRows(){ return saldoViewMode() === 'team' ? saldoTeamRows() : saldoLeagueRows(); }''',
  'saldoOrder + saldoRows')

# ---------- 4) clique no controle ----------
s = rep(s,
"  if (spb){ state.saldoPeriod = spb.getAttribute('data-sp') || 'both'; renderSaldoChart(); return; }",
'''  if (spb){ state.saldoPeriod = spb.getAttribute('data-sp') || 'both'; renderSaldoChart(); return; }
  const sob = t.closest('#saldoSort button');
  if (sob){ state.saldoSort = sob.getAttribute('data-so') || 'net'; renderSaldoChart(); return; }''',
  'clique do controle de ordem')

# ---------- 5) aviso da legenda acompanha a ordenacao ----------
s = rep(s,
"      ? '<span style=\"color:var(--mut2)\">ordem da legenda = ' + finTxt + ', maior primeiro</span>'",
"      ? '<span style=\"color:var(--mut2)\">ordem da legenda = ' + (saldoSortMode() === 'name' ? 'nome A\\u2013Z' : finTxt + ', maior primeiro') + '</span>'",
  'aviso da ordem')

# ---------- 6) botao ativo + data-geom ----------
s = rep(s,
"  const ttl = $('#saldoTitle');",
'''  const sseg = $('#saldoSort');
  if (sseg) Array.from(sseg.querySelectorAll('button')).forEach(b => b.classList.toggle('on', (b.getAttribute('data-so') || 'net') === saldoSortMode()));
  const ttl = $('#saldoTitle');''',
  'botao ativo da ordem')

s = rep(s,
"buckets:K, span:sp,",
"buckets:K, span:sp, sort:saldoSortMode(),",
  'geom registra a ordem')

wr('index.html', s)
blocks = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', s, re.S)
wr('app.js', '\n;\n'.join(blocks))
print('blocos de script extraidos:', len(blocks))

# ---------- 7) testes ----------
t = rd('t8.js')
anchor = "  } catch(e){ console.log('FALHA no bloco grafico/legenda:', e && e.message); }"
if t.count(anchor) != 1:
    print('ANCORA FALHOU: catch do bloco da legenda |', t.count(anchor)); sys.exit(3)

BLOCK = r'''
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
      ev("saldoRows().every(function(r,i){return r.order===i+1}).toString() + '/' + ev("saldoRows().map(function(r){return String(r.order)}).join('|')"), true + '/' + ev("saldoRows().map(function(r){return String(r.order)}).join('|')"));
    t('grafico/ordem: sem NaN no CSV em nenhuma ordenacao',
      ev("(function(){var a=saldoRowsCsv();state.saldoSort='name';var b=saldoRowsCsv();state.saldoSort='net';return String((/NaN/.test(String(a))+'').length>0 && !/NaN/.test(String(a)) && !/NaN/.test(String(b)))})()"), true);
    t('grafico/ordem: estado final restaurado',
      ev("(function(){state.saldoView='league';state.saldoMetric='sum';state.saldoPeriod='both';state.saldoSort='net';renderAll();return saldoSortMode()+'|'+periodSpan()+'|'+saldoViewMode()+'|'+state.saldoMetric})()"), 'net|both|league|sum');
  } catch(e){ console.log('FALHA no bloco grafico/ordem:', e && e.message); }
'''
t = rep(t, anchor, anchor + '\n' + BLOCK, 'bloco de testes da ordem')
wr('t8.js', t)
print('harness atualizado')
print('FIM DO PATCH ORDEM')
