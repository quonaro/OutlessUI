# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS builder
WORKDIR /src

# Install pnpm
RUN npm install -g pnpm@9.15.0

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build application
RUN pnpm build

FROM node:20-alpine AS runtime
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.15.0

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /src/.output ./

USER nextjs

EXPOSE 41221

ENV NODE_ENV=production
ENV PORT=41221
ENV HOST="0.0.0.0"

CMD ["node", "server/index.mjs"]
