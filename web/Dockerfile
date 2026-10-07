FROM node:25.8.1-bookworm AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NUXT_PUBLIC_API_BASE=""
RUN npm test && npm run generate

FROM nginx:1.28-alpine
COPY --from=build /app/.output/public /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
