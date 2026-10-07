# -*- coding: utf-8 -*-
"""Tira o bloco de periodo de dentro do try de 'per-time', da a ele catch proprio
e conserta a assertiva de canvas que usava 'calls' dentro do realm da pagina."""
import io
p = '/home/user/cornerpro/t8.js'
t = io.open(p, encoding='utf-8').read()

start = "    /* ===== grafico/periodo: filtro Ambos / 1o tempo / 2o tempo (novo) ===== */"
endm = "t('grafico/periodo: volta ao estado inicial'"
i = t.index(start)
j = t.index(endm)
j = t.index('\n', j) + 1
block = t[i:j]
rest = t[:i] + t[j:]
print('bloco de periodo extraido:', len(block), 'chars')

bad = """    t('grafico/periodo: 2o tempo nao desenha barra', ev("(function(){calls.fillRect=0;calls.strokeRect=0;drawSaldoChart();return String(calls.fillRect)+'/'+String(calls.strokeRect)})()"), '0/0');"""
good = """    calls.fillRect = 0; calls.strokeRect = 0; calls.arc = 0;
    ev("(function(){state.saldoPeriod='h2';renderSaldoChart();return true})()");
    t('grafico/periodo: 2o tempo nao desenha barra', calls.fillRect + '/' + calls.strokeRect, '0/0');
    t('grafico/periodo: 2o tempo desenha 2 pontos por linha', calls.arc, 2 * Math.min(6, ev("saldoRows().length")));"""
assert bad in block, 'assertiva antiga nao encontrada'
block = block.replace(bad, good)
print('assertiva de canvas corrigida (contadores do harness)')

# tira a indentacao extra: o bloco vai virar o corpo do proprio try
block = '\n'.join((ln[2:] if ln.startswith('  ') else ln) for ln in block.split('\n'))

catch = "  } catch(e){ console.log('FALHA no bloco grafico/per-time:', e && e.message); }"
assert rest.count(catch) == 1, 'catch de per-time nao encontrado'
ins = (catch + "\n\n  /* ===== grafico/periodo: filtro Ambos / 1o tempo / 2o tempo (novo) ===== */\n"
       "  try {\n" + block + "  } catch(e){ console.log('FALHA no bloco grafico/periodo:', e && e.message); }\n")
rest = rest.replace(catch, ins, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(rest)
print('bloco de periodo agora tem try/catch proprio, fora do bloco de per-time')
