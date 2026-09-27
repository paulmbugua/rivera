FROM node:22-bookworm-slim
WORKDIR /app
RUN corepack enable
ENV SITES_PNPM_SHARED_STORE=/pnpm/store \
    PNPM_CONFIG_FETCH_RETRIES=5 \
    PNPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    PNPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    PNPM_CONFIG_FETCH_TIMEOUT=300000
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
RUN --mount=type=cache,id=rivera-pnpm,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile && \
    pnpm --dir apps/api prisma:generate && \
    pnpm --dir apps/api build
EXPOSE 4000
CMD ["sh", "-c", "pnpm --dir apps/api exec prisma migrate deploy && node apps/api/dist/main.js"]
