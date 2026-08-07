FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
# prepare スクリプト（npm run build）はソースコピー前に走ると失敗するため抑止する
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

FROM node:22-alpine AS prod

# node は SIGTERM ハンドラを持たず PID 1 では既定動作も無効になるため、tini でシグナルを転送する
RUN apk add --no-cache tini

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
# --ignore-scripts は build ステージと同じく prepare（npm run build）の抑止
RUN npm ci --omit=dev --ignore-scripts

COPY --from=build --chown=node:node /app/dist ./dist

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/healthz" || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/http.js"]
