#!/usr/bin/env bash
# Fixa uma versão específica (tag do GHCR) e faz o deploy dela.
#   ./rollback.sh sha-39ceccd   volta para o commit 39ceccd
#   ./rollback.sh main          volta a acompanhar a versão mais nova
#   ./rollback.sh --list        mostra as versões já baixadas neste notebook
# As tags disponíveis ficam em: https://github.com/joaocerqueira-dev/comercial-irroba/pkgs/container/comercial-irroba
source "$(dirname "$0")/lib.sh"

TAG="${1:-}"
if [ "$TAG" = "--list" ]; then
  docker image ls "$(env_value APP_IMAGE "$DEFAULT_IMAGE")" --format '{{.Tag}}\t{{.CreatedSince}}\t{{.ID}}'
  exit 0
fi
if ! [[ "$TAG" =~ ^(main|sha-[0-9a-f]{7,40})$ ]]; then
  echo "Uso: ./rollback.sh sha-xxxxxxx | main | --list" >&2
  exit 2
fi

if grep -qE '^APP_TAG=' .env; then
  sed -i -E "s/^APP_TAG=.*/APP_TAG=$TAG/" .env
else
  echo "APP_TAG=$TAG" >> .env
fi
log "APP_TAG=$TAG gravado no .env."
exec ./deploy.sh --force
