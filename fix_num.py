# -*- coding: utf-8 -*-
"""Tira o helper 'num' (nao existe no escopo do bloco) e imprime a conferencia manual."""
import io
p = '/home/user/cornerpro/t8.js'
s = io.open(p, encoding='utf-8').read()
n1 = s.count('x + num(r[4])')
n2 = s.count("const hp = hand.split(' :: ');")
print('ancoras:', n1, n2)
assert n1 == 1 and n2 == 1, 'ancora inesperada'
s = s.replace('x + num(r[4])', 'x + Number(r[4])')
s = s.replace("const hp = hand.split(' :: ');",
              "const hp = hand.split(' :: ');\n    console.log('DBG time mao:', hand);", 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('fix do harness aplicado')
