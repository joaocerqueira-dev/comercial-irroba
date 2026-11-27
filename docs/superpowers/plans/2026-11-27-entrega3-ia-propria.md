# Entrega 3 — IA própria por usuário — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** cada usuário configura a própria IA de texto (OpenAI, Anthropic, Google ou compatível com OpenAI) e, opcionalmente, de imagem (Google ou OpenAI); toda chamada de IA usa a chave do usuário logado e a `GEMINI_API_KEY` do servidor deixa de existir.

**Architecture:** tabela `AiCredential` (uma por usuário e finalidade) com a chave cifrada em AES-256-GCM (`AI_KEYS_SECRET`). `src/lib/ai/providers.ts` transforma a credencial num modelo do Vercel AI SDK. As rotas recebem o modelo do usuário logado e o repassam a `architect.ts` / `image-studio.ts` como parâmetro (nada lê env de IA). Tela "Minha IA" em `/conta/ia`.

**Tech Stack:** Next.js 15 App Router, Prisma + SQLite (`db push`), zod 3.25, vitest, `ai@7.0.166`, `@ai-sdk/openai@4.0.111`, `@ai-sdk/anthropic@4.0.99`, `@ai-sdk/google@4.0.114` (versões exatas, sem `^`; todas com mais de 2 semanas).

**Spec:** `docs/superpowers/specs/2026-11-27-contas-links-ia-design.md` §3 (IA própria) + Anti-objetivos.

## Global Constraints

- Chave de IA nunca volta inteira em nenhuma resposta de API, nunca vai para o navegador, nunca entra em log. Depois de salva aparece só como `••••1234` (`last4`).
- Criptografia: AES-256-GCM, chave derivada de `AI_KEYS_SECRET` (env). Em produção sem o segredo (ou com menos de 32 caracteres) o container não sobe (`docker/entrypoint.sh` sai com erro). Em dev, segredo de desenvolvimento com `console.warn` (mesmo padrão de `src/lib/share/access.ts`).
- `AiCredential`: `id`, `userId`, `provider` (`openai` | `anthropic` | `google` | `openai-compatible`), `purpose` (`texto` | `imagem`), `apiKeyEncrypted`, `baseUrl` (só `openai-compatible`), `model String?`, `last4`, `createdAt`, `updatedAt`; `@@unique([userId, purpose])`; `onDelete: Cascade` no usuário.
- IA de imagem aceita só `google` e `openai`.
- **Quem executa paga:** a IA usada é a do usuário logado da requisição (`requireUser`), nunca a do dono da proposta.
- Sem troca silenciosa de modelo: uma chamada, no modelo configurado pelo usuário (ou no padrão do provedor). Erro do provedor vira mensagem clara em PT-BR.
- Mensagens de erro do provedor (exatas, usadas na UI e nas rotas):
  - 401/403 ou chave inválida: `"Chave da sua IA inválida ou sem permissão. Confira em Minha IA."`
  - 402 / saldo / `insufficient_quota` / `billing`: `"Sua conta de IA está sem saldo ou créditos."`
  - 429 / rate limit / `RESOURCE_EXHAUSTED`: `"Limite de uso da sua IA atingido. Tente de novo em instantes."`
  - 5xx / overloaded / UNAVAILABLE: `"O provedor da sua IA está instável no momento. Tente de novo."`
  - timeout: `"A IA demorou demais para responder."`
  - outro: `"Não foi possível falar com a sua IA."`
- Aviso sem IA de texto (exato): `"Configure sua IA para gerar com IA"`; sem IA de imagem: `"Configure sua IA de imagem para gerar imagens"`. Os dois linkam para `/conta/ia`.
- Modelos padrão por provedor (texto): `openai` → `gpt-5.4-mini`, `anthropic` → `claude-sonnet-5-5`, `google` → `gemini-3.5-flash`, `openai-compatible` → sem padrão (modelo obrigatório). Imagem: `google` → `gemini-3.1-flash-image`, `openai` → `gpt-image-1.5`. O usuário pode digitar outro.
- `baseUrl` de `openai-compatible`: obrigatório, `https://`, validado com `assertPublicHttpUrl` (`src/lib/net/safe-url.ts`) ao salvar **e** antes de cada uso (SSRF).
- `generationMode`: novas gerações gravam `"ai"` (ou `"heuristic"`); `"gemini"` antigo é lido como IA. Novas colunas `aiProvider String?` e `aiModel String?` em `StorePreview`.
- Melhorar/redimensionar imagem (modos `enhance`/`resize`) só com IA de imagem `google`; com `openai` só `generate`.
- Texto de ajuda na tela: `"Não tem IA paga? Crie uma chave grátis do Gemini"` com link `https://aistudio.google.com/apikey`.
- Usar `rtk` nos comandos (`rtk vitest run`, `rtk tsc`, `rtk git ...`). TDD: teste falhando antes do código.

## Review Focus

1. Admin abrindo proposta de outro comercial e clicando "Reanalisar"/"Gerar imagem": deve usar a chave do **admin**, não a do dono. (Task 4 e 5: teste com dono ≠ executor.)
2. `AI_KEYS_SECRET` trocado depois de salvar chaves: decifrar falha → tratar como "não configurada" com aviso para salvar de novo, nunca 500 nem vazar ciphertext. (Task 1: teste com segredo diferente.)
3. `baseUrl` apontando para rede interna (`https://127.0.0.1`, `https://10.0.0.5`, `http://…`): rejeitado ao salvar e ao usar. (Task 2 e Task 1.)
4. Erro do provedor cujo texto ecoa a chave (ex.: `Incorrect API key provided: sk-abc…`): a mensagem ao cliente é a fixa da tabela e o log não contém a chave completa. (Task 2: teste com a chave no texto do erro.)
5. Provedor `openai-compatible` sem suporte a imagem na entrada: o architect não anexa screenshots para esse provedor (só dados do DOM). (Task 4.)

---

### Task 1: Base — dependências, schema, cofre de chaves e fábrica de modelos

**Files:**
- Modify: `package.json` (add os 4 pacotes com versão exata; ainda **não** remover `@google/genai`), `prisma/schema.prisma`, `.env.example`, `docker/entrypoint.sh`, `docs/deploy.md`
- Create: `src/lib/ai/secret-box.ts`, `src/lib/ai/providers.ts`
- Test: `src/lib/__tests__/ai-secret-box.test.ts`, `src/lib/__tests__/ai-providers.test.ts`

**Interfaces:**
- Produces:
  - `encryptApiKey(plain: string): string` / `decryptApiKey(enc: string): string` (formato `v1:<iv b64>:<tag b64>:<data b64>`; `decryptApiKey` lança `AiKeyDecryptError` se falhar).
  - `type AiProvider = "openai" | "anthropic" | "google" | "openai-compatible"`; `type AiPurpose = "texto" | "imagem"`.
  - `DEFAULT_TEXT_MODELS: Record<AiProvider, string | null>`, `DEFAULT_IMAGE_MODELS: { google: string; openai: string }`, `IMAGE_PROVIDERS = ["google","openai"] as const`.
  - `interface UserTextAi { provider: AiProvider; modelId: string; model: LanguageModel; supportsImageInput: boolean }`
  - `interface UserImageAi { provider: "google" | "openai"; modelId: string; apiKey: string }` (a chave em claro só vive em memória no servidor; `image-studio` usa para o `fetch` do Gemini).
  - `getUserTextAi(userId: string): Promise<UserTextAi | null>` e `getUserImageAi(userId: string): Promise<UserImageAi | null>` — `null` quando não configurada **ou** quando decifrar falha (com `console.warn` sem dados da chave); para `openai-compatible` roda `assertPublicHttpUrl(baseUrl)` e retorna `null` se inseguro.
  - `buildTextModel(cred: { provider; apiKey; model?: string | null; baseUrl?: string | null }): UserTextAi` (sem I/O; usado também pelo "Testar conexão"). `openai` → `createOpenAI({apiKey})(modelId)`; `anthropic` → `createAnthropic({apiKey})(modelId)`; `google` → `createGoogleGenerativeAI({apiKey})(modelId)`; `openai-compatible` → `createOpenAI({apiKey, baseURL}).chat(modelId)`. `supportsImageInput` = provider ≠ `openai-compatible`.

- [ ] **Step 1:** `npm i -E ai@7.0.166 @ai-sdk/openai@4.0.111 @ai-sdk/anthropic@4.0.99 @ai-sdk/google@4.0.114`.
- [ ] **Step 2: Testes falhando** — `ai-secret-box.test.ts`: ida e volta devolve o texto; dois `encrypt` do mesmo texto diferem (IV aleatório); ciphertext adulterado → `AiKeyDecryptError`; cifrado com `AI_KEYS_SECRET` A e lido com B → `AiKeyDecryptError`; `NODE_ENV=production` sem segredo ou com < 32 chars → `encryptApiKey` lança. `ai-providers.test.ts`: `buildTextModel` para cada provedor devolve `modelId` padrão quando `model` vazio; `openai-compatible` sem `model` lança; `supportsImageInput` falso só para compatível; `getUserTextAi` com credencial cifrada por outro segredo → `null`; com `baseUrl` `https://127.0.0.1/v1` → `null`; sem registro → `null`; `getUserImageAi` devolve `apiKey` decifrada e modelo padrão.
- [ ] **Step 3:** rodar `rtk vitest run src/lib/__tests__/ai-secret-box.test.ts src/lib/__tests__/ai-providers.test.ts` → FAIL.
- [ ] **Step 4:** schema: modelo `AiCredential` (Global Constraints) + `aiCredentials AiCredential[]` em `User` + `aiProvider String?`, `aiModel String?` em `StorePreview`; `npx prisma db push` (dev). Implementar `secret-box.ts` (chave = `scryptSync` ou `sha256` do segredo → 32 bytes) e `providers.ts`.
- [ ] **Step 5:** testes PASS; `rtk tsc`.
- [ ] **Step 6:** `.env.example`: `AI_KEYS_SECRET=""` com comentário; `entrypoint.sh`: antes do `db push`, se `AI_KEYS_SECRET` vazio ou `${#AI_KEYS_SECRET} -lt 32` → mensagem em PT-BR no stderr e `exit 1`; `docs/deploy.md`: parágrafo do `AI_KEYS_SECRET` (`openssl rand -base64 48`, trocar o segredo invalida as chaves salvas).
- [ ] **Step 7:** commit `feat(ia): cofre de chaves e fábrica de modelos por usuário`.

### Task 2: API "Minha IA" e mensagens de erro do provedor

**Files:**
- Create: `src/app/api/me/ai/route.ts` (GET/PUT/DELETE), `src/app/api/me/ai/test/route.ts` (POST), `src/lib/ai/errors.ts`
- Test: `src/lib/__tests__/ai-me-routes.test.ts`, `src/lib/__tests__/ai-errors.test.ts`

**Interfaces:**
- Consumes: Task 1 (`encryptApiKey`, `decryptApiKey`, `buildTextModel`, `DEFAULT_*`, `IMAGE_PROVIDERS`), `requireUser`, `limitAuthenticated` (`src/lib/net/rate-limit.ts`), `assertPublicHttpUrl`.
- Produces:
  - `describeAiError(err: unknown): string` — devolve uma das mensagens fixas de Global Constraints. Lê `statusCode` de `APICallError` (do pacote `ai`), `status`, e o texto da mensagem; nunca devolve o texto cru.
  - `GET /api/me/ai` → `{ texto: AiCredentialView | null, imagem: AiCredentialView | null }`, `AiCredentialView = { provider, model: string | null, baseUrl: string | null, last4: string, updatedAt: string, broken?: true }` (`broken` quando decifrar falha).
  - `PUT /api/me/ai` body `{ purpose, provider, apiKey?, model?, baseUrl?, reuseText?: true }` → 200 com a view. `apiKey` obrigatório na criação; ausente na edição mantém a chave. `reuseText: true` (só `purpose: "imagem"`) copia `provider` e chave da IA de texto quando ela for `google` ou `openai`, senão 400. `imagem` com provider fora de `IMAGE_PROVIDERS` → 400. `openai-compatible` sem `baseUrl` https público ou sem `model` → 400. `apiKey` trim, 8–400 chars.
  - `DELETE /api/me/ai?purpose=texto|imagem` → 204.
  - `POST /api/me/ai/test` body `{ purpose }` → `{ ok: true, model }` ou `{ ok: false, error }` (mensagem de `describeAiError`). Faz `generateText({ model, prompt: "Responda apenas: OK", maxOutputTokens: 16, abortSignal: AbortSignal.timeout(20_000) })`; para `imagem` testa a mesma chave com o modelo de texto padrão do provedor. Rate limit `limitAuthenticated(req, "ai-test")`.

- [ ] **Step 1: Testes falhando** — `ai-errors.test.ts`: um caso por linha da tabela (401, 403, 402, `insufficient_quota`, 429, `RESOURCE_EXHAUSTED`, 503, `overloaded`, timeout, desconhecido), e erro cuja mensagem contém `sk-proj-ABCDEF1234567890` → resultado não contém a chave. `ai-me-routes.test.ts` (padrão de mocks de `auth-routes.test.ts`/`share-config.test.ts`): sem sessão → 401; PUT cria e GET devolve `last4` e **nenhum** campo com a chave (assert `JSON.stringify(body)` não contém a chave); PUT sem `apiKey` mantém a chave antiga (decifrar a do banco); usuário B não vê a credencial de A; `imagem` + `anthropic` → 400; `reuseText` com texto `anthropic` → 400 e com `google` → copia; `openai-compatible` com `https://127.0.0.1/v1` → 400; DELETE remove; `test` com `generateText` mockado (`vi.mock("ai")`) rejeitando `{ statusCode: 401 }` → `{ ok:false, error:"Chave da sua IA inválida ou sem permissão. Confira em Minha IA." }`.
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** implementar `errors.ts` e as rotas (zod para o body; `last4` = 4 últimos chars da chave).
- [ ] **Step 4:** testes PASS; `rtk tsc`; `npm run lint`.
- [ ] **Step 5:** commit `feat(ia): API Minha IA com teste de conexão`.

### Task 3: Tela "Minha IA"

**Files:**
- Create: `src/app/conta/ia/page.tsx` (server: `requirePageUser`), `src/components/account/AiSettingsPanel.tsx` (client)
- Modify: `src/app/page.tsx` (link "Minha IA" no cabeçalho, ao lado do link de admin/conta), `src/middleware.ts` só se `/conta/ia` não estiver coberto pela regra de páginas autenticadas (conferir).
- Test: `src/lib/__tests__/ai-settings-panel.test.ts` se houver lógica pura extraída (ex.: `canReuseTextKey(textView)`); a tela em si é validada no navegador pelo controlador.

**Interfaces:**
- Consumes: Task 2 (`GET/PUT/DELETE /api/me/ai`, `POST /api/me/ai/test`), `DEFAULT_TEXT_MODELS`, `DEFAULT_IMAGE_MODELS` (importar de `providers.ts` só as constantes — sem puxar o SDK para o cliente: mover as constantes para `src/lib/ai/provider-defaults.ts` se o import arrastar o SDK).

- [ ] **Step 1:** teste falhando para `canReuseTextKey` (true só para `google`/`openai`) → FAIL → implementar → PASS.
- [ ] **Step 2:** painel com dois cartões, seguindo o visual de `src/app/conta/senha/page.tsx` e `UsersPanel.tsx` (Tailwind, `Field`):
  - **IA de texto** (gera o layout e o editor HTML com IA): select de provedor (ChatGPT/OpenAI, Claude/Anthropic, Gemini/Google, Outra compatível com OpenAI), campo chave (`type="password"`, `autoComplete="off"`; quando já salva, placeholder `••••1234` e texto "deixe em branco para manter"), modelo (placeholder com o padrão do provedor), URL base (só "Outra"), botões Salvar, Testar conexão, Remover.
  - **IA de imagem (opcional)**: provedor Gemini ou OpenAI; botão "Usar a mesma chave da IA de texto" quando `canReuseTextKey`; nota "O Claude não gera imagens; quem usa Claude precisa de uma chave de imagem separada."; nota "Melhorar e redimensionar imagem funcionam só com Gemini."
  - Ajuda: `"Não tem IA paga? Crie uma chave grátis do Gemini"` → `https://aistudio.google.com/apikey` (`target="_blank" rel="noopener noreferrer"`).
  - `broken` → aviso "Não foi possível ler a chave salva. Salve a chave de novo."
- [ ] **Step 3:** `rtk tsc`, `npm run lint`.
- [ ] **Step 4:** commit `feat(ia): tela Minha IA`.

### Task 4: Layout com a IA do usuário (architect, gerar, reanalisar)

**Files:**
- Modify: `src/lib/ai/architect.ts`, `src/app/api/previews/generate/route.ts`, `src/app/api/previews/[id]/reanalyze/route.ts`, `src/app/api/previews/[id]/route.ts` (PATCH aceita `"ai"`), `src/lib/layout-patterns/ai.ts`
- Create: `src/lib/ai/mode.ts`
- Test: substituir `src/lib/__tests__/architect-genai.test.ts` por `src/lib/__tests__/architect-ai-sdk.test.ts`; atualizar `routes.test.ts`, `ownership.test.ts`, `security-phase1.test.ts` onde usam `GEMINI_API_KEY`.

**Interfaces:**
- Consumes: `getUserTextAi`, `UserTextAi`, `describeAiError`.
- Produces:
  - `buildStoreBlueprint(extracted, options: { signal?: AbortSignal; ai?: UserTextAi | null })` → `ArchitectResult { blueprint; mode: "ai" | "heuristic"; aiProvider?: string; modelUsed?: string; aiError?: string }`. Sem `options.ai` → heurístico com insight de aviso `"Configure sua IA para gerar com IA"` (id `ai-not-configured`). Com IA: **uma** chamada `generateText({ model, messages: [{ role: "user", content: [...imagens, { type: "text", text: prompt }] }], temperature: 0.25, abortSignal })` com timeout de `GEMINI_ARCHITECT.timeoutMs` (renomear para `AI_ARCHITECT`); imagens como `{ type: "image", image: Buffer, mediaType }` só se `ai.supportsImageInput`; a resposta passa por `extractJsonObject` e pelo merge existente sem mudança. Falha → heurístico com `aiError = describeAiError(err)` e o insight de fallback reescrito sem "Gemini" (`"Fallback heurístico ativado (IA indisponível)"`, botão citado como "Reanalisar identidade com IA").
  - `formatFriendlyAiError` é removida; quem usava passa a usar `describeAiError`.
  - `isAiMode(mode: string | null | undefined): boolean` em `src/lib/ai/mode.ts` (`"ai"` ou `"gemini"`).
  - Rotas: `generate` e `reanalyze` chamam `getUserTextAi(user.id)` (usuário da requisição) e passam `ai`. `generate` grava `generationMode`, `aiProvider: ai?.provider ?? null`, `aiModel: modelUsed ?? null`; mensagens de progresso sem "Gemini" ("Analisando identidade visual com IA (<provider>)..."). `reanalyze` sem IA configurada → 400 `{ error: "Configure sua IA para gerar com IA" }`; resposta de sucesso com `mode: "ai"`. PATCH aceita `["ai","gemini","heuristic"]`.
  - `GEMINI_TEXT_MODELS`/`GEMINI_DEFAULT_MODEL` deixam de ser usados no architect (podem sumir de `layout-patterns/ai.ts` se ninguém mais usar após a Task 5).

- [ ] **Step 1: Testes falhando** (`vi.mock("ai")` com `generateText` mockado): sem `ai` → `mode: "heuristic"` e insight `ai-not-configured`; com `ai` → `generateText` chamado 1 vez com o `model` recebido, `temperature: 0.25`, conteúdo com parte `image` quando `supportsImageInput` e sem parte `image` quando falso; JSON válido → `mode: "ai"`, `modelUsed` = `ai.modelId`; `generateText` rejeitando `{ statusCode: 429 }` → heurístico, `aiError` = mensagem 429 da tabela e **nenhuma** segunda chamada; resposta com cercas ```json ainda é aceita. Rotas: `reanalyze` sem credencial → 400 com a mensagem; admin reanalisando proposta de outro → `getUserTextAi` chamado com o id do **admin**; `generate` grava `generationMode: "ai"`, `aiProvider`, `aiModel`; `isAiMode("gemini") === true`.
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** implementar; manter o prompt atual (apenas trocar "Gemini" onde aparecer para o usuário).
- [ ] **Step 4:** `rtk vitest run` (suíte inteira, incluindo `layout-patterns-golden.test.ts`) PASS; `rtk tsc`.
- [ ] **Step 5:** commit `feat(ia): layout gerado com a IA do usuário`.

### Task 5: Editor HTML e imagens com a IA do usuário

**Files:**
- Modify: `src/app/api/previews/[id]/ai-html/route.ts`, `src/lib/ai/image-studio.ts`, `src/app/api/previews/[id]/ai-image/route.ts`, `src/app/api/previews/generate/route.ts` (banner gerado), `src/lib/layout-patterns/ai.ts`
- Test: atualizar o caso de `ai-html` em `routes.test.ts`; novo `src/lib/__tests__/image-studio-user-ai.test.ts`.

**Interfaces:**
- Consumes: `getUserTextAi`, `getUserImageAi`, `UserImageAi`, `describeAiError`, `DEFAULT_IMAGE_MODELS`.
- Produces:
  - `ai-html`: sem IA de texto → 400 `{ error: "Configure sua IA para gerar com IA" }`; com IA, **uma** chamada `generateText({ model, prompt: systemPrompt, abortSignal: AbortSignal.any([req.signal, AbortSignal.timeout(28_000)]) })`, mesmo parse/sanitização de hoje; erro → 502 `{ error: describeAiError(err) }`.
  - `processAiImageRequest(req, options: { signal?; imageAi: UserImageAi; textAi?: UserTextAi | null })`:
    - `imageAi.provider === "google"`: `fetch` atual ao Gemini com `x-goog-api-key: imageAi.apiKey` e **só** `imageAi.modelId` (sem fila de modelos).
    - `imageAi.provider === "openai"`: só `mode === "generate"` via `generateImage({ model: createOpenAI({ apiKey }).image(modelId), prompt, size })` (16:9 → `1536x1024`, 3:4 → `1024x1536`, 1:1 e 21:9 → `1024x1024`/`1536x1024`); `enhance`/`resize` → lança `AiImageModeUnsupportedError` (rota → 400 `"Melhorar e redimensionar imagem funcionam só com IA de imagem Gemini."`).
    - Falha na geração nativa → mantém o fallback Art Studio atual, mas a direção de arte usa `textAi` via `generateText` (sem `textAi` → spec local `fallback`) e o `notice` sempre traz `describeAiError(err)` da falha nativa.
    - Nenhuma leitura de `process.env.GEMINI_*` sobra no arquivo.
  - `ai-image` route: `getUserImageAi(user.id)`; `null` → 400 `{ error: "Configure sua IA de imagem para gerar imagens" }`; passa `textAi: await getUserTextAi(user.id)`.
  - `generate` route: banner faltante só é gerado se `getUserImageAi(user.id)` não for `null`; senão mantém o fallback atual sem chamar `processAiImageRequest`.
  - Remover `GEMINI_TEXT_MODELS`/`GEMINI_DEFAULT_MODEL` de `layout-patterns/ai.ts` quando ninguém mais usar.

- [ ] **Step 1: Testes falhando**: `ai-html` sem credencial → 400 com a mensagem; com `generateText` mockado retornando JSON → 200 e HTML sanitizado; rejeitando `{statusCode: 401}` → 502 com a mensagem 401; admin em proposta alheia → credencial do admin. `image-studio-user-ai.test.ts` (mock de `fetch` e de `ai`): google usa a chave e o modelo do usuário no `fetch` (header `x-goog-api-key` igual à chave, URL contém o modelo) e faz 1 só chamada; openai + `enhance` → `AiImageModeUnsupportedError`; openai + `generate` chama `generateImage` com o `size` esperado; `ai-image` sem credencial → 400 com a mensagem.
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** `rtk vitest run` PASS; `rtk tsc`; `npm run lint`; `grep -rn "GEMINI_API_KEY\|GEMINI_MODEL\|GEMINI_IMAGE_MODEL" src` vazio fora de testes.
- [ ] **Step 5:** commit `feat(ia): editor HTML e imagens com a IA do usuário`.

### Task 6: Interface sem Gemini fixo e limpeza

**Files:**
- Modify: `src/app/page.tsx`, `src/components/studio/StudioTopBar.tsx`, `src/components/studio/tabs/InsightsTab.tsx`, `src/components/studio/useStudioState.ts`, `src/app/studio/[id]/page.tsx`, componentes do editor HTML com IA (`HtmlAiEditor.tsx`) e do slot de imagem (`AiImageSlot`), `package.json` (remover `@google/genai`), `.env.example`, `README.md`, `docs/deploy.md`, `docker-compose*.yml` se citarem `GEMINI_*`.
- Test: testes existentes de UI/estado que citam "gemini" (`unsavedChanges.test.ts` etc.) ajustados; novo teste de lógica pura se extraída.

**Interfaces:**
- Consumes: `isAiMode`, `GET /api/me/ai`, mensagens fixas de aviso.
- Produces:
  - `studio/[id]/page.tsx` calcula `aiStatus = { text: boolean; image: "google" | "openai" | null }` do usuário logado (via `getUserTextAi`/`getUserImageAi`, sem chave) e passa ao `StudioClient`.
  - Studio: sem IA de texto, botão "Reanalisar identidade com IA" e editor HTML com IA desabilitados com `"Configure sua IA para gerar com IA"` + link `/conta/ia`; sem IA de imagem, botão de gerar imagem desabilitado com `"Configure sua IA de imagem para gerar imagens"`; com IA de imagem `openai`, modos melhorar/redimensionar desabilitados com a nota da Task 5.
  - Home: badge usa `isAiMode` e texto "IA" (tooltip com `aiProvider/aiModel` quando houver); se `GET /api/me/ai` não tiver texto, aviso acima do formulário de gerar: `"Configure sua IA para gerar com IA"` + link (a geração continua em modo heurístico).
  - Renomear `handleReanalyzeWithGemini` → `handleReanalyzeWithAi` e trocar textos "Gemini" visíveis por "IA".
  - `@google/genai` removido do `package.json` (nenhum import sobra); docs/README/.env sem `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_IMAGE_MODEL`; deploy.md com nota de upgrade: "a chave Gemini do servidor deixou de ser usada; cada usuário cadastra a sua em Minha IA".
- [ ] **Step 1:** testes falhando para a lógica nova que for pura (ex.: `isAiMode` já coberto; `aiDisabledReason(aiStatus, need: "text" | "image" | "image-edit")` se criada) → FAIL → implementar → PASS.
- [ ] **Step 2:** UI e limpeza; `npm i` após remover `@google/genai`.
- [ ] **Step 3:** `rtk vitest run` PASS, `rtk tsc`, `npm run lint`, `npm run build` PASS; `grep -rni "gemini" src --include=*.tsx` sem texto visível de Gemini fixo (exceto o nome do provedor no select e a nota de imagem).
- [ ] **Step 4:** commit `feat(ia): interface com IA do usuário e remoção da chave Gemini do servidor`.
