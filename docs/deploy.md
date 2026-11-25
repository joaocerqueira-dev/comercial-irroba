# Deploy com Docker

## Subir

```bash
cp .env.example .env   # preencha ADMIN_USER, ADMIN_PASS, GEMINI_API_KEY, PUBLIC_ASSET_BASE_URL
docker compose build
docker compose up -d
docker compose ps      # status "healthy" depois de ~30s
```

O app fica em `http://localhost:3000`. Em produção, `ADMIN_USER` e `ADMIN_PASS` são obrigatórios. Sem eles a área interna responde 503.

Na inicialização, o entrypoint (`docker/entrypoint.sh`) roda `prisma db push --skip-generate` e depois `node server.js` (build `standalone` do Next). O healthcheck chama `GET /api/health`, rota pública que devolve `{"ok":true}`.

A imagem usa `mcr.microsoft.com/playwright:<versão>-noble` e roda como `pwuser` (não-root), o que permite manter o sandbox do Chromium. Ao atualizar o pacote `playwright`, atualize também a tag da imagem no `Dockerfile` (`ARG PLAYWRIGHT_IMAGE`).

## Volumes e backup

| Volume | Caminho no container | Conteúdo |
|---|---|---|
| `app-data` | `/app/data` | SQLite (`prod.db`) |
| `app-captures` | `/app/public/captures` | screenshots, uploads e imagens geradas |

`DATABASE_URL` é fixado em `file:/app/data/prod.db` pelo compose. Qualquer valor no `.env` é ignorado.

Backup do SQLite, consistente mesmo com o app rodando:

```bash
docker compose exec app node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().\$executeRawUnsafe(\"VACUUM INTO '/app/data/backup.db'\").then(()=>process.exit(0))"
docker compose cp app:/app/data/backup.db ./backup-$(date +%F).db
docker compose exec app rm /app/data/backup.db
```

Backup das capturas:

```bash
docker run --rm -v irroba-preview-ai_app-captures:/src -v "$PWD":/out alpine \
  tar czf /out/captures-$(date +%F).tgz -C /src .
```

O nome real do volume aparece em `docker volume ls`. O prefixo é o nome do projeto do compose.

Rode só uma réplica: SQLite e os limites em memória não são compartilhados entre instâncias.

## Reverse proxy (nginx)

Exponha o app apenas pelo proxy, com TLS. Exemplo:

```nginx
server {
    listen 443 ssl http2;
    server_name preview.exemplo.com.br;

    ssl_certificate     /etc/letsencrypt/live/preview.exemplo.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/preview.exemplo.com.br/privkey.pem;

    # Uploads de imagem e payloads do Studio.
    client_max_body_size 16m;

    # HSTS fica no proxy, não no app.
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        # Sobrescreve (não concatena) o X-Forwarded-For enviado pelo cliente,
        # para que o app não confie em IPs forjados.
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Real-IP $remote_addr;

        # Geração de preview usa SSE e pode levar minutos.
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
}
```

Com o proxy na mesma máquina, publique a porta só em loopback: `"127.0.0.1:3000:3000"` no `docker-compose.yml`.

## Egress do Chromium (opcional, recomendado)

O app já valida URLs contra IPs privados. Como defesa extra contra SSRF, bloqueie no host a saída do container para redes internas e para o endpoint de metadados da nuvem:

```bash
# Subrede da rede do compose: docker network inspect irroba-preview-ai_default
SUBNET=172.18.0.0/16
for dst in 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16 169.254.0.0/16 100.64.0.0/10; do
  iptables -I DOCKER-USER -s "$SUBNET" -d "$dst" -m conntrack --ctstate NEW -j REJECT
done
# Libere antes o que for necessário (ex.: DNS interno), com regras ACCEPT inseridas acima destas.
```

Persista as regras com `iptables-persistent`, ou equivalente, e teste se a geração de preview continua funcionando com uma loja real.
