#!/usr/bin/env bash

set -euo pipefail

if [ "$(id -u)" -ne "0"  ]; then echo "Must be run as root or with sudo"; exit 1; fi

DEBIAN_FRONTEND=noninteractive apt-get update -qq 
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq apt-transport-https ca-certificates curl tar unzip > /dev/null

PROCESSOR_ARCHITECTURE=$(uname -m)
if [ "${PROCESSOR_ARCHITECTURE}" == "arm64" ] || [ "${PROCESSOR_ARCHITECTURE}" == "aarch64" ]; then
    declare -r PLATFORM=arm64
else
    declare -r PLATFORM=x86_64
fi

declare -r HADOLINT_VERSION=$(curl -s https://api.github.com/repos/hadolint/hadolint/releases/latest | grep '"tag_name":' | sed -E 's/[^:]+:\ \"v([^\"]+).+/\1/')
echo " ******* Installing Hadolint v${HADOLINT_VERSION} (${PLATFORM}) ******* "
curl -sLfo /usr/local/bin/hadolint https://github.com/hadolint/hadolint/releases/download/v${HADOLINT_VERSION}/hadolint-Linux-${PLATFORM}
chmod +x /usr/local/bin/hadolint

echo " ********* Installing AWS SAM CLI ********* "
curl -SLfo /tmp/sam-cli.zip https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-${PLATFORM}.zip
unzip -qq /tmp/sam-cli.zip -d /tmp/sam
sudo /tmp/sam/install
rm -rf /tmp/sam-cli
rm /tmp/sam-cli.zip

# Clean up
apt clean
rm -rf /var/lib/apt/lists/*
