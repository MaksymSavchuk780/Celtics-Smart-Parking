FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install --global pnpm@10.32.1 \
    && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
