# Deploy com Docker

## Subir

```bash
cp .env.example .env   # preencha ADMIN_EMAIL, ADMIN_PASS, GEMINI_API_KEY, PUBLIC_ASSET_BASE_URL
docker compose build
docker compose up -d
docker compose ps      # status "healthy" depois de ~30s
```

O app fica em `http://localhost:3000`. Fora do localhost o login exige HTTPS (proxy reverso), porque o cookie de sessão é `Secure` em produção e o navegador não o grava em HTTP. O acesso é por login (e-mail e senha por usuário). `ADMIN_EMAIL` e `ADMIN_PASS` definem o primeiro admin, que troca a senha no primeiro acesso.

Na inicialização, o entrypoint (`docker/entrypoint.sh`) roda `prisma db push --skip-generate` e depois `node server.js` (build `standalone` do Next). O healthcheck chama `GET /api/health`, rota pública que devolve `{"ok":true}`.

A imagem usa `mcr.microsoft.com/playwright:<versão>-noble` e roda como `pwuser` (não-root), o que permite manter o sandbox do Chromium. Ao atualizar o pacote `playwright`, atualize também a tag da imagem no `Dockerfile` (`ARG PLAYWRIGHT_IMAGE`).

O `docker-compose.yml` aplica `security_opt: ["seccomp=./docker/seccomp-chromium.json"]`. O arquivo é o perfil seccomp oficial do Playwright (`utils/docker/seccomp_profile.json` do repositório `microsoft/playwright`): o perfil padrão do Docker mais `clone`, `setns` e `unshare`, que o sandbox do Chromium usa para criar namespaces sem root. Sob o seccomp padrão do Docker o Chromium pode não abrir com sandbox. Para atualizar o perfil:

```bash
curl -fsSL https://raw.githubusercontent.com/microsoft/playwright/main/utils/docker/seccomp_profile.json \
  -o docker/seccomp-chromium.json
docker compose up -d
```

No boot, o servidor tenta abrir o Chromium uma vez (`src/instrumentation.ts`). Se falhar, o servidor continua de pé e o log mostra `[boot] O Chromium não abriu: ...` com a solução; veja "Troubleshooting: sandbox do Chromium".

## Atualizar

```bash
cd /opt/irroba-preview-ai        # ou onde o repositório estiver
git pull
# backup do SQLite antes (seção "Volumes e backup")
# versão com login por usuário: defina ADMIN_EMAIL no .env (mantenha ADMIN_PASS) antes do up -d;
# sem isso ninguém consegue entrar (o bootstrap só registra um erro no log)
# link do cliente: defina SESSION_SECRET no .env (mín. 32 caracteres; openssl rand -base64 48), obrigatório em produção
docker compose build
docker compose up -d             # recria o container com a imagem nova
docker compose ps                # aguarde "healthy"
docker compose logs -f app       # confira o "db push" e o boot
```

O schema é aplicado no boot com `prisma db push`, sem migrations versionadas. Se uma mudança no `schema.prisma` implicar perda de dados, como remover uma coluna ou adicionar um `@unique`, o `db push` recusa e o entrypoint sai com erro. O container entra em restart em loop e o motivo aparece em `docker compose logs app`. Nesse caso, volte a imagem anterior ou aplique a mudança manualmente depois do backup. Não use `--accept-data-loss` sem backup.

Ao atualizar o pacote `playwright`, mude também `ARG PLAYWRIGHT_IMAGE` no `Dockerfile` para a mesma versão. Com versões diferentes, o Chromium esperado pelo pacote não existe em `/ms-playwright`.

## Build precisa de rede (fontes)

As fontes do app (Inter, Montserrat, Nunito e Instrument Serif) vêm do `next/font/google` em `src/app/layout.tsx`. O `next build` baixa os arquivos do Google Fonts e os embute no bundle; em runtime o app serve as fontes do próprio domínio, sem chamar o Google. Por isso o `docker compose build` e a CI precisam de acesso a `fonts.googleapis.com` e `fonts.gstatic.com` durante o build. Sem rede, o build falha ao buscar as fontes.

Para build offline, troque para `next/font/local` com os arquivos `.woff2` versionados no repositório (mesmas variáveis `--font-*`, que o `tailwind.config.ts` e o `globals.css` usam).

## Volumes e backup

| Volume | Caminho no container | Conteúdo |
|---|---|---|
| `app-data` | `/app/data` | SQLite (`prod.db`) |
| `app-captures` | `/app/public/captures` | screenshots, uploads e imagens geradas |

`DATABASE_URL` é fixado em `file:/app/data/prod.db` pelo compose. Qualquer valor no `.env` é ignorado.

`SESSION_SECRET` assina o cookie de acesso ao link do cliente. Em produção é obrigatório, com pelo menos 32 caracteres (`openssl rand -base64 48`). Sem ele o link do cliente não abre.

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

### Restore do SQLite

Pare o app antes de trocar o arquivo do banco:

```bash
docker compose stop app
docker run --rm -v irroba-preview-ai_app-data:/data -v "$PWD":/in alpine sh -c \
  'cp /in/backup-AAAA-MM-DD.db /data/prod.db && rm -f /data/prod.db-journal && chown "$(stat -c %u:%g /data)" /data/prod.db'
docker compose start app
```

O `chown` devolve o arquivo ao dono do volume, que é o `pwuser`. Sem ele o arquivo fica do root do container alpine, e o `prisma db push` do boot ou as gravações do app falham. Para restaurar as capturas, use o mesmo padrão: `tar xzf /in/captures-AAAA-MM-DD.tgz -C /data` montando o volume `app-captures`. Restaure banco e capturas da mesma data, porque os previews citam os arquivos pelo nome.

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

Atrás desse proxy, defina `TRUST_PROXY=1` no `.env`. Assim o rate limit passa a usar o IP real do cliente, lido do `X-Forwarded-For`. Sem a variável, todas as requisições caem na chave `unknown` e o limite fica separado só por usuário. Não defina `TRUST_PROXY` se o app estiver exposto sem proxy: o header seria forjável.

## Egress do Chromium (opcional, recomendado)

O app já valida URLs contra IPs privados. No `fetch` do Node (`fetchPublic`), a validação também acontece na hora da conexão: um `undici.Agent` com `connect.lookup` próprio (`src/lib/net/safe-dispatcher.ts`) recusa o socket se o DNS resolver para IP interno, o que fecha a janela de DNS rebinding entre checar e conectar.

Essa proteção **não vale para o Chromium** do Playwright, que tem resolvedor DNS próprio. Lá a defesa é o `page.route` com a checagem de `response.url()` (`src/lib/scraper/page-guard.ts`) e o sandbox do container. Um domínio que troca de IP entre a checagem e a conexão do Chromium só é barrado pela regra de egress abaixo. Como defesa extra contra SSRF, bloqueie no host a saída do container para redes internas e para o endpoint de metadados da nuvem:

```bash
# Subrede da rede do compose: docker network inspect irroba-preview-ai_default
SUBNET=172.18.0.0/16
for dst in 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16 169.254.0.0/16 100.64.0.0/10; do
  iptables -I DOCKER-USER -s "$SUBNET" -d "$dst" -m conntrack --ctstate NEW -j REJECT
done
# Libere antes o que for necessário (ex.: DNS interno), com regras ACCEPT inseridas acima destas.
```

Persista as regras com `iptables-persistent`, ou equivalente, e teste se a geração de preview continua funcionando com uma loja real.

## Limpeza de disco (`captures:gc`)

`public/captures` acumula screenshots, espelhos de imagem, uploads e artes de IA. Excluir um preview já apaga os arquivos dele, mas sobram órfãos de gerações antigas, de imagens de IA geradas e não usadas e de versões anteriores do app. O script `scripts/captures-gc.mjs` remove os arquivos que não pertencem a nenhum preview do banco:

- mantém tudo que algum preview cita (`/api/captures/<nome>`) ou que começa com o prefixo de um preview existente;
- ignora arquivos modificados há menos de 60 minutos (`--min-age-minutes` muda isso);
- remove as miniaturas (`.thumbs/`) cujo original saiu.

O modo padrão é **dry-run**: só lista o que sairia. Para apagar, passe `--apply`.

```bash
# Conferir antes (dry-run)
docker compose exec -T app node scripts/captures-gc.mjs
# Apagar
docker compose exec -T app node scripts/captures-gc.mjs --apply
```

Fora do Docker: `npm run captures:gc` (dry-run) e `npm run captures:gc -- --apply`.

Cron no host, diário às 4h, com log:

```cron
0 4 * * * cd /opt/irroba-preview-ai && docker compose exec -T app node scripts/captures-gc.mjs --apply >> /var/log/irroba-captures-gc.log 2>&1
```

Faça o backup das capturas (seção acima) antes da primeira execução com `--apply`.

## Troubleshooting: sandbox do Chromium

O sandbox fica ligado por padrão (`chromiumSandbox: true` em `src/lib/scraper/browser.ts`). Se o Chromium não abrir, o boot loga `[boot] O Chromium não abriu: ...`, a geração falha e o log mostra:

```
[browser] O Chromium não abriu com sandbox. Use a imagem oficial do Playwright com usuário não-root e perfil seccomp, ou, como último recurso, PLAYWRIGHT_NO_SANDBOX=1.
```

Verifique, nesta ordem:

1. **Usuário**: o container precisa rodar como `pwuser`, e não como root. `docker compose exec app id` deve mostrar `pwuser`. Um `user:` no compose ou um `docker run --user root` quebra o sandbox.
2. **Seccomp/AppArmor do host**: o compose já aplica o perfil do Playwright (`docker/seccomp-chromium.json`). Confira com `docker inspect --format '{{.HostConfig.SecurityOpt}}' <container>`; se alguém trocou o `security_opt` ou subiu com `docker run` sem ele, o seccomp padrão volta. AppArmor de user namespaces em hosts Ubuntu recentes (`kernel.apparmor_restrict_unprivileged_userns=1`) e runtimes como gVisor também podem bloquear o sandbox.
3. **Memória compartilhada**: o compose já define `shm_size: 1gb` e o app passa `--disable-dev-shm-usage`. Crashes de aba em páginas grandes costumam vir daí, se alguém remover essas opções.
4. **Último recurso**: `PLAYWRIGHT_NO_SANDBOX=1` no `.env`, seguido de `docker compose up -d`. O Chromium abre sites de terceiros, então use só temporariamente e, de preferência, com a regra de egress da seção acima.

Para testar sem gerar um preview:

```bash
docker compose exec app node -e "require('playwright').chromium.launch({chromiumSandbox:true}).then(b=>{console.log('ok');return b.close()}).catch(e=>{console.error(e.message);process.exit(1)})"
```

## Primeiro admin e redefinição de senhas

1. O primeiro admin nasce de `ADMIN_EMAIL` e `ADMIN_PASS` do `.env` quando ainda não há usuários. Ele é obrigado a trocar a senha no primeiro login.
2. Depois disso, as demais contas e as redefinições de senha são feitas por um admin. Quem recebe uma senha temporária troca em `/conta/senha`.
3. Alterar `ADMIN_PASS` no `.env` **não** muda a senha de um admin já criado.
4. Trocar a senha encerra as outras sessões do usuário.

Os links públicos (`/preview/*`, `/render/*`, `/api/captures/*`) não exigem login e continuam funcionando. Recriar o container também zera os contadores do rate limit, que ficam em memória.
