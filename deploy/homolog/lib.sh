# Funções comuns dos scripts de homologação. Carregado com "source", não execute direto.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

if [ ! -f .env ]; then
  echo "Falta o arquivo .env nesta pasta. Rode: cp .env.example .env e preencha." >&2
  exit 1
fi

DEFAULT_IMAGE="ghcr.io/joaocerqueira-dev/comercial-irroba"
PREVIOUS_IMAGE="irroba-homolog-app"   # cópia local da versão anterior, para o rollback automático
STATE_DIR=".state"
mkdir -p "$STATE_DIR"

log() { printf '[%s] %s\n' "$(date '+%F %T')" "$*"; }

env_value() { # env_value CHAVE PADRAO
  local v
  v="$(grep -E "^$1=" .env | tail -n1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' || true)"
  printf '%s' "${v:-$2}"
}

image_ref() { printf '%s:%s' "$(env_value APP_IMAGE "$DEFAULT_IMAGE")" "$(env_value APP_TAG main)"; }

app_container() { docker compose ps -q app 2>/dev/null || true; }

running_image_id() {
  local c; c="$(app_container)"
  [ -n "$c" ] && docker inspect -f '{{.Image}}' "$c" 2>/dev/null || true
}

revision_of() { # commit do GitHub gravado na imagem pela CI
  local r
  r="$(docker image inspect -f '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$1" 2>/dev/null || true)"
  [ "$r" = "<no value>" ] && r=""
  printf '%s' "${r:0:7}"
}

wait_healthy() { # wait_healthy SEGUNDOS
  local deadline=$((SECONDS + $1)) c status
  while [ "$SECONDS" -lt "$deadline" ]; do
    c="$(app_container)"
    if [ -n "$c" ]; then
      status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$c" 2>/dev/null || echo unknown)"
      case "$status" in
        healthy) return 0 ;;
        unhealthy|exited|dead) return 1 ;;
      esac
    fi
    sleep 3
  done
  return 1
}
