# CornerPro

[![CI](https://github.com/isaias4511-commits/Cornerpro-/actions/workflows/ci.yml/badge.svg)](https://github.com/isaias4511-commits/Cornerpro-/actions/workflows/ci.yml)

Painel de escanteios por partida, liga e time, com gráfico de **saldo acumulado por tempo**
(escanteios pró − contra) por liga ou por time, filtro de período (Ambos / 1º tempo / 2º tempo),
métrica somada ou média por jogo, e exportação em CSV. Os dados reais vêm da API-Football
através de um proxy Cloudflare Worker que guarda a chave no servidor; sem chave, o app cai no
modo demonstração.

## Testes

```bash
npm ci
npm test          # harness jsdom (t8.js) + contrato de ?min= (wtest6.mjs)
npm run test:e2e  # matriz de ?min= em Chromium headless (Playwright)
```

| Comando | O que roda | Estado medido |
|---|---|---|
| `npm test` | `node t8.js && node wtest6.mjs` | 849 PASS / 0 FAIL |
| `npm run test:harness` | só o harness jsdom | 802 PASS / 0 FAIL |
| `npm run test:min` | só o contrato cliente × proxy | 47 PASS / 0 FAIL |
| `npm run test:e2e` | Chromium headless, provider `demo` | 13 PASS / 0 FAIL |

O e2e sobe um servidor estático próprio e usa o provider `demo`: **não** precisa de proxy, de
`APIFOOTBALL_KEY` nem de internet.

## O corte de amostra mínima (`?min=`)

O parâmetro `?min=` define quantas partidas uma liga precisa ter para que a média dela seja usada
para preencher escanteios em branco.

| Entrada | Efetivo (cliente e proxy) |
|---|---|
| ausente | 8 (padrão) |
| `1` … `50` | o próprio valor |
| `51`, `99`, `250` | **50** (teto) |
| `0`, `-3`, `abc`, vazio | 8 (padrão) |

Cliente e servidor compartilham o mesmo contrato — `minParse()` em `index.html` espelha
`minFrom()` em `cornerpro-proxy.js`. O valor efetivo volta para a URL e é persistido em
`localStorage` (`cp_cfg_v2`), e o parâmetro é removido da URL quando volta ao padrão.

## Estrutura

```
index.html               app (single file: UI, gráficos, CSV)
cornerpro-proxy.js       Cloudflare Worker (proxy da API-Football)
t8.js                    harness jsdom
wtest6.mjs               contrato de ?min= (cliente × proxy, chaves de cache)
e2e/min-e2e.mjs          matriz de ?min= em Chromium headless
.github/workflows/ci.yml GitHub Actions
```

## Proxy

```bash
echo "SUA_CHAVE" | npx wrangler secret put APIFOOTBALL_KEY
npx wrangler dev     # local, em http://localhost:8787
npx wrangler deploy  # publica
```

## Ligar o badge ao seu repositório

O badge acima aponta para `isaias4511-commits/Cornerpro-`. Se o repositório mudar de dono ou de nome, atualize o remote e reescreva as URLs do badge:

```bash
slug=$(git remote get-url origin | awk -F'[:/]' '{print $(NF-1)"/"$NF}' | sed 's/\.git$//')
sed -i "s#isaias4511-commits/Cornerpro-#$slug#g" README.md
```

O badge passa a renderizar depois do primeiro push, quando houver uma execução do workflow.
Para fixar uma branch específica, acrescente `?branch=master` à URL do badge.
