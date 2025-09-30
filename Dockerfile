# Use Node.js 20 LTS for modern dependency compatibility
# Updated: 2025-09-30 - Fix Sevalla Docker build issues
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Ensure Node.js version and npm compatibility
RUN node --version && npm --version

# Copy package files first for better caching
COPY package.json package-lock.json* ./

# Clean install with exact versions and enhanced flags
RUN npm ci --prefer-offline --no-audit --no-fund --no-package-lock && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy configuration files first for better module resolution
COPY tsconfig.json next.config.mjs ./

# Copy build scripts
COPY scripts/ ./scripts/

# Copy source code
COPY . .

# Set build environment with Sevalla-specific optimizations
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV WEBPACK_VERBOSE=true
ENV SEVALLA_DEPLOYMENT=true

# Make build scripts executable
RUN chmod +x scripts/sevalla-build-helper.sh

# Run optimized build using Sevalla helper
RUN ./scripts/sevalla-build-helper.sh

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public

# Create .next directory
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static/

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
