FROM node:22-slim AS builder

WORKDIR /app

RUN corepack enable

COPY . .

RUN pnpm install --frozen-lockfile \
  && pnpm --filter @nordlys/shared build \
  && pnpm --filter @nordlys/web build

FROM node:22-slim AS runner

WORKDIR /app

RUN corepack enable

ENV NODE_ENV=production
ENV WEB_DIST_PATH=/app/apps/web/dist

# TODO: Optimize image size with `pnpm --filter @nordlys/api deploy --prod` once
# workspace runtime layout is verified. The ACA Job uses this same image with
# command override: ["pnpm","--filter","@nordlys/api","job"].
COPY --from=builder --chown=node:node /app /app

USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["pnpm", "--filter", "@nordlys/api", "start"]
