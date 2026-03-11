# ── Stage 1: Build ─────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate

# ── Stage 2: Production ─────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules     ./node_modules
COPY --from=builder /app/generated        ./generated
COPY --from=builder /app/prisma           ./prisma
COPY --from=builder /app/src              ./src
COPY --from=builder /app/package.json     ./package.json
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000
CMD ["npx", "tsx", "src/app.js"]
