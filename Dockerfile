# =====================================================
# BarberSmart - Production Dockerfile
# =====================================================
# Multi-stage build for optimized production image
# =====================================================

# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (for better caching)
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_MAIN_DOMAINS=barbersmart.app,barbersmart.com.br
ARG VITE_IGNORED_DOMAINS=localhost
ARG VITE_ENABLE_TENANT_DETECTION=true
ARG VITE_TRUST_PROXY_HEADERS=true
ARG VITE_DEFAULT_SYSTEM_NAME=Barber Smart
ARG VITE_DEFAULT_TAGLINE=Gestão Inteligente para Barbearias
ARG VITE_ENABLE_PWA=true

# Set environment variables for build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_MAIN_DOMAINS=$VITE_MAIN_DOMAINS
ENV VITE_IGNORED_DOMAINS=$VITE_IGNORED_DOMAINS
ENV VITE_ENABLE_TENANT_DETECTION=$VITE_ENABLE_TENANT_DETECTION
ENV VITE_TRUST_PROXY_HEADERS=$VITE_TRUST_PROXY_HEADERS
ENV VITE_DEFAULT_SYSTEM_NAME=$VITE_DEFAULT_SYSTEM_NAME
ENV VITE_DEFAULT_TAGLINE=$VITE_DEFAULT_TAGLINE
ENV VITE_ENABLE_PWA=$VITE_ENABLE_PWA

# Build the application
RUN npm run build

# Stage 2: Production image with Nginx
FROM nginx:alpine AS production

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
