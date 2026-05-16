FROM node:24-alpine AS base
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .

FROM base AS builder
RUN npm run build

FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.env* ./
COPY --from=builder /app/package.json /app/package-lock.json /app/.npmrc ./

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

USER node
EXPOSE 3000

CMD ["npm", "start"]