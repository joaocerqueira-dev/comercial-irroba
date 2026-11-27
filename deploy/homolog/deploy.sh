#!/usr/bin/env bash
# Atualiza a homologação para a imagem do .env (APP_TAG). Seguro para rodar a qualquer hora:
# se já estiver na versão mais nova, não faz nada. Se a versão nova não ficar saudável,
# volta sozinho para a anterior e não tenta de novo a mesma imagem (use --force para insistir).
#   ./deploy.sh            atualiza se houver versão nova
#   ./deploy.sh --force    recria mesmo sem versão nova ou se a imagem falhou antes
source "$(dirname "$0")/lib.sh"

FORCE=0
[ "${1:-}" = "--force" ] && FORCE=1

# Evita dois deploys ao mesmo tempo (cron + manual).
exec 9>"$STATE_DIR/deploy.lock"
if ! flock -n 9; then log "Outro deploy está em andamento. Saindo."; exit 0; fi

REF="$(image_ref)"
OLD_ID="$(running_image_id)"

log "Baixando $REF (a versão atual continua no ar)..."
docker compose pull --quiet
NEW_ID="$(docker image inspect -f '{{.Id}}' "$REF")"
NEW_REV="$(revision_of "$REF")"

if [ "$FORCE" -eq 0 ] && [ "$NEW_ID" = "$OLD_ID" ] && wait_healthy 5; then
  log "Já está na versão mais nova (commit ${NEW_REV:-?}). Nada a fazer."
  docker compose up -d --no-recreate >/dev/null   # garante que o túnel está de pé
  exit 0
fi

if [ "$FORCE" -eq 0 ] && grep -qxF "$NEW_ID" "$STATE_DIR/failed-images" 2>/dev/null; then
  log "A imagem do commit ${NEW_REV:-?} já falhou antes. Mantendo a versão atual. Use --force para tentar de novo."
  exit 0
fi

if [ -n "$OLD_ID" ]; then
  docker tag "$OLD_ID" "$PREVIOUS_IMAGE:previous"
  log "Versão atual guardada como $PREVIOUS_IMAGE:previous (commit $(revision_of "$OLD_ID"))."
fi

log "Trocando o container (o sistema fica fora do ar por alguns segundos)..."
docker compose up -d --remove-orphans

if wait_healthy 180; then
  log "Deploy concluído: commit ${NEW_REV:-?} no ar."
  docker image prune -f >/dev/null || true
  exit 0
fi

log "ERRO: a versão nova (commit ${NEW_REV:-?}) não ficou saudável. Últimas linhas do log:"
docker compose logs --tail 40 app || true
echo "$NEW_ID" >> "$STATE_DIR/failed-images"

if [ -n "$OLD_ID" ]; then
  log "Voltando para a versão anterior..."
  APP_IMAGE="$PREVIOUS_IMAGE" APP_TAG=previous docker compose up -d app
  if wait_healthy 180; then
    log "Rollback automático concluído: a versão anterior está no ar."
  else
    log "ERRO: a versão anterior também não subiu. Veja: docker compose logs app"
  fi
fi
exit 1
