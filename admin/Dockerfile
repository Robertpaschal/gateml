# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
# Server-side rewrite destination — baked into routes-manifest.json at build time
ARG BACKEND_URL=http://localhost:3001
ENV BACKEND_URL=$BACKEND_URL
RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002

COPY package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/.next      ./.next
COPY --from=builder /app/next.config.ts ./

EXPOSE 3002
CMD ["npm", "start"]
