# irroba-preview-ai

Ferramenta interna do time comercial da Irroba. Recebe a URL da loja atual de um prospect, captura e analisa o site e gera uma prévia de como a loja ficaria na plataforma Irroba (Tema LIME). O consultor ajusta a prévia num Studio de edição visual e envia ao cliente um link público, que mostra o comparativo entre a loja atual e a nova e tem um botão de WhatsApp para o consultor.

O que o app faz hoje:

- **Geração** (`/`): o consultor informa a URL da loja e, opcionalmente, o próprio WhatsApp. O progresso chega por SSE. O Chromium (Playwright) captura screenshots desktop e mobile e extrai logo, cores, banners, categorias e produtos.
- **Identidade visual**: com a IA do próprio usuário (cadastrada em `/conta/ia`), a IA analisa os screenshots e refina o blueprint (modo `ai`). Sem IA configurada, um blueprint heurístico é montado a partir dos dados extraídos (modo `heuristic`). Se faltar imagem para o banner principal, o app tenta gerar uma arte por IA.
- **Studio** (`/studio/[id]`): edição visual da vitrine (seleção de elementos no iframe, banners, produtos, cores, fontes, barra de anúncios, links do cabeçalho), upload de imagens, geração e edição de imagens por IA, recaptura mobile, reanálise, comparativo mobile/desktop e painel de exportação. A exportação traz os campos do LIME, os checklists de tema e de banners e o CSV de produtos.
- **Link público** (`/preview/[slug]`): página sem login para o cliente, marcada com `noindex`.

Plano de auditoria e refatoração, com as fases e o que já foi feito: [`docs/PLANO-AUDITORIA.md`](docs/PLANO-AUDITORIA.md).

## Stack

- Next.js 15 (App Router, build `standalone`), React 19 e TypeScript
- Tailwind CSS 3
- Prisma 6 com SQLite
- Playwright (Chromium) para captura e extração, mais Cheerio
- Vercel AI SDK (OpenAI, Anthropic, Google, OpenAI-compatível) com a IA de cada usuário
- `sharp` para normalizar uploads e gerar miniaturas
- `undici` para o `fetch` com proteção contra SSRF
- Zod para validar o blueprint e os payloads
- Vitest e Testing Library para os testes, ESLint e Prettier

## Setup local

Requisitos: Node 22+ (a CI usa Node 22) e as dependências de sistema do Chromium. No Linux, `npx playwright install --with-deps chromium` instala as duas coisas.

```bash
npm ci
npx playwright install chromium
cp .env.example .env        # ajuste o que precisar (veja "Variáveis de ambiente")
npm run db:push             # cria/sincroniza o SQLite em prisma/dev.db
npm run dev                 # http://localhost:3000
```

No primeiro boot, sem nenhum usuário, `ADMIN_EMAIL` e `ADMIN_PASS` criam o primeiro admin (que precisa trocar a senha no primeiro login). Sem IA configurada em `/conta/ia`, a geração funciona no modo heurístico, e as imagens "por IA" saem do fallback local: uma arte composta com a paleta da marca e renderizada em PNG pelo Chromium.

Arquivos gerados (screenshots, espelhos de imagem, uploads e artes de IA) vão para `public/captures/` e são servidos por `/api/captures/<arquivo>`. A pasta não é versionada.

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento do Next |
| `npm run build` | build de produção (`output: "standalone"`). Precisa de rede para baixar as fontes do Google Fonts (ver `docs/deploy.md`) |
| `npm start` | `next start`. Na imagem Docker o app roda via `node server.js` do standalone |
| `npm run lint` | ESLint em `src/` |
| `npm test` | Vitest (`vitest run`), testes em `src/**/*.test.{ts,tsx}` |
| `npm run db:push` | `prisma db push`: aplica `prisma/schema.prisma` ao banco |
| `npm run db:generate` | `prisma generate`: regenera o client do Prisma |
| `npm run captures:gc` | coleta de lixo de `public/captures`. Por padrão é dry-run; `npm run captures:gc -- --apply` apaga de fato |
| `npm run format` | Prettier em `src/**/*.{ts,tsx}` |

Antes de abrir um PR, rode também `npx tsc --noEmit`, como a CI faz.

## Variáveis de ambiente

Modelo comentado em [`.env.example`](.env.example).

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | URL do SQLite. Local: `file:./dev.db`, relativo a `prisma/`. No Docker, o compose fixa `file:/app/data/prod.db` e ignora o valor do `.env` |
| `ADMIN_EMAIL` / `ADMIN_PASS` | no primeiro boot | Criam o primeiro admin quando não há usuários; o admin é obrigado a trocar a senha no primeiro login. Depois, o admin gerencia os usuários em `/admin/usuarios`. As propostas sem dono passam para o admin mais antigo |
| `PUBLIC_ASSET_BASE_URL` | recomendada em produção | Base pública (domínio/CDN) onde `/api/captures/*` responde. O Studio a usa para escrever URLs absolutas no material exportado para o painel da Irroba |
| `TRUST_PROXY` | não | `1` faz o app ler o IP do cliente do `X-Forwarded-For` (hop mais à direita) ou do `X-Real-IP`. Use só atrás de um proxy confiável que sobrescreva esses headers. Sem isso, o rate limit usa a chave `unknown` para o IP |
| `RATE_LIMIT_PER_MIN` | não | Requisições por minuto por usuário+IP nas rotas caras (`generate`, `reanalyze`, `ai-image`, `mobile-capture`). Padrão 30 |
| `MAX_BROWSER_JOBS` | não | Jobs simultâneos do Chromium (geração, arte de IA, recaptura mobile). Padrão 2 |
| `PLAYWRIGHT_NO_SANDBOX` | não | `1` desliga o sandbox do Chromium. É só um escape para dev em WSL/CI ou container sem perfil seccomp adequado. Evite em produção: o navegador abre sites de terceiros |

O app também lê `NODE_ENV` (o modo produção exige o login) e `NEXT_RUNTIME`, ambas definidas pelo Next. A imagem Docker define ainda `PORT`, `HOSTNAME` e `PLAYWRIGHT_BROWSERS_PATH`.

## Arquitetura

```
URL da loja
  └─ scraper (src/lib/scraper)       Chromium: screenshots desktop/mobile, extração, detecção de plataforma
      └─ architect (src/lib/ai)      IA do usuário ou heurística → StoreBlueprint (validado com Zod)
          └─ blueprint (SQLite)      StorePreview: extractedData, blueprint, compiledExport
              └─ compiler (src/lib/irroba-blocks)
                  ├─ HTML da vitrine → /render/[slug] (iframe do Studio e do link público)
                  └─ export Irroba   → campos LIME, checklists, CSV de produtos
                      └─ Studio (/studio/[id]) edita o blueprint (PATCH) e recompila
```

- `src/lib/scraper`: abre a loja no Chromium compartilhado, com navegação protegida, e extrai os dados. Faz também os screenshots mobile.
- `src/lib/ai`: o `architect` monta o blueprint, heurístico como base e refinado pela IA do usuário quando configurada. O `image-studio` gera e edita imagens: usa a IA de imagem do usuário (Gemini ou OpenAI; melhorar e redimensionar só com Gemini). Sem IA de imagem, a geração de imagens fica desativada.
- `src/lib/types/blueprint.ts`: schema Zod do `StoreBlueprint`, a fonte de verdade que o Studio edita.
- `src/lib/layout-patterns`: padrões de geração (paleta, layout, tipografia, textos, modelos de IA). Tem [README próprio](src/lib/layout-patterns/README.md).
- `src/lib/irroba-blocks`: compilador do blueprint para o HTML/CSS/JS da vitrine (com o runtime do inspetor do Studio), para o export da Irroba e para o CSV, além da sanitização de HTML, CSS, URLs e células CSV.
- `src/components/studio`: componentes do editor visual (painéis, controles e inspetor de elementos), usados pela página do Studio.
- `src/app/api/previews/*`: geração (SSE), CRUD do preview, reanálise, imagem por IA, upload, recaptura mobile e CSV.

Previews presos em `processing` há mais de 30 minutos são apagados no boot (`instrumentation.ts`) e, no máximo a cada 10 minutos, quando há uma nova geração.

### Rotas públicas e autenticadas

O `src/middleware.ts` exige login por usuário em `/`, `/studio/*` e `/api/*`, com exceção de:

- `/preview/[slug]`: link do cliente
- `/render/[slug]`: HTML da vitrine compilada
- `/api/captures/*`: imagens
- `/api/health`: healthcheck, devolve `{"ok":true}`

### Modelo de segurança

- **SSRF**: a URL informada passa por `assertPublicHttpUrl`, que recusa IPs privados, loopback e link-local, inclusive IPv6. O `fetch` do Node usa `fetchPublic`, que valida cada redirect, com um `undici.Agent` que confere o IP na hora da conexão (`src/lib/net/safe-dispatcher.ts`) e fecha a janela de DNS rebinding. No Chromium, `page.route` barra requisições para destinos internos e a cadeia de redirects é conferida (`src/lib/scraper/page-guard.ts`). O resolvedor DNS do Chromium é próprio, por isso a regra de egress no host continua recomendada (ver `docs/deploy.md`).
- **Sandbox do Chromium**: ligado por padrão. A imagem Docker roda como usuário não-root (`pwuser`).
- **Isolamento da vitrine**: o HTML gerado a partir da loja de terceiros roda em iframes com `sandbox` sem `allow-same-origin` (origem opaca) e conversa com o app só por `postMessage` (`src/lib/security/preview-isolation.ts`). O `/render/[slug]` responde com uma CSP restritiva (`default-src 'none'`, `form-action 'none'`, `frame-ancestors 'self'` e a diretiva `sandbox`).
- **Headers**: `X-Content-Type-Options: nosniff`, `Referrer-Policy` e `X-Frame-Options: SAMEORIGIN` em todas as rotas (`next.config.ts`). `/api/captures/*` serve só extensões de imagem, com CSP `sandbox`. O HSTS fica no reverse proxy.
- **Uploads**: até 15 MB. As imagens são reprocessadas com `sharp`, com limite de dimensão e de pixels.
- **CSV**: células escapadas contra injeção de fórmula.
- **Rate limit e concorrência**: token bucket por usuário+IP nas rotas caras e semáforo de jobs do Chromium. Os dois ficam em memória, o que só vale para **uma réplica**.

## Docker

Resumo:

```bash
cp .env.example .env   # ADMIN_EMAIL, ADMIN_PASS, PUBLIC_ASSET_BASE_URL
docker compose build
docker compose up -d
```

A imagem parte de `mcr.microsoft.com/playwright` (Node 22 + Chromium). O entrypoint roda `prisma db push` e sobe o `server.js` do standalone. Há dois volumes: `app-data`, com o SQLite, e `app-captures`, com as imagens. O healthcheck chama `/api/health`.

Runbook completo (reverse proxy, backup/restore, atualização, `captures:gc` no cron, troubleshooting do sandbox, rotação de senha): [`docs/deploy.md`](docs/deploy.md).

## Testes

```bash
npm test
```

- Unitários e de rota (Vitest, ambiente `node`): compilador, sanitização, SSRF (`safe-url`, `safe-fetch`, `safe-dispatcher`), rate limit, rotas da API com Prisma mockado, uploads, SSE, extração a partir de fixtures HTML e outros.
- **E2E com Chromium real**, sem rede: `e2e-smoke` (a vitrine carrega sem erros e o inspetor do Studio responde a hover e clique), `e2e-isolation` (o iframe sandbox com a CSP real fica isolado) e os testes de redirect e launch do navegador. Eles exigem `npx playwright install chromium`. **Se o Chromium não abrir, esses testes são pulados** (`describe.skipIf`), então confira na saída se rodaram.
- `PLAYWRIGHT_NO_SANDBOX=1`: use em ambientes com user namespaces restritos (WSL, alguns runners de CI). A CI define essa variável para os testes de navegador não serem pulados em silêncio.
- **Golden snapshots**: `src/lib/__tests__/layout-patterns-golden.test.ts` congela a saída do compilador (HTML, export e CSV). Numa mudança intencional de layout, atualize com `npx vitest run -u` e revise o diff do `.snap`.

A CI (`.github/workflows/ci.yml`) roda `npm ci`, a instalação do Chromium, `prisma generate`, `tsc --noEmit`, lint e testes, e faz o build da imagem Docker sem push.

## Estrutura de pastas

```
src/
  app/                 rotas do Next: home (/), studio/[id], preview/[slug], render/[slug] e api/
  components/          clientes React (home, Studio, link público, comparativo)
    studio/            componentes do editor visual
    ui/                componentes de interface genéricos
  lib/
    scraper/           Chromium, extração, screenshots mobile, guarda de navegação
    ai/                architect (blueprint) e image-studio (imagens por IA)
    irroba-blocks/     compilador do blueprint para vitrine/export/CSV e sanitização
    layout-patterns/   padrões centralizados de layout, paleta, tipografia, textos e IA
    net/               SSRF guard, fetch seguro, rate limit e semáforo de navegador
    security/          sandbox de iframe e CSP do /render
    previews/          repositório, slug, status, limpeza de previews presos
    files/             gravação e miniaturas de public/captures
    types/             schema do blueprint (Zod)
    client/            utilitários de hooks e do navegador
    __tests__/         testes, fixtures e snapshots
  middleware.ts        login por usuário
prisma/                schema.prisma (SQLite)
scripts/               captures-gc.mjs
docker/                entrypoint.sh
docs/                  deploy.md e PLANO-AUDITORIA.md
public/captures/       arquivos gerados (não versionados)
```
