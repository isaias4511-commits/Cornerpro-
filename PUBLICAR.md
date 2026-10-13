# Publicar o CornerPro no GitHub

Checklist operacional, em ordem, para sair do repositório local (`/home/user/cornerpro`) até o CI verde no GitHub.
Comandos prontos para copiar e colar. Marque cada item conforme concluir.

## Estado do repositório (imediatamente antes deste arquivo)

| Item | Valor |
|---|---|
| Branch | `master` (única) |
| HEAD | `6b849ec` — `6b849ecc2ea20cbd9ab494d15ff8604b15ab94fd` |
| Commits | 5 (este `PUBLICAR.md` entra como o 6º) |
| Working tree | limpo (0 alterações pendentes) |
| Arquivos versionados | 85 |
| `remote origin` | `git@github.com:SEU-USUARIO/cornerpro.git` — **marcador, precisa trocar** |
| `README.md` | 2.868 B · badge do CI na linha 3 |
| `.gitignore` | 85 B — `node_modules/`, `.wrangler/`, `*.bak*`, `.bak*`, `e2e/min-e2e.log`, `.DS_Store`, `npm-debug.log*`, `*.log` |
| `LICENSE` | MIT (2026 · titular "CornerPro CI") |
| CI | `.github/workflows/ci.yml` — jobs `unit` (jsdom) e `e2e` (Chromium) |
| `package.json` | `private: true` · nome `cornerpro` 1.0.0 · scripts `test`, `test:harness`, `test:min`, `test:e2e` |
| `package-lock.json` | presente (CI usa `npm ci`) |

Histórico:

```
6b849ec chore: volta remote e badge ao marcador (sem conta GitHub) e script com modo --reset verificado
43772b1 docs: badge do CI aponta para genspark_dev/cornerpro
77d9aa8 ci: script setup-github.sh (remote origin + badge do README)
6afdd6e docs: README com badge do CI e contrato do parametro min
18a9160 CI: GitHub Actions (harness jsdom + contrato ?min= + e2e Chromium) e scripts npm test/test:e2e
```

> Nota: as contagens de arquivos/commits desta tabela são o snapshot **anterior** a este arquivo; depois dele o repositório recebeu mais dois commits — `docs: checklist de publicação (PUBLICAR.md)` e a remoção dos 24 `run*.log`.

> Nada foi publicado: não há conta, credencial válida nem remote real neste ambiente. Todo o resto é executado na máquina do usuário.

---

## Fase 0 — Antes de publicar

- [x] **Licença definida: MIT** em `LICENSE` (2026 · titular "CornerPro CI"), com `"license": "MIT"` no `package.json`. O `private: true` permanece, então o pacote não vai ao npm. Troque o titular por seu nome/org se quiser.
- [ ] **Revisar fixtures com cara de segredo** em arquivos versionados (`wtest.mjs`, `wtest3.mjs` contêm strings de teste do tipo `SUPER-SECRET-...`). São inofensivas (testam mascaramento), mas scanners de segredo/push protection podem acusá-las — troque por algo explícito, ex.: `const SECRET = 'dummy-not-a-real-key';`
- [ ] **Varredura de segredos por nome** — nenhum `.env*`, `*.pem`, `*.key`, `id_rsa*`, `*.p12`, `.dev.vars`, `credentials*` encontrado nos arquivos versionados.
- [ ] **`.wrangler/` e os 20 `.bak*`** existem no diretório local mas estão no `.gitignore` — não sobem para o remoto. Nada a fazer.
- [ ] **Decidir a branch**: `master` funciona (o workflow escuta `push` em `main` **e** `master`). Para usar `main`: `git branch -M main` antes do push.
- [ ] **Revisar os marcadores `SEU-USUARIO`** (ver Fase 3).

## Fase 1 — Conta

- [ ] Criar conta em **https://github.com/signup**.
- [ ] Anotar o **login exato** (é o `<owner>` de remote, badge e URLs) em https://github.com/settings/profile.
- [ ] Ativar **2FA** em https://github.com/settings/security (exigido para push). Guardar os códigos de recuperação.

## Fase 2 — Criar o repositório vazio

- [ ] Abrir **https://github.com/new**.
- [ ] **Owner**: seu login. **Repository name**: `cornerpro` (se mudar, ajuste o slug em todo o checklist).
- [ ] Visibilidade: **Private** (coerente com `private: true`) ou Public.
- [ ] **NÃO** marcar *Add a README file*, *Add .gitignore* nem *Choose a license* — o repo precisa nascer vazio, senão o push é rejeitado como *non-fast-forward*.
- [ ] *Alternativa por CLI* (dispensa remote manual e push): após `gh auth login`, rodar dentro do repo:
      `gh repo create SEU_LOGIN/cornerpro --private --source=. --remote=origin --push`

## Fase 3 — Marcadores `SEU-USUARIO`

| Onde | Ação |
|---|---|
| `README.md` (linha 3 = badge, mais 2 no corpo) | **Substituir** pelo slug real |
| `scripts/setup-github.sh` (`PLACEHOLDER="SEU-USUARIO/cornerpro"`) | **Manter** — é a constante do script |
| 9 HTML, 1 ocorrência cada: `index.html`, `cornerpro-csv.html`, `cornerpro-ficha.html`, `cornerpro-h2hcsv.html`, `cornerpro-ligas.html`, `cornerpro-lista.html`, `cornerpro-momcsv.html`, `cornerpro-periodo.html`, `cornerpro-rankcsv.html` (placeholder `https://cornerpro-proxy.SEU-USUARIO.workers.dev`) | **Opcional** — é subdomínio do **Cloudflare**, não o login do GitHub; trocar só ao publicar o Worker |
| arquivos `.bak*` | **Ignorar** — não versionados |

- [ ] Reconferir antes: `grep -rn "SEU-USUARIO" . --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.wrangler`

## Fase 4 — Trazer o projeto pelo bundle e ajustar remote + badge

- [ ] Baixar o bundle: https://www.genspark.ai/api/files/s/VPKZuodQ (292 KB, 5 commits, MD5 `c0aa33a9dcd9f6169c3ae851c5f2f446`)
- [ ] Clonar e entrar:
      `curl -L -o cornerpro.bundle "https://www.genspark.ai/api/files/s/VPKZuodQ"`
      `git clone cornerpro.bundle cornerpro`
      `cd cornerpro`
      `git remote -v` → aponta para o próprio `.bundle`, **precisa trocar**
- [ ] Aplicar o slug real (define remote SSH + reescreve o badge do README):
      `bash scripts/setup-github.sh SEU_LOGIN/cornerpro`
- [ ] *Se preferir HTTPS + token em vez de SSH:*
      `git remote set-url origin https://github.com/SEU_LOGIN/cornerpro.git`
      `sed -i "s#SEU-USUARIO/cornerpro#SEU_LOGIN/cornerpro#g" README.md`
- [ ] Conferir: `git remote -v` → `git@github.com:SEU_LOGIN/cornerpro.git` (fetch/push) e `grep -c "SEU-USUARIO" README.md` → **0**.

> *Alternativa sem histórico Git*: o `.zip` — https://www.genspark.ai/api/files/s/hKJoj0vw (3,15 MB) — e rodar o mesmo script por cima.

## Fase 5 — Autenticação (senha não é mais aceita)

**A) SSH (recomendada)**
- [ ] `ssh-keygen -t ed25519 -C "seu@email"` (caminho padrão; passphrase opcional)
- [ ] `cat ~/.ssh/id_ed25519.pub` e cadastrar em **https://github.com/settings/keys** → *New SSH key*
- [ ] Testar: `ssh -T git@github.com` → *"Hi SEU_LOGIN! You've successfully authenticated…"*

**B) PAT por HTTPS**
- [ ] Criar token fine-grained em **https://github.com/settings/tokens**: acesso ao repo `cornerpro`; permissão **Contents: Read and write** (+ *Administration: Read and write* só se for criar o repo via API)
- [ ] No `git push`, usá-lo como senha. **Nunca** cole o token no chat; se colar, revogue.

**C) gh CLI** — `gh auth login` (escolher HTTPS ou SSH).

## Fase 6 — Push

- [ ] Conferir estado: `git status --short --branch` (esperado `## master`), `git log --oneline -3`, `git rev-list --count HEAD` (= 5)
- [ ] Enviar e fixar upstream: `git push -u origin master`
- [ ] *Branch renomeada:* `git push -u origin main`
- [ ] *Repo criado com README:* `git pull --rebase origin master` e depois `git push -u origin master`

## Fase 7 — Verificação pós-push

- [ ] `git ls-remote --heads origin` → lista `refs/heads/master` com o SHA `6b849ec…`
- [ ] `git branch -vv` → `* master … [origin/master]`
- [ ] Abrir `https://github.com/SEU_LOGIN/cornerpro` — 85 arquivos, README renderizado
- [ ] **Badge**: abrir `https://github.com/SEU_LOGIN/cornerpro/actions` e confirmar `unit` e `e2e`; o badge só mostra "passing" **após a primeira execução**
- [ ] Reproduzir local: `npm ci && npm test` e `npm run test:e2e`

## Fase 8 — (Opcional) Worker Cloudflare para dados ao vivo

- [ ] `npx wrangler login`
- [ ] `npx wrangler secret put APIFOOTBALL_KEY` (chave da API-Football — não vai para o repo)
- [ ] `npx wrangler deploy`
- [ ] No app, preencher **Proxy** (⚙️) com `https://cornerpro-proxy.<subdomínio>.workers.dev` — `<subdomínio>` é o da **conta Cloudflare**, não o login do GitHub

---

## Erros prováveis

| Mensagem | Causa / correção |
|---|---|
| `Permission denied (publickey)` | Chave SSH não cadastrada/agente vazio → refazer Fase 5A |
| `Authentication failed` | Senha em vez de token → usar PAT |
| `403` no push | PAT sem **Contents: Read and write** |
| `non-fast-forward` / `fetch first` | Repo criado com README → `git pull --rebase origin master` |
| `remote origin already exists` | `git remote set-url origin <url>` |
| `repository not found` | Owner/nome errado ou repo não criado (Fase 2) |
| Actions vazio | Workflow só roda após o push; conferir `.github/workflows/ci.yml` |

## Resumo em três comandos

```bash
git clone cornerpro.bundle cornerpro && cd cornerpro
bash scripts/setup-github.sh SEU_LOGIN/cornerpro
git push -u origin master
```

---

### Sobre este arquivo

`PUBLICAR.md` foi adicionado ao repositório no commit `docs: checklist de publicação (PUBLICAR.md)`, imediatamente após `6b849ec` — o snapshot da tabela acima é o estado **anterior** a este arquivo. O bundle e o `.zip` publicados incluem este commit; baixe novamente se você já tinha uma cópia anterior.
