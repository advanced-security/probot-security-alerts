ARG VARIANT=18-bullseye

FROM mcr.microsoft.com/vscode/devcontainers/typescript-node:${VARIANT}
ARG TARGETARCH
ARG HADOLINT_VERSION=2.12.0

# Ensure the included version of NPM is up-to-date.
USER root
RUN npm install -g npm@latest \
    && if [ "${TARGETARCH}" = "arm64" ]; then \
    wget -q -O /usr/local/bin/hadolint https://github.com/hadolint/hadolint/releases/download/v${HADOLINT_VERSION}/hadolint-Linux-arm64; \
    else \
    wget -q -O /usr/local/bin/hadolint https://github.com/hadolint/hadolint/releases/download/v${HADOLINT_VERSION}/hadolint-Linux-x86_64; \
    fi \
    && chmod +x /usr/local/bin/hadolint

USER node
