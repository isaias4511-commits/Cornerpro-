#!/usr/bin/env bash
# scripts/setup-github.sh — aponta o remote origin E o badge do CI para <owner>/<repo>.
#
#   bash scripts/setup-github.sh minha-org/cornerpro   # aplica um slug real
#   bash scripts/setup-github.sh --reset               # volta ao marcador (ainda sem conta)
#
# O slug atual é lido do PRÓPRIO README (não só do remote), então o --reset também
# desfaz um badge que já tenha sido trocado. No fim ele CONFERE o que foi observado
# no git e no README e sai 1 se a troca não aconteceu.
set -euo pipefail

PLACEHOLDER="SEU-USUARIO/cornerpro"

reset=0
case "${1:-}" in
  --reset) reset=1; slug="$PLACEHOLDER" ;;
  "")      echo "uso: bash scripts/setup-github.sh <owner>/<repo> | --reset" >&2; exit 2 ;;
  *)       slug="$1" ;;
esac

valid() { printf '%s' "$1" | grep -qE '^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$'; }
valid "$slug" || { echo "erro: use o formato owner/repo (ex.: minha-org/cornerpro) — recebido: $slug" >&2; exit 2; }

cd "$(dirname "$0")/.."

readme_slug() {
  grep -oE 'github\.com/[A-Za-z0-9._-]+/[A-Za-z0-9._-]+/actions/workflows' README.md 2>/dev/null \
    | head -1 | sed -E 's#^github\.com/##; s#/actions/workflows$##' || true
}
cur="$(readme_slug)"

# 1) remote origin
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "git@github.com:$slug.git"
  echo "remote origin atualizado -> git@github.com:$slug.git"
else
  git remote add origin "git@github.com:$slug.git"
  echo "remote origin criado     -> git@github.com:$slug.git"
fi

# 2) badge do README
if [ -n "$cur" ] && [ "$cur" != "$slug" ]; then
  if valid "$cur"; then
    sed -i "s#$cur#$slug#g" README.md
    echo "badge do README          $cur -> $slug"
  else
    echo "erro: slug do README não é válido: $cur" >&2; exit 1
  fi
elif [ "$cur" = "$slug" ]; then
  echo "badge do README          já aponta para $slug"
else
  echo "aviso: nenhum slug de badge encontrado no README"
fi

# 3) conferência: afirma só o que foi observado
echo
echo "conferência:"
git remote -v | sed 's/^/  /'
grep -n "badge.svg" README.md | sed 's/^/  /'
now="$(readme_slug)"
remote_url="$(git remote get-url origin)"
echo "  remote (git)   : $remote_url"
echo "  badge (readme) : ${now:-<nenhum>}"
fails=0
[ "$remote_url" = "git@github.com:$slug.git" ] || { echo "  FALHA: remote não corresponde a $slug"; fails=1; }
[ "$now" = "$slug" ]                            || { echo "  FALHA: badge não corresponde a $slug";  fails=1; }
if [ "$slug" = "$PLACEHOLDER" ]; then
  echo "  estado: marcador (nenhuma conta configurada)"
else
  echo "  próximo passo: git push -u origin $(git rev-parse --abbrev-ref HEAD)"
fi
[ "$fails" = 0 ] && echo "  RESULTADO: OK" || { echo "  RESULTADO: FALHA" >&2; exit 1; }
