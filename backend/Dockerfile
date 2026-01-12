# =============================================
# STAGE 1: Install ALL dependencies
# =============================================
FROM node:20-alpine AS deps-all
WORKDIR /app
COPY package*.json ./
RUN npm ci

# =============================================
# STAGE 2: Build application + Generate Prisma
# =============================================
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps-all /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# =============================================
# STAGE 3: Production dependencies only
# =============================================
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# =============================================
# STAGE 4: Production runner
# =============================================
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl wget

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

RUN chmod -R 755 /app/node_modules/.prisma && \
    chown -R expressjs:nodejs /app

ENV NODE_ENV=production
ENV PORT=4000

USER expressjs
EXPOSE 4000

CMD ["node", "dist/index.js"]
