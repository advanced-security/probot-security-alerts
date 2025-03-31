# syntax=docker/dockerfile:1.4

ARG NODE_VERSION=22
ARG OS_BASE=alpine3.20
ARG APP_ROOT=/opt/probot

FROM node:${NODE_VERSION}-${OS_BASE} as base

FROM base as buildbase
WORKDIR /app
RUN corepack enable \
  && COREPACK_ENABLE_DOWNLOAD_PROMPT=0 yarn set version berry

FROM buildbase as codebase
COPY --link . .

FROM codebase as build
RUN --mount=type=cache,target=/root/.yarn/berry/cache \
  yarn install \
  && yarn workspace @security-alert-watcher/app test \
  && yarn workspace @security-alert-watcher/server test \
  && yarn workspace @security-alert-watcher/app build \
  && yarn workspace @security-alert-watcher/server build

FROM base
ARG APP_ROOT
ARG NODE_VERSION
ARG OS_BASE

LABEL org.opencontainers.image.title "Probot Security Alerts"
LABEL org.opencontainers.image.description "Probot-based GitHub App which listens and responds to security alert notifications"
LABEL org.opencontainers.image.licenses "MIT"
LABEL org.opencontainers.image.base.name "docker.io/node:${NODE_VERSION}-${OS_BASE}"

ENV NODE_ENV=production
ENV PORT=80
EXPOSE ${PORT}
HEALTHCHECK CMD wget --server-response --timeout=10 --tries=3 --spider "http://localhost:${PORT}/health" || exit 1

WORKDIR ${APP_ROOT}
COPY --link --chown=1000:1000 --from=build /app/packages/server/dist/ .

ENTRYPOINT ["node", "index.mjs"]
USER node
