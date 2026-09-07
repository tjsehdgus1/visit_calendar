FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 빌드 시점에는 DB에 접속하지 않지만 prisma.config.ts가 DATABASE_URL을 요구하므로 자리표시자를 준다 (런타임은 compose가 주입)
ENV NEXT_TELEMETRY_DISABLED=1 DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
RUN npx prisma generate && npm run build

# 런타임 마이그레이션·시드용: Prisma CLI를 의존성까지 통째로 설치 (개별 패키지를 골라 복사하면 effect 등이 빠진다)
FROM node:22-alpine AS migrate-deps
WORKDIR /migrate
RUN npm init -y >/dev/null && npm install --no-audit --no-fund prisma@7.10.0 @prisma/client@7.10.0 @prisma/adapter-pg@7.10.0 pg@8.23.0 dotenv@17.4.2 bcryptjs@3.0.3

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl postgresql17-client
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=migrate-deps --chown=nextjs:nodejs /migrate/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY docker-entrypoint.sh ./
# 빌드 컨텍스트(NAS ACL 파일)의 권한이 그대로 복사되어 nextjs 사용자가 읽지 못할 수 있어 명시적으로 부여
RUN chmod -R a+rX ./public ./prisma ./prisma.config.ts && chmod 755 ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
