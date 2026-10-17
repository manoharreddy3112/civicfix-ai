# ===========================================================================
# CivicFix AI - frontend image
# Multi-stage build: compile the React/Vite app, then serve it with nginx,
# which also reverse-proxies /api to the Express container.
# ===========================================================================

# ---------------------------------------------------------------------------
# Stage 1 - build the static bundle
# ---------------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Dependencies first for better layer caching (npm ci = reproducible builds)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Application source (node_modules / dist excluded via .dockerignore)
COPY . .

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2 - serve with nginx
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

LABEL org.opencontainers.image.title="CivicFix AI Web" \
      org.opencontainers.image.description="React frontend for CivicFix AI"

# Our reverse-proxy + SPA-fallback config
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# The compiled SPA
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=5 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
