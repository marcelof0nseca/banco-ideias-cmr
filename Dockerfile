# =============================================================================
# Banco de Ideias Legislativas - imagem de producao (especificacao, secao 11)
# DONO: Pessoa B.
#
#   docker build -t banco-ideias \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://bancodeideias.recife.pe.leg.br .
#
# NEXT_PUBLIC_* entram no BUILD (o Next as embute no codigo do navegador).
# Trocar de cenario de integracao (subdominio <-> rota no portal) = gerar a
# imagem de novo com outro NEXT_PUBLIC_BASE_PATH. Nenhuma linha de codigo muda.
#
# Segredos (DATABASE_URL, DOCUMENTO_CHAVE, DOCUMENTO_PEPPER, AUTH_SECRET) NAO
# entram na imagem: sao passados em tempo de execucao (docker-compose.prod.yml).
# =============================================================================

FROM node:26-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:26-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_BASE_PATH=""
ARG NEXT_PUBLIC_SITE_URL="https://bancodeideias.recife.pe.leg.br"
ARG NEXT_PUBLIC_URL_CAMARA="https://www.recife.pe.leg.br"
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_URL_CAMARA=$NEXT_PUBLIC_URL_CAMARA
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npx next build

# --- migracoes: job de uma execucao (docker compose run --rm migrar) --------
FROM build AS migrar
CMD ["npx", "prisma", "migrate", "deploy"]

# --- aplicacao ---------------------------------------------------------------
FROM node:26-bookworm-slim AS app
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# Usuario sem privilegios: o processo nao roda como root.
RUN groupadd --system --gid 1001 app && useradd --system --uid 1001 --gid app app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
