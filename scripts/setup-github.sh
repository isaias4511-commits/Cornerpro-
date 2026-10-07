#!/usr/bin/env bash
# scripts/setup-github.sh — aponta o remote origin E o badge do CI para <owner>/<repo>.
# Uso: bash scripts/setup-github.sh minha-org/cornerpro
set -euo pipefail

slug="${1:-}"
if [ -z "$slug" ]; then
  echo "uso: bash scripts/setup-github.sh <owner>/<repo>" >&2
  exit 2
fi
if ! printf '%s' "$slug" | grep -qE '^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$'; then
  echo "erro: use o formato owner/repo (ex.: minha-org/cornerpro) — recebido: $slug" >&2
  exit 2
fi

cd "$(dirname "$0")/.."

# 1) remote origin
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "git@github.com:$slug.git"
  echo "remote origin atualizado -> git@github.com:$slug.git"
else
  git remote add origin "git@github.com:$slug.git"
  echo "remote origin criado     -> git@github.com:$slug.git"
fi

# 2) badge no README (aceita o marcador ou um slug anterior)
if grep -q "SEU-USUARIO/cornerpro" README.md; then
  sed -i "s#SEU-USUARIO/cornerpro#$slug#g" README.md
  echo "badge do README          -> $slug"
else
  prev=$(grep -oE 'github\.com/[^/]+/[^/]+/actions/workflows' README.md | head -1 | cut -d/ -f2,3)
  if [ -n "$prev" ] && [ "$prev" != "$slug" ]; then
    sed -i "s#github.com/$prev/#github.com/$slug/#g" README.md
    echo "badge do README          -> $slug (antes: $prev)"
  else
    echo "aviso: nada a trocar no badge (já aponta para $slug?)"
  fi
fi

# 3) conferência
echo
echo "conferência:"
git remote -v | sed 's/^/  /'
grep -n "badge.svg" README.md | sed 's/^/  /'
printf '  marcadores SEU-USUARIO restantes: %s\n' "$(grep -c 'SEU-USUARIO' README.md || true)"
printf '  links actions/workflows no README: %s\n' "$(grep -o 'actions/workflows/ci.yml' README.md | wc -l)"
echo
echo "próximo passo:  git push -u origin $(git rev-parse --abbrev-ref HEAD)"
