# syntax=docker/dockerfile:1.4

ARG NODE_VERSION=18
ARG ALPINE_VERSION=3.17

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} as build
WORKDIR /app
COPY --link . .
RUN --mount=type=cache,target=/usr/local/share/npm-global \
    npm install -g npm@latest \
    && npm install \
    && npm run build \
    && npm run test

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION}
ARG APP_ROOT=/opt/probot
LABEL org.opencontainers.image.title "Probot Security Alerts"
LABEL org.opencontainers.image.description "Probot-based GitHub App which listens and responds to security alert notifications"
LABEL org.opencontainers.image.licenses "MIT"
LABEL org.opencontainers.image.base.name "docker.io/node:${NODE_VERSION}-alpine${ALPINE_VERSION}"

ENV NODE_ENV=production
WORKDIR ${APP_ROOT}
COPY --link package.json package-lock.json ./
RUN --mount=type=cache,target=/usr/local/share/npm-global \
    npm install -g npm@latest \
    && npm i probot --location=global \
    && npm install --omit=dev \
    && npm cache clean --force
WORKDIR ${APP_ROOT}/app
COPY --link --from=build /app/dist/ .
EXPOSE 3000
ENTRYPOINT ["../node_modules/.bin/probot", "run", "./index.js"]
