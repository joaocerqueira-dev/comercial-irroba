#!/usr/bin/env bash
# Restaura um backup feito pelo backup.sh. O sistema fica fora do ar durante a troca.
#   ./restore.sh ~/irroba-backups/db-2026-12-01_0300.db [~/irroba-backups/captures-2026-12-01_0300.tgz]
# Restaure banco e capturas da mesma data: os previews citam os arquivos pelo nome.
# Caminhos absolutos antes do lib.sh, que muda o diretório para esta pasta.
DB="${1:+$(realpath -m "$1")}"; CAPTURES="${2:+$(realpath -m "$2")}"
source "$(dirname "$0")/lib.sh"

if [ -z "$DB" ] || [ ! -f "$DB" ]; then
  echo "Uso: ./restore.sh <arquivo db-*.db> [arquivo captures-*.tgz]" >&2
  exit 2
fi
if [ -n "$CAPTURES" ] && [ ! -f "$CAPTURES" ]; then echo "Arquivo não encontrado: $CAPTURES" >&2; exit 2; fi

read -r -p "Isto substitui o banco atual${CAPTURES:+ e as capturas}. Digite RESTAURAR para continuar: " ok
[ "$ok" = "RESTAURAR" ] || { echo "Cancelado."; exit 1; }

log "Fazendo um backup do estado atual antes de restaurar..."
./backup.sh || log "Aviso: não foi possível fazer o backup prévio (o app pode estar parado)."

docker compose stop app
DB_DIR="$(cd "$(dirname "$DB")" && pwd)"; DB_FILE="$(basename "$DB")"
docker run --rm -v irroba-homolog_app-data:/data -v "$DB_DIR":/in:ro alpine:3.20 sh -c \
  "cp '/in/$DB_FILE' /data/prod.db && rm -f /data/prod.db-journal && chown \"\$(stat -c %u:%g /data)\" /data/prod.db"
log "Banco restaurado."

if [ -n "$CAPTURES" ]; then
  C_DIR="$(cd "$(dirname "$CAPTURES")" && pwd)"; C_FILE="$(basename "$CAPTURES")"
  docker run --rm -v irroba-homolog_app-captures:/data -v "$C_DIR":/in:ro alpine:3.20 sh -c \
    "find /data -mindepth 1 -delete && tar xzf '/in/$C_FILE' -C /data && chown -R \"\$(stat -c %u:%g /data)\" /data"
  log "Capturas restauradas."
fi

docker compose start app
if wait_healthy 180; then log "Restauração concluída e app no ar."; else log "ERRO: o app não subiu. Veja: docker compose logs app"; exit 1; fi
