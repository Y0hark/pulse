# ---- build backend (TypeScript -> dist) ----
FROM node:20-bookworm-slim AS build
WORKDIR /app
# This stage only compiles TS; skip puppeteer's own Chromium download (unused here, and the
# runtime stage's base image already bundles one at PUPPETEER_EXECUTABLE_PATH).
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- runtime ----
# Based on the official Puppeteer image so PDF export (src/services/pdfExport.ts) has a
# working Chromium + all its system libs out of the box, instead of hand-picking apt packages.
FROM ghcr.io/puppeteer/puppeteer:latest AS runtime
WORKDIR /app
USER root
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY db/migrations ./db/migrations

# golang-migrate CLI: applies db/migrations/*.up.sql on boot. File naming already matches
# its {version}_{name}.up.sql / .down.sql convention, so no renaming was needed.
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
  && curl -sSL https://github.com/golang-migrate/migrate/releases/download/v4.18.1/migrate.linux-amd64.tar.gz \
     | tar -xz -C /usr/local/bin migrate \
  && apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && chown -R pptruser:pptruser /app

USER pptruser
ENV NODE_ENV=production
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
