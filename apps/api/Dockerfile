FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
RUN pnpm install --no-frozen-lockfile && pnpm --dir apps/api prisma:generate && pnpm --dir apps/api build
CMD ["node", "apps/api/dist/main.js"]
