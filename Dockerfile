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
EXPOSE ${PORT}
HEALTHCHECK CMD wget --server-response --timeout=10 --tries=3 --spider "http://localhost:${PORT}/health" || exit 1

WORKDIR ${APP_ROOT}
COPY --link package.json ./
COPY --link --from=build /app/dist/ .

ENTRYPOINT ["node", "index.js"]
