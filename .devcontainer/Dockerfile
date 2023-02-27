ARG VARIANT=18-bullseye
FROM mcr.microsoft.com/vscode/devcontainers/typescript-node:${VARIANT}

# Ensure the included version of NPM is up-to-date.
RUN sudo npm install -g npm@latest