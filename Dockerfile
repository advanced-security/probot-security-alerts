# syntax=docker/dockerfile:1.4

ARG NODE_VERSION=20
ARG ALPINE_VERSION=3.18

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} as build
WORKDIR /app
COPY --link . .
RUN --mount=type=cache,target=/usr/local/share/npm-global \
    npm install --location=global npm@latest \
    && npm ci \
    && npm run build \
    && npm run test

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION}
ARG APP_ROOT=/opt/probot
LABEL org.opencontainers.image.title "Probot Security Alerts"
LABEL org.opencontainers.image.description "Probot-based GitHub App which listens and responds to security alert notifications"
LABEL org.opencontainers.image.licenses "MIT"
LABEL org.opencontainers.image.base.name "docker.io/node:${NODE_VERSION}-alpine${ALPINE_VERSION}"

ENV NODE_ENV=production
ENV PORT=80
WORKDIR ${APP_ROOT}
COPY --link package.json ./
COPY --link --from=build /app/dist/ .
EXPOSE 80
ENTRYPOINT ["node", "index.js"]
