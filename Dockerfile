# ── BinKılıç Saklı Bahçe — production imajı ──
FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# Kaynak + tüm bağımlılıklar: build ve seed için
FROM deps AS tools
COPY . .
RUN npx prisma generate

FROM tools AS builder
ARG APP_URL=http://localhost:3000
ENV NEXT_TELEMETRY_DISABLED=1 APP_URL=$APP_URL
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 TZ=Europe/Istanbul PORT=3000 HOSTNAME=0.0.0.0 UPLOAD_DIR=/app/storage/uploads
RUN groupadd -r app && useradd -r -g app -d /app app
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/prisma ./prisma
COPY --from=builder --chown=app:app /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=app:app /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=app:app /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=app:app scripts/docker-entrypoint.sh ./docker-entrypoint.sh
RUN mkdir -p /app/storage/uploads && chown -R app:app /app/storage && chmod +x ./docker-entrypoint.sh
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
