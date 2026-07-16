# syntax=docker/dockerfile:1
# ── Deploy: Next 15 (standalone) na VPS Swarm + Traefik. Node 22 (Next 15/React 19). ──
# Base Debian (bookworm-slim) em vez de Alpine: o runner precisa do Calibre (glibc) para
# converter PDF→EPUB. Todas as etapas usam a mesma base p/ evitar mismatch musl↔glibc.

# 1) deps — instala node_modules a partir do lockfile
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# 2) builder — compila em produção
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# As NEXT_PUBLIC_* são "inlined" no bundle do CLIENTE no BUILD → precisam existir aqui.
# (São públicas por natureza; ok como build-arg.) NUNCA passe a service/secret key como
# build-arg — ela é segredo de runtime e vai só no env_file da VPS.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# 3) runner — só o essencial do standalone + Calibre p/ conversão PDF→EPUB
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Calibre roda headless (sem X): plataforma Qt offscreen.
ENV QT_QPA_PLATFORM=offscreen

# calibre = ebook-convert (PDF→EPUB); poppler-utils = pdftotext (detectar PDF de texto real).
RUN apt-get update \
  && apt-get install -y --no-install-recommends calibre poppler-utils \
  && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Standalone: server.js + node_modules podado (em .next/standalone), estáticos e public.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
