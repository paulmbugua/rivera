FROM node:22-bookworm-slim
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
RUN pnpm install --frozen-lockfile && pnpm --dir apps/api prisma:generate && pnpm --dir apps/api build
EXPOSE 4000
CMD ["sh", "-c", "pnpm --dir apps/api exec prisma migrate deploy && node apps/api/dist/main.js"]
