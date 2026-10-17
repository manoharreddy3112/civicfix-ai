# ---------------------------------------------------------------------------
# CivicFix AI - backend image (Express REST API)
# ---------------------------------------------------------------------------
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Install production dependencies first (better Docker layer caching)
# `npm ci` uses the committed lockfile so image builds are reproducible.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Application source
COPY src ./src

# Run as the unprivileged user that ships with the node image
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:5000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
