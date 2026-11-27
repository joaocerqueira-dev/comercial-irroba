# Entrega 2 – Link do cliente: prazo, senha e respostas: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O link `/preview/[slug]` passa a ter validade e senha definidas pelo comercial. O cliente pode aprovar, pedir ajustes ou recusar, com registro e aviso ao comercial no sistema e pelo WhatsApp.

**Architecture:**
- **Decisão de acesso:** uma função pura, `resolveShareAccess`, decide o acesso de cada requisição a partir da proposta, do cookie `share_<slug>` assinado com HMAC e da sessão do usuário.
- **Quem consulta:** a página `/preview`, o `/render`, a rota JSON mobile e as rotas públicas `/api/share/[slug]/*`.
- **Comercial:** configura o compartilhamento por `/api/previews/[id]/share`, num painel do Studio.

**Tech Stack:** Next.js 15 App Router, Prisma + SQLite, `node:crypto`, zod, vitest. Nenhuma dependência nova.

**Spec:** `docs/superpowers/specs/2026-11-27-contas-links-ia-design.md` (§2). A entrega 1 (`src/lib/auth/*`) já está na `main`.

## Global Constraints

- `shareStatus`: `pendente` | `aprovada` | `ajustes` | `recusada`. `ClientResponse.type`: `aprovar` | `ajustes` | `recusar` (strings exatas).
- Validade: 7, 15 ou 30 dias, ou uma data personalizada. A data personalizada precisa ser futura e no máximo 180 dias à frente.
- `legacyPublic Boolean @default(true)` no schema, para que as propostas que já existem continuem públicas depois do `db push`. Toda proposta criada a partir de agora grava `legacyPublic: false`. Configurar ou desativar o compartilhamento também grava `false`.
- Cookie `share_<slug>`:
  - valor assinado com HMAC-SHA256 usando `SESSION_SECRET`;
  - httpOnly, `SameSite=Lax`, `Path=/`, `Secure` em produção;
  - `Expires` igual a `shareExpiresAt`;
  - carrega um hash curto da senha, então trocar a senha invalida os cookies antigos.
- `SESSION_SECRET`:
  - em produção, é obrigatória e precisa ter pelo menos 32 caracteres; sem isso, as rotas de compartilhamento respondem 503 `Compartilhamento indisponível: defina SESSION_SECRET.`;
  - em desenvolvimento, sem ela, usa `"dev-share-secret-dev-share-secret"` e mostra um `console.warn` uma vez.
- Textos exatos:
  - indisponível: `Proposta indisponível`
  - expirada: `Proposta expirada, fale com seu comercial`
  - senha errada: `Senha incorreta.`
  - já respondida: `Esta proposta já foi respondida.`
- Mensagens do WhatsApp (exatas):
  - `Aprovei a proposta da loja <X>`
  - `Pedi ajustes na proposta da loja <X>: <mensagem>`
  - `Recusei a proposta da loja <X>`
- Status para o cliente: `Aprovada por <nome> em <dd/MM> às <HH>h<mm>`, com `Ajustes pedidos por …` e `Recusada por …` no mesmo formato, no fuso `America/Sao_Paulo`.
- Imagens em `/api/captures/[filename]` continuam públicas. Já `/api/captures/mobile/[slug]` passa a exigir acesso.
- Propostas `legacyPublic` mantêm o OG atual. As outras usam só o título genérico `Prévia de loja · Irroba`, sem imagem.
- Proposta de outro usuário nas rotas do comercial: 404. Nada de dependência nova. Textos em português.

## Review Focus

1. Cliente com cookie válido e senha trocada pelo comercial depois: precisa voltar à tela de senha (Task 1).
2. Link vencido com cookie ainda dentro da validade: precisa cair em "expirada", tanto no `/preview` quanto no `/render` (Task 1, Task 3).
3. Duplo clique ou duas abas respondendo: grava uma resposta só, e a segunda recebe 409 (Task 4).
4. Cookie de uma proposta usado em outra: não pode liberar, porque a assinatura inclui o slug (Task 1).
5. WhatsApp do comercial salvo como `"+55 (11) 99999-9999"`: o link precisa ser `wa.me/5511999999999` (Task 4).

---

### Task 1: Schema e núcleo de acesso ao link

**Files:**
- Modify: `prisma/schema.prisma`, `src/lib/auth/password.ts`, `src/lib/auth/guard.ts`, `src/app/api/previews/generate/route.ts` (gravar `legacyPublic: false` no create), `.env.example`, `docs/deploy.md`
- Create: `src/lib/share/access.ts`
- Test: `src/lib/__tests__/share-access.test.ts`

**Interfaces:**
- Consumes: `canAccessPreview`, `AuthUser`, `getUserFromToken`, `SESSION_COOKIE` (entrega 1)
- Produces:
  - Schema:
    - em `StorePreview`: `shareExpiresAt DateTime?`, `sharePasswordHash String?`, `shareStatus String @default("pendente")`, `contentVersion Int @default(1)`, `legacyPublic Boolean @default(true)` e `responses ClientResponse[]`;
    - `model ClientResponse { id String @id @default(cuid()); previewId String; preview StorePreview @relation(fields:[previewId], references:[id], onDelete: Cascade); type String; clientName String; message String?; contentVersion Int; createdAt DateTime @default(now()); seenAt DateTime?; @@index([previewId, createdAt]) }`.
  - `generateTempPassword(length = 12): string` (com o parâmetro novo, mesmo alfabeto) e `suggestSharePassword(): string` → `generateTempPassword(8)`
  - `shareCookieName(slug: string): string` → `share_${slug}`
  - `signShareCookie(slug: string, passwordHash: string, expiresAt: Date): string`
  - `verifyShareCookie(value: string | undefined, slug: string, passwordHash: string, now?: Date): boolean`
  - `shareCookieHeader(slug: string, value: string, expiresAt: Date): string`
  - `type ShareAccess = "owner" | "granted" | "public-legacy" | "needs-password" | "expired" | "unavailable"`
  - `interface ShareablePreview { slug: string; ownerId: string | null; legacyPublic: boolean; shareExpiresAt: Date | null; sharePasswordHash: string | null }`
  - `resolveShareAccess(p: ShareablePreview, opts: { cookieValue?: string; user?: AuthUser | null; now?: Date }): ShareAccess`
  - `ShareSecretMissingError` (lançado por `getShareSecret()` em produção)
  - Em `guard.ts`: `getOptionalUser(req: Request): Promise<AuthUser | null>` e `getOptionalPageUser(): Promise<AuthUser | null>`. Ambos devolvem `null` se o usuário não existe ou se tem `mustChangePassword`.

- [ ] **Step 1: Schema.**
  - Adicionar os campos e o model descritos acima.
  - Rodar `npx prisma db push && npx prisma generate`.
  - Conferir com `sqlite3 prisma/dev.db "select count(*) from StorePreview where legacyPublic=1"`: o número tem que ser igual ao total de propostas.

- [ ] **Step 2: Testes que falham** (`share-access.test.ts`):
  - Assinatura e verificação:
    - `verifyShareCookie(signShareCookie("loja-a", H, exp), "loja-a", H, now)` → `true`;
    - mesmo cookie em `"loja-b"` → `false` (Review Focus 4);
    - mesmo cookie com hash de senha `H2` → `false` (Review Focus 1);
    - valor adulterado (um caractere trocado) → `false`;
    - `undefined` → `false`;
    - `now` depois de `exp` → `false`.
  - `resolveShareAccess` (com `now` fixo):
    - usuário dono ou admin → `"owner"`, mesmo com link expirado;
    - comercial que não é dono → segue as regras abaixo, como um cliente;
    - `legacyPublic: true` → `"public-legacy"`;
    - `legacyPublic: false` sem `shareExpiresAt` ou sem hash → `"unavailable"`;
    - `shareExpiresAt` no passado, mesmo com cookie válido → `"expired"` (Review Focus 2);
    - cookie válido → `"granted"`;
    - sem cookie → `"needs-password"`.
  - `suggestSharePassword()` casa `/^[A-HJ-NP-Za-km-z2-9]{8}$/`.
  - `getShareSecret` com `NODE_ENV=production` e sem `SESSION_SECRET` lança `ShareSecretMissingError`; com 31 caracteres também lança (`vi.stubEnv`).

- [ ] **Step 3: Rodar** `npx vitest run src/lib/__tests__/share-access.test.ts`. Esperado: FAIL.

- [ ] **Step 4: Implementar.**
  - Formato do valor do cookie: `${expMs}.${pwTag}.${mac}`:
    - `pwTag` = 8 primeiros caracteres hex do SHA-256 de `passwordHash`;
    - `mac` = HMAC-SHA256 base64url de `${slug}|${expMs}|${pwTag}`;
    - comparação com `timingSafeEqual`.
  - No `create` do generate, gravar `legacyPublic: false`.
  - Documentar `SESSION_SECRET` no `.env.example`, com a sugestão `openssl rand -base64 48`, e em `docs/deploy.md`, numa linha na seção de variáveis e na nota de atualização.

- [ ] **Step 5: Rodar** `rtk vitest run && rtk tsc --noEmit`. Esperado: PASS.
- [ ] **Step 6: Commit** `feat(share): schema do link do cliente e núcleo de acesso assinado`.

---

### Task 2: API do comercial para configurar o link

**Files:**
- Create: `src/app/api/previews/[id]/share/route.ts` (GET, PUT, DELETE)
- Modify: `src/lib/previews/repository.ts` (`saveBlueprint`)
- Test: `src/lib/__tests__/share-config.test.ts`

**Interfaces:**
- Consumes: `requireUser`, `canAccessPreview`, `limitAuthenticated`, `hashPassword`, `suggestSharePassword`, `TEST_USERS`, `withSession`
- Produces:
  - `PUT /api/previews/[id]/share` com `{ days?: 7 | 15 | 30; expiresAt?: string (ISO); password?: string (4..64) }`, exatamente um entre `days` e `expiresAt`.
    - Resposta 200: `{ url: "/preview/<slug>", expiresAt: string, password: string }`. A senha volta só nesta resposta; sem `password` no body, o servidor gera com `suggestSharePassword`.
    - Grava `shareExpiresAt`, `sharePasswordHash` e `legacyPublic: false`.
  - `DELETE /api/previews/[id]/share`: zera `shareExpiresAt` e `sharePasswordHash` e grava `legacyPublic: false`. Resposta 200.
  - `GET /api/previews/[id]/share` → `{ shareExpiresAt, hasPassword, legacyPublic, shareStatus, contentVersion, responses: { id, type, clientName, message, contentVersion, createdAt, seenAt }[] }`, em ordem decrescente de `createdAt`.
  - `saveBlueprint` passa a gravar `contentVersion: { increment: 1 }` e `shareStatus: "pendente"`.

- [ ] **Step 1: Testes que falham:**
  - Comercial não dono → 404 nos três métodos.
  - Sem sessão → 401.
  - PUT `{ days: 15 }` sem senha:
    - `shareExpiresAt` ≈ agora + 15 dias;
    - resposta com `password` de 8 caracteres;
    - o hash gravado confere com `verifyPassword`;
    - `legacyPublic: false`.
  - PUT `{ expiresAt: <ontem> }` → 400. PUT com data a 181 dias → 400. PUT com `days` e `expiresAt` juntos → 400. PUT `{ days: 10 }` → 400.
  - PUT numa proposta `legacyPublic: true` → grava `legacyPublic: false`.
  - DELETE → `shareExpiresAt: null`, `sharePasswordHash: null`, `legacyPublic: false`.
  - `saveBlueprint` chama `update` com `contentVersion: { increment: 1 }` e `shareStatus: "pendente"`.

- [ ] **Step 2: Rodar.** Esperado: FAIL.
- [ ] **Step 3: Implementar.** Ordem em cada handler: `requireUser` → `limitAuthenticated(req, "share")` → carregar a proposta → `canAccessPreview` → 404. Validação com zod.
- [ ] **Step 4: Rodar** `rtk vitest run`. Esperado: PASS (testes existentes de `saveBlueprint`/PATCH ajustados se o mock de `update` exigir).
- [ ] **Step 5: Commit** `feat(share): API do comercial para prazo e senha do link`.

---

### Task 3: Acesso do cliente (senha, expirado, render e mobile)

**Files:**
- Create:
  - `src/app/api/share/[slug]/unlock/route.ts` (POST)
  - `src/components/share/SharePasswordForm.tsx` (client)
  - `src/components/share/ShareNotice.tsx` (páginas de indisponível e expirada)
- Modify:
  - `src/middleware.ts`: `isPublicPath` passa a aceitar `/api/share/`;
  - `src/app/preview/[slug]/page.tsx`: página e `generateMetadata`;
  - `src/app/render/[slug]/route.ts`;
  - `src/app/api/captures/mobile/[slug]/route.ts`.
- Test: `src/lib/__tests__/share-client-access.test.ts`

**Interfaces:**
- Consumes: `resolveShareAccess`, `verifyShareCookie`, `signShareCookie`, `shareCookieHeader`, `shareCookieName`, `getOptionalUser`, `getOptionalPageUser`, `verifyPassword`, `createRateLimiter`, `getClientIp`
- Produces: `POST /api/share/[slug]/unlock` com `{ password }`.
  - Senha certa: 200 com `Set-Cookie` de `share_<slug>`.
  - Senha errada: 401 `Senha incorreta.`.
  - Link expirado: 410. Link indisponível ou slug inexistente: 404.
  - A 6ª tentativa em 1 minuto, por IP+slug, recebe 429.
  - Sem `SESSION_SECRET` em produção: 503 com o texto do Global Constraints.

- [ ] **Step 1: Testes que falham:**
  - `unlock`:
    - senha certa → 200 e `Set-Cookie` contendo `share_loja-a=`, `HttpOnly`, `Path=/`;
    - senha errada → 401 com o texto exato;
    - expirado → 410;
    - 6ª tentativa → 429.
  - `/render/[slug]` (requisições montadas com o header `cookie`):
    - sem cookie, numa proposta com senha → 404;
    - com cookie válido → 200;
    - `legacyPublic` → 200;
    - expirado com cookie válido → 404 (Review Focus 2);
    - dono logado (mock de `getUserFromToken`) → 200;
    - o cache em memória não devolve o HTML para quem não tem acesso: primeiro uma chamada com acesso, depois uma sem → 404.
  - `/api/captures/mobile/[slug]`: sem acesso → 404; com cookie → 200 (mock de `getCachedMobileScreenshots`).
  - `isPublicPath("/api/share/loja/unlock")` → `true`.

- [ ] **Step 2: Rodar.** Esperado: FAIL.

- [ ] **Step 3: Implementar as rotas.** No `/render`, a checagem de acesso vem **antes** do 304 por ETag e antes do cache.

- [ ] **Step 4: Página `/preview/[slug]`.** A página lê o cookie e o usuário com `cookies()` e chama `resolveShareAccess`:
  - `owner`, `granted` ou `public-legacy`: viewer atual;
  - `needs-password`: `SharePasswordForm`, que faz POST no unlock e chama `router.refresh()` no 200;
  - `expired`: `ShareNotice` com `Proposta expirada, fale com seu comercial` e, se houver `sellerWhatsapp`, um link `wa.me/<dígitos>`;
  - `unavailable`: `ShareNotice` com `Proposta indisponível`;
  - `generateMetadata`: OG atual só quando `legacyPublic`; nos outros casos, `{ title: "Prévia de loja · Irroba", robots: noindex }`.

- [ ] **Step 5: Rodar** `rtk vitest run && rtk tsc --noEmit && npm run lint`. Esperado: PASS (ajustar `e2e-isolation.test.ts` e `mobile-capture-routes.test.ts`, que assumem `/render` e o mobile públicos: o mock de proposta ganha `legacyPublic: true`).
- [ ] **Step 6: Commit** `feat(share): senha e validade no link do cliente`.

---

### Task 4: Respostas do cliente

**Files:**
- Create:
  - `src/app/api/share/[slug]/respond/route.ts` (POST)
  - `src/lib/share/responses.ts` (funções puras)
  - `src/components/share/ClientResponsePanel.tsx` (client)
- Modify: `src/app/preview/[slug]/page.tsx` (passa ao viewer `shareStatus` e a última resposta da `contentVersion` atual) e `src/components/PreviewViewerClient.tsx` (renderiza o painel)
- Test: `src/lib/__tests__/share-responses.test.ts`

**Interfaces:**
- Consumes: `resolveShareAccess`, `getOptionalUser`, `createRateLimiter`, `getClientIp`
- Produces:
  - `type ResponseType = "aprovar" | "ajustes" | "recusar"`
  - `STATUS_BY_RESPONSE: Record<ResponseType, "aprovada" | "ajustes" | "recusada">`
  - `buildWhatsappLink(sellerWhatsapp: string | null, type: ResponseType, storeName: string, message?: string | null): string | null`
  - `formatResponseStatus(r: { type: ResponseType; clientName: string; createdAt: Date }): string`
  - `POST /api/share/[slug]/respond` com `{ type, clientName: string(1..80), message?: string(..2000) }`:
    - `ajustes` exige `message` com pelo menos 3 caracteres;
    - resposta 201 `{ shareStatus, response }`.

- [ ] **Step 1: Testes que falham:**
  - `buildWhatsappLink("+55 (11) 99999-9999", "aprovar", "Loja X")` → `https://wa.me/5511999999999?text=` + `encodeURIComponent("Aprovei a proposta da loja Loja X")` (Review Focus 5).
  - `"ajustes"` com a mensagem `"trocar cor"` → texto `Pedi ajustes na proposta da loja Loja X: trocar cor`.
  - `"recusar"` → `Recusei a proposta da loja Loja X`.
  - `null` ou `""` → `null`.
  - `formatResponseStatus({ type: "aprovar", clientName: "Ana", createdAt: new Date("2026-11-27T17:05:00Z") })` → `Aprovada por Ana em 27/11 às 14h05`.
  - Rota `respond`:
    - só um cookie `granted` permite responder; `public-legacy`, `owner` (usuário logado sem cookie), `needs-password` e `expired` → 403;
    - `ajustes` sem mensagem → 400;
    - sucesso grava `ClientResponse` com a `contentVersion` atual e muda `shareStatus` para o valor de `STATUS_BY_RESPONSE`;
    - com status diferente de `pendente` → 409 `Esta proposta já foi respondida.`;
    - concorrência (Review Focus 3): o `updateMany({ where: { id, shareStatus: "pendente" } })` devolvendo `count: 0` → 409 e nenhum `ClientResponse` criado.

- [ ] **Step 2: Rodar.** Esperado: FAIL.

- [ ] **Step 3: Implementar.** Dentro de `prisma.$transaction`:
  1. `updateMany` condicionado a `shareStatus: "pendente"`;
  2. se `count === 0`, devolver 409;
  3. senão, `clientResponse.create`.

  Rate limit de 10 por minuto, por IP+slug.

- [ ] **Step 4: UI do `ClientResponsePanel`.**
  - Aparece só quando o acesso é `granted`.
  - Com status `pendente`: três botões que abrem um formulário inline (nome; texto obrigatório em ajustes; motivo opcional em recusar).
  - Depois da resposta: o texto de `formatResponseStatus` e o botão "Avisar pelo WhatsApp" (`buildWhatsappLink`), escondido se o resultado for `null`.

- [ ] **Step 5: Rodar** `rtk vitest run && rtk tsc --noEmit && npm run lint`. Esperado: PASS.
- [ ] **Step 6: Commit** `feat(share): respostas do cliente com aviso pelo WhatsApp`.

---

### Task 5: Painel "Compartilhar" no Studio e avisos na lista

**Files:**
- Create: `src/components/studio/SharePanel.tsx`
- Modify:
  - `src/components/studio/StudioTopBar.tsx`: os botões "Copiar link do cliente" abrem o `SharePanel` num `Modal`;
  - `src/app/studio/[id]/page.tsx`: ao carregar, `clientResponse.updateMany({ where: { previewId, seenAt: null }, data: { seenAt: now } })`;
  - `src/app/api/previews/route.ts`: cada item ganha `shareStatus`, `legacyPublic`, `shareExpiresAt` e `unseenResponses` (`_count` com `where: { seenAt: null }`);
  - `src/app/page.tsx`: selo e contador no card.
- Test: `src/lib/__tests__/share-studio.test.ts`

**Interfaces:**
- Consumes: as rotas GET/PUT/DELETE de `/api/previews/[id]/share` (Task 2), `formatResponseStatus` (Task 4), `Modal`, `useCopyToClipboard`
- Produces: o texto copiado tem duas linhas, `Link: <origin>/preview/<slug>` e `Senha: <senha>`. Selos da lista:
  - `pendente` com link ativo → "Aguardando cliente";
  - `aprovada` → "Aprovada";
  - `ajustes` → "Ajustes pedidos";
  - `recusada` → "Recusada";
  - `legacyPublic` → "Link público (antigo)";
  - sem link → "Link desativado".

- [ ] **Step 1: Testes que falham:**
  - O `findMany` de `GET /api/previews` pede `_count: { select: { responses: { where: { seenAt: null } } } }`. A resposta expõe `unseenResponses` (número) e os campos de compartilhamento.
  - A página do Studio de uma proposta própria chama `clientResponse.updateMany` com `{ where: { previewId: id, seenAt: null } }`. Para isso, mockar `requirePageUser` e `next/navigation`.
  - Um teste de componente do `SharePanel` (testing-library), com `fetch` mockado:
    - salvar com "15 dias" faz PUT `{ days: 15 }`;
    - depois de salvar, aparecem o link e a senha devolvida e o botão "Copiar link e senha";
    - "Desativar link" faz DELETE.

- [ ] **Step 2: Rodar.** Esperado: FAIL.

- [ ] **Step 3: Implementar.** O `SharePanel` tem:
  - validade (7, 15 ou 30 dias, ou "Data personalizada" com `<input type="date">`);
  - campo de senha opcional, com o placeholder "Deixe em branco para gerar";
  - botões "Salvar link", "Desativar link" e "Copiar link e senha";
  - o status atual;
  - o histórico de respostas (tipo, nome, mensagem, data via `formatResponseStatus`, versão).

  O aviso fixo diz: "A senha só aparece agora. Para trocar, salve uma nova."

- [ ] **Step 4: Rodar** `rtk vitest run && rtk tsc --noEmit && npm run lint`. Esperado: PASS.
- [ ] **Step 5: Commit** `feat(share): painel Compartilhar no Studio e avisos de resposta na lista`.

---

### Task 6: Verificação ponta a ponta

- [ ] **Step 1:** Reiniciar o `npm run dev` com `SESSION_SECRET` definida no `.env` local. Esperado: as propostas antigas continuam com `legacyPublic = 1`.

- [ ] **Step 2:** Abrir no navegador, sem login, uma proposta antiga em `/preview/<slug>`. Esperado: abre como antes.

- [ ] **Step 3:** Como comercial ou admin, no Studio:
  1. configurar 7 dias com a senha gerada. A lista passa a mostrar "Aguardando cliente";
  2. numa sessão de cliente sem login (curl com cookie jar), sem cookie: `/preview` mostra a tela de senha e `/render` responde 404;
  3. senha errada → `Senha incorreta.`; senha certa → a proposta abre e o `/render` responde 200;
  4. pedir ajustes com um texto → o status e o link do WhatsApp aparecem, e uma segunda resposta recebe 409;
  5. a lista do comercial mostra "Ajustes pedidos" com contador 1. Ao abrir o Studio, o contador zera e o histórico mostra a resposta;
  6. salvar uma edição no Studio → o cliente volta a ver os botões;
  7. trocar a senha → o cookie antigo cai na tela de senha;
  8. desativar o link → `Proposta indisponível`.

- [ ] **Step 4:** Commit de ajustes, se houver. Fim da entrega 2.
