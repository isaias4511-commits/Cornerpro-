# -*- coding: utf-8 -*-
"""Marca o saldo final de cada linha na LEGENDA do cartao de saldo:
- selo colorido com sinal, vindo do MESMO ponto final da serie desenhada (r.cum[last]);
- posicao (1o, 2o, ...) refletindo a ordem do grafico;
- dica (title) com a base de jogos;
- vale nas visoes Por liga e Por time e em qualquer filtro de tempo (a legenda e
  reconstruida a cada render, entao segue o filtro automaticamente)."""
import io, re, sys, os, shutil

os.chdir('/home/user/cornerpro')
def rd(p): return io.open(p, encoding='utf-8').read()
def wr(p, t): io.open(p, 'w', encoding='utf-8', newline='\n').write(t)
def rep(s, old, new, tag):
    n = s.count(old)
    if n != 1:
        print('ANCORA FALHOU:', tag, '| ocorrencias =', n); print(repr(old[:150])); sys.exit(2)
    print('ok:', tag); return s.replace(old, new, 1)

s = rd('index.html'); shutil.copyfile('index.html', 'index.html.bak9')
shutil.copyfile('t8.js', 't8.js.bak9')

# ---------- 1) CSS do selo ----------
s = rep(s,
'  .saldo-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}',
'''  .saldo-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}
  .saldo-legend span[title]{display:inline-flex;align-items:center;gap:4px}
  .saldo-legend .lrank{color:var(--mut2);font-weight:700}
  .saldo-legend b.sfin{font-weight:800;padding:1px 5px;border-radius:6px;background:rgba(139,160,190,.16);white-space:nowrap}
  .saldo-legend b.sfin.pos{color:var(--acc);background:rgba(34,224,122,.16)}
  .saldo-legend b.sfin.neg{color:var(--live);background:rgba(255,59,92,.16)}
  .saldo-legend b.sfin.zero,.saldo-legend b.sfin.nil{color:var(--mut2);background:rgba(139,160,190,.16)}''',
  'css do selo')

# ---------- 2) legenda: selo com o saldo final + ordem + dica ----------
old_row = "      ? rows.map(r => '<span><i style=\"background:' + r.color + '\"></i>' + r.name + ' \\u00b7 ' + finTxt + ' ' + saldoFmt(r.cum[r.cum.length - 1]) + '</span>').join('')"
new_row = ("      ? '<span style=\"color:var(--mut2)\">ordem da legenda = ' + finTxt + ', maior primeiro</span>'\n"
           "        + rows.map((r, i) => {\n"
           "          /* mesmo dado que o grafico usa: o ultimo ponto da serie filtrada */\n"
           "          const v = r.cum[r.cum.length - 1];\n"
           "          const tip = r.name + ' \\u00b7 ' + finTxt + ' ' + saldoFmt(v) + ' \\u00b7 base ' + r.withP + ' de ' + r.games + ' jogo(s) com per\\u00edodo';\n"
           "          return '<span title=\"' + tip + '\"><i style=\"background:' + r.color + '\"></i>'\n"
           "            + '<span class=\"lrank\">' + (i + 1) + '\\u00ba</span>' + r.name\n"
           "            + ' <b class=\"sfin ' + saldoCls(v) + '\">' + saldoFmt(v) + '</b></span>';\n"
           "        }).join('')")
s = rep(s, old_row, new_row, 'selo na legenda')

wr('index.html', s)
blocks = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', s, re.S)
wr('app.js', '\n;\n'.join(blocks))
print('blocos de script extraidos:', len(blocks))

# ---------- 3) testes ----------
t = rd('t8.js')
anchor = "  } catch(e){ console.log('FALHA no bloco grafico/periodo:', e && e.message); }"
if t.count(anchor) != 1:
    print('ANCORA FALHOU: catch do bloco de periodo |', t.count(anchor)); sys.exit(3)

EXPR = (r"(function(){var r=saldoRows().slice(0,6);"
        r"var b=[].slice.call(document.querySelectorAll('#saldoLegend b.sfin'));"
        r"var sp=[].slice.call(document.querySelectorAll('#saldoLegend span[title]'));"
        r"return [r.map(function(x){return saldoFmt(x.cum[x.cum.length-1])}).join('|'),"
        r"b.map(function(x){return x.textContent}).join('|'),"
        r"r.map(function(x){return saldoCls(x.cum[x.cum.length-1])}).join('|'),"
        r"b.map(function(x){return (x.className.match(/(pos|neg|zero|nil)/)||['nil'])[0]}).join('|'),"
        r"r.map(function(x){return x.name}).join('|'),"
        r"sp.map(function(x){return (x.getAttribute('title')||'').split(' \u00b7 ')[0]}).join('|')].join('#')})()")

BLOCK = r'''
  /* ===== grafico/legenda: saldo final marcado na legenda (novo) ===== */
  try {
    const EXPR = ''''' + '___EXPR___' + r''''';
    /* compara, para cada combinacao filtro/visao: (1) selo x fim da linha que o grafico desenhou,
       (2) cor do selo x sinal do valor, (3) nome no selo x nome da serie */
    const chk = (sp, view) => ev("(function(){state.saldoView='" + view + "';state.saldoMetric='sum';state.saldoPeriod='" + sp + "';renderSaldoChart();return " + EXPR + "})()").split('#');
    [['both','league'],['h1','league'],['h2','league'],['both','team'],['h1','team'],['h2','team']].forEach(c => {
      const s = chk(c[0], c[1]);
      t('grafico/legenda: selo = fim da linha (' + c[0] + '/' + c[1] + ')', s[0], s[1]);
      t('grafico/legenda: cor do selo (' + c[0] + '/' + c[1] + ')', s[2], s[3]);
      t('grafico/legenda: selo na serie certa (' + c[0] + '/' + c[1] + ')', s[4], s[5]);
    });
    t('grafico/legenda: um selo por linha desenhada (liga)', ev("$$('#saldoLegend b.sfin').length"), Math.min(6, ev("saldoRows().length")));
    t('grafico/legenda: um selo por linha desenhada (time)', ev("(function(){state.saldoView='team';state.saldoPeriod='both';renderSaldoChart();return $$('#saldoLegend b.sfin').length})()"), Math.min(6, ev("saldoRows().length")));
    t('grafico/legenda: ordem da legenda = maior saldo primeiro',
      ev("(function(){var v=[].slice.call(document.querySelectorAll('#saldoLegend b.sfin')).map(function(x){return parseFloat(x.textContent.replace('+','').replace(',','.'))||0});for(var i=1;i<v.length;i++)if(v[i]>v[i-1])return false;return true})()"), true);
    t('grafico/legenda: primeiro item marcado como 1o', ev("(function(){var s=document.querySelector('#saldoLegend span[title]');return s?s.querySelector('.lrank').textContent:''})()"), '1\u00ba');
    t('grafico/legenda: aviso de ordem no topo da legenda', ev("$('#saldoLegend').textContent.indexOf('ordem da legenda') >= 0"), true);
    t('grafico/legenda: dica do selo informa a base de jogos', ev("(function(){var s=document.querySelector('#saldoLegend span[title]');return s?s.getAttribute('title'):''})()").indexOf('base') > 0, true);
    t('grafico/legenda: sem sobra quando todas as linhas cabem', ev("$('#saldoLegend').textContent.indexOf('fora do gr') >= 0"), false);
    ev("state.saldoView='team';state.saldoPeriod='both';state.saldoMetric='sum';renderSaldoChart();true");
    t('grafico/legenda: dica do selo tambem na visao por time', ev("(function(){var s=document.querySelector('#saldoLegend span[title]');return s?s.getAttribute('title'):''})()").indexOf('jogo(s) com per') > 0, true);
    ev("state.saldoView='league';state.saldoPeriod='both';state.saldoMetric='sum';renderAll();true");
    t('grafico/legenda: estado final restaurado', ev("periodSpan()+'|'+saldoViewMode()+'|'+state.saldoMetric"), 'both|league|sum');
  } catch(e){ console.log('FALHA no bloco grafico/legenda:', e && e.message); }
'''
BLOCK = BLOCK.replace('___EXPR___', EXPR)
t = rep(t, anchor, anchor + '\n' + BLOCK, 'bloco de testes da legenda')
wr('t8.js', t)
print('harness atualizado')
print('FIM DO PATCH LEGENDA')
