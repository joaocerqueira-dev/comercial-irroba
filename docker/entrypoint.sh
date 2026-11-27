#!/bin/sh
set -eu

# Diretórios persistentes (volumes). Precisam existir e ser graváveis pelo pwuser.
for dir in /app/data /app/public/captures; do
  mkdir -p "$dir"
  if [ ! -w "$dir" ]; then
    echo "entrypoint: $dir não é gravável por $(id -un) (uid $(id -u)). Ajuste o dono do volume." >&2
    exit 1
  fi
done

# Chaves de IA dos usuários são cifradas com AI_KEYS_SECRET (mín. 32 caracteres).
s="${AI_KEYS_SECRET:-}"
if [ "${#s}" -lt 32 ]; then
  echo "entrypoint: defina AI_KEYS_SECRET com pelo menos 32 caracteres (ex.: openssl rand -base64 48)." >&2
  exit 1
fi

# Sincroniza o schema do SQLite (o client já foi gerado no build).
node /opt/prisma-cli/node_modules/prisma/build/index.js db push \
  --skip-generate --schema /app/prisma/schema.prisma

exec node server.js
