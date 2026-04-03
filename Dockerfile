FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY docs ./docs
RUN npm run docs:build

FROM nginx:alpine
COPY --from=build /app/docs/.vitepress/dist /usr/share/nginx/html
EXPOSE 80
