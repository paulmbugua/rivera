FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/* && corepack enable
ENV SITES_PNPM_SHARED_STORE=/pnpm/store PNPM_CONFIG_FETCH_RETRIES=5 PNPM_CONFIG_FETCH_TIMEOUT=300000
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
RUN --mount=type=cache,id=rivera-pnpm,target=/pnpm/store,sharing=locked pnpm install --frozen-lockfile
RUN pnpm --dir apps/api prisma:generate && pnpm --dir apps/api build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=4000
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/* && corepack enable && groupadd --system rivera && useradd --system --gid rivera rivera
COPY --from=builder --chown=rivera:rivera /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=rivera:rivera /app/node_modules ./node_modules
COPY --from=builder --chown=rivera:rivera /app/apps/api ./apps/api
COPY --from=builder --chown=rivera:rivera /app/packages/shared ./packages/shared
USER rivera
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --retries=5 CMD node -e "fetch('http://127.0.0.1:4000/api/v1/health/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "apps/api/dist/main.js"]
