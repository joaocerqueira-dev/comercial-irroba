#!/usr/bin/env bash
# Backup do banco (cópia consistente com o app rodando) e das capturas.
# Destino: BACKUP_DIR (padrão ~/irroba-backups). Guarda o banco por KEEP_DAYS (14)
# e as capturas por CAPTURES_KEEP_DAYS (7). Copie a pasta para outro disco de vez em quando.
source "$(dirname "$0")/lib.sh"

DEST="${BACKUP_DIR:-$HOME/irroba-backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
CAPTURES_KEEP_DAYS="${CAPTURES_KEEP_DAYS:-7}"
STAMP="$(date +%F_%H%M)"
mkdir -p "$DEST"

if [ -z "$(app_container)" ]; then log "O app não está rodando. Suba com ./deploy.sh antes."; exit 1; fi

log "Copiando o banco..."
docker compose exec -T app sh -c 'rm -f /app/data/backup.db'
docker compose exec -T app node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.\$executeRawUnsafe(\"VACUUM INTO '/app/data/backup.db'\").then(()=>p.\$disconnect()).catch(e=>{console.error(e.message);process.exit(1)})"
docker compose cp app:/app/data/backup.db "$DEST/db-$STAMP.db"
docker compose exec -T app rm -f /app/data/backup.db
log "Banco salvo em $DEST/db-$STAMP.db ($(du -h "$DEST/db-$STAMP.db" | cut -f1))."

log "Compactando as capturas..."
docker run --rm -v irroba-homolog_app-captures:/src:ro -v "$DEST":/out alpine:3.20 \
  sh -c "tar czf /out/captures-$STAMP.tgz -C /src . && chown $(id -u):$(id -g) /out/captures-$STAMP.tgz"
log "Capturas salvas em $DEST/captures-$STAMP.tgz ($(du -h "$DEST/captures-$STAMP.tgz" | cut -f1))."

find "$DEST" -maxdepth 1 -name 'db-*.db' -mtime "+$KEEP_DAYS" -delete
find "$DEST" -maxdepth 1 -name 'captures-*.tgz' -mtime "+$CAPTURES_KEEP_DAYS" -delete
log "Backup concluído."
