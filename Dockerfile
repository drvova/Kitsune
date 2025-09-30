# Multi-platform support
FROM --platform=linux/amd64,linux/arm64 node:20-alpine AS base

# Install security updates and system dependencies
FROM base AS security-base
RUN apk update && apk upgrade && \
    apk add --no-cache libc6-compat git dumb-init curl && \
    rm -rf /var/cache/apk/*

# 1. Install dependencies only when needed
FROM security-base AS deps
WORKDIR /app

# Copy package files separately for better layer caching
COPY package.json package-lock.json* ./

# Install dependencies with optimizations
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# 2. Rebuild the source code only when needed
FROM security-base AS builder
WORKDIR /app

# Copy installed dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code (excluding .dockerignore patterns)
COPY . .

# Set build environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# 3. Production image, copy all the files and run next
FROM security-base AS runner
WORKDIR /app

# Labels for metadata and security scanning
LABEL org.opencontainers.image.title="Kitsune" \
  org.opencontainers.image.description="Anime streaming app" \
  org.opencontainers.image.maintainer="dovakiin0@kitsunee.online" \
  org.opencontainers.image.source="https://github.com/dovakiin0/Kitsune.git" \
  org.opencontainers.image.vendor="kitsunee.online" \
  org.opencontainers.image.version="0.1.0" \
  maintainer="dovakiin0@kitsunee.online"

# Create non-root user with proper group
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone/ ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static/ ./.next/static/

# Set proper permissions
RUN chown -R nextjs:nodejs /app && \
    chmod -R 755 /app

# Switch to non-root user
USER nextjs

# Environment variables for production
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Expose port
EXPOSE 3000

# Use dumb-init as PID 1 for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
