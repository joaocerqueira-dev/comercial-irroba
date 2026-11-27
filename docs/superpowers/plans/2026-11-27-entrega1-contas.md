# Entrega 1 – Contas, sessão e dono das propostas: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o Basic auth compartilhado por login próprio de cada usuário (papéis comercial/admin), painel do admin e propostas com dono.

**Architecture:** Hash de senha com `crypto.scrypt`, sessões em tabela `Session` do SQLite (token aleatório no cookie httpOnly, só o SHA-256 no banco). O middleware (edge) só confere se o cookie existe; a validação real fica em `requireUser`/`requirePageUser`, chamados em toda rota e página interna. O acesso às propostas passa por um único `canAccessPreview`.

**Tech Stack:** Next.js 15 App Router, Prisma + SQLite, `node:crypto`, zod, vitest. Nenhuma dependência nova.

**Spec:** `docs/superpowers/specs/2026-11-27-contas-links-ia-design.md` (§1). As entregas 2 e 3 terão planos próprios depois que esta for mergeada.

## Global Constraints

- Papéis: `comercial` | `admin` (strings exatas).
- Cookie `session`: httpOnly, `Secure` quando `NODE_ENV=production`, `SameSite=Lax`, `Path=/`, validade 7 dias renovada no uso.
- Login com usuário inativo ou senha errada: sempre `E-mail ou senha inválidos.` (status 401).
- Proposta de outro usuário: **404** (nunca 403).
- `StorePreview.ownerId String?` no schema; o código sempre grava e exige o dono.
- Deploy continua com `prisma db push` no boot (`docker/entrypoint.sh` não muda).
- Primeiro admin vem de `ADMIN_EMAIL` + `ADMIN_PASS`; `ADMIN_USER` deixa de existir.
- Nada de dependência nova.
- Textos de UI em português, no visual atual (Tailwind, componentes de `src/components/ui`).

## Review Focus

1. E-mail com maiúsculas/espaços (`" Ana@Irroba.com "`) tem que logar como `ana@irroba.com`: normalizar no login e na criação (Task 1, Task 6).
2. Usuário inativado com sessão aberta perde o acesso **na próxima requisição**, não só no próximo login (Task 2, Task 6).
3. Não pode ficar zero admins ativos: inativar ou rebaixar o último, inclusive a si mesmo, tem que dar 409 (Task 6).
4. Cookie vencido ou forjado passa pelo middleware (só confere presença) e precisa virar 401 na API e redirect para `/login` nas páginas (Task 2, Task 3).
5. Usuário com `mustChangePassword` chamando outras APIs deve receber 403 `MUST_CHANGE_PASSWORD`, não conseguir gerar proposta (Task 2).

---

### Task 1: Schema, hash de senha e sessões

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/auth/password.ts`, `src/lib/auth/session.ts`
- Test: `src/lib/__tests__/auth-core.test.ts`

**Interfaces:**
- Produces:
  - `type Role = "comercial" | "admin"`; `interface AuthUser { id: string; email: string; name: string; role: Role; mustChangePassword: boolean }` (em `session.ts`)
  - `normalizeEmail(raw: string): string` → `trim().toLowerCase()`
  - `hashPassword(plain: string): Promise<string>`; `verifyPassword(plain: string, stored: string): Promise<boolean>`
  - `generateTempPassword(): string`
  - `SESSION_COOKIE = "session"`, `SESSION_TTL_MS = 7 * 24 * 3600 * 1000`
  - `createSession(userId: string): Promise<{ token: string; expiresAt: Date }>`
  - `getUserFromToken(token: string | undefined): Promise<AuthUser | null>`
  - `deleteSession(token: string): Promise<void>`; `deleteUserSessions(userId: string): Promise<void>`
  - `sessionCookieHeader(token: string, expiresAt: Date): string`; `clearSessionCookieHeader(): string`

- [ ] **Step 1: Schema.** Adicionar ao `schema.prisma`:
  - `model User { id String @id @default(cuid()); email String @unique; name String; passwordHash String; role String @default("comercial"); active Boolean @default(true); mustChangePassword Boolean @default(true); lastLoginAt DateTime?; createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; sessions Session[]; previews StorePreview[] }`
  - `model Session { id String @id; userId String; user User @relation(fields: [userId], references: [id], onDelete: Cascade); expiresAt DateTime; createdAt DateTime @default(now()); @@index([userId]) }` (o `id` é o SHA-256 hex do token)
  - Em `StorePreview`: `ownerId String?`, `owner User? @relation(fields: [ownerId], references: [id])` e `@@index([ownerId, status, createdAt])`.
  - Rodar `npx prisma db push && npx prisma generate`. Esperado: "Your database is now in sync".

- [ ] **Step 2: Testes que falham** em `auth-core.test.ts` (mock de `@/lib/db` no padrão de `routes.test.ts`, com `user` e `session`):
  - `hashPassword` + `verifyPassword`: `verifyPassword("s3nha", await hashPassword("s3nha"))` → `true`; com `"outra"` → `false`; com hash corrompido `"lixo"` → `false` (sem lançar).
  - Dois hashes da mesma senha são diferentes (salt).
  - `generateTempPassword()`: 12 caracteres, casa `/^[A-HJ-NP-Za-km-z2-9]{12}$/` (sem `0 O 1 l I`).
  - `normalizeEmail(" Ana@Irroba.com ")` → `"ana@irroba.com"`.
  - `createSession("u1")`: o `id` gravado em `db.session.create` é o SHA-256 hex do token devolvido, e não o token em si.
  - `getUserFromToken`: `undefined` → `null` sem consultar o banco; sessão vencida → `null` e `session.delete` chamado; usuário `active: false` → `null`; sessão válida com mais da metade do TTL consumida → `session.update` com novo `expiresAt`.
  - `sessionCookieHeader` contém `HttpOnly`, `SameSite=Lax`, `Path=/`, `Expires=`; contém `Secure` só com `NODE_ENV=production`.

- [ ] **Step 3: Rodar** `npx vitest run src/lib/__tests__/auth-core.test.ts`. Esperado: FAIL (módulos não existem).

- [ ] **Step 4: Implementar.**
  - `password.ts`: formato `scrypt$16384$8$1$<saltB64>$<hashB64>`, salt de 16 bytes, keylen 64, comparação com `timingSafeEqual`. `generateTempPassword` usa `crypto.randomInt` sobre o alfabeto do teste.
  - `session.ts`: token = `randomBytes(32).toString("base64url")`. Na renovação, `expiresAt = now + TTL`. `getUserFromToken` faz `findUnique` com `include: { user: true }`.

- [ ] **Step 5: Rodar o teste.** Esperado: PASS.

- [ ] **Step 6: Commit**: `git add prisma/schema.prisma src/lib/auth src/lib/__tests__/auth-core.test.ts && git commit -m "feat(auth): schema de usuários e sessões, hash de senha"`

---

### Task 2: Guardas de acesso

**Files:**
- Create: `src/lib/auth/guard.ts`
- Test: `src/lib/__tests__/auth-guard.test.ts`
- Modify: `src/lib/__tests__/fixtures.ts`

**Interfaces:**
- Consumes: `getUserFromToken`, `SESSION_COOKIE`, `AuthUser` (Task 1)
- Produces:
  - `requireUser(req: Request, opts?: { allowMustChange?: boolean }): Promise<AuthUser | Response>`
  - `requireAdmin(req: Request): Promise<AuthUser | Response>`
  - `canAccessPreview(user: AuthUser, ownerId: string | null): boolean`
  - `requirePageUser(opts?: { admin?: boolean }): Promise<AuthUser>` (Server Components; lê `cookies()` de `next/headers`)
  - Fixtures: `TEST_USERS: { admin: AuthUser; comercial: AuthUser; outro: AuthUser }` e `withSession(init?: RequestInit): RequestInit` (adiciona o header `cookie: session=test`)

- [ ] **Step 1: Testes que falham** (mock de `@/lib/auth/session` → `getUserFromToken`):
  - Sem cookie → `requireUser` devolve `Response` 401 com `{ error: "Sessão expirada. Entre novamente." }`.
  - Token que `getUserFromToken` não reconhece → 401.
  - Usuário com `mustChangePassword: true` → 403 com `{ code: "MUST_CHANGE_PASSWORD" }`; com `allowMustChange: true` → devolve o usuário.
  - `requireAdmin` com comercial → 403; com admin → usuário.
  - `canAccessPreview`: admin + qualquer `ownerId` (inclusive `null`) → `true`; comercial dono → `true`; comercial e dono diferente → `false`; comercial e `null` → `false`.

- [ ] **Step 2: Rodar** `npx vitest run src/lib/__tests__/auth-guard.test.ts`. Esperado: FAIL.

- [ ] **Step 3: Implementar `guard.ts`.** O cookie vem de `req.headers.get("cookie")`, lido pelo nome `SESSION_COOKIE`. `requirePageUser`:
  - sem usuário → `redirect("/login")`;
  - com `mustChangePassword` → `redirect("/conta/senha")`;
  - com `admin: true` e usuário que não é admin → `notFound()`.

- [ ] **Step 4: Rodar o teste.** Esperado: PASS.

- [ ] **Step 5: Commit** `feat(auth): guardas requireUser/requireAdmin/canAccessPreview`.

---

### Task 3: Login, logout, troca de senha e remoção do Basic auth

**Files:**
- Create:
  - `src/app/api/auth/login/route.ts` (POST)
  - `src/app/api/auth/logout/route.ts` (POST)
  - `src/app/api/auth/me/route.ts` (GET)
  - `src/app/api/auth/password/route.ts` (POST)
- Create: `src/app/login/page.tsx`, `src/app/conta/senha/page.tsx`
- Modify: `src/middleware.ts`, `src/lib/net/rate-limit.ts`, `.env.example`, `docs/deploy.md`
- Modify tests:
  - `src/lib/__tests__/security.test.ts`, `rate-limit.test.ts` e `mobile-capture-routes.test.ts` (trechos de Basic auth);
  - `routes.test.ts`, `upload-image.test.ts`, `backend-robustness-routes.test.ts`, `generate-warning.test.ts` e `e2e-*.test.ts`: mock de `@/lib/auth/session` com `TEST_USERS.admin` e requisições com `withSession`.
- Test: `src/lib/__tests__/auth-routes.test.ts`

**Interfaces:**
- Consumes: Tasks 1–2
- Produces:
  - `POST /api/auth/login` `{ email, password }`: 200 `{ user: { name, role, mustChangePassword } }` + `Set-Cookie`. Senha errada ou usuário inativo → 401. Mais de 10 tentativas por minuto por IP+e-mail → 429.
  - `POST /api/auth/logout`: 200, apaga a sessão e limpa o cookie.
  - `GET /api/auth/me`: `{ user: AuthUser }` (aceita `mustChangePassword`).
  - `POST /api/auth/password` `{ currentPassword, newPassword }`: `newPassword` com no mínimo 8 caracteres e diferente da atual. Grava `mustChangePassword: false` e apaga as outras sessões do usuário. Responde 200.
  - Middleware: `isPublicPath` passa a incluir `/api/auth/login`. O `matcher` ganha `"/admin/:path*"` e `"/conta/:path*"`. Sem cookie: em `/api/*` devolve 401 JSON; nas páginas redireciona para `/login?next=<path>`.

- [ ] **Step 1: Testes que falham** em `auth-routes.test.ts`:
  - Login com `" Ana@Irroba.com "` encontra o usuário `ana@irroba.com` (Review Focus 1).
  - Login com usuário inativo e login com senha errada devolvem exatamente o mesmo corpo e status.
  - Login OK grava `lastLoginAt` e responde com `Set-Cookie` contendo `session=`.
  - A 11ª tentativa no mesmo minuto devolve 429.
  - Troca de senha com a senha atual errada → 400; com `newPassword` de 7 caracteres → 400; OK → `mustChangePassword: false` e `deleteUserSessions` chamado para as outras sessões.
  - Middleware: `/api/previews` sem cookie → 401; `/studio/x` sem cookie → 307 para `/login?next=%2Fstudio%2Fx`; `/preview/x` → passa; `/api/auth/login` → passa.

- [ ] **Step 2: Rodar.** Esperado: FAIL.

- [ ] **Step 3: Implementar** as rotas e o middleware.
  - Remover `checkBasicAuth` e `getBasicAuthUser`.
  - `limitAuthenticated` passa a usar como chave os 16 primeiros caracteres do cookie `session` (ou `"anon"`) no lugar do usuário do Basic auth. A assinatura não muda.
  - Login usa um `createRateLimiter()` próprio do módulo, com `take(\`${ip}:${email}\`, 10)`.

- [ ] **Step 4: Páginas.**
  - `/login`: formulário de e-mail e senha. Faz POST e redireciona para `next` ou `/`. Se `mustChangePassword`, vai para `/conta/senha`.
  - `/conta/senha`: senha atual, nova senha e confirmação. Depois de salvar, vai para `/`.
  - `.env.example`: troca `ADMIN_USER` por `ADMIN_EMAIL`.
  - `docs/deploy.md`: a seção "Rotação de ADMIN_PASS" vira "Primeiro admin e redefinição de senhas".

- [ ] **Step 5: Ajustar os testes existentes** (lista em Files) e rodar `npm test`. Esperado: tudo PASS.

- [ ] **Step 6: Commit** `feat(auth): login por usuário substitui o Basic auth`.

---

### Task 4: Primeiro admin e dono das propostas existentes

**Files:**
- Create: `src/lib/auth/bootstrap.ts`
- Modify: `src/instrumentation.ts`
- Test: `src/lib/__tests__/auth-bootstrap.test.ts`

**Interfaces:**
- Consumes: `hashPassword`, `normalizeEmail` (Task 1)
- Produces: `ensureBootstrapAdmin(env?: Record<string, string | undefined>): Promise<{ created: boolean; assigned: number }>`

- [ ] **Step 1: Testes que falham:**
  - Sem usuários e com `ADMIN_EMAIL`/`ADMIN_PASS` → cria um usuário `role: "admin"`, `mustChangePassword: true`, com e-mail normalizado. Depois chama `storePreview.updateMany({ where: { ownerId: null }, data: { ownerId: <id do admin> } })`.
  - Já existe um admin → não cria nenhum, mas atribui as propostas sem dono ao admin mais antigo (`orderBy: { createdAt: "asc" }`). É idempotente.
  - Sem usuários e sem as variáveis → `{ created: false, assigned: 0 }` e `console.error` com `Defina ADMIN_EMAIL e ADMIN_PASS`.

- [ ] **Step 2: Rodar.** Esperado: FAIL.
- [ ] **Step 3: Implementar** e chamar de `register()` em `instrumentation.ts`, dentro do bloco `nodejs`, com `void` e log no padrão `[boot]` do arquivo.
- [ ] **Step 4: Rodar.** Esperado: PASS.
- [ ] **Step 5: Commit** `feat(auth): primeiro admin via env e dono das propostas antigas`.

---

### Task 5: Propostas com dono em todas as rotas e páginas

**Files:**
- Modify:
  - `src/app/api/previews/route.ts` (GET);
  - `src/app/api/previews/generate/route.ts` (create com `ownerId: user.id`);
  - `src/app/api/previews/[id]/route.ts`: GET, PATCH e DELETE;
  - `src/app/api/previews/[id]/reanalyze/route.ts`;
  - `src/app/api/previews/[id]/upload-image/route.ts`;
  - `src/app/api/previews/[id]/mobile-capture/route.ts`;
  - `src/app/api/previews/[id]/csv/route.ts`;
  - `src/app/api/previews/[id]/ai-image/route.ts`;
  - `src/app/api/previews/[id]/ai-html/route.ts`;
  - `src/app/studio/[id]/page.tsx`;
  - `src/app/page.tsx`.
- Test: `src/lib/__tests__/ownership.test.ts`

**Interfaces:**
- Consumes: `requireUser`, `canAccessPreview`, `requirePageUser`, `TEST_USERS`, `withSession` (Task 2)
- Produces:
  - `GET /api/previews?owner=<userId>`: o filtro `owner` só vale para admin.
  - Cada item da lista ganha `owner: { id, name }`.

- [ ] **Step 1: Testes que falham** em `ownership.test.ts`:
  - Um `it.each` sobre todas as rotas `[id]` da lista de Files (método + handler), com `findUnique` devolvendo `ownerId: TEST_USERS.outro.id` e a sessão `TEST_USERS.comercial` → **404**.
  - As mesmas rotas, com o usuário dono, não devolvem 404 nem 401.
  - O `findMany` de `GET /api/previews` para comercial recebe `where: { status: "ready", ownerId: comercial.id }`.
  - Para admin sem `owner`, recebe `where: { status: "ready" }`; com `?owner=x`, recebe `ownerId: "x"`.
  - Um comercial passando `?owner=x` continua filtrado pelo próprio id.
  - O `create` do generate recebe `ownerId: TEST_USERS.comercial.id`.

- [ ] **Step 2: Rodar.** Esperado: FAIL.

- [ ] **Step 3: Implementar.** Em cada rota `[id]`:
  - `const user = await requireUser(req); if (user instanceof Response) return user;` antes do rate limit;
  - depois de carregar a proposta: `if (!preview || !canAccessPreview(user, preview.ownerId)) → 404` com a mensagem que a rota já usa;
  - nas rotas que usam `getPreviewWithBlueprint`, ler `result.preview.ownerId`.
  - `studio/[id]/page.tsx`: `requirePageUser()` + `canAccessPreview` → `notFound()`.
  - `page.tsx` (home): se `/api/previews` responder 401, `location.href = "/login"`; se responder 403 com `MUST_CHANGE_PASSWORD`, vai para `/conta/senha`. O header mostra o nome do usuário (via `/api/auth/me`) e o botão "Sair" (POST logout → `/login`). Para admin, mostra também o link "Usuários" (→ `/admin/usuarios`), o nome do dono em cada card e um `<select>` "Todos / <comercial>" que preenche `?owner=`.

- [ ] **Step 4: Rodar** `npm test`. Esperado: PASS.
- [ ] **Step 5: Commit** `feat(auth): propostas visíveis só para o dono (admin vê todas)`.

---

### Task 6: Painel do admin

**Files:**
- Create:
  - `src/app/api/admin/users/route.ts` (GET, POST);
  - `src/app/api/admin/users/[id]/route.ts` (PATCH);
  - `src/app/api/admin/users/[id]/reset-password/route.ts` (POST);
  - `src/app/admin/usuarios/page.tsx` (server, `requirePageUser({ admin: true })`);
  - `src/components/admin/UsersPanel.tsx` (client).
- Test: `src/lib/__tests__/admin-users.test.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `hashPassword`, `generateTempPassword`, `normalizeEmail`, `deleteUserSessions`
- Produces:
  - `GET /api/admin/users` → `{ users: { id, name, email, role, active, lastLoginAt, previewCount }[] }`.
  - `POST /api/admin/users` com `{ name, email, role }` → 201 `{ user, tempPassword }`. E-mail duplicado → 409 `E-mail já cadastrado.`
  - `PATCH /api/admin/users/[id]` com `{ active?, role?, name? }` → 200. Ao inativar, chama `deleteUserSessions`. Deixar o sistema sem nenhum admin ativo → 409 `É preciso manter pelo menos um admin ativo.`
  - `POST /api/admin/users/[id]/reset-password` → `{ tempPassword }`. Grava `mustChangePassword: true` e chama `deleteUserSessions`.

- [ ] **Step 1: Testes que falham:**
  - Comercial em qualquer uma das 4 rotas → 403.
  - `POST` normaliza o e-mail, grava `mustChangePassword: true` e devolve `tempPassword` só na resposta. O hash gravado confere com essa senha via `verifyPassword`.
  - `POST` com e-mail repetido → 409.
  - `PATCH { active: false }` no último admin ativo (inclusive o próprio admin) → 409. `PATCH { role: "comercial" }` no último admin → 409. Com dois admins → 200.
  - `PATCH { active: false }` → `deleteUserSessions(id)` chamado (Review Focus 2).
  - `reset-password` → `deleteUserSessions` chamado e `mustChangePassword: true`.
  - `role` fora de `comercial | admin` → 400 (zod).

- [ ] **Step 2: Rodar.** Esperado: FAIL.

- [ ] **Step 3: Implementar** as rotas. O "último admin" é contado com `user.count({ where: { role: "admin", active: true, id: { not: id } } }) === 0`.

- [ ] **Step 4: UI `UsersPanel`:**
  - tabela com nome, e-mail, papel, status, último acesso e nº de propostas;
  - botão "Novo usuário" abre um `Modal` (de `src/components/ui`) com nome, e-mail e papel;
  - ações por linha: "Redefinir senha", "Inativar"/"Reativar" e troca de papel;
  - a senha temporária aparece uma única vez, num `Modal` com "Copiar" (`useCopyToClipboard`) e o aviso "Essa senha não será mostrada de novo.";
  - erros 409 aparecem inline.

- [ ] **Step 5: Rodar** `npm test && npx tsc --noEmit && npm run lint`. Esperado: tudo limpo.
- [ ] **Step 6: Commit** `feat(admin): painel de usuários`.

---

### Task 7: Verificação ponta a ponta no navegador

- [ ] **Step 1:** Colocar `ADMIN_EMAIL`/`ADMIN_PASS` de teste no `.env` local, apagar os usuários do `dev.db` e subir `npm run dev`. Esperado: log `[boot]` de admin criado e N propostas atribuídas.
- [ ] **Step 2:** No Chrome:
  - entrar como admin → é obrigado a trocar a senha → vê todas as propostas;
  - criar um comercial e copiar a senha temporária;
  - numa janela anônima, entrar como comercial, trocar a senha, ver a lista vazia e gerar uma proposta;
  - abrir `/studio/<id de proposta do admin>` → 404.
- [ ] **Step 3:** Como admin, inativar o comercial. Na janela anônima, recarregar → vai para `/login`.
- [ ] **Step 4:** `/preview/<slug>` abre sem login.
- [ ] **Step 5:** Commit de ajustes, se houver. Fim da entrega 1.
