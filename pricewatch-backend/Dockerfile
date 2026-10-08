# Playwright image ships Chromium + system deps. Keep the tag in sync with the playwright version in package.json.
FROM mcr.microsoft.com/playwright:v1.63.0-noble
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
ENV NODE_ENV=production PLAYWRIGHT_NO_SANDBOX=true
USER pwuser
EXPOSE 4000
CMD ["node", "src/server.js"]
