FROM node:22-slim

# Shared libraries the puppeteer-bundled Chrome needs (israeli-bank-scrapers)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      ca-certificates fonts-liberation \
      libasound2 libatk-bridge2.0-0 libatk1.0-0 libcairo2 libcups2 libdbus-1-3 \
      libdrm2 libgbm1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 \
      libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxdamage1 libxext6 libxfixes3 \
      libxkbcommon0 libxrandr2 libxshmfence1 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for better layer caching.
# Prod deps only — tsx runs server.ts directly and the frontend is built on Vercel.
# puppeteer's postinstall downloads Chrome into /root/.cache/puppeteer here.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3001

CMD ["npx", "tsx", "server.ts"]
