# =========================================================================
# DOCKERFILE MULTI-STAGE · MATRÍCULA ABERTA (PATOS - PB)
# =========================================================================

# Stage 1: Build do Frontend PWA e Dependências
FROM node:23-alpine AS builder

WORKDIR /app

# Instala dependências do monorepo aproveitando cache de camadas Docker
COPY package*.json ./
COPY packages/server/package*.json ./packages/server/
COPY packages/web/package*.json ./packages/web/
COPY packages/shared/package*.json ./packages/shared/

RUN npm install

# Copia o código completo
COPY . .

# Executa checagem de tipos e compilação do bundle estático (Vite)
RUN npm run build

# Stage 2: Runtime de Produção (Enxuto e Seguro)
FROM node:23-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3333

# Utilitário curl para healthcheck do Docker e orquestradores (Kubernetes, AWS ECS, Render)
RUN apk add --no-cache curl

# Copia artefatos construídos e node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/dist ./dist

# Prepara pasta de dados para o SQLite com permissão do usuário node
RUN mkdir -p /app/packages/server/data && chown -R node:node /app

USER node

EXPOSE 3333

# Healthcheck oficial do container
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/v1/health || exit 1

# Inicializa o Monolito Modular (API REST + SSE + Servidor Estático PWA)
CMD ["node", "--no-warnings", "--experimental-strip-types", "--experimental-sqlite", "packages/server/src/index.ts"]

