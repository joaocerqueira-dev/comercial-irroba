# Contas por usuário, link do cliente com senha/aprovação e IA própria

Data: 2026-11-27 · Status: rascunho para aprovação

## Por quê

- Hoje todo mundo entra com o mesmo Basic auth (`ADMIN_USER`/`ADMIN_PASS` em `src/middleware.ts`) e vê todas as propostas. Cada pessoa precisa de login próprio e ver só o que criou.
- A IA usa uma única `GEMINI_API_KEY` do servidor: com vários usuários **a cota grátis acaba rápido** e **a qualidade é ruim**. Cada usuário passa a usar a própria IA (ChatGPT, Claude, Gemini ou outra), consumindo a própria cota.
- O link enviado ao cliente hoje é público e eterno. Passa a ter prazo, senha e respostas do cliente (aprovar, pedir ajustes, recusar), com aviso ao comercial.

## Objetivos

1. Login por usuário; papéis **comercial** e **admin**.
2. Painel do admin: criar usuário, redefinir senha, inativar/reativar.
3. Cada proposta tem dono; o comercial vê só as suas; o admin vê todas.
4. Link do cliente com validade definida pelo comercial e senha.
5. Cliente responde: **Aprovar**, **Pedir ajustes** (com texto do que mudar) ou **Recusar**; registro com nome, data e texto; aviso ao comercial no sistema e pelo WhatsApp.
6. Cada usuário configura a própria IA; não existe mais chave de IA do sistema.

## Não-objetivos

- Cadastro aberto, login com Google/SSO, recuperação de senha por e-mail.
- Envio de e-mail ou WhatsApp automático pelo servidor (o WhatsApp é aberto pelo cliente, ver §2.4).
- Cobrança, limite ou relatório de consumo da IA de cada usuário.
- Mais de uma réplica (sessões e rate limit seguem num único container + SQLite).

## Anti-objetivos (falha mesmo que "funcione")

- Chave de IA de um usuário vazar para outro usuário, para o cliente, para logs ou para o navegador (depois de salva, nunca volta inteira na API).
- Página/HTML da proposta acessível sem senha por um caminho lateral (`/render`, imagem OG, `/api/captures/mobile/[slug]`). *Imagens soltas ficam públicas por decisão (ver §2.3).*
- Comercial ver ou editar proposta de outro trocando o id na URL.
- Uma aprovação valer para uma versão que o cliente não viu.
- Propostas existentes ficarem órfãs ou sumirem na migração.

## Restrições

- Stack atual: Next.js 15 App Router, Prisma + SQLite, zod, vitest; deploy em um container Docker com `prisma db push` no boot.
- `/preview/[slug]` é a página do cliente; ela embute `/render/[slug]` num iframe sandboxed (origem opaca). A navegação que carrega o iframe é same-site e leva cookies; o que perde cookies são as requisições feitas *de dentro* do iframe (imagens). Ver §2.3.
- O export do Studio (`ExportPanel.tsx`, `toAbsolutePublicUrl`) copia URLs absolutas de `/api/captures/...` para colar no admin da Irroba: essas URLs precisam continuar abrindo sem login.
- Deploy roda `prisma db push` no boot (`docker/entrypoint.sh`) e continua assim.
- O Claude não gera imagens.
- Gerações sem IA continuam disponíveis (modo `heuristic` já existe).

## Abordagens consideradas

**Login**
- **A. Próprio (escolhida):** `crypto.scrypt` do Node para hash, tabela `Session` no SQLite, cookie httpOnly. Zero dependência; o mesmo código serve à senha do link do cliente. ~150 linhas nossas para manter.
- B. Better Auth: plugin de admin pronto, mas dependência grande com tabelas próprias, e a senha do link do cliente ficaria fora dela de qualquer jeito.

**Várias IAs**
- **A. Vercel AI SDK (escolhida):** `ai` + `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`. `generateObject` aceita o schema zod do blueprint e funciona igual nos três; "outra" = provedor compatível com OpenAI via URL base. Três pacotes novos.
- B. Adaptadores com `fetch` na mão: sem dependência, mas cada provedor tem seu formato de saída estruturada para manter.

Escolha do usuário: **A nas duas**.

## Desenho

Três entregas, nesta ordem; cada uma funciona sozinha.

### 1. Contas, sessão e dono das propostas

**Modelo**
- `User`: id, email (único, minúsculo), name, passwordHash, role (`comercial` | `admin`), active (bool), mustChangePassword (bool), createdAt, updatedAt.
- `Session`: id (token aleatório 32 bytes, guardado como hash SHA-256), userId, expiresAt, createdAt.
- `StorePreview.ownerId String?` → `User`. Fica opcional no schema porque `db push` não consegue adicionar FK obrigatória a linhas existentes; o código sempre grava e exige o dono, e o seed preenche as antigas. *(call meu)*

**Fluxo**
- `/login`: e-mail + senha. Usuário inativo ou senha errada → mesma mensagem genérica. Rate limit por IP + e-mail (reusa `src/lib/net/rate-limit.ts`).
- Sessão: cookie `session` httpOnly, Secure em produção, SameSite=Lax, validade de 7 dias renovada no uso. Logout apaga a sessão.
- `mustChangePassword`: senha criada/redefinida pelo admin obriga troca no primeiro acesso.
- O middleware (edge) só checa presença do cookie e redireciona para `/login`; a validação real (sessão existe, não expirou, usuário ativo) acontece no servidor via um helper `requireUser(req)` / `requireAdmin(req)` chamado em toda rota interna e página.
- Inativar usuário apaga as sessões dele (sai na hora).
- `limitAuthenticated` passa a usar o id do usuário em vez do nome do Basic auth.

**Acesso às propostas**
- Toda leitura/escrita em `/api/previews/**` e `/studio/[id]` filtra por `ownerId = user.id`, exceto admin. Proposta de outro → 404 (não 403, para não confirmar que existe).
- Lista do admin mostra o dono e permite filtrar por comercial.

**Painel do admin** (`/admin/usuarios`)
- Lista: nome, e-mail, papel, ativo, último acesso, nº de propostas.
- Criar: nome, e-mail, papel; o sistema gera uma senha inicial exibida **uma vez** para o admin copiar (com `mustChangePassword = true`).
- Redefinir senha: mesma mecânica (nova senha temporária exibida uma vez; derruba as sessões).
- Inativar/reativar. Admin não pode inativar a si mesmo nem rebaixar o último admin.

**Migração e primeiro admin**
- Seed: se não existe nenhum usuário, cria o primeiro admin a partir de `ADMIN_EMAIL` + `ADMIN_PASS` (env), com `mustChangePassword = true`.
- Propostas existentes recebem `ownerId` desse primeiro admin.
- O Basic auth sai. `ADMIN_USER` deixa de ser usado.

### 2. Link do cliente: prazo, senha e respostas

**Modelo** (campos novos em `StorePreview`)
- `shareExpiresAt` (DateTime?), `sharePasswordHash` (String?), `shareStatus` (`pendente` | `aprovada` | `ajustes` | `recusada`), `contentVersion` (Int, sobe a cada save do blueprint), `legacyPublic` (Boolean, default false; `true` nas propostas existentes na migração).
- `ClientResponse`: id, previewId, type (`aprovar` | `ajustes` | `recusar`), clientName, message (String?), contentVersion, createdAt, seenAt (DateTime?).

**Comercial (Studio)**
- Painel "Compartilhar": escolhe a validade (7, 15, 30 dias ou data personalizada) e a senha (o sistema sugere uma curta e legível; pode trocar). Mostra link + senha para copiar juntos.
- Pode renovar o prazo, trocar a senha ou desativar o link a qualquer momento.
- Proposta **nova** sem compartilhamento configurado: o link mostra "proposta indisponível".
- Proposta **antiga** (criada antes do deploy, marcada `legacyPublic = true` na migração): continua pública sem senha, como hoje, até o comercial configurar o compartilhamento — aí passa a valer prazo + senha e `legacyPublic` vira `false`. Nenhum link já enviado quebra no deploy. *(decisão do usuário)*

**Cliente**
- `/preview/[slug]`: se expirado → página "Proposta expirada, fale com seu comercial" (com o WhatsApp do comercial, se houver). Se não tem acesso ainda → tela de senha.
- Senha certa → cookie `share_<slug>` assinado (HMAC com `SESSION_SECRET`), válido até `shareExpiresAt`. Trocar a senha invalida cookies antigos (o cookie carrega um hash curto da versão da senha). Rate limit na tentativa de senha.
- **`/render/[slug]`:** passa a exigir o mesmo cookie `share_<slug>` (ou sessão de usuário). A navegação do iframe é same-site e envia o cookie, então o modelo atual (iframe + ETag/cache do `/render`) se mantém. O cache em memória do `/render` só serve depois da checagem de acesso. *(Se o cookie não chegar ao iframe em algum navegador, alternativa do builder: `/preview` passa o HTML por `srcdoc`, aceitando ~200 KB inline e perdendo o ETag.)*
- **Imagens (`/api/captures/[filename]`) continuam públicas**, com nomes não adivinháveis, porque o export para a loja Irroba depende delas e elas vão para a loja pública de qualquer forma. *(decisão do usuário)* Protegidos ficam a página e o HTML da proposta.
- **`/api/captures/mobile/[slug]`** (JSON por slug) deixa de ser público: exige sessão de usuário ou o cookie `share_<slug>`.
- Imagem OG/preview do WhatsApp: removida das páginas com senha (só título genérico). Propostas `legacyPublic` mantêm o OG atual.

**Respostas**
- Abaixo da proposta: **Aprovar** (pede nome), **Pedir ajustes** (nome + texto obrigatório do que mudar), **Recusar** (nome + motivo opcional).
- Grava `ClientResponse` com a `contentVersion` atual e atualiza `shareStatus`.
- Depois de responder: a página mostra o status ("Aprovada por Fulano em 27/11 às 14h") e um botão **"Avisar pelo WhatsApp"** que abre `wa.me/<sellerWhatsapp>` com mensagem pronta ("Aprovei a proposta da loja X" / "Pedi ajustes na proposta da loja X: …" / "Recusei a proposta da loja X"). Sem `sellerWhatsapp`, o botão não aparece.
- Enquanto o status não for `pendente`, os botões somem (uma resposta por versão).
- **Comercial salva alterações** no Studio → `contentVersion` sobe, `shareStatus` volta a `pendente`, cliente pode responder de novo. Histórico de respostas fica guardado e visível no Studio.

**Aviso no sistema**
- Lista de propostas mostra selo do `shareStatus` e um contador de respostas não vistas (`seenAt` nulo). Abrir a proposta no Studio marca como vistas. Sem push/tempo real: atualiza ao carregar/voltar para a lista.

### 3. IA própria

**Modelo**
- `AiCredential`: id, userId, provider (`openai` | `anthropic` | `google` | `openai-compatible`), purpose (`texto` | `imagem`), apiKeyEncrypted, baseUrl (só `openai-compatible`), model (String?), last4, createdAt, updatedAt. Único por (userId, purpose).
- Criptografia: AES-256-GCM com `AI_KEYS_SECRET` (env, 32 bytes). Sem o segredo, o app não sobe em produção.

**Tela "Minha IA"** (para todo usuário)
- **IA de texto** (gera o layout e o editor HTML com IA): provedor + chave + modelo (com padrão sugerido por provedor) + URL base para "outra". Botão "Testar conexão".
- **IA de imagem** (opcional): Gemini ou OpenAI. Se a IA de texto for Gemini ou OpenAI, pode reaproveitar a mesma chave com um clique. O Claude não gera imagem, então quem usa Claude precisa de uma chave de imagem separada.
- Texto de ajuda: "Não tem IA paga? Crie uma chave grátis do Gemini" com link para o Google AI Studio.
- Depois de salva, a chave aparece só como `••••1234`; dá para trocar ou remover, nunca ver.

**Uso**
- Pontos que hoje leem `GEMINI_API_KEY` e passam a receber o modelo do usuário: `src/lib/ai/architect.ts` (usado por `generate/route.ts` e `reanalyze/route.ts`), `src/app/api/previews/generate/route.ts`, `src/app/api/previews/[id]/ai-html/route.ts` e `src/lib/ai/image-studio.ts` (que faz `fetch` direto ao Gemini, para imagem e para uma chamada de texto de direção de arte).
- Helper `getUserTextModel(userId)` retorna o modelo do AI SDK; `generateObject` com o schema zod do blueprint. A chamada de texto do `image-studio` usa a IA de texto do usuário.
- **Quem executa paga:** a IA usada é a do usuário logado que clicou, não a do dono da proposta (vale para admin agindo em proposta alheia). *(call meu)*
- Imagem: `getUserImageModel(userId)`. **Gerar do zero** funciona com Gemini e OpenAI (`generateImage` do AI SDK). **Melhorar/redimensionar** (modos que enviam a imagem de origem) continuam só com Gemini, mantendo o código atual de `image-studio.ts`; com IA de imagem OpenAI esses modos ficam desabilitados. *(call meu)*
- `generationMode`: o valor `"gemini"` passa a ser `"ai"` (com novas colunas `aiProvider`/`aiModel` na proposta para registrar o que gerou); dados antigos com `"gemini"` são lidos como `"ai"`.
- Sem IA de texto configurada: a geração sai em modo heurístico com um aviso ("Configure sua IA para gerar com IA"); o editor HTML com IA e o "reanalisar com IA" ficam desabilitados com o mesmo aviso. Sem IA de imagem: botão de gerar imagem desabilitado.
- `GEMINI_API_KEY` do servidor é removida.
- Erros do provedor (chave inválida, sem saldo, 429) viram mensagem clara para o usuário, sem trocar silenciosamente de modelo.
- Os prompts atuais foram escritos para o Gemini; ajustar onde a saída de Claude/GPT divergir (validar com os testes golden de layout).

## Decisões deixadas ao builder

- Telas de login, admin e "Minha IA": layout seguindo o visual atual do sistema.
- `Cache-Control` das miniaturas/imagens (hoje `public, max-age=86400`): manter, já que imagens seguem públicas.
- Lista de modelos sugeridos por provedor.
- Formato da senha sugerida do link (curta, legível, sem caracteres ambíguos).

## Calls feitos por mim (conferir)

- Dois papéis apenas; admin vê tudo para não perder propostas de quem sai.
- Propostas antigas vão para o primeiro admin.
- Inativar em vez de excluir usuários.
- "Recusar" com motivo opcional; "Pedir ajustes" com texto obrigatório.
- Salvar no Studio zera a resposta do cliente (volta a pendente).
- `/render` protegido pelo mesmo cookie do link (mantém iframe + cache).
- `ownerId` opcional no schema, exigido no código (deploy segue com `db push`).
- Quem executa a IA paga com a própria chave.
- Melhorar/redimensionar imagem só com Gemini.

## Decisões do usuário (após revisão)

- Imagens continuam públicas (export para a loja Irroba depende delas).
- Links antigos continuam públicos até o comercial configurar prazo + senha.
