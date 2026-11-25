# Plano de execução pós-auditoria, irroba-preview-ai

## Contexto
A auditoria (seção A) mostrou que o projeto está saudável na superfície: TypeScript sem erros, lint limpo e 111 testes passando. Mas há lacunas de segurança graves, porque o app raspa sites não confiáveis com um Chromium headless. Também há bugs de estado no editor, um design system aplicado pela metade e três god files.

Decisões já tomadas:
- **Produção roda em Docker/container.**
- **Escopo: tudo, em fases.**
- **O design system já está mergeado na `main`.** Cada fase sai da `main` em branch e PR próprios.

⚠️ **Conferir antes de começar:** pelas referências locais, o commit do design system (`2ade05e`) só está em `feat/design-system-irroba`. A `origin/main` local para em `60c7ef6`, e a `main` local está 1 commit atrás da `origin/main`. Se o merge foi feito no GitHub, basta rodar `git fetch && git checkout main && git pull` antes da fase 0. Se não foi, abrir e mergear o PR primeiro.

Hoje o repositório **não tem Dockerfile nem CI**. Por isso o plano começa pela infraestrutura, que viabiliza tirar o `--no-sandbox` e roda os testes automaticamente em cada PR.

---

## A. Resumo da auditoria (situação atual)

| Área | Estado |
|---|---|
| Typecheck / Lint / Testes | ✅ 0 erros / limpo / 111 testes em 19 arquivos (unit, rotas, jsdom, E2E Playwright, golden snapshots) |
| `npm audit` (prod) | ⚠️ 7 altas, 3 moderadas: zod via `@google/genai@0.14`, postcss, deepmerge-ts, effect, uuid |
| Infra | ❌ Sem Dockerfile e sem CI. SQLite e `public/captures` (189 MB, 444 arquivos) sem volume nem limpeza |
| Segurança alta | SSRF por redirect (`store-extractor.ts:679,764`). Injeção via MIME no render IA (`image-studio.ts:136,363`). Chromium `--no-sandbox` (`browser.ts:14`). Rota pública que dispara Playwright (`/api/captures/mobile`). Sem rate limit. Iframes sem `sandbox` na mesma origem |
| Segurança média | Filtro de SVG por regex, downloads sem teto, CSV com injeção de fórmula, chave Gemini na query string, `postMessage("*")`, race no singleton do browser, TOCTOU de DNS |
| Bugs de frontend | Corrida no `handleSave` (`StudioClient.tsx:267`), SSE travando `isGenerating` (`page.tsx:113`), foco do `Modal` saltando, fallback errado no Inspector (`ElementInspectorPanel.tsx:64`) |
| Manutenibilidade | `compiler.ts` (3.455 linhas), `StudioClient.tsx` (3.027), `ElementInspectorPanel.tsx` (2.845). Editores de banner e "adicionar categoria" duplicados |
| Design system | O editor (`studio/*`) continua em `slate-*` (cerca de 350 usos) e as páginas em `zinc`/`irroba-*`. Tokens duplicados. Cerca de 95 hex fixos no compiler. Componentes `ui/` não usados |
| A11y | 64 campos do Inspector sem label associado. Botões só de ícone sem `aria-label`. Sem `prefers-reduced-motion` |

Pontos fortes que vamos preservar:
- O escape do compiler está correto.
- `safe-url`/`fetchPublic` é robusto.
- `captures/[filename]` não tem path traversal.
- O Basic auth bloqueia em produção quando não está configurado.
- Os golden snapshots já protegem o output do compiler.

---

## B. Roadmap

Cada fase vira uma branch a partir da `main`, um PR e um merge. Uma fase só começa depois que a anterior foi mergeada (exceto onde indicado).

| # | Branch | Foco | Esforço | Depende de |
|---|---|---|---|---|
| 0 | `chore/infra-docker-ci` | Dockerfile, compose, CI | M | – |
| 1 | `fix/seguranca-critica` | SSRF, MIME, sandbox, rate limit | M | 0 (sandbox) |
| 2 | `fix/isolamento-preview` | iframes sandbox, CSP, postMessage | M | 1 |
| 3 | `fix/bugs-editor` | handleSave, SSE, Modal, Inspector | P | – (paralelo a 1/2) |
| 4 | `fix/robustez-backend` | zod, limites, limpeza, índices | M | 1 |
| 5 | `chore/deps` | audit fix, `@google/genai` 1.x+ | M | 4 |
| 6 | `refactor/design-system-a11y` | slate→zinc/irroba, tokens, labels | M | 3 |
| 7 | `refactor/god-files` | separar Studio, Inspector e compiler | G | 3, 6 |
| 8 | `docs/readme` | README, `.env.example`, runbook | P | 0 |

Esforço: P é cerca de meio dia, M é 1 a 2 dias e G é 3 dias ou mais.

---

## C. Detalhamento por fase

### Fase 0: infraestrutura (Docker e CI)
- **`Dockerfile`** (multi-stage):
  - Base `mcr.microsoft.com/playwright:v1.52.0-noble`, com a mesma versão do `playwright` do lockfile.
  - Etapas: `npm ci` → `prisma generate` → `next build` → imagem final com `output: "standalone"`. É preciso adicionar `output: "standalone"` em `next.config.ts`.
  - Roda como usuário não-root `pwuser`, o que permite usar o sandbox do Chromium.
- **`docker-compose.yml`**:
  - Volumes para `/app/data` (SQLite via `DATABASE_URL=file:/app/data/prod.db`) e `/app/public/captures`.
  - `env_file`, `init: true`, `shm_size: 1gb` (substitui o `--disable-dev-shm-usage`).
  - O seccomp padrão do Docker já permite user namespaces no Chromium. Se não permitir, usar o perfil seccomp oficial do Playwright.
- **`.dockerignore`**: `node_modules`, `.next`, `.env`, `prisma/dev.db`, `public/captures/*`.
- **Entrypoint**: `prisma db push --skip-generate` (ou `migrate deploy`, se adotarmos migrations) e depois `node server.js`.
- **CI** em `.github/workflows/ci.yml`:
  - Node 22, `npm ci`, `npx playwright install --with-deps chromium`, `tsc --noEmit`, `npm run lint`, `npm test`.
  - Mais um job `docker build`, para validar a imagem.
- **Critério de aceite**: `docker compose up` sobe o app, gera um preview real e persiste depois de um restart. A CI fica verde.

### Fase 1: segurança crítica
1. **SSRF**:
   - Em `src/lib/scraper/store-extractor.ts:679` e `:764`, trocar `fetch` por `fetchPublic` (`src/lib/net/safe-fetch.ts`).
   - Adicionar a `fetchPublic` a opção `maxBytes` (padrão 5 MB para HTML), lendo o stream com corte quando passar do limite.
2. **Redirects no Playwright**:
   - Em `store-extractor.ts:797-808` e `mobile-screenshot.ts:239-251`, garantir que o handler de `page.route` valide toda navegação, inclusive a redirecionada.
   - Depois do `goto`, checar `response.url()` com `assertPublicUrl`.
   - Cobrir com teste (servidor local que responde 302 para 127.0.0.1).
3. **Render de arte IA** (`src/lib/ai/image-studio.ts`):
   - Allowlist `image/(png|jpeg|webp|avif|gif)`. Qualquer outro MIME vira `image/jpeg`.
   - Teto de 10 MB no download.
   - Chave Gemini via header `x-goog-api-key` (linhas 182 e 306).
   - `page.route("**", abort)` no contexto do `setContent`, porque ele só precisa de data URIs e das fontes do Google.
4. **Chromium** (`src/lib/scraper/browser.ts`):
   - Tirar `--no-sandbox` e `--disable-setuid-sandbox` por padrão. Mantê-los só com `PLAYWRIGHT_NO_SANDBOX=1`, como escape para dev em WSL ou CI.
   - Corrigir a race: usar uma promise de launch compartilhada. No handler `disconnected`, zerar o `browserPromise` apenas se for a mesma instância.
5. **Rota mobile pública**: hoje `StoreCompareView.tsx:94` faz POST automático em `/api/captures/mobile/[slug]`, inclusive para o prospect sem login em `/preview/[slug]`. Bloquear a rota sem mais nada deixaria o cliente sem a captura mobile. A correção tem três partes:
   - Gerar o screenshot mobile dentro do `POST /api/previews/generate`, como uma etapa a mais do SSE.
   - `GET /api/captures/mobile/[slug]` passa a só servir o cache, e o `POST` público é removido.
   - A recaptura sob demanda vai para uma rota autenticada nova, `/api/previews/[id]/mobile-capture`. O `StoreCompareView` usa essa rota quando está no Studio e o GET de cache quando está no preview público.
6. **Rate limit e concorrência**: novo `src/lib/net/rate-limit.ts` com dois mecanismos.
   - **IP do cliente:** `x-forwarded-for` só é lido com `TRUST_PROXY=1`, e nesse caso vale o hop mais à direita, adicionado pelo proxy confiável. Sem `TRUST_PROXY`, usar o IP da conexão. Documentar no README e no `.env.example`.
   - **Limites:** generosos nas rotas autenticadas, porque o time comercial costuma compartilhar o mesmo IP de NAT do escritório. Usar a chave `usuário+IP` (o usuário do Basic auth) e um limite alto, como 30/min, focado em abuso. Limites rígidos só nas rotas públicas.
   - **Semáforo `withBrowserSlot(fn, { signal })`:** usa `MAX_BROWSER_JOBS` (padrão 2), aceita `AbortSignal` e tira da fila as requisições canceladas, com timeout de espera. Aplicar só em quem usa Playwright: `generate`, `ai-image` (render da arte) e a recaptura mobile.
   - **`reanalyze`:** não usa Playwright, só o Gemini. Entra no rate limit, mas não no semáforo.
   - Em memória é suficiente, já que é um container com uma réplica (documentado).
7. **CSV**: em `src/lib/irroba-blocks/sanitize.ts:80`, prefixar `'` quando a célula começar com `= + - @ \t \r`.
- **Testes novos**: redirect para IP interno (fetch e Playwright), MIME com aspas, CSV com fórmula, 429 do rate limit, `isPublicPath` e o comportamento da rota mobile sem autenticação.

### Fase 2: isolamento do preview
- Usar `sandbox="allow-scripts allow-popups"`, sem `allow-same-origin`, em:
  - `StudioClient.tsx:2980`
  - `StoreCompareView.tsx:511,549`
  - `PreviewViewerClient.tsx:155`
- O sync de scroll do `StoreCompareView` (linhas 146 e 165, que hoje usam `contentDocument`) passa a usar mensagens `postMessage` (`{type:"irroba-scroll", ratio}`), emitidas pelo runtime do `compiler.ts`.
- `postMessage`:
  - No iframe, enviar para `parent` e aceitar só `e.source === window.parent`.
  - No pai, aceitar só `e.source === iframeRef.current.contentWindow`.
  - Com sandbox a origem vira `"null"`, então a checagem é por `source`.
- Trocar o estado do inspetor guardado em `window.name` (`compiler.ts:812-830`) por mensagens do pai.
- Headers:
  - `/render/[slug]`: CSP restritiva (`default-src 'none'; img-src https: data:; style-src 'unsafe-inline' fonts.googleapis.com; font-src fonts.gstatic.com; script-src 'unsafe-inline'; frame-ancestors 'self'`).
  - `next.config.ts` com `headers()`: `X-Content-Type-Options`, `Referrer-Policy` e `X-Frame-Options: SAMEORIGIN` nas rotas internas.
  - HSTS fica no reverse proxy TLS. Se precisar ficar no app, enviar só quando `NODE_ENV === "production"`.
- Upload de SVG (`upload-image/route.ts`):
  - Rasterizar com `sharp` para PNG, em vez de filtrar por regex. Isso elimina a classe inteira de XSS em SVG.
- **Aceite**: o E2E atual (hover e seleção no modo Studio, dropdown, ticker) continua passando, o scroll sincronizado funciona e um teste confirma que o iframe não acessa `parent.document`.

### Fase 3: bugs do editor (pode rodar em paralelo às fases 1 e 2)
- **`StudioClient.tsx:267` (`handleSave`)**:
  - Guardar um snapshot `sent = { bp, sellerWhatsapp, currentMode }` e enviar esse snapshot.
  - Quando der certo, o baseline passa a ser `sent`. `hasUnsavedChanges` vira `!deepEqual(estadoAtual, sent)`, com `estadoAtual` lido de uma ref e comparando os três campos, não só o `bp`.
- **SSE: já resolvido, sem mudança.** O `readEventStream.ts` já tem `try/finally`, cancela o stream, libera o reader e lança `StreamEndedError`, que o `catch` de `page.tsx` trata com mensagem de erro e `setIsGenerating(false)`. O agente de auditoria apontou isso por engano. Sobra só um ajuste pequeno: no evento `done`, fazer `setIsGenerating(false)` caso o `router.push` não desmonte a página.
- **`ui/Modal.tsx`**: guardar `onClose` em uma ref (`useLatest`) e deixar o effect só com `[open]`.
- **`ElementInspectorPanel.tsx:64`**: se o produto ou banner selecionado não existir, limpar a seleção num `useEffect`, nunca durante o render. Enquanto isso, renderizar o estado vazio em vez de `products[0]`.
- **Timers e abort**:
  - `setTimeout`s com cleanup em `StudioClient.tsx:264,284` e `page.tsx:148` (hook `useTimeout`).
  - `lockTimerRef` limpo no unmount e `AbortController` em `requestMobileCapture` (`StoreCompareView.tsx:76,94,140`).
- **IDs e chaves**: IDs de categoria via `crypto.randomUUID()`, no lugar de `#cat-${length+1}`. Usar `key` estável nas listas editáveis.
- **Testes**: jsdom para save com edição concorrente, SSE fechado sem `done` e o Modal sem roubar o foco.

### Fase 4: robustez do backend
- **Zod**: `max()` em `url` (2048), `sellerWhatsapp` (32), `slotLabel` (120) e `imageUrl` (4096 para URLs; data URIs deixam de ser aceitos no blueprint e passam a usar o upload).
- **Slug**: limitar o hostname a 60 caracteres em `generate/route.ts:39-52`.
- **Validação do blueprint**: validar o blueprint lido do banco com o schema em `ai-image/route.ts:53`, usando `getPreviewWithBlueprint` de `src/lib/previews/repository.ts`.
- **Upload**: em `upload-image/route.ts:49`, checar `content-length` antes do `req.formData()`, mas só como falha rápida, porque não cobre `Transfer-Encoding: chunked`. O teto de verdade fica no reverse proxy (`client_max_body_size 16m`), documentado na fase 0.
- **Falha no `generate`**: chamar a limpeza de arquivos de `src/lib/files/captures.ts` (a mesma usada no DELETE) no `catch` de `generate/route.ts:226`.
- **Erros para o cliente**: mensagens genéricas, sem `err.message` do Prisma ou do Gemini. O detalhe fica só em `console.error`.
- **GET `/api/previews`**: parar de apagar registros presos. A limpeza vai para uma função chamada no boot e no POST do `generate`, com throttle.
- **Colisão de prefixo**: o `slice(0,10)` aparece em quatro pontos.
  - Gravação: `src/lib/ai/image-studio.ts:452` e `:469`.
  - Exclusão: `src/lib/files/captures.ts:45` e `:62`.
  - Novos arquivos passam a usar o `previewId` inteiro.
  - Na exclusão, o prefixo legado de 10 caracteres só apaga arquivos que não estão em `referencedElsewhere`, como já acontece com `legacyMirrorPrefix` (`captures.ts:65-69`). CUIDs criados no mesmo instante compartilham esse prefixo de timestamp.
- **`hostCache`** em `safe-url.ts:108`: virar um LRU com 500 entradas.
- **DNS rebinding no Node**: o `fetch` do Node 22 usa undici e não aceita `http.Agent`. É preciso um `undici.Agent({ connect: { lookup } })` passado como `dispatcher`, com um lookup que valida o IP resolvido. Isso exige a dependência `undici`, com a mesma versão major do Node.
  - Limitação a documentar: a proteção vale só para o `fetch` do Node. O Chromium tem resolvedor DNS próprio. Lá, a defesa é o `page.route` mais a checagem de `response.url()` (fase 1) e o sandbox do container. Para cobrir o Chromium também, seria preciso uma regra de egress na rede do container, bloqueando RFC1918 e 169.254/16, como item opcional da fase 0.
- **Prisma**: `@@index([status])` e `@@index([createdAt])`.
- **Limpeza de disco**: script `npm run captures:gc`, que remove arquivos de `public/captures` sem preview correspondente. Fica documentado como cron do container.
- **`reanalyze`**: exportar `maxDuration` e passar `signal`.

### Fase 5: dependências
- Rodar `npm audit fix`, só com correções que não quebram nada: postcss, uuid, deepmerge-ts e effect.
- Migrar `@google/genai` de 0.14 para a versão mais nova. Isso remove a dependência do zod vulnerável.
  - É preciso adaptar as chamadas em `src/lib/ai/architect.ts` e `src/lib/ai/image-studio.ts`.
  - A suíte de rotas com IA simulada (`routes.test.ts`, `generate-warning.test.ts`) valida a migração.
- Ficam fora desta rodada, registrados como débito: Next 16, Prisma 7, Tailwind 4, zod 4 e lucide 1.x. Cada um merece um PR próprio.
- Fixar a versão da imagem do Playwright no Dockerfile junto com o `package.json`.

### Fase 6: design system e acessibilidade
- **Troca de cores** em `src/components/studio/*.tsx`, `StudioClient.tsx` e `ui/Modal.tsx`:
  - Substituição mecânica de `slate-` por `zinc-`.
  - `bg-slate-900` por `bg-irroba-ink`.
  - CTAs primários com o token `brand`/`irroba-red`, conforme `tailwind.config.ts`.
  - Hex fixos (`#111827`, `#F3F4F6`) trocados por `PALETTE.ink` (`src/lib/layout-patterns/palette.ts`).
- **Tokens**:
  - O `globals.css` passa a usar `var(--irroba-*)`.
  - O `tailwind.config.ts` passa a referenciar as CSS vars, assim existe uma fonte só.
  - **Armadilha do Tailwind v3:** o design system usa modificadores de opacidade (cerca de 25 usos, como `bg-brand-50/50`, `ring-brand-200/70` e `ring-brand-500/15`). Apontar o config para `var(--x)` com hex quebra todos eles.
    - As variáveis precisam ser canais RGB, como `--irroba-red: 234 25 31;`.
    - No config, a cor fica `rgb(var(--irroba-red) / <alpha-value>)`.
    - No CSS puro, usar `rgb(var(--irroba-red))`.
    - Validar com um teste visual ou de classe, para garantir que `/50` continua gerando alpha.
  - Fontes via `next/font/google` em `layout.tsx`. Ele baixa as fontes durante o `next build`, então o `docker build` e a CI precisam de rede nessa etapa. A alternativa é `next/font/local` com os arquivos versionados.
  - Remover a "Neue Haas" da pilha de fontes.
- **Compiler**: os cinzas fixos viram constantes nomeadas em `layout-patterns/palette.ts`. Os golden snapshots devem continuar iguais, ou ser atualizados de forma consciente.
- **A11y**:
  - Criar o componente `Field` (`label` + `useId` + `htmlFor`) e aplicar nos 64 campos do Inspector.
  - `aria-label` nos botões só de ícone.
  - `role="tabpanel"`/`aria-controls` e navegação por setas nas abas.
  - Remover o `focus:outline-none` de `ColorField.tsx:39`.
  - Adicionar `@media (prefers-reduced-motion)` no `globals.css` e no CSS do storefront.
- **Código morto**: usar `ui/Button` e `ui/Toast` nos lugares de botões e avisos feitos à mão, ou removê-los, junto com `ui/Badge` e `ui/useCopyToClipboard`. A preferência é usar.
  - Remover o ternário morto em `PreviewViewerClient.tsx:113`.

### Fase 7: refatoração dos god files
Pré-requisito: os snapshots golden e o E2E verdes servem de rede de segurança. Nenhuma mudança de comportamento entra aqui.
- **`compiler.ts`** vira `src/lib/irroba-blocks/compiler/`:
  - `index.ts` com `compileStorefrontDocument`.
  - `css/*.ts` (base, header, banners, vitrines).
  - `sections/*.ts`, com uma função por seção que retorna HTML.
  - `runtime.ts`, com o JS do inspetor e do carrossel.
  - `escape.ts`, que reaproveita `sanitize.ts`.
- **`StudioClient.tsx`** passa a ter cerca de 400 linhas, com estado num `useReducer` em `studio/useStudioState.ts` e as abas em `studio/tabs/{Tema,Banners,Produtos,Categorias,Export}Tab.tsx`.
- **`ElementInspectorPanel.tsx`** vira um mapa `targetId → componente` em `studio/inspector/*.tsx`.
- **Editores compartilhados**:
  - `studio/editors/BannerEditor.tsx`, usado pela aba e pelo Inspector (hero, slim, tarja, benefícios).
  - `studio/editors/CategoryAdder.tsx`, com estado único.
- **Aceite**: diff zero nos snapshots golden, E2E verde e nenhum arquivo acima de cerca de 600 linhas.

### Fase 8: documentação
- **`README.md`**:
  - O que é o app.
  - Setup local (`npm i`, `npx playwright install chromium`, `.env`, `db:push`, `dev`).
  - Docker (`compose up`, volumes, backup do SQLite).
  - Variáveis de ambiente.
  - Arquitetura: scraper → architect → blueprint → compiler → studio.
  - Testes.
- **`.env.example`**: completar com `MAX_BROWSER_JOBS`, `RATE_LIMIT_*` e `PLAYWRIGHT_NO_SANDBOX`.

---

## D. Riscos e mitigação
| Risco | Mitigação |
|---|---|
| Sandbox do Chromium falhar no container | Imagem oficial do Playwright + usuário não-root. Se falhar, seccomp do Playwright e, em último caso, `PLAYWRIGHT_NO_SANDBOX=1` documentado |
| `sandbox` no iframe quebrar o hover, a seleção e o sync de scroll | Migração para `postMessage` na mesma fase, coberta pelo E2E atual e por um teste novo |
| `fetchPublic` bloquear lojas legítimas (CDN com redirect) | Ele já segue redirects validando cada salto. Testar com as lojas de exemplo que já estão em `captures` (rubinella, pralana, lescloches) |
| A migração do `@google/genai` mudar o formato das respostas | Mantê-la isolada na fase 5, com testes de rota simulados e um teste manual com chave real |
| A refatoração introduzir regressões visuais | Golden snapshots + E2E, sem mudança de comportamento na fase 7 |
| Rate limit em memória não escalar | Documentar o limite de 1 réplica. Se escalar no futuro, trocar a implementação por Redis mantendo a mesma interface |

## E. Verificação (em todo PR)
1. `npx tsc --noEmit`, `npm run lint` e `npm test`, todos verdes local e na CI.
2. `docker compose build && docker compose up`.
3. Roteiro manual:
   - Gerar um preview de uma loja Irroba real.
   - Abrir o Studio, editar banner e produto, salvar e recarregar para confirmar que a alteração persistiu.
   - Abrir o comparativo mobile/desktop e conferir o scroll sincronizado.
   - Gerar uma imagem por IA.
   - Fazer upload de imagem.
   - Exportar o CSV e abrir no planilhas para confirmar que nenhuma fórmula é executada.
   - Abrir `/preview/[slug]` em aba anônima.
4. Testes específicos de cada fase, listados acima.

## F. Ordem de início sugerida
Começar a fase 0 e a fase 3 em paralelo: a infra não conflita com o editor. Depois seguir 1 → 2 → 4 → 5 → 6 → 7, com a 8 ao final.
