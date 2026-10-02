# Public demo image (Hugging Face Docker Space). One container: Postgres + Next.js.
FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build" \
    APP_URL="https://n1ch0las-synapse.hf.space" \
    DEMO_MODE="true"

COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build && mkdir -p uploads && chown -R 1000:1000 /app

# Hugging Face runs containers as uid 1000 (the image's "node" user).
USER 1000
ENV NODE_ENV=production PORT=7860
EXPOSE 7860
CMD ["bash", "docker/start.sh"]
