# -*- coding: utf-8 -*-
"""Corrige a expectativa do harness: soma dos 'pro' por time = corners somados (cada escanteio conta 1x)."""
import io, sys, os, shutil
os.chdir('/home/user/cornerpro')
def rd(p): return io.open(p, encoding='utf-8').read()
def wr(p, t): io.open(p, 'w', encoding='utf-8', newline='\n').write(t)

t = rd('t8.js')
shutil.copyfile('t8.js', 't8.js.bak7')

# 1) dupla contagem: cada escanteio vale para quem bateu, logo sum(pro) == sum(buckets h+a)
n = t.count('Math.abs(t-2*m)<1e-9')
print('ocorrencias de 2*m:', n)
if n != 2:
    print('ANCORA FALHOU'); sys.exit(2)
t = t.replace('Math.abs(t-2*m)<1e-9', 'Math.abs(t-m)<1e-9')

# rotulo do primeiro teste, agora dizendo o que se confere de fato
t = t.replace("t('grafico/time: pro dos times = 2x os escanteios das partidas',",
              "t('grafico/time: pro dos times = escanteios somados das partidas',")

# 2) contagem de linhas do CSV: cabecalho + um time por linha + total
old = "t('grafico/time: linhas = times + total', tCsv.length, tRows.length + 1);"
if t.count(old) != 1:
    print('ANCORA FALHOU: linhas'); sys.exit(3)
t = t.replace(old, "t('grafico/time: linhas = times + total + cabecalho', tCsv.length, tRows.length + 2);")

# 3) conferencia independente: linha de um time montada a mao a partir das faixas da partida
anchor = "    t('grafico/time: sem NaN no CSV de times',"
if t.count(anchor) != 1:
    print('ANCORA FALHOU: hand'); sys.exit(4)
HAND = r'''    /* conferencia independente: refaz a mao o acumulado de um time a partir das faixas da partida */
    const hand = ev("(function(){var m=filtered().filter(function(x){return periodBuckets(x)})[0];var b=periodBuckets(m);var net=[0,1,2,3].map(function(i){return b.h[i]-b.a[i]});var c=[0];net.forEach(function(v){c.push(Math.round((c[c.length-1]+v)*10)/10)});var r=saldoTeamRows().filter(function(x){return x.name===m.home.name})[0];return c.join('|')+' :: '+r.cum.join('|')})()");
    const hp = hand.split(' :: ');
    t('grafico/time: acumulado do time bate com o calculado a mao', hp[0], hp[1]);
    t('grafico/time: acumulado a mao das 4 faixas', hp[0].split('|').length, 5);
'''
t = t.replace(anchor, HAND + anchor, 1)
wr('t8.js', t)
print('harness corrigido')
