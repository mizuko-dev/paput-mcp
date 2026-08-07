FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
# prepare スクリプト（npm run build）はソースコピー前に走ると失敗するため抑止する
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

FROM node:22-alpine AS prod

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/http.js"]
