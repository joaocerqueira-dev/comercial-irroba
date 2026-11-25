# syntax=docker/dockerfile:1
# Imagem oficial do Playwright: Node 22 + Chromium e dependências de sistema em /ms-playwright.
# A tag deve acompanhar a versão de "playwright" no package-lock.json.
ARG PLAYWRIGHT_IMAGE=mcr.microsoft.com/playwright:v1.65.1-noble

# ---------- deps: instala todas as dependências (inclui dev, necessárias ao build) ----------
FROM ${PLAYWRIGHT_IMAGE} AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---------- build: gera o client do Prisma e o build standalone do Next ----------
FROM ${PLAYWRIGHT_IMAGE} AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    DATABASE_URL=file:/tmp/build.db
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npx next build

# ---------- prisma-cli: CLI do Prisma isolado (com dependências) para o db push no boot ----------
FROM ${PLAYWRIGHT_IMAGE} AS prisma-cli
WORKDIR /opt/prisma-cli
COPY package-lock.json /tmp/package-lock.json
RUN PRISMA_VERSION="$(node -p "require('/tmp/package-lock.json').packages['node_modules/prisma'].version")" \
 && npm init -y >/dev/null \
 && npm install --omit=dev --no-audit --no-fund "prisma@${PRISMA_VERSION}"

# ---------- runner: imagem final enxuta ----------
FROM ${PLAYWRIGHT_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    DATABASE_URL=file:/app/data/prod.db

# Diretórios graváveis criados na imagem para que volumes nomeados herdem o dono pwuser.
RUN mkdir -p /app/data /app/public/captures && chown -R pwuser:pwuser /app

COPY --from=build --chown=pwuser:pwuser /app/.next/standalone ./
COPY --from=build --chown=pwuser:pwuser /app/.next/static ./.next/static
COPY --from=build --chown=pwuser:pwuser /app/public ./public
COPY --from=build --chown=pwuser:pwuser /app/prisma ./prisma
# Coleta de lixo de public/captures (npm run captures:gc), para rodar via cron com docker compose exec.
COPY --from=build --chown=pwuser:pwuser /app/scripts ./scripts
# Client gerado + engine do Prisma (garante presença mesmo se o tracing do Next omitir algo).
COPY --from=build --chown=pwuser:pwuser /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=pwuser:pwuser /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=prisma-cli --chown=pwuser:pwuser /opt/prisma-cli /opt/prisma-cli
COPY --chown=pwuser:pwuser docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod 0755 /usr/local/bin/entrypoint.sh

USER pwuser
EXPOSE 3000
VOLUME ["/app/data", "/app/public/captures"]
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
